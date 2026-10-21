import { Quaternion, Vector3, MathUtils } from "three";
const swing = new Quaternion(),
  twist = new Quaternion(),
  axis = new Vector3(),
  delta = new Quaternion(),
  inverse = new Quaternion();
const wrap = (a) => MathUtils.euclideanModulo(a + 180, 360) - 180;
export function anatomicalAngles(
  rotation,
  bind,
  frame = new Quaternion(),
  { lateralSign = 1, twistSign = 1, restFlex = 0, anatomicalZero } = {},
) {
  if (!Number.isFinite(restFlex)) throw Error("Invalid measured rest flexion");
  if (
    anatomicalZero &&
    (!Array.isArray(anatomicalZero) ||
      anatomicalZero.length !== 4 ||
      !anatomicalZero.every(Number.isFinite) ||
      Math.abs(Math.hypot(...anatomicalZero) - 1) > 1e-6)
  )
    throw Error("Invalid anatomical zero rotation");
  if (![1, -1].includes(lateralSign) || ![1, -1].includes(twistSign))
    throw Error("Anatomical mirror signs must be +1 or -1");
  delta
    .copy(anatomicalZero ? new Quaternion(...anatomicalZero) : bind)
    .invert()
    .multiply(rotation);
  inverse.copy(frame).invert();
  delta.premultiply(inverse).multiply(frame).normalize();
  if (delta.w < 0) {
    delta.x *= -1;
    delta.y *= -1;
    delta.z *= -1;
    delta.w *= -1;
  }
  twist.set(0, delta.y, 0, delta.w);
  if (twist.lengthSq() < 1e-12) twist.identity();
  else twist.normalize();
  swing.copy(delta).multiply(inverse.copy(twist).invert()).normalize();
  const length = Math.hypot(swing.x, swing.y, swing.z),
    angle = length > 1e-9 ? (2 * Math.atan2(length, swing.w)) / length : 0;
  return {
    flex: MathUtils.radToDeg(swing.x * angle) + restFlex,
    lateral: lateralSign * MathUtils.radToDeg(swing.z * angle),
    twist:
      twistSign * wrap(MathUtils.radToDeg(2 * Math.atan2(twist.y, twist.w))),
  };
}
export function inspectJoint(
  rotation,
  bind,
  frame,
  limits,
  {
    finger = false,
    tolerance = 1,
    lateralSign = 1,
    twistSign = 1,
    restFlex = 0,
    anatomicalZero,
  } = {},
) {
  const angles = anatomicalAngles(rotation, bind, frame, {
      lateralSign,
      twistSign,
      restFlex,
      anatomicalZero,
    }),
    violations = [];
  for (const key of ["flex", "lateral", "twist"])
    if (
      angles[key] < limits[key][0] - tolerance ||
      angles[key] > limits[key][1] + tolerance
    )
      violations.push({
        code:
          finger && key === "flex" && angles.flex < limits.flex[0]
            ? "FINGER_HYPEREXTENDED"
            : "JOINT_" + key.toUpperCase() + "_LIMIT",
        axis: key,
        value: angles[key],
        min: limits[key][0],
        max: limits[key][1],
      });
  return violations;
}
export function clampJoint(
  rotation,
  bind,
  frame,
  limits,
  { lateralSign = 1, twistSign = 1, restFlex = 0, anatomicalZero } = {},
) {
  const a = anatomicalAngles(rotation, bind, frame, {
    lateralSign,
    twistSign,
    restFlex,
    anatomicalZero,
  });
  let changed = false;
  for (const key of ["flex", "lateral", "twist"]) {
    const value = MathUtils.clamp(a[key], ...limits[key]);
    changed ||= Math.abs(value - a[key]) > 1e-7;
    a[key] = value;
  }
  if (!changed) return false;
  axis.set(
    MathUtils.degToRad(a.flex - restFlex),
    0,
    MathUtils.degToRad(a.lateral * lateralSign),
  );
  const angle = axis.length();
  swing.setFromAxisAngle(
    angle > 1e-9 ? axis.multiplyScalar(1 / angle) : axis.set(1, 0, 0),
    angle,
  );
  twist.setFromAxisAngle(
    axis.set(0, 1, 0),
    MathUtils.degToRad(a.twist * twistSign),
  );
  rotation
    .copy(anatomicalZero ? new Quaternion(...anatomicalZero) : bind)
    .multiply(frame)
    .multiply(swing)
    .multiply(twist)
    .multiply(inverse.copy(frame).invert())
    .normalize();
  return true;
}
export function fingerStretchError(
  bindLength,
  currentLength,
  tolerance = 0.001,
) {
  return Math.abs(currentLength / bindLength - 1) > tolerance
    ? { code: "FINGER_BONE_STRETCH", bindLength, currentLength }
    : null;
}
export function palmGripError(normal, towardShaft) {
  const dot = normal.dot(towardShaft);
  return dot < 0.8 ? { code: "BACK_OF_HAND_GRIP", dot } : null;
}
