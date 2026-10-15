import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile, skillFor } from "../src/rules.js";
import {
  SmoothSkillshotController,
  OneEuroFilter,
  screenVectorToWorld,
} from "../src/smooth-skillshot.js";
import { projectSkillCast, previewSkillHits } from "../src/skill-projection.js";
import { SkillIndicatorRenderer } from "../src/skill-indicators.js";
import { Scene, Vector3 } from "three";
import { groundHeight } from "../src/art.js";
const rect = { left: 0, top: 0, width: 100, height: 100 };
function fixture(hero = 0) {
  const m = new Match(
    {
      hero,
      branch: 0,
      rings: [0, 0],
      bones: [],
      supports: [],
      brought: 0,
      skin: 0,
      mode: "solo",
    },
    newProfile(),
  );
  m.actors = [m.player];
  m.obstacles = [];
  m.bushes = [];
  m.player.x = -40;
  m.player.z = -40;
  m.createHero(1, 99, 90, 90, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  let time = 0;
  const casts = [],
    aims = [],
    manual = [],
    ui = [];
  const controller = new SmoothSkillshotController({
    getMatch: () => m,
    getSkill: (k) =>
      k === 4
        ? { shape: "line", range: 2.8, mp: 0, headingOnly: true }
        : skillFor(m.player, k),
    cast: (k, a) => {
      casts.push({ k, aim: a, time });
      return m.cast(m.player, k, a);
    },
    onAim: (a, s, d, c) =>
      aims.push({ projection: projectSkillCast(m, a, s, d), canceled: c }),
    onManualStart: (id) => manual.push(["start", id]),
    onManualEnd: (id) => manual.push(["end", id]),
    onUI: (v) => ui.push(v),
    getAzimuth: () => Math.PI / 6,
    getCancelCenter: () => ({ x: 900, y: 100 }),
    now: () => time,
    vibrate: () => {},
  });
  return {
    m,
    controller,
    casts,
    aims,
    manual,
    ui,
    frame(dt = 1 / 60) {
      time += dt;
      m.step(dt, { x: 0, z: 0, attack: false });
      controller.update(dt);
    },
    advance(seconds, hz = 60) {
      for (let i = 0; i < Math.ceil(seconds * hz); i++) this.frame(1 / hz);
    },
  };
}
const near = (a, b, epsilon = 1e-6) =>
  assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);

test("screen-right direction matches camera-right at arbitrary isometric azimuths", () => {
  for (const azimuth of [0, Math.PI / 6, Math.PI / 2, Math.PI, -Math.PI / 3]) {
    const d = screenVectorToWorld(1, 0, azimuth);
    near(Math.hypot(d.x, d.z), 1);
    near(d.x, Math.cos(azimuth));
    near(d.z, -Math.sin(azimuth));
    const down = screenVectorToWorld(0, 1, azimuth);
    near(d.x * down.x + d.z * down.z, 0);
  }
});
test("One-Euro filter rejects high-frequency stationary jitter and follows a fast deliberate step", () => {
  const f = new OneEuroFilter();
  f.reset(0);
  let raw = 0,
    filtered = 0;
  for (let i = 0; i < 120; i++) {
    const v = i % 2 ? 1 : -1;
    raw += v * v;
    const out = f.filter(v, 1 / 120);
    if (i > 20) filtered += out * out;
  }
  assert.ok(filtered / 99 < (raw / 120) * 0.1);
  let value = 0;
  for (let i = 0; i < 30; i++) value = f.filter(75, 1 / 120);
  assert.ok(value > 72);
});
test("left and right pointers are isolated and unrelated third-pointer movement/release is ignored", () => {
  const f = fixture(),
    c = f.controller;
  assert.equal(c.beginMovement(11), true);
  assert.equal(c.begin(11, 0, rect, 50, 50), false);
  assert.equal(c.begin(22, 2, rect, 50, 50), true);
  assert.equal(c.begin(33, 0, rect, 50, 50), false);
  assert.equal(c.move(33, 900, 100), false);
  assert.equal(c.finish(33, 900, 100), false);
  assert.equal(c.leftJoystickPointerId, 11);
  assert.equal(c.rightSkillPointerId, 22);
  c.cancel(22);
  assert.equal(c.leftJoystickPointerId, 11);
  assert.equal(c.rightSkillPointerId, null);
  c.endMovement(11);
  assert.deepEqual(f.manual, [
    ["start", 11],
    ["start", 22],
    ["end", 22],
    ["end", 11],
  ]);
  assert.equal(f.casts.length, 0);
});
test("manual ground distance reaches full range and actual AOE point equals the last displayed smoothed point", () => {
  const f = fixture(),
    c = f.controller;
  c.begin(2, 2, rect, 50, 50);
  c.move(2, 125, 50);
  f.advance(0.5);
  const before = f.aims.at(-1).projection.point,
    range = skillFor(f.m.player, 2).range;
  assert.ok(
    Math.hypot(before.x - f.m.player.x, before.z - f.m.player.z) > range * 0.98,
  );
  c.finish(2, 125, 50);
  const zone = f.m.zones.find((z) => z.k === 2);
  assert.ok(zone);
  near(zone.point.x, before.x);
  near(zone.point.z, before.z);
  assert.equal(f.casts.length, 1);
});
test("60Hz and 120Hz smoothing converge to the same finite reticle, including a 180-degree reversal", () => {
  const points = [];
  for (const hz of [60, 120]) {
    const f = fixture(),
      c = f.controller;
    c.begin(2, 2, rect, 50, 50);
    c.move(2, 125, 50);
    f.advance(0.8, hz);
    c.move(2, -25, 50);
    f.advance(0.8, hz);
    const point = f.aims.at(-1).projection.point;
    assert.ok(Number.isFinite(point.x + point.z));
    points.push(point);
  }
  assert.ok(
    Math.hypot(points[0].x - points[1].x, points[0].z - points[1].z) < 0.02,
  );
});
test("cancel zone, pointercancel and lost ownership never spend mana or cooldown", () => {
  for (const abort of ["zone", "pointercancel", "reset"]) {
    const f = fixture(),
      c = f.controller,
      mp = f.m.player.mp;
    c.begin(22, 0, rect, 50, 50);
    if (abort === "zone") {
      c.move(22, 900, 100);
      c.finish(22, 900, 100);
    } else if (abort === "pointercancel") c.cancel(22);
    else c.reset();
    near(f.m.player.mp, mp);
    assert.equal(f.m.player.cooldowns[0], 0);
    assert.equal(f.casts.length, 0);
    assert.equal(c.rightSkillPointerId, null);
  }
});
test("smart tap leads a moving visible hero and excludes hidden, downed and foreign-realm targets", () => {
  const f = fixture(),
    c = f.controller,
    a = f.m.player;
  const target = f.m.createHero(1, 1, a.x + 3, a.z, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  c.observe();
  target.z += 0.5;
  f.m.time += 0.1;
  c.observe();
  const other = f.m.createHero(1, 2, a.x + 1, a.z, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  other.realm = 1;
  other.hp = 1;
  const aim = c.quickAim(0);
  assert.equal(aim.targetId, target.id);
  assert.ok(aim.z > 0);
  near(Math.hypot(aim.x, aim.z), 1);
});
test("beast target mode takes priority over low-health heroes and falls back when no beast is legal", () => {
  const f = fixture(),
    c = f.controller,
    a = f.m.player;
  const enemy = f.m.createHero(1, 1, a.x + 2, a.z, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  enemy.hp = 1;
  const beast = f.m.spawnBeast(0, a.x + 3, a.z);
  c.getTargetMode = () => "auto";
  assert.equal(c.quickAim(0).targetId, enemy.id);
  c.getTargetMode = () => "beast";
  assert.equal(c.quickAim(0).targetId, beast.id);
  beast.realm = 1;
  assert.equal(c.quickAim(0).targetId, enemy.id);
});
test("quarter-second queue fires at the first ready frame without changing original cooldown or mana rules", () => {
  const f = fixture(),
    c = f.controller,
    a = f.m.player;
  a.cooldowns[0] = 0.15;
  const mp = a.mp,
    skill = skillFor(a, 0);
  assert.equal(c.requestCast(0, { x: 1, z: 0 }), true);
  assert.equal(f.casts.length, 0);
  for (let i = 0; i < 60 && !f.casts.length; i++) f.frame(1 / 120);
  if (!f.casts.length) f.frame(1 / 120);
  assert.equal(f.casts.length, 1);
  assert.equal(f.casts[0].k, 0);
  assert.ok(f.casts[0].time <= 0.18);
  near(a.mp, mp - skill.mp, 0.5);
  assert.ok(a.cooldowns[0] > skill.cd - 0.03);
  a.cooldowns[1] = 0.3;
  assert.equal(c.requestCast(1), false);
  c.reset();
  assert.equal(c.skillBufferQueue.length, 0);
});
test("offline buffer follows cooldown simulation time while online stale intents expire on wall time", () => {
  const f = fixture(),
    c = f.controller,
    a = f.m.player;
  let wall = 0;
  c.now = () => wall;
  a.cooldowns[0] = 0.19;
  assert.equal(c.requestCast(0, { x: 1, z: 0 }), true);
  wall = 1;
  for (let i = 0; i < 5; i++) {
    f.m.step(0.05, { x: 0, z: 0, attack: false });
    c.update(0.05);
  }
  assert.equal(f.casts.length, 1);
  c.reset();
  f.m.online = true;
  a.cooldowns[0] = 0.19;
  assert.equal(c.requestCast(0, { x: 1, z: 0 }), true);
  wall += 0.251;
  a.cooldowns[0] = 0;
  c.update(0.01);
  assert.equal(c.skillBufferQueue.length, 0);
  assert.equal(f.casts.length, 1);
});
test("hit preview uses real line/cone/circle geometry and rejects teammates and different realms", () => {
  const f = fixture(),
    a = f.m.player;
  const hit = f.m.createHero(1, 1, a.x + 3, a.z, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  const miss = f.m.createHero(1, 2, a.x + 3, a.z + 2, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  const ally = f.m.createHero(1, a.team, a.x + 1, a.z, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  const skill = skillFor(a, 0),
    p = projectSkillCast(f.m, a, skill, { x: 1, z: 0 });
  assert.deepEqual(
    previewSkillHits(f.m, a, skill, p).map((t) => t.id),
    [hit.id],
  );
  hit.realm = 1;
  assert.equal(previewSkillHits(f.m, a, skill, p).length, 0);
  assert.ok(ally && miss);
});
test("hit previews cover a full 100-opponent cluster and reuse their lazy mesh pool", () => {
  const f = fixture(),
    a = f.m.player,
    scene = new Scene();
  const targets = Array.from({ length: 100 }, () =>
    f.m.createHero(1, 1, a.x + 0.1, a.z + 2, {
      hero: 1,
      branch: 0,
      rings: [0, 0],
      bones: [],
      supports: [],
    }),
  );
  const skill = skillFor(a, 0),
    painter = new SkillIndicatorRenderer(scene, skill);
  painter.update(a, skill, { x: 0, z: 1 }, false, f.m, 1);
  assert.equal(painter.group.userData.hitActorIds.length, 100);
  assert.equal(painter.hitRings.filter((r) => r.visible).length, 100);
  const first = painter.hitRings[0].geometry;
  for (const target of targets) target.x += 50;
  painter.update(a, skill, { x: 0, z: 1 }, false, f.m, 2);
  assert.equal(painter.hitRings.filter((r) => r.visible).length, 0);
  targets[0].x -= 50;
  painter.update(a, skill, { x: 0, z: 1 }, false, f.m, 3);
  assert.equal(painter.hitRings.filter((r) => r.visible).length, 1);
  assert.equal(painter.hitRings[0].geometry, first);
  assert.equal(painter.hitRings.length, 100);
  painter.dispose();
  assert.equal(scene.children.length, 0);
});

test("ground decals follow height +.06, pool geometry across frames and switch every layer to cancel red", () => {
  const f = fixture(),
    a = f.m.player,
    scene = new Scene(),
    sk = skillFor(a, 2),
    renderer = new SkillIndicatorRenderer(scene, sk);
  renderer.update(a, sk, { x: 1, z: 0, distance: 4 }, false, f.m, 1);
  const center = renderer.group.getObjectByName("area-center"),
    geo = center.geometry;
  renderer.group.updateMatrixWorld(true);
  const position = center.getWorldPosition(new Vector3());
  near(position.y, groundHeight(a.x + 4, a.z) + 0.06);
  renderer.update(a, sk, { x: 0, z: 1, distance: 3 }, true, f.m, 2);
  assert.equal(center.geometry, geo);
  renderer.group.traverse((o) => {
    if (o.material?.color) assert.equal(o.material.color.getHex(), 0xef4444);
    if (o.material?.uniforms?.uColor)
      assert.equal(o.material.uniforms.uColor.value.getHex(), 0xef4444);
  });
  assert.equal(
    renderer.group.getObjectByName("parabolic-cast-arc").visible,
    true,
  );
  renderer.dispose();
  assert.equal(scene.children.length, 0);
});
