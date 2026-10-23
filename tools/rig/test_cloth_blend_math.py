import unittest
import numpy as np
from cloth_blend_math import (
    reduce_four,
    reduce_four_stable,
    merge_joint_supports,
    floor_upper,
    feasible_segment,
    fit_alpha,
    repair_alpha,
    scalar_gram,
    fit_alpha_admm,
)


class PoseSpaceReductionTest(unittest.TestCase):
    def test_joint_coalescing_preserves_any_pose_and_does_not_merge_coincident_distinct_bones(
        self,
    ):
        ids = np.array([[4, 2, 4, 3, 2, 7, 3, 4]])
        weights = np.array([[0.1, 0.2, 0.05, 0.25, 0.1, 0.1, 0.1, 0.1]])
        result = merge_joint_supports(ids, weights)
        np.testing.assert_allclose(result, [[0.25, 0.3, 0, 0.35, 0, 0.1, 0, 0]])
        rng = np.random.default_rng(11)
        for points in [np.zeros((8, 3)), rng.normal(size=(8, 3))]:
            np.testing.assert_allclose(
                (points[ids] * result[:, :, None]).sum(1),
                (points[ids] * weights[:, :, None]).sum(1),
                atol=1e-15,
            )
        # Bones2/3 remain distinct even in the coincident-points case above.
        self.assertGreater(result[0, 1], 0)
        self.assertGreater(result[0, 3], 0)
        np.testing.assert_array_equal(
            weights, [[0.1, 0.2, 0.05, 0.25, 0.1, 0.1, 0.1, 0.1]]
        )

    def test_nearest_support_does_not_replace_an_existing_four_bone_motion_when_points_coincide(
        self,
    ):
        points = np.zeros((1, 8, 3))
        weights = np.array([[0.7, 0.2, 0.09, 0.009, 0.001, 0, 0, 0]])
        slots, values = reduce_four_stable(points, weights)
        full = np.zeros(8)
        np.add.at(full, slots[0], values[0])
        expected = np.r_[weights[0, :4] + 0.001 / 4, np.zeros(4)]
        np.testing.assert_allclose(full, expected, atol=1e-14)
        arbitrary, result = reduce_four(points, weights)
        old = np.zeros(8)
        np.add.at(old, arbitrary[0], result[0])
        self.assertLess(
            np.linalg.norm(full - weights[0]), np.linalg.norm(old - weights[0])
        )

    def test_nearest_sparse_weights_match_independent_exhaustive_tetrahedron_solves(
        self,
    ):
        from itertools import combinations

        rng = np.random.default_rng(222)
        points = rng.normal(size=(13, 8, 3))
        weights = rng.dirichlet(np.ones(8), size=len(points))
        target = np.einsum("nkj,nk->nj", points, weights)
        slots, values = reduce_four_stable(points, weights, batch_size=3)
        for row in range(len(points)):
            best = np.inf
            for support in combinations(range(8), 4):
                matrix = np.vstack([np.ones(4), points[row, list(support)].T])
                result = np.linalg.solve(matrix, np.r_[1, target[row]])
                if np.any(result < 0):
                    continue
                full = np.zeros(8)
                full[list(support)] = result
                best = min(best, np.sum((full - weights[row]) ** 2))
            full = np.zeros(8)
            np.add.at(full, slots[row], values[row])
            self.assertAlmostEqual(np.sum((full - weights[row]) ** 2), best, places=11)
            np.testing.assert_allclose(full @ points[row], target[row], atol=1e-10)
        with self.assertRaises(ValueError):
            reduce_four_stable(points, weights - 1)

    def test_actual_evaluated_point_is_preserved_when_largest_four_are_wrong(self):
        rng = np.random.default_rng(789)
        points = rng.normal(size=(201, 8, 3))
        weights = rng.dirichlet(np.ones(8), size=len(points))
        weights[0] = np.array([0.125] * 8)
        target = np.einsum("nkj,nk->nj", points, weights)
        slots, result = reduce_four(points, weights, batch_size=31)
        actual = (
            np.take_along_axis(points, slots[:, :, None], axis=1) * result[:, :, None]
        ).sum(1)
        np.testing.assert_allclose(actual, target, atol=2e-14)
        np.testing.assert_allclose(result.sum(1), weights.sum(1), atol=2e-15)
        self.assertTrue((result >= 0).all())
        top = np.argsort(-weights[0])[:4]
        naive = (
            points[0, top] * (weights[0, top] / weights[0, top].sum())[:, None]
        ).sum(0)
        self.assertGreater(np.linalg.norm(naive - target[0]), 0.01)

    def test_collinear_and_coincident_joints_do_not_invent_an_influence(self):
        points = np.zeros((3, 8, 3))
        points[1, :, 0] = np.arange(8)
        points[2] = np.array([1e6, -1e6, 1e6])
        weights = np.full((3, 8), 0.125)
        slots, result = reduce_four(points, weights)
        actual = (
            np.take_along_axis(points, slots[:, :, None], axis=1) * result[:, :, None]
        ).sum(1)
        np.testing.assert_allclose(
            actual, np.einsum("nkj,nk->nj", points, weights), atol=1e-9
        )
        weights[0] = [1, 0, 0, 0, 0, 0, 0, 0]
        slots, result = reduce_four(points, weights)
        self.assertEqual(slots[0, 0], 0)
        self.assertEqual(result[0, 0], 1)
        with self.assertRaises(ValueError):
            reduce_four(points, weights - 1)
        points[0, 0, 0] = np.nan
        with self.assertRaises(ValueError):
            reduce_four(points, weights)


class FeasibleClothStepTest(unittest.TestCase):
    def test_bounded_newton_obeys_both_kkt_signs_and_a_mixed_interior_solution(self):
        from scipy.sparse import csr_matrix
        from projected_box_field import projected_box_field

        for a, rhs, upper, expected in [
            (
                [[4, -1, 0.2], [-1, 3, -0.3], [0.2, -0.3, 2]],
                [-1, 6, 1],
                [0.7, 0.4, 0.25],
                [0, 0.4, 0.25],
            ),
            ([[2, -1], [-1, 2]], [0, 1], [0.1, 1], [0.1, 0.55]),
        ]:
            matrix = csr_matrix(np.array(a, float))
            x, info = projected_box_field(
                matrix, np.array(rhs, float), np.zeros(len(rhs)), np.array(upper)
            )
            np.testing.assert_allclose(x, expected, atol=1e-8)
            gradient = matrix @ x - rhs
            self.assertTrue((gradient[x == 0] >= -1e-8).all())
            self.assertTrue((gradient[x == upper] <= 1e-8).all())
            self.assertLessEqual(info["freeResidual"], 2e-6)
        with self.assertRaises(ValueError):
            projected_box_field(
                csr_matrix(np.eye(2)), np.ones(2), np.zeros(2), np.array([0, 1])
            )

    def test_scalar_gram_matches_an_independently_assembled_vector_jacobian(self):
        delta = np.array(
            [[1e8, -1e8, 1e8], [0.2, 0.3, -0.1], [-0.3, 0.2, 0.5], [1e9, 1e9, 1e9]]
        )
        edges = np.array([[0, 1], [1, 2], [2, 3]])
        lengths = np.array([0.01, 0.03, 0.02])
        free = np.array([False, True, True, False])
        operator = np.zeros((9, 2))
        for i, (a, b) in enumerate(edges):
            for k, vertex in enumerate([1, 2]):
                if vertex == a:
                    operator[i * 3 : i * 3 + 3, k] += delta[vertex] / lengths[i]
                if vertex == b:
                    operator[i * 3 : i * 3 + 3, k] -= delta[vertex] / lengths[i]
        np.testing.assert_allclose(
            scalar_gram(delta, edges, lengths, free).toarray(),
            operator.T @ operator,
            atol=1e-12,
        )

    def test_global_field_solve_matches_the_analytic_box_and_edge_optimum(self):
        p = np.array([[0, 0.2, 0], [1, 0.2, 0], [0, 1.2, 0]])
        delta = np.array([[0, 0, 0], [1, 0, 0], [0, 0, 0]])
        edges = np.array([[0, 1], [0, 2]])
        free = np.array([False, True, False])
        desired = np.array([0, 1, 0])
        alpha, info = fit_alpha_admm(
            p, delta, edges, np.ones(2), free, desired, free.astype(float), 1.499, 100
        )
        np.testing.assert_allclose(alpha, [0, 0.499, 0], atol=1e-6)
        self.assertLess(info["maximumRelativeLinearResidual"], 1e-10)
        self.assertGreater(info["feasibleSegmentStep"], 0.999)
        bounded, info = fit_alpha_admm(
            p,
            delta,
            edges,
            np.ones(2),
            free,
            desired,
            free.astype(float),
            1.499,
            100,
            boxed=True,
        )
        np.testing.assert_allclose(bounded, [0, 0.499, 0], atol=1e-6)
        self.assertLessEqual(info["maximumBoxFreeResidual"], 2e-6)

    def test_disjoint_edge_projection_repairs_a_shared_vertex_without_moving_fixed_body(
        self,
    ):
        p = np.array([[0, 0, 0], [1, 0, 0], [2, 0, 0]], float)
        delta = np.array([[0, 0, 0], [0, 1, 0], [1, 1, 0]], float)
        edges = np.array([[0, 1], [1, 2], [0, 2]])
        lengths = np.array([1, 1, 2], float)
        upper = np.array([0, 1, 1], float)
        before = np.array([0, 0.9, 0.9])
        alpha, info = repair_alpha(
            p, delta, edges, lengths, before, upper, 1.2, passes=200
        )
        self.assertGreaterEqual(info["edgeColours"], 3)
        self.assertEqual(alpha[0], 0)
        self.assertTrue(((alpha >= 0) & (alpha <= upper)).all())
        actual = p + delta * alpha[:, None]
        ratio = (
            np.linalg.norm(actual[edges[:, 0]] - actual[edges[:, 1]], axis=1) / lengths
        )
        self.assertLessEqual(ratio.max(), 1.2 + 1e-7)
        # Projection distance to the known feasible zero field cannot grow.
        self.assertLessEqual(np.linalg.norm(alpha), np.linalg.norm(before) + 1e-12)

    def test_scalar_solver_matches_independent_active_edge_solution_and_keeps_fixed_body(
        self,
    ):
        p = np.array([[0, 0.2, 0], [1, 0.2, 0], [0, 1.2, 0]])
        delta = np.array([[0, 0, 0], [1, 0, 0], [0, 0, 0]])
        edges = np.array([[0, 1], [0, 2]])
        free = np.array([False, True, False])
        desired = np.array([0, 1, 0])
        alpha, report = fit_alpha(
            p, delta, edges, np.ones(2), free, desired, free.astype(float), 1.499, 600
        )
        np.testing.assert_allclose(alpha, [0, 0.499, 0], atol=1e-6)
        self.assertGreater(report["feasibleSegmentStep"], 0.99)
        actual = p + alpha[:, None] * delta
        self.assertLessEqual(
            np.max(np.linalg.norm(actual[edges[:, 0]] - actual[edges[:, 1]], axis=1)),
            1.499 + 1e-10,
        )
        np.testing.assert_array_equal(actual[~free], p[~free])

    def test_floor_is_a_bound_on_the_actual_point_not_on_the_bone_origin(self):
        base = np.array([0.1, 0.2, -0.05])
        delta = np.array([-0.4, 0.1, -0.1])
        free = np.array([True, True, False])
        upper = floor_upper(base, delta, free, 0.001)
        np.testing.assert_allclose(upper, [0.2475, 1, 0])
        self.assertTrue((base[free] + upper[free] * delta[free] >= 0.001 - 1e-15).all())
        with self.assertRaises(ValueError):
            floor_upper(base, delta, np.ones(3, bool), 0.001)

    def test_exact_feasible_segment_keeps_all_intermediate_edge_lengths_bounded(self):
        p = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], float)
        delta = np.array([[0, 0, 0], [1, 1, 0], [-1, 1, 0]], float)
        edges = np.array([[0, 1], [0, 2], [1, 2]])
        lengths = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
        step = feasible_segment(p, delta, edges, lengths, 1.499)
        self.assertGreater(step, 0)
        self.assertLess(step, 1)
        for t in np.linspace(0, step, 31):
            actual = p + t * delta
            self.assertLessEqual(
                np.max(
                    np.linalg.norm(actual[edges[:, 0]] - actual[edges[:, 1]], axis=1)
                    / lengths
                ),
                1.499 + 1e-12,
            )
        with self.assertRaises(ValueError):
            feasible_segment(p * 3, delta, edges, lengths, 1.499)


if __name__ == "__main__":
    unittest.main()
