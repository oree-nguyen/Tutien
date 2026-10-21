import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer, preview } from "vite";
import { chromium } from "playwright-core";
import { fingerprint } from "../scripts/fingerprint.mjs";
const directory = "docs/anim-report/conver10-approved-repair-2026-10-21";
const production = process.env.SHOWCASE_PRODUCTION === "1",
  port = 5226;
await fs.mkdir(directory, { recursive: true });
const server = production
  ? await preview({ preview: { host: "127.0.0.1", port, strictPort: true } })
  : await createServer({
      server: {
        host: "127.0.0.1",
        port,
        strictPort: true,
        hmr: false,
        watch: { ignored: ["**/.local/**", "**/docs/**", "**/picture/**"] },
      },
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
const report = {
  passed: false,
  sourceHash: await fingerprint(),
  production,
  scope:
    "Actual sampled local pose, textures, triangles and visible mesh and UI mode on both render backends; cloud Chromium, no skin acceptance or Android claim",
  states: [],
  errors: [],
  externalRequests: [],
};
try {
  for (const backend of ["worker", "main"]) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 576 },
        hasTouch: true,
        serviceWorkers: production ? "allow" : "block",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) =>
      report.errors.push({ backend, message: e.message }),
    );
    page.on("request", (r) => {
      if (
        /^https?:/.test(r.url()) &&
        !r.url().startsWith(`http://127.0.0.1:${port}/`)
      )
        report.externalRequests.push(r.url());
    });
    await page.goto(
      `http://127.0.0.1:${port}/` +
        (backend === "main" ? "?renderer=main" : ""),
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForFunction(() => !!window.__HON_GIOI__?.world, {
      timeout: 240000,
    });
    const packagedSourceHash = await page.evaluate(
      () => window.__HON_GIOI__.build.sourceHash,
    );
    assert.equal(
      packagedSourceHash,
      report.sourceHash,
      "Browser must execute the current built source, not an older dist",
    );
    assert.equal(
      await page.evaluate(() => window.__HON_GIOI__.world.backend),
      backend,
      "Test must cover actual worker, not silently fallback",
    );
    async function snapshot() {
      return page.evaluate(async () => {
        const w = window.__HON_GIOI__.world;
        return w.backend === "worker"
          ? (await w.inspect()).showcase
          : w.inspectShowcase();
      });
    }
    for (const hero of [0, 1]) {
      if (hero) await page.locator('[data-hero="1"]').click();
      await page.waitForFunction(
        (h) => {
          const w = window.__HON_GIOI__.world;
          let asset = w.previewAsset;
          if (w.backend === "main")
            w.preview?.traverse((n) => {
              if (n.userData.manualHunyuan) asset = n.userData.manualAsset;
            });
          return (
            asset?.id === (h ? "H02-C0" : "H01-C0") &&
            asset.status === "loaded" &&
            asset.sourceFidelity?.status === "loaded"
          );
        },
        hero,
        { timeout: 300000 },
      );
      for (const enabled of [true, false, true]) {
        if (
          (await page.evaluate(
            () => !!window.__HON_GIOI__.world.showcaseAnimationMode,
          )) !== enabled
        )
          await page.locator("#showcaseMotion").click();
        await page.evaluate(
          async () => await window.__HON_GIOI__.world.seekHeroEntrance(3.5),
        );
        const actual = await snapshot();
        assert.equal(actual.heroId, hero ? "H02-C0" : "H01-C0");
        assert.equal(actual.animationMode, enabled);
        assert.equal(
          actual.visibleSkinned > 0,
          enabled,
          backend + " actual skinned mesh visibility",
        );
        assert.equal(
          actual.visibleSource > 0,
          !enabled,
          backend + " actual source visibility",
        );
        report.states.push({ backend, hero, enabled, actual });
      }
      await page.locator("#showcaseFace").click();
      await page.evaluate(
        async () => await window.__HON_GIOI__.world.seekHeroEntrance(4.5),
      );
      const face = await snapshot();
      assert.equal(face.visibleSkinned > 0, true);
      assert.equal(face.visibleSource, 0);
      await page.locator("#showcaseFull").click();
      await page.locator('[data-hero="' + hero + '"]').click();
      await page.evaluate(
        async () => await window.__HON_GIOI__.world.seekHeroEntrance(1.3),
      );
      const replay = await snapshot();
      assert.equal(replay.visibleSkinned > 0, true);
      assert.equal(replay.visibleSource, 0);
      report.states.push({ backend, hero, phase: "face-replay", face, replay });
      console.log(backend, hero, "mode, face and replay passed");
    }
    await context.close();
  }
  const parity = [];
  for (let i = 0; i < 8; i++) {
    const worker = report.states[i],
      main = report.states[i + 8];
    assert.equal(worker.hero, main.hero);
    for (const key of worker.phase ? ["face", "replay"] : ["actual"]) {
      const a = worker[key],
        b = main[key];
      assert.equal(a.entranceTime, b.entranceTime);
      assert.equal(a.visibleSkinned, b.visibleSkinned);
      assert.equal(a.visibleSource, b.visibleSource);
      assert.deepEqual(a.meshes, b.meshes);
      assert.equal(a.bones.length, b.bones.length);
      let maximum = 0;
      a.bones.forEach((bone, j) => {
        const other = b.bones[j];
        assert.equal(bone.name, other.name);
        for (const channel of ["position", "quaternion", "scale"])
          for (let k = 0; k < bone[channel].length; k++)
            maximum = Math.max(
              maximum,
              Math.abs(bone[channel][k] - other[channel][k]),
            );
      });
      assert.ok(maximum <= 1e-8, "Main/worker pose discrepancy " + maximum);
      parity.push({
        hero: worker.hero,
        phase: key,
        time: a.entranceTime,
        bones: a.bones.length,
        maximumChannelDifference: maximum,
      });
    }
  }
  report.parity = parity;
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  report.passed = true;
} finally {
  await fs.writeFile(
    process.env.SHOWCASE_REPORT ??
      `${directory}/showcase-${production ? "production" : "development"}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  if (production) await new Promise((r) => server.httpServer.close(r));
  else await server.close();
}
