/** Prepare measured frozen poses for the convex weight experiment. Never activates it. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Vector3 } from "three";
import { calibratedRotation } from "./source-bind-calibration.mjs";
const [candidate, poseFile, output] = process.argv.slice(2);
const staging = path.resolve(".local/rig-candidates");
if (
  !candidate ||
  !poseFile ||
  !output ||
  !path.resolve(output).startsWith(staging + path.sep) ||
  path.resolve(candidate) === path.resolve(output)
)
  throw Error("Provide separate staging input/output and pose JSON");
const meta = JSON.parse(await fs.readFile(path.join(candidate, "input.json"))),
  hero = meta.hero;
if (!["H01", "H02"].includes(hero)) throw Error("Unknown source hero");
const asset = path.join(candidate, hero + "-C0-rigged.glb"),
  bytes = await fs.readFile(asset),
  poseBytes = await fs.readFile(poseFile),
  pose = JSON.parse(poseBytes),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints(),
  nodes = new Map(joints.map((n) => [n.getName(), n]));
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
if (
  pose.hero !== hero ||
  pose.inputSha256 !== hash(await fs.readFile(meta.input))
)
  throw Error("Pose and source bind differ");
if (
  doc.getRoot().listMeshes().length !== 1 ||
  doc.getRoot().listMeshes()[0].listPrimitives().length !== 1
)
  throw Error("Explicit single source surface required for this experiment");
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  positions = primitive.getAttribute("POSITION").getArray();
if (
  !(positions instanceof Float32Array) ||
  primitive.getAttribute("POSITION").getNormalized()
)
  throw Error("Float source coordinates required");
for (const [name, q] of Object.entries(pose.rotations)) {
  if (
    !nodes.has(name) ||
    q.length !== 4 ||
    !q.every(Number.isFinite) ||
    Math.abs(Math.hypot(...q) - 1) > 1e-6
  )
    throw Error("Invalid pose rotation " + name);
  nodes.get(name).setRotation(q);
}
for (const [name, p] of Object.entries(pose.translations)) {
  if (name !== "Hips" || p.length !== 3 || !p.every(Number.isFinite))
    throw Error("Invalid pose translation");
  nodes.get(name).setTranslation(p);
}
const poseCount = process.env.WEIGHT_FINGER_STRESS === "1" ? 2 : 1,
  matrices = new Float64Array(poseCount * joints.length * 16),
  ibm = skin.getInverseBindMatrices();
function captureMatrices(index) {
  for (let i = 0; i < joints.length; i++)
    matrices.set(
      new Matrix4()
        .fromArray(joints[i].getWorldMatrix())
        .multiply(new Matrix4().fromArray(ibm.getElement(i, []))).elements,
      (index * joints.length + i) * 16,
    );
}
captureMatrices(0);
let stressPose = null;
if (poseCount === 2) {
  stressPose = structuredClone(pose);
  stressPose.scope =
    "Artificial 45/60/40-degree open-to-fist skin stress pose, not final Gemini pose or contact acceptance";
  stressPose.passed = false;
  stressPose.accepted = false;
  for (const [name, node] of nodes) {
    const finger = name.match(/Hand(?:Thumb|Index|Middle|Ring|Pinky)([123])$/);
    if (!finger) continue;
    const frame = pose.frames[name];
    if (!frame) throw Error("Missing source finger calibration " + name);
    const rotation = calibratedRotation(frame, {
      flex: [45, 60, 40][Number(finger[1]) - 1],
    }).toArray();
    node.setRotation(rotation);
    stressPose.rotations[name] = rotation;
  }
  captureMatrices(1);
}
const frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json"))
    .heroes[hero].hands,
  points = Object.values(frames).flatMap((f) =>
    Object.values(f.fingers).flatMap((f) => f.points),
  ),
  protectedVertices = new Uint8Array(positions.length / 3),
  v = new Vector3();
for (let i = 0; i < protectedVertices.length; i++) {
  v.fromArray(positions, i * 3);
  protectedVertices[i] = Number(
    points.some((p) => v.distanceToSquared(new Vector3(...p)) < 0.025 ** 2),
  );
}
let protectedSeedReportSha256 = null;
if (process.env.WEIGHT_SEED_PROTECTION === "1") {
  const seedBytes = await fs.readFile(path.join(candidate, "heat-solve.json")),
    seedReport = JSON.parse(seedBytes);
  protectedSeedReportSha256 = hash(seedBytes);
  protectedVertices.fill(0);
  for (const hand of seedReport.hands ?? [])
    for (const seed of hand.seeds ?? []) {
      const j = joints.findIndex((n) => n.getName() === seed.joint);
      if (j < 0 || seed.originalSourceVertexIDs?.length < 6)
        throw Error("Incomplete source seed evidence");
      for (const id of seed.originalSourceVertexIDs) {
        if (!Number.isInteger(id) || id < 0 || id >= protectedVertices.length)
          throw Error("Invalid source seed vertex");
        const ids = primitive.getAttribute("JOINTS_0").getElement(id, []),
          weights = primitive.getAttribute("WEIGHTS_0").getElement(id, []);
        if (
          ids.reduce(
            (sum, joint, k) => sum + (joint === j ? weights[k] : 0),
            0,
          ) < 0.999
        )
          throw Error("Source seed influence is stale");
        protectedVertices[id] = 1;
      }
    }
  if (!protectedVertices.some(Boolean))
    throw Error("No source seed protection");
}
await fs.mkdir(output, { recursive: true });
if (stressPose)
  await fs.writeFile(
    path.join(output, "finger-stress-pose.json"),
    JSON.stringify(stressPose, null, 2) + "\n",
  );
await fs.copyFile(asset, path.join(output, hero + "-C0-rigged.glb"));
for (const [name, a] of Object.entries({
  "positions.bin": positions,
  "triangles.bin": Uint32Array.from(primitive.getIndices().getArray()),
  "result-ids.bin": Uint16Array.from(
    primitive.getAttribute("JOINTS_0").getArray(),
  ),
  "result-weights.bin": Float32Array.from(
    primitive.getAttribute("WEIGHTS_0").getArray(),
  ),
  "protected.bin": protectedVertices,
  "feasibility-matrices.bin": matrices,
}))
  await fs.writeFile(path.join(output, name), raw(a));
await fs.writeFile(
  path.join(output, "input.json"),
  JSON.stringify({ ...meta, input: asset, inputSha256: hash(bytes) }, null, 2) +
    "\n",
);
await fs.writeFile(
  path.join(output, "receipt.json"),
  JSON.stringify(
    { hero, sha256: hash(bytes), accepted: false, activated: false },
    null,
    2,
  ) + "\n",
);
await fs.writeFile(
  path.join(output, "feasibility-input.json"),
  JSON.stringify(
    {
      hero,
      poseCount,
      protectedSeedReportSha256,
      assetSha256: hash(bytes),
      matricesSha256: hash(raw(matrices)),
      poseFile,
      poseSha256: hash(poseBytes),
      scope:
        "Frozen-pose weight feasibility only; optional source-seed protection and artificial finger stress are not approved anatomy or whole-motion acceptance",
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
