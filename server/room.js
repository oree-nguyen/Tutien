import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { serializeSnapshot } from "./snapshots.js";
import { Match } from "../src/simulation.js";
import {
  newProfile,
  validateLoadout,
  distance,
  appraise,
  deathSettlement,
  uid,
} from "../src/rules.js";
import { encodeGraph, decodeGraph, canSee, realmOf } from "../src/systems.js";
const baseLoad = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 0,
  skin: 0,
  costume: 0,
  mode: "solo",
  ranked: false,
};
export class AuthoritativeMatch extends Match {
  constructor(load, room) {
    super(load, newProfile());
    this.room = room;
    this.online = true;
  }
  finish(type, title, details) {
    const a = this.player;
    if (!a.accountId) return;
    this.room.settleDeath(a, type, title, details);
  }
  completeExtraction(a) {
    const c = a.channel;
    if (!c || !a.alive || c.pending) return;
    c.pending = true;
    c.eventKey ??= `${this.room.id}:gate:${a.id}:${c.started}`;
    const items = c.items.map((i) => ({ ...i })),
      value = items.reduce((s, i) => s + i.value * (i.count ?? 1), 0),
      bonus =
        c.mode === "exit"
          ? appraise(value, this.support(a, 4)?.tier ?? 0) - value
          : 0;
    this.room
      .transfer(a, {
        key: c.eventKey,
        items,
        tb:
          a.wallet.earned + (c.mode === "exit" ? a.wallet.brought : 0) + bonus,
        value,
        outcome: c.mode === "exit" ? "extracted" : "send",
        kills: a.kills,
        hero: a.hero,
      })
      .then(() => {
        const ids = new Set(items.map((i) => i.uid));
        a.bag = a.bag.filter((i) => !ids.has(i.uid));
        a.gear = a.gear.filter((i) => !ids.has(i.uid));
        a.wallet.earned = 0;
        a.channel = null;
        if (c.mode === "exit") {
          a.wallet.brought = 0;
          a.alive = false;
          a.extracted = true;
          a.result = { type: "extracted", value, bonus };
        } else {
          this.support(a, 17).used = 1;
          a.immuneUntil = this.time + 2;
        }
        return this.room.persist();
      })
      .catch(() => {
        c.pending = false;
      });
  }
  fixed(dt, input) {
    super.fixed(dt, input);
    if (this.time >= 1320) return;
    const teams = new Set(
      this.actors
        .filter((a) => a.kind === "hero" && a.alive && !a.extracted)
        .map((a) => a.team),
    );
    if (teams.size === 1)
      for (const a of this.actors)
        if (a.accountId && a.alive && !a.channel) {
          a.channel = {
            mode: "exit",
            started: `victory-${this.tick}`,
            items: [...a.bag, ...a.gear],
            escrow: [],
          };
          this.completeExtraction(a);
        }
  }
  kill(t, source, reason = "damage") {
    if (t.kind === "hero" && t.accountId) {
      if (!t.alive || t.deathPending) return;
      if (
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
      const result = deathSettlement(t);
      t.deathPending = true;
      t.alive = false;
      t.hp = 0;
      const corpse = this.makeDrop(
        t.x,
        t.z,
        result.dropped,
        result.earned,
        source.team,
        12,
      );
      corpse.realm = t.realm ?? 0;
      this.room
        .transfer(t, {
          key: `${this.room.id}:death:${t.id}`,
          items: result.saved,
          tb: result.refund,
          value: 0,
          outcome: "death",
          kills: t.kills,
          hero: t.hero,
        })
        .then(() => {
          t.result = {
            type: "death",
            refund: result.refund,
            saved: result.saved.length,
          };
          return this.room.persist();
        })
        .catch(() => {
          t.alive = true;
          t.deathPending = false;
          t.hp = 1;
        });
      if (source.kind === "hero") source.kills++;
      return;
    }
    super.kill(t, source, reason);
  }
}
export class Room {
  constructor(store, mode = "solo", ranked = false) {
    this.id = randomUUID();
    this.store = store;
    this.mode = mode;
    this.ranked = ranked;
    this.players = new Map();
    this.waiting = [];
    this.match = null;
    this.tickMs = [];
    this.pending = new Map();
    this.last = performance.now();
    this.sequence = 0;
    this.pairs = new Map();
  }
  async join(accountId, loadout, gear) {
    if (this.match && this.ranked && !this.players.has(accountId))
      throw Error("Ranked đang diễn ra");
    validateLoadout(loadout);
    if (this.players.has(accountId)) return this.players.get(accountId);
    const p = {
      accountId,
      loadout,
      gear,
      actorId: null,
      input: { x: 0, z: 0, attack: false },
      lastInput: 0,
      lastSeq: 0,
      connected: true,
      disconnectedAt: 0,
    };
    this.players.set(accountId, p);
    return p;
  }
  start() {
    if (this.match) return;
    if (this.ranked && this.players.size < 60)
      throw Error("Ranked cần ít nhất60 người thật");
    const load = { ...baseLoad, mode: this.mode, ranked: this.ranked };
    this.match = new AuthoritativeMatch(load, this);
    const size =
      this.mode === "squad4"
        ? 4
        : this.mode === "squad3"
          ? 3
          : this.mode === "duo"
            ? 2
            : 1;
    let index = 0;
    if (this.ranked)
      this.match.actors = this.match.actors.filter((a) => a.kind !== "hero");
    for (const p of this.players.values()) {
      let a;
      if (!this.ranked) {
        a = this.match.actors.find((a) => a.kind === "hero" && !a.accountId);
        Object.assign(a, {
          hero: p.loadout.hero,
          skin: p.loadout.skin,
          costume: p.loadout.costume,
          rings: [...p.loadout.rings],
          bones: [...p.loadout.bones],
          supports: p.loadout.supports.map((s) => ({ ...s, used: 0, cd: 0 })),
          wallet: { brought: p.loadout.brought, earned: 0 },
        });
        const replacement = this.match.createHero(
          p.loadout.hero,
          Math.floor(index / size),
          a.x,
          a.z,
          p.loadout,
        );
        this.match.actors = this.match.actors.filter((v) => v !== a);
        a = replacement;
      } else
        a = this.match.createHero(
          p.loadout.hero,
          Math.floor(index / size),
          8 + (index % 10) * 3,
          8 + Math.floor(index / 10) * 3,
          p.loadout,
        );
      a.accountId = p.accountId;
      a.ai = false;
      a.gear = p.gear;
      p.actorId = a.id;
      index++;
    }
    this.match.player = this.match.actors.find(
      (a) => a.id === [...this.players.values()][0].actorId,
    );
    this.match.profile = { ...newProfile(), tb: 0, nb: 0, stash: [] };
  }
  actor(accountId) {
    const p = this.players.get(accountId);
    return p && this.match?.actors.find((a) => a.id === p.actorId);
  }
  async input(accountId, packet) {
    const p = this.players.get(accountId),
      a = this.actor(accountId);
    if (!p || !a) throw Error("Chưa vào trận");
    if (!Number.isSafeInteger(packet.seq) || packet.seq <= p.lastSeq)
      throw Error("Input lặp/sai thứ tự");
    if (packet.seq - p.lastSeq > 10000) throw Error("Sequence vượt giới hạn");
    p.lastSeq = packet.seq;
    p.lastInput = Date.now();
    p.connected = true;
    if (!a.alive || a.channel?.pending) return;
    const allowed = new Set([
      "seq",
      "type",
      "x",
      "z",
      "attack",
      "targetMode",
      "skill",
      "aim",
      "action",
      "index",
      "selected",
      "slot",
      "uid",
    ]);
    for (const k of Object.keys(packet))
      if (!allowed.has(k)) throw Error("Client không được gửi " + k);
    if (packet.type === "input") {
      const x = Number(packet.x),
        z = Number(packet.z);
      if (!Number.isFinite(x + z) || Math.abs(x) > 1 || Math.abs(z) > 1)
        throw Error("Vector input không hợp lệ");
      const targetMode = packet.targetMode ?? "auto";
      if (!["auto", "beast", "hero-low"].includes(targetMode))
        throw Error("Chọn mục tiêu không hợp lệ");
      p.input = { x, z, attack: packet.attack === true, targetMode };
    } else if (packet.type === "skill") {
      if (
        !Number.isInteger(packet.skill) ||
        packet.skill < 0 ||
        packet.skill > 4
      )
        throw Error("Kỹ năng không hợp lệ");
      let dir = null;
      if (packet.aim) {
        const { x, z } = packet.aim,
          n = Math.hypot(x, z);
        if (!Number.isFinite(n) || n < 0.01 || n > 1.01)
          throw Error("Hướng ngắm không hợp lệ");
        dir = { x: x / n, z: z / n };
        if (packet.aim.distance !== undefined) {
          if (
            !Number.isFinite(packet.aim.distance) ||
            packet.aim.distance < 0 ||
            packet.aim.distance > 50
          )
            throw Error("Khoảng cách ngắm không hợp lệ");
          dir.distance = packet.aim.distance;
        }
        if (packet.aim.targetId !== undefined) {
          if (!Number.isInteger(packet.aim.targetId) || packet.aim.targetId < 0)
            throw Error("Mục tiêu ngắm không hợp lệ");
          dir.targetId = packet.aim.targetId;
        }
      }
      this.match.cast(a, packet.skill, dir);
    } else if (packet.type === "action") {
      const prev = this.match.player;
      this.match.player = a;
      try {
        switch (packet.action) {
          case "pickup":
            if (
              packet.uid !== undefined &&
              (typeof packet.uid !== "string" || packet.uid.length > 100)
            )
              throw Error("UUID chiến lợi phẩm không hợp lệ");
            if (packet.uid !== undefined)
              this.match.pickupSelected(packet.uid, a);
            else this.match.pickup(a);
            break;
          case "drop": {
            if (a.channel) throw Error("Đang Hồi Hoàn");
            const item = a.bag.find((i) => i.uid === packet.uid);
            if (!item) throw Error("Không sở hữu vật phẩm");
            a.bag = a.bag.filter((i) => i !== item);
            this.match.makeDrop(a.x, a.z, [item]);
            break;
          }
          case "surrender":
            if (a.downedUntil) a.downedUntil = 1;
            this.match.kill(a, { kind: "beast", team: -1 });
            break;
          case "buy":
          case "sell":
          case "craft":
          case "dismantle":
            this.match.shop(packet.action, packet.index);
            break;
          case "support":
            this.match.useSupport(packet.index);
            break;
          case "extract":
            this.match.beginExtraction("exit");
            break;
          case "send":
            this.match.beginExtraction("send", packet.selected ?? []);
            break;
          case "cancel":
            this.match.cancelExtraction(a);
            break;
          case "ring":
            this.match.equipRing(packet.uid, packet.slot);
            break;
          case "portal":
            this.match.usePortal(a);
            break;
          case "seal":
            if (
              a.realm !== 1 ||
              this.match.time < 600 ||
              this.match.time >= 840
            )
              throw Error("Ấn Khóa không khả dụng");
            this.match.seals = Math.min(2, this.match.seals + 1);
            break;
          case "bone":
            this.match.activateBone();
            break;
          case "item":
            this.match.activateItem();
            break;
          default:
            throw Error("Hành động không cho phép");
        }
      } finally {
        this.match.player = prev;
      }
    } else throw Error("Loại gói tin không hợp lệ");
    if (packet.type === "action") await this.persist();
  }
  async transfer(actor, event) {
    this.pending.set(event.key, { accountId: actor.accountId, event });
    await this.store.redis.set(
      "outbox:" + event.key,
      JSON.stringify({ accountId: actor.accountId, event }),
    );
    await this.store.settle(actor.accountId, event.key, event);
    this.pending.delete(event.key);
    await this.store.redis.del("outbox:" + event.key);
  }
  settleDeath(a, type, title, details) {
    const items =
      type === "death" ? (details.saved ?? []) : [...a.bag, ...a.gear];
    const tb =
      type === "death"
        ? (details.refund ?? 0)
        : a.wallet.earned + a.wallet.brought;
    return this.transfer(a, {
      key: `${this.id}:finish:${a.id}`,
      items,
      tb,
      value: details.value ?? 0,
      outcome: type,
      kills: a.kills,
      hero: a.hero,
    }).then(() => {
      a.result = { type, title };
    });
  }
  tick() {
    if (
      !this.match ||
      this.closed ||
      [...this.players.values()].every((p) => this.actor(p.accountId)?.result)
    )
      return;
    const start = performance.now(),
      dt = 1 / 30;
    for (const p of this.players.values()) {
      const a = this.actor(p.accountId);
      if (!a?.alive) continue;
      if (!p.connected && Date.now() - p.disconnectedAt > 90000) {
        this.match.kill(a, { kind: "beast", team: -1 });
        continue;
      }
      const input =
        Date.now() - p.lastInput < 250
          ? p.input
          : { x: 0, z: 0, attack: false };
      a.targetMode = input.targetMode ?? "auto";
      if (a !== this.match.player) {
        this.match.move(a, input.x, input.z, dt);
        if (input.attack) this.match.attack(a);
      }
    }
    const first = this.players.get(this.match.player.accountId),
      i =
        first && Date.now() - first.lastInput < 250
          ? first.input
          : { x: 0, z: 0, attack: false };
    this.match.fixed(dt, i);
    this.sequence++;
    if (this.sequence % 30 === 0)
      for (const p of this.players.values()) {
        const a = this.actor(p.accountId);
        if (!a?.alive) continue;
        for (const b of this.match.actors)
          if (
            b.kind === "hero" &&
            b.accountId &&
            b.team !== a.team &&
            b.id > a.id &&
            distance(a, b) < 12
          ) {
            const key = [a.id, b.id].sort().join(":");
            const pair = this.pairs.get(key) ?? {
              near: 0,
              lastCombat: this.match.time,
            };
            pair.near += 1;
            if (
              a.lastCombat > this.match.time - 1 ||
              b.lastCombat > this.match.time - 1
            )
              pair.near = 0;
            if (pair.near > 60) {
              a.collusionFlag = b.collusionFlag = true;
              this.match.siphons = this.match.siphons.filter(
                (s) => s.owner !== a && s.owner !== b,
              );
              a.supports = a.supports.filter((s) => ![3, 6].includes(s.id));
              b.supports = b.supports.filter((s) => ![3, 6].includes(s.id));
            }
            this.pairs.set(key, pair);
          }
      }
    this.viewCache = new Map();
    this.tickMs.push(performance.now() - start);
    if (this.tickMs.length > 3000) this.tickMs.shift();
  }
  view(accountId) {
    const a = this.actor(accountId),
      m = this.match;
    if (!m || !a)
      return {
        status: "waiting",
        players: this.players.size,
        required: this.ranked ? 60 : 1,
      };
    const visible = m.actors.filter((t) => t === a || canSee(m, a, t));
    this.viewCache ??= new Map();
    const actor = (v) => {
      if (this.viewCache.has(v.id)) return this.viewCache.get(v.id);
      const out = {};
      for (const k of [
        "id",
        "kind",
        "hero",
        "name",
        "team",
        "x",
        "z",
        "realm",
        "branch",
        "skin",
        "costume",
        "hp",
        "maxHp",
        "mp",
        "shield",
        "alive",
        "extracted",
        "dir",
        "stacks",
        "level",
        "ccUntil",
        "immuneCC",
        "slow",
        "slowUntil",
        "downedUntil",
        "revive",
        "wantedUntil",
        "lastCombat",
        "kills",
        "essence",
        "result",
        "tide",
        "mutant",
        "tier",
        "boss",
      ])
        if (v[k] !== undefined) out[k] = v[k];
      out.stats = m.getStats(v);
      this.viewCache.set(v.id, out);
      return out;
    };
    const me = {
      ...actor(a),
      items: a.items,
      bag: a.bag,
      gear: a.gear,
      rings: a.rings,
      bones: a.bones,
      supports: a.supports,
      wallet: a.wallet,
      safePath: a.safePath,
      pathUntil: a.pathUntil,
      companion: a.companion,
      cooldowns: a.cooldowns,
      absorb: a.absorb ?? null,
      merchantBuys: a.merchantBuys ?? 0,
      immuneUntil: a.immuneUntil,
      channel: a.channel
        ? {
            total: a.channel.total,
            elapsed: a.channel.elapsed,
            paused: a.channel.paused,
            gate: a.channel.gate,
            items: a.channel.items,
            mode: a.channel.mode,
          }
        : null,
    };
    return {
      status: "running",
      roomId: this.id,
      sequence: this.sequence,
      lastSeq: this.players.get(accountId).lastSeq,
      time: m.time,
      player: me,
      actors: visible.map(actor),
      gates: m.gates,
      shopPoints: m.shopPoints,
      merchants: m.merchants,
      shrines: m.shrines,
      seals: m.seals,
      drops: m.drops.filter(
        (d) => realmOf(d) === realmOf(a) && distance(a, d) < 24,
      ),
      zones: m.zones
        .filter(
          (z) =>
            (z.realm ?? realmOf(z.owner)) === realmOf(a) &&
            distance(a, z.point) < 35,
        )
        .map((z) => ({
          ...z,
          owner: {
            hero: z.owner.hero,
            team: z.owner.team,
            id: z.owner.id,
            realm: z.realm ?? realmOf(z.owner),
          },
        })),
      effects: m.effects.filter(
        (e) => realmOf(e) === realmOf(a) && distance(a, e) < 30,
      ),
      projectiles: m.projectiles
        .filter(
          (p) =>
            (p.realm ?? realmOf(p.owner)) === realmOf(a) && distance(a, p) < 30,
        )
        .map((p) => ({
          ...p,
          owner: {
            hero: p.owner.hero,
            id: p.owner.id,
            team: p.owner.team,
            realm: p.realm ?? realmOf(p.owner),
          },
          hit: undefined,
        })),
      warnings: m.actors
        .filter(
          (t) => t.wantedUntil > m.time && (t.wantedUntil - m.time) % 15 < 1,
        )
        .map((t) => ({ region: m.region(t), radius: 60, end: t.wantedUntil })),
      alive: m.actors.filter((t) => t.kind === "hero" && t.alive).length,
    };
  }
  async persist() {
    if (!this.match || this.closed) return;
    const { room, emit, ...state } = this.match;
    const revision = (this.persistRevision ?? 0) + 1;
    this.persistRevision = revision;
    const json = await serializeSnapshot({
      id: this.id,
      mode: this.mode,
      ranked: this.ranked,
      players: [...this.players],
      state,
    });
    if (revision < (this.persistedRevision ?? 0) || this.closed) return;
    this.persistedRevision = revision;
    await this.store.redis.set("room:" + this.id, json);
    await this.store.redis.sAdd("rooms", this.id);
  }
  static restore(store, data) {
    const r = new Room(store, data.mode, data.ranked);
    r.id = data.id;
    r.players = new Map(data.players);
    const match = Match.restore(data.snapshot);
    Object.setPrototypeOf(match, AuthoritativeMatch.prototype);
    match.room = r;
    r.match = match;
    for (const a of match.actors) if (a.channel) a.channel.pending = false;
    for (const p of r.players.values()) {
      p.connected = false;
      p.disconnectedAt = p.disconnectedAt || p.lastInput || Date.now();
    }
    return r;
  }
}
