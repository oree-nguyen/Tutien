"""Structural solver regressions; synthetic surfaces are not rig acceptance."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np


class SourceHandIslandsTest(unittest.TestCase):
    def test_source_connectivity_and_seed_ownership_survive_uv_copies(self):
        root = Path(".local/rig-candidates")
        root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="unit-hand-islands-", dir=root) as temp:
            directory = Path(temp).resolve().relative_to(Path.cwd())
            base = directory / "input"
            canonical = directory / "canonical"
            base.mkdir()
            canonical.mkdir()
            names = ["Hips"]
            for side in ["Left", "Right"]:
                names += [side + "Hand"] + [
                    side + "Hand" + f + str(k)
                    for f in ["Thumb", "Index", "Middle", "Ring", "Pinky"]
                    for k in [1, 2, 3]
                ]
            points, triangles, hands = [], [], []
            for side, sign in [("Left", 1), ("Right", -1)]:
                start = len(points)
                points += [
                    [sign * (0.5 + x * 0.002), 1 + y * 0.002, 0.1]
                    for y in range(5)
                    for x in range(5)
                ]
                for y in range(4):
                    for x in range(4):
                        a = start + y * 5 + x
                        triangles += [[a, a + 1, a + 5], [a + 1, a + 6, a + 5]]
                seed_vertices = [start + 24] + [start + i for i in range(15)]
                joints = [n for n in names if n.startswith(side)]
                hands.append(
                    {
                        "side": side,
                        "seeds": [
                            {"joint": n, "originalSourceVertexIDs": [v]}
                            for n, v in zip(joints, seed_vertices)
                        ],
                    }
                )
            # A disconnected coincident triangle must not be absorbed by position.
            points += [points[0], [0.5, 1, 0.11], [0.5, 1.01, 0.11]]
            triangles.append([50, 51, 52])
            fans = np.arange(len(points), dtype="<u4")
            welds = fans.copy()
            points.append(points[1])
            fans = np.r_[fans, np.uint32(1)].astype("<u4")
            welds = np.r_[welds, np.uint32(1)].astype("<u4")
            triangles[0][1] = 53
            p = np.asarray(points, dtype="<f4")
            ids = np.zeros((len(p), 4), dtype="<u2")
            weights = np.zeros((len(p), 4), dtype="<f4")
            weights[:, 0] = 1
            for hand in hands:
                for seed in hand["seeds"]:
                    v = seed["originalSourceVertexIDs"][0]
                    ids[welds == v, 0] = names.index(seed["joint"])
            files = {
                "positions.f32bin": p,
                "ids.u16bin": ids,
                "weights.f32bin": weights,
                "fans.u32bin": fans,
                "welds.u32bin": welds,
                "triangles.u32bin": np.asarray(triangles, dtype="<u4"),
            }
            for name, data in files.items():
                data.tofile(base / name)
            p.tofile(canonical / "positions.bin")
            welds.tofile(canonical / "source-welds.u32bin")
            asset = directory / "opaque-source-hash-only.bin"
            asset.write_bytes(b"unit numerical input; not a GLB acceptance fixture")
            digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
            meta = {
                "input": str(asset),
                "inputSha256": digest(asset),
                "jointNames": names,
                "files": {n: digest(base / n) for n in files},
            }
            (base / "input.json").write_text(json.dumps(meta))
            seeds = directory / "seeds.json"
            seeds.write_text(json.dumps({"hands": hands}))
            output = directory / "result"
            command = [
                sys.executable,
                "tools/rig/source-hand-islands.py",
                str(base),
                str(output),
                "--canonical",
                str(canonical),
                "--seeds",
                str(seeds),
            ]
            completed = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            actual_ids = np.fromfile(output / "ids.u16bin", "<u2").reshape(-1, 4)
            actual_weights = np.fromfile(output / "weights.f32bin", "<f4").reshape(
                -1, 4
            )
            np.testing.assert_array_equal(actual_ids[50:53], ids[50:53])
            np.testing.assert_array_equal(actual_weights[50:53], weights[50:53])
            np.testing.assert_array_equal(actual_ids[1], actual_ids[53])
            np.testing.assert_array_equal(actual_weights[1], actual_weights[53])
            for hand in hands:
                for seed in hand["seeds"]:
                    v = seed["originalSourceVertexIDs"][0]
                    joint = names.index(seed["joint"])
                    self.assertEqual(actual_weights[v, actual_ids[v] == joint].sum(), 1)
            for selected in [np.arange(25), np.arange(25, 50)]:
                self.assertFalse(
                    np.any((actual_ids[selected] == 0) & (actual_weights[selected] > 0))
                )
            report = json.loads((output / "solve.json").read_text())
            self.assertFalse(report["accepted"])
            self.assertFalse(report["activated"])
            # A stale binary is rejected before another output can be created.
            with (base / "fans.u32bin").open("ab") as handle:
                handle.write(b"changed")
            command[3] = str(directory / "stale-result")
            stale = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(stale.returncode, 0)
            self.assertIn("Changed input", stale.stderr)


if __name__ == "__main__":
    unittest.main()
