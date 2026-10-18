import test from "node:test";
import assert from "node:assert/strict";
import {
  partitionTriangles,
  repairHangingRobe,
} from "../tools/rig/garment-separation.mjs";
test("garment partition preserves every original oriented triangle exactly once", () => {
  const indices = new Uint32Array([0, 1, 2, 2, 1, 3, 0, 3, 4]);
  const result = partitionTriangles(indices, new Uint8Array([1, 1, 0, 0, 0]));
  assert.deepEqual([...result.garment], [0, 1, 2]);
  assert.deepEqual([...result.remainder], [2, 1, 3, 0, 3, 4]);
  assert.deepEqual([...indices], [0, 1, 2, 2, 1, 3, 0, 3, 4]);
});
test("hanging robe weight trial preserves remote hands and normalized finite weights", () => {
  const pos = new Float32Array([0, 0.6, 0, -0.5, 1.02, 0]);
  const ids = new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const weights = new Float32Array([0.4, 0.3, 0.2, 0.1, 0.4, 0.3, 0.2, 0.1]);
  const out = repairHangingRobe(pos, ids, weights, 0);
  assert.equal(out.changed, 1);
  assert.equal(out.ids[0], 0);
  assert.equal(out.weights[0], 1);
  assert.deepEqual(out.ids.slice(4), ids.slice(4));
  assert.deepEqual(out.weights.slice(4), weights.slice(4));
  for (let i = 0; i < 2; i++)
    assert(
      Math.abs(
        out.weights.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0) - 1,
      ) < 1e-6,
    );
  assert.equal(ids[0], 1);
});

import {
  splitRobePanels,
  compactTriangleIndices,
} from "../tools/rig/robe-panels.mjs";
test("lower left/right panels exclude the torso and distant sleeves", () => {
  const positions = new Float32Array([
    0.1, 0.5, 0, 0.2, 0.5, 0, 0.1, 0.6, 0, -0.1, 0.5, 0, -0.2, 0.5, 0, -0.1,
    0.6, 0, 0.1, 1.1, 0, 0.2, 1.1, 0, 0.1, 1.2, 0, 0.4, 0.5, 0, 0.5, 0.5, 0,
    0.4, 0.6, 0,
  ]);
  const ids = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const split = splitRobePanels(positions, ids);
  assert.deepEqual([...split.left], [0, 1, 2]);
  assert.deepEqual([...split.right], [3, 4, 5]);
  assert.deepEqual([...split.upper], [6, 7, 8, 9, 10, 11]);
});
test("compact disconnected panels reproduce source indices exactly without unused vertices", () => {
  const input = new Uint32Array([100, 42, 60, 60, 42, 99]);
  const compact = compactTriangleIndices(input);
  assert.deepEqual([...compact.sourceVertices], [100, 42, 60, 99]);
  assert.deepEqual([...compact.indices], [0, 1, 2, 2, 1, 3]);
  assert.deepEqual(
    [...compact.indices].map((i) => compact.sourceVertices[i]),
    [...input],
  );
  assert.throws(() => splitRobePanels([], [], { waistY: 0, hemY: 1 }));
});

test("panel mask returns inner garment to remainder without losing source triangles", () => {
  const p = new Float32Array([
    0.1, 0.5, 0, 0.2, 0.5, 0, 0.1, 0.6, 0, -0.1, 0.5, 0, -0.2, 0.5, 0, -0.1,
    0.6, 0,
  ]);
  const result = splitRobePanels(p, new Uint32Array([0, 1, 2, 3, 4, 5]), {
    panelMask: new Uint8Array([1, 1, 1, 0, 0, 0]),
  });
  assert.deepEqual([...result.left], [0, 1, 2]);
  assert.deepEqual([...result.remainder], [3, 4, 5]);
  assert.equal(
    Object.values(result).reduce((n, a) => n + a.length, 0),
    6,
  );
});
