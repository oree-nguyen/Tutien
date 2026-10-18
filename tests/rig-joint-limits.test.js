import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Quaternion, Vector3, MathUtils } from "three";
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
