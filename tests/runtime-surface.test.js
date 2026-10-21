import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { Bone, Group, Matrix4 } from "three";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
} from "../tools/rig/runtime-surface.mjs";
function fixture({ quantized = false, second = false, morph = false } = {}) {
  const doc = new Document(),
    buffer = doc.createBuffer(),
    scene = doc.createScene(),
    root = new Group(),
    a = new Bone(),
    b = new Bone();
  a.name = "A";
  b.name = "B";
  root.add(a, b);
  const ja = doc.createNode("A"),
    jb = doc.createNode("B");
  scene.addChild(ja);
  scene.addChild(jb);
  const ib = doc
    .createAccessor()
    .setType("MAT4")
    .setArray(
      Float32Array.from([...new Matrix4().elements, ...new Matrix4().elements]),
    )
    .setBuffer(buffer);
  const skin = doc
    .createSkin()
    .addJoint(ja)
    .addJoint(jb)
    .setInverseBindMatrices(ib);
  function add(name, bad) {
    const positions = quantized
      ? new Int16Array([0, 0, 0, 32767, 0, 0, 32767, 32767, 0, 0, 32767, 0])
      : new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
    const pos = doc
        .createAccessor()
        .setType("VEC3")
        .setArray(positions)
        .setNormalized(quantized)
        .setBuffer(buffer),
      ids = new Uint8Array(16);
    if (bad) ids[8] = 1;
    const weights = new Uint8Array(16);
    for (let k = 0; k < 4; k++) weights[k * 4] = 255;
    const p = doc
      .createPrimitive()
      .setAttribute("POSITION", pos)
      .setAttribute(
        "JOINTS_0",
        doc.createAccessor().setType("VEC4").setArray(ids).setBuffer(buffer),
      )
      .setAttribute(
        "WEIGHTS_0",
        doc
          .createAccessor()
          .setType("VEC4")
          .setArray(weights)
          .setNormalized(true)
          .setBuffer(buffer),
      )
      .setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint16Array([0, 1, 2, 0, 2, 3]))
          .setBuffer(buffer),
      );
    if (morph)
      p.addTarget(
        doc
          .createPrimitiveTarget()
          .setAttribute(
            "POSITION",
            doc
              .createAccessor()
              .setType("VEC3")
              .setArray(new Float32Array(12))
              .setBuffer(buffer),
          ),
      );
    scene.addChild(
      doc
        .createNode(name)
        .setMesh(doc.createMesh(name).addPrimitive(p))
        .setSkin(skin),
    );
    return p;
  }
  add("surface0", !second);
  if (second) add("surface1", true);
  return { doc, root, a, b, ib };
}
test("same normalized quantized surface and dequantizing IBM retains physical metre strain", () => {
  const f = fixture({ quantized: true }),
    m = new Matrix4().makeScale(2, 2, 2);
  f.ib.setArray(Float32Array.from([...m.elements, ...m.elements]));
  const [surface] = createRuntimeSurfaces(f.doc, f.root);
  assert.equal(surface.bind[3], 2);
  assert.equal(measureRuntimeSurface(surface).maximum, 1);
  assert.equal(measureRuntimeSurface(surface).passed, true);
  f.root.position.set(4, -3, 2);
  f.root.rotation.set(0.3, 0.7, 0.1);
  f.root.updateMatrixWorld(true);
  const r = measureRuntimeSurface(surface);
  assert.ok(Math.abs(r.maximum - 1) < 1e-12);
  assert.equal(r.passed, true);
});
test("unit bone scales do not conceal severe actual skin strain", () => {
  const f = fixture(),
    [surface] = createRuntimeSurfaces(f.doc, f.root);
  f.b.position.x = 5;
  f.root.updateMatrixWorld(true);
  assert.deepEqual(f.b.scale.toArray(), [1, 1, 1]);
  const result = measureRuntimeSurface(surface);
  assert.equal(result.passed, false);
  assert.ok(result.maximum > 2);
  assert.ok(result.worst.posedLength > result.worst.bindLength * 2);
});
test("a second primitive cannot escape the all-mesh gate", () => {
  const f = fixture({ second: true }),
    surfaces = createRuntimeSurfaces(f.doc, f.root);
  assert.equal(surfaces.length, 2);
  f.b.position.x = 5;
  f.root.updateMatrixWorld(true);
  assert.equal(measureRuntimeSurface(surfaces[0]).passed, true);
  assert.equal(measureRuntimeSurface(surfaces[1]).passed, false);
});
test("unsupported morph data is rejected instead of receiving a base-only pass", () => {
  const f = fixture({ morph: true });
  assert.throws(
    () => createRuntimeSurfaces(f.doc, f.root),
    /Morph target evaluation/,
  );
});
test("full collapse fails even when upper strain bounds are small", () => {
  const f = fixture(),
    [surface] = createRuntimeSurfaces(f.doc, f.root);
  f.b.position.set(-1, -1, 0);
  f.root.updateMatrixWorld(true);
  assert.equal(measureRuntimeSurface(surface).passed, false);
});
