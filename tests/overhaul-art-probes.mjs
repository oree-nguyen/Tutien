import assert from "node:assert/strict";

/** GPU fixtures use the running game's renderer; this helper launches no browser. */
export async function probeOverhaulArt(page) {
  const errors = [],
    shaderErrors = [];
  const onError = (error) => errors.push(error.message);
  const onConsole = (message) => {
    if (
      message.type() === "error" &&
      /WebGLProgram|Shader Error|VALIDATE_STATUS|GL_INVALID|gl\.getError/.test(
        message.text(),
      )
    )
      shaderErrors.push(message.text());
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  try {
    const traces = await page.evaluate(async () => {
      const [T, creatures, pbr, elements, rings] = await Promise.all([
        import("/node_modules/.vite/deps/three.js"),
        import("/src/creature-art.js"),
        import("/src/creature-pbr.js"),
        import("/src/environment-vfx.js"),
        import("/src/soul-ring-vfx.js"),
      ]);
      const game = window.__HON_GIOI__,
        world = game?.world,
        renderer = world?.renderer;
      const ensure = (condition, message) => {
        if (!condition) throw new Error(`Overhaul art probe: ${message}`);
      };
      ensure(
        renderer && world.scenery && game.match?.player,
        "requires the actual running World and an active match",
      );
      const gl = renderer.getContext(),
        glBefore = gl.getError();
      ensure(glBefore === gl.NO_ERROR, `pre-existing GL error ${glBefore}`);
      const saved = {
        target: renderer.getRenderTarget(),
        viewport: renderer.getViewport(new T.Vector4()).clone(),
        scissor: renderer.getScissor(new T.Vector4()).clone(),
        scissorTest: renderer.getScissorTest(),
        clearColor: renderer.getClearColor(new T.Color()).clone(),
        clearAlpha: renderer.getClearAlpha(),
        autoClear: renderer.autoClear,
        shadow: renderer.shadowMap.enabled,
        autoReset: renderer.info.autoReset,
        shaderCheck: renderer.debug.checkShaderErrors,
        sceneryTime: world.scenery.time.value,
      };
      const target = new T.WebGLRenderTarget(512, 512, {
        depthBuffer: true,
        stencilBuffer: false,
      });
      target.texture.colorSpace = T.SRGBColorSpace;
      const scene = new T.Scene();
      scene.background = new T.Color(0x071119);
      scene.add(new T.HemisphereLight(0xe5f5ff, 0x4a3c32, 2));
      const key = new T.DirectionalLight(0xffedcf, 3),
        rim = new T.DirectionalLight(0x91dfff, 1.7);
      key.position.set(4, 7, -5);
      rim.position.set(-4, 4, 4);
      scene.add(key, rim);
      const camera = new T.PerspectiveCamera(38, 1, 0.01, 300);
      let current = null;
      const activeEffects = new Set(),
        ringRoots = new Set(),
        creatureRoots = new Set(),
        borrowed = new Map();
      const trace = {
        scope:
          "Offscreen 512×512 functional fixtures rendered by the actual game WebGLRenderer. Pixel content, material textures, articulation and shader compilation only; no art-quality, physical Android or FPS claim.",
        creatures: [],
        elemental: [],
        ringTiers: [],
        architecture: [],
      };
      const hash = (array) => {
        let h = 2166136261;
        for (let i = 0; i < array.length; i += 4) {
          h = Math.imul(h ^ array[i], 16777619);
          h = Math.imul(h ^ array[i + 1], 16777619);
          h = Math.imul(h ^ array[i + 2], 16777619);
        }
        return (h >>> 0).toString(16);
      };
      const pixels = () => {
        const data = new Uint8Array(512 * 512 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 512, 512, data);
        return data;
      };
      let background;
      const content = (data) => {
        let nonBackground = 0,
          maximum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const difference =
            Math.abs(data[i] - background[i]) +
            Math.abs(data[i + 1] - background[i + 1]) +
            Math.abs(data[i + 2] - background[i + 2]);
          if (difference > 12) nonBackground++;
          maximum = Math.max(maximum, data[i], data[i + 1], data[i + 2]);
        }
        return { nonBackground, maximum, hash: hash(data) };
      };
      const textureContent = (texture) => {
        ensure(texture?.image, "missing texture image");
        const image = texture.image,
          width = image.width,
          height = image.height;
        let data = image.data;
        if (!data) {
          const context = image.getContext?.("2d");
          ensure(context, "texture is not readable Canvas/DataTexture");
          data = context.getImageData(
            Math.max(0, width / 2 - 32),
            Math.max(0, height / 2 - 32),
            Math.min(64, width),
            Math.min(64, height),
          ).data;
        }
        let minimum = 255,
          maximum = 0;
        for (let i = 0; i < data.length; i += 4) {
          minimum = Math.min(minimum, data[i]);
          maximum = Math.max(maximum, data[i]);
        }
        return {
          width,
          height,
          minimum,
          maximum,
          hash: hash(data),
          canvas: !!texture.isCanvasTexture,
          colorSpace: texture.colorSpace,
        };
      };
      const put = (object) => {
        if (current) scene.remove(current);
        current = object;
        if (object) scene.add(object);
      };
      const frame = (box) => {
        const size = box.getSize(new T.Vector3()),
          center = box.getCenter(new T.Vector3());
        const distance = Math.max(size.x, size.y, size.z, 1) * 1.95;
        camera.position.set(
          center.x + distance * 0.55,
          center.y + distance * 0.32,
          center.z - distance * 0.82,
        );
        camera.lookAt(center);
        camera.updateMatrixWorld(true);
      };
      const render = (label) => {
        renderer.compile(scene, camera);
        renderer.render(scene, camera);
        const data = pixels(),
          sample = content(data),
          error = gl.getError();
        ensure(error === gl.NO_ERROR, `${label}: GL error ${error}`);
        ensure(
          sample.nonBackground > 64,
          `${label}: empty GPU pixel sample (${sample.nonBackground})`,
        );
        return {
          ...sample,
          glError: error,
          triangles: renderer.info.render.triangles,
          calls: renderer.info.render.calls,
        };
      };
      const triangles = (root) => {
        let value = 0;
        root.traverse((o) => {
          if (o.isMesh)
            value +=
              ((o.geometry.index?.count ??
                o.geometry.attributes.position.count) /
                3) *
              (o.isInstancedMesh ? o.count : 1);
        });
        return value;
      };
      const borrow = (group) => {
        borrowed.set(group, {
          parent: group.parent,
          index: group.parent?.children.indexOf(group),
        });
        put(group);
      };
      const restoreBorrowed = (group) => {
        const previous = borrowed.get(group);
        if (!previous) return;
        if (current === group) {
          scene.remove(group);
          current = null;
        }
        if (previous.parent) {
          previous.parent.add(group);
          const children = previous.parent.children;
          children.splice(children.indexOf(group), 1);
          children.splice(previous.index, 0, group);
        }
        borrowed.delete(group);
      };
      try {
        renderer.autoClear = true;
        renderer.info.autoReset = true;
        renderer.shadowMap.enabled = false;
        renderer.debug.checkShaderErrors = true;
        renderer.setScissorTest(false);
        renderer.setRenderTarget(target);
        renderer.setViewport(0, 0, 512, 512);
        renderer.render(scene, camera);
        background = pixels();
        trace.gpu = {
          renderer: gl.getParameter(gl.RENDERER),
          vendor: gl.getParameter(gl.VENDOR),
          webgl2: renderer.capabilities.isWebGL2,
          target: [512, 512],
          initialError: glBefore,
          programCountBefore: renderer.info.programs?.length ?? 0,
        };

        for (const name of [
          "wolf",
          "rhino",
          "firebird",
          "icebutterfly",
          "ape",
          "kirin",
          "dragon",
        ]) {
          const actor = {
            id: 120,
            kind: ["ape", "kirin", "dragon"].includes(name) ? "boss" : "beast",
            species: name,
            boss: { key: name },
            tier: 1,
            x: 0,
            z: 0,
            hp: 850,
            atk: 44,
          };
          const root = creatures.buildCreatureVisual(actor, "high");
          creatureRoots.add(root);
          const maps = pbr.getCreaturePBR(name, "high"),
            mapTrace = {};
          for (const key of ["map", "normalMap", "roughnessMap"]) {
            const sample = textureContent(maps[key]);
            ensure(
              sample.width === 512 &&
                sample.height === 512 &&
                sample.maximum > sample.minimum + 2,
              `${name}:${key} lacks 512px painted detail`,
            );
            mapTrace[key] = sample;
          }
          let boundPaintedMeshes = 0;
          root.traverse((object) => {
            if (
              object.isMesh &&
              object.material.map === maps.map &&
              object.material.normalMap === maps.normalMap &&
              object.material.roughnessMap === maps.roughnessMap
            )
              boundPaintedMeshes++;
          });
          ensure(
            boundPaintedMeshes > 0,
            `${name}: generated PBR maps are not bound to any rendered body mesh`,
          );
          put(root);
          creatures.animateCreatureVisual(root, actor, 0.1, 1 / 60);
          root.updateMatrixWorld(true);
          frame(new T.Box3().setFromObject(root));
          const poseA = render(`${name}:poseA`),
            articulation = {};
          if (["wolf", "rhino"].includes(name)) {
            const hips = [],
              knees = [],
              ankles = [];
            root.traverse((o) => {
              if (o.name.startsWith("creatureLeg:")) hips.push(o);
              if (o.name.startsWith("creatureKnee:")) knees.push(o);
              if (o.name.startsWith("creatureAnkle:")) ankles.push(o);
            });
            ensure(
              hips.length === 4 && knees.length === 4 && ankles.length === 4,
              `${name}: missing four articulated legs`,
            );
            actor.x = 0.35;
            const immutable = JSON.stringify(actor);
            creatures.animateCreatureVisual(root, actor, 0.2, 1 / 60);
            ensure(
              knees.some((o) => Math.abs(o.rotation.x) > 0.1) &&
                ankles.some((o) => Math.abs(o.rotation.x) > 0.1),
              `${name}: shin/ankle did not articulate`,
            );
            ensure(
              JSON.stringify(actor) === immutable,
              `${name}: art changed combat state`,
            );
            Object.assign(articulation, {
              thighs: hips.length,
              shins: knees.length,
              ankles: ankles.length,
              shinAngles: knees.map((o) => o.rotation.x),
            });
          } else if (name === "firebird") {
            const parts = [];
            root.traverse((o) => {
              if (o.isMesh)
                for (const part of o.geometry.userData.creatureParts ?? []) {
                  ensure(
                    (part.triangleStart + part.triangleCount) * 3 <=
                      o.geometry.index.count,
                    "feather has no indexed geometry",
                  );
                  parts.push(part);
                }
            });
            for (const side of [-1, 1])
              ensure(
                parts.filter(
                  (part) => part.kind === "flightFeather" && part.side === side,
                ).length === 12,
                "firebird needs twelve layered feathers per wing",
              );
            ensure(
              parts.filter((part) => part.kind === "fireTailPlume").length ===
                3,
              "firebird needs three flame tails",
            );
            const embers = root.getObjectByName("creatureEmbers"),
              before = embers?.instanceMatrix.array.slice();
            ensure(embers?.isInstancedMesh, "firebird ember fixture missing");
            creatures.animateCreatureVisual(root, actor, 0.4, 1 / 60);
            ensure(
              before.some(
                (value, i) => value !== embers.instanceMatrix.array[i],
              ),
              "firebird embers did not move",
            );
            Object.assign(articulation, {
              feathersPerWing: [12, 12],
              flameTails: 3,
              goldenCrest: parts.filter((part) => part.kind === "goldenCrest")
                .length,
              emberInstances: embers.count,
            });
          } else if (name === "icebutterfly") {
            const wings = [-1, 1].map((side) =>
              root.getObjectByName(`creatureWing:${side}`),
            );
            ensure(wings.every(Boolean), "ice butterfly missing hinge");
            const before = wings.map((o) => o.rotation.y);
            creatures.animateCreatureVisual(root, actor, 0.4, 1 / 60);
            ensure(
              wings.every((o, i) => o.rotation.y !== before[i]),
              "ice butterfly wings did not hinge",
            );
            ensure(
              wings.every((o) =>
                o.children.some(
                  (m) =>
                    m.isMesh &&
                    m.material.transmission > 0 &&
                    m.material.alphaMap?.image.width === 512,
                ),
              ),
              "ice wings lack translucent 512px crystal pattern",
            );
            Object.assign(articulation, {
              hinges: wings.length,
              alpha: textureContent(maps.alphaMap),
            });
          }
          const poseB = ["wolf", "rhino", "firebird", "icebutterfly"].includes(
            name,
          )
            ? render(`${name}:poseB`)
            : null;
          if (poseB)
            ensure(
              poseB.hash !== poseA.hash,
              `${name}: articulated pose did not change rendered pixels`,
            );
          trace.creatures.push({
            species: name,
            maps: mapTrace,
            boundPaintedMeshes,
            geometryTriangles: triangles(root),
            poseA,
            poseB,
            articulation,
          });
          put(null);
        }
        trace.creatureCache = pbr.creaturePBRCacheInfo();

        const activeBefore = elements.elementalVfxCacheStats().active;
        for (const definition of elements.ELEMENTAL_VFX) {
          const effect = elements.createElementalEffect({
            element: definition.key,
            quality: "ultra",
            radius: 1.4,
            duration: 1.2,
            seed: 0.317,
          });
          ensure(effect, `${definition.key}: effect capacity rejected fixture`);
          activeEffects.add(effect);
          elements.updateElementalEffect(effect, 0.28);
          put(effect);
          frame(
            new T.Box3(
              new T.Vector3(-1.6, 0, -1.6),
              new T.Vector3(1.6, 2.5, 1.6),
            ),
          );
          const image = render(`element:${definition.key}`),
            mesh = effect.children[0];
          ensure(
            mesh.material.isShaderMaterial &&
              mesh.material.uniforms.uElapsed.value === 0.28,
            `${definition.key}: actual shader was not updated`,
          );
          trace.elemental.push({
            element: definition.key,
            pattern: effect.userData.elementalVfx.pattern,
            parts: effect.userData.elementalVfx.parts,
            segments: effect.userData.elementalVfx.segments,
            image,
          });
          put(null);
          elements.disposeElementalEffect(effect);
          activeEffects.delete(effect);
        }
        ensure(
          trace.elemental.length === 12 &&
            new Set(trace.elemental.map((item) => item.pattern)).size === 12,
          "twelve distinct element fixtures are required",
        );
        ensure(
          elements.elementalVfxCacheStats().active === activeBefore,
          "element fixtures leaked active borrowers",
        );
        for (const [id, tier] of [
          [1, "purple"],
          [8, "black"],
        ]) {
          const root = new T.Group();
          const equippedRings = id === 8 ? [0, id] : [id, 0];
          ringRoots.add(root);
          const group = rings.syncSoulRingVisuals(
            root,
            { rings: equippedRings },
            "high",
            0.3,
          );
          ensure(
            group.children.length === 2 &&
              group.children.every(
                (o) => o.userData.ringId === id && o.userData.tier === tier,
              ),
            `${tier}: source ring metadata mismatch`,
          );
          put(root);
          frame(
            new T.Box3(
              new T.Vector3(-1.1, 0, -1.1),
              new T.Vector3(1.1, 1.9, 1.1),
            ),
          );
          const poseA = render(`ring:${tier}:A`),
            before = group.children[0].rotation.z;
          rings.syncSoulRingVisuals(
            root,
            { rings: equippedRings },
            "high",
            1.2,
          );
          const poseB = render(`ring:${tier}:B`);
          ensure(
            group.children[0].rotation.z !== before &&
              poseA.hash !== poseB.hash,
            `${tier}: glyph spin/ripple pixels stayed static`,
          );
          trace.ringTiers.push({
            id,
            tier,
            placements: group.children.map((o) => o.userData.placement),
            metadata: root.userData.soulRingVFX,
            texture: textureContent(group.children[0].material.map),
            triangles: triangles(root),
            poseA,
            poseB,
          });
          put(null);
          rings.disposeSoulRingVisuals(root);
          ringRoots.delete(root);
        }
        trace.ringCache = rings.getSoulRingTextureCacheInfo();

        const shops = world.scenery.markerMeshes.filter(
            (marker) => marker.p.type === "shop",
          ),
          altars = world.scenery.markerMeshes.filter(
            (marker) => marker.p.type === "shrine",
          );
        ensure(
          shops.length === 6 && altars.length === 3,
          "actual World must contain six shops and three altars",
        );
        const shop = shops[0],
          altar = altars[0],
          shopData = shop.group.userData.shop,
          altarData = altar.group.userData.altar;
        ensure(
          shopData?.lanterns.length === 8 &&
            shopData.roof.geometry.parameters.segments === 8 &&
            shopData.smoke.isInstancedMesh &&
            shopData.smoke.count === 10,
          "actual shop architecture or GPU smoke is incomplete",
        );
        ensure(
          altarData?.channels.length === 9 &&
            altarData.crystal.material.transmission >= 0.5,
          "actual altar blood channels/crystal are incomplete",
        );
        for (const marker of [shop, altar]) {
          world.scenery.update(saved.sceneryTime + 0.25, game.match);
          const data =
            marker.group.userData.shop ?? marker.group.userData.altar;
          const before =
            marker === shop
              ? {
                  lantern: data.lanterns[0].rotation.z,
                  smoke: data.smoke.material.uniforms.uTime.value,
                }
              : {
                  rotation: data.crystal.rotation.y,
                  height: data.crystal.position.y,
                };
          borrow(marker.group);
          marker.group.updateMatrixWorld(true);
          frame(new T.Box3().setFromObject(marker.group));
          const poseA = render(`${marker.p.type}:A`);
          world.scenery.update(saved.sceneryTime + 1.35, game.match);
          const after =
            marker === shop
              ? {
                  lantern: data.lanterns[0].rotation.z,
                  smoke: data.smoke.material.uniforms.uTime.value,
                }
              : {
                  rotation: data.crystal.rotation.y,
                  height: data.crystal.position.y,
                };
          const poseB = render(`${marker.p.type}:B`);
          ensure(
            JSON.stringify(before) !== JSON.stringify(after) &&
              poseA.hash !== poseB.hash,
            `${marker.p.type}: actual animated geometry/uniforms did not change pixels`,
          );
          trace.architecture.push({
            type: marker.p.type,
            countInWorld: marker === shop ? shops.length : altars.length,
            before,
            after,
            roofCorners: data.roofCorners,
            lanterns: data.lanterns?.length,
            smokeInstances: data.smoke?.count,
            bloodChannels: data.channels?.length,
            crystalTransmission: data.crystal?.material.transmission,
            geometryTriangles: triangles(marker.group),
            poseA,
            poseB,
          });
          restoreBorrowed(marker.group);
        }
        trace.gpu.finalError = gl.getError();
        ensure(
          trace.gpu.finalError === gl.NO_ERROR,
          `final GL error ${trace.gpu.finalError}`,
        );
        trace.gpu.programCountAfter = renderer.info.programs?.length ?? 0;
        trace.gpu.failedPrograms = (renderer.info.programs ?? [])
          .filter(
            (program) =>
              program.diagnostics && program.diagnostics.runnable === false,
          )
          .map((program) => program.name ?? program.id);
        ensure(
          trace.gpu.failedPrograms.length === 0,
          "one or more shader programs failed compilation",
        );
        return trace;
      } finally {
        put(null);
        for (const group of [...borrowed.keys()]) restoreBorrowed(group);
        for (const effect of activeEffects)
          elements.disposeElementalEffect(effect);
        for (const root of ringRoots) rings.disposeSoulRingVisuals(root);
        for (const root of creatureRoots) {
          root.traverse((o) => {
            if (o.isInstancedMesh) o.dispose();
          });
          root.clear();
        }
        world.scenery.update(saved.sceneryTime, game.match);
        renderer.setRenderTarget(saved.target);
        renderer.setViewport(saved.viewport);
        renderer.setScissor(saved.scissor);
        renderer.setScissorTest(saved.scissorTest);
        renderer.setClearColor(saved.clearColor, saved.clearAlpha);
        renderer.autoClear = saved.autoClear;
        renderer.shadowMap.enabled = saved.shadow;
        renderer.info.autoReset = saved.autoReset;
        renderer.debug.checkShaderErrors = saved.shaderCheck;
        target.dispose();
        scene.clear();
      }
    });
    assert.deepEqual(errors, [], "art fixtures emitted browser errors");
    assert.deepEqual(shaderErrors, [], "art fixtures emitted shader errors");
    assert.equal(traces.creatures.length, 7);
    assert.equal(traces.elemental.length, 12);
    assert.equal(traces.ringTiers.length, 2);
    assert.equal(traces.architecture.length, 2);
    return {
      checks: {
        creaturePBRAndArticulationLive: true,
        allTwelveElementVFXAndRingTiers: true,
        shopAndAltarDetailedLiveMeshes: true,
      },
      traces: { ...traces, browserErrors: errors, shaderErrors },
    };
  } finally {
    page.off("pageerror", onError);
    page.off("console", onConsole);
  }
}
