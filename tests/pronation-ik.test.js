import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { Quaternion, Vector3 } from "three";
import { ReferencePose } from "../tools/rig/reference-pose.mjs";
import { solveOfflineChain } from "../tools/rig/offline-entrance-ik.mjs";
function fixture(withPronation) {
  const doc = new Document(),
    scene = doc.createScene(),
    arm = doc.createNode("Arm"),
    fore = doc.createNode("ForeArm").setTranslation([0, 0.3, 0]),
    hand = doc.createNode("Hand").setTranslation([0, 0.27, 0]);
  const root = doc.createNode("Root");
  scene.addChild(root);
  root.addChild(arm);
  arm.addChild(fore);
  let roll;
  if (withPronation) {
    roll = doc.createNode("Pronation");
    fore.addChild(roll);
    roll.addChild(hand);
  } else fore.addChild(hand);
  const nodes = [arm, fore, hand, ...(roll ? [roll] : [])],
    skin = doc.createSkin();
  for (const n of nodes) skin.addJoint(n);
  const frames = Object.fromEntries(
      nodes.map((n) => [
        n.getName(),
        {
          type: n === hand ? "wrist" : n === roll ? "pronation" : "fixed",
          bindPosition: n.getTranslation(),
          bindRotation: n.getRotation(),
          canonicalLocal: [0, 0, 0, 1],
          lateralSign: 1,
          twistSign: 1,
        },
      ]),
    ),
    limits = {
      tolerance: 0.001,
      fixed: { flex: [0, 0], lateral: [0, 0], twist: [0, 0] },
      wrist: { flex: [0, 0], lateral: [0, 0], twist: [-10, 10] },
      pronation: { flex: [0, 0], lateral: [0, 0], twist: [-80, 80] },
    };
  return new ReferencePose(doc, frames, limits);
}
test("forearm pronation supplies missing anatomical DOF while elbow and wrist bounds stay strict", () => {
  const target = new Vector3(0, 0.57, 0),
    orientation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 3,
    ),
    options = {
      target,
      orientation,
      pole: new Vector3(0, 0.3, 0),
      boundedFit: true,
    };
  const old = fixture(false);
  assert.equal(
    solveOfflineChain(old, ["Arm", "ForeArm", "Hand"], options).passed,
    false,
  );
  const pose = fixture(true),
    fit = solveOfflineChain(pose, ["Arm", "ForeArm", "Hand"], {
      ...options,
      pronationNode: "Pronation",
    });
  assert.equal(fit.passed, true);
  assert.ok(pose.position(pose.nodes.get("Hand")).distanceTo(target) < 1e-9);
  assert.ok(pose.rotation(pose.nodes.get("Hand")).angleTo(orientation) < 0.001);
  assert.deepEqual(pose.inspect(pose.nodes.get("ForeArm")), []);
  assert.deepEqual(pose.inspect(pose.nodes.get("Hand")), []);
  assert.deepEqual(pose.inspect(pose.nodes.get("Pronation")), []);
  assert.ok(Math.abs(pose.angles(pose.nodes.get("Pronation")).twist) > 45);
  assert.ok(Math.abs(pose.angles(pose.nodes.get("Hand")).twist) <= 10.001);
});
test("pronation helper cannot conceal a nonzero positional offset in a two-link solve", () => {
  const pose = fixture(true);
  pose.nodes.get("Pronation").setTranslation([0.1, 0, 0]);
  assert.throws(
    () =>
      solveOfflineChain(pose, ["Arm", "ForeArm", "Hand"], {
        target: new Vector3(0, 0.57, 0),
        boundedFit: true,
        pronationNode: "Pronation",
      }),
    /hierarchy/,
  );
});
test("velocity constraint includes pronation and rejects incomplete history", () => {
  const pose = fixture(true),
    names = ["Arm", "ForeArm", "Hand"],
    previous = [...names, "Pronation"].map(
      (n) => new Quaternion(...pose.nodes.get(n).getRotation()),
    ),
    target = new Vector3(0, 0.57, 0),
    orientation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 3,
    ),
    options = {
      target,
      orientation,
      pole: new Vector3(0, 0.3, 0),
      boundedFit: true,
      pronationNode: "Pronation",
      maxStepDegrees: 5,
    };
  assert.throws(
    () =>
      solveOfflineChain(pose, names, {
        ...options,
        previousRotations: previous.slice(0, 3),
      }),
    /every chain joint/,
  );
  const fit = solveOfflineChain(pose, names, {
    ...options,
    previousRotations: previous,
  });
  assert.equal(fit.passed, false);
  assert.ok(fit.maximumStepDegrees <= 5 + 1e-7);
  assert.ok(fit.orientationErrorDegrees > 40);
});
