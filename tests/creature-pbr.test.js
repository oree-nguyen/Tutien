import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { getCreaturePBR, creaturePBRCacheInfo } from "../src/creature-pbr.js";
import {
  buildCreatureVisual,
  animateCreatureVisual,
} from "../src/creature-art.js";

const species = [
  "wolf",
  "rhino",
  "firebird",
  "icebutterfly",
  "ape",
  "kirin",
  "dragon",
];
const creature = (name) => ({
  id: 123,
  species: name,
  kind: ["ape", "kirin", "dragon"].includes(name) ? "boss" : "beast",
  boss: { key: name },
  tier: 1,
  x: 0,
  z: 0,
  hp: 850,
  atk: 44,
});

function channelRange(texture, channel = 0) {
  const pixels = texture.image.data;
  let minimum = 255,
    maximum = 0;
  for (let i = channel; i < pixels.length; i += 4) {
    minimum = Math.min(minimum, pixels[i]);
    maximum = Math.max(maximum, pixels[i]);
  }
  return [minimum, maximum];
}

test("Creature PBR has actual albedo, normal and roughness detail at each texture LOD", () => {
  const signatures = new Set();
  for (const profile of species) {
    for (const [detail, size] of [
      ["low", 32],
      ["medium", 128],
      ["high", 512],
    ]) {
      const maps = getCreaturePBR(profile, detail);
      for (const key of ["map", "normalMap", "roughnessMap"]) {
        const texture = maps[key];
        assert.equal(texture.image.width, size);
        assert.equal(texture.image.height, size);
        assert.equal(texture.userData.sharedArt, true);
        assert.equal(texture.wrapS, T.RepeatWrapping);
        assert.equal(texture.generateMipmaps, true);
        assert.equal(
          texture.colorSpace,
          key === "map" ? T.SRGBColorSpace : T.NoColorSpace,
        );
        const [low, high] = channelRange(texture);
        assert.ok(
          high > low + 2,
          `${profile}:${detail}:${key} spatial range ${low}–${high}`,
        );
      }
      if (detail === "medium")
        signatures.add(Buffer.from(maps.map.image.data).toString("base64"));
      if (maps.emissiveMap) {
        const [low, high] = channelRange(maps.emissiveMap);
        assert.ok(high > low + 2);
        assert.equal(maps.emissiveMap.colorSpace, T.SRGBColorSpace);
      }
    }
  }
  assert.equal(
    signatures.size,
    species.length,
    "each species has a distinct painted surface",
  );
});

test("PBR texture allocation is bounded across tint changes and unknown profiles", () => {
  for (const profile of ["hide", "gold", ...species])
    for (const detail of ["low", "medium", "high"])
      getCreaturePBR(profile, detail);
  const before = creaturePBRCacheInfo();
  for (let i = 0; i < 400; i++)
    assert.equal(
      getCreaturePBR("wolf", "high", i),
      getCreaturePBR("wolf", "high", 0xffffff),
    );
  for (let i = 0; i < 200; i++)
    assert.equal(
      getCreaturePBR(`untrusted-${i}`, "untrusted"),
      getCreaturePBR("hide", "medium"),
    );
  const after = creaturePBRCacheInfo();
  assert.equal(after.entryCount, before.entryCount);
  assert.ok(after.entryCount <= 27);
  assert.ok(after.estimatedGPUMipBytes < 54 * 1024 * 1024);
});

test("Quadrupeds articulate four thighs, shins and ankles while simulation stats remain unchanged", () => {
  for (const name of ["wolf", "rhino"]) {
    const actor = creature(name),
      root = buildCreatureVisual(actor, "medium");
    const hips = [],
      knees = [],
      ankles = [];
    root.traverse((o) => {
      if (o.name.startsWith("creatureLeg:")) hips.push(o);
      if (o.name.startsWith("creatureKnee:")) knees.push(o);
      if (o.name.startsWith("creatureAnkle:")) ankles.push(o);
    });
    assert.equal(hips.length, 4);
    assert.equal(knees.length, 4);
    assert.equal(ankles.length, 4);
    for (const knee of knees) assert.ok(hips.includes(knee.parent));
    for (const ankle of ankles) assert.ok(knees.includes(ankle.parent));
    animateCreatureVisual(root, actor, 0.1, 1 / 60);
    assert.ok(
      knees.every((knee) => knee.rotation.x === 0),
      "idle pose keeps shins at rest",
    );
    actor.x = 0.5;
    const before = structuredClone(actor);
    animateCreatureVisual(root, actor, 0.2, 1 / 60);
    assert.ok(hips.some((hip) => Math.abs(hip.rotation.x) > 0.1));
    assert.ok(knees.some((knee) => Math.abs(knee.rotation.x) > 0.1));
    assert.ok(ankles.some((ankle) => Math.abs(ankle.rotation.x) > 0.1));
    assert.deepEqual(actor, before);
  }
});

test("Firebird retains twelve layered physical feathers per wing, a golden crest and three flame tails", () => {
  for (const detail of ["low", "medium", "high"]) {
    const root = buildCreatureVisual(creature("firebird"), detail),
      parts = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry.userData.creatureParts) return;
      for (const part of o.geometry.userData.creatureParts) {
        assert.ok(part.triangleCount > 0);
        assert.ok(
          (part.triangleStart + part.triangleCount) * 3 <=
            o.geometry.index.count,
        );
        const firstIndex = o.geometry.index.getX(part.triangleStart * 3);
        assert.ok(
          Number.isFinite(o.geometry.attributes.position.getX(firstIndex)),
        );
        parts.push(part);
      }
    });
    for (const side of [-1, 1]) {
      const feathers = parts.filter(
        (part) => part.kind === "flightFeather" && part.side === side,
      );
      assert.equal(feathers.length, 12);
      assert.ok(feathers.some((part) => part.layer === "primary"));
      assert.ok(feathers.some((part) => part.layer === "covert"));
    }
    assert.equal(parts.filter((part) => part.kind === "goldenCrest").length, 5);
    assert.equal(
      parts.filter((part) => part.kind === "fireTailPlume").length,
      3,
    );
  }
});

test("Firebird embers survive mesh batching and animate independent instance buffers", () => {
  const actor = creature("firebird"),
    before = structuredClone(actor);
  const first = buildCreatureVisual(actor, "medium"),
    second = buildCreatureVisual(actor, "medium");
  const embers = first.getObjectByName("creatureEmbers"),
    twin = second.getObjectByName("creatureEmbers");
  assert.ok(embers.isInstancedMesh && embers.count >= 6);
  assert.equal(embers.geometry, twin.geometry);
  assert.notEqual(embers.instanceMatrix, twin.instanceMatrix);
  const initial = Array.from(embers.instanceMatrix.array),
    unchanged = Array.from(twin.instanceMatrix.array);
  animateCreatureVisual(first, actor, 1.3, 1 / 60);
  assert.notDeepEqual(Array.from(embers.instanceMatrix.array), initial);
  assert.deepEqual(Array.from(twin.instanceMatrix.array), unchanged);
  assert.ok(Array.from(embers.instanceMatrix.array).every(Number.isFinite));
  assert.equal(embers.material.depthWrite, false);
  assert.deepEqual(actor, before);
});

test("Ice wings carry translucent crystal patterns, gold veins and smooth hinged membranes", () => {
  const root = buildCreatureVisual(creature("icebutterfly"), "high");
  for (const side of [-1, 1]) {
    const wing = root.getObjectByName(`creatureWing:${side}`);
    const membrane = wing.children.find(
      (o) => o.isMesh && o.material.transmission > 0,
    );
    assert.ok(membrane);
    assert.ok(
      membrane.geometry.attributes.position.count > 100,
      "curved outline retains smooth edge vertices",
    );
    assert.ok(
      membrane.material.map &&
        membrane.material.normalMap &&
        membrane.material.alphaMap,
    );
    assert.equal(membrane.material.transparent, true);
    assert.equal(membrane.material.side, T.DoubleSide);
    const [low, high] = channelRange(membrane.material.alphaMap);
    assert.ok(low >= 150 && high <= 250 && high > low);
    assert.ok(
      wing.children.some(
        (o) =>
          o.isMesh &&
          o.material.emissiveIntensity > 1 &&
          o.material.color.r > o.material.color.g,
      ),
    );
  }
});

test("Every creature and source Boss has textured body surfaces through all LODs", () => {
  for (const name of species)
    for (const detail of ["low", "medium", "high"]) {
      const root = buildCreatureVisual(creature(name), detail),
        painted = [];
      root.traverse((o) => {
        if (
          o.isMesh &&
          o.material.map &&
          o.material.normalMap &&
          o.material.roughnessMap
        )
          painted.push(o);
      });
      assert.ok(painted.length >= 1, `${name}:${detail} has textured surface`);
      assert.ok(painted.every((o) => o.material.map.userData.profile === name));
    }
});
