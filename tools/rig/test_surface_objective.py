import unittest
import numpy as np
from surface_objective import SurfaceObjective, project_simplex_rows, projected_descent


class SurfaceGradientTest(unittest.TestCase):
    def fixture(self, shared=False):
        fixed = np.array([[0., 0., 0.], [.1, 0., 0.], [.2, 0., 0.], [.4, .1, 0.]])
        transforms = np.array([[[.1, .2, 0.], [.2, .3, .1], [.15, .15, .05], [.3, .2, 0.]],
                               [[.2, .1, 0.], [.3, .4, .2], [.25, .15, .1], [.4, .2, .05]]])
        groups = np.array([0, 0] if shared else [0, 1])
        initial = np.tile([.2, .3, .1, .4], (1 if shared else 2, 1))
        objective = SurfaceObjective(fixed, transforms, np.array([1, 2]), groups, np.array([[0, 1], [1, 2], [2, 3]]), np.array([.1, .1, .1]), initial)
        return objective, np.log(initial).ravel()

    def test_gradient_and_welded_scatter(self):
        for shared in [False, True]:
            with self.subTest(shared=shared):
                objective, x = self.fixture(shared)
                _, analytic = objective(x)
                numerical = np.zeros_like(x)
                for i in range(len(x)):
                    plus, minus = x.copy(), x.copy()
                    plus[i] += 1e-6
                    minus[i] -= 1e-6
                    numerical[i] = (objective(plus)[0] - objective(minus)[0]) / 2e-6
                np.testing.assert_allclose(analytic, numerical, rtol=1e-5, atol=1e-8)

    def test_normalization_and_common_logit_shift(self):
        objective, x = self.fixture()
        loss, gradient = objective(x)
        shifted, shifted_gradient = objective(x + 5)
        np.testing.assert_allclose(loss, shifted, atol=1e-12)
        np.testing.assert_allclose(gradient, shifted_gradient, atol=1e-12)
        weights = objective.weights(x)
        self.assertTrue((weights >= 0).all())
        np.testing.assert_allclose(weights.sum(axis=1), 1)

    def test_simplex_projection_and_monotone_descent(self):
        actual = project_simplex_rows(np.array([[.2,.2,.2,.2],[2,-1,0,0],[1,1,-1,-1]]))
        np.testing.assert_allclose(actual, [[.25,.25,.25,.25],[1,0,0,0],[.5,.5,0,0]])
        objective, x = self.fixture()
        initial = objective.weights(x)
        before, _ = objective.evaluate_weights(initial)
        history = []
        result = projected_descent(objective, initial, 100, history.append)
        after, _ = objective.evaluate_weights(result)
        self.assertLess(after, before)
        self.assertTrue((result >= 0).all())
        np.testing.assert_allclose(result.sum(axis=1), 1)
        self.assertTrue(all(a['loss'] >= b['loss']-1e-14 for a,b in zip(history,history[1:])))


if __name__ == '__main__':
    unittest.main()
