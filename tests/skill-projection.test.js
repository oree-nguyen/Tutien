import test from "node:test";
import assert from "node:assert/strict";
import { Object3D, Scene, Vector3 } from "three";
import { Match } from "../src/simulation.js";
import { newProfile, skillFor } from "../src/rules.js";
import { World } from "../src/world.js";
import { groundHeight } from "../src/art.js";
import { projectSkillCast } from "../src/skill-projection.js";
import { Room } from "../server/room.js";

const loadout = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 100,
  skin: 0,
  mode: "solo",
};
function fixture() {
  const match = new Match(loadout, newProfile());
  match.actors = [match.player];
  match.obstacles = [];
  match.bushes = [];
  match.player.x = -50;
  match.player.z = -45;
  match.player.dir = { x: 0, z: 1 };
  const world = Object.create(World.prototype);
  world.scene = new Scene();
  world.targetRing = new Object3D();
  return { match, actor: match.player, world };
}
const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-7,
    `${actual} differs from ${expected}`,
  );
function projectedCenter(world) {
  world.aimGuide.updateMatrixWorld(true);
  return world.aimGuide
    .getObjectByName("area-center")
    .getWorldPosition(new Vector3());
}
function assertCastCenter(match, world, aim) {
  const before = projectedCenter(world);
  assert.equal(match.cast(match.player, 2, aim), true);
  const point = match.zones.find((z) => z.k === 2).point;
  near(before.x, point.x);
  near(before.z, point.z);
  near(before.y, groundHeight(point.x, point.z) + 0.1);
  return point;
}

test("AOE preview matches actual no-target cast at 65% range and the target terrain height", () => {
  const { match, actor, world } = fixture();
  const skill = skillFor(actor, 2),
    aim = { x: 1, z: 0 };
  world.aim(actor, skill, aim, false, match);
  const point = assertCastCenter(match, world, aim);
  near(point.x, actor.x + skill.range * 0.65);
  assert.ok(
    Math.abs(groundHeight(point.x, point.z) - groundHeight(actor.x, actor.z)) >
      0.005,
    "Fixture must exercise a sloped surface",
  );
});

test("manual AOE heading preserves Match.cast nearest-enemy distance rather than using a fixed range fraction", () => {
  const { match, actor, world } = fixture();
  match.createHero(1, 1, actor.x + 4, actor.z, loadout);
  const skill = skillFor(actor, 2),
    aim = { x: 0, z: 1 };
  world.aim(actor, skill, aim, false, match);
  const point = assertCastCenter(match, world, aim);
  near(point.x, actor.x);
  near(point.z, actor.z + 4);
});

test("tap AOE preview and visible online-snapshot prediction choose the same eligible target as Match.cast", () => {
  const { match, actor, world } = fixture();
  match.createHero(1, 0, actor.x + 1, actor.z, loadout);
  const otherRealm = match.createHero(1, 1, actor.x + 1.5, actor.z, loadout);
  otherRealm.realm = 1;
  const downed = match.createHero(1, 1, actor.x + 2, actor.z, loadout);
  downed.downedUntil = 10;
  const untargetable = match.createHero(1, 1, actor.x + 3, actor.z, loadout);
  untargetable.untargetableUntil = 10;
  const eligible = match.createHero(1, 1, actor.x + 4, actor.z, loadout);
  const skill = skillFor(actor, 2);
  world.aim(actor, skill, null, false, match);
  const snapshot = {
    actors: match.actors,
    time: match.time,
    bushes: [],
    obstacles: [],
    online: true,
  };
  const online = projectSkillCast(snapshot, actor, skill, null);
  assert.equal(online.targetId, eligible.id);
  assert.equal(online.snapshotPrediction, true);
  const point = assertCastCenter(match, world, null);
  near(point.x, online.point.x);
  near(point.z, online.point.z);
});

test("AOE range clamps to the actual cast and moving targets update the existing guide geometry", () => {
  const { match, actor, world } = fixture();
  const enemy = match.createHero(1, 1, actor.x + 4, actor.z, loadout);
  const skill = skillFor(actor, 2),
    aim = { x: 0, z: 1 };
  world.aim(actor, skill, aim, false, match);
  const geometry = world.aimGuide.getObjectByName("area-center").geometry;
  enemy.x = actor.x + skill.range + 0.5;
  world.aim(actor, skill, aim, false, match);
  assert.equal(
    world.aimGuide.getObjectByName("area-center").geometry,
    geometry,
  );
  const point = assertCastCenter(match, world, aim);
  near(point.z, actor.z + skill.range);
});

test("an overlapping enemy cannot create NaN zones; preview and cast retain a finite heading", () => {
  for (const previous of [
    { x: 1, z: 0 },
    { x: NaN, z: Infinity },
  ]) {
    const { match, actor, world } = fixture();
    actor.dir = previous;
    match.createHero(1, 1, actor.x, actor.z, loadout);
    world.aim(actor, skillFor(actor, 2), null, false, match);
    const point = assertCastCenter(match, world, null);
    near(point.x, actor.x);
    near(point.z, actor.z);
    assert.ok(Number.isFinite(actor.dir.x) && Number.isFinite(actor.dir.z));
    assert.deepEqual(
      actor.dir,
      Number.isFinite(previous.x) ? previous : { x: 0, z: 1 },
    );
  }
});

test("Linh Bộ heading preview ignores nearby enemies, follows a new facing and matches the actual 2.8m dash", () => {
  const { match, actor, world } = fixture();
  match.createHero(1, 1, actor.x + 0.5, actor.z, loadout);
  const guide = { shape: "line", range: 2.8, radius: 0.6, headingOnly: true };
  world.aim(actor, guide, null, false, match);
  near(world.aimGuide.userData.projectedPoint.x, actor.x);
  near(world.aimGuide.userData.projectedPoint.z, actor.z + 2.8);
  assert.equal(projectSkillCast(match, actor, guide).targetId, null);
  actor.dir = { x: 0, z: -1 };
  world.aim(actor, guide, null, false, match);
  const endpoint = world.aimGuide.userData.projectedPoint;
  near(endpoint.z, actor.z - 2.8);
  assert.equal(match.cast(actor, 4), true);
  near(actor.x, endpoint.x);
  near(actor.z, endpoint.z);
});

test("Linh Bộ cast honors and normalizes an explicit aim while retaining 8s cooldown and .25s immunity", () => {
  const { match, actor, world } = fixture();
  actor.dir = { x: 0, z: -1 };
  const before = { x: actor.x, z: actor.z };
  const aim = { x: 3, z: 4 };
  world.aim(
    actor,
    { shape: "line", range: 2.8, radius: 0.6, headingOnly: true },
    aim,
    false,
    match,
  );
  const endpoint = world.aimGuide.userData.projectedPoint;
  assert.equal(match.cast(actor, 4, aim), true);
  near(actor.x, before.x + 2.8 * 0.6);
  near(actor.z, before.z + 2.8 * 0.8);
  near(actor.x, endpoint.x);
  near(actor.z, endpoint.z);
  near(Math.hypot(actor.x - before.x, actor.z - before.z), 2.8);
  assert.deepEqual(actor.dir, { x: 0.6, z: 0.8 });
  assert.equal(actor.cooldowns[4], 8);
  assert.equal(actor.immuneUntil, match.time + 0.25);
  assert.equal(actor.dodgeReady, match.time + 0.25);
});

test("Room skill4 packet controls authoritative dash direction rather than the previous server facing", async () => {
  const { match, actor } = fixture();
  actor.dir = { x: 0, z: -1 };
  const before = { x: actor.x, z: actor.z };
  const accountId = "skill4-direction-regression";
  const room = Object.create(Room.prototype);
  room.match = match;
  room.players = new Map([
    [accountId, { accountId, actorId: actor.id, lastSeq: 0 }],
  ]);
  room.persist = async () => {};
  await room.input(accountId, {
    seq: 1,
    type: "skill",
    skill: 4,
    aim: { x: 0.6, z: 0.8 },
  });
  near(actor.x, before.x + 1.68);
  near(actor.z, before.z + 2.24);
  assert.deepEqual(actor.dir, { x: 0.6, z: 0.8 });
  assert.equal(actor.cooldowns[4], 8);
  assert.equal(actor.immuneUntil, match.time + 0.25);
});
