/** Export only audited hand-island skin fields; retain every source surface. */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  immutablePayload,
  animationSignature,
  sha256,
} from "./animation-payload.mjs";
import { copyProvenance } from "./copy-provenance.mjs";
import { assertUnusedStagingOutput } from "./staging-output.mjs";
import { replaceSourceFanSkin } from "./source-fan-skin.mjs";

const output = process.argv[2];
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output ?? ""));
await assertUnusedStagingOutput(output);
const solve = JSON.parse(await fs.readFile(output + "/solve.json"));
for (const [file, hash] of Object.entries(solve.dependencies ?? {})) {
  assert(file.startsWith(".local/rig-candidates/") && !file.includes(".."));
  assert.equal(
    sha256(await fs.readFile(file)),
    hash,
    "Changed support-fit dependency",
  );
}
const metaBytes = await fs.readFile(solve.input + "/input.json");
assert.equal(sha256(metaBytes), solve.inputMetadataSha256);
const meta = JSON.parse(metaBytes);
for (const [file, hash] of Object.entries(meta.files))
  assert.equal(sha256(await fs.readFile(solve.input + "/" + file)), hash);
for (const [file, hash] of Object.entries(solve.files))
  assert.equal(sha256(await fs.readFile(output + "/" + file)), hash);
for (const [file, hash] of Object.entries(solve.canonicalHashes))
  assert.equal(sha256(await fs.readFile(solve.canonical + "/" + file)), hash);
assert.equal(
  sha256(await fs.readFile(solve.seedReport)),
  solve.seedReportSha256,
);
const bytes = await fs.readFile(meta.input);
assert.equal(sha256(bytes), meta.inputSha256);
assert.equal(sha256(bytes), solve.assetSha256);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(bytes);
const node = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === meta.mesh);
const primitive = node.getMesh().listPrimitives()[meta.primitive];
const stripSkinFields = (payload) => {
  for (const mesh of payload.meshes)
    for (const p of mesh.primitives) {
      delete p.attributes.JOINTS_0;
      delete p.attributes.WEIGHTS_0;
    }
  return payload;
};
const before = stripSkinFields(immutablePayload(doc));
const clips = doc
  .getRoot()
  .listAnimations()
  .map((a) => [a.getName(), animationSignature(a)]);
const typed = async (file, Type) => {
  const b = await fs.readFile(output + "/" + file);
  return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const ids = await typed("ids.u16bin", Uint16Array);
const weights = await typed("weights.f32bin", Float32Array);
const touched = await typed("touched.u8bin", Uint8Array);
assert.equal(ids.length, meta.vertices * 4);
assert.equal(weights.length, ids.length);
assert.equal(touched.length, meta.vertices);
assert.equal(
  touched.reduce((a, b) => a + b, 0),
  solve.changedVertices,
);
const oldIds = primitive.getAttribute("JOINTS_0").getArray();
const oldWeights = primitive.getAttribute("WEIGHTS_0").getArray();
for (let v = 0; v < touched.length; v++) {
  const row = weights.subarray(v * 4, v * 4 + 4);
  assert(row.every((w) => Number.isFinite(w) && w >= 0 && w <= 1));
  assert(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  assert(
    ids.subarray(v * 4, v * 4 + 4).every((id) => id < meta.jointNames.length),
  );
  if (!touched[v]) {
    assert.deepEqual(
      ids.subarray(v * 4, v * 4 + 4),
      oldIds.subarray(v * 4, v * 4 + 4),
    );
    assert.deepEqual(row, oldWeights.subarray(v * 4, v * 4 + 4));
  }
}
for (const record of solve.externalSeedsPreserved) {
  const other = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === record.node)
    .getMesh()
    .listPrimitives()[record.primitive];
  assert.equal(
    other.getAttribute("_SOURCE_WELD").getScalar(record.vertex),
    record.sourceWeld,
  );
  assert.deepEqual(
    other.getAttribute("POSITION").getElement(record.vertex, []),
    record.position,
  );
  assert.deepEqual(
    other.getAttribute("JOINTS_0").getElement(record.vertex, []),
    record.ids,
  );
  assert.deepEqual(
    other.getAttribute("WEIGHTS_0").getElement(record.vertex, []),
    record.weights,
  );
}
const additional = solve.additionalFanField;
const extra = additional
  ? {
      fans: await typed(additional.fans, Uint32Array),
      ids: await typed(additional.ids, Uint16Array),
      weights: await typed(additional.weights, Float32Array),
    }
  : undefined;
if (extra) assert(extra.ids.every((id) => id < meta.jointNames.length));
const fanPropagation = replaceSourceFanSkin(
  doc,
  primitive,
  ids,
  weights,
  touched,
  extra,
);
for (const record of solve.externalSeedsPreserved) {
  const p = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === record.node)
    .getMesh()
    .listPrimitives()[record.primitive];
  const ji = meta.jointNames.indexOf(record.requiredJoint);
  assert(
    p
      .getAttribute("JOINTS_0")
      .getElement(record.vertex, [])
      .reduce(
        (total, id, k) =>
          total +
          (id === ji
            ? p.getAttribute("WEIGHTS_0").getElement(record.vertex, [])[k]
            : 0),
        0,
      ) >=
      1 - 1e-7,
    "Measured external palm seed changed after fan propagation",
  );
}
const expectedSkin = doc
  .getRoot()
  .listMeshes()
  .flatMap((m) =>
    m.listPrimitives().map((p) => ({
      ids: p.getAttribute("JOINTS_0").getArray().slice(),
      weights: p.getAttribute("WEIGHTS_0").getArray().slice(),
    })),
  );
const provenanceFiles = await copyProvenance(
  doc,
  path.dirname(meta.input),
  output,
);
const file = output + "/H01-C0-rigged.glb";
await io.write(file, doc);
const actual = await io.read(file);
assert.deepEqual(stripSkinFields(immutablePayload(actual)), before);
assert.deepEqual(
  actual
    .getRoot()
    .listAnimations()
    .map((a) => [a.getName(), animationSignature(a)]),
  clips,
);
const actualPrimitives = actual
  .getRoot()
  .listMeshes()
  .flatMap((m) => m.listPrimitives());
for (let i = 0; i < expectedSkin.length; i++) {
  assert.deepEqual(
    actualPrimitives[i].getAttribute("JOINTS_0").getArray(),
    expectedSkin[i].ids,
  );
  assert.deepEqual(
    actualPrimitives[i].getAttribute("WEIGHTS_0").getArray(),
    expectedSkin[i].weights,
  );
}
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(
    {
      input: meta.input,
      inputSha256: meta.inputSha256,
      output: file,
      sha256: sha256(await fs.readFile(file)),
      solveSha256: sha256(await fs.readFile(output + "/solve.json")),
      provenanceFiles,
      allSourceGeometryUvImagesCoreBindAndLegacyClipsPreserved: true,
      unaffectedSourceFansByteExact: true,
      fanPropagation,
      changedVertices: solve.changedVertices,
      accepted: false,
      activated: false,
      scope:
        "Source hand skin support experiment only. Legacy clips retained, not retargeted or accepted. Full-animation, cuff, fist, anatomy and phone checks still required.",
    },
    null,
    2,
  ) + "\n",
);
console.log(file);
