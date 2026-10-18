import { Vector3, Matrix4, Quaternion, MathUtils } from "three";
const vector = (a) => new Vector3().fromArray(a);
export function deriveHandFrame(hand, side, diagonalTiltDeg = 15) {
  const f = new Vector3();
  for (const name of ["Index", "Middle", "Ring", "Pinky"])
    f.add(vector(hand.fingers[name][0].position));
  f.multiplyScalar(0.25).sub(vector(hand.wrist)).normalize();
  const u = vector(hand.fingers.Index[0].position).sub(
    vector(hand.fingers.Pinky[0].position),
  );
  u.addScaledVector(f, -u.dot(f)).normalize();
  const n = side === "Right" ? u.clone().cross(f) : f.clone().cross(u);
  n.normalize();
  const gripAxis = u
    .clone()
    .multiplyScalar(Math.cos(MathUtils.degToRad(diagonalTiltDeg)))
    .addScaledVector(f, Math.sin(MathUtils.degToRad(diagonalTiltDeg)))
    .normalize();
  const center = vector(hand.wrist).lerp(
    vector(hand.fingers.Middle[0].position),
    0.5,
  );
  return {
    f: f.toArray(),
    u: u.toArray(),
    n: n.toArray(),
    boneCenter: center.toArray(),
    gripAxis: gripAxis.toArray(),
    diagonalTiltDeg,
  };
}
export function fingerBindMatrix(a, b, palmNormal) {
  const y = vector(b).sub(vector(a)).normalize(),
    x = y.clone().cross(vector(palmNormal)).normalize(),
    z = x.clone().cross(y).normalize();
  return new Matrix4().makeBasis(x, y, z).setPosition(vector(a));
}
export function handOrientation(frame, shaftAxis, palmNormal) {
  const a = vector(frame.gripAxis).normalize(),
    n = vector(frame.n);
  n.addScaledVector(a, -n.dot(a)).normalize();
  const x = a.clone().cross(n).normalize();
  const source = new Matrix4().makeBasis(x, a, n);
  const targetA = vector(shaftAxis).normalize(),
    targetN = vector(palmNormal);
  targetN.addScaledVector(targetA, -targetN.dot(targetA)).normalize();
  const targetX = targetA.clone().cross(targetN).normalize();
  return new Quaternion().setFromRotationMatrix(
    new Matrix4()
      .makeBasis(targetX, targetA, targetN)
      .multiply(source.invert()),
  );
}
