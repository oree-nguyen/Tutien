import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Quaternion } from "three";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder }),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  view = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
const reports = [];
for (const hero of ["H01", "H02"]) {
  const source = await io.read(
      `public/models/hunyuan-original/${hero}-C0-source.glb`,
    ),
    rig = await io.read(`assets/rigged/${hero}-C0-rigged.glb`),
    skin = rig.getRoot().listSkins()[0],
    joints = skin.listJoints(),
    counts = new Map(joints.map((j) => [j.getName(), 0]));
  assert.equal(joints.length, 52);
  const sourcePrimitives = source
      .getRoot()
      .listMeshes()
      .flatMap((m) => m.listPrimitives()),
    rigPrimitives = rig
      .getRoot()
      .listMeshes()
      .flatMap((m) => m.listPrimitives());
  assert.equal(rigPrimitives.length, sourcePrimitives.length);
  let maxUvSeamWeightDifference = 0,
    uvSeamPairs = 0;
  let weightMaxError = 0,
    triangles = 0,
    vertices = 0;
  for (let p = 0; p < rigPrimitives.length; p++) {
    const a = sourcePrimitives[p],
      b = rigPrimitives[p];
    assert.equal(
      hash(view(a.getIndices().getArray())),
      hash(view(b.getIndices().getArray())),
      "Original triangle indices changed",
    );
    triangles += a.getIndices().getCount() / 3;
    for (const key of a.listSemantics())
      assert.equal(
        hash(view(a.getAttribute(key).getArray())),
        hash(view(b.getAttribute(key).getArray())),
        "Original attribute changed " + key,
      );
    assert.equal(b.getAttribute("JOINTS_1"), null);
    const weights = b.getAttribute("WEIGHTS_0"),
      indices = b.getAttribute("JOINTS_0"),
      ws = [],
      ids = [];
    vertices += weights.getCount();
    for (let i = 0; i < weights.getCount(); i++) {
      weights.getElement(i, ws);
      indices.getElement(i, ids);
      weightMaxError = Math.max(
        weightMaxError,
        Math.abs(ws.reduce((a, b) => a + b, 0) - 1),
      );
      for (let k = 0; k < 4; k++)
        if (ws[k] > 1e-6) {
          assert.ok(ids[k] < joints.length);
          counts.set(
            joints[ids[k]].getName(),
            counts.get(joints[ids[k]].getName()) + 1,
          );
        }
    }
    const positions = b.getAttribute("POSITION").getArray(),
      seams = new Map(),
      otherWeights = [],
      otherIds = [];
    for (let i = 0; i < weights.getCount(); i++) {
      const key = [0, 1, 2]
        .map((k) => Math.round(positions[i * 3 + k] * 1e6))
        .join(",");
      if (!seams.has(key)) {
        seams.set(key, i);
        continue;
      }
      uvSeamPairs++;
      weights.getElement(i, ws);
      indices.getElement(i, ids);
      weights.getElement(seams.get(key), otherWeights);
      indices.getElement(seams.get(key), otherIds);
      for (let k = 0; k < 4; k++) {
        if (ws[k] > 1e-8 || otherWeights[k] > 1e-8)
          assert.equal(ids[k], otherIds[k], "UV seam joint mismatch");
        maxUvSeamWeightDifference = Math.max(
          maxUvSeamWeightDifference,
          Math.abs(ws[k] - otherWeights[k]),
        );
      }
    }
  }
  assert.ok(
    maxUvSeamWeightDifference <= 1e-6,
    "UV seam weights diverge and can open cracks",
  );
  assert.ok(weightMaxError < 1e-3);
  const fingerCounts = Object.fromEntries(
    [...counts].filter(([n]) => /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(n)),
  );
  assert.equal(Object.keys(fingerCounts).length, 30);
  for (const [name, count] of Object.entries(fingerCounts))
    assert.ok(count > 0, hero + " unweighted " + name);
  assert.deepEqual(
    rig
      .getRoot()
      .listTextures()
      .map((t) => hash(t.getImage())),
    source
      .getRoot()
      .listTextures()
      .map((t) => hash(t.getImage())),
    "Embedded image bytes changed",
  );
  let ibmError = 0;
  for (let i = 0; i < joints.length; i++) {
    const current = new Matrix4()
      .fromArray(joints[i].getWorldMatrix())
      .multiply(
        new Matrix4().fromArray(
          skin.getInverseBindMatrices().getElement(i, []),
        ),
      ).elements;
    ibmError = Math.max(
      ibmError,
      ...current.map((v, k) => Math.abs(v - (k % 5 === 0 ? 1 : 0))),
    );
  }
  assert.ok(ibmError < 1e-4);
  const donor = await io.read(
    hero === "H01"
      ? "public/models/h01-c0/h01-c0-high.glb"
      : "public/models/h02-body/h02-body-high.glb",
  );
  let rotationSamples = 0,
    maxRelativeRotationError = 0;
  const clips = rig.getRoot().listAnimations();
  assert.deepEqual(
    clips.map((c) => c.getName()),
    donor
      .getRoot()
      .listAnimations()
      .map((c) => c.getName()),
  );
  for (const clip of clips) {
    assert.ok(
      clip.listSamplers().length > 0,
      clip.getName() + " missing samplers",
    );
    const donorClip = donor
      .getRoot()
      .listAnimations()
      .find((c) => c.getName() === clip.getName());
    const expected = donorClip
      .listChannels()
      .filter(
        (c) =>
          c.getTargetPath() === "rotation" ||
          (c.getTargetPath() === "translation" &&
            c.getTargetNode().getName() === "Hips"),
      );
    assert.equal(clip.listChannels().length, expected.length);
    for (const channel of clip.listChannels()) {
      assert.ok(
        clip.listSamplers().includes(channel.getSampler()),
        "Animation channel sampler is not owned by its clip",
      );
      const old = expected.find(
        (c) =>
          c.getTargetPath() === channel.getTargetPath() &&
          c.getTargetNode().getName() === channel.getTargetNode().getName(),
      );
      assert.ok(old, "Unexpected animation channel");
      const sampler = channel.getSampler(),
        original = old.getSampler();
      assert.equal(
        hash(view(sampler.getInput().getArray())),
        hash(view(original.getInput().getArray())),
        "Animation sample times changed",
      );
      assert.equal(
        sampler.getOutput().getCount(),
        original.getOutput().getCount(),
        "Keyframes lost",
      );
      if (channel.getTargetPath() !== "rotation") {
        assert.equal(
          hash(view(sampler.getOutput().getArray())),
          hash(view(original.getOutput().getArray())),
        );
        continue;
      }
      const oldBindInverse = new Quaternion()
          .fromArray(old.getTargetNode().getRotation())
          .invert(),
        newBindInverse = new Quaternion()
          .fromArray(channel.getTargetNode().getRotation())
          .invert(),
        a = new Quaternion(),
        b = new Quaternion(),
        values = sampler.getOutput().getArray(),
        originalValues = original.getOutput().getArray();
      for (let k = 0; k < values.length; k += 4) {
        a.fromArray(originalValues, k).premultiply(oldBindInverse).normalize();
        b.fromArray(values, k).premultiply(newBindInverse).normalize();
        maxRelativeRotationError = Math.max(
          maxRelativeRotationError,
          1 - Math.abs(a.dot(b)),
        );
        rotationSamples++;
        if (k > 0)
          assert.ok(
            values[k - 4] * values[k] +
              values[k - 3] * values[k + 1] +
              values[k - 2] * values[k + 2] +
              values[k - 1] * values[k + 3] >=
              -1e-6,
            "Quaternion sign discontinuity",
          );
      }
    }
  }
  assert.ok(
    maxRelativeRotationError < 1e-6,
    "Bind-relative donor motion changed",
  );
  const report = {
    hero,
    rigSha256: hash(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`)),
    vertices,
    triangles,
    joints: joints.length,
    fingerCounts,
    weightMaxError,
    maxUvSeamWeightDifference,
    uvSeamPairs,
    inverseBindIdentityError: ibmError,
    geometryAndUvAccessorBytesEqual: true,
    embeddedImageBytesEqual: true,
    clips: clips.map((c) => c.getName()),
    rotationSamples,
    maxRelativeRotationError,
    animationAcceptance:
      "Bind-relative legacy motion preserved; new entrance and grip contact are not accepted by this structural check",
  };
  reports.push(report);
  console.log(
    hero,
    "source bytes preserved; all 30 finger bones weighted; IBM error",
    ibmError,
  );
}
await fs.writeFile(
  "docs/rig-audit/fullres-structure.json",
  JSON.stringify({ passed: true, reports }, null, 2) + "\n",
);
