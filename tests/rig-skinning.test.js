import test from "node:test";
import assert from "node:assert/strict";
import { smoothJointWeights } from "../tools/rig/smooth-weights.mjs";
import {
  buildFingerChain,
  evaluateFinger,
  fingerContactMetrics,
} from "../src/rig/grip-solver.js";
import { Vector3 } from "three";

test("weight smoothing preserves normalized four-slot weights, welds UV seams and isolates finger joints", () => {
  const p = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0]);
  const triangles = new Uint32Array([0, 1, 2, 3, 2, 4]);
  const ids = new Uint8Array([
    0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
  ]);
  const weights = new Float32Array([
    1, 0, 0, 0, 1, 0, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
  ]);
  const result = smoothJointWeights(
    p,
    triangles,
    ids,
    weights,
    3,
    new Set([2]),
  );
  assert.ok(result.processedVertexPasses > 0);
  assert.deepEqual([...ids.slice(0, 4)], [...ids.slice(12, 16)]);
  assert.deepEqual([...weights.slice(0, 4)], [...weights.slice(12, 16)]);
  assert.equal(ids[16], 2);
  assert.equal(weights[16], 1);
  for (let i = 0; i < 5; i++) {
    assert.ok(
      Math.abs(weights.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0) - 1) <
        1e-6,
    );
    if (i !== 4)
      for (let k = 0; k < 4; k++)
        assert.ok(
          ids[i * 4 + k] !== 2 || weights[i * 4 + k] === 0,
          "Finger weight leaked into clothing",
        );
  }
});
test("finger FK bends toward the measured palm and never changes segment length", () => {
  const chain = buildFingerChain(
    [
      [0, 0, 0],
      [0, 0.03, 0],
      [0, 0.055, 0],
      [0, 0.075, 0],
    ],
    [0, 0, 1],
  );
  const points = evaluateFinger(chain, [65, 75, 45]);
  for (let i = 0; i < 3; i++)
    assert.ok(
      Math.abs(points[i].distanceTo(points[i + 1]) - [0.03, 0.025, 0.02][i]) <
        1e-10,
    );
  assert.ok(points.at(-1).z > 0);
  assert.deepEqual(
    evaluateFinger(chain, [0, 0, 0]).map((v) => v.toArray()),
    [
      [0, 0, 0],
      [0, 0.03, 0],
      [0, 0.055, 0],
      [0, 0.075, 0],
    ],
  );
});
test("shaft capsule check rejects a segment crossing the shaft despite a far-side fingertip", () => {
  const points = [
    [-0.05, 0, 0],
    [0.05, 0, 0],
    [0.06, 0, 0.02],
    [0.07, 0, 0.03],
  ].map((p) => new Vector3(...p));
  const result = fingerContactMetrics(
    points,
    new Vector3(-1, 0, 0),
    new Vector3(),
    new Vector3(0, 1, 0),
    0.03,
    [0.02, 0.02, 0.02, 0.02],
  );
  assert.ok(result.penetration >= 0.039);
});

test("finger weight support stays on adjacent phalanges instead of pulling the palm with the fingertip", async () => {
  const { phalangeWeights } = await import("../src/rig/finger-weights.js");
  const points = [
    [0, 0, 0],
    [0, 0.03, 0],
    [0, 0.055, 0],
    [0, 0.075, 0],
  ];
  const distances = (segment, t) =>
    [0, 1, 2].map((i) => ({
      distance: i === segment ? 0 : 0.05,
      t: i === segment ? t : 0,
    }));
  assert.deepEqual(phalangeWeights(points, distances(0, 0.1)), [1, 0, 0]);
  assert.deepEqual(phalangeWeights(points, distances(2, 0.9)), [0, 0, 1]);
  const middle = phalangeWeights(points, distances(0, 0.9));
  assert.ok(middle[0] > 0 && middle[1] > 0);
  assert.equal(middle[2], 0);
  assert.ok(Math.abs(middle.reduce((a, b) => a + b, 0) - 1) < 1e-10);
});

test("offline weight fitting repairs an actual stretched edge without changing source positions or fixed influence slots", async () => {
  const { Document } = await import("@gltf-transform/core");
  const { constrainHandWeights } = await import(
    "../tools/rig/constrain-skin.mjs"
  );
  const doc = new Document(),
    hand = doc.createNode("RightHand"),
    finger = doc.createNode("RightHandThumb1");
  hand.addChild(finger);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    skin = { getInverseBindMatrices: () => ({ getElement: () => identity }) };
  const positions = new Float32Array([0, 0.02, 0, 0.001, 0.02, 0]),
    original = positions.slice(),
    ids = new Uint8Array([0, 0, 0, 0, 0, 1, 0, 0]),
    weights = new Float32Array([1, 0, 0, 0, 0.5, 0.5, 0, 0]);
  const beforeIds = ids.slice(),
    report = constrainHandWeights(
      positions,
      new Uint32Array([0, 1, 0]),
      ids,
      weights,
      [hand, finger],
      skin,
      { targetStretch: 1.45, iterations: 120 },
    );
  assert.deepEqual(positions, original);
  assert.deepEqual(ids, beforeIds);
  assert.ok(report.history[0].maximumEdgeStretch > 2);
  assert.ok(report.history.at(-1).maximumEdgeStretch < 1.451);
  assert.ok(weights[5] > 0, "Solver discarded the moving influence entirely");
  assert.ok(Math.abs(weights[4] + weights[5] - 1) < 1e-6);
});

test("constraint fitting keeps coincident UV-seam vertices on identical skin weights", async () => {
  const { Document } = await import("@gltf-transform/core");
  const { constrainHandWeights } = await import(
    "../tools/rig/constrain-skin.mjs"
  );
  const doc = new Document(),
    hand = doc.createNode("RightHand"),
    finger = doc.createNode("RightHandThumb1");
  hand.addChild(finger);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    skin = { getInverseBindMatrices: () => ({ getElement: () => identity }) };
  const positions = new Float32Array([
    0, 0.02, 0, 0.001, 0.02, 0, 0.001, 0.02, 0, 0.002, 0.021, 0,
  ]);
  const ids = new Uint8Array([0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]),
    weights = new Float32Array([
      1, 0, 0, 0, 0.5, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0.2, 0.8, 0, 0,
    ]);
  constrainHandWeights(
    positions,
    new Uint32Array([0, 1, 3, 0, 2, 0]),
    ids,
    weights,
    [hand, finger],
    skin,
    { iterations: 120 },
  );
  assert.deepEqual([...weights.slice(4, 8)], [...weights.slice(8, 12)]);
  assert.deepEqual([...ids.slice(4, 8)], [...ids.slice(8, 12)]);
});
