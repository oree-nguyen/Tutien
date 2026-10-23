"""New staging layout with four nearest source-geodesic hand supports.

No spatial nearest-bone queries: paths run over the complete source triangle
star and measured seed IDs. This is a support proposal, not anatomical approval.
Only the previously hash-bound hand domain may change. Cuff and source seeds
remain exact; native export must independently remeasure every boundary edge.
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

from pose_weight_fit import digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
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
    for name, sha in solve["files"].items():
        assert digest(parent / name) == sha
    hand_meta_file = Path(solve["input"]) / "input.json"
    assert digest(hand_meta_file) == solve["inputMetadataSha256"]
    hand_meta = json.loads(hand_meta_file.read_text())
    for name in ["fans.u32bin", "positions.f32bin"]:
        assert digest(Path(solve["input"]) / name) == hand_meta["files"][name]
    names = hand_meta["jointNames"]
    source = np.fromfile(args.base / "positions.bin", "<f4").reshape(-1, 3)
    faces = np.fromfile(args.base / "triangles.bin", "<u4").reshape(-1, 3)
    fans = np.fromfile(args.base / "groups.bin", "<u4")
    ids = np.fromfile(args.base / "result-ids.bin", "<u2").reshape(-1, 4)
    original_ids = ids.copy()
    weights = np.fromfile(args.base / "result-weights.bin", "<f4").reshape(-1, 4)
    original_weights = weights.copy()
    fixed = np.fromfile(args.base / "protected.bin", "u1").astype(bool)
    hand_fans = np.fromfile(Path(solve["input"]) / "fans.u32bin", "<u4")
    hand_positions = np.fromfile(
        Path(solve["input"]) / "positions.f32bin", "<f4"
    ).reshape(-1, 3)
    touched = np.fromfile(parent / "touched.u8bin", "u1").astype(bool)
    lookup = {int(f): i for i, f in enumerate(fans)}
    edges = np.unique(
        np.sort(
            np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]),
            axis=1,
        ),
        axis=0,
    )
    lengths = np.linalg.norm(
        source[edges[:, 0]].astype(float) - source[edges[:, 1]], axis=1
    )
    assert np.all(lengths > 1e-12)
    graph = coo_matrix(
        (
            np.tile(lengths, 2),
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(source), len(source)),
    ).tocsr()
    changed = np.zeros(len(fans), bool)
    reports = []
    for hand in solve["hands"]:
        side = hand["side"]
        # Sign selects between the two already recorded hand components only;
        # it does not create a coordinate crop or include any unrecorded vertex.
        side_fans = hand_fans[
            touched & ((hand_positions[:, 0] > 0) == (side == "Left"))
        ]
        active = np.isin(fans, side_fans) & ~fixed
        changed |= active
        distances = []
        joints = []
        for seed in hand["measuredSeeds"]:
            vertices = [lookup[f] for f in seed["currentSourceFans"]]
            distances.append(dijkstra(graph, indices=vertices, min_only=True))
            joints.append(names.index(seed["joint"]))
        distances = np.array(distances).T
        assert np.isfinite(distances[active]).all()
        closest = np.argsort(distances[active], axis=1, kind="stable")[:, :4]
        d = np.take_along_axis(distances[active], closest, axis=1)
        # Shift before exponentiation: underflow must not create a zero row.
        kernel = np.exp(-(d - d[:, :1]) / 0.012)
        kernel /= kernel.sum(axis=1, keepdims=True)
        ids[active] = np.array(joints)[closest]
        weights[active] = kernel.astype("<f4")
        reports.append(
            {
                "side": side,
                "fans": int(active.sum()),
                "jointSlotsChanged": int(
                    np.any(ids[active] != original_ids[active], axis=1).sum()
                ),
            }
        )
    assert np.array_equal(ids[~changed], original_ids[~changed])
    assert np.array_equal(weights[~changed], original_weights[~changed])
    assert np.max(np.abs(weights.sum(axis=1) - 1)) < 1e-6
    args.output.mkdir()
    for name in meta["files"]:
        if name not in ["result-ids.bin", "result-weights.bin"]:
            os.link(args.base / name, args.output / name)
    ids.tofile(args.output / "result-ids.bin")
    weights.tofile(args.output / "result-weights.bin")
    os.link(args.base / "H01-C0-rigged.glb", args.output / "H01-C0-rigged.glb")
    hashes = {name: digest(args.output / name) for name in meta["files"]}
    record = {
        **meta,
        "files": hashes,
        "supportProposal": {
            "sourceLayout": str(args.base),
            "sourceMetadataSha256": digest(meta_file),
            "hands": reports,
            "kernelLengthMeters": 0.012,
            "unmodifiedOutsideHandAndSeeds": True,
        },
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
    print(json.dumps(reports))


if __name__ == "__main__":
    main()
