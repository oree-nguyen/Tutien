import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/rules.js";
import { HEROES, SKILLS, ITEMS, RECIPES, SUPPORTS } from "../src/data.js";
import { Match } from "../src/simulation.js";
const load = (over = {}) => ({
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 300,
  mode: "solo",
  skin: 0,
  ranked: false,
  ...over,
});
const actor = (over = {}) => ({
  hero: 0,
  branch: 0,
  items: [],
  bones: [],
  rings: [],
  skin: 0,
  hp: 950,
  now: 0,
  buffs: [],
  stacks: 0,
  wallet: { brought: 300, earned: 100 },
  bag: [],
  gear: [],
  supports: [],
  ...over,
});
test("CHAR-01: all 12 C2 base stats and 48 skills exist", () => {
  assert.equal(HEROES.length, 12);
  assert.equal(SKILLS.flat().length, 48);
  assert.deepEqual(
    HEROES.map((h) => h.hp),
    [950, 1200, 820, 850, 910, 1450, 940, 880, 870, 1150, 900, 830],
  );
  for (let hero = 0; hero < 12; hero++)
    for (let branch = 0; branch < 3; branch++)
      for (let k = 0; k < 4; k++) {
        const s = R.skillFor(actor({ hero, branch }), k);
        assert.ok(s.cd > 0 && s.mp > 0);
        assert.ok(Number.isFinite(s.base + s.scale));
      }
});
test("SUP-01: reject fourth, duplicate and Duy+Boi loadout", () => {
  for (const supports of [
    [{ id: 1 }, { id: 4 }],
    [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }],
    [{ id: 2 }, { id: 2 }],
  ])
    assert.throws(() =>
      R.validateLoadout(
        load({ supports: supports.map((s) => ({ ...s, tier: 1 })) }),
      ),
    );
  assert.equal(SUPPORTS.length, 18);
});
test("RING-01: wrong tags and slots rejected", () => {
  assert.throws(() => R.validateLoadout(load({ hero: 1, rings: [1, 0] })));
  R.validateLoadout(load({ hero: 0, rings: [1, 3] }));
  assert.equal(R.ringCompatible(0, 1, 2), false);
});
test("SHOP-01/02: seven slots, bought wallet first, resale in earned wallet", () => {
  let a = actor();
  for (let i = 0; i < 7; i++) {
    a.wallet.earned += 100;
    R.buy(a, 1);
  }
  assert.equal(a.items.length, 7);
  assert.throws(() => R.buy(a, 1));
  let before = a.wallet.earned;
  R.sell(a, 0);
  assert.equal(a.wallet.earned, before + 60);
  assert.equal(a.wallet.brought, 0);
  R.buy(a, 1);
  assert.equal(a.items.length, 7);
});
test("SHOP-03: all seven recipes conserve exact components and costs; dismantle returns main Linh", () => {
  assert.equal(ITEMS.length, 28);
  for (const [out, p, l, fee] of RECIPES) {
    let a = actor({ items: [p, l] });
    let before = a.wallet.brought + a.wallet.earned;
    R.craft(a, out);
    assert.deepEqual(a.items, [out]);
    assert.equal(a.wallet.brought + a.wallet.earned, before - fee);
    let earned = a.wallet.earned;
    R.dismantle(a, 0);
    assert.deepEqual(a.items, [l]);
    assert.equal(
      a.wallet.earned - earned,
      (ITEMS[out - 1].price - ITEMS[l - 1].price) * 0.5,
    );
  }
});
test("SHOP-04: mismatch uses 4% per item, cap 8%, removal restores stats", () => {
  let a = actor({ items: [1] });
  assert.equal(R.backlash(0, a.items), 0.04);
  assert.equal(R.stats(a).power, 105 * 0.96);
  a.items = [1, 2, 3];
  assert.equal(R.backlash(0, a.items), 0.08);
  a.items = [];
  assert.equal(R.stats(a).power, 105);
});
test("STATUS-01: rolling five-second hard CC has 30/60% DR and 2.5 sec ceiling", () => {
  const a = {};
  assert.equal(R.hardCC(a, 1, 0), 1);
  assert.equal(R.hardCC(a, 1, 1), 0.7);
  assert.equal(R.hardCC(a, 1, 2), 0.4);
  assert.ok(Math.abs(R.hardCC(a, 1, 3) - 0.4) < 1e-8);
  assert.equal(a.immuneCC, 4.5);
  assert.equal(R.hardCC(a, 1, 3.5), 0);
  assert.equal(R.hardCC(a, 1, 9), 1);
});
test("combat mitigation applies multiplicative extraction protection and shield before HP", () => {
  assert.ok(Math.abs(R.gateReduction(false) - 0.072) < 1e-9);
  assert.ok(Math.abs(R.gateReduction(true) - 0.2112) < 1e-9);
  let d = R.resolveDamage(200, 100, 0, R.gateReduction(true), 50);
  assert.ok(Math.abs(d.hpDamage - 28.88) < 1e-9);
  assert.equal(d.shield, 0);
});
test("EX-01: 5/10/15 min and final wave boundaries", () => {
  assert.deepEqual(
    [299, 300, 419.9, 420, 600, 900, 1199, 1200, 1319, 1320].map(R.gateWave),
    [0, 1, 1, 0, 2, 3, 0, 4, 4, 0],
  );
});
test("EX-02/04: all W 0–48 and four tiers satisfy formula, rounding, hard 15s floor", () => {
  for (let w = 0; w <= 48; w++) {
    assert.equal(R.extractionTime(w), 20 + 2 * Math.ceil(w / 4));
    for (let t = 1; t <= 4; t++) {
      let v = R.extractionTime(w, t);
      assert.ok(v >= 15);
      assert.equal(
        v,
        Math.max(
          15,
          +(
            (20 + 2 * Math.ceil(w / 4)) *
            (1 - [0.4, 0.45, 0.5, 0.55][t - 1])
          ).toFixed(1),
        ),
      );
    }
  }
  assert.equal(R.extractionTime(48, 4), 19.8);
  assert.throws(() => R.extractionTime(49));
});
test("24 slots, 48W and materials stack maximum five", () => {
  let a = actor();
  for (let i = 0; i < 5; i++) assert.ok(R.addLoot(a, R.loot("material")));
  assert.equal(a.bag.length, 1);
  assert.equal(a.bag[0].count, 5);
  R.addLoot(a, R.loot("material"));
  assert.equal(a.bag.length, 2);
  a.bag = Array.from({ length: 12 }, () => R.loot("bone"));
  assert.equal(R.weight(a.bag), 48);
  assert.equal(R.addLoot(a, R.loot("material")), false);
  a.bag = Array.from({ length: 24 }, () => R.loot("fragment"));
  assert.equal(R.addLoot(a, R.loot("ring")), false);
});
test("SUP-02: counter siphon only earned; 150 cap and expiry", () => {
  let wallet = { brought: 300, earned: 1000 },
    flow = { end: 120, total: 0 };
  assert.equal(R.siphonCounter(wallet, flow, 500, 0), 75);
  assert.equal(R.siphonCounter(wallet, flow, 1000, 1), 75);
  assert.equal(R.siphonCounter(wallet, flow, 1000, 2), 0);
  assert.equal(wallet.brought, 300);
  assert.equal(R.siphonCounter(wallet, { end: 0, total: 0 }, 500, 1), 0);
});
test("SUP-03: independent insurance keeps brought gear only, no duplication into corpse", () => {
  const g = [
    R.loot("ring", 1, true),
    R.loot("bone", 1, true),
    R.loot("bone", 2, false),
  ];
  let a = actor({
    gear: g,
    supports: [{ id: 1, tier: 3 }],
    bag: [R.loot("ring", 2)],
  });
  let n = 0;
  const res = R.deathSettlement(a, () => [0.2, 0.8][n++]);
  assert.equal(res.saved.length, 1);
  assert.equal(res.dropped.length, 3);
  assert.equal(res.refund, 150);
  assert.ok(!res.dropped.some((i) => i.uid === res.saved[0].uid));
});
test("Boi appraisal reduces bonus, preserves base above 1500", () => {
  assert.equal(R.appraise(1000, 1), 1200);
  assert.equal(R.appraise(2000, 1), 2350);
});
test("Ranked VIP equals basic stats for every hero", () => {
  for (let hero = 0; hero < 12; hero++)
    assert.deepEqual(
      R.stats(actor({ hero, skin: 2, ranked: true })),
      R.stats(actor({ hero, skin: 1, ranked: true })),
    );
});
test("SKILL-01: mana and cooldown enforced, F i-frame and displacement", () => {
  let m = new Match(load(), R.newProfile()),
    a = m.player;
  assert.ok(m.cast(a, 0, { x: 1, z: 0 }));
  assert.equal(a.mp, 88);
  assert.equal(m.cast(a, 0), false);
  a.mp = 0;
  assert.equal(m.cast(a, 1), false);
  const x = a.x;
  assert.ok(m.cast(a, 4));
  assert.equal(a.x, x + 2.8);
  assert.equal(a.immuneUntil, 0.25);
});
test("EX-03: send commits once, clears exact instances, stays alive, earned only", () => {
  let profile = R.newProfile(),
    m = new Match(load({ supports: [{ id: 17, tier: 1 }] }), profile),
    a = m.player;
  m.openDebugGates();
  m.teleport("gate");
  a.bag = [R.loot("ring", 1)];
  a.wallet.earned = 123;
  const id = a.bag[0].uid;
  m.beginExtraction("send", [id]);
  m.completeExtraction(a);
  m.completeExtraction(a);
  assert.equal(profile.stash.filter((i) => i.uid === id).length, 1);
  assert.equal(a.bag.length, 0);
  assert.equal(a.wallet.earned, 0);
  assert.equal(a.wallet.brought, 300);
  assert.equal(a.supports[0].used, 1);
  assert.ok(a.alive);
  assert.equal(profile.tb, 5123);
});
test("cancel extraction returns gear escrow and ring slot", () => {
  let m = new Match(
      load({ rings: [1, 3], supports: [{ id: 17, tier: 1 }] }),
      R.newProfile(),
    ),
    a = m.player;
  m.openDebugGates();
  m.teleport("gate");
  let item = a.gear[0];
  m.beginExtraction("send", [item.uid]);
  assert.equal(a.rings[0], 0);
  m.cancelExtraction();
  assert.equal(a.rings[0], 1);
  assert.equal(a.gear.filter((i) => i.uid === item.uid).length, 1);
});
test("overtime grace, damage does not cancel, departure cancels after 0.8s", () => {
  let m = new Match(load(), R.newProfile()),
    a = m.player;
  m.actors = m.actors.filter((t) => t.team === 0);
  m.openDebugGates();
  m.teleport("gate");
  m.beginExtraction();
  m.gates[0].end = 0.1;
  m.fixed(0.2, { x: 0, z: 0 });
  assert.ok(a.channel);
  let c = a.channel;
  assert.ok(c.elapsed > 0);
  a.x += 10;
  m.fixed(0.79, { x: 0, z: 0 });
  assert.ok(a.channel);
  m.fixed(0.02, { x: 0, z: 0 });
  assert.equal(a.channel, null);
});
test("simulation runs 100 participants + wildlife at 30Hz without invalid numbers", () => {
  const m = new Match(load(), R.newProfile());
  for (let i = 0; i < 300; i++) m.fixed(1 / 30, { x: 0, z: 0, attack: false });
  assert.equal(m.actors.filter((a) => a.kind === "hero").length, 100);
  for (const a of m.actors) {
    assert.ok(Number.isFinite(a.x + a.z + a.hp));
  }
  assert.equal(
    new Match(load({ mode: "squad3" }), R.newProfile()).actors.filter(
      (a) => a.kind === "hero",
    ).length,
    96,
  );
});
test("branch is immutable after entering a match", () => {
  const m = new Match(load(), R.newProfile());
  assert.throws(() => {
    m.player.branch = 2;
  });
  assert.equal(m.player.branch, 0);
});
test("death during send escrow preserves every gear instance once", () => {
  const m = new Match(
    load({ rings: [1, 3], supports: [{ id: 17, tier: 1 }] }),
    R.newProfile(),
  );
  const a = m.player;
  m.openDebugGates();
  m.teleport("gate");
  const before = a.gear.map((i) => i.uid);
  m.beginExtraction("send", [before[0]]);
  m.kill(a, { kind: "beast", team: -1 });
  const corpse = m.drops.find((d) => d.items.some((i) => i.uid === before[0]));
  assert.ok(corpse);
  assert.equal(corpse.items.filter((i) => before.includes(i.uid)).length, 2);
  const refund = m.profile.tb;
  m.kill(a, { kind: "beast", team: -1 });
  assert.equal(m.profile.tb, refund);
});
test("5-second damage zone ticks exactly five times, not six", () => {
  const m = new Match(load({ hero: 3 }), R.newProfile()),
    a = m.player;
  m.actors = [a];
  a.immuneUntil = 0;
  const t = m.spawnBeast(0, 10, 10);
  t.hp = t.maxHp = 100000;
  let hits = 0;
  m.skillHit = () => hits++;
  m.zone(
    a,
    { x: 10, z: 10 },
    { shape: "zone", radius: 3, duration: 5, base: 1, scale: 0 },
    3,
  );
  m.ai = () => {};
  const opponent = m.createHero(1, 1, 85, 85);
  for (let i = 0; i < 153; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(hits, 5);
});
test("projectile Q travels, collides once and resolves exact mitigation", () => {
  const m = new Match(load(), R.newProfile()),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const t = m.spawnBeast(0, 13, 8);
  t.hp = t.maxHp = 1000;
  assert.ok(m.cast(a, 0, { x: 1, z: 0 }));
  assert.equal(t.hp, 1000);
  for (let i = 0; i < 15; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  const expected = ((110 + 0.65 * 105) * 0.92 * 100) / 120;
  assert.ok(Math.abs(t.hp - (1000 - expected)) < 1e-7);
  assert.equal(m.projectiles[0]?.hit.size ?? 1, 1);
});
test("Ly Sa R delivers five scheduled hits and only initial 0.6s untargetability", () => {
  const m = new Match(load({ hero: 2 }), R.newProfile()),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const victim = m.spawnBeast(0, 12, 8);
  victim.hp = victim.maxHp = 10000;
  let hits = 0;
  const original = m.damage.bind(m);
  m.damage = (source, target, raw, type, k, ...rest) => {
    if (source === a && k === 3) hits++;
    return original(source, target, raw, type, k, ...rest);
  };
  a.immuneUntil = 0;
  assert.ok(m.cast(a, 3));
  const untargetable = a.untargetableUntil;
  for (let i = 0; i < 38; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(hits, 5);
  assert.equal(untargetable, 0.6);
  assert.equal(a.untargetableUntil, 0.6);
  assert.equal(a.immuneUntil, 0);
});
test("HR-09 frost field interrupts hostile dash with hard CC", () => {
  const m = new Match(load(), R.newProfile()),
    a = m.player;
  const enemy = m.createHero(7, 2, 20, 8, { rings: [9], branch: 0 });
  m.zone(
    enemy,
    { x: 12, z: 8 },
    { shape: "zone", radius: 3, duration: 4, base: 0, scale: 0 },
    1,
  );
  assert.equal(m.dash(a, 2.8, { x: 1, z: 0 }), false);
  assert.equal(a.x, 8);
  assert.equal(a.ccUntil, 0.4);
});
