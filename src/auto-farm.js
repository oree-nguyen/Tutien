import { HEROES, ITEMS, RECIPES, REGIONS, RINGS, SHRINES } from "./data.js";
import {
  distance,
  mismatch,
  ringCompatible,
  skillFor,
  weight,
} from "./rules.js";
import {
  NAV_OBSTACLES,
  canSee,
  infected,
  realmOf,
  safePath,
  segmentTouchesCircle,
} from "./systems.js";

export const AUTO_FARM_PRESETS = Object.freeze(
  [
    [5, 17, 11, 18, 19, 21, 20],
    [1, 2, 3, 10, 12, 27, 4],
    [1, 2, 3, 13, 14, 15, 4],
    [5, 6, 7, 8, 13, 14, 25],
    [21, 22, 23, 24, 9, 11, 25],
    [9, 10, 11, 12, 21, 22, 24],
    [5, 6, 7, 8, 14, 18, 23],
    [5, 6, 7, 18, 17, 19, 11],
    [1, 3, 4, 13, 14, 25, 27],
    [1, 2, 4, 10, 13, 14, 12],
    [21, 22, 23, 24, 5, 11, 28],
    [5, 6, 7, 8, 15, 26, 17],
  ].map((ids) => Object.freeze(ids)),
);

export const AUTO_FARM_CONFIG = Object.freeze({
  useSkills: true,
  allowUltimate: false,
  autoLoot: true,
  autoBuild: true,
  kiting: true,
  avoidDanger: true,
});

// These are skill indices, so branches keep their live GDD-modified statistics.
export const AUTO_FARM_COMBOS = Object.freeze(
  [
    [2, 1, 0],
    [1, 2, 0],
    [0, 1],
    [1, 0, 2],
    [1, 0],
    [1, 2, 0],
    [1, 0],
    [1, 0],
    [0, 2],
    [2, 1, 0],
    [2, 0, 1],
    [1, 0],
  ].map((indices) => Object.freeze(indices)),
);

const ZERO_INPUT = Object.freeze({
  x: 0,
  z: 0,
  attack: false,
  targetMode: "auto",
});
const finitePoint = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const unit = (x, z) => {
  const length = Math.hypot(x, z);
  return length > 1e-7 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
};
const alive = (a) => a?.alive && !a.extracted && !a.downedUntil;
const money = (a) => (a.wallet?.brought ?? 0) + (a.wallet?.earned ?? 0);

export function autoLootPriority(item) {
  if (item.kind === "bone") return 6;
  if (item.kind === "weapon") return 5;
  if (item.kind === "ring") return RINGS[item.id - 1]?.black ? 4 : 3;
  if (item.kind === "boss") return 2;
  return 1;
}

export function autoFarmUtility(actor, target, stats, mode) {
  const d = distance(actor, target);
  if (target.kind === "boss")
    return mode === "full" &&
      actor.level >= 5 &&
      actor.hp > stats.hp * 0.65 &&
      d <= 40
      ? 540 - d * 7
      : -Infinity;
  if (target.kind !== "beast") return -Infinity;
  if (target.mutant || target.tier >= 1)
    return d <= 35 && actor.hp > stats.hp * 0.5 ? 600 - d * 8 : -Infinity;
  return d <= 40
    ? 400 -
        d * 6 +
        (1 -
          Math.max(0, target.hp) /
            Math.max(1, target.maxHp ?? target.stats?.hp ?? target.hp)) *
          150
    : -Infinity;
}

export function safeAutoBuildPreset(hero) {
  return (AUTO_FARM_PRESETS[hero] ?? []).filter((id) => !mismatch(hero, id));
}

// The controller proposes ordinary input and commands. Match or the server owns
// collision, cooldowns, currency, loot UUIDs, absorption and extraction settlement.
export class AutoFarmAIController {
  constructor({ getMatch, actions, notify = () => {}, now } = {}) {
    if (typeof getMatch !== "function" || typeof actions?.move !== "function")
      throw Error("Auto Farm cần snapshot trận và bộ điều khiển di chuyển");
    this.getMatch = getMatch;
    this.actions = actions;
    this.notify = notify;
    this.mode = "off";
    this.config = { ...AUTO_FARM_CONFIG };
    this.clock = 0;
    this.manualNow = typeof now === "function" ? now : () => this.clock;
    this.nextThink = 0;
    this.resumeAt = 0;
    this.pointers = new Set();
    this.phase = "off";
    this.text = "Thủ công 100%";
    this.target = null;
    this.motion = { ...ZERO_INPUT };
    this.matchRef = null;
    this.commandUntil = new Map();
    this.noticeAt = new Map();
    this.comboTarget = null;
    this.comboIndex = 0;
    this.appraisal = null;
    this.path = [];
    this.pathGoal = null;
    this.pathAt = 0;
    this.patrolIndex = 0;
    this.extractReason = null;
    this.pendingAbsorb = null;
    this.evacuationRouting = false;
    this.lastError = "";
  }

  setMode(mode) {
    if (!["off", "pve", "full"].includes(mode))
      throw Error("Chế độ Auto Farm không hợp lệ");
    this.mode = mode;
    this.target = null;
    this.appraisal = null;
    this.pathGoal = null;
    this.path = [];
    this.nextThink = 0;
    this.extractReason = null;
    this.evacuationRouting = false;
    this.motion = { ...ZERO_INPUT };
    this._phase(
      mode === "off" ? "off" : "patrol",
      mode === "off" ? "Thủ công 100%" : "Đang tìm Hồn thú",
    );
    if (!this.pointers.size) this.actions.move({ ...ZERO_INPUT });
    return this.status();
  }

  reset() {
    // A new HUD has new pointer targets. Contacts owned by the removed HUD
    // must not keep the next match suspended forever after losing capture.
    this.pointers.clear();
    this.resumeAt = this.manualNow();
    this.commandUntil.clear();
    this.noticeAt.clear();
    this.pendingAbsorb = null;
    this.matchRef = null;
    this.comboTarget = null;
    this.comboIndex = 0;
    return this.setMode("off");
  }

  setConfig(partial = {}) {
    for (const key of Object.keys(AUTO_FARM_CONFIG))
      if (Object.hasOwn(partial, key)) {
        if (typeof partial[key] !== "boolean")
          throw Error(`Tùy chỉnh ${key} phải là bật/tắt`);
        this.config[key] = partial[key];
      }
    this.nextThink = 0;
    if (!this.config.autoLoot) this.appraisal = null;
    return this.status();
  }

  manualStart(pointerId) {
    this.pointers.add(pointerId);
    this.motion = { ...ZERO_INPUT };
    this.appraisal = null;
    this.resumeAt = Infinity;
    if (this.mode !== "off") this._phase("manual", "Ưu tiên thao tác tay");
  }

  manualEnd(pointerId) {
    this.pointers.delete(pointerId);
    if (!this.pointers.size) {
      this.resumeAt = this.manualNow() + 1.2;
      this.nextThink = this.clock;
    }
  }

  status() {
    const hero = this.getMatch()?.player?.hero;
    return {
      mode: this.mode,
      config: { ...this.config },
      phase: this.phase,
      text: this.text,
      targetId: this.target?.id ?? null,
      manualPaused:
        this.mode !== "off" &&
        (this.pointers.size > 0 || this.manualNow() < this.resumeAt),
      resumeIn: this.pointers.size
        ? null
        : Math.max(0, this.resumeAt - this.manualNow()),
      manualHint:
        this.mode === "off"
          ? ""
          : "🤖 Đang Auto Săn Hồn Thú — Chạm Joystick để tự điều khiển",
      blockedPresetIds: (AUTO_FARM_PRESETS[hero] ?? []).filter((id) =>
        mismatch(hero, id),
      ),
      appraisal: this.appraisal
        ? {
            uid: this.appraisal.uid,
            name: this.appraisal.name,
            progress: Math.min(1, (this.clock - this.appraisal.start) / 0.8),
          }
        : null,
      lastError: this.lastError,
    };
  }

  update(dt) {
    this.clock += Number.isFinite(dt) ? Math.max(0, Math.min(1, dt)) : 0;
    const match = this.getMatch();
    if (this.mode === "off") return;
    if (this.pointers.size || this.manualNow() < this.resumeAt) return;
    if (match !== this.matchRef) {
      this.matchRef = match;
      this.target = null;
      this.pathGoal = null;
      this.path = [];
      this.pendingAbsorb = null;
      this.commandUntil.clear();
      this.nextThink = 0;
    }
    const actor = match?.player;
    if (!actor || !alive(actor) || match.result) {
      this.motion = { ...ZERO_INPUT };
      this.actions.move({ ...this.motion });
      this._phase("waiting", "Chờ nhân vật sẵn sàng");
      return;
    }
    if (this.pendingAbsorb) {
      const item = actor.bag?.find((i) => i.uid === this.pendingAbsorb.uid);
      if (actor.absorb?.uid === this.pendingAbsorb.uid)
        this.pendingAbsorb.acknowledged = true;
      if (
        !item ||
        this.clock > this.pendingAbsorb.until ||
        (this.pendingAbsorb.acknowledged && !actor.absorb)
      )
        this.pendingAbsorb = null;
    }
    if (actor.channel || actor.absorb || this.pendingAbsorb) {
      this.motion = { ...ZERO_INPUT };
      this.actions.move({ ...this.motion });
      this._phase(
        actor.channel ? "extracting" : "absorbing",
        actor.channel
          ? "Giữ kết giới Hồi Hoàn"
          : "Đang hấp thu Hồn hoàn · 8 giây",
      );
      return;
    }
    if (this.appraisal && this.clock - this.appraisal.start >= 0.8)
      this.nextThink = Math.min(this.nextThink, this.clock);
    if (this.clock >= this.nextThink) {
      this.nextThink = this.clock + 0.25;
      try {
        this._think(match, actor);
      } catch (error) {
        this.lastError = error?.message ?? String(error);
        this.motion = { ...ZERO_INPUT };
        this._phase("waiting", "Đang chờ lệnh hợp lệ từ chiến trường");
        this._notice("error", this.lastError, 5);
      }
    }
    this.actions.move({ ...this.motion });
  }

  _phase(phase, text) {
    this.phase = phase;
    this.text = text;
  }

  _notice(key, text, interval = 5) {
    if (this.clock < (this.noticeAt.get(key) ?? -Infinity)) return;
    this.noticeAt.set(key, this.clock + interval);
    this.notify(text);
  }

  _command(key, seconds, method, ...args) {
    if (
      this.clock < (this.commandUntil.get(key) ?? 0) ||
      typeof this.actions[method] !== "function"
    )
      return false;
    this.commandUntil.set(key, this.clock + seconds);
    try {
      const result = this.actions[method](...args);
      if (result?.catch)
        result.catch((error) => {
          this.lastError = error?.message ?? String(error);
          this._notice(`command-${key}`, this.lastError);
        });
      return result !== false;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this._notice(`command-${key}`, this.lastError);
      return false;
    }
  }

  _stats(match, actor) {
    return actor.stats ?? match.getStats(actor);
  }

  _seen(match, actor, target) {
    return (
      alive(target) &&
      realmOf(target) === realmOf(actor) &&
      !(target.untargetableUntil > match.time) &&
      canSee(match, actor, target)
    );
  }

  _danger(match, actor, point) {
    if (!this.config.avoidDanger) return 0;
    let danger =
      !this.evacuationRouting &&
      infected({ ...point, realm: realmOf(actor) }, match.time)
        ? 20
        : 0;
    for (const zone of match.zones ?? []) {
      if (
        zone.end <= match.time ||
        zone.owner?.team === actor.team ||
        !finitePoint(zone.point)
      )
        continue;
      if (!(zone.sk?.base > 0 || zone.sk?.cc > 0 || zone.wall)) continue;
      const d = distance(point, zone.point),
        r = (zone.sk.radius ?? 0) + 0.65;
      if (d < r) danger += 30 + (r - d) * 5;
    }
    for (const effect of match.effects ?? [])
      if (
        effect.type === "warning" &&
        effect.end > match.time &&
        finitePoint(effect)
      ) {
        const ownWindup = (match.zones ?? []).some(
          (zone) =>
            zone.delayed &&
            zone.owner?.team === actor.team &&
            finitePoint(zone.point) &&
            distance(zone.point, effect) < 0.15 &&
            zone.end >= effect.end,
        );
        if (ownWindup) continue;
        const d = distance(point, effect),
          r = (effect.radius ?? 3) + 0.7;
        if (d < r) danger += 40 + (r - d) * 8;
      }
    return danger;
  }

  _blocked(match, actor, point) {
    if (Math.abs(point.x) > 93.4 || Math.abs(point.z) > 93.4) return true;
    const realmDistance = distance(point, REGIONS[6]);
    if (realmOf(actor) === 1 ? realmDistance > 16.6 : realmDistance < 18.6)
      return true;
    if (
      (match.obstacles ?? NAV_OBSTACLES).some((o) =>
        segmentTouchesCircle(actor, point, o, o.r + 0.5),
      )
    )
      return true;
    return (match.zones ?? []).some(
      (zone) =>
        zone.wall &&
        zone.end > match.time &&
        zone.owner?.team !== actor.team &&
        segmentTouchesCircle(
          actor,
          point,
          zone.point,
          (zone.sk?.radius ?? 0) + 0.45,
        ) &&
        distance(actor, zone.point) > (zone.sk?.radius ?? 0) + 0.45,
    );
  }

  _steer(match, actor, direction) {
    const angle = Math.atan2(direction.z, direction.x);
    let best = null,
      score = Infinity;
    for (const turn of [
      0,
      -Math.PI / 8,
      Math.PI / 8,
      -Math.PI / 4,
      Math.PI / 4,
      -Math.PI / 2,
      Math.PI / 2,
      Math.PI,
    ]) {
      const dir = { x: Math.cos(angle + turn), z: Math.sin(angle + turn) };
      const point = { x: actor.x + dir.x * 1.7, z: actor.z + dir.z * 1.7 };
      if (this._blocked(match, actor, point)) continue;
      const cost =
        Math.abs(turn) * 0.8 + this._danger(match, actor, point) * 10;
      if (cost < score) {
        best = dir;
        score = cost;
      }
    }
    return best ?? { x: 0, z: 0 };
  }

  _navigate(match, actor, goal, stop = 1.1) {
    if (!finitePoint(goal) || distance(actor, goal) <= stop) {
      this.motion = { ...ZERO_INPUT };
      return;
    }
    if (
      !this.pathGoal ||
      distance(this.pathGoal, goal) > 3 ||
      this.clock >= this.pathAt ||
      this.pathRealm !== realmOf(actor)
    ) {
      const navigation = match.obstacles
        ? match
        : { ...match, obstacles: NAV_OBSTACLES };
      this.path = safePath(navigation, actor, goal);
      this.pathGoal = { x: goal.x, z: goal.z };
      this.pathRealm = realmOf(actor);
      this.pathAt = this.clock + 0.8;
    }
    while (this.path.length && distance(actor, this.path[0]) < 1.2)
      this.path.shift();
    let next = this.path[0];
    if (!next && !this._blocked(match, actor, goal)) next = goal;
    this.motion = {
      ...ZERO_INPUT,
      ...(next
        ? this._steer(match, actor, unit(next.x - actor.x, next.z - actor.z))
        : {}),
    };
  }

  _escape(match, actor, threat = null) {
    const center = realmOf(actor) === 1 ? REGIONS[6] : REGIONS[5];
    let best = null,
      score = Infinity;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const point = {
        x: actor.x + Math.cos(angle) * 8,
        z: actor.z + Math.sin(angle) * 8,
      };
      const step = {
        x: actor.x + Math.cos(angle) * 1.7,
        z: actor.z + Math.sin(angle) * 1.7,
      };
      if (this._blocked(match, actor, step)) continue;
      const value =
        this._danger(match, actor, point) * 100 +
        this._danger(match, actor, step) * 20 +
        distance(point, center) * 0.4 -
        (threat ? distance(point, threat) * 2 : 0);
      if (value < score) {
        best = point;
        score = value;
      }
    }
    this.motion = {
      ...ZERO_INPUT,
      ...(best
        ? this._steer(match, actor, unit(best.x - actor.x, best.z - actor.z))
        : {}),
    };
    return best;
  }

  _think(match, actor) {
    this.motion = { ...ZERO_INPUT };
    this.evacuationRouting = false;
    const stats = this._stats(match, actor);
    if (!stats?.hp || !stats?.mp) return;
    const heroes = (match.actors ?? []).filter(
      (other) =>
        other.kind === "hero" &&
        other.id !== actor.id &&
        other.team !== actor.team &&
        this._seen(match, actor, other) &&
        distance(actor, other) <= 18,
    );
    heroes.sort((a, b) => distance(actor, a) - distance(actor, b));
    if (heroes.length)
      this._notice(
        "hero-alert",
        `⚠ Phát hiện ${heroes.length} Hồn sư địch trong 18m!`,
        6,
      );
    if (
      this.mode === "full" &&
      (actor.hp < stats.hp * 0.28 ||
        (heroes.length > 1 && actor.hp < stats.hp * 0.65))
    ) {
      this.appraisal = null;
      this._escape(match, actor, heroes[0]);
      this._selfPreservation(match, actor, stats, heroes[0]);
      this._phase("retreat", "Rút lui chiến thuật · bảo toàn chiến lợi phẩm");
      return;
    }
    if (this.mode === "pve" && heroes[0] && distance(actor, heroes[0]) < 9) {
      this.appraisal = null;
      this._escape(match, actor, heroes[0]);
      this._phase("alert", "Tránh Hồn sư địch · giữ R và Linh Bộ");
      return;
    }
    if (
      this.mode === "full" &&
      (weight(actor.bag ?? []) >= 40 || match.time >= 900)
    )
      this.extractReason =
        weight(actor.bag ?? []) >= 40
          ? "Túi đạt 40/48W"
          : match.time >= 1200
            ? "Đợt Đại Cổng 20:00"
            : "Đợt Cổng 15:00";
    const gateAvailable = (match.gates ?? []).some(
      (gate) => gate.end > match.time,
    );
    // Ordinary waves can all lie in infected biomes after 15:00. The A* cost
    // still minimizes fog exposure, but an evacuation may cross it to leave;
    // hostile skill areas and boss telegraphs remain forbidden during that route.
    this.evacuationRouting =
      this.mode === "full" && !!this.extractReason && gateAvailable;
    if (this.config.avoidDanger && this._danger(match, actor, actor) > 0) {
      this.appraisal = null;
      this._escape(match, actor, heroes[0]);
      this._phase("evade", "Né Hồn Chướng / vùng kỹ năng nguy hiểm");
      return;
    }
    if (
      this.mode === "full" &&
      this.extractReason &&
      this._extract(match, actor)
    )
      return;
    if (
      this.mode === "full" &&
      heroes[0] &&
      distance(actor, heroes[0]) <= stats.range + 2 &&
      actor.hp > stats.hp * 0.5
    ) {
      heroes.sort(
        (a, b) =>
          a.hp / this._stats(match, a).hp - b.hp / this._stats(match, b).hp,
      );
      this.target = heroes[0];
      this._combat(match, actor, stats, heroes[0]);
      return;
    }
    if (
      this.config.autoBuild &&
      !heroes.some((h) => distance(actor, h) < 10) &&
      this._build(match, actor, false)
    )
      return;
    if (this.mode === "full" && !heroes.length && this._altar(match, actor))
      return;
    const options = [];
    if (this.config.autoLoot)
      for (const drop of match.drops ?? []) {
        if (
          !finitePoint(drop) ||
          realmOf(drop) !== realmOf(actor) ||
          distance(actor, drop) > 20 ||
          (drop.team != null &&
            drop.team !== actor.team &&
            drop.unlock > match.time)
        )
          continue;
        const eligible = (drop.items ?? []).filter((i) =>
          this._canCarry(actor, i),
        );
        if (
          !eligible.length &&
          !((drop.tb ?? 0) > 0 || (drop.essence ?? 0) > 0)
        )
          continue;
        options.push({
          kind: "loot",
          target: drop,
          score: 1000 - distance(actor, drop) * 10,
        });
      }
    for (const other of match.actors ?? []) {
      if (!this._seen(match, actor, other)) continue;
      const score = autoFarmUtility(actor, other, stats, this.mode);
      if (score > -Infinity)
        options.push({ kind: "combat", target: other, score });
    }
    options.sort((a, b) => b.score - a.score);
    const selected = options[0];
    if (selected?.kind === "loot") {
      this.target = selected.target;
      this._loot(match, actor, selected.target);
    } else if (selected) {
      this.appraisal = null;
      this.target = selected.target;
      this._combat(match, actor, stats, selected.target);
    } else {
      this.target = null;
      this.appraisal = null;
      if (!(this.config.autoBuild && this._build(match, actor, true)))
        this._patrol(match, actor);
    }
  }

  _canCarry(actor, item) {
    if (
      item.kind === "material" &&
      actor.bag?.some((i) => i.code === item.code && (i.count ?? 1) < 5)
    )
      return true;
    return (
      (actor.bag?.length ?? 0) < 24 &&
      weight(actor.bag ?? []) + (item.w ?? 0) <= 48
    );
  }

  _loot(match, actor, drop) {
    this._navigate(match, actor, drop, 2.2);
    this._phase("loot", "Tiếp cận chiến lợi phẩm");
    if (distance(actor, drop) >= 2.6) {
      this.appraisal = null;
      return;
    }
    this.motion = { ...ZERO_INPUT };
    const choices = (drop.items ?? [])
      .filter((item) => this._canCarry(actor, item))
      .sort(
        (a, b) =>
          autoLootPriority(b) - autoLootPriority(a) ||
          (b.value ?? 0) - (a.value ?? 0),
      );
    const item = choices[0];
    if (item) {
      const precious = autoLootPriority(item) >= 2;
      if (precious && this.appraisal?.uid !== item.uid)
        this.appraisal = { uid: item.uid, name: item.name, start: this.clock };
      if (precious && this.clock - this.appraisal.start < 0.8) {
        this._phase(
          "appraise",
          `Thẩm định ${item.name ?? "đồ quý"} · 0,8 giây`,
        );
        return;
      }
      this._command(`loot-${item.uid}`, 1, "pickupSelected", item.uid);
      this.appraisal = null;
      this._phase("loot", `Đang nhặt ${item.name ?? "chiến lợi phẩm"}`);
    } else {
      this.appraisal = null;
      const nearest = (match.drops ?? [])
        .filter(
          (other) =>
            realmOf(other) === realmOf(actor) && distance(actor, other) < 3,
        )
        .sort((a, b) => distance(actor, a) - distance(actor, b))[0];
      if (nearest === drop) this._command(`currency-${drop.id}`, 1, "pickup");
      else this._navigate(match, actor, drop, 0.2);
    }
  }

  _canCast(match, actor, stats, index) {
    if (
      (actor.cooldowns?.[index] ?? 0) > 0 ||
      actor.ccUntil > match.time ||
      actor.silenceUntil > match.time
    )
      return false;
    if (this.clock < (this.commandUntil.get(`skill-${index}`) ?? 0))
      return false;
    if (index === 4)
      return this.mode === "full" && !(actor.groundedUntil > match.time);
    const skill = skillFor(actor, index);
    return actor.mp - skill.mp >= stats.mp * 0.25;
  }

  _cast(match, actor, stats, index, target, defensive = false) {
    if (!this._canCast(match, actor, stats, index)) return false;
    const skill = skillFor(actor, index);
    const d = target ? distance(actor, target) : 0;
    const reach = Math.max(skill.range, skill.radius ?? 0, skill.dash ?? 0);
    const self = [
      "shield",
      "armor",
      "clone",
      "stealth",
      "rage",
      "protect",
      "healzone",
    ].includes(skill.shape);
    if (!self && skill.shape !== "heal" && d > reach + 0.3) return false;
    if (skill.shape === "heal" && actor.hp >= stats.hp * 0.75) return false;
    if (skill.shape === "shield" && actor.shield > 20) return false;
    if (skill.shape === "reveal" || skill.shape === "stealth") return false;
    let direction =
      target && d > 1e-7
        ? unit(target.x - actor.x, target.z - actor.z)
        : (actor.dir ?? { x: 0, z: -1 });
    if (skill.dash && defensive)
      direction = this._steer(
        match,
        actor,
        unit(actor.x - target.x, actor.z - target.z),
      );
    if (
      skill.dash &&
      (this._blocked(match, actor, {
        x: actor.x + direction.x * skill.dash,
        z: actor.z + direction.z * skill.dash,
      }) ||
        this._danger(match, actor, {
          x: actor.x + direction.x * skill.dash,
          z: actor.z + direction.z * skill.dash,
        }) > 0)
    )
      return false;
    const aim = {
      ...direction,
      distance: Math.min(skill.range, d),
      targetId: ["shield", "heal"].includes(skill.shape)
        ? actor.id
        : target?.id,
    };
    return this._command(`skill-${index}`, 0.55, "cast", index, aim);
  }

  _selfPreservation(match, actor, stats, threat) {
    if (actor.hero === 10 && this.config.useSkills)
      this._cast(match, actor, stats, 1, actor);
    else if ([4, 5].includes(actor.hero) && this.config.useSkills)
      this._cast(match, actor, stats, 1, actor);
    if (
      this.mode === "full" &&
      threat &&
      this._canCast(match, actor, stats, 4)
    ) {
      const direction = this._steer(
        match,
        actor,
        unit(actor.x - threat.x, actor.z - threat.z),
      );
      const destination = {
        x: actor.x + direction.x * 2.8,
        z: actor.z + direction.z * 2.8,
      };
      if (
        Math.hypot(direction.x, direction.z) > 0.5 &&
        !this._blocked(match, actor, destination) &&
        this._danger(match, actor, destination) === 0
      )
        this._command("skill-4", 0.8, "cast", 4, direction);
    }
  }

  _combat(match, actor, stats, target) {
    const d = distance(actor, target),
      ranged = stats.range >= 4;
    const ideal =
      actor.hero === 8
        ? Math.min(stats.range, Math.max(5.8, stats.range * 0.82))
        : ranged
          ? stats.range * 0.82
          : Math.min(2, Math.max(1.6, stats.range * 0.85));
    this._phase(
      "combat",
      `${target.kind === "hero" ? "Đánh trả" : "Săn"} ${target.name ?? (target.kind === "hero" ? HEROES[target.hero]?.name : "Hồn thú")}`,
    );
    if (d > ideal + 0.35) this._navigate(match, actor, target, ideal);
    else if (ranged && this.config.kiting && d < (actor.hero === 8 ? 5.8 : 2.6))
      this.motion = {
        ...ZERO_INPUT,
        ...this._steer(
          match,
          actor,
          unit(actor.x - target.x, actor.z - target.z),
        ),
      };
    else if (
      !ranged &&
      (target.kind === "boss" || target.tier >= 1) &&
      (actor.cooldowns?.[5] ?? 0) > 0.2
    ) {
      const direction = unit(actor.x - target.x, actor.z - target.z);
      this.motion = {
        ...ZERO_INPUT,
        ...this._steer(match, actor, { x: -direction.z, z: direction.x }),
      };
    }
    this.motion.attack = d <= stats.range + 0.5;
    this.motion.targetMode = target.kind === "hero" ? "hero-low" : "beast";
    if (!this.config.useSkills || actor.ccUntil > match.time) return;
    if (this.comboTarget !== target.id) {
      this.comboTarget = target.id;
      this.comboIndex = 0;
    }
    if (
      actor.hero === 10 &&
      actor.hp < stats.hp * 0.75 &&
      this._cast(match, actor, stats, 1, actor)
    )
      return;
    if (
      this.mode === "full" &&
      this.config.allowUltimate &&
      (target.kind === "boss" || target.tier >= 1) &&
      this._cast(match, actor, stats, 3, target)
    )
      return;
    const combo = AUTO_FARM_COMBOS[actor.hero];
    for (let i = 0; i < combo.length; i++) {
      const position = (this.comboIndex + i) % combo.length,
        index = combo[position];
      if (
        index === 2 &&
        [3, 8].includes(actor.hero) &&
        d > (actor.hero === 8 ? 4 : 2.6)
      )
        continue;
      if (
        actor.hero === 4 &&
        index === 1 &&
        d > 3.6 &&
        actor.hp > stats.hp * 0.9
      )
        continue;
      if (
        this._cast(
          match,
          actor,
          stats,
          index,
          target,
          index === 2 && [3, 8].includes(actor.hero),
        )
      ) {
        this.comboIndex = (position + 1) % combo.length;
        break;
      }
    }
  }

  _buildPlan(actor, merchant) {
    const desired = safeAutoBuildPreset(actor.hero),
      owned = actor.items ?? [],
      missing = desired.filter((id) => !owned.includes(id));
    const blocked = AUTO_FARM_PRESETS[actor.hero].filter((id) =>
      mismatch(actor.hero, id),
    );
    if (blocked.length)
      this._notice(
        "backlash-preset",
        `Auto bỏ qua Bổ phẩm tương khắc: ${blocked.map((id) => ITEMS[id - 1].code).join(", ")}`,
        30,
      );
    if (!missing.length) return null;
    const available = money(actor),
      spaces = 7 - owned.length;
    const tier3 = missing.filter((id) => ITEMS[id - 1].tier === 3);
    if (!merchant)
      for (const id of tier3) {
        const recipe = RECIPES.find((r) => r[0] === id);
        if (
          recipe &&
          !mismatch(actor.hero, recipe[1]) &&
          !mismatch(actor.hero, recipe[2]) &&
          owned.includes(recipe[1]) &&
          owned.includes(recipe[2]) &&
          available >= recipe[3]
        )
          return { action: "craft", id, cost: recipe[3] };
      }
    if (spaces <= 0) {
      const obsolete = owned.findIndex(
        (id, index) => !desired.includes(id) || owned.indexOf(id) < index,
      );
      return obsolete >= 0 ? { action: "sell", id: obsolete, cost: 0 } : null;
    }
    for (const id of [
      ...tier3,
      ...missing.filter((i) => ITEMS[i - 1].tier !== 3),
    ]) {
      const item = ITEMS[id - 1];
      if (merchant) {
        if (
          item.tier === 3 &&
          (actor.merchantBuys ?? 0) < 2 &&
          available >= item.price * 0.85
        )
          return { action: "buy", id, cost: item.price * 0.85 };
        continue;
      }
      const recipe = RECIPES.find((r) => r[0] === id);
      if (recipe) {
        const ingredients = [recipe[1], recipe[2]].filter(
          (ingredient) => !owned.includes(ingredient),
        );
        if (
          ingredients.length <= spaces &&
          !ingredients.some((ingredient) => mismatch(actor.hero, ingredient))
        ) {
          const remainingCost =
            recipe[3] +
            ingredients.reduce(
              (total, ingredient) => total + ITEMS[ingredient - 1].price,
              0,
            );
          if (available < remainingCost) continue;
          const ingredient = ingredients[0];
          if (ingredient && available >= ITEMS[ingredient - 1].price)
            return {
              action: "buy",
              id: ingredient,
              cost: ITEMS[ingredient - 1].price,
            };
          continue;
        }
      }
      if (available >= item.price)
        return { action: "buy", id, cost: item.price };
    }
    return null;
  }

  _build(match, actor, route = true) {
    if (realmOf(actor) !== 0) return false;
    const fixed = (match.shopPoints ?? []).map((point) => ({
      point,
      merchant: false,
    }));
    const merchants = (match.merchants ?? []).map((point) => ({
      point,
      merchant: true,
    }));
    const nearby = [...fixed, ...merchants].filter(
      ({ point }) => distance(actor, point) < 6,
    );
    // Match.nearShop resolves fixed shops before merchants, including overlaps.
    const near = nearby.find((place) => !place.merchant) ?? nearby[0];
    if (near) {
      const plan = this._buildPlan(actor, near.merchant);
      if (!plan) return false;
      if (
        plan.action !== "sell" &&
        (mismatch(actor.hero, plan.id) || money(actor) < plan.cost)
      )
        return false;
      if (this.clock < (this.commandUntil.get("shop") ?? 0)) {
        this._phase("build", "Chờ giao dịch kế tiếp · giữ vị trí tại Đài");
        return true;
      }
      if (this._command("shop", 0.8, "shop", plan.action, plan.id)) {
        this._phase(
          "build",
          `${plan.action === "craft" ? "Ghép Bậc Thiên" : plan.action === "sell" ? "Thay Bổ phẩm ngoài preset" : "Mua Bổ phẩm"} · 7 ô chuẩn`,
        );
        return true;
      }
      return false;
    }
    if (!route) return false;
    const candidates = [...fixed, ...merchants]
      .map((place) => ({
        ...place,
        plan: this._buildPlan(actor, place.merchant),
      }))
      .filter((place) => place.plan);
    candidates.sort(
      (a, b) => distance(actor, a.point) - distance(actor, b.point),
    );
    const destination = candidates[0];
    if (!destination) return false;
    this._navigate(match, actor, destination.point, 4.8);
    this._phase("shop", "Đến Đài Giao Dịch để mua / ghép preset");
    return true;
  }

  _altar(match, actor) {
    if (
      realmOf(actor) !== 0 ||
      this.clock < (this.commandUntil.get("altar") ?? 0)
    )
      return false;
    const rings = (actor.bag ?? []).filter(
      (item) =>
        item.kind === "ring" &&
        RINGS[item.id - 1] &&
        ringCompatible(actor.hero, item.id, RINGS[item.id - 1].slot),
    );
    rings.sort(
      (a, b) => Number(RINGS[b.id - 1].black) - Number(RINGS[a.id - 1].black),
    );
    const ring = rings.find((item) => {
      const old = RINGS[(actor.rings?.[RINGS[item.id - 1].slot - 1] ?? 0) - 1];
      return !old || (RINGS[item.id - 1].black && !old.black);
    });
    if (!ring) return false;
    const shrines = [...(match.shrines ?? SHRINES)].sort(
      (a, b) => distance(actor, a) - distance(actor, b),
    );
    if (!shrines.length) return false;
    const shrine = shrines[0];
    this._phase("altar", "Đến Tế Đàn hấp thu Hồn hoàn phù hợp");
    this._navigate(match, actor, shrine, 2.8);
    if (
      distance(actor, shrine) < 3.5 &&
      this._command(
        "altar",
        8.5,
        "equipRing",
        ring.uid,
        RINGS[ring.id - 1].slot,
      )
    ) {
      this.pendingAbsorb = {
        uid: ring.uid,
        until: this.clock + 8.5,
        acknowledged: false,
      };
      this.motion = { ...ZERO_INPUT };
    }
    return true;
  }

  _extract(match, actor) {
    if (realmOf(actor) === 1) {
      const exits = [
        { x: 70, z: -7 },
        { x: 70, z: 7 },
      ].sort((a, b) => distance(actor, a) - distance(actor, b));
      this._navigate(match, actor, exits[0], 1.5);
      if (distance(actor, exits[0]) < 2.8) this._command("portal", 1, "portal");
      this._phase("extract-route", "Ra khỏi Bí Cảnh để tìm Cổng Hồi Hoàn");
      return true;
    }
    const gates = (match.gates ?? []).filter(
      (gate) =>
        gate.end > match.time &&
        (gate.start == null || gate.start <= match.time),
    );
    gates.sort((a, b) => distance(actor, a) - distance(actor, b));
    const gate = gates[0];
    if (!gate) {
      const upcoming =
        match.time < 1200 ? Math.ceil((match.time + 0.01) / 300) * 300 : 1200;
      this._notice(
        "gate-wait",
        `${this.extractReason} · chờ đợt Cổng ${Math.floor(upcoming / 60)}:00`,
        12,
      );
      return false;
    }
    if (
      this.config.avoidDanger &&
      infected({ ...gate, realm: realmOf(actor) }, match.time)
    )
      this._notice(
        "evacuation-fog",
        "Cổng ở vùng Hồn Chướng · chọn đường ít phơi nhiễm nhất để rút lui.",
        15,
      );
    this._navigate(match, actor, gate, 2.1);
    this._phase("extract-route", `${this.extractReason} · đến Cổng Hồi Hoàn`);
    if (distance(actor, gate) < 3.2) {
      const carried = [...(actor.bag ?? []), ...(actor.gear ?? [])];
      if (weight(carried) > 48) {
        const charm = actor.supports?.find(
          (support) => support.id === 17 && !support.used,
        );
        if (charm && actor.bag.length)
          this._command(
            "extraction",
            2,
            "extract",
            "send",
            actor.bag.map((item) => item.uid),
          );
        else {
          this._notice(
            "overweight",
            "Gói đồ và trang bị vượt 48W: cần Hoãn Nhân Hồi hoặc tự chọn đồ trước khi rút.",
            12,
          );
          this._phase(
            "extract-blocked",
            "Gói Hồi Hoàn vượt 48W · cần chọn đồ an toàn",
          );
        }
      } else this._command("extraction", 2, "extract", "exit", []);
    }
    return true;
  }

  _patrol(match, actor) {
    const center = realmOf(actor) === 1 ? REGIONS[6] : REGIONS[5];
    const points =
      realmOf(actor) === 1
        ? [
            [0, 0],
            [5, -5],
            [-6, -4],
            [-5, 5],
            [5, 4],
          ].map(([x, z]) => ({ x: center.x + x, z: center.z + z }))
        : [
            REGIONS[5],
            REGIONS[0],
            REGIONS[1],
            REGIONS[3],
            REGIONS[2],
            REGIONS[4],
          ];
    let point;
    for (let n = 0; n < points.length; n++) {
      point = points[this.patrolIndex % points.length];
      if (
        distance(actor, point) > 2 &&
        (!this.config.avoidDanger ||
          !infected({ ...point, realm: realmOf(actor) }, match.time))
      )
        break;
      this.patrolIndex++;
    }
    this._navigate(match, actor, point, 1.5);
    this._phase("patrol", "Tuần tra tìm Hồn thú trong tầm nhìn");
  }
}
