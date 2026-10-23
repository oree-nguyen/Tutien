/** Export a frozen-pose cloth trial without changing source geometry or body rows. */
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

const output = process.argv[2];
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output ?? ""));
await assertUnusedStagingOutput(output);
const solveBytes = await fs.readFile(output + "/solve.json"),
  solve = JSON.parse(solveBytes),
  inputBytes = await fs.readFile(solve.base + "/input.json"),
  meta = JSON.parse(inputBytes);
assert.equal(solve.kind, "floor-safe-frozen-cloth-blend");
assert.equal(sha256(inputBytes), solve.inputSha256);
for (const [name, digest] of Object.entries(meta.files))
  assert.equal(
    sha256(await fs.readFile(solve.base + "/" + name)),
    digest,
    "Changed source input " + name,
  );
for (const [name, digest] of Object.entries(solve.outputHashes))
  assert.equal(
    sha256(await fs.readFile(output + "/" + name)),
    digest,
    "Changed fitted output " + name,
  );
const sourceBytes = await fs.readFile(meta.baseFile),
  templateBytes = await fs.readFile(meta.clothFile),
  poseBytes = await fs.readFile(meta.poseFile);
assert.equal(sha256(sourceBytes), meta.baseSha256);
assert.equal(sha256(templateBytes), meta.clothSha256);
assert.equal(sha256(poseBytes), meta.poseSha256);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  source = await io.readBinary(sourceBytes),
  doc = await io.readBinary(templateBytes),
  strip = (v) => {
    for (const m of v.meshes)
      for (const p of m.primitives) {
        delete p.attributes.JOINTS_0;
        delete p.attributes.WEIGHTS_0;
      }
    return v;
  },
  immutable = strip(immutablePayload(doc)),
  clips = (d) =>
    d
      .getRoot()
      .listAnimations()
      .map((a) => ({ name: a.getName(), channels: animationSignature(a) })),
  originalClips = clips(doc),
  gather = (d) =>
    d
      .getRoot()
      .listNodes()
      .flatMap((n) =>
        (n.getMesh()?.listPrimitives() ?? []).map((p, pi) => ({ n, p, pi })),
      ),
  parents = gather(source),
  parts = gather(doc),
  read = async (name, Type) => {
    const b = await fs.readFile(output + "/" + name);
    return new Type(b.buffer, b.byteOffset, b.length / Type.BYTES_PER_ELEMENT);
  },
  ids = await read("result-ids.u16bin", Uint16Array),
  weights = await read("result-weights.f32bin", Float32Array),
  changed = await read("changed.u8bin", Uint8Array),
  protectedMask = new Uint8Array(
    await fs.readFile(solve.base + "/protected.u8bin"),
  );
assert.equal(parts.length, parents.length);
assert.equal(changed.length, meta.vertices);
assert.equal(protectedMask.length, meta.vertices);
assert.equal(ids.length, meta.vertices * 4);
assert.equal(weights.length, ids.length);
let at = 0;
for (let k = 0; k < parts.length; k++) {
  const { n, p, pi } = parts[k],
    parent = parents[k];
  assert.equal(n.getName(), parent.n.getName());
  assert.equal(pi, parent.pi);
  assert.equal(p.listTargets().length, 0);
  const count = p.getAttribute("POSITION").getCount(),
    oldIds = parent.p.getAttribute("JOINTS_0").getArray(),
    oldWeights = parent.p.getAttribute("WEIGHTS_0").getArray(),
    nextIds = ids.slice(at * 4, (at + count) * 4),
    nextWeights = weights.slice(at * 4, (at + count) * 4),
    isPanel = ["H01_Robe_Left", "H01_Robe_Right"].includes(n.getName());
  for (let v = 0; v < count; v++) {
    const row = nextWeights.subarray(v * 4, v * 4 + 4);
    assert(row.every((w) => Number.isFinite(w) && w >= 0 && w <= 1));
    assert(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-5);
    assert(
      nextIds.subarray(v * 4, v * 4 + 4).every((id) => id < meta.jointCount),
    );
    if (!changed[at + v] || protectedMask[at + v] || !isPanel) {
      assert.deepEqual(
        nextIds.subarray(v * 4, v * 4 + 4),
        oldIds.subarray(v * 4, v * 4 + 4),
        "Fixed source joint IDs changed",
      );
      assert.deepEqual(
        nextWeights.subarray(v * 4, v * 4 + 4),
        oldWeights.subarray(v * 4, v * 4 + 4),
        "Fixed source weights changed",
      );
    }
  }
  p.getAttribute("JOINTS_0").setArray(nextIds);
  p.getAttribute("WEIGHTS_0").setArray(nextWeights);
  at += count;
}
assert.equal(at, meta.vertices);
const provenanceFiles = await copyProvenance(
    doc,
    path.dirname(meta.clothFile),
    output,
  ),
  file = output + "/H01-C0-rigged.glb";
await io.write(file, doc);
const actual = await io.read(file);
assert.deepEqual(strip(immutablePayload(actual)), immutable);
assert.deepEqual(clips(actual), originalClips);
let readAt = 0;
for (const { p } of gather(actual)) {
  const next = p.getAttribute("JOINTS_0").getArray(),
    w = p.getAttribute("WEIGHTS_0").getArray();
  assert.deepEqual(next, ids.subarray(readAt, readAt + next.length));
  assert.deepEqual(w, weights.subarray(readAt, readAt + w.length));
  readAt += next.length;
}
assert.equal(readAt, ids.length);
await fs.writeFile(output + "/crouch-pose.json", poseBytes);
const receipt = {
  input: meta.baseFile,
  inputSha256: meta.baseSha256,
  template: meta.clothFile,
  templateSha256: meta.clothSha256,
  output: file,
  sha256: sha256(await fs.readFile(file)),
  solveSha256: sha256(solveBytes),
  sourceAttributesImagesCoreBindAndLegacyClipsPreserved: true,
  nonPanelAndProtectedRowsMatchOriginalParent: true,
  provenanceFiles,
  accepted: false,
  activated: false,
  scope:
    "Frozen-pose four-support cloth trial. Body rows restored exactly to the original parent. Independent source/surface/seam/collision and intermediate-motion tests are still required.",
};
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt));
