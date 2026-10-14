import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { WebSocket } from "ws";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createServer } from "../server/index.js";
import { configuration } from "../server/config.js";
import { Room } from "../server/room.js";
import { fingerprint } from "../scripts/fingerprint.mjs";
const app = await createServer({
    ...(await configuration()),
    port: 0,
    restore: false,
  }),
  address = await app.listen(),
  room = new Room(app.store, "solo", true),
  accounts = [],
  sockets = [],
  latencies = [],
  load = {
    hero: 3,
    branch: 0,
    rings: [0, 0],
    bones: [],
    supports: [],
    skin: 0,
    costume: 0,
    mode: "solo",
    ranked: true,
    brought: 0,
  };
let errors = 0;
try {
  for (let batch = 0; batch < 10; batch++)
    await Promise.all(
      Array.from({ length: 10 }, async () => {
        const name = "load_" + randomUUID().slice(0, 14).replaceAll("-", ""),
          id = await app.store.register(name, "qa-load-only-password");
        accounts.push(id);
        await room.join(id, load, []);
        const auth = await app.store.login(name, "qa-load-only-password");
        sockets.push({ id, token: auth.token });
      }),
    );
  room.start();
  app.rooms.set(room.id, room);
  for (let i = 0; i < accounts.length; i++) {
    const a = room.actor(accounts[i]);
    a.x = i < 40 ? (i % 8) * 1.5 : -80 + (i % 10) * 16;
    a.z = i < 40 ? Math.floor(i / 8) * 1.5 : 40 + Math.floor((i - 40) / 10) * 7;
    a.immuneUntil = 1000;
    a.mp = 9999;
  }
  await Promise.all(
    sockets.map(async (entry) => {
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/socket`, {
        headers: { Authorization: "Bearer " + entry.token },
      });
      entry.ws = ws;
      await new Promise((resolve, reject) => {
        ws.once("open", resolve);
        ws.once("error", reject);
      });
      const sent = new Map();
      ws.on("message", (raw) => {
        const text = raw.toString();
        if (
          !text.startsWith('{"type":"ack"') &&
          !text.startsWith('{"type":"error"')
        )
          return;
        const m = JSON.parse(text);
        if (m.type === "error") {
          errors++;
          return;
        }
        if (m.type === "ack") {
          for (const [seq, at] of sent)
            if (m.seq >= seq) {
              latencies.push(performance.now() - at);
              sent.delete(seq);
            }
        }
      });
      entry.send = (seq) => {
        sent.set(seq, performance.now());
        ws.send(
          JSON.stringify({ seq, type: "skill", skill: 0, aim: { x: 1, z: 0 } }),
        );
      };
    }),
  );
  for (let seq = 1; seq <= 8; seq++) {
    for (const s of sockets) s.send(seq);
    await new Promise((r) => setTimeout(r, 150));
  }
  await new Promise((r) => setTimeout(r, 1000));
  const percentile = (v, p) =>
    [...v].sort((a, b) => a - b)[
      Math.min(v.length - 1, Math.floor(v.length * p))
    ] ?? Infinity;
  const report = {
    sourceHash: await fingerprint(),
    passed: false,
    kind: "synthetic-websocket-load",
    participants: 100,
    realHumans: false,
    gateCombatActors: 40,
    samples: latencies.length,
    tickP95Ms: percentile(room.tickMs, 0.95),
    ackP95Ms: percentile(latencies, 0.95),
    errors,
    recordedAt: new Date().toISOString(),
  };
  report.passed =
    errors === 0 &&
    latencies.length >= 700 &&
    report.tickP95Ms < 1000 / 30 &&
    report.ackP95Ms < 60;
  console.log(JSON.stringify(report, null, 2));
  assert.equal(errors, 0);
  assert.ok(latencies.length >= 700);
  assert.ok(report.tickP95Ms < 1000 / 30);
  assert.ok(report.ackP95Ms < 60);
  await mkdir("acceptance/evidence", { recursive: true });
  await writeFile(
    "acceptance/evidence/server-performance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      { ...report, sourceHash: report.sourceHash.slice(0, 12) },
      null,
      2,
    ),
  );
} finally {
  room.closed = true;
  for (const s of sockets) s.ws?.terminate();
  app.rooms.delete(room.id);
  await app.store.redis.del("room:" + room.id);
  await app.store.redis.sRem("rooms", room.id);
  for (const id of accounts) {
    for (const table of ["results", "ledger", "inventory", "sessions"])
      await app.store.pool.query(`DELETE FROM ${table} WHERE account_id=$1`, [
        id,
      ]);
    await app.store.pool.query("DELETE FROM accounts WHERE id=$1", [id]);
  }
  await app.close();
}
