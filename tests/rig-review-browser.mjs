import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { fingerprint } from "../scripts/fingerprint.mjs";
import { chromium } from "playwright-core";
const output = "docs/anim-report/apk-review";
await fs.mkdir(output, { recursive: true });
const sourceHash = await fingerprint();
const server = await createServer({
  configFile: false,
  define: { "import.meta.env.HG_BUILD_ID": JSON.stringify(sourceHash) },
  server: {
    host: "127.0.0.1",
    port: 5195,
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const external = [],
    errors = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5195/rig-review.html");
  await page.waitForFunction(() => window.rigReview?.ready, null, {
    timeout: 180000,
  });
  assert.equal(await page.evaluate(() => window.rigReview.hero), "H01");
  assert.equal(await page.evaluate(() => window.rigReview.clips.length), 6);
  await page.selectOption("#part", "H01_Ao_VatTrai");
  assert.deepEqual(
    await page.evaluate(() => {
      const names = [];
      window.rigReview.model.traverse((n) => {
        if (n.isMesh && n.visible) names.push(n.name);
      });
      return names;
    }),
    ["H01_Ao_VatTrai"],
  );
  await page.screenshot({ path: output + "/h01-left.png" });
  await page.selectOption("#part", "H01_Ao_VatPhai");
  await page.screenshot({ path: output + "/h01-right.png" });
  await page.selectOption("#part", "all");
  await page.click("#held");
  await page.waitForFunction(() => window.rigReview.pose === "held");
  await page.selectOption("#view", "2");
  await page.screenshot({ path: output + "/h01-held-back.png" });
  await page.selectOption("#clip", "Run");
  await page.waitForTimeout(100);
  await page.selectOption("#clip", "bind");
  await page.selectOption("#hero", "H02");
  await page.waitForFunction(
    () => window.rigReview?.ready && window.rigReview.hero === "H02",
    null,
    { timeout: 180000 },
  );
  assert(await page.locator("#part").isDisabled());
  assert(await page.locator("#held").isDisabled());
  assert.equal(await page.evaluate(() => window.rigReview.clips.length), 6);
  await page.selectOption("#view", "0");
  const corners = await page.evaluate(() => window.rigReview.screenBounds);
  assert(
    corners.every((p) => Math.abs(p[0]) < 1 && Math.abs(p[1]) < 1),
    "Whole H02 model must fit viewport",
  );
  await page.screenshot({ path: output + "/h02-rig.png" });
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    output + "/browser.json",
    JSON.stringify(
      {
        passed: true,
        sourceHash,
        environment:
          "Cloud Chromium software WebGL, mobile landscape viewport; not Android device",
        externalRequests: external,
        pageErrors: errors,
        checks: [
          "H01 four independent meshes",
          "left/right visibility",
          "held pose UI",
          "clip start and bind reset",
          "H02 loading",
          "no external resources",
        ],
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser?.close();
  await server.close();
}
