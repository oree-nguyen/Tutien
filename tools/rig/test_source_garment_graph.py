import unittest
import hashlib
import json
import os
import tempfile
from pathlib import Path
import numpy as np
from scipy.sparse import csr_matrix, coo_matrix, diags
from scipy.sparse.linalg import spsolve
from source_garment_graph import sparsify_four_influences, source_welds, scatter_group_supports, read_source_face_patches, lock_semantic_seeds, solve_support_fields, source_fem_laplacian, nonnegative_fem_field


class FourInfluenceReductionTests(unittest.TestCase):
    def test_crossing_fourth_and_fifth_ranks_does_not_jump(self):
        dense = np.array([[.4, .25, .15, .10001, .09999], [.4, .25, .15, .09999, .10001]])
        ids, weights, _ = sparsify_four_influences(dense)
        scattered = np.zeros_like(dense)
        np.put_along_axis(scattered, ids, weights, axis=1)
        self.assertLess(np.abs(scattered[0]-scattered[1]).sum(), .0001)
        # A 1m difference between the exchanged joints must not create the
        # ~0.1m edge jump seen with direct top-four normalization.
        self.assertLess(abs(scattered[0, 3]-scattered[1, 3]), .00005)

    def test_four_existing_influences_are_unchanged_by_joint_identity(self):
        dense = np.array([[.1, 0, .4, .2, .3, 0]])
        ids, weights, discarded = sparsify_four_influences(dense)
        scattered = np.zeros_like(dense)
        np.put_along_axis(scattered, ids, weights, axis=1)
        np.testing.assert_allclose(scattered, dense, atol=1e-15)
        self.assertAlmostEqual(float(discarded[0]), 0)

    def test_equal_top_five_fails_closed(self):
        with self.assertRaisesRegex(RuntimeError, 'singular'):
            sparsify_four_influences(np.full((1, 5), .2))

    def test_nonfinite_or_negative_input_rejected(self):
        for value in [np.nan, -.1]:
            with self.assertRaises(ValueError):
                sparsify_four_influences(np.array([[.4, .3, .2, .1, value]]))


class SourceIdentityTests(unittest.TestCase):
    def test_opposite_original_chart_boundaries_reconstruct_four_source_groups(self):
        vertices = np.array([[0., 0, 0], [1., 0, 0], [0., 1, 0], [0., 0, 1]])
        faces = np.array([[0, 2, 1], [0, 1, 3], [1, 2, 3], [2, 0, 3]])
        points = vertices[faces].reshape(-1, 3)
        triangles = np.arange(12, dtype=np.uint32).reshape(-1, 3)
        weld, proof = source_welds(points, triangles)
        self.assertEqual(len(np.unique(weld)), 4)
        self.assertEqual(proof['uniqueOppositePairs'], 6)
        self.assertEqual(proof['sewnCopies'], 8)
        np.testing.assert_array_equal(points[weld], points)

    def test_coincident_unrelated_closed_surfaces_are_not_bridged(self):
        vertices = np.array([[0., 0, 0], [1., 0, 0], [0., 1, 0], [0., 0, 1]])
        faces = np.array([[0, 2, 1], [0, 1, 3], [1, 2, 3], [2, 0, 3]], dtype=np.uint32)
        # Two source surfaces touch exactly at XYZ=(0,0,0); there is no original
        # boundary halfedge establishing source continuity between their IDs.
        points = np.r_[vertices, -vertices]
        triangles = np.r_[faces, faces+4]
        weld, proof = source_welds(points, triangles)
        self.assertEqual(proof['boundaryHalfedges'], 0)
        self.assertNotEqual(weld[0], weld[4])
        np.testing.assert_array_equal(weld, np.arange(8))

    def test_unpaired_original_boundary_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unpaired or ambiguous'):
            source_welds(np.array([[0., 0, 0], [1., 0, 0], [0., 1, 0]]), np.array([[0, 1, 2]], dtype=np.uint32))

    def test_protected_hand_and_every_source_copy_are_preserved(self):
        ids = np.array([[0, 1, 2, 3], [3, 2, 1, 0], [0, 1, 2, 3]], dtype=np.uint16)
        weights = np.array([[.1, .2, .3, .4], [.4, .3, .2, .1], [.25, .25, .25, .25]], dtype=np.float32)
        inverse = np.array([0, 0, 1])
        out_ids, out_weights, changed = scatter_group_supports(ids, weights, inverse,
            np.array([[1, 1, 1, 1], [4, 3, 2, 1]]), np.array([[1., 0, 0, 0], [1., 0, 0, 0]]),
            np.array([True, True]), np.array([True, False, False]))
        np.testing.assert_array_equal(out_ids[:2], ids[:2])
        np.testing.assert_array_equal(out_weights[:2], weights[:2])
        np.testing.assert_array_equal(changed, [False, False, True])
        self.assertEqual(out_ids[2, 0], 4)


class SemanticSourcePatchTests(unittest.TestCase):
    def test_reviewed_cuff_face_removes_competing_lower_robe_seed(self):
        fixed = np.array([0, 4, 4, 0, 0], dtype=np.uint8)
        outer, seeds = lock_semantic_seeds(np.array([True, True, False, True, False]),
            [np.ones(5, dtype=bool), *[np.zeros(5, dtype=bool) for _ in range(4)]], fixed)
        self.assertTrue(outer[2])
        np.testing.assert_array_equal(seeds[0], [True, False, False, True, True])
        np.testing.assert_array_equal(seeds[3], [False, True, True, False, False])

    def test_source_face_patch_rejects_stale_binary_and_source_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'patches.json'
            raw = np.array([1], dtype='<u4').tobytes()
            (path.parent/'faces.bin').write_bytes(raw)
            manifest = {'sourceSha256': 'source', 'patches': [{'sourceSha256': 'source',
                'semanticRegion': 'H01_Sleeve_Left', 'sourceFaceMap': {'file': 'faces.bin',
                'count': 1, 'sha256': hashlib.sha256(raw).hexdigest()}}]}
            path.write_text(json.dumps(manifest))
            triangles = np.array([[0, 1, 2], [2, 3, 4]])
            faces, groups, _ = read_source_face_patches(path, 'source', triangles, np.arange(5))
            np.testing.assert_array_equal(faces, [0, 4])
            np.testing.assert_array_equal(groups, [0, 0, 4, 4, 4])
            with self.assertRaisesRegex(ValueError, 'SHA differs'):
                read_source_face_patches(path, 'other', triangles, np.arange(5))
            (path.parent/'faces.bin').write_bytes(np.array([0], dtype='<u4').tobytes())
            with self.assertRaisesRegex(ValueError, 'SHA/count'):
                read_source_face_patches(path, 'source', triangles, np.arange(5))


class ScreenedSupportSolveTests(unittest.TestCase):
    def test_tiny_nonzero_rhs_is_solved_to_the_same_relative_accuracy(self):
        matrix=csr_matrix([[2.,-1.],[-1.,2.]])
        rhs=np.array([[1e-10],[0.]])
        solved,report=solve_support_fields(matrix,rhs,np.zeros((2,1)),['tiny'])
        np.testing.assert_allclose(solved[:,0],[2e-10/3,1e-10/3],rtol=1e-6,atol=0)
        self.assertLessEqual(report[0]['residual'],2e-6)

    def test_bounded_tiny_rhs_keeps_the_primal_dual_check_instead_of_accepting_absolute_error(self):
        matrix=csr_matrix([[1.,.25],[.25,1.]])
        rhs=np.array([1e-10,0.])
        initial=spsolve(matrix,rhs)
        solved,report=nonnegative_fem_field(matrix,rhs,initial)
        np.testing.assert_allclose(solved,[1e-10,0],rtol=1e-6,atol=0)
        self.assertLessEqual(report['freeResidual'],2e-6)
        self.assertGreaterEqual(report['minimumActiveGradient'],-report['dualTolerance'])

    def test_obtuse_fem_field_solves_nonnegative_energy_with_kkt_checks(self):
        # SPD non-M-matrices occur on obtuse source triangles. Clipping the
        # unconstrained answer [-2,1] would leave the other value incorrect.
        matrix = csr_matrix(np.array([[1., 2.], [2., 5.]]))
        rhs = np.array([0., 1.])
        solution, report = nonnegative_fem_field(matrix, rhs, np.array([-2., 1.]))
        np.testing.assert_allclose(solution, [0., .2])
        gradient = matrix@solution-rhs
        self.assertGreaterEqual(gradient[0], 0)
        self.assertAlmostEqual(gradient[1], 0)
        self.assertEqual(report['zeroBoundSourceGroups'], 1)

    def test_homogeneous_joint_does_not_retain_arbitrary_initial_weights(self):
        matrix = csr_matrix(np.array([[2., -1.], [-1., 2.]]))
        rhs = np.array([[1., 0.], [0., 0.]])
        initial = np.array([[.2, .8], [.9, .1]])
        solved, report = solve_support_fields(matrix, rhs, initial, ['Spine2', 'Spine1'])
        np.testing.assert_allclose(solved[:, 0], [2/3, 1/3])
        np.testing.assert_array_equal(solved[:, 1], [0., 0.])
        np.testing.assert_allclose(matrix@solved, rhs, atol=1e-12)
        self.assertEqual([row['joint'] for row in report], ['Spine2'])

    def test_eight_centimetre_fem_profile_survives_uniform_and_local_refinement(self):
        radius = .08
        samples = np.array([-.24, -.12, -.08, -.04, 0, .04, .08, .12, .24])
        exact = .5*np.sinh((.5-np.abs(samples))/radius)/np.sinh(.5/radius)
        exact[samples > 0] = 1-exact[samples > 0]

        def profile(xs, ny, fem):
            points = np.array([[x, y, 0.] for y in np.linspace(0, .2, ny+1) for x in xs])
            nx = len(xs)
            triangles = []
            for y in range(ny):
                for x in range(nx-1):
                    a = y*nx+x
                    triangles.extend([[a, a+1, a+nx+1], [a, a+nx+1, a+nx]])
            triangles = np.array(triangles, dtype=np.uint32)
            if fem:
                stiffness, mass, _ = source_fem_laplacian(points, triangles)
                screen = mass/radius**2
            else:
                edges = np.unique(np.sort(np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]]), axis=1), axis=0)
                length = np.linalg.norm(points[edges[:, 0]]-points[edges[:, 1]], axis=1)
                conductance = 1/length
                adjacency = coo_matrix((np.r_[conductance, conductance], (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(len(points), len(points))).tocsr()
                stiffness = diags(np.asarray(adjacency.sum(axis=1)).ravel())-adjacency
                screen = np.full(len(points), np.median(length)/radius**2)
            x = points[:, 0]
            target = (x > 1e-12).astype(float)
            target[np.abs(x) < 1e-12] = .5
            boundary = (x == xs[0]) | (x == xs[-1])
            free = ~boundary
            matrix = stiffness+diags(screen)
            solution = target.copy()
            solution[free] = spsolve(matrix[free][:, free], screen[free]*target[free]-matrix[free][:, boundary]@target[boundary])
            mean = solution.reshape(ny+1, nx).mean(axis=0)
            return np.interp(samples, xs, mean)

        coarse = profile(np.linspace(-.5, .5, 51), 10, True)
        refined = profile(np.linspace(-.5, .5, 101), 20, True)
        local_x = np.unique(np.r_[np.linspace(-.5, -.12, 20), np.linspace(-.12, .12, 73), np.linspace(.12, .5, 20)])
        local = profile(local_x, 10, True)
        old_local = profile(local_x, 10, False)
        self.assertLess(np.abs(coarse-exact).max(), .002)
        self.assertLess(np.abs(refined-exact).max(), .0006)
        self.assertLess(np.abs(local-exact).max(), .002)
        self.assertLess(np.abs(coarse-refined).max(), .002)
        self.assertGreater(np.abs(old_local-exact).max(), .01)
        if os.environ.get('SCREENING_SCALE_REPORT'):
            report = {'fixture': 'One metre by twenty centimetre planar strip; screened step target; zero/one fixed endpoints; natural side boundaries',
                      'radiusMeters': radius, 'sampleWorldX': samples.tolist(), 'analyticProfile': exact.tolist(),
                      'femCoarseProfile': coarse.tolist(), 'femRefinedProfile': refined.tolist(),
                      'femLocallyRefinedProfile': local.tolist(), 'oldGraphLocallyRefinedProfile': old_local.tolist(),
                      'maximumAbsoluteErrors': {name: float(np.abs(values-exact).max()) for name, values in
                          [('femCoarse', coarse), ('femRefined', refined), ('femLocallyRefined', local), ('oldGraphLocallyRefined', old_local)]},
                      'coarseRefinedMaximumDifference': float(np.abs(coarse-refined).max()),
                      'passed': True, 'scope': 'Discretization/profile invariance fixture; garment strain remains an independent measured gate'}
            path = Path(os.environ['SCREENING_SCALE_REPORT'])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    unittest.main()
