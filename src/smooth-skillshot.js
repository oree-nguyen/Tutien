import { canSee, realmOf } from "./systems.js";
import { distance } from "./rules.js";
import { skillIndicatorKind } from "./skill-projection.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm = (v, fallback = { x: 0, z: 1 }) => {
  const length = Math.hypot(v?.x ?? 0, v?.z ?? 0);
  return Number.isFinite(length) && length > 1e-8
    ? { x: v.x / length, z: v.z / length }
    : { ...fallback };
};
export function screenVectorToWorld(dx, dy, azimuth) {
  return {
    x: dx * Math.cos(azimuth) + dy * Math.sin(azimuth),
    z: -dx * Math.sin(azimuth) + dy * Math.cos(azimuth),
  };
}

export class OneEuroFilter {
  constructor({ minCutoff = 1.7, beta = 0.06, derivativeCutoff = 1 } = {}) {
    Object.assign(this, { minCutoff, beta, derivativeCutoff });
    this.value = null;
    this.previous = null;
    this.derivative = 0;
  }
  reset(value = null) {
    this.value = this.previous = value;
    this.derivative = 0;
  }
  filter(value, dt) {
    if (!Number.isFinite(value)) return this.value ?? 0;
    if (this.value === null) {
      this.reset(value);
      return value;
    }
    dt = clamp(dt, 1 / 1000, 0.1);
    const alpha = (cutoff) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    this.derivative +=
      alpha(this.derivativeCutoff) *
      ((value - this.previous) / dt - this.derivative);
    this.previous = value;
    this.value +=
      alpha(this.minCutoff + this.beta * Math.abs(this.derivative)) *
      (value - this.value);
    return this.value;
  }
}

export class SmoothSkillshotController {
  constructor({
    getMatch,
    getSkill,
    cast,
    onAim = () => {},
    onClear = () => {},
    onUI = () => {},
    getAzimuth = () => 0,
    getCancelCenter = () => null,
    getMovement = () => ({ x: 0, z: 0 }),
    getTargetMode = () => "auto",
    onManualStart = () => {},
    onManualEnd = () => {},
    vibrate = (ms) => globalThis.navigator?.vibrate?.(ms),
    now = () => performance.now() / 1000,
  }) {
    Object.assign(this, {
      getMatch,
      getSkill,
      cast,
      onAim,
      onClear,
      onUI,
      getAzimuth,
      getCancelCenter,
      getMovement,
      getTargetMode,
      onManualStart,
      onManualEnd,
      vibrate,
      now,
    });
    this.leftJoystickPointerId = null;
    this.rightSkillPointerId = null;
    this.skillBufferQueue = [];
    this.observations = new Map();
    this.sent = new Map();
    this.filters = [new OneEuroFilter(), new OneEuroFilter()];
    this.backSwingUntil = 0;
    this.active = null;
    this.smoothedAimDir = { x: 0, z: 1 };
    this.smoothedGroundOffset = { x: 0, z: 0 };
  }
  beginMovement(id) {
    if (this.leftJoystickPointerId !== null || this.rightSkillPointerId === id)
      return false;
    this.leftJoystickPointerId = id;
    this.onManualStart(id);
    return true;
  }
  endMovement(id) {
    if (this.leftJoystickPointerId !== id) return false;
    this.leftJoystickPointerId = null;
    this.onManualEnd(id);
    return true;
  }
  begin(id, slot, rect, x, y) {
    const match = this.getMatch();
    if (
      this.rightSkillPointerId !== null ||
      this.leftJoystickPointerId === id ||
      !match?.player ||
      match.result
    )
      return false;
    this.rightSkillPointerId = id;
    this.active = {
      id,
      slot,
      center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      x,
      y,
      started: this.now(),
      dragged: false,
      canceled: false,
      raw: { x: 0, y: 0 },
      distance: 0,
    };
    this.smoothedAimDir = norm(match.player.dir);
    this.smoothedGroundOffset = { x: 0, z: 0 };
    this.filters.forEach((f) => f.reset(0));
    this.onManualStart(id);
    this.onUI({ slot, held: true, knob: { x: 0, y: 0 }, canceled: false });
    this.onAim(match.player, this.getSkill(slot), null, false, match);
    return true;
  }
  move(id, x, y) {
    const a = this.active;
    if (!a || id !== this.rightSkillPointerId) return false;
    a.x = x;
    a.y = y;
    const dx = x - a.center.x,
      dy = y - a.center.y,
      d = Math.hypot(dx, dy);
    a.distance = d;
    if (d >= 10) a.dragged = true;
    a.raw = { x: dx / Math.max(1, d / 75), y: dy / Math.max(1, d / 75) };
    const cancel = this.getCancelCenter();
    const canceled = !!cancel && Math.hypot(x - cancel.x, y - cancel.y) <= 75;
    if (canceled && !a.canceled) this.vibrate(15);
    a.canceled = canceled;
    this.onUI({ slot: a.slot, held: true, knob: a.raw, canceled });
    return true;
  }
  finish(id, x, y, aborted = false) {
    const a = this.active;
    if (!a || id !== this.rightSkillPointerId) return false;
    this.move(id, x, y);
    const match = this.getMatch();
    if (!aborted && !a.canceled && match?.player) {
      const quick = this.now() - a.started < 0.16 || a.distance < 10;
      const aim =
        a.slot === 4
          ? a.dragged
            ? (a.lastAim ?? this.manualAim(a, true))
            : null
          : quick
            ? this.quickAim(a.slot)
            : (a.lastAim ?? this.manualAim(a, true));
      this.requestCast(a.slot, aim);
    }
    this.onUI({
      slot: a.slot,
      held: false,
      knob: { x: 0, y: 0 },
      canceled: false,
    });
    this.active = null;
    this.rightSkillPointerId = null;
    this.onManualEnd(id);
    this.onClear();
    return true;
  }
  cancel(id) {
    if (id !== this.rightSkillPointerId || !this.active) return false;
    return this.finish(id, this.active.x, this.active.y, true);
  }
  reset() {
    if (this.active) this.cancel(this.rightSkillPointerId);
    if (this.leftJoystickPointerId !== null)
      this.endMovement(this.leftJoystickPointerId);
    this.skillBufferQueue.length = 0;
    this.backSwingUntil = 0;
    this.sent.clear();
    this.observations.clear();
  }
  observe() {
    const match = this.getMatch();
    if (!match) return;
    const time = match.time;
    const present = new Set();
    for (const actor of match.actors ?? []) {
      present.add(actor.id);
      const old = this.observations.get(actor.id);
      let vx = old?.vx ?? 0,
        vz = old?.vz ?? 0;
      if (old && time > old.time) {
        const interval = time - old.time,
          dx = actor.x - old.x,
          dz = actor.z - old.z;
        if (
          interval < 1 &&
          Math.hypot(dx, dz) / interval < 40 &&
          realmOf(actor) === old.realm
        ) {
          vx = dx / interval;
          vz = dz / interval;
        } else vx = vz = 0;
      }
      this.observations.set(actor.id, {
        x: actor.x,
        z: actor.z,
        time,
        realm: realmOf(actor),
        vx,
        vz,
      });
    }
    for (const id of this.observations.keys())
      if (!present.has(id)) this.observations.delete(id);
  }
  quickAim(slot) {
    const match = this.getMatch(),
      actor = match?.player;
    if (!actor) return null;
    if (slot === 4) return norm(this.getMovement(), norm(actor.dir));
    const skill = this.getSkill(slot),
      friendly = ["heal", "shield"].includes(skill.shape);
    const choices = (match.actors ?? []).filter(
      (t) =>
        t.alive &&
        !t.extracted &&
        !t.downedUntil &&
        !(t.untargetableUntil > match.time) &&
        realmOf(t) === realmOf(actor) &&
        distance(actor, t) <= skill.range + 0.5 &&
        canSee(match, actor, t) &&
        (friendly
          ? t.kind === "hero" && t.team === actor.team
          : t !== actor && (t.team === -1 || t.team !== actor.team)),
    );
    const ratio = (t) =>
      t.hp / Math.max(1, match.getStats?.(t)?.hp ?? t.maxHp ?? t.hp);
    const mode = this.getTargetMode();
    const rank = (t) =>
      friendly
        ? 0
        : t.kind === "hero"
          ? 0
          : t.kind === "boss"
            ? 1
            : t.mutant || t.tier > 0
              ? 2
              : 3;
    choices.sort(
      (a, b) =>
        (mode === "beast" ? (a.kind === "hero") - (b.kind === "hero") : 0) ||
        rank(a) - rank(b) ||
        (friendly || mode !== "nearest" ? ratio(a) - ratio(b) : 0) ||
        distance(actor, a) - distance(actor, b),
    );
    const target = choices[0];
    if (!target) return norm(this.getMovement(), norm(actor.dir));
    const velocity = this.observations.get(target.id) ?? { vx: 0, vz: 0 };
    const speed =
      slot === 0 && actor.hero === 3 && actor.branch === 0 ? 25 : 20;
    const lead =
      skill.shape === "line" && !skill.dash && actor.hero !== 4
        ? (distance(actor, target) / speed) * 0.65
        : 0;
    const delta = {
      x: target.x + velocity.vx * lead - actor.x,
      z: target.z + velocity.vz * lead - actor.z,
    };
    const aim = { ...norm(delta, norm(actor.dir)), targetId: target.id };
    if (skillIndicatorKind(skill) === "aoe")
      aim.distance = Math.min(skill.range, Math.hypot(delta.x, delta.z));
    return aim;
  }
  manualAim(a, exact = false) {
    const match = this.getMatch(),
      actor = match?.player,
      skill = this.getSkill(a.slot);
    if (!actor) return null;
    if (!a.dragged) return null;
    const screen = exact
      ? a.raw
      : { x: this.filters[0].value ?? 0, y: this.filters[1].value ?? 0 };
    const rawWorld = screenVectorToWorld(screen.x, screen.y, this.getAzimuth());
    const dir = exact ? norm(rawWorld, norm(actor.dir)) : this.smoothedAimDir;
    const aim = { ...dir };
    if (skillIndicatorKind(skill) === "aoe") {
      aim.distance = exact
        ? skill.range * Math.min(1, Math.hypot(screen.x, screen.y) / 75)
        : Math.hypot(this.smoothedGroundOffset.x, this.smoothedGroundOffset.z);
      if (!exact && aim.distance > 1e-8)
        Object.assign(aim, norm(this.smoothedGroundOffset));
    }
    if (skillIndicatorKind(skill) === "lock") {
      const friendly = ["heal", "shield"].includes(skill.shape);
      const targets = (match.actors ?? []).filter(
        (t) =>
          t.alive &&
          !t.extracted &&
          !t.downedUntil &&
          realmOf(t) === realmOf(actor) &&
          !(t.untargetableUntil > match.time) &&
          distance(actor, t) <= skill.range + 0.5 &&
          canSee(match, actor, t) &&
          (friendly
            ? t.kind === "hero" && t.team === actor.team
            : t !== actor && (t.team === -1 || t.team !== actor.team)),
      );
      targets.sort((a, b) => {
        const cost = (t) =>
          1 -
          (norm({ x: t.x - actor.x, z: t.z - actor.z }).x * dir.x +
            norm({ x: t.x - actor.x, z: t.z - actor.z }).z * dir.z) +
          distance(actor, t) * 0.001;
        return cost(a) - cost(b);
      });
      if (targets[0]) aim.targetId = targets[0].id;
    }
    return aim;
  }
  readiness(slot) {
    const m = this.getMatch(),
      a = m?.player;
    if (
      !a?.alive ||
      a.extracted ||
      a.downedUntil ||
      m.result ||
      a.ccUntil > m.time ||
      (slot < 4 && a.silenceUntil > m.time) ||
      (slot === 4 && a.groundedUntil > m.time)
    )
      return { allowed: false };
    const skill = this.getSkill(slot);
    if (a.mp < (skill.mp ?? 0)) return { allowed: false };
    return {
      allowed: true,
      delay: Math.max(
        a.cooldowns?.[slot] ?? 0,
        this.backSwingUntil - this.now(),
        0,
      ),
    };
  }
  fire(slot, aim) {
    const now = this.now();
    if (now - (this.sent.get(slot) ?? -100) < 0.1) return false;
    const result = this.cast(slot, aim);
    if (result !== false) {
      this.sent.set(slot, now);
      this.backSwingUntil = now + 0.18;
      return true;
    }
    return false;
  }
  requestCast(slot, aim = undefined) {
    const ready = this.readiness(slot);
    if (!ready.allowed) return false;
    const intent = aim === undefined ? this.quickAim(slot) : aim;
    if (ready.delay <= 0) return this.fire(slot, intent);
    const cooldown = this.getMatch().player.cooldowns?.[slot] ?? 0;
    if (cooldown > 0.2 || this.backSwingUntil - this.now() > 0.25) return false;
    if (this.skillBufferQueue.length >= 8) this.skillBufferQueue.shift();
    this.skillBufferQueue.push({
      slot,
      aim: intent,
      expires: this.queueTime() + 0.25,
    });
    return true;
  }
  queueTime() {
    const match = this.getMatch();
    // Offline cooldowns advance on the simulation clock. Online intents retain
    // their wall-clock TTL so a stalled connection cannot release a stale cast.
    return !match?.online && Number.isFinite(match?.time)
      ? match.time
      : this.now();
  }
  update(dt) {
    this.observe();
    const queueTime = this.queueTime();
    this.skillBufferQueue = this.skillBufferQueue.filter(
      (i) => i.expires >= queueTime,
    );
    const next = this.skillBufferQueue[0];
    if (next) {
      const ready = this.readiness(next.slot);
      if (!ready.allowed) this.skillBufferQueue.shift();
      else if (ready.delay <= 1e-6) {
        this.skillBufferQueue.shift();
        this.fire(next.slot, next.aim);
      }
    }
    const a = this.active,
      m = this.getMatch();
    if (!a || !m?.player) return;
    if (a.dragged) {
      const x = this.filters[0].filter(a.raw.x, dt),
        y = this.filters[1].filter(a.raw.y, dt);
      const target = norm(
        screenVectorToWorld(x, y, this.getAzimuth()),
        this.smoothedAimDir,
      );
      const alpha = 1 - Math.exp(-28 * dt),
        groundAlpha = 1 - Math.exp(-25 * dt);
      this.smoothedAimDir = norm(
        {
          x: this.smoothedAimDir.x + (target.x - this.smoothedAimDir.x) * alpha,
          z: this.smoothedAimDir.z + (target.z - this.smoothedAimDir.z) * alpha,
        },
        target,
      );
      const length =
        this.getSkill(a.slot).range * Math.min(1, Math.hypot(x, y) / 75);
      this.smoothedGroundOffset.x +=
        (target.x * length - this.smoothedGroundOffset.x) * groundAlpha;
      this.smoothedGroundOffset.z +=
        (target.z * length - this.smoothedGroundOffset.z) * groundAlpha;
    }
    a.lastAim = this.manualAim(a);
    this.onAim(m.player, this.getSkill(a.slot), a.lastAim, a.canceled, m);
  }
}
