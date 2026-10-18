import test from "node:test";
import assert from "node:assert/strict";
import {
  Bone,
  Group,
  AnimationClip,
  QuaternionKeyframeTrack,
  Quaternion,
  Vector3,
} from "three";
import { HeroPoseController } from "../src/rig/hero-pose-controller.js";
function fixture() {
  const root = new Group(),
    hip = new Bone(),
    arm = new Bone();
  hip.name = "Hips";
  arm.name = "RightArm";
  root.add(hip);
  hip.add(arm);
  const q = (d) =>
    new Quaternion()
      .setFromAxisAngle(new Vector3(1, 0, 0), (d * Math.PI) / 180)
      .toArray();
  const entrance = new AnimationClip("Entrance", 1, [
    new QuaternionKeyframeTrack("Hips.quaternion", [0, 1], [...q(0), ...q(10)]),
    new QuaternionKeyframeTrack(
      "RightArm.quaternion",
      [0, 1],
      [...q(0), ...q(45)],
    ),
  ]);
  const idle = new AnimationClip("IDLE_HOLD", 4, [
    new QuaternionKeyframeTrack(
      "Hips.quaternion",
      [0, 2, 4],
      [...q(10), ...q(11), ...q(10)],
    ),
    new QuaternionKeyframeTrack(
      "RightArm.quaternion",
      [0, 4],
      [...q(45), ...q(45)],
    ),
  ]);
  return { root, hip, arm, clips: [entrance, idle] };
}
test("real mixer holds a non-bind arm after entrance, crossfade and ten seconds idle", () => {
  const f = fixture(),
    controller = new HeroPoseController(f.root, f.clips);
  controller.start();
  controller.update(1);
  assert.equal(controller.state, "BLEND");
  controller.update(0.3);
  assert.equal(controller.state, "IDLE_HOLD");
  controller.update(10);
  assert.ok(
    Math.abs(f.arm.quaternion.angleTo(new Quaternion()) - Math.PI / 4) < 1e-6,
  );
  assert.ok(controller.idle.isRunning());
  assert.equal(controller.entrance.isRunning(), false);
});
test("large dt dispatches ordered events once and reaches the same FK pose as small steps", () => {
  const a = fixture(),
    b = fixture(),
    events = [
      { time: 0.8, type: "grab" },
      { time: 0.2, type: "impact" },
      { time: 0.5, type: "land" },
    ],
    seen = [];
  const x = new HeroPoseController(a.root, a.clips, {
      events,
      onEvent: (e) => seen.push(e.type),
    }),
    y = new HeroPoseController(b.root, b.clips, { events });
  x.start();
  y.start();
  x.update(2);
  for (let i = 0; i < 120; i++) y.update(1 / 60);
  assert.deepEqual(seen, ["impact", "land", "grab"]);
  assert.equal(x.state, y.state);
  assert.ok(
    a.arm.quaternion
      .clone()
      .normalize()
      .angleTo(b.arm.quaternion.clone().normalize()) < 1e-6,
  );
  assert.ok(
    a.hip.quaternion
      .clone()
      .normalize()
      .angleTo(b.hip.quaternion.clone().normalize()) < 1e-6,
  );
  x.update(2);
  assert.equal(seen.length, 3);
});
test("ten replays reuse the mixer and actions and restore the identical initial pose", () => {
  const f = fixture(),
    x = new HeroPoseController(f.root, f.clips),
    m = x.mixer,
    e = x.entrance,
    i = x.idle;
  x.start();
  const initial = f.arm.quaternion.clone();
  for (let n = 0; n < 10; n++) {
    x.update(8);
    x.start();
    assert.equal(x.mixer, m);
    assert.equal(x.entrance, e);
    assert.equal(x.idle, i);
    assert.ok(f.arm.quaternion.angleTo(initial) < 1e-7);
  }
  x.setActive(false);
  const time = x.elapsed;
  x.update(2);
  assert.equal(x.elapsed, time);
  assert.equal(f.root.visible, false);
  x.seek(2);
  assert.equal(f.root.visible, false);
  x.setActive(true);
  assert.equal(f.root.visible, true);
});
test("unbound, incomplete and discontinuous baked clips are rejected before playback", () => {
  const f = fixture();
  f.clips[1].tracks.pop();
  assert.throws(
    () => new HeroPoseController(f.root, f.clips),
    /Missing baked bone/,
  );
  const g = fixture();
  g.clips[1].tracks[1].values.set([0, 0, 0, 1], 0);
  assert.throws(() => new HeroPoseController(g.root, g.clips), /discontinuity/);
  const h = fixture();
  h.clips[1].tracks.push(
    new QuaternionKeyframeTrack(
      "Ghost.quaternion",
      [0, 4],
      [0, 0, 0, 1, 0, 0, 0, 1],
    ),
  );
  assert.throws(
    () => new HeroPoseController(h.root, h.clips),
    /Unbound baked track/,
  );
});
