"""Offline, pose-specific source-surface strain correction; never runtime cloth.

ADMM projects original welded source-edge vectors onto length balls. The global
step minimizes squared displacement from exact four-weight LBS, with protected
hands and every vertex incident to a non-garment source face hard-pinned. This is
a geometric feasibility experiment, not a collision/drape or animation approval.
"""
import argparse
import hashlib
import json
import re
import time
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import cg


def project_edge_vectors(vectors, minimum, maximum, fallback):
    """Build-time cloth edges resist compression as well as excessive stretch."""
    assert 0 <= minimum <= maximum and np.isfinite(vectors).all()
    norm = np.linalg.norm(vectors, axis=1)
    projected = vectors*(np.clip(norm, minimum, maximum)/np.maximum(norm, 1e-30))[:, None]
    collapsed = norm < 1e-15
    if minimum and collapsed.any():
        direction = fallback[collapsed]
        length = np.linalg.norm(direction, axis=1)
        assert np.isfinite(direction).all() and (length > 1e-15).all()
        projected[collapsed] = direction/length[:, None]*minimum
    return projected


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--iterations', type=int, default=80)
    parser.add_argument('--ratio', type=float, default=1.49)
    parser.add_argument('--screen-metres', type=float, default=.05)
    parser.add_argument('--penalty', type=float, default=1)
    parser.add_argument('--minimum-ratio', type=float, default=0)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--warm-start', type=Path)
    parser.add_argument('--flexible-faces', type=Path)
    args = parser.parse_args()
    parameters = {key: str(value) if isinstance(value, Path) else value for key,value in vars(args).items()}
    json.dumps(parameters)
    assert re.fullmatch(r'\.local/rig-candidates/[a-z0-9-]+', str(args.output))
    assert args.base.resolve() != args.output.resolve()
    assert not (args.resume and args.warm_start)
    assert 1 < args.ratio < 2 and args.iterations > 0 and args.screen_metres > 0 and np.isfinite(args.penalty) and args.penalty > 0
    assert 0 <= args.minimum_ratio < args.ratio
    started = time.monotonic()
    args.output.mkdir(parents=True, exist_ok=True)
    receipt = json.loads((args.base/'receipt.json').read_text())
    pose = json.loads((args.base/'feasibility-input.json').read_text())
    assert receipt['sha256'] == pose['assetSha256'] == digest(args.base/'H01-C0-rigged.glb')
    assert digest(args.base/'feasibility-matrices.bin') == pose['matricesSha256']
    meta = json.loads((args.base/'input.json').read_text())
    assert digest(args.base/'protected.bin') == meta['protectedMask']['sha256']
    source = np.fromfile(args.base/'positions.bin', '<f4').reshape(-1, 3).astype(float)
    triangles = np.fromfile(args.base/'triangles.bin', '<u4').reshape(-1, 3)
    weld = np.fromfile(args.base/'source-welds.u32bin', '<u4')
    reps, inverse = np.unique(weld, return_inverse=True)
    p = source[reps]
    t = inverse[triangles]
    edges = np.unique(np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), axis=1), axis=0)
    lengths = np.linalg.norm(p[edges[:, 0]]-p[edges[:, 1]], axis=1)
    valid = lengths > 1e-12
    edges, lengths = edges[valid], lengths[valid]
    ids = np.fromfile(args.base/'result-ids.bin', '<u2').reshape(-1, 4)[reps]
    weights = np.fromfile(args.base/'result-weights.bin', '<f4').reshape(-1, 4)[reps]
    matrices = np.fromfile(args.base/'feasibility-matrices.bin', '<f8').reshape(-1, 4, 4).transpose(0, 2, 1)
    y = np.zeros_like(p)
    affine = np.zeros((len(p), 3, 3))
    for k in range(4):
        m = matrices[ids[:, k]]
        affine += m[:, :3, :3]*weights[:, k, None, None]
        y += (np.einsum('nij,nj->ni', m[:, :3, :3], p)+m[:, :3, 3])*weights[:, k, None]
    fixed = np.zeros(len(p), bool)
    np.logical_or.at(fixed, inverse, np.fromfile(args.base/'protected.bin', 'u1').astype(bool))
    labels = np.fromfile(args.base/'face-labels.bin', 'u1')
    cloth_faces = labels != 0
    additional_fabric = None
    if args.flexible_faces:
        selection = json.loads(args.flexible_faces.read_text())
        assert selection['kind'] == 'additional-flexible-source-fabric'
        assert selection['parentCandidateSha256'] == receipt['sha256']
        face_file = Path(selection['faceFile'])
        assert digest(face_file) == selection['faceSha256']
        inspection_file = Path(selection['inspectionFile'])
        assert digest(inspection_file) == selection['inspectionSha256']
        inspection = json.loads(inspection_file.read_text())
        assert inspection['parentCandidateSha256'] == receipt['sha256']
        assert inspection['largestSourceFaceListSha256'] == selection['faceSha256']
        for image in selection['images']:
            assert digest(Path(image['path'])) == image['sha256']
        extra = np.fromfile(face_file, '<u4')
        assert len(extra) == selection['faces'] and len(np.unique(extra)) == len(extra)
        assert extra.max() < len(triangles) and (labels[extra] == 0).all()
        band = float(selection['pinBandAboveMetres'])
        assert .9 <= band <= 1.03
        extra = extra[np.all(source[triangles[extra], 1] < band, axis=1)]
        cloth_faces[extra] = True
        additional_fabric = {'manifest': str(args.flexible_faces), 'manifestSha256': digest(args.flexible_faces),
                             'sourceFaceSha256': selection['faceSha256'], 'releasedFaces': len(extra),
                             'pinBandAboveMetres': band, 'scope': selection['approvalScope']}
    fixed[t[~cloth_faces].ravel()] = True
    free = ~fixed
    selected = free[edges].any(axis=1)
    e, length = edges[selected], lengths[selected]
    # Normalize each source edge by its own bind length; long/short source
    # triangles are measured under the same strain contract.
    value = 1/length
    row = np.repeat(np.arange(len(e)), 2)
    b = coo_matrix((np.column_stack([value, -value]).ravel(), (row, e.ravel())), shape=(len(e), len(p))).tocsr()
    bf, bx = b[:, free], b[:, fixed]
    boundary = bx@y[fixed]
    # ADMM penalty changes convergence, not the hard source-edge length bounds.
    screen = 1/(args.screen_metres**2*args.penalty)
    a = (bf.T@bf + diags(np.full(free.sum(), screen))).tocsr()
    print(json.dumps({'weldedVertices': len(p), 'freeVertices': int(free.sum()), 'fixedVertices': int(fixed.sum()), 'constrainedEdges': len(e), 'amg': 'building'}), flush=True)
    import pyamg
    hierarchy = pyamg.smoothed_aggregation_solver(a, max_coarse=1000, symmetry='symmetric')
    precondition = hierarchy.aspreconditioner(cycle='V')
    x = y.copy()
    z = b@x
    u = np.zeros_like(z)
    resumed_solve_sha256 = None
    warm_start_solve_sha256 = None
    if args.resume:
        resumed_solve_sha256 = digest(args.output/'solve.json')
        old = json.loads((args.output/'solve.json').read_text())
        assert old['inputHashes'] == {name: digest(args.base/name) for name in old['inputHashes']}
        assert old['parameters']['ratio'] == args.ratio and old['parameters']['screen_metres'] == args.screen_metres
        assert old['parameters'].get('minimum_ratio',0) == args.minimum_ratio
        assert old.get('additionalFlexibleFabric') == additional_fabric
        x = np.load(args.output/'state-x.npy')
        z = np.load(args.output/'state-z.npy')
        u = np.load(args.output/'state-u.npy')
        u *= old['parameters'].get('penalty', 1)/args.penalty
        assert x.shape == y.shape and z.shape == u.shape == (len(e), 3)
    elif args.warm_start:
        assert re.fullmatch(r'\.local/rig-candidates/[a-z0-9-]+', str(args.warm_start))
        old = json.loads((args.warm_start/'solve.json').read_text())
        assert old['inputHashes'] == {name: digest(args.base/name) for name in old['inputHashes']}
        warm_start_solve_sha256 = digest(args.warm_start/'solve.json')
        x = np.load(args.warm_start/'state-x.npy')
        assert x.shape == y.shape and np.array_equal(x[fixed], y[fixed])
        # A changed optimization target starts fresh dual variables. It is not
        # a continuation certificate for the previous constraint system.
        z = b@x
    history = []

    def measure(points):
        ratio = np.linalg.norm(points[edges[:, 0]]-points[edges[:, 1]], axis=1)/lengths
        worst = np.argsort(ratio)[-10:][::-1]
        return {'p999': float(np.quantile(ratio, .999, method='lower')), 'maximum': float(ratio.max()), 'minimum': float(ratio.min()),
                'edgesAbove1_5': int((ratio > 1.5).sum()), 'edgesAbove2': int((ratio > 2).sum()),
                'worst': [{'sourceVertices': reps[edges[i]].tolist(), 'ratio': float(ratio[i]), 'fixedEndpoints': fixed[edges[i]].tolist()} for i in worst]}

    before = measure(y)
    for iteration in range(args.iterations):
        # Upper-only balls are convex; adding a lower edge bound is explicitly a
        # nonconvex cloth-shape experiment and still requires independent checks.
        target = b@x + u
        old_z = z
        z = project_edge_vectors(target,args.minimum_ratio,args.ratio,p[e[:,0]]-p[e[:,1]])
        rhs = bf.T@(z-u-boundary) + screen*y[free]
        solve_info = []
        for axis in range(3):
            solution, info = cg(a, rhs[:, axis], x0=x[free, axis], M=precondition, rtol=2e-7, atol=1e-9, maxiter=100)
            assert info == 0, f'Global source-surface solve did not converge: {info}'
            x[free, axis] = solution
            solve_info.append(info)
        residual = b@x-z
        u += residual
        assert np.isfinite(x).all() and np.array_equal(x[fixed], y[fixed])
        if iteration % 5 == 0 or iteration == args.iterations-1:
            state = {'iteration': iteration+1, 'seconds': time.monotonic()-started, 'primalMax': float(np.linalg.norm(residual, axis=1).max()),
                     'dualMax': float(np.linalg.norm(z-old_z, axis=1).max()), **measure(x)}
            history.append(state)
            print(json.dumps(state), flush=True)
        if np.linalg.norm(residual, axis=1).max() < 1e-5:
            break
    # Convert posed correction into a conventional pre-skin POSITION morph.
    # A singular blended transform cannot be exported and is a hard failure.
    singular = np.linalg.svd(affine, compute_uv=False)[:, -1]
    assert singular.min() > 1e-4, 'Singular four-weight skin transform; no stable inverse morph'
    delta = np.linalg.solve(affine, (x-y)[..., None])[..., 0]
    delta[fixed] = 0
    delta = delta[inverse].astype('<f4')
    delta.tofile(args.output/'morph-position.f32bin')
    reconstructed = y + np.einsum('nij,nj->ni', affine, delta[reps].astype(float))
    movement = np.linalg.norm(x-y, axis=1)
    def triangle_measure(points):
        cross = np.cross(points[t[:, 1]]-points[t[:, 0]], points[t[:, 2]]-points[t[:, 0]])
        area = np.linalg.norm(cross, axis=1)
        bind_area = np.linalg.norm(np.cross(p[t[:, 1]]-p[t[:, 0]], p[t[:, 2]]-p[t[:, 0]]), axis=1)
        valid = bind_area > 1e-24
        ratio = area[valid]/bind_area[valid]
        return {'minimumAreaRatio': float(ratio.min()), 'newlyCollapsedTriangles': int((ratio <= 1e-12).sum()), 'nonfiniteTriangles': int((~np.isfinite(area)).sum())}
    after = measure(reconstructed)
    result = {'method': 'Offline source-edge ADMM, bounded edge vectors and closest pose surface with hard non-garment/hand pins; pre-skin morph by exact blended affine inverse',
              'projectionConvex':args.minimum_ratio==0,
              'additionalFlexibleFabric':additional_fabric,
              'scope': 'One exact held pose. No runtime simulation. Bind weight is zero. Collision, cross-section, semantic cut approval, animation interpolation and phone performance remain unverified.',
              **pose, 'base': str(args.base), 'parameters': parameters,
              'resumedSolveSha256': resumed_solve_sha256, 'warmStartSolveSha256': warm_start_solve_sha256,
              'warmStart': str(args.warm_start) if args.warm_start else None,
              'inputHashes': {name: digest(args.base/name) for name in ['positions.bin', 'triangles.bin', 'source-welds.u32bin', 'protected.bin', 'face-labels.bin', 'result-ids.bin', 'result-weights.bin', 'feasibility-matrices.bin']},
              'sourceTriangles': len(t), 'sourceVertices': len(source), 'weldedVertices': len(p), 'fixedVertices': int(fixed.sum()), 'freeVertices': int(free.sum()),
              'before': before, 'after': after, 'triangles': triangle_measure(reconstructed),
              'protectedMovementMetres': float(movement[fixed].max()),
              'correctionMetres': {'maximum': float(movement.max()), 'p99': float(np.percentile(movement, 99)), 'rms': float(np.sqrt(np.mean(movement**2)))},
              'minimumSkinSingularValue': float(singular.min()), 'morphSha256': digest(args.output/'morph-position.f32bin'), 'history': history,
              'seconds': time.monotonic()-started, 'accepted': False,
              'edgeThresholdsPassed': after['p999'] <= 1.5 and after['maximum'] <= 2,
              'fullAcceptance': 'fail-closed: single-pose prototype lacks collision/cross-section/full-animation/visual evidence'}
    (args.output/'solve.json').write_text(json.dumps(result, indent=2)+'\n')
    for name, array in [('x', x), ('z', z), ('u', u)]:
        np.save(args.output/f'state-{name}.npy', array)
    print(json.dumps({k: result[k] for k in ['before', 'after', 'triangles', 'correctionMetres', 'seconds', 'edgeThresholdsPassed']}), flush=True)


if __name__ == '__main__':
    main()
