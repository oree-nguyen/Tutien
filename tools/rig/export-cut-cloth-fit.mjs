/** Export fitted cut-cloth weights only; every source surface remains intact. */
import fs from "node:fs/promises";
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
const output = process.argv[2];
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output ?? ""));
await assertUnusedStagingOutput(output);
const solve = JSON.parse(await fs.readFile(output + "/solve.json")),
  base = solve.base,
  meta = JSON.parse(await fs.readFile(base + "/feasibility-input.json"));
assert(solve.parameters.cutFans && meta.kind === "cut-cloth-source-layout");
for (const [name, digest] of Object.entries(meta.files))
  assert.equal(
    sha256(await fs.readFile(base + "/" + name)),
    digest,
    "Changed fit input " + name,
  );
for (const [name, digest] of Object.entries(solve.inputHashes))
  assert.equal(
    sha256(await fs.readFile(base + "/" + name)),
    digest,
    "Changed solver input " + name,
  );
const input = base + "/H01-C0-rigged.glb",
  bytes = await fs.readFile(input);
assert.equal(sha256(bytes), solve.assetSha256);
assert.equal(sha256(bytes), meta.assetSha256);
const wBytes = await fs.readFile(output + "/result-weights.bin");
assert.equal(sha256(wBytes), solve.outputWeightsSha256);
const weights = new Float32Array(
    wBytes.buffer,
    wBytes.byteOffset,
    wBytes.length / 4,
  ),
  protectedMask = new Uint8Array(await fs.readFile(base + "/protected.bin")),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  strip = (p) => {
    for (const m of p.meshes)
      for (const q of m.primitives) delete q.attributes.WEIGHTS_0;
    return p;
  },
  before = strip(immutablePayload(doc)),
  clips = doc
    .getRoot()
    .listAnimations()
    .map((a) => ({ name: a.getName(), channels: animationSignature(a) }));
let at = 0;
for (const n of doc.getRoot().listNodes())
  for (const p of n.getMesh()?.listPrimitives() ?? []) {
    const count = p.getAttribute("POSITION").getCount(),
      old = p.getAttribute("WEIGHTS_0").getArray(),
      next = weights.slice(at * 4, (at + count) * 4);
    assert.equal(next.length, old.length);
    for (let v = 0; v < count; v++) {
      const row = next.subarray(v * 4, v * 4 + 4);
      assert(row.every((x) => Number.isFinite(x) && x >= 0 && x <= 1));
      assert(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-5);
      if (protectedMask[at + v])
        assert.deepEqual(
          row,
          old.subarray(v * 4, v * 4 + 4),
          "Protected source row changed",
        );
    }
    p.getAttribute("WEIGHTS_0").setArray(next);
    at += count;
  }
assert.equal(at, meta.vertices);
assert.equal(at, protectedMask.length);
assert.equal(at * 4, weights.length);
const provenanceFiles = await copyProvenance(doc, base, output),
  file = output + "/H01-C0-rigged.glb";
await io.write(file, doc);
const actual = await io.read(file);
assert.deepEqual(strip(immutablePayload(actual)), before);
assert.deepEqual(
  actual
    .getRoot()
    .listAnimations()
    .map((a) => ({ name: a.getName(), channels: animationSignature(a) })),
  clips,
);
let offset = 0;
for (const n of actual.getRoot().listNodes())
  for (const p of n.getMesh()?.listPrimitives() ?? []) {
    const a = p.getAttribute("WEIGHTS_0").getArray();
    assert.deepEqual(a, weights.subarray(offset, offset + a.length));
    offset += a.length;
  }
assert.equal(offset, weights.length);
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(
    {
      input,
      inputSha256: sha256(bytes),
      output: file,
      sha256: sha256(await fs.readFile(file)),
      solveSha256: sha256(await fs.readFile(output + "/solve.json")),
      provenanceFiles,
      allSourceGeometryUvImagesCoreBindAndLegacyClipsPreserved: true,
      protectedBodyHandsSleevesBootsPreserved: true,
      accepted: false,
      activated: false,
      scope:
        "One-pose panel support fit only. Full-animation, pattern, collision, natural drape and phone checks remain required.",
    },
    null,
    2,
  ) + "\n",
);
console.log(file);
