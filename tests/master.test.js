import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile, loot, weight } from "../src/rules.js";
import { Room } from "../server/room.js";
import { ensureRuntimeSecurity } from "../src/runtime-security.js";
import { masterworkAssets } from "../src/item-art.js";
import { biomeAt, sceneryTerrainHeight } from "../src/scenery.js";
import { terrainHeight } from "../src/art.js";
import { REGIONS } from "../src/data.js";
const make = () => {
  const m = new Match(
    {
      hero: 0,
      branch: 0,
      skin: 0,
      costume: 0,
      rings: [0, 0],
      bones: [],
      supports: [],
      brought: 100,
      mode: "solo",
    },
    newProfile(),
  );
  m.actors = [m.player];
  m.obstacles = [];
  m.bushes = [];
  m.drops = [];
  m.player.x = m.player.z = 0;
  m.player.immuneUntil = 1000;
  return m;
};
test("selected loot transfers only requested UUID and preserves other chest contents", () => {
  const m = make(),
    first = loot("ring", 1),
    second = loot("bone", 1);
  m.makeDrop(0, 0, [first, second], 45);
  assert.equal(m.pickupSelected(second.uid), true);
  assert.equal(m.player.wallet.earned, 45);
  assert.deepEqual(
    m.player.bag.map((i) => i.uid),
    [second.uid],
  );
  assert.deepEqual(
    m.drops[0].items.map((i) => i.uid),
    [first.uid],
  );
  assert.equal(m.pickupSelected("stale-uuid"), false);
  assert.equal(m.player.wallet.earned, 45);
});
test("selected loot respects same realm, priority lock and48W inventory", () => {
  const m = make(),
    item = loot("bone", 1);
  m.makeDrop(0, 0, [item], 0, 9, 12);
  assert.equal(m.pickupSelected(item.uid), false);
  m.time = 13;
  m.drops[0].realm = 1;
  assert.equal(m.pickupSelected(item.uid), false);
  m.drops[0].realm = 0;
  m.player.bag = Array.from({ length: 16 }, () => loot("weapon", 1));
  assert.equal(weight(m.player.bag), 48);
  m.pickupSelected(item.uid);
  assert.equal(m.player.bag.length, 16);
  assert.equal(m.drops[0].items.length, 1);
});
test("server pickup command accepts only UUID and applies authoritative range/realm checks", async () => {
  const m = make(),
    item = loot("ring", 1),
    id = "server-account";
  m.makeDrop(15, 0, [item]);
  const room = Object.create(Room.prototype);
  room.match = m;
  room.players = new Map([
    [id, { accountId: id, actorId: m.player.id, lastSeq: 0 }],
  ]);
  room.persist = async () => {};
  await room.input(id, {
    seq: 1,
    type: "action",
    action: "pickup",
    uid: item.uid,
  });
  assert.equal(m.player.bag.length, 0);
  m.player.x = 15;
  await room.input(id, {
    seq: 2,
    type: "action",
    action: "pickup",
    uid: item.uid,
  });
  assert.equal(m.player.bag[0].uid, item.uid);
  await assert.rejects(
    room.input(id, {
      seq: 3,
      type: "action",
      action: "pickup",
      uid: { uid: item.uid },
    }),
    /UUID/,
  );
});
test("runtime vault restores actual wallet,HP,MP,cooldown,position and clock edits", () => {
  const m = make(),
    guard = ensureRuntimeSecurity(m),
    expected = {
      hp: m.player.hp,
      mp: m.player.mp,
      tb: m.player.wallet.brought,
    };
  m.player.hp = 99999;
  m.player.mp = 99999;
  m.player.wallet.brought = 99999;
  m.player.cooldowns[0] = -10;
  m.player.x = 90;
  m.time = 1200;
  const result = guard.inspect();
  assert.equal(result.ok, false);
  assert.ok(result.detected >= 6);
  assert.equal(m.player.hp, expected.hp);
  assert.equal(m.player.mp, expected.mp);
  assert.equal(m.player.wallet.brought, expected.tb);
  assert.equal(m.player.cooldowns[0], 0);
  assert.equal(m.player.x, 0);
  assert.equal(m.time, 0);
});
test("runtime guard blocks forged extraction channel and restores altered active timer", () => {
  const m = make();
  m.openDebugGates();
  m.player.x = m.gates[0].x;
  m.player.z = m.gates[0].z;
  const g = ensureRuntimeSecurity(m);
  m.player.channel = { total: 1, elapsed: 1, paused: 0 };
  g.inspect();
  assert.equal(m.player.channel, null);
  m.beginExtraction("exit");
  const channel = m.player.channel,
    total = channel.total;
  channel.total = 0.1;
  channel.elapsed = 100;
  g.inspect();
  assert.equal(m.player.channel, channel);
  assert.equal(channel.total, total);
  assert.equal(channel.elapsed, 0);
});
test("monotonic credit rejects instant huge frame and legitimateF remains valid", async () => {
  const m = make(),
    g = ensureRuntimeSecurity(m);
  await new Promise((r) => setTimeout(r, 40));
  m.step(1000, { x: 0, z: 0 });
  assert.ok(m.time < 0.15);
  const previous = { x: m.player.x, z: m.player.z };
  m.cast(m.player, 4);
  assert.ok(
    Math.hypot(m.player.x - previous.x, m.player.z - previous.z) <= 2.81,
  );
  assert.ok(m.player.cooldowns[4] > 0);
  assert.equal(g.inspect().ok, true);
  assert.throws(() => m.step(Infinity), /thời gian/);
});
test("explicit offline Sandbox authorizes fixtures but online controller refuses it", () => {
  const m = make(),
    g = ensureRuntimeSecurity(m);
  g.sandbox(() => {
    m.player.wallet.earned = 500;
    m.time = 300;
    m.player.x = 32;
  });
  assert.equal(g.inspect().ok, true);
  assert.equal(m.player.wallet.earned, 500);
  const online = make();
  online.online = true;
  const remote = ensureRuntimeSecurity(online);
  assert.throws(() => remote.sandbox(() => {}), /online/);
  online.player = { ...online.player, hp: 400 };
  online.onAuthoritativeState();
  assert.equal(remote.inspect().ok, true);
});
test("149 item/skin/skill catalogue entries are complete and stable", () => {
  const entries = masterworkAssets.catalogue();
  assert.equal(entries.length, 149);
  const counts = {};
  for (const e of entries) counts[e.type] = (counts[e.type] ?? 0) + 1;
  assert.deepEqual(counts, {
    bone: 7,
    ring: 12,
    item: 28,
    support: 18,
    weapon: 12,
    skin: 24,
    skill: 48,
  });
  assert.equal(new Set(entries.map((e) => e.type + ":" + e.id)).size, 149);
});
test("600m decorative terrain keeps playable heights and allseven biome centres", () => {
  for (let i = 0; i < REGIONS.length; i++)
    assert.equal(biomeAt(REGIONS[i].x, REGIONS[i].z), i);
  for (let x = -94; x <= 94; x += 11)
    for (let z = -94; z <= 94; z += 11)
      assert.ok(
        Math.abs(sceneryTerrainHeight(x, z) - terrainHeight(x, z)) < 1e-10,
      );
  assert.ok(sceneryTerrainHeight(240, 220) > 4);
});
