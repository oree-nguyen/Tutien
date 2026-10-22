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
        np.testing.assert_allclose(actual[:, 1], [0, 0.25, 0.5, 0.75, 0])
        np.testing.assert_allclose(actual[:, 0], [1, 0.75, 0.5, 0.25, 0])
        np.testing.assert_allclose(actual[:, 2], [0, 0, 0, 0, 1])
        np.testing.assert_allclose(actual.sum(1), 1)

    def test_distal_palm_inherits_wrist_flex_instead_of_staying_on_roll_parent(self):
        p = np.array([[-1, 1.2, 0.1]])
        field = np.zeros((1, 8))
        field[0, 0] = 0.6
        field[0, 1] = 0.2
        field[0, 2] = 0.2
        actual, _ = module.distribute_pronation(p, field, self.joints)
        # Independent LBS: forearm/helper stay identity, Hand bends90degrees
        # about X through the source wrist (-1,1,0). The entire palm must turn.
        hand = np.array([-1, 0.9, 0.2])
        posed = (actual[0, 0] + actual[0, 1]) * p[0] + actual[0, 2] * hand
        np.testing.assert_allclose(posed, hand, atol=1e-12)
        self.assertEqual(actual[0, 2], 1)

    def test_distal_only_mode_keeps_fitted_proximal_field_exact_and_preserves_finger_support(
        self,
    ):
        p = np.array([[-1, 0.5, 0], [-1, 1.2, 0.1]])
        field = np.zeros((2, 8))
        field[0, :2] = [0.4, 0.6]
        field[1, :4] = [0.1, 0.1, 0.3, 0.5]
        actual, _ = module.distribute_pronation(p, field, self.joints, distal_only=True)
        np.testing.assert_array_equal(actual[0], field[0])
        self.assertEqual(actual[1, 3], 0.5)
        self.assertAlmostEqual(actual[1, 2], 0.5)
        np.testing.assert_allclose(actual.sum(1), field.sum(1))
        domains = {side: np.zeros(2, dtype=bool) for side in ["Left", "Right"]}
        unchanged, _ = module.distribute_pronation(
            p, field, self.joints, distal_only=True, hand_domains=domains
        )
        np.testing.assert_array_equal(unchanged, field)
        domains["Right"] = np.array([0, 0.25])
        partial, _ = module.distribute_pronation(
            p, field, self.joints, distal_only=True, hand_domains=domains
        )
        # A nonzero transition value must not become a boolean hard mask.
        self.assertAlmostEqual(partial[1, 2], 0.3 + 0.2 * 0.25)

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
