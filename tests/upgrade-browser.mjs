import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fingerprint } from "../scripts/fingerprint.mjs";
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
const errors = [],
  checks = {},
  coverage = [];
await mkdir("test-results/upgrade", { recursive: true });
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
});
page.setDefaultTimeout(30000);
page.on("pageerror", (e) => errors.push(e.message));
try {
  console.log("Upgrade: hub and asset loading");
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173");
  await page.waitForFunction(() => window.__HON_GIOI__);
  await page.evaluate(() => window.__HON_GIOI__.world.loadStaff("high"));
  const asset = await page.evaluate(async () => {
    const w = window.__HON_GIOI__.world,
      g = await w.staffCache.get("high");
    let n = 0;
    g.traverse((o) => {
      if (o.isMesh)
        n +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    return n;
  });
  assert.equal(asset, 120068);
  checks.glb = true;
  await page.waitForFunction(() => {
    let found = false;
    window.__HON_GIOI__.world.preview?.traverse((o) => {
      if (
        o.userData.proceduralMasterwork &&
        o.userData.heroIndex === 0 &&
        o.userData.detail === "high"
      )
        found = true;
    });
    return found;
  });
  checks.masterworkWeapon = true;
  const risk = await page.locator(".risk-value").textContent();
  await page.evaluate(() => {
    const p = window.__HON_GIOI__.profile,
      i = p.stash.find((i) => i.kind === "ring" && i.id === 1);
    p.stash.push({ ...i, uid: crypto.randomUUID() });
  });
  await page.locator('[data-hero="0"]').tap();
  assert.equal(await page.locator(".risk-value").textContent(), risk);
  checks.riskValue = true;
  await page.screenshot({ path: "test-results/upgrade/hub.png" });
  await page.locator('[data-mode="squad4"]').tap();
  await page.locator("#start").tap();
  await page.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.match.teamSize),
    4,
  );
  checks.squad4 = true;
  assert.equal(await page.locator(".debug").getAttribute("open"), null);
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  checks.drawersClosed = true;
  // Freeze only opponent decision-making to keep UI assertions deterministic; real timers run.
  await page.evaluate(() => {
    const m = window.__HON_GIOI__.match;
    window.__HON_GIOI__.sandbox(() => {
      m.ai = () => {};
      for (const t of m.actors)
        if (t !== m.player) {
          t.x = 80;
          t.z = 80;
        }
      m.player.immuneUntil = 10000;
    });
  });
  console.log("Upgrade: floating joystick and simultaneous skill cancellation");
  const start = { x: 80, y: 300 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const joy = await page.locator("#joystick").boundingBox();
  assert.ok(Math.abs(joy.x + joy.width / 2 - start.x) < 2);
  assert.ok(Math.abs(joy.y + joy.height / 2 - start.y) < 2);
  const before = await page.evaluate(() => ({
    x: window.__HON_GIOI__.match.player.x,
    z: window.__HON_GIOI__.match.player.z,
  }));
  await page.mouse.move(115, 300);
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.__HON_GIOI__.match.player.x - p.x,
        window.__HON_GIOI__.match.player.z - p.z,
      ) > 0.1,
    before,
  );
  await page.mouse.up();
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector("#joystick")).opacity === "0",
  );
  assert.equal(
    await page
      .locator("#joystick")
      .evaluate((e) => getComputedStyle(e).opacity),
    "0",
  );
  checks.floatingJoystick = true;
  const q = await page.locator('[data-skill="0"]').boundingBox();
  const mana = await page.evaluate(() => window.__HON_GIOI__.match.player.mp);
  await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2);
  await page.mouse.down();
  const cancel = await page.locator("#cancelSkill").boundingBox();
  await page.mouse.move(
    cancel.x + cancel.width / 2,
    cancel.y + cancel.height / 2,
  );
  await page.mouse.up();
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.match.player.cooldowns[0]),
    0,
  );
  assert.ok(
    await page.evaluate((v) => window.__HON_GIOI__.match.player.mp >= v, mana),
  );
  checks.cancelSkill = true;
  const touch = await page.context().newCDPSession(page);
  const finger = { x: 70, y: 300, id: 1, radiusX: 4, radiusY: 4, force: 1 };
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [finger],
  });
  const second = {
    x: q.x + q.width / 2,
    y: q.y + q.height / 2,
    id: 2,
    radiusX: 4,
    radiusY: 4,
    force: 1,
  };
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [finger, second],
  });
  const cancelTouch = await page.locator("#cancelSkill").boundingBox();
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { ...finger, x: 100 },
      {
        ...second,
        x: cancelTouch.x + cancelTouch.width / 2,
        y: cancelTouch.y + cancelTouch.height / 2,
      },
    ],
  });
  assert.ok(
    await page
      .locator("#joystick")
      .evaluate((e) => e.classList.contains("active")),
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.match.player.cooldowns[0]),
    0,
  );
  await touch.detach();
  checks.multiTouch = true;

  await page.locator('[data-skill="4"]').tap();
  await page.waitForFunction(
    () => window.__HON_GIOI__.match.player.cooldowns[4] > 0,
  );
  assert.match(
    await page
      .locator('[data-skill="4"] .cd')
      .evaluate((e) => e.style.background),
    /conic-gradient/,
  );
  checks.radial = true;
  await page.locator("#targetHero").tap();
  assert.equal(
    await page.locator("#targetHero").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#targetBeast").tap();
  assert.equal(
    await page.locator("#targetBeast").getAttribute("aria-pressed"),
    "true",
  );
  checks.targets = true;
  console.log("Upgrade: quick buy and craft");
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.debug("money");
    g.debug("shop");
  });
  await page.waitForSelector('[data-quick="0"]:not([disabled])');
  const count = await page.evaluate(
    () => window.__HON_GIOI__.match.player.items.length,
  );
  await page.locator('[data-quick="0"]').tap();
  await page.waitForFunction(
    (n) => window.__HON_GIOI__.match.player.items.length === n + 1,
    count,
  );
  await page.evaluate(() => {
    const m = window.__HON_GIOI__.match;
    window.__HON_GIOI__.sandbox(() => {
      m.player.items = [1, 2];
      m.player.wallet.earned = 1000;
    });
  });
  await page.waitForFunction(() =>
    document.querySelector('[data-quick="0"]').textContent.includes("GHÉP"),
  );
  await page.locator('[data-quick="0"]').tap();
  assert.ok(
    await page.evaluate(() =>
      window.__HON_GIOI__.match.player.items.includes(4),
    ),
  );
  checks.quickTransactions = true;
  await page.locator("#bag").tap();
  assert.equal(await page.locator('[role="dialog"]').count(), 1);
  const close = await page.locator("#closeModal").boundingBox();
  assert.ok(close.width >= 44 && close.height >= 44);
  await page.locator("#closeModal").tap();
  checks.drawer = true;
  await page.locator("#minimap").tap();
  assert.ok(await page.locator(".map-expanded").count());
  await page.locator("#minimap").tap();
  assert.equal(await page.locator(".map-expanded").count(), 0);
  checks.minimap = true;
  console.log("Upgrade: appraisal, altar and gate context");
  await page.evaluate(() => {
    const g = window.__HON_GIOI__,
      m = g.match;
    m.makeDrop(m.player.x, m.player.z, [
      {
        kind: "material",
        id: 1,
        uid: crypto.randomUUID(),
        code: "MAT-01",
        w: 1,
        count: 1,
        value: 25,
        name: "Linh Mộc",
      },
    ]);
  });
  await page.waitForSelector("#pickup:not(.hidden)");
  await page.locator("#pickup").tap();
  assert.ok(await page.locator(".loot-inspection").count());
  await page.locator("#lootQuick").tap();
  checks.appraisal = true;
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.debug("shrine");
    const m = g.match;
    window.__HON_GIOI__.sandbox(() => {
      m.player.bag.push({
        kind: "ring",
        id: 1,
        uid: crypto.randomUUID(),
        code: "HR-01",
        w: 2,
        value: 120,
        name: "Mộc Phược Hoàn",
      });
    });
  });
  await page.waitForSelector("#absorbDirect:not(.hidden)");
  await page.locator("#absorbDirect").tap();
  assert.ok(
    await page.evaluate(() => !!window.__HON_GIOI__.match.player.absorb),
  );
  await page.evaluate(() => {
    window.__HON_GIOI__.sandbox(() => {
      window.__HON_GIOI__.match.player.absorb = null;
    });
  });
  checks.altar = true;
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.debug("open");
    g.debug("gate");
  });
  await page.waitForSelector("#sendDirect:not(.hidden)");
  await page.locator("#sendDirect").tap();
  assert.ok(await page.locator("#confirmSend").count());
  await page.locator("#closeModal").tap();
  checks.contextGate = true;
  // Default combat measurement: no open panel and no nearby interaction; include all painted HUD controls.
  await page.evaluate(() => {
    const m = window.__HON_GIOI__.match;
    window.__HON_GIOI__.sandbox(() => {
      m.player.x = -35;
      m.player.z = -15;
      m.gates = [];
      m.drops = [];
      m.shopPoints = [];
      m.merchants = [];
    });
  });
  await page.waitForSelector("#extract.hidden", { state: "attached" });
  await page.waitForSelector("#sendDirect.hidden", { state: "attached" });
  const selectors = [
    ".minimap-wrap",
    ".match-status",
    ".quick-wallet",
    ".skills>button",
    ".supports-hud>button",
    ".quick-offers>button",
    ".hud-options summary",
    ".player-bar",
    ".debug summary",
    ".context-actions>button",
    "#joystick",
    "#gateBanner",
  ];
  for (const [width, height] of [
    [844, 390],
    [915, 412],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() =>
      document.querySelector("#quickOffers").classList.contains("hidden"),
    );
    const value = await page.evaluate((selectors) => {
      const w = innerWidth,
        h = innerHeight,
        mask = new Uint8Array(w * h),
        rects = [];
      for (const el of new Set(
        selectors.flatMap((s) => [...document.querySelectorAll(s)]),
      )) {
        const st = getComputedStyle(el),
          r = el.getBoundingClientRect();
        if (
          st.display === "none" ||
          st.visibility === "hidden" ||
          +st.opacity === 0 ||
          !el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })
        )
          continue;
        const x0 = Math.max(0, Math.floor(r.left)),
          x1 = Math.min(w, Math.ceil(r.right)),
          y0 = Math.max(0, Math.floor(r.top)),
          y1 = Math.min(h, Math.ceil(r.bottom));
        rects.push({ tag: el.id || el.className, w: x1 - x0, h: y1 - y0 });
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) mask[y * w + x] = 1;
      }
      return {
        width: w,
        height: h,
        occluded: mask.reduce((a, b) => a + b, 0) / (w * h),
        rects,
      };
    }, selectors);
    console.log("HUD coverage", width, height, value.occluded);
    assert.ok(value.occluded <= 0.18, JSON.stringify(value));
    coverage.push(value);
    await page.screenshot({ path: `test-results/upgrade/hud-${width}.png` });
  }
  checks.openArea = true;
  await page.evaluate(() => window.__HON_GIOI__.world.setQuality("ultra"));
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.world.sun.shadow.mapSize.x),
    4096,
  );
  assert.equal(
    await page.evaluate(() => window.__HON_GIOI__.world.composer.passes.length),
    3,
  );
  await page.evaluate(() => window.__HON_GIOI__.world.setQuality("balanced"));
  checks.quality = true;
  assert.deepEqual(errors, []);
  await mkdir("acceptance/evidence", { recursive: true });
  await writeFile(
    "acceptance/evidence/upgrade-browser.json",
    JSON.stringify(
      {
        sourceHash: await fingerprint(),
        passed: true,
        checks,
        coverage,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: Markdown HUD/GLB/LOD/transactions/context/coverage browser checks",
  );
} finally {
  await browser.close();
}
