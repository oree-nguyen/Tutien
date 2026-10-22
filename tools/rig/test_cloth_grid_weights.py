import unittest
import numpy as np
from cloth_grid_weights import blend_root, grid_field


class ClothGridTest(unittest.TestCase):
    def test_root_bridge_keeps_all_old_supports_and_only_fills_a_zero_slot(self):
        ids = np.array([[1, 2, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4]], dtype=np.uint16)
        weights = np.array(
            [[0.4, 0.3, 0.3, 0], [0.4, 0.2, 0.2, 0.2], [0.4, 0.3, 0.2, 0.1]]
        )
        result_ids, result_weights = blend_root(
            ids, weights, np.array([0.5, 0.25, 0]), 0
        )
        np.testing.assert_array_equal(result_ids[0], [1, 2, 3, 0])
        np.testing.assert_allclose(result_weights[0], [0.2, 0.15, 0.15, 0.5])
        np.testing.assert_allclose(result_weights[1], [0.55, 0.15, 0.15, 0.15])
        np.testing.assert_array_equal(result_ids[2], ids[2])
        np.testing.assert_array_equal(result_weights[2], weights[2])
        with self.assertRaises(ValueError):
            blend_root(ids[2:], weights[2:], np.array([0.01]), 0)

    def test_bilinear_grid_is_exact_at_joint_rows_and_continuous_across_slot_changes(
        self,
    ):
        chains = [
            dict(name="Cloth_" + face, rows=4, spacing=0.1, anchor=[0, 1, 0])
            for face in ["Front", "Back"]
        ]
        records = [
            dict(chain=chain["name"], row=row, index=side * 4 + row)
            for side, chain in enumerate(chains)
            for row in range(4)
        ]
        points = np.array(
            [[0, 0.8 - 1e-8, 0], [0, 0.8, 0], [0, 0.8 + 1e-8, 0], [0, 0.75, 0.03]]
        )
        ids, weights = grid_field(points, chains, records)
        self.assertEqual(ids.shape, (4, 4))
        np.testing.assert_allclose(weights.sum(1), 1, atol=1e-15)
        self.assertTrue((weights >= 0).all())
        # Independent affine control points; equivalent positions must remain
        # continuous even when integer joint IDs exchange a zero-weight slot.
        controls = np.array(
            [[side, 1 - row * 0.1, row * 0.03] for side in [0, 1] for row in range(4)]
        )
        actual = (controls[ids] * weights[:, :, None]).sum(1)
        np.testing.assert_allclose(actual[1], [0.5, 0.8, 0.06], atol=1e-14)
        self.assertLess(np.linalg.norm(actual[0] - actual[2]), 3e-8)
        np.testing.assert_allclose(actual[3], [0, 0.75, 0.075], atol=1e-14)

    def test_open_source_layers_keep_their_own_chains_without_cross_blending(self):
        chains = [
            dict(name="Cloth_" + face, rows=4, spacing=0.1, anchor=[0, 1, 0])
            for face in ["Front", "Back"]
        ]
        records = [
            dict(chain=chain["name"], row=row, index=side * 4 + row)
            for side, chain in enumerate(chains)
            for row in range(4)
        ]
        p = np.array([[0, 0.75, 0], [0, 0.75, 0]])
        ids, weights = grid_field(p, chains, records, np.array([1, 2]))
        self.assertEqual(set(ids[0][weights[0] > 0]), {2, 3})
        self.assertEqual(set(ids[1][weights[1] > 0]), {6, 7})
        np.testing.assert_allclose(weights.sum(1), 1, atol=1e-15)


if __name__ == "__main__":
    unittest.main()
