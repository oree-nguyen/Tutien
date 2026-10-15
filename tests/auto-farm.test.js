import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { HEROES, ITEMS, RECIPES, RINGS } from "../src/data.js";
import * as R from "../src/rules.js";
import { canSee, infected, segmentTouchesCircle } from "../src/systems.js";
import {
  AUTO_FARM_COMBOS,
  AUTO_FARM_PRESETS,
  AutoFarmAIController,
  autoFarmUtility,
  autoLootPriority,
  safeAutoBuildPreset,
} from "../src/auto-farm.js";

function fixture(hero = 0) {
  const match = new Match(
    {
      hero,
      branch: 0,
      rings: [0, 0],
      bones: [],
      supports: [],
      brought: 300,
      mode: "solo",
    },
    R.newProfile(),
  );
  match.actors = [match.player];
  match.drops = [];
  match.zones = [];
  match.effects = [];
  match.gates = [];
  match.obstacles = [];
  match.bushes = [];
  match.shopPoints = [];
  match.merchants = [];
  match.player.x = 0;
  match.player.z = 0;
  match.player.immuneUntil = 10000;
  return match;
}

function harness(match, actual = false) {
  const commands = [],
    notices = [];
  let motion = { x: 0, z: 0, attack: false, targetMode: "auto" };
  const actions = {
    move(input) {
      motion = { ...input };
      commands.push(["move", input]);
    },
    cast(index, aim) {
      commands.push(["cast", index, aim]);
      return actual ? match.cast(match.player, index, aim) : true;
    },
    pickupSelected(uid) {
      commands.push(["pickupSelected", uid]);
      return actual ? match.pickupSelected(uid) : true;
    },
    pickup() {
      commands.push(["pickup"]);
      return actual ? match.pickup() : true;
    },
    shop(action, id) {
      commands.push(["shop", action, id]);
      if (actual) match.shop(action, id);
    },
    equipRing(uid, slot) {
      commands.push(["equipRing", uid, slot]);
      if (actual) match.equipRing(uid, slot);
    },
    extract(mode, selected) {
      commands.push(["extract", mode, selected]);
      if (actual) match.beginExtraction(mode, selected);
    },
    portal() {
      commands.push(["portal"]);
      if (actual) match.usePortal();
    },
  };
  const ai = new AutoFarmAIController({
    getMatch: () => match,
    actions,
    notify: (text) => notices.push(text),
  });
  return {
    ai,
    actions,
    commands,
    notices,
    motion: () => motion,
    advance(seconds, simulate = false) {
      const frames = Math.ceil(seconds / 0.05);
      for (let i = 0; i < frames; i++) {
        ai.update(0.05);
        if (simulate) match.step(0.05, motion);
      }
    },
  };
}

test("Auto Farm stays completely idle when off and validates editable settings", () => {
  const h = harness(fixture());
  h.ai.update(0.1);
  assert.deepEqual(h.commands, []);
  assert.throws(() => h.ai.setMode("teleport"), /không hợp lệ/);
  assert.throws(() => h.ai.setConfig({ useSkills: "yes" }), /bật\/tắt/);
  h.ai.setConfig({ useSkills: false, invented: true });
  assert.equal(h.ai.status().config.useSkills, false);
  assert.equal(Object.hasOwn(h.ai.status().config, "invented"), false);
});

test("two independent manual pointers suspend every AI command until 1.2s after the last release", () => {
  const h = harness(fixture());
  h.ai.setMode("full");
  h.commands.length = 0;
  h.ai.manualStart(11);
  h.ai.manualStart(19);
  h.advance(2);
  h.ai.manualEnd(11);
  h.advance(2);
  assert.deepEqual(h.commands, []);
  assert.equal(h.ai.status().manualPaused, true);
  h.ai.manualEnd(19);
  h.advance(1.1);
  assert.deepEqual(h.commands, []);
  h.advance(0.15);
  assert.ok(h.commands.some(([kind]) => kind === "move"));
  assert.equal(h.ai.status().manualPaused, false);
});

test("manual override uses an injected monotonic clock independently of slow simulation frames", () => {
  const h = harness(fixture());
  let wall = 100;
  h.ai.manualNow = () => wall;
  h.ai.setMode("pve");
  h.ai.manualStart(11);
  h.ai.manualEnd(11);
  h.commands.length = 0;
  h.advance(5);
  assert.equal(h.ai.status().manualPaused, true);
  assert.deepEqual(h.commands, []);
  wall += 1.199;
  h.ai.update(0.01);
  assert.equal(h.ai.status().manualPaused, true);
  wall += 0.002;
  h.ai.update(0.01);
  assert.equal(h.ai.status().manualPaused, false);
  assert.ok(h.commands.length > 0);
});

test("new-match reset clears contacts from the removed HUD without discarding Auto settings", () => {
  const h = harness(fixture());
  h.ai.setConfig({ kiting: false });
  h.ai.setMode("full");
  h.ai.manualStart("attack-old-hud");
  h.ai.manualStart("modal");
  h.ai.commandUntil.set("shop", 999);
  h.ai.reset();
  assert.equal(h.ai.status().mode, "off");
  assert.equal(h.ai.pointers.size, 0);
  assert.equal(h.ai.status().resumeIn, 0);
  assert.equal(h.ai.status().config.kiting, false);
  assert.equal(h.ai.commandUntil.size, 0);
  h.commands.length = 0;
  h.ai.setMode("pve");
  h.ai.update(0.05);
  assert.equal(h.ai.status().manualPaused, false);
  assert.ok(h.commands.length > 0);
});

test("a moving farm loop waits at the shop between legal transactions until its seven-item build is complete", () => {
  const m = fixture(),
    h = harness(m, true),
    a = m.player;
  m.shopPoints = [{ x: 0, z: 0 }];
  m.createHero(1, 99, 90, 90, {
    hero: 1,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
  });
  m.ai = () => {};
  a.wallet.earned = 5000;
  h.ai.setMode("pve");
  h.advance(2, true);
  assert.ok(a.items.length > 0 && a.items.length < 7);
  assert.ok(
    Math.hypot(a.x, a.z) < 0.01,
    "trade throttling must not send the actor patrolling away",
  );
  h.advance(20, true);
  assert.deepEqual(
    [...a.items].sort((x, y) => x - y),
    [...safeAutoBuildPreset(a.hero)].sort((x, y) => x - y),
  );
  assert.equal(a.items.length, 7);
});

test("utility scores implement wounded normal / elite / mutant / Boss gates at exact thresholds", () => {
  const m = fixture(),
    a = m.player,
    s = m.getStats(a);
  const normal = { kind: "beast", x: 10, z: 0, hp: 100, maxHp: 200, tier: 0 };
  assert.equal(autoFarmUtility(a, normal, s, "pve"), 415);
  const elite = { ...normal, tier: 1 };
  assert.equal(autoFarmUtility(a, elite, s, "pve"), 520);
  assert.equal(
    autoFarmUtility(a, { ...elite, x: 35.01 }, s, "full"),
    -Infinity,
  );
  a.hp = s.hp * 0.5;
  assert.equal(autoFarmUtility(a, elite, s, "pve"), -Infinity);
  a.hp = s.hp;
  const boss = { ...normal, kind: "boss" };
  assert.equal(autoFarmUtility(a, boss, s, "full"), -Infinity);
  a.level = 5;
  assert.equal(autoFarmUtility(a, boss, s, "pve"), -Infinity);
  assert.equal(autoFarmUtility(a, boss, s, "full"), 470);
  a.hp = s.hp * 0.65;
  assert.equal(autoFarmUtility(a, boss, s, "full"), -Infinity);
});

test("live target selection chooses near loot then wounded beasts without reconstructing unseen actors", () => {
  const m = fixture(),
    elite = m.spawnBeast(1, 9, 0),
    normal = m.spawnBeast(0, 5, 0);
  elite.mutant = false;
  elite.ai = normal.ai = false;
  const hidden = m.spawnBeast(1, 4, 4);
  hidden.stealthUntil = 100;
  const remoteRealm = m.spawnBeast(1, 2, 0);
  remoteRealm.realm = 1;
  const item = R.loot("bone", 1),
    chest = m.makeDrop(10, 0, [item]);
  const h = harness(m);
  h.ai.setConfig({ autoBuild: false });
  h.ai.setMode("pve");
  h.ai.update(0.1);
  assert.equal(h.ai.status().targetId, chest.id);
  chest.team = 3;
  chest.unlock = 100;
  h.advance(0.3);
  assert.equal(h.ai.status().targetId, elite.id);
  assert.equal(canSee(m, m.player, hidden), false);
  assert.notEqual(h.ai.status().targetId, hidden.id);
  assert.notEqual(h.ai.status().targetId, remoteRealm.id);
  assert.ok(normal.hp > 0);
});

test("PvE always preserves R/F despite ultimate permission and warns for enemy heroes within 18m", () => {
  const m = fixture(),
    beast = m.spawnBeast(1, 4, 0);
  beast.ai = false;
  const enemy = m.createHero(1, 2, 12, 0, {
    rings: [],
    bones: [],
    supports: [],
  });
  enemy.x = 12;
  enemy.z = 0;
  const h = harness(m);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false, allowUltimate: true });
  h.advance(3);
  assert.ok(h.commands.some(([kind]) => kind === "cast"));
  assert.ok(
    h.commands
      .filter(([kind]) => kind === "cast")
      .every(([, index]) => index < 3),
  );
  assert.equal(h.notices.filter((text) => text.includes("18m")).length, 1);
  enemy.x = 5;
  h.advance(0.3);
  assert.equal(h.ai.status().phase, "alert");
  assert.ok(h.motion().x < 0);
});

test("H01 executes E→W→Q against an actual beast without changing GDD costs or dipping below 25% mana", () => {
  const m = fixture(),
    beast = m.spawnBeast(0, 4, 0);
  beast.ai = false;
  beast.hp = beast.maxHp = 20000;
  const h = harness(m, true);
  h.ai.setConfig({ autoBuild: false, autoLoot: false });
  h.ai.setMode("pve");
  h.advance(1.1);
  const cast = h.commands.filter(([kind]) => kind === "cast");
  assert.deepEqual(
    cast.slice(0, 3).map(([, index]) => index),
    [2, 1, 0],
  );
  assert.equal(m.player.mp, 44);
  assert.ok(m.player.mp >= m.getStats(m.player).mp * 0.25);
  assert.equal(m.player.cooldowns[2], R.skillFor(m.player, 2).cd);
  assert.ok(m.zones.some((zone) => zone.k === 2));
  m.step(0.1, { x: 0, z: 0, attack: false });
  assert.ok(beast.hp < beast.maxHp);
  assert.equal(cast[0][2].distance, 4);
  assert.equal(cast[0][2].targetId, beast.id);
});

test("all 12 heroes have explicit distinct role combos and H11 self-heals below 75% through Match.cast", () => {
  assert.equal(AUTO_FARM_COMBOS.length, 12);
  assert.deepEqual(AUTO_FARM_COMBOS[1], [1, 2, 0]);
  assert.deepEqual(AUTO_FARM_COMBOS[9], [2, 1, 0]);
  const m = fixture(10),
    hp = m.getStats(m.player).hp;
  m.player.hp = hp * 0.7;
  const beast = m.spawnBeast(0, 4, 0);
  beast.ai = false;
  const h = harness(m, true);
  h.ai.setConfig({ autoBuild: false, autoLoot: false });
  h.ai.setMode("pve");
  h.ai.update(0.1);
  assert.equal(h.commands.find(([kind]) => kind === "cast")[1], 1);
  assert.ok(m.player.hp > hp * 0.7);
  assert.equal(
    h.commands.find(([kind]) => kind === "cast")[2].targetId,
    m.player.id,
  );
});

test("mana reserve blocks farming casts at the 25% safety boundary while basic attacks remain available", () => {
  const m = fixture(),
    beast = m.spawnBeast(0, 4, 0);
  beast.ai = false;
  m.player.mp = m.getStats(m.player).mp * 0.25 + 11;
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false });
  h.ai.update(0.1);
  assert.equal(
    h.commands.some(([kind]) => kind === "cast"),
    false,
  );
  assert.equal(h.motion().attack, true);
  assert.equal(m.player.mp, 36);
});

test("ranged kiting steps away inside2.6m; Mặc Tinh preserves at least5.8m spacing", () => {
  for (const [hero, distance] of [
    [0, 2],
    [8, 5.4],
  ]) {
    const m = fixture(hero),
      beast = m.spawnBeast(0, distance, 0);
    beast.ai = false;
    const h = harness(m);
    h.ai.setMode("pve");
    h.ai.setConfig({ autoBuild: false, useSkills: false });
    h.ai.update(0.1);
    assert.ok(h.motion().x < -0.5, HEROES[hero].name);
    assert.equal(h.motion().targetMode, "beast");
    assert.equal(h.motion().attack, true);
  }
});

test("precious loot is appraised for0.8s, picked by UUID in bone→weapon→black/purple ring order", () => {
  const m = fixture(),
    bone = R.loot("bone", 1),
    weapon = R.loot("weapon", 3),
    black = R.loot("ring", 6),
    purple = R.loot("ring", 1);
  m.makeDrop(1, 0, [purple, weapon, black, bone], 25);
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false });
  h.ai.update(0.1);
  assert.equal(h.ai.status().phase, "appraise");
  h.advance(0.7);
  assert.equal(m.player.bag.length, 0);
  h.advance(0.4);
  assert.deepEqual(
    m.player.bag.map((i) => i.uid),
    [bone.uid],
  );
  assert.equal(m.player.wallet.earned, 25);
  h.advance(3.6);
  assert.deepEqual(
    m.player.bag.map((i) => i.uid),
    [bone.uid, weapon.uid, black.uid, purple.uid],
  );
  assert.equal(m.player.wallet.earned, 25);
  assert.ok(autoLootPriority(bone) > autoLootPriority(weapon));
  assert.ok(autoLootPriority(black) > autoLootPriority(purple));
});

test("loot excludes priority-locked, other-realm and overweight items without stealing or repeated errors", () => {
  const m = fixture();
  m.player.bag = Array.from({ length: 16 }, () => R.loot("weapon", 1));
  const own = R.loot("bone", 1),
    locked = R.loot("bone", 2),
    other = R.loot("bone", 3);
  m.makeDrop(1, 0, [own]);
  m.makeDrop(0.5, 0, [locked], 50, 9, 12);
  const foreign = m.makeDrop(0.2, 0, [other], 30);
  foreign.realm = 1;
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false, useSkills: false });
  h.advance(2);
  assert.equal(
    h.commands.some(([kind]) => kind === "pickupSelected" || kind === "pickup"),
    false,
  );
  assert.equal(m.player.wallet.earned, 0);
  assert.equal(R.weight(m.player.bag), 48);
  assert.equal(m.drops.length, 3);
});

test("all12 complete exact7-item presets with real recipes, real brought-first spending and zero backlash", async (t) => {
  for (let hero = 0; hero < HEROES.length; hero++)
    await t.test(HEROES[hero].name, () => {
      const m = fixture(hero);
      m.shopPoints = [{ x: 0, z: 0 }];
      m.player.wallet.earned = 5000;
      const h = harness(m, true);
      h.ai.setMode("pve");
      h.ai.setConfig({ autoLoot: false, useSkills: false });
      h.ai.update(0.1);
      assert.equal(
        m.player.wallet.earned,
        5000,
        "initial purchases debit brought balance first",
      );
      for (let i = 0; i < 220; i++) {
        h.ai.update(0.25);
        assert.ok(m.player.items.length <= 7);
        assert.equal(R.backlash(hero, m.player.items), 0);
      }
      assert.deepEqual(
        [...m.player.items].sort((a, b) => a - b),
        [...AUTO_FARM_PRESETS[hero]].sort((a, b) => a - b),
      );
      assert.deepEqual(safeAutoBuildPreset(hero), AUTO_FARM_PRESETS[hero]);
      const crafts = h.commands.filter(
        ([kind, action]) => kind === "shop" && action === "craft",
      );
      for (const id of AUTO_FARM_PRESETS[hero].filter(
        (id) => ITEMS[id - 1].tier === 3,
      ))
        assert.ok(
          crafts.some(([, , crafted]) => crafted === id),
          `${ITEMS[id - 1].name} was genuinely crafted`,
        );
      for (const [kind, action, id] of h.commands)
        if (kind === "shop" && action !== "sell")
          assert.equal(R.mismatch(hero, id), false);
      assert.equal(m.player.wallet.brought, 0);
      assert.ok(m.player.wallet.earned < 5000);
      assert.equal(h.ai.status().lastError, "");
    });
});

test("a full manual inventory is replaced through legal sells then crafted without exceeding7slots", () => {
  const m = fixture(0);
  m.shopPoints = [{ x: 0, z: 0 }];
  m.player.wallet.earned = 5000;
  m.player.items = [1, 2, 3, 4, 5, 5, 5];
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoLoot: false, useSkills: false });
  for (let i = 0; i < 260; i++) {
    h.ai.update(0.25);
    assert.ok(m.player.items.length <= 7);
  }
  assert.deepEqual(
    [...m.player.items].sort((a, b) => a - b),
    [...AUTO_FARM_PRESETS[0]].sort((a, b) => a - b),
  );
  assert.ok(
    h.commands.some(([kind, action]) => kind === "shop" && action === "sell"),
  );
  assert.equal(R.backlash(0, m.player.items), 0);
});

test("a low-budget build never churns temporary recipe materials through repeated60% resale", () => {
  const m = fixture(10);
  m.shopPoints = [{ x: 0, z: 0 }];
  m.player.items = [21, 22, 23, 24, 5, 11];
  m.player.wallet = { brought: 120, earned: 0 };
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoLoot: false, useSkills: false });
  h.advance(12);
  assert.equal(
    h.commands.some(([kind]) => kind === "shop"),
    false,
  );
  assert.equal(m.player.wallet.brought, 120);
  m.player.wallet.earned = 230;
  h.advance(1.2);
  assert.ok(m.player.items.includes(28));
  assert.equal(m.player.items.length, 7);
  assert.equal(
    h.commands.some(([kind, action]) => kind === "shop" && action === "sell"),
    false,
  );
});

test("merchant honors tier3-only discount,2-purchase limit and fixed-shop precedence in overlapping radius", () => {
  const m = fixture(3);
  m.merchants = [{ x: 0, z: 0 }];
  m.player.wallet.earned = 1000;
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoLoot: false, useSkills: false });
  h.advance(2);
  assert.deepEqual(m.player.items, [8]);
  assert.equal(m.player.wallet.brought, 300 - ITEMS[7].price * 0.85);
  assert.equal(m.player.wallet.earned, 1000);
  m.shopPoints = [{ x: 1, z: 0 }];
  h.advance(1.2);
  assert.ok(m.player.items.some((id) => ITEMS[id - 1].tier !== 3));
  assert.equal(m.player.merchantBuys, 1);
  const full = fixture(5);
  full.player.wallet.earned = 5000;
  full.player.merchantBuys = 2;
  full.merchants = [{ x: 0, z: 0 }];
  const exhausted = harness(full, true);
  exhausted.ai.setMode("pve");
  exhausted.advance(2);
  assert.equal(
    exhausted.commands.some(([kind]) => kind === "shop"),
    false,
  );
});

test("A* navigation avoids collision volume and boss warning escape points away from impact", () => {
  const m = fixture(),
    target = m.spawnBeast(0, 12, 0);
  target.ai = false;
  m.obstacles = [{ x: 2, z: 0, r: 0.9, blocksSight: false }];
  const h = harness(m);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false, useSkills: false });
  h.ai.update(0.1);
  const point = {
    x: m.player.x + h.motion().x * 1.7,
    z: m.player.z + h.motion().z * 1.7,
  };
  assert.equal(
    segmentTouchesCircle(m.player, point, m.obstacles[0], 1.4),
    false,
  );
  m.effects = [{ x: 0, z: 1, radius: 4, type: "warning", end: 5 }];
  h.advance(0.3);
  assert.equal(h.ai.status().phase, "evade");
  assert.ok(h.motion().z < -0.5);
});

test("fog evacuation goes toward safe center and full mode retreats from outnumbered heroes", () => {
  const m = fixture();
  m.player.x = 52;
  m.player.z = -48;
  m.time = 600;
  assert.equal(infected(m.player, m.time), true);
  const h = harness(m);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false });
  h.ai.update(0.1);
  assert.equal(h.ai.status().phase, "evade");
  assert.ok(h.motion().x * -52 + h.motion().z * 48 > 0);
  const arena = fixture();
  arena.player.hp *= 0.6;
  for (const x of [6, 8]) {
    const enemy = arena.createHero(1, x, x, 0, {
      rings: [],
      bones: [],
      supports: [],
    });
    enemy.x = x;
    enemy.z = 0;
  }
  const retreat = harness(arena);
  retreat.ai.setMode("full");
  retreat.ai.setConfig({ autoBuild: false });
  retreat.ai.update(0.1);
  assert.equal(retreat.ai.status().phase, "retreat");
  assert.ok(retreat.motion().x < 0);
  assert.ok(
    retreat.commands.some(([kind, index]) => kind === "cast" && index === 4),
  );
});

test("full mode absorbs only compatible better rings and holds still for the real8s ceremony", () => {
  const m = fixture();
  m.shrines = [{ x: 12, z: 0 }];
  m.player.x = 12;
  const survivor = m.createHero(1, 99, -80, -80, {
    rings: [],
    bones: [],
    supports: [],
  });
  survivor.ai = false;
  const wrong = R.loot("ring", 6),
    ring = R.loot("ring", 1);
  m.player.bag = [wrong, ring];
  const h = harness(m, true);
  h.ai.setMode("full");
  h.ai.setConfig({ autoBuild: false });
  h.ai.update(0.1);
  assert.deepEqual(
    h.commands.find(([kind]) => kind === "equipRing"),
    ["equipRing", ring.uid, 1],
  );
  assert.equal(m.player.absorb.uid, ring.uid);
  h.advance(7.8, true);
  assert.ok(m.player.absorb);
  assert.equal(m.player.rings[0], 0);
  assert.equal(h.motion().x, 0);
  assert.equal(h.motion().z, 0);
  h.advance(0.5, true);
  assert.equal(m.player.rings[0], ring.id);
  assert.ok(m.player.bag.some((item) => item.uid === wrong.uid));
  assert.equal(h.commands.filter(([kind]) => kind === "equipRing").length, 1);
});

test("40W or15/20minute full-mode trigger starts authoritative extraction and preserves overtime channel", () => {
  for (const scenario of [
    { time: 300, heavy: true },
    { time: 900, heavy: false },
    { time: 1200, heavy: false },
  ]) {
    const m = fixture();
    m.time = scenario.time;
    if (scenario.heavy)
      m.player.bag = Array.from({ length: 10 }, () => R.loot("bone", 1));
    m.gates = [{ x: 0, z: 0, start: m.time, end: m.time + 0.2 }];
    const h = harness(m, true);
    h.ai.setMode("full");
    h.ai.setConfig({ autoBuild: false });
    h.ai.update(0.1);
    assert.ok(m.player.channel, `time ${scenario.time}`);
    assert.equal(m.player.channel.mode, "exit");
    assert.equal(m.player.channel.total, scenario.heavy ? 40 : 20);
    m.time += 1;
    h.ai.update(0.3);
    assert.equal(h.ai.status().phase, "extracting");
    assert.equal(h.commands.filter(([kind]) => kind === "extract").length, 1);
    assert.equal(h.motion().x, 0);
  }
});

test("overweight gear+bag sends bag with Hoãn Nhân Hồi; without it auto asks for safe selection", () => {
  for (const charm of [true, false]) {
    const m = fixture();
    m.player.bag = Array.from({ length: 10 }, () => R.loot("bone", 1));
    m.player.gear = [
      R.loot("bone", 1, true),
      R.loot("bone", 2, true),
      R.loot("ring", 1, true),
    ];
    if (charm) m.player.supports = [{ id: 17, tier: 1, used: 0, cd: 0 }];
    m.gates = [{ x: 0, z: 0, end: 120 }];
    const h = harness(m, true);
    h.ai.setMode("full");
    h.ai.update(0.1);
    if (charm) {
      assert.equal(m.player.channel.mode, "send");
      assert.equal(m.player.channel.items.length, 10);
      assert.equal(m.player.gear.length, 3);
    } else {
      assert.equal(m.player.channel, undefined);
      assert.equal(h.ai.status().phase, "extract-blocked");
      assert.ok(h.notices.some((text) => text.includes("48W")));
    }
  }
});

test("online observation is read-only, emits ordinary input and skips absent or hidden targets", () => {
  const source = fixture();
  source.player.stats = source.getStats(source.player);
  source.online = true;
  source.player.wallet.brought = 0;
  const target = source.spawnBeast(0, 5, 0);
  target.stats = source.getStats(target);
  const snapshot = JSON.parse(
    JSON.stringify({
      online: true,
      time: 0,
      player: source.player,
      actors: [source.player, target],
      drops: [],
      gates: [],
      effects: [],
      zones: [],
      shopPoints: [],
      merchants: [],
      shrines: [],
    }),
  );
  const original = JSON.stringify(snapshot);
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  freeze(snapshot);
  const h = harness(snapshot);
  h.ai.setMode("pve");
  h.ai.update(0.1);
  assert.ok(h.commands.some(([kind]) => kind === "move"));
  assert.ok(h.commands.some(([kind]) => kind === "cast"));
  assert.equal(JSON.stringify(snapshot), original);
  assert.equal(h.ai.status().lastError, "");
});

test("an actual farming loop moves, kills a beast and claims its real earned currency through pickup commands", () => {
  const m = fixture();
  const survivor = m.createHero(1, 99, -80, -80, {
    rings: [],
    bones: [],
    supports: [],
  });
  survivor.ai = false;
  const beast = m.spawnBeast(0, 9, 0);
  beast.mutant = true;
  beast.hp = beast.maxHp = 480;
  const h = harness(m, true);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false });
  h.advance(14, true);
  assert.equal(beast.alive, false);
  assert.ok(m.player.wallet.earned > 0);
  assert.ok(
    h.commands.some(([kind]) => kind === "pickup" || kind === "pickupSelected"),
  );
  assert.ok(
    h.commands.some(
      ([kind, input]) => kind === "move" && Math.hypot(input.x, input.z) > 0.5,
    ),
  );
  assert.equal(h.ai.status().lastError, "");
});

test("friendly delayed spell warning never interrupts its caster's farming combo", () => {
  const m = fixture();
  const beast = m.spawnBeast(0, 1, 0);
  beast.ai = false;
  m.zones = [
    {
      owner: m.player,
      delayed: true,
      point: { x: 1, z: 0 },
      end: 0.4,
      sk: { radius: 1.8, base: 50 },
    },
  ];
  m.effects = [{ x: 1, z: 0, radius: 1.8, type: "warning", end: 0.35 }];
  const h = harness(m);
  h.ai.setMode("pve");
  h.ai.setConfig({ autoBuild: false });
  h.ai.update(0.1);
  assert.equal(h.ai.status().phase, "combat");
});
