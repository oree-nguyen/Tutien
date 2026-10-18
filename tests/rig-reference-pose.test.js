import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { Quaternion, Vector3 } from "three";
import { ReferencePose } from "../tools/rig/reference-pose.mjs";

function fixture() {
  const doc = new Document();
  const root = doc.createNode("Root"),
    arm = doc.createNode("RightArm").setTranslation([0, 1.5, 0]);
  const fore = doc.createNode("RightForeArm").setTranslation([0, -0.3, 0]);
  const hand = doc.createNode("RightHand").setTranslation([0, -0.25, 0]);
  root.addChild(arm);
  arm.addChild(fore);
  fore.addChild(hand);
  const skin = doc.createSkin();
  for (const node of [root, arm, fore, hand]) skin.addJoint(node);
  const frames = Object.fromEntries(
    [root, arm, fore, hand].map((node) => [
      node.getName(),
      {
        bindRotation: [0, 0, 0, 1],
        canonicalLocal: [0, 0, 0, 1],
        type: node === fore ? "elbow" : "limb",
      },
    ]),
  );
  const broad = { flex: [-180, 180], lateral: [-180, 180], twist: [-180, 180] };
  return {
    doc,
    arm,
    fore,
    hand,
    pose: new ReferencePose(doc, frames, {
      limb: broad,
      elbow: { ...broad, flex: [0, 145] },
      tolerance: 0.1,
    }),
  };
}

test("reference two-link IK reaches wrist pose while preserving bone translations and scales", () => {
  const { pose, arm, fore, hand } = fixture();
  const before = [arm, fore, hand].map((n) => ({
    position: n.getTranslation().slice(),
    scale: n.getScale().slice(),
  }));
  const target = new Vector3(0.2, 1.15, 0.1),
    rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.3);
  const result = pose.solveArm("Right", target, rotation);
  assert.equal(result.passed, true);
  assert.ok(pose.position(hand).distanceTo(target) < 1e-7);
  assert.ok(pose.rotation(hand).angleTo(rotation) < 1e-7);
  assert.deepEqual(
    [arm, fore, hand].map((n) => ({
      position: n.getTranslation(),
      scale: n.getScale(),
    })),
    before,
  );
  assert.equal(pose.report().length, 0);
  pose.reset();
  for (const node of [arm, fore, hand])
    assert.deepEqual(node.getRotation(), [0, 0, 0, 1]);
});

test("unreachable reference wrist is rejected without changing the skeleton", () => {
  const { pose, doc } = fixture();
  const before = doc
    .getRoot()
    .listNodes()
    .map((n) => n.getRotation().slice());
  const result = pose.solveArm("Right", new Vector3(5, 1, 0), new Quaternion());
  assert.equal(result.passed, false);
  assert.match(result.reason, /bone length/);
  assert.deepEqual(
    doc
      .getRoot()
      .listNodes()
      .map((n) => n.getRotation()),
    before,
  );
});
