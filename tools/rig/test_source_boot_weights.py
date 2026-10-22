import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location(
    "source_boot_weights", Path(__file__).with_name("source-boot-weights.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceBootSupport(unittest.TestCase):
    def setUp(self):
        self.names = [
            "RightLeg",
            "RightFoot",
            "RightToeBase",
            "LeftLeg",
            "LeftFoot",
            "LeftToeBase",
            "RightHand",
            "Spine",
        ]
        # Cloth is at sole height, outside its source component. A height-only
        # ownership patch would wrongly change it.
        self.points = np.array(
            [
                [-0.2, 0.002, 0.13],
                [-0.2, 0.22, 0],
                [0.2, 0.002, -0.08],
                [0, 0.002, 0],
                [-0.2, 1.2, 0],
            ]
        )
        self.ids = np.array(
            [[0, 7, 1, 2], [0, 7, 1, 2], [3, 7, 4, 5], [7, 0, 1, 2], [6, 0, 1, 2]]
        )
        self.weights = np.array(
            [
                [0.8, 0.2, 0, 0],
                [0.8, 0.2, 0, 0],
                [0.8, 0.2, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
            ]
        )
        self.selection = {
            "sides": {
                "Right": {"vertexIds": [0, 1], "soleVertexIds": [0]},
                "Left": {"vertexIds": [2], "soleVertexIds": [2]},
            }
        }

    def test_boot_sole_follows_foot_not_shin_and_other_source_vertices_stay_exact(self):
        ids, weights, _ = module.repair_boot_field(
            self.points, self.ids, self.weights, self.names, self.selection
        )
        # Independent transforms: shin translates100mm, foot/toe stay fixed.
        # The actual underside must not inherit the shin displacement.
        for vertex in [0, 2]:
            y = self.points[vertex, 1] + sum(
                w * (0.1 if self.names[j].endswith("Leg") else 0)
                for j, w in zip(ids[vertex], weights[vertex])
            )
            self.assertAlmostEqual(y, 0.002, places=7)
            self.assertAlmostEqual(weights[vertex].sum(), 1, places=7)
        for vertex in [1, 3, 4]:
            np.testing.assert_array_equal(ids[vertex], self.ids[vertex])
            np.testing.assert_array_equal(weights[vertex], self.weights[vertex])

    def test_invalid_or_overlapping_component_or_sole_refuses_patch(self):
        import copy

        for mutation in ["overlap", "missing-sole", "outside"]:
            selection = copy.deepcopy(self.selection)
            if mutation == "overlap":
                selection["sides"]["Left"]["vertexIds"].append(0)
            if mutation == "missing-sole":
                selection["sides"]["Right"]["soleVertexIds"] = [3]
            if mutation == "outside":
                selection["sides"]["Right"]["vertexIds"] = [999]
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                module.repair_boot_field(
                    self.points, self.ids, self.weights, self.names, selection
                )

    def test_invalid_parent_weights_cannot_be_normalized_into_a_valid_candidate(self):
        invalid = self.weights.copy()
        invalid[0] = [1.1, -0.1, 0, 0]
        with self.assertRaises(ValueError):
            module.repair_boot_field(
                self.points, self.ids, invalid, self.names, self.selection
            )


if __name__ == "__main__":
    unittest.main()
