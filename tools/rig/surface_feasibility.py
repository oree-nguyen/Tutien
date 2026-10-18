"""Necessary source-edge stretch bound between fixed endpoint poses; no model edits."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

base, output = Path(sys.argv[1]), Path(sys.argv[2])
meta = json.loads((base / 'input.json').read_text())
p = np.fromfile(base / 'positions.bin', dtype='<f4').reshape(-1, 3).astype(np.float64)
tri = np.fromfile(base / 'triangles.bin', dtype='<u4').reshape(-1, 3)
ids = np.fromfile(base / 'ids.bin', dtype='<u2').reshape(-1, 4)
w = np.fromfile(base / 'weights.bin', dtype='<f4').reshape(-1, 4)
locked = np.fromfile(base / 'protected.bin', dtype='u1').astype(bool)
matrices = np.fromfile(base / 'matrices.bin', dtype='<f8').reshape(-1, 4, 4).transpose(0, 2, 1)
names = meta['jointNames']
free = np.array([names[row[0]] == 'Spine2' and names[row[1]] in ('RightArm', 'LeftArm') and names[row[2]].endswith('ForeArm') and names[row[3]].endswith('Hand') for row in ids]) & ~locked
posed = np.zeros_like(p)
for k in range(4):
    m = matrices[ids[:, k]]
    posed += (np.einsum('nij,nj->ni', m[:, :3, :3], p) + m[:, :3, 3]) * w[:, k, None]
edges = np.unique(np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1), axis=0)
lengths = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
valid = lengths > 1e-12
edges, lengths = edges[valid], lengths[valid]
graph = coo_matrix((np.r_[lengths, lengths], (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(len(p), len(p))).tocsr()
frames = json.loads(Path('data/rig/hand-frames.json').read_text())['heroes']['H01']['hands']
best = None
for side, frame in frames.items():
    landmarks = {'wrist': frame['wrist'], **{name: finger['points'][-1] for name, finger in frame['fingers'].items()}}
    for landmark, point in landmarks.items():
        squared = np.sum((p-np.array(point))**2, axis=1)
        squared[~locked] = np.inf
        seed = int(squared.argmin())
        distances, predecessors = dijkstra(graph, directed=False, indices=seed, return_predecessors=True)
        candidates = ~free & np.isfinite(distances) & (distances >= .01)
        if not candidates.any():
            print(side, landmark, 'no reachable fixed endpoint at the diagnostic path length', flush=True)
            continue
        ratio = np.zeros(len(p))
        ratio[candidates] = np.linalg.norm(posed[candidates]-posed[seed], axis=1) / distances[candidates]
        end = int(ratio.argmax())
        print(side, landmark, 'necessary stretch', ratio[end], flush=True)
        if best is None or ratio[end] > best['necessaryMaximumEdgeStretch']:
            path = [end]
            while path[-1] != seed:
                predecessor = int(predecessors[path[-1]])
                if predecessor < 0:
                    raise RuntimeError('Broken shortest-path witness')
                path.append(predecessor)
            path.reverse()
            best = {'side': side, 'landmark': landmark, 'sourceStart': seed, 'sourceEnd': end,
                    'startPosition': p[seed].tolist(), 'endPosition': p[end].tolist(),
                    'startPosed': posed[seed].tolist(), 'endPosed': posed[end].tolist(),
                    'sourcePathLength': float(distances[end]), 'posedEndpointDistance': float(np.linalg.norm(posed[end]-posed[seed])),
                    'necessaryMaximumEdgeStretch': float(ratio[end]), 'sourcePath': path,
                    'endpointIsProtectedHand': bool(locked[end])}
report = {'method': 'Triangle inequality over shortest paths of original nonzero source edges, no weld/geometry edits; path witnesses use fixed endpoint poses',
          'minimumWitnessPathMeters': .01, 'scope': 'Necessary bound for this selected fixed endpoint set, not a bound for every possible rig or pose',
          'inputHashes': {name: hashlib.sha256((base/name).read_bytes()).hexdigest() for name in ['positions.bin','triangles.bin','ids.bin','weights.bin','protected.bin','matrices.bin']},
          'bestWitness': best, 'threshold': 2, 'sampledWitnessExceedsThreshold': best['necessaryMaximumEdgeStretch'] > 2,
          'feasibilityProven': False}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2)+'\n')
