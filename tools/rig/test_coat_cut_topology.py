import unittest
import numpy as np
from coat_cut_topology import corner_components
from verify_cut_fans import reconstruct


class CutFanTest(unittest.TestCase):
    def test_uncut_quad_retains_shared_corner_fans(self):
        t=np.array([[0,1,2],[1,3,2]],dtype=np.uint32)
        c,_=corner_components(t,np.arange(4,dtype=np.uint32),[])
        self.assertEqual(c[0,1],c[1,0]);self.assertEqual(c[0,2],c[1,2])
        self.assertNotEqual(c[0,0],c[0,1])
        np.testing.assert_array_equal(c,reconstruct(t,np.arange(4,dtype=np.uint32),[]))

    def test_explicit_cut_splits_both_sides_without_losing_source_corners(self):
        t=np.array([[0,1,2],[1,3,2]],dtype=np.uint32)
        c,d=corner_components(t,np.arange(4,dtype=np.uint32),[[1,2]])
        self.assertNotEqual(c[0,1],c[1,0]);self.assertNotEqual(c[0,2],c[1,2]);self.assertEqual(c.shape,t.shape);self.assertEqual(d['cutEdges'],1)
        np.testing.assert_array_equal(c,reconstruct(t,np.arange(4,dtype=np.uint32),[[1,2]]))

    def test_interior_cut_tip_stays_connected_through_the_remaining_fan(self):
        t=np.array([[0,1,2],[0,2,3],[0,3,1]],dtype=np.uint32)
        c,_=corner_components(t,np.arange(4,dtype=np.uint32),[[0,2]])
        self.assertEqual(c[0,0],c[1,0]);self.assertEqual(c[0,0],c[2,0]);self.assertNotEqual(c[0,2],c[1,1])
        np.testing.assert_array_equal(c,reconstruct(t,np.arange(4,dtype=np.uint32),[[0,2]]))

    def test_unknown_nonmanifold_or_wrong_winding_edges_fail_closed(self):
        weld=np.arange(5,dtype=np.uint32)
        for t,cuts in [([[0,1,2],[1,3,2]],[[0,3]]),([[0,1,2],[1,2,3]],[]),([[0,1,2],[1,0,3],[0,1,4]],[])]:
            with self.assertRaises(ValueError):corner_components(np.array(t,dtype=np.uint32),weld,cuts)
            with self.assertRaises(ValueError):reconstruct(np.array(t,dtype=np.uint32),weld,cuts)


if __name__=='__main__':unittest.main()
