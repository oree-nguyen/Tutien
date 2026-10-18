import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const output = 'test-results/hunyuan-original-preview';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5188, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 960, height: 432 }, deviceScaleFactor: 2.75, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

async function inspect(hero, bodyName, weaponName, bodyTriangles, weaponTriangles) {
  await page.waitForFunction(heroIndex => {
    const root = window.__HON_GIOI__?.world?.preview?.getObjectByName(heroIndex ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
    return root?.userData.manualAsset.status === 'loaded' && root?.userData.manualAsset.sourceFidelity?.status === 'loaded';
  }, hero, { timeout: 120000 });
  await page.evaluate(() => window.__HON_GIOI__.world.seekHeroEntrance(6));
  await page.waitForFunction(heroIndex => {
    const root = window.__HON_GIOI__.world.preview.getObjectByName(heroIndex ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
    return root.userData.manualAsset.entrance?.complete === true;
  }, hero);
  const report = await page.evaluate(async ({ heroIndex, bodyNodeName, weaponNodeName }) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const world = window.__HON_GIOI__.world;
    const root = world.preview.getObjectByName(heroIndex ? 'manualHero_H02_C0' : 'manualHero_H01_C0');
    const body = world.preview.getObjectByName(bodyNodeName);
    let weapon;
    root.traverse(node => { if (node.name === weaponNodeName && node.userData.tencentSource) weapon = node; });
    const mapSizes = object => {
      const sizes = [];
      object.traverse(node => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) for (const map of [material.map, material.normalMap, material.metalnessMap, material.roughnessMap]) {
          if (map?.image) sizes.push([map.image.width ?? map.image.naturalWidth, map.image.height ?? map.image.naturalHeight]);
        }
      });
      return sizes;
    };
    const box = object => { const bounds = new THREE.Box3().setFromObject(object); return { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray(), position: object.getWorldPosition(new THREE.Vector3()).toArray(), scale: object.getWorldScale(new THREE.Vector3()).toArray() }; };
    return { fidelity: root.userData.manualAsset.sourceFidelity, pixelRatio: world.renderer.getPixelRatio(), bodyVisible: body.visible, weaponVisible: weapon.visible, bodyBounds: box(body), weaponBounds: box(weapon), bodyTextureSizes: mapSizes(body), weaponTextureSizes: mapSizes(weapon) };
  }, { heroIndex: hero, bodyNodeName: bodyName, weaponNodeName: weaponName });
  assert.equal(report.pixelRatio, 2.75);
  assert.equal(report.bodyVisible, true);
  assert.equal(report.weaponVisible, true);
  assert.equal(report.fidelity.bodyTriangles, bodyTriangles);
  assert.equal(report.fidelity.weaponTriangles, weaponTriangles);
  assert.ok(report.bodyTextureSizes.some(([width, height]) => width === 4096 && height === 4096));
  assert.ok(report.weaponTextureSizes.some(([width, height]) => width === 4096 && height === 4096));
  await page.screenshot({ path: `${output}/h0${hero + 1}-tencent-original.png` });
  return report;
}

try {
  await page.addInitScript(() => localStorage.setItem('hon-gioi-quality', 'balanced'));
  await page.goto('http://127.0.0.1:5188/?renderer=main');
  const reports = [];
  reports.push(await inspect(0, 'H01_Tencent_Original_Body', 'Staff_Root', 1499726, 619640));
  await page.locator('[data-hero="1"]').tap();
  reports.push(await inspect(1, 'H02_Tencent_Original_Body', 'Hammer_Root', 1499746, 1500000));
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ passed: true, reports, errors, scope: 'Cloud Chromium SwiftShader at DPR 2.75; original Tencent meshes, 4096 PBR maps; not a physical Android device.' }, null, 2));
  console.log('H01/H02 Tencent original lobby previews passed.');
} finally {
  await browser.close();
  await server.close();
}
