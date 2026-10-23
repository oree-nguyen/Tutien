/** Turn a hash-bound hand-only numerical fit into a NEW staging proposal. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { sha256 } from "./animation-payload.mjs";

const [proposal, numerical, output] = process.argv.slice(2);
for (const p of [proposal, numerical, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(p ?? ""));
await assert.rejects(fs.access(output), { code: "ENOENT" });
const pBytes = await fs.readFile(proposal + "/solve.json"),
  p = JSON.parse(pBytes);
const fitBytes = await fs.readFile(numerical + "/solve.json"),
  fit = JSON.parse(fitBytes);
const baseBytes = await fs.readFile(fit.base + "/feasibility-input.json"),
  base = JSON.parse(baseBytes);
assert.equal(base.kind, "source-hand-support");
assert.equal(base.candidate, proposal);
assert.equal(base.candidateSolveSha256, sha256(pBytes));
const receipt = JSON.parse(await fs.readFile(proposal + "/receipt.json"));
assert.equal(base.assetSha256, receipt.sha256);
assert.equal(fit.assetSha256, receipt.sha256);
for (const [file, hash] of Object.entries(base.files))
  assert.equal(sha256(await fs.readFile(fit.base + "/" + file)), hash);
for (const [file, hash] of Object.entries(fit.inputHashes))
  assert.equal(sha256(await fs.readFile(fit.base + "/" + file)), hash);
for (const [file, hash] of Object.entries(p.files))
  assert.equal(sha256(await fs.readFile(proposal + "/" + file)), hash);
assert.equal(base.files["result-ids.bin"], p.files["ids.u16bin"]);
assert.equal(base.files["result-weights.bin"], p.files["weights.f32bin"]);
const b = await fs.readFile(numerical + "/result-weights.bin");
assert.equal(sha256(b), fit.outputWeightsSha256);
const weights = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const oldBytes = await fs.readFile(proposal + "/weights.f32bin");
const old = new Float32Array(
  oldBytes.buffer,
  oldBytes.byteOffset,
  oldBytes.length / 4,
);
const protectedMask = await fs.readFile(fit.base + "/protected.bin");
assert.equal(weights.length, old.length);
assert.equal(weights.length, protectedMask.length * 4);
for (let v = 0; v < protectedMask.length; v++)
  if (protectedMask[v])
    assert.deepEqual(
      weights.subarray(v * 4, v * 4 + 4),
      old.subarray(v * 4, v * 4 + 4),
    );
await fs.mkdir(output);
for (const file of ["ids.u16bin", "touched.u8bin"])
  await fs.copyFile(proposal + "/" + file, output + "/" + file);
await fs.writeFile(output + "/weights.f32bin", b);
const dependencies = {
  [proposal + "/solve.json"]: sha256(pBytes),
  [proposal + "/receipt.json"]: sha256(
    await fs.readFile(proposal + "/receipt.json"),
  ),
  [numerical + "/solve.json"]: sha256(fitBytes),
  [numerical + "/result-weights.bin"]: sha256(b),
  [fit.base + "/feasibility-input.json"]: sha256(baseBytes),
};
await fs.writeFile(
  output + "/solve.json",
  JSON.stringify(
    {
      ...p,
      method:
        p.method +
        "; multi-pose fixed-support CP with original seed protection; kept fans must propagate on export",
      dependencies,
      supportFit: {
        proposal,
        numerical,
        source: fit.base,
        poseCount: fit.poseCount,
        accepted: false,
      },
      files: { ...p.files, "weights.f32bin": sha256(b) },
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
