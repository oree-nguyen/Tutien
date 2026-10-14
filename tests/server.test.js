import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { createServer } from "../server/index.js";
import { configuration } from "../server/config.js";
import { Room } from "../server/room.js";
import { loot } from "../src/rules.js";
const load = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  skin: 0,
  costume: 0,
  mode: "solo",
  ranked: false,
  brought: 0,
};
let app, url, account, cookie, room, ws;
const created = [];
async function api(path, body, auth = cookie, headers = {}) {
  const r = await fetch(url + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { cookie: auth } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function socket() {
  const s = new WebSocket(url.replace("http", "ws") + "/socket", {
    headers: { cookie },
  });
  await new Promise((resolve, reject) => {
    s.once("open", resolve);
    s.once("error", reject);
  });
  return s;
}
test.before(async () => {
  app = await createServer({ ...(await configuration()), port: 0 });
  const address = await app.listen();
  url = `http://127.0.0.1:${address.port}`;
  const name = "qa_" + randomUUID().slice(0, 16).replaceAll("-", "");
  let r = await api(
    "/api/auth/register",
    { username: name, password: "test-only-unique-password" },
    null,
  );
  assert.equal(r.status, 201);
  r = await api(
    "/api/auth/login",
    { username: name, password: "test-only-unique-password" },
    null,
  );
  cookie = r.cookie;
  assert.ok(cookie);
  const row = await app.store.pool.query(
    "SELECT id,password_hash FROM accounts WHERE username=$1",
    [name],
  );
  account = row.rows[0].id;
  created.push(account);
  assert.ok(!row.rows[0].password_hash.includes("test-only"));
});
test.after(async () => {
  if (ws) ws.terminate();
  if (room) {
    room.closed = true;
    await app.store.redis.del("room:" + room.id);
    await app.store.redis.sRem("rooms", room.id);
    app.rooms.delete(room.id);
  }
  for (const id of created) {
    for (const table of ["results", "ledger", "inventory", "sessions"])
      await app.store.pool.query(`DELETE FROM ${table} WHERE account_id=$1`, [
        id,
      ]);
    await app.store.pool.query("DELETE FROM accounts WHERE id=$1", [id]);
  }
  await app.close();
});
test("server authentication, CORS and account isolation", async () => {
  assert.equal((await api("/api/me", null, null)).status, 401);
  assert.equal(
    (await api("/api/me", null, cookie, { Origin: "https://attacker.invalid" }))
      .status,
    403,
  );
  const r = await api("/api/me");
  assert.equal(r.body.profile.tb, 5000);
  assert.equal(r.body.profile.nb, 2000);
  assert.equal(
    (
      await api(
        "/api/auth/login",
        { username: "missing", password: "bad" },
        null,
      )
    ).status,
    400,
  );
});
test("PostgreSQL serializes concurrent idempotent ledger commits", async () => {
  const key = randomUUID();
  await Promise.all(
    Array.from({ length: 12 }, () =>
      app.store.transact(account, key, "qa-atomic", (p) => {
        p.tb += 123;
        return { amount: 123 };
      }),
    ),
  );
  assert.equal((await app.store.profile(account)).profile.tb, 5123);
  const rows = await app.store.pool.query(
    "SELECT count(*)::int AS n FROM ledger WHERE account_id=$1 AND idempotency_key=$2",
    [account, key],
  );
  assert.equal(rows.rows[0].n, 1);
  await assert.rejects(() =>
    app.store.transact(account, randomUUID(), "qa-rollback", (p) => {
      p.tb = -1;
    }),
  );
  assert.equal((await app.store.profile(account)).profile.tb, 5123);
});
test("authoritative queue spends entry once and locks branch", async () => {
  const key = randomUUID(),
    r = await api(
      "/api/queue",
      { loadout: { ...load, brought: 100 } },
      cookie,
      { "Idempotency-Key": key },
    );
  assert.equal(r.status, 200);
  room = app.rooms.get(r.body.roomId);
  assert.ok(room);
  assert.equal((await app.store.profile(account)).profile.tb, 5023);
  await api("/api/queue", { loadout: load }, cookie, {
    "Idempotency-Key": key,
  });
  assert.equal((await app.store.profile(account)).profile.tb, 5023);
  assert.equal((await api("/api/branch", { branch: 2 })).status, 403);
  ws = await socket();
  await wait(100);
});
test("server rejects forged damage, wallets and teleport vectors", async () => {
  const a = room.actor(account),
    before = { ...a.wallet },
    x = a.x;
  await assert.rejects(() =>
    room.input(account, { seq: 1, type: "input", x: 1, z: 0, earned: 99999 }),
  );
  await assert.rejects(() =>
    room.input(account, { seq: 2, type: "input", x: 100, z: 0 }),
  );
  assert.deepEqual(a.wallet, before);
  assert.equal(a.x, x);
  await room.input(account, { seq: 3, type: "input", x: 1, z: 0 });
  await wait(150);
  assert.ok(a.x > x);
  assert.ok(a.x - x < 2);
});
test("server accepts Squad4 teams and validates target-selection input", async () => {
  const r = new Room(app.store, "squad4", false),
    id = randomUUID();
  await r.join(id, { ...load, mode: "squad4" }, []);
  r.start();
  assert.equal(r.match.teamSize, 4);
  await assert.rejects(
    () =>
      r.input(id, {
        seq: 1,
        type: "input",
        x: 0,
        z: 0,
        targetMode: "all-players",
      }),
    /mục tiêu/,
  );
  await r.input(id, {
    seq: 2,
    type: "input",
    x: 0,
    z: 0,
    attack: true,
    targetMode: "hero-low",
  });
  assert.equal(r.players.get(id).input.targetMode, "hero-low");
  r.tick();
  assert.equal(r.actor(id).targetMode, "hero-low");
});
test("AOI snapshot excludes hidden actors, private account data and off-realm objects", () => {
  const a = room.actor(account),
    hidden = room.match.createHero(1, 222, 90, -90);
  hidden.realm = 1;
  const v = room.view(account);
  assert.ok(v.actors.length < room.match.actors.length);
  assert.ok(!v.actors.some((t) => t.id === hidden.id));
  assert.equal(JSON.stringify(v).includes("password_hash"), false);
  assert.ok(v.player.wallet);
});
test("reconnect retains the authoritative actor; Redis restore preserves shared references", async () => {
  const id = room.actor(account).id;
  ws.terminate();
  await wait(60);
  ws = await socket();
  assert.equal(room.actor(account).id, id);
  await room.persist();
  const data = JSON.parse(await app.store.redis.get("room:" + room.id)),
    restored = Room.restore(app.store, data);
  assert.equal(restored.actor(account).id, id);
  assert.equal(
    restored.match.player,
    restored.match.actors.find((a) => a.id === restored.match.player.id),
  );
  assert.equal(restored.players.get(account).connected, false);
});
test("Ranked refuses fewer than60 authenticated participants; uses no AI after threshold", async () => {
  const ranked = new Room(app.store, "solo", true);
  await ranked.join(randomUUID(), { ...load, ranked: true }, []);
  assert.throws(() => ranked.start(), /60/);
  for (let i = 1; i < 60; i++)
    await ranked.join(randomUUID(), { ...load, ranked: true }, []);
  ranked.start();
  assert.equal(ranked.match.actors.filter((a) => a.kind === "hero").length, 60);
  assert.ok(
    ranked.match.actors
      .filter((a) => a.kind === "hero")
      .every((a) => a.ai === false),
  );
});
test("online send commits once, preserves brought wallet and leaves actor active", async () => {
  const a = room.actor(account),
    m = room.match;
  a.supports = [{ id: 17, tier: 1, used: 0, cd: 0 }];
  a.bag = [loot("ring", 1)];
  a.wallet.earned = 123;
  a.immuneUntil = 1e6;
  const item = a.bag[0],
    before = (await app.store.profile(account)).profile.tb;
  m.openDebugGates();
  m.teleport("gate");
  m.beginExtraction("send", [item.uid]);
  const key = `${room.id}:gate:${a.id}:${a.channel.started}`;
  m.completeExtraction(a);
  for (let i = 0; i < 100 && a.channel; i++) await wait(20);
  assert.equal(a.channel, null);
  assert.equal(a.wallet.brought, 100);
  assert.ok(a.alive);
  assert.equal(a.supports[0].used, 1);
  assert.equal((await app.store.profile(account)).profile.tb, before + 123);
  await room.transfer(a, {
    key,
    items: [item],
    tb: 123,
    value: 120,
    outcome: "send",
    kills: 0,
  });
  assert.equal(
    (await app.store.profile(account)).profile.stash.filter(
      (i) => i.uid === item.uid,
    ).length,
    1,
  );
  assert.equal((await app.store.profile(account)).profile.tb, before + 123);
});
test("90-second disconnected grace expires into death settlement", async () => {
  const p = room.players.get(account);
  p.connected = false;
  p.disconnectedAt = Date.now() - 90001;
  room.tick();
  assert.equal(room.actor(account).alive, false);
  await wait(100);
  assert.equal(room.actor(account).result?.type, "death");
});
