import unittest
import numpy as np
from cloth_corrective import project_edge_vectors


class EdgeProjection(unittest.TestCase):
    def test_stretch_and_compression_both_have_physical_bounds(self):
        v=np.array([[3.,0,0],[0,.01,0],[0,0,1.]])
        result=project_edge_vectors(v,.7,1.45,v)
        np.testing.assert_allclose(np.linalg.norm(result,axis=1),[1.45,.7,1.])
        np.testing.assert_allclose(result[:2],[[1.45,0,0],[0,.7,0]])

    def test_zero_edge_uses_a_real_nonzero_source_direction(self):
        result=project_edge_vectors(np.zeros((1,3)),.7,1.45,np.array([[0,0,2.]]))
        np.testing.assert_allclose(result,[[0,0,.7]])
        with self.assertRaises(AssertionError):project_edge_vectors(np.zeros((1,3)),.7,1.45,np.zeros((1,3)))

    def test_upper_only_mode_preserves_legacy_zero_and_rejects_nan(self):
        np.testing.assert_array_equal(project_edge_vectors(np.zeros((1,3)),0,1.45,np.zeros((1,3))),np.zeros((1,3)))
        with self.assertRaises(AssertionError):project_edge_vectors(np.array([[np.nan,0,0]]),0,1.45,np.ones((1,3)))


if __name__=='__main__':unittest.main()
