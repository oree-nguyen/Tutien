import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Quaternion, Vector3, MathUtils, Matrix4 } from "three";
import {
  inspectJoint,
  clampJoint,
  anatomicalAngles,
  fingerStretchError,
  palmGripError,
} from "../src/rig/joint-limits.js";
const table = JSON.parse(
  await fs.readFile(new URL("../data/rig/joint-limits.json", import.meta.url)),
);
const q = (axis, d) =>
  new Quaternion().setFromAxisAngle(
    new Vector3(...axis),
    MathUtils.degToRad(d),
  );
test("calibrated nontrivial bind frames report bind zero and detect every flex overshoot", () => {
  for (const [name, limits] of Object.entries(table)) {
    if (!limits.flex) continue;
    const bind = q([0, 1, 0], 67),
      frame = q([0, 0, 1], 37);
    assert.deepEqual(inspectJoint(bind, bind, frame, limits), [], name);
    const lower = limits.flex[1] >= 175,
      bound = limits.flex[lower ? 0 : 1],
      overshoot = bound + (lower ? -5 : 5);
    const rotation = bind
      .clone()
      .multiply(frame)
      .multiply(q([1, 0, 0], overshoot))
      .multiply(frame.clone().invert());
    assert.ok(
      inspectJoint(rotation, bind, frame, limits).some(
        (v) => v.axis === "flex",
      ),
      name,
    );
    assert.equal(clampJoint(rotation, bind, frame, limits), true);
    assert.ok(
      Math.abs(anatomicalAngles(rotation, bind, frame).flex - bound) < 1e-5,
    );
  }
});
test("mirror-equivalent frames produce the same anatomical flex value", () => {
  const left = q([0, 0, 1], 35),
    right = q([0, 0, 1], -35);
  for (const f of [left, right]) {
    const rotation = f
      .clone()
      .multiply(q([1, 0, 0], 90))
      .multiply(f.clone().invert());
    assert.ok(
      Math.abs(anatomicalAngles(rotation, new Quaternion(), f).flex - 90) <
        1e-5,
    );
  }
});
test("finger failure codes detect hyperextension, stretch and back-of-hand contact", () => {
  assert.equal(
    inspectJoint(
      q([1, 0, 0], -15),
      new Quaternion(),
      new Quaternion(),
      table.fingerPIP,
      { finger: true },
    )[0].code,
    "FINGER_HYPEREXTENDED",
  );
  assert.equal(fingerStretchError(0.025, 0.026).code, "FINGER_BONE_STRETCH");
  assert.equal(fingerStretchError(0.025, 0.025), null);
  assert.equal(
    palmGripError(new Vector3(0, 0, 1), new Vector3(0, 0, -1)).code,
    "BACK_OF_HAND_GRIP",
  );
});

test("physically mirrored limbs report identical abduction and internal rotation", () => {
  function frame(direction) {
    const y = new Vector3(...direction).normalize(),
      x = y
        .clone()
        .cross(new Vector3(0, 0, 1))
        .normalize(),
      z = x.clone().cross(y);
    return new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(x, y, z),
    );
  }
  const leftFrame = frame([0.6, -0.8, 0]),
    rightFrame = frame([-0.6, -0.8, 0]),
    swing = new Vector3(MathUtils.degToRad(30), 0, MathUtils.degToRad(45)),
    angle = swing.length(),
    left = leftFrame
      .clone()
      .multiply(
        new Quaternion().setFromAxisAngle(swing.divideScalar(angle), angle),
      )
      .multiply(q([0, 1, 0], 35))
      .multiply(leftFrame.clone().invert()),
    right = new Quaternion(left.x, -left.y, -left.z, left.w),
    a = anatomicalAngles(left, new Quaternion(), leftFrame),
    b = anatomicalAngles(right, new Quaternion(), rightFrame, {
      lateralSign: -1,
      twistSign: -1,
    });
  for (const axis of ["flex", "lateral", "twist"])
    assert.ok(Math.abs(a[axis] - b[axis]) < 1e-7, axis);
  assert.ok(Math.abs(b.lateral - 45) < 1e-7);
  assert.ok(Math.abs(b.twist - 35) < 1e-7);
  const limits = { flex: [-60, 180], lateral: [-30, 50], twist: [-90, 70] };
  assert.deepEqual(
    inspectJoint(right, new Quaternion(), rightFrame, limits, {
      lateralSign: -1,
      twistSign: -1,
    }),
    [],
  );
  assert.ok(
    inspectJoint(right, new Quaternion(), rightFrame, limits).some(
      (v) => v.axis === "lateral",
    ),
  );
});

test("a measured flexed rest hinge can straighten without weakening its physical limits", () => {
  const bind = q([0, 1, 0], 25),
    frame = q([0, 0, 1], 35),
    restFlex = 40;
  const pose = (degrees) =>
    bind
      .clone()
      .multiply(frame)
      .multiply(q([1, 0, 0], degrees - restFlex))
      .multiply(frame.clone().invert());
  assert.ok(
    Math.abs(anatomicalAngles(bind, bind, frame, { restFlex }).flex - 40) <
      1e-8,
  );
  assert.deepEqual(
    inspectJoint(pose(0), bind, frame, table.elbow, { restFlex }),
    [],
  );
  assert.ok(
    inspectJoint(pose(-12), bind, frame, table.elbow, { restFlex }).some(
      (v) => v.axis === "flex",
    ),
  );
  const tooFar = pose(165);
  assert.ok(
    inspectJoint(tooFar, bind, frame, table.elbow, { restFlex }).some(
      (v) => v.axis === "flex",
    ),
  );
  assert.equal(
    clampJoint(tooFar, bind, frame, table.elbow, { restFlex }),
    true,
  );
  assert.ok(
    Math.abs(
      anatomicalAngles(tooFar, bind, frame, { restFlex }).flex -
        table.elbow.flex[1],
    ) < 1e-7,
  );
  assert.throws(
    () => anatomicalAngles(bind, bind, frame, { restFlex: NaN }),
    /rest flexion/,
  );
});

test("anatomical zero differs from A-pose and clamp retains that calibrated zero", () => {
  const bind = q([0, 0, 1], 50),
    zero = q([0, 0, 1], -25),
    frame = q([0, 1, 0], 35),
    options = {
      anatomicalZero: zero.toArray(),
      restFlex: 20,
      lateralSign: -1,
      twistSign: -1,
    };
  const pose = zero
    .clone()
    .multiply(frame)
    .multiply(q([1, 0, 0], 40))
    .multiply(q([0, 1, 0], -15))
    .multiply(frame.clone().invert());
  const measured = anatomicalAngles(pose, bind, frame, options);
  assert.ok(Math.abs(measured.flex - 60) < 1e-7);
  assert.ok(Math.abs(measured.twist - 15) < 1e-7);
  const bounds = { flex: [0, 45], lateral: [-20, 20], twist: [-10, 10] };
  assert.ok(inspectJoint(pose, bind, frame, bounds, options).length === 2);
  assert.equal(clampJoint(pose, bind, frame, bounds, options), true);
  const result = anatomicalAngles(pose, bind, frame, options);
  assert.ok(Math.abs(result.flex - 45) < 1e-7);
  assert.ok(Math.abs(result.twist - 10) < 1e-7);
  assert.deepEqual(inspectJoint(pose, bind, frame, bounds, options), []);
  assert.throws(
    () => anatomicalAngles(bind, bind, frame, { anatomicalZero: [0, 0, 0, 2] }),
    /zero rotation/,
  );
});
