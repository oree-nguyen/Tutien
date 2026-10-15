import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { fingerprint } from "../scripts/fingerprint.mjs";

// Run against Vite DEV: the offline-only sandbox is intentionally absent from
// production builds. Images demonstrate the implementation on Linux Chromium;
// they cannot certify Android appearance, touch ergonomics, or device FPS.
const origin = process.env.GAME_URL ?? "http://127.0.0.1:5174";
const sourceHashStart = await fingerprint();
const images = [],
  errors = [],
  shaderErrors = [],
  checks = {};
const report = {
  sourceHash: sourceHashStart,
  sourceHashStart,
  passed: false,
  scope:
    "Actual game showcase and offline DEV battlefield, plus explicitly isolated high-LOD creature art previews in the actual sanctuary scene; Linux Chromium SwiftShader, not Android device or FPS evidence.",
  fixtures: {
    battlefield:
      "Offline match started through #start. AI disabled, other actors moved to (90,90), player made immune, and the player placed at the seven original biome centers through the authorized DEV sandbox. Combat formulas, collision coordinates, and authoritative map bounds are unchanged.",
    creatures:
      "Art-only previews: buildCreatureVisual high LOD in the existing World sanctuary scene. The normal world render method and HUD visibility are restored afterward. These photos are not encounters or new gameplay/Boss definitions.",
  },
  images,
  checks,
};
const stageClip = { x: 380, y: 20, width: 520, height: 620 };
await mkdir("docs/visual-review", { recursive: true });
await mkdir("acceptance/evidence", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
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
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
async function picture(
  name,
  { crop = false, category = "showcase", ...metadata } = {},
) {
  const path = `docs/visual-review/${name}.png`;
  await page.screenshot({
    path,
    ...(crop ? { clip: stageClip } : { fullPage: false }),
  });
  images.push({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    category,
    ...(crop
      ? { clip: stageClip }
      : { viewport: { width: 1280, height: 720 } }),
    ...metadata,
  });
}
async function chooseHero(hero) {
  await page.locator(`[data-hero="${hero}"]`).click();
  await page.waitForFunction((h) => {
    const w = window.__HON_GIOI__?.world;
    return w?.preview && w.previewHero?.startsWith(`${h}:`);
  }, hero);
  await page.evaluate(() => {
    const w = window.__HON_GIOI__.world;
    w.rotateShowcase(Math.PI - w.showcaseYaw);
    w.setShowcaseView("full");
  });
  await settle();
}
let failure;
try {
  await page.goto(origin);
  await page.waitForFunction(() => window.__HON_GIOI__?.world.preview);
  assert.equal(
    await page.evaluate(() => typeof window.__HON_GIOI__.sandbox),
    "function",
    "Gallery requires the real DEV application, not the production preview server",
  );
  await settle();
  const scenery = await page.evaluate(async () => {
    const { REGIONS } = await import("/src/data.js");
    const { biomeAt, sceneryTerrainHeight, updatePortal } = await import(
      "/src/scenery.js"
    );
    const { terrainHeight } = await import("/src/art.js");
    const T = await import("/node_modules/three/build/three.module.js");
    const w = window.__HON_GIOI__.world,
      s = w.scenery,
      sanctuary = s.sanctuary.userData.sanctuary;
    const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>" };
    s.grass.material.onBeforeCompile(shader);
    const blade = s.grass.geometry.attributes.position;
    let minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < blade.count; i++) {
      minY = Math.min(minY, blade.getY(i));
      maxY = Math.max(maxY, blade.getY(i));
    }
    const pixels = s.splatmap.image.getContext("2d");
    const centers = REGIONS.map((r, i) => ({
      index: i,
      name: r.name,
      biome: biomeAt(r.x, r.z),
      color: [
        ...pixels.getImageData(
          Math.round(((r.x + 300) / 600) * 2047),
          Math.round(((r.z + 300) / 600) * 2047),
          1,
          1,
        ).data,
      ],
    }));
    let samples = 0,
      maximumHeightDifference = 0;
    for (let x = -94; x <= 94; x += 9.4)
      for (let z = -94; z <= 94; z += 9.4) {
        samples++;
        maximumHeightDifference = Math.max(
          maximumHeightDifference,
          Math.abs(sceneryTerrainHeight(x, z) - terrainHeight(x, z)),
        );
      }
    const portals = s.markerMeshes.filter((m) => m.p.type === "gate"),
      portal = portals[0].group;
    const states = ["closed", "warning", "open"].map((state) => {
      updatePortal(portal, state, 1);
      const p = portal.userData.portal;
      return {
        state: p.state,
        color: p.energy.color.getHex(),
        beam: p.beam.visible,
        opacity: p.core.material.uniforms.uOpacity.value,
      };
    });
    updatePortal(portal, "closed", 1);
    // Same runtime water material, isolated offscreen to compare reflected
    // light at two camera angles. A no-reflection control for each angle
    // removes the surface's ordinary perspective/UV/wave differences.
    const water = s.liquids.water.material;
    const liquid = water.clone();
    liquid.uniforms.uTime.value = 3;
    const probe = new T.Scene();
    const surface = new T.PlaneGeometry(120, 120, 32, 32);
    surface.rotateX(-Math.PI / 2);
    probe.add(new T.Mesh(surface, liquid));
    const target = new T.WebGLRenderTarget(64, 64);
    const previousTarget = w.renderer.getRenderTarget();
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 250);
    const sample = (position, strength) => {
      camera.position.set(...position);
      camera.lookAt(0, 0, 0);
      liquid.uniforms.uReflectionStrength.value = strength;
      w.renderer.setRenderTarget(target);
      w.renderer.render(probe, camera);
      const pixels = new Uint8Array(64 * 64 * 4);
      w.renderer.readRenderTargetPixels(target, 0, 0, 64, 64, pixels);
      return pixels;
    };
    let reflection;
    try {
      const positions = [
        [0, 12, 0.1],
        [8, 5, 10],
      ];
      const first = sample(positions[0], 1),
        firstControl = sample(positions[0], 0);
      const second = sample(positions[1], 1),
        secondControl = sample(positions[1], 0);
      let changedChannels = 0,
        signalTotal = 0,
        maximumSignal = 0;
      for (let i = 0; i < first.length; i++)
        if (i % 4 !== 3) {
          const signal = Math.abs(
            first[i] - firstControl[i] - (second[i] - secondControl[i]),
          );
          if (signal > 1) changedChannels++;
          maximumSignal = Math.max(maximumSignal, signal);
          signalTotal += signal;
        }
      reflection = {
        ...water.userData.liquidReflection,
        cameraPositions: positions,
        sampledPixels: 4096,
        changedChannels,
        maximumSignal,
        meanViewDependentSignal: signalTotal / (4096 * 3),
        shaderUsesCameraPosition: water.fragmentShader.includes(
          "cameraPosition - vWorld",
        ),
        shaderReflectsRay: water.fragmentShader.includes("reflect(-V, N)"),
        shaderUsesFresnel: water.fragmentShader.includes(
          "pow(1. - incidence, 5.)",
        ),
        shaderDifferentiatesWave:
          water.vertexShader.includes("derivativeX") &&
          water.vertexShader.includes("derivativeZ"),
      };
    } finally {
      w.renderer.setRenderTarget(previousTarget);
      target.dispose();
      surface.dispose();
      liquid.dispose();
    }
    const gl = w.renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      reflection,
      terrain: {
        ...s.terrain.geometry.parameters,
        normals: !!s.terrain.geometry.attributes.normal,
        samples,
        maximumHeightDifference,
        exteriorHeight: sceneryTerrainHeight(200, 180),
        originalExteriorHeight: terrainHeight(200, 180),
      },
      splatmap: {
        width: s.splatmap.image.width,
        height: s.splatmap.image.height,
        centers,
        uniqueCenterColors: new Set(centers.map((c) => c.color.join(","))).size,
      },
      grass: {
        instances: s.grass.count,
        bladesPerCluster: s.grass.userData.bladesPerCluster,
        vertices: blade.count,
        minY,
        maxY,
        windUniform: shader.uniforms.uSceneryTime === s.time,
        playerUniform: shader.uniforms.uSceneryPlayer === s.playerPosition,
        windSource: shader.vertexShader.includes("sin(uSceneryTime*3."),
        proximitySource: shader.vertexShader.includes("uSceneryPlayer.xz"),
      },
      sanctuary: {
        pedestalSteps: s.sanctuary.children.filter(
          (o) =>
            o.geometry?.type === "CylinderGeometry" &&
            o.geometry.parameters.height === 0.24,
        ).length,
        flames: sanctuary.flames.length,
        clouds: sanctuary.clouds.length,
        petals: sanctuary.motes.length,
        key: {
          type: sanctuary.key.type,
          intensity: sanctuary.key.intensity,
          shadow: sanctuary.key.shadow.mapSize.x,
        },
        rim: { type: sanctuary.rim.type, intensity: sanctuary.rim.intensity },
        fill: {
          type: sanctuary.fill.type,
          intensity: sanctuary.fill.intensity,
        },
        under: {
          type: sanctuary.under.type,
          intensity: sanctuary.under.intensity,
        },
        visible: s.sanctuary.visible,
        battlefieldVisible: s.battlefield.visible,
      },
      portals: {
        count: portals.length,
        ordinary: portals.filter((p) => Math.hypot(p.p.x, p.p.z) >= 20).length,
        central: portals.filter((p) => Math.hypot(p.p.x, p.p.z) < 20).length,
        crystalColumns: portal.userData.portal.crystals.length,
        radius: portal.children.find(
          (o) => o.geometry?.type === "CylinderGeometry",
        ).geometry.parameters.radiusTop,
        states,
      },
      shops: s.markerMeshes.filter((m) => m.p.type === "shop").length,
      altars: s.markerMeshes.filter((m) => m.p.type === "shrine").length,
      glError: gl.getError(),
    };
  });
  assert.equal(scenery.terrain.width, 600);
  assert.equal(scenery.terrain.height, 600);
  assert.equal(scenery.terrain.widthSegments, 256);
  assert.equal(scenery.terrain.heightSegments, 256);
  assert.ok(scenery.terrain.normals);
  assert.equal(scenery.terrain.samples, 400);
  assert.ok(scenery.terrain.maximumHeightDifference < 1e-12);
  assert.ok(
    scenery.terrain.exteriorHeight > scenery.terrain.originalExteriorHeight,
  );
  assert.equal(scenery.splatmap.width, 2048);
  assert.equal(scenery.splatmap.height, 2048);
  assert.equal(scenery.splatmap.uniqueCenterColors, 7);
  scenery.splatmap.centers.forEach((c) => assert.equal(c.biome, c.index));
  assert.equal(scenery.grass.instances, 400);
  assert.equal(scenery.grass.bladesPerCluster, 100);
  assert.ok(
    scenery.grass.vertices >= 16 && scenery.grass.maxY - scenery.grass.minY > 1,
  );
  for (const key of [
    "windUniform",
    "playerUniform",
    "windSource",
    "proximitySource",
  ])
    assert.equal(scenery.grass[key], true);
  assert.equal(scenery.sanctuary.pedestalSteps, 3);
  assert.equal(scenery.sanctuary.flames, 4);
  assert.ok(scenery.sanctuary.clouds > 0 && scenery.sanctuary.petals > 0);
  assert.deepEqual(scenery.sanctuary.key, {
    type: "DirectionalLight",
    intensity: 2.2,
    shadow: 4096,
  });
  assert.deepEqual(scenery.sanctuary.rim, { type: "SpotLight", intensity: 3 });
  assert.deepEqual(scenery.sanctuary.fill, {
    type: "HemisphereLight",
    intensity: 1.1,
  });
  assert.deepEqual(scenery.sanctuary.under, {
    type: "PointLight",
    intensity: 1.5,
  });
  assert.equal(scenery.sanctuary.visible, true);
  assert.equal(scenery.sanctuary.battlefieldVisible, false);
  assert.equal(scenery.portals.count, 8);
  assert.equal(scenery.portals.ordinary, 5);
  assert.equal(scenery.portals.central, 3);
  assert.equal(scenery.portals.radius * 2, 7);
  assert.equal(scenery.portals.crystalColumns, 4);
  assert.deepEqual(
    scenery.portals.states.map((s) => s.state),
    ["closed", "warning", "open"],
  );
  assert.deepEqual(
    scenery.portals.states.map((s) => s.beam),
    [false, false, true],
  );
  assert.equal(new Set(scenery.portals.states.map((s) => s.color)).size, 3);
  assert.equal(scenery.shops, 6);
  assert.equal(scenery.altars, 3);
  assert.equal(scenery.glError, 0);
  for (const key of [
    "analyticWaveNormals",
    "viewDependentSky",
    "fresnel",
    "proceduralMoon",
    "shaderUsesCameraPosition",
    "shaderReflectsRay",
    "shaderUsesFresnel",
    "shaderDifferentiatesWave",
  ])
    assert.equal(scenery.reflection[key], true);
  assert.equal(scenery.reflection.sceneObjects, false);
  assert.equal(scenery.reflection.SSR, false);
  assert.ok(scenery.reflection.changedChannels > 16);
  assert.ok(scenery.reflection.maximumSignal > 1);
  assert.ok(scenery.reflection.meanViewDependentSignal > 0.1);
  report.scenery = scenery;
  checks.terrain = checks.grass = checks.portals = true;
  checks.waterReflection = true;
  console.log(
    "Gallery: terrain/splatmap, grass shader, three portal states and four studio lights verified",
  );

  const heroes = [];
  for (let hero = 0; hero < 12; hero++) {
    const code = `H${String(hero + 1).padStart(2, "0")}`;
    await chooseHero(hero);
    const result = await page.evaluate(async (hero) => {
      const { HERO_APPEARANCE } = await import("/src/hero-anatomy.js");
      const w = window.__HON_GIOI__.world;
      let anatomy,
        faceTexture = 0,
        weapon = false,
        sphereBody = false,
        garmentPanels = 0;
      w.preview.traverse((o) => {
        if (o.userData.anatomy && o.userData.detail === "high")
          anatomy = o.userData.anatomy;
        if (o.name === "VLineHeadFaceUV")
          faceTexture = Math.max(faceTexture, o.material.map.image.width);
        if (o.userData.proceduralMasterwork && o.userData.detail === "high")
          weapon = true;
        if (o.userData.rigRole === "cloth") garmentPanels++;
        if (
          /torso|chest|shoulder|belly|eye/i.test(o.name) &&
          o.geometry?.type === "SphereGeometry"
        )
          sphereBody = true;
      });
      return {
        hero,
        expected: {
          gender: HERO_APPEARANCE[hero].gender,
          height: HERO_APPEARANCE[hero].height,
        },
        anatomy,
        faceTexture,
        weapon,
        sphereBody,
        garmentPanels,
        yaw: w.showcaseYaw,
        glError: w.renderer.getContext().getError(),
      };
    }, hero);
    assert.equal(result.anatomy.gender, result.expected.gender);
    assert.equal(result.anatomy.heightMeters, result.expected.height);
    assert.equal(result.anatomy.headCount, 8);
    assert.equal(result.anatomy.garmentLayers, 4);
    assert.equal(result.faceTexture, 2048);
    assert.ok(result.weapon && result.garmentPanels >= 4);
    assert.equal(result.sphereBody, false);
    assert.equal(result.glError, 0);
    await picture(code, { crop: true, hero: code, view: "full" });
    await page.locator("#showcaseFace").click();
    await settle();
    assert.equal(
      await page.evaluate(() => window.__HON_GIOI__.world.showcaseView),
      "face",
    );
    await picture(`${code}-face`, { crop: true, hero: code, view: "face" });
    if (hero === 0 || hero === 2) {
      await page.evaluate(() => {
        const w = window.__HON_GIOI__.world;
        w.setShowcaseView("full");
        w.rotateShowcase(Math.PI);
      });
      await settle();
      assert.ok(
        Math.abs(
          (await page.evaluate(() => window.__HON_GIOI__.world.showcaseYaw)) -
            result.yaw -
            Math.PI,
        ) < 1e-9,
      );
      await picture(`${code}-back`, { crop: true, hero: code, view: "back" });
    }
    heroes.push(result);
    console.log(
      `Gallery: ${code} full/face${hero === 0 || hero === 2 ? "/back" : ""}`,
    );
  }
  report.heroes = heroes;
  checks.showcase = true;

  await chooseHero(0);
  for (const skin of [1, 2]) {
    await page.locator("#skin").selectOption(String(skin));
    await page.waitForFunction(
      (s) =>
        window.__HON_GIOI__.loadout.skin === s &&
        window.__HON_GIOI__.world.previewHero?.startsWith(`0:${s}:`),
      skin,
    );
    await settle();
    await picture(`skin-${skin}`, {
      crop: true,
      hero: "H01",
      skin,
      view: "full",
    });
  }
  await page.locator("#skin").selectOption("0");
  for (const costume of [1, 2, 3]) {
    await page.locator("#costume").selectOption(String(costume));
    await page.waitForFunction(
      (c) =>
        window.__HON_GIOI__.loadout.costume === c &&
        window.__HON_GIOI__.world.previewHero?.startsWith(`0:0:${c}:`),
      costume,
    );
    await settle();
    await picture(`costume-${costume}`, {
      crop: true,
      hero: "H01",
      costume,
      view: "full",
    });
  }
  await page.locator("#costume").selectOption("0");
  await settle();
  await page.evaluate(() => window.__HON_GIOI__.world.setQuality("ultra"));
  await settle();
  report.ultra = await page.evaluate(() => {
    const w = window.__HON_GIOI__.world;
    return {
      passes: w.composer.passes.length,
      shadow: w.sun.shadow.mapSize.x,
      error: w.renderer.getContext().getError(),
      calls: w.renderer.info.render.calls,
    };
  });
  assert.equal(report.ultra.passes, 3);
  assert.equal(report.ultra.shadow, 4096);
  assert.equal(report.ultra.error, 0);
  await picture("ultra", { crop: true, quality: "ultra", view: "full" });
  await page.evaluate(() => window.__HON_GIOI__.world.setQuality("balanced"));

  await page.locator("#start").click();
  await page.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  await page.evaluate(() =>
    window.__HON_GIOI__.sandbox(() => {
      const m = window.__HON_GIOI__.match;
      m.ai = () => {};
      for (const a of m.actors)
        if (a !== m.player) {
          a.x = 90;
          a.z = 90;
        }
      m.player.immuneUntil = 100000;
      m.drops = [];
    }),
  );
  const biomes = [];
  for (let region = 0; region < 7; region++) {
    const state = await page.evaluate(async (region) => {
      const { REGIONS } = await import("/src/data.js");
      const { groundHeight } = await import("/src/art.js");
      const g = window.__HON_GIOI__,
        r = REGIONS[region];
      g.sandbox(() => {
        g.match.player.x = r.x;
        g.match.player.z = r.z;
        g.match.player.realm = region === 6 ? 1 : 0;
        g.match.player.immuneUntil = 100000;
      });
      g.world.focus.set(r.x, groundHeight(r.x, r.z), r.z);
      return {
        region,
        name: r.name,
        x: r.x,
        z: r.z,
        realm: region === 6 ? 1 : 0,
      };
    }, region);
    await page.waitForFunction((biome) => {
      const manager = window.__HON_GIOI__.world.scenery.pbr;
      return (
        manager.cache.get(biome)?.size === 2048 &&
        manager.stats().pendingJobs === 0
      );
    }, region);
    await settle();
    const rendered = await page.evaluate(() => {
      const g = window.__HON_GIOI__;
      return {
        battlefieldVisible: g.world.scenery.battlefield.visible,
        sanctuaryVisible: g.world.scenery.sanctuary.visible,
        hiddenRealmVisible: g.world.scenery.hidden.visible,
        pbr: g.world.scenery.pbr.stats(),
        glError: g.world.renderer.getContext().getError(),
      };
    });
    assert.equal(rendered.battlefieldVisible, true);
    assert.equal(rendered.sanctuaryVisible, false);
    assert.equal(rendered.hiddenRealmVisible, region === 6);
    assert.equal(rendered.glError, 0);
    await picture(`region-${region + 1}`, {
      category: "offline-biome",
      ...state,
    });
    biomes.push({ ...state, ...rendered });
    console.log(`Gallery: biome ${region + 1} ${state.name}`);
  }
  report.biomes = biomes;
  checks.biomes = true;

  // Isolate only the art component to frame each creature at its own scale.
  // buildCreatureVisual is the same module used by World.addDetail in matches.
  const hiddenStyle = await page.addStyleTag({
    content: "#app,#modalRoot{visibility:hidden!important}",
  });
  await page.evaluate(() => {
    const w = window.__HON_GIOI__.world;
    window.__HG_GALLERY__ = {
      originalRender: w.render,
      visual: null,
      actor: null,
    };
    w.render = function (_match, dt) {
      this.clock += dt;
      this.scenery.update(this.clock, null);
      this.dynamic.visible = false;
      this.sun.visible = this.mapAmbient.visible = this.mapRim.visible = false;
      this.weaponLight.visible = false;
      this.particleMesh.visible = false;
      this.targetRing.visible = false;
      this.fogRegions?.forEach((o) => (o.visible = false));
      this.realmMarkers?.forEach((o) => (o.visible = false));
      this.effectMeshes.forEach((e) => (e.mesh.visible = false));
      this.scene.background.setHex(0x6a8da1);
      this.scene.fog.color.setHex(0x8baabb);
      this.scene.fog.density = 0.008;
      const fixture = window.__HG_GALLERY__;
      fixture.animate?.(fixture.visual, fixture.actor, this.clock, dt);
      this.renderer.render(this.scene, this.camera);
    };
  });
  const creatureKinds = [
    "wolf",
    "rhino",
    "firebird",
    "icebutterfly",
    "ape",
    "kirin",
    "dragon",
  ];
  const creatures = [];
  for (const species of creatureKinds) {
    const result = await page.evaluate(async (species) => {
      const T = await import("/node_modules/three/build/three.module.js");
      const { buildCreatureVisual, animateCreatureVisual } = await import(
        "/src/creature-art.js"
      );
      const w = window.__HON_GIOI__.world,
        fixture = window.__HG_GALLERY__;
      if (fixture.visual) w.scene.remove(fixture.visual);
      const boss = ["ape", "kirin", "dragon"].includes(species);
      const actor = {
        kind: boss ? "boss" : "beast",
        species,
        boss: boss ? { key: species } : null,
        tier: boss ? 2 : 0,
        mutant: false,
        x: 0,
        z: 0,
      };
      const visual = buildCreatureVisual(actor, "high");
      visual.updateMatrixWorld(true);
      const originalBounds = new T.Box3().setFromObject(visual),
        originalSize = originalBounds.getSize(new T.Vector3());
      visual.position.set(0, 0.74, 0);
      visual.rotation.y = Math.PI + 0.35;
      w.scene.add(visual);
      visual.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(visual),
        center = box.getCenter(new T.Vector3()),
        size = box.getSize(new T.Vector3());
      const tan = Math.tan((w.camera.fov * Math.PI) / 360),
        croppedHorizontal = (w.camera.aspect * 520) / 1280;
      const distance =
        Math.max(
          size.y / (2 * tan),
          size.x / (2 * tan * croppedHorizontal),
          size.z * 0.8,
        ) * 1.35;
      w.camera.position.set(
        center.x + distance * 0.12,
        center.y + distance * 0.16,
        center.z + distance,
      );
      w.camera.lookAt(center);
      fixture.visual = visual;
      fixture.actor = actor;
      fixture.animate = animateCreatureVisual;
      let triangles = 0,
        meshCount = 0;
      visual.traverse((o) => {
        if (o.isMesh) {
          meshCount++;
          triangles +=
            (o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3;
        }
      });
      return {
        species,
        kind: actor.kind,
        artPreview: true,
        detail: visual.userData.detail,
        dimensions: originalSize.toArray(),
        metadata: visual.userData.creatureArt,
        triangles,
        meshCount,
      };
    }, species);
    assert.equal(result.metadata.species, species);
    assert.equal(result.detail, "high");
    assert.ok(result.triangles > 0 && result.meshCount > 0);
    if (species === "ape")
      assert.ok(Math.abs(result.dimensions[1] - 4.5) < 0.001);
    if (species === "kirin")
      assert.ok(Math.abs(result.dimensions[1] - 4) < 0.001);
    if (species === "dragon") {
      assert.ok(Math.abs(result.dimensions[2] - 12) < 0.001);
      assert.equal(result.metadata.glowingEyes, 4);
      assert.equal(result.metadata.spineSegments, 128);
    }
    await settle();
    assert.equal(
      await page.evaluate(() =>
        window.__HON_GIOI__.world.renderer.getContext().getError(),
      ),
      0,
    );
    await picture(`creature-${species}`, {
      crop: true,
      category: "isolated-creature-art-preview",
      species,
      detail: "high",
    });
    creatures.push(result);
    console.log(`Gallery: isolated high-LOD ${species}`);
  }
  report.creatures = creatures;
  checks.creatures = true;
  await page.evaluate(() => {
    const g = window.__HON_GIOI__,
      fixture = window.__HG_GALLERY__;
    g.world.scene.remove(fixture.visual);
    g.world.render = fixture.originalRender;
    g.world.dynamic.visible = true;
    delete window.__HG_GALLERY__;
  });
  await hiddenStyle.evaluate((element) => element.remove());
  await settle();
  assert.deepEqual(errors, []);
  assert.deepEqual(shaderErrors, []);
  assert.equal(
    images.length,
    46,
    "12 full +12 face +2 back +2 skin +3 costume +Ultra +7 regions +7 creatures",
  );
} catch (error) {
  failure = error;
} finally {
  await browser.close();
}
const sourceHashEnd = await fingerprint();
report.sourceHashEnd = sourceHashEnd;
checks.sourceStable = sourceHashStart === sourceHashEnd;
if (!checks.sourceStable)
  failure ??= Error(
    "Source changed during gallery capture; rerun after source freeze",
  );
report.errors = errors;
report.shaderErrors = shaderErrors;
report.recordedAt = new Date().toISOString();
report.passed =
  !failure &&
  [
    "showcase",
    "biomes",
    "terrain",
    "grass",
    "portals",
    "waterReflection",
    "creatures",
    "sourceStable",
  ].every((k) => checks[k]);
if (failure) report.failure = failure.stack ?? String(failure);
await writeFile(
  "acceptance/evidence/art-gallery.json",
  JSON.stringify(report, null, 2) + "\n",
);
if (failure) throw failure;
console.log(
  `PASS: ${images.length} current-source gallery images; real scenery/geometry checks, no shader/page errors. No Android or final art-quality certification.`,
);
