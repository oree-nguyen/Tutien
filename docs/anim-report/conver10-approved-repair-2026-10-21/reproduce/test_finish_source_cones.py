"""Mathematical cone-solver regression fixtures; no person/weapon model is made."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np


class SourceCones(unittest.TestCase):
    def solve(self, directory, impossible=False):
        base = directory / "base"
        previous = directory / "previous"
        base.mkdir()
        previous.mkdir()
        positions = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype="<f4")
        matrices = np.broadcast_to(np.eye(4), (2, 4, 4, 4)).copy()
        matrices[0, 1, 0, 3] = 3
        matrices[1, 1, 2, 3] = 3
        if impossible:
            matrices[1, :, :3, :3] *= 4
        original = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [1, 0, 0, 0]], dtype="<f4")
        files = {
            "positions.bin": positions,
            "triangles.bin": np.array([[0, 1, 2]], dtype="<u4"),
            "source-welds.u32bin": np.arange(3, dtype="<u4"),
            "result-ids.bin": np.tile(np.arange(4, dtype="<u2"), (3, 1)),
            "result-weights.bin": original,
            "protected.bin": np.array([1, 0, 1], dtype="u1"),
            "feasibility-matrices.bin": matrices.transpose(0, 1, 3, 2).astype("<f8"),
        }
        sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
        for name, value in files.items():
            value.tofile(base / name)
        original.tofile(previous / "result-weights.bin")
        (base / "feasibility-input.json").write_text(json.dumps({"poseCount": 2}))
        (previous / "solve.json").write_text(json.dumps({
            "base": str(base), "assetSha256": "mathematical-fixture-no-model",
            "poseFile": "synthetic-two-pose", "poseSha256": "fixture",
            "inputHashes": {name: sha(base / name) for name in files}, "poseCount": 2,
            "outputWeightsSha256": sha(previous / "result-weights.bin"), "parameters": {"hero": "H02"},
        }))
        output = directory / "result"
        result = subprocess.run([sys.executable, str(Path(__file__).with_name("finish-source-cones.py")), str(previous), str(output)], capture_output=True, text=True)
        report = json.loads((output / "solve.json").read_text())
        return result, report, output, matrices, positions, original

    def test_actual_two_pose_lengths_and_frozen_supports_after_local_correction(self):
        with tempfile.TemporaryDirectory(prefix="test-source-cone-", dir=".local/rig-candidates") as temp:
            result, report, output, matrices, points, original = self.solve(Path(temp))
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            weights = np.fromfile(output / "result-weights.bin", "<f4").reshape(3, 4)
            np.testing.assert_array_equal(weights[[0, 2]], original[[0, 2]])
            # Independent uncentered LBS on all3 original triangle edges.
            for matrix in matrices:
                q = sum(weights[:, k, None] * (points @ matrix[k, :3, :3].T + matrix[k, :3, 3]) for k in range(4))
                for a, b in [(0, 1), (1, 2), (2, 0)]:
                    self.assertLessEqual(np.linalg.norm(q[a] - q[b]) / np.linalg.norm(points[a] - points[b]), 1.95001)
            self.assertFalse(report["accepted"])
            self.assertFalse(report["activated"])

    def test_impossible_second_pose_cannot_be_hidden_by_a_local_patch(self):
        with tempfile.TemporaryDirectory(prefix="test-source-cone-", dir=".local/rig-candidates") as temp:
            result, report, output, *_ = self.solve(Path(temp), impossible=True)
            self.assertEqual(result.returncode, 2)
            self.assertFalse(report["outputWritten"])
            self.assertFalse((output / "result-weights.bin").exists())


if __name__ == "__main__":
    unittest.main()
