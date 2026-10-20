import unittest
import numpy as np
from lower_leg_domains import source_leg_domains


class SourceDomains(unittest.TestCase):
    def setUp(self):
        self.p=np.array([[.1,0,0],[.2,0,0],[.1,.2,0],[.1,.4,0],[-.1,0,0],[-.2,0,0],[-.1,.2,0],[-.1,.4,0]])
        self.tri=np.array([[0,1,2],[1,2,3],[4,5,6],[5,6,7],[2,3,6],[3,6,7]])
        self.inverse=np.array([0,1,2,3,4,5,6,7,0,4])
        self.sides={'Left':{'soleVertexIds':[0,1,8]},'Right':{'soleVertexIds':[4,5,9]}}

    def test_uv_copies_follow_source_graph_not_spatial_box(self):
        result=source_leg_domains(self.p,self.tri,self.inverse,self.sides,.3)
        np.testing.assert_array_equal(np.flatnonzero(result['Left']),[0,1,2])
        np.testing.assert_array_equal(np.flatnonzero(result['Right']),[4,5,6])

    def test_higher_crop_cannot_silently_assign_attached_robe_as_leg(self):
        with self.assertRaisesRegex(AssertionError,'midline|merged'):
            source_leg_domains(self.p,self.tri,self.inverse,self.sides,.5)

    def test_disconnected_or_out_of_bounds_sole_fails_instead_of_guessing(self):
        for seeds in [[0,4],[999],[]]:
            with self.subTest(seeds=seeds),self.assertRaises(AssertionError):
                source_leg_domains(self.p,self.tri,self.inverse,{**self.sides,'Left':{'soleVertexIds':seeds}},.3)


if __name__=='__main__':unittest.main()
