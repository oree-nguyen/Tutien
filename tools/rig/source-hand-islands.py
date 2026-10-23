"""Experimental hand fields on complete, hash-locked source surface islands.

No spatial crop is used. Existing measured palm/finger seed IDs identify the
islands. Palm-owned source boundary halfedges anchor to the hand root, without
misclassifying finger-side source openings as a wrist rim.
This is a staging proposal, not an accepted anatomy or animation certificate.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.sparse.linalg import splu


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--seeds", type=Path, required=True)
    parser.add_argument("--smoothing-metres", type=float, default=0.006)
    args = parser.parse_args()
    assert args.smoothing_metres >= 0
    assert str(args.output).startswith(".local/rig-candidates/")
    assert not args.output.exists(), "Never overwrite a recorded experiment"
    meta = json.loads((args.input / "input.json").read_text())
    for name, sha in meta["files"].items():
        assert digest(args.input / name) == sha, f"Changed input: {name}"
    assert digest(meta["input"]) == meta["inputSha256"]
    p = np.fromfile(args.input / "positions.f32bin", "<f4").reshape(-1, 3)
    ids = np.fromfile(args.input / "ids.u16bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(args.input / "weights.f32bin", "<f4").reshape(-1, 4)
    fans = np.fromfile(args.input / "fans.u32bin", "<u4")
    welds = np.fromfile(args.input / "welds.u32bin", "<u4")
    triangles = np.fromfile(args.input / "triangles.u32bin", "<u4").reshape(-1, 3)
    names = meta["jointNames"]
    _, representatives, inverse = np.unique(
        fans, return_index=True, return_inverse=True
    )
    q = p[representatives].astype(np.float64)
    assert np.max(np.abs(p - q[inverse])) < 1e-8
    faces = inverse[triangles]
    edges, incidence = np.unique(
        np.sort(
            np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]),
            axis=1,
        ),
        axis=0,
        return_counts=True,
    )
    assert np.all(incidence <= 2), "Unexpected nonmanifold source fan"
    length = np.linalg.norm(q[edges[:, 0]] - q[edges[:, 1]], axis=1)
    assert np.min(length) > 1e-9
    graph = coo_matrix(
        (
            np.tile(1 / length, 2),
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(q), len(q)),
    ).tocsr()
    _, components = connected_components(graph)
    boundary = np.unique(edges[incidence == 1])
    canonical_p = np.fromfile(args.canonical / "positions.bin", "<f4").reshape(-1, 3)
    canonical_welds = np.fromfile(args.canonical / "source-welds.u32bin", "<u4")
    seed_report = json.loads(args.seeds.read_text())
    next_ids, next_weights = ids.copy(), weights.copy()
    hand_reports = []
    touched = np.zeros(len(p), dtype=bool)
    for hand in seed_report["hands"]:
        side = hand["side"]
        pins = {}
        seed_rows = []
        hand_components = set()
        for seed in hand["seeds"]:
            joint = names.index(seed["joint"])
            source_ids = np.asarray(seed["originalSourceVertexIDs"], dtype=int)
            current = np.flatnonzero(np.isin(welds, canonical_welds[source_ids]))
            assert len(current), "Missing measured source seeds"
            matched = []
            for source_id in source_ids:
                now = current[welds[current] == canonical_welds[source_id]]
                if not len(now):
                    external = [
                        record
                        for record in meta.get("externalSeeds", [])
                        if record["sourceWeld"] == int(canonical_welds[source_id])
                    ]
                    assert len(external) == 1, f"Missing seed {source_id}"
                    record = external[0]
                    assert seed["joint"] == side + "Hand" == record["requiredJoint"]
                    assert (
                        np.max(
                            np.abs(
                                np.asarray(record["position"]) - canonical_p[source_id]
                            )
                        )
                        < 1e-7
                    )
                    assert (
                        sum(
                            weight
                            for bone, weight in zip(record["ids"], record["weights"])
                            if bone == joint
                        )
                        >= 1 - 1e-7
                    )
                    continue
                assert np.max(np.abs(p[now] - canonical_p[source_id])) < 1e-7
                matched.extend(inverse[now].tolist())
            groups = np.unique(matched)
            for group in groups:
                assert group not in pins or pins[group] == joint
                pins[int(group)] = joint
                hand_components.add(int(components[group]))
            seed_rows.append(
                {
                    "joint": seed["joint"],
                    "originalSourceVertexIDs": source_ids.tolist(),
                    "currentSourceFans": fans[representatives[groups]].tolist(),
                }
            )
        assert len(hand_components) == 1, "Seeds must agree on one source island"
        label = hand_components.pop()
        selected = np.flatnonzero(components == label)
        source_boundary = boundary[components[boundary] == label]
        assert len(source_boundary) > 0, "Expected original hand surface boundary"
        hand_root = names.index(side + "Hand")
        palm_seeds = [group for group, joint in pins.items() if joint == hand_root]
        finger_seeds = [group for group, joint in pins.items() if joint != hand_root]
        palm_distance = dijkstra(graph, indices=palm_seeds, min_only=True)
        finger_distance = dijkstra(graph, indices=finger_seeds, min_only=True)
        wrist_boundary = source_boundary[
            palm_distance[source_boundary] < finger_distance[source_boundary]
        ]
        assert len(wrist_boundary), "No connected palm-owned source rim"
        for group in wrist_boundary:
            assert group not in pins or pins[group] == hand_root, "Seed/rim conflict"
            pins[int(group)] = hand_root
        fixed = np.asarray(sorted(pins), dtype=int)
        free = np.setdiff1d(selected, fixed)
        local_joints = np.asarray(sorted(set(pins.values())), dtype=int)
        assert len(local_joints) == 16, "Palm plus 15 measured finger segments"
        prior = np.zeros((len(q), len(local_joints)))
        # Preserve existing finger articulation. Support from forearm/arm/hips
        # on the exposed hand island belongs to Hand, not an unrelated bone.
        for row, vertex in enumerate(representatives):
            if components[row] != label:
                continue
            for joint, weight in zip(ids[vertex], weights[vertex]):
                column = np.flatnonzero(local_joints == joint)
                prior[
                    row,
                    (
                        column[0]
                        if len(column)
                        else np.flatnonzero(local_joints == hand_root)[0]
                    ),
                ] += weight
        assert np.max(np.abs(prior[selected].sum(axis=1) - 1)) < 1e-6
        fields = np.zeros((len(q), len(local_joints)))
        for group, joint in pins.items():
            fields[group, np.flatnonzero(local_joints == joint)[0]] = 1
        laplacian = diags(np.asarray(graph.sum(axis=1)).ravel()) - graph
        if args.smoothing_metres:
            lengths = coo_matrix(
                (
                    np.tile(length, 2),
                    (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
                ),
                shape=graph.shape,
            ).tocsr()
            screen = np.asarray(lengths.sum(axis=1)).ravel() / args.smoothing_metres**2
        else:
            screen = np.zeros(len(q))
        matrix = laplacian[free][:, free].tocsc()
        matrix += diags(screen[free], format="csc")
        rhs = (
            -(laplacian[free][:, fixed] @ fields[fixed])
            + screen[free, None] * prior[free]
        )
        fields[free] = splu(matrix).solve(rhs)
        residual = np.linalg.norm(matrix @ fields[free] - rhs) / max(
            np.linalg.norm(rhs), 1e-30
        )
        assert residual < 1e-9
        assert fields[selected].min() > -1e-10
        assert np.max(np.abs(fields[selected].sum(axis=1) - 1)) < 1e-6
        rows = np.flatnonzero(components[inverse] == label)
        dense = np.maximum(fields[inverse[rows]], 0)
        # Native four-weight skinning is independently measured after export.
        order = np.argsort(-dense, axis=1, kind="stable")[:, :4]
        values = np.take_along_axis(dense, order, axis=1)
        lost = 1 - values.sum(axis=1)
        values /= values.sum(axis=1, keepdims=True)
        next_ids[rows] = local_joints[order]
        next_weights[rows] = values.astype("<f4")
        touched[rows] = True
        hand_reports.append(
            {
                "side": side,
                "component": label,
                "sourceFans": len(selected),
                "vertices": len(rows),
                "sourceBoundaryFans": len(source_boundary),
                "palmOwnedBoundaryFans": len(wrist_boundary),
                "bounds": [
                    q[selected].min(axis=0).tolist(),
                    q[selected].max(axis=0).tolist(),
                ],
                "measuredSeeds": seed_rows,
                "relativeResidual": float(residual),
                "maximumDroppedFourWeightMass": float(lost.max()),
                "p999DroppedFourWeightMass": float(np.quantile(lost, 0.999)),
            }
        )
    assert np.array_equal(next_ids[~touched], ids[~touched])
    assert np.array_equal(next_weights[~touched], weights[~touched])
    args.output.mkdir()
    next_ids.tofile(args.output / "ids.u16bin")
    next_weights.tofile(args.output / "weights.f32bin")
    touched.tofile(args.output / "touched.u8bin")
    report = {
        "method": "Source-island screened Dirichlet fields; measured seeds and palm-geodesic boundary; unrelated support transferred to Hand; no spatial crop",
        "smoothingMetres": args.smoothing_metres,
        "input": str(args.input),
        "inputMetadataSha256": digest(args.input / "input.json"),
        "asset": meta["input"],
        "assetSha256": meta["inputSha256"],
        "canonical": str(args.canonical),
        "canonicalHashes": {
            name: digest(args.canonical / name)
            for name in ["positions.bin", "source-welds.u32bin"]
        },
        "seedReport": str(args.seeds),
        "seedReportSha256": digest(args.seeds),
        "externalSeedsPreserved": meta.get("externalSeeds", []),
        "hands": hand_reports,
        "changedVertices": int(touched.sum()),
        "files": {
            name: digest(args.output / name)
            for name in ["ids.u16bin", "weights.f32bin", "touched.u8bin"]
        },
        "accepted": False,
        "activated": False,
        "scope": "Experimental source hand ownership. Four-weight deformation, cuff matching, fist, all clips and anatomy review remain mandatory.",
    }
    (args.output / "solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "hands": [
                    {k: v for k, v in h.items() if k != "measuredSeeds"}
                    for h in hand_reports
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    run()
