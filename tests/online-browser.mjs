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
    errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("pageerror", e.message);
  });
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173");
  await page.waitForFunction(() => window.__HON_GIOI__);
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
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyD");
  await page.waitForFunction(
    (x) => window.__HON_GIOI__.match.player.x > x + 0.1,
    before,
  );
  const player = await page.evaluate(() => window.__HON_GIOI__.match.player);
  assert.ok(player.wallet);
  assert.ok(
    await page
      .locator(".debug")
      .evaluate((e) => e.classList.contains("hidden")),
  );
  await page.locator("#bag").click();
  assert.ok(await page.locator("[role=dialog]").isVisible());
  await page.locator("#closeModal").click();
  await page.evaluate(() => window.__HON_GIOI__.match.socket.close());
  await page.waitForFunction(
    () => window.__HON_GIOI__.match.socket.readyState === 1,
  );
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.match.player.id),
    player.id,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser registration/login, real server match, authoritative movement, inventory, hidden sandbox and WebSocket reconnect.",
  );
} finally {
  await browser.close();
}
