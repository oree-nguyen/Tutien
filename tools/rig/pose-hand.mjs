import { Matrix4, Quaternion, Vector3, MathUtils } from "three";

/** Offline FK; callers independently compare it to the actual GLTFLoader rig. */
export function posedHand(
  doc,
  frame,
  side,
  result,
  { applyFingerPose = true } = {},
) {
  const skin = doc.getRoot().listSkins()[0],
    joints = skin.listJoints(),
    worlds = new Map();
  function world(node) {
    if (worlds.has(node)) return worlds.get(node);
    const q = new Quaternion(...node.getRotation()),
      match = node
        .getName()
        .match(
          new RegExp(
            "^" + side + "Hand(Thumb|Index|Middle|Ring|Pinky)([123])$",
          ),
        );
    if (match && applyFingerPose) {
      const pose = result.fingers[match[1]],
        i = Number(match[2]) - 1,
        swing = new Vector3(
          MathUtils.degToRad(pose.angles[i]),
          0,
          i === 0 ? MathUtils.degToRad(pose.opposition) : 0,
        ),
        angle = swing.length();
      q.multiply(
        new Quaternion().setFromAxisAngle(
          angle ? swing.divideScalar(angle) : new Vector3(1, 0, 0),
          angle,
        ),
      ).multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 1, 0),
          MathUtils.degToRad(pose.twists[i]),
        ),
      );
    }
    const matrix = new Matrix4().compose(
      new Vector3(...node.getTranslation()),
      q,
      new Vector3(...node.getScale()),
    );
    if (node.getParentNode()) matrix.premultiply(world(node.getParentNode()));
    worlds.set(node, matrix);
    return matrix;
  }
  const matrices = joints.map((joint, i) =>
      world(joint)
        .clone()
        .multiply(
          new Matrix4().fromArray(
            skin.getInverseBindMatrices().getElement(i, []),
          ),
        ),
    ),
    node = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh()),
    p = node.getMesh().listPrimitives()[0],
    positions = p.getAttribute("POSITION").getArray(),
    ids = p.getAttribute("JOINTS_0").getArray(),
    weights = p.getAttribute("WEIGHTS_0").getArray(),
    landmarks = [
      frame.wrist,
      ...Object.values(frame.fingers).flatMap((f) => f.points),
    ],
    low = [0, 1, 2].map((k) => Math.min(...landmarks.map((p) => p[k])) - 0.022),
    high = [0, 1, 2].map(
      (k) => Math.max(...landmarks.map((p) => p[k])) + 0.022,
    ),
    vertices = [],
    sourceIds = [],
    mask = new Uint8Array(positions.length / 3),
    v = new Vector3(),
    tmp = new Vector3();
  function position(index) {
    v.set(0, 0, 0);
    for (let k = 0; k < 4; k++)
      if (weights[index * 4 + k]) {
        tmp
          .fromArray(positions, index * 3)
          .applyMatrix4(matrices[ids[index * 4 + k]]);
        v.addScaledVector(tmp, weights[index * 4 + k]);
      }
    return v.clone();
  }
  for (let i = 0; i < positions.length / 3; i++)
    if (
      [0, 1, 2].every(
        (k) =>
          positions[i * 3 + k] >= low[k] && positions[i * 3 + k] <= high[k],
      )
    ) {
      vertices.push(position(i));
      sourceIds.push(i);
      mask[i] = 1;
    }
  return { vertices, sourceIds, mask, position, primitive: p };
}
