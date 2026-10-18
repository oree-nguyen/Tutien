import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { Matrix4, Vector3, Quaternion } from "three";
import { fingerBindMatrix } from "../src/rig/hand-frame.js";
import sharp from "sharp";
import { smoothJointWeights } from "./rig/smooth-weights.mjs";
import { phalangeWeights } from "../src/rig/finger-weights.js";
import { constrainHandWeights } from "./rig/constrain-skin.mjs";
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const handFrames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
const hash = (b) => createHash("sha256").update(b).digest("hex");
const base = path.resolve(".local/rigging");
await fs.mkdir(base, { recursive: true });
const outputDirectory = process.env.RIG_OUTPUT_DIR ?? "assets/rigged";
if (process.env.SKIN_FIT_ITERATIONS !== undefined) {
  const iterations = Number(process.env.SKIN_FIT_ITERATIONS);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 20000)
    throw Error("SKIN_FIT_ITERATIONS must be an integer from 1 to 20000");
}
await fs.mkdir(outputDirectory, { recursive: true });
const signature = (doc) => ({
  meshes: doc
    .getRoot()
    .listMeshes()
    .map((m) =>
      m.listPrimitives().map((p) => ({
        indices: hash(Buffer.from(p.getIndices().getArray().buffer)),
        attributes: p
          .listSemantics()
          .filter((k) => !k.startsWith("JOINTS_") && !k.startsWith("WEIGHTS_"))
          .map((k) => ({
            key: k,
            type: p.getAttribute(k).getType(),
            bytes: hash(Buffer.from(p.getAttribute(k).getArray().buffer)),
          })),
      })),
    ),
  textures: doc
    .getRoot()
    .listTextures()
    .map((t) => hash(t.getImage())),
});
for (const hero of ["H01", "H02"].filter(
  (h) => !process.env.HERO || h === process.env.HERO,
)) {
  const referenceBytes = process.env.REFERENCE_POSE
    ? await fs.readFile(process.env.REFERENCE_POSE)
    : null;
  const reference = referenceBytes ? JSON.parse(referenceBytes) : null;
  if (reference && (!reference.passed || reference.hero !== hero))
    throw Error("Reference pose must be validated for the selected hero");
  const source = `public/models/hunyuan-original/${hero}-C0-source.glb`,
    donor =
      hero === "H01"
        ? "public/models/h01-c0/h01-c0-high.glb"
        : "public/models/h02-body/h02-body-high.glb";
  const sourceBytes = await fs.readFile(source),
    sourceHash = hash(sourceBytes),
    doc = await io.read(source),
    rig = await io.read(donor),
    before = signature(doc),
    skin = rig.getRoot().listSkins()[0],
    joints = skin.listJoints();
  const decoded = path.join(base, hero + "-donor.glb"),
    names = path.join(base, hero + "-joints.json"),
    weightsFile = path.join(base, hero + "-weights.bin");
  await fs.writeFile(names, JSON.stringify(joints.map((j) => j.getName())));
  rig
    .getRoot()
    .listExtensionsUsed()
    .find((e) => e.extensionName === "EXT_meshopt_compression")
    ?.dispose();
  await io.write(decoded, rig);
  const cacheKey = sourceHash + ":" + hash(await fs.readFile(donor));
  let cache;
  try {
    cache = await fs.readFile(weightsFile + ".source", "utf8");
  } catch {}
  if (cache !== cacheKey) {
    const result = spawnSync(
      "blender",
      [
        "-b",
        "--python-exit-code",
        "1",
        "-t",
        "4",
        "--python",
        "tools/rig/transfer_weights.py",
        "--",
        "--source",
        source,
        "--donor",
        decoded,
        "--output",
        weightsFile,
        "--names",
        names,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) throw Error(hero + " weight transfer failed");
    await fs.writeFile(weightsFile + ".source", cacheKey);
  }
  const bytes = await fs.readFile(weightsFile),
    records = new Map();
  const key = (x, y, z) =>
    `${Math.round(x * 1e6)},${Math.round(y * 1e6)},${Math.round(z * 1e6)}`;
  for (let offset = 0; offset < bytes.length; offset += 32) {
    const x = bytes.readFloatLE(offset),
      y = bytes.readFloatLE(offset + 4),
      z = bytes.readFloatLE(offset + 8);
    records.set(key(x, y, z), { offset, x, y, z });
  }
  const map = new Map();
  function copyNode(node) {
    if (map.has(node)) return map.get(node);
    const n = doc
      .createNode(node.getName())
      .setTranslation(node.getTranslation())
      .setRotation(node.getRotation())
      .setScale(node.getScale());
    map.set(node, n);
    for (const child of node.listChildren())
      if (!child.getMesh()) n.addChild(copyNode(child));
    return n;
  }
  const scene = doc.getRoot().listScenes()[0];
  for (const node of rig.getRoot().listScenes()[0].listChildren())
    if (!node.getMesh()) scene.addChild(copyNode(node));
  const buffer = doc.getRoot().listBuffers()[0],
    newSkin = doc.createSkin(hero + "Skeleton");
  for (const j of joints) newSkin.addJoint(map.get(j));
  const handSpecs = [];
  for (const [side, frame] of Object.entries(handFrames[hero].hands)) {
    const fingers = [];
    const handNode = map.get(joints.find((j) => j.getName() === side + "Hand")),
      worldHand = new Matrix4()
        .fromArray(handNode.getWorldMatrix())
        .setPosition(new Vector3(...handFrames[hero].hands[side].wrist));
    handNode.setMatrix(
      new Matrix4()
        .fromArray(handNode.getParentNode().getWorldMatrix())
        .invert()
        .multiply(worldHand).elements,
    );
    for (const [finger, data] of Object.entries(frame.fingers)) {
      const points = data.points;
      for (let k = 0; k < 3; k++) {
        const old = joints.find(
            (j) => j.getName() === side + "Hand" + finger + (k + 1),
          ),
          node = map.get(old),
          world = fingerBindMatrix(points[k], points[k + 1], frame.n),
          local = new Matrix4()
            .fromArray(node.getParentNode().getWorldMatrix())
            .invert()
            .multiply(world);
        node.setMatrix(local.elements);
      }
      fingers.push({
        points,
        indices: [1, 2, 3].map((k) =>
          joints.findIndex((j) => j.getName() === side + "Hand" + finger + k),
        ),
        radius: Math.max(
          0.012,
          Math.min(
            0.028,
            Math.max(...data.thickness.filter(Boolean)) * 0.5 + 0.003,
          ),
        ),
      });
    }
    const points = fingers.flatMap((f) => f.points);
    handSpecs.push({
      side,
      hand: joints.findIndex((j) => j.getName() === side + "Hand"),
      fingers,
      low: [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])) - 0.03),
      high: [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])) + 0.03),
    });
  }
  const collapseFinger = new Map();
  for (const [i, joint] of joints.entries()) {
    const m = joint
      .getName()
      .match(/^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)/);
    if (m)
      collapseFinger.set(
        i,
        joints.findIndex((j) => j.getName() === m[1] + "Hand"),
      );
  }
  function segment(p, a, b) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      length2 = dx * dx + dy * dy + dz * dz,
      t = ((p.x - a[0]) * dx + (p.y - a[1]) * dy + (p.z - a[2]) * dz) / length2,
      q = Math.max(0, Math.min(1, t));
    return {
      distance: Math.hypot(
        p.x - a[0] - q * dx,
        p.y - a[1] - q * dy,
        p.z - a[2] - q * dz,
      ),
      t,
      along: t * Math.sqrt(length2),
    };
  }
  function refineHand(p, ids, ws, i, isSkin) {
    const old = new Map();
    for (let k = 0; k < 4; k++) {
      const id = collapseFinger.get(ids[i * 4 + k]) ?? ids[i * 4 + k];
      old.set(id, (old.get(id) ?? 0) + ws[i * 4 + k]);
    }
    let selected = old;
    for (const hand of handSpecs) {
      if (
        p.x < hand.low[0] ||
        p.x > hand.high[0] ||
        p.y < hand.low[1] ||
        p.y > hand.high[1] ||
        p.z < hand.low[2] ||
        p.z > hand.high[2]
      )
        continue;
      let best;
      for (const finger of hand.fingers) {
        const distances = finger.points
            .slice(0, 3)
            .map((a, k) => segment(p, a, finger.points[k + 1])),
          distance = Math.min(...distances.map((d) => d.distance));
        if (!best || distance < best.distance)
          best = { finger, distances, distance };
      }
      if (best.distance > best.finger.radius) continue;
      // Dark knuckle creases are still skin. A hard albedo mask along a free
      // finger strands those vertices at the wrist and creates long spikes.
      // Use the cuff mask only at the stationary root transition.
      if (!isSkin && best.distances[0].along < 0.006) continue;
      const first = best.distances[0],
        x = Math.max(0, Math.min(1, first.along / 0.018)),
        blend = x * x * (3 - 2 * x),
        adjacent = phalangeWeights(best.finger.points, best.distances);
      selected = new Map([[hand.hand, 1 - blend]]);
      for (let k = 0; k < 3; k++)
        selected.set(best.finger.indices[k], blend * adjacent[k]);
      break;
    }
    const entries = [...selected]
        .filter(([id, w]) => w > 1e-8)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      total = entries.reduce((s, e) => s + e[1], 0);
    for (let k = 0; k < 4; k++) {
      ids[i * 4 + k] = entries[k]?.[0] ?? 0;
      ws[i * 4 + k] = (entries[k]?.[1] ?? 0) / total;
    }
  }

  const meshNode = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh()),
    ibms = new Float32Array(joints.length * 16),
    meshWorld = new Matrix4().fromArray(meshNode.getWorldMatrix());
  for (let i = 0; i < joints.length; i++)
    new Matrix4()
      .fromArray(map.get(joints[i]).getWorldMatrix())
      .invert()
      .multiply(meshWorld)
      .toArray(ibms, i * 16);
  newSkin.setInverseBindMatrices(
    doc
      .createAccessor("InverseBindMatrices")
      .setType(Accessor.Type.MAT4)
      .setArray(ibms)
      .setBuffer(buffer),
  );
  meshNode.setSkin(newSkin);
  let maxPositionError = 0,
    unmatched = 0;
  const smoothing = [],
    constraintFitting = [];
  for (const primitive of meshNode.getMesh().listPrimitives()) {
    const texture = primitive.getMaterial().getBaseColorTexture(),
      image = await sharp(texture.getImage())
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      uv = primitive.getAttribute("TEXCOORD_0"),
      texcoord = [];
    const pos = primitive.getAttribute("POSITION"),
      ids = new Uint8Array(pos.getCount() * 4),
      ws = new Float32Array(pos.getCount() * 4),
      p = new Vector3(),
      element = [];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, element);
      p.fromArray(element).applyMatrix4(meshWorld);
      let r = records.get(key(p.x, p.y, p.z));
      if (!r) {
        let best = Infinity;
        for (let x = -1; x <= 1; x++)
          for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++) {
              const c = records.get(
                key(p.x + x * 1e-6, p.y + y * 1e-6, p.z + z * 1e-6),
              );
              if (c) {
                const d = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);
                if (d < best) {
                  best = d;
                  r = c;
                }
              }
            }
      }
      if (!r) {
        unmatched++;
        continue;
      }
      maxPositionError = Math.max(
        maxPositionError,
        Math.hypot(r.x - p.x, r.y - p.y, r.z - p.z),
      );
      for (let k = 0; k < 4; k++) {
        ids[i * 4 + k] = bytes.readUInt8(r.offset + 12 + k);
        ws[i * 4 + k] = bytes.readFloatLE(r.offset + 16 + k * 4);
      }
      uv.getElement(i, texcoord);
      const x = Math.max(
          0,
          Math.min(
            image.info.width - 1,
            Math.floor(texcoord[0] * image.info.width),
          ),
        ),
        y = Math.max(
          0,
          Math.min(
            image.info.height - 1,
            Math.floor(texcoord[1] * image.info.height),
          ),
        ),
        pixel = (y * image.info.width + x) * image.info.channels,
        red = image.data[pixel],
        green = image.data[pixel + 1],
        blue = image.data[pixel + 2];
      // Measured hand albedo separates warm skin from the green silk/white cuffs.
      // This affects finger weights only; the embedded image is never modified.
      const isSkin =
        red - green > 20 &&
        green - blue > 8 &&
        green / red > 0.5 &&
        green / red < 0.83 &&
        blue / green > 0.6 &&
        blue / green < 0.94;
      refineHand(p, ids, ws, i, isSkin);
    }
    smoothing.push(
      smoothJointWeights(
        pos.getArray(),
        primitive.getIndices().getArray(),
        ids,
        ws,
        joints.length,
        new Set(collapseFinger.keys()),
      ),
    );
    smoothing.push(
      smoothJointWeights(
        pos.getArray(),
        primitive.getIndices().getArray(),
        ids,
        ws,
        joints.length,
        new Set(collapseFinger.keys()),
        384,
        {
          includeFingers: true,
          distanceWeighted: true,
          region: (x, y, z) =>
            handSpecs.some(
              (hand) =>
                x >= hand.low[0] - 0.04 &&
                x <= hand.high[0] + 0.04 &&
                y >= hand.low[1] - 0.04 &&
                y <= hand.high[1] + 0.04 &&
                z >= hand.low[2] - 0.04 &&
                z <= hand.high[2] + 0.04,
            ),
        },
      ),
    );
    const tipCores = Object.entries(handFrames[hero].hands).flatMap(
      ([side, frame]) =>
        Object.entries(frame.fingers).map(([finger, data]) => ({
          joint: joints.findIndex(
            (j) => j.getName() === side + "Hand" + finger + "3",
          ),
          point: data.points[3],
        })),
    );
    constraintFitting.push(
      constrainHandWeights(
        pos.getArray(),
        primitive.getIndices().getArray(),
        ids,
        ws,
        joints.map((j) => map.get(j)),
        newSkin,
        {
          tipCores,
          iterations: Number(
            process.env.SKIN_FIT_ITERATIONS ?? (hero === "H01" ? 6000 : 500),
          ),
          ...(reference
            ? {
                poseSamples: [
                  { strength: 0.2 },
                  { strength: 1 },
                  { rotations: reference.rotations },
                ],
                affectedRegion: (x, y, z) =>
                  handSpecs.some(
                    (h) =>
                      x >= h.low[0] - 0.022 &&
                      x <= h.high[0] + 0.022 &&
                      y >= h.low[1] - 0.022 &&
                      y <= h.high[1] + 0.022 &&
                      z >= h.low[2] - 0.022 &&
                      z <= h.high[2] + 0.022,
                  ),
              }
            : {}),
          onProgress: (progress) => console.log(hero, "skin fit", progress),
        },
      ),
    );
    primitive.setAttribute(
      "JOINTS_0",
      doc
        .createAccessor("JointIndices")
        .setType(Accessor.Type.VEC4)
        .setArray(ids)
        .setBuffer(buffer),
    );
    primitive.setAttribute(
      "WEIGHTS_0",
      doc
        .createAccessor("SkinWeights")
        .setType(Accessor.Type.VEC4)
        .setArray(ws)
        .setBuffer(buffer),
    );
  }
  assert.equal(unmatched, 0, "Unmatched source vertices");
  assert.ok(maxPositionError < 3e-6);
  for (const clip of rig.getRoot().listAnimations()) {
    const animation = doc.createAnimation(clip.getName());
    for (const channel of clip.listChannels()) {
      if (
        channel.getTargetPath() === "scale" ||
        (channel.getTargetPath() === "translation" &&
          channel.getTargetNode().getName() !== "Hips")
      )
        continue;
      const sampler = channel.getSampler(),
        input = doc
          .createAccessor()
          .setType(sampler.getInput().getType())
          .setArray(sampler.getInput().getArray().slice())
          .setBuffer(buffer),
        output = sampler.getOutput().getArray().slice();
      if (channel.getTargetPath() === "rotation") {
        // Re-express the donor's bind-relative motion in the calibrated bind frame.
        // Copying absolute local rotations would undo the measured finger alignment.
        const oldBind = new Quaternion().fromArray(
            channel.getTargetNode().getRotation(),
          ),
          newBind = new Quaternion().fromArray(
            map.get(channel.getTargetNode()).getRotation(),
          ),
          correction = newBind.multiply(oldBind.invert()),
          rotation = new Quaternion();
        for (let i = 0; i < output.length; i += 4)
          rotation
            .fromArray(output, i)
            .premultiply(correction)
            .normalize()
            .toArray(output, i);
        for (let i = 4; i < output.length; i += 4)
          if (
            output[i - 4] * output[i] +
              output[i - 3] * output[i + 1] +
              output[i - 2] * output[i + 2] +
              output[i - 1] * output[i + 3] <
            0
          )
            for (let k = 0; k < 4; k++) output[i + k] *= -1;
      }
      const out = doc
        .createAccessor()
        .setType(sampler.getOutput().getType())
        .setArray(output)
        .setBuffer(buffer);
      const s = doc
        .createAnimationSampler()
        .setInput(input)
        .setOutput(out)
        .setInterpolation(sampler.getInterpolation());
      animation.addSampler(s);
      animation.addChannel(
        doc
          .createAnimationChannel()
          .setTargetNode(map.get(channel.getTargetNode()))
          .setTargetPath(channel.getTargetPath())
          .setSampler(s),
      );
    }
  }
  assert.deepEqual(signature(doc), before);
  const output = path.join(outputDirectory, `${hero}-C0-rigged.glb`);
  const temporary = output + ".pending.glb";
  await io.write(temporary, doc);
  assert.deepEqual(signature(await io.read(temporary)), before);
  assert.equal(hash(await fs.readFile(source)), sourceHash);
  await fs.rename(temporary, output);
  const receipt = {
    hero,
    file: path.basename(output),
    source,
    sourceHash,
    donor,
    donorHash: hash(await fs.readFile(donor)),
    sha256: hash(await fs.readFile(output)),
    bytes: (await fs.stat(output)).size,
    joints: joints.length,
    maxPositionError,
    smoothing,
    constraintFitting,
    calibrationHash: hash(await fs.readFile("data/rig/hand-frames.json")),
    referencePoseHash: referenceBytes ? hash(referenceBytes) : null,
    builderHash: hash(await fs.readFile("tools/rig-full-resolution.mjs")),
    weightTransferHash: hash(bytes),
    recipeHashes: Object.fromEntries(
      await Promise.all(
        [
          "tools/rig-full-resolution.mjs",
          "tools/rig/constrain-skin.mjs",
          "tools/rig/smooth-weights.mjs",
          "src/rig/finger-weights.js",
        ].map(async (p) => [p, hash(await fs.readFile(p))]),
      ),
    ),
    sourceGeometryAndTextureBytesPreserved: true,
    status:
      "staging: source skin transfer; new entrance/palm verification not yet accepted",
  };
  await fs.writeFile(output + ".json", JSON.stringify(receipt, null, 2) + "\n");
  console.log(receipt);
}
