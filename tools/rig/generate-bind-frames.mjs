import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { Matrix4, Quaternion, Vector3 } from "three";
import { deriveHandFrame } from "../../src/rig/hand-frame.js";
const mapping = {
  hips: "Hips",
  spine: ["Spine", "Spine1", "Spine2"],
  neck: "Neck",
  head: "Head",
  sides: {},
};
for (const side of ["Left", "Right"])
  mapping.sides[side] = {
    clavicle: side + "Shoulder",
    upperArm: side + "Arm",
    lowerArm: side + "ForeArm",
    hand: side + "Hand",
    upLeg: side + "UpLeg",
    lowLeg: side + "Leg",
    foot: side + "Foot",
    toes: side + "ToeBase",
    fingers: Object.fromEntries(
      ["Thumb", "Index", "Middle", "Ring", "Pinky"].map((f) => [
        f,
        [1, 2, 3].map((i) => side + "Hand" + f + i),
      ]),
    ),
  };
await fs.writeFile(
  "data/rig/canonical-humanoid.json",
  JSON.stringify(mapping, null, 2) + "\n",
);
const handFrames = JSON.parse(
    await fs.readFile("data/rig/hand-frames.json"),
  ).heroes,
  io = new NodeIO(),
  result = { heroes: {} };
for (const hero of ["H01", "H02"]) {
  const doc = await io.read(`assets/rigged/${hero}-C0-rigged.glb`),
    joints = doc.getRoot().listSkins()[0].listJoints(),
    byName = new Map(joints.map((j) => [j.getName(), j])),
    entries = {};
  for (const joint of joints) {
    const name = joint.getName(),
      side = name.startsWith("Left")
        ? "Left"
        : name.startsWith("Right")
          ? "Right"
          : null,
      world = new Matrix4().fromArray(joint.getWorldMatrix()),
      origin = new Vector3().setFromMatrixPosition(world),
      worldRotation = new Quaternion().setFromRotationMatrix(world);
    let target,
      normal = new Vector3(0, 0, 1),
      type;
    const finger = name.match(
      /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([123])$/,
    );
    if (finger) {
      const frame = handFrames[hero].hands[finger[1]],
        points = frame.fingers[finger[2]].points;
      target = new Vector3(...points[Number(finger[3])]);
      normal.fromArray(frame.n);
      type = ["fingerMCP", "fingerPIP", "fingerDIP"][Number(finger[3]) - 1];
    } else {
      const children = joint
        .listChildren()
        .filter((c) => byName.has(c.getName()));
      const child =
        children.find(
          (c) => !/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(c.getName()),
        ) ?? children[0];
      target = child
        ? new Vector3(...child.getWorldTranslation())
        : origin
            .clone()
            .add(
              new Vector3(0, 1, 0)
                .applyQuaternion(worldRotation)
                .multiplyScalar(0.05),
            );
      type =
        name === "Hips"
          ? "hip"
          : /^Spine/.test(name)
            ? "spine"
            : name === "Neck" || name === "Head"
              ? "neck"
              : name.endsWith("Shoulder")
                ? "clavicle"
                : name.endsWith("ForeArm")
                  ? "elbow"
                  : name.endsWith("Arm")
                    ? "shoulder"
                    : name.endsWith("Hand")
                      ? "wrist"
                      : name.endsWith("UpLeg")
                        ? "hip"
                        : name.endsWith("Leg")
                          ? "knee"
                          : "ankle";
      if (type === "knee" || type === "ankle") normal.z = -1;
    }
    const y = target.clone().sub(origin).normalize(),
      x = y.clone().cross(normal).normalize();
    if (x.lengthSq() < 1e-8) x.set(1, 0, 0);
    const z = x.clone().cross(y).normalize(),
      canonicalWorld = new Quaternion().setFromRotationMatrix(
        new Matrix4().makeBasis(x, y, z),
      ),
      canonicalLocal = worldRotation.clone().invert().multiply(canonicalWorld);
    entries[name] = {
      parent: joint.getParentNode()?.getName(),
      bindPosition: joint.getTranslation(),
      bindRotation: joint.getRotation(),
      worldPosition: origin.toArray(),
      worldEnd: target.toArray(),
      length: origin.distanceTo(target),
      canonicalLocal: canonicalLocal.toArray(),
      type,
      lateralSign: side === "Right" ? -1 : 1,
    };
  }
  result.heroes[hero] = { joints: entries };
}
await fs.writeFile(
  "data/rig/bind-frames.json",
  JSON.stringify(result, null, 2) + "\n",
);
