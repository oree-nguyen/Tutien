"""Recover unused local source joint capacity lost by old zero-slot cleanup.

Coalesce repeated influences first, then restore missing zero-weight slots
from the hash-bound earlier source field. This changes the numerical support
domain, not the coalesced starting skin deformation. No spatial guess is used.
"""

import argparse
import json
import os
import re
from pathlib import Path

import numpy as np

from pose_weight_fit import digest


def restore_slots(ids, weights, reference, names, side):
    out_ids, out_weights = ids.copy(), weights.astype(float).copy()
    first = {}
    for k, (joint, weight) in enumerate(zip(ids, weights)):
        if joint in first:
            out_weights[first[joint]] += float(weight)
            out_weights[k] = 0
        else:
            first[int(joint)] = k
    used = set(int(j) for j, w in zip(out_ids, out_weights) if w > 0)
    available = []
    for joint in reference:
        joint = int(joint)
        if (
            joint not in available
            and joint not in used
            and re.match(
                "^" + side + r"(Hand|Arm|ForeArm|ForearmPronation|Shoulder)",
                names[joint],
            )
        ):
            available.append(joint)
    for k in np.flatnonzero(out_weights == 0):
        if available:
            out_ids[k] = available.pop(0)
    return out_ids, out_weights.astype("<f4")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("reference", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    assert (
        str(args.output).startswith(".local/rig-candidates/")
        and not args.output.exists()
    )
    meta_file = args.base / "feasibility-input.json"
    meta = json.loads(meta_file.read_text())
    assert meta["kind"] == "source-support-layout"
    for name, sha in meta["files"].items():
        assert digest(args.base / name) == sha
    parent = Path(meta["candidate"])
    solve_file = parent / "solve.json"
    assert digest(solve_file) == meta["candidateSolveSha256"]
    solve = json.loads(solve_file.read_text())
    reference_file = args.reference / "solve.json"
    reference = json.loads(reference_file.read_text())
    receipt = json.loads((args.reference / "receipt.json").read_text())
    assert digest(reference_file) == receipt["solveSha256"]
    for folder, record in [(parent, solve), (args.reference, reference)]:
        for name, sha in record["files"].items():
            assert digest(folder / name) == sha
    original_meta_file = Path(solve["input"]) / "input.json"
    assert digest(original_meta_file) == solve["inputMetadataSha256"]
    original_meta = json.loads(original_meta_file.read_text())
    names = original_meta["jointNames"]
    reference_meta_file = Path(reference["input"]) / "input.json"
    assert digest(reference_meta_file) == reference["inputMetadataSha256"]
    reference_meta = json.loads(reference_meta_file.read_text())
    assert reference_meta["jointNames"] == names
    fans = np.fromfile(args.base / "groups.bin", "<u4")
    hand_fans = np.fromfile(Path(solve["input"]) / "fans.u32bin", "<u4")
    assert (
        digest(Path(solve["input"]) / "fans.u32bin")
        == original_meta["files"]["fans.u32bin"]
    )
    ref_fans = np.fromfile(Path(reference["input"]) / "fans.u32bin", "<u4")
    assert (
        digest(Path(reference["input"]) / "fans.u32bin")
        == reference_meta["files"]["fans.u32bin"]
    )
    ref_ids = np.fromfile(args.reference / "ids.u16bin", "<u2").reshape(-1, 4)
    ref_lookup = {int(f): i for i, f in enumerate(ref_fans)}
    positions = np.fromfile(args.base / "positions.bin", "<f4").reshape(-1, 3)
    ref_positions = np.fromfile(
        Path(reference["input"]) / "positions.f32bin", "<f4"
    ).reshape(-1, 3)
    assert (
        digest(Path(reference["input"]) / "positions.f32bin")
        == reference_meta["files"]["positions.f32bin"]
    )
    touched = np.fromfile(parent / "touched.u8bin", "u1").astype(bool)
    fixed = np.fromfile(args.base / "protected.bin", "u1").astype(bool)
    free = np.isin(fans, hand_fans[touched]) & ~fixed
    ids = np.fromfile(args.base / "result-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(args.base / "result-weights.bin", "<f4").reshape(-1, 4)
    old_ids, old_weights = ids.copy(), weights.copy()
    changed = 0
    slot_changes = 0
    max_mass_error = 0
    for v in np.flatnonzero(free):
        ref = ref_lookup[int(fans[v])]
        np.testing.assert_array_equal(positions[v], ref_positions[ref])
        side = "Left" if positions[v, 0] > 0 else "Right"
        ids[v], weights[v] = restore_slots(
            ids[v], weights[v], ref_ids[ref], names, side
        )
        changed += int(np.any(ids[v] != old_ids[v]))
        slot_changes += int(np.sum(ids[v] != old_ids[v]))
        for joint in np.unique(np.r_[ids[v], old_ids[v]]):
            error = abs(
                float(np.sum(weights[v][ids[v] == joint], dtype=float))
                - float(np.sum(old_weights[v][old_ids[v] == joint], dtype=float))
            )
            max_mass_error = max(error, max_mass_error)
    assert max_mass_error < 1e-7
    assert np.array_equal(ids[~free], old_ids[~free]) and np.array_equal(
        weights[~free], old_weights[~free]
    )
    args.output.mkdir()
    for name in meta["files"]:
        if name not in ["result-ids.bin", "result-weights.bin"]:
            os.link(args.base / name, args.output / name)
    ids.tofile(args.output / "result-ids.bin")
    weights.tofile(args.output / "result-weights.bin")
    os.link(args.base / "H01-C0-rigged.glb", args.output / "H01-C0-rigged.glb")
    proposal = {
        "sourceLayout": str(args.base),
        "sourceMetadataSha256": digest(meta_file),
        "reference": str(args.reference),
        "referenceSolveSha256": digest(reference_file),
        "method": __doc__,
        "fansChanged": changed,
        "slotsChanged": slot_changes,
        "maximumCoalescedMassRoundoff": max_mass_error,
        "protectedAndOutsideHandExact": True,
    }
    record = {
        **meta,
        "files": {name: digest(args.output / name) for name in meta["files"]},
        "restoredSourceSupports": proposal,
        "accepted": False,
        "activated": False,
    }
    (args.output / "feasibility-input.json").write_text(
        json.dumps(record, indent=2) + "\n"
    )
    (args.output / "receipt.json").write_text(
        json.dumps(
            {"sha256": meta["assetSha256"], "accepted": False, "activated": False},
            indent=2,
        )
        + "\n"
    )
    print(json.dumps(proposal))


if __name__ == "__main__":
    main()
