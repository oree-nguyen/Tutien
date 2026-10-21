import test from "node:test";
import assert from "node:assert/strict";
import {
  Group,
  Bone,
  SkinnedMesh,
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Skeleton,
} from "three";
import { showcaseState } from "../src/showcase-state.js";
function mesh(skinned) {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  const m = skinned
    ? new SkinnedMesh(g, new MeshBasicMaterial())
    : new Mesh(g, new MeshBasicMaterial());
  if (skinned) {
    const bone = new Bone();
    bone.name = "MeasuredHip";
    m.bind(new Skeleton([bone]));
  }
  return m;
}
test("showcase inspection reads actual visible surfaces and bone channels, never loading labels", () => {
  const root = new Group(),
    hidden = new Group(),
    moving = mesh(true),
    source = mesh(false);
  root.userData.manualHunyuan = true;
  root.userData.manualAsset = {
    id: "H01-C0",
    status: "loaded",
    entrance: { time: 1.3 },
    sourceFidelity: { status: "loaded" },
  };
  source.userData.tencentSource = true;
  root.add(moving, hidden);
  hidden.add(source);
  hidden.visible = false;
  moving.skeleton.bones[0].position.set(0.2, 0.5, 0.1);
  const s = showcaseState(root, true);
  assert.equal(s.visibleSkinned, 1);
  assert.equal(s.visibleSource, 0);
  assert.equal(s.visibleTriangles, 1);
  assert.equal(s.entranceTime, 1.3);
  assert.deepEqual(s.bones[0].position, [0.2, 0.5, 0.1]);
  moving.visible = false;
  hidden.visible = true;
  const original = showcaseState(root, false);
  assert.equal(original.visibleSkinned, 0);
  assert.equal(original.visibleSource, 1);
  assert.equal(original.bones.length, 0);
});
test("two divergent visible skeletons sharing joint names cannot pass pose inspection", () => {
  const root = new Group(),
    a = mesh(true),
    b = mesh(true);
  b.skeleton.bones[0].rotation.x = 0.2;
  root.add(a, b);
  assert.throws(() => showcaseState(root, true), /Divergent/);
});
