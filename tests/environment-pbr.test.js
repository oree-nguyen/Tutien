import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import {
  BIOME_SURFACES,
  ENVIRONMENT_PBR_SIZE,
  ENVIRONMENT_PBR_REPEAT,
  generateBiomeTextureSet,
  assignTerrainBiomeGroups,
  BiomePBRManager,
  architecturalMaps,
  marbleCloudMaps,
  configureEnvironmentAnisotropy,
} from "../src/environment-pbr.js";
import { biomeAt, sceneryTerrainHeight } from "../src/scenery.js";
import { groundHeight, terrainHeight } from "../src/art.js";

function range(texture, channel = 0) {
  let min = 255,
    max = 0;
  const data = texture.image.data;
  for (let i = channel; i < data.length; i += 4) {
    min = Math.min(min, data[i]);
    max = Math.max(max, data[i]);
  }
  return { min, max };
}
const renderer = (anisotropy) => ({
  capabilities: { getMaxAnisotropy: () => anisotropy },
});
const hash = (data) => createHash("sha256").update(data).digest("hex");

test("a production biome generates four actual 2048 maps with height/roughness packing", () => {
  const set = generateBiomeTextureSet(4, { anisotropy: 16 });
  try {
    assert.equal(ENVIRONMENT_PBR_SIZE, 2048);
    assert.equal(ENVIRONMENT_PBR_REPEAT, 24);
    assert.equal(set.bytes, 4 * 2048 * 2048 * 4);
    for (const key of ["albedo", "normal", "roughnessHeight", "emissive"]) {
      const texture = set[key];
      assert.equal(texture.image.width, 2048);
      assert.equal(texture.image.height, 2048);
      assert.equal(texture.image.data.length, 2048 * 2048 * 4);
      assert.equal(texture.repeat.x, 24);
      assert.equal(texture.repeat.y, 24);
      assert.equal(texture.wrapS, THREE.RepeatWrapping);
      assert.equal(texture.wrapT, THREE.RepeatWrapping);
      assert.equal(texture.anisotropy, 16);
      assert.equal(texture.generateMipmaps, true);
      assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
      assert.equal(
        texture.colorSpace,
        ["albedo", "emissive"].includes(key)
          ? THREE.SRGBColorSpace
          : THREE.NoColorSpace,
      );
    }
    assert.ok(range(set.albedo).max - range(set.albedo).min > 15);
    assert.ok(range(set.normal).max - range(set.normal).min > 15);
    assert.ok(
      range(set.roughnessHeight).max - range(set.roughnessHeight).min > 30,
    );
    assert.equal(
      range(set.emissive).max,
      255,
      "lava cracks contain actual bright emissive pixels",
    );
    let disposalEvents = 0;
    for (const key of ["albedo", "normal", "roughnessHeight", "emissive"])
      set[key].addEventListener("dispose", () => disposalEvents++);
    set.dispose();
    set.dispose();
    assert.equal(
      disposalEvents,
      4,
      "shared packed roughness/height is disposed only once",
    );
  } finally {
    set.dispose();
  }
});

test("the seven biome textures have distinct spatial data and tangent-space normals", () => {
  const albedos = new Set(),
    reliefs = new Set();
  for (let biome = 0; biome < BIOME_SURFACES.length; biome++) {
    const set = generateBiomeTextureSet(biome, { size: 64 });
    try {
      albedos.add(hash(set.albedo.image.data));
      reliefs.add(hash(set.normal.image.data));
      assert.ok(
        range(set.roughnessHeight).max > range(set.roughnessHeight).min,
      );
      assert.ok(range(set.normal).max > range(set.normal).min);
      for (let i = 0; i < set.normal.image.data.length; i += 128) {
        const normal = Array.from(
          set.normal.image.data.slice(i, i + 3),
          (v) => (v / 255) * 2 - 1,
        );
        assert.ok(Math.abs(Math.hypot(...normal) - 1) < 0.02);
        assert.ok(normal[2] > 0);
      }
      if ([4, 5, 6].includes(biome)) assert.ok(range(set.emissive).max > 0);
    } finally {
      set.dispose();
    }
  }
  assert.equal(albedos.size, 7);
  assert.equal(reliefs.size, 7);
  assert.equal(BIOME_SURFACES[2].roughness, 0.2);
  assert.throws(() => generateBiomeTextureSet(7), /Invalid biome/);
  assert.throws(
    () => generateBiomeTextureSet(0, { size: 4096 }),
    /Invalid biome/,
  );
});

test("600m terrain grouping preserves every triangle and authoritative playable ground", () => {
  const geometry = new THREE.PlaneGeometry(600, 600, 256, 256);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setZ(i, sceneryTerrainHeight(p.getX(i), -p.getY(i)));
  const original = p.array.slice(),
    indexBefore = Array.from(geometry.index.array);
  const triangles = (indices) => {
    const result = [];
    for (let i = 0; i < indices.length; i += 3)
      result.push(indices.slice(i, i + 3).join(","));
    return result.sort();
  };
  assignTerrainBiomeGroups(geometry, biomeAt);
  assert.deepEqual(
    p.array,
    original,
    "material grouping must not alter the terrain surface",
  );
  assert.deepEqual(
    triangles(Array.from(geometry.index.array)),
    triangles(indexBefore),
  );
  assert.equal(geometry.groups.length, 7);
  assert.ok(geometry.userData.biomeGroups.every((count) => count > 0));
  let covered = 0;
  for (const group of geometry.groups) {
    assert.equal(group.start, covered);
    covered += group.count;
    const id = geometry.index.getX(group.start);
    assert.ok(Number.isFinite(p.getZ(id)));
    for (let i = group.start; i < group.start + group.count; i += 3) {
      const ids = [0, 1, 2].map((n) => geometry.index.getX(i + n));
      const x = ids.reduce((sum, id) => sum + p.getX(id), 0) / 3;
      const z = -ids.reduce((sum, id) => sum + p.getY(id), 0) / 3;
      assert.equal(biomeAt(x, z), group.materialIndex);
    }
  }
  assert.equal(covered, geometry.index.count);
  for (const [x, z] of [
    [0, 0],
    [-50, -30],
    [52, 45],
    [82, 0],
    [-94, 94],
  ]) {
    // groundHeight includes the central authored plaza; its .83m rule remains untouched.
    assert.ok(
      Math.abs(sceneryTerrainHeight(x, z) - terrainHeight(x, z)) < 1e-12,
    );
    if (Math.hypot(x, z) >= 14)
      assert.equal(groundHeight(x, z), sceneryTerrainHeight(x, z) + 0.08);
  }
  assert.equal(groundHeight(0, 0), 0.83);
  assert.ok(
    sceneryTerrainHeight(240, 240) > groundHeight(240, 240),
    "outskirts are art-only mountains",
  );
  geometry.dispose();
});

test("active physical maps obey the one/two-biome resident budget and release on lobby", () => {
  const splatmap = new THREE.Texture();
  const manager = new BiomePBRManager({
    splatmap,
    renderer: renderer(8),
    textureSize: 32,
  });
  try {
    assert.equal(manager.materials.length, 7);
    assert.equal(manager.stats().residentMaps, 0);
    manager.activate([0, 1, 2]);
    assert.deepEqual(manager.stats().activeBiomes, [0]);
    const old = manager.cache.get(0),
      material = manager.materials[0];
    assert.equal(material.map, splatmap);
    assert.equal(material.normalMap, old.normal);
    assert.equal(material.bumpMap, material.roughnessMap);
    assert.equal(material.roughnessMap, old.roughnessHeight);
    assert.equal(
      material.userData.biomePBR.uniforms.uBiomeAlbedo.value,
      old.albedo,
    );
    const shader = { uniforms: {}, fragmentShader: "#include <map_fragment>" };
    material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uBiomeAlbedo.value, old.albedo);
    assert.match(shader.fragmentShader, /vMapUv \* 24\.0/);
    assert.equal(
      material.roughness,
      1,
      "roughness channel directly drives the physical roughness",
    );
    manager.activate([1]);
    assert.equal(old.disposed, true);
    assert.equal(material.normalMap, null);
    assert.equal(material.userData.biomePBR.active, false);
    manager.setQuality("ultra");
    manager.activate([1, 2, 3]);
    assert.equal(manager.stats().residentBiomes, 2);
    assert.equal(manager.stats().residentMaps, 8);
    assert.equal(manager.stats().bytesWithoutMipmaps, 2 * 32 * 32 * 16);
    const kept = manager.cache.get(1);
    manager.configureRenderer(renderer(16));
    assert.equal(kept.normal.anisotropy, 16);
    manager.setQuality("balanced");
    assert.equal(manager.stats().residentBiomes, 1);
    assert.equal(
      manager.cache.get(1),
      kept,
      "quality reduction retains the current resident biome",
    );
    for (let i = 0; i < 25; i++) {
      manager.update({ x: i, z: i }, () => i % 7, true);
      assert.ok(manager.stats().residentBiomes <= 1);
    }
    manager.update(null, biomeAt, false);
    assert.equal(manager.stats().residentMaps, 0);
    assert.ok(manager.materials.every((m) => !m.normalMap && !m.emissiveMap));
  } finally {
    manager.dispose();
    splatmap.dispose();
  }
});

test("architectural and marble maps are shared, embossed, and use renderer maximum anisotropy", () => {
  const signatures = new Set();
  for (const style of ["roof", "wood", "gilt"]) {
    const maps = architecturalMaps(style);
    assert.equal(maps, architecturalMaps(style));
    assert.equal(maps.albedo.image.width, 512);
    assert.ok(range(maps.normal).max - range(maps.normal).min > 5);
    assert.ok(
      range(maps.roughnessHeight).max - range(maps.roughnessHeight).min > 20,
    );
    signatures.add(hash(maps.albedo.image.data));
  }
  assert.equal(signatures.size, 3);
  const marble = marbleCloudMaps();
  assert.equal(marble, marbleCloudMaps());
  assert.equal(marble.albedo.image.width, 1024);
  assert.ok(
    range(marble.roughnessHeight).max - range(marble.roughnessHeight).min > 30,
  );
  assert.equal(configureEnvironmentAnisotropy(renderer(12)), 12);
  for (const maps of [
    marble,
    architecturalMaps("roof"),
    architecturalMaps("wood"),
    architecturalMaps("gilt"),
  ])
    for (const texture of Object.values(maps))
      assert.equal(texture.anisotropy, 12);
});
