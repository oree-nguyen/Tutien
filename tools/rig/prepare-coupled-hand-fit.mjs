/** Hand+cuff source-star experiment: measured seeds pinned, all other source frozen. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sha256 } from "./animation-payload.mjs";
import {
  sourceSupportStar,
  assertSourceFanSkin,
  localizeEmptyArmSlots,
} from "./source-support-star.mjs";

const [candidate, geometry, output, ...poseFiles] = process.argv.slice(2);
for (const p of [candidate, geometry, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(p ?? ""));
assert(poseFiles.length >= 3);
await assert.rejects(fs.access(output), { code: "ENOENT" });
const bytes = await fs.readFile(candidate + "/H01-C0-rigged.glb");
const receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
assert.equal(sha256(bytes), receipt.sha256);
const solveBytes = await fs.readFile(candidate + "/solve.json"),
  solve = JSON.parse(solveBytes);
assert.equal(sha256(solveBytes), receipt.solveSha256);
for (const [name, hash] of Object.entries(solve.files))
  assert.equal(sha256(await fs.readFile(candidate + "/" + name)), hash);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes);
const skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints(),
  names = joints.map((n) => n.getName());
const typed = async (folder, name, Type) => {
  const b = await fs.readFile(folder + "/" + name);
  return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const p = await typed(geometry, "positions.bin", Float32Array),
  fans = await typed(geometry, "groups.bin", Uint32Array),
  tri = await typed(geometry, "triangles.bin", Uint32Array);
const allIds = new Uint16Array(fans.length * 4),
  allWeights = new Float32Array(fans.length * 4);
let at = 0,
  corner = 0;
for (const n of doc.getRoot().listNodes())
  for (const q of n.getMesh()?.listPrimitives() ?? []) {
    const count = q.getAttribute("POSITION").getCount();
    assert.deepEqual(
      q.getAttribute("POSITION").getArray(),
      p.subarray(at * 3, (at + count) * 3),
    );
    assert.deepEqual(
      q.getAttribute("_SOURCE_CUT_WELD").getArray(),
      fans.subarray(at, at + count),
    );
    for (const v of q.getIndices().getArray())
      assert.equal(v + at, tri[corner++]);
    allIds.set(q.getAttribute("JOINTS_0").getArray(), at * 4);
    allWeights.set(q.getAttribute("WEIGHTS_0").getArray(), at * 4);
    at += count;
  }
assert.equal(at, fans.length);
assert.equal(corner, tri.length);
const handFans = await typed(solve.input, "fans.u32bin", Uint32Array),
  touched = await typed(candidate, "touched.u8bin", Uint8Array);
const active = new Set(Array.from(handFans).filter((_, i) => touched[i]));
for (const fan of await typed(
  candidate,
  solve.additionalFanField.fans,
  Uint32Array,
))
  active.add(fan);
const locked = new Map();
for (const hand of solve.hands)
  for (const seed of hand.measuredSeeds)
    for (const fan of seed.currentSourceFans) {
      assert(!locked.has(fan) || locked.get(fan) === seed.joint);
      locked.set(fan, seed.joint);
    }
for (const record of solve.externalSeedsPreserved) {
  const q = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === record.node)
    .getMesh()
    .listPrimitives()[record.primitive];
  locked.set(
    q.getAttribute("_SOURCE_CUT_WELD").getScalar(record.vertex),
    record.requiredJoint,
  );
}
const star = sourceSupportStar(tri, fans, active),
  count = star.fans.length;
const sourceFanAudit = assertSourceFanSkin(
  fans,
  p,
  allIds,
  allWeights,
  star.fans,
);
const positions = new Float32Array(count * 3),
  ids = new Uint16Array(count * 4),
  weights = new Float32Array(count * 4),
  protectedMask = new Uint8Array(count);
let neutralSlots = 0;
for (let i = 0; i < count; i++) {
  const v = star.representatives[i];
  positions.set(p.subarray(v * 3, v * 3 + 3), i * 3);
  ids.set(allIds.subarray(v * 4, v * 4 + 4), i * 4);
  weights.set(allWeights.subarray(v * 4, v * 4 + 4), i * 4);
  protectedMask[i] = Number(
    !active.has(star.fans[i]) || locked.has(star.fans[i]),
  );
  if (locked.has(star.fans[i])) {
    const bone = names.indexOf(locked.get(star.fans[i]));
    assert(
      Array.from(ids.subarray(i * 4, i * 4 + 4)).reduce(
        (s, id, k) => s + (id === bone ? weights[i * 4 + k] : 0),
        0,
      ) >=
        1 - 1e-7,
      "Stale measured finger/palm seed",
    );
  }
  if (!protectedMask[i])
    neutralSlots += localizeEmptyArmSlots(
      ids.subarray(i * 4, i * 4 + 4),
      weights.subarray(i * 4, i * 4 + 4),
      names,
    );
}
const bind = joints.map((n) => [n, n.getTranslation(), n.getRotation()]);
const matrices = new Float64Array(poseFiles.length * joints.length * 16),
  poses = [];
for (const [a, file] of poseFiles.entries()) {
  const b = await fs.readFile(file),
    pose = JSON.parse(b);
  assert.equal(Object.keys(pose.rotations).length, joints.length);
  for (const [n, t, q] of bind) {
    n.setTranslation(t);
    n.setRotation(q);
  }
  for (const n of joints) {
    const q = pose.rotations[n.getName()];
    assert(
      q?.length === 4 &&
        q.every(Number.isFinite) &&
        Math.abs(Math.hypot(...q) - 1) < 1e-6,
    );
    n.setRotation(q);
  }
  for (const [name, t] of Object.entries(pose.translations ?? {})) {
    const n = joints.find((n) => n.getName() === name);
    assert(n && t.length === 3 && t.every(Number.isFinite));
    if (name !== "Hips")
      assert.deepEqual(t, bind.find(([node]) => node === n)[1]);
    n.setTranslation(t);
  }
  for (let j = 0; j < joints.length; j++)
    matrices.set(
      new Matrix4()
        .fromArray(joints[j].getWorldMatrix())
        .multiply(
          new Matrix4().fromArray(
            skin.getInverseBindMatrices().getElement(j, []),
          ),
        ).elements,
      (a * joints.length + j) * 16,
    );
  poses.push({ file, sha256: sha256(b) });
}
await fs.mkdir(output);
await fs.link(candidate + "/H01-C0-rigged.glb", output + "/H01-C0-rigged.glb");
const files = {},
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
for (const [file, value] of Object.entries({
  "positions.bin": positions,
  "groups.bin": star.fans,
  "triangles.bin": star.triangles,
  "source-faces.u32bin": star.sourceFaces,
  "result-ids.bin": ids,
  "result-weights.bin": weights,
  "protected.bin": protectedMask,
  "feasibility-matrices.bin": matrices,
})) {
  const b = raw(value);
  await fs.writeFile(output + "/" + file, b);
  files[file] = sha256(b);
}
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(
    { sha256: receipt.sha256, accepted: false, activated: false },
    null,
    2,
  ) + "\n",
);
await fs.writeFile(
  output + "/feasibility-input.json",
  JSON.stringify(
    {
      kind: "source-support-layout",
      candidate,
      candidateSolveSha256: receipt.solveSha256,
      assetSha256: receipt.sha256,
      poseFile: poses[0].file,
      poseSha256: poses[0].sha256,
      poseCount: poses.length,
      poses,
      matricesSha256: files["feasibility-matrices.bin"],
      files,
      vertices: count,
      sourceFaces: star.sourceFaces.length,
      originalSourceFaces: tri.length / 3,
      sourceSeedFans: locked.size,
      freeFans: protectedMask.reduce((s, p) => s + Number(!p), 0),
      zeroWeightSlotsMadeLocal: neutralSlots,
      emptySlotPolicy:
        "v2: keep same-side local zero-weight finger/arm supports; replace only unrelated empty IDs",
      sourceFanAudit,
      scope:
        "Complete source-triangle star of hash-bound hand/cuff fields. All incident edges include fixed outside neighbors. Audited seed fans pinned; no role/color/coordinate crop. Geometry is numerical only; full-source export and validation required.",
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(output, count, "source fans");
