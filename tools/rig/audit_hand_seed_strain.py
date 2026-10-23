"""Necessary stretch bound between immutable measured source-hand pins.

For any deformation, endpoint distance cannot exceed the sum of deformed
edge lengths on a source path. A ratio above the edge-maximum limit therefore
proves those particular pins/pose/path are incompatible with that limit. A
ratio below it is only a necessary bound, never a feasibility certificate.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

from pose_weight_fit import digest


def seed_path_bounds(points, faces, seeds, matrices):
    edges = np.unique(
        np.sort(
            np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]),
            axis=1,
        ),
        axis=0,
    )
    lengths = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
    if not np.isfinite(lengths).all() or not np.all(lengths > 0):
        raise ValueError("Nondegenerate finite source path required")
    graph = coo_matrix(
        (
            np.tile(lengths, 2),
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(points), len(points)),
    ).tocsr()
    vertices = np.array([s["vertex"] for s in seeds])
    joints = np.array([s["jointIndex"] for s in seeds])
    distances = dijkstra(graph, indices=vertices)[:, vertices]
    rows, cols = np.triu_indices(len(vertices), 1)
    valid = np.isfinite(distances[rows, cols]) & (distances[rows, cols] > 1e-12)
    rows, cols = rows[valid], cols[valid]
    result = []
    for pose in matrices:
        q = (
            np.einsum("nij,nj->ni", pose[joints, :3, :3], points[vertices])
            + pose[joints, :3, 3]
        )
        posed = np.linalg.norm(q[rows] - q[cols], axis=1)
        ratio = posed / distances[rows, cols]
        witnesses = []
        for i in np.argsort(-ratio)[:20]:
            a, b = int(rows[i]), int(cols[i])
            witnesses.append(
                {
                    "a": seeds[a],
                    "b": seeds[b],
                    "sourcePathMeters": float(distances[a, b]),
                    "posedEndpointDistanceMeters": float(posed[i]),
                    "necessaryMaximumStretch": float(ratio[i]),
                    "sourceA": points[vertices[a]].tolist(),
                    "sourceB": points[vertices[b]].tolist(),
                    "posedA": q[a].tolist(),
                    "posedB": q[b].tolist(),
                }
            )
        result.append(
            {
                "pairs": len(rows),
                "maximumLowerBound": float(ratio.max()),
                "witnesses": witnesses,
            }
        )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    meta_file = args.base / "feasibility-input.json"
    meta = json.loads(meta_file.read_text())
    assert meta["kind"] == "source-support-layout"
    for name, sha in meta["files"].items():
        assert digest(args.base / name) == sha
    parent = Path(meta["candidate"])
    assert digest(parent / "solve.json") == meta["candidateSolveSha256"]
    solve = json.loads((parent / "solve.json").read_text())
    original_meta_file = Path(solve["input"]) / "input.json"
    assert digest(original_meta_file) == solve["inputMetadataSha256"]
    names = json.loads(original_meta_file.read_text())["jointNames"]
    points = (
        np.fromfile(args.base / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    )
    faces = np.fromfile(args.base / "triangles.bin", "<u4").reshape(-1, 3)
    fans = np.fromfile(args.base / "groups.bin", "<u4")
    lookup = {int(f): i for i, f in enumerate(fans)}
    matrices = (
        np.fromfile(args.base / "feasibility-matrices.bin", "<f8")
        .reshape(meta["poseCount"], -1, 4, 4)
        .transpose(0, 1, 3, 2)
    )
    ids = np.fromfile(args.base / "result-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(args.base / "result-weights.bin", "<f4").reshape(-1, 4)
    output = {
        "assetSha256": meta["assetSha256"],
        "inputMetadataSha256": digest(meta_file),
        "maximumEdgeThreshold": 2,
        "accepted": False,
        "activated": False,
        "scope": __doc__,
        "hands": [],
    }
    for hand in solve["hands"]:
        seeds = []
        for seed in hand["measuredSeeds"]:
            joint = names.index(seed["joint"])
            for fan in seed["currentSourceFans"]:
                v = lookup[fan]
                assert np.sum(weights[v][ids[v] == joint]) >= 1 - 1e-7
                seeds.append(
                    {
                        "vertex": v,
                        "sourceFan": fan,
                        "joint": seed["joint"],
                        "jointIndex": joint,
                    }
                )
        bounds = seed_path_bounds(points, faces, seeds, matrices)
        output["hands"].append(
            {
                "side": hand["side"],
                "seeds": len(seeds),
                "poses": [
                    {**p, "pose": meta["poses"][i]} for i, p in enumerate(bounds)
                ],
            }
        )
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(
        json.dumps(
            [
                {
                    "side": h["side"],
                    "lowerBounds": [p["maximumLowerBound"] for p in h["poses"]],
                }
                for h in output["hands"]
            ]
        )
    )


if __name__ == "__main__":
    main()
