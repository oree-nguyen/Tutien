"""Global descent on source-edge strain, retaining source topology and protected hands."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from surface_objective import SurfaceObjective, projected_descent

base = Path(sys.argv[1])
meta = json.loads((base / 'input.json').read_text())
p = np.fromfile(base / 'positions.bin', dtype='<f4').reshape(-1, 3).astype(np.float64)
tri = np.fromfile(base / 'triangles.bin', dtype='<u4').reshape(-1, 3)
ids = np.fromfile(base / 'ids.bin', dtype='<u2').reshape(-1, 4)
w = np.fromfile(base / 'weights.bin', dtype='<f4').reshape(-1, 4)
locked = np.fromfile(base / 'protected.bin', dtype='u1').astype(bool)
matrices = np.fromfile(base / 'matrices.bin', dtype='<f8').reshape(-1, 4, 4).transpose(0, 2, 1)
names = meta['jointNames']
free = np.array([names[row[0]] == 'Spine2' and names[row[1]] in ('RightArm', 'LeftArm') and names[row[2]].endswith('ForeArm') and names[row[3]].endswith('Hand') for row in ids]) & ~locked
_, inverse = np.unique(np.round(p * 1e6).astype(np.int64), axis=0, return_inverse=True)
weld_locked = np.zeros(inverse.max()+1, dtype=bool)
np.logical_or.at(weld_locked, inverse, locked)
free &= ~weld_locked[inverse]
source_free = np.flatnonzero(free)
_, representatives, groups = np.unique(inverse[free], return_index=True, return_inverse=True)
source_representatives = source_free[representatives]
fixed = np.zeros_like(p)
transforms = np.empty((len(source_free), 4, 3))
for k in range(4):
    m = matrices[ids[:, k]]
    transformed = np.einsum('nij,nj->ni', m[:, :3, :3], p) + m[:, :3, 3]
    fixed += transformed * w[:, k, None]
    transforms[:, k] = transformed[free]
edges = np.unique(np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1), axis=0)
edges = edges[free[edges[:, 0]] | free[edges[:, 1]]]
rest = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
valid = rest > 1e-12
edges, rest = edges[valid], rest[valid]
projected = meta.get('backend') == 'projected'
initial = np.maximum(w[source_representatives].astype(np.float64), 0 if projected else 1e-5)
initial /= initial.sum(axis=1, keepdims=True)
objective = SurfaceObjective(fixed, transforms, source_free, groups, edges, rest, initial)
x = np.log(np.maximum(initial, 1e-300)).ravel()
objective(x)
initial_measurement = objective.last.copy()
history = []
def callback(theta):
    record = {'iteration': len(history), **objective.last}
    history.append(record)
    if record['iteration'] % 10 == 0:
        print(record, flush=True)
if projected:
    def record(item):
        history.append(item)
        if item['iteration'] % 10 == 0:
            print(item, flush=True)
    objective.evaluate_weights(initial)
    initial_measurement = objective.last.copy()
    optimized = projected_descent(objective, initial, meta['iterations'], record)
    completed, converged, message = meta['iterations'], False, 'Fixed-iteration projected descent; acceptance is independent'
else:
    result = minimize(objective, x, jac=True, method='L-BFGS-B', bounds=[(-20, 20)]*len(x), callback=callback,
                      options={'maxiter': meta['iterations'], 'maxcor': 8, 'maxls': 30, 'ftol': 1e-13, 'gtol': 1e-10})
    objective(result.x)
    optimized = objective.weights(result.x)
    completed, converged, message = result.nit, bool(result.success), str(result.message)
if objective.last['loss'] > initial_measurement['loss'] + 1e-12 or not np.isfinite(optimized).all():
    raise RuntimeError('Global descent worsened its objective; rejected without export')
out = w.copy()
out[free] = optimized[groups]
assert np.array_equal(out[locked], w[locked])
assert (out >= 0).all() and np.max(np.abs(out.sum(axis=1)-1)) < 1e-5
out.astype('<f4').tofile(base / 'result-weights.bin')
(base / 'solve.json').write_text(json.dumps({'method': ('Metric-projected simplex descent' if projected else 'Global L-BFGS descent')+' on exact source-edge stretch; fixed hand/finger regions',
    'sourceFreeVertices': int(free.sum()), 'freeGroups': len(initial), 'objectiveEdges': len(edges), 'iterations': completed, 'optimizerConverged': converged,
    'optimizerMessage': message, 'initial': initial_measurement, 'final': objective.last, 'history': history,
    'status': 'Diagnostic; independent full source/strain/contact checks required'}, indent=2)+'\n')
