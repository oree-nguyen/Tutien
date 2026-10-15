import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { RINGS } from "../src/data.js";
import { World } from "../src/world.js";
import { visualTemplate, animateVisual, triangleCount } from "../src/art.js";
import {
  syncSoulRingVisuals,
  disposeSoulRingVisuals,
  getSoulRingTextureCacheInfo,
} from "../src/soul-ring-vfx.js";

const meshFor = (group, slot, placement = "foot") =>
  group.children.find(
    (o) => o.userData.slot === slot && o.userData.placement === placement,
  );
const imageHash = (pixels) => {
  let hash = 2166136261;
  for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
  return hash >>> 0;
};

test("Hero templates and animated altar changes show the exact slots without baking a stale aura", () => {
  const actor = {
    kind: "hero",
    hero: 0,
    rings: [1, 6],
    x: 0,
    z: 0,
    cooldowns: [],
  };
  const first = visualTemplate(actor, "low");
  assert.deepEqual(first.userData.soulRingVFX.ringIds, [1, 6]);
  assert.ok(triangleCount(first) <= 2500);
  const second = visualTemplate({ ...actor, rings: [2, 6] }, "low");
  assert.deepEqual(second.userData.soulRingVFX.ringIds, [2, 6]);
  assert.deepEqual(first.userData.soulRingVFX.ringIds, [1, 6]);
  animateVisual(second, { ...actor, rings: [0, 12] }, 3, 1 / 60);
  assert.deepEqual(second.userData.soulRingVFX.ringIds, [0, 12]);
  assert.equal(second.getObjectByName("soulRingVisuals").children.length, 2);
  disposeSoulRingVisuals(first);
  disposeSoulRingVisuals(second);
});

test("World concealment preserves private ring shaders and teardown disposes owned materials only", () => {
  const root = new T.Group();
  syncSoulRingVisuals(root, { rings: [1, 6] }, "low");
  const aura = root.getObjectByName("soulRingVisuals");
  const materials = aura.children.map((mesh) => mesh.material);
  const callbacks = materials.map((material) => material.onBeforeCompile);
  let materialDisposals = 0,
    textureDisposals = 0;
  for (const material of materials)
    material.addEventListener("dispose", () => materialDisposals++);
  for (const texture of new Set(materials.map((m) => m.map)))
    texture.addEventListener("dispose", () => textureDisposals++);
  const lod = new T.LOD();
  lod.addLevel(root, 0);
  const model = { lod, details: new Set(["low"]) };
  World.prototype.setConcealment.call({}, model, true);
  for (let i = 0; i < materials.length; i++) {
    assert.equal(aura.children[i].material, materials[i]);
    assert.equal(materials[i].onBeforeCompile, callbacks[i]);
  }
  World.prototype.releaseModelRings.call({}, model);
  assert.equal(root.getObjectByName("soulRingVisuals"), undefined);
  assert.equal(materialDisposals, 4);
  assert.equal(textureDisposals, 0);
});

test("Empty and invalid ring slots create no aura; two slots add at most eight triangles", () => {
  const root = new T.Group();
  for (const rings of [
    [],
    [0, 0],
    [null, undefined],
    [-1, 13],
    [NaN, Infinity],
    ["6", {}],
  ]) {
    assert.equal(syncSoulRingVisuals(root, { rings }), null);
    assert.equal(root.children.length, 0);
  }
  const one = syncSoulRingVisuals(root, { rings: [1] });
  assert.equal(one.children.length, 2);
  assert.equal(
    one.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0),
    4,
  );
  const two = syncSoulRingVisuals(root, { rings: [1, 6, 8] });
  assert.equal(two.children.length, 4);
  assert.equal(
    two.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0),
    8,
  );
  disposeSoulRingVisuals(root);
});

test("Every source ring uses its own black/purple tier independently of actor tier", () => {
  for (const ring of RINGS) {
    const root = new T.Group(),
      actor = { rings: [ring.id], tier: ring.black ? 0 : 999 };
    const before = structuredClone(actor),
      group = syncSoulRingVisuals(root, actor);
    for (const mesh of group.children) {
      assert.equal(mesh.userData.ringId, ring.id);
      assert.equal(mesh.userData.tier, ring.black ? "black" : "purple");
      assert.equal(mesh.material.map.userData.ringId, ring.id);
      assert.equal(
        mesh.material.map.userData.tier,
        ring.black ? "black" : "purple",
      );
      assert.equal(
        mesh.material.blending,
        ring.black ? T.NormalBlending : T.AdditiveBlending,
      );
      assert.equal(mesh.material.type, "MeshPhysicalMaterial");
    }
    assert.deepEqual(actor, before);
    disposeSoulRingVisuals(root);
  }
});

test("Same-color altar replacement refreshes only its slot and preserves unchanged resources", () => {
  const root = new T.Group(),
    actor = { rings: [1, 3] };
  const group = syncSoulRingVisuals(root, actor, "low", 0);
  const first = meshFor(group, 0),
    unaffected = meshFor(group, 1),
    firstRevision = root.userData.soulRingVFX.revision;
  let disposed = 0;
  first.material.addEventListener("dispose", () => disposed++);
  actor.rings[0] = 2;
  assert.equal(syncSoulRingVisuals(root, actor, "low", 1), group);
  const replacement = meshFor(group, 0);
  assert.notEqual(replacement, first);
  assert.notEqual(replacement.material.map, first.material.map);
  assert.notEqual(
    imageHash(replacement.material.map.image.data),
    imageHash(first.material.map.image.data),
  );
  assert.equal(meshFor(group, 1), unaffected);
  assert.equal(disposed, 1);
  assert.equal(root.userData.soulRingVFX.revision, firstRevision + 1);
  const metadata = root.userData.soulRingVFX;
  for (let time = 2; time < 102; time++)
    assert.equal(syncSoulRingVisuals(root, actor, "medium", time), group);
  assert.equal(meshFor(group, 0), replacement);
  assert.equal(root.userData.soulRingVFX, metadata);
  actor.rings = [0, 0];
  assert.equal(syncSoulRingVisuals(root, actor), null);
  assert.equal(root.children.length, 0);
});

test("Foot/back planes have finite geometry, correct orientation and shared borrowed buffers", () => {
  const root = new T.Group(),
    group = syncSoulRingVisuals(root, { rings: [1, 8] }, "high", 1);
  let sharedGeometry;
  for (const mesh of group.children) {
    assert.equal(mesh.geometry.attributes.position.count, 4);
    assert.equal(mesh.geometry.index.count, 6);
    assert.ok(
      Array.from(mesh.geometry.attributes.position.array).every(
        Number.isFinite,
      ),
    );
    assert.ok(
      Array.from(mesh.geometry.attributes.normal.array).every(Number.isFinite),
    );
    assert.equal(mesh.geometry.userData.sharedArt, true);
    assert.equal(mesh.material.userData.sharedArt, true);
    assert.equal(mesh.material.depthWrite, false);
    assert.equal(mesh.material.transparent, true);
    assert.equal(mesh.material.map, mesh.material.emissiveMap);
    const normal = new T.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
    assert.ok(Math.abs(normal.length() - 1) < 1e-10);
    if (mesh.userData.placement === "foot")
      assert.ok(Math.abs(normal.y - 1) < 1e-10);
    else assert.ok(Math.abs(normal.z - 1) < 1e-10);
    if (sharedGeometry) assert.equal(mesh.geometry, sharedGeometry);
    sharedGeometry = mesh.geometry;
  }
  disposeSoulRingVisuals(root);
});

test("Clones receive independent materials and never dispose the original's borrowed resources", () => {
  const actor = { rings: [1, 6] },
    original = new T.Group();
  const originalGroup = syncSoulRingVisuals(original, actor, "high", 1),
    originalMesh = meshFor(originalGroup, 0);
  const clone = original.clone(true),
    inherited = clone.getObjectByName("soulRingVisuals");
  assert.equal(meshFor(inherited, 0).material, originalMesh.material);
  let textureDisposals = 0,
    originalMaterialDisposals = 0;
  originalMesh.material.map.addEventListener(
    "dispose",
    () => textureDisposals++,
  );
  originalMesh.material.addEventListener(
    "dispose",
    () => originalMaterialDisposals++,
  );
  const originalOpacity = originalMesh.material.opacity,
    originalRotation = originalMesh.rotation.z;
  const group = syncSoulRingVisuals(clone, actor, "high", 3),
    cloneMesh = meshFor(group, 0);
  assert.notEqual(group, inherited);
  assert.notEqual(cloneMesh.material, originalMesh.material);
  assert.equal(cloneMesh.material.map, originalMesh.material.map);
  assert.equal(originalMesh.material.opacity, originalOpacity);
  assert.equal(originalMesh.rotation.z, originalRotation);
  syncSoulRingVisuals(clone, { rings: [2, 8] }, "low", 4);
  disposeSoulRingVisuals(clone);
  assert.equal(textureDisposals, 0);
  assert.equal(originalMaterialDisposals, 0);
  assert.equal(original.children[0], originalGroup);
  const detachedClone = original.clone(true);
  disposeSoulRingVisuals(detachedClone);
  assert.equal(originalMaterialDisposals, 0);
  disposeSoulRingVisuals(original);
  assert.equal(originalMaterialDisposals, 1);
  assert.equal(textureDisposals, 0);
});

test("Animation rotates the mesh and updates its private ripple uniform without mutating shared texture", () => {
  const root = new T.Group(),
    actor = { rings: [1, 8], hp: 950, mp: 100 },
    before = structuredClone(actor);
  const group = syncSoulRingVisuals(root, actor, "medium", 0),
    mesh = meshFor(group, 0),
    texture = mesh.material.map;
  const initialRotation = mesh.rotation.z,
    version = texture.version,
    offset = texture.offset.clone(),
    matrix = texture.matrix.clone();
  const shader = {
    uniforms: {},
    fragmentShader:
      "#include <common>\nvoid main() {\n#include <emissivemap_fragment>\n}",
  };
  mesh.material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes("float soulWave"));
  syncSoulRingVisuals(root, actor, "medium", 3.25);
  assert.notEqual(mesh.rotation.z, initialRotation);
  assert.equal(shader.uniforms.uSoulTime.value, 3.25);
  assert.equal(texture.version, version);
  assert.deepEqual(texture.offset, offset);
  assert.deepEqual(texture.matrix, matrix);
  assert.equal(texture.rotation, 0);
  for (const time of [NaN, Infinity, -Infinity, -4.2, 0, 1e4]) {
    syncSoulRingVisuals(root, actor, "medium", time);
    assert.ok(
      [
        ...mesh.position.toArray(),
        ...mesh.scale.toArray(),
        ...mesh.rotation.toArray().slice(0, 3),
        mesh.material.opacity,
        shader.uniforms.uSoulTime.value,
      ].every(Number.isFinite),
    );
  }
  assert.deepEqual(actor, before);
  disposeSoulRingVisuals(root);
});

test("Rune textures have transparent centers/corners, visible strokes and distinct source-ID artwork", () => {
  const hashes = new Set();
  for (const ring of RINGS) {
    const root = new T.Group(),
      group = syncSoulRingVisuals(root, { rings: [ring.id] });
    const texture = group.children[0].material.map,
      size = texture.image.width,
      pixels = texture.image.data;
    assert.equal(
      pixels[(Math.floor(size / 2) * size + Math.floor(size / 2)) * 4 + 3],
      0,
    );
    assert.equal(pixels[3], 0);
    let bright = 0,
      transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 120) bright++;
      if (!pixels[i]) transparent++;
    }
    assert.ok(bright > size * size * 0.01);
    assert.ok(transparent > size * size * 0.4);
    hashes.add(imageHash(pixels));
    disposeSoulRingVisuals(root);
  }
  assert.equal(hashes.size, RINGS.length);
});

test("Texture cache shares medium/low, upgrades high and stays bounded to twelve source profiles", () => {
  const root = new T.Group();
  for (const ring of RINGS) {
    const low = syncSoulRingVisuals(root, { rings: [ring.id] }, "low")
      .children[0].material.map;
    const medium = syncSoulRingVisuals(root, { rings: [ring.id] }, "medium")
      .children[0].material.map;
    const high = syncSoulRingVisuals(root, { rings: [ring.id] }, "high")
      .children[0].material.map;
    assert.equal(low, medium);
    assert.notEqual(high, low);
    assert.equal(low.image.width, 256);
    assert.equal(high.image.width, 512);
  }
  const before = getSoulRingTextureCacheInfo();
  for (let i = 0; i < 100; i++)
    syncSoulRingVisuals(root, { rings: [1, 6], tier: i }, "high", i);
  const after = getSoulRingTextureCacheInfo();
  assert.equal(after.textureCount, before.textureCount);
  assert.equal(after.profileCount, 12);
  assert.ok(after.textureCount <= 24);
  assert.ok(after.bytes <= 15728640);
  assert.ok(after.estimatedGPUMipBytes <= 20971520);
  disposeSoulRingVisuals(root);
});

test("Canvas upload receives the same procedural RGBA image as the headless texture fallback", async () => {
  const oldDocument = globalThis.document;
  let written;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (width, height) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: (image) => {
          written = image.data;
        },
      }),
    }),
  };
  try {
    const module = await import("../src/soul-ring-vfx.js?canvas-upload-unit");
    const canvasRoot = new T.Group(),
      dataRoot = new T.Group();
    const canvasTexture = module.syncSoulRingVisuals(
      canvasRoot,
      { rings: [12] },
      "high",
    ).children[0].material.map;
    const dataTexture = syncSoulRingVisuals(dataRoot, { rings: [12] }, "high")
      .children[0].material.map;
    assert.equal(canvasTexture.isCanvasTexture, true);
    assert.equal(canvasTexture.image.width, 512);
    assert.equal(written.length, 512 * 512 * 4);
    assert.equal(imageHash(written), imageHash(dataTexture.image.data));
    module.disposeSoulRingVisuals(canvasRoot);
    disposeSoulRingVisuals(dataRoot);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
