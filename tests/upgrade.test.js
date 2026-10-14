import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile, loot } from "../src/rules.js";
import {
  visualTemplate,
  triangleCount,
  artCacheStats,
  terrainHeight,
} from "../src/art.js";
import { quickOffers, contextualActions } from "../src/hud.js";
import { Ray, Vector3 } from "three";
import { projectGround, groundHeight } from "../src/art.js";
import { World } from "../src/world.js";
const load = {
  hero: 0,
  branch: 0,
  rings: [0, 0],
  bones: [],
  supports: [],
  brought: 100,
  skin: 0,
  mode: "solo",
};
const scene = () => {
  const m = new Match(load, newProfile());
  m.actors = [m.player];
  m.player.x = m.player.z = 0;
  m.player.immuneUntil = 0;
  m.obstacles = [];
  m.bushes = [];
  return m;
};
for (let hero = 0; hero < 12; hero++)
  test(`Markdown H${hero + 1}: detailed/smooth PBR and bounded distant LOD`, () => {
    const a = { kind: "hero", hero },
      high = visualTemplate(a, "high"),
      medium = visualTemplate(a, "medium"),
      low = visualTemplate(a, "low");
    assert.ok(triangleCount(high) >= 50000);
    assert.ok(triangleCount(medium) <= 12000);
    assert.ok(triangleCount(low) <= 2500);
    let map = false;
    high.traverse((o) => {
      if (o.isMesh) {
        assert.ok(o.material.isMeshPhysicalMaterial);
        assert.equal(o.material.flatShading, false);
        assert.ok(o.geometry.attributes.normal);
        if (o.material.normalMap) {
          assert.equal(o.material.normalMap.image.width, 1024);
          map = true;
        }
      }
    });
    assert.ok(map);
    const before = artCacheStats().templates;
    visualTemplate(a, "high");
    assert.equal(artCacheStats().templates, before);
  });
for (const key of ["ape", "kirin", "dragon"])
  test(`Markdown ${key}: high detail creature and LODs`, () => {
    assert.ok(
      triangleCount(visualTemplate({ kind: "boss", boss: { key } }, "high")) >=
        50000,
    );
    assert.ok(
      triangleCount(visualTemplate({ kind: "boss", boss: { key } }, "low")) <
        2500,
    );
  });
test("Squad4 has exactly25 teams of4,100 participants", () => {
  const m = new Match({ ...load, mode: "squad4" }, newProfile());
  const heroes = m.actors.filter((a) => a.kind === "hero");
  const teams = new Map();
  heroes.forEach((a) => teams.set(a.team, (teams.get(a.team) ?? 0) + 1));
  assert.equal(heroes.length, 100);
  assert.equal(teams.size, 25);
  assert.ok([...teams.values()].every((n) => n === 4));
});
test("target preferences select visible in-range enemies by class and HP ratio", () => {
  const m = scene(),
    a = m.player;
  a.rings = [];
  const beast = m.spawnBeast(0, 1, 0),
    h1 = m.createHero(1, 99, 2, 0),
    h2 = m.createHero(2, 98, 3, 0);
  for (const t of [h1, h2]) {
    t.x = t === h1 ? 2 : 3;
    t.z = 0;
    t.immuneUntil = 0;
  }
  h1.hp = 100;
  h2.hp = 50;
  a.targetMode = "beast";
  assert.equal(m.attackTarget(a, 6), beast);
  a.targetMode = "hero-low";
  assert.equal(m.attackTarget(a, 6), h2);
  h2.realm = 1;
  assert.equal(m.attackTarget(a, 6), h1);
  h1.stealthUntil = 10;
  h1.x = 5;
  assert.equal(m.attackTarget(a, 6), null);
});
test("quick craft is recommended before buying and respects coins/location/slots", () => {
  const m = scene(),
    a = m.player;
  m.shopPoints = [{ x: 0, z: 0 }];
  m.merchants = [];
  a.items = [1, 2];
  a.wallet.earned = 1000;
  const offers = quickOffers(m);
  assert.equal(offers.length, 2);
  assert.equal(offers[0].action, "craft");
  assert.equal(offers[0].id, 4);
  m.shopPoints = [];
  assert.ok(quickOffers(m).every((o) => o.disabled));
});
test("context actions enforce realm, priority lock, altar compatibility and SUP017", () => {
  const m = scene(),
    a = m.player;
  m.gates = [{ x: 0, z: 0, end: 120 }];
  m.shrines = [{ x: 0, z: 0 }];
  a.supports = [{ id: 17, tier: 1, used: 0 }];
  a.bag = [loot("ring", 1)];
  m.drops = [
    { x: 0, z: 0, realm: 1, unlock: 0 },
    { x: 0, z: 0, realm: 0, team: 9, unlock: 20 },
  ];
  let c = contextualActions(m);
  assert.equal(c.loot, undefined);
  assert.ok(c.canSend);
  assert.equal(c.ring.id, 1);
  m.drops[1].team = a.team;
  assert.equal(contextualActions(m).loot, m.drops[1]);
  a.supports[0].used = 1;
  assert.equal(contextualActions(m).canSend, false);
});
test("terrain height remains flat at the arena and finite throughout the map", () => {
  assert.equal(terrainHeight(0, 0), 0);
  for (let x = -94; x <= 94; x += 4)
    for (let z = -94; z <= 94; z += 4)
      assert.ok(Number.isFinite(terrainHeight(x, z)));
});
test("mouse aim ray intersects terrain and the raised arena instead of the zero plane", () => {
  for (const [x, z] of [
    [0, 0],
    [-52, -44],
    [-62, -20],
    [53, 46],
  ]) {
    const ray = new Ray(new Vector3(x, 30, z), new Vector3(0, -1, 0)),
      point = projectGround(ray);
    assert.ok(Math.abs(point.y - groundHeight(x, z)) < 0.00001);
    assert.equal(point.x, x);
    assert.equal(point.z, z);
  }
  assert.equal(
    projectGround(new Ray(new Vector3(), new Vector3(1, 0, 0))),
    null,
  );
});
test("particle effects spawn above elevated terrain rather than inside the mountain", () => {
  const fake = { particles: [] };
  World.prototype.spawnParticles.call(fake, {
    x: -52,
    z: -44,
    color: 0xffffff,
  });
  assert.equal(fake.particles.length, 12);
  for (const p of fake.particles)
    assert.equal(p.y, groundHeight(p.x, p.z) + 0.4);
});
test("Ly Sa clones preserve hero, costume and skin for the visual pipeline", () => {
  const m = new Match({ ...load, hero: 2, skin: 2, costume: 1 }, newProfile());
  m.actors = [m.player];
  m.cast(m.player, 1);
  const clone = m.actors.find((a) => a.kind === "clone");
  assert.equal(clone.hero, 2);
  assert.equal(clone.skin, 2);
  assert.equal(clone.costume, 1);
  const visual = visualTemplate(clone, "medium");
  assert.ok(visual.getObjectByName("elbowRight"));
  assert.equal(visual.userData.artHero, 2);
});
