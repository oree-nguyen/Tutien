import unittest
import numpy as np
from pose_weight_fit import simplex


class WeightSimplexTest(unittest.TestCase):
    def test_projection_preserves_already_feasible_supports(self):
        rows=np.array([[.1,.2,.3,.4],[0,0,0,1]],float)
        np.testing.assert_allclose(simplex(rows),rows,atol=1e-15)

    def test_negative_and_overflowing_weights_project_to_feasible_boundary(self):
        actual=simplex(np.array([[-2,4,1,-3],[.7,.7,-.1,-.1]]))
        np.testing.assert_allclose(actual,[[0,1,0,0],[.5,.5,0,0]],atol=1e-15)
        self.assertTrue((actual>=0).all())
        np.testing.assert_allclose(actual.sum(1),1,atol=1e-15)

    def test_projection_obeys_euclidean_optimality_and_common_shift_invariance(self):
        rng=np.random.default_rng(1234);value=rng.normal(size=(100,4));point=simplex(value)
        alternative=rng.dirichlet(np.ones(4),size=100)
        self.assertTrue((np.sum((value-point)*(alternative-point),axis=1)<1e-12).all())
        np.testing.assert_allclose(simplex(value+3),point,atol=1e-14)


if __name__=='__main__':unittest.main()
