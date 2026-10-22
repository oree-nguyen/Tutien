"""Four-support cloth grid without rank-five subtraction near support ties.

The upper guide rows must share the exact hip transform. Source fans touching
the waistband get that root field, with a source-edge fade into untouched core
weights. No body, garment surface, UV or texture is generated here.
"""

import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra


def smooth(value):
    t = np.clip(value, 0, 1)
    return t * t * (3 - 2 * t)


def blend_root(ids, weights, alpha, hip):
    """Insert a root only in a zero slot; never discard an existing influence."""
    out_ids, out_weights = ids.copy(), weights.copy()
    active = np.flatnonzero(alpha > 0)
    for v in active:
        slots = np.flatnonzero(ids[v] == hip)
        if not len(slots):
            slots = np.flatnonzero(weights[v] == 0)
        if not len(slots):
            raise ValueError(f"Root bridge has no free support at source fan {v}")
        slot = slots[0]
        out_ids[v, slot] = hip
        out_weights[v] *= 1 - alpha[v]
        out_weights[v, slot] += alpha[v]
    return out_ids, out_weights


def grid_field(points, chains, records, layer=None):
    """Bilinear source coordinates use exactly four slots, without sparsifying."""
    assert len(chains) == 2
    ids = np.zeros((len(points), 4), dtype=np.uint16)
    weights = np.zeros((len(points), 4), dtype=np.float64)
    back = smooth((0.03 - points[:, 2]) / 0.06)
    if layer is not None:
        back = np.where(layer == 1, 0, np.where(layer == 2, 1, back))
    for offset, face in [(0, "Front"), (2, "Back")]:
        chain = next(c for c in chains if c["name"].endswith("_" + face))
        coordinate = np.clip(
            (chain["anchor"][1] - points[:, 1]) / chain["spacing"], 0, chain["rows"] - 1
        )
        lower = np.floor(coordinate).astype(int)
        upper = np.minimum(lower + 1, chain["rows"] - 1)
        fraction = coordinate - lower
        joints = np.array(
            [
                next(
                    r["index"]
                    for r in records
                    if r["chain"] == chain["name"] and r["row"] == row
                )
                for row in range(chain["rows"])
            ]
        )
        amount = 1 - back if face == "Front" else back
        ids[:, offset] = joints[lower]
        ids[:, offset + 1] = joints[upper]
        weights[:, offset] = amount * (1 - fraction)
        weights[:, offset + 1] = amount * fraction
    np.testing.assert_allclose(weights.sum(1), 1, atol=1e-14)
    return ids, weights


def main():
    directory = Path(sys.argv[1])
    meta = json.loads((directory / "input.json").read_text())
    started = time.monotonic()
    for name, digest in meta["files"].items():
        assert hashlib.sha256((directory / name).read_bytes()).hexdigest() == digest
    p = np.fromfile(directory / "positions.f32bin", "<f4").reshape(-1, 3)
    fans = np.fromfile(directory / "fans.u32bin", "<u4")
    roles = np.fromfile(directory / "roles.u8bin", "u1")
    triangles = np.fromfile(directory / "triangles.u32bin", "<u4").reshape(-1, 3)
    ids = np.fromfile(directory / "ids.u16bin", "<u2").reshape(-1, 4)
    weights = np.fromfile(directory / "weights.f32bin", "<f4").reshape(-1, 4)
    protected = np.fromfile(directory / "protected.u8bin", "u1").astype(bool)
    layer = np.fromfile(directory / "layers.u8bin", "u1")
    unique, reps, inverse = np.unique(fans, return_index=True, return_inverse=True)
    points = p[reps].astype(float)
    if np.max(np.abs(p - points[inverse])) > 1e-8:
        raise ValueError("Cut fan joins distinct original surface positions")
    group_roles = np.zeros(len(reps), np.uint8)
    np.bitwise_or.at(group_roles, inverse, np.left_shift(1, roles))
    layer_bits = np.zeros(len(reps), np.uint8)
    np.bitwise_or.at(
        layer_bits,
        inverse,
        np.where(layer == 1, 1, np.where(layer == 2, 2, 0)).astype(np.uint8),
    )
    group_layer = np.where(layer_bits == 1, 1, np.where(layer_bits == 2, 2, 0))
    pinned = np.zeros(len(reps), bool)
    np.logical_or.at(pinned, inverse, protected)
    panel = (group_roles & 6) != 0
    if (panel & pinned).any():
        raise ValueError("A panel contains a protected source hand")
    mixed = panel & ((group_roles & 1) != 0)
    assert mixed.any()
    # Before allowing a hip bridge, check that every mixed boundary is above
    # the last guide row whose actual local rotation is still its bind value.
    for chain in meta["config"]["chains"]:
        zero_rows = 0
        for angle in chain["anglesDegrees"]:
            if angle != 0:
                break
            zero_rows += 1
        root_bottom = chain["anchor"][1] - (zero_rows - 1) * chain["spacing"]
        if zero_rows < 2 or np.min(points[mixed, 1]) < root_bottom:
            raise ValueError("Panel/core boundary is outside rigid root rows")
        if np.any((layer_bits == 3) & (points[:, 1] < root_bottom)):
            raise ValueError("Opposing cloth layers remain sewn below rigid root rows")
    edges = np.unique(
        np.sort(
            np.concatenate(
                [
                    inverse[triangles[:, [0, 1]]],
                    inverse[triangles[:, [1, 2]]],
                    inverse[triangles[:, [2, 0]]],
                ]
            ),
            axis=1,
        ),
        axis=0,
    )
    edges = edges[edges[:, 0] != edges[:, 1]]
    length = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
    graph = coo_matrix(
        (
            np.r_[length, length],
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(len(points), len(points)),
    ).tocsr()
    bridge = meta["config"]["transitionMetres"]
    distance = dijkstra(
        graph,
        indices=np.flatnonzero(mixed),
        min_only=True,
        directed=False,
        limit=bridge,
    )
    alpha = 1 - smooth(distance / bridge)
    alpha[panel | pinned] = 0
    hip = meta["coreJointNames"].index("Hips")
    group_ids, group_weights = blend_root(
        ids[reps], weights[reps].astype(float), alpha, hip
    )
    for role in [1, 2]:
        chosen = panel & ((group_roles & (1 << role)) != 0)
        if role == 2:
            chosen &= (group_roles & 2) == 0
        new_ids, new_weights = grid_field(
            points[chosen],
            [c for c in meta["config"]["chains"] if c["role"] == role],
            meta["skeleton"]["records"],
            group_layer[chosen],
        )
        group_ids[chosen], group_weights[chosen] = new_ids, new_weights
    changed = (panel | (alpha > 0))[inverse]
    out_ids, out_weights = ids.copy(), weights.copy()
    out_ids[changed], out_weights[changed] = (
        group_ids[inverse[changed]],
        group_weights[inverse[changed]],
    )
    assert not (changed & protected).any()
    assert np.array_equal(out_ids[~changed], ids[~changed])
    assert np.array_equal(out_weights[~changed], weights[~changed])
    assert np.isfinite(out_weights).all() and out_weights.min() >= 0
    assert np.max(np.abs(out_weights.sum(1) - 1)) < 1e-5
    out_ids.astype("<u2").tofile(directory / "result-ids.u16bin")
    out_weights.astype("<f4").tofile(directory / "result-weights.f32bin")
    changed.astype("u1").tofile(directory / "changed.u8bin")
    report = {
        "inputSha256": meta["inputSha256"],
        "kind": "four-support-source-cloth-grid",
        "sourceFans": len(reps),
        "panelFans": int(panel.sum()),
        "mixedWaistFans": int(mixed.sum()),
        "rootBridgeFans": int((alpha > 0).sum()),
        "changedCopies": int(changed.sum()),
        "protectedCopies": int(protected.sum()),
        "sparsificationUsed": False,
        "seconds": time.monotonic() - started,
        "accepted": False,
        "activated": False,
        "scope": "Original source-fan grid field and rigid-root bridge only; no strain, collision, floor, drape, animation or pattern acceptance.",
    }
    (directory / "solve.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
