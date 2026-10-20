import unittest
import numpy as np
from scipy.spatial.transform import Rotation
from stance_direction import measure_torso,reference_torso_valid


class TorsoDirectionTest(unittest.TestCase):
    def test_backward_lean_is_not_mistaken_for_forward_reference(self):
        backward=Rotation.from_euler('x',-20,degrees=True).as_matrix()
        self.assertAlmostEqual(measure_torso(backward)['tilt'],20)
        self.assertAlmostEqual(measure_torso(backward)['forwardLean'],-20)
        self.assertFalse(reference_torso_valid(backward))

    def test_forward_reference_is_accepted_with_the_same_absolute_tilt(self):
        forward=Rotation.from_euler('x',20,degrees=True).as_matrix()
        self.assertAlmostEqual(measure_torso(forward)['forwardLean'],20)
        self.assertTrue(reference_torso_valid(forward))

    def test_sideways_lean_cannot_satisfy_the_forward_reference(self):
        sideways=Rotation.from_euler('z',20,degrees=True).as_matrix()
        self.assertAlmostEqual(measure_torso(sideways)['tilt'],20)
        self.assertAlmostEqual(measure_torso(sideways)['forwardLean'],0)
        self.assertFalse(reference_torso_valid(sideways))

    def test_nonfinite_or_scaled_frame_cannot_be_certified_as_a_direction(self):
        for r in [np.full((3,3),np.nan),np.eye(3)*2,np.diag([-1,1,1])]:
            with self.assertRaises(ValueError):measure_torso(r)


if __name__=='__main__':unittest.main()
