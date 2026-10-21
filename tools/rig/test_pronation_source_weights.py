import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location(
    "pronation_source_weights", Path(__file__).with_name("pronation-source-weights.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourcePronation(unittest.TestCase):
    def setUp(self):
        self.joints = []
        for side, x in [("Right", -1), ("Left", 1)]:
            self.joints.extend(
                [
                    {"name": side + "ForeArm", "head": [x, 0, 0]},
                    {"name": side + "ForearmPronation", "head": [x, 0, 0]},
                    {"name": side + "Hand", "head": [x, 1, 0]},
                    {"name": side + "HandIndex1", "head": [x, 1.1, 0]},
                ]
            )

    def test_forearm_twist_grows_from_elbow_to_wrist_and_preserves_mass(self):
        p = np.array(
            [[-1, 0, 0], [-1, 0.25, 0], [-1, 0.5, 0], [-1, 0.75, 0], [-1, 1, 0]]
        )
        field = np.zeros((5, 8))
        field[:, 0] = 1
        actual, _ = module.distribute_pronation(p, field, self.joints)
        np.testing.assert_allclose(actual[:, 1], [0, 0.25, 0.5, 0.75, 1])
        np.testing.assert_allclose(actual[:, 0], [1, 0.75, 0.5, 0.25, 0])
        np.testing.assert_allclose(actual.sum(1), 1)

    def test_wrist_flex_does_not_drive_proximal_forearm_and_fingers_are_unchanged(self):
        p = np.array([[-1, 0.5, 0], [-1, 1.2, 0], [-1, 1.1, 0]])
        field = np.zeros((3, 8))
        field[:2, 2] = 1
        field[2, 3] = 1
        actual, _ = module.distribute_pronation(p, field, self.joints)
        self.assertEqual(actual[0, 1], 1)
        self.assertEqual(actual[0, 2], 0)
        self.assertEqual(actual[1, 2], 1)
        self.assertEqual(actual[2, 3], 1)
        np.testing.assert_allclose(actual.sum(1), 1)


if __name__ == "__main__":
    unittest.main()
