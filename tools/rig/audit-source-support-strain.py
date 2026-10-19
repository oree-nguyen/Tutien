"""Compare actual source-edge deformation before and after four-support reduction."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


parser = argparse.ArgumentParser()
parser.add_argument('base', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
base = args.base
meta = json.loads((base/'input.json').read_text())
pose = json.loads((base/'feasibility-input.json').read_text())
receipt = json.loads((base/'receipt.json').read_text())
assert pose['assetSha256'] == receipt['sha256']
p = np.fromfile(base/'positions.bin', dtype='<f4').reshape(-1, 3).astype(float)
t = np.fromfile(base/'triangles.bin', dtype='<u4').reshape(-1, 3)
weld = np.fromfile(base/'source-welds.u32bin', dtype='<u4')
reps, inverse = np.unique(weld, return_inverse=True)
p = p[reps]
edges, halfedge_group = np.unique(np.sort(inverse[np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]])], axis=1), axis=0, return_inverse=True)
length = np.linalg.norm(p[edges[:, 0]]-p[edges[:, 1]], axis=1)
valid = length > 1e-9
original_edge_ids = np.flatnonzero(valid)
edges, length = edges[valid], length[valid]
face_labels = np.fromfile(base/'face-labels.bin', dtype='u1')
semantic_names = ['H01_Remaining_Source', 'H01_Robe_Left', 'H01_Robe_Right', 'H01_Robe_Torso', 'H01_Sleeve_Left', 'H01_Sleeve_Right']
matrices = np.fromfile(base/'feasibility-matrices.bin', dtype='<f8').reshape(-1, 4, 4).transpose(0, 2, 1)
assert hashlib.sha256((base/'feasibility-matrices.bin').read_bytes()).hexdigest() == pose['matricesSha256']
dense = np.load(base/'dense-supports.npy', mmap_mode='r')
fixed = ((np.abs(p[:, 0]) > .46) & (p[:, 1] > .94)) | ~((p[:, 1] > .19) & (p[:, 1] < 1.55) & (np.abs(p[:, 0]) < .55))
protected = np.zeros(len(reps), dtype=bool)
np.logical_or.at(protected, inverse, np.fromfile(base/'protected.bin', dtype='u1').astype(bool))
fixed |= protected
fields = {}
for name, id_file, weight_file in [('parent', 'ids.bin', 'weights.bin'), ('fourInfluences', 'result-ids.bin', 'result-weights.bin')]:
    ids = np.fromfile(base/id_file, dtype='<u2').reshape(-1, 4)[reps]
    weights = np.fromfile(base/weight_file, dtype='<f4').reshape(-1, 4)[reps]
    position = np.zeros_like(p)
    for k in range(4):
        m = matrices[ids[:, k]]
        position += (np.einsum('nij,nj->ni', m[:, :3, :3], p)+m[:, :3, 3])*weights[:, k, None]
    fields[name] = position
position = np.zeros_like(p)
for joint in range(len(matrices)):
    if not np.any(dense[:, joint]):
        continue
    m = matrices[joint]
    position += (p@m[:3, :3].T+m[:3, 3])*dense[:, joint, None]
fields['denseBeforeReduction'] = position
ids = np.fromfile(base/'result-ids.bin', dtype='<u2').reshape(-1, 4)[reps]
weights = np.fromfile(base/'result-weights.bin', dtype='<f4').reshape(-1, 4)[reps]
four_dense = np.zeros_like(dense)
for k in range(4):
    np.add.at(four_dense, (np.arange(len(p)), ids[:, k]), weights[:, k])
component_cache = {}
adjacent_cache = {}


def edge_components(index):
    original = int(original_edge_ids[index])
    if original in adjacent_cache:
        return adjacent_cache[original]
    faces = np.unique(np.flatnonzero(halfedge_group == original) % len(t))
    result = []
    for label in np.unique(face_labels[faces]):
        if int(label) not in component_cache:
            selected = np.flatnonzero(face_labels == label)
            tr = inverse[t[selected]]
            local_edges = np.concatenate([tr[:, [0, 1]], tr[:, [1, 2]], tr[:, [2, 0]]])
            vertices, local_inverse = np.unique(local_edges, return_inverse=True)
            e = local_inverse.reshape(-1, 2)
            graph = coo_matrix((np.ones(len(e)*2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(len(vertices), len(vertices))).tocsr()
            _, component = connected_components(graph, directed=False)
            face_component = component[np.searchsorted(vertices, tr[:, 0])]
            component_cache[int(label)] = selected, face_component, {}
        selected, face_component, summaries = component_cache[int(label)]
        for face in faces[face_labels[faces] == label]:
            component = int(face_component[np.searchsorted(selected, face)])
            if component not in summaries:
                source_faces = selected[face_component == component]
                vertices = np.unique(inverse[t[source_faces]])
                summaries[component] = {'semanticRegion': semantic_names[label], 'componentFirstSourceFace': int(source_faces[0]),
                                        'componentSourceTriangles': len(source_faces), 'boundsMin': p[vertices].min(axis=0).tolist(), 'boundsMax': p[vertices].max(axis=0).tolist()}
            result.append({'adjacentSourceFace': int(face), **summaries[component]})
    adjacent_cache[original] = result
    return result


def gradient_decomposition(index, field):
    a, b = edges[index]
    mean = (p[a]+p[b])/2
    delta = p[b]-p[a]
    weight_delta = field[b]-field[a]
    weight_mean = (field[b]+field[a])/2
    moved = np.einsum('bij,j->bi', matrices[:, :3, :3], mean)+matrices[:, :3, 3]-mean
    gradient_contributions = moved*weight_delta[:, None]
    rigid = np.einsum('b,bij,j->i', weight_mean, matrices[:, :3, :3], delta)
    gradient = gradient_contributions.sum(axis=0)
    biggest = np.argsort(-np.linalg.norm(gradient_contributions, axis=1))[:6]
    return {'jointMotionOfBindEdgeMeters': rigid.tolist(), 'weightGradientDisplacementMeters': gradient.tolist(),
            'gradientMagnitudeOverBindLength': float(np.linalg.norm(gradient)/length[index]),
            'largestJointGradientContributions': [{'joint': meta['jointNames'][j], 'weightDelta': float(weight_delta[j]),
                'jointDisplacementAtEdgeMidpointMeters': moved[j].tolist(), 'contributionMeters': gradient_contributions[j].tolist()} for j in biggest]}


def influences(i, full=False):
    if full:
        return {name: float(dense[i, j]) for j, name in enumerate(meta['jointNames']) if dense[i, j] > .0001}
    return {meta['jointNames'][j]: float(w) for j, w in zip(ids[i], weights[i]) if w > .0001}


reports = {}
for name, position in fields.items():
    ratio = np.linalg.norm(position[edges[:, 0]]-position[edges[:, 1]], axis=1)/length
    worst = np.argsort(ratio)[-20:][::-1]
    reports[name] = {'edgeCount': len(edges), 'p999': float(np.percentile(ratio, 99.9)), 'maximum': float(ratio.max()),
                     'edgesAbove1_5': int((ratio > 1.5).sum()), 'edgesAbove2': int((ratio > 2).sum()),
                     'worstSourceEdges': [{'sourceVertices': reps[edges[i]].tolist(), 'bind': p[edges[i]].tolist(),
                        'posed': position[edges[i]].tolist(),
                        'bindLengthMeters': float(length[i]), 'ratio': float(ratio[i]),
                        'denseRatioForSameEdge': float(np.linalg.norm(fields['denseBeforeReduction'][edges[i, 0]]-fields['denseBeforeReduction'][edges[i, 1]])/length[i]),
                        'fourInfluenceRatioForSameEdge': float(np.linalg.norm(fields['fourInfluences'][edges[i, 0]]-fields['fourInfluences'][edges[i, 1]])/length[i]),
                        'fixedEndpoints': fixed[edges[i]].tolist(),
                        'protectedEndpoints': protected[edges[i]].tolist(),
                        'anatomicalTargetMembership': [{'lowerHips': bool(abs(p[j, 0]) < .22 and p[j, 1] < .79),
                            'waistSpine': bool(abs(p[j, 0]) < .18 and .84 < p[j, 1] < .95),
                            'torsoSpine2': bool(abs(p[j, 0]) < .13 and p[j, 1] > 1.12)} for j in edges[i]],
                        'adjacentSourceFacesAndSemanticComponents': edge_components(i),
                        'denseGradientDecomposition': gradient_decomposition(i, dense),
                        'fourInfluenceGradientDecomposition': gradient_decomposition(i, four_dense),
                        'denseInfluences': [influences(j, True) for j in edges[i]],
                        'fourInfluences': [influences(j) for j in edges[i]]} for i in worst]}
report = {**pose, 'fields': reports,
          'scope': 'Diagnostic original unique source-edge distribution at the exact held pose; all-primitive validator separately counts per-triangle edges. Dense field is not exportable under the four-influence contract.',
          'inputHashes': {name: hashlib.sha256((base/name).read_bytes()).hexdigest() for name in ['dense-supports.npy', 'result-ids.bin', 'result-weights.bin', 'positions.bin', 'triangles.bin', 'feasibility-matrices.bin']}}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({name: {key: value for key, value in r.items() if key != 'worstSourceEdges'} for name, r in reports.items()}, indent=2))
