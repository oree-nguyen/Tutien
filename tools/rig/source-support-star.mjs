import assert from "node:assert/strict";

export function assertSourceFanSkin(fans, positions, ids, weights, selected) {
  assert.equal(positions.length, fans.length * 3);
  assert.equal(ids.length, fans.length * 4);
  assert.equal(weights.length, ids.length);
  const needed = new Set(selected),
    signatures = new Map();
  for (let v = 0; v < fans.length; v++) {
    if (!needed.has(fans[v])) continue;
    const jointWeights = new Map();
    for (let k = 0; k < 4; k++) {
      const id = ids[v * 4 + k],
        w = weights[v * 4 + k];
      assert(Number.isFinite(w) && w >= 0);
      if (w) jointWeights.set(id, (jointWeights.get(id) ?? 0) + w);
    }
    const value = {
      position: Array.from(positions.subarray(v * 3, v * 3 + 3)),
      skin: [...jointWeights].sort((a, b) => a[0] - b[0]),
    };
    if (signatures.has(fans[v]))
      assert.deepEqual(
        signatures.get(fans[v]),
        value,
        "One kept source fan has conflicting geometry or skin fields",
      );
    else signatures.set(fans[v], value);
  }
  assert.equal(signatures.size, needed.size, "Missing selected source fan");
  return { sourceFans: signatures.size, allSelectedFanCopiesExact: true };
}

/** Complete triangle star of explicit source fans, not a spatial ROI crop.
 * Includes the fixed neighbor on every incident edge. Coincident positions
 * never merge independent cut fans. Numerical layout only: no exported cut.
 */
export function sourceSupportStar(triangles, fans, active) {
  const activeFans = new Set(active),
    selected = [],
    representatives = [],
    ids = [],
    index = new Map();
  const vertex = (v) => {
    assert(
      Number.isInteger(v) && v >= 0 && v < fans.length,
      "Invalid source vertex",
    );
    const fan = fans[v];
    if (!index.has(fan)) {
      index.set(fan, index.size);
      representatives.push(v);
      ids.push(fan);
    }
    return index.get(fan);
  };
  const compact = [];
  assert.equal(triangles.length % 3, 0);
  for (let at = 0; at < triangles.length; at += 3) {
    const row = triangles.subarray(at, at + 3);
    for (const v of row) assert(v < fans.length);
    if (!Array.from(row).some((v) => activeFans.has(fans[v]))) continue;
    selected.push(at / 3);
    for (const v of row) compact.push(vertex(v));
  }
  assert(selected.length, "Empty source edge star");
  for (const fan of activeFans)
    assert(index.has(fan), "Active source fan has no source face");
  return {
    representatives: Uint32Array.from(representatives),
    fans: Uint32Array.from(ids),
    triangles: Uint32Array.from(compact),
    sourceFaces: Uint32Array.from(selected),
  };
}
