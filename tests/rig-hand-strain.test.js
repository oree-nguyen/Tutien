import test from "node:test";
import assert from "node:assert/strict";
import { Vector3, Quaternion } from "three";
import { handStrain } from "../tools/rig/hand-strain.mjs";
const source = [0, 0, 0, 1, 0, 0, 0, 1, 0];
function measure(
  positions = source,
  posed = positions,
  indices = [0, 1, 2],
  mask = [1, 1, 1],
) {
  return handStrain({
    primitive: {
      getAttribute: () => ({ getArray: () => new Float32Array(positions) }),
      getIndices: () => ({ getArray: () => new Uint32Array(indices) }),
    },
    mask: new Uint8Array(mask),
    position: (i) =>
      Array.isArray(posed) ? new Vector3().fromArray(posed, i * 3) : posed(i),
  });
}
test("a fully collapsed triangle fails even with zero upper edge strain", () => {
  const result = measure(source, Array(9).fill(0));
  assert.equal(result.p999, 0);
  assert.equal(result.maximum, 0);
  assert.equal(result.passed, false);
  assert.equal(result.issueCounts.COLLAPSED_TRIANGLE, 1);
  assert.equal(result.issueCounts.COLLAPSED_EDGE, 3);
});
test("collinear posed triangle fails even when all posed edge lengths remain nonzero", () => {
  const result = measure(source, [0, 0, 0, 1, 0, 0, 0.5, 0, 0]);
  assert.equal(result.passed, false);
  assert.equal(result.issueCounts.COLLAPSED_TRIANGLE, 1);
  assert.equal(result.issueCounts.COLLAPSED_EDGE, undefined);
});
test("rigidly rotated source geometry keeps its area; triangle area is not volume proof", () => {
  const rotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 1, 1).normalize(),
    2.4,
  );
  const result = measure(source, (i) =>
    new Vector3().fromArray(source, i * 3).applyQuaternion(rotation),
  );
  assert.equal(result.passed, true);
  assert.ok(Math.abs(result.areaRatios.minimum - 1) < 1e-12);
  assert.match(result.areaRatios.scope, /does not measure volume/);
});
test("existing source degenerate triangles and edges are counted separately from posed defects", () => {
  const positions = [...source, 0, 0, 0];
  const result = measure(
    positions,
    positions,
    [0, 1, 2, 0, 3, 1],
    [1, 1, 1, 1],
  );
  assert.equal(result.passed, true);
  assert.equal(result.triangles, 1);
  assert.equal(result.selectedTriangles, 2);
  assert.equal(result.sourceDiagnostics.SOURCE_DEGENERATE_TRIANGLE, 1);
  assert.equal(result.sourceDiagnostics.SOURCE_DEGENERATE_EDGE, 1);
});
test("a source that contains only degenerate geometry is unmeasurable and fails", () => {
  const result = measure(Array(9).fill(0));
  assert.equal(result.passed, false);
  assert.equal(result.issueCounts.NO_MEASURED_GEOMETRY, 1);
});
test("empty topology, empty selection and invalid indices fail closed", () => {
  for (const result of [
    measure(source, source, []),
    measure(source, source, [0, 1, 2], [0, 0, 0]),
    measure(source, source, [0, 1, 3]),
  ])
    assert.equal(result.passed, false);
});
test("nonfinite source and posed points fail closed without disappearing from the report", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const bad = source.slice();
    bad[3] = value;
    assert.equal(measure(bad, source).passed, false);
    assert.equal(measure(source, bad).passed, false);
  }
});
test("the original upper-stretch limits remain exactly p99.9 1.5 and maximum 2.0", () => {
  const result = measure(
    source,
    source.map((x) => x * 1.6),
  );
  assert.deepEqual(result.thresholds, { p999: 1.5, maximum: 2 });
  assert.equal(result.passed, false);
  assert.ok(result.p999 > 1.5 && result.maximum < 2);
});
