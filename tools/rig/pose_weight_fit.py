"""Offline convex source-edge skin-weight trial, with unchanged source geometry.

Chambolle-Pock splits the actual posed edge-length balls from per-vertex weight
simplices. Four source joint IDs stay fixed; explicit protected source seeds
and outside neighbors are immutable.
Frozen-pose feasibility experiments never constitute a whole-rig certificate.
"""

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
import numpy as np


def simplex(values):
    order = -np.sort(-values, axis=1)
    cumulative = np.cumsum(order, axis=1) - 1
    count = (order > cumulative / np.arange(1, values.shape[1] + 1)).sum(axis=1)
    theta = cumulative[np.arange(len(values)), count - 1] / count
    return np.maximum(values - theta[:, None], 0)


def weighted_simplex(values, steps):
    if (
        values.shape != steps.shape
        or not np.isfinite(values).all()
        or not np.isfinite(steps).all()
        or np.any(steps <= 0)
    ):
        raise ValueError("Finite positive diagonal steps required")
    order = np.argsort(-values / steps, axis=1)
    v = np.take_along_axis(values, order, axis=1)
    t = np.take_along_axis(steps, order, axis=1)
    candidate = (np.cumsum(v, axis=1) - 1) / np.cumsum(t, axis=1)
    active = (v / t > candidate).sum(axis=1)
    level = candidate[np.arange(len(values)), active - 1]
    return np.maximum(values - steps * level[:, None], 0)


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def save_optimizer_state(directory, weights, extrapolated, dual, archive=False):
    values = {"weights": weights, "extrapolated": extrapolated, "dual": dual}
    if archive:
        path = directory / "optimizer-state.npz"
        np.savez_compressed(path, **values)
        return {path.name: digest(path)}
    result = {}
    for name, value in values.items():
        path = directory / ("state-" + name + ".npy")
        np.save(path, value)
        result[path.name] = digest(path)
    return result


def read_optimizer_state(directory, hashes):
    for name, expected in hashes.items():
        if digest(directory / name) != expected:
            raise ValueError("Changed optimizer state " + name)
    if "optimizer-state.npz" in hashes:
        if len(hashes) != 1:
            raise ValueError("Ambiguous optimizer state archive")
        with np.load(directory / "optimizer-state.npz", allow_pickle=False) as data:
            if set(data.files) != {"weights", "extrapolated", "dual"}:
                raise ValueError("Incomplete optimizer state")
            return tuple(
                data[name].copy() for name in ["weights", "extrapolated", "dual"]
            )
    if set(hashes) != {"state-weights.npy", "state-extrapolated.npy", "state-dual.npy"}:
        raise ValueError("Incomplete optimizer state hashes")
    return tuple(
        np.load(directory / ("state-" + name + ".npy"), allow_pickle=False)
        for name in ["weights", "extrapolated", "dual"]
    )


def transformed_coefficients(point, ids, matrices, reference_weights=None):
    if matrices.ndim != 4 or matrices.shape[2:] != (4, 4):
        raise ValueError("Expected all pose matrices explicitly")
    transformed = np.empty((len(matrices), len(point), 4, 3))
    for k in range(4):
        m = matrices[:, ids[:, k]]
        transformed[:, :, k] = (
            np.einsum("pnij,nj->pni", m[:, :, :3, :3], point) + m[:, :, :3, 3]
        )
    origin = (
        transformed.mean(axis=2)
        if reference_weights is None
        else np.einsum("pnkj,nk->pnj", transformed, reference_weights)
    )
    return origin, transformed - origin[:, :, None, :]


def diagonal_steps(coeff, edges, length, free):
    """Schur bounds on the actual free-variable Jacobian, not locked supports.

    Fixed source seeds contribute a constant to posed edges. Counting their
    unused zero-weight joint slots in the operator stalls nearby wrist edges.
    One dual step per3D edge keeps the Euclidean length-ball prox unchanged.
    """
    left, right = edges.T
    inverse_length = 1 / length
    varying = np.abs(coeff).sum(axis=2) * free[None, :, None]
    row_bound = np.max(
        (varying[:, left] + varying[:, right]) * inverse_length[None, :, None],
        axis=2,
    )
    incident = np.bincount(
        edges.ravel(), weights=np.repeat(inverse_length, 2), minlength=coeff.shape[1]
    )
    column_bound = np.abs(coeff).sum(axis=(0, 3)) * incident[:, None]
    tau = 0.95 / np.maximum(column_bound, 1e-12)
    tau[~free] = 0
    sigma = 0.95 / np.maximum(row_bound, 1e-12)
    movable = (free[left] | free[right])[None, :] & (row_bound > 1e-12)
    sigma[~movable] = 0
    return tau, sigma, movable


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--hero", choices=["H01", "H02"], default="H01")
    parser.add_argument(
        "--whole-body",
        action="store_true",
        help="Fit every unprotected source group, without a torso-only coordinate crop",
    )
    parser.add_argument("--iterations", type=int, default=300)
    parser.add_argument("--ratio", type=float, default=1.49)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--warm-start", type=Path)
    parser.add_argument(
        "--archive-state",
        action="store_true",
        help="Losslessly store local solver continuation arrays in NPZ; does not compress model assets",
    )
    parser.add_argument(
        "--cut-fans",
        action="store_true",
        help="Use exact per-export-vertex source-corner fan layout",
    )
    args = parser.parse_args()
    assert re.fullmatch(r"\.local/rig-candidates/[a-z0-9-]+", str(args.output))
    assert (
        args.base.resolve() != args.output.resolve()
        and 1 < args.ratio < 2
        and args.iterations > 0
        and not (args.resume and args.warm_start)
    )
    args.output.mkdir(parents=True, exist_ok=True)
    assert not any(
        (args.output / name).exists()
        for name in [
            "receipt.json",
            "model-archive.json",
            "H01-C0-rigged.glb",
        ]
    ), "Use a new immutable staging revision"
    assert (
        args.resume or not (args.output / "solve.json").exists()
    ), "Use --resume only for unfinished numerical state or choose a new revision"
    started = time.monotonic()
    receipt = json.loads((args.base / "receipt.json").read_text())
    feasibility = json.loads((args.base / "feasibility-input.json").read_text())
    assert (
        receipt["sha256"]
        == feasibility["assetSha256"]
        == digest(args.base / (args.hero + "-C0-rigged.glb"))
    )
    assert (
        digest(args.base / "feasibility-matrices.bin") == feasibility["matricesSha256"]
    )
    cut_cloth_layout = (
        args.cut_fans and feasibility.get("kind") == "cut-cloth-source-layout"
    )
    support_layout = (
        args.cut_fans and feasibility.get("kind") == "source-support-layout"
    )
    if cut_cloth_layout or support_layout:
        layout = args.base
        files = {
            name: layout / name
            for name in [
                "positions.bin",
                "triangles.bin",
                "protected.bin",
                "groups.bin",
                "result-ids.bin",
                "result-weights.bin",
                "feasibility-matrices.bin",
            ]
        }
        for name, expected in feasibility["files"].items():
            assert digest(layout / name) == expected
    elif args.cut_fans:
        parent = json.loads((args.base / "solve.json").read_text())
        layout = Path(parent["base"])
        assert digest(layout / "H01-C0-rigged.glb") == parent["inputSha256"]
        files = {
            name: layout / ("solver-" + name)
            for name in ["positions.bin", "triangles.bin", "protected.bin"]
        }
        files["groups.bin"] = layout / "solver-groups.bin"
        files.update(
            {
                name: args.base / name
                for name in [
                    "result-ids.bin",
                    "result-weights.bin",
                    "feasibility-matrices.bin",
                ]
            }
        )
        for name, expected in parent["inputHashes"].items():
            assert digest(layout / name) == expected
        for name, expected in parent["outputHashes"].items():
            assert digest(args.base / name) == expected
    else:
        files = {
            name: args.base / name
            for name in [
                "positions.bin",
                "triangles.bin",
                "source-welds.u32bin",
                "protected.bin",
                "result-ids.bin",
                "result-weights.bin",
                "feasibility-matrices.bin",
            ]
        }
    hashes = {name: digest(file) for name, file in files.items()}
    source = np.fromfile(files["positions.bin"], "<f4").reshape(-1, 3)
    triangles = np.fromfile(files["triangles.bin"], "<u4").reshape(-1, 3)
    weld = np.fromfile(
        files["groups.bin" if args.cut_fans else "source-welds.u32bin"], "<u4"
    )
    unique, reps, inverse = np.unique(weld, return_index=True, return_inverse=True)
    point = source[reps].astype(float)
    tri = inverse[triangles]
    ids = np.fromfile(args.base / "result-ids.bin", "<u2").reshape(-1, 4)
    original = np.fromfile(args.base / "result-weights.bin", "<f4").reshape(-1, 4)
    w0 = original[reps].astype(float)
    w = w0.copy()
    extrapolated = w.copy()
    fixed = np.zeros(len(reps), bool)
    np.logical_or.at(
        fixed, inverse, np.fromfile(files["protected.bin"], "u1").astype(bool)
    )
    if args.cut_fans and not support_layout:
        roles = np.fromfile(
            layout / ("roles.bin" if cut_cloth_layout else "solver-roles.bin"), "u1"
        )
        np.logical_or.at(fixed, inverse, roles == 0)
    # Preserve head and boots; the full torso/lining/sleeve domain is solved
    # together so a color label cannot hard-pin an internal fabric layer.
    free = (
        ~fixed
        if args.whole_body
        else (point[:, 1] > 0.19)
        & (point[:, 1] < 1.55)
        & (np.abs(point[:, 0]) < 0.55)
        & ~fixed
    )
    pose_count = feasibility.get("poseCount", 1)
    matrices = (
        np.fromfile(args.base / "feasibility-matrices.bin", "<f8")
        .reshape(pose_count, -1, 4, 4)
        .transpose(0, 1, 3, 2)
    )
    origin, coeff = transformed_coefficients(point, ids[reps], matrices, w0)
    edges = np.unique(
        np.sort(
            np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1
        ),
        axis=0,
    )
    length = np.linalg.norm(point[edges[:, 0]] - point[edges[:, 1]], axis=1)
    edges = edges[length > 1e-12]
    length = length[length > 1e-12]
    left, right = edges.T
    inverse_length = 1 / length
    tau, sigma, movable = diagonal_steps(coeff, edges, length, free)
    dual = np.zeros((pose_count, len(edges), 3))
    history = []
    continuation = None
    if args.resume or args.warm_start:
        previous = args.output if args.resume else args.warm_start
        prior = json.loads((previous / "solve.json").read_text())
        assert (
            prior["assetSha256"] == receipt["sha256"]
            and prior["inputHashes"] == hashes
            and prior["parameters"]["ratio"] == args.ratio
        )
        assert digest(previous / "result-weights.bin") == prior["outputWeightsSha256"]
        continuation = {
            "directory": str(previous),
            "solveSha256": digest(previous / "solve.json"),
            "kind": "resume" if args.resume else "warm-start",
        }
        if args.resume:
            assert (
                prior["parameters"]["algorithmVersion"] == 3
            ), "Changed operator steps: use warm-start, not old dual state"
            w, extrapolated, dual = read_optimizer_state(previous, prior["stateHashes"])
        else:
            w = (
                np.fromfile(previous / "result-weights.bin", "<f4")
                .reshape(-1, 4)[reps]
                .astype(float)
            )
            extrapolated = w.copy()
        assert (
            w.shape == w0.shape
            and extrapolated.shape == w.shape
            and dual.shape == (pose_count, len(edges), 3)
        )
        assert (
            np.isfinite(w).all()
            and np.isfinite(extrapolated).all()
            and np.isfinite(dual).all()
        )
        assert np.max(np.abs(w[~free] - w0[~free]), initial=0) < 1e-8

    def posed(weights):
        return origin + np.einsum("pnkj,nk->pnj", coeff, weights)

    def measure(weights):
        p = posed(weights)
        ratios = (
            np.linalg.norm(p[:, left] - p[:, right], axis=2) * inverse_length[None, :]
        )
        rows = [
            {"p999": float(np.quantile(row, 0.999)), "maximum": float(row.max())}
            for row in ratios
        ]
        return {
            "p999": max(r["p999"] for r in rows),
            "maximum": float(ratios.max()),
            "poses": rows,
            "edgesOverTarget": int((ratios > args.ratio).sum()),
            "immutableEdgesOverTarget": int(((ratios > args.ratio) & ~movable).sum()),
        }

    initial = measure(w)
    print(
        json.dumps(
            {
                "vertices": len(point),
                "freeVertices": int(free.sum()),
                "edges": len(edges),
                "initial": initial,
            }
        ),
        flush=True,
    )
    for iteration in range(args.iterations):
        p = posed(extrapolated)
        dual += (
            sigma[:, :, None]
            * (p[:, left] - p[:, right])
            * inverse_length[None, :, None]
        )
        norm = np.linalg.norm(dual, axis=2)
        dual *= np.maximum(0, 1 - sigma * args.ratio / np.maximum(norm, 1e-30))[
            :, :, None
        ]
        flux = dual * inverse_length[None, :, None]
        divergence = np.stack(
            [
                np.stack(
                    [
                        np.bincount(left, weights=flux[j, :, k], minlength=len(point))
                        - np.bincount(
                            right, weights=flux[j, :, k], minlength=len(point)
                        )
                        for k in range(3)
                    ],
                    axis=1,
                )
                for j in range(pose_count)
            ]
        )
        gradient = np.einsum("pnkj,pnj->nk", coeff, divergence)
        value = w.copy()
        value[free] = weighted_simplex(w[free] - tau[free] * gradient[free], tau[free])
        value[~free] = w0[~free]
        extrapolated = 2 * value - w
        w = value
        if iteration % 25 == 24 or iteration == args.iterations - 1:
            status = {
                "iteration": iteration + 1,
                "elapsedSeconds": time.monotonic() - started,
                **measure(w),
            }
            history.append(status)
            print(json.dumps(status), flush=True)
    result = original.copy()
    result[free[inverse]] = w[inverse[free[inverse]]]
    protected = np.fromfile(files["protected.bin"], "u1").astype(bool)
    assert np.array_equal(result[protected], original[protected])
    assert (
        np.isfinite(result).all()
        and result.min() >= 0
        and np.max(np.abs(result.sum(1) - 1)) < 1e-5
    )
    result.astype("<f4").tofile(args.output / "result-weights.bin")
    state_hashes = save_optimizer_state(
        args.output, w, extrapolated, dual, args.archive_state
    )
    report = {
        "base": str(args.base),
        "assetSha256": receipt["sha256"],
        "poseFile": feasibility["poseFile"],
        "poseSha256": feasibility["poseSha256"],
        "inputHashes": hashes,
        "outputWeightsSha256": digest(args.output / "result-weights.bin"),
        "jointIdsChanged": False,
        "protectedWeightsPreserved": True,
        "initial": initial,
        "final": measure(w),
        "history": history,
        "parameters": {
            "algorithmVersion": 3,
            "hero": args.hero,
            "wholeBody": args.whole_body,
            "iterations": args.iterations,
            "ratio": args.ratio,
            "cutFans": args.cut_fans,
            "archiveState": args.archive_state,
        },
        "continuation": continuation,
        "stateHashes": state_hashes,
        "accepted": False,
        "activated": False,
        "poseCount": pose_count,
        "scope": "One-or-more frozen-pose convex four-fixed-joint weight simplex and original posed source-edge length-ball trial. Unique-edge metrics cannot replace per-primitive limits, lower compression/collision, joint sections, full animation or visual acceptance.",
    }
    (args.output / "solve.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
