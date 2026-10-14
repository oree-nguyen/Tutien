import { REGIONS, GATE_POS, HEROES } from "./data.js";
import { distance, loot, stats } from "./rules.js";

// Reference-preserving serialization: marks, zones, escrow and projectiles share actor instances.
export function encodeGraph(root) {
  const nodes = [],
    ids = new Map();
  function encode(value) {
    if (typeof value === "number" && !Number.isFinite(value))
      return { number: String(value) };
    if (value === null || typeof value !== "object") return value;
    if (ids.has(value)) return { ref: ids.get(value) };
    const id = nodes.length;
    ids.set(value, id);
    nodes.push(null);
    const node =
      value instanceof Set
        ? { type: "set", values: [...value].map(encode) }
        : value instanceof Map
          ? {
              type: "map",
              values: [...value].map(([k, v]) => [encode(k), encode(v)]),
            }
          : Array.isArray(value)
            ? { type: "array", values: value.map(encode) }
            : {
                type: "object",
                values: Object.fromEntries(
                  Object.entries(value)
                    .filter(([k, v]) => typeof v !== "function" && k !== "emit")
                    .map(([k, v]) => [k, encode(v)]),
                ),
              };
    nodes[id] = node;
    return { ref: id };
  }
  const reference = encode(root);
  return { version: 1, root: reference, nodes };
}
export function decodeGraph(snapshot) {
  if (
    snapshot?.version !== 1 ||
    !Array.isArray(snapshot.nodes) ||
    snapshot.nodes.length > 100000
  )
    throw Error("Bản lưu không hợp lệ");
  const output = snapshot.nodes.map((n) =>
    n.type === "set"
      ? new Set()
      : n.type === "map"
        ? new Map()
        : n.type === "array"
          ? []
          : {},
  );
  function decode(v) {
    return v && typeof v === "object"
      ? "ref" in v
        ? output[v.ref]
        : "number" in v
          ? Number(v.number)
          : v
      : v;
  }
  snapshot.nodes.forEach((n, i) => {
    const target = output[i];
    if (n.type === "set") n.values.forEach((v) => target.add(decode(v)));
    else if (n.type === "map")
      n.values.forEach(([k, v]) => target.set(decode(k), decode(v)));
    else if (n.type === "array")
      n.values.forEach((v) => target.push(decode(v)));
    else
      for (const [k, v] of Object.entries(n.values)) {
        if (["__proto__", "constructor", "prototype"].includes(k))
          throw Error("Bản lưu không an toàn");
        target[k] = decode(v);
      }
  });
  return decode(snapshot.root);
}
export function realmOf(actor) {
  return actor.realm ?? 0;
}
export function regionAt(point) {
  let best = 5,
    min = Infinity;
  REGIONS.forEach((r, i) => {
    if (i === 6 && realmOf(point) !== 1) return;
    const d = distance(point, r);
    if (d < min) {
      min = d;
      best = i;
    }
  });
  return best;
}
export function infected(point, time) {
  const i = regionAt(point);
  return i < 5 && time > 480 + i * 100;
}
export function segmentTouchesCircle(a, b, center, radius) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const u = Math.max(
    0,
    Math.min(
      1,
      ((center.x - a.x) * dx + (center.z - a.z) * dz) /
        (dx * dx + dz * dz || 1),
    ),
  );
  return Math.hypot(a.x + u * dx - center.x, a.z + u * dz - center.z) <= radius;
}
export function lineBlocked(a, b, obstacles = []) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    l2 = dx * dx + dz * dz;
  return obstacles.some((o) => {
    if (!o.blocksSight) return false;
    const u = Math.max(
      0,
      Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / (l2 || 1)),
    );
    return Math.hypot(a.x + u * dx - o.x, a.z + u * dz - o.z) < o.r;
  });
}
export function canSee(match, observer, target) {
  if (realmOf(observer) !== realmOf(target)) return false;
  if (observer.team === target.team && observer.team >= 0) return true;
  const d = distance(observer, target),
    revealed = (target.reveals ?? []).some(
      (r) => r.team === observer.team && r.end > match.time,
    );
  if (revealed) return true;
  const sight =
    (regionAt(observer) === 2 ? 20.4 : 24) *
    (observer.visionReducedUntil > match.time ? 0.8 : 1);
  if (d > sight || lineBlocked(observer, target, match.obstacles)) return false;
  if (target.stealthUntil > match.time && d > 3) return false;
  const inBush = (match.bushes ?? []).find((p) => distance(p, target) < p.r);
  return (
    !inBush ||
    distance(observer, inBush) < inBush.r ||
    d < ((observer.bones ?? []).includes(1) ? 4 : 1.8)
  );
}
// A* uses traversability, line obstacles, realm boundaries, and the current fog hazard.
export function safePath(match, actor, goal) {
  const step = 4,
    min = -92,
    max = 92,
    size = 47,
    cell = (p) => ({
      x: Math.max(0, Math.min(size - 1, Math.round((p.x - min) / step))),
      z: Math.max(0, Math.min(size - 1, Math.round((p.z - min) / step))),
    });
  const point = (c) => ({
      x: min + c.x * step,
      z: min + c.z * step,
      realm: realmOf(actor),
    }),
    key = (c) => c.x + "," + c.z,
    start = cell(actor),
    end = cell(goal),
    open = [start],
    cost = new Map([[key(start), 0]]),
    parents = new Map(),
    closed = new Set();
  const valid = (c) => {
    if (c.x < 0 || c.z < 0 || c.x >= size || c.z >= size) return false;
    const p = point(c);
    if (realmOf(actor) === 1 && distance(p, REGIONS[6]) > 16) return false;
    if (realmOf(actor) === 0 && distance(p, REGIONS[6]) < 18) return false;
    return !(match.obstacles ?? []).some((o) => distance(p, o) < o.r + 0.7);
  };
  for (let limit = 0; open.length && limit < 2500; limit++) {
    open.sort(
      (a, b) =>
        cost.get(key(a)) +
        Math.hypot(a.x - end.x, a.z - end.z) -
        (cost.get(key(b)) + Math.hypot(b.x - end.x, b.z - end.z)),
    );
    const c = open.shift(),
      k = key(c);
    if (closed.has(k)) continue;
    closed.add(k);
    if (c.x === end.x && c.z === end.z) {
      const path = [point(c)];
      let p = k;
      while (parents.has(p)) {
        p = parents.get(p);
        const [x, z] = p.split(",").map(Number);
        path.push(point({ x, z }));
      }
      return path.reverse().concat([{ x: goal.x, z: goal.z }]);
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const n = { x: c.x + dx, z: c.z + dz },
        nk = key(n);
      if (
        !valid(n) ||
        closed.has(nk) ||
        (dx &&
          dz &&
          (!valid({ x: c.x + dx, z: c.z }) || !valid({ x: c.x, z: c.z + dz })))
      )
        continue;
      const p = point(n);
      if (
        lineBlocked(
          point(c),
          p,
          (match.obstacles ?? []).map((o) => ({
            ...o,
            r: o.r + 0.7,
            blocksSight: true,
          })),
        )
      )
        continue;
      const next =
        cost.get(k) + Math.hypot(dx, dz) * (infected(p, match.time) ? 25 : 1);
      if (next < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, next);
        parents.set(nk, k);
        open.push(n);
      }
    }
  }
  return [];
}
export function randomGatePositions(wave) {
  return GATE_POS.map((p, i) =>
    i < 2
      ? { ...p }
      : {
          x: p.x + Math.sin(wave * 2.399 + i * 1.71) * 9,
          z: p.z + Math.cos(wave * 1.618 + i * 2.17) * 9,
        },
  );
}
export const RING_ELEMENTS = [
  "Mộc",
  "Hỏa",
  "Mộc",
  "Thổ",
  "Phong",
  "Lôi",
  "Quang",
  "Thủy",
  "Băng",
  "Phong",
  "Kim",
  "Độc",
];
export function ringResonance(rings = []) {
  return (
    rings.length === 2 &&
    rings.every(Boolean) &&
    RING_ELEMENTS[rings[0] - 1] === RING_ELEMENTS[rings[1] - 1]
  );
}
export const AdvancedMethods = {
  snapshot() {
    return encodeGraph(this);
  },
  reveal(source, target, duration) {
    target.reveals = (target.reveals ?? []).filter(
      (r) => r.end > this.time && r.source !== source.id,
    );
    target.reveals.push({
      source: source.id,
      team: source.team,
      hero: source.hero,
      end: this.time + duration,
    });
    target.revealUntil = Math.max(
      target.revealUntil ?? 0,
      this.time + duration,
    );
  },
  visible(observer, target) {
    return canSee(this, observer, target);
  },
  route(actor, goal) {
    return safePath(this, actor, goal);
  },
  portalAction(actor = this.player) {
    if (actor.realm === 1) {
      for (const p of [
        { x: 70, z: -7 },
        { x: 70, z: 7 },
      ])
        if (distance(actor, p) < 3) return "exit";
      return null;
    }
    return this.time >= 600 &&
      this.time < 840 &&
      distance(actor, { x: 58, z: 32 }) < 4
      ? "enter"
      : null;
  },
  usePortal(actor = this.player) {
    const action = this.portalAction(actor);
    if (!action)
      throw Error("Cần đến lối vào hoặc một trong hai cửa thoát Bí Cảnh");
    if (actor.channel || actor.downedUntil || !actor.alive)
      throw Error("Không thể dịch chuyển lúc này");
    if (action === "enter") {
      actor.realm = 1;
      actor.x = 72;
      actor.z = 0;
    } else {
      actor.realm = 0;
      actor.x = 58;
      actor.z = 32;
    }
    actor.immuneUntil = this.time + 1;
  },
  advanceWorld(dt) {
    if (!this.bushes)
      this.bushes = [
        { x: 32, z: -31, r: 4 },
        { x: 46, z: -54, r: 5 },
        { x: -34, z: 27, r: 4 },
        { x: 60, z: 48, r: 4 },
      ];
    if (this.time >= 900 && !this.tide) {
      const gate = this.gates.find((g) => g.end > this.time);
      if (gate) {
        this.tide = { gateId: gate.id, ids: [], rewarded: false };
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2,
            b = this.spawnBeast(
              i % 3 === 0 ? 1 : 0,
              gate.x + Math.cos(angle) * 6,
              gate.z + Math.sin(angle) * 6,
            );
          b.tide = true;
          b.home = { x: gate.x, z: gate.z };
          this.tide.ids.push(b.id);
        }
        this.emit("message", "Thú Triều tấn công một Cổng Hồi Hoàn!");
      }
    }
    if (
      this.tide &&
      !this.tide.rewarded &&
      this.tide.ids.every((id) => !this.actors.find((a) => a.id === id)?.alive)
    ) {
      this.tide.rewarded = true;
      const g = this.gates.find((g) => g.id === this.tide.gateId);
      if (g) this.makeDrop(g.x, g.z, [loot("boss")], 100);
    }
    const a = this.player;
    if (a.companion) {
      a.companion.x += (a.x - 1 - a.companion.x) * Math.min(1, dt * 5);
      a.companion.z += (a.z + 1 - a.companion.z) * Math.min(1, dt * 5);
      for (const d of this.drops)
        if (
          d.tb > 0 &&
          distance(d, a) < 5 &&
          (d.team === null || d.team === a.team || d.unlock <= this.time)
        ) {
          this.reward(a, d.tb, 0);
          d.tb = 0;
        }
      const threat = this.actors.find(
        (t) =>
          this.enemies(a, t) &&
          distance(a, t) < 12 &&
          (t.x - a.x) * a.dir.x + (t.z - a.z) * a.dir.z < 0,
      );
      if (threat && (a.companion.nextWarning ?? 0) < this.time) {
        a.companion.nextWarning = this.time + 5;
        this.emit("message", "Hồn Linh cảnh báo: có địch phía sau!");
      }
    }
    if (this.tick % 30 === 0) {
      for (const actor of this.actors)
        if (actor.kind === "hero" && actor.alive) {
          actor.footprints = (actor.footprints ?? []).filter(
            (p) => p.end > this.time,
          );
          if (!(actor.stealthUntil > this.time))
            actor.footprints.push({
              x: actor.x,
              z: actor.z,
              end: this.time + 8,
            });
          if (actor.pathUntil > this.time) {
            const gate =
              this.gates.find((g) => g.end > this.time) ??
              randomGatePositions(Math.floor(this.time / 300) + 1)[0];
            actor.safePath = this.route(actor, gate);
          }
        }
    }
  },
};

AdvancedMethods.resonance = function (a, t, k, point) {
  if (a.kind !== "hero" || !t.alive) return;
  const cooldowns = (this.comboCooldowns ??= {}),
    trigger = (name, seconds = 12) => {
      const key = a.team + ":" + name;
      if ((cooldowns[key] ?? 0) > this.time) return false;
      cooldowns[key] = this.time + seconds;
      this.emit("message", name);
      return true;
    };
  const zones = this.zones.filter(
    (z) =>
      z.owner !== a &&
      z.owner.team === a.team &&
      realmOf(z.owner) === realmOf(a) &&
      z.end > this.time,
  );
  if (a.hero === 3 && [0, 1, 3].includes(k)) {
    const vine = zones.find(
      (z) =>
        z.owner.hero === 0 &&
        [2, 3].includes(z.k) &&
        distance(t, z.point) <= z.sk.radius,
    );
    if (vine && trigger("Mộc Lôi Cộng Hưởng")) {
      for (const enemy of this.actors)
        if (
          this.enemies(a, enemy) &&
          distance(enemy, vine.point) <= vine.sk.radius
        ) {
          this.damage(a, enemy, 95, "magic");
          this.cc(enemy, 0.5);
        }
      this.effect(vine.point.x, vine.point.z, 0xddff75, vine.sk.radius);
    }
  }
  if (
    a.hero === 1 &&
    [2, 3].includes(k) &&
    t.controlSource?.hero === 0 &&
    t.controlSource.team === a.team &&
    t.controlSource.end > this.time &&
    trigger("Địa Mộc Bạo Phá")
  ) {
    for (const enemy of this.actors)
      if (this.enemies(a, enemy) && distance(enemy, t) <= 2.5)
        this.damage(a, enemy, 110, "physical");
    this.cc(t, 0.6);
  }
  if (
    a.hero === 2 &&
    (t.reveals ?? []).some(
      (r) => r.team === a.team && r.hero === 4 && r.end > this.time,
    ) &&
    trigger("Nguyệt Ảnh Truy Sát")
  ) {
    this.buff(a, { speed: stats(a).speed * 0.2 }, 2);
    a.ignoreArmorUntil = this.time + 0.2;
  }
  if (a.hero === 3 && [1, 3].includes(k)) {
    const shield = zones.find(
      (z) =>
        z.owner.hero === 5 && z.k === 3 && distance(a, z.point) <= z.sk.radius,
    );
    if (shield && trigger("Huyền Lôi Hộ Trận"))
      for (const ally of this.allies(a, shield.point, shield.sk.radius))
        ally.buffs.push({ type: "electric", end: shield.end, stats: {} });
  }
  if (a.hero === 6 || a.hero === 7) {
    const opposite = zones.find(
      (z) =>
        (a.hero === 6
          ? z.owner.hero === 7 && z.k === 1
          : z.owner.hero === 6 && [1, 2, 3].includes(z.k)) &&
        distance(point, z.point) < z.sk.radius + 2,
    );
    if (opposite && trigger("Băng Hỏa Lưỡng Cực"))
      for (const enemy of this.actors)
        if (this.enemies(a, enemy) && distance(enemy, point) < 3) {
          this.damage(a, enemy, 130, "true");
          enemy.visionReducedUntil = this.time + 2.5;
        }
  }
};

export const NAV_OBSTACLES = [
  [-15, -15],
  [15, -15],
  [-15, 15],
  [15, 15],
  [-8, -22],
  [8, -22],
].map(([x, z]) => ({ x, z, r: 0.85, blocksSight: true }));
export const MAP_BUSHES = [
  { x: 32, z: -31, r: 4 },
  { x: 46, z: -54, r: 5 },
  { x: -34, z: 27, r: 4 },
  { x: 60, z: 48, r: 4 },
];
