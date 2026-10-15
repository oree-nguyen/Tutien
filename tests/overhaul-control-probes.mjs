/** Runs inside an already-open game page; never launches a browser or casts on
 * the live match. Real World.aim guides are drawn by its renderer into a private
 * target, on an isolated camera layer, while pure Match fixtures supply actors. */
export async function probeOverhaulControls(page) {
  return page.evaluate(async () => {
    const [
      T,
      { Match },
      { newProfile, skillFor },
      projection,
      { groundHeight },
      indicators,
    ] = await Promise.all([
      import("/node_modules/three/build/three.module.js"),
      import("/src/simulation.js"),
      import("/src/rules.js"),
      import("/src/skill-projection.js"),
      import("/src/art.js"),
      import("/src/skill-indicators.js"),
    ]);
    const game = window.__HON_GIOI__,
      world = game?.world,
      renderer = world?.renderer;
    const ensure = (condition, message) => {
      if (!condition) throw Error(`Skill-indicator GPU probe: ${message}`);
    };
    ensure(
      world?.scene?.isScene && renderer?.isWebGLRenderer,
      "actual World renderer/scene unavailable",
    );
    const context = renderer.getContext(),
      oldContext = world.aimContext,
      oldTargetVisible = world.targetRing.visible,
      oldTarget = renderer.getRenderTarget(),
      oldCubeFace = renderer.getActiveCubeFace(),
      oldMipmapLevel = renderer.getActiveMipmapLevel(),
      oldViewport = renderer.getViewport(new T.Vector4()),
      oldScissor = renderer.getScissor(new T.Vector4()),
      oldScissorTest = renderer.getScissorTest(),
      oldAutoClear = renderer.autoClear,
      oldClearColor = renderer.getClearColor(new T.Color()).clone(),
      oldClearAlpha = renderer.getClearAlpha(),
      target = new T.WebGLRenderTarget(192, 192),
      cases = [],
      liveState = () =>
        JSON.stringify({
          time: game.match?.time,
          player: game.match?.player && {
            x: game.match.player.x,
            z: game.match.player.z,
            hp: game.match.player.hp,
            mp: game.match.player.mp,
            cooldowns: game.match.player.cooldowns,
            wallet: game.match.player.wallet,
          },
          zones: game.match?.zones.length,
          projectiles: game.match?.projectiles.length,
        }),
      liveBefore = liveState();
    const loadout = {
      hero: 0,
      branch: 0,
      rings: [0, 0],
      bones: [],
      supports: [],
      brought: 0,
      skin: 0,
      costume: 0,
      mode: "solo",
      ranked: false,
    };
    function fixture(hero) {
      const match = new Match({ ...loadout, hero }, newProfile()),
        actor = match.player;
      match.actors = [actor];
      match.obstacles = [];
      match.bushes = [];
      match.time = 10;
      Object.assign(actor, {
        x: -46,
        z: -42,
        realm: 0,
        ai: false,
        dir: { x: 0, z: 1 },
        immuneUntil: 0,
      });
      const add = (team, x, z, extra = {}) => {
        const candidate = match.createHero(1, team, x, z, loadout);
        Object.assign(candidate, { x, z, ai: false, immuneUntil: 0, ...extra });
        return candidate;
      };
      const enemy = add(1, actor.x + 0.15, actor.z + 2.1),
        offAxis = add(1, actor.x + 1.7, actor.z + 2.8),
        ally = add(0, actor.x + 0.2, actor.z + 2, { hp: 100 }),
        foreign = add(1, actor.x, actor.z + 2, { realm: 1 }),
        hidden = add(1, actor.x, actor.z + 4, { stealthUntil: 999 }),
        departed = add(1, actor.x, actor.z + 2, { extracted: true });
      return { match, actor, enemy, offAxis, ally, foreign, hidden, departed };
    }
    const sameIds = (left, right) =>
      JSON.stringify([...left].sort((a, b) => a - b)) ===
      JSON.stringify([...right].sort((a, b) => a - b));
    const changedPixels = (a, b) => {
      let count = 0;
      for (let i = 0; i < a.length; i += 4)
        if (
          Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]) >
          12
        )
          count++;
      return count;
    };
    function render(camera) {
      renderer.setRenderTarget(target);
      renderer.setViewport(0, 0, 192, 192);
      renderer.setScissorTest(false);
      renderer.autoClear = true;
      renderer.render(world.scene, camera);
      const pixels = new Uint8Array(192 * 192 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 192, 192, pixels);
      const glError = context.getError();
      ensure(
        glError === context.NO_ERROR,
        `offscreen draw GL error ${glError}`,
      );
      return { pixels, calls: renderer.info.render.calls, glError };
    }
    function groundError(painter) {
      painter.group.updateMatrixWorld(true);
      let vertices = 0,
        maximum = 0;
      const point = new T.Vector3();
      for (const mesh of painter.groundMeshes) {
        if (!mesh.visible) continue;
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
          maximum = Math.max(
            maximum,
            Math.abs(point.y - (groundHeight(point.x, point.z) + 0.06)),
          );
          vertices++;
        }
      }
      return { vertices, maximum };
    }
    function radialBounds(mesh) {
      const base = mesh.geometry.userData.groundBase;
      let minimum = Infinity,
        maximum = 0;
      for (let i = 0; i < base.length; i += 3) {
        const radius = Math.hypot(base[i], base[i + 2]);
        minimum = Math.min(minimum, radius);
        maximum = Math.max(maximum, radius);
      }
      return { minimum, maximum };
    }
    try {
      ensure(
        context.getError() === context.NO_ERROR,
        "preexisting WebGL error",
      );
      world.clearAim();
      for (const definition of [
        { label: "H01-Q-line", hero: 0, slot: 0, kind: "line" },
        { label: "H01-W-circle", hero: 0, slot: 1, kind: "aoe" },
        { label: "H01-E-zone", hero: 0, slot: 2, kind: "aoe" },
        { label: "H02-Q-cone", hero: 1, slot: 0, kind: "cone" },
        {
          label: "H03-R-target",
          hero: 2,
          slot: 3,
          kind: "lock",
          selected: "enemy",
        },
        { label: "H03-W-self", hero: 2, slot: 1, kind: "lock", self: true },
        {
          label: "H05-W-shield",
          hero: 4,
          slot: 1,
          kind: "lock",
          selected: "ally",
        },
      ]) {
        const f = fixture(definition.hero),
          { match, actor } = f,
          skill = skillFor(actor, definition.slot),
          aim = { x: 0, z: 1, distance: definition.self ? 0 : 2.4 };
        if (definition.selected) aim.targetId = f[definition.selected].id;
        const before = JSON.stringify({
          mp: actor.mp,
          cooldowns: actor.cooldowns,
          wallet: actor.wallet,
        });
        world.aim(actor, skill, aim, false, match);
        const painter = world.guidePainter,
          group = world.aimGuide,
          p = projection.projectSkillCast(match, actor, skill, aim),
          expectedIds = projection
            .previewSkillHits(match, actor, skill, p)
            .map((a) => a.id),
          actualIds = group.userData.hitActorIds,
          ring = group.getObjectByName("cast-range-ring");
        ensure(
          painter instanceof indicators.SkillIndicatorRenderer,
          `${definition.label} must use actual SkillIndicatorRenderer`,
        );
        ensure(
          group.parent === world.scene &&
            world.scene.getObjectById(group.id) === group,
          `${definition.label} must attach to the real World scene`,
        );
        ensure(
          group.userData.indicatorKind === definition.kind,
          `${definition.label} indicator kind mismatch`,
        );
        ensure(
          sameIds(actualIds, expectedIds),
          `${definition.label} hit-preview IDs differ from shared hitbox math`,
        );
        for (const excluded of [f.foreign, f.hidden, f.departed])
          ensure(
            !actualIds.includes(excluded.id),
            `${definition.label} leaked an ineligible actor`,
          );
        if (!definition.self)
          ensure(
            actualIds.includes(
              (definition.selected === "ally" ? f.ally : f.enemy).id,
            ),
            `${definition.label} must have a genuine predicted hit`,
          );
        else
          ensure(
            actualIds.length === 0,
            "self-only ability cannot show an enemy hit",
          );
        ensure(
          painter.hitRings.filter((entry) => entry.visible).length ===
            expectedIds.length,
          `${definition.label} visible hit rings differ from IDs`,
        );
        const range = radialBounds(ring),
          expectedRange = Math.max(0.1, skill.range),
          grounded = groundError(painter);
        ensure(
          Math.abs(range.minimum - Math.max(0, expectedRange - 0.035)) <
            0.00001 &&
            Math.abs(range.maximum - (expectedRange + 0.035)) < 0.00001,
          `${definition.label} cast-range geometry must use original range`,
        );
        ensure(
          grounded.vertices > 0 && grounded.maximum < 0.00002,
          `${definition.label} ground vertices must be terrain +0.06m`,
        );
        const geometryChecks = {};
        if (definition.kind === "line") {
          const arrow = group.getObjectByName("linear-scrolling-chevrons"),
            base = arrow.geometry.userData.groundBase,
            width = skill.hitboxWidth ?? 1.8;
          let maximumZ = 0,
            maximumX = 0;
          for (let i = 0; i < base.length; i += 3) {
            maximumX = Math.max(maximumX, Math.abs(base[i]));
            maximumZ = Math.max(maximumZ, base[i + 2]);
          }
          ensure(
            Math.abs(maximumZ - skill.range) < 0.00001 &&
              Math.abs(maximumX * 2 - width) < 0.00001,
            "line geometry must use the actual range/hitbox width",
          );
          ensure(
            !actualIds.includes(f.offAxis.id),
            "line must exclude actor outside its real width",
          );
          geometryChecks.line = { width, maximumX, maximumZ };
        } else if (definition.kind === "cone") {
          const fan = group.getObjectByName("cone-sector"),
            arc = group.getObjectByName("cone-bright-arc"),
            base = fan.geometry.userData.groundBase,
            expectedAngle = skill.coneAngle ?? 120;
          let maximumAngle = 0,
            maximumRadius = 0;
          for (let i = 3; i < base.length; i += 3) {
            maximumAngle = Math.max(
              maximumAngle,
              Math.abs((Math.atan2(base[i], base[i + 2]) * 180) / Math.PI),
            );
            maximumRadius = Math.max(
              maximumRadius,
              Math.hypot(base[i], base[i + 2]),
            );
          }
          ensure(
            !!arc &&
              fan.geometry.index.count > 0 &&
              Math.abs(maximumAngle * 2 - expectedAngle) < 0.0001 &&
              Math.abs(maximumRadius - skill.range) < 0.00001,
            "cone fan and bright arc must use original angle/range",
          );
          geometryChecks.cone = {
            maximumAngle,
            maximumRadius,
            vertices: fan.geometry.attributes.position.count,
          };
        } else {
          const center = group
              .getObjectByName("area-center")
              .getWorldPosition(new T.Vector3()),
            expectedCenter = definition.self
              ? actor
              : definition.kind === "lock"
                ? p.target
                : p.point;
          ensure(
            Math.hypot(
              center.x - expectedCenter.x,
              center.z - expectedCenter.z,
            ) < 0.00001,
            `${definition.label} center does not match actual projected/locked actor`,
          );
          ensure(
            Math.abs(center.y - groundHeight(center.x, center.z) - 0.06) <
              0.00001,
            `${definition.label} center height mismatch`,
          );
          const radius = radialBounds(group.getObjectByName("area-target")),
            expectedRadius =
              definition.kind === "aoe" ? skill.radius || 1 : 0.65;
          ensure(
            Math.abs(radius.minimum - (expectedRadius - 0.055)) < 0.00001 &&
              Math.abs(radius.maximum - (expectedRadius + 0.055)) < 0.00001,
            `${definition.label} target radius differs from skill radius`,
          );
          ensure(
            painter.link.visible ===
              (definition.kind === "aoe" || !definition.self),
            `${definition.label} arc/tether visibility mismatch`,
          );
          geometryChecks.target = {
            center: center.toArray(),
            radius,
            self: !!definition.self,
            linkName: painter.link.name,
            linkVisible: painter.link.visible,
          };
        }
        // Only this real guide is visible to the offscreen camera. Existing World
        // content, the on-screen camera and the live match remain untouched.
        group.traverse((node) => node.layers.set(31));
        const extent = Math.max(8, skill.range + (skill.radius || 0) + 1),
          camera = new T.OrthographicCamera(
            -extent,
            extent,
            extent,
            -extent,
            0.1,
            100,
          );
        camera.layers.set(31);
        camera.position.set(
          actor.x + 1,
          groundHeight(actor.x, actor.z) + 30,
          actor.z + 5,
        );
        camera.lookAt(actor.x, groundHeight(actor.x, actor.z), actor.z);
        camera.updateMatrixWorld(true);
        group.visible = false;
        const baseline = render(camera);
        group.visible = true;
        const normal = render(camera),
          drawnPixels = changedPixels(baseline.pixels, normal.pixels);
        ensure(
          normal.calls > baseline.calls && drawnPixels > 5,
          `${definition.label} must draw actual non-background pixels on the GPU`,
        );
        world.aim(actor, skill, aim, true, match);
        ensure(
          group.userData.canceled === true,
          `${definition.label} cancel state missing`,
        );
        let redMaterials = 0;
        group.traverse((node) => {
          for (const material of Array.isArray(node.material)
            ? node.material
            : node.material
              ? [node.material]
              : []) {
            const color = material.uniforms?.uColor?.value ?? material.color;
            if (!color) continue;
            ensure(
              color.getHex() === 0xef4444,
              `${definition.label} canceled guide must become red`,
            );
            redMaterials++;
          }
        });
        ensure(
          redMaterials > 0,
          `${definition.label} cancel has no rendered materials`,
        );
        const canceled = render(camera),
          redPixels = changedPixels(normal.pixels, canceled.pixels);
        ensure(
          redPixels > 5,
          `${definition.label} red cancel must change real GPU pixels`,
        );
        ensure(
          before ===
            JSON.stringify({
              mp: actor.mp,
              cooldowns: actor.cooldowns,
              wallet: actor.wallet,
            }),
          `${definition.label} visual probe altered fixture resources`,
        );
        cases.push({
          label: definition.label,
          hero: definition.hero,
          slot: definition.slot,
          shape: skill.shape,
          kind: definition.kind,
          originalStats: {
            range: skill.range,
            radius: skill.radius,
            hitboxWidth: skill.hitboxWidth ?? 1.8,
            coneAngle: skill.coneAngle ?? 120,
          },
          realWorldScene: true,
          realIndicatorRenderer: true,
          actualIds,
          expectedIds,
          visibleHitRings: expectedIds.length,
          range,
          grounded,
          geometryChecks,
          redMaterials,
          offscreen: {
            width: 192,
            height: 192,
            drawnPixels,
            redPixels,
            drawCalls: normal.calls,
            glError: canceled.glError,
          },
        });
        world.clearAim();
      }
      ensure(
        new Set(cases.map((entry) => entry.kind)).size === 4,
        "all four geometry kinds must be exercised",
      );
      ensure(liveState() === liveBefore, "probe altered the live match");
      return {
        checks: { fourDecalKindsAndHitPreview: true },
        traces: {
          skillIndicatorGPU: {
            scope:
              "Real World.aim and SkillIndicatorRenderer on the actual scene; isolated-layer offscreen WebGL draws. Independent Match fixtures only, no live casts or device/FPS claim.",
            allFourKinds: true,
            targetAndSelfAndFriendly: true,
            liveCombatUnchanged: true,
            cases,
          },
        },
      };
    } finally {
      world.clearAim();
      if (oldContext)
        world.aim(
          oldContext.actor,
          oldContext.skill,
          oldContext.dir,
          oldContext.canceled,
          oldContext.match,
        );
      world.targetRing.visible = oldTargetVisible;
      renderer.setRenderTarget(oldTarget, oldCubeFace, oldMipmapLevel);
      renderer.setViewport(oldViewport);
      renderer.setScissor(oldScissor);
      renderer.setScissorTest(oldScissorTest);
      renderer.autoClear = oldAutoClear;
      renderer.setClearColor(oldClearColor, oldClearAlpha);
      target.dispose();
    }
  });
}
