"""Staging support fields on reviewed source-boot domains; never source geometry.

The domain remains unapproved until isolated textured views and whole-mesh
strain/contact checks pass. Boundary distance blends back to the parent rig.
"""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from source_garment_graph import sparsify_four_influences


def smooth(x):
    x = np.clip(x, 0, 1)
    return x*x*(3-2*x)


def main():
    directory = Path(sys.argv[1])
    meta = json.loads((directory/'input.json').read_text())
    domain = json.loads((directory/'boot-domain.json').read_text())
    assert domain['sourceSha256'] == meta['sourceSha256']
    positions = np.fromfile(directory/'positions.bin', '<f4').reshape(-1, 3)
    triangles = np.fromfile(directory/'triangles.bin', '<u4').reshape(-1, 3)
    labels = np.fromfile(directory/'boot-domain.bin', 'u1')
    boundary = np.fromfile(directory/'boot-boundary-distance.bin', '<f4')
    ids = np.fromfile(directory/'ids.bin', '<u2').reshape(-1, 4)
    weights = np.fromfile(directory/'weights.bin', '<f4').reshape(-1, 4)
    assert len(positions) == len(labels) == len(boundary) == len(ids)
    assert np.isfinite(boundary).all() and np.isfinite(weights).all()
    result_ids, result_weights = ids.copy(), weights.copy()
    mask = np.zeros(len(positions), 'u1')
    sides = {}
    for label, side in [(1, 'Left'), (2, 'Right')]:
        selected = labels == label
        vertices = np.flatnonzero(selected)
        joint = {name: meta['joints'].index(side+name) for name in ['Leg', 'Foot', 'ToeBase']}
        ankle = np.asarray(meta['jointPositions'][side+'Foot'])
        toe_joint = np.asarray(meta['jointPositions'][side+'ToeBase'])
        point = positions[vertices]
        alpha = smooth(boundary[vertices]/.04)
        alpha[point[:, 1] <= ankle[1]-.03] = 1
        leg = smooth((point[:, 1]-(ankle[1]-.02))/.18)
        toe = smooth((point[:, 2]-(toe_joint[2]-.04))/.08)*(1-leg)*.7
        dense = np.zeros((len(vertices), len(meta['joints'])))
        for k in range(4):
            dense[np.arange(len(vertices)), ids[vertices, k]] += weights[vertices, k]*(1-alpha)
        dense[:, joint['Leg']] += alpha*leg
        dense[:, joint['ToeBase']] += alpha*toe
        dense[:, joint['Foot']] += alpha*(1-leg-toe)
        assert np.all(dense >= -1e-12)
        new_ids, new_weights, _ = sparsify_four_influences(dense)
        active = alpha > 1e-12
        result_ids[vertices[active]] = new_ids[active]
        result_weights[vertices[active]] = new_weights[active]
        mask[vertices[active]] = 1
        faces = np.flatnonzero(np.all(selected[triangles], axis=1))
        sides[side] = {
            'vertexIds': vertices.tolist(), 'sourceFaceIds': faces.tolist(),
            'soleVertexIds': vertices[point[:, 1] <= .003].tolist(),
            'vertices': len(vertices), 'faces': len(faces),
            'bounds': [point.min(0).tolist(), point.max(0).tolist()],
            'ankleBind': ankle.tolist(), 'toeBind': toe_joint.tolist(),
        }
    result_ids.astype('<u2').tofile(directory/'result-ids.bin')
    result_weights.astype('<f4').tofile(directory/'result-weights.bin')
    mask.tofile(directory/'patch-mask.bin')
    result = {
        'hero': meta['hero'], 'source': meta['source'], 'sourceSha256': meta['sourceSha256'],
        'parentRig': meta['input'], 'parentRigSha256': meta['inputSha256'],
        'method': 'Original surface-graph boot domains with source-color inspection. Leg/Foot/Toe fields follow calibrated ankle/toe landmarks; 40mm graph-boundary return to parent weights. Geometry and UV unchanged.',
        'visuallyVerified': False, 'accepted': False, 'changedVertices': int(mask.sum()),
        'supportTrial': {'boundaryBlendMetres': .04, 'ankleTransitionMetres': .18, 'accepted': False},
        'sides': sides,
        'files': {name: {'sha256': hashlib.sha256((directory/name).read_bytes()).hexdigest(), 'bytes': (directory/name).stat().st_size}
                  for name in ['result-ids.bin', 'result-weights.bin', 'patch-mask.bin']},
    }
    (directory/'selection.json').write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(json.dumps({'hero': meta['hero'], 'changedVertices': result['changedVertices'], 'accepted': False}))


if __name__ == '__main__':
    main()
