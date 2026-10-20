import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { Match } from '../src/simulation.js';
import { newProfile } from '../src/rules.js';

// This server intentionally exposes only the exported document. No public/ or
// source-file fallback can conceal a missing resource in the single-file export.
const input = path.resolve(process.env.HG_STANDALONE_FILE ?? 'release/Hon-Gioi-Sinh-Ton.html');
const output = process.env.HG_STANDALONE_SMOKE_OUTPUT ?? 'test-results/standalone-source-smoke';
await mkdir(output, { recursive: true });
const report = {
  passed: false, startedAt: new Date().toISOString(),
  scope: 'Exact exported single-file HTML, cloud Chromium ANGLE SwiftShader, DPR 1, original 4096 source textures. Network disabled except this one streamed local document. This is not Android FPS, rig acceptance, or gameplay completion evidence.',
  input: { path: path.relative(process.cwd(), input) },
  settings: { viewport: { width: 960, height: 432 }, deviceScaleFactor: 1, quality: 'balanced', renderer: 'main' },
  documentRequests: 0, blockedRequests: [], missingRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [],
  screenshots: [], states: [], checks: {},
};
const hash = createHash('sha256');
for await (const chunk of createReadStream(input)) hash.update(chunk);
report.input.sha256 = hash.digest('hex');
report.input.bytes = (await stat(input)).size;

function safeUrl(value) {
  if (value.startsWith('data:')) return value.slice(0, Math.min(value.indexOf(','), 100)) + ',[embedded]';
  if (value.startsWith('blob:')) return 'blob:[local]';
  try { const url = new URL(value); return url.origin + url.pathname; } catch { return value.slice(0, 200); }
}
const server = http.createServer((request, response) => {
  if (request.url?.split('?')[0] === '/Hon-Gioi-Sinh-Ton.html') {
    report.documentRequests++;
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': report.input.bytes, 'Cache-Control': 'no-store' });
    const stream = createReadStream(input);
    stream.on('error', error => response.destroy(error));
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } else if (request.url === '/favicon.ico') {
    response.writeHead(204).end();
  } else {
    report.missingRequests.push(request.url);
    response.writeHead(404).end('Only the exact standalone HTML is exposed.');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: report.settings.viewport, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  page = await context.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(300000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 2000)); });
  page.on('requestfailed', request => report.requestFailures.push({ url: safeUrl(request.url()), error: request.failure()?.errorText }));
  page.on('crash', () => report.pageErrors.push('Chromium renderer crashed.'));
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    report.blockedRequests.push(safeUrl(url));
    await route.abort('blockedbyclient');
  });
  const profile = newProfile();
  const snapshot = new Match({ hero: 0, branch: 0, rings: [0, 0], bones: [], supports: [], mode: 'solo', brought: 80 }, profile).snapshot();
  await page.addInitScript(({ profile, snapshot }) => {
    localStorage.setItem('hon-gioi-quality', 'balanced');
    localStorage.setItem('hon-gioi-save-v2', JSON.stringify({ version: 4, profile, match: snapshot, activeRun: null }));
    localStorage.setItem('standalone-smoke-unrelated', 'preserve');
  }, { profile, snapshot });
  const start = Date.now();
  await page.goto(origin + '/Hon-Gioi-Sinh-Ton.html?renderer=main', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('.boot-shell')?.textContent.includes('Lâm Dật') || document.querySelector('.hero-heading')?.textContent === 'Lâm Dật');
  report.timings = { shellObservedAfterNavigationMs: Date.now() - start };
  console.log(`Standalone HTML shell observed: ${report.timings.shellObservedAfterNavigationMs}ms`);
  await page.locator('.hub').waitFor({ state: 'visible', timeout: 300000 });
  report.timings.interactiveLobbyMs = Date.now() - start;
  console.log(`Interactive standalone lobby: ${report.timings.interactiveLobbyMs}ms`);
  await page.waitForFunction(() => !!window.__HON_GIOI__?.world, null, { timeout: 300000 });
  assert.equal(await page.locator('[data-hero]').count(), 12);
  assert.ok(await page.locator('.loadout-panel').isVisible());
  assert.ok(await page.locator('#resumeOffline').isVisible());
  assert.ok(await page.locator('#showcaseFull').isVisible());
  report.checks.completeLobbyAndExplicitResumeVisible = true;

  async function capture(label) {
    const file = `${output}/${label}.png`;
    await page.screenshot({ path: file });
    report.screenshots.push({ path: file, captureCompletedAt: new Date().toISOString(), preservation: 'Original Playwright PNG, no resize/recompression.' });
  }
  async function source(hero) {
    const h = hero ? 'H02' : 'H01';
    await page.waitForFunction(hero => {
      const root = window.__HON_GIOI__?.world?.preview?.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      return root?.userData.manualAsset.status === 'loaded' && root.userData.manualAsset.sourceFidelity?.status === 'loaded';
    }, hero, { timeout: 300000 });
    await page.evaluate(() => window.__HON_GIOI__.world.seekHeroEntrance(6));
    await page.waitForFunction(hero => window.__HON_GIOI__.world.preview.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0')?.userData.manualAsset.entrance?.complete, hero);
    const state = await page.evaluate(hero => {
      const app = window.__HON_GIOI__, world = app.world;
      const root = world.preview.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      const body = root.getObjectByName(hero ? 'H02_Tencent_Original_Body' : 'H01_Tencent_Original_Body');
      let weapon;
      root.traverse(node => { if (node.userData.tencentSource && node.name === (hero ? 'Hammer_Root' : 'Staff_Root')) weapon = node; });
      const visible = node => { if (!node) return false; for (let current = node; current; current = current.parent) if (!current.visible) return false; return true; };
      const sizes = node => {
        const found = new Set();
        node?.traverse(child => { for (const material of child.material ? Array.isArray(child.material) ? child.material : [child.material] : [])
          for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap])
            if (texture?.image) found.add(`${texture.image.width ?? texture.image.naturalWidth}x${texture.image.height ?? texture.image.naturalHeight}`);
        });
        return [...found].sort();
      };
      return { hero: hero ? 'H02' : 'H01', phase: app.lifecycle.phase, matchIsNull: app.match === null,
        sourceBodyVisible: visible(body), sourceWeaponVisible: visible(weapon), bodyTextureSizes: sizes(body), weaponTextureSizes: sizes(weapon),
        sourceFidelity: root.userData.manualAsset.sourceFidelity, entrance: root.userData.manualAsset.entrance,
        backend: world.backend, pixelRatio: world.renderer.getPixelRatio(),
        bodyVisibilityChain: (() => { const result = []; for (let current = body; current; current = current.parent) result.push({ name: current.name, visible: current.visible }); return result; })(),
        weaponVisibilityChain: (() => { const result = []; for (let current = weapon; current; current = current.parent) result.push({ name: current.name, visible: current.visible }); return result; })(),
        rendererCounters: { memory: { ...world.renderer.info.memory }, render: { ...world.renderer.info.render } },
        pendingOfflineSnapshot: !!JSON.parse(localStorage.getItem('hon-gioi-save-v2')).match,
        boot: app.boot, remainingEmbeddedPayloadBlocks: document.querySelectorAll('[id^="hg-embedded-model-"]').length,
        paints: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: entry.startTime })),
      };
    }, hero);
    state.observedAfterNavigationMs = Date.now() - start;
    report.states.push(state);
    console.log(`${h} source checkpoint: ${state.observedAfterNavigationMs}ms; effective body=${state.sourceBodyVisible}, weapon=${state.sourceWeaponVisible}`);
    assert.equal(state.phase, 'LOBBY_HON_THANH');
    assert.equal(state.matchIsNull, true);
    assert.equal(state.pendingOfflineSnapshot, true);
    assert.equal(state.sourceBodyVisible, true);
    assert.equal(state.sourceWeaponVisible, true);
    assert.equal(state.backend, 'main');
    assert.equal(state.pixelRatio, 1);
    assert.ok(state.bodyTextureSizes.includes('4096x4096'));
    assert.ok(state.weaponTextureSizes.includes('4096x4096'));
    assert.equal(state.sourceFidelity.bodyTriangles, hero ? 1499746 : 1499726);
    assert.equal(state.sourceFidelity.weaponTriangles, hero ? 1500000 : 619640);
    await capture(`${h.toLowerCase()}-full-source`);
    return state;
  }
  const h01 = await source(0);
  report.timings.h01SourceReadyMs = h01.observedAfterNavigationMs;
  await page.waitForTimeout(10000);
  assert.equal(await page.evaluate(() => window.__HON_GIOI__.match), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('standalone-smoke-unrelated')), 'preserve');
  report.checks.stillLobbyAfterTenSecondsWithSavedMatch = true;
  if (process.env.HG_STANDALONE_SKIP_H02 !== '1') {
    await page.locator('[data-hero="1"]').tap();
    const h02 = await source(1);
    report.timings.h02SourceReadyCumulativeMs = h02.observedAfterNavigationMs;
  }
  assert.equal(report.documentRequests, 1);
  assert.deepEqual(report.blockedRequests, []);
  assert.deepEqual(report.missingRequests, []);
  assert.deepEqual(report.requestFailures, []);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.consoleErrors, []);
  report.checks.noExternalOrMissingAssets = true;
  report.checks.originalSourceBodyWeaponAnd4096Textures = true;
  report.passed = true;
  console.log('PASS: exact standalone HTML works offline with explicit-resume lobby and original source character/weapon textures.');
} catch (error) {
  report.failure = error.stack ?? String(error);
  if (page && !page.isClosed()) {
    try {
      const file = `${output}/failure.png`;
      await page.screenshot({ path: file, timeout: 30000 });
      report.screenshots.push({ path: file, captureCompletedAt: new Date().toISOString(), preservation: 'Original Playwright PNG, no resize/recompression.' });
    } catch (captureError) { report.failureScreenshotError = captureError.message; }
  }
  process.exitCode = 1;
  console.error(report.failure);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  await writeFile(`${output}/standalone-source-smoke.json`, JSON.stringify(report, null, 2) + '\n');
}
