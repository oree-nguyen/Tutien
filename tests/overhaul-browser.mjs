import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { fingerprint } from "../scripts/fingerprint.mjs";
import { probeOverhaulControls } from "./overhaul-control-probes.mjs";
import { probeOverhaulArt } from "./overhaul-art-probes.mjs";

const origin = process.env.GAME_URL ?? "http://127.0.0.1:5173";
const diagnosticSkipLobby = process.env.OVERHAUL_DIAGNOSTIC_SKIP_LOBBY === "1";
const diagnosticFromBuffer =
  diagnosticSkipLobby && process.env.OVERHAUL_DIAGNOSTIC_FROM === "buffer";
const diagnosticFromBuild =
  diagnosticSkipLobby && process.env.OVERHAUL_DIAGNOSTIC_FROM === "build";
const sourceHashStart = await fingerprint();
const checks = {},
  images = [],
  errors = [],
  shaderErrors = [],
  traces = {};
const report = {
  sourceHash: sourceHashStart,
  sourceHashStart,
  passed: false,
  diagnosticOnly: diagnosticSkipLobby,
  scope:
    "Actual offline DEV game in Linux Chromium SwiftShader. CDP dispatches independent touch contacts through the real HUD. Functional, texture-content and GPU compilation checks only; no Android device, measured mobile FPS, photorealism, or 120 FPS certification.",
  fixtures:
    "The authorized offline DEV sandbox disables opponent decision-making, moves unrelated actors away, restores legitimate player resources between independent scenarios, and creates ordinary loot/encounters. Real movement, cast projection, cooldowns, currency ordering, pickup, shop/craft, manual override, and extraction channel initiation remain enabled.",
  checks,
  images,
  traces,
  errors,
  shaderErrors,
};
await mkdir("test-results/overhaul", { recursive: true });
await mkdir("acceptance/evidence", { recursive: true });
let browser, page, touch, failure;
const countQueued = (value) =>
  Array.isArray(value) ? value.length : Number(value ?? 0);
const saveImage = async (name) => {
  const path = `test-results/overhaul/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  images.push({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  });
};
const settle = async (frames = 2) =>
  page.evaluate(
    (n) =>
      new Promise((resolve) => {
        const step = () => (--n <= 0 ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    frames,
  );
const boxCenter = async (selector) => {
  const r = await page.locator(selector).boundingBox();
  assert.ok(r, `${selector} must be visible`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const contact = (id, point) => ({
  id,
  ...point,
  radiusX: 4,
  radiusY: 4,
  force: 1,
});
const sendTouch = async (type, points) =>
  touch.send("Input.dispatchTouchEvent", { type, touchPoints: points });
const state = async () =>
  page.evaluate(() => {
    const g = window.__HON_GIOI__,
      a = g.match.player;
    return {
      controls: g.controls,
      auto: g.autoFarm.status(),
      x: a.x,
      z: a.z,
      mp: a.mp,
      cooldowns: [...a.cooldowns],
    };
  });
async function setAutoSetting(key, checked) {
  const previous = await page.evaluate(
    () => window.__HON_GIOI__.autoFarm.status().mode,
  );
  if (previous === "off") await setAutoMode("pve");
  await page.locator("#autoFarmSettings").click();
  const setting = page.locator(`[data-auto-setting="${key}"]`);
  await setting.setChecked(checked);
  await page.locator("#closeModal").click();
  if (previous === "off") await setAutoMode("off");
}
async function setAutoMode(mode) {
  for (let i = 0; i < 4; i++) {
    if (
      (await page.evaluate(
        () => window.__HON_GIOI__.autoFarm.status().mode,
      )) === mode
    )
      return;
    await page.locator("#autoFarmToggle").click();
  }
  assert.fail(`Auto mode ${mode} was not reachable through the HUD`);
}
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (
      e.type() === "error" &&
      /WebGLProgram|Shader Error|VALIDATE_STATUS|gl\.getError|GL_INVALID/.test(
        e.text(),
      )
    )
      shaderErrors.push(e.text());
  });
  console.log(
    "Overhaul: actual high-LOD face, fabric maps, floating H05 mirror and top toast",
  );
  await page.goto(origin);
  await page.waitForFunction(() => window.__HON_GIOI__?.world.preview);
  if (!diagnosticSkipLobby) {
    for (const hero of [0, 4]) {
      await page.locator(`[data-hero="${hero}"]`).click();
      await page.waitForFunction(
        (h) => window.__HON_GIOI__.world.previewHero?.startsWith(`${h}:`),
        hero,
      );
      await page.locator("#showcaseFull").click();
      await settle();
      const visual = await page.evaluate(async () => {
        const { characterPBR } = await import("/src/character-pbr.js");
        const root = window.__HON_GIOI__.world.preview,
          fabrics = [],
          faces = [],
          hair = [],
          labels = [],
          engraved = [];
        let atlas = null;
        let mirror = null;
        const pixels = (texture) => {
          const image = texture?.image;
          if (!image) return { width: 0, height: 0, colors: 0 };
          const data =
            image.data ??
            image
              .getContext?.("2d")
              .getImageData(0, 0, image.width, image.height).data;
          const colors = new Set();
          for (let k = 0; k < 256; k++) {
            const i = ((k * 104729) % (image.width * image.height)) * 4;
            colors.add(`${data?.[i]},${data?.[i + 1]},${data?.[i + 2]}`);
          }
          return {
            width: image.width,
            height: image.height,
            colors: colors.size,
          };
        };
        root.traverse((o) => {
          const materials = Array.isArray(o.material)
            ? o.material
            : o.material
              ? [o.material]
              : [];
          for (const m of materials) {
            if (m.userData.characterPBR) atlas ??= m;
            if (
              m.userData.characterEngraving &&
              !engraved.some((entry) => entry.uuid === m.uuid)
            )
              engraved.push({
                uuid: m.uuid,
                role: m.userData.weaponRole ?? "armor",
                normal: pixels(m.normalMap),
                roughness: pixels(m.roughnessMap),
                normalTextureId: m.normalMap?.uuid,
                roughnessTextureId: m.roughnessMap?.uuid,
              });
            if (
              m.userData.characterPBR &&
              !fabrics.some((f) => f.uuid === m.uuid)
            )
              fabrics.push({
                uuid: m.uuid,
                sheen: m.sheen,
                sheenRoughness: m.sheenRoughness,
                pattern: m.userData.patternType,
                maps: Object.fromEntries(
                  [
                    "map",
                    "normalMap",
                    "roughnessMap",
                    "metalnessMap",
                    "emissiveMap",
                  ].map((key) => [key, pixels(m[key])]),
                ),
              });
            if (m.userData.hairPBR && !hair.some((f) => f.uuid === m.uuid))
              hair.push({
                uuid: m.uuid,
                normal: pixels(m.normalMap),
                bump: pixels(m.bumpMap),
                anisotropy: m.anisotropy,
              });
            if (m.map?.userData.faceTexture) {
              const t = m.map,
                image = t.image,
                data = image
                  .getContext("2d")
                  .getImageData(0, 0, image.width, image.height).data;
              let longestDarkRun = 0;
              for (
                let x = Math.floor(image.width * 0.46);
                x <= image.width * 0.54;
                x += 8
              ) {
                let run = 0;
                for (
                  let y = Math.floor(image.height * 0.2);
                  y < image.height * 0.8;
                  y++
                ) {
                  const i = (y * image.width + x) * 4;
                  run =
                    data[i] < 65 && data[i + 1] < 65 && data[i + 2] < 65
                      ? run + 1
                      : 0;
                  longestDarkRun = Math.max(longestDarkRun, run);
                }
              }
              const uv = o.geometry.attributes.uv,
                position = o.geometry.attributes.position;
              let frontCount = 0;
              for (let i = 0; i < position.count; i++)
                if (position.getZ(i) < 0) frontCount++;
              faces.push({
                ...pixels(t),
                wrapS: t.wrapS,
                wrapT: t.wrapT,
                flipY: t.flipY,
                colorSpace: t.colorSpace,
                frontPatch:
                  o.userData.faceFrontMesh === true ||
                  o.geometry.userData.faceFrontMesh === true,
                arc: o.geometry.userData.frontArcDegrees,
                longestDarkRun,
                frontRatio: frontCount / position.count,
                uvCount: uv.count,
              });
            }
            if (o.name === "paleReflectiveMirrorSurface") {
              let owner = o.parent;
              while (owner.parent && owner.name !== "soulWeapon")
                owner = owner.parent;
              const sculpt = owner.getObjectByName("weaponSculpt");
              mirror = {
                transmission: m.transmission,
                iridescence: m.iridescence,
                x: owner.position.x,
                y: owner.position.y,
                z: owner.position.z,
                floating:
                  sculpt?.userData.soulMotion === "floating" ||
                  owner.userData.handedness === "floating",
                crescent:
                  !!owner.getObjectByName("whiteGoldRimCrescent") ||
                  (owner.userData.primitiveCounts?.whiteGoldRimCrescent ?? 0) >
                    0,
                surfaceVertices: o.geometry.attributes.position.count,
              };
            }
          }
          if (
            (o.isSprite || o.geometry?.type === "PlaneGeometry") &&
            /^H\d{2}$/.test(
              String(
                o.userData.text ??
                  o.userData.label ??
                  o.material?.map?.userData.text ??
                  "",
              ),
            )
          )
            labels.push(o.name);
        });
        if (!window.__overhaulFirstAtlas)
          window.__overhaulFirstAtlas = atlas.normalMap;
        return {
          fabrics,
          faces,
          hair,
          labels,
          engraved,
          atlas: {
            normal: atlas.normalMap.uuid,
            roughness: atlas.roughnessMap.uuid,
          },
          cache: characterPBR.stats(),
          firstAtlasWidth: window.__overhaulFirstAtlas.image.width,
          stageText: document.querySelector(".stage-label")?.textContent,
          mirror,
          glError: window.__HON_GIOI__.world.renderer.getContext().getError(),
        };
      });
      assert.ok(visual.fabrics.length > 0);
      for (const material of visual.fabrics) {
        assert.equal(material.sheen, 0.85);
        assert.equal(material.sheenRoughness, 0.25);
        for (const [channel, map] of Object.entries(material.maps)) {
          assert.deepEqual(
            [map.width, map.height],
            [2048, 2048],
            `${channel} must use actual high-LOD pixels`,
          );
          assert.ok(
            map.colors >
              (channel === "metalnessMap" || channel === "emissiveMap" ? 1 : 3),
            `${channel} must have real content variation`,
          );
        }
      }
      assert.ok(visual.faces.length > 0);
      for (const face of visual.faces) {
        assert.deepEqual([face.width, face.height], [2048, 2048]);
        assert.equal(face.wrapS, 1001);
        assert.equal(face.wrapT, 1001);
        assert.equal(face.flipY, true);
        assert.equal(face.colorSpace, "srgb");
        assert.equal(face.frontPatch, true);
        assert.equal(face.arc, 130);
        assert.ok(face.frontRatio > 0.95);
        assert.ok(
          face.longestDarkRun < 140,
          "Central face pixels must not contain a vertical black hair stripe",
        );
      }
      assert.ok(visual.hair.length > 0);
      assert.ok(visual.engraved.some((entry) => entry.role === "armor"));
      assert.ok(
        visual.engraved.some((entry) =>
          ["metal", "wood", "stone"].includes(entry.role),
        ),
      );
      for (const material of visual.engraved) {
        assert.equal(material.normalTextureId, visual.atlas.normal);
        assert.equal(material.roughnessTextureId, visual.atlas.roughness);
        assert.equal(material.normal.width, 2048);
        assert.equal(material.roughness.width, 2048);
        assert.ok(material.normal.colors > 3 && material.roughness.colors > 3);
      }
      assert.equal(visual.cache.sets.high, 1);
      assert.equal(visual.cache.limits.high, 1);
      if (hero === 4) assert.equal(visual.firstAtlasWidth, 64);
      assert.ok(
        visual.hair.every(
          (h) => h.normal.colors > 2 && h.bump.colors > 2 && h.anisotropy > 0,
        ),
      );
      assert.deepEqual(visual.labels, []);
      assert.doesNotMatch(visual.stageText, /\bH\d{2}\b/);
      assert.equal(visual.glError, 0);
      if (hero === 4) {
        assert.ok(visual.mirror?.floating && visual.mirror?.crescent);
        assert.equal(visual.mirror.transmission, 0.85);
        assert.equal(visual.mirror.iridescence, 1);
        assert.ok(
          visual.mirror.x > 0.3 &&
            visual.mirror.y > 1.2 &&
            visual.mirror.z > 0.1,
        );
      }
      traces[`hero${hero + 1}`] = visual;
      await saveImage(`H${String(hero + 1).padStart(2, "0")}-pbr-full`);
      await page.locator("#showcaseFace").click();
      await settle();
      await saveImage(`H${String(hero + 1).padStart(2, "0")}-face-front`);
    }
    checks.highPBR2048FiveChannels = true;
    checks.armorWeaponPBRContent = true;
    checks.characterPBRCacheLODLive = true;
    checks.faceFrontUVAndNoCentralStripe = true;
    checks.hairNormalBump = true;
    checks.noStageHeroCodes = true;
    checks.floatingTransparentH05Mirror = true;
    await page.locator("#ranked").click();
    await page.waitForSelector("#toast.show");
    const toast = await page.locator("#toast").evaluate((e) => ({
      top: getComputedStyle(e).top,
      z: getComputedStyle(e).zIndex,
      pointer: getComputedStyle(e).pointerEvents,
      start: performance.now(),
    }));
    assert.deepEqual(
      { top: toast.top, z: toast.z, pointer: toast.pointer },
      { top: "14px", z: "9999", pointer: "none" },
    );
    await page.waitForFunction(
      () => !document.querySelector("#toast").classList.contains("show"),
    );
    const toastElapsed = await page.evaluate(
      (t) => performance.now() - t,
      toast.start,
    );
    assert.ok(toastElapsed >= 1800 && toastElapsed < 5500);
    traces.toast = { ...toast, elapsedMs: toastElapsed };
    checks.topToast2200ms = true;
    await page.locator("#ranked").click();
  }
  await page.locator('[data-hero="0"]').click();
  await page.locator("#showcaseFull").click();
  await page.locator("#start").click();
  await page.waitForFunction(
    () =>
      window.__HON_GIOI__.match?.time > 0 &&
      window.__HON_GIOI__.controls &&
      window.__HON_GIOI__.autoFarm,
  );
  // CSS touch coordinates stay 1280×720. Software GPU functional runs use a
  // smaller drawing buffer; lobby images and fixed-size art probes keep their
  // own full resolutions. This is never a device FPS measurement.
  traces.functionalRenderer = await page.evaluate(() => {
    const w = window.__HON_GIOI__.world;
    w.renderer.setPixelRatio(0.4);
    w.resize();
    return {
      pixelRatio: w.renderer.getPixelRatio(),
      width: w.renderer.domElement.width,
      height: w.renderer.domElement.height,
      cssWidth: innerWidth,
      cssHeight: innerHeight,
    };
  });
  await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      const m = window.__HON_GIOI__.match;
      m.ai = () => {};
      for (const a of m.actors)
        if (a !== m.player) {
          a.x = 80;
          a.z = 80;
        }
      m.player.immuneUntil = 10000;
      m.player.x = 8;
      m.player.z = 8;
      m.player.cooldowns.fill(0);
      m.player.mp = m.getStats(m.player).mp;
      m.zones = [];
      m.effects = [];
      m.projectiles = [];
      m.drops = [];
    }),
  );
  touch = await page.context().newCDPSession(page);
  const joyBox = await page.locator("#joystickZone").boundingBox();
  const left = contact(1, {
    x: joyBox.x + 75,
    y: joyBox.y + joyBox.height * 0.7,
  });
  if (!diagnosticFromBuffer && !diagnosticFromBuild) {
    console.log(
      "Overhaul: three-contact isolation, smooth AOE projection, cancel and lost capture",
    );
    const eCenter = await boxCenter('[data-skill="2"]'),
      right = contact(2, eCenter);
    await sendTouch("touchStart", [left]);
    const initialLeft = await state();
    assert.ok(initialLeft.controls.leftJoystickPointerId !== null);
    await sendTouch("touchStart", [left, right]);
    const both = await state();
    assert.equal(
      both.controls.leftJoystickPointerId,
      initialLeft.controls.leftJoystickPointerId,
    );
    assert.ok(
      both.controls.rightSkillPointerId !== null &&
        both.controls.rightSkillPointerId !==
          both.controls.leftJoystickPointerId,
    );
    const third = contact(3, await boxCenter('[data-skill="0"]'));
    await sendTouch("touchStart", [left, right, third]);
    const three = await state();
    assert.equal(
      three.controls.leftJoystickPointerId,
      both.controls.leftJoystickPointerId,
    );
    assert.equal(
      three.controls.rightSkillPointerId,
      both.controls.rightSkillPointerId,
    );
    const movedLeft = { ...left, x: left.x + 34 },
      halfRight = { ...right, x: right.x + 37.5 };
    await sendTouch("touchMove", [movedLeft, halfRight, third]);
    await page.waitForFunction(() => {
      const g = window.__HON_GIOI__,
        p = g.world.aimGuide?.userData.projectedPoint,
        a = g.match.player;
      return p && Math.hypot(p.x - a.x, p.z - a.z) > 1.5;
    });
    const half = await page.evaluate(async () => {
      const g = window.__HON_GIOI__,
        { skillFor } = await import("/src/rules.js");
      const p = g.world.aimGuide.userData.projectedPoint,
        a = g.match.player;
      return {
        distance: Math.hypot(p.x - a.x, p.z - a.z),
        range: skillFor(a, 2).range,
        x: a.x,
        z: a.z,
      };
    });
    assert.ok(
      half.distance > half.range * 0.2 && half.distance < half.range * 0.65,
    );
    await page.waitForFunction(
      (s) =>
        Math.hypot(
          window.__HON_GIOI__.match.player.x - s.x,
          window.__HON_GIOI__.match.player.z - s.z,
        ) > 0.15,
      { x: initialLeft.x, z: initialLeft.z },
    );
    assert.ok(await page.locator('[data-skill="2"] .skill-thumb-knob').count());
    await saveImage("simultaneous-movement-aoe");
    const cancelPoint = await boxCenter("#cancelSkill");
    await sendTouch("touchMove", [
      movedLeft,
      { ...right, ...cancelPoint },
      third,
    ]);
    await page.waitForFunction(
      () => window.__HON_GIOI__.world.aimGuide?.userData.canceled === true,
    );
    const cancellation = await page.evaluate(() => {
      const colors = [],
        g = window.__HON_GIOI__;
      g.world.aimGuide.traverse((o) => {
        if (o.material?.color) colors.push(o.material.color.getHexString());
        for (const u of Object.values(o.material?.uniforms ?? {}))
          if (u?.value?.isColor) colors.push(u.value.getHexString());
      });
      return {
        colors,
        mp: g.match.player.mp,
        cooldown: g.match.player.cooldowns[2],
      };
    });
    assert.ok(cancellation.colors.includes("ef4444"));
    await saveImage("cancel-warning-red");
    await sendTouch("touchEnd", []);
    await page.waitForFunction(
      () =>
        window.__HON_GIOI__.controls.rightSkillPointerId === null &&
        window.__HON_GIOI__.controls.leftJoystickPointerId === null,
    );
    const canceled = await state();
    assert.equal(canceled.cooldowns[2], cancellation.cooldown);
    assert.ok(canceled.mp >= cancellation.mp);
    traces.multiTouch = {
      initialLeft,
      both,
      three,
      half,
      cancellation,
      canceled,
    };
    checks.threePointerIsolation = true;
    checks.simultaneousMovementAndAim = true;
    checks.cancelRedNoCost = true;
    const e = contact(4, await boxCenter('[data-skill="2"]'));
    await sendTouch("touchStart", [e]);
    await sendTouch("touchMove", [{ ...e, x: e.x + 75 }]);
    await page.waitForFunction(() => {
      const g = window.__HON_GIOI__,
        point = g.world.aimGuide?.userData.projectedPoint;
      return (
        point &&
        Math.hypot(point.x - g.match.player.x, point.z - g.match.player.z) > 4.9
      );
    });
    await settle(2);
    const guide = await page.evaluate(() => ({
      point: { ...window.__HON_GIOI__.world.aimGuide.userData.projectedPoint },
      player: {
        x: window.__HON_GIOI__.match.player.x,
        z: window.__HON_GIOI__.match.player.z,
      },
      mp: window.__HON_GIOI__.match.player.mp,
    }));
    await sendTouch("touchEnd", []);
    await page.waitForFunction(() =>
      window.__HON_GIOI__.match.zones.some(
        (z) => z.owner === window.__HON_GIOI__.match.player && z.k === 2,
      ),
    );
    const cast = await page.evaluate(() => {
      const m = window.__HON_GIOI__.match,
        zone = m.zones.find((z) => z.owner === m.player && z.k === 2);
      return {
        point: zone.point,
        mp: m.player.mp,
        cooldown: m.player.cooldowns[2],
        radius: zone.sk.radius,
      };
    });
    assert.ok(
      Math.hypot(cast.point.x - guide.point.x, cast.point.z - guide.point.z) <
        0.06,
    );
    assert.ok(cast.mp < guide.mp - 20);
    assert.ok(cast.cooldown > 15);
    traces.manualAOE = { guide, cast };
    checks.manualAOEActualZone = true;
    const q = contact(5, await boxCenter('[data-skill="0"]'));
    const beforeLost = await state();
    await sendTouch("touchStart", [q]);
    await sendTouch("touchMove", [{ ...q, x: q.x + 1 }]);
    await page.waitForFunction(() => {
      const id = window.__HON_GIOI__.controls.rightSkillPointerId;
      return (
        id !== null &&
        document.querySelector('[data-skill="0"]').hasPointerCapture(id)
      );
    });
    await page.evaluate(() => {
      const id = window.__HON_GIOI__.controls.rightSkillPointerId;
      document.querySelector('[data-skill="0"]').releasePointerCapture(id);
    });
    await sendTouch("touchMove", [{ ...q, x: q.x + 2 }]);
    await page.waitForFunction(
      () => window.__HON_GIOI__.controls.rightSkillPointerId === null,
    );
    await sendTouch("touchEnd", []);
    const afterLost = await state();
    assert.equal(afterLost.cooldowns[0], beforeLost.cooldowns[0]);
    assert.ok(afterLost.mp >= beforeLost.mp);
    checks.lostCaptureSafeCancel = true;

    console.log(
      "Overhaul: smart tap target prediction and real cooldown input buffer",
    );
    const quickTrace = await page.evaluate(async () => {
      const g = window.__HON_GIOI__,
        m = g.match;
      let target, closer;
      g.sandbox(() => {
        m.zones = [];
        m.projectiles = [];
        m.player.mp = m.getStats(m.player).mp;
        m.player.cooldowns.fill(0);
        [target, closer] = m.actors.filter(
          (a) =>
            a.kind === "hero" && a !== m.player && a.team !== m.player.team,
        );
        target.x = m.player.x + 4;
        target.z = m.player.z + 0.5;
        target.hp = m.getStats(target).hp * 0.4;
        closer.x = m.player.x + 2;
        closer.z = m.player.z - 1;
        closer.hp = m.getStats(closer).hp;
        target.revealUntil = closer.revealUntil = m.time + 10;
      });
      let previous = m.time;
      for (let i = 0; i < 8; i++)
        await new Promise((resolve) =>
          requestAnimationFrame(() => {
            const dt = m.time - previous;
            previous = m.time;
            g.sandbox(() => {
              target.z += dt * 2;
            });
            resolve();
          }),
        );
      window.__overhaulMovingTarget = {
        targetId: target.id,
        previous: m.time,
        active: true,
      };
      const move = () => {
        const trace = window.__overhaulMovingTarget;
        if (!trace.active) return;
        const dt = m.time - trace.previous;
        trace.previous = m.time;
        g.sandbox(() => {
          target.z += dt * 2;
        });
        if (m.player.cooldowns[0] > 0) {
          const dx = target.x - m.player.x,
            dz = target.z - m.player.z,
            length = Math.hypot(dx, dz);
          trace.result = {
            targetId: target.id,
            target: { x: target.x, z: target.z },
            player: { x: m.player.x, z: m.player.z },
            direction: { ...m.player.dir },
            naive: { x: dx / length, z: dz / length },
            velocity: { x: 0, z: 2 },
            cooldown: m.player.cooldowns[0],
          };
          trace.active = false;
        } else requestAnimationFrame(move);
      };
      requestAnimationFrame(move);
      return { targetId: target.id, closerId: closer.id };
    });
    await page.locator('[data-skill="0"]').tap();
    await page.waitForFunction(() => window.__overhaulMovingTarget?.result);
    const predicted = await page.evaluate(
      () => window.__overhaulMovingTarget.result,
    );
    assert.ok(predicted.direction.x > 0.7);
    assert.ok(
      predicted.direction.z > predicted.naive.z + 0.01,
      "Actual cast must lead the moving lowest-health hero",
    );
    traces.quickCast = { ...quickTrace, ...predicted };
    checks.quickCastRealLead = true;
  }
  if (!diagnosticFromBuild) {
    await page.evaluate(() =>
      window.__HON_GIOI__.sandbox(() => {
        const m = window.__HON_GIOI__.match;
        for (const a of m.actors)
          if (a !== m.player) {
            a.x = 80;
            a.z = 80;
          }
        m.player.mp = m.getStats(m.player).mp;
        m.projectiles = [];
      }),
    );
    const bufferedTouch = contact(6, await boxCenter('[data-skill="0"]'));
    await sendTouch("touchStart", [bufferedTouch]);
    await page.evaluate(() => {
      const g = window.__HON_GIOI__;
      document.addEventListener(
        "pointerup",
        () => {
          g.sandbox(() => {
            g.match.player.cooldowns[0] = 0.19;
          });
        },
        { once: true, capture: true },
      );
      document.addEventListener(
        "pointerup",
        () => {
          window.__overhaulQueued = {
            controls: structuredClone(g.controls),
            cooldown: g.match.player.cooldowns[0],
            time: g.match.time,
            mp: g.match.player.mp,
          };
        },
        { once: true },
      );
    });
    await sendTouch("touchEnd", []);
    const queued = await page.evaluate(() => window.__overhaulQueued);
    traces.inputBuffer = { queued };
    assert.ok(countQueued(queued.controls.queued) > 0);
    assert.ok(queued.cooldown <= 0.2);
    await page.waitForFunction(
      () => window.__HON_GIOI__.match.player.cooldowns[0] > 1,
    );
    const fired = await page.evaluate(() => ({
      time: window.__HON_GIOI__.match.time,
      cooldown: window.__HON_GIOI__.match.player.cooldowns[0],
      mp: window.__HON_GIOI__.match.player.mp,
      queued: window.__HON_GIOI__.controls.queued,
    }));
    assert.ok(fired.time - queued.time <= 0.35);
    assert.ok(fired.mp < queued.mp - 8);
    assert.equal(countQueued(fired.queued), 0);
    traces.inputBuffer = { queued, fired };
    checks.cooldownBufferActualCast = true;

    console.log(
      "Overhaul: Auto HUD modes/settings, actual farm combat, loot appraisal and manual override",
    );
    assert.equal((await state()).auto.mode, "off");
    for (const mode of ["pve", "full", "off"]) {
      await page.locator("#autoFarmToggle").click();
      assert.equal((await state()).auto.mode, mode);
    }
    await setAutoSetting("allowUltimate", true);
    await setAutoSetting("kiting", false);
    await setAutoMode("pve");
    await page.locator("#autoFarmSettings").click();
    assert.ok(
      await page.locator('[data-auto-setting="allowUltimate"]').isChecked(),
    );
    assert.equal(
      await page.locator('[data-auto-setting="kiting"]').isChecked(),
      false,
    );
    assert.equal(await page.locator("[data-auto-setting]").count(), 6);
    await page.locator("#closeModal").click();
    await setAutoMode("off");
    await setAutoSetting("allowUltimate", false);
    await setAutoSetting("kiting", true);
    await setAutoSetting("autoBuild", false);
    checks.autoThreeModes = true;
    checks.autoSettingsPersist = true;
    const beastInfo = await page.evaluate(() =>
      window.__HON_GIOI__.sandbox(() => {
        const m = window.__HON_GIOI__.match,
          a = m.player;
        a.x = 8;
        a.z = 8;
        a.mp = m.getStats(a).mp;
        a.cooldowns.fill(0);
        a.bag = [];
        m.zones = [];
        m.effects = [];
        m.projectiles = [];
        m.drops = [];
        const beast = m.actors.find((b) => b.kind === "beast" && !b.tier);
        beast.x = a.x + 4;
        beast.z = a.z;
        beast.alive = true;
        beast.hp = beast.maxHp = 3000;
        return { id: beast.id, hp: beast.hp };
      }),
    );
    await setAutoMode("pve");
    await page.waitForFunction((id) => {
      const m = window.__HON_GIOI__.match,
        b = m.actors.find((a) => a.id === id);
      return (
        m.player.cooldowns.slice(0, 3).some((cd) => cd > 0.1) && b.hp < 3000
      );
    }, beastInfo.id);
    const farmCombat = await page.evaluate((id) => {
      const g = window.__HON_GIOI__,
        m = g.match;
      return {
        cooldowns: [...m.player.cooldowns],
        mp: m.player.mp,
        maxMp: m.getStats(m.player).mp,
        beastHP: m.actors.find((a) => a.id === id).hp,
        status: g.autoFarm.status(),
      };
    }, beastInfo.id);
    assert.equal(farmCombat.cooldowns[3], 0);
    assert.equal(farmCombat.cooldowns[4], 0);
    assert.ok(farmCombat.mp >= farmCombat.maxMp * 0.25);
    traces.farmCombat = farmCombat;
    checks.pveActualSkillsAndDamage = true;
    checks.pveReservesUltimateDashAndMana = true;
    await setAutoMode("off");
    const lootFixture = await page.evaluate(() =>
      window.__HON_GIOI__.sandbox(() => {
        const g = window.__HON_GIOI__,
          m = g.match,
          a = m.player;
        for (const other of m.actors)
          if (other !== a) {
            other.x = 80;
            other.z = 80;
          }
        a.x = 8;
        a.z = 8;
        a.bag = [];
        m.zones = [];
        m.effects = [];
        m.projectiles = [];
        m.drops = [];
        const preciousUid = crypto.randomUUID(),
          materialUid = crypto.randomUUID();
        m.makeDrop(
          a.x + 5,
          a.z,
          [
            {
              uid: materialUid,
              kind: "material",
              id: 1,
              code: "MAT-01",
              name: "Linh Mộc",
              w: 1,
              value: 25,
              count: 1,
            },
            {
              uid: preciousUid,
              kind: "bone",
              id: 1,
              code: "HB-01",
              name: "Linh Nhãn Đầu Cốt",
              w: 4,
              value: 180,
              count: 1,
            },
          ],
          25,
        );
        return { preciousUid, materialUid, x: a.x, z: a.z, time: m.time };
      }),
    );
    await setAutoMode("pve");
    await page.waitForFunction(
      (p) =>
        Math.hypot(
          window.__HON_GIOI__.match.player.x - p.x,
          window.__HON_GIOI__.match.player.z - p.z,
        ) > 0.2,
      lootFixture,
    );
    await page.waitForFunction(
      () => window.__HON_GIOI__.autoFarm.status().appraisal?.progress >= 0,
    );
    const appraisal = await page.evaluate(() => ({
      status: window.__HON_GIOI__.autoFarm.status(),
      time: window.__HON_GIOI__.match.time,
      bag: window.__HON_GIOI__.match.player.bag.map((i) => i.uid),
    }));
    assert.equal(appraisal.status.appraisal.uid, lootFixture.preciousUid);
    assert.equal(appraisal.bag.includes(lootFixture.preciousUid), false);
    await saveImage("auto-loot-appraisal");
    await page.waitForFunction(
      (uid) => window.__HON_GIOI__.match.player.bag.some((i) => i.uid === uid),
      lootFixture.preciousUid,
    );
    const looted = await page.evaluate(() => ({
      time: window.__HON_GIOI__.match.time,
      bag: window.__HON_GIOI__.match.player.bag.map((i) => i.uid),
      status: window.__HON_GIOI__.autoFarm.status(),
    }));
    assert.equal(looted.bag[0], lootFixture.preciousUid);
    assert.ok(looted.time - appraisal.time >= 0.5);
    traces.autoLoot = { fixture: lootFixture, appraisal, looted };
    checks.autoActualMovementAndPreciousLoot = true;
    const manual = contact(7, { x: left.x, y: left.y });
    await sendTouch("touchStart", [manual]);
    assert.equal((await state()).auto.manualPaused, true);
    await sendTouch("touchMove", [{ ...manual, x: manual.x - 34 }]);
    await settle(3);
    assert.equal((await state()).auto.manualPaused, true);
    await page.evaluate(() =>
      document.addEventListener(
        "pointerup",
        () => {
          const g = window.__HON_GIOI__,
            a = g.match.player;
          window.__overhaulManualRelease = {
            at: performance.now(),
            matchTime: g.match.time,
            state: { auto: g.autoFarm.status(), x: a.x, z: a.z },
          };
        },
        { once: true },
      ),
    );
    await sendTouch("touchEnd", []);
    const releaseRecord = await page.evaluate(
      () => window.__overhaulManualRelease,
    );
    const released = releaseRecord.state;
    assert.equal(released.auto.manualPaused, true);
    assert.ok(released.auto.resumeIn > 0.9 && released.auto.resumeIn <= 1.2);
    await page.waitForFunction(
      () => !window.__HON_GIOI__.autoFarm.status().manualPaused,
    );
    const resumedAt = await page.evaluate(() => performance.now());
    assert.ok(resumedAt - releaseRecord.at >= 1100);
    traces.manualOverride = {
      released,
      elapsedWallMilliseconds: resumedAt - releaseRecord.at,
    };
    checks.manualHoldAnd1200msResume = true;
    await setAutoMode("off");
  }

  console.log(
    "Overhaul: authoritative shop/craft path, seven slots and extraction routing",
  );
  await setAutoSetting("autoBuild", true);
  await setAutoSetting("autoLoot", false);
  const buildFixture = await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      const m = window.__HON_GIOI__.match,
        a = m.player;
      const point = m.shopPoints[5];
      a.x = point.x;
      a.z = point.z;
      a.items = [17, 18];
      a.wallet.brought = 300;
      a.wallet.earned = 3000;
      m.drops = [];
      m.zones = [];
      m.effects = [];
      m.projectiles = [];
      return { wallet: { ...a.wallet }, point };
    }),
  );
  await setAutoMode("pve");
  await page.waitForFunction(() =>
    window.__HON_GIOI__.match.player.items.includes(20),
  );
  const crafted = await page.evaluate(() => ({
    items: [...window.__HON_GIOI__.match.player.items],
    wallet: { ...window.__HON_GIOI__.match.player.wallet },
    status: window.__HON_GIOI__.autoFarm.status(),
  }));
  assert.ok(!crafted.items.includes(17) && !crafted.items.includes(18));
  assert.ok(crafted.wallet.brought < buildFixture.wallet.brought);
  assert.equal(crafted.wallet.earned, buildFixture.wallet.earned);
  await page.waitForFunction(
    () => window.__HON_GIOI__.match.player.items.length === 7,
    undefined,
    { timeout: 90000 },
  );
  const built = await page.evaluate(async () => {
    const m = window.__HON_GIOI__.match,
      { mismatch } = await import("/src/rules.js"),
      { safeAutoBuildPreset } = await import("/src/auto-farm.js");
    return {
      items: [...m.player.items],
      desired: safeAutoBuildPreset(m.player.hero),
      mismatch: m.player.items.some((i) => mismatch(m.player.hero, i)),
      wallet: { ...m.player.wallet },
      status: window.__HON_GIOI__.autoFarm.status(),
    };
  });
  assert.equal(built.mismatch, false);
  assert.deepEqual(
    [...built.items].sort((a, b) => a - b),
    [...built.desired].sort((a, b) => a - b),
  );
  traces.autoBuild = { fixture: buildFixture, crafted, built };
  checks.autoActualCraftAndBroughtFirst = true;
  checks.autoSevenSlotsNoBacklash = true;
  await saveImage("auto-built-seven");
  await setAutoMode("off");
  await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      const g = window.__HON_GIOI__,
        m = g.match;
      g.debug("open");
      const gate = m.gates[0];
      m.player.x = gate.x + 2;
      m.player.z = gate.z;
      m.player.bag = Array.from({ length: 10 }, (_, i) => ({
        uid: crypto.randomUUID(),
        kind: "bone",
        id: 1,
        code: `HB-01-${i}`,
        name: "Linh Nhãn Đầu Cốt",
        w: 4,
        value: 180,
        count: 1,
      }));
      m.player.gear = [];
      m.zones = [];
      m.drops = [];
    }),
  );
  await setAutoMode("full");
  await page.waitForFunction(() => !!window.__HON_GIOI__.match.player.channel);
  const extraction = await page.evaluate(() => ({
    channel: structuredClone(window.__HON_GIOI__.match.player.channel),
    status: window.__HON_GIOI__.autoFarm.status(),
  }));
  assert.match(extraction.status.phase, /extract/);
  traces.extraction = extraction;
  checks.autoFullExtractionInitiatesRealChannel = true;
  await saveImage("auto-extraction-channel");
  await setAutoMode("off");

  console.log(
    "Overhaul: seven distinct actual biome maps and live architecture shader compilation",
  );
  await page.waitForFunction(() => {
    const state = window.__HON_GIOI__.world.scenery.pbr.stats();
    return state.residentBiomes >= 1 && state.pendingJobs === 0;
  });
  const environment = await page.evaluate(async () => {
    const g = window.__HON_GIOI__,
      w = g.world,
      { generateBiomeTextureSet } = await import("/src/environment-pbr.js");
    const hash = (array) => {
      let h = 2166136261;
      for (let i = 0; i < array.length; i += 251)
        h = Math.imul(h ^ array[i], 16777619) >>> 0;
      return h.toString(16);
    };
    const biomes = [];
    for (let biome = 0; biome < 7; biome++) {
      const set = generateBiomeTextureSet(biome, {
        size: [0, 4].includes(biome) ? 2048 : 256,
        anisotropy: w.renderer.capabilities.getMaxAnisotropy(),
      });
      const maps = Object.fromEntries(
        ["albedo", "normal", "roughnessHeight", "emissive"].map((key) => {
          const t = set[key];
          return [
            key,
            {
              width: t.image.width,
              height: t.image.height,
              repeat: [t.repeat.x, t.repeat.y],
              anisotropy: t.anisotropy,
              hash: hash(t.image.data),
            },
          ];
        }),
      );
      biomes.push({ biome, maps });
      set.dispose();
    }
    const portals = w.scenery.markerMeshes
      .filter((m) => m.p.type === "gate")
      .map(({ group }) => {
        const p = group.userData.portal;
        return {
          tiers: p.tiers.length,
          pillars: p.pillars.length,
          lamps: p.lamps.length,
          beams: p.energyBeams.length,
          swirl: p.core.material.isShaderMaterial,
          time: p.core.material.uniforms.uTime.value,
          state: p.state,
        };
      });
    const residency = w.scenery.pbr.stats();
    const activeMaps = [...w.scenery.pbr.cache.values()].map((set) => ({
      biome: set.biome,
      width: set.albedo.image.width,
      normalWidth: set.normal.image.width,
      roughnessWidth: set.roughnessHeight.image.width,
      emissiveWidth: set.emissive.image.width,
    }));
    w.renderer.compile(w.scene, w.camera);
    return {
      biomes,
      portals,
      residency,
      activeMaps,
      terrainMaterialCount: Array.isArray(w.scenery.terrain.material)
        ? w.scenery.terrain.material.length
        : 1,
      maxAnisotropy: w.renderer.capabilities.getMaxAnisotropy(),
      glError: w.renderer.getContext().getError(),
    };
  });
  assert.equal(
    new Set(environment.biomes.map((b) => b.maps.albedo.hash)).size,
    7,
  );
  for (const biome of environment.biomes)
    for (const map of Object.values(biome.maps)) {
      const size = [0, 4].includes(biome.biome) ? 2048 : 256;
      assert.deepEqual([map.width, map.height], [size, size]);
      assert.deepEqual(map.repeat, [24, 24]);
      assert.equal(map.anisotropy, environment.maxAnisotropy);
    }
  assert.equal(environment.terrainMaterialCount, 7);
  assert.ok(
    environment.residency.residentBiomes >= 1 &&
      environment.residency.residentBiomes <= 2,
  );
  assert.ok(
    environment.residency.residentBiomes <=
      environment.residency.maximumResidentBiomes,
  );
  assert.ok(
    environment.activeMaps.every(
      (m) =>
        m.width === 2048 &&
        m.normalWidth === 2048 &&
        m.roughnessWidth === 2048 &&
        m.emissiveWidth === 2048,
    ),
  );
  assert.ok(environment.portals.length >= 5);
  assert.ok(
    environment.portals.every(
      (p) =>
        p.tiers === 3 &&
        p.pillars === 4 &&
        p.lamps === 8 &&
        p.beams === 4 &&
        p.swirl &&
        p.time > 0,
    ),
  );
  assert.equal(environment.glError, 0);
  traces.environment = environment;
  checks.sevenBiomeContentsAndTwo2048Bakes = true;
  checks.threeTierPortalLiveShaders = true;
  const controlProbe = await probeOverhaulControls(page);
  Object.assign(checks, controlProbe.checks);
  Object.assign(traces, controlProbe.traces);
  const artProbe = await probeOverhaulArt(page);
  Object.assign(checks, artProbe.checks);
  Object.assign(traces, artProbe.traces);
  checks.actualGPUNoGLError = true;
  await settle();
  assert.deepEqual(errors, []);
  assert.deepEqual(shaderErrors, []);
  const sourceHashEnd = await fingerprint();
  report.sourceHashEnd = sourceHashEnd;
  report.sourceStable = sourceHashEnd === sourceHashStart;
  if (!diagnosticSkipLobby)
    assert.equal(
      sourceHashEnd,
      sourceHashStart,
      "Source changed during overhaul browser verification",
    );
  report.passed = !diagnosticSkipLobby;
  console.log(
    `${diagnosticSkipLobby ? "DIAGNOSTIC ONLY" : "PASS"}: ${Object.keys(checks).length} overhaul browser checks; real PBR pixels, independent touch controls, actual casts, auto loot/build and extraction channel. No Android FPS certification.`,
  );
} catch (error) {
  failure = error;
  report.failure = { message: error.message, stack: error.stack };
  if (page)
    traces.failureState = await page
      .evaluate(() => {
        const g = window.__HON_GIOI__,
          m = g?.match,
          a = m?.player;
        return {
          time: m?.time,
          player: a && {
            x: a.x,
            z: a.z,
            realm: a.realm,
            hp: a.hp,
            mp: a.mp,
            items: a.items,
            wallet: a.wallet,
            channel: a.channel,
          },
          auto: g?.autoFarm.status(),
          nearShop: m?.nearShop?.(),
          modal: document.querySelector(".modal")?.textContent,
        };
      })
      .catch(() => null);
  if (page) await saveImage("failure").catch(() => {});
} finally {
  if (touch)
    await touch
      .send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      .catch(() => {});
  if (browser) await browser.close();
  report.sourceHashEnd ??= await fingerprint();
  report.recordedAt = new Date().toISOString();
  await writeFile(
    "acceptance/evidence/overhaul-browser.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
if (failure) throw failure;
