import { HEROES, GATE_POS, SHRINES, REGIONS, RINGS } from "./data.js";
import * as R from "./rules.js";
import {
  AdvancedMethods,
  decodeGraph,
  canSee,
  realmOf,
  ringResonance,
  randomGatePositions,
  NAV_OBSTACLES,
  MAP_BUSHES,
  segmentTouchesCircle,
} from "./systems.js";
import { projectSkillCast } from "./skill-projection.js";
const farAiSteering=new WeakMap();
const rnd = (a, b) => a + Math.random() * (b - a),
  pick = (a) => a[Math.floor(Math.random() * a.length)];
export class Match {
  constructor(loadout, profile, emit = () => {}) {
    R.validateLoadout(loadout);
    this.profile = profile;
    this.emit = emit;
    this.time = 0;
    this.tick = 0;
    this.acc = 0;
    this.actors = [];
    this.drops = [];
    this.zones = [];
    this.effects = [];
    this.projectiles = [];
    this.gates = [];
    this.bosses = new Set();
    this.result = null;
    this.nextId = 1;
    this.wave = 0;
    this.siphons = [];
    this.shopPoints = REGIONS.slice(0, 6).map((r) => ({
      x: r.x + 5,
      z: r.z + 5,
    }));
    this.merchants = [
      { x: 20, z: 0 },
      { x: -20, z: 0 },
    ];
    this.shrines = SHRINES;
    this.seals = 0;
    this.obstacles = structuredClone(NAV_OBSTACLES);
    this.bushes = structuredClone(MAP_BUSHES);
    this.debugGateEnd = 0;
    this.teamSize =
      loadout.mode === "squad4"
        ? 4
        : loadout.mode === "duo"
          ? 2
          : loadout.mode === "squad3"
            ? 3
            : 1;
    this.player = this.createHero(loadout.hero, 0, 8, 8, loadout);
    this.player.immuneUntil = 5;
    const count = this.teamSize === 3 ? 96 : 100;
    for (let i = 1; i < count; i++) {
      const team = Math.floor(i / this.teamSize),
        same = team === 0;
      this.createHero(
        Math.floor(Math.random() * 12),
        team,
        same ? 8 + i * 2 : rnd(-82, 82),
        same ? 8 : rnd(-78, 78),
        {
          branch: Math.floor(Math.random() * 3),
          skin: 0,
          rings: [],
          bones: [],
          supports: Math.random() < 0.2 ? [{ id: 6, tier: 1 }] : [],
          ranked: loadout.ranked,
        },
      );
    }
    for (let i = 0; i < 58; i++)
      this.spawnBeast(i % 5 === 0 ? 1 : 0, rnd(-78, 78), rnd(-78, 78));
    // Nearby encounters teach the extraction loop without an empty opening run.
    this.spawnBeast(0, 13, 10);
    this.spawnBeast(1, 18, 13);
    for (let i = 0; i < 34; i++)
      this.makeDrop(
        rnd(-75, 75),
        rnd(-72, 72),
        [R.loot(Math.random() < 0.3 ? "fragment" : "material")],
        rnd(10, 35),
      );
    this.makeDrop(10, 12, [R.loot("ring", 1), R.loot("material")], 25);
    this.emit(
      "message",
      "Đã vào Thương Mang Cổ Vực. Săn Hồn thú, nhặt đồ và rút qua Cổng.",
    );
  }
  createHero(hero, team, x, z, l = {}) {
    const a = {
      id: this.nextId++,
      hero,
      team,
      x,
      z,
      branch: l.branch ?? 0,
      realm: l.realm ?? 0,
      companion: l.companion ? { x, z, nextWarning: 0 } : null,
      costume: l.costume ?? 0,
      skin: l.skin ?? 0,
      ranked: l.ranked ?? false,
      rings: [...(l.rings ?? [])],
      bones: [...(l.bones ?? [])],
      gear: [],
      items: [],
      bag: [],
      supports: (l.supports ?? []).map((s) => ({ ...s, used: 0, cd: 0 })),
      wallet: { brought: l.brought ?? 0, earned: 0 },
      cooldowns: [0, 0, 0, 0, 0, 0],
      buffs: [],
      dots: [],
      now: 0,
      hp: 1,
      mp: 1,
      shield: 0,
      shieldEnd: 0,
      stacks: 0,
      stackEnd: 0,
      level: 1,
      essence: 0,
      kills: 0,
      alive: true,
      dir: { x: 0, z: -1 },
      immuneUntil: 0,
      ccUntil: 0,
      slowUntil: 0,
      slow: 0,
      lastCombat: -20,
      stationary: 0,
      anchor: { x, z },
      kind: "hero",
      ai: team !== 0 || this.actors.length > 0,
      nextThink: 0,
      goal: null,
      downedUntil: 0,
      revive: 0,
    };
    if (a.ai && a.team !== 0 && Math.hypot(a.x - 8, a.z - 8) < 22) {
      const angle = rnd(0, Math.PI * 2);
      a.x = 8 + Math.cos(angle) * 26;
      a.z = 8 + Math.sin(angle) * 26;
    }
    Object.defineProperty(a, "branch", {
      value: a.branch,
      writable: false,
      configurable: false,
    });
    a.rings.forEach((id) => {
      if (id) a.gear.push(R.loot("ring", id, true));
    });
    a.bones.forEach((id) => a.gear.push(R.loot("bone", id, true)));
    const s = R.stats(a);
    a.hp = s.hp;
    a.mp = s.mp;
    this.actors.push(a);
    return a;
  }
  spawnBeast(tier, x, z, boss = null) {
    const mutant = tier === 1 && Math.random() < 0.12;
    const hp = boss ? boss.hp : tier === 1 ? 850 : 300;
    const a = {
      id: this.nextId++,
      kind: boss ? "boss" : "beast",
      name:
        boss?.name ??
        (mutant
          ? "Hồn Thú Biến Dị"
          : tier
            ? "Thiên Niên Linh Thú"
            : "Bách Niên Thanh Lang"),
      x,
      z,
      home: { x, z },
      realm: boss?.key === "dragon" ? 1 : 0,
      team: -1,
      hero: 0,
      branch: 0,
      hp: hp * (mutant ? 1.6 : 1),
      maxHp: hp * (mutant ? 1.6 : 1),
      atk: boss ? 95 : tier ? 44 : 24,
      armor: boss ? 65 : tier ? 32 : 15,
      resist: boss ? 60 : 20,
      speed: boss ? 2.2 : 3.4,
      range: boss ? 3 : 1.8,
      alive: true,
      tier,
      mutant,
      boss,
      dir: { x: 0, z: 1 },
      cooldowns: [0, 0, 0, 0, 0, 0],
      buffs: [],
      dots: [],
      now: this.time,
      ccUntil: 0,
      slow: 0,
      slowUntil: 0,
      immuneUntil: 0,
      stacks: 0,
      contributions: {},
      respawns: 0,
    };
    this.actors.push(a);
    return a;
  }
  getStats(a) {
    return a.kind === "hero"
      ? R.stats(a)
      : {
          hp: a.maxHp,
          atk: a.atk,
          power: a.atk,
          armor: a.armor,
          resist: a.resist,
          speed: a.speed,
          range: a.range,
          mp: 0,
          as: 1,
          heal: 1,
          shield: 1,
        };
  }
  support(a, id) {
    return a.supports?.find((s) => s.id === id);
  }
  buff(a, stats, seconds, type = "") {
    a.buffs.push({ stats, end: this.time + seconds, type });
  }
  effect(
    x,
    z,
    color = 0x65efda,
    radius = 2,
    type = "burst",
    duration = 0.6,
    realm = 0,
    visual = null,
  ) {
    this.effects.push({
      visual,
      id: this.nextId++,
      realm,
      x,
      z,
      color,
      radius,
      type,
      born: this.time,
      end: this.time + duration,
    });
  }
  enemies(a, b) {
    return (
      a !== b &&
      realmOf(a) === realmOf(b) &&
      b.alive &&
      !b.extracted &&
      (a.team === -1 ? b.kind === "hero" : b.team === -1 || a.team !== b.team)
    );
  }
  nearest(a, range = 15) {
    let target = null,
      d = range;
    for (const b of this.actors)
      if (
        this.enemies(a, b) &&
        !b.downedUntil &&
        !(b.untargetableUntil > this.time) &&
        canSee(this, a, b)
      ) {
        let n = R.distance(a, b);
        if (n < d) {
          d = n;
          target = b;
        }
      }
    return target;
  }
  move(a, x, z, dt) {
    if (!a.alive || a.extracted || a.ccUntil > this.time) return;
    const length = Math.hypot(x, z);
    if (length < 0.01) return;
    const prior = { x: a.x, z: a.z };
    a.lastMoveAt = this.time;
    const s = this.getStats(a),
      slow = a.slowUntil > this.time ? a.slow : 0;
    let speed = s.speed * (1 - slow) * (a.downedUntil ? 0.15 : 1);
    if (a.hero === 2 && a.stealthUntil > this.time)
      speed *= a.branch === 1 ? 1.28 : 1.15;
    if (a.hero === 9 && a.branch === 2) {
      let e = this.nearest(a, 14);
      if (e && e.hp < this.getStats(e).hp * 0.5) {
        speed *= 1.18;
        a.stacks = Math.max(a.stacks, 3);
        a.stackEnd = this.time + 5;
      }
    }
    a.x = R.clamp(a.x + (x / Math.max(1, length)) * speed * dt, -94, 94);
    a.z = R.clamp(a.z + (z / Math.max(1, length)) * speed * dt, -94, 94);
    if (a.realm === 1 && R.distance(a, { x: 82, z: 0 }) > 17) {
      a.x = prior.x;
      a.z = prior.z;
    }
    if (!a.realm && R.distance(a, { x: 82, z: 0 }) < 18) {
      a.x = prior.x;
      a.z = prior.z;
    }
    a.dir = { x: x / length, z: z / length };
    for (const wall of this.zones)
      if (
        wall.wall &&
        realmOf(wall) === realmOf(a) &&
        realmOf(wall.owner) === realmOf(wall) &&
        wall.owner.branch === 0 &&
        wall.owner.team !== a.team
      ) {
        const before = R.distance(prior, wall.point) - wall.sk.radius,
          after = R.distance(a, wall.point) - wall.sk.radius;
        if (before * after < 0) {
          a.x = prior.x;
          a.z = prior.z;
        }
      }
    // Thick arena columns are collision volumes, not decorative walls.
    for (const o of this.obstacles ?? []) {
      let d = R.distance(a, o);
      if (d < o.r + 0.42) {
        const dx = (a.x - o.x) / (d || 1),
          dz = (a.z - o.z) / (d || 1);
        a.x = o.x + dx * (o.r + 0.42);
        a.z = o.z + dz * (o.r + 0.42);
      }
    }
  }
  dash(a, length, dir = a.dir) {
    if (a.groundedUntil > this.time) return false;
    const target = {
      x: R.clamp(a.x + dir.x * length, -94, 94),
      z: R.clamp(a.z + dir.z * length, -94, 94),
    };
    for (const field of this.zones)
      if (
        field.end > this.time &&
        realmOf(field) === realmOf(a) &&
        realmOf(field.owner) === realmOf(field) &&
        field.owner.team !== a.team &&
        field.owner.rings?.includes(9) &&
        field.k === 1 &&
        segmentTouchesCircle(a, target, field.point, field.sk.radius)
      ) {
        this.cc(a, 0.4);
        return false;
      }
    if (
      (a.realm === 1 && R.distance(target, { x: 82, z: 0 }) > 17) ||
      (!a.realm && segmentTouchesCircle(a, target, { x: 82, z: 0 }, 18))
    )
      return false;
    for (const o of this.obstacles ?? [])
      if (segmentTouchesCircle(a, target, o, o.r + 0.5)) return false;
    for (const wall of this.zones)
      if (
        wall.wall &&
        wall.end > this.time &&
        realmOf(wall) === realmOf(a) &&
        realmOf(wall.owner) === realmOf(wall) &&
        wall.owner.team !== a.team
      ) {
        const before = R.distance(a, wall.point) <= wall.sk.radius,
          after = R.distance(target, wall.point) <= wall.sk.radius;
        if (
          before !== after ||
          (!before &&
            segmentTouchesCircle(a, target, wall.point, wall.sk.radius))
        )
          return false;
      }
    a.x = target.x;
    a.z = target.z;
    if (a.items?.includes(16))
      this.buff(a, { speed: this.getStats(a).speed * 0.1 }, 2);
    return true;
  }
  cc(a, seconds) {
    if (!a.alive || a.immuneCC > this.time) return;
    let t = seconds;
    const resistance = (a.buffs ?? [])
      .filter((b) => b.end > this.time)
      .reduce((r, b) => Math.max(r, b.ccResistance ?? 0), 0);
    t *= 1 - resistance;
    const charm = this.support(a, 10);
    if (charm && charm.cd <= this.time) {
      t *= 0.75;
      charm.cd = this.time + 90;
    }
    R.hardCC(a, t, this.time);
  }
  slow(a, amount, duration) {
    if (a.noSlowUntil > this.time) return;
    if (a.bones?.includes(6)) amount *= 0.75;
    if (a.items?.includes(16)) duration *= 0.7;
    a.slow = Math.max(a.slowUntil > this.time ? a.slow : 0, amount);
    a.slowUntil = this.time + duration;
  }
  heal(a, value, source = a) {
    const s = this.getStats(a);
    a.hp = Math.min(
      s.hp,
      a.hp +
        value *
          this.getStats(source).heal *
          (a.antiHealUntil > this.time ? 0.75 : 1),
    );
  }
  expireShields(a) {
    if (!a.shieldLayers) {
      a.shieldLayers =
        a.shield > 0
          ? [{ amount: a.shield, end: a.shieldEnd ?? Infinity }]
          : [];
    }
    a.shieldLayers = a.shieldLayers.filter(
      (l) => l.end > this.time && l.amount > 0,
    );
    a.shield = a.shieldLayers.reduce((n, l) => n + l.amount, 0);
    a.shieldEnd = Math.max(0, ...a.shieldLayers.map((l) => l.end));
  }
  absorbShields(a, amount) {
    for (const layer of a.shieldLayers) {
      if (amount <= 0) break;
      const used = Math.min(amount, layer.amount);
      layer.amount -= used;
      amount -= used;
      if (layer.amount === 0 && layer.blindOnBreak)
        for (const enemy of this.actors)
          if (this.enemies(a, enemy) && R.distance(a, enemy) <= 3)
            enemy.blindUntil = Math.max(enemy.blindUntil ?? 0, this.time + 0.6);
    }
    this.expireShields(a);
  }
  shield(a, value, duration = 3, source = a, options = {}) {
    this.expireShields(a);
    a.shieldLayers.push({
      amount:
        value *
        this.getStats(source).shield *
        (a.shieldWeakUntil > this.time ? 0.7 : 1),
      end: this.time + duration,
      blindOnBreak: options.blindOnBreak === true,
    });
    this.expireShields(a);
    if (
      source.items?.includes(24) &&
      a !== source &&
      a.hp < this.getStats(a).hp * 0.3 &&
      (source.cureCd ?? 0) <= this.time
    ) {
      this.heal(a, 95, source);
      source.cureCd = this.time + 15;
    }
  }
  damage(source, target, raw, type = "magic", skill = -1, extra = {}) {
    if (!target.alive || target.extracted) return 0;
    if (target.immuneUntil > this.time) {
      if (target.dodgeReady > this.time) {
        target.dodgeReady = 0;
        if (target.kind === "hero" && target.hero === 2) {
          target.stacks = Math.min(3, target.stacks + 1);
          target.stackEnd = this.time + 4;
        }
        if (target.bones?.includes(5))
          this.buff(target, { speed: this.getStats(target).speed * 0.2 }, 2);
        if (target.items?.includes(15))
          this.buff(target, { speed: this.getStats(target).speed * 0.08 }, 2);
      }
      return 0;
    }
    if (target.kind === "clone") raw *= 1.5;
    const s = this.getStats(source),
      t = this.getStats(target);
    source.lastCombat = target.lastCombat = this.time;
    let def = type === "true" ? 0 : type === "physical" ? t.armor : t.resist;
    if (target.armorBreakUntil > this.time && type === "physical")
      def -= target.armorBreak ?? 0;
    if (type === "physical" && source.hero === 2)
      def *= 1 - 0.05 * (source.stacks ?? 0);
    if (type === "physical" && source.ignoreArmorUntil > this.time) {
      def *= 0.75;
      source.ignoreArmorUntil = 0;
    }
    if (ringResonance(source.rings)) def *= 0.95;
    let bonus = 0,
      reduction = target.channel
        ? R.gateReduction(!!this.support(target, 5))
        : 0;
    if (
      source.items?.includes(6) &&
      skill >= 0 &&
      source.hero !== 1 &&
      s.range > 4
    )
      bonus += 0.05;
    if (source.items?.includes(3) && type === "physical")
      bonus += Math.min(0.04, (source.physicalStacks ?? 0) * 0.01);
    if (source.items?.includes(4) && s.range < 3 && target.hp < t.hp * 0.4)
      bonus += 0.08;
    if (target.vulnerableUntil > this.time) bonus += 0.06;
    if (target.items?.includes(12) && target.stationary >= 2)
      reduction = 1 - (1 - reduction) * 0.92;
    for (const b of target.buffs ?? [])
      if (b.end > this.time && b.reduction)
        reduction = 1 - (1 - reduction) * (1 - b.reduction);
    if (source.items?.includes(27) && target.shield > 0) raw *= 1.35;
    if (
      target.reflectUntil > this.time &&
      skill >= 0 &&
      extra.directional &&
      !extra.reflected
    ) {
      target.reflectUntil = 0;
      this.damage(target, source, raw * 0.35, type, -1, { reflected: true });
    }
    this.expireShields(target);
    const priorShield = target.shield ?? 0;
    const r = R.resolveDamage(raw, def, bonus, reduction, priorShield);
    if (extra.shieldOnly) {
      r.hpDamage = 0;
      r.damage = Math.min(priorShield, r.damage);
    }
    this.absorbShields(target, priorShield - r.shield);
    target.hp -= r.hpDamage;
    if (target.contributions)
      target.contributions[source.id] =
        (target.contributions[source.id] ?? 0) +
        Math.min(r.damage, Math.max(0, target.hp + r.hpDamage));
    if (target.kind === "hero" && target.hero === 5) {
      target.stacks = Math.min(target.branch === 0 ? 8 : 5, target.stacks + 1);
      target.stackEnd = this.time + 5;
    }
    if (
      priorShield > 0 &&
      target.buffs.some((b) => b.type === "electric" && b.end > this.time) &&
      !extra.reflected
    )
      this.damage(target, source, 45, "magic", -1, { reflected: true });
    if (
      target.kind === "hero" &&
      target.hp > 0 &&
      target.hp < t.hp * 0.3 &&
      target.bones.includes(2) &&
      (target.boneShieldCd ?? 0) <= this.time
    ) {
      this.shield(target, 180, 3);
      target.boneShieldCd = this.time + 45;
    }
    const charm = this.support(target, 13);
    if (target.hp > 0 && target.hp < t.hp * 0.2 && charm && !charm.used) {
      charm.used = 1;
      this.shield(target, 160, 2.5);
    }
    this.emit("hit", {
      target: target.id,
      value: Math.round(r.damage),
      player: target === this.player,
    });
    if (target.hp <= 0) this.kill(target, source);
    return r.damage;
  }
  passive(a, t, k) {
    if (a.kind !== "hero") return;
    if (k < 0 && [3, 6, 7, 11].includes(a.hero)) return;
    if (a.hero === 8 && k >= 0) return;
    let h = a.hero,
      s = this.getStats(a);
    if (![2, 4, 5, 10].includes(h)) {
      a.stackEnd = this.time + ([1].includes(h) ? 6 : 5);
      if ([0, 3, 6, 7, 11].includes(h)) {
        t.soulMarks ??= {};
        const mark = t.soulMarks[a.id];
        a.stacks = mark && mark.end > this.time ? mark.stacks + 1 : 1;
        t.soulMarks[a.id] = { stacks: a.stacks, end: a.stackEnd };
      } else a.stacks++;
      const threshold =
        h === 1
          ? a.branch === 2
            ? 3
            : 4
          : h === 3
            ? a.branch === 0
              ? 2
              : 3
            : h === 8
              ? a.branch === 2
                ? 5
                : 3
              : h === 9
                ? 5
                : 3;
      a.stacks = Math.min(a.stacks, threshold);
      if ([0, 3, 6, 7, 11].includes(h) && a.stacks >= threshold) {
        a.stacks = 0;
        if (t.soulMarks?.[a.id]) t.soulMarks[a.id].stacks = 0;
        const raw =
          h === 0
            ? 65 + 0.35 * s.power
            : h === 3
              ? 50 + 0.35 * s.power
              : h === 6
                ? 45 + 0.4 * s.power
                : h === 7 && a.branch === 1
                  ? 75 + 0.45 * s.power
                  : h === 11
                    ? 50 + 0.35 * s.power
                    : 0;
        if (h === 6) {
          for (const enemy of this.actors)
            if (this.enemies(a, enemy) && R.distance(enemy, t) <= 2) {
              this.damage(a, enemy, raw, "magic", -1);
              if (a.branch === 1)
                this.dot(
                  enemy,
                  a,
                  (0.025 * this.getStats(enemy).hp) / 3,
                  3,
                  "magic",
                  "burn",
                );
            }
          this.effect(t.x, t.z, HEROES[h].color, 2, "burst", 0.6, realmOf(t));
        } else if (raw > 0) this.damage(a, t, raw, "magic", -1);
        if (h === 0) this.heal(a, 35);
        if (h === 7 && a.branch !== 1) this.slow(t, 0.15, 1.5);
        if (h === 11) this.reveal(a, t, 1.5);
      }
    }
    if (a.items.includes(8) && k >= 0) {
      a.itemStacks = (a.itemStacks ?? 0) + 1;
      if (a.itemStacks >= 3 && (a.itemBurstCd ?? 0) <= this.time) {
        a.itemStacks = 0;
        a.itemBurstCd = this.time + 6;
        this.damage(a, t, 55, "magic");
      }
    }
  }
  dot(t, a, raw, duration, type = "magic", kind = "poison") {
    if (t.items?.includes(23)) duration *= 0.85;
    const old = t.dots.find((d) => d.source === a && d.kind === kind);
    if (old) {
      old.end = this.time + duration;
      old.raw = raw;
      return;
    }
    t.dots.push({
      source: a,
      raw,
      end: this.time + duration,
      next: this.time + 1,
      type,
      kind,
    });
  }
  attackTarget(a, range) {
    if (!a.targetMode || a.targetMode === "auto") return this.nearest(a, range);
    const candidates = this.actors.filter(
      (t) =>
        this.enemies(a, t) &&
        !t.downedUntil &&
        !(t.untargetableUntil > this.time) &&
        canSee(this, a, t) &&
        R.distance(a, t) <= range &&
        (a.targetMode === "beast"
          ? ["beast", "boss"].includes(t.kind)
          : t.kind === "hero"),
    );
    candidates.sort((x, y) =>
      a.targetMode === "hero-low"
        ? x.hp / this.getStats(x).hp - y.hp / this.getStats(y).hp ||
          R.distance(a, x) - R.distance(a, y)
        : R.distance(a, x) - R.distance(a, y),
    );
    return candidates[0] ?? null;
  }
  attack(a) {
    if (
      !a.alive ||
      a.downedUntil ||
      a.ccUntil > this.time ||
      a.cooldowns[5] > 0
    )
      return false;
    const s = this.getStats(a),
      t = this.attackTarget(a, s.range + 0.6 + (a.ringDashReady ? 2.5 : 0));
    if (!t) return false;
    a.dir = {
      x: (t.x - a.x) / R.distance(a, t),
      z: (t.z - a.z) / R.distance(a, t),
    };
    a.cooldowns[5] = 1 / Math.max(0.2, s.as);
    if (a.blindUntil > this.time) return true;
    let raw = s.atk;
    if (
      a.hero === 2 &&
      (t.reveals ?? []).some(
        (r) => r.team === a.team && r.hero === 4 && r.end > this.time,
      )
    ) {
      a.ignoreArmorUntil = this.time + 0.1;
      this.buff(a, { speed: s.speed * 0.2 }, 2);
    }
    if (a.kind === "hero") {
      if (a.hero === 8 && a.lastAttackTarget !== t.id) {
        a.stacks = 0;
        a.lastAttackTarget = t.id;
      }
      if (a.hero === 0) raw += s.power * 0.2;
      if (a.hero === 1) raw *= 1.1;
      if (a.hero === 8)
        raw *= 1 + Math.min(a.stacks, a.branch === 2 ? 5 : 3) * 0.03;
      if (a.hero === 2 && a.stealthUntil > this.time && a.branch === 0)
        raw += 45 + 0.35 * s.atk;
      if (a.empoweredUntil > this.time) {
        if (a.bones.includes(3) && (a.boneHitCd ?? 0) <= this.time) {
          raw += 40;
          a.boneHitCd = this.time + 4;
        }
        if (a.items.includes(1)) {
          t.armorBreak = 6;
          t.armorBreakUntil = this.time + 3;
        }
        a.empoweredUntil = 0;
      }
      if (a.arrowReady) {
        raw += 45 + 0.3 * s.atk;
        a.arrowReady = false;
      }
      if (a.doubleShots > 0) {
        raw *= 1.4;
        a.doubleShots--;
      }
      if ((t.moonMarks?.[a.id] ?? 0) > this.time && Math.random() < 0.12)
        raw *= 2;
      if (a.rings.includes(5) && a.ringDashReady) {
        this.dash(a, Math.min(2.5, Math.max(0, R.distance(a, t) - 1)));
        a.ringDashReady = false;
      }
    }
    a.stealthUntil = 0;
    this.damage(a, t, raw, "physical");
    if (a.kind === "hero") {
      a.physicalStacks = Math.min(4, (a.physicalStacks ?? 0) + 1);
      this.passive(a, t, -1);
    }
    this.effect(
      t.x,
      t.z,
      a.kind === "hero" ? HEROES[a.hero].color : 0xff826f,
      0.8,
      "slash",
      0.25,
      realmOf(t),
    );
    return true;
  }
  allies(a, point, radius) {
    return this.actors.filter(
      (t) =>
        t.alive &&
        t.kind === "hero" &&
        t.team === a.team &&
        !t.extracted &&
        !t.downedUntil &&
        realmOf(t) === realmOf(a) &&
        R.distance(t, point) <= radius,
    );
  }
  cast(a, k, aim = null) {
    if (
      !a.alive ||
      a.extracted ||
      a.downedUntil ||
      a.ccUntil > this.time ||
      (a.silenceUntil > this.time && k < 4) ||
      a.cooldowns[k] > 0
    )
      return false;
    if (k === 4) {
      if (a.groundedUntil > this.time) return false;
      a.dir = projectSkillCast(
        this,
        a,
        { range: 2.8, headingOnly: true },
        aim,
      ).direction;
      a.cooldowns[4] = 8 - (a.items.includes(14) ? 0.5 : 0);
      a.immuneUntil = this.time + 0.25;
      a.dodgeReady = this.time + 0.25;
      const trailOrigin = { x: a.x, z: a.z };
      this.dash(a, 2.8);
      if (a.hero === 2) {
        a.stacks = Math.min(3, a.stacks + 1);
        a.stackEnd = this.time + 4;
      }
      this.effect(a.x, a.z, 0xc9fafa, 1.5, "burst", 0.4, realmOf(a),
        a.hero === 0 ? { hero: 0, skill: 4, direction: { ...a.dir }, origin: trailOrigin, range: 2.8 } : null);
      return true;
    }
    let sk = R.skillFor(a, k),
      s = this.getStats(a),
      h = a.hero,
      b = a.branch;
    if (a.mp < sk.mp) {
      if (a === this.player) this.emit("message", "Không đủ Hồn lực");
      return false;
    }
    a.mp -= sk.mp;
    a.cooldowns[k] = sk.cd;
    a.empoweredUntil = this.time + 5;
    const castOrigin = { x: a.x, z: a.z };
    const projection = projectSkillCast(this, a, sk, aim);
    const target = projection.target;
    if (
      target &&
      ["target", "chain"].includes(sk.shape) &&
      aim?.targetId === target.id
    )
      sk = { ...sk, lockTarget: target.id };
    const dir = projection.direction;
    a.dir = dir;
    let point = projection.point;
    if (h === 3 && k === 2 && b === 1) {
      a.cooldowns[0] = Math.max(0, a.cooldowns[0] - 2);
      this.buff(a, { speed: s.speed * 0.15 }, 2);
    }
    if (sk.dash) {
      if (sk.shape === "line") sk.origin = castOrigin;
      const old = { x: a.x, z: a.z };
      this.dash(a, sk.dash, dir);
      if (h === 2) {
        a.stacks = Math.min(3, a.stacks + 1);
        a.stackEnd = this.time + 4;
      }
      if (h === 6 || h === 11)
        this.zone(
          a,
          old,
          {
            ...sk,
            shape: "zone",
            base: h === 11 ? 20 : 35,
            scale: 0.2,
            radius: 1.8,
            duration: 2,
          },
          k,
        );
      if (h === 6 && b === 2) a.untargetableUntil = this.time + 0.8;
      if (h === 7) {
        if (b === 2) this.shield(a, 80);
        for (const pos of [old, { x: a.x, z: a.z }])
          this.zone(
            a,
            pos,
            {
              ...sk,
              shape: "zone",
              base: 0,
              scale: 0,
              radius: 1,
              duration: 1.2,
              slow: 0.2,
              nonDamage: true,
            },
            k,
          );
      }
      if (h === 8) {
        a.arrowReady = true;
        if (b === 2) a.doubleShots = 2;
      }
      if (h === 11 && b === 1) {
        this.buff(a, { speed: s.speed * 0.2 }, 2.5);
        a.hideMapUntil = this.time + 2.5;
      }
      if (a.rings.includes(12))
        this.zones.push({
          id: this.nextId++,
          delayed: true,
          owner: a,
          realm: realmOf(a),
          point: old,
          sk: {
            ...sk,
            shape: "circle",
            base: 80,
            scale: 0,
            radius: 2,
            secondary: true,
          },
          k,
          dir: { ...dir },
          next: this.time + 1,
          end: this.time + 1.1,
        });
      point = { x: a.x, z: a.z };
    }
    if (a.rings.includes(5) && k === 2) a.ringDashReady = true;
    if (
      a.rings.includes(3) &&
      k === 2 &&
      !["zone", "healzone"].includes(sk.shape)
    )
      this.zone(
        a,
        point,
        { shape: "healzone", base: 25, scale: 0, radius: 3.2, duration: 4 },
        k,
      );
    if (sk.shape === "shield") {
      let value = sk.base + sk.scale * s.power;
      if (h === 1) value = (120 + 0.08 * s.hp) * (b === 0 ? 0.7 : 1);
      if (h === 9)
        value = (90 + 0.06 * s.hp) * (b === 1 ? 1.4 : b === 0 ? 0.7 : 1);
      const friend =
        (aim?.targetId === target?.id && target?.team === a.team
          ? target
          : null) ??
        this.allies(a, a, sk.range).sort(
          (x, y) => x.hp / this.getStats(x).hp - y.hp / this.getStats(y).hp,
        )[0] ??
        a;
      if (a.harmony) {
        value *= 1.08;
        a.harmony = false;
      }
      if (h === 4) {
        value *= 1 + 0.05 * (a.mirrorStacks ?? 0);
        if ((a.mirrorCd ?? 0) <= this.time) {
          a.mirrorStacks = Math.min(2, (a.mirrorStacks ?? 0) + 1);
          a.mirrorCd = this.time + 15;
        }
      }
      this.shield(friend, value, sk.duration, a, {
        blindOnBreak: h === 4 && k === 1 && a.rings.includes(7),
      });
      if (h === 4 && b === 2) friend.reflectUntil = this.time + 1.2;
      if (h === 9) {
        if (b === 1) a.slowUntil = 0;
        this.buff(a, { armor: (b === 1 ? 28 : 15) * (b === 0 ? 0.7 : 1) }, 3);
      }
    } else if (sk.shape === "heal") {
      let friend =
        (aim?.targetId === target?.id && target?.team === a.team
          ? target
          : null) ??
        this.allies(a, a, sk.range).sort(
          (x, y) => x.hp / this.getStats(x).hp - y.hp / this.getStats(y).hp,
        )[0] ??
        a;
      this.heal(
        friend,
        (sk.base + sk.scale * s.power) * (a.harmony ? 1.08 : 1),
        a,
      );
      a.harmony = false;
      if (b === 0) {
        if (friend.dots.length) friend.dots.splice(0, 1);
        else friend.slowUntil = 0;
      }
    } else if (sk.shape === "armor") {
      let armor = b === 0 ? 35 : b === 1 ? 15 : 20,
        resist = b === 0 ? 25 : b === 1 ? 11.25 : 15;
      this.buff(a, { armor, resist, speed: b === 0 ? 0 : -s.speed * 0.1 }, 4);
      if (b === 2) {
        let f = this.allies(a, a, 6).find((t) => t !== a);
        if (f) this.buff(f, { armor: armor * 0.5, resist: resist * 0.5 }, 4);
      }
    } else if (sk.shape === "stealth") {
      a.stealthUntil =
        this.time + sk.duration - (a.rings.includes(5) ? 0.6 : 0);
      a.footprints = [];
    } else if (sk.shape === "clone") {
      for (let i = 0; i < (b === 2 ? 2 : 1); i++) {
        const c = this.spawnBeast(0, a.x + i, a.z);
        c.kind = "clone";
        c.hero = a.hero;
        c.skin = a.skin;
        c.costume = a.costume;
        c.rings = [...a.rings];
        c.team = a.team;
        c.owner = a;
        c.maxHp = c.hp = s.hp;
        c.armor = s.armor;
        c.resist = s.resist;
        c.expires = this.time + 4;
        c.dir = { x: dir.x + (i ? 0.3 : 0), z: dir.z };
      }
    } else if (sk.shape === "reveal") {
      for (const t of this.actors)
        if (
          this.enemies(a, t) &&
          R.distance(t, h === 8 ? point : a) <= sk.radius
        ) {
          this.reveal(a, t, sk.duration);
          if (h === 4 && b === 1) t.vulnerableUntil = t.revealUntil;
          if (h === 8 && b === 2 && k === 0) a.doubleShots = 2;
          if (h === 8 && b === 1 && k === 0) {
            t.moonMarks ??= {};
            t.moonMarks[a.id] = this.time + sk.duration;
          }
        }
      a.scanUntil = this.time + sk.duration;
    } else if (sk.shape === "rage") {
      const hp = b === 1 ? 220 : 120;
      this.buff(
        a,
        {
          hp,
          as: b === 0 ? 0.24 : b === 1 ? 0.06 : 0.12,
          speed: s.speed * 0.1,
        },
        sk.duration,
      );
      a.hp += hp;
      a.rageUntil = this.time + sk.duration;
      a.cooldowns[0] = Math.max(0, a.cooldowns[0] - 1.5);
    } else if (["zone", "healzone", "protect"].includes(sk.shape)) {
      if (h === 10 && sk.shape === "healzone" && a.harmony) {
        sk.base *= 1.08;
        sk.scale *= 1.08;
        a.harmony = false;
      }
      this.zone(a, point, sk, k);
    } else if (sk.shape === "dash") {
      this.effect(a.x, a.z, HEROES[h].color, 2, "burst", 0.6, realmOf(a));
    } else {
      const fire = () => {
        if (sk.shape === "line" && !sk.dash && h !== 4) {
          this.projectiles.push({
            id: this.nextId++,
            owner: a,
            realm: realmOf(a),
            k,
            sk: { ...sk, origin: castOrigin },
            x: castOrigin.x,
            z: castOrigin.z,
            dir: { ...dir },
            remaining: sk.range,
            speed: 20 * (h === 3 && b === 0 ? 1.25 : 1),
            startAt: this.time + (a.rings.includes(10) && k === 0 ? 0.15 : 0),
            hit: new Set(),
          });
        } else if (h === 2 && k === 3) {
          a.untargetableUntil = this.time + 0.6;
          for (let i = 0; i < 5; i++)
            this.zones.push({
              id: this.nextId++,
              delayed: true,
              owner: a,
              realm: realmOf(a),
              point,
              sk: {
                ...sk,
                base: sk.base / 5,
                scale: sk.scale / 5,
                lockTarget: target?.id ?? -1,
              },
              k,
              dir,
              next: this.time + i * 0.24,
              end: this.time + 1.3,
            });
        } else this.skillHit(a, k, sk, point, dir);
        if (h === 0 && k === 3)
          this.zones.push({
            id: this.nextId++,
            owner: a,
            realm: realmOf(a),
            point: { ...point },
            sk: { ...sk, base: 0, scale: 0 },
            k,
            next: Infinity,
            end: this.time + (b === 0 ? 3 : 2.5),
            tag: "vine",
            wall: true,
            comboCd: 0,
          });
      };
      const delay =
        h === 0 && k === 1
          ? 0.35
          : h === 6 && k === 1
            ? b === 0
              ? 0.5
              : 0.8
            : h === 11 && k === 1
              ? b === 2
                ? 0.3
                : 0.5
              : 0;
      if (delay) {
        this.zones.push({
          id: this.nextId++,
          delayed: true,
          owner: a,
          realm: realmOf(a),
          point,
          sk,
          k,
          dir,
          next: this.time + delay,
          end: this.time + delay + 0.01,
        });
        this.effect(
          point.x,
          point.z,
          HEROES[h].color,
          sk.radius,
          "warning",
          delay,
          realmOf(a),
        );
      } else fire();
    }
    if (h === 10) {
      if (a.lastSkill !== k && (a.harmonyCd ?? 0) <= this.time) {
        a.harmony = true;
        a.harmonyCd = this.time + 8;
      }
      a.lastSkill = k;
    }
    this.effect(
      point.x,
      point.z,
      HEROES[h].color,
      sk.radius || 1,
      sk.shape === "line" ? "slash" : "burst",
      0.45,
      realmOf(a),
      h === 0 ? { hero: 0, skill: k, direction: { ...dir }, origin: { x: a.x, z: a.z }, range: sk.range } : null,
    );
    return true;
  }
  skillHit(a, k, sk, point, dir, only = null) {
    const h = a.hero,
      b = a.branch,
      s = this.getStats(a);
    let victims = only ?? this.actors.filter((t) => this.enemies(a, t));
    if (["line", "cone"].includes(sk.shape))
      victims = victims
        .filter((t) => {
          const origin = sk.origin ?? a;
          let dx = t.x - origin.x,
            dz = t.z - origin.z,
            along = dx * dir.x + dz * dir.z,
            side = Math.abs(dx * dir.z - dz * dir.x);
          return (
            along >= -0.7 &&
            along <= sk.range + 0.6 &&
            (sk.shape === "cone"
              ? side <= Math.max(0.6, along * 1.73)
              : side <= 0.9)
          );
        })
        .sort((x, y) => R.distance(a, x) - R.distance(a, y));
    else if (["target", "chain"].includes(sk.shape)) {
      let t = sk.lockTarget
        ? this.actors.find(
            (t) =>
              t.id === sk.lockTarget &&
              this.enemies(a, t) &&
              !(t.untargetableUntil > this.time) &&
              canSee(this, a, t),
          )
        : this.nearest(a, sk.range + 0.5);
      victims = t ? [t] : [];
      if (t && sk.shape === "chain") {
        let count = b === 0 ? 2 : b === 2 ? 5 : 3;
        if (a.rings.includes(6)) count++;
        for (let j = 1; j < count; j++) {
          let last = victims.at(-1),
            next = this.actors
              .filter(
                (v) =>
                  this.enemies(a, v) &&
                  !victims.includes(v) &&
                  R.distance(v, last) < (b === 0 ? 2.8 : 4),
              )
              .sort((x, y) => R.distance(x, last) - R.distance(y, last))[0];
          if (next) victims.push(next);
          else break;
        }
      }
    } else
      victims = victims.filter((t) => R.distance(t, point) <= sk.radius + 0.5);
    const physical = [1, 2, 8, 9].includes(h) || h === 5;
    victims.forEach((t, index) => {
      if (h === 7) {
        const ice = t.iceMarks?.[a.id];
        t.iceStacks = ice && ice.end > this.time ? ice.stacks : 0;
      }
      let raw = sk.base + sk.scale * (physical ? s.atk : s.power);
      if (h === 5 && k === 0) raw += s.hp * 0.05;
      if (h === 1 && b === 0 && k === 0 && index === 0) raw *= 1.22;
      if (h === 1 && k === 0 && a.stacks >= (b === 2 ? 3 : 4)) {
        raw *= 1.3;
        t.armorBreak = this.getStats(t).armor * 0.2;
        t.armorBreakUntil = this.time + 1;
        a.stacks = 0;
        if (b === 2) {
          a.cooldowns[0] = Math.max(0, a.cooldowns[0] - 1.5);
          a.cooldowns[1] = Math.max(0, a.cooldowns[1] - 1.5);
        }
      }
      if (h === 2 && b === 0 && k === 3 && t.hp < this.getStats(t).hp * 0.5)
        raw *= 1.18;
      if (h === 3 && k === 1 && sk.shape === "chain") raw *= 0.8 ** index;
      if (h === 7 && b === 1 && k === 0 && t.slowUntil > this.time) raw *= 1.35;
      if (h === 8 && b === 0 && k === 0 && R.distance(a, t) > 8) raw *= 1.2;
      if (h === 8 && b === 2 && k === 0) a.doubleShots = 2;
      if (h === 8 && b === 1 && k === 0) {
        t.moonMarks ??= {};
        t.moonMarks[a.id] = this.time + 5;
      }

      if (a.harmony && ["heal", "shield"].includes(sk.shape)) {
        raw *= 1.08;
        a.harmony = false;
      }
      if (!sk.nonDamage)
        this.damage(a, t, raw, physical ? "physical" : "magic", k, {
          directional: sk.shape === "line",
        });
      if (sk.burnRing)
        this.dot(t, a, ((raw / 0.8) * 0.35) / 3, 3, "magic", "burn");
      if (sk.cc && (h !== 7 || t.iceStacks >= 3)) {
        if (h === 1 && k === 3 && R.distance(point, t) > 2) {
        } else {
          this.cc(t, sk.cc * (a.items.includes(7) ? 1.05 : 1));
          t.controlSource = {
            source: a.id,
            hero: a.hero,
            team: a.team,
            realm: realmOf(a),
            end: t.ccUntil,
          };
        }
      }
      if (h === 7 && !sk.nonDamage) {
        if (k === 3) t.iceStacks = 0;
        else t.iceStacks = Math.min(3, (t.iceStacks ?? 0) + 1);
        t.iceMarks ??= {};
        t.iceMarks[a.id] = { stacks: t.iceStacks, end: this.time + 5 };
        if (t.iceStacks >= 3 && b !== 1) this.slow(t, 0.15, 1.5);
      }
      if (sk.slow)
        this.slow(
          t,
          sk.slow + (a.items.includes(17) ? 0.05 : 0),
          h === 0 && k === 0
            ? 1.5
            : h === 0 && b === 1 && k === 1
              ? 1.5
              : h === 1 && b === 1
                ? 2.5
                : h === 10 && b === 2
                  ? 2
                  : 2,
        );
      if (a.items.includes(18)) this.slow(t, 0.1, 1);
      if (a.items.includes(20) && sk.cc && (a.groundCd ?? 0) <= this.time) {
        t.groundedUntil = this.time + 0.6;
        a.groundCd = this.time + 10;
      }
      if (h === 0 && b === 1 && [0, 2].includes(k)) {
        this.dot(t, a, 18 + 0.12 * s.power, 3);
        t.antiHealUntil = this.time + 3;
      }
      if (h === 11 && k === 3) t.visionReducedUntil = this.time + 1.1;
      if (h === 11 && b === 0 && [0, 3].includes(k)) {
        this.dot(t, a, t.hp * 0.02, 3);
        t.shieldWeakUntil = this.time + 3;
      }
      if (h === 10 && b === 1 && k === 2) t.silenceUntil = this.time + 0.75;
      if (h === 1 && b === 0 && k === 3) {
        t.armorBreak = this.getStats(t).armor * 0.25;
        t.armorBreakUntil = this.time + 4;
      }
      if (h === 4) this.reveal(a, t, 1.5);
      if (h === 9 && k === 0 && t.kind === "hero") this.heal(a, 30);
      if (h === 9 && b === 0 && k === 0 && a.rageUntil > this.time)
        this.damage(a, t, (this.getStats(t).hp - t.hp) * 0.04, "true");
      if (h === 5 && k === 0) {
        const length = (b === 1 ? 2 : 1) * (t.bones?.includes(6) ? 0.75 : 1);
        const ok = this.dash(t, length, dir);
        if (!ok && b === 1) this.cc(t, 0.75);
      }
      if (
        a.rings.includes(1) &&
        k === 0 &&
        (t.soulMarks?.[a.id]?.stacks ?? 0) > 0
      )
        this.slow(t, 0.3, 1.2);
      if (a.rings.includes(4) && k === 0) {
        if (t.shield > 0)
          this.damage(a, t, raw * 0.4, physical ? "physical" : "magic", -1, {
            shieldOnly: true,
          });
        t.armorBreak = 10;
        t.armorBreakUntil = this.time + 3;
      }
      if (
        a.rings.includes(11) &&
        k === 2 &&
        t.kind === "hero" &&
        !sk.refunded
      ) {
        a.cooldowns[2] *= 0.7;
        sk.refunded = true;
      }
      if (
        a.bones.includes(4) &&
        k === 0 &&
        t.kind === "hero" &&
        (a.mpBoneCd ?? 0) <= this.time
      ) {
        a.mp = Math.min(s.mp, a.mp + 5);
        a.cooldowns[1] = Math.max(0, a.cooldowns[1] - 0.5);
        a.mpBoneCd = this.time + 5;
      }
      if (h === 0 && b === 2 && k === 0) {
        const f = this.allies(a, a, 7).sort(
          (x, y) => R.distance(x, a) - R.distance(y, a),
        )[0];
        if (f) this.shield(f, 65 + 0.25 * s.power, 3, a);
      }
      if (!sk.nonDamage && !sk.secondary) {
        this.passive(a, t, k);
        this.resonance(a, t, k, point);
      }
    });
    if (a.rings.includes(6) && k === 1 && !sk.secondary && victims.length)
      this.zones.push({
        id: this.nextId++,
        delayed: true,
        owner: a,
        realm: realmOf(a),
        point: { x: victims[0].x, z: victims[0].z },
        sk: {
          shape: "circle",
          base: 55,
          scale: 0,
          radius: 1.5,
          secondary: true,
          cc: 0,
          slow: 0,
        },
        k,
        dir: { ...dir },
        next: this.time + 0.5,
        end: this.time + 0.6,
      });
    if (a.rings.includes(10) && k === 0 && victims.length)
      a.stacks = Math.min(a.branch === 2 ? 5 : 3, a.stacks + 1);
    if (h === 8 && b === 2 && k === 0) a.doubleShots = 2;
  }
  zone(a, point, sk, k) {
    const tag =
      a.hero === 0
        ? "vine"
        : a.hero === 5
          ? "shield"
          : a.hero === 6
            ? "fire"
            : a.hero === 7
              ? "frost"
              : "";
    const z = {
      id: this.nextId++,
      owner: a,
      realm: realmOf(a),
      point: { ...point },
      sk: { ...sk },
      k,
      next: this.time,
      end: this.time + sk.duration,
      tag,
      comboCd: 0,
    };
    this.zones.push(z);
    if (sk.shape === "protect") {
      let reduction =
        a.hero === 4
          ? a.branch === 0
            ? 0.18
            : 0.12
          : a.branch === 2
            ? 0.14
            : 0.08;
      for (const ally of this.allies(a, point, sk.radius)) {
        ally.buffs.push({
          end: z.end,
          reduction,
          ccResistance: a.hero === 4 ? 0.15 : 0,
          stats: {},
        });
        if (a.hero === 5)
          this.shield(ally, 120 + 0.1 * this.getStats(a).hp, 6, a);
        if (a.hero === 4 && a.branch === 0) z.heal = 20;
      }
    }
    if (a.hero === 10 && a.branch === 2 && k === 3)
      for (const ally of this.allies(a, point, sk.radius))
        ally.immuneCC = this.time + 1;
  }
  resonance(a, t, k, point) {
    for (const z of this.zones) {
      if (
        z.owner === a ||
        z.owner.team !== a.team ||
        realmOf(z) !== realmOf(a) ||
        realmOf(z.owner) !== realmOf(z) ||
        R.distance(t, z.point) > z.sk.radius ||
        z.comboCd > this.time
      )
        continue;
      if (a.hero === 3 && z.tag === "vine") {
        this.damage(a, t, 95, "magic");
        this.cc(t, 0.5);
        z.comboCd = this.time + 12;
        this.effect(t.x, t.z, 0xd6ff63, 4, "burst", 0.6, realmOf(t));
        this.emit("message", "Mộc Lôi Cộng Hưởng!");
      }
      if (
        a.hero === 1 &&
        [2, 3].includes(k) &&
        z.tag === "vine" &&
        t.ccUntil > this.time
      ) {
        this.damage(a, t, 110, "physical");
        this.cc(t, 0.6);
        z.comboCd = this.time + 12;
      }
      if (a.hero === 3 && [1, 3].includes(k) && z.tag === "shield") {
        z.owner.buffs.push({ type: "electric", end: z.end, stats: {} });
      }
      if (
        (a.hero === 6 && z.tag === "frost") ||
        (a.hero === 7 && z.tag === "fire")
      ) {
        this.damage(a, t, 130, "true");
        t.blindUntil = this.time + 2.5;
        z.comboCd = this.time + 12;
      }
    }
    if (a.hero === 2 && t.revealUntil > this.time) {
      const f = this.actors.find(
        (b) =>
          b.team === a.team &&
          b.hero === 4 &&
          b.alive &&
          realmOf(b) === realmOf(a),
      );
      if (f) {
        this.buff(a, { speed: this.getStats(a).speed * 0.2 }, 2);
        t.armorBreak = this.getStats(t).armor * 0.25;
        t.armorBreakUntil = this.time + 1;
      }
    }
  }
  makeDrop(x, z, items = [], tb = 0, team = null, lock = 0, essence = 0) {
    const d = {
      id: this.nextId++,
      realm: this.currentLootRealm ?? this.player?.realm ?? 0,
      x,
      z,
      items,
      tb,
      essence,
      team,
      unlock: this.time + lock,
    };
    this.drops.push(d);
    return d;
  }
  kill(t, source, reason = "damage") {
    if (!t.alive) return;
    const previousRealm = this.currentLootRealm;
    this.currentLootRealm = t.realm ?? 0;
    try {
      if (
        t.kind === "hero" &&
        this.teamSize > 1 &&
        !t.downedUntil &&
        this.actors.some(
          (a) => a !== t && a.team === t.team && a.alive && !a.downedUntil,
        )
      ) {
        t.hp = 1;
        t.downedUntil = this.time + 25;
        t.downSource = source;
        return;
      }
      if (t.channel) this.cancelExtraction(t);
      t.alive = false;
      t.hp = 0;
      t.channel = null;
      if (t.kind === "clone") {
        if (t.owner.branch === 2 && reason === "damage")
          for (const a of this.actors)
            if (this.enemies(t.owner, a) && R.distance(a, t) < 2) {
              this.damage(
                t.owner,
                a,
                70 + 0.4 * this.getStats(t.owner).atk,
                "physical",
              );
              a.blindUntil = this.time + 0.8;
            }
        return;
      }
      if (t.kind === "hero") {
        const result = R.deathSettlement(t);
        this.makeDrop(t.x, t.z, result.dropped, result.earned, source.team, 12);
        if (t === this.player) {
          this.profile.tb += result.refund;
          this.profile.stash.push(...result.saved);
          this.finish("death", "Hồn tán · Chiến lợi phẩm đã rơi", result);
        } else {
          t.wallet = { brought: 0, earned: 0 };
          t.bag = [];
          t.gear = [];
        }
        if (source.kind === "hero") {
          source.kills++;
          if (source.items.includes(2))
            this.heal(source, this.getStats(source).hp * 0.08);
          if (source.hero === 2 && source.branch === 1) source.cooldowns[2] = 0;
          this.reward(source, 40, 20);
        }
      } else {
        const boss = t.boss,
          tb = boss
            ? boss.tb
            : t.mutant
              ? rnd(90, 120)
              : t.tier
                ? rnd(45, 70)
                : rnd(15, 25),
          ess = boss ? boss.ess : t.mutant ? 100 : t.tier ? 55 : 20;
        if (boss) {
          const total = Object.values(t.contributions).reduce(
            (x, y) => x + y,
            0,
          );
          for (const [id, damage] of Object.entries(t.contributions)) {
            const a = this.actors.find((a) => a.id === Number(id));
            if (a)
              this.reward(
                a,
                (tb * 0.4 * damage) / total,
                (ess * 0.4 * damage) / total,
              );
          }
          const items =
            boss.key === "dragon"
              ? [R.loot("bone", 7), R.loot("weapon", 3)]
              : boss.key === "ape"
                ? [R.loot("ring", 6), R.loot("weapon")]
                : [R.loot("bone", 2), R.loot("ring", 9)];
          this.makeDrop(t.x, t.z, items, tb * 0.6, source.team, 12, ess * 0.6);
        } else {
          this.reward(source, Math.floor(tb), ess, t);
          const items = [];
          if (t.mutant || Math.random() < (t.tier ? 0.4 : 0))
            items.push(R.loot("ring", 1 + Math.floor(Math.random() * 12)));
          if (Math.random() < 0.15) items.push(R.loot("material"));
          if (Math.random() < 0.12) items.push(R.loot("fragment"));
          let team = t.mutant ? source.team : null,
            lock = t.mutant ? 10 : 0;
          if (t.tier && !t.mutant) {
            const total = Object.values(t.contributions).reduce(
                (x, y) => x + y,
                0,
              ),
              best = Object.entries(t.contributions).find(
                ([, n]) => n > total * 0.5,
              );
            if (best) {
              team = this.actors.find((a) => a.id === Number(best[0]))?.team;
              lock = 8;
            }
          }
          if (items.length) this.makeDrop(t.x, t.z, items, 0, team, lock);
          t.respawnAt = t.tide ? 0 : this.time + 90;
        }
        if (
          t.mark &&
          t.mark.end > this.time &&
          source.team !== t.mark.owner.team
        ) {
          if (this.support(source, 6)) {
            this.siphons.push({
              type: "counter",
              owner: source,
              victim: t.mark.owner,
              end: this.time + 120,
              total: 0,
            });
            this.emit(
              "message",
              "Đối Sinh phá ấn: chỉ hút TB mới kiếm, trần 150.",
            );
          } else
            this.siphons.push({
              type: "essence",
              owner: t.mark.owner,
              victim: source,
              end: this.time + 120,
              total: 0,
            });
        }
        if (source.items?.includes(2))
          this.heal(source, this.getStats(source).hp * 0.02);
      }
      this.effect(t.x, t.z, 0xffd794, 2, "burst", 0.7, realmOf(t));
    } finally {
      this.currentLootRealm = previousRealm;
    }
  }
  reward(a, tb, ess, beast = null) {
    if (a.kind !== "hero") return;
    a.wallet.earned += tb;
    for (const f of this.siphons)
      if (f.victim === a && f.end > this.time && f.owner.alive) {
        if (f.type === "counter") {
          let n = R.siphonCounter(a.wallet, f, tb, this.time);
          f.owner.wallet.earned += n;
        } else {
          let n = ess * 0.1;
          ess -= n;
          f.owner.essence += n;
        }
      }
    if (beast && this.support(a, 11) && this.time <= 300) ess *= 1.12;
    a.essence += ess;
    a.level = Math.min(10, 1 + Math.floor(a.essence / 100));
  }
  pickupSelected(uid, a = this.player) {
    if (typeof uid !== "string" || !uid.length) return false;
    return this.pickup(a, [uid]);
  }
  pickup(a = this.player, selectedUIDs = null) {
    const selected = selectedUIDs === null ? null : new Set(selectedUIDs);
    let d = this.drops
      .filter(
        (d) =>
          realmOf(d) === realmOf(a) &&
          R.distance(d, a) < 3 &&
          (!selected || d.items.some((i) => selected.has(i.uid))),
      )
      .sort((x, y) => R.distance(x, a) - R.distance(y, a))[0];
    if (!d) return false;
    if (d.team !== null && d.team !== a.team && d.unlock > this.time) {
      if (a === this.player)
        this.emit(
          "message",
          `Hòm ưu tiên đội kết liễu: ${Math.ceil(d.unlock - this.time)}s`,
        );
      return false;
    }
    this.reward(a, d.tb, d.essence);
    d.tb = d.essence = 0;
    let blocked = false;
    d.items = d.items.filter((item) => {
      if (selected && !selected.has(item.uid)) return true;
      const added = R.addLoot(a, item);
      if (!added) blocked = true;
      return !added;
    });
    if (blocked && a === this.player)
      this.emit("message", "Túi đầy: tối đa 24 ô / 48 điểm tải.");
    if (!d.items.length) this.drops.splice(this.drops.indexOf(d), 1);
    if (
      a.bag.some(
        (i) =>
          (i.id === 7 && i.kind === "bone") ||
          (i.id === 3 && i.kind === "weapon"),
      )
    )
      a.wantedUntil = this.time + 60;
    if (
      a.bag
        .filter((i) => i.kind === "fragment")
        .reduce((n, i) => n + (i.count ?? 1), 0) >= 3
    ) {
      let n = 3;
      for (let i = a.bag.length - 1; i >= 0 && n; i--)
        if (a.bag[i].kind === "fragment") {
          n--;
          a.bag.splice(i, 1);
        }
      this.makeDrop(a.x + 6, a.z + 6, [R.loot("ring", 9)], 150);
      if (a === this.player)
        this.emit(
          "message",
          "Ba Tàn Đồ mở tọa độ kho báu: rương xuất hiện gần bạn.",
        );
    }
    return true;
  }
  nearShop(a = this.player) {
    const fixed = this.shopPoints.find((p) => R.distance(a, p) < 6);
    if (fixed) return { point: fixed, merchant: false };
    const m = this.merchants.find((p) => R.distance(a, p) < 6);
    return m ? { point: m, merchant: true } : null;
  }
  shop(action, index) {
    if (!this.nearShop())
      throw Error("Hãy đến gần Đài Giao Dịch hoặc Thương Nhân (6m)");
    if (!this.player.alive || this.player.channel)
      throw Error("Không thể giao dịch lúc này");
    const a = this.player,
      old = this.getStats(a).hp;
    if (action === "buy") R.buy(a, index, this.nearShop().merchant);
    if (action === "sell") R.sell(a, index);
    if (action === "craft") R.craft(a, index);
    if (action === "dismantle") R.dismantle(a, index);
    a.hp = Math.min(
      this.getStats(a).hp,
      a.hp + Math.max(0, this.getStats(a).hp - old),
    );
  }
  useSupport(index) {
    const a = this.player,
      c = a.supports[index];
    if (!c || !a.alive || a.downedUntil) return;
    if (c.cd > this.time)
      throw Error(`Đang hồi ${Math.ceil(c.cd - this.time)}s`);
    const id = c.id,
      limits = {
        2: c.tier === 2 ? 3 : 2,
        3: 1,
        7: 3,
        8: 1,
        9: 2,
        12: 1,
        14: 1,
        15: 2,
        16: 1,
        17: 1,
      };
    if (!(id in limits)) throw Error("Trợ phẩm nội tại: tự động áp dụng");
    if (c.used >= limits[id]) throw Error("Đã dùng hết lượt");
    if (id === 17) {
      this.emit("sendPanel");
      return;
    }
    if (id === 3) {
      const t = this.actors
        .filter(
          (t) =>
            t.alive &&
            (t.kind === "boss" || (t.kind === "beast" && t.tier)) &&
            R.distance(a, t) < 10,
        )
        .sort((x, y) => R.distance(a, x) - R.distance(a, y))[0];
      if (!t) throw Error("Cần tinh anh hoặc Boss trong 10m");
      t.mark = { owner: a, end: this.time + 90, hidden: c.tier === 2 };
      this.effect(t.x, t.z, 0xdebaff, 2, "ring", 2, realmOf(t));
    }
    if (id === 2) {
      for (const t of this.actors)
        if (t.channel && R.distance(a, t) < (c.tier === 2 ? 115 : 85))
          t.revealUntil = this.time + (c.tier === 2 ? 3.5 : 2.5);
      a.scanUntil = this.time + 3.5;
    }
    if (id === 7) {
      a.beastScanUntil = this.time + 10;
      c.cd = this.time + 60;
    }
    if (id === 8) a.noBeastUntil = this.time + 25;
    if (id === 9) {
      for (const t of this.actors)
        if (t.mark && R.distance(a, t) < 15) t.mark = null;
    }
    if (id === 12) {
      this.buff(a, { speed: this.getStats(a).speed * 0.08 }, 15);
      a.pathUntil = this.time + 15;
    }
    if (id === 14) {
      a.dots = [];
      this.heal(a, 80);
    }
    if (id === 15) a.treasureScanUntil = this.time + 20;
    if (id === 16) {
      a.slowUntil = 0;
      a.noSlowUntil = this.time + 2;
    }
    c.used++;
    this.emit(
      "message",
      `${c.id === 3 ? "Đã khắc ấn" : "Đã kích hoạt"} · ${id}`,
    );
  }
  activateBone() {
    const a = this.player;
    if (!a.bones.includes(7)) throw Error("Chưa trang bị Bát Chu Mâu");
    if ((a.boneActiveCd ?? 0) > this.time) throw Error("Bát Chu Mâu đang hồi");
    a.boneActiveCd = this.time + 60;
    for (const t of this.actors)
      if (this.enemies(a, t) && R.distance(a, t) <= 4) {
        let n = this.damage(a, t, t.hp * 0.1, "magic");
        this.heal(a, n);
      }
    this.effect(a.x, a.z, 0xd999ff, 4, "burst", 0.6, realmOf(a));
  }
  activateItem() {
    const a = this.player;
    if (!a.items.includes(28)) throw Error("Chưa có Thất Tinh Trận Bàn");
    if ((a.starCd ?? 0) > this.time) throw Error("Trận Bàn đang hồi");
    a.starCd = this.time + 60;
    for (const t of this.allies(a, a, 4)) {
      let s = this.getStats(t);
      this.buff(t, { armor: s.armor * 0.1, resist: s.resist * 0.1 }, 8);
      t.extractSpeedUntil = this.time + 8;
    }
    this.effect(a.x, a.z, 0xe8bf70, 4, "ring", 8, realmOf(a));
  }
  equipRing(uid, slot) {
    const a = this.player,
      i = a.bag.find((i) => i.uid === uid);
    if (!i || i.kind !== "ring" || !R.ringCompatible(a.hero, i.id, slot))
      throw Error("Sai Tag hoặc sai khe Hồn hoàn");
    if (!SHRINES.some((s) => R.distance(s, a) < 4))
      throw Error("Cần đứng cạnh Tế Đàn Hồn Hoàn");
    if (a.channel || a.absorb) throw Error("Đang Hồi Hoàn hoặc hấp thu");
    a.absorb = { uid, slot, time: 0, origin: { x: a.x, z: a.z } };
  }
  beginExtraction(mode = "exit", selected = []) {
    const a = this.player;
    if (a.channel || !a.alive || a.downedUntil || a.absorb)
      throw Error("Không thể Hồi Hoàn lúc này");
    const gate = this.gates.find(
      (g) => g.end > this.time && R.distance(g, a) <= 3.5,
    );
    if (!gate) throw Error("Cần đứng trong 3,5m của Cổng đang mở");
    if (!["exit", "send"].includes(mode))
      throw Error("Chế độ Hồi Hoàn không hợp lệ");
    const charm = this.support(a, 17);
    if (mode === "send" && (!charm || charm.used))
      throw Error("Cần Hoãn Nhân Hồi chưa dùng");
    let packageItems =
      mode === "send"
        ? [...a.bag, ...a.gear].filter((i) => selected.includes(i.uid))
        : [...a.bag, ...a.gear];
    let w = R.weight(packageItems);
    if (w > 48)
      throw Error("Gói chuyển vượt 48 điểm tải; hãy gửi một phần trước");
    const tier = this.support(a, 18)?.tier ?? 0;
    const pending =
      mode === "send" ? a.gear.filter((i) => selected.includes(i.uid)) : [];
    // Keep detached items in channel escrow; cancellation restores exact instances.
    if (mode === "send") {
      a.gear = a.gear.filter((i) => !selected.includes(i.uid));
      for (const i of pending) {
        if (i.kind === "ring")
          a.rings = a.rings.map((id) => (id === i.id ? 0 : id));
        if (i.kind === "bone") a.bones = a.bones.filter((id) => id !== i.id);
      }
    }
    a.channel = {
      mode,
      gate,
      items: packageItems,
      escrow: pending,
      total: R.extractionTime(w, tier),
      elapsed: 0,
      paused: 0,
      outside: 0,
      started: this.time,
    };
    this.emit("message", `Hồi Hoàn ${w}W · ${a.channel.total.toFixed(1)} giây`);
  }
  cancelExtraction(a = this.player) {
    const c = a.channel;
    if (!c) return;
    for (const i of c.escrow) {
      a.gear.push(i);
      if (i.kind === "ring") a.rings[RINGS[i.id - 1].slot - 1] = i.id;
      if (i.kind === "bone") a.bones.push(i.id);
    }
    a.channel = null;
    if (a === this.player)
      this.emit("message", "Đã hủy Hồi Hoàn; trang bị ký gửi được hoàn lại.");
  }
  completeExtraction(a) {
    const c = a.channel;
    if (!c || !a.alive) return;
    const ids = new Set(c.items.map((i) => i.uid));
    if (a === this.player) {
      this.profile.stash.push(...c.items);
      this.profile.tb += a.wallet.earned;
      a.wallet.earned = 0;
      if (c.mode === "exit") {
        this.profile.tb += a.wallet.brought;
        a.wallet.brought = 0;
        const val = c.items.reduce((n, i) => n + i.value * (i.count ?? 1), 0);
        const tier = this.support(a, 4)?.tier ?? 0,
          bonus = R.appraise(val, tier) - val;
        this.profile.tb += bonus;
        this.finish("extracted", "Hồi Hoàn thành công", { value: val, bonus });
      } else {
        const charm = this.support(a, 17);
        charm.used = 1;
        a.immuneUntil = this.time + 2;
        this.emit(
          "message",
          "Đồ và thu nhập đã về Hồn Thành. Bạn tiếp tục chiến đấu!",
        );
        this.emit("save");
      }
    }
    a.bag = a.bag.filter((i) => !ids.has(i.uid));
    a.gear = a.gear.filter((i) => !ids.has(i.uid));
    a.channel = null;
    if (c.mode === "exit") {
      a.extracted = true;
      a.alive = false;
    }
  }
  finish(type, title, details = {}) {
    if (this.result) return;
    this.result = {
      type,
      title,
      details,
      time: this.time,
      kills: this.player.kills,
    };
    this.profile.matches++;
    this.profile.record.unshift({
      title,
      value: details.value ?? 0,
      kills: this.player.kills,
      time: Date.now(),
    });
    this.profile.record = this.profile.record.slice(0, 10);
    this.emit("save");
    this.emit("end", this.result);
  }
  setTime(t) {
    this.time = R.clamp(t, 0, 1319);
    this.updateGates();
  }
  updateGates() {
    const wave = R.gateWave(this.time);
    if (this.debugGateEnd > this.time) return;
    if (wave !== this.wave) {
      this.wave = wave;
      this.gates = wave
        ? (wave === 4
            ? [
                { x: -10, z: 0 },
                { x: 10, z: 0 },
                { x: 0, z: 14 },
              ]
            : randomGatePositions(wave)
          ).map((p, i) => ({
            ...p,
            id: i,
            end: (wave === 4 ? 1200 : wave * 300) + 120,
          }))
        : [];
      if (wave)
        this.emit(
          "message",
          `Đợt Cổng ${wave}: ${this.gates.length} Cổng mở 120 giây`,
        );
    }
  }
  openDebugGates() {
    this.debugGateEnd = this.time + 120;
    this.gates = GATE_POS.map((p, i) => ({
      ...p,
      id: i,
      end: this.debugGateEnd,
    }));
    this.emit("message", "Sandbox: mở 5 Cổng trong 120 giây");
  }
  teleport(place) {
    const a = this.player;
    if (a.channel) this.cancelExtraction();
    const p =
      place === "gate"
        ? (this.gates.find((g) => g.end > this.time) ??
          (this.openDebugGates(), this.gates[0]))
        : place === "shop"
          ? this.shopPoints[5]
          : place === "shrine"
            ? SHRINES[2]
            : place === "boss"
              ? { x: -52, z: -44 }
              : REGIONS[6];
    a.x = p.x;
    a.z = p.z;
    a.realm = place === "realm" ? 1 : 0;
    this.zones = this.zones.filter(
      (zone) => zone.owner !== a || realmOf(zone) === realmOf(a),
    );
    this.projectiles = this.projectiles.filter(
      (projectile) =>
        projectile.owner !== a || realmOf(projectile) === realmOf(a),
    );
    if (place === "realm" && this.time < 600) this.setTime(600);
    a.immuneUntil = this.time + 3;
  }
  step(dt, input = { x: 0, z: 0, attack: false }) {
    if (this.result) return;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= 1 / 30) {
      this.fixed(1 / 30, input);
      this.acc -= 1 / 30;
    }
  }
  fixed(dt, input) {
    this.time += dt;
    this.tick++;
    // A persistent cast belongs to its creation realm, never its owner's new one.
    this.zones = this.zones.filter(
      (zone) => realmOf(zone) === realmOf(zone.owner),
    );
    this.projectiles = this.projectiles.filter(
      (projectile) => realmOf(projectile) === realmOf(projectile.owner),
    );
    this.updateGates();
    this.advanceWorld(dt);
    this.player.targetMode = input.targetMode ?? "auto";
    this.move(this.player, input.x, input.z, dt);
    if (input.attack) this.attack(this.player);
    this.merchants.forEach((m, i) => {
      m.x = Math.sin(this.time * 0.025 + i * Math.PI) * 35;
      m.z = Math.cos(this.time * 0.025 + i * Math.PI) * 12;
    });
    for (const spec of [
      {
        key: "ape",
        at: 480,
        name: "Thái Nhạc Cự Viên",
        x: -52,
        z: -44,
        hp: 7000,
        tb: 180,
        ess: 200,
      },
      {
        key: "dragon",
        at: 600,
        name: "Hư Không Cổ Long",
        x: 82,
        z: 0,
        hp: 9500,
        tb: 250,
        ess: 300,
      },
      {
        key: "kirin",
        at: 840,
        name: "Lôi Diễm Kỳ Lân",
        x: -53,
        z: 47,
        hp: 8500,
        tb: 220,
        ess: 250,
      },
    ])
      if (
        this.time >= spec.at &&
        !this.bosses.has(spec.key) &&
        (spec.key !== "dragon" || this.seals >= 2)
      ) {
        this.bosses.add(spec.key);
        this.spawnBeast(2, spec.x, spec.z, spec);
        this.emit("message", `${spec.name} đã xuất hiện!`);
      }
    for (const a of this.actors) {
      if (!a.alive) {
        if (
          a.respawnAt &&
          this.time > a.respawnAt &&
          a.respawns < (a.tier ? 3 : 99)
        ) {
          a.alive = true;
          a.hp = a.maxHp;
          a.x = a.home.x;
          a.z = a.home.z;
          a.respawnAt = 0;
          a.respawns++;
          a.contributions = {};
        }
        continue;
      }
      if (a.extracted) continue;
      a.now = this.time;
      for (let i = 0; i < a.cooldowns.length; i++)
        a.cooldowns[i] = Math.max(0, a.cooldowns[i] - dt);
      a.buffs = a.buffs.filter((b) => b.end > this.time);
      if (a.stackEnd < this.time) a.stacks = 0;
      this.expireShields(a);
      if (a.kind === "hero") {
        const s = this.getStats(a);
        a.hp = Math.min(a.hp, s.hp);
        a.mp = Math.min(s.mp, a.mp + s.regen * dt);
        if (R.distance(a, a.anchor) < 3) a.stationary += dt;
        else {
          a.stationary = 0;
          a.anchor = { x: a.x, z: a.z };
        }
        const region = this.region(a);
        if (this.time > 480 && region < 5 && this.time > 480 + region * 100)
          this.damage(
            {
              kind: "beast",
              atk: 0,
              hero: 0,
              team: -1,
              buffs: [],
              now: this.time,
            },
            a,
            (this.time > 960 ? 14 : 5) * dt,
            "true",
          );
        if (a.downedUntil) {
          if (this.time > a.downedUntil) {
            this.kill(a, a.downSource);
            continue;
          }
          const friend = this.actors.find(
            (t) =>
              t !== a &&
              t.alive &&
              !t.downedUntil &&
              t.team === a.team &&
              R.distance(t, a) < 2.5,
          );
          if (friend) {
            a.revive += dt;
            if (a.revive >= 4) {
              a.downedUntil = 0;
              a.revive = 0;
              a.hp = s.hp * 0.3;
              a.immuneUntil = this.time + 1;
            }
          } else a.revive = 0;
        }
      }
      for (const d of a.dots)
        if (d.next <= this.time + 1e-8 && d.next <= d.end + 1e-8) {
          d.next += 1;
          this.damage(d.source, a, d.raw, d.type);
        }
      a.dots = a.dots.filter(
        (d) => d.end > this.time || d.next <= d.end + 1e-8,
      );
      if (a.kind === "clone") {
        this.move(a, a.dir.x, a.dir.z, dt);
        if (this.time > a.expires) this.kill(a, a.owner, "expired");
        continue;
      }
      if (a !== this.player && a.ai !== false && a.alive && !a.downedUntil)
        this.updateTieredAI(a,dt);
      if (a.channel) {
        const c = a.channel;
        if (R.distance(a, c.gate) > 3.5) c.outside += dt;
        else c.outside = 0;
        if (c.outside > 0.8) {
          this.cancelExtraction(a);
        } else {
          let pause = a.ccUntil > this.time && c.paused < 3;
          if (pause) c.paused = Math.min(3, c.paused + dt);
          else c.elapsed += dt * (a.extractSpeedUntil > this.time ? 1.05 : 1);
          if (c.elapsed >= c.total) this.completeExtraction(a);
        }
      }
      if (a.absorb) {
        if (R.distance(a, a.absorb.origin) > 0.8 || a.ccUntil > this.time)
          a.absorb = null;
        else if ((a.absorb.time += dt) >= 8) {
          let item = a.bag.find((i) => i.uid === a.absorb.uid);
          if (item) {
            const slot = a.absorb.slot,
              old = a.gear.find(
                (i) => i.kind === "ring" && i.id === a.rings[slot - 1],
              );
            a.bag = a.bag.filter((i) => i.uid !== item.uid);
            if (old) {
              a.gear = a.gear.filter((i) => i !== old);
              a.bag.push(old);
            }
            a.rings[slot - 1] = item.id;
            a.gear.push(item);
            this.emit("message", "Hấp thu Hồn hoàn hoàn tất.");
          }
          a.absorb = null;
        }
      }
    }
    for (const p of this.projectiles) {
      if (p.startAt > this.time) continue;
      const step = Math.min(p.remaining, p.speed * dt),
        origin = { x: p.x, z: p.z };
      p.x += p.dir.x * step;
      p.z += p.dir.z * step;
      p.remaining -= step;
      for (const t of this.actors) {
        if (!this.enemies(p.owner, t) || p.hit.has(t.id)) continue;
        const dx = t.x - origin.x,
          dz = t.z - origin.z,
          along = dx * p.dir.x + dz * p.dir.z,
          side = Math.abs(dx * p.dir.z - dz * p.dir.x);
        if (along >= -0.4 && along <= step + 0.4 && side < 0.8) {
          p.hit.add(t.id);
          if (p.owner.hero === 6) {
            this.skillHit(
              p.owner,
              p.k,
              { ...p.sk, shape: "circle", radius: 1.8 },
              { x: t.x, z: t.z },
              p.dir,
            );
            p.remaining = 0;
            break;
          }
          this.skillHit(p.owner, p.k, p.sk, { x: t.x, z: t.z }, p.dir, [t]);
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.remaining > 0);
    for (const z of this.zones) {
      if (!z.wall && z.next <= this.time && (z.delayed || z.end > this.time)) {
        if (z.delayed) {
          this.skillHit(z.owner, z.k, z.sk, z.point, z.dir);
          z.next = Infinity;
        } else {
          z.next += 1;
          if (["healzone"].includes(z.sk.shape)) {
            for (const ally of this.allies(z.owner, z.point, z.sk.radius))
              this.heal(
                ally,
                z.sk.base + z.sk.scale * this.getStats(z.owner).power,
                z.owner,
              );
          } else if (z.sk.shape !== "protect")
            this.skillHit(
              z.owner,
              z.k,
              { ...z.sk, shape: "circle" },
              z.point,
              z.owner.dir,
            );
          if (z.heal)
            for (const ally of this.allies(z.owner, z.point, z.sk.radius))
              this.heal(ally, z.heal, z.owner);
          if (z.owner.hero === 0 && z.owner.branch === 2 && z.k === 2)
            for (const ally of this.allies(z.owner, z.point, z.sk.radius))
              this.heal(
                ally,
                28 + 0.15 * this.getStats(z.owner).power,
                z.owner,
              );
          if (z.owner.rings?.includes(3) && z.k === 2)
            for (const ally of this.allies(z.owner, z.point, z.sk.radius))
              this.heal(ally, 25, z.owner);
          if (z.owner.hero === 7 && z.owner.branch === 2 && z.k === 1)
            for (const ally of this.allies(z.owner, z.point, z.sk.radius)) {
              ally.noSlowUntil = this.time + 1.1;
              this.buff(ally, { armor: 15, resist: 15 }, 1.1);
            }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.end > this.time);
    this.effects = this.effects.filter((e) => e.end > this.time);
    if (this.tick % 60 === 0)
      this.actors = this.actors.filter(
        (a) =>
          a.kind !== "clone" || a.alive || this.time - (a.expires ?? 0) < 2,
      );
    this.siphons = this.siphons.filter((f) => f.end > this.time);
    if (this.tick % 30 === 0 && !this.result) {
      const teams = new Set(
        this.actors
          .filter((a) => a.kind === "hero" && a.alive && !a.extracted)
          .map((a) => a.team),
      );
      if (teams.size === 1 && teams.has(0) && this.time < 1320 - 1e-7) {
        this.player.channel = {
          mode: "exit",
          items: [...this.player.bag, ...this.player.gear],
          escrow: [],
        };
        this.completeExtraction(this.player);
        if (this.result) this.result.title = "Thiên Đạo Hồi Hoàn";
      }
    }
    if (this.time >= 1320 - 1e-7 && !this.result)
      for (const a of this.actors)
        if (
          a.kind === "hero" &&
          a.alive &&
          !a.extracted &&
          !(a.channel && a.channel.started < 1320)
        ) {
          a.downedUntil = this.time - 1;
          this.kill(a, { team: -1, kind: "beast" });
        }
  }
  region(a) {
    let best = 5,
      dist = Infinity;
    REGIONS.forEach((r, i) => {
      let d = R.distance(a, r);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }
  updateTieredAI(a,dt){
    const far=this.performanceTiering&&a.kind!=='boss'&&!a.channel&&((a.realm??0)!==(this.player.realm??0)||(a.x-this.player.x)**2+(a.z-this.player.z)**2>1600);
    if(!far){farAiSteering.delete(a);this.ai(a,dt);return;}
    let steering=farAiSteering.get(a);
    if(!steering||this.time>=steering.next){
      const x=a.x,z=a.z;this.ai(a,dt);
      const dx=a.x-x,dz=a.z-z,n=Math.hypot(dx,dz);
      steering={next:this.time+.25,x:n>.00001?dx/n:0,z:n>.00001?dz/n:0};farAiSteering.set(a,steering);
    }else if(steering.x||steering.z)this.move(a,steering.x,steering.z,dt);
  }
  ai(a, dt) {
    if (a.channel) return;
    let t = this.nearest(
      a,
      a.kind === "hero" ? 16 : a.kind === "boss" ? 12 : 8,
    );
    if (a.kind !== "hero") {
      if (t?.noBeastUntil > this.time) t = null;
      if (t) {
        let d = R.distance(a, t);
        if (d > a.range) this.move(a, t.x - a.x, t.z - a.z, dt);
        else this.attack(a);
        if ((a.mutant || a.boss) && this.tick % 120 === a.id % 120) {
          for (const v of this.actors)
            if (this.enemies(a, v) && R.distance(a, v) < 4)
              this.damage(a, v, a.atk * 1.4, "magic");
          this.effect(a.x, a.z, 0xff877e, 4, "warning", 1, realmOf(a));
        }
      } else if (R.distance(a, a.home) > 1)
        this.move(a, a.home.x - a.x, a.home.z - a.z, dt);
      return;
    }
    const down = this.actors.find(
      (t) =>
        t !== a &&
        t.team === a.team &&
        t.alive &&
        t.downedUntil &&
        R.distance(a, t) < 35,
    );
    if (down) {
      if (R.distance(a, down) > 2) this.move(a, down.x - a.x, down.z - a.z, dt);
      return;
    }
    if (t) {
      const s = this.getStats(a),
        d = R.distance(a, t);
      if (a.hp < s.hp * 0.25 && a.cooldowns[4] === 0) {
        a.dir = { x: (a.x - t.x) / d, z: (a.z - t.z) / d };
        this.cast(a, 4);
      } else if (d > s.range * 0.8) this.move(a, t.x - a.x, t.z - a.z, dt);
      else if (s.range > 4 && d < 3) this.move(a, a.x - t.x, a.z - t.z, dt);
      this.attack(a);
      if (this.tick % 12 === a.id % 12) {
        const k = Math.floor(Math.random() * 4);
        this.cast(a, k);
      }
      return;
    }
    if (this.tick % 20 === a.id % 20) {
      this.pickup(a);
      const shop = this.nearShop(a);
      if (shop && a.wallet.earned >= 100 && a.items.length < 7) {
        try {
          R.buy(a, pick([1, 5, 9, 13, 17, 21]));
        } catch {}
      }
    }
    if (!a.goal || R.distance(a, a.goal) < 2) {
      if (a.team === 0)
        a.goal = {
          x: this.player.x + rnd(-4, 4),
          z: this.player.z + rnd(-4, 4),
        };
      else if (this.gates.length && this.time > 320 && Math.random() < 0.2)
        a.goal = pick(this.gates);
      else a.goal = { x: rnd(-80, 80), z: rnd(-78, 78) };
    }
    this.move(a, a.goal.x - a.x, a.goal.z - a.z, dt);
    if (
      this.gates.some((g) => g.end > this.time && R.distance(g, a) < 3.5) &&
      a.team !== 0 &&
      this.time > 320
    ) {
      const gate = this.gates.find((g) => R.distance(g, a) < 3.5);
      a.channel = {
        mode: "exit",
        gate,
        items: [...a.bag, ...a.gear],
        escrow: [],
        total: R.extractionTime(Math.min(48, R.weight(a.bag))),
        elapsed: 0,
        paused: 0,
        outside: 0,
      };
    }
  }
}

Object.assign(Match.prototype, AdvancedMethods);
Match.restore = function (snapshot, emit = () => {}) {
  const data = decodeGraph(snapshot),
    match = Object.assign(Object.create(Match.prototype), data);
  match.emit = emit;
  for (const a of match.actors)
    if (a.kind === "hero")
      Object.defineProperty(a, "branch", {
        value: a.branch,
        writable: false,
        configurable: false,
      });
  return match;
};
