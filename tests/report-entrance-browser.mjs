import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer, preview } from "vite";
import { chromium } from "playwright-core";
const directory = "docs/anim-report/conver10-redo/gemini-2026-10-21",
  production = process.env.REPORT_PRODUCTION === "1";
await fs.mkdir(directory, { recursive: true });
const server = production
  ? await preview({
      preview: { host: "127.0.0.1", port: 5213, strictPort: true },
    })
  : await createServer({
      server: { host: "127.0.0.1", port: 5213, strictPort: true, hmr: false },
    });
if (!production) await server.listen();
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
    viewport: { width: 1280, height: 576 },
    deviceScaleFactor: 1,
    hasTouch: true,
    serviceWorkers: production ? "allow" : "block",
  }),
  page = await context.newPage();
const report = {
  passed: false,
  scope:
    "Cloud Chromium/SwiftShader, not physical Android; verifies new motion playback on shipped rig, not full-resolution skin acceptance",
  production,
  states: [],
  screenshots: [],
  errors: [],
  consoleErrors: [],
  externalRequests: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") report.consoleErrors.push(m.text());
});
page.on("request", (r) => {
  if (/^https?:/.test(r.url()) && !r.url().startsWith("http://127.0.0.1:5213/"))
    report.externalRequests.push(r.url());
});
const prefix = production ? "production" : "after";
async function state(h, t, label, capture = true) {
  await page.evaluate((t) => window.__HON_GIOI__.world.seekHeroEntrance(t), t);
  await page.waitForFunction(
    ({ h, t }) =>
      Math.abs(
        (window.__HON_GIOI__?.world?.preview?.getObjectByName(
          h ? "manualHero_H02_C0" : "manualHero_H01_C0",
        )?.userData.manualAsset.entrance?.time ?? -1) - t,
      ) < 0.01,
    { h, t },
    { timeout: 90000 },
  );
  const record = await page.evaluate(
    ({ h, t, label }) => {
      const world = window.__HON_GIOI__.world,
        root = world.preview.getObjectByName(
          h ? "manualHero_H02_C0" : "manualHero_H01_C0",
        ),
        asset = root.userData.manualAsset;
      let visibleSkinned = 0,
        sourceVisible = 0;
      const effective = (n) => {
        for (let p = n; p; p = p.parent) if (!p.visible) return false;
        return true;
      };
      root.traverse((n) => {
        if (n.isSkinnedMesh && effective(n)) visibleSkinned++;
        if (n.userData.tencentSource && n.isMesh && effective(n))
          sourceVisible++;
      });
      return {
        hero: h,
        time: t,
        label,
        asset: structuredClone(asset),
        animationMode: !!root.userData.previewAnimation,
        visibleSkinned,
        sourceVisible,
        pixelRatio: world.renderer.getPixelRatio(),
      };
    },
    { h, t, label },
  );
  assert.equal(record.asset.entrance.player, "gemini-motion-2026-10-21");
  assert.equal(record.asset.motion.weightsReplaced, false);
  assert.equal(record.asset.motion.gripHand, h ? "left" : "right");
  assert.equal(record.animationMode, true);
  assert.ok(record.visibleSkinned > 0);
  assert.equal(record.sourceVisible, 0);
  report.states.push(record);
  if (capture) {
    const file = `${directory}/${prefix}-H0${h + 1}-${label}.png`;
    await page.screenshot({ path: file, timeout: 120000 });
    report.screenshots.push({ file, capturedAt: new Date().toISOString() });
  }
  await fs.writeFile(
    `${directory}/${prefix}-browser-progress.json`,
    JSON.stringify(report, null, 2),
  );
}
try {
  await page.goto("http://127.0.0.1:5213/?renderer=main", {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#start").waitFor({ timeout: 120000 });
  await page.waitForFunction(() => !!window.__HON_GIOI__?.build?.sourceHash);
  report.sourceHash=await page.evaluate(() => window.__HON_GIOI__.build.sourceHash);
  if(process.env.REPORT_EXPECTED_BUILD)
    assert.equal(report.sourceHash,process.env.REPORT_EXPECTED_BUILD,"Preview is not the requested APK build");
  for (const h of [0, 1]) {
    if (h) await page.locator('[data-hero="1"]').click();
    await page.waitForFunction(
      (h) =>
        window.__HON_GIOI__?.world?.preview?.getObjectByName(
          h ? "manualHero_H02_C0" : "manualHero_H01_C0",
        )?.userData.manualAsset.sourceFidelity?.status === "loaded",
      h,
      { timeout: 240000 },
    );
    if (
      !(await page.evaluate(
        () => !!window.__HON_GIOI__.world.showcaseAnimationMode,
      ))
    )
      await page.locator("#showcaseMotion").click();
    for (const [t, label] of [
      [1.3, "crouch"],
      [2.25, "rise"],
      [3.5, "hold"],
      [7.5, "loop"],
    ])
      await state(h, t, label, !production || label === "hold");
    await page.locator("#showcaseFace").click();
    await state(h, 3.5, "face", !production);
    await page.locator("#showcaseFull").click();
    await page.locator('[data-hero="' + h + '"]').click();
    await state(h, 1.3, "replay", false);
    await page.locator("#showcaseMotion").click();
    await page.evaluate(() => window.__HON_GIOI__.world.seekHeroEntrance(6));
    await page.waitForFunction((h) => {
      let visible = false;
      window.__HON_GIOI__.world.preview.traverse((n) => {
        if (
          n.name ===
          (h ? "H02_Tencent_Original_Body" : "H01_Tencent_Original_Body")
        )
          visible = n.visible;
      });
      return visible;
    }, h);
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.externalRequests, []);
  report.passed = true;
  console.log(
    JSON.stringify({
      passed: true,
      production,
      states: report.states.length,
      images: report.screenshots.length,
    }),
  );
} finally {
  await fs.writeFile(
    `${directory}/${prefix}-browser.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  if (production)
    await new Promise((resolve) => server.httpServer.close(resolve));
  else await server.close();
}
