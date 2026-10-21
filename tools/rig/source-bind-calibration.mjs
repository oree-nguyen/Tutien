import { Matrix4, Quaternion, Vector3 } from "three";
/** Derive axes from this exact bind and measured source hand landmarks. */
export function sourceBindCalibration(doc, handFrames) {
  const skin = doc.getRoot().listSkins()[0],
    joints = skin.listJoints(),
    set = new Set(joints),
    result = {};
  for (const n of joints) {
    const name = n.getName(),
      side = name.startsWith("Left")
        ? "Left"
        : name.startsWith("Right")
          ? "Right"
          : null,
      world = new Matrix4().fromArray(n.getWorldMatrix()),
      position = new Vector3().setFromMatrixPosition(world),
      rotation = new Quaternion().setFromRotationMatrix(world).normalize(),
      finger = name.match(
        /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([123])$/,
      );
    let target,
      normal = new Vector3(0, 0, 1),
      type;
    if (finger) {
      const hand = handFrames[side],
        points = hand.fingers[finger[2]].points;
      target = new Vector3(...points[Number(finger[3])]);
      normal.fromArray(hand.n);
      type = ["fingerMCP", "fingerPIP", "fingerDIP"][Number(finger[3]) - 1];
      if (finger[2] === "Thumb" && finger[3] === "1") {
        const axis = target.clone().sub(position).normalize(),
          towardPalm = new Vector3(...hand.palmCenter)
            .sub(position)
            .projectOnPlane(axis)
            .normalize();
        if (towardPalm.dot(normal) >= 0.2) normal.copy(towardPalm);
      }
    } else if (name.endsWith("Hand")) {
      const h = handFrames[side];
      target = position.clone().add(new Vector3(...h.f).multiplyScalar(0.08));
      normal.fromArray(h.n);
      type = "wrist";
    } else {
      const child =
        name.endsWith("ForeArm") || name.endsWith("ForearmPronation")
          ? joints.find((x) => x.getName() === side + "Hand")
          : n.listChildren().find((x) => set.has(x));
      target = child
        ? new Vector3(...child.getWorldTranslation())
        : position
            .clone()
            .add(new Vector3(0, 0.05, 0).applyQuaternion(rotation));
      type = name.endsWith("ForearmPronation")
        ? "pronation"
        : name === "Hips"
          ? "hip"
          : name.startsWith("Spine")
            ? "spine"
            : ["Neck", "Head"].includes(name)
              ? "neck"
              : name.endsWith("Shoulder")
                ? "clavicle"
                : name.endsWith("ForeArm")
                  ? "elbow"
                  : name.endsWith("Arm")
                    ? "shoulder"
                    : name.endsWith("UpLeg")
                      ? "hip"
                      : name.endsWith("Leg")
                        ? "knee"
                        : "ankle";
      if (["knee", "ankle"].includes(type)) normal.set(0, 0, -1);
    }
    const y = target.clone().sub(position).normalize(),
      x = y.clone().cross(normal).normalize();
    if (x.lengthSq() < 1e-10)
      throw Error("Degenerate anatomical source basis " + name);
    const z = x.clone().cross(y).normalize(),
      q = new Quaternion().setFromRotationMatrix(
        new Matrix4().makeBasis(x, y, z),
      );
    let anatomicalZero = null,
      canonicalLocal = rotation.clone().invert().multiply(q).normalize();
    if (type === "shoulder" || type === "wrist") {
      const sourceDirection =
          type === "shoulder"
            ? y.clone()
            : new Vector3(...handFrames[side].f).normalize(),
        desiredDirection =
          type === "shoulder"
            ? new Vector3(0, -1, 0)
            : new Vector3(
                ...joints
                  .find((j) => j.getName() === side + "ForeArm")
                  .getWorldTranslation(),
              )
                .sub(position)
                .negate()
                .normalize(),
        align = new Quaternion().setFromUnitVectors(
          sourceDirection,
          desiredDirection,
        ),
        zeroWorld = align.clone().multiply(rotation).normalize(),
        parentWorld = new Quaternion()
          .setFromRotationMatrix(
            new Matrix4().fromArray(n.getParentNode().getWorldMatrix()),
          )
          .normalize(),
        neutralNormal =
          type === "shoulder"
            ? new Vector3(0, 0, 1)
            : new Vector3(...handFrames[side].n).applyQuaternion(align),
        neutralX = desiredDirection.clone().cross(neutralNormal).normalize();
      if (neutralX.lengthSq() < 1e-10)
        throw Error("Ambiguous source neutral anatomy " + name);
      const neutralZ = neutralX.clone().cross(desiredDirection).normalize(),
        basis = new Quaternion().setFromRotationMatrix(
          new Matrix4().makeBasis(neutralX, desiredDirection, neutralZ),
        );
      anatomicalZero = parentWorld
        .invert()
        .multiply(zeroWorld)
        .normalize()
        .toArray();
      canonicalLocal = zeroWorld.clone().invert().multiply(basis).normalize();
    }
    let restFlex = 0;
    if (type === "elbow") {
      const a = new Vector3(...n.getParentNode().getWorldTranslation()),
        upper = position.clone().sub(a).normalize(),
        lower = target.clone().sub(position).normalize();
      restFlex =
        (Math.atan2(x.dot(upper.clone().cross(lower)), upper.dot(lower)) *
          180) /
        Math.PI;
      if (restFlex < -5 || restFlex > 145)
        throw Error(
          "Source elbow rest pose is outside unchanged anatomical bounds " +
            name,
        );
    }
    result[name] = {
      restFlex,
      anatomicalZero,
      parent: n.getParentNode()?.getName(),
      bindPosition: n.getTranslation(),
      bindRotation: n.getRotation(),
      worldPosition: position.toArray(),
      worldRotation: rotation.toArray(),
      worldEnd: target.toArray(),
      length: position.distanceTo(target),
      canonicalLocal: canonicalLocal.toArray(),
      type,
      lateralSign: side === "Right" ? -1 : 1,
      twistSign: side === "Right" ? -1 : 1,
    };
  }
  return result;
}
export function calibratedRotation(
  frame,
  { flex = 0, lateral = 0, twist = 0 } = {},
) {
  const basis = new Quaternion(...frame.canonicalLocal),
    vector = new Vector3(
      ((flex - (frame.restFlex ?? 0)) * Math.PI) / 180,
      0,
      (lateral * (frame.lateralSign ?? 1) * Math.PI) / 180,
    ),
    angle = vector.length(),
    swing = new Quaternion().setFromAxisAngle(
      angle ? vector.divideScalar(angle) : new Vector3(1, 0, 0),
      angle,
    ),
    turn = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      (twist * (frame.twistSign ?? 1) * Math.PI) / 180,
    );
  return new Quaternion(...(frame.anatomicalZero ?? frame.bindRotation))
    .multiply(basis)
    .multiply(swing)
    .multiply(turn)
    .multiply(basis.clone().invert())
    .normalize();
}
