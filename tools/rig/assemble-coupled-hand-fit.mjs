/** Preserve the source model while applying an independently checked joint fit. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { sha256 } from "./animation-payload.mjs";

const [numerical, output] = process.argv.slice(2);
for (const p of [numerical, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(p ?? ""));
await assert.rejects(fs.access(output), { code: "ENOENT" });
const fitBytes = await fs.readFile(numerical + "/solve.json"),
  fit = JSON.parse(fitBytes);
const baseBytes = await fs.readFile(fit.base + "/feasibility-input.json"),
  base = JSON.parse(baseBytes);
assert.equal(base.kind, "source-support-layout");
const parent = base.candidate,
  oldBytes = await fs.readFile(parent + "/solve.json"),
  old = JSON.parse(oldBytes);
assert.equal(sha256(oldBytes), base.candidateSolveSha256);
assert.equal(fit.assetSha256, base.assetSha256);
assert.equal(
  JSON.parse(await fs.readFile(parent + "/receipt.json")).sha256,
  base.assetSha256,
);
for (const [name, hash] of Object.entries(old.files))
  assert.equal(sha256(await fs.readFile(parent + "/" + name)), hash);
for (const [name, hash] of Object.entries(base.files))
  assert.equal(sha256(await fs.readFile(fit.base + "/" + name)), hash);
for (const [name, hash] of Object.entries(fit.inputHashes))
  assert.equal(sha256(await fs.readFile(fit.base + "/" + name)), hash);
const typed = async (folder, file, Type) => {
  const b = await fs.readFile(folder + "/" + file);
  return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const ids = await typed(fit.base, "result-ids.bin", Uint16Array),
  weights = await typed(numerical, "result-weights.bin", Float32Array);
assert.equal(
  sha256(await fs.readFile(numerical + "/result-weights.bin")),
  fit.outputWeightsSha256,
);
const groups = await typed(fit.base, "groups.bin", Uint32Array),
  protectedMask = await typed(fit.base, "protected.bin", Uint8Array),
  original = await typed(fit.base, "result-weights.bin", Float32Array);
assert.equal(ids.length, groups.length * 4);
assert.equal(weights.length, ids.length);
for (let i = 0; i < groups.length; i++)
  if (protectedMask[i])
    assert.deepEqual(
      weights.subarray(i * 4, i * 4 + 4),
      original.subarray(i * 4, i * 4 + 4),
    );
const lookup = new Map(Array.from(groups, (fan, i) => [fan, i]));
assert.equal(lookup.size, groups.length);
const handFans = await typed(old.input, "fans.u32bin", Uint32Array),
  touched = await typed(parent, "touched.u8bin", Uint8Array);
const handIds = await typed(parent, "ids.u16bin", Uint16Array),
  handWeights = await typed(parent, "weights.f32bin", Float32Array);
for (let i = 0; i < handFans.length; i++)
  if (touched[i]) {
    const a = lookup.get(handFans[i]);
    assert(a !== undefined);
    handIds.set(ids.subarray(a * 4, a * 4 + 4), i * 4);
    handWeights.set(weights.subarray(a * 4, a * 4 + 4), i * 4);
  }
const extraFans = await typed(parent, old.additionalFanField.fans, Uint32Array),
  extraIds = new Uint16Array(extraFans.length * 4),
  extraWeights = new Float32Array(extraFans.length * 4);
for (let i = 0; i < extraFans.length; i++) {
  const a = lookup.get(extraFans[i]);
  assert(a !== undefined);
  extraIds.set(ids.subarray(a * 4, a * 4 + 4), i * 4);
  extraWeights.set(weights.subarray(a * 4, a * 4 + 4), i * 4);
}
await fs.mkdir(output);
const files = {},
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
for (const [name, a] of Object.entries({
  "ids.u16bin": handIds,
  "weights.f32bin": handWeights,
  "touched.u8bin": touched,
  "extra-fans.u32bin": extraFans,
  "extra-ids.u16bin": extraIds,
  "extra-weights.f32bin": extraWeights,
})) {
  const b = raw(a);
  await fs.writeFile(output + "/" + name, b);
  files[name] = sha256(b);
}
await fs.writeFile(
  output + "/solve.json",
  JSON.stringify(
    {
      ...old,
      files,
      method:
        old.method +
        "; " +
        (fit.method ?? "coupled hand/cuff native-four-weight source-star CP"),
      dependencies: {
        ...old.dependencies,
        [parent + "/solve.json"]: sha256(oldBytes),
        [numerical + "/solve.json"]: sha256(fitBytes),
        [numerical + "/result-weights.bin"]: fit.outputWeightsSha256,
        [fit.base + "/feasibility-input.json"]: sha256(baseBytes),
      },
      coupledFit: {
        numerical,
        input: fit.base,
        poseCount: fit.poseCount,
        pinnedSourceSeeds: base.sourceSeedFans,
        freeFans: base.freeFans,
      },
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
