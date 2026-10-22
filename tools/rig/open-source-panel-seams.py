"""Propose lower-panel openings on original edges, retaining the waistband.

This opens an existing left/right ownership interface only. It neither invents
anatomy under the robe nor approves the old ownership labels as a cloth pattern.
"""

import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from coat_cut_topology import corner_components
from verify_cut_fans import reconstruct


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def panel_openings(positions, triangles, weld, roles, waist):
    if not np.isfinite(waist) or not 0.5 < waist < 1.1:
        raise ValueError("Invalid retained waistband height")
    if len(roles) != len(triangles) or len(weld) != len(positions):
        raise ValueError("Source arrays disagree")
    t = weld[triangles]
    edge = np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), axis=1)
    face = np.tile(np.arange(len(t)), 3)
    valid = edge[:, 0] != edge[:, 1]
    edge, face = edge[valid], face[valid]
    key = edge[:, 0].astype(np.uint64) * len(weld) + edge[:, 1]
    order = np.argsort(key, kind="stable")
    edge, face, key = edge[order], face[order], key[order]
    start = np.r_[0, np.flatnonzero(key[1:] != key[:-1]) + 1]
    count = np.diff(np.r_[start, len(key)])
    if np.any(count > 2):
        raise ValueError("Nonmanifold source requires explicit repair")
    pair = start[count == 2]
    a, b = roles[face[pair]], roles[face[pair + 1]]
    lower = np.max(positions[edge[pair], 1], axis=1) < waist
    chosen = pair[(((a == 1) & (b == 2)) | ((a == 2) & (b == 1))) & lower]
    return edge[chosen]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--waist", type=float, default=0.86)
    args = parser.parse_args()
    assert args.output.resolve() not in [args.raw.resolve(), args.base.resolve()]
    plan = json.loads((args.base / "cut-plan.json").read_text())
    for name, entry in plan["files"].items():
        assert digest(args.base / name) == entry["sha256"]
    raw_meta = json.loads((args.raw / "input.json").read_text())
    assert raw_meta["sourceSha256"] == plan["sourceSha256"]
    p = np.fromfile(args.raw / "positions.bin", "<f4").reshape(-1, 3)
    tri = np.fromfile(args.raw / "triangles.bin", "<u4").reshape(-1, 3)
    weld = np.fromfile(args.raw / "source-welds.u32bin", "<u4")
    roles = np.fromfile(args.base / "face-roles.u8bin", "u1")
    old = np.fromfile(args.base / "cut-edges.u32bin", "<u4").reshape(-1, 2)
    extra = panel_openings(p, tri, weld, roles, args.waist)
    assert len(extra), "No actual lower-panel interface was found"
    protected = np.fromfile(args.raw / "protected.bin", "u1")
    assert not protected[extra].any(), "Proposed panel cut touches protected hand"
    cuts = np.unique(np.concatenate([old, extra]), axis=0).astype("<u4")
    corners, diagnostic = corner_components(tri, weld, cuts)
    np.testing.assert_array_equal(corners, reconstruct(tri, weld, cuts))
    args.output.mkdir(parents=True, exist_ok=True)
    for name, array in [
        ("cut-edges.u32bin", cuts),
        ("corner-components.u32bin", corners.astype("<u4")),
        ("face-roles.u8bin", roles),
    ]:
        array.tofile(args.output / name)
    degree = np.bincount(extra.ravel(), minlength=len(weld))
    plan.update(
        {
            "previousPlan": str(args.base / "cut-plan.json"),
            "previousPlanSha256": digest(args.base / "cut-plan.json"),
            "operation": "Open lower left/right source-panel interfaces below the retained waistband; retain previous sleeve/boot junction proposals. Do not change sleeve geometry or fabricate hidden anatomy.",
            "panelOpening": {
                "waistHeightMetres": args.waist,
                "additionalEdges": len(cuts) - len(old),
                "endpoints": int((degree == 1).sum()),
                "branchedVertices": int((degree > 2).sum()),
                "lengthMetres": float(
                    np.linalg.norm(p[extra[:, 0]] - p[extra[:, 1]], axis=1).sum()
                ),
                "bounds": [
                    p[extra].min((0, 1)).tolist(),
                    p[extra].max((0, 1)).tolist(),
                ],
            },
            "diagnostics": diagnostic,
            "independentCornerGraphPassed": True,
            "files": {
                name: {
                    "sha256": digest(args.output / name),
                    "bytes": (args.output / name).stat().st_size,
                }
                for name in [
                    "cut-edges.u32bin",
                    "corner-components.u32bin",
                    "face-roles.u8bin",
                ]
            },
            "patternApproved": False,
            "accepted": False,
            "activated": False,
        }
    )
    (args.output / "cut-plan.json").write_text(json.dumps(plan, indent=2) + "\n")
    print(json.dumps(plan["panelOpening"]))


if __name__ == "__main__":
    main()
