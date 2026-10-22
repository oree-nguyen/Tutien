"""Locate residual strain and kept-seam gaps on every original source edge.

Raw float source arrays and serialized/export-verified weights are used, without
the solver's representative-edge reduction. Coordinate bins are not anatomy.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("output", type=Path)
    a = parser.parse_args()
    solve = json.loads((a.candidate / "solve.json").read_text())
    export = json.loads((a.candidate / "export.json").read_text())
    base = Path(solve["base"])
    for name, expected in solve["inputHashes"].items():
        if sha(base / name) != expected:
            raise ValueError("Stale source input " + name)
    if (
        sha(Path(export["output"])) != export["outputSha256"]
        or sha(a.candidate / "solve.json") != export["solveSha256"]
        or sha(a.candidate / "result-weights.bin") != solve["outputWeightsSha256"]
    ):
        raise ValueError("Stale serialized candidate")
    meta = json.loads((base / "input.json").read_text())
    p = np.fromfile(base / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    t = np.fromfile(base / "triangles.bin", "<u4").reshape(-1, 3)
    ids_path = a.candidate / "result-ids.bin" if solve.get("jointIdsChanged") else base / "result-ids.bin"
    if solve.get("jointIdsChanged") and sha(ids_path) != solve.get("outputIdsSha256"):
        raise ValueError("Stale changed source support IDs")
    ids = np.fromfile(ids_path, "<u2").reshape(-1, 4)
    weights = np.fromfile(a.candidate / "result-weights.bin", "<f4").reshape(-1, 4)
    protected = np.fromfile(base / "protected.bin", "u1")
    weld = np.fromfile(base / "source-welds.u32bin", "<u4")
    _, reps, inverse = np.unique(weld, return_index=True, return_inverse=True)
    representatives = reps[inverse]
    edges = np.unique(
        np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), axis=1),
        axis=0,
    )
    lengths = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
    edges, lengths = edges[lengths > 1e-12], lengths[lengths > 1e-12]
    pose_count = json.loads((base / "feasibility-input.json").read_text())["poseCount"]
    matrices = (
        np.fromfile(base / "feasibility-matrices.bin", "<f8")
        .reshape(pose_count, -1, 4, 4)
        .transpose(0, 1, 3, 2)
    )
    rows = []
    for index, matrices in enumerate(matrices):
        posed = np.zeros_like(p)
        for k in range(4):
            m = matrices[ids[:, k]]
            posed += (np.einsum("nij,nj->ni", m[:, :3, :3], p) + m[:, :3, 3]) * weights[
                :, k, None
            ]
        ratio = (
            np.linalg.norm(posed[edges[:, 0]] - posed[edges[:, 1]], axis=1) / lengths
        )
        worst = np.argsort(ratio)[-30:][::-1]
        gaps = np.linalg.norm(posed - posed[representatives], axis=1)
        seam_vertex = int(np.argmax(gaps))
        worst_edges = []
        for edge in worst:
            vs = edges[edge]
            worst_edges.append(
                {
                    "sourceVertices": vs.tolist(),
                    "source": p[vs].tolist(),
                    "posed": posed[vs].tolist(),
                    "ratio": float(ratio[edge]),
                    "bindLengthMetres": float(lengths[edge]),
                    "protected": protected[vs].astype(bool).tolist(),
                    "supports": [
                        [
                            {"joint": meta["joints"][j]["name"], "weight": float(w)}
                            for j, w in zip(ids[v], weights[v])
                            if w > 0
                        ]
                        for v in vs
                    ],
                }
            )
        rows.append(
            {
                "pose": index,
                "p999": float(
                    np.partition(ratio, int((len(ratio) - 1) * 0.999))[
                        int((len(ratio) - 1) * 0.999)
                    ]
                ),
                "maximum": float(ratio.max()),
                "edgesAbove1_5": int((ratio > 1.5).sum()),
                "edgesAbove2": int((ratio > 2).sum()),
                "maximumKeptSeamGapMetres": float(gaps.max()),
                "seamCopiesAbove1Micrometre": int((gaps > 1e-6).sum()),
                "worstSeam": {
                    "sourceVertex": seam_vertex,
                    "representative": int(representatives[seam_vertex]),
                    "sourceGapMetres": float(
                        np.linalg.norm(p[seam_vertex] - p[representatives[seam_vertex]])
                    ),
                },
                "minimumY": float(posed[:, 1].min()),
                "worstSourceEdges": worst_edges,
            }
        )
    report = {
        "hero": meta["hero"],
        "asset": export["output"],
        "assetSha256": export["outputSha256"],
        "inputHashes": solve["inputHashes"],
        "outputWeightsSha256": solve["outputWeightsSha256"],
        "sourceVertices": len(p),
        "sourceTriangles": len(t),
        "allOriginalUniqueEdges": len(edges),
        "poses": rows,
        "accepted": False,
        "activated": False,
        "scope": "Independent NumPy LBS on all original source edges and original kept UV-seam groups; no anatomical, collision, compression, whole-motion or appearance acceptance",
    }
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                "hero": meta["hero"],
                "poses": [
                    {k: v for k, v in r.items() if k != "worstSourceEdges"}
                    for r in rows
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
