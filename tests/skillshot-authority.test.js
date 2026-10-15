import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile, skillFor } from "../src/rules.js";
import { Room } from "../server/room.js";
import { projectSkillCast } from "../src/skill-projection.js";

const loadout = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 100,
  skin: 0,
  costume: 0,
  mode: "solo",
  ranked: false,
};
function fixture(hero = 0) {
  const match = new Match({ ...loadout, hero }, newProfile());
  match.actors = [match.player];
  match.obstacles = [];
  match.bushes = [];
  match.zones = [];
  match.effects = [];
  match.projectiles = [];
  match.time = 10;
  const actor = match.player;
  Object.assign(actor, {
    x: 0,
    z: 0,
    dir: { x: 0, z: 1 },
    immuneUntil: 0,
    ai: false,
    now: match.time,
  });
  const accountId = "skillshot-authority-fixture";
  const room = Object.create(Room.prototype);
  room.match = match;
  room.players = new Map([
    [accountId, { accountId, actorId: actor.id, lastSeq: 0 }],
  ]);
  room.persist = async () => {};
  const other = (team, x, z, changes = {}) => {
    const target = match.createHero(1, team, x, z, loadout);
    Object.assign(target, { x, z, immuneUntil: 0, ai: false, ...changes });
    return target;
  };
  return { match, actor, room, accountId, other };
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test("Room rejects nonfinite, zero and excessive aim vectors without spending MP or cooldown", async () => {
  for (const aim of [
    { x: NaN, z: 0 },
    { x: Infinity, z: 0 },
    { x: 0, z: -Infinity },
    { x: 0, z: 0 },
    { x: 2, z: 0 },
  ]) {
    const { room, accountId, actor, match } = fixture(),
      before = {
        mp: actor.mp,
        cooldowns: [...actor.cooldowns],
        wallet: { ...actor.wallet },
      };
    await assert.rejects(
      () => room.input(accountId, { seq: 1, type: "skill", skill: 2, aim }),
      /ngắm/,
    );
    assert.equal(actor.mp, before.mp);
    assert.deepEqual(actor.cooldowns, before.cooldowns);
    assert.deepEqual(actor.wallet, before.wallet);
    assert.equal(
      match.zones.length + match.projectiles.length + match.effects.length,
      0,
    );
  }
});

test("Room rejects invalid manual distance and target ID before gameplay mutation", async () => {
  for (const fields of [
    { distance: NaN },
    { distance: Infinity },
    { distance: -0.01 },
    { distance: 50.01 },
    { distance: "2" },
    { distance: null },
    { targetId: NaN },
    { targetId: Infinity },
    { targetId: -1 },
    { targetId: 1.5 },
    { targetId: "2" },
  ]) {
    const { room, accountId, actor, match } = fixture(),
      before = { mp: actor.mp, cooldowns: [...actor.cooldowns] };
    await assert.rejects(
      () =>
        room.input(accountId, {
          seq: 1,
          type: "skill",
          skill: 2,
          aim: { x: 1, z: 0, ...fields },
        }),
      /ngắm/,
    );
    assert.equal(actor.mp, before.mp);
    assert.deepEqual(actor.cooldowns, before.cooldowns);
    assert.equal(match.zones.length, 0);
  }
});

test("server clamps manual AOE points to original skill range and retains exact GDD mana/cooldown", async () => {
  for (const requested of [0, 2.25, 50]) {
    const { room, accountId, actor, match } = fixture(),
      skill = skillFor(actor, 2),
      beforeMp = actor.mp;
    await room.input(accountId, {
      seq: 1,
      type: "skill",
      skill: 2,
      aim: { x: 0.6, z: 0.8, distance: requested },
    });
    const zone = match.zones.find((item) => item.k === 2);
    assert.ok(zone);
    const expected = Math.min(skill.range, requested);
    near(zone.point.x, 0.6 * expected);
    near(zone.point.z, 0.8 * expected);
    near(Math.hypot(zone.point.x, zone.point.z), expected);
    near(actor.mp, beforeMp - skill.mp);
    near(actor.cooldowns[2], skill.cd);
  }
});

test("direct Match AOE normalizes finite nonunit directions instead of extending its cast range", () => {
  const { match, actor } = fixture(),
    skill = skillFor(actor, 2);
  assert.equal(match.cast(actor, 2, { x: 3, z: 4 }), true);
  const point = match.zones.find((zone) => zone.k === 2).point;
  near(Math.hypot(actor.dir.x, actor.dir.z), 1);
  near(point.x, skill.range * 0.65 * 0.6);
  near(point.z, skill.range * 0.65 * 0.8);
});

test("target-locked skill cannot acquire the former range-plus-one default enemy outside its valid cast radius", async () => {
  const { room, accountId, actor, match, other } = fixture(2),
    skill = skillFor(actor, 3),
    target = other(1, skill.range + 0.75, 0),
    hp = target.hp,
    mp = actor.mp;
  await room.input(accountId, {
    seq: 1,
    type: "skill",
    skill: 3,
    aim: { x: 1, z: 0, targetId: target.id },
  });
  assert.ok(match.zones.length > 0);
  assert.ok(match.zones.every((zone) => zone.sk.lockTarget !== target.id));
  for (const zone of match.zones)
    match.skillHit(actor, zone.k, zone.sk, zone.point, zone.dir);
  assert.equal(target.hp, hp);
  assert.equal(actor.mp, mp - skill.mp);
  assert.equal(actor.cooldowns[3], skill.cd);
});

test("forged ally, hidden, other-realm and untargetable target IDs fall back to a valid enemy", async () => {
  for (const changed of [
    { team: 0 },
    { realm: 1 },
    { stealthUntil: 100 },
    { untargetableUntil: 100 },
    { downedUntil: 100 },
    { extracted: true },
  ]) {
    const { room, accountId, actor, match, other } = fixture(2),
      eligible = other(1, 2, 0),
      rejected = other(1, 4, 0, changed),
      hp = rejected.hp,
      before = eligible.hp;
    await room.input(accountId, {
      seq: 1,
      type: "skill",
      skill: 3,
      aim: { x: 1, z: 0, targetId: rejected.id },
    });
    assert.ok(match.zones.every((zone) => zone.sk.lockTarget === eligible.id));
    for (const zone of match.zones)
      match.skillHit(actor, zone.k, zone.sk, zone.point, zone.dir);
    assert.equal(rejected.hp, hp);
    assert.ok(eligible.hp < before);
  }
});

test("a legitimate explicit enemy target controls the lock without changing base MP or cooldown", async () => {
  const { room, accountId, actor, match, other } = fixture(2),
    nearest = other(1, 2, 0),
    chosen = other(1, 4, 0),
    nearHp = nearest.hp,
    chosenHp = chosen.hp,
    mp = actor.mp,
    skill = skillFor(actor, 3);
  await room.input(accountId, {
    seq: 1,
    type: "skill",
    skill: 3,
    aim: { x: 1, z: 0, targetId: chosen.id },
  });
  assert.ok(match.zones.every((zone) => zone.sk.lockTarget === chosen.id));
  for (const zone of match.zones)
    match.skillHit(actor, zone.k, zone.sk, zone.point, zone.dir);
  assert.equal(nearest.hp, nearHp);
  assert.ok(chosen.hp < chosenHp);
  assert.equal(actor.mp, mp - skill.mp);
  assert.equal(actor.cooldowns[3], skill.cd);
});

test("explicit shield ally is validated by team and realm while the chosen valid ally overrides HP fallback", async () => {
  const { room, accountId, actor, other } = fixture(4),
    lowerHp = other(0, 2, 0, { hp: 100 }),
    chosen = other(0, 3, 0, { hp: 400 }),
    skill = skillFor(actor, 1),
    mp = actor.mp;
  await room.input(accountId, {
    seq: 1,
    type: "skill",
    skill: 1,
    aim: { x: 1, z: 0, targetId: chosen.id },
  });
  assert.ok(chosen.shield > 0);
  assert.equal(lowerHp.shield, 0);
  assert.equal(actor.mp, mp - skill.mp);
  assert.equal(actor.cooldowns[1], skill.cd);
});

test("shield fallback rejects cross-realm, extracted and downed allies after an invalid explicit target", async () => {
  for (const changed of [
    { realm: 1 },
    { extracted: true },
    { downedUntil: 100 },
  ]) {
    const { room, accountId, actor, other } = fixture(4),
      rejected = other(0, 1, 0, { hp: 1, ...changed }),
      valid = other(0, 3, 0, { hp: 200 });
    await room.input(accountId, {
      seq: 1,
      type: "skill",
      skill: 1,
      aim: { x: 1, z: 0, targetId: rejected.id },
    });
    assert.equal(rejected.shield, 0);
    assert.ok(valid.shield > 0);
    assert.equal(actor.shield, 0);
  }
});

test("healing fallback cannot cross realms and spends the unchanged original cost", async () => {
  const { room, accountId, actor, other } = fixture(10),
    crossRealm = other(0, 1, 0, { hp: 1, realm: 1 }),
    valid = other(0, 2, 0, { hp: 100 }),
    skill = skillFor(actor, 1),
    mp = actor.mp;
  await room.input(accountId, {
    seq: 1,
    type: "skill",
    skill: 1,
    aim: { x: 1, z: 0, targetId: crossRealm.id },
  });
  assert.equal(crossRealm.hp, 1);
  assert.ok(valid.hp > 100);
  assert.equal(actor.mp, mp - skill.mp);
  assert.equal(actor.cooldowns[1], skill.cd);
});

test("friendly default preview selects the same eligible ally as actual shield instead of an enemy tether", () => {
  const { match, actor, other } = fixture(4),
    valid = other(0, 3, 0, { hp: 100 }),
    enemy = other(1, 1, 0),
    skill = skillFor(actor, 1),
    projection = projectSkillCast(match, actor, skill, null);
  assert.notEqual(projection.targetId, enemy.id);
  assert.equal(projection.targetId, valid.id);
  match.cast(actor, 1);
  assert.ok(valid.shield > 0);
});

test("private absorption and merchant limits appear only on the owning player's snapshot", () => {
  const { room, accountId, actor, other } = fixture(),
    enemy = other(1, 3, 0);
  actor.absorb = { uid: "own-ring", slot: 1, time: 2, origin: { x: 0, z: 0 } };
  actor.merchantBuys = 1;
  enemy.absorb = { uid: "enemy-private-ring", slot: 1, time: 1 };
  enemy.merchantBuys = 2;
  const snapshot = room.view(accountId),
    publicEnemy = snapshot.actors.find(
      (candidate) => candidate.id === enemy.id,
    );
  assert.deepEqual(snapshot.player.absorb, actor.absorb);
  assert.equal(snapshot.player.merchantBuys, 1);
  assert.ok(publicEnemy);
  assert.equal(publicEnemy.absorb, undefined);
  assert.equal(publicEnemy.merchantBuys, undefined);
  assert.equal(JSON.stringify(snapshot).includes("enemy-private-ring"), false);
});

test("real realm-one casts publish VFX only to viewers in the creation realm", () => {
  const { match, actor, room, accountId, other } = fixture();
  Object.assign(actor, { realm: 1, x: 82, z: 0 });
  const outsider = other(1, 82, 0, { realm: 0 }),
    outsiderAccount = "realm-zero-viewer";
  room.players.set(outsiderAccount, {
    accountId: outsiderAccount,
    actorId: outsider.id,
    lastSeq: 0,
  });
  assert.equal(match.cast(actor, 2, { x: 0, z: 1, distance: 2 }), true);
  assert.ok(match.effects.length > 0);
  assert.ok(match.effects.every((effect) => effect.realm === 1));
  assert.ok(match.zones.every((zone) => zone.realm === 1));
  assert.ok(room.view(accountId).effects.length > 0);
  assert.ok(room.view(accountId).zones.length > 0);
  assert.equal(room.view(outsiderAccount).effects.length, 0);
  assert.equal(room.view(outsiderAccount).zones.length, 0);
});

test("persistent zone and projectile cannot follow an owner who changes realm", () => {
  const { match, actor, other } = fixture();
  Object.assign(actor, { realm: 1, x: 82, z: 0 });
  const target = other(1, 82, 2, { realm: 0 }),
    originalHp = target.hp;
  assert.equal(match.cast(actor, 2, { x: 0, z: 1, distance: 2 }), true);
  assert.equal(match.cast(actor, 0, { x: 0, z: 1 }), true);
  assert.ok(match.zones.length > 0);
  assert.ok(match.projectiles.length > 0);
  assert.ok(match.zones.every((zone) => zone.realm === 1));
  assert.ok(match.projectiles.every((projectile) => projectile.realm === 1));
  actor.realm = 0;
  match.fixed(1 / 30, { x: 0, z: 0, attack: false });
  assert.equal(match.zones.filter((zone) => zone.owner === actor).length, 0);
  assert.equal(
    match.projectiles.filter((projectile) => projectile.owner === actor).length,
    0,
  );
  assert.equal(target.hp, originalHp);
  assert.ok(match.effects.every((effect) => effect.realm === 1));
});

test("actual portal transition immediately cancels previous-realm casts without refunding costs", () => {
  const { match, actor } = fixture();
  match.time = 610;
  Object.assign(actor, { realm: 0, x: 58, z: 32 });
  const zoneSkill = skillFor(actor, 2),
    lineSkill = skillFor(actor, 0),
    originalMp = actor.mp;
  assert.equal(match.cast(actor, 2, { x: 0, z: 1, distance: 2 }), true);
  assert.equal(match.cast(actor, 0, { x: 0, z: 1 }), true);
  match.usePortal(actor);
  assert.equal(actor.realm, 1);
  assert.equal(match.zones.length, 0);
  assert.equal(match.projectiles.length, 0);
  assert.equal(actor.mp, originalMp - zoneSkill.mp - lineSkill.mp);
  assert.equal(actor.cooldowns[2], zoneSkill.cd);
  assert.equal(actor.cooldowns[0], lineSkill.cd);
  assert.ok(match.effects.every((effect) => effect.realm === 0));
});

test("synergy requires allied zones in their captured realm and still works inside realm one", () => {
  const { match, actor, other } = fixture(3);
  Object.assign(actor, { realm: 1, x: 82, z: 0 });
  const ally = other(0, 82, 1, { hero: 0, realm: 0 }),
    target = other(1, 82, 2, { realm: 1 }),
    skill = skillFor(ally, 2);
  match.zone(ally, { x: target.x, z: target.z }, skill, 2);
  // Moving the owner alone cannot move an already-created vine across realms.
  ally.realm = 1;
  const originalHp = target.hp;
  match.resonance(actor, target, 0, target);
  assert.equal(target.hp, originalHp);
  assert.equal(match.effects.length, 0);
  match.zone(ally, { x: target.x, z: target.z }, skill, 2);
  match.resonance(actor, target, 0, target);
  assert.ok(target.hp < originalHp);
  assert.ok(match.effects.length > 0);
  assert.ok(match.effects.every((effect) => effect.realm === 1));
});

test("foreign-realm wall and grounding field cannot obstruct local movement or dash", () => {
  const { match, actor, other } = fixture(),
    owner = other(1, 2, 0, { realm: 1, rings: [9, 0] });
  match.zones.push({
    id: match.nextId++,
    owner,
    realm: 1,
    wall: true,
    point: { x: 1, z: 0 },
    sk: { radius: 0.5 },
    k: 1,
    end: match.time + 3,
  });
  match.move(actor, 1, 0, 0.2);
  assert.ok(actor.x > 0.5);
  actor.x = 0;
  assert.equal(match.dash(actor, 2.8, { x: 1, z: 0 }), true);
  near(actor.x, 2.8);
  assert.ok(!(actor.ccUntil > match.time));
});
