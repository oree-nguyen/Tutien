"""Add measured radioulnar twist support to source-derived arm weight fields.

No positions, triangles, UVs or images are changed. Wrist flex remains a hand
motion; distal forearm pronation receives its own existing auxiliary joint.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path
import numpy as np
from source_garment_graph import sparsify_four_influences


def distribute_pronation(points, field, joints):
    names = [j["name"] for j in joints]
    output = field.copy()
    records = []
    for side in ["Right", "Left"]:
        fore = names.index(side + "ForeArm")
        roll = names.index(side + "ForearmPronation")
        hand = names.index(side + "Hand")
        elbow = np.array(joints[fore]["head"])
        wrist = np.array(joints[hand]["head"])
        axis = wrist - elbow
        length = np.linalg.norm(axis)
        if length < 0.05:
            raise ValueError("Measured forearm axis is invalid")
        t = (points - elbow) @ axis / (length * length)
        twist = np.clip(t, 0, 1)
        transfer = output[:, fore] * twist
        output[:, fore] -= transfer
        output[:, roll] += transfer
        # Hand flexion belongs beyond the wrist. Transfer proximal hand-field
        # leakage to the pronation helper instead of bending the whole forearm.
        hand_blend = np.clip((t - 0.92) / 0.08, 0, 1)
        hand_blend = hand_blend * hand_blend * (3 - 2 * hand_blend)
        transfer = output[:, hand] * (1 - hand_blend)
        output[:, hand] -= transfer
        output[:, roll] += transfer
        records.append(
            {
                "side": side,
                "elbow": elbow.tolist(),
                "wrist": wrist.tolist(),
                "length": float(length),
                "sourceVerticesWithPronation": int((output[:, roll] > 1e-5).sum()),
            }
        )
    if (
        not np.isfinite(output).all()
        or output.min() < -1e-12
        or np.max(np.abs(output.sum(1) - field.sum(1))) > 1e-10
    ):
        raise ValueError("Pronation redistribution changed total support")
    return output, records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    a = parser.parse_args()
    if (
        a.input.resolve() == a.output.resolve()
        or Path(".local/rig-candidates").resolve() not in a.output.resolve().parents
    ):
        raise ValueError("Separate staging output required")
    meta = json.loads((a.input / "input.json").read_text())
    parent = json.loads((a.input / "heat-solve.json").read_text())
    if not parent["weightsValid"]:
        raise ValueError("Rejected parent weights")
    for filename, key in [
        ("positions.bin", "positions"),
        ("triangles.bin", "triangles"),
    ]:
        if (
            hashlib.sha256((a.input / filename).read_bytes()).hexdigest()
            != meta["original"][key]
        ):
            raise ValueError("Changed original source " + key)
    points = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
    field = np.zeros((len(points), len(meta["joints"])))
    for k in range(4):
        field[np.arange(len(points)), ids[:, k]] += weights[:, k]
    total = field.sum(1)
    if total.min() < 0.999 or total.max() > 1.001:
        raise ValueError("Invalid source field")
    field /= total[:, None]
    result, records = distribute_pronation(points, field, meta["joints"])
    out_ids, out_weights, discarded = sparsify_four_influences(result)
    if any(r["sourceVerticesWithPronation"] == 0 for r in records):
        raise ValueError("A pronation helper still has no source support")
    a.output.mkdir(parents=True, exist_ok=True)
    for f in ["input.json", "positions.bin", "triangles.bin"]:
        shutil.copyfile(a.input / f, a.output / f)
    out_ids.astype("<u2").tofile(a.output / "heat-ids.bin")
    out_weights.astype("<f4").tofile(a.output / "heat-weights.bin")
    report = {
        "method": "Source-axis forearm twist blend; proximal hand-field leakage moved to existing radioulnar helper, distal hand keeps wrist flex",
        "parent": str(a.input),
        "parentSolveSha256": hashlib.sha256(
            (a.input / "heat-solve.json").read_bytes()
        ).hexdigest(),
        "forearms": records,
        "maximumDiscardedWeight": float(discarded.max()),
        "weightsValid": True,
        "missingWeightVertices": 0,
        "accepted": False,
        "activated": False,
        "scope": "Weight candidate only; existing helper joints, unchanged source surface. Whole-animation strain, wrist/finger contact, garment and appearance checks still required.",
    }
    (a.output / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(records), flush=True)


if __name__ == "__main__":
    main()
