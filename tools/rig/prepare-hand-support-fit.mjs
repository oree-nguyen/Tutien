/** Explicit measured-pose input for hand-only convex support experiments. */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sha256 } from "./animation-payload.mjs";

const [candidate, output, ...poseFiles] = process.argv.slice(2);
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output ?? ""));
assert(
  poseFiles.length >= 2,
  "Open and articulated poses must both be explicit",
);
await assert.rejects(fs.access(output), { code: "ENOENT" });
const solve = JSON.parse(await fs.readFile(candidate + "/solve.json"));
const receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
const file = candidate + "/H01-C0-rigged.glb";
const bytes = await fs.readFile(file);
assert.equal(sha256(bytes), receipt.sha256);
assert.equal(
  sha256(await fs.readFile(candidate + "/solve.json")),
  receipt.solveSha256,
);
const metaBytes = await fs.readFile(solve.input + "/input.json");
assert.equal(sha256(metaBytes), solve.inputMetadataSha256);
const meta = JSON.parse(metaBytes);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .readBinary(bytes);
const skin = doc.getRoot().listSkins()[0];
const joints = skin.listJoints();
assert.deepEqual(
  joints.map((n) => n.getName()),
  meta.jointNames,
);
const primitive = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === meta.mesh)
  .getMesh()
  .listPrimitives()[meta.primitive];
const ids = primitive.getAttribute("JOINTS_0").getArray();
const weights = primitive.getAttribute("WEIGHTS_0").getArray();
const maskBytes = await fs.readFile(candidate + "/touched.u8bin");
assert.equal(sha256(maskBytes), solve.files["touched.u8bin"]);
const protectedMask = Uint8Array.from(maskBytes, (touched, v) =>
  Number(
    !touched || Math.max(...weights.subarray(v * 4, v * 4 + 4)) >= 1 - 1e-7,
  ),
);
const bind = joints.map((n) => [n, n.getTranslation(), n.getRotation()]);
const matrices = new Float64Array(poseFiles.length * joints.length * 16);
const poses = [];
for (const [at, name] of poseFiles.entries()) {
  const b = await fs.readFile(name),
    pose = JSON.parse(b);
  assert.equal(Object.keys(pose.rotations).length, joints.length);
  for (const [n, p, q] of bind) {
    n.setTranslation(p);
    n.setRotation(q);
  }
  for (const n of joints) {
    const q = pose.rotations[n.getName()];
    assert(q?.length === 4 && q.every(Number.isFinite));
    assert(Math.abs(Math.hypot(...q) - 1) < 1e-6);
    n.setRotation(q);
  }
  for (const [name, p] of Object.entries(pose.translations ?? {})) {
    assert(p.length === 3 && p.every(Number.isFinite));
    const n = joints.find((n) => n.getName() === name);
    assert(n, "Unknown translated joint");
    if (name !== "Hips")
      assert.deepEqual(p, bind.find(([node]) => node === n)[1]);
    n.setTranslation(p);
  }
  for (let i = 0; i < joints.length; i++)
    matrices.set(
      new Matrix4()
        .fromArray(joints[i].getWorldMatrix())
        .multiply(
          new Matrix4().fromArray(
            skin.getInverseBindMatrices().getElement(i, []),
          ),
        ).elements,
      (at * joints.length + i) * 16,
    );
  poses.push({ file: name, sha256: sha256(b) });
}
await fs.mkdir(output);
await fs.link(file, output + "/H01-C0-rigged.glb");
const raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const files = {};
for (const [name, a] of Object.entries({
  "positions.bin": primitive.getAttribute("POSITION").getArray(),
  "triangles.bin": Uint32Array.from(primitive.getIndices().getArray()),
  "source-welds.u32bin": Uint32Array.from(
    primitive.getAttribute("_SOURCE_WELD").getArray(),
  ),
  "result-ids.bin": Uint16Array.from(ids),
  "result-weights.bin": Float32Array.from(weights),
  "protected.bin": protectedMask,
  "feasibility-matrices.bin": matrices,
})) {
  const b = raw(a);
  await fs.writeFile(output + "/" + name, b);
  files[name] = sha256(b);
}
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(
    {
      sha256: receipt.sha256,
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
await fs.writeFile(
  output + "/feasibility-input.json",
  JSON.stringify(
    {
      kind: "source-hand-support",
      candidate,
      candidateSolveSha256: receipt.solveSha256,
      assetSha256: receipt.sha256,
      mesh: meta.mesh,
      primitive: meta.primitive,
      poseFile: poses[0].file,
      poseSha256: poses[0].sha256,
      poseCount: poses.length,
      poses,
      matricesSha256: files["feasibility-matrices.bin"],
      files,
      freeVertices: protectedMask.reduce((n, v) => n + Number(!v), 0),
      scope:
        "Remaining_Source only, original source-weld IDs; all non-hand rows and pure measured seeds pinned. No garment, geometry, joint or animation edits.",
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
