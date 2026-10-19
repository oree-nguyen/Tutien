"""Audit exported semantic regions on the source-edge graph, without proximity joins."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

base = Path(sys.argv[1] if len(sys.argv) > 1 else '.local/rig-candidates/semantic-garment')
meta = json.loads((base / 'input.json').read_text())
p = np.fromfile(base / 'positions.bin', dtype='<f4').reshape(-1, 3)
triangles = np.fromfile(base / 'triangles.bin', dtype='<u4').reshape(-1, 3)
weld = np.fromfile(base / 'source-welds.u32bin', dtype='<u4')
face_labels = np.fromfile(base / 'face-labels.bin', dtype='u1')
labels = np.fromfile(base / 'vertex-labels.bin', dtype='u1')
graph_report = json.loads((base / 'graph-report.json').read_text())
ids = np.fromfile(base / 'result-ids.bin', dtype='<u2').reshape(-1, 4)
weights = np.fromfile(base / 'result-weights.bin', dtype='<f4').reshape(-1, 4)
names = ['H01_Remaining_Source', 'H01_Robe_Left', 'H01_Robe_Right', 'H01_Robe_Torso', 'H01_Sleeve_Left', 'H01_Sleeve_Right']
parts = []
for label, name in enumerate(names):
    face_ids = np.flatnonzero(face_labels == label)
    tr = triangles[face_ids]
    vertices = np.unique(tr)
    edges = weld[np.concatenate((tr[:, [0, 1]], tr[:, [1, 2]], tr[:, [2, 0]]))]
    reps, inverse = np.unique(edges, return_inverse=True)
    e = inverse.reshape(-1, 2)
    graph = coo_matrix((np.ones(len(e)*2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(len(reps), len(reps))).tocsr()
    count, component = connected_components(graph, directed=False)
    face_components = component[np.searchsorted(reps, weld[tr[:, 0]])]
    component_counts = np.bincount(face_components, minlength=count)
    components = []
    for c in np.argsort(-component_counts):
        f = face_ids[face_components == c]
        corners = np.unique(triangles[f])
        components.append({'triangles': len(f), 'firstSourceFace': int(f[0]), 'boundsMin': p[corners].min(axis=0).tolist(), 'boundsMax': p[corners].max(axis=0).tolist()})
    mass = [(name, float(np.where(ids[vertices] == joint, weights[vertices], 0).sum() / len(vertices))) for joint, name in enumerate(meta['jointNames'])]
    parts.append({'name': name, 'label': label, 'triangles': len(tr), 'sourceVertices': len(vertices), 'connectedComponents': count,
                  'componentsAtMostTenFaces': int((component_counts <= 10).sum()), 'components': components,
                  'averageInfluenceByJoint': {name: value for name, value in mass if value > .001}})

# Store exact, SHA-bound source-face patches used by the anatomical graph seeds.
# These are proposed seed regions, not an assertion that garment cuts were accepted.
x, y = np.abs(p[:, 0]), p[:, 1]
outer = labels > 0
sx, sy = (.33, .78) if 'fourInfluenceReduction' in graph_report else (.39, .91)
masks = [outer & (p[:, 0] > .05) & (y < .69), outer & (p[:, 0] < -.05) & (y < .69), outer & (x < .14) & (y > 1.05),
         outer & (p[:, 0] > sx) & (y > sy), outer & (p[:, 0] < -sx) & (y > sy)]
patches = []
for name, mask in zip(names[1:], masks):
    face_ids = np.flatnonzero(mask[triangles].all(axis=1))
    # The complete binary face list is compact and retains original source IDs.
    filename = name + '-seed-faces.u32bin'
    face_ids.astype('<u4').tofile(base / filename)
    import hashlib
    digest = hashlib.sha256((base / filename).read_bytes()).hexdigest()
    patches.append({'semanticRegion': name, 'sourceFaceMap': {'file': filename, 'count': len(face_ids), 'sha256': digest},
                    'seedEvidence': 'Albedo confidence plus anatomical bind-space patch; propagation is restricted to source surface edges',
                    'semanticBoundaryAccepted': False})
report = {'sourceSha256': meta['sourceSha256'], 'parentRigSha256': meta['parentRigSha256'],
          'adjacency': 'Original triangle edges with independently auditable paired opposite UV boundary halfedges',
          'spatialNearestNeighborUsed': False, 'allSourceTrianglesAssignedExactlyOnce': bool(len(face_labels) == len(triangles) and np.all(face_labels < len(names))),
          'parts': parts, 'sourceSeedPatches': patches,
          'status': 'Topology and support audit; visual garment boundaries and all deformation gates remain independent'}
if (base/'dense-supports.npy').exists():
    dense = np.load(base/'dense-supports.npy', mmap_mode='r')
    ranked = np.sort(dense, axis=1)[:, -5:]
    normalization = ranked[:, 1:].sum(axis=1)-4*ranked[:, 0]
    minimum = int(normalization.argmin())
    source_group_reps = np.unique(weld)
    report['continuousReductionConditioning'] = {
        'minimumNormalizationMass': float(normalization[minimum]),
        'percentiles': {str(q): float(np.percentile(normalization, q)) for q in [0, .1, 1, 50, 99, 100]},
        'minimumSourceVertex': int(source_group_reps[minimum]),
        'minimumBindPosition': p[source_group_reps[minimum]].tolist(),
        'minimumDenseInfluences': {name: float(dense[minimum, j]) for j, name in enumerate(meta['jointNames']) if dense[minimum, j] > .001},
        'scope': 'Diagnostic denominator of continuous rank reduction; deformation gates remain independent'}
(base / 'semantic-topology-audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'parts': [{key: part[key] for key in ['name', 'triangles', 'connectedComponents', 'componentsAtMostTenFaces']} for part in parts]}, indent=2))
