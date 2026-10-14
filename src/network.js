import { regionAt, canSee } from "./systems.js";
let bearer = null;
export function serverOrigin() {
  return (
    localStorage.getItem("hon-gioi-server") ||
    import.meta.env.VITE_API_ORIGIN ||
    location.origin
  );
}
export function configureServer(value) {
  if (!value) {
    localStorage.removeItem("hon-gioi-server");
    return;
  }
  const u = new URL(value);
  if (
    u.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(u.hostname)
  )
    throw Error("Máy chủ cần HTTPS");
  localStorage.setItem("hon-gioi-server", u.origin);
  bearer = null;
}
export async function api(path, body) {
  const response = await fetch(serverOrigin() + "/api" + path, {
    method: body ? "POST" : "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error ?? "Dịch vụ không khả dụng");
  if (path === "/auth/login") bearer = result.token ?? null;
  if (path === "/auth/logout") bearer = null;
  return result;
}
export class RemoteMatch {
  constructor(emit = () => {}) {
    this.online = true;
    this.emit = emit;
    this.seq = 0;
    this.time = 0;
    this.actors = [];
    this.drops = [];
    this.gates = [];
    this.zones = [];
    this.effects = [];
    this.projectiles = [];
    this.lastSend = 0;
    this.result = null;
    this.player = null;
    this.status = "connecting";
    this.destroyed = false;
    this.open();
  }
  open() {
    const u = new URL(serverOrigin());
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/socket";
    this.socket = new WebSocket(
      u.href,
      bearer ? ["hg.v1", "bearer." + bearer] : ["hg.v1"],
    );
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "error") {
        this.emit("message", message.error);
        return;
      }
      if (message.type === "state") {
        const s = message.data;
        if (s.status === "waiting") {
          this.emit("waiting", s);
          return;
        }
        const first = !this.player;
        this.status = "running";
        this.time = s.time;
        this.player = s.player;
        this.player.now = s.time;
        this.actors = s.actors.map((a) =>
          a.id === s.player.id ? this.player : a,
        );
        for (const k of [
          "drops",
          "gates",
          "zones",
          "effects",
          "projectiles",
          "shopPoints",
          "merchants",
          "shrines",
          "seals",
        ])
          this[k] = s[k];
        this.warnings = s.warnings ?? [];
        this.aliveCount = s.alive;
        this.seq = Math.max(this.seq, s.lastSeq ?? 0);
        if (first) this.emit("connected", this);
        if (this.player.result && !this.result) {
          this.result = {
            ...this.player.result,
            title:
              this.player.result.type === "death"
                ? "Hồn tán"
                : "Hồi Hoàn thành công",
            time: this.time,
            kills: this.player.kills ?? 0,
            details: this.player.result,
          };
          this.emit("end", this.result);
        }
      }
    };
    this.socket.onclose = () => {
      if (this.destroyed) return;
      this.emit(
        "message",
        "Mất kết nối. Server vẫn giữ nhân vật; đang nối lại (cửa sổ90s).",
      );
      setTimeout(() => {
        if (!this.destroyed) this.open();
      }, 1000);
    };
  }
  close() {
    this.destroyed = true;
    this.socket.close();
  }
  send(packet) {
    if (this.socket.readyState !== WebSocket.OPEN)
      throw Error("Đang kết nối lại");
    this.socket.send(JSON.stringify({ ...packet, seq: ++this.seq }));
  }
  step(dt, input, force = false) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    if (!force && performance.now() - this.lastSend < 50) return;
    this.lastSend = performance.now();
    this.send({
      type: "input",
      x: Math.max(-1, Math.min(1, input.x)),
      z: Math.max(-1, Math.min(1, input.z)),
      attack: input.attack,
      targetMode: input.targetMode ?? "auto",
    });
  }
  getStats(a) {
    return a.stats;
  }
  region(a) {
    return regionAt(a);
  }
  visible() {
    return true;
  }
  support(a, id) {
    return a.supports?.find((s) => s.id === id);
  }
  action(action, extra = {}) {
    this.send({ type: "action", action, ...extra });
  }
  cast(a, skill, aim) {
    this.send({ type: "skill", skill, ...(aim ? { aim } : {}) });
    return true;
  }
  pickup() {
    this.action("pickup");
    return true;
  }
  shop(action, index) {
    this.action(action, { index });
  }
  nearShop(a = this.player) {
    const fixed = this.shopPoints.find(
      (p) => Math.hypot(p.x - a.x, p.z - a.z) < 6,
    );
    if (fixed) return { point: fixed, merchant: false };
    const point = this.merchants.find(
      (p) => Math.hypot(p.x - a.x, p.z - a.z) < 6,
    );
    return point ? { point, merchant: true } : null;
  }
  useSupport(index) {
    if (this.player.supports[index]?.id === 17) {
      this.emit("sendPanel");
      return;
    }
    this.action("support", { index });
  }
  beginExtraction(mode = "exit", selected = []) {
    this.action(mode === "send" ? "send" : "extract", { selected });
  }
  cancelExtraction() {
    this.action("cancel");
  }
  equipRing(uid, slot) {
    this.action("ring", { uid, slot });
  }
  activateBone() {
    this.action("bone");
  }
  activateItem() {
    this.action("item");
  }
  activateSeal() {
    this.action("seal");
  }
  portalAction(a = this.player) {
    if (
      a.realm === 1 &&
      [
        { x: 70, z: -7 },
        { x: 70, z: 7 },
      ].some((p) => Math.hypot(a.x - p.x, a.z - p.z) < 3)
    )
      return "exit";
    return this.time >= 600 &&
      this.time < 840 &&
      Math.hypot(a.x - 58, a.z - 32) < 4
      ? "enter"
      : null;
  }
  usePortal() {
    this.action("portal");
  }
  dropItem(uid) {
    this.action("drop", { uid });
  }
  kill() {
    this.action("surrender");
  }
}
