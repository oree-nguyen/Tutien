import unittest
import numpy as np
from scipy.sparse import csr_matrix
from scipy.optimize import nnls
from bounded_fem_newton import projected_newton_field


class FeasibleNewtonTest(unittest.TestCase):
    def test_coupled_fields_match_independent_nnls_at_multiple_scales(self):
        rng=np.random.default_rng(625)
        for scale in [1.,1e-6,1e-10]:
            b=rng.normal(size=(18,18));a=b.T@b+np.eye(18)*.4;rhs=rng.normal(size=18)*scale;root=np.linalg.cholesky(a)
            expected=nnls(root.T,np.linalg.solve(root,rhs/scale))[0]*scale
            actual,report=projected_newton_field(csr_matrix(a),rhs,np.linalg.solve(a,rhs))
            np.testing.assert_allclose(actual,expected,rtol=2e-4,atol=scale*1e-7)
            self.assertGreaterEqual(actual.min(),0);self.assertLessEqual(report['freeResidual'],2e-6);self.assertGreaterEqual(report['minimumActiveGradient'],-report['dualTolerance'])

    def test_clipping_an_unconstrained_solution_is_not_accepted_as_the_optimum(self):
        a=csr_matrix([[2.,1.],[1.,2.]]);rhs=np.array([1.,0.]);initial=np.linalg.solve(a.toarray(),rhs)
        clipped=np.maximum(initial,0);self.assertGreater(np.linalg.norm(a@clipped-rhs),.1)
        actual,report=projected_newton_field(a,rhs,initial)
        np.testing.assert_allclose(actual,[.5,0],atol=1e-10);self.assertLessEqual(report['freeResidual'],2e-6)


if __name__=='__main__':unittest.main()
