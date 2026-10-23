import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { replaceSourceFanSkin } from "./source-fan-skin.mjs";

test("kept seam follows identical fan across primitives; coincident cut and unrelated rows remain byte exact", () => {
  const doc = new Document(),
    buffer = doc.createBuffer();
  const attr = (name, type, array) =>
    doc.createAccessor(name, buffer).setType(type).setArray(array);
  const primitive = (name, fans) => {
    const p = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        attr(
          "coincident-source-points",
          "VEC3",
          new Float32Array(fans.length * 3),
        ),
      )
      .setAttribute(
        "_SOURCE_CUT_WELD",
        attr("fan", "SCALAR", Uint32Array.from(fans)),
      )
      .setAttribute(
        "JOINTS_0",
        attr("ids", "VEC4", new Uint16Array(fans.length * 4)),
      )
      .setAttribute(
        "WEIGHTS_0",
        attr("w", "VEC4", Float32Array.from(fans.flatMap(() => [1, 0, 0, 0]))),
      );
    doc.createMesh(name).addPrimitive(p);
    return p;
  };
  const a = primitive("hand", [10, 11, 12]);
  const b = primitive("cuff", [10, 30, 31]);
  const c = primitive("intentionally-cut-flap", [40, 41, 42]);
  const untouched = c.getAttribute("WEIGHTS_0").getArray().slice();
  const ids = Uint16Array.from([9, 8, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0]);
  const weights = Float32Array.from([
    0.75, 0.25, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0,
  ]);
  const result = replaceSourceFanSkin(
    doc,
    a,
    ids,
    weights,
    Uint8Array.from([1, 1, 0]),
  );
  assert.equal(result.sourceFans, 2);
  assert.equal(result.primitives[1].affectedVertices, 1);
  assert.deepEqual(
    b.getAttribute("WEIGHTS_0").getElement(0, []),
    [0.75, 0.25, 0, 0],
  );
  assert.deepEqual(b.getAttribute("JOINTS_0").getElement(0, []), [9, 8, 0, 0]);
  assert.deepEqual(b.getAttribute("WEIGHTS_0").getElement(1, []), [1, 0, 0, 0]);
  assert.deepEqual(c.getAttribute("WEIGHTS_0").getArray(), untouched);
});

test("supplementary cuff supports propagate by fan and cannot overwrite fixed hand fields", () => {
  const doc = new Document(),
    buffer = doc.createBuffer();
  const p = doc.createPrimitive();
  p.setAttribute(
    "_SOURCE_CUT_WELD",
    doc
      .createAccessor("fan", buffer)
      .setType("SCALAR")
      .setArray(Uint32Array.from([10, 11, 12])),
  );
  p.setAttribute(
    "JOINTS_0",
    doc
      .createAccessor("ids", buffer)
      .setType("VEC4")
      .setArray(new Uint16Array(12)),
  );
  p.setAttribute(
    "WEIGHTS_0",
    doc
      .createAccessor("w", buffer)
      .setType("VEC4")
      .setArray(Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])),
  );
  doc.createMesh().addPrimitive(p);
  const ids = Uint16Array.from([9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    weights = p.getAttribute("WEIGHTS_0").getArray().slice(),
    touched = Uint8Array.from([1, 0, 0]);
  const extra = {
    fans: Uint32Array.from([11]),
    ids: Uint16Array.from([9, 52, 0, 0]),
    weights: Float32Array.from([0.5, 0.5, 0, 0]),
  };
  const result = replaceSourceFanSkin(doc, p, ids, weights, touched, extra);
  assert.equal(result.sourceFans, 2);
  assert.deepEqual(p.getAttribute("JOINTS_0").getElement(1, []), [9, 52, 0, 0]);
  assert.deepEqual(
    p.getAttribute("WEIGHTS_0").getElement(1, []),
    [0.5, 0.5, 0, 0],
  );
  assert.throws(
    () =>
      replaceSourceFanSkin(doc, p, ids, weights, touched, {
        ...extra,
        fans: Uint32Array.from([10]),
      }),
    /conflicts/,
  );
});

test("conflicting proposed fields on one kept source fan fail before mutation", () => {
  const doc = new Document(),
    buffer = doc.createBuffer();
  const p = doc.createPrimitive().setAttribute(
    "_SOURCE_CUT_WELD",
    doc
      .createAccessor("fans", buffer)
      .setType("SCALAR")
      .setArray(Uint32Array.from([1, 1])),
  );
  doc.createMesh().addPrimitive(p);
  assert.throws(
    () =>
      replaceSourceFanSkin(
        doc,
        p,
        Uint16Array.from([9, 0, 0, 0, 8, 0, 0, 0]),
        Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0]),
        Uint8Array.from([1, 1]),
      ),
    /Conflicting IDs/,
  );
  assert.equal(p.getAttribute("JOINTS_0"), null);
});
