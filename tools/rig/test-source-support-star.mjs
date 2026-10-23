import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceSupportStar,
  assertSourceFanSkin,
} from "./source-support-star.mjs";

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
