"""Source-edge path witnesses; absence of an impossible witness is not feasibility."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

base, output = Path(sys.argv[1]), Path(sys.argv[2])
meta = json.loads((base/'input.json').read_text())
proof = json.loads((base/'feasibility-input.json').read_text())
p = np.fromfile(base/'positions.bin', dtype='<f4').reshape(-1, 3).astype(float)
t = np.fromfile(base/'triangles.bin', dtype='<u4').reshape(-1, 3)
weld = np.fromfile(base/'source-welds.u32bin', dtype='<u4')
reps, inverse = np.unique(weld, return_inverse=True)
points = p[reps]
edges = np.unique(np.sort(inverse[np.concatenate((t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]))], axis=1), axis=0)
lengths = np.linalg.norm(points[edges[:, 0]]-points[edges[:, 1]], axis=1)
valid = lengths > 1e-12
edges, lengths = edges[valid], lengths[valid]
graph = coo_matrix((np.r_[lengths, lengths], (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(len(points), len(points))).tocsr()
ids = np.fromfile(base/'result-ids.bin', dtype='<u2').reshape(-1, 4)[reps]
weights = np.fromfile(base/'result-weights.bin', dtype='<f4').reshape(-1, 4)[reps]
matrices = np.fromfile(base/'feasibility-matrices.bin', dtype='<f8').reshape(-1, 4, 4).transpose(0, 2, 1)
posed = np.zeros_like(points)
for k in range(4):
    m = matrices[ids[:, k]]
    posed += (np.einsum('nij,nj->ni', m[:, :3, :3], points)+m[:, :3, 3])*weights[:, k, None]
locked = np.zeros(len(points), dtype=bool)
np.logical_or.at(locked, inverse, np.fromfile(base/'protected.bin', dtype='u1').astype(bool))
waist = (np.abs(points[:, 0]) < .18) & (points[:, 1] > .84) & (points[:, 1] < .95)
spine = matrices[meta['jointNames'].index('Spine')]
prescribed = points@spine[:3, :3].T+spine[:3, 3]
frames = json.loads(Path('data/rig/hand-frames.json').read_text())['heroes']['H01']['hands']
witnesses = []
for side, frame in frames.items():
    squared = ((points-np.asarray(frame['wrist']))**2).sum(axis=1)
    squared[~locked] = np.inf
    start = int(squared.argmin())
    distance, previous = dijkstra(graph, directed=False, indices=start, return_predecessors=True)
    valid = waist & np.isfinite(distance) & (distance > .05)
    if not valid.any():
        raise RuntimeError('No reachable original source waist surface for '+side)
    for mode, target in [('candidate-waist', posed), ('prescribed-Spine-waist', prescribed)]:
        ratio = np.zeros(len(points))
        ratio[valid] = np.linalg.norm(target[valid]-posed[start], axis=1)/distance[valid]
        end = int(ratio.argmax())
        path = [end]
        while path[-1] != start:
            predecessor = int(previous[path[-1]])
            if predecessor < 0:
                raise RuntimeError('Broken source path witness')
            path.append(predecessor)
        path.reverse()
        witnesses.append({'side': side, 'waistEndpointMode': mode, 'sourceStart': int(reps[start]), 'sourceEnd': int(reps[end]),
                          'startBind': points[start].tolist(), 'endBind': points[end].tolist(), 'startPosed': posed[start].tolist(), 'endPosed': target[end].tolist(),
                          'sourcePathLengthMeters': float(distance[end]), 'posedEndpointDistanceMeters': float(np.linalg.norm(target[end]-posed[start])),
                          'necessaryMaximumEdgeStretchForTheseEndpoints': float(ratio[end]), 'sourcePath': reps[path].tolist(),
                          'waistIsAnImmutableConstraintInCurrentSolve': False})
report = {**proof, 'method': 'Triangle inequality along original source edges and independently auditable unique opposite UV-boundary pairs',
          'scope': 'Two protected wrist source samples against every reachable waist source group; prescribed Spine endpoint is an explicit anatomical target, while candidate waist weights remain free. This does not prove all garment constraints feasible or globally impossible.',
          'minimumWitnessPathMeters': .05, 'witnesses': witnesses, 'maximumEdgeThreshold': 2,
          'sampledEndpointSetRequiresEdgeAboveMaximum': any(w['necessaryMaximumEdgeStretchForTheseEndpoints'] > 2 for w in witnesses),
          'wholeGarmentFeasibilityProven': False,
          'inputHashes': {name: hashlib.sha256((base/name).read_bytes()).hexdigest() for name in ['positions.bin', 'triangles.bin', 'source-welds.u32bin', 'result-ids.bin', 'result-weights.bin', 'protected.bin', 'feasibility-matrices.bin']}}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['inputHashes', 'witnesses']}, indent=2))
for w in witnesses:
    print(w['side'], w['waistEndpointMode'], w['sourcePathLengthMeters'], w['posedEndpointDistanceMeters'], w['necessaryMaximumEdgeStretchForTheseEndpoints'])
