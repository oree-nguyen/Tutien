"""Screen source-derived weights on proven source-edge chart continuity.

No source position, triangle, UV or image is generated or changed. A converged
weight solve is a candidate, never an animation, garment or contact certificate.
"""

import argparse
import hashlib
import json
import shutil
import time
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import cg
from scipy.spatial import cKDTree
from source_garment_graph import source_welds, sparsify_four_influences


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def screened_operator(points, triangles, radius):
    edges = np.unique(
        np.sort(
            np.concatenate(
                (triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]])
            ),
            axis=1,
        ),
        axis=0,
    )
    lengths = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
    valid = lengths > 1e-12
    edges, lengths = edges[valid], lengths[valid]
    conductance = 1 / lengths
    adj = coo_matrix(
        (
            np.r_[conductance, conductance],
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(points), len(points)),
    ).tocsr()
    mass = np.bincount(
        edges.ravel(), weights=np.repeat(lengths / 6, 2), minlength=len(points)
    )
    if np.any(mass <= 0):
        raise ValueError(
            "Source contains isolated groups without a screened surface domain"
        )
    laplacian = diags(np.asarray(adj.sum(axis=1)).ravel()) - adj
    return (diags(mass) + radius**2 * laplacian).tocsr(), mass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--radius", type=float, default=0.04)
    a = parser.parse_args()
    root = Path(".local/rig-candidates").resolve()
    if (
        a.input.resolve() == a.output.resolve()
        or root not in a.output.resolve().parents
        or not 0.001 <= a.radius <= 0.2
    ):
        raise ValueError("Invalid staging input/output or smoothing radius")
    meta = json.loads((a.input / "input.json").read_text())
    original = meta["original"]
    for filename, key in [
        ("positions.bin", "positions"),
        ("triangles.bin", "triangles"),
    ]:
        if digest(a.input / filename) != original[key]:
            raise ValueError("Stale original source " + key)
    if digest(Path(meta["input"])) != meta["inputSha256"]:
        raise ValueError("Source rig has changed")
    upstream = json.loads((a.input / "heat-solve.json").read_text())
    if not upstream["weightsValid"]:
        raise ValueError("Cannot smooth missing/rejected source weights")
    p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    tri = np.fromfile(a.input / "triangles.bin", "<u4").reshape(-1, 3)
    ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
    if (
        len(ids) != len(p)
        or not np.isfinite(weights).all()
        or np.min(weights) < 0
        or np.max(np.abs(weights.sum(1) - 1)) > 1e-5
    ):
        raise ValueError("Invalid source weight field")
    started = time.monotonic()
    weld, proof = source_welds(p, tri)
    representatives, inverse = np.unique(weld, return_inverse=True)
    points = p[representatives]
    count = len(points)
    field = np.zeros((count, len(meta["joints"])))
    copies = np.bincount(inverse, minlength=count)
    for k in range(4):
        np.add.at(field, (inverse, ids[:, k]), weights[:, k] / copies[inverse])
    frames = json.loads(Path("data/rig/hand-frames.json").read_text())["heroes"][
        meta["hero"]
    ]["hands"]
    hand_points = np.array(
        [
            x
            for hand in frames.values()
            for finger in hand["fingers"].values()
            for x in finger["points"]
        ]
    )
    # This spatial diagnostic protection is explicit, not an approved anatomy mask.
    protected = cKDTree(hand_points).query(points)[0] < 0.025
    free = ~protected
    operator, mass = screened_operator(points, inverse[tri], a.radius)
    matrix = operator[free][:, free].tocsr()
    fixed = operator[free][:, protected]
    import pyamg

    preconditioner = pyamg.smoothed_aggregation_solver(
        matrix, max_coarse=256
    ).aspreconditioner()
    result = field.copy()
    residuals = []
    print(
        json.dumps(
            {
                "groups": count,
                "protectedDiagnosticGroups": int(protected.sum()),
                "radius": a.radius,
                "sourceContinuity": proof,
            }
        ),
        flush=True,
    )
    for joint in range(field.shape[1]):
        rhs = mass[free] * field[free, joint] - fixed @ field[protected, joint]
        if not np.any(rhs):
            result[free, joint] = 0
            continue
        solved, info = cg(
            matrix,
            rhs,
            x0=field[free, joint],
            M=preconditioner,
            rtol=1e-8,
            atol=0,
            maxiter=800,
        )
        residual = np.linalg.norm(matrix @ solved - rhs) / max(
            np.linalg.norm(rhs), 1e-30
        )
        if info or residual > 2e-8 or np.min(solved) < -1e-6:
            raise RuntimeError(
                "Rejected field solve "
                + meta["joints"][joint]["name"]
                + f" info={info} residual={residual}"
            )
        result[free, joint] = np.maximum(solved, 0)
        residuals.append(
            {"joint": meta["joints"][joint]["name"], "residual": float(residual)}
        )
        print(json.dumps(residuals[-1]), flush=True)
    result /= result.sum(1)[:, None]
    out_ids, out_weights, discarded = sparsify_four_influences(result)
    a.output.mkdir(parents=True, exist_ok=True)
    for file in ["input.json", "positions.bin", "triangles.bin"]:
        shutil.copyfile(a.input / file, a.output / file)
    out_ids[inverse].astype("<u2").tofile(a.output / "heat-ids.bin")
    out_weights[inverse].astype("<f4").tofile(a.output / "heat-weights.bin")
    report = {
        "method": "Positive screened source-edge Laplacian, fixed diagnostic hand groups, all source-joint fields; continuous rank-five reduction to four",
        "parent": str(a.input),
        "parentSolveSha256": digest(a.input / "heat-solve.json"),
        "sourceInputSha256": meta["inputSha256"],
        "radiusMetres": a.radius,
        "sourceContinuity": proof,
        "groups": count,
        "protectedDiagnosticGroups": int(protected.sum()),
        "maximumDiscardedWeight": float(discarded.max()),
        "residuals": residuals,
        "seconds": time.monotonic() - started,
        "weightsValid": True,
        "missingWeightVertices": 0,
        "accepted": False,
        "activated": False,
        "scope": "Weight-field candidate only. Protected groups are a spatial diagnostic, not anatomy approval. Independent all-primitive skin, real contact, seam, collision and appearance checks remain mandatory.",
    }
    (a.output / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"finished": True, "seconds": report["seconds"]}), flush=True)


if __name__ == "__main__":
    main()
