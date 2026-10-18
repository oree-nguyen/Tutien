import { Matrix4, Quaternion, Vector3, MathUtils } from "three";
import { inspectJoint, anatomicalAngles } from "../../src/rig/joint-limits.js";

/** Offline two-link solve with anatomical elbow hinge, never bone scaling. */
export class ReferencePose {
  constructor(doc, frames, limits) {
    this.doc = doc;
    this.frames = frames;
    this.limits = limits;
    this.joints = doc.getRoot().listSkins()[0].listJoints();
    this.nodes = new Map(this.joints.map((node) => [node.getName(), node]));
    this.bind = new Map(
      this.joints.map((node) => [
        node,
        { position: node.getTranslation(), rotation: node.getRotation() },
      ]),
    );
  }
  reset() {
    for (const [node, bind] of this.bind) {
      node.setTranslation(bind.position);
      node.setRotation(bind.rotation);
    }
  }
  position(node) {
    return new Vector3().setFromMatrixPosition(
      new Matrix4().fromArray(node.getWorldMatrix()),
    );
  }
  rotation(node) {
    return new Quaternion()
      .setFromRotationMatrix(new Matrix4().fromArray(node.getWorldMatrix()))
      .normalize();
  }
  inspect(node, rotation = new Quaternion(...node.getRotation())) {
    const frame = this.frames[node.getName()];
    return inspectJoint(
      rotation,
      new Quaternion(...frame.bindRotation),
      new Quaternion(...frame.canonicalLocal),
      this.limits[frame.type],
      {
        tolerance: this.limits.tolerance,
        lateralSign: frame.lateralSign,
        twistSign: frame.twistSign,
        finger: frame.type.startsWith("finger"),
      },
    );
  }
  angles(node, rotation = new Quaternion(...node.getRotation())) {
    const frame = this.frames[node.getName()];
    return anatomicalAngles(
      rotation,
      new Quaternion(...frame.bindRotation),
      new Quaternion(...frame.canonicalLocal),
      frame,
    );
  }
  solveArm(side, targetPosition, targetRotation) {
    const arm = this.nodes.get(side + "Arm"),
      fore = this.nodes.get(side + "ForeArm"),
      hand = this.nodes.get(side + "Hand"),
      root = this.position(arm),
      offset = new Vector3(...this.bind.get(fore).position),
      handOffset = new Vector3(...this.bind.get(hand).position),
      parentQ = this.rotation(arm.getParentNode()),
      parentInverse = parentQ.clone().invert(),
      bindFore = new Quaternion(...this.bind.get(fore).rotation),
      canonical = new Quaternion(...this.frames[fore.getName()].canonicalLocal),
      canonicalInverse = canonical.clone().invert(),
      target = targetPosition.clone().sub(root),
      distance = target.length(),
      direction = target.clone().normalize(),
      bounds = this.limits.elbow.flex,
      rotationAt = (theta) =>
        bindFore
          .clone()
          .multiply(canonical)
          .multiply(
            new Quaternion().setFromAxisAngle(
              new Vector3(1, 0, 0),
              MathUtils.degToRad(theta),
            ),
          )
          .multiply(canonicalInverse)
          .normalize(),
      endpoint = (theta) =>
        handOffset.clone().applyQuaternion(rotationAt(theta)).add(offset);
    let theta,
      previous = bounds[0],
      error = endpoint(previous).length() - distance;
    for (let angle = bounds[0] + 0.5; angle <= bounds[1] + 1e-7; angle += 0.5) {
      const next = endpoint(angle).length() - distance;
      if (error * next <= 0) {
        let low = previous,
          high = angle,
          lowError = error;
        for (let iteration = 0; iteration < 35; iteration++) {
          const mid = (low + high) / 2,
            midError = endpoint(mid).length() - distance;
          if (lowError * midError <= 0) high = mid;
          else {
            low = mid;
            lowError = midError;
          }
        }
        theta = (low + high) / 2;
        break;
      }
      previous = angle;
      error = next;
    }
    if (theta === undefined)
      return {
        passed: false,
        reason: "Unreachable wrist without changing bone length",
        distance,
      };
    const foreLocal = rotationAt(theta),
      end = endpoint(theta),
      align = new Quaternion().setFromUnitVectors(
        end.clone().normalize(),
        direction,
      ),
      sign = side === "Right" ? -1 : 1;
    let best;
    for (let roll = 0; roll < 360; roll++) {
      const worldArm = new Quaternion()
          .setFromAxisAngle(direction, MathUtils.degToRad(roll))
          .multiply(align),
        armLocal = parentInverse.clone().multiply(worldArm).normalize(),
        foreWorld = worldArm.clone().multiply(foreLocal),
        handLocal = foreWorld
          .clone()
          .invert()
          .multiply(targetRotation)
          .normalize(),
        violations = [
          ...this.inspect(arm, armLocal),
          ...this.inspect(fore, foreLocal),
          ...this.inspect(hand, handLocal),
        ],
        elbow = root.clone().add(offset.clone().applyQuaternion(worldArm)),
        marginCost = [
          [arm, armLocal],
          [fore, foreLocal],
          [hand, handLocal],
        ].reduce((sum, [node, q]) => {
          const angles = this.angles(node, q),
            bounds = this.limits[this.frames[node.getName()].type];
          return (
            sum +
            ["flex", "lateral", "twist"].reduce((value, axis) => {
              const [low, high] = bounds[axis];
              return (
                value +
                (high - low > 6
                  ? Math.max(
                      0,
                      low + 3 - angles[axis],
                      angles[axis] - high + 3,
                    ) ** 2
                  : 0)
              );
            }, 0)
          );
        }, 0),
        cost =
          violations.reduce(
            (sum, v) =>
              sum + Math.max(0, v.min - v.value, v.value - v.max) ** 2,
            0,
          ) *
            1e6 +
          elbow.distanceToSquared(
            new Vector3(sign * 0.35, root.y - 0.15, 0.15),
          ) +
          marginCost * 0.02;
      if (!best || cost < best.cost)
        best = {
          passed: violations.length === 0,
          cost,
          theta,
          roll,
          elbow: elbow.toArray(),
          violations,
          arm: armLocal.toArray(),
          fore: foreLocal.toArray(),
          hand: handLocal.toArray(),
          anatomical: {
            arm: this.angles(arm, armLocal),
            fore: this.angles(fore, foreLocal),
            hand: this.angles(hand, handLocal),
          },
        };
    }
    if (best.passed) {
      arm.setRotation(best.arm);
      fore.setRotation(best.fore);
      hand.setRotation(best.hand);
      best.positionError = this.position(hand).distanceTo(targetPosition);
      best.rotationErrorDegrees = MathUtils.radToDeg(
        this.rotation(hand).angleTo(targetRotation),
      );
    }
    return best;
  }
  setFinger(side, name, pose) {
    for (let i = 0; i < 3; i++) {
      const node = this.nodes.get(`${side}Hand${name}${i + 1}`),
        swing = new Vector3(
          MathUtils.degToRad(pose.angles[i]),
          0,
          i === 0 ? MathUtils.degToRad(pose.opposition ?? 0) : 0,
        ),
        angle = swing.length(),
        q = new Quaternion(...this.bind.get(node).rotation)
          .multiply(
            new Quaternion().setFromAxisAngle(
              angle ? swing.divideScalar(angle) : new Vector3(1, 0, 0),
              angle,
            ),
          )
          .multiply(
            new Quaternion().setFromAxisAngle(
              new Vector3(0, 1, 0),
              MathUtils.degToRad(pose.twists?.[i] ?? 0),
            ),
          );
      node.setRotation(q.normalize().toArray());
    }
  }
  report() {
    return this.joints.flatMap((node) =>
      this.inspect(node).map((violation) => ({
        joint: node.getName(),
        ...violation,
      })),
    );
  }
}
