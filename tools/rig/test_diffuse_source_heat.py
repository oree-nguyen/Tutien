import importlib.util
from pathlib import Path
import unittest
import numpy as np
from scipy.sparse.linalg import spsolve

spec = importlib.util.spec_from_file_location(
    "diffuse_source_heat", Path(__file__).with_name("diffuse-source-heat.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceScreening(unittest.TestCase):
    def test_constant_field_and_physical_scale_invariance(self):
        points = np.array([[0.0, 0, 0], [1.0, 0, 0], [1.0, 1, 0], [0.0, 1, 0]])
        triangles = np.array([[0, 1, 2], [0, 2, 3]])
        a, m = module.screened_operator(points, triangles, 0.2)
        np.testing.assert_allclose(spsolve(a, m), np.ones(4), atol=1e-13)
        b, n = module.screened_operator(points * 7, triangles, 0.2 * 7)
        field = np.array([1.0, 0, 0, 0])
        x = spsolve(a, m * field)
        np.testing.assert_allclose(x, spsolve(b, n * field), atol=1e-13)
        self.assertGreater(x.min(), 0)
        self.assertLess(x.max(), 1)

    def test_screening_keeps_disconnected_source_surfaces_separate(self):
        points = np.array(
            [
                [0.0, 0, 0],
                [1.0, 0, 0],
                [0.0, 1, 0],
                [0.0, 0, 0],
                [1.0, 0, 0],
                [0.0, 1, 0],
            ]
        )
        a, m = module.screened_operator(points, np.array([[0, 1, 2], [3, 4, 5]]), 0.3)
        result = spsolve(a, m * np.array([1.0, 1, 1, 0, 0, 0]))
        np.testing.assert_allclose(result, [1, 1, 1, 0, 0, 0], atol=1e-13)

    def test_isolated_vertices_cannot_receive_invented_weights(self):
        with self.assertRaisesRegex(ValueError, "isolated"):
            module.screened_operator(
                np.array([[0.0, 0, 0], [1.0, 0, 0], [0.0, 1, 0], [5.0, 5, 5]]),
                np.array([[0, 1, 2]]),
                0.2,
            )


if __name__ == "__main__":
    unittest.main()
