"""Fit a floor-safe, edge-bounded source cloth field at one frozen pose.

The body and every non-panel/mixed-boundary fan remain the original parent.
Final four-support reduction preserves this pose only; other poses must be
measured on the exported GLB and may reject the candidate.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import time
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from cloth_blend_math import (
    floor_upper,
    fit_alpha,
    fit_alpha_admm,
    reduce_four,
    reduce_four_stable,
    merge_joint_supports,
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def skin(points, ids, weights, matrices):
    result = np.zeros((len(points), 3), dtype=np.float64)
    for k in range(ids.shape[1]):
        m = matrices[ids[:, k]]
        result += (
            np.einsum("nij,nj->ni", m[:, :3, :3], points) + m[:, :3, 3]
        ) * weights[:, k, None]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--iterations", type=int, default=400)
    parser.add_argument("--ratio", type=float, default=1.499)
    parser.add_argument("--floor", type=float, default=0.001)
    parser.add_argument("--transition", type=float, default=0.12)
    parser.add_argument("--repair-passes", type=int, default=0)
    parser.add_argument("--algorithm", choices=["cp", "admm", "admm-box"], default="cp")
    parser.add_argument(
        "--reduction", choices=["nullspace", "nearest"], default="nearest"
    )
    parser.add_argument("--reuse-alpha", type=Path)
    args = parser.parse_args()
    assert re.fullmatch(r"\.local/rig-candidates/[a-z0-9-]+", str(args.output))
    assert args.output.resolve() != args.base.resolve()
    assert (
        args.iterations > 0
        and 1 < args.ratio < 2
        and 0 <= args.floor <= 0.01
        and 0 < args.transition < 1
    )
    assert not any(
        (args.output / p).exists()
        for p in ["solve.json", "receipt.json", "H01-C0-rigged.glb"]
    )
    meta = json.loads((args.base / "input.json").read_text())
    assert meta["kind"] == "frozen-source-cloth-blend"
    for name, digest in meta["files"].items():
        assert sha(args.base / name) == digest
    for path, digest in [
        (meta["baseFile"], meta["baseSha256"]),
        (meta["clothFile"], meta["clothSha256"]),
        (meta["poseFile"], meta["poseSha256"]),
    ]:
        assert sha(Path(path)) == digest
    started = time.monotonic()
    args.output.mkdir(parents=True, exist_ok=True)
    points = np.fromfile(args.base / "positions.f32bin", "<f4").reshape(-1, 3)
    fans = np.fromfile(args.base / "fans.u32bin", "<u4")
    triangles = np.fromfile(args.base / "triangles.u32bin", "<u4").reshape(-1, 3)
    roles = np.fromfile(args.base / "roles.u8bin", "u1")
    protected = np.fromfile(args.base / "protected.u8bin", "u1").astype(bool)
    ids0 = np.fromfile(args.base / "base-ids.u16bin", "<u2").reshape(-1, 4)
    weights0 = np.fromfile(args.base / "base-weights.f32bin", "<f4").reshape(-1, 4)
    ids1 = np.fromfile(args.base / "cloth-ids.u16bin", "<u2").reshape(-1, 4)
    weights1 = np.fromfile(args.base / "cloth-weights.f32bin", "<f4").reshape(-1, 4)
    matrices = (
        np.fromfile(args.base / "matrices.f64bin", "<f8")
        .reshape(-1, 4, 4)
        .transpose(0, 2, 1)
    )
    unique, reps, inverse = np.unique(fans, return_index=True, return_inverse=True)
    p = points[reps].astype(float)
    assert np.max(np.abs(points - p[inverse])) < 1e-8
    role_bits = np.zeros(len(reps), np.uint8)
    np.bitwise_or.at(role_bits, inverse, np.left_shift(1, roles))
    pinned = np.zeros(len(reps), bool)
    np.logical_or.at(pinned, inverse, protected)
    free = ((role_bits & 6) != 0) & ((role_bits & 1) == 0) & ~pinned
    baseline = skin(p, ids0[reps], weights0[reps], matrices)
    target = skin(p, ids1[reps], weights1[reps], matrices)
    actual_baseline = skin(points, ids0, weights0, matrices)
    actual_target = skin(points, ids1, weights1, matrices)
    assert (
        np.max(np.linalg.norm(actual_baseline - baseline[inverse], axis=1)) < 1e-8
    ), "Source fan has inconsistent parent skin"
    assert (
        np.max(np.linalg.norm(actual_target - target[inverse], axis=1)) < 1e-8
    ), "Source fan has inconsistent cloth target"
    delta = target - baseline
    free &= np.linalg.norm(delta, axis=1) > 1e-12
    delta[~free] = 0
    tri = inverse[triangles]
    edges = np.unique(
        np.sort(
            np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1
        ),
        axis=0,
    )
    lengths = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
    edges, lengths = edges[lengths > 1e-12], lengths[lengths > 1e-12]
    boundary = np.zeros(len(p), bool)
    cross = free[edges[:, 0]] != free[edges[:, 1]]
    boundary[edges[cross].ravel()] = True
    assert boundary.any() and free.any()
    graph = coo_matrix(
        (
            np.r_[lengths, lengths],
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(p), len(p)),
    ).tocsr()
    distance = dijkstra(
        graph,
        indices=np.flatnonzero(boundary),
        min_only=True,
        directed=False,
        limit=args.transition,
    )
    t = np.clip(distance / args.transition, 0, 1)
    desired = t * t * (3 - 2 * t)
    desired[~free] = 0
    upper = floor_upper(baseline[:, 1], delta[:, 1], free, args.floor)
    print(
        json.dumps(
            {
                "sourceFans": len(p),
                "freeClothFans": int(free.sum()),
                "sourceEdges": len(edges),
                "floor": args.floor,
                "ratio": args.ratio,
            }
        ),
        flush=True,
    )
    logger = lambda m: print(json.dumps(m), flush=True)
    if args.reuse_alpha:
        previous = json.loads((args.reuse_alpha / "solve.json").read_text())
        assert previous["inputSha256"] == sha(args.base / "input.json")
        assert previous["parameters"]["ratio"] == args.ratio
        assert previous["parameters"]["floor"] == args.floor
        assert previous["parameters"]["transitionMetres"] == args.transition
        assert previous["outputHashes"]["alpha.f64bin"] == sha(
            args.reuse_alpha / "alpha.f64bin"
        )
        alpha = np.fromfile(args.reuse_alpha / "alpha.f64bin", "<f8")
        assert alpha.shape == upper.shape and np.all((alpha >= 0) & (alpha <= upper))
        assert np.all(alpha[~free] == 0)
        fit = {
            "reusedFrom": str(args.reuse_alpha),
            "solveSha256": sha(args.reuse_alpha / "solve.json"),
            "scope": "Same hash-bound scalar field; only support reduction changes. No new convergence claim.",
        }
    elif args.algorithm in ["admm", "admm-box"]:
        assert args.repair_passes == 0
        alpha, fit = fit_alpha_admm(
            baseline,
            delta,
            edges,
            lengths,
            free,
            desired,
            upper,
            args.ratio,
            args.iterations,
            logger,
            boxed=args.algorithm == "admm-box",
        )
    else:
        alpha, fit = fit_alpha(
            baseline,
            delta,
            edges,
            lengths,
            free,
            desired,
            upper,
            args.ratio,
            args.iterations,
            logger,
            repair_passes=args.repair_passes,
        )
    changed_group = free & (alpha > 0)
    rows = np.flatnonzero(changed_group)
    candidate_ids = np.concatenate([ids0[reps[rows]], ids1[reps[rows]]], axis=1)
    candidate_weights = np.concatenate(
        [
            weights0[reps[rows]] * (1 - alpha[rows, None]),
            weights1[reps[rows]] * alpha[rows, None],
        ],
        axis=1,
    )
    controls = np.empty((len(rows), 8, 3))
    for k in range(8):
        m = matrices[candidate_ids[:, k]]
        controls[:, k] = np.einsum("nij,nj->ni", m[:, :3, :3], p[rows]) + m[:, :3, 3]
    # Merge identical JOINT IDs, never merely coincident posed points. Equal
    # positions at one frame may come from bones with different future motion.
    if args.reduction == "nearest":
        candidate_weights = merge_joint_supports(candidate_ids, candidate_weights)
    reducer = reduce_four_stable if args.reduction == "nearest" else reduce_four
    slots, sparse = reducer(controls, candidate_weights)
    group_ids = ids0[reps].copy()
    group_weights = weights0[reps].copy()
    group_ids[rows] = np.take_along_axis(candidate_ids, slots, axis=1)
    group_weights[rows] = sparse.astype(np.float32)
    reduced = skin(p, group_ids, group_weights, matrices)
    expected = baseline + alpha[:, None] * delta
    error = np.linalg.norm(reduced - expected, axis=1)
    assert (
        error.max() <= 0.0000005
    ), "Float32 reduced weights exceed the0.5micrometre frozen-pose error budget"
    result_ids, result_weights = ids0.copy(), weights0.copy()
    changed = changed_group[inverse]
    result_ids[changed], result_weights[changed] = (
        group_ids[inverse[changed]],
        group_weights[inverse[changed]],
    )
    assert not (changed & protected).any()
    assert np.array_equal(result_ids[~changed], ids0[~changed]) and np.array_equal(
        result_weights[~changed], weights0[~changed]
    )
    assert (
        np.isfinite(result_weights).all()
        and result_weights.min() >= 0
        and np.max(np.abs(result_weights.sum(1) - 1)) < 1e-5
    )

    def metrics(posed):
        ratio = (
            np.linalg.norm(posed[edges[:, 0]] - posed[edges[:, 1]], axis=1) / lengths
        )
        touched = changed_group[edges[:, 0]] | changed_group[edges[:, 1]]
        return {
            "allSourceP999": float(np.quantile(ratio, 0.999)),
            "allSourceMaximum": float(ratio.max()),
            "changedDomainP999": float(np.quantile(ratio[touched], 0.999)),
            "changedDomainMaximum": float(ratio[touched].max()),
            "freeClothMinimumY": float(posed[free, 1].min()),
            "allSourceMinimumY": float(posed[:, 1].min()),
        }

    output = {}
    for name, values in [
        ("result-ids.u16bin", result_ids.astype("<u2")),
        ("result-weights.f32bin", result_weights.astype("<f4")),
        ("alpha.f64bin", alpha.astype("<f8")),
        ("changed.u8bin", changed.astype("u1")),
    ]:
        values.tofile(args.output / name)
        output[name] = sha(args.output / name)
    report = {
        "kind": "floor-safe-frozen-cloth-blend",
        "base": str(args.base),
        "inputSha256": sha(args.base / "input.json"),
        "parentSourceRigSha256": meta["baseSha256"],
        "clothTemplateSha256": meta["clothSha256"],
        "poseFile": meta["poseFile"],
        "poseSha256": meta["poseSha256"],
        "parameters": {
            "algorithm": "reused-alpha" if args.reuse_alpha else args.algorithm,
            "iterations": 0 if args.reuse_alpha else args.iterations,
            "reuseAlpha": str(args.reuse_alpha) if args.reuse_alpha else None,
            "ratio": args.ratio,
            "floor": args.floor,
            "transitionMetres": args.transition,
            "repairPasses": args.repair_passes,
            "reduction": args.reduction,
        },
        "fit": fit,
        "freeClothFans": int(free.sum()),
        "changedCopies": int(changed.sum()),
        "maximumPoseReductionErrorMetres": float(error.max()),
        "meanAlpha": float(alpha[free].mean()),
        "maximumAlpha": float(alpha.max()),
        "meanDisplacementMetres": float(
            np.linalg.norm(reduced[free] - baseline[free], axis=1).mean()
        ),
        "before": metrics(baseline),
        "after": metrics(reduced),
        "nonPanelAndProtectedWeightsUnchanged": True,
        "outputHashes": output,
        "seconds": time.monotonic() - started,
        "accepted": False,
        "activated": False,
        "scope": "Convex scalar cloth movement and exact four-support point reduction at one pose. Fixed body rows retain baseline failures. Exported GLB, intermediate motion, normal/compression/collision and naturalness must still pass independent checks.",
    }
    (args.output / "solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                k: report[k]
                for k in [
                    "meanAlpha",
                    "maximumPoseReductionErrorMetres",
                    "before",
                    "after",
                    "seconds",
                    "accepted",
                ]
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
