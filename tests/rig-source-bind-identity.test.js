import test from "node:test";
import assert from "node:assert/strict";
import { Document } from "@gltf-transform/core";
import { sourceBindIdentity } from "../tools/rig/source-bind-identity.mjs";

function fixture() {
  const doc = new Document(),
    buffer = doc.createBuffer(),
    root = doc.createNode("Root"),
    hip = doc.createNode("Hips"),
    hand = doc.createNode("Hand");
  root.addChild(hip);
  hip.addChild(hand);
  doc.createScene().addChild(root);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    inverse = doc
      .createAccessor()
      .setType("MAT4")
      .setArray(new Float32Array([...identity, ...identity]))
      .setBuffer(buffer),
    skin = doc
      .createSkin()
      .addJoint(hip)
      .addJoint(hand)
      .setInverseBindMatrices(inverse),
    weights = doc
      .createAccessor()
      .setType("VEC4")
      .setArray(new Float32Array([1, 0, 0, 0]))
      .setBuffer(buffer),
    p = doc.createPrimitive().setAttribute("WEIGHTS_0", weights),
    mesh = doc.createMesh().addPrimitive(p),
    node = doc.createNode("Body").setMesh(mesh).setSkin(skin);
  root.addChild(node);
  return { doc, root, hip, hand, inverse, skin, weights, node };
}

test("pose binding identity allows real weight edits but locks roots, mesh transform, joint order and inverse binds", () => {
  const f = fixture(),
    before = sourceBindIdentity(f.doc);
  f.weights.setArray(new Float32Array([0.6, 0.4, 0, 0]));
  assert.equal(sourceBindIdentity(f.doc), before);
  for (const mutate of [
    (f) => f.root.setTranslation([0.1, 0, 0]),
    (f) => f.node.setScale([2, 1, 1]),
    (f) => f.skin.removeJoint(f.hip).addJoint(f.hip),
    (f) => {
      const a = f.inverse.getArray().slice();
      a[12] = 0.01;
      f.inverse.setArray(a);
    },
    (f) => f.root.addChild(f.hand),
  ]) {
    const value = fixture(),
      original = sourceBindIdentity(value.doc);
    mutate(value);
    assert.notEqual(sourceBindIdentity(value.doc), original);
  }
});
