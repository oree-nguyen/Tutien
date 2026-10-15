import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1200, height: 700 },
    }),
    errors = [],
    inputs = [];
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      try {
        const packet = JSON.parse(String(payload));
        if (packet.type === "input")
          inputs.push({ x: packet.x, z: packet.z, seq: packet.seq });
        if (inputs.length > 20) inputs.shift();
      } catch {}
    }),
  );
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("pageerror", e.message);
  });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173");
  await page.waitForFunction(() => window.__HON_GIOI__);
  // Network/input assertions use the full CSS viewport with a smaller software
  // GPU drawing buffer. Art fidelity and FPS are verified separately.
  await page.evaluate(() => {
    const w = window.__HON_GIOI__.world;
    w.renderer.setPixelRatio(0.4);
    w.resize();
  });
  await page.locator("#onlineAccount").click();
  const username = "web_" + randomUUID().slice(0, 12).replaceAll("-", "");
  await page.locator("#accountName").fill(username);
  await page.locator("#accountPassword").fill("qa-browser-only-password");
  await page.locator("#registerOnline").click();
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("thành công"),
  );
  await page.locator("#loginOnline").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#onlineAccount")?.textContent ===
      "TÀI KHOẢN ONLINE",
  );
  await page.locator("#start").click();
  await page.waitForFunction(
    () =>
      window.__HON_GIOI__.match?.online &&
      window.__HON_GIOI__.match?.player &&
      document.querySelector("#joystick"),
  );
  const before = await page.evaluate(() => window.__HON_GIOI__.match.player.x);
  await page.keyboard.down("KeyD");
  try {
    await page.waitForFunction(
      (x) => window.__HON_GIOI__.match.player.x > x + 0.1,
      before,
      { timeout: 10000 },
    );
  } catch (error) {
    console.error(
      "Online movement diagnostic",
      JSON.stringify({
        inputs,
        player: await page.evaluate(() => {
          const m = window.__HON_GIOI__.match,
            a = m.player;
          return {
            time: m.time,
            x: a.x,
            z: a.z,
            hp: a.hp,
            alive: a.alive,
            downed: a.downedUntil,
            cc: a.ccUntil,
            realm: a.realm,
            socket: m.socket.readyState,
          };
        }),
      }),
    );
    throw error;
  } finally {
    await page.keyboard.up("KeyD");
  }
  const player = await page.evaluate(() => window.__HON_GIOI__.match.player);
  assert.ok(player.wallet);
  assert.ok(
    await page
      .locator(".debug")
      .evaluate((e) => e.classList.contains("hidden")),
  );
  await page.locator("#bag").evaluate((element) => element.click());
  assert.ok(await page.locator("[role=dialog]").isVisible());
  await page.locator("#closeModal").evaluate((element) => element.click());
  const reconnectState = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("No authoritative state after WebSocket reconnect")),
      30000,
    );
    page.once("websocket", (socket) => {
      socket.on("framereceived", ({ payload }) => {
        try {
          const packet = JSON.parse(String(payload));
          if (packet.type === "state" && packet.data?.player) {
            clearTimeout(timer);
            resolve({
              id: packet.data.player.id,
              time: packet.data.time,
              lastSeq: packet.data.lastSeq,
            });
          }
        } catch {}
      });
    });
  });
  await page.evaluate(() => window.__HON_GIOI__.match.socket.close());
  const reconnected = await reconnectState;
  assert.equal(reconnected.id, player.id);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser registration/login, real server match, authoritative movement, inventory, hidden sandbox and WebSocket reconnect.",
  );
} finally {
  await browser.close();
}
