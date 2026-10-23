/** Flatten actual GLB skin fields and verify a reusable source geometry layout. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sha256 } from "./animation-payload.mjs";

const [input, output, geometry, mode] = process.argv.slice(2);
for (const p of [input, output, geometry])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(p ?? ""));
assert(mode === undefined || mode === "--audit-only");
const bytes = await fs.readFile(input + "/H01-C0-rigged.glb");
assert.equal(
  sha256(bytes),
  JSON.parse(await fs.readFile(input + "/receipt.json")).sha256,
);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .readBinary(bytes);
const load = async (file, Type) => {
  const b = await fs.readFile(geometry + "/" + file);
  return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const positions = await load("positions.bin", Float32Array),
  groups = await load("groups.bin", Uint32Array),
  triangles = await load("triangles.bin", Uint32Array);
const all = [];
for (const n of doc.getRoot().listNodes())
  for (const [primitive, p] of (n.getMesh()?.listPrimitives() ?? []).entries())
    all.push({ node: n.getName(), primitive, p });
const count = all.reduce(
  (n, { p }) => n + p.getAttribute("POSITION").getCount(),
  0,
);
assert.equal(count, groups.length);
assert.equal(count * 3, positions.length);
const ids = new Uint16Array(count * 4),
  weights = new Float32Array(count * 4),
  parts = [];
let at = 0,
  corner = 0;
for (const { node, primitive, p } of all) {
  const n = p.getAttribute("POSITION").getCount();
  assert.deepEqual(
    p.getAttribute("POSITION").getArray(),
    positions.subarray(at * 3, (at + n) * 3),
  );
  assert.deepEqual(
    p.getAttribute("_SOURCE_CUT_WELD").getArray(),
    groups.subarray(at, at + n),
  );
  const indices = p.getIndices().getArray();
  for (let i = 0; i < indices.length; i++)
    assert.equal(indices[i] + at, triangles[corner++]);
  ids.set(p.getAttribute("JOINTS_0").getArray(), at * 4);
  weights.set(p.getAttribute("WEIGHTS_0").getArray(), at * 4);
  parts.push({ node, primitive, count: n, offset: at });
  at += n;
}
assert.equal(corner, triangles.length);
const raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength),
  files = {};
for (const name of ["positions.bin", "triangles.bin", "groups.bin"])
  files[name] = sha256(await fs.readFile(geometry + "/" + name));
files["ids.u16bin"] = sha256(raw(ids));
files["weights.f32bin"] = sha256(raw(weights));
if (mode === "--audit-only") {
  const actual = JSON.parse(await fs.readFile(output + "/input.json"));
  assert.equal(actual.inputSha256, sha256(bytes));
  assert.deepEqual(actual.parts, parts);
  assert.deepEqual(actual.files, files);
  console.log(
    JSON.stringify({
      input,
      sourceSha256: sha256(bytes),
      vertices: count,
      faces: corner / 3,
      everyPositionIndexSourceFanAndSkinFieldMatched: true,
    }),
  );
} else {
  await assert.rejects(fs.access(output), { code: "ENOENT" });
  await fs.mkdir(output);
  for (const name of ["positions.bin", "triangles.bin", "groups.bin"])
    await fs.link(geometry + "/" + name, output + "/" + name);
  await fs.writeFile(output + "/ids.u16bin", raw(ids));
  await fs.writeFile(output + "/weights.f32bin", raw(weights));
  await fs.writeFile(
    output + "/input.json",
    JSON.stringify(
      {
        input,
        inputSha256: sha256(bytes),
        borrowedGeometry: geometry,
        parts,
        vertices: count,
        files,
        accepted: false,
        activated: false,
        scope:
          "Every reused source position/index/fan and actual GLB field verified; coupled hand/cuff numerical input only",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(output);
}
