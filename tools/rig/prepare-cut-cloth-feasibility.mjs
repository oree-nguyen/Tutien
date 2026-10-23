/** Flatten actual cut primitives and their current pose for an offline fit.
 * Cut fans are numerical identities, never silently substituted for UV seams.
 */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4 } from "three";
import { sha256 } from "./animation-payload.mjs";
import { copyProvenance } from "./copy-provenance.mjs";
import { assertUnusedStagingOutput } from "./staging-output.mjs";
const [base, output, ...poseFiles] = process.argv.slice(2);
assert(
  poseFiles.length > 0 && poseFiles.length <= 120,
  "Explicit diagnostic poses required",
);
const poseFile = poseFiles[0];
for (const d of [base, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(d ?? ""));
assert.notEqual(base, output);
await assertUnusedStagingOutput(output);
const input = base + "/H01-C0-rigged.glb",
  bytes = await fs.readFile(input),
  receipt = JSON.parse(await fs.readFile(base + "/receipt.json")),
  poseBytes = await fs.readFile(poseFile),
  pose = JSON.parse(poseBytes),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
assert.equal(sha256(bytes), receipt.sha256);
assert(pose.poseDataValid === true && !pose.scales);
assert.equal(doc.getRoot().listSkins().length, 1);
const parts = [];
let vertices = 0,
  faces = 0;
for (const [nodeIndex, n] of doc.getRoot().listNodes().entries())
  for (const [primitiveIndex, p] of n.getMesh()?.listPrimitives().entries() ??
    []) {
    assert.equal(p.listTargets().length, 0);
    assert(p.getAttribute("_SOURCE_CUT_WELD"));
    parts.push({
      nodeIndex,
      primitiveIndex,
      name: n.getName(),
      offset: vertices,
      count: p.getAttribute("POSITION").getCount(),
    });
    vertices += p.getAttribute("POSITION").getCount();
    faces += p.getIndices().getCount() / 3;
  }
const positions = new Float32Array(vertices * 3),
  triangles = new Uint32Array(faces * 3),
  groups = new Uint32Array(vertices),
  ids = new Uint16Array(vertices * 4),
  weights = new Float32Array(vertices * 4),
  protectedMask = new Uint8Array(vertices),
  roles = new Uint8Array(vertices);
let faceAt = 0;
for (const part of parts) {
  const p = doc
    .getRoot()
    .listNodes()
    [part.nodeIndex].getMesh()
    .listPrimitives()[part.primitiveIndex];
  positions.set(p.getAttribute("POSITION").getArray(), part.offset * 3);
  groups.set(p.getAttribute("_SOURCE_CUT_WELD").getArray(), part.offset);
  ids.set(p.getAttribute("JOINTS_0").getArray(), part.offset * 4);
  weights.set(p.getAttribute("WEIGHTS_0").getArray(), part.offset * 4);
  const role =
    part.name === "H01_Robe_Left" ? 1 : part.name === "H01_Robe_Right" ? 2 : 0;
  roles.fill(role, part.offset, part.offset + part.count);
  protectedMask.fill(role ? 0 : 1, part.offset, part.offset + part.count);
  for (const v of p.getIndices().getArray())
    triangles[faceAt++] = v + part.offset;
}
assert.equal(faceAt, triangles.length);
const skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints(),
  bind = joints.map((n) => ({
    n,
    rotation: n.getRotation(),
    translation: n.getTranslation(),
  })),
  allMatrices = [],
  poses = [];
for (const file of poseFiles) {
  const raw = await fs.readFile(file),
    current = JSON.parse(raw);
  assert(current.poseDataValid === true && !current.scales);
  if (current.assetSha256)
    assert.equal(
      current.assetSha256,
      sha256(bytes),
      "Diagnostic pose belongs to another asset",
    );
  for (const { n, rotation, translation } of bind)
    n.setRotation(rotation).setTranslation(translation);
  const channels = new Set(Object.keys(current.rotations));
  for (const n of joints) {
    assert(
      channels.delete(n.getName()),
      "Pose missing current core/cloth joint " + n.getName(),
    );
    const q = current.rotations[n.getName()];
    assert(
      q.length === 4 &&
        q.every(Number.isFinite) &&
        Math.abs(Math.hypot(...q) - 1) < 1e-6,
    );
    n.setRotation(q);
  }
  assert.equal(channels.size, 0);
  for (const [name, t] of Object.entries(current.translations ?? {})) {
    assert(t.length === 3 && t.every(Number.isFinite));
    const joint = bind.find(({ n }) => n.getName() === name);
    assert(joint, "Unknown translation joint " + name);
    if (name !== "Hips")
      assert.deepEqual(
        t,
        joint.translation,
        "Diagnostic transition must not stretch a limb",
      );
    joint.n.setTranslation(t);
  }
  allMatrices.push(
    ...joints.flatMap(
      (n, i) =>
        new Matrix4()
          .fromArray(n.getWorldMatrix())
          .multiply(
            new Matrix4().fromArray(
              skin.getInverseBindMatrices().getElement(i, []),
            ),
          ).elements,
    ),
  );
  poses.push({ file, sha256: sha256(raw), t: current.t ?? null });
}
const matrices = Float64Array.from(allMatrices);
assert([...matrices].every(Number.isFinite));
await fs.mkdir(output, { recursive: true });
const files = {};
for (const [name, array] of Object.entries({
  "positions.bin": positions,
  "triangles.bin": triangles,
  "groups.bin": groups,
  "protected.bin": protectedMask,
  "roles.bin": roles,
  "result-ids.bin": ids,
  "result-weights.bin": weights,
  "feasibility-matrices.bin": matrices,
})) {
  const raw = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  await fs.writeFile(output + "/" + name, raw);
  files[name] = sha256(raw);
}
// An immutable, hash-checked local staging alias avoids another source copy.
// Export tools refuse occupied directories and always write to a new revision.
await fs.link(input, output + "/H01-C0-rigged.glb");
await copyProvenance(doc, base, output);
const meta = {
  kind: "cut-cloth-source-layout",
  assetSha256: sha256(bytes),
  poseFile,
  poseSha256: sha256(poseBytes),
  poseCount: poses.length,
  poses,
  matricesSha256: files["feasibility-matrices.bin"],
  files,
  parts,
  vertices,
  faces,
  scope:
    "One-or-more explicit poses on exact source-corner fans. Only left/right panel rows may change; body, hands, sleeves and boots fixed. Unreviewed cuts are not accepted source seams. Local GLB alias is immutable and hash-checked.",
};
await fs.writeFile(
  output + "/feasibility-input.json",
  JSON.stringify(meta, null, 2) + "\n",
);
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(
    {
      ...receipt,
      input,
      output: output + "/H01-C0-rigged.glb",
      inputSha256: sha256(bytes),
      sha256: sha256(bytes),
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ output, vertices, faces, joints: joints.length }));
