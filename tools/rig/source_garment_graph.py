"""H01 source-edge garment segmentation and anatomical Dirichlet supports.

Only source attributes/weights are read or written. No model geometry is created.
UV-chart continuity is recovered from unique opposite source boundary halfedges;
neither garment labels nor weights use a spatial nearest-neighbor graph.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.sparse.linalg import cg, LinearOperator


SEMANTIC_NAMES = ['H01_Remaining_Source', 'H01_Robe_Left', 'H01_Robe_Right',
                  'H01_Robe_Torso', 'H01_Sleeve_Left', 'H01_Sleeve_Right']


def read_source_face_patches(path, source_sha, triangles, inverse):
    """Read exact source faces; reject stale, conflicting or malformed evidence."""
    fixed_faces = np.zeros(len(triangles), dtype=np.uint8)
    fixed_groups = np.zeros(int(inverse.max())+1, dtype=np.uint8)
    evidence = []
    if path is None:
        return fixed_faces, fixed_groups, evidence
    manifest = json.loads(path.read_text())
    if manifest['sourceSha256'] != source_sha:
        raise ValueError('Source-face patch manifest SHA differs from source')
    for patch in manifest['patches']:
        if patch['sourceSha256'] != source_sha:
            raise ValueError('Source-face patch SHA differs from source')
        label = SEMANTIC_NAMES.index(patch['semanticRegion'])
        if not label:
            raise ValueError('Garment source-face patches must name a garment region')
        info = patch['sourceFaceMap']
        binary = path.parent / info['file']
        raw = binary.read_bytes()
        if hashlib.sha256(raw).hexdigest() != info['sha256'] or len(raw) != 4*info['count']:
            raise ValueError('Source-face patch binary SHA/count mismatch')
        faces = np.frombuffer(raw, dtype='<u4')
        if not len(faces) or len(np.unique(faces)) != len(faces) or np.any(faces >= len(triangles)):
            raise ValueError('Source-face patch contains empty, repeated or invalid face IDs')
        groups = np.unique(inverse[triangles[faces]])
        if np.any((fixed_faces[faces] != 0) & (fixed_faces[faces] != label)) or np.any((fixed_groups[groups] != 0) & (fixed_groups[groups] != label)):
            raise ValueError('Source-face patches have conflicting semantic ownership')
        fixed_faces[faces], fixed_groups[groups] = label, label
        evidence.append({**patch, 'manifestFile': str(path),
                         'manifestSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                         'hardSourceGroups': len(groups),
                         'role': 'Hard source-face ownership and source-edge semantic seeds; no weight constraint'})
    return fixed_faces, fixed_groups, evidence


def lock_semantic_seeds(outer, seed_regions, fixed_groups):
    """An explicit source patch removes competing automatic anatomical seeds."""
    outer = outer | (fixed_groups != 0)
    seeds = [((seed & (fixed_groups == 0)) | (fixed_groups == label))
             for label, seed in enumerate(seed_regions, 1)]
    return outer, seeds


def nonnegative_fem_field(matrix, rhs, initial, preconditioner=None):
    """Bounded convex FEM energy solve, with explicit primal/dual KKT checks."""
    active = initial < 0
    solution = initial.copy()
    rhs_scale = max(1e-12, float(np.max(np.abs(rhs))))
    dual_tolerance = 2e-6*rhs_scale
    for iteration in range(32):
        free = ~active
        reduced = matrix[free][:, free].tocsr()
        reduced_preconditioner = None
        if preconditioner is not None:
            def apply(value):
                full = np.zeros(len(rhs))
                full[free] = value
                return (preconditioner@full)[free]
            reduced_preconditioner = LinearOperator(reduced.shape, matvec=apply, dtype=float)
        value, info = cg(reduced, rhs[free], x0=np.maximum(solution[free], 0), M=reduced_preconditioner,
                         rtol=1e-6, atol=1e-9, maxiter=1200)
        residual = np.linalg.norm(reduced@value-rhs[free])/max(1e-12, np.linalg.norm(rhs[free]))
        if info or residual > 2e-6:
            raise RuntimeError(f'Bounded FEM reduced solve rejected: info={info} residual={residual}')
        solution[:] = 0
        solution[free] = value
        gradient = matrix@solution-rhs
        primal_bad = solution < -1e-6
        dual_bad = active & (gradient < -dual_tolerance)
        if not primal_bad.any() and not dual_bad.any():
            return solution, {'method': 'Nonnegative convex FEM energy active set; primal and dual KKT checked',
                              'activeSetSolves': iteration+1, 'zeroBoundSourceGroups': int(active.sum()),
                              'freeResidual': float(residual), 'minimumWeight': float(solution.min()),
                              'minimumActiveGradient': float(gradient[active].min()) if active.any() else 0,
                              'dualTolerance': dual_tolerance}
        next_active = (active | primal_bad) & ~dual_bad
        if np.array_equal(next_active, active):
            raise RuntimeError('Bounded FEM active set stalled before KKT acceptance')
        active = next_active
    raise RuntimeError('Bounded FEM did not satisfy nonnegative KKT conditions within32 active-set solves')


def solve_support_fields(matrix, rhs, initial, joint_names, preconditioner=None, nonnegative=False):
    """Zero-RHS joints solve to zero; an initial guess is never a constraint."""
    solved = np.zeros_like(initial)
    solves = []
    for joint in np.flatnonzero(np.abs(rhs).max(axis=0) > 0):
        solution, info = cg(matrix, rhs[:, joint], x0=initial[:, joint], M=preconditioner,
                            rtol=1e-6, atol=1e-9, maxiter=1200)
        residual = np.linalg.norm(matrix@solution-rhs[:, joint])/max(1e-12, np.linalg.norm(rhs[:, joint]))
        if info or residual > 2e-6:
            raise RuntimeError(f'Dirichlet solve rejected: {joint_names[joint]} info={info} residual={residual}')
        bounded = None
        unconstrained_minimum = float(solution.min())
        if nonnegative and solution.min() < -1e-6:
            solution, bounded = nonnegative_fem_field(matrix, rhs[:, joint], solution, preconditioner)
        solved[:, joint] = solution
        solves.append({'joint': joint_names[joint], 'residual': float(residual)})
        if bounded is not None:
            solves[-1]['nonnegativeFEM'] = bounded
            solves[-1]['unconstrainedMinimumWeight'] = unconstrained_minimum
            solves[-1]['residualScope'] = 'Initial unconstrained field; bounded field free residual and active KKT are reported separately'
        print(solves[-1], flush=True)
    return solved, solves


def source_fem_laplacian(points, triangles):
    """Linear triangular surface FEM stiffness and lumped original-area mass."""
    a, b, c = [points[triangles[:, k]] for k in range(3)]
    twice_area = np.linalg.norm(np.cross(b-a, c-a), axis=1)
    good = twice_area > 0
    if not np.isfinite(twice_area).all():
        raise ValueError('Nonfinite original triangle area')
    tr = triangles[good]
    a, b, c, twice = a[good], b[good], c[good], twice_area[good]
    opposite = np.stack((np.einsum('ij,ij->i', b-a, c-a),
                         np.einsum('ij,ij->i', a-b, c-b),
                         np.einsum('ij,ij->i', a-c, b-c)), axis=1)/(2*twice[:, None])
    # Each cot(angle)/2 contributes to the opposite original source edge.
    edges = np.concatenate((tr[:, [1, 2]], tr[:, [2, 0]], tr[:, [0, 1]]))
    conductance = opposite.T.ravel()
    off = coo_matrix((np.r_[conductance, conductance],
                     (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])),
                    shape=(len(points), len(points))).tocsr()
    stiffness = (diags(np.asarray(off.sum(axis=1)).ravel())-off).tocsr()
    mass = np.bincount(tr.ravel(), weights=np.repeat(twice/6, 3), minlength=len(points))
    return stiffness, mass, {'method': 'Original triangle cotangent FEM stiffness with lumped source-area mass',
                             'stiffnessUnits': 'dimensionless', 'massUnits': 'square metres',
                             'zeroAreaSourceTrianglesExcludedFromOperator': int((~good).sum()),
                             'sourceTrianglesPreservedInExport': True,
                             'negativeTriangleCotangents': int((conductance < 0).sum()),
                             'sourceAreaSquareMeters': float(mass.sum()),
                             'minimumGroupMassSquareMeters': float(mass.min())}


def sparsify_four_influences(dense):
    """Continuous four-support reduction at fourth/fifth-rank crossings."""
    if dense.ndim != 2 or dense.shape[1] < 5 or not np.isfinite(dense).all() or np.any(dense < 0):
        raise ValueError('Expected finite nonnegative full-joint influence rows')
    top_five = np.argsort(-dense, axis=1, kind='stable')[:, :5]
    top = top_five[:, :4]
    ranked = np.take_along_axis(dense, top_five, axis=1)
    discarded = 1-ranked[:, :4].sum(axis=1)
    top_weights = np.maximum(ranked[:, :4]-ranked[:, 4:5], 0)
    total = top_weights.sum(axis=1, keepdims=True)
    if np.any(total < 1e-12):
        raise RuntimeError('Four-influence sparsification singular at source groups: '+str(np.flatnonzero(total[:, 0]<1e-12)[:20]))
    return top, top_weights/total, discarded


def scatter_group_supports(ids, weights, inverse, group_ids, group_weights, requested, protected):
    """A protected source copy freezes its entire mechanically proven UV group."""
    locked = np.zeros(len(group_ids), dtype=bool)
    np.logical_or.at(locked, inverse, protected)
    changed = requested[inverse] & ~locked[inverse]
    result_ids, result_weights = ids.copy(), weights.copy()
    result_ids[changed] = group_ids[inverse[changed]]
    result_weights[changed] = group_weights[inverse[changed]]
    return result_ids, result_weights, changed


def source_welds(points, triangles):
    """Return original vertex representative IDs and an auditable seam proof."""
    directed = np.concatenate((triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]))
    raw, first, incidence = np.unique(np.sort(directed, axis=1), axis=0, return_index=True, return_counts=True)
    if np.any(incidence > 2):
        raise ValueError('Nonmanifold original edge: cannot infer unambiguous chart seams')
    boundary = directed[first[incidence == 1]]
    _, position_id = np.unique(points, axis=0, return_inverse=True)
    geometric = position_id[boundary]
    pairs, group = np.unique(np.sort(geometric, axis=1), axis=0, return_inverse=True)
    counts = np.bincount(group)
    if np.any(counts != 2):
        raise ValueError('Unpaired or ambiguous original chart edge')
    order = np.argsort(group, kind='stable').reshape(-1, 2)
    first_edge, second_edge = boundary[order[:, 0]], boundary[order[:, 1]]
    if not np.array_equal(position_id[first_edge], position_id[second_edge[:, ::-1]]):
        raise ValueError('Chart edge orientation disagrees; cannot infer a sewn source seam')
    parent = np.arange(len(points), dtype=np.uint32)

    def find(vertex):
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return int(vertex)

    for a, b in zip(first_edge.ravel(), second_edge[:, ::-1].ravel()):
        a, b = find(a), find(b)
        parent[max(a, b)] = min(a, b)
    for i in range(len(parent)):
        parent[i] = find(i)
    assert np.array_equal(points[parent], points)
    return parent, {'method': 'paired-opposite-source-boundary-halfedges',
                    'rawNonmanifoldEdges': int(np.count_nonzero(incidence > 2)),
                    'boundaryHalfedges': len(boundary), 'uniqueOppositePairs': len(pairs),
                    'ambiguousPairs': 0, 'orientationDisagreements': 0,
                    'coordinateMismatch': 0, 'sourceVertices': len(points),
                    'sewnCopies': int(np.count_nonzero(parent != np.arange(len(parent)))),
                    'scope': 'Original UV chart continuity only; no inferred free garment cuts or near-surface stitching'}


def run(base, seed_patches=None, reuse_supports=None, support_operator='edge-metric',regularization_radius=.08):
    if not np.isfinite(regularization_radius) or not 0<regularization_radius<=2:
        raise ValueError('Source support radius must be finite, positive and <=2 metres')
    meta = json.loads((base / 'input.json').read_text())
    points = np.fromfile(base / 'positions.bin', dtype='<f4').reshape(-1, 3).astype(np.float64)
    triangles = np.fromfile(base / 'triangles.bin', dtype='<u4').reshape(-1, 3)
    rgb = np.fromfile(base / 'rgb.bin', dtype='u1').reshape(-1, 3).astype(float)
    ids = np.fromfile(base / 'ids.bin', dtype='<u2').reshape(-1, 4)
    weights = np.fromfile(base / 'weights.bin', dtype='<f4').reshape(-1, 4)
    protected = np.fromfile(base / 'protected.bin', dtype='u1').astype(bool)
    weld, proof = source_welds(points, triangles)
    weld.astype('<u4').tofile(base / 'source-welds.u32bin')
    reps, inverse = np.unique(weld, return_inverse=True)
    p = points[reps]
    # Aggregate UV samples only across mechanically proven chart copies.
    rgb_welded = np.stack([np.bincount(inverse, weights=rgb[:, k]) / np.bincount(inverse) for k in range(3)], axis=1)
    edge = np.unique(np.sort(inverse[np.concatenate((triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]))], axis=1), axis=0)
    edge = edge[edge[:, 0] != edge[:, 1]]
    lengths = np.linalg.norm(p[edge[:, 0]] - p[edge[:, 1]], axis=1)
    r, g, b = rgb_welded.T
    x, y = np.abs(p[:, 0]), p[:, 1]
    bounds = (y > .19) & (y < 1.55) & (x < .55)
    green = (g > 1.12*r) & (g > .98*b) & (g > 22) & bounds
    gold = (r > 1.08*g) & (g > 1.7*b) & (g > 45) & bounds & (x < .50)
    white = (rgb_welded.min(axis=1) > .77*rgb_welded.max(axis=1)) & (rgb_welded.max(axis=1) > 45)
    rest = white | ~bounds
    # Source-edge color discontinuity discourages crossing layers/material borders.
    chroma = np.linalg.norm(rgb_welded[edge[:, 0]] - rgb_welded[edge[:, 1]], axis=1)
    travel = np.maximum(lengths, 1e-8) * (1 + chroma/18)
    graph = coo_matrix((np.r_[travel, travel], (np.r_[edge[:, 0], edge[:, 1]], np.r_[edge[:, 1], edge[:, 0]])), shape=(len(p), len(p))).tocsr()
    outer_distance = dijkstra(graph, directed=False, indices=np.flatnonzero(green | gold), min_only=True)
    other_distance = dijkstra(graph, directed=False, indices=np.flatnonzero(rest), min_only=True)
    outer = (outer_distance < other_distance) & bounds
    # Semantic seeds are anatomical regions ON source cloth, not nearest 3D samples.
    seed_regions = [
        outer & (p[:, 0] > .05) & (y < .69),
        outer & (p[:, 0] < -.05) & (y < .69),
        outer & (x < .14) & (y > 1.05),
        outer & (p[:, 0] > .33) & (y > .78),
        outer & (p[:, 0] < -.33) & (y > .78),
    ]
    fixed_faces, fixed_groups, patch_evidence = read_source_face_patches(seed_patches, meta['sourceSha256'], triangles, inverse)
    outer, seed_regions = lock_semantic_seeds(outer, seed_regions, fixed_groups)
    # Paths stay in the classified outer source surface. Triangles touching other
    # materials remain exact; no projection or fabricated anatomy is introduced.
    outer_edges = edge[outer[edge[:, 0]] & outer[edge[:, 1]]]
    outer_lengths = np.linalg.norm(p[outer_edges[:, 0]]-p[outer_edges[:, 1]], axis=1)
    garment_graph = coo_matrix((np.r_[outer_lengths, outer_lengths], (np.r_[outer_edges[:, 0], outer_edges[:, 1]], np.r_[outer_edges[:, 1], outer_edges[:, 0]])), shape=(len(p), len(p))).tocsr()
    distances = np.stack([dijkstra(garment_graph, directed=False, indices=np.flatnonzero(seed), min_only=True) for seed in seed_regions])
    labels = distances.argmin(axis=0).astype(np.uint8) + 1
    labels[~outer | ~np.isfinite(distances.min(axis=0))] = 0
    labels[fixed_groups != 0] = fixed_groups[fixed_groups != 0]
    source_labels = labels[inverse]
    corner_labels = source_labels[triangles]
    face_labels = np.zeros(len(triangles), dtype=np.uint8)
    # A common label at >=2 corners preserves every oriented source triangle once.
    for label in range(1, 6):
        face_labels[(corner_labels == label).sum(axis=1) >= 2] = label
    face_labels[fixed_faces != 0] = fixed_faces[fixed_faces != 0]
    face_labels.tofile(base / 'face-labels.bin')
    source_labels.tofile(base / 'vertex-labels.bin')

    if reuse_supports is not None:
        prior = json.loads((reuse_supports/'input.json').read_text())
        for key in ['sourceSha256', 'parentRigSha256', 'jointNames', 'protectedMask']:
            if prior[key] != meta[key]:
                raise ValueError('Reused support input differs: '+key)
        for name in ['positions.bin', 'triangles.bin', 'protected.bin', 'source-welds.u32bin', 'ids.bin', 'weights.bin']:
            if (base/name).read_bytes() != (reuse_supports/name).read_bytes():
                raise ValueError('Reused support source arrays differ: '+name)
        hashes = {}
        for name in ['result-ids.bin', 'result-weights.bin']:
            raw = (reuse_supports/name).read_bytes()
            expected = (ids.nbytes if name == 'result-ids.bin' else weights.nbytes)
            if len(raw) != expected:
                raise ValueError('Reused support result length differs: '+name)
            (base/name).write_bytes(raw)
            hashes[name] = hashlib.sha256(raw).hexdigest()
        prior_report = json.loads((reuse_supports/'graph-report.json').read_text())
        report = {**prior_report, 'sourceContinuity': proof,
                  'parts': [{'id': i, 'triangles': int((face_labels==i).sum())} for i in range(6)],
                  'semanticSourceFacePatches': patch_evidence,
                  'supportsReused': {'directory': str(reuse_supports), 'resultHashes': hashes,
                                     'sourceReceiptSha256': hashlib.sha256((reuse_supports/'receipt.json').read_bytes()).hexdigest(),
                                     'weightsChanged': False},
                  'status': 'Semantic-only staging revision; prior support solve and deformation failures unchanged'}
        (base/'graph-report.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps({'supportsReused': report['supportsReused'], 'parts': report['parts']}, indent=2), flush=True)
        return

    try:
        import pyamg
    except ImportError as error:
        raise RuntimeError('The screened garment solver requires pyamg==5.3.0; install tools/rig/requirements-surface.txt in the selected Python environment') from error

    # Full joint-valued Dirichlet interpolation. Lower hanging material is attached
    # to pelvis/spine, sleeves to arm chains, and hand/cuff boundaries retain input.
    locked = np.zeros(len(p), dtype=bool)
    np.logical_or.at(locked, inverse, protected)
    # Albedo controls segmentation seeds, never the support-solve boundary.
    # Dark folds and embroidered transitions belong to the same source surface.
    garment = bounds.copy()
    free = garment & ~locked
    dense = np.zeros((len(p), len(meta['jointNames'])), dtype=np.float64)
    for k in range(4):
        np.add.at(dense, (inverse, ids[:, k]), weights[:, k])
    dense /= np.bincount(inverse)[:, None]
    names = {n: i for i, n in enumerate(meta['jointNames'])}
    anchor = np.zeros(len(p), dtype=bool)
    cuff = garment & (x > .46) & (y > .94)
    lower = garment & (x < .22) & (y < .79)
    waist = garment & (x < .18) & (y > .84) & (y < .95)
    torso = garment & (x < .13) & (y > 1.12)
    for mask, bone in [(lower, 'Hips'), (waist, 'Spine'), (torso, 'Spine2')]:
        mask &= ~locked
        dense[mask] = 0
        dense[mask, names[bone]] = 1
        anchor |= mask
    arm_anchors = []
    for side in ['Left', 'Right']:
        for start, end in [('Arm', 'ForeArm'), ('ForeArm', 'Hand')]:
            a = np.asarray(meta['jointPositions'][side+start])
            b = np.asarray(meta['jointPositions'][side+end])
            axis = b-a
            t = np.clip((p-a)@axis/np.dot(axis,axis),0,1)
            distance = np.linalg.norm(p-(a+t[:,None]*axis),axis=1)
            # The measured original cuff is a fixed boundary, never an arm
            # target. Overriding it produced the observed 31.6x source edge.
            mask = garment & ~locked & ~cuff & (distance < .065) & (x > .19)
            amount = np.clip((t-.6)/.4,0,1)
            amount = amount*amount*(3-2*amount)
            dense[mask] = 0
            dense[mask,names[side+start]] = 1-amount[mask]
            dense[mask,names[side+end]] = amount[mask]
            anchor |= mask
            arm_anchors.append({'segment':side+start,'groups':int(mask.sum())})
    # Retain actual cuff/hand support; anchoring the hanging sleeve to the wrist
    # everywhere would turn it into a rigid panel and is intentionally avoided.
    free &= ~cuff
    conductance = 1/np.maximum(lengths, 1e-6)
    adjacency = coo_matrix((np.r_[conductance, conductance], (np.r_[edge[:, 0], edge[:, 1]], np.r_[edge[:, 1], edge[:, 0]])), shape=(len(p), len(p))).tocsr()
    components, cc = connected_components(adjacency[free][:, free], directed=False)
    touches = np.asarray(adjacency[free][:, ~free].sum(axis=1)).ravel() > 0
    anchored_cc = np.zeros(components, dtype=bool)
    np.logical_or.at(anchored_cc, cc, touches)
    np.logical_or.at(anchored_cc, cc, anchor[free])
    free_ids = np.flatnonzero(free)
    free[free_ids[~anchored_cc[cc]]] = False
    boundary = ~free
    # Anatomical source patches express a preference, not an infinitely rigid
    # per-vertex boundary. A screened source Laplacian spreads the observed hip
    # and arm-target transitions over a spatial regularization scale.
    if support_operator == 'cotangent-fem':
        stiffness, mass, operator_report = source_fem_laplacian(p, inverse[triangles])
        target_strength = 1/regularization_radius**2
        screen = mass[free]*anchor[free]*target_strength
    else:
        stiffness = diags(np.asarray(adjacency.sum(axis=1)).ravel())-adjacency
        target_strength = float(np.median(lengths)/regularization_radius**2)
        screen = anchor[free].astype(float)*target_strength
        operator_report = {'method': 'Inverse original-edge-length graph with global-median edge screening',
                           'screenScaling': 'median(edgeLength)/radiusSquared; approximates uniform-resolution metric only'}
    matrix = stiffness[free][:, free].tocsr()+diags(screen)
    rhs = -stiffness[free][:, boundary] @ dense[boundary]+screen[:, None]*dense[free]
    # The screened targets introduce long low-frequency surface modes. The
    # former diagonal-only preconditioner hit1200 iterations at residual2e-5;
    # an algebraic multigrid cycle resolves those modes without relaxing the
    # residual gate or increasing the iteration budget.
    multigrid = pyamg.smoothed_aggregation_solver(matrix, symmetry='symmetric', max_levels=12, max_coarse=500, coarse_solver='splu')
    preconditioner = multigrid.aspreconditioner(cycle='V')
    solved, solves = solve_support_fields(matrix, rhs, dense[free], meta['jointNames'], preconditioner,
                                         nonnegative=support_operator == 'cotangent-fem')
    projection_report = {'minimumBeforeNonnegativeProjection': float(solved.min()),
                         'negativeEntriesBelowMinus1e_6': int((solved < -1e-6).sum()),
                         'maximumPartitionOfUnityErrorBeforeNormalization': float(np.max(np.abs(solved.sum(axis=1)-1))),
                         'scope': 'Fieldwise FEM KKT precedes numerical nonnegative cleanup, partition normalization and four-influence reduction; independent bone solves are not a coupled simplex optimum'}
    if solved.min() < -1e-4:
        raise RuntimeError('Support FEM violates nonnegative-weight contract before projection: '+json.dumps(projection_report))
    solved = np.maximum(solved, 0)
    solved /= solved.sum(axis=1, keepdims=True)
    dense[free] = solved
    # A straight top-four truncation jumps when the fourth/fifth ranks swap at
    # nonzero weight. Subtract the fifth weight so a departing support reaches
    # zero continuously; reject the equal-rank singular case rather than export.
    top, top_weights, discarded = sparsify_four_influences(dense)
    np.save(base/'dense-supports.npy', dense.astype('<f4'))
    out_ids, out_weights, changed = scatter_group_supports(ids, weights, inverse, top, top_weights, garment | anchor, protected)
    assert np.array_equal(out_ids[protected], ids[protected])
    assert np.array_equal(out_weights[protected], weights[protected])
    assert np.isfinite(out_weights).all() and (out_weights >= 0).all()
    assert np.max(np.abs(out_weights.sum(axis=1)-1)) < 1e-5
    out_ids.astype('<u2').tofile(base / 'result-ids.bin')
    out_weights.astype('<f4').tofile(base / 'result-weights.bin')
    report = {'sourceContinuity': proof, 'algorithm': 'Source-edge albedo seeds + surface geodesic semantic regions; full-joint screened source-Laplacian supports with anatomical pelvis/spine targets and protected hands',
              'semanticSourceFacePatches': patch_evidence,
              'spatialNearestNeighborUsed': False, 'sourceWeldGroups': len(p),
              'parts': [{'id': i, 'triangles': int((face_labels==i).sum())} for i in range(6)],
              'supportFreeGroups': int(free.sum()), 'lowerPelvisAnchors': int(lower.sum()),
              'waistSpineAnchors': int(waist.sum()), 'torsoSpineAnchors': int(torso.sum()),
              'armAnchors': arm_anchors,
              'changedSourceVertices': int(changed.sum()), 'protectedSourceVertices': int(protected.sum()),
              'maximumDiscardedInfluenceBeforeFourWeightNormalization': float(discarded.max()),
              'fourInfluenceReduction': 'Continuous subtract-fifth sparsification; equal-top-five singularities rejected',
              'anatomicalTargetMode': 'Soft screened source-Laplacian targets; measured original cuff/hand and domain boundary remain fixed',
              'targetRegularizationRadiusMeters': regularization_radius,
              'targetStrength': target_strength,
              'supportOperator': operator_report,
              'nonnegativeProjection': projection_report,
              'homogeneousJointFields': 'Zero RHS fields are solved as zero; original weights are initial guesses only',
              'fixedCuffGroups': int(cuff.sum()),
              'linearPreconditioner': {'method': 'Smoothed-aggregation algebraic multigrid V-cycle', 'pyamgVersion': pyamg.__version__, 'levels': len(multigrid.levels), 'operatorComplexity': float(multigrid.operator_complexity())},
              'solves': solves, 'status': 'Candidate; independent multi-pose/contact/volume and visual checks required'}
    (base/'graph-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='solves'},indent=2),flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('base', type=Path)
    parser.add_argument('--seed-patches', type=Path)
    parser.add_argument('--reuse-supports-from', type=Path)
    parser.add_argument('--support-operator', choices=['edge-metric', 'cotangent-fem'], default='edge-metric')
    parser.add_argument('--support-radius',type=float,default=.08)
    args = parser.parse_args()
    run(args.base, args.seed_patches, args.reuse_supports_from, args.support_operator,args.support_radius)
