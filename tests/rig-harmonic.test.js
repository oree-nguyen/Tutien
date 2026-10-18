import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("surface interpolation follows connected edges, preserves fixed weights and leaves unanchored components unchanged", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "hon-gioi-harmonic-"),
  );
  try {
    const points = [],
      triangles = [];
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 5; i++) points.push(-0.1 - i * 0.1, 1, row * 0.02);
    for (let i = 0; i < 4; i++)
      triangles.push(i, i + 1, i + 5, i + 1, i + 6, i + 5);
    points.push(-0.3, 1, 10, -0.31, 1, 10, -0.3, 1.01, 10);
    triangles.push(10, 11, 12);
    const positions = new Float32Array(points),
      ids = new Uint16Array(13 * 4),
      weights = new Float32Array(13 * 4),
      locked = new Uint8Array(13);
    for (let i = 0; i < 13; i++) {
      ids[i * 4] = i >= 10 ? 2 : i % 5 === 4 ? 3 : 0;
      weights[i * 4] = 1;
      if (i < 10 && (i % 5 === 0 || i % 5 === 4)) locked[i] = 1;
    }
    for (const [name, array] of Object.entries({
      positions,
      triangles: Uint32Array.from(triangles),
      ids,
      weights,
      protected: locked,
    }))
      await fs.writeFile(
        path.join(directory, name + ".bin"),
        Buffer.from(array.buffer),
      );
    await fs.writeFile(
      path.join(directory, "input.json"),
      JSON.stringify({
        jointNames: [
          "Spine2",
          "RightArm",
          "RightForeArm",
          "RightHand",
          "LeftArm",
          "LeftForeArm",
          "LeftHand",
        ],
      }),
    );
    execFileSync("python3", ["tools/rig/harmonic_body.py", directory], {
      env: { ...process.env, OPENBLAS_NUM_THREADS: "1" },
      timeout: 30000,
    });
    const outputIds = await fs.readFile(path.join(directory, "result-ids.bin")),
      output = await fs.readFile(path.join(directory, "result-weights.bin"));
    const hand = (i) => output.readFloatLE((i * 4 + 3) * 4);
    assert.ok(
      hand(1) > 0 && hand(2) > hand(1) && hand(3) > hand(2) && hand(3) < 1,
    );
    assert.ok(Math.abs((hand(2) + hand(7)) / 2 - 0.5) < 1e-5);
    for (let i = 0; i < 13; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const w = output.readFloatLE((i * 4 + k) * 4);
        assert.ok(w >= 0 && w <= 1);
        sum += w;
        if (locked[i] || i >= 10) {
          assert.equal(w, weights[i * 4 + k]);
          assert.equal(outputIds.readUInt16LE((i * 4 + k) * 2), ids[i * 4 + k]);
        }
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
    }
    assert.deepEqual(
      await fs.readFile(path.join(directory, "positions.bin")),
      Buffer.from(positions.buffer),
    );
    const report = JSON.parse(
      await fs.readFile(path.join(directory, "solve.json")),
    );
    assert.equal(report.reports[1].sourceVertices, 0);
    assert.equal(report.reports[0].sourceVertices, 6);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
