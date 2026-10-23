import unittest
import numpy as np
from pose_weight_fit import simplex


class WeightSimplexTest(unittest.TestCase):
    def test_continuation_archive_is_lossless_hash_bound_and_rejects_missing_members(
        self,
    ):
        import tempfile
        from pathlib import Path
        from pose_weight_fit import save_optimizer_state, read_optimizer_state

        rng = np.random.default_rng(22)
        expected = [
            rng.normal(size=(17, 4)),
            rng.normal(size=(17, 4)),
            rng.normal(size=(2, 13, 3)),
        ]
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for archive in [False, True]:
                hashes = save_optimizer_state(directory, *expected, archive=archive)
                actual = read_optimizer_state(directory, hashes)
                for a, b in zip(actual, expected):
                    np.testing.assert_array_equal(a, b)
                wrong = dict(hashes)
                wrong[next(iter(wrong))] = "0" * 64
                with self.assertRaises(ValueError):
                    read_optimizer_state(directory, wrong)
            with self.assertRaises(ValueError):
                read_optimizer_state(directory, {})

    def test_projection_preserves_already_feasible_supports(self):
        rows = np.array([[0.1, 0.2, 0.3, 0.4], [0, 0, 0, 1]], float)
        np.testing.assert_allclose(simplex(rows), rows, atol=1e-15)

    def test_negative_and_overflowing_weights_project_to_feasible_boundary(self):
        actual = simplex(np.array([[-2, 4, 1, -3], [0.7, 0.7, -0.1, -0.1]]))
        np.testing.assert_allclose(actual, [[0, 1, 0, 0], [0.5, 0.5, 0, 0]], atol=1e-15)
        self.assertTrue((actual >= 0).all())
        np.testing.assert_allclose(actual.sum(1), 1, atol=1e-15)

    def test_projection_obeys_euclidean_optimality_and_common_shift_invariance(self):
        rng = np.random.default_rng(1234)
        value = rng.normal(size=(100, 4))
        point = simplex(value)
        alternative = rng.dirichlet(np.ones(4), size=100)
        self.assertTrue(
            (np.sum((value - point) * (alternative - point), axis=1) < 1e-12).all()
        )
        np.testing.assert_allclose(simplex(value + 3), point, atol=1e-14)


class MultiPoseCoefficients(unittest.TestCase):
    def test_all_pose_matrices_contribute_and_adjoint_matches_finite_difference(self):
        from pose_weight_fit import transformed_coefficients

        points = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
        ids = np.array([[0, 1, 2, 3], [1, 2, 3, 0]])
        matrices = np.broadcast_to(np.eye(4), (2, 4, 4, 4)).copy()
        for pose in range(2):
            for joint in range(4):
                matrices[pose, joint, :3, 3] = np.array(
                    [joint * 0.1, pose * joint * 0.3, -joint * 0.2]
                )
        origin, coeff = transformed_coefficients(points, ids, matrices)
        weights = np.array([[0.1, 0.2, 0.3, 0.4], [0.2, 0.3, 0.1, 0.4]])
        actual = origin + np.einsum("pnkj,nk->pnj", coeff, weights)
        for pose in range(2):
            for vertex in range(2):
                expected = sum(
                    weights[vertex, k]
                    * (
                        matrices[pose, ids[vertex, k], :3, :3] @ points[vertex]
                        + matrices[pose, ids[vertex, k], :3, 3]
                    )
                    for k in range(4)
                )
                np.testing.assert_allclose(actual[pose, vertex], expected, atol=1e-14)
        gradient = np.einsum("pnkj,pnj->nk", coeff, actual)
        delta = np.array([[0.3, -0.2, 0.1, -0.2], [0.1, -0.3, 0.4, -0.2]])
        eps = 1e-6

        def energy(w):
            return 0.5 * np.square(origin + np.einsum("pnkj,nk->pnj", coeff, w)).sum()

        self.assertAlmostEqual(
            float(
                (energy(weights + eps * delta) - energy(weights - eps * delta))
                / (2 * eps)
            ),
            float((gradient * delta).sum()),
            places=8,
        )

    def test_cli_cannot_drop_an_impossible_second_pose(self):
        import hashlib, json, shutil, subprocess, tempfile, sys, uuid
        from pathlib import Path

        with tempfile.TemporaryDirectory(
            prefix="test-cp-", dir=".local/rig-candidates"
        ) as temporary:
            base = Path(temporary)
            output = Path(".local/rig-candidates/test-cp-result-" + uuid.uuid4().hex)
            try:
                positions = np.array(
                    [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], dtype="<f4"
                )
                matrices = np.broadcast_to(np.eye(4), (2, 4, 4, 4)).copy()
                matrices[1, :, :3, :3] *= 3
                files = {
                    "positions.bin": positions,
                    "triangles.bin": np.array([[0, 1, 2], [0, 2, 3]], dtype="<u4"),
                    "source-welds.u32bin": np.arange(4, dtype="<u4"),
                    "result-ids.bin": np.tile(np.arange(4, dtype="<u2"), (4, 1)),
                    "result-weights.bin": np.full((4, 4), 0.25, dtype="<f4"),
                    "protected.bin": np.zeros(4, dtype="u1"),
                    "feasibility-matrices.bin": matrices.transpose(0, 1, 3, 2).astype(
                        "<f8"
                    ),
                }
                for name, value in files.items():
                    value.tofile(base / name)
                raw = b"hash-only fixture; no renderer asset"
                (base / "H02-C0-rigged.glb").write_bytes(raw)
                sha = hashlib.sha256(raw).hexdigest()
                (base / "receipt.json").write_text(json.dumps({"sha256": sha}))
                (base / "feasibility-input.json").write_text(
                    json.dumps(
                        {
                            "assetSha256": sha,
                            "poseCount": 2,
                            "matricesSha256": hashlib.sha256(
                                (base / "feasibility-matrices.bin").read_bytes()
                            ).hexdigest(),
                            "poseFile": "two-pose-fixture",
                            "poseSha256": "fixture",
                        }
                    )
                )
                result = subprocess.run(
                    [
                        sys.executable,
                        "tools/rig/pose_weight_fit.py",
                        str(base),
                        str(output),
                        "--hero",
                        "H02",
                        "--whole-body",
                        "--iterations",
                        "2",
                        "--archive-state",
                    ],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                report = json.loads((output / "solve.json").read_text())
                self.assertEqual(report["poseCount"], 2)
                self.assertEqual(len(report["final"]["poses"]), 2)
                self.assertAlmostEqual(report["final"]["maximum"], 3, places=12)
                self.assertGreater(report["final"]["immutableEdgesOverTarget"], 0)
                self.assertFalse(report["accepted"])
                self.assertFalse(report["activated"])
                self.assertEqual(set(report["stateHashes"]), {"optimizer-state.npz"})
                original_solve = (output / "solve.json").read_bytes()
                overwrite = subprocess.run(result.args, capture_output=True, text=True)
                self.assertNotEqual(overwrite.returncode, 0)
                self.assertEqual((output / "solve.json").read_bytes(), original_solve)
                resumed = subprocess.run(
                    result.args + ["--resume"], capture_output=True, text=True
                )
                self.assertEqual(resumed.returncode, 0, resumed.stderr)
                replay = json.loads((output / "solve.json").read_text())
                self.assertEqual(replay["poseCount"], 2)
                self.assertAlmostEqual(replay["final"]["maximum"], 3, places=12)
            finally:
                shutil.rmtree(output, ignore_errors=True)


class WeightedProjection(unittest.TestCase):
    def test_free_operator_steps_obey_independent_spectral_bound_without_fixed_slot_inflation(
        self,
    ):
        from pose_weight_fit import diagonal_steps

        rng = np.random.default_rng(12)
        coeff = rng.normal(size=(2, 4, 4, 3))
        edges = np.array([[0, 1], [1, 2], [2, 3]])
        length = np.array([0.1, 0.2, 0.3])
        free = np.array([False, True, True, False])
        coeff[:, ~free] *= 1e8
        tau, sigma, _ = diagonal_steps(coeff, edges, length, free)
        # Assemble the Jacobian independently, omitting every locked column.
        variables = [(v, k) for v in np.flatnonzero(free) for k in range(4)]
        operator = np.zeros((2 * len(edges) * 3, len(variables)))
        for pose in range(2):
            for e, (a, b) in enumerate(edges):
                for c, (v, k) in enumerate(variables):
                    if v == a:
                        operator[
                            (pose * len(edges) + e)
                            * 3 : (pose * len(edges) + e + 1)
                            * 3,
                            c,
                        ] += (
                            coeff[pose, v, k] / length[e]
                        )
                    if v == b:
                        operator[
                            (pose * len(edges) + e)
                            * 3 : (pose * len(edges) + e + 1)
                            * 3,
                            c,
                        ] -= (
                            coeff[pose, v, k] / length[e]
                        )
        scaled = (
            np.sqrt(np.repeat(sigma, 3).reshape(-1, 1))
            * operator
            * np.sqrt(tau[free].reshape(1, -1))
        )
        self.assertLess(np.linalg.svd(scaled, compute_uv=False)[0], 1)
        baseline = sigma.copy()
        coeff[:, ~free] *= 1e8
        np.testing.assert_array_equal(
            diagonal_steps(coeff, edges, length, free)[1], baseline
        )

    def test_weighted_projection_satisfies_independent_kkt_and_equal_steps_limit(self):
        from pose_weight_fit import weighted_simplex

        rng = np.random.default_rng(456)
        values = rng.normal(size=(100, 4))
        steps = np.exp(rng.normal(size=(100, 4)) * 2)
        result = weighted_simplex(values, steps)
        self.assertTrue((result >= 0).all())
        np.testing.assert_allclose(result.sum(1), 1, atol=1e-12)
        for row, v, t in zip(result, values, steps):
            active = row > 1e-10
            gradient = (row - v) / t
            level = gradient[active].mean()
            np.testing.assert_allclose(gradient[active], level, atol=1e-10)
            self.assertTrue((gradient[~active] >= level - 1e-10).all())
        np.testing.assert_allclose(
            weighted_simplex(values, np.ones_like(values) * 0.7),
            simplex(values),
            atol=1e-13,
        )
        with self.assertRaises(ValueError):
            weighted_simplex(values, np.zeros_like(values))


if __name__ == "__main__":
    unittest.main()
