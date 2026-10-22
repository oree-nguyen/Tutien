import importlib.util
from pathlib import Path
import unittest
import numpy as np
from coat_cut_topology import corner_components
from verify_cut_fans import reconstruct

spec = importlib.util.spec_from_file_location(
    "panel_seams", Path(__file__).with_name("open-source-panel-seams.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PanelOpeningTest(unittest.TestCase):
    def test_opens_only_actual_lower_left_right_interface(self):
        p = np.array(
            [
                [0, 0.2, 0],
                [0, 0.4, 0],
                [0, 0.6, 0],
                [-0.2, 0.3, 0],
                [0.2, 0.3, 0],
                [-0.2, 0.5, 0],
                [0.2, 0.5, 0],
            ]
        )
        t = np.array([[0, 3, 1], [0, 1, 4], [1, 5, 2], [1, 2, 6]], dtype=np.uint32)
        roles = np.array([1, 2, 1, 4], dtype=np.uint8)
        weld = np.arange(len(p), dtype=np.uint32)
        cuts = module.panel_openings(p, t, weld, roles, 0.8)
        np.testing.assert_array_equal(cuts, [[0, 1]])
        fans, _ = corner_components(t, weld, cuts)
        np.testing.assert_array_equal(fans, reconstruct(t, weld, cuts))
        self.assertNotEqual(fans[0, 0], fans[1, 0])
        self.assertEqual(fans[2, 2], fans[3, 1], "Sleeve interface remains sewn")

    def test_keeps_waist_when_either_edge_endpoint_reaches_it(self):
        p = np.array([[0, 0.7, 0], [0, 0.91, 0], [-0.1, 0.8, 0], [0.1, 0.8, 0]])
        t = np.array([[0, 2, 1], [0, 1, 3]], dtype=np.uint32)
        cuts = module.panel_openings(
            p, t, np.arange(4, dtype=np.uint32), np.array([1, 2]), 0.86
        )
        self.assertEqual(len(cuts), 0)

    def test_uv_split_interface_uses_proven_source_welds(self):
        p = np.array(
            [
                [0, 0.2, 0],
                [0, 0.4, 0],
                [-0.1, 0.3, 0],
                [0, 0.2, 0],
                [0, 0.4, 0],
                [0.1, 0.3, 0],
            ]
        )
        t = np.array([[0, 2, 1], [3, 4, 5]], dtype=np.uint32)
        weld = np.array([0, 1, 2, 0, 1, 5], dtype=np.uint32)
        cuts = module.panel_openings(p, t, weld, np.array([1, 2]), 0.86)
        np.testing.assert_array_equal(cuts, [[0, 1]])
        np.testing.assert_array_equal(
            corner_components(t, weld, cuts)[0], reconstruct(t, weld, cuts)
        )


if __name__ == "__main__":
    unittest.main()
