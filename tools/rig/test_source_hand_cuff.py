import importlib.util
from pathlib import Path
import unittest

import numpy as np
from scipy.sparse import coo_matrix

spec = importlib.util.spec_from_file_location(
    "cuff", Path(__file__).with_name("source-hand-cuff-continuation.py")
)
cuff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cuff)


class CuffContinuationTest(unittest.TestCase):
    def test_nonuniform_chain_matches_independent_arclength_solution(self):
        x = np.array([0, 1, 3, 6, 10, 15], dtype=float) * 0.001
        i = np.arange(len(x) - 1)
        graph = coo_matrix(
            (np.tile(1 / np.diff(x), 2), (np.r_[i, i + 1], np.r_[i + 1, i])),
            shape=(8, 8),
        ).tocsr()
        field = np.tile([0.25, 0.75], (8, 1))
        field[0] = [1, 0]
        field[5] = [0, 1]
        field[6:] = [[0.3, 0.7], [0.8, 0.2]]
        actual, residual = cuff.continue_field(graph, field, np.arange(1, 5))
        np.testing.assert_allclose(actual[:6, 1], x / x[-1], atol=1e-14)
        np.testing.assert_array_equal(actual[6:], field[6:])
        np.testing.assert_array_equal(actual[[0, 5]], field[[0, 5]])
        self.assertLess(residual, 1e-12)

    def test_empty_free_domain_cannot_be_reported_as_a_solve(self):
        with self.assertRaises(AssertionError):
            cuff.continue_field(
                coo_matrix((2, 2)).tocsr(), np.ones((2, 1)), np.array([], dtype=int)
            )


if __name__ == "__main__":
    unittest.main()
