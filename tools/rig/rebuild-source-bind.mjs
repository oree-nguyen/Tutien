import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Quaternion, Vector3 } from "three";
const hero = process.env.HERO ?? "H01";
if (!["H01", "H02"].includes(hero)) throw Error("Unknown hero");
const revision = process.env.SOURCE_BIND_REVISION ?? "v3";
if (!["v1", "v2", "v3"].includes(revision))
  throw Error("Unknown bind revision");
const directory = path.resolve(
  `.local/rig-candidates/approved-source-bind-${hero.toLowerCase()}${revision === "v1" ? "" : "-" + revision}`,
);
await fs.mkdir(directory, { recursive: true });
const input = `assets/rigged/${hero}-C0-rigged.glb`,
  bytes = await fs.readFile(input),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints(),
  frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands;
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength),
  payload = (doc) => ({
    geometry: doc
      .getRoot()
      .listMeshes()
      .map((m) =>
        m
          .listPrimitives()
          .map((p) => ({
            positions: hash(raw(p.getAttribute("POSITION").getArray())),
            normal: hash(raw(p.getAttribute("NORMAL").getArray())),
            uv: hash(raw(p.getAttribute("TEXCOORD_0").getArray())),
            triangles: hash(raw(p.getIndices().getArray())),
          })),
      ),
    images: doc
      .getRoot()
      .listTextures()
      .map((t) => hash(t.getImage())),
  }),
  before = payload(doc),
  old = new Map(
    joints.map((n) => [
      n.getName(),
      new Matrix4().fromArray(n.getWorldMatrix()),
    ]),
  );
const h01 = hero === "H01",
  heights = h01
    ? {
        Hips: 0.96,
        Spine: 1.09,
        Spine1: 1.23,
        Spine2: 1.38,
        Neck: 1.53,
        Head: 1.62,
      }
    : {
        Hips: 1.005,
        Spine: 1.145,
        Spine1: 1.3,
        Spine2: 1.46,
        Neck: 1.585,
        Head: 1.645,
      };
const points = new Map(
  Object.entries(heights).map(([name, y]) => [
    name,
    new Vector3(0, y, name === "Head" ? 0.01 : 0),
  ]),
);
function elbow(root, target, upper, lower, sign) {
  const axis = target.clone().sub(root),
    distance = axis.length();
  if (distance >= upper + lower || distance <= Math.abs(upper - lower))
    throw Error("Source wrist not reachable at fixed rest lengths");
  axis.normalize();
  const along =
      (upper * upper - lower * lower + distance * distance) / (2 * distance),
    radius = Math.sqrt(Math.max(0, upper * upper - along * along)),
    pole = new Vector3(sign * 0.2, 0, revision === "v1" ? 0.8 : -0.8)
      .addScaledVector(
        axis,
        -new Vector3(sign * 0.2, 0, revision === "v1" ? 0.8 : -0.8).dot(axis),
      )
      .normalize();
  return root
    .clone()
    .addScaledVector(axis, along)
    .addScaledVector(pole, radius);
}
for (const [side, sign] of [
  ["Left", 1],
  ["Right", -1],
]) {
  const shoulder = new Vector3(
      sign * (h01 ? 0.2 : 0.205),
      h01 ? 1.43 : 1.505,
      0,
    ),
    wrist = new Vector3(...frames[side].wrist);
  points.set(
    side + "Shoulder",
    new Vector3(sign * 0.07, h01 ? 1.42 : 1.495, 0),
  );
  points.set(side + "Arm", shoulder);
  points.set(
    side + "ForeArm",
    elbow(shoulder, wrist, h01 ? 0.28 : 0.295, h01 ? 0.255 : 0.27, sign),
  );
  points.set(side + "Hand", wrist);
  points.set(side + "UpLeg", new Vector3(sign * 0.1, h01 ? 0.94 : 0.985, 0));
  points.set(side + "Leg", new Vector3(sign * 0.1, h01 ? 0.5 : 0.525, 0));
  points.set(side + "Foot", new Vector3(sign * 0.1, h01 ? 0.08 : 0.085, 0));
  points.set(
    side + "ToeBase",
    new Vector3(sign * 0.1, 0.025, h01 ? 0.14 : 0.145),
  );
}
const desired = new Map(),
  records = [];
for (const n of joints) {
  const name = n.getName(),
    matrix = old.get(name).clone();
  if (points.has(name)) matrix.setPosition(points.get(name));
  desired.set(name, matrix);
}
const depth = (n) => (n.getParentNode() ? 1 + depth(n.getParentNode()) : 0);
for (const n of [...joints].sort((a, b) => depth(a) - depth(b))) {
  const parent = n.getParentNode(),
    parentWorld = parent
      ? (desired.get(parent.getName()) ??
        new Matrix4().fromArray(parent.getWorldMatrix()))
      : new Matrix4(),
    matrix = parentWorld.clone().invert().multiply(desired.get(n.getName()));
  n.setMatrix(matrix.elements);
  records.push({
    name: n.getName(),
    oldWorld: new Vector3()
      .setFromMatrixPosition(old.get(n.getName()))
      .toArray(),
    newWorld: n.getWorldTranslation(),
    localLength: new Vector3(...n.getTranslation()).length(),
  });
}
const auxiliary = [];
if (revision === "v3")
  for (const side of ["Left", "Right"]) {
    const fore = joints.find((n) => n.getName() === side + "ForeArm"),
      hand = joints.find((n) => n.getName() === side + "Hand"),
      roll = doc.createNode(side + "ForearmPronation");
    fore.addChild(roll);
    roll.addChild(hand);
    skin.addJoint(roll);
    joints.push(roll);
    auxiliary.push({
      name: roll.getName(),
      role: "radioulnar-pronation",
      twistLimits: [-80, 80],
      deformation:
        "Auxiliary forearm rotation about elbow-to-wrist axis, separate from elbow hinge and wrist",
    });
  }
const inverse = new Float32Array(joints.length * 16);
for (let i = 0; i < joints.length; i++)
  inverse.set(
    new Matrix4().fromArray(joints[i].getWorldMatrix()).invert().elements,
    i * 16,
  );
skin.getInverseBindMatrices().setArray(inverse);
const output = directory + `/${hero}-C0-rigged.glb`;
await io.write(output, doc);
const after = await io.read(output);
if (JSON.stringify(payload(after)) !== JSON.stringify(before))
  throw Error("Original source payload changed");
const handNames = joints
    .filter((n) => /Hand/.test(n.getName()))
    .map((n) => n.getName()),
  maximumHandWorldError = Math.max(
    ...handNames.map((name) => {
      const actual = after
        .getRoot()
        .listNodes()
        .find((n) => n.getName() === name);
      return new Vector3(...actual.getWorldTranslation()).distanceTo(
        new Vector3().setFromMatrixPosition(old.get(name)),
      );
    }),
  );
if (maximumHandWorldError > 1e-6)
  throw Error("Measured source hand bind moved");
await fs.writeFile(
  directory + "/bind.json",
  JSON.stringify(
    {
      hero,
      input,
      inputSha256: hash(bytes),
      output,
      sha256: hash(await fs.readFile(output)),
      geometryUvNormalImagesPreserved: true,
      sourceHandWorldTransformsPreserved: maximumHandWorldError <= 1e-6,
      maximumHandWorldError,
      records,
      auxiliary,
      accepted: false,
      activated: false,
      scope:
        "Derived rest-joint calibration matching feasible Gemini torso/leg lengths while preserving measured source hands and all visible source surfaces. Skin weights and animation still require regeneration and independent validation.",
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
