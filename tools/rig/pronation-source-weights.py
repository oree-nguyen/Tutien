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


def distribute_pronation(points, field, joints, distal_only=False, hand_domains=None):
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
        if not distal_only:
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
        # The hand already inherits pronation through its parent. Distal palm
        # vertices must also receive wrist flexion. Leaving forearm/helper
        # support past the wrist makes the palm tear around rigid hand seeds.
        # A12%-of-forearm capsule transition ends exactly at the source wrist;
        # finger fields are untouched, and no new source geometry is produced.
        takeover = np.clip((t - 0.88) / 0.12, 0, 1)
        takeover = takeover * takeover * (3 - 2 * takeover)
        if hand_domains is not None:
            domain = np.asarray(hand_domains[side], dtype=float)
            if (
                domain.shape != (len(points),)
                or not np.isfinite(domain).all()
                or domain.min() < 0
                or domain.max() > 1
            ):
                raise ValueError("Invalid source hand ownership domain")
            takeover *= domain
        to_hand = (output[:, fore] + output[:, roll]) * takeover
        output[:, fore] *= 1 - takeover
        output[:, roll] *= 1 - takeover
        output[:, hand] += to_hand
        records.append(
            {
                "side": side,
                "elbow": elbow.tolist(),
                "wrist": wrist.tolist(),
                "length": float(length),
                "sourceVerticesWithPronation": int((output[:, roll] > 1e-5).sum()),
                "distalForearmSupportMovedToHand": int((to_hand > 1e-5).sum()),
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
    parser.add_argument(
        "--from-fit",
        action="store_true",
        help="Repair only distal wrist ownership on an export-verified CP field, retaining its proximal/body fit",
    )
    parser.add_argument(
        "--hand-transition-mm",
        type=float,
        default=22,
        help="C1 return to parent at the source crop boundary; zero reproduces the rejected hard-crop trial",
    )
    a = parser.parse_args()
    if (
        a.input.resolve() == a.output.resolve()
        or Path(".local/rig-candidates").resolve() not in a.output.resolve().parents
    ):
        raise ValueError("Separate staging output required")
    if not 0 <= a.hand_transition_mm <= 100:
        raise ValueError("Invalid source-domain transition width")
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    source = a.input
    fit_proof = None
    if a.from_fit:
        fit = json.loads((a.input / "solve.json").read_text())
        export = json.loads((a.input / "export.json").read_text())
        source = Path(fit["base"])
        for filename, expected in fit["inputHashes"].items():
            if sha(source / filename) != expected:
                raise ValueError("Stale fitted source " + filename)
        if (
            sha(Path(export["output"])) != export["outputSha256"]
            or sha(a.input / "solve.json") != export["solveSha256"]
            or sha(a.input / "result-weights.bin") != fit["outputWeightsSha256"]
        ):
            raise ValueError("Stale fitted source weights or export")
        fit_proof = {
            "directory": str(a.input),
            "solveSha256": sha(a.input / "solve.json"),
            "exportSha256": sha(a.input / "export.json"),
            "assetSha256": export["outputSha256"],
            "weightsSha256": fit["outputWeightsSha256"],
        }
    meta = json.loads((source / "input.json").read_text())
    parent_directory = Path(meta["input"]).parent if a.from_fit else a.input
    parent = json.loads((parent_directory / "heat-solve.json").read_text())
    if not parent["weightsValid"]:
        raise ValueError("Rejected parent weights")
    for filename, key in [
        ("positions.bin", "positions"),
        ("triangles.bin", "triangles"),
    ]:
        if (
            hashlib.sha256((source / filename).read_bytes()).hexdigest()
            != meta["original"][key]
        ):
            raise ValueError("Changed original source " + key)
    points = np.fromfile(source / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    ids = np.fromfile(
        source / ("result-ids.bin" if a.from_fit else "heat-ids.bin"), "<u2"
    ).reshape(-1, 4)
    weights = np.fromfile(
        a.input / ("result-weights.bin" if a.from_fit else "heat-weights.bin"), "<f4"
    ).reshape(-1, 4)
    field = np.zeros((len(points), len(meta["joints"])))
    for k in range(4):
        field[np.arange(len(points)), ids[:, k]] += weights[:, k]
    total = field.sum(1)
    if total.min() < 0.999 or total.max() > 1.001:
        raise ValueError("Invalid source field")
    field /= total[:, None]
    hand_frames_path = Path("data/rig/hand-frames.json")
    hands = json.loads(hand_frames_path.read_text())["heroes"][meta["hero"]]["hands"]
    domains = {}
    for side, hand in hands.items():
        landmarks = np.array(
            [hand["wrist"]]
            + [p for finger in hand["fingers"].values() for p in finger["points"]]
        )
        distance = np.minimum(
            points - (landmarks.min(0) - 0.022), (landmarks.max(0) + 0.022) - points
        ).min(1)
        fraction = (
            (distance >= 0).astype(float)
            if a.hand_transition_mm == 0
            else np.clip(distance / (a.hand_transition_mm * 0.001), 0, 1)
        )
        domains[side] = fraction * fraction * (3 - 2 * fraction)
    result, records = distribute_pronation(
        points, field, meta["joints"], distal_only=a.from_fit, hand_domains=domains
    )
    out_ids, out_weights, discarded = sparsify_four_influences(result)
    unchanged = np.all(result == field, axis=1)
    out_ids[unchanged] = ids[unchanged]
    out_weights[unchanged] = weights[unchanged]
    if any(r["sourceVerticesWithPronation"] == 0 for r in records):
        raise ValueError("A pronation helper still has no source support")
    a.output.mkdir(parents=True, exist_ok=True)
    for f in ["positions.bin", "triangles.bin"]:
        shutil.copyfile(source / f, a.output / f)
    if a.from_fit:
        meta["input"], meta["inputSha256"] = export["output"], export["outputSha256"]
    (a.output / "input.json").write_text(json.dumps(meta, indent=2) + "\n")
    out_ids.astype("<u2").tofile(a.output / "heat-ids.bin")
    out_weights.astype("<f4").tofile(a.output / "heat-weights.bin")
    report = {
        "method": (
            "Distal-only ownership repair on export-verified fitted field; keep proximal/body/boot support rows exact"
            if a.from_fit
            else "Source-axis forearm twist blend with distal takeover"
        )
        + "; forearm/helper leakage at and beyond wrist moved to Hand so actual palm inherits wrist flex and parent pronation",
        "parent": str(parent_directory),
        "parentSolveSha256": hashlib.sha256(
            (parent_directory / "heat-solve.json").read_bytes()
        ).hexdigest(),
        "forearms": records,
        "distalOnly": a.from_fit,
        "fittedSource": fit_proof,
        "distalSourceDomain": {
            "method": "Source hand landmark crop as the geodesic experiment, C1 return to parent at crop boundary plus longitudinal wrist takeover; not an approved anatomical mask or garment segmentation",
            "transitionMetres": a.hand_transition_mm * 0.001,
            "handFramesSha256": sha(hand_frames_path),
            "sourceVertices": {
                side: int((mask > 0).sum()) for side, mask in domains.items()
            },
        },
        "unchangedSourceSupportRowsPreserved": int(unchanged.sum()),
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
