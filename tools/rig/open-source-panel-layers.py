"""Propose independent front/back drape on existing lower source-panel faces.

The source is watertight, including merged cloth layers. This only opens exact
source edges below the rigid waist rows; all original face data stays intact.
Spatial signs propose ownership, not an accepted garment/anatomy segmentation.
"""

import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from coat_cut_topology import corner_components
from verify_cut_fans import reconstruct


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    assert args.output.resolve() not in [args.raw.resolve(), args.base.resolve()]
    plan = json.loads((args.base / "cut-plan.json").read_text())
    for name, item in plan["files"].items():
        assert sha(args.base / name) == item["sha256"]
    assert (
        json.loads((args.raw / "input.json").read_text())["sourceSha256"]
        == plan["sourceSha256"]
    )
    p = np.fromfile(args.raw / "positions.bin", "<f4").reshape(-1, 3)
    tri = np.fromfile(args.raw / "triangles.bin", "<u4").reshape(-1, 3)
    weld = np.fromfile(args.raw / "source-welds.u32bin", "<u4")
    roles = np.fromfile(args.base / "face-roles.u8bin", "u1")
    layers = np.zeros(len(tri), np.uint8)
    panel = np.isin(roles, [1, 2])
    layers[panel] = np.where(p[tri[panel], 2].mean(1) >= 0, 1, 2)
    t = weld[tri]
    e = np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), axis=1)
    f = np.tile(np.arange(len(tri)), 3)
    good = e[:, 0] != e[:, 1]
    e, f = e[good], f[good]
    k = e[:, 0].astype(np.uint64) * len(weld) + e[:, 1]
    order = np.argsort(k, kind="stable")
    e, f, k = e[order], f[order], k[order]
    start = np.r_[0, np.flatnonzero(k[1:] != k[:-1]) + 1]
    counts = np.diff(np.r_[start, len(k)])
    assert not (counts > 2).any()
    pair = start[counts == 2]
    a, b = layers[f[pair]], layers[f[pair + 1]]
    selected = (((a == 1) & (b == 2)) | ((a == 2) & (b == 1))) & (
        p[e[pair], 1].max(1) < 0.75
    )
    extra = e[pair[selected]]
    assert len(extra) > 0
    old = np.fromfile(args.base / "cut-edges.u32bin", "<u4").reshape(-1, 2)
    cuts = np.unique(np.concatenate([old, extra]), axis=0).astype("<u4")
    corners, diagnostics = corner_components(tri, weld, cuts)
    np.testing.assert_array_equal(corners, reconstruct(tri, weld, cuts))
    args.output.mkdir(parents=True, exist_ok=True)
    for name, data in [
        ("cut-edges.u32bin", cuts),
        ("corner-components.u32bin", corners.astype("<u4")),
        ("face-roles.u8bin", roles),
        ("face-layers.u8bin", layers),
    ]:
        data.tofile(args.output / name)
    plan.update(
        {
            "previousPlan": str(args.base / "cut-plan.json"),
            "previousPlanSha256": sha(args.base / "cut-plan.json"),
            "operation": "Retain lower left/right openings and earlier source junction proposals; open front/back source-panel interfaces below750mm so opposing drape chains do not stretch one sewn circumference.",
            "frontBackOpening": {
                "heightMetres": 0.75,
                "additionalEdges": len(cuts) - len(old),
                "frontFaces": int((layers == 1).sum()),
                "backFaces": int((layers == 2).sum()),
                "bounds": [
                    p[extra].min((0, 1)).tolist(),
                    p[extra].max((0, 1)).tolist(),
                ],
                "ownershipMethod": "Original face centroid z sign; provisional, isolated boundary review required",
            },
            "diagnostics": diagnostics,
            "independentCornerGraphPassed": True,
            "files": {
                name: {
                    "sha256": sha(args.output / name),
                    "bytes": (args.output / name).stat().st_size,
                }
                for name in [
                    "cut-edges.u32bin",
                    "corner-components.u32bin",
                    "face-roles.u8bin",
                    "face-layers.u8bin",
                ]
            },
            "accepted": False,
            "activated": False,
            "patternApproved": False,
        }
    )
    (args.output / "cut-plan.json").write_text(json.dumps(plan, indent=2) + "\n")
    print(json.dumps(plan["frontBackOpening"]))


if __name__ == "__main__":
    main()
