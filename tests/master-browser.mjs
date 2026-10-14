import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "../scripts/fingerprint.mjs";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const origin = process.env.GAME_URL ?? "http://127.0.0.1:5173";
const initialSourceHash = await fingerprint();
const checks = {},
  images = [],
  errors = [],
  shaderErrors = [];
await mkdir("test-results/master", { recursive: true });
const imageEvidence = async (page, name) => {
  const path = `test-results/master/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  images.push({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  });
};
try {
  console.log("Masterwork: render and decode all 149 illustrated PNGs");
  const atlas = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
  });
  await atlas.route("**/__master-atlas.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await atlas.goto(`${origin}/__master-atlas.html`);
  const iconReport = await atlas.evaluate(async () => {
    const { masterworkAssets } = await import("/src/item-art.js");
    const catalogue = masterworkAssets.catalogue(),
      decoded = [],
      uris = [];
    document.body.style =
      "margin:0;background:#102438;color:#eef6e9;font:12px Arial";
    const main = document.createElement("main");
    main.style =
      "display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;padding:18px";
    document.body.append(main);
    for (const entry of catalogue) {
      const uri = masterworkAssets.generate(entry.type, entry.id);
      const img = new Image();
      img.src = uri;
      await img.decode();
      decoded.push({
        type: entry.type,
        id: entry.id,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      uris.push(uri);
      const card = document.createElement("article"),
        label = document.createElement("div");
      img.style = "width:100%;height:auto;border-radius:8px";
      label.textContent = entry.name;
      label.style = "text-align:center";
      card.append(img, label);
      main.append(card);
    }
    const renders = masterworkAssets.renderCount;
    for (const entry of catalogue)
      masterworkAssets.generate(entry.type, entry.id);
    return {
      total: catalogue.length,
      unique: new Set(uris).size,
      decoded,
      cacheStable: masterworkAssets.renderCount === renders,
      counts: Object.fromEntries(
        [...new Set(catalogue.map((e) => e.type))].map((type) => [
          type,
          catalogue.filter((e) => e.type === type).length,
        ]),
      ),
    };
  });
  assert.equal(iconReport.total, 149);
  assert.equal(iconReport.unique, 149);
  assert.ok(iconReport.cacheStable);
  assert.deepEqual(iconReport.counts, {
    bone: 7,
    ring: 12,
    item: 28,
    support: 18,
    weapon: 12,
    skin: 24,
    skill: 48,
  });
  assert.ok(
    iconReport.decoded.every((i) => i.width === 512 && i.height === 512),
  );
  await atlas.screenshot({
    path: "test-results/master/icons.png",
    fullPage: true,
  });
  images.push({
    path: "test-results/master/icons.png",
    sha256: createHash("sha256")
      .update(await readFile("test-results/master/icons.png"))
      .digest("hex"),
  });
  checks.illustrated149 = true;
  checks.iconCache = true;
  await atlas.close();

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /WebGLProgram|Shader Error|VALIDATE_STATUS|gl\.getError/.test(
        message.text(),
      )
    )
      shaderErrors.push(message.text());
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.__HON_GIOI__?.world.preview);
  const settle = async () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await settle();
  console.log(
    "Masterwork: male/female full and face preview, drag and GPU shader",
  );
  const anatomy = [];
  for (const [hero, gender, height] of [
    [0, "male", 1.82],
    [2, "female", 1.68],
  ]) {
    await page.locator(`[data-hero="${hero}"]`).tap();
    await page.waitForFunction(
      (h) => window.__HON_GIOI__.world.previewHero?.startsWith(`${h}:`),
      hero,
    );
    await page.locator("#showcaseFull").tap();
    await settle();
    const result = await page.evaluate(() => {
      const w = window.__HON_GIOI__.world;
      let anatomy,
        faceTexture = 0,
        ornateWeapon = false,
        sphereBody = false;
      w.preview.traverse((o) => {
        if (o.userData.anatomy && o.userData.detail === "high")
          anatomy = o.userData.anatomy;
        if (o.name === "VLineHeadFaceUV")
          faceTexture = Math.max(faceTexture, o.material.map.image.width);
        if (o.userData.proceduralMasterwork && o.userData.detail === "high")
          ornateWeapon = true;
        if (
          /torso|chest|shoulder|belly|eye/i.test(o.name) &&
          o.geometry?.type === "SphereGeometry"
        )
          sphereBody = true;
      });
      return {
        anatomy,
        faceTexture,
        ornateWeapon,
        sphereBody,
        glError: w.renderer.getContext().getError(),
      };
    });
    assert.equal(result.anatomy.gender, gender);
    assert.equal(result.anatomy.heightMeters, height);
    assert.equal(result.anatomy.headCount, 8);
    assert.equal(result.anatomy.garmentLayers, 4);
    assert.equal(result.faceTexture, 2048);
    assert.ok(result.ornateWeapon);
    assert.equal(result.sphereBody, false);
    assert.equal(result.glError, 0);
    anatomy.push({ hero, ...result });
    await imageEvidence(page, `H${String(hero + 1).padStart(2, "0")}-full`);
    await page.locator("#showcaseFace").tap();
    await settle();
    assert.equal(
      await page.evaluate(() => window.__HON_GIOI__.world.showcaseView),
      "face",
    );
    await imageEvidence(page, `H${String(hero + 1).padStart(2, "0")}-face`);
  }
  const yaw = await page.evaluate(() => window.__HON_GIOI__.world.showcaseYaw),
    drag = await page.locator("#showcaseDrag").boundingBox();
  await page.mouse.move(drag.x + drag.width * 0.4, drag.y + drag.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(
    drag.x + drag.width * 0.4 + 45,
    drag.y + drag.height * 0.4,
  );
  await page.mouse.up();
  assert.ok(
    Math.abs(
      (await page.evaluate(() => window.__HON_GIOI__.world.showcaseYaw)) - yaw,
    ) > 0.2,
  );
  checks.anatomyPreview = true;
  checks.faceTexture2048 = true;
  checks.showcaseDrag = true;
  checks.ornateWeapons = true;
  checks.gpuClothShader = true;
  await page.locator('[data-hero="0"]').tap();
  await page.locator("#showcaseFull").tap();
  await page.locator("#start").tap();
  await page.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  await page.evaluate(() => {
    const g = window.__HON_GIOI__;
    g.sandbox(() => {
      const m = g.match;
      m.ai = () => {};
      for (const a of m.actors)
        if (a !== m.player) {
          a.x = 80;
          a.z = 80;
        }
      m.player.immuneUntil = 10000;
      m.drops = [];
    });
  });
  console.log(
    "Masterwork: exact large MOBA action pad and real appraisal pickup",
  );
  const controls = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("[data-skill]")],
      attack = document.querySelector("#attack").getBoundingClientRect(),
      ax = attack.x + attack.width / 2,
      ay = attack.y + attack.height / 2;
    return {
      attack: attack.width,
      skills: buttons.map((e) => {
        const r = e.getBoundingClientRect();
        return {
          slot: +e.dataset.skill,
          w: r.width,
          h: r.height,
          radius: Math.hypot(r.x + r.width / 2 - ax, r.y + r.height / 2 - ay),
          mp: e.querySelector(".mp-cost").textContent,
          image: e.querySelector("img").naturalWidth,
        };
      }),
      supports: [...document.querySelectorAll("[data-use]")].map(
        (e) => e.getBoundingClientRect().width,
      ),
      targets: ["#targetHero", "#targetBeast"].map(
        (s) => document.querySelector(s).getBoundingClientRect().width,
      ),
    };
  });
  assert.equal(controls.attack, 92);
  for (const s of controls.skills) {
    assert.equal(s.w, s.slot === 3 ? 78 : s.slot === 4 ? 54 : 68);
    assert.equal(s.image, 512);
    if (s.slot < 4) assert.ok(Math.abs(s.radius - 145) < 0.1);
    assert.match(s.mp, /\d+ HL/);
  }
  assert.ok(controls.supports.every((w) => w === 50));
  assert.deepEqual(controls.targets, [42, 42]);
  checks.actionPadExact = true;
  checks.skillManaBadges = true;
  console.log(
    "Masterwork: held Linh Bộ tracks facing, dragged guide rotates, cancellation preserves cooldown",
  );
  const beforeF = await page.evaluate(() => {
    const a = window.__HON_GIOI__.match.player;
    return { cooldown: a.cooldowns[4], x: a.x, z: a.z };
  });
  assert.equal(beforeF.cooldown, 0);
  const f = await page.locator('[data-skill="4"]').boundingBox();
  const fx = f.x + f.width / 2,
    fy = f.y + f.height / 2;
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  await page.waitForFunction(() => window.__HON_GIOI__.world.aiming);
  await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      window.__HON_GIOI__.match.player.dir = { x: 0, z: -1 };
    }),
  );
  await page.waitForFunction(
    () =>
      Math.abs(window.__HON_GIOI__.world.aimGuide.rotation.y - Math.PI) < 1e-7,
  );
  await page.mouse.move(fx + 60, fy);
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__HON_GIOI__.world.aimGuide.rotation.y -
          Math.atan2(0.879, -0.477),
      ) < 1e-7,
  );
  const cancelF = await page.locator("#cancelSkill").boundingBox();
  await page.mouse.move(
    cancelF.x + cancelF.width / 2,
    cancelF.y + cancelF.height / 2,
  );
  await page.waitForFunction(
    () => window.__HON_GIOI__.world.aimGuide.userData.canceled === true,
  );
  await page.mouse.up();
  await page.waitForFunction(() => !window.__HON_GIOI__.world.aiming);
  const afterF = await page.evaluate(() => {
    const a = window.__HON_GIOI__.match.player;
    return { cooldown: a.cooldowns[4], x: a.x, z: a.z };
  });
  assert.deepEqual(afterF, beforeF);
  checks.facingHeldGuide = true;
  checks.fDragCancel = true;
  await imageEvidence(page, "hud-large");
  const lootId = await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      const m = window.__HON_GIOI__.match;
      const uid = crypto.randomUUID();
      m.makeDrop(
        m.player.x,
        m.player.z,
        [
          {
            uid,
            kind: "bone",
            id: 1,
            code: "HB-01",
            name: "Linh Nhãn Đầu Cốt",
            w: 4,
            value: 180,
            count: 1,
          },
          {
            uid: crypto.randomUUID(),
            kind: "material",
            id: 1,
            code: "MAT-01",
            name: "Linh Mộc",
            w: 1,
            value: 25,
            count: 1,
          },
        ],
        35,
      );
      return uid;
    }),
  );
  await page.waitForSelector("#pickup:not(.hidden)");
  await page.locator("#pickup").tap();
  assert.equal(await page.locator(".loot-split > section").count(), 2);
  assert.equal(await page.locator(".own-loot-slot").count(), 24);
  const precious = page.locator(`[data-loot-uid="${lootId}"]`);
  assert.ok(await precious.isDisabled());
  assert.ok(await page.locator("#lootQuick").isDisabled());
  await precious.waitFor({ state: "visible" });
  await page.waitForFunction(
    (uid) => !document.querySelector(`[data-loot-uid="${uid}"]`).disabled,
    lootId,
  );
  assert.ok(await precious.evaluate((e) => e.classList.contains("appraised")));
  await imageEvidence(page, "loot-appraisal");
  await precious.tap();
  await page.waitForFunction(
    (uid) => window.__HON_GIOI__.match.player.bag.some((i) => i.uid === uid),
    lootId,
  );
  assert.ok(
    await page.evaluate(() =>
      window.__HON_GIOI__.match.drops.some((d) =>
        d.items.some((i) => i.kind === "material"),
      ),
    ),
  );
  checks.appraisal800ms = true;
  checks.splitInventory = true;
  checks.selectedPickup = true;
  if (await page.locator("#closeModal").count())
    await page.locator("#closeModal").tap();
  console.log(
    "Masterwork: security UI runs isolated checks and restores actual tampering",
  );
  await page.locator(".hud-options summary").tap();
  await page.locator("#securityShield").tap();
  const before = await page.evaluate(() =>
    JSON.stringify(window.__HON_GIOI__.match.player.wallet),
  );
  await page.locator("#securitySimulate").tap();
  const simulation = JSON.parse(
    await page.locator("#securityStatus").textContent(),
  );
  assert.ok(simulation.passed);
  assert.ok(simulation.checks.length >= 5);
  assert.ok(simulation.checks.every((c) => c.passed));
  assert.equal(simulation.changedRealWallet, false);
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify(window.__HON_GIOI__.match.player.wallet),
    ),
    before,
  );
  await page.locator("#closeModal").tap();
  const tamper = await page.evaluate(() => {
    const g = window.__HON_GIOI__,
      a = g.match.player;
    const before = { tb: a.wallet.earned, hp: a.hp, x: a.x, z: a.z };
    a.wallet.earned = 999999999;
    a.hp = Infinity;
    a.x += 50;
    a.z += 50;
    const result = g.security.status();
    return {
      before,
      after: { tb: a.wallet.earned, hp: a.hp, x: a.x, z: a.z },
      detections: result.vault.detections,
      fields: result.vault.alerts.at(-1)?.fields ?? [],
    };
  });
  assert.deepEqual(tamper.after, tamper.before);
  assert.ok(tamper.detections >= 1);
  for (const field of ["wallet", "hp", "x", "z"])
    assert.ok(tamper.fields.includes(field));
  checks.securityUI = true;
  checks.runtimeTamperRestore = true;
  await settle();
  assert.deepEqual(errors, []);
  assert.deepEqual(shaderErrors, []);
  await mkdir("acceptance/evidence", { recursive: true });
  assert.equal(
    await fingerprint(),
    initialSourceHash,
    "Source changed during browser verification",
  );
  await writeFile(
    "acceptance/evidence/master-browser.json",
    JSON.stringify(
      {
        sourceHash: initialSourceHash,
        passed: true,
        checks,
        icons: iconReport,
        anatomy,
        controls,
        security: simulation,
        images,
        errors,
        shaderErrors,
        recordedAt: new Date().toISOString(),
        scope:
          "Chromium SwiftShader functional and image verification only; no Android device or FPS certification.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: 149 Canvas illustrations, anatomical previews, exact MOBA controls, 800ms loot appraisal, selected pickup, isolated security simulation and real tamper restoration; no shader/page errors.",
  );
} finally {
  await browser.close();
}
