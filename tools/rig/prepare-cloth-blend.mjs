/** Source-corner layout for a frozen-pose cloth blend. No model activation. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4 } from "three";
import { animationSignature, sha256 } from "./animation-payload.mjs";
import { assertUnusedStagingOutput } from "./staging-output.mjs";

const [base, cloth, poseFile, output] = process.argv.slice(2);
for (const d of [base, cloth, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(d ?? ""));
assert(base !== cloth && output !== base && output !== cloth);
await assertUnusedStagingOutput(output);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  baseFile = base + "/H01-C0-rigged.glb",
  clothFile = cloth + "/H01-C0-rigged.glb",
  baseBytes = await fs.readFile(baseFile),
  clothBytes = await fs.readFile(clothFile),
  poseBytes = await fs.readFile(poseFile),
  pose = JSON.parse(poseBytes),
  baseDoc = await io.readBinary(baseBytes),
  clothDoc = await io.readBinary(clothBytes);
for (const [dir, bytes] of [
  [base, baseBytes],
  [cloth, clothBytes],
])
  assert.equal(
    JSON.parse(await fs.readFile(dir + "/receipt.json")).sha256,
    sha256(bytes),
  );
assert(pose.poseDataValid && !pose.scales);
assert.equal(baseDoc.getRoot().listSkins().length, 1);
assert.equal(clothDoc.getRoot().listSkins().length, 1);
const baseSkin = baseDoc.getRoot().listSkins()[0],
  clothSkin = clothDoc.getRoot().listSkins()[0],
  core = baseSkin.listJoints(),
  joints = clothSkin.listJoints();
assert.equal(core.length, 54);
assert.equal(joints.length, 86);
for (let i = 0; i < core.length; i++) {
  const a = core[i],
    b = joints[i];
  assert.equal(a.getName(), b.getName());
  assert.deepEqual(a.getTranslation(), b.getTranslation());
  assert.deepEqual(a.getRotation(), b.getRotation());
  assert.deepEqual(a.getScale(), b.getScale());
  assert.equal(a.getParentNode()?.getName(), b.getParentNode()?.getName());
  assert.deepEqual(
    baseSkin.getInverseBindMatrices().getElement(i, []),
    clothSkin.getInverseBindMatrices().getElement(i, []),
  );
}
const images = (d) =>
    d
      .getRoot()
      .listTextures()
      .map((t) => sha256(t.getImage())),
  clips = (d) =>
    d
      .getRoot()
      .listAnimations()
      .map((a) => ({ name: a.getName(), channels: animationSignature(a) }));
assert.deepEqual(images(baseDoc), images(clothDoc));
assert.deepEqual(clips(baseDoc), clips(clothDoc));
const gather = (d) =>
    d
      .getRoot()
      .listNodes()
      .flatMap((n, ni) =>
        (n.getMesh()?.listPrimitives() ?? []).map((p, pi) => ({
          n,
          p,
          ni,
          pi,
        })),
      ),
  aParts = gather(baseDoc),
  bParts = gather(clothDoc);
assert.equal(aParts.length, bParts.length);
const count = aParts.reduce(
    (sum, { p }) => sum + p.getAttribute("POSITION").getCount(),
    0,
  ),
  faceCount = aParts.reduce(
    (sum, { p }) => sum + p.getIndices().getCount() / 3,
    0,
  ),
  positions = new Float32Array(count * 3),
  fans = new Uint32Array(count),
  roles = new Uint8Array(count),
  baseIds = new Uint16Array(count * 4),
  baseWeights = new Float32Array(count * 4),
  clothIds = new Uint16Array(count * 4),
  clothWeights = new Float32Array(count * 4),
  triangles = new Uint32Array(faceCount * 3),
  parts = [];
let at = 0,
  faceAt = 0;
for (let part = 0; part < aParts.length; part++) {
  const a = aParts[part],
    b = bParts[part],
    p = a.p,
    q = b.p;
  assert.equal(a.n.getName(), b.n.getName());
  assert.equal(a.pi, b.pi);
  assert.equal(p.listTargets().length, 0);
  assert.equal(q.listTargets().length, 0);
  for (const semantic of p.listSemantics())
    if (!["JOINTS_0", "WEIGHTS_0"].includes(semantic))
      assert.deepEqual(
        p.getAttribute(semantic).getArray(),
        q.getAttribute(semantic).getArray(),
      );
  assert.deepEqual(p.getIndices().getArray(), q.getIndices().getArray());
  assert.deepEqual(a.n.getMatrix(), b.n.getMatrix());
  const n = p.getAttribute("POSITION").getCount();
  positions.set(p.getAttribute("POSITION").getArray(), at * 3);
  fans.set(p.getAttribute("_SOURCE_CUT_WELD").getArray(), at);
  roles.fill(
    a.n.getName() === "H01_Robe_Left"
      ? 1
      : a.n.getName() === "H01_Robe_Right"
        ? 2
        : 0,
    at,
    at + n,
  );
  baseIds.set(p.getAttribute("JOINTS_0").getArray(), at * 4);
  baseWeights.set(p.getAttribute("WEIGHTS_0").getArray(), at * 4);
  clothIds.set(q.getAttribute("JOINTS_0").getArray(), at * 4);
  clothWeights.set(q.getAttribute("WEIGHTS_0").getArray(), at * 4);
  for (const v of p.getIndices().getArray()) triangles[faceAt++] = at + v;
  parts.push({ name: a.n.getName(), primitive: a.pi, offset: at, count: n });
  at += n;
}
assert.equal(at, count);
assert.equal(faceAt, faceCount * 3);
const channels = new Set(Object.keys(pose.rotations));
for (const n of joints) {
  assert(
    channels.delete(n.getName()),
    "Missing actual pose joint " + n.getName(),
  );
  const q = pose.rotations[n.getName()];
  assert(
    q.length === 4 &&
      q.every(Number.isFinite) &&
      Math.abs(Math.hypot(...q) - 1) < 1e-6,
  );
  n.setRotation(q);
  if (pose.translations?.[n.getName()]) {
    assert.equal(n.getName(), "Hips");
    n.setTranslation(pose.translations[n.getName()]);
  }
}
assert.equal(channels.size, 0);
const matrices = Float64Array.from(
  joints.flatMap(
    (joint, i) =>
      new Matrix4()
        .fromArray(joint.getWorldMatrix())
        .multiply(
          new Matrix4().fromArray(
            clothSkin.getInverseBindMatrices().getElement(i, []),
          ),
        ).elements,
  ),
);
assert([...matrices].every(Number.isFinite));
await fs.mkdir(output, { recursive: true });
const files = {};
for (const [name, array] of Object.entries({
  "positions.f32bin": positions,
  "fans.u32bin": fans,
  "roles.u8bin": roles,
  "base-ids.u16bin": baseIds,
  "base-weights.f32bin": baseWeights,
  "cloth-ids.u16bin": clothIds,
  "cloth-weights.f32bin": clothWeights,
  "triangles.u32bin": triangles,
  "matrices.f64bin": matrices,
})) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  await fs.writeFile(output + "/" + name, bytes);
  files[name] = sha256(bytes);
}
const protectedBytes = await fs.readFile(cloth + "/protected.u8bin"),
  clothInput = JSON.parse(await fs.readFile(cloth + "/input.json"));
assert.equal(sha256(protectedBytes), clothInput.files["protected.u8bin"]);
assert.equal(protectedBytes.length, count);
await fs.writeFile(output + "/protected.u8bin", protectedBytes);
files["protected.u8bin"] = sha256(protectedBytes);
const meta = {
  kind: "frozen-source-cloth-blend",
  baseFile,
  baseSha256: sha256(baseBytes),
  clothFile,
  clothSha256: sha256(clothBytes),
  poseFile,
  poseSha256: sha256(poseBytes),
  vertices: count,
  faces: faceCount,
  parts,
  jointCount: joints.length,
  files,
  accepted: false,
  activated: false,
  scope:
    "Source-identical parent and cloth target evaluated at one pose. Body/hand/boot/sleeve rows and mixed boundary fans must remain the original parent. A frozen-pose reduction is not animation acceptance.",
};
await fs.writeFile(
  output + "/input.json",
  JSON.stringify(meta, null, 2) + "\n",
);
console.log(JSON.stringify({ output, vertices: count, faces: faceCount }));
