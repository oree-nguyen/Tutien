import test from "node:test";
import assert from "node:assert/strict";
import { stats, skillFor, newProfile } from "../src/rules.js";
import { Match } from "../src/simulation.js";
const actor = (hero, branch) => ({
  hero,
  branch,
  level: 1,
  items: [],
  rings: [],
  bones: [],
  buffs: [],
  hp: 1000,
  now: 0,
  stacks: 0,
});
const expected = [
  [0, 0, 0, "base", 101.2],
  [0, 1, 1, "slow", 0.45],
  [0, 2, 3, "cd", 100],
  [1, 0, 0, "base", 135],
  [1, 1, 3, "radius", 5],
  [1, 2, 0, "base", 121.5],
  [2, 0, -1, "hp", 770.8],
  [2, 1, 0, "range", 5.5],
  [2, 2, -1, "atk", 103.04],
  [3, 0, 0, "base", 150],
  [3, 1, 3, "base", 54],
  [3, 2, 3, "radius", 5.5],
  [4, 0, 1, "base", 187.5],
  [4, 1, 2, "cd", 17],
  [4, 2, 3, "duration", 3.8],
  [5, 0, 0, "base", 89.25],
  [5, 1, 2, "radius", 4],
  [5, 2, 0, "cd", 9],
  [6, 0, 3, "radius", 3.6],
  [6, 1, 0, "base", 114.4],
  [6, 2, 2, "dash", 4.5],
  [7, 0, 3, "cc", 1.35],
  [7, 1, 3, "cc", 0],
  [7, 2, 3, "base", 164],
  [8, 0, 0, "range", 13],
  [8, 1, 1, "duration", 6.5],
  [8, 2, 0, "base", 116.25],
  [9, 0, 3, "duration", 7],
  [9, 1, 1, "base", 126],
  [9, 2, 3, "duration", 5.5],
  [10, 0, 1, "base", 152.5],
  [10, 1, 0, "base", 131.25],
  [10, 2, 3, "base", 32],
  [11, 0, 1, "cc", 0.65],
  [11, 1, 2, "cd", 15],
  [11, 2, 1, "cc", 1.35],
];
for (const [h, b, k, field, value] of expected)
  test(`C3 H${String(h + 1).padStart(2, "0")} branch${b + 1} ${field}=${value}`, () => {
    const actual =
      k < 0 ? stats(actor(h, b))[field] : skillFor(actor(h, b), k)[field];
    assert.ok(Math.abs(actual - value) < 1e-8, `${actual} !== ${value}`);
  });
const load = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 0,
  skin: 0,
  mode: "duo",
};
function scene(caster, ally) {
  const m = new Match({ ...load, hero: caster }, newProfile());
  m.actors = [m.player];
  const a = m.player;
  a.x = a.z = 0;
  const f = m.createHero(ally, 0, 90, 90);
  f.x = f.z = 0;
  const t = m.spawnBeast(0, 1, 0);
  t.hp = t.maxHp = 10000;
  return { m, a, f, t };
}
test("X10 Wood-Lightning requires allied vine and applies95 to entire zone once per12s", () => {
  const { m, a, f, t } = scene(3, 0);
  m.zone(
    f,
    { x: 0, z: 0 },
    { shape: "zone", radius: 3, duration: 4, base: 0, scale: 0 },
    2,
  );
  let n = 0;
  m.damage = (_, target, raw) => {
    if (raw === 95) n++;
  };
  m.resonance(a, t, 0, t);
  m.resonance(a, t, 0, t);
  assert.equal(n, 1);
  assert.ok(t.ccUntil > m.time);
});
test("X10 Earth-Wood rejects unrelated root and accepts allied Lâm Dật source", () => {
  const { m, a, f, t } = scene(1, 0);
  let n = 0;
  m.damage = (_, target, raw) => {
    if (raw === 110) n++;
  };
  t.controlSource = { hero: 7, team: 0, end: 2 };
  m.resonance(a, t, 2, t);
  assert.equal(n, 0);
  t.controlSource = { hero: 0, team: 0, end: 2 };
  m.resonance(a, t, 2, t);
  assert.equal(n, 1);
});
test("X10 Assassin-Reveal requires a Tịch Dao reveal from same team", () => {
  const { m, a, f, t } = scene(2, 4);
  m.reveal({ ...f, team: 3 }, t, 3);
  m.resonance(a, t, 0, t);
  assert.equal(a.ignoreArmorUntil, undefined);
  m.reveal(f, t, 3);
  m.resonance(a, t, 0, t);
  assert.ok(a.ignoreArmorUntil > 0);
});
test("X10 Shield-Lightning electrifies allied shield occupants", () => {
  const { m, a, f, t } = scene(3, 5);
  m.zone(
    f,
    { x: 0, z: 0 },
    { shape: "protect", radius: 4, duration: 6, base: 0, scale: 0 },
    3,
  );
  m.resonance(a, t, 1, t);
  assert.ok(a.buffs.some((b) => b.type === "electric"));
});
test("X10 Fire-Frost overlap deals130 true and reduces vision2.5s", () => {
  const { m, a, f, t } = scene(6, 7);
  m.zone(
    f,
    { x: 0, z: 0 },
    { shape: "zone", radius: 3, duration: 4, base: 0, scale: 0 },
    1,
  );
  let recorded;
  m.damage = (_, target, raw, type) => {
    recorded = { raw, type };
  };
  m.resonance(a, t, 1, t);
  assert.deepEqual(recorded, { raw: 130, type: "true" });
  assert.equal(t.visionReducedUntil, 2.5);
});
test("HR02 combines80% immediate and35% base burn for115% total, without multiplying bonus twice", () => {
  const m = new Match(
      { ...load, mode: "solo", branch: 2, rings: [2, 0] },
      newProfile(),
    ),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const t = m.spawnBeast(0, a.x + 3, a.z);
  t.hp = t.maxHp = 10000;
  const rival = m.createHero(1, 99, 80, 80);
  m.cast(a, 0, { x: 1, z: 0 });
  for (let i = 0; i < 125; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  const total = ((110 + 0.65 * 105) * 1.15 * 100) / 120;
  assert.ok(Math.abs(10000 - t.hp - total) < 1e-6);
});
test("HR06 W consumes extra6mana and creates a55-damage delayed field", () => {
  const m = new Match(
      { ...load, hero: 3, mode: "solo", rings: [6, 0] },
      newProfile(),
    ),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const t = m.spawnBeast(0, a.x + 2, a.z);
  t.hp = t.maxHp = 10000;
  m.createHero(1, 99, 80, 80);
  let pops = 0;
  const original = m.damage.bind(m);
  m.damage = (s, v, raw, ...rest) => {
    if (s === a && raw === 55) pops++;
    return original(s, v, raw, ...rest);
  };
  const mana = a.mp;
  m.cast(a, 1, { x: 1, z: 0 });
  assert.equal(mana - a.mp, 28);
  for (let i = 0; i < 12; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(pops, 0);
  for (let i = 0; i < 8; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(pops, 1);
});
test("HR12 E echo deals80 after one second, not on the first frame", () => {
  const m = new Match(
      { ...load, hero: 11, mode: "solo", rings: [0, 12] },
      newProfile(),
    ),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const t = m.spawnBeast(0, a.x, a.z);
  t.hp = t.maxHp = 10000;
  m.createHero(1, 99, 80, 80);
  let hits = 0;
  const original = m.damage.bind(m);
  m.damage = (s, v, raw, ...rest) => {
    if (s === a && raw === 80) hits++;
    return original(s, v, raw, ...rest);
  };
  m.cast(a, 2, { x: 1, z: 0 });
  for (let i = 0; i < 27; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(hits, 0);
  for (let i = 0; i < 7; i++) m.fixed(1 / 30, { x: 0, z: 0 });
  assert.equal(hits, 1);
});
test("Ly Sa passive stacks on dash rather than normal attacks", () => {
  const m = new Match({ ...load, hero: 2, mode: "solo" }, newProfile()),
    a = m.player;
  m.actors = [a];
  m.ai = () => {};
  const t = m.spawnBeast(0, a.x + 1, a.z);
  t.hp = 10000;
  m.attack(a);
  assert.equal(a.stacks, 0);
  m.cast(a, 4);
  assert.equal(a.stacks, 1);
});
test("Đỗ Kình armor passive does not gain extra stacks merely by attacking", () => {
  const m = new Match({ ...load, hero: 5, mode: "solo" }, newProfile()),
    a = m.player;
  m.actors = [a];
  m.spawnBeast(0, a.x + 1, a.z);
  m.attack(a);
  assert.equal(a.stacks, 0);
});
test("clone receives150% incoming damage while preserving source defenses", () => {
  const m = new Match({ ...load, hero: 2, mode: "solo" }, newProfile()),
    a = m.player;
  m.actors = [a];
  m.cast(a, 1);
  const c = m.actors.find((t) => t.kind === "clone"),
    enemy = m.spawnBeast(0, c.x + 1, c.z);
  assert.equal(c.maxHp, m.getStats(a).hp);
  const before = c.hp;
  m.damage(enemy, c, 100, "physical");
  assert.ok(
    Math.abs(before - c.hp - (150 * 100) / (100 + m.getStats(a).armor)) < 1e-7,
  );
});

function isolated(hero = 0, branch = 0, extra = {}) {
  const m = new Match(
    { ...load, mode: "solo", hero, branch, ...extra },
    newProfile(),
  );
  const a = m.player;
  m.actors = [a];
  m.zones = [];
  m.obstacles = [];
  m.bushes = [];
  a.x = a.z = 0;
  a.immuneUntil = 0;
  a.now = m.time = 10;
  m.ai = () => {};
  return { m, a };
}
function enemy(m, x = 2, z = 0) {
  const t = m.createHero(1, 99, x, z);
  t.x = x;
  t.z = z;
  t.immuneUntil = 0;
  t.hp = 10000;
  return t;
}
test("Ly Sa dodge grants another Phong Tích stack once per F immunity window", () => {
  const { m, a } = isolated(2);
  const t = enemy(m);
  m.cast(a, 4);
  assert.equal(a.stacks, 1);
  m.damage(t, a, 100);
  assert.equal(a.stacks, 2);
  m.damage(t, a, 100);
  assert.equal(a.stacks, 2);
});
test("Ly Sa R cannot be selected for0.6s but still receives area damage", () => {
  const { m, a } = isolated(2);
  const t = enemy(m);
  assert.ok(m.cast(a, 3));
  assert.equal(m.nearest(t, 10), null);
  const before = a.hp;
  m.skillHit(t, 0, { shape: "circle", radius: 4, base: 100, scale: 0 }, a, {
    x: 1,
    z: 0,
  });
  assert.ok(a.hp < before);
  m.time += 0.61;
  assert.equal(m.nearest(t, 10), a);
});
test("area skill hits hidden enemies while normal attack cannot select them", () => {
  const { m, a } = isolated(1);
  const t = enemy(m, 5);
  t.stealthUntil = 20;
  assert.equal(m.nearest(a, 10), null);
  const before = t.hp;
  m.skillHit(a, 3, { shape: "circle", radius: 3, base: 100, scale: 0 }, t, {
    x: 1,
    z: 0,
  });
  assert.ok(t.hp < before);
});
test("Ly Sa E erases old footprints and creates none while disguised", () => {
  const { m, a } = isolated(2);
  a.footprints = [{ x: 0, z: 0, end: 30 }];
  m.cast(a, 2);
  assert.deepEqual(a.footprints, []);
  m.tick = 30;
  m.advanceWorld(1 / 30);
  assert.deepEqual(a.footprints, []);
});
test("Vân Chước Liên Hỏa applies exactly one2.5% burn to each victim", () => {
  const { m, a } = isolated(6, 1);
  const t = enemy(m, 1),
    v = enemy(m, 2);
  m.passive(a, t, 0);
  m.passive(a, t, 1);
  m.passive(a, t, 2);
  assert.equal(t.dots.length, 1);
  assert.equal(v.dots.length, 1);
  assert.equal(t.dots[0].kind, "burn");
  assert.ok(Math.abs(t.dots[0].raw * 3 - m.getStats(t).hp * 0.025) < 1e-8);
});
test("Hỏa Ảnh0.8s avoids target selection without granting area immunity", () => {
  const { m, a } = isolated(6, 2);
  const t = enemy(m);
  m.cast(a, 2, { x: 1, z: 0 });
  assert.equal(m.nearest(t, 20), null);
  const before = a.hp;
  m.damage(t, a, 100);
  assert.ok(a.hp < before);
});
test("dash collision covers the complete segment, not only its endpoint", () => {
  const { m, a } = isolated();
  m.obstacles = [{ x: 2, z: 0, r: 0.5 }];
  assert.equal(m.dash(a, 4, { x: 1, z: 0 }), false);
  assert.equal(a.x, 0);
  assert.equal(m.dash(a, 4, { x: 0, z: 1 }), true);
});
test("HR09 interrupts a dash crossing completely through its field", () => {
  const { m, a } = isolated();
  const t = enemy(m, 2);
  t.rings = [9, 0];
  m.zones = [
    { owner: t, k: 1, end: 20, point: { x: 2, z: 0 }, sk: { radius: 0.5 } },
  ];
  assert.equal(m.dash(a, 4, { x: 1, z: 0 }), false);
  assert.ok(Math.abs(a.ccUntil - 10.4) < 1e-8);
});
test("ordinary dashes cannot enter Bí Cảnh without its portal", () => {
  const { m, a } = isolated();
  a.x = 62;
  assert.equal(m.dash(a, 4, { x: 1, z: 0 }), false);
  assert.equal(a.realm ?? 0, 0);
});
test("all Lâm Dật R branches stop dash, only Mộc Phược stops walking", () => {
  for (const branch of [0, 1, 2]) {
    const { m, a } = isolated(0, branch);
    const t = enemy(m, 2);
    a.x = 0;
    m.zones = [
      {
        owner: a,
        wall: true,
        end: 20,
        point: { x: 0, z: 0 },
        sk: { radius: 3 },
      },
    ];
    assert.equal(m.dash(t, 4, { x: 1, z: 0 }), false);
    m.move(t, 1, 0, 0.5);
    assert.equal(t.x > 3, branch !== 0);
  }
});
test("HR04 bonus damage to a shield never spills into HP", () => {
  const { m, a } = isolated(1, 2, { rings: [4, 0] });
  const t = enemy(m);
  m.shield(t, 200, 3);
  m.skillHit(a, 0, { shape: "circle", radius: 3, base: 100, scale: 0 }, t, {
    x: 1,
    z: 0,
  });
  const baseDamage = 10000 - t.hp;
  assert.equal(baseDamage, 0);
  assert.ok(t.shield < 200);
  t.shieldLayers = [];
  t.shield = 0;
  m.shield(t, 1, 3);
  const hp = t.hp;
  m.damage(a, t, 100, "physical", -1, { shieldOnly: true });
  assert.equal(t.hp, hp);
  assert.equal(t.shield, 0);
});
test("Kim Thể W cleanses slows and grants28armor", () => {
  const { m, a } = isolated(9, 1);
  m.slow(a, 0.5, 3);
  const armor = m.getStats(a).armor;
  m.cast(a, 1);
  assert.equal(a.slowUntil, 0);
  assert.equal(m.getStats(a).armor - armor, 28);
});
test("Liên Tiễn Q prepares the next two doubled attacks; R does not create Tinh Nhãn marks", () => {
  const { m, a } = isolated(8, 2);
  const t = enemy(m);
  m.skillHit(a, 0, { shape: "circle", radius: 3, base: 100, scale: 0 }, t, {
    x: 1,
    z: 0,
  });
  assert.equal(a.doubleShots, 2);
  const b = isolated(8, 1),
    v = enemy(b.m);
  b.m.skillHit(b.a, 3, { shape: "circle", radius: 3, base: 100, scale: 0 }, v, {
    x: 1,
    z: 0,
  });
  assert.equal(v.moonMarks?.[b.a.id], undefined);
});

test("independent shield layers expire individually rather than extending one another", () => {
  const { m, a } = isolated();
  m.shield(a, 100, 2);
  m.shield(a, 50, 5);
  assert.equal(a.shield, 150);
  m.time = a.now = 12.1;
  m.expireShields(a);
  assert.equal(a.shield, 50);
  m.time = a.now = 15;
  m.expireShields(a);
  assert.equal(a.shield, 0);
});
test("HR07 W placed on an ally blinds nearby enemies when that shield breaks", () => {
  const { m, a } = isolated(4, 2, { rings: [7, 0] });
  const f = m.createHero(0, 0, 0, 0);
  f.x = f.z = 0;
  f.hp = 1;
  f.immuneUntil = 0;
  const t = enemy(m, 2),
    far = enemy(m, 5);
  m.cast(a, 1);
  assert.ok(f.shield > 0);
  m.damage(t, f, 1000, "true");
  assert.equal(t.blindUntil, 10.6);
  assert.equal(far.blindUntil ?? 0, 0);
});
test("HR07 does not trigger on shield expiry or a different source's shield", () => {
  const { m, a } = isolated(4, 0, { rings: [7, 0] });
  const t = enemy(m);
  m.shield(a, 100, 3);
  m.damage(t, a, 200, "true");
  assert.equal(t.blindUntil ?? 0, 0);
  m.shield(a, 100, 2, a, { blindOnBreak: true });
  m.time = 12;
  m.expireShields(a);
  assert.equal(t.blindUntil ?? 0, 0);
});
test("HB02 emergency shield has a45s cooldown and expires after3s", () => {
  const { m, a } = isolated(0, 0, { bones: [2] });
  const t = enemy(m);
  a.hp = m.getStats(a).hp * 0.3 + 1;
  m.damage(t, a, 2, "true");
  assert.equal(a.shield, 180);
  assert.equal(a.boneShieldCd, 55);
  m.time = a.now = 13.01;
  m.expireShields(a);
  assert.equal(a.shield, 0);
  m.damage(t, a, 2, "true");
  assert.equal(a.shield, 0);
});
test("HB03 empowered basic attack adds40 exactly once per4s", () => {
  const { m, a } = isolated(2, 1, { bones: [3] });
  const t = enemy(m, 1);
  m.cast(a, 1);
  const hp = t.hp;
  m.attack(a);
  const damage = ((m.getStats(a).atk + 40) * 100) / (100 + m.getStats(t).armor);
  assert.ok(Math.abs(hp - t.hp - damage) < 1e-8);
  a.cooldowns[5] = 0;
  a.empoweredUntil = 20;
  const hp2 = t.hp;
  m.attack(a);
  assert.ok(
    Math.abs(
      hp2 - t.hp - (m.getStats(a).atk * 100) / (100 + m.getStats(t).armor),
    ) < 1e-8,
  );
});
test("HB04 Q on hero returns5mana and0.5s W cooldown, only once per5s", () => {
  const { m, a } = isolated(3, 1, { bones: [4] });
  const t = enemy(m);
  a.mp = 10;
  a.cooldowns[1] = 8;
  const sk = { shape: "circle", radius: 3, base: 1, scale: 0 };
  m.skillHit(a, 0, sk, t, { x: 1, z: 0 });
  assert.equal(a.mp, 15);
  assert.equal(a.cooldowns[1], 7.5);
  m.skillHit(a, 0, sk, t, { x: 1, z: 0 });
  assert.equal(a.mp, 15);
  assert.equal(a.cooldowns[1], 7.5);
});
test("HB05 F dodge gives20%speed for2s rather than for every hit", () => {
  const { m, a } = isolated(0, 0, { bones: [5] });
  const t = enemy(m),
    speed = m.getStats(a).speed;
  m.cast(a, 4);
  m.damage(t, a, 100);
  m.damage(t, a, 100);
  assert.ok(Math.abs(m.getStats(a).speed - speed * 1.2) < 1e-8);
  m.time = a.now = 12.1;
  assert.equal(m.getStats(a).speed, speed);
});
test("HB06 reduces slow strength and knockback distance by25%", () => {
  const { m, a } = isolated(5, 2);
  const t = enemy(m, 1);
  t.bones = [6];
  m.slow(t, 0.4, 2);
  assert.ok(Math.abs(t.slow - 0.3) < 1e-8);
  m.skillHit(a, 0, { shape: "cone", range: 3, base: 1, scale: 0 }, t, {
    x: 1,
    z: 0,
  });
  assert.equal(t.x, 1.75);
});
test("HB07 active life siphon has60s cooldown and respects realm", () => {
  const { m, a } = isolated(0, 0, { bones: [7] });
  const t = enemy(m),
    v = enemy(m);
  v.realm = 1;
  a.hp = 100;
  const hp = t.hp,
    hpOther = v.hp;
  m.activateBone();
  assert.ok(t.hp < hp);
  assert.equal(v.hp, hpOther);
  assert.ok(a.hp > 100);
  assert.throws(() => m.activateBone(), /đang hồi/);
});
