import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { Bone, Group, Matrix4 } from "three";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
} from "../tools/rig/runtime-surface.mjs";
import { measureSkinNormalAgreement } from "../tools/rig/normal-agreement.mjs";
import { interpolatePose } from "../tools/rig/pose-transition.mjs";
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

test("passing bind and crouch endpoints cannot conceal a collapsed interpolated surface", () => {
  const f = fixture();
  const p = f.doc.getRoot().listMeshes()[0].listPrimitives()[0];
  p.getAttribute("JOINTS_0").setArray(
    new Uint8Array([0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]),
  );
  p.getAttribute("WEIGHTS_0")
    .setNormalized(false)
    .setArray(
      new Float32Array([
        0.5, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0.5, 0.5, 0, 0,
      ]),
    );
  const [surface] = createRuntimeSurfaces(f.doc, f.root),
    bind = {
      rotations: { A: [0, 0, 0, 1], B: [0, 0, 0, 1] },
      translations: { A: [0, 0, 0], B: [0, 0, 0] },
    },
    target = { rotations: { A: [1, 0, 0, 0], B: [-1, 0, 0, 0] } },
    results = [0, 0.5, 1].map((t) => {
      const pose = interpolatePose(bind, target, t);
      f.a.quaternion.fromArray(pose.rotations.A);
      f.b.quaternion.fromArray(pose.rotations.B);
      f.root.updateMatrixWorld(true);
      return measureRuntimeSurface(surface);
    });
  assert.equal(results[0].passed, true);
  assert.equal(results[2].passed, true);
  assert.equal(results[1].passed, false);
  assert(results[1].minimumAreaRatio < 1e-12);
});

test("diagnostic transitions reject missing joints, bad rotations, scales and extraneous translations", () => {
  const bind = {
    rotations: { A: [0, 0, 0, 1] },
    translations: { A: [1, 2, 3] },
  };
  assert.throws(
    () => interpolatePose(bind, { rotations: {} }, 0.5),
    /Every bound joint/,
  );
  assert.throws(
    () => interpolatePose(bind, { rotations: { A: [0, 0, 0, 2] } }, 0.5),
    /quaternion/,
  );
  assert.throws(
    () => interpolatePose(bind, { rotations: bind.rotations, scales: {} }, 0.5),
    /Invalid/,
  );
  assert.throws(
    () =>
      interpolatePose(
        bind,
        { rotations: bind.rotations, translations: { B: [0, 0, 0] } },
        0.5,
      ),
    /Unknown/,
  );
  const target = { rotations: bind.rotations, translations: { A: [3, 4, 5] } };
  assert.deepEqual(
    interpolatePose(bind, target, 0.5).translations.A,
    [2, 3, 4],
  );
});

function normalFixture(matrices) {
  const positions = Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals = Float64Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    ids = new Uint16Array(12),
    weights = new Float64Array(12),
    posed = new Float64Array(9);
  for (let v = 0; v < 3; v++) {
    ids[v * 4] = matrices.length === 1 ? 0 : v;
    weights[v * 4] = 1;
    const m = matrices[ids[v * 4]],
      x = positions[v * 3],
      y = positions[v * 3 + 1],
      z = positions[v * 3 + 2];
    posed.set(
      [
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
      ],
      v * 3,
    );
  }
  return {
    positions,
    normals,
    ids,
    weights,
    posed,
    indices: Uint32Array.from([0, 1, 2]),
    matrices,
  };
}
test("normal diagnostics compare posed geometry and shader normals rather than declaring rigid rotations inverted", () => {
  const f = normalFixture([
      new Matrix4().makeRotationX(Math.PI * 0.75).elements,
    ]),
    r = measureSkinNormalAgreement(f);
  assert.equal(r.newOpposed, 0);
  assert.equal(r.posedOpposed, 0);
  assert(r.maximumAngleDegrees < 1e-5);
  assert.equal(r.diagnosticOnly, true);
});
test("a position-preserving skin can still invert the shading normals and must be diagnosed", () => {
  const points = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    rotation = new Matrix4().makeRotationX(Math.PI),
    matrices = points.map(
      (p) =>
        new Matrix4()
          .makeTranslation(...p)
          .multiply(rotation)
          .multiply(new Matrix4().makeTranslation(...p.map((x) => -x)))
          .elements,
    ),
    f = normalFixture(matrices),
    r = measureSkinNormalAgreement(f);
  for (let i = 0; i < f.positions.length; i++)
    assert(Math.abs(f.positions[i] - f.posed[i]) < 1e-12);
  assert.equal(r.bindOpposed, 0);
  assert.equal(r.newOpposed, 1);
  assert.equal(r.posedOpposed, 1);
  assert(r.maximumAngleDegrees > 179.9);
});
test("normal diagnostics refuse nonfinite source normals and inconsistent layouts", () => {
  const f = normalFixture([new Matrix4().elements]);
  f.normals[0] = NaN;
  assert.throws(() => measureSkinNormalAgreement(f), /Nonfinite/);
  assert.throws(
    () => measureSkinNormalAgreement({ ...f, posed: new Float64Array(0) }),
    /layout/,
  );
});
