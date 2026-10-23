import unittest

import numpy as np

from arap_weights import (
    bounded_shape_dual,
    edge_operator,
    fit_arap,
    fit_bounded_arap,
    proper_rotations,
)
from audit_hand_seed_strain import seed_path_bounds
from hand_support_slots import restore_slots


class ArapWeightTest(unittest.TestCase):
    def test_source_slots_restore_missing_knuckle_without_changing_lbs(self):
        names = [
            "LeftHand",
            "LeftHandIndex1",
            "LeftHandIndex3",
            "LeftHandIndex2",
            "LeftUpLeg",
            "RightHand",
        ]
        ids = np.array([0, 0, 2, 0], dtype=np.uint16)
        weights = np.array([0.943, 0.002, 0.053, 0.002], dtype=np.float32)
        reference = np.array([0, 1, 2, 3], dtype=np.uint16)
        actual_ids, actual_weights = restore_slots(
            ids, weights, reference, names, "Left"
        )
        self.assertEqual(set(actual_ids), {0, 1, 2, 3})
        self.assertEqual(actual_weights[np.flatnonzero(actual_ids == 1)[0]], 0)
        rng = np.random.default_rng(721)
        # Independent arbitrary transformed positions for six joints, 7 poses.
        transforms = rng.normal(size=(7, 6, 3))
        expected = np.einsum("pnj,n->pj", transforms[:, ids], weights)
        actual = np.einsum("pnj,n->pj", transforms[:, actual_ids], actual_weights)
        np.testing.assert_allclose(actual, expected, atol=1e-7, rtol=1e-7)
        bad_ref = np.array([0, 4, 2, 5], dtype=np.uint16)
        changed, _ = restore_slots(ids, weights, bad_ref, names, "Left")
        self.assertNotIn(4, changed)
        self.assertNotIn(5, changed)

    def test_jacobian_keeps_fixed_neighbor_and_all_pose_terms(self):
        rng = np.random.default_rng(391)
        coeff = rng.normal(size=(2, 3, 4, 3))
        origin = rng.normal(size=(2, 3, 3))
        initial = rng.dirichlet(np.ones(4), size=3)
        edges = np.array([[0, 1], [1, 2]])
        lengths = np.array([0.4, 0.7])
        free = np.array([False, True, False])
        a, offset, selected = edge_operator(
            coeff, origin, edges, lengths, free, initial
        )
        changed = initial.copy()
        changed[1] = [0.1, 0.2, 0.3, 0.4]
        actual = origin + np.einsum("pnkj,nk->pnj", coeff, changed)
        expected = (actual[:, edges[:, 1]] - actual[:, edges[:, 0]]) / lengths[
            None, :, None
        ]
        np.testing.assert_allclose(
            (a @ changed[selected].ravel()).reshape(2, 2, 3) + offset,
            expected,
            atol=1e-14,
        )

    def test_procrustes_recovers_rigid_rotation_but_rejects_reflection(self):
        source = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]], dtype=float)
        edges = np.array([[0, 1], [0, 2], [0, 3]])
        rotation = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]], dtype=float)
        result = proper_rotations(source, source @ rotation.T, edges, 4)
        np.testing.assert_allclose(result[0], rotation, atol=1e-14)
        reflected = proper_rotations(source, source * [-1, 1, 1], edges, 4)
        np.testing.assert_allclose(np.linalg.det(reflected), 1, atol=1e-14)
        self.assertGreater(np.linalg.norm(reflected[0] - np.diag([-1, 1, 1])), 1)

    def test_compression_is_repaired_while_pinned_origin_is_unchanged(self):
        source = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]], dtype=float)
        edges = np.array([[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]])
        origin = source[None].copy()
        coeff = np.zeros((1, 4, 4, 3))
        coeff[0, :, 1] = -0.5 * source
        initial = np.tile([0, 1, 0, 0], (4, 1)).astype(float)
        free = np.array([False, True, True, True])
        weights, history = fit_arap(
            source,
            edges,
            origin,
            coeff,
            initial,
            free,
            iterations=12,
            inner_iterations=120,
            rho=1,
            prior=1e-6,
        )
        np.testing.assert_array_equal(weights[0], initial[0])
        self.assertLess(history[-1]["rmsRelativeEdgeError"], 0.001)
        self.assertGreater(history[-1]["edgeDiagnostics"][0]["minimum"], 0.999)
        self.assertGreater(weights[1:, [0, 2, 3]].sum(axis=1).min(), 0.998)

    def test_empty_domain_is_not_a_successful_solve(self):
        with self.assertRaises(ValueError):
            fit_arap(
                np.zeros((1, 3)),
                np.array([[0, 0]]),
                np.zeros((1, 1, 3)),
                np.zeros((1, 1, 4, 3)),
                np.array([[1.0, 0, 0, 0]]),
                np.array([False]),
            )

    def test_diagonal_metric_still_solves_the_same_bounded_shape_problem(self):
        source = np.array([[0.0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]])
        edges = np.array([[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]])
        origin = source[None].copy()
        coeff = np.zeros((1, 4, 4, 3))
        coeff[0, :, 1] = -0.5 * source
        initial = np.tile([0.0, 1, 0, 0], (4, 1))
        free = np.array([False, True, True, True])
        weights, history = fit_arap(
            source,
            edges,
            origin,
            coeff,
            initial,
            free,
            iterations=12,
            inner_iterations=120,
            rho=0.5,
            prior=1e-6,
            metric="jacobi",
        )
        np.testing.assert_array_equal(weights[0], initial[0])
        self.assertLess(history[-1]["rmsRelativeEdgeError"], 0.001)
        self.assertLess(history[-1]["admmPrimal"], 1e-7)
        self.assertGreater(history[-1]["edgeDiagnostics"][0]["minimum"], 0.999)

    def test_seed_bound_uses_surface_path_and_actual_pinned_transform(self):
        # Endpoint distance sqrt(2) differs from the shortest source path 2.
        points = np.array([[0.0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 0, 1]])
        faces = np.array([[0, 1, 3], [1, 2, 3]])
        seeds = [{"vertex": 0, "jointIndex": 0}, {"vertex": 2, "jointIndex": 1}]
        matrices = np.tile(np.eye(4), (2, 2, 1, 1))
        matrices[1, 1, :3, 3] = [4, -1, 0]
        bounds = seed_path_bounds(points, faces, seeds, matrices)
        self.assertAlmostEqual(bounds[0]["maximumLowerBound"], np.sqrt(2) / 2)
        self.assertAlmostEqual(bounds[1]["maximumLowerBound"], 2.5)
        self.assertAlmostEqual(bounds[1]["witnesses"][0]["sourcePathMeters"], 2)

    def test_bounded_prox_satisfies_independent_ball_kkt_conditions(self):
        value = np.array([[[4.0, -2, 1], [0.1, 0.2, 0.3]]])
        target = np.array([[[1.0, 0, 0], [0, 1, 0]]])
        sigma = np.array([[0.7, 1.3]])
        strength, radius = 0.4, 1.45
        dual = bounded_shape_dual(value, sigma, target, radius, strength)
        point = (value - dual) / sigma[:, :, None]
        self.assertTrue(np.all(np.linalg.norm(point, axis=2) <= radius + 1e-14))
        gradient = (sigma[:, :, None] + strength) * point - value - strength * target
        # Active point: gradient is the inward normal; inactive point: zero.
        self.assertGreater(np.linalg.norm(gradient[0, 0]), 0.1)
        self.assertLess(np.dot(gradient[0, 0], point[0, 0]), 0)
        np.testing.assert_allclose(np.cross(gradient[0, 0], point[0, 0]), 0, atol=1e-14)
        np.testing.assert_allclose(gradient[0, 1], 0, atol=1e-14)

    def test_bounded_shape_solve_repairs_compression_without_dropping_neighbor(self):
        source = np.array([[0.0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]])
        edges = np.array([[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]])
        coeff = np.zeros((1, 4, 4, 3))
        coeff[0, :, 1] = -0.5 * source
        initial = np.tile([0.0, 1, 0, 0], (4, 1))
        free = np.array([False, True, True, True])
        weights, history = fit_bounded_arap(
            source, edges, source[None], coeff, initial, free, iterations=600
        )
        np.testing.assert_array_equal(weights[0], initial[0])
        self.assertGreater(history[-1]["edgeDiagnostics"][0]["minimum"], 0.99)
        self.assertLessEqual(history[-1]["edgeDiagnostics"][0]["maximum"], 1.45)

    def test_constrained_admm_does_not_hide_an_impossible_source_support(self):
        source = np.array([[0.0, 0, 0], [1, 0, 0], [0, 1, 0]])
        edges = np.array([[0, 1], [0, 2], [1, 2]])
        origin = source[None].copy()
        origin[0, 1, 0] = 2.5
        coeff = np.zeros((1, 3, 4, 3))
        initial = np.tile([1.0, 0, 0, 0], (3, 1))
        free = np.array([False, True, False])
        weights, history = fit_arap(
            source,
            edges,
            origin,
            coeff,
            initial,
            free,
            iterations=2,
            inner_iterations=40,
            rho=0.5,
            metric="jacobi",
            radius=1.45,
        )
        np.testing.assert_array_equal(weights[~free], initial[~free])
        self.assertGreater(history[-1]["admmPrimal"], 1)
        self.assertGreater(history[-1]["edgeDiagnostics"][0]["maximum"], 2)


if __name__ == "__main__":
    unittest.main()
