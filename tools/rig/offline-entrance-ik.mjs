import { Quaternion, Vector3, MathUtils } from "three";
import { clampJoint, inspectJoint } from "../../src/rig/joint-limits.js";
import { fitBoundedChain } from "./bounded-chain-fit.mjs";

/** Build-time two-link IK in calibrated bind frames. No translations or scales change.
 * A rejected result still exports the nearest measured attempt for review. */
export function solveOfflineChain(
  pose,
  names,
  {
    target,
    orientation,
    pole,
    flexRange,
    previousRotations,
    endLimits,
    boundedFit = false,
    maxStepDegrees,
    pronationNode,
  },
) {
  if (maxStepDegrees !== undefined && (!boundedFit || !previousRotations))
    throw Error(
      "A velocity limit requires bounded fitting and previous rotations",
    );
  const [upper, middle, end] = names.map((n) => pose.nodes.get(n));
  if (!upper || !middle || !end)
    throw Error("Incomplete offline IK chain: " + names.join("/"));
  const rollNode = pronationNode ? pose.nodes.get(pronationNode) : null;
  if (
    pronationNode &&
    (!rollNode ||
      rollNode.getParentNode() !== middle ||
      end.getParentNode() !== rollNode ||
      new Vector3(...rollNode.getTranslation()).length() > 1e-8)
  )
    throw Error("Invalid forearm pronation hierarchy");
  const chainNodes = [upper, middle, end, ...(rollNode ? [rollNode] : [])];
  if (previousRotations && previousRotations.length !== chainNodes.length)
    throw Error(
      "Previous rotations must include every chain joint, including pronation",
    );
  const sourceRotations = chainNodes.map(
      (n) => new Quaternion(...n.getRotation()),
    ),
    sourcePositionError = pose.position(end).distanceTo(target),
    sourceOrientationError = orientation
      ? pose.rotation(end).angleTo(orientation)
      : 0;
  const offset = new Vector3(...pose.bind.get(middle).position),
    endOffset = new Vector3(...pose.bind.get(end).position),
    bind = new Quaternion(...pose.bind.get(middle).rotation),
    frame = new Quaternion(...pose.frames[middle.getName()].canonicalLocal),
    root = pose.position(upper),
    parentInverse = pose.rotation(upper.getParentNode()).invert(),
    vector = target.clone().sub(root),
    distance = vector.length(),
    direction = vector.clone().normalize(),
    maximumReach = 0.999 * (offset.length() + endOffset.length()),
    solveDistance = Math.min(distance, maximumReach),
    bounds = flexRange ?? pose.limits[pose.frames[middle.getName()].type].flex,
    rotationAt = (deg) =>
      bind
        .clone()
        .multiply(frame)
        .multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(1, 0, 0),
            MathUtils.degToRad(
              deg - (pose.frames[middle.getName()].restFlex ?? 0),
            ),
          ),
        )
        .multiply(frame.clone().invert())
        .normalize(),
    endpoint = (deg) =>
      endOffset.clone().applyQuaternion(rotationAt(deg)).add(offset);
  let theta = bounds[0],
    error = Infinity,
    previous = bounds[0],
    prevError = endpoint(previous).length() - solveDistance;
  for (let t = bounds[0]; t <= bounds[1] + 1e-7; t += 0.5) {
    const e = endpoint(t).length() - solveDistance;
    if (Math.abs(e) < error) {
      error = Math.abs(e);
      theta = t;
    }
    if (t > previous && e * prevError <= 0) {
      let low = previous,
        high = t,
        le = prevError;
      for (let n = 0; n < 30; n++) {
        const m = (low + high) / 2,
          me = endpoint(m).length() - solveDistance;
        if (le * me <= 0) high = m;
        else {
          low = m;
          le = me;
        }
      }
      theta = (low + high) / 2;
      break;
    }
    previous = t;
    prevError = e;
  }
  const middleQ = rotationAt(theta),
    localEnd = endpoint(theta),
    align = new Quaternion().setFromUnitVectors(
      localEnd.clone().normalize(),
      direction,
    );
  const inspect = (node, q, override) => {
      const f = pose.frames[node.getName()];
      return inspectJoint(
        q,
        new Quaternion(...pose.bind.get(node).rotation),
        new Quaternion(...f.canonicalLocal),
        override ?? pose.limits[f.type],
        { ...f, tolerance: pose.limits.tolerance },
      );
    },
    bounded = (node, q, override) => {
      const f = pose.frames[node.getName()];
      clampJoint(
        q,
        new Quaternion(...pose.bind.get(node).rotation),
        new Quaternion(...f.canonicalLocal),
        override ?? pose.limits[f.type],
        f,
      );
      return q;
    },
    parentQ = parentInverse.clone().invert();
  if (boundedFit) {
    const current = chainNodes.map((n) => new Quaternion(...n.getRotation())),
      positionError = pose.position(end).distanceTo(target),
      orientationErrorDegrees = orientation
        ? MathUtils.radToDeg(pose.rotation(end).angleTo(orientation))
        : 0,
      violations = [
        ...inspect(upper, current[0]),
        ...inspect(middle, current[1]),
        ...inspect(end, current[2], endLimits),
        ...(rollNode
          ? inspect(rollNode, new Quaternion(...rollNode.getRotation()))
          : []),
      ],
      flex = pose.angles(middle).flex,
      step = previousRotations
        ? Math.max(
            ...current.map((q, i) =>
              MathUtils.radToDeg(q.angleTo(previousRotations[i])),
            ),
          )
        : 0;
    // Keep an exact feasible source pose. In particular, a straight planted leg
    // must not be bent merely to satisfy the analytic seed's 0.999 reach margin.
    // This is checked against actual FK, joint bounds and the velocity budget.
    if (
      positionError <= 1e-8 &&
      orientationErrorDegrees <= 1e-6 &&
      !violations.length &&
      (!flexRange || (flex >= flexRange[0] && flex <= flexRange[1])) &&
      (maxStepDegrees === undefined || step <= maxStepDegrees)
    )
      return {
        passed: true,
        method: "already-exact-feasible-source-FK",
        target: target.toArray(),
        targetQuaternion: orientation?.toArray() ?? null,
        positionError,
        orientationErrorDegrees,
        requestedDistance: distance,
        maximumReach,
        flex,
        elbow: pose.position(middle).toArray(),
        violations,
        boundedFitAttempted: false,
        maximumStepDegrees: previousRotations ? step : null,
      };
  }
  let best;
  for (let roll = 0; roll < 360; roll++) {
    const desiredWorldUpper = new Quaternion()
        .setFromAxisAngle(direction, MathUtils.degToRad(roll))
        .multiply(align),
      upperQ = bounded(
        upper,
        parentInverse.clone().multiply(desiredWorldUpper).normalize(),
      ),
      worldUpper = parentQ.clone().multiply(upperQ),
      worldFore = worldUpper.clone().multiply(middleQ),
      elbow = root.clone().add(offset.clone().applyQuaternion(worldUpper));
    const rollFrame = rollNode ? pose.frames[rollNode.getName()] : null,
      rollBounds = rollNode ? pose.limits[rollFrame.type].twist : [0, 0];
    for (
      let pronation = rollBounds[0];
      pronation <= rollBounds[1] + 1e-8;
      pronation += rollNode ? 5 : 1
    ) {
      const basis = rollNode
          ? new Quaternion(...rollFrame.canonicalLocal)
          : new Quaternion(),
        rollQ = rollNode
          ? new Quaternion(...pose.bind.get(rollNode).rotation)
              .multiply(basis)
              .multiply(
                new Quaternion().setFromAxisAngle(
                  new Vector3(0, 1, 0),
                  MathUtils.degToRad(pronation * (rollFrame.twistSign ?? 1)),
                ),
              )
              .multiply(basis.clone().invert())
              .normalize()
          : new Quaternion(),
        pronated = worldFore.clone().multiply(rollQ),
        endQ = bounded(
          end,
          orientation
            ? pronated.clone().invert().multiply(orientation).normalize()
            : new Quaternion(...pose.bind.get(end).rotation).normalize(),
          endLimits,
        ),
        violations = [
          ...inspect(upper, upperQ),
          ...inspect(middle, middleQ),
          ...inspect(end, endQ, endLimits),
          ...(rollNode ? inspect(rollNode, rollQ) : []),
        ],
        endpointPosition = elbow
          .clone()
          .add(endOffset.clone().applyQuaternion(pronated)),
        endpointError = endpointPosition.distanceToSquared(target),
        orientationError = orientation
          ? pronated.clone().multiply(endQ).angleTo(orientation)
          : 0,
        continuity = previousRotations
          ? [upperQ, middleQ, endQ].reduce(
              (sum, q, i) => sum + q.angleTo(previousRotations[i]) ** 2,
              0,
            )
          : 0,
        cost =
          endpointError * 1000 +
          orientationError ** 2 * 0.5 +
          elbow.distanceToSquared(pole) * 0.01 +
          continuity * 0.05;
      if (!best || cost < best.cost)
        best = {
          cost,
          roll,
          theta,
          upperQ,
          middleQ,
          endQ,
          rollQ,
          elbow: elbow.toArray(),
          violations,
        };
    }
  }
  const analytic = [
      best.upperQ,
      best.middleQ,
      best.endQ,
      ...(rollNode ? [best.rollQ] : []),
    ],
    analyticPosition = root
      .clone()
      .add(
        offset.clone().applyQuaternion(parentQ.clone().multiply(best.upperQ)),
      )
      .add(
        endOffset
          .clone()
          .applyQuaternion(
            parentQ.clone().multiply(best.upperQ).multiply(best.middleQ),
          ),
      ),
    analyticOrientation = parentQ
      .clone()
      .multiply(best.upperQ)
      .multiply(best.middleQ)
      .multiply(best.rollQ)
      .multiply(best.endQ),
    needsFit =
      !!pronationNode ||
      !!previousRotations ||
      analyticPosition.distanceTo(target) > 0.001 ||
      (orientation && analyticOrientation.angleTo(orientation) > 0.004) ||
      sourcePositionError < analyticPosition.distanceTo(target) ||
      (orientation &&
        sourceOrientationError < analyticOrientation.angleTo(orientation));
  let fitted = null;
  if (boundedFit && needsFit) {
    // Without history, retain the caller's current source pose as the weak
    // null-space preference. A pole tie-break alone can add knee/twist motion
    // even when both candidates have virtually identical endpoint contact.
    const continuityReference = previousRotations ?? sourceRotations;
    fitted = fitBoundedChain(pose, names, {
      target,
      orientation,
      pole,
      seeds: [
        ...(previousRotations ? [previousRotations] : []),
        sourceRotations,
        analytic,
      ],
      endLimits,
      flexRange,
      previousRotations: continuityReference,
      maxStepDegrees,
      pronationNode,
    });
    const originalCost =
      analyticPosition.distanceToSquared(target) * 400 +
      (orientation ? analyticOrientation.angleTo(orientation) ** 2 * 4 : 0) +
      analytic.reduce(
        (s, q, i) => s + q.angleTo(continuityReference[i]) ** 2 * 0.015 ** 2,
        0,
      );
    const analyticVelocityInvalid =
      maxStepDegrees !== undefined &&
      previousRotations &&
      analytic.some(
        (r, i) =>
          MathUtils.radToDeg(r.angleTo(previousRotations[i])) >
          maxStepDegrees + 1e-8,
      );
    if (
      fitted.objective < originalCost ||
      analyticVelocityInvalid ||
      pronationNode
    ) {
      [best.upperQ, best.middleQ, best.endQ] = fitted.rotations;
      if (pronationNode)
        pose.nodes
          .get(pronationNode)
          .setRotation(fitted.rotations[3].toArray());
    }
  }
  best.violations = [
    ...inspect(upper, best.upperQ),
    ...inspect(middle, best.middleQ),
    ...inspect(end, best.endQ, endLimits),
  ];
  if (pronationNode) {
    const roll = pose.nodes.get(pronationNode);
    best.violations.push(
      ...inspect(roll, new Quaternion(...roll.getRotation())),
    );
  }
  upper.setRotation(best.upperQ.toArray());
  middle.setRotation(best.middleQ.toArray());
  end.setRotation(best.endQ.toArray());
  const positionError = pose.position(end).distanceTo(target);
  const orientationErrorDegrees = orientation
    ? MathUtils.radToDeg(pose.rotation(end).angleTo(orientation))
    : 0;
  const maximumStepDegrees = previousRotations
    ? Math.max(
        ...chainNodes.map((node, i) =>
          MathUtils.radToDeg(
            new Quaternion(...node.getRotation()).angleTo(previousRotations[i]),
          ),
        ),
      )
    : null;
  return {
    passed:
      best.violations.length === 0 &&
      positionError <= 0.005 &&
      orientationErrorDegrees <= 1 &&
      (maxStepDegrees === undefined ||
        maximumStepDegrees <= maxStepDegrees + 1e-8),
    target: target.toArray(),
    targetQuaternion: orientation?.toArray() ?? null,
    positionError,
    orientationErrorDegrees,
    requestedDistance: distance,
    maximumReach,
    flex: pose.angles(middle).flex,
    elbow: pose.position(middle).toArray(),
    violations: best.violations,
    boundedFitAttempted: !!fitted,
    maximumStepDegrees,
  };
}

/** Build-time angular velocity limit. Any resulting endpoint error must be measured
 * after this pass; it cannot turn an unreachable contact into an accepted solve. */
export function limitAngularStep(previous, current, degrees = 8) {
  const angle = previous.angleTo(current),
    limit = MathUtils.degToRad(degrees);
  return angle > limit
    ? previous
        .clone()
        .slerp(current, limit / angle)
        .normalize()
    : current.clone().normalize();
}

/** A linked limb advances by one shared fraction. Limiting every bone separately
 * can fully extend a knee while its hip still lags, moving a planted foot. */
export function limitAngularChain(previous, current, degrees = 8) {
  const largest = Math.max(...current.map((q, i) => previous[i].angleTo(q))),
    limit = MathUtils.degToRad(degrees),
    fraction = largest > limit ? limit / largest : 1;
  return current.map((q, i) =>
    previous[i].clone().slerp(q, fraction).normalize(),
  );
}
