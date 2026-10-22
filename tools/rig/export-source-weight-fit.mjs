/** Export a source-layout weight-only experiment with readback identity checks. */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  sha256,
  immutablePayload,
  animationSignature,
} from "./animation-payload.mjs";

const [directory] = process.argv.slice(2),
  root = path.resolve(".local/rig-candidates");
if (!directory || !path.resolve(directory).startsWith(root + path.sep))
  throw Error("Staging export only");
const solveBytes = await fs.readFile(directory + "/solve.json"),
  solve = JSON.parse(solveBytes),
  base = solve.base,
  hero = solve.parameters.hero;
if (!["H01", "H02"].includes(hero)) throw Error("Missing explicit source hero");
const input = base + "/" + hero + "-C0-rigged.glb",
  bytes = await fs.readFile(input);
assert.equal(sha256(bytes), solve.assetSha256);
for (const [name, hash] of Object.entries(solve.inputHashes))
  assert.equal(
    sha256(await fs.readFile(base + "/" + name)),
    hash,
    "Stale solver input " + name,
  );
assert.equal(sha256(await fs.readFile(solve.poseFile)), solve.poseSha256);
const raw = await fs.readFile(directory + "/result-weights.bin");
assert.equal(sha256(raw), solve.outputWeightsSha256);
const weights = new Float32Array(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
  ),
  originalRaw = await fs.readFile(base + "/result-weights.bin"),
  original = new Float32Array(
    originalRaw.buffer.slice(
      originalRaw.byteOffset,
      originalRaw.byteOffset + originalRaw.byteLength,
    ),
  ),
  protectedMask = await fs.readFile(base + "/protected.bin");
assert.equal(weights.length, original.length);
assert.equal(weights.length, protectedMask.length * 4);
for (let v = 0; v < protectedMask.length; v++) {
  let total = 0;
  for (let k = 0; k < 4; k++) {
    const at = v * 4 + k;
    assert(Number.isFinite(weights[at]) && weights[at] >= 0);
    total += weights[at];
    if (protectedMask[v])
      assert.equal(
        weights[at],
        original[at],
        "Protected source support changed",
      );
  }
  assert(Math.abs(total - 1) < 1e-5);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  strip = (p) => {
    for (const m of p.meshes)
      for (const q of m.primitives) delete q.attributes.WEIGHTS_0;
    return p;
  },
  before = strip(immutablePayload(doc)),
  clips = (d) =>
    d
      .getRoot()
      .listAnimations()
      .map((a) => ({ name: a.getName(), channels: animationSignature(a) }));
assert.equal(doc.getRoot().listMeshes().length, 1);
assert.equal(doc.getRoot().listMeshes()[0].listPrimitives().length, 1);
const p = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  idsBytes = await fs.readFile(base + "/result-ids.bin"),
  ids = p.getAttribute("JOINTS_0").getArray();
assert.equal(p.getAttribute("POSITION").getCount() * 4, weights.length);
assert(
  Buffer.from(Uint16Array.from(ids).buffer).equals(idsBytes),
  "Solver support IDs differ from the actual GLB",
);
const originalClips = clips(doc);
p.getAttribute("WEIGHTS_0").setArray(weights).setNormalized(false);
const output = directory + "/" + hero + "-C0-rigged.glb";
await io.write(output, doc);
const result = await io.read(output);
assert.deepEqual(
  strip(immutablePayload(result)),
  before,
  "Source payload or bind changed",
);
assert.deepEqual(
  clips(result),
  originalClips,
  "Clip name, channel, keyframe or interpolation changed",
);
assert.deepEqual(
  result
    .getRoot()
    .listMeshes()[0]
    .listPrimitives()[0]
    .getAttribute("WEIGHTS_0")
    .getArray(),
  weights,
  "Weight serialization changed",
);
const receipt = {
  hero,
  input,
  inputSha256: sha256(bytes),
  output,
  outputSha256: sha256(await fs.readFile(output)),
  solveSha256: sha256(solveBytes),
  sourcePayloadExceptWeightsPreserved: true,
  protectedSourceSupportsPreserved: true,
  legacyClipsPreserved: true,
  accepted: false,
  activated: false,
  scope:
    "Source-layout weight-only staging export. Existing clips are byte-preserved, not retargeted or accepted. Full animation, skin, contact, collision and visual validation still required.",
};
await fs.writeFile(
  directory + "/export.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));
