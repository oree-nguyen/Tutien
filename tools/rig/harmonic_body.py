"""Surface-graph Dirichlet skin interpolation; operates on weights, never geometry."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import connected_components
from scipy.sparse.linalg import cg, LinearOperator

base = Path(sys.argv[1])
meta = json.loads((base / 'input.json').read_text())
p = np.fromfile(base / 'positions.bin', dtype='<f4').reshape(-1, 3).astype(np.float64)
tri = np.fromfile(base / 'triangles.bin', dtype='<u4').reshape(-1, 3)
ids = np.fromfile(base / 'ids.bin', dtype='<u2').reshape(-1, 4)
weights = np.fromfile(base / 'weights.bin', dtype='<f4').reshape(-1, 4)
protected = np.fromfile(base / 'protected.bin', dtype='u1').astype(bool)
_, representatives, inverse = np.unique(np.round(p * 1e6).astype(np.int64), axis=0, return_index=True, return_inverse=True)
points = p[representatives]
edges = np.concatenate((tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]))
edges = np.unique(np.sort(inverse[edges], axis=1), axis=0)
edges = edges[edges[:, 0] != edges[:, 1]]
lengths = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
conductance = 1 / np.maximum(lengths, 1e-6)
adj = coo_matrix((np.r_[conductance, conductance], (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(len(points), len(points))).tocsr()
degree = np.asarray(adj.sum(axis=1)).ravel()
laplacian = diags(degree) - adj
locked = np.zeros(len(points), dtype=bool)
np.logical_or.at(locked, inverse, protected)
domain = meta.get('domain', {'minY': .55, 'maxY': 1.62, 'minAbsX': .12})
active = (points[:, 1] > domain['minY']) & (points[:, 1] < domain['maxY']) & (np.abs(points[:, 0]) > domain['minAbsX']) & ~locked
names = meta['jointNames']
joint_index = {name: i for i, name in enumerate(names)}
out_ids, out_weights = ids.copy(), weights.copy()
reports = []
for side, sign in [('Right', -1), ('Left', 1)]:
    supports = np.array([joint_index['Spine2']] + [joint_index[side + part] for part in ['Arm', 'ForeArm', 'Hand']])
    free = active & (points[:, 0] * sign > 0)
    boundary = ~free
    # Closed disconnected ornaments without any Dirichlet contact keep their input weights.
    components, labels = connected_components(adj[free][:, free], directed=False)
    touches_boundary = np.asarray(adj[free][:, boundary].sum(axis=1)).ravel() > 0
    anchored = np.zeros(components, dtype=bool)
    np.logical_or.at(anchored, labels, touches_boundary)
    free_ids = np.flatnonzero(free)
    free[free_ids[~anchored[labels]]] = False
    boundary = ~free
    if not free.any():
        reports.append({'side': side, 'freeWeldedVertices': 0, 'sourceVertices': 0, 'iterations': [], 'relativeResiduals': []})
        continue
    boundary_weights = np.zeros((len(points), 4))
    for k in range(4):
        for column in range(1, 4):
            boundary_weights[:, column] += weights[representatives, k] * (ids[representatives, k] == supports[column])
    boundary_weights[:, 0] = 1 - boundary_weights[:, 1:].sum(axis=1)
    matrix = laplacian[free][:, free].tocsr()
    diagonal = matrix.diagonal()
    preconditioner = LinearOperator(matrix.shape, matvec=lambda x: x / diagonal)
    rhs = adj[free][:, boundary] @ boundary_weights[boundary]
    solutions = np.zeros((free.sum(), 4))
    residuals, iterations = [], []
    for column in range(1, 4):
        count = [0]
        def callback(_):
            count[0] += 1
        solution, info = cg(matrix, rhs[:, column], M=preconditioner, rtol=1e-7, atol=1e-10, maxiter=5000, callback=callback)
        residual = np.linalg.norm(matrix @ solution - rhs[:, column]) / max(1e-12, np.linalg.norm(rhs[:, column]))
        print(side, column, 'CG', info, 'iterations', count[0], 'residual', residual, flush=True)
        if info != 0 or residual > 1e-6:
            raise RuntimeError('Surface solve did not converge; no candidate exported')
        solutions[:, column] = solution
        residuals.append(float(residual))
        iterations.append(count[0])
    solutions[:, 0] = 1 - solutions[:, 1:].sum(axis=1)
    if solutions.min() < -1e-5 or solutions.max() > 1 + 1e-5:
        raise RuntimeError('Discrete maximum principle violated; no candidate exported')
    solutions = np.maximum(0, solutions)
    solutions /= solutions.sum(axis=1, keepdims=True)
    lookup = np.full(len(points), -1, dtype=np.int64)
    lookup[free] = np.arange(free.sum())
    source_free = free[inverse] & ~protected
    out_ids[source_free] = supports
    out_weights[source_free] = solutions[lookup[inverse[source_free]]]
    reports.append({'side': side, 'freeWeldedVertices': int(free.sum()), 'sourceVertices': int(source_free.sum()), 'iterations': iterations, 'relativeResiduals': residuals})
assert np.array_equal(out_ids[protected], ids[protected])
assert np.array_equal(out_weights[protected], weights[protected])
assert np.isfinite(out_weights).all() and (out_weights >= 0).all()
assert np.max(np.abs(out_weights.sum(axis=1) - 1)) < 1e-5
out_ids.astype('<u2').tofile(base / 'result-ids.bin')
out_weights.astype('<f4').tofile(base / 'result-weights.bin')
(base / 'solve.json').write_text(json.dumps({'method': 'Positive inverse-edge-length surface Dirichlet Laplacian, shared four arm/spine supports per side; protected source vertices unchanged', 'domain': domain, 'weldedVertices': len(points), 'sourceEdges': len(edges), 'reports': reports}, indent=2) + '\n')
