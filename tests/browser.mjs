import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [];
await mkdir("test-results", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173");
  await page.waitForFunction(
    () =>
      window.__HON_GIOI__ &&
      getComputedStyle(document.querySelector("#rotate")).display === "none",
  );
  await page.locator('[data-hero="3"]').click();
  assert.equal(await page.locator(".hero-heading").textContent(), "Kỳ Vân");
  await page.locator('[data-hero="0"]').click();
  await page.locator("#openSupports").click();
  await page.locator('[data-support="5"]').click();
  await page.locator('[data-support="18"]').click();
  await page.locator('[data-support="1"]').click();
  assert.ok(await page.locator('[data-support="4"]').isDisabled());
  await page.locator("#closeModal").click();
  await page.screenshot({ path: "test-results/hub-desktop.png" });
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.match.actors = g.match.actors.filter(
      (a) => a === g.match.player || a.kind !== "hero" || a.team !== 0,
    );
    for (const a of g.match.actors)
      if (a !== g.match.player) {
        a.x = 85;
        a.z = 85;
      }
    g.debug("money");
    g.debug("shop");
  });
  await page.locator("#shop").click();
  await page.locator('[data-buy="1"]').click();
  await page.locator('[data-buy="2"]').click();
  await page.locator('[data-craft="4"]').click();
  assert.ok(
    await page.evaluate(() =>
      window.__HON_GIOI__.match.player.items.includes(4),
    ),
  );
  await page.locator('[data-dismantle="0"]').click();
  assert.deepEqual(
    await page.evaluate(() => window.__HON_GIOI__.match.player.items),
    [2],
  );
  await page.locator("#closeModal").click();
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.debug("loot");
    g.debug("open");
    g.debug("gate");
  });
  await page.locator("#extract").click();
  await page.locator("#sendExtract").click();
  await page.locator("#confirmSend").click();
  assert.ok(
    await page.evaluate(() => !!window.__HON_GIOI__.match.player.channel),
  );
  const sent = await page.evaluate(() => {
    const m = window.__HON_GIOI__.match,
      c = m.player.channel;
    c.elapsed = c.total - 0.02;
    m.fixed(1 / 30, { x: 0, z: 0 });
    return {
      alive: m.player.alive,
      bag: m.player.bag.length,
      channel: m.player.channel,
      used: m.support(m.player, 17).used,
      stash: m.profile.stash.length,
    };
  });
  assert.ok(sent.alive);
  assert.equal(sent.bag, 0);
  assert.equal(sent.channel, null);
  assert.equal(sent.used, 1);
  await page.screenshot({ path: "test-results/game-desktop.png" });
  await page.locator("#extract").click();
  await page.locator("#exitExtract").click();
  await page.evaluate(() => {
    let m = window.__HON_GIOI__.match;
    m.player.channel.elapsed = m.player.channel.total;
    m.fixed(1 / 30, { x: 0, z: 0 });
  });
  await page.waitForSelector("#backHub");
  await page.locator("#backHub").click();
  assert.equal(await page.locator(".hero-heading").textContent(), "Lâm Dật");
  await page.reload();
  await page.waitForFunction(
    () =>
      window.__HON_GIOI__ &&
      getComputedStyle(document.querySelector("#rotate")).display === "none",
  );
  assert.ok(
    await page.evaluate(() => window.__HON_GIOI__.profile.matches === 1),
  );
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173");
  await mobile.waitForFunction(
    () =>
      window.__HON_GIOI__ &&
      getComputedStyle(document.querySelector("#rotate")).display === "none",
  );
  await mobile.screenshot({ path: "test-results/hub-mobile.png" });
  await mobile.locator("#start").tap();
  await mobile.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  await mobile.locator("#pause").tap();
  const before = await mobile.evaluate(() => ({
    x: window.__HON_GIOI__.match.player.x,
    z: window.__HON_GIOI__.match.player.z,
  }));
  await mobile.locator("#pause").tap();
  const joy = mobile.locator("#joystick");
  const box = await joy.boundingBox();
  await mobile.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await mobile.mouse.down();
  await mobile.waitForFunction(
    ({ x, z }) =>
      Math.hypot(
        window.__HON_GIOI__.match.player.x - x,
        window.__HON_GIOI__.match.player.z - z,
      ) > 0.1,
    before,
  );
  await mobile.mouse.up();
  const after = await mobile.evaluate(() => ({
    x: window.__HON_GIOI__.match.player.x,
    z: window.__HON_GIOI__.match.player.z,
  }));
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 0.1);
  await mobile.locator('[data-skill="4"]').tap();
  assert.ok(
    await mobile.evaluate(
      () => window.__HON_GIOI__.match.player.cooldowns[4] > 0,
    ),
  );
  await mobile.screenshot({ path: "test-results/game-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: hero selection, support exclusion, shop/craft/dismantle, send/extract, persistence, landscape touch joystick + F; no page errors.",
  );
} finally {
  await browser.close();
}
