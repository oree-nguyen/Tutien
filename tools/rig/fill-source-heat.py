"""Fill only unweighted source vertices by Dirichlet interpolation on source edges."""

import argparse, json, hashlib, shutil
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
a = parser.parse_args()
if a.input.resolve() == a.output.resolve():
    raise ValueError("Preserve the rejected input")
meta = json.loads((a.input / "input.json").read_text())
if Path(".local/rig-candidates").resolve() not in a.output.resolve().parents:
    raise ValueError("Source-weight outputs must remain in staging")
for filename, key in [("positions.bin", "positions"), ("triangles.bin", "triangles")]:
    if (
        hashlib.sha256((a.input / filename).read_bytes()).hexdigest()
        != meta["original"][key]
    ):
        raise ValueError("Original source payload changed")
report = json.loads((a.input / "heat-solve.json").read_text())
p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3)
t = np.fromfile(a.input / "triangles.bin", "<u4").reshape(-1, 3)
ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
w = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
missing = w.sum(1) < 1e-8
unknown = np.flatnonzero(missing)
n = len(unknown)
remap = np.full(len(p), -1, dtype=np.int64)
remap[unknown] = np.arange(n)
if n == 0:
    raise ValueError("No unweighted source vertices")
tri = t[missing[t].any(1)]
edges = np.unique(
    np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1),
    axis=0,
)
edges = edges[missing[edges].any(1)]
rows = []
cols = []
values = []
rhs = np.zeros((n, len(meta["joints"])))
diagonal = np.zeros(n)
for left, right in edges:
    for vertex, other in [(left, right), (right, left)]:
        row = remap[vertex]
        if row < 0:
            continue
        diagonal[row] += 1
        if missing[other]:
            rows.append(row)
            cols.append(remap[other])
            values.append(-1)
        else:
            for k in range(4):
                rhs[row, ids[other, k]] += w[other, k]
rows.extend(range(n))
cols.extend(range(n))
values.extend(diagonal)
matrix = coo_matrix((values, (rows, cols)), shape=(n, n)).tocsc()
solved = np.asarray(spsolve(matrix, rhs))
residual = float(np.max(np.abs(matrix @ solved - rhs)))
if (
    not np.isfinite(solved).all()
    or solved.min() < -1e-9
    or residual > 1e-8
    or np.max(np.abs(solved.sum(1) - 1)) > 1e-5
):
    raise ValueError("Unanchored or invalid source-patch interpolation")
for v, support in zip(unknown, solved):
    order = np.argsort(-support)
    floor = support[order[4]] if len(order) > 4 else 0
    support = np.maximum(support[order[:4]] - floor, 0)
    if support.sum() < 1e-10:
        raise ValueError("Singular rank-five reduction")
    ids[v] = order[:4]
    w[v] = support / support.sum()
a.output.mkdir(parents=True, exist_ok=True)
for name in ["input.json", "positions.bin", "triangles.bin"]:
    shutil.copyfile(a.input / name, a.output / name)
ids.astype("<u2").tofile(a.output / "heat-ids.bin")
w.astype("<f4").tofile(a.output / "heat-weights.bin")
record = {
    "method": "Dirichlet graph Laplacian over existing original source triangle edges; all known vertices fixed",
    "parent": str(a.input),
    "parentSolveSha256": hashlib.sha256(
        (a.input / "heat-solve.json").read_bytes()
    ).hexdigest(),
    "sourceVertices": unknown.tolist(),
    "positions": p[unknown].tolist(),
    "boundaryVertices": int((~missing[np.unique(edges)]).sum()),
    "maximumResidual": residual,
    "missingWeightVertices": 0,
    "weightsValid": True,
    "accepted": False,
    "activated": False,
    "parentSolver": report,
}
(a.output / "heat-solve.json").write_text(json.dumps(record, indent=2) + "\n")
print(
    json.dumps(
        {
            k: v
            for k, v in record.items()
            if k not in ["positions", "parentSolver", "sourceVertices"]
        }
    )
)
