import unittest
import numpy as np
from hand_proximal_support import proximal_row


class ProximalSupportTest(unittest.TestCase):
    def fixture(self, side="Left"):
        names=[side+"Hand",side+"HandIndex1",side+"HandIndex2",side+"HandIndex3",side+"HandThumb1",side+"HandThumb2",side+"HandThumb3"]
        sign=1 if side=="Left" else -1
        frame={"fingers":{"Index":{"points":[[sign*x,0,0] for x in (0,1,2,3)]}}}
        return names,frame

    def test_distal_root_leak_moves_only_to_same_finger_ancestor_and_coalesces(self):
        for side,sign in [("Left",1),("Right",-1)]:
            names,frame=self.fixture(side)
            ids=np.array([0,1,3,4],dtype=np.uint16)
            weights=np.array([.1,.2,.3,.4],dtype=np.float32)
            new_ids,new_weights=proximal_row(np.array([.25*sign,0,0]),ids,weights,names,frame,side)
            mass={j:float(new_weights[new_ids==j].sum()) for j in range(len(names))}
            self.assertAlmostEqual(mass[1],.5,places=6)
            self.assertEqual(mass[3],0)
            self.assertAlmostEqual(mass[4],.4,places=6)
            self.assertAlmostEqual(float(new_weights.sum()),1,places=6)
            np.testing.assert_array_equal(ids,[0,1,3,4])
            np.testing.assert_array_equal(weights,np.array([.1,.2,.3,.4],dtype=np.float32))

    def test_joint_blend_zone_and_distal_vertices_keep_their_existing_support(self):
        names,frame=self.fixture()
        ids=np.array([0,1,3,4],dtype=np.uint16)
        weights=np.array([.1,.2,.3,.4],dtype=np.float32)
        for x in (1.998,2.002,2.9):
            a,b=proximal_row(np.array([x,0,0]),ids,weights,names,frame,"Left")
            np.testing.assert_array_equal(a,ids)
            np.testing.assert_array_equal(b,weights)


if __name__=="__main__":
    unittest.main()
