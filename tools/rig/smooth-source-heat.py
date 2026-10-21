"""Smooth source heat fields spatially; preserve source mesh and measure separately."""

import argparse, json, hashlib, shutil, time
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--body-sigma", type=float, default=0.02)
parser.add_argument("--hand-sigma", type=float, default=0.003)
a = parser.parse_args()
if (
    a.input.resolve() == a.output.resolve()
    or not 0.005 <= a.body_sigma <= 0.08
    or not 0.001 <= a.hand_sigma <= 0.01
):
    raise ValueError("Invalid staging trial")
meta = json.loads((a.input / "input.json").read_text())
if Path(".local/rig-candidates").resolve() not in a.output.resolve().parents:
    raise ValueError("Source-weight outputs must remain in staging")
for filename, key in [("positions.bin", "positions"), ("triangles.bin", "triangles")]:
    if (
        hashlib.sha256((a.input / filename).read_bytes()).hexdigest()
        != meta["original"][key]
    ):
        raise ValueError("Original source payload changed")
p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3)
ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
w = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
if np.min(w.sum(1)) < 0.999:
    raise ValueError("Fill unweighted source patches before smoothing")
frames = json.loads(Path("data/rig/hand-frames.json").read_text())["heroes"][
    meta["hero"]
]["hands"]
handpoints = np.array(
    [
        q
        for f in frames.values()
        for finger in f["fingers"].values()
        for q in finger["points"]
    ]
)
handtree = cKDTree(handpoints)
tree = cKDTree(p)
count = len(p)
outids = np.zeros_like(ids)
outw = np.zeros_like(w)
started = time.monotonic()
k = 128
for start in range(0, count, 4096):
    end = min(count, start + 4096)
    q = p[start:end]
    distance, near = tree.query(q, k=k, workers=4)
    hand_distance = handtree.query(q)[0]
    blend = np.clip((hand_distance - 0.025) / 0.055, 0, 1)
    blend = blend * blend * (3 - 2 * blend)
    sigma = a.hand_sigma + (a.body_sigma - a.hand_sigma) * blend
    kernel = np.exp(-0.5 * (distance / sigma[:, None]) ** 2)
    kernel /= kernel.sum(1)[:, None]
    field = np.zeros((len(q), len(meta["joints"])), dtype=np.float64)
    rows = np.arange(len(q))[:, None]
    for j in range(4):
        np.add.at(
            field,
            (np.broadcast_to(rows, near.shape).ravel(), ids[near, j].ravel()),
            (kernel * w[near, j]).ravel(),
        )
    order = np.argsort(-field, axis=1)[:, :5]
    ranked = np.take_along_axis(field, order, axis=1)
    reduced = np.maximum(0, ranked[:, :4] - ranked[:, 4, None])
    total = reduced.sum(1)
    if total.min() < 1e-12:
        raise ValueError("Rank-five singularity")
    outids[start:end] = order[:, :4]
    outw[start:end] = reduced / total[:, None]
    if start % (4096 * 30) == 0:
        print(
            json.dumps(
                {"vertices": end, "total": count, "seconds": time.monotonic() - started}
            ),
            flush=True,
        )
a.output.mkdir(parents=True, exist_ok=True)
for f in ["input.json", "positions.bin", "triangles.bin"]:
    shutil.copyfile(a.input / f, a.output / f)
outids.astype("<u2").tofile(a.output / "heat-ids.bin")
outw.astype("<f4").tofile(a.output / "heat-weights.bin")
record = {
    "method": "Gaussian reconstruction of source heat supports, normalized then continuous rank-five subtraction to four influences",
    "parent": str(a.input),
    "parentSolveSha256": hashlib.sha256(
        (a.input / "heat-solve.json").read_bytes()
    ).hexdigest(),
    "sourceInputSha256": meta["inputSha256"],
    "bodySigmaMetres": a.body_sigma,
    "handSigmaMetres": a.hand_sigma,
    "neighbours": k,
    "vertices": count,
    "missingWeightVertices": 0,
    "weightsValid": True,
    "seconds": time.monotonic() - started,
    "accepted": False,
    "activated": False,
    "scope": "New weight-field candidate only. Requires actual source-surface strain/contact and silhouette; smoothing is not acceptance.",
}
(a.output / "heat-solve.json").write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record), flush=True)
