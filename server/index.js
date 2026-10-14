import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { Store } from "./store.js";
import { configuration } from "./config.js";
import { Room } from "./room.js";
import { loot } from "../src/rules.js";
export async function createServer(config) {
  const store = new Store(config);
  await store.open();
  const rooms = new Map(),
    rates = new Map();
  for (const id of config.restore === false
    ? []
    : await store.redis.sMembers("rooms")) {
    const raw = await store.redis.get("room:" + id);
    if (raw) {
      try {
        const r = Room.restore(store, JSON.parse(raw));
        rooms.set(r.id, r);
      } catch {
        console.error(
          "A room snapshot is invalid; refusing automatic restoration.",
        );
      }
    }
  }
  for await (const keys of store.redis.scanIterator({
    MATCH: "outbox:*",
    COUNT: 100,
  }))
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const raw = await store.redis.get(key);
      if (raw) {
        const { accountId, event } = JSON.parse(raw);
        await store.settle(accountId, event.key, event);
        await store.redis.del(key);
      }
    }
  const cookie = (req) =>
    req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : req.headers.cookie
          ?.split("; ")
          .find((s) => s.startsWith("hg_session="))
          ?.slice(11);
  const allowed = (req) =>
    !req.headers.origin || config.origins.includes(req.headers.origin);
  function limit(req, ceiling = 300) {
    const key = req.socket.remoteAddress,
      now = Date.now(),
      r = rates.get(key);
    if (!r || now - r.start > 60000) {
      rates.set(key, { start: now, n: 1 });
      return;
    }
    if (++r.n > ceiling)
      throw Object.assign(Error("Quá nhiều yêu cầu"), { status: 429 });
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");
    if (req.headers.origin && allowed(req)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,Idempotency-Key",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    try {
      limit(req);
      if (!allowed(req))
        throw Object.assign(Error("Origin không được phép"), { status: 403 });
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      let body = {};
      if (req.method === "POST") {
        let text = "";
        for await (const chunk of req) {
          text += chunk;
          if (text.length > 16384) throw Error("Gói tin quá lớn");
        }
        body = JSON.parse(text || "{}");
      }
      const path = new URL(req.url, "http://localhost").pathname;
      const send = (obj, status = 200) => {
        res.writeHead(status);
        res.end(JSON.stringify(obj));
      };
      if (path === "/api/health") {
        await store.pool.query("SELECT 1");
        await store.redis.ping();
        return send({ ok: true, tickRate: 30, rooms: rooms.size });
      }
      if (path === "/api/auth/register" && req.method === "POST") {
        await store.register(body.username, body.password);
        return send({ registered: true }, 201);
      }
      if (path === "/api/auth/login" && req.method === "POST") {
        const { token } = await store.login(body.username, body.password);
        res.setHeader(
          "Set-Cookie",
          `hg_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`,
        );
        return send({ authenticated: true, token });
      }
      const accountId = await store.authenticate(cookie(req));
      if (!accountId)
        throw Object.assign(Error("Cần đăng nhập"), { status: 401 });
      if (path === "/api/auth/logout" && req.method === "POST") {
        await store.logout(cookie(req));
        res.setHeader(
          "Set-Cookie",
          "hg_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return send({ loggedOut: true });
      }
      if (path === "/api/me") return send(await store.profile(accountId));
      if (path === "/api/leaderboard") return send(await store.leaders());
      if (path === "/api/shop" && req.method === "POST") {
        const key = req.headers["idempotency-key"];
        const result = await store.transact(
          accountId,
          key,
          "hub-purchase",
          (profile) => {
            if (body.kind === "gear") {
              if (
                !["ring", "bone"].includes(body.type) ||
                !Number.isInteger(body.id) ||
                body.id < 1 ||
                body.id > (body.type === "ring" ? 12 : 7)
              )
                throw Error("Trang bị không hợp lệ");
              const item = loot(body.type, body.id),
                cost = item.value;
              if (profile.tb < cost) throw Error("Không đủ TB");
              profile.tb -= cost;
              profile.stash.push(item);
            } else if (body.kind === "cosmetic") {
              if (
                !["skin", "costume"].includes(body.type) ||
                !Number.isInteger(body.hero) ||
                body.hero < 0 ||
                body.hero > 11 ||
                ![1, 2, 3].includes(body.id)
              )
                throw Error("Skin/trang phục không hợp lệ");
              const id = `${body.type}-${body.hero}-${body.id}`;
              if (profile.owned.includes(id)) throw Error("Đã sở hữu");
              if (body.id === 3) {
                if (body.type !== "costume" || (profile.eventTickets ?? 0) < 1)
                  throw Error("Cần1Vé Sự Kiện");
                profile.eventTickets--;
                profile.owned.push(id);
                return { purchased: true };
              }
              const wallet = body.id === 2 ? "nb" : "tb",
                price =
                  body.type === "skin"
                    ? body.id === 2
                      ? 399
                      : 2800
                    : body.id === 2
                      ? 299
                      : 1800;
              if (profile[wallet] < price) throw Error("Không đủ tiền");
              profile[wallet] -= price;
              profile.owned.push(id);
            } else if (body.kind === "liquidate") {
              const item = profile.stash.find((i) => i.uid === body.uid);
              if (!item) throw Error("Không sở hữu vật phẩm");
              profile.tb += item.value * (item.count ?? 1);
              profile.stash = profile.stash.filter((i) => i !== item);
            } else throw Error("Giao dịch không hợp lệ");
            return { purchased: true };
          },
        );
        return send(result);
      }
      if (path === "/api/queue" && req.method === "POST") {
        const existing = [...rooms.values()].find(
          (r) => r.players.has(accountId) && !r.actor(accountId)?.result,
        );
        if (existing)
          return send({
            roomId: existing.id,
            status: existing.match ? "running" : "waiting",
          });
        const l = body.loadout;
        if (!["solo", "duo", "squad3"].includes(l?.mode))
          throw Error("Chế độ không hợp lệ");
        let room = [...rooms.values()].find(
          (r) =>
            !r.match &&
            r.mode === l.mode &&
            r.ranked === !!l.ranked &&
            r.players.size < (l.mode === "squad3" ? 96 : 100),
        );
        if (!room) {
          room = new Room(store, l.mode, !!l.ranked);
          rooms.set(room.id, room);
        }
        const entry = await store.enter(
          accountId,
          l,
          req.headers["idempotency-key"],
          room.id,
        );
        await room.join(accountId, l, entry.gear);
        if (!l.ranked || room.players.size >= 60) room.start();
        await room.persist();
        return send({
          roomId: room.id,
          status: room.match ? "running" : "waiting",
          players: room.players.size,
          minimum: l.ranked ? 60 : 1,
        });
      }
      if (path === "/api/branch" && req.method === "POST")
        throw Object.assign(Error("Nhánh đã khóa khi vào trận"), {
          status: 403,
        });
      throw Object.assign(Error("Không tìm thấy endpoint"), { status: 404 });
    } catch (e) {
      const status = e.status ?? (e.code === "23505" ? 409 : 400);
      res.writeHead(status);
      res.end(
        JSON.stringify({
          error:
            status >= 500
              ? "Lỗi dịch vụ"
              : e.code === "23505"
                ? "Dữ liệu đã tồn tại"
                : e.message,
        }),
      );
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 16384,
    handleProtocols: (protocols) =>
      protocols.has("hg.v1") ? "hg.v1" : protocols.values().next().value,
  });
  server.on("upgrade", async (req, socket, head) => {
    try {
      if (
        new URL(req.url, "http://localhost").pathname !== "/socket" ||
        !allowed(req)
      )
        throw Error("Forbidden");
      const offered = req.headers["sec-websocket-protocol"]
        ?.split(",")
        .map((x) => x.trim())
        .find((x) => x.startsWith("bearer."))
        ?.slice(7);
      const id = await store.authenticate(cookie(req) ?? offered);
      if (!id) throw Error("Unauthorized");
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.accountId = id;
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    const room = [...rooms.values()].find(
      (r) => r.players.has(ws.accountId) && !r.actor(ws.accountId)?.result,
    );
    if (!room) {
      ws.send(JSON.stringify({ type: "error", error: "Chưa ghép trận" }));
      ws.close();
      return;
    }
    ws.room = room;
    const p = room.players.get(ws.accountId);
    p.connected = true;
    p.disconnectedAt = 0;
    let last = Date.now(),
      count = 0,
      chain = Promise.resolve();
    ws.on("message", (raw) => {
      if (Date.now() - last > 1000) {
        last = Date.now();
        count = 0;
      }
      if (++count > 90) {
        ws.close(1008, "Rate limit");
        return;
      }
      chain = chain.then(async () => {
        try {
          const packet = JSON.parse(raw);
          await room.input(ws.accountId, packet);
          ws.send(
            JSON.stringify({
              type: "ack",
              seq: packet.seq,
              serverTick: room.sequence,
            }),
          );
        } catch (e) {
          ws.send(JSON.stringify({ type: "error", error: e.message }));
        }
      });
    });
    ws.on("close", () => {
      p.connected = false;
      p.disconnectedAt = Date.now();
      p.input = { x: 0, z: 0, attack: false };
      // The periodic snapshot batches disconnect metadata instead of serializing for every closed socket.
    });
  });
  let count = 0;
  const timer = setInterval(() => {
    for (const r of rooms.values()) r.tick();
    if (count % 2 === 0)
      for (const ws of wss.clients)
        if (ws.readyState === 1 && ws.bufferedAmount < 65536)
          ws.send(
            JSON.stringify({ type: "state", data: ws.room.view(ws.accountId) }),
          );
    if (++count % 30 === 0)
      for (const r of rooms.values()) r.persist().catch(() => {});
  }, 1000 / 30);
  timer.unref();
  return {
    server,
    store,
    rooms,
    async listen() {
      await new Promise((resolve) =>
        server.listen(config.port, config.host, resolve),
      );
      return server.address();
    },
    async close() {
      clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      await new Promise((resolve) => wss.close(resolve));
      for (const r of rooms.values()) await r.persist();
      await new Promise((resolve) => server.close(resolve));
      await store.close();
    },
  };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await createServer(await configuration());
  await app.listen();
  console.log("Hồn Giới authoritative server ready on loopback, 30Hz");
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => app.close().then(() => process.exit(0)));
}
