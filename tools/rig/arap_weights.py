"""Offline shape-preserving four-weight trial on an explicit source star.

Alternating proper local rotations and bounded skin weights minimizes ARAP
edge error. Source positions and joint IDs never change. This objective also
penalizes shortening, unlike the upper-length feasibility solver. It is not a
collision, volume, contact or whole-animation acceptance test.
"""

import argparse
import json
import time
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix, diags, eye
from scipy.sparse.linalg import splu

from pose_weight_fit import (
    diagonal_steps,
    digest,
    transformed_coefficients,
    weighted_simplex,
)


def proper_rotations(source_edges, posed_edges, edges, count):
    """Weighted Procrustes rotations; reflections are never accepted as R."""
    inverse_squared = 1 / np.einsum("ej,ej->e", source_edges, source_edges)
    covariance = np.zeros((count, 3, 3))
    products = np.einsum("ei,ej,e->eij", posed_edges, source_edges, inverse_squared)
    np.add.at(covariance, edges[:, 0], products)
    np.add.at(covariance, edges[:, 1], products)
    u, _, vt = np.linalg.svd(covariance)
    orientation = np.linalg.det(u @ vt)
    u[:, :, -1] *= np.where(orientation < 0, -1, 1)[:, None]
    return u @ vt


def edge_operator(coefficients, origin, edges, length, free, initial):
    """Actual LBS Jacobian, including edges ending at a fixed neighbor."""
    pose_count, count = coefficients.shape[:2]
    selected = np.flatnonzero(free)
    lookup = np.full(count, -1, dtype=int)
    lookup[selected] = np.arange(len(selected))
    rows, columns, values = [], [], []
    constant = (origin[:, edges[:, 1]] - origin[:, edges[:, 0]]) / length[None, :, None]
    for endpoint, sign in [(0, -1), (1, 1)]:
        vertices = edges[:, endpoint]
        moving = free[vertices]
        indices = np.flatnonzero(moving)
        for pose in range(pose_count):
            for coordinate in range(3):
                for slot in range(4):
                    rows.append((pose * len(edges) + indices) * 3 + coordinate)
                    columns.append(lookup[vertices[moving]] * 4 + slot)
                    values.append(
                        sign
                        * coefficients[pose, vertices[moving], slot, coordinate]
                        / length[moving]
                    )
            constant[pose, ~moving] += (
                sign
                * np.einsum(
                    "ekj,ek->ej",
                    coefficients[pose, vertices[~moving]],
                    initial[vertices[~moving]],
                )
                / length[~moving, None]
            )
    operator = coo_matrix(
        (np.concatenate(values), (np.concatenate(rows), np.concatenate(columns))),
        shape=(pose_count * len(edges) * 3, len(selected) * 4),
    ).tocsr()
    operator.eliminate_zeros()
    return operator, constant, selected


def shape_summary(source, posed, edges):
    lengths = np.linalg.norm(source[edges[:, 1]] - source[edges[:, 0]], axis=1)
    ratio = (
        np.linalg.norm(posed[:, edges[:, 1]] - posed[:, edges[:, 0]], axis=2) / lengths
    )
    return [
        {
            "minimum": float(r.min()),
            "p01": float(np.quantile(r, 0.01)),
            "p999": float(np.sort(r)[int((len(r) - 1) * 0.999)]),
            "maximum": float(r.max()),
        }
        for r in ratio
    ]


def bounded_shape_dual(value, step, target, radius, strength):
    """Moreau prox of alpha/2 ||edge-target||² plus a length ball."""
    point = (value + strength * target) / (step[:, :, None] + strength)
    norm = np.linalg.norm(point, axis=2)
    point *= np.minimum(1, radius / np.maximum(norm, 1e-30))[:, :, None]
    return value - step[:, :, None] * point


def fit_bounded_arap(
    source,
    edges,
    origin,
    coefficients,
    initial,
    free,
    iterations=1000,
    radius=1.45,
    strength=0.1,
    log=None,
):
    """Shape objective with the existing upper-length constraint, no relaxation."""
    if not free.any() or iterations < 1 or not 1 < radius < 2 or strength <= 0:
        raise ValueError("Invalid bounded shape solve")
    edges = edges[free[edges].any(axis=1)]
    left, right = edges.T
    source_edges = source[right] - source[left]
    length = np.linalg.norm(source_edges, axis=1)
    assert np.all(length > 1e-12)
    tau, sigma, _ = diagonal_steps(coefficients, edges, length, free)
    weights = initial.astype(float).copy()
    extrapolated = weights.copy()
    dual = np.zeros((len(origin), len(edges), 3))
    history = []
    started = time.monotonic()
    for iteration in range(iterations):
        if iteration % 100 == 0:
            actual = origin + np.einsum("pnkj,nk->pnj", coefficients, weights)
            target = np.empty_like(dual)
            for p, positions in enumerate(actual):
                rotations = proper_rotations(
                    source_edges, positions[right] - positions[left], edges, len(source)
                )
                average = (rotations[left] + rotations[right]) * 0.5
                target[p] = (
                    np.einsum("eij,ej->ei", average, source_edges) / length[:, None]
                )
        actual = origin + np.einsum("pnkj,nk->pnj", coefficients, extrapolated)
        edge = (actual[:, right] - actual[:, left]) / length[None, :, None]
        dual = bounded_shape_dual(
            dual + sigma[:, :, None] * edge, sigma, target, radius, strength
        )
        flux = dual / length[None, :, None]
        divergence = np.stack(
            [
                np.stack(
                    [
                        np.bincount(right, weights=f[:, k], minlength=len(source))
                        - np.bincount(left, weights=f[:, k], minlength=len(source))
                        for k in range(3)
                    ],
                    axis=1,
                )
                for f in flux
            ]
        )
        gradient = np.einsum("pnkj,pnj->nk", coefficients, divergence)
        value = weights.copy()
        value[free] = weighted_simplex(
            weights[free] - tau[free] * gradient[free], tau[free]
        )
        extrapolated = 2 * value - weights
        weights = value
        if iteration % 100 == 99 or iteration == iterations - 1:
            actual = origin + np.einsum("pnkj,nk->pnj", coefficients, weights)
            ratios = np.linalg.norm(actual[:, right] - actual[:, left], axis=2) / length
            residual = (actual[:, right] - actual[:, left]) / length[
                None, :, None
            ] - target
            record = {
                "iteration": iteration + 1,
                "seconds": time.monotonic() - started,
                "rmsRelativeEdgeError": float(np.sqrt(np.mean(residual**2))),
                "edgesOverInternalRadius": int((ratios > radius).sum()),
                "edgeDiagnostics": shape_summary(source, actual, edges),
            }
            history.append(record)
            if log:
                log(record)
    assert np.array_equal(weights[~free], initial[~free])
    assert np.min(weights) >= 0 and np.isfinite(weights).all()
    return weights, history


def fit_arap(
    source,
    edges,
    origin,
    coefficients,
    initial,
    free,
    iterations=20,
    inner_iterations=60,
    rho=10.0,
    prior=0.001,
    log=None,
    metric="identity",
    radius=None,
):
    if radius is not None and not 1 < radius < 2:
        raise ValueError("Internal length radius must remain below the maximum gate")
    if (
        not free.any()
        or iterations < 1
        or inner_iterations < 1
        or rho <= 0
        or prior <= 0
    ):
        raise ValueError("Nonempty free domain and positive solve settings required")
    if (
        not np.isfinite(initial).all()
        or np.any(initial < 0)
        or not np.allclose(initial.sum(axis=1), 1, atol=1e-6)
    ):
        raise ValueError("Invalid source simplex")
    edges = np.asarray(edges, dtype=int)
    moving = free[edges].any(axis=1)
    edges = edges[moving]
    source_edges = source[edges[:, 1]] - source[edges[:, 0]]
    length = np.linalg.norm(source_edges, axis=1)
    if not len(edges) or not np.all(length > 1e-12):
        raise ValueError("Nondegenerate incident source edges required")
    operator, constant, selected = edge_operator(
        coefficients, origin, edges, length, free, initial
    )
    transpose = operator.T.tocsr()
    gram = transpose @ operator
    if metric not in ["identity", "jacobi"]:
        raise ValueError("Unknown ADMM metric")
    diagonal = (
        gram.diagonal() + prior if metric == "jacobi" else np.ones(operator.shape[1])
    )
    system = (gram + prior * eye(operator.shape[1]) + rho * diags(diagonal)).tocsc()
    factor = splu(system)
    weights = initial.astype(float).copy()
    reference = initial[selected].ravel()
    history = []
    started = time.monotonic()
    dual = np.zeros(len(reference))
    edge_dual = np.zeros(operator.shape[0])
    edge_auxiliary = operator @ reference + constant.ravel()
    for iteration in range(iterations):
        posed = origin + np.einsum("pnkj,nk->pnj", coefficients, weights)
        target = np.empty((len(posed), len(edges), 3))
        for p, positions in enumerate(posed):
            rotations = proper_rotations(
                source_edges,
                positions[edges[:, 1]] - positions[edges[:, 0]],
                edges,
                len(source),
            )
            average = (rotations[edges[:, 0]] + rotations[edges[:, 1]]) * 0.5
            target[p] = np.einsum("eij,ej->ei", average, source_edges) / length[:, None]
        b = transpose @ (target - constant).ravel() + prior * reference
        z = weights[selected].ravel().copy()
        for inner in range(inner_iterations):
            if radius is not None:
                b = (
                    transpose @ (edge_auxiliary - edge_dual - constant.ravel())
                    + prior * reference
                )
            x = factor.solve(b + rho * diagonal * (z - dual))
            before = z
            z = weighted_simplex(
                (x + dual).reshape(-1, 4), (1 / diagonal).reshape(-1, 4)
            ).ravel()
            dual += x - z
            primal = float(np.max(np.abs(x - z)))
            change = float(np.max(np.abs(z - before)))
            if radius is not None:
                actual_edge = operator @ x + constant.ravel()
                edge_auxiliary = (
                    (actual_edge + edge_dual + 0.1 * target.ravel()) / 1.1
                ).reshape(-1, 3)
                norm = np.linalg.norm(edge_auxiliary, axis=1)
                edge_auxiliary *= np.minimum(1, radius / np.maximum(norm, 1e-30))[
                    :, None
                ]
                edge_auxiliary = edge_auxiliary.ravel()
                edge_dual += actual_edge - edge_auxiliary
                primal = max(
                    primal, float(np.max(np.abs(actual_edge - edge_auxiliary)))
                )
            if max(primal, change) < 1e-7:
                break
        weights[selected] = z.reshape(-1, 4)
        actual = origin + np.einsum("pnkj,nk->pnj", coefficients, weights)
        residual = operator @ z + constant.ravel() - target.ravel()
        record = {
            "iteration": iteration + 1,
            "seconds": time.monotonic() - started,
            "rmsRelativeEdgeError": float(np.sqrt(np.mean(residual**2))),
            "admmPrimal": primal,
            "lastWeightChange": change,
            "innerIterations": inner + 1,
            "edgeDiagnostics": shape_summary(source, actual, edges),
        }
        history.append(record)
        if log:
            log(record)
    assert np.array_equal(weights[~free], initial[~free])
    assert np.isfinite(weights).all() and np.all(weights >= 0)
    assert np.max(np.abs(weights.sum(axis=1) - 1)) < 1e-6
    return weights, history


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--inner-iterations", type=int, default=60)
    parser.add_argument("--rho", type=float, default=10.0)
    parser.add_argument("--metric", choices=["identity", "jacobi"], default="identity")
    parser.add_argument("--bounded", action="store_true")
    parser.add_argument("--constrained-admm", action="store_true")
    parser.add_argument("--radius", type=float, default=1.45)
    args = parser.parse_args()
    assert not (args.bounded and args.constrained_admm)
    assert (
        str(args.output).startswith(".local/rig-candidates/")
        and not args.output.exists()
    )
    meta = json.loads((args.base / "feasibility-input.json").read_text())
    assert meta["kind"] == "source-support-layout"
    hashes = meta["files"]
    for name, sha in hashes.items():
        assert digest(args.base / name) == sha
    assert digest(args.base / "H01-C0-rigged.glb") == meta["assetSha256"]
    parent = Path(meta["candidate"])
    solve_file = parent / "solve.json"
    assert digest(solve_file) == meta["candidateSolveSha256"]
    solve = json.loads(solve_file.read_text())
    for name, sha in solve["files"].items():
        assert digest(parent / name) == sha
    positions = (
        np.fromfile(args.base / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    )
    faces = np.fromfile(args.base / "triangles.bin", "<u4").reshape(-1, 3)
    groups = np.fromfile(args.base / "groups.bin", "<u4")
    assert len(np.unique(groups)) == len(groups)
    ids = np.fromfile(args.base / "result-ids.bin", "<u2").reshape(-1, 4)
    initial = np.fromfile(args.base / "result-weights.bin", "<f4").reshape(-1, 4)
    protected = np.fromfile(args.base / "protected.bin", "u1").astype(bool)
    hand_fans = np.fromfile(Path(solve["input"]) / "fans.u32bin", "<u4")
    touched = np.fromfile(parent / "touched.u8bin", "u1").astype(bool)
    # Fit exactly the hash-bound hand components. Cuff/outer neighbors are fixed,
    # while their triangles remain in the source star and objective.
    free = np.isin(groups, hand_fans[touched]) & ~protected
    matrices = (
        np.fromfile(args.base / "feasibility-matrices.bin", "<f8")
        .reshape(meta["poseCount"], -1, 4, 4)
        .transpose(0, 1, 3, 2)
    )
    origin, coefficients = transformed_coefficients(positions, ids, matrices, initial)
    edges = np.unique(
        np.sort(
            np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]),
            axis=1,
        ),
        axis=0,
    )
    logger = lambda value: print(json.dumps(value), flush=True)
    if args.bounded:
        weights, history = fit_bounded_arap(
            positions,
            edges,
            origin,
            coefficients,
            initial,
            free,
            iterations=args.iterations,
            radius=args.radius,
            log=logger,
        )
    else:
        weights, history = fit_arap(
            positions,
            edges,
            origin,
            coefficients,
            initial,
            free,
            args.iterations,
            args.inner_iterations,
            rho=args.rho,
            metric=args.metric,
            radius=args.radius if args.constrained_admm else None,
            log=logger,
        )
    args.output.mkdir()
    weights.astype("<f4").tofile(args.output / "result-weights.bin")
    result = {
        "method": "proper-rotation ARAP edge fit with four fixed source joint slots and bounded simplex weights"
        + (
            "; upper-length-constrained CP"
            if args.bounded
            else (
                "; upper-length-constrained ADMM" if args.constrained_admm else "; ADMM"
            )
        ),
        "base": str(args.base),
        "assetSha256": meta["assetSha256"],
        "inputHashes": hashes,
        "outputWeightsSha256": digest(args.output / "result-weights.bin"),
        "poseCount": meta["poseCount"],
        "freeFans": int(free.sum()),
        "fixedCuffAndSeedsByteExact": True,
        "iterations": args.iterations,
        "rho": args.rho,
        "algorithmVersion": 2,
        "metric": args.metric,
        "bounded": args.bounded,
        "constrainedAdmm": args.constrained_admm,
        "internalRadius": (
            args.radius if args.bounded or args.constrained_admm else None
        ),
        "innerIterationsLimit": args.inner_iterations,
        "lastSubproblemConverged": (
            (
                history[-1]["admmPrimal"] < 1e-7
                and history[-1]["lastWeightChange"] < 1e-7
            )
            if not args.bounded
            else None
        ),
        "history": history,
        "accepted": False,
        "activated": False,
        "limitations": "No collision/volume/contact guarantee. Requires independent full-source and per-hand validation.",
    }
    (args.output / "solve.json").write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
