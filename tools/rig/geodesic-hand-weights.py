"""Source-edge hand weights from measured finger landmarks and explicit seeds.

This is an experimental candidate generator. Seeds are auditable source vertex
IDs, not approved anatomical masks; appearance/contact validation is mandatory.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import connected_components
from scipy.sparse.linalg import splu
from source_garment_graph import source_welds, sparsify_four_influences


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    a = parser.parse_args()
    if (
        a.input.resolve() == a.output.resolve()
        or Path(".local/rig-candidates").resolve() not in a.output.resolve().parents
    ):
        raise ValueError("Separate staging folders required")
    meta = json.loads((a.input / "input.json").read_text())
    parent = json.loads((a.input / "heat-solve.json").read_text())
    if not parent["weightsValid"]:
        raise ValueError("Rejected parent field")
    for name, key in [("positions.bin", "positions"), ("triangles.bin", "triangles")]:
        if (
            hashlib.sha256((a.input / name).read_bytes()).hexdigest()
            != meta["original"][key]
        ):
            raise ValueError("Stale source " + key)
    p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3).astype(float)
    tri = np.fromfile(a.input / "triangles.bin", "<u4").reshape(-1, 3)
    ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
    weld, proof = source_welds(p, tri)
    reps, inverse = np.unique(weld, return_inverse=True)
    points = p[reps]
    count = len(reps)
    names = [r["name"] for r in meta["joints"]]
    field = np.zeros((count, len(names)))
    for k in range(4):
        field[np.arange(count), ids[reps, k]] += weights[reps, k]
    edges = np.unique(
        np.sort(
            np.concatenate(
                (
                    inverse[tri[:, [0, 1]]],
                    inverse[tri[:, [1, 2]]],
                    inverse[tri[:, [2, 0]]],
                )
            ),
            axis=1,
        ),
        axis=0,
    )
    length = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
    valid = length > 1e-12
    edges = edges[valid]
    length = length[valid]
    frames = json.loads(Path("data/rig/hand-frames.json").read_text())["heroes"][
        meta["hero"]
    ]["hands"]
    reports = []
    for side, hand in frames.items():
        landmarks = np.array(
            [hand["wrist"]] + [p for f in hand["fingers"].values() for p in f["points"]]
        )
        lo = landmarks.min(0) - 0.022
        hi = landmarks.max(0) + 0.022
        selected = ((points >= lo) & (points <= hi)).all(1)
        source_groups = np.flatnonzero(selected)
        q = points[selected]
        lookup = np.full(count, -1, dtype=np.int64)
        lookup[selected] = np.arange(len(q))
        inside = selected[edges].all(1)
        e = lookup[edges[inside]]
        conductance = 1 / length[inside]
        adj = coo_matrix(
            (
                np.r_[conductance, conductance],
                (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]]),
            ),
            shape=(len(q), len(q)),
        ).tocsr()
        boundary = np.zeros(count, bool)
        cross = edges[selected[edges[:, 0]] != selected[edges[:, 1]]]
        boundary[cross.ravel()] = True
        boundary = boundary[selected]
        fixed = boundary.copy()
        targets = field[selected].copy()
        owners = np.full(len(q), -1, dtype=int)
        seed_records = []
        seeds = [(side + "Hand", np.array(hand["palmCenter"]), 0.045)]
        for finger, record in hand["fingers"].items():
            for k in range(3):
                seeds.append(
                    (
                        side + "Hand" + finger + str(k + 1),
                        (
                            np.array(record["points"][k])
                            + np.array(record["points"][k + 1])
                        )
                        * 0.5,
                        0.035,
                    )
                )
        for name, center, limit in seeds:
            distances = np.linalg.norm(q - center, axis=1)
            available = ~boundary & (owners < 0)
            eligible = np.flatnonzero(available)
            chosen = eligible[np.argsort(distances[eligible])[:12]]
            if len(chosen) < 6 or distances[chosen].max() > limit:
                raise RuntimeError("No trustworthy source seed near " + name)
            joint = names.index(name)
            fixed[chosen] = True
            owners[chosen] = joint
            targets[chosen] = 0
            targets[chosen, joint] = 1
            seed_records.append(
                {
                    "joint": name,
                    "sourceRepresentativeVertexIDs": source_groups[chosen].tolist(),
                    "originalSourceVertexIDs": reps[source_groups[chosen]].tolist(),
                    "measuredCenter": center.tolist(),
                    "maximumSeedDistanceMetres": float(distances[chosen].max()),
                }
            )
        components, labels = connected_components(adj, directed=False)
        anchored = np.zeros(components, bool)
        np.logical_or.at(anchored, labels, fixed)
        unanchored = ~anchored[labels]
        fixed |= unanchored
        free = ~fixed
        laplacian = diags(np.asarray(adj.sum(1)).ravel()) - adj
        matrix = laplacian[free][:, free].tocsc()
        rhs = -laplacian[free][:, fixed] @ targets[fixed]
        solved = splu(matrix).solve(rhs)
        residual = float(
            np.linalg.norm(matrix @ solved - rhs) / max(np.linalg.norm(rhs), 1e-30)
        )
        if residual > 1e-8 or solved.min() < -1e-7:
            raise RuntimeError("Source Dirichlet field failed numerical checks")
        targets[free] = np.maximum(solved, 0)
        targets /= targets.sum(1)[:, None]
        field[selected] = targets
        reports.append(
            {
                "side": side,
                "sourceGroups": len(q),
                "freeGroups": int(free.sum()),
                "boundaryGroups": int(boundary.sum()),
                "unanchoredGroupsPreserved": int(unanchored.sum()),
                "relativeResidual": residual,
                "seeds": seed_records,
                "anatomyApproved": False,
            }
        )
        print(
            json.dumps({k: v for k, v in reports[-1].items() if k != "seeds"}),
            flush=True,
        )
    out_ids, out_weights, discarded = sparsify_four_influences(
        field / field.sum(1)[:, None]
    )
    a.output.mkdir(parents=True, exist_ok=True)
    for f in ["input.json", "positions.bin", "triangles.bin"]:
        shutil.copyfile(a.input / f, a.output / f)
    out_ids[inverse].astype("<u2").tofile(a.output / "heat-ids.bin")
    out_weights[inverse].astype("<f4").tofile(a.output / "heat-weights.bin")
    report = {
        "method": "Positive Dirichlet fields on proven original source edges; measured palm and all30finger segment seeds; original crop boundary fields fixed",
        "parent": str(a.input),
        "parentSolveSha256": hashlib.sha256(
            (a.input / "heat-solve.json").read_bytes()
        ).hexdigest(),
        "sourceContinuity": proof,
        "hands": reports,
        "maximumDiscardedWeight": float(discarded.max()),
        "weightsValid": True,
        "missingWeightVertices": 0,
        "accepted": False,
        "activated": False,
        "scope": "Candidate only. Source seed IDs are explicit, but labels remain unapproved until independent surface contact, closed-finger skin, seam and visual review.",
    }
    (a.output / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
