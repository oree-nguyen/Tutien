"""Staging proposal: remove distal-finger influence far behind its own joint.

The hand domain and protected seeds come from recorded source fans. Measured
source centrelines select an ancestor within the SAME finger, never another
finger or an invented body surface. This is not an approved anatomical mask.
Independent articulated, seam, normal and contact audits remain mandatory.
"""
import argparse
import json
import os
import re
from pathlib import Path

import numpy as np
from pose_weight_fit import digest


def proximal_row(point, ids, weights, names, frame, side):
    ids, weights = ids.copy(), weights.copy()
    for k, joint in enumerate(ids):
        match = re.fullmatch(side + r"Hand(Thumb|Index|Middle|Ring|Pinky)([123])", names[int(joint)])
        if not match or int(match[2]) == 1:
            continue
        points = np.asarray(frame["fingers"][match[1]]["points"], dtype=float)
        current = int(match[2]) - 1
        axis = points[current + 1] - points[current]
        length = np.linalg.norm(axis)
        assert length > 1e-9
        # A vertex within a joint's blend zone is deliberately not reassigned.
        behind = np.dot(point - points[current], axis / length)
        if behind >= -0.005:
            continue
        edges = points[1:] - points[:-1]
        t = np.clip(np.einsum("ij,ij->i", point - points[:-1], edges) / np.einsum("ij,ij->i", edges, edges), 0, 1)
        distances = np.linalg.norm(points[:-1] + t[:, None] * edges - point, axis=1)
        ancestor = int(np.argmin(distances))
        if ancestor < current:
            ids[k] = names.index(side + "Hand" + match[1] + str(ancestor + 1))
    # Coalesce duplicated ancestors rather than silently dropping their mass.
    first = {}
    for k, joint in enumerate(ids):
        if int(joint) in first:
            weights[first[int(joint)]] += weights[k]
            weights[k] = 0
        else:
            first[int(joint)] = k
    positive = set(int(j) for j, w in zip(ids, weights) if w > 0)
    available = [names.index(side + "Hand")]
    for joint in ids:
        m = re.fullmatch(side + r"Hand(Thumb|Index|Middle|Ring|Pinky)([123])", names[int(joint)])
        if m:
            available.extend(names.index(side + "Hand" + m[1] + str(i)) for i in (1, 2, 3))
    for k in np.flatnonzero(weights == 0):
        replacement = next((j for j in available if j not in positive), None)
        if replacement is not None:
            ids[k] = replacement
            positive.add(replacement)
    assert np.isfinite(weights).all() and (weights >= 0).all()
    assert abs(float(weights.sum()) - 1) < 1e-6
    return ids, weights


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    a = parser.parse_args()
    assert str(a.output).startswith(".local/rig-candidates/") and not a.output.exists()
    metadata = a.base / "feasibility-input.json"
    meta = json.loads(metadata.read_text())
    assert meta["kind"] == "source-support-layout"
    for name, sha in meta["files"].items():
        assert digest(a.base / name) == sha
    assert digest(a.base / "H01-C0-rigged.glb") == meta["assetSha256"]
    parent = Path(meta["candidate"])
    assert digest(parent / "solve.json") == meta["candidateSolveSha256"]
    solve = json.loads((parent / "solve.json").read_text())
    source = Path(solve["input"])
    assert digest(source / "input.json") == solve["inputMetadataSha256"]
    original = json.loads((source / "input.json").read_text())
    for file in ("fans.u32bin", "positions.f32bin"):
        assert digest(source / file) == original["files"][file]
    assert digest(parent / "touched.u8bin") == solve["files"]["touched.u8bin"]
    names = original["jointNames"]
    frames_path = Path("data/rig/hand-frames.json")
    frames = json.loads(frames_path.read_text())["heroes"]["H01"]["hands"]
    p = np.fromfile(a.base / "positions.bin", "<f4").reshape(-1, 3)
    groups = np.fromfile(a.base / "groups.bin", "<u4")
    fans = np.fromfile(source / "fans.u32bin", "<u4")
    touched = np.fromfile(parent / "touched.u8bin", "u1").astype(bool)
    fixed = np.fromfile(a.base / "protected.bin", "u1").astype(bool)
    free = np.isin(groups, fans[touched]) & ~fixed
    ids = np.fromfile(a.base / "result-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(a.base / "result-weights.bin", "<f4").reshape(-1, 4)
    old_ids, old_weights = ids.copy(), weights.copy()
    changed = []
    for v in np.flatnonzero(free):
        # Sign distinguishes the two pre-recorded source hand islands only.
        side = "Left" if p[v, 0] > 0 else "Right"
        ids[v], weights[v] = proximal_row(p[v], ids[v], weights[v], names, frames[side], side)
        if not np.array_equal(ids[v], old_ids[v]) or not np.array_equal(weights[v], old_weights[v]):
            changed.append(int(groups[v]))
    assert np.array_equal(ids[~free], old_ids[~free])
    assert np.array_equal(weights[~free], old_weights[~free])
    a.output.mkdir()
    for name in meta["files"]:
        if name not in ("result-ids.bin", "result-weights.bin"):
            os.link(a.base / name, a.output / name)
    os.link(a.base / "H01-C0-rigged.glb", a.output / "H01-C0-rigged.glb")
    ids.tofile(a.output / "result-ids.bin")
    weights.tofile(a.output / "result-weights.bin")
    record = {**meta, "files": {n: digest(a.output / n) for n in meta["files"]},
              "proximalProposal": {"base": str(a.base), "baseMetadataSha256": digest(metadata),
                                   "framesSha256": digest(frames_path), "changedFans": changed,
                                   "jointBlendZoneMetres": 0.005, "method": __doc__, "protectedAndOutsideExact": True},
              "accepted": False, "activated": False}
    (a.output / "feasibility-input.json").write_text(json.dumps(record, indent=2) + "\n")
    (a.output / "receipt.json").write_text(json.dumps({"sha256": meta["assetSha256"], "accepted": False, "activated": False}, indent=2) + "\n")
    print(json.dumps({"changedFans": len(changed), "accepted": False}))


if __name__ == "__main__":
    main()
