"""Experimental source-edge continuation from a hand field into its cuff.

Does not redesign a sleeve or change a cut. Only kept-fan skin fields within
the explicit geodesic extension are solved; both boundaries remain fixed.
"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import dijkstra
from scipy.sparse.linalg import splu


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def continue_field(graph, field, free):
    """Dirichlet interpolation; all complementary rows stay byte exact."""
    assert len(free) > 0 and len(np.unique(free)) == len(free)
    result = field.copy()
    fixed = np.setdiff1d(np.arange(len(field)), free)
    laplacian = diags(np.asarray(graph.sum(axis=1)).ravel()) - graph
    matrix = laplacian[free][:, free].tocsc()
    rhs = -(laplacian[free][:, fixed] @ field[fixed])
    result[free] = splu(matrix).solve(rhs)
    residual = np.linalg.norm(matrix @ result[free] - rhs) / max(
        np.linalg.norm(rhs), 1e-30
    )
    assert residual < 1e-9
    assert result[free].min() > -1e-9
    assert np.max(np.abs(result[free].sum(axis=1) - 1)) < 1e-6
    assert np.array_equal(result[fixed], field[fixed])
    return result, residual


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--extension", type=float, default=0.045)
    parser.add_argument("--hand-proposal", type=Path)
    args = parser.parse_args()
    assert 0.005 <= args.extension <= 0.10
    assert (
        str(args.output).startswith(".local/rig-candidates/")
        and not args.output.exists()
    )
    meta = json.loads((args.input / "input.json").read_text())
    parent = Path(meta["input"])
    proposal = json.loads((parent / "solve.json").read_text())
    original_proposal = proposal
    hand_proposal = args.hand_proposal or parent
    if args.hand_proposal:
        proposal = json.loads((hand_proposal / "solve.json").read_text())
        assert (
            proposal["inputMetadataSha256"] == original_proposal["inputMetadataSha256"]
        )
        assert proposal["assetSha256"] == original_proposal["assetSha256"]
        assert not proposal.get(
            "additionalFanField"
        ), "Use a hand-only field as the new inner boundary"
    for name, digest in proposal["files"].items():
        assert sha(hand_proposal / name) == digest
    receipt = json.loads((parent / "receipt.json").read_text())
    assert sha(parent / "H01-C0-rigged.glb") == meta["inputSha256"] == receipt["sha256"]
    for name, digest in meta["files"].items():
        assert sha(args.input / name) == digest
    p = np.fromfile(args.input / "positions.bin", "<f4").reshape(-1, 3)
    ids = np.fromfile(args.input / "ids.u16bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(args.input / "weights.f32bin", "<f4").reshape(-1, 4)
    fans = np.fromfile(args.input / "groups.bin", "<u4")
    tri = np.fromfile(args.input / "triangles.bin", "<u4").reshape(-1, 3)
    unique, reps, inverse = np.unique(fans, return_index=True, return_inverse=True)
    q = p[reps].astype(float)
    assert np.max(np.abs(q[inverse] - p)) < 1e-8
    tf = inverse[tri]
    edges = np.unique(
        np.sort(np.concatenate([tf[:, [0, 1]], tf[:, [1, 2]], tf[:, [2, 0]]]), axis=1),
        axis=0,
    )
    length = np.linalg.norm(q[edges[:, 0]] - q[edges[:, 1]], axis=1)
    assert length.min() > 1e-12
    rows, cols = np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]
    shape = (len(q), len(q))
    distances = coo_matrix((np.tile(length, 2), (rows, cols)), shape=shape).tocsr()
    graph = coo_matrix((np.tile(1 / length, 2), (rows, cols)), shape=shape).tocsr()
    hand_meta = json.loads((Path(proposal["input"]) / "input.json").read_text())
    hand_fans = np.fromfile(Path(proposal["input"]) / "fans.u32bin", "<u4")
    touched = np.fromfile(hand_proposal / "touched.u8bin", "u1").astype(bool)
    hand_ids = np.fromfile(hand_proposal / "ids.u16bin", "<u2").reshape(-1, 4)
    hand_weights = np.fromfile(hand_proposal / "weights.f32bin", "<f4").reshape(-1, 4)
    core_ids = np.unique(hand_fans[touched])
    external_fans = []
    for record in proposal.get("externalSeedsPreserved", []):
        part = [
            part
            for part in meta["parts"]
            if part["node"] == record["node"]
            and part["primitive"] == record["primitive"]
        ]
        assert len(part) == 1
        vertex = part[0]["offset"] + record["vertex"]
        assert np.max(np.abs(p[vertex] - record["position"])) < 1e-8
        assert np.array_equal(ids[vertex], record["ids"])
        assert np.array_equal(weights[vertex], record["weights"])
        external_fans.append(fans[vertex])
    core_ids = np.unique(np.r_[core_ids, external_fans].astype("<u4"))
    core = np.searchsorted(unique, core_ids)
    assert np.array_equal(unique[core], core_ids)
    distance = dijkstra(distances, indices=core, min_only=True, limit=args.extension)
    free = np.flatnonzero((distance > 0) & (distance < args.extension))
    assert len(free)
    count = len(hand_meta["jointNames"])
    field = np.zeros((len(q), count))
    for k in range(4):
        field[np.arange(len(q)), ids[reps, k]] += weights[reps, k]
    if args.hand_proposal:
        for vertex in np.flatnonzero(touched):
            group = np.searchsorted(unique, hand_fans[vertex])
            assert unique[group] == hand_fans[vertex]
            field[group] = 0
            for joint, weight in zip(hand_ids[vertex], hand_weights[vertex]):
                field[group, joint] += weight
    original = field.copy()
    field, residual = continue_field(graph, field, free)
    assert np.array_equal(field[core], original[core])
    dense = np.maximum(field[free], 0)
    order = np.argsort(-dense, axis=1, kind="stable")[:, :4]
    values = np.take_along_axis(dense, order, axis=1)
    lost = 1 - values.sum(axis=1)
    values /= values.sum(axis=1, keepdims=True)
    args.output.mkdir()
    for name in ["ids.u16bin", "weights.f32bin", "touched.u8bin"]:
        shutil.copyfile(hand_proposal / name, args.output / name)
    unique[free].astype("<u4").tofile(args.output / "extra-fans.u32bin")
    order.astype("<u2").tofile(args.output / "extra-ids.u16bin")
    values.astype("<f4").tofile(args.output / "extra-weights.f32bin")
    extra_names = ["extra-fans.u32bin", "extra-ids.u16bin", "extra-weights.f32bin"]
    files = {
        **proposal["files"],
        **{name: sha(args.output / name) for name in extra_names},
    }
    dependencies = {
        **proposal.get("dependencies", {}),
        str(hand_proposal / "solve.json"): sha(hand_proposal / "solve.json"),
        str(parent / "solve.json"): sha(parent / "solve.json"),
        str(parent / "receipt.json"): sha(parent / "receipt.json"),
        str(args.input / "input.json"): sha(args.input / "input.json"),
    }
    diagnostics = {
        "extensionMetres": args.extension,
        "sourceFans": len(free),
        "protectedExternalSeedFans": [int(fan) for fan in external_fans],
        "relativeResidual": float(residual),
        "maximumDroppedFourWeightMass": float(lost.max()),
        "p999DroppedFourWeightMass": float(np.quantile(lost, 0.999)),
    }
    result = {
        **proposal,
        "method": proposal["method"]
        + "; coupled source-edge Dirichlet cuff continuation",
        "dependencies": dependencies,
        "files": files,
        "additionalFanField": {
            "fans": extra_names[0],
            "ids": extra_names[1],
            "weights": extra_names[2],
            **diagnostics,
        },
        "accepted": False,
        "activated": False,
    }
    (args.output / "solve.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(diagnostics))


if __name__ == "__main__":
    run()
