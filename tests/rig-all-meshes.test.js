import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";
async function fixture(scale, offset = 0) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rig-all-mesh-"));
  const doc = new Document(),
    buffer = doc.createBuffer(),
    scene = doc.createScene();
  const root = doc.createNode("Hip"),
    active = doc
      .createNode("Active")
      .setScale([scale, scale, scale])
      .setTranslation([offset, 0, 0]);
  scene.addChild(root);
  scene.addChild(active);
  const ibm = new Float32Array(32);
  for (let j = 0; j < 2; j++)
    for (let k = 0; k < 4; k++) ibm[j * 16 + k * 5] = 1;
  const skin = doc
    .createSkin()
    .addJoint(root)
    .addJoint(active)
    .setInverseBindMatrices(
      doc
        .createAccessor("IBM", buffer)
        .setType(Accessor.Type.MAT4)
        .setArray(ibm),
    );
  for (let m = 0; m < 2; m++) {
    const attr = (type, array) =>
      doc.createAccessor("", buffer).setType(type).setArray(array);
    const p = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        attr(Accessor.Type.VEC3, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])),
      )
      .setAttribute(
        "JOINTS_0",
        attr(
          Accessor.Type.VEC4,
          new Uint16Array([m, 0, 0, 0, m, 0, 0, 0, m, 0, 0, 0]),
        ),
      )
      .setAttribute(
        "WEIGHTS_0",
        attr(
          Accessor.Type.VEC4,
          new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
        ),
      )
      .setIndices(attr(Accessor.Type.SCALAR, new Uint16Array([0, 1, 2])));
    scene.addChild(
      doc
        .createNode("Mesh" + m)
        .setMesh(doc.createMesh().addPrimitive(p))
        .setSkin(skin),
    );
  }
  const input = path.join(directory, "fixture.glb"),
    output = path.join(directory, "report.json");
  await new NodeIO().write(input, doc);
  const child = spawnSync(
    process.execPath,
    ["tools/rig/validate-all-meshes.mjs"],
    {
      env: {
        ...process.env,
        RIG_FILE: input,
        RIG_REPORT_FILE: output,
        REFERENCE_POSE: "",
      },
      encoding: "utf8",
    },
  );
  return { directory, child, report: JSON.parse(await fs.readFile(output)) };
}
test("validator rejects a distorted second mesh even when first mesh passes", async () => {
  const result = await fixture(3);
  try {
    assert.equal(result.child.status, 1);
    assert.equal(result.report.meshes.length, 2);
    assert.equal(result.report.meshes[0].passed, true);
    assert.equal(result.report.meshes[1].passed, false);
    assert.equal(result.report.passed, false);
    assert.equal(result.report.meshes[1].maximum, 3);
    assert.equal(result.report.seams.passed, false);
  } finally {
    await fs.rm(result.directory, { recursive: true });
  }
});
test("validator passes two continuous undeformed meshes and checks both", async () => {
  const result = await fixture(1);
  try {
    assert.equal(result.child.status, 0, result.child.stderr);
    assert.equal(result.report.passed, true);
    assert.equal(result.report.meshes.length, 2);
    assert.equal(result.report.seams.maximumMillimetres, 0);
  } finally {
    await fs.rm(result.directory, { recursive: true });
  }
});

test("validator rejects open shared-source seams even if each separate mesh has no stretch", async () => {
  const result = await fixture(1, 0.1);
  try {
    assert(result.report.meshes.every((m) => m.passed));
    assert.equal(result.report.edgeStrainPassed, true);
    assert.equal(result.report.seams.passed, false);
    assert.equal(result.report.passed, false);
    assert.equal(result.child.status, 1);
  } finally {
    await fs.rm(result.directory, { recursive: true });
  }
});
