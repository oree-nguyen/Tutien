"""Repair lower boot support on exact original connected source components.

This writes a staging weight candidate, never a runtime asset or anatomy approval.
The component selection is independently reviewed in context/isolated images.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from source_garment_graph import sparsify_four_influences


def repair_boot_field(points, ids, weights, names, selection):
    if ids.shape != weights.shape or ids.shape != (len(points), 4):
        raise ValueError("Invalid source influence layout")
    if (
        not np.isfinite(points).all()
        or not np.isfinite(weights).all()
        or weights.min() < 0
        or np.max(np.abs(weights.sum(1) - 1)) > 1e-5
        or ids.min() < 0
        or ids.max() >= len(names)
    ):
        raise ValueError("Invalid parent source field")
    output_ids, output_weights = ids.copy(), weights.copy()
    touched = np.zeros(len(points), dtype=bool)
    records = []
    for side in ["Right", "Left"]:
        region = selection["sides"][side]
        vertices = np.asarray(region["vertexIds"], dtype=np.int64)
        if (
            not len(vertices)
            or vertices.min() < 0
            or vertices.max() >= len(points)
            or len(np.unique(vertices)) != len(vertices)
            or touched[vertices].any()
        ):
            raise ValueError("Invalid or overlapping source boot IDs")
        sole = np.asarray(region["soleVertexIds"], dtype=np.int64)
        if not len(sole) or not np.isin(sole, vertices).all():
            raise ValueError("Missing actual underside source patch")
        # Only the graph-selected source boot changes. Above its 220mm open
        # boundary the field is exactly the parent; the shin transition is C1.
        t = np.clip((points[vertices, 1] - 0.08) / 0.14, 0, 1)
        amount = 1 - t * t * (3 - 2 * t)
        toe = np.clip((points[vertices, 2] - 0.035) / 0.095, 0, 1)
        toe = toe * toe * (3 - 2 * toe) * 0.7
        dense = np.zeros((len(vertices), len(names)))
        for k in range(4):
            dense[np.arange(len(vertices)), ids[vertices, k]] += weights[
                vertices, k
            ] * (1 - amount)
        dense[:, names.index(side + "Foot")] += amount * (1 - toe)
        dense[:, names.index(side + "ToeBase")] += amount * toe
        new_ids, new_weights, discarded = sparsify_four_influences(dense)
        active = amount > 1e-12
        changed = vertices[active]
        output_ids[changed], output_weights[changed] = (
            new_ids[active],
            new_weights[active],
        )
        touched[vertices] = True
        records.append(
            {
                "side": side,
                "componentVertices": len(vertices),
                "changedVertices": len(changed),
                "soleVertices": len(sole),
                "maximumDiscardedWeight": float(discarded.max()),
            }
        )
    if not np.isfinite(output_weights).all() or output_weights.min() < 0:
        raise ValueError("Nonfinite or negative support")
    if np.max(np.abs(output_weights.sum(1) - 1)) > 1e-5:
        raise ValueError("Boot repair changed total influence")
    return output_ids, output_weights, records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("selection", type=Path)
    parser.add_argument("output", type=Path)
    a = parser.parse_args()
    if (
        a.input.resolve() == a.output.resolve()
        or Path(".local/rig-candidates").resolve() not in a.output.resolve().parents
    ):
        raise ValueError("Separate staging output required")
    sha = lambda b: hashlib.sha256(b).hexdigest()
    meta = json.loads((a.input / "input.json").read_text())
    parent_bytes = (a.input / "heat-solve.json").read_bytes()
    parent = json.loads(parent_bytes)
    if not parent["weightsValid"]:
        raise ValueError("Rejected parent weights")
    selection_bytes = a.selection.read_bytes()
    selection = json.loads(selection_bytes)
    source_bytes = Path(selection["source"]).read_bytes()
    if (
        sha(source_bytes) != selection["sourceSha256"]
        or selection["hero"] != meta["hero"]
    ):
        raise ValueError("Stale or mismatched source selection")
    # The source selection must refer to these exact arrays, not a same-sized
    # decimated or reordered mesh. Bind/weight changes do not alter source IDs.
    source_meta = json.loads((a.selection.parent / "input.json").read_text())
    for f, key, semantic in [
        ("positions.bin", "positions", "POSITION"),
        ("triangles.bin", "triangles", None),
    ]:
        original = (a.input / f).read_bytes()
        if (
            sha(original) != meta["original"][key]
            or original != (a.selection.parent / f).read_bytes()
        ):
            raise ValueError("Source boot order/geometry changed: " + f)
        if semantic and sha(original) != source_meta["attributeHashes"][semantic]:
            raise ValueError("Selection source hash differs")
    p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3)
    ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
    w = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
    result_ids, result_weights, records = repair_boot_field(
        p, ids, w, [j["name"] for j in meta["joints"]], selection
    )
    a.output.mkdir(parents=True, exist_ok=True)
    for f in ["input.json", "positions.bin", "triangles.bin"]:
        shutil.copyfile(a.input / f, a.output / f)
    result_ids.astype("<u2").tofile(a.output / "heat-ids.bin")
    result_weights.astype("<f4").tofile(a.output / "heat-weights.bin")
    report = {
        "method": "Exact graph-selected source boots: Foot/Toe support below80mm, C1 return to parent at220mm; source geometry and all other regions unchanged",
        "parent": str(a.input),
        "parentSolveSha256": sha(parent_bytes),
        "sourceSelection": str(a.selection),
        "sourceSelectionSha256": sha(selection_bytes),
        "sourceSha256": selection["sourceSha256"],
        "boots": records,
        "weightsValid": True,
        "accepted": False,
        "activated": False,
        "scope": "Support candidate only; visual component review, full-mesh skin/contact/seam and whole-animation gates remain required",
    }
    (a.output / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(records), flush=True)


if __name__ == "__main__":
    main()
