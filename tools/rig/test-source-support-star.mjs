import test from "node:test";
import assert from "node:assert/strict";
import { sourceHandDomains } from "./source-hand-domains.mjs";
import {
  sourceSupportStar,
  assertSourceFanSkin,
  localizeEmptyArmSlots,
} from "./source-support-star.mjs";

test("recorded hand domains keep all UV copies and reject missing, mixed or overlapping seeds", () => {
  const fans = Uint32Array.from([10, 20, 30, 10, 40, 50, 60, 70, 80]);
  const triangles = Uint32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const touched = new Uint8Array(fans.length).fill(1);
  const hand = (side, seeds, vertices) => ({
    side,
    vertices,
    measuredSeeds: [{ currentSourceFans: seeds }],
  });
  const domains = sourceHandDomains(fans, triangles, touched, [
    hand("Left", [10, 20], 6),
    hand("Right", [60], 3),
  ]);
  assert.deepEqual(Array.from(domains[0].mask), [1, 1, 1, 1, 1, 1, 0, 0, 0]);
  assert.throws(
    () => sourceHandDomains(fans, triangles, touched, [hand("Left", [99], 6)]),
    /Missing/,
  );
  assert.throws(
    () =>
      sourceHandDomains(fans, triangles, touched, [hand("Left", [10, 60], 6)]),
    /disagree/,
  );
  assert.throws(
    () =>
      sourceHandDomains(fans, triangles, touched, [
        hand("Left", [10], 6),
        hand("Right", [20], 6),
      ]),
    /overlap/,
  );
});

test("empty local finger supports survive while empty leg/opposite-side supports are removed", () => {
  const names = [
    "LeftHand",
    "LeftHandIndex1",
    "LeftHandIndex3",
    "LeftHandIndex2",
    "LeftUpLeg",
    "RightHand",
  ];
  const ids = Uint16Array.from([0, 1, 2, 3]),
    weights = Float32Array.from([0.94, 0, 0.06, 0]);
  assert.equal(localizeEmptyArmSlots(ids, weights, names), 0);
  assert.deepEqual(Array.from(ids), [0, 1, 2, 3]);
  const wrong = Uint16Array.from([0, 4, 2, 5]);
  assert.equal(localizeEmptyArmSlots(wrong, weights, names), 2);
  assert.deepEqual(Array.from(wrong), [0, 0, 2, 0]);
  const active = Uint16Array.from([0, 4, 2, 5]);
  assert.equal(
    localizeEmptyArmSlots(
      active,
      Float32Array.from([0.9, 0.02, 0.06, 0.02]),
      names,
    ),
    0,
  );
  assert.deepEqual(Array.from(active), [0, 4, 2, 5]);
  assert.equal(
    localizeEmptyArmSlots(
      Uint16Array.from([0, 1, 2, 3]),
      Float32Array.from([0.25, 0.25, 0.25, 0.25]),
      ["Hips", "Spine", "LeftUpLeg", "RightUpLeg"],
    ),
    0,
  );
});

test("fan compaction accepts only equivalent skin fields, without coordinate stitching", () => {
  const fans = Uint32Array.from([1, 1, 2]),
    p = new Float32Array(9),
    ids = Uint16Array.from([9, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0]),
    w = Float32Array.from([1, 0, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0]);
  assert.equal(assertSourceFanSkin(fans, p, ids, w, [1]).sourceFans, 1);
  ids[4] = 8;
  assert.throws(() => assertSourceFanSkin(fans, p, ids, w, [1]), /conflicting/);
});

test("source star retains boundary-crossing triangles and UV fan copies without merging independent cuts", () => {
  const fans = Uint32Array.from([10, 20, 30, 10, 40, 50, 60, 70]);
  const triangles = Uint32Array.from([0, 1, 2, 3, 4, 5, 2, 6, 7]);
  const star = sourceSupportStar(triangles, fans, [10]);
  assert.deepEqual(Array.from(star.sourceFaces), [0, 1]);
  assert.deepEqual(Array.from(star.fans), [10, 20, 30, 40, 50]);
  assert.deepEqual(Array.from(star.triangles), [0, 1, 2, 0, 3, 4]);
  // Fixed fan30 is retained, although it is not selected for fitting.
  assert(star.fans.includes(30));
  assert(!star.fans.includes(60));
  const other = sourceSupportStar(triangles, fans, [40]);
  assert.deepEqual(Array.from(other.sourceFaces), [1]);
});

test("source star rejects nonexistent active fans and invalid source indices", () => {
  assert.throws(
    () =>
      sourceSupportStar(
        Uint32Array.from([0, 1, 2]),
        Uint32Array.from([1, 2, 3]),
        [99],
      ),
    /Empty|no source face/,
  );
  assert.throws(() =>
    sourceSupportStar(
      Uint32Array.from([0, 1, 3]),
      Uint32Array.from([1, 2, 3]),
      [1],
    ),
  );
});
