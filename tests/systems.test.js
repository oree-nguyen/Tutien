import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile, loot } from "../src/rules.js";
import {
  safePath,
  canSee,
  ringResonance,
  randomGatePositions,
} from "../src/systems.js";
const load = {
  hero: 0,
  branch: 0,
  rings: [1, 3],
  bones: [],
  supports: [{ id: 17, tier: 1 }],
  brought: 100,
  mode: "solo",
  skin: 0,
};
test("snapshot round trip preserves actors, references, sets and extraction escrow", () => {
  const m = new Match(load, newProfile());
  m.openDebugGates();
  m.teleport("gate");
  const uid = m.player.gear[0].uid;
  m.beginExtraction("send", [uid]);
  m.bosses.add("ape");
  const r = Match.restore(JSON.parse(JSON.stringify(m.snapshot())));
  assert.equal(
    r.player,
    r.actors.find((a) => a.id === r.player.id),
  );
  assert.ok(r.bosses.has("ape"));
  assert.equal(r.player.channel.escrow[0].uid, uid);
  r.cancelExtraction();
  assert.equal(r.player.rings[0], 1);
  assert.throws(() => (r.player.branch = 2));
  r.fixed(1 / 30, { x: 0, z: 0 });
});
test("clone expiry does not trigger destruction explosion", () => {
  const m = new Match(
    { ...load, hero: 2, rings: [0, 0], branch: 2 },
    newProfile(),
  );
  m.actors = [m.player];
  m.cast(m.player, 1, { x: 1, z: 0 });
  const c = m.actors.find((a) => a.kind === "clone"),
    t = m.spawnBeast(0, c.x, c.z);
  t.hp = t.maxHp = 10000;
  const hp = t.hp;
  m.kill(c, m.player, "expired");
  assert.equal(t.hp, hp);
});
test("ring resonance uses shared element not merely overlapping compatibility", () => {
  assert.ok(ringResonance([1, 3]));
  assert.equal(ringResonance([1, 2]), false);
  assert.equal(ringResonance([1, 0]), false);
});
test("variable gate locations change per wave and retain two fixed gates", () => {
  const a = randomGatePositions(1),
    b = randomGatePositions(2);
  assert.deepEqual(a.slice(0, 2), b.slice(0, 2));
  assert.notDeepEqual(a.slice(2), b.slice(2));
});
test("AOI respects realm, bush, obstacles and owner-scoped reveal", () => {
  const m = new Match(load, newProfile()),
    a = m.player,
    t = m.createHero(1, 2, 15, 8);
  t.x = 15;
  t.z = 8;
  m.bushes = [{ x: 15, z: 8, r: 2 }];
  assert.equal(canSee(m, a, t), false);
  m.reveal(a, t, 3);
  assert.ok(canSee(m, a, t));
  const other = m.createHero(2, 3, 8, 8);
  other.x = 8;
  other.z = 8;
  assert.equal(canSee(m, other, t), false);
  t.realm = 1;
  assert.equal(canSee(m, a, t), false);
});
test("A* returns a traversable path around obstacles", () => {
  const m = new Match(load, newProfile());
  m.obstacles = [{ x: 12, z: 8, r: 3, blocksSight: true }];
  const path = safePath(m, m.player, { x: 24, z: 8 });
  assert.ok(path.length > 3);
  assert.ok(
    path.slice(1, -1).every((p) => Math.hypot(p.x - 12, p.z - 8) >= 3.7),
  );
});
test("realm entry window and two exits are enforced", () => {
  const m = new Match(load, newProfile()),
    a = m.player;
  a.x = 58;
  a.z = 32;
  assert.throws(() => m.usePortal());
  m.setTime(600);
  m.usePortal();
  assert.equal(a.realm, 1);
  a.x = 70;
  a.z = -7;
  m.usePortal();
  assert.equal(a.realm, 0);
  m.setTime(840);
  assert.throws(() => m.usePortal());
});
test("Thú Triều produces reward only after all eight beasts are defeated", () => {
  const m = new Match(load, newProfile());
  m.setTime(900);
  m.advanceWorld(1 / 30);
  assert.equal(m.tide.ids.length, 8);
  const before = m.drops.length;
  m.tide.ids.forEach((id) => (m.actors.find((a) => a.id === id).alive = false));
  m.advanceWorld(1 / 30);
  assert.equal(m.drops.length, before + 1);
  m.advanceWorld(1 / 30);
  assert.equal(m.drops.length, before + 1);
});
test("final-wave overtime is retained after22:00 while non-channelled players are removed", () => {
  const m = new Match(load, newProfile());
  m.actors = m.actors.filter((a) => a.kind === "hero");
  m.ai = () => {};
  m.setTime(1319);
  m.teleport("gate");
  m.player.immuneUntil = 1400;
  m.beginExtraction();
  for (let i = 0; i < 61; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.ok(m.player.alive);
  assert.ok(m.player.channel);
  assert.equal(m.result, null);
});
test("loot in another dimension cannot be picked up at identical coordinates", () => {
  const m = new Match(load, newProfile());
  m.drops = [];
  const drop = m.makeDrop(m.player.x, m.player.z, [loot("ring", 1)], 100);
  drop.realm = 1;
  assert.equal(m.pickup(), false);
  assert.equal(m.player.wallet.earned, 0);
});
