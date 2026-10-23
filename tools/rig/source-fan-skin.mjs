import assert from "node:assert/strict";

/** A kept source fan is one skin point even across mesh/material boundaries.
 * Never propagate by nearest position, source weld alone, color or node name:
 * intentionally cut source fans may have independent cloth motion.
 */
export function replaceSourceFanSkin(
  doc,
  primitive,
  ids,
  weights,
  touched,
  extra,
) {
  const fans = primitive.getAttribute("_SOURCE_CUT_WELD").getArray();
  assert.equal(fans.length, touched.length);
  assert.equal(ids.length, touched.length * 4);
  assert.equal(weights.length, ids.length);
  const field = new Map();
  for (let v = 0; v < touched.length; v++)
    if (touched[v]) {
      const row = {
        ids: ids.slice(v * 4, v * 4 + 4),
        weights: weights.slice(v * 4, v * 4 + 4),
      };
      const previous = field.get(fans[v]);
      if (previous) {
        assert.deepEqual(
          previous.ids,
          row.ids,
          "Conflicting IDs on one kept source fan",
        );
        assert.deepEqual(
          previous.weights,
          row.weights,
          "Conflicting weights on one kept source fan",
        );
      } else field.set(fans[v], row);
    }
  if (extra) {
    assert.equal(extra.ids.length, extra.fans.length * 4);
    assert.equal(extra.weights.length, extra.ids.length);
    for (let v = 0; v < extra.fans.length; v++) {
      const fan = extra.fans[v];
      assert(Number.isInteger(fan) && fan >= 0);
      assert(
        !field.has(fan),
        "Supplementary fan conflicts with a hand/core field",
      );
      const row = {
        ids: extra.ids.slice(v * 4, v * 4 + 4),
        weights: extra.weights.slice(v * 4, v * 4 + 4),
      };
      assert(row.weights.every((w) => Number.isFinite(w) && w >= 0 && w <= 1));
      assert(Math.abs(row.weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
      field.set(fan, row);
    }
  }
  const report = [];
  const replaced = new Set(),
    seen = new Set();
  for (const mesh of doc.getRoot().listMeshes())
    for (const [index, p] of mesh.listPrimitives().entries()) {
      const f = p.getAttribute("_SOURCE_CUT_WELD").getArray();
      const oldIds = p.getAttribute("JOINTS_0").getArray();
      const oldWeights = p.getAttribute("WEIGHTS_0").getArray();
      const nextIds = oldIds.slice(),
        nextWeights = oldWeights.slice();
      let affected = 0;
      for (let v = 0; v < f.length; v++) {
        const row = field.get(f[v]);
        if (!row) continue;
        seen.add(f[v]);
        nextIds.set(row.ids, v * 4);
        nextWeights.set(row.weights, v * 4);
        affected++;
      }
      // Copy-on-write also handles shared glTF accessors without alias edits.
      if (affected) {
        replaced.add(p.getAttribute("JOINTS_0"));
        replaced.add(p.getAttribute("WEIGHTS_0"));
        p.setAttribute(
          "JOINTS_0",
          p.getAttribute("JOINTS_0").clone().setArray(nextIds),
        );
        p.setAttribute(
          "WEIGHTS_0",
          p.getAttribute("WEIGHTS_0").clone().setArray(nextWeights),
        );
      }
      for (let v = 0; v < f.length; v++)
        if (!field.has(f[v])) {
          assert.deepEqual(
            nextIds.subarray(v * 4, v * 4 + 4),
            oldIds.subarray(v * 4, v * 4 + 4),
          );
          assert.deepEqual(
            nextWeights.subarray(v * 4, v * 4 + 4),
            oldWeights.subarray(v * 4, v * 4 + 4),
          );
        }
      report.push({
        mesh: mesh.getName(),
        primitive: index,
        affectedVertices: affected,
      });
    }
  assert.equal(
    seen.size,
    field.size,
    "Supplementary field references an absent source fan",
  );
  for (const accessor of replaced)
    if (
      accessor.listParents().every((parent) => parent.propertyType === "Root")
    )
      accessor.dispose();
  return { sourceFans: field.size, primitives: report };
}
