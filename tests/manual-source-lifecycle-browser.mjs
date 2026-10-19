import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const output = process.env.RIG_LIFECYCLE_OUTPUT ?? 'docs/anim-report/conver10-redo/source-lifecycle-recheck';
await mkdir(output, { recursive: true });
const report = {
  passed: false,
  startedAt: new Date().toISOString(),
  scope: 'Functional source-preview visibility and shared-resource ownership in cloud Chromium ANGLE SwiftShader, main renderer, DPR 1. This is not a phone FPS, Android memory, rig-completion or art-acceptance test.',
  settings: { viewport: { width: 960, height: 432 }, deviceScaleFactor: 1, quality: 'balanced', renderer: 'main' },
  states: [], ownership: [], screenshots: [], errors: [], consoleErrors: [],
};
const server = await createServer({ server: { host: '127.0.0.1', port: 5198, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: report.settings.viewport, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem('hon-gioi-quality', 'balanced'));
  await page.goto('http://127.0.0.1:5198/?renderer=main', { waitUntil: 'domcontentloaded' });

  async function ready(hero) {
    await page.waitForFunction(hero => {
      const root = window.__HON_GIOI__?.world?.preview?.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      return root?.userData.manualAsset.status === 'loaded' && root.userData.manualAsset.sourceFidelity?.status === 'loaded';
    }, hero, { timeout: 180000 });
  }
  async function ownership(label) {
    const data = await page.evaluate(async label => {
      const { manualTemplateMetrics } = await import('/src/manual-asset-cache.js');
      return { label, metrics: manualTemplateMetrics(), tracked: structuredClone(window.__sourceLifecycleQa ?? {}) };
    }, label);
    report.ownership.push(data);
    return data;
  }
  async function track(hero) {
    return await page.evaluate(hero => {
      const root = window.__HON_GIOI__.world.preview.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      window.__sourceLifecycleQa ??= {};
      for (const type of ['source', 'driver']) {
        const geometries = new Set(), textures = new Set();
        root.traverse(node => {
          if (!node.isMesh || (type === 'source' ? !node.userData.tencentSource : !node.isSkinnedMesh)) return;
          geometries.add(node.geometry);
          for (const material of Array.isArray(node.material) ? node.material : [node.material])
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        });
        const record = { geometryCount: geometries.size, textureCount: textures.size, geometryDisposes: 0, textureDisposes: 0 };
        window.__sourceLifecycleQa[`H0${hero + 1}-${type}`] = record;
        for (const geometry of geometries) geometry.addEventListener('dispose', () => record.geometryDisposes++);
        for (const texture of textures) texture.addEventListener('dispose', () => record.textureDisposes++);
      }
    }, hero);
  }
  async function state(hero, time, label, capture = true) {
    await page.evaluate(time => window.__HON_GIOI__.world.seekHeroEntrance(time), time);
    await page.waitForFunction(({ hero, time }) => {
      const root = window.__HON_GIOI__?.world?.preview?.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      const entrance = root?.userData.manualAsset.entrance;
      return time === 6 ? entrance?.complete === true : Math.abs((entrance?.time ?? -1) - time) < 0.01;
    }, { hero, time }, { timeout: 60000 });
    const data = await page.evaluate(async ({ hero, time, label }) => {
      const { manualTemplateMetrics } = await import('/src/manual-asset-cache.js');
      const world = window.__HON_GIOI__.world;
      const root = world.preview.getObjectByName(hero ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
      const sourceBody = root.getObjectByName(hero ? 'H02_Tencent_Original_Body' : 'H01_Tencent_Original_Body');
      const driver = root.getObjectByName('HunyuanBody');
      const effective = node => { for (let current = node; current; current = current.parent) if (!current.visible) return false; return true; };
      const textureSizes = object => {
        const sizes = new Set();
        object.traverse(node => {
          for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : [])
            for (const map of [material.map, material.normalMap, material.metalnessMap, material.roughnessMap])
              if (map?.image) sizes.add(`${map.image.width ?? map.image.naturalWidth}x${map.image.height ?? map.image.naturalHeight}`);
        });
        return [...sizes].sort();
      };
      let sourceWeapon;
      root.traverse(node => { if (node.userData.tencentSource && node.name === (hero ? 'Hammer_Root' : 'Staff_Root')) sourceWeapon = node; });
      const visibleSkinnedMeshes = [];
      driver.traverse(node => { if (node.isSkinnedMesh && effective(node)) visibleSkinnedMeshes.push(node.name); });
      return {
        hero: `H0${hero + 1}`, label, requestedTime: time,
        backend: world.backend, pixelRatio: world.renderer.getPixelRatio(),
        sourceBodyVisible: effective(sourceBody), sourceWeaponVisible: effective(sourceWeapon), visibleSkinnedMeshes,
        bodyTextureSizes: textureSizes(sourceBody), weaponTextureSizes: textureSizes(sourceWeapon),
        fidelity: root.userData.manualAsset.sourceFidelity,
        entrance: root.userData.manualAsset.entrance,
        sourceCache: manualTemplateMetrics(),
        rendererMemoryCounters: { ...world.renderer.info.memory },
        tracked: structuredClone(window.__sourceLifecycleQa),
      };
    }, { hero, time, label });
    assert.equal(data.backend, 'main');
    assert.equal(data.pixelRatio, 1);
    assert.ok(data.bodyTextureSizes.includes('4096x4096'));
    assert.ok(data.weaponTextureSizes.includes('4096x4096'));
    assert.equal(data.fidelity.bodyTriangles, hero ? 1499746 : 1499726);
    assert.equal(data.fidelity.weaponTriangles, hero ? 1500000 : 619640);
    assert.equal(data.sourceBodyVisible, time === 6);
    assert.equal(data.sourceWeaponVisible, time === 6);
    assert.equal(data.visibleSkinnedMeshes.length > 0, time !== 6);
    report.states.push(data);
    if (capture) {
      const path = `${output}/lifecycle-${data.hero.toLowerCase()}-${label}.png`;
      await page.screenshot({ path });
      report.screenshots.push({ path, captureCompletedAt: new Date().toISOString(), preservation: 'Original Playwright PNG; no resize or recompression.' });
    }
    return data;
  }
  function assertLive(record) {
    assert.ok(record.geometryCount > 0);
    assert.ok(record.textureCount > 0);
    assert.equal(record.geometryDisposes, 0);
    assert.equal(record.textureDisposes, 0);
  }
  function assertReleased(record) {
    assert.equal(record.geometryDisposes, record.geometryCount);
    assert.equal(record.textureDisposes, record.textureCount);
  }

  await ready(0);
  await track(0);
  await state(0, 6, 'source-6-before');
  await state(0, 2.1, 'driver-2_1');
  await state(0, 6, 'source-6-after');
  const h01Live = await ownership('H01 live');
  assertLive(h01Live.tracked['H01-source']);
  assertLive(h01Live.tracked['H01-driver']);
  assert.deepEqual(h01Live.metrics, { templates: 4, referenced: 4, leases: 4 });

  await page.locator('[data-hero="1"]').tap();
  await ready(1);
  await track(1);
  await state(1, 6, 'source-6-before');
  // H02 is intentionally hidden until legacy heroLaunch=2.15s. Check its
  // landed, pre-grab pose instead of asserting visibility before launch.
  await state(1, 3, 'driver-3');
  await state(1, 6, 'source-6-after');
  const h02Live = await ownership('H02 live after H01 released');
  assertReleased(h02Live.tracked['H01-source']);
  assertLive(h02Live.tracked['H01-driver']);
  assertLive(h02Live.tracked['H02-source']);
  assertLive(h02Live.tracked['H02-driver']);
  assert.deepEqual(h02Live.metrics, { templates: 6, referenced: 4, leases: 4 });

  await page.locator('#costume').selectOption('1');
  await page.waitForFunction(() => window.__HON_GIOI__.loadout.costume === 1 && !window.__HON_GIOI__.world.preview?.getObjectByName('manualHero_H02_C0'), null, { timeout: 120000 });
  const released = await ownership('Extra costume selected; both original source previews released');
  assertReleased(released.tracked['H01-source']);
  assertReleased(released.tracked['H02-source']);
  assertLive(released.tracked['H01-driver']);
  assertLive(released.tracked['H02-driver']);
  assert.deepEqual(released.metrics, { templates: 4, referenced: 0, leases: 0 });
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.consoleErrors, []);
  report.passed = true;
  console.log('PASS: H01/H02 source → driver seek → source, original 4096 maps, DPR1, source GPU resource disposal and retained gameplay templates.');
} catch (error) {
  report.failure = error.stack ?? String(error);
  throw error;
} finally {
  await browser?.close();
  await server.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`${output}/source-lifecycle-browser.json`, JSON.stringify(report, null, 2) + '\n');
}
