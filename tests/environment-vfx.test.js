import test from "node:test";
import assert from "node:assert/strict";
import { Scene, AdditiveBlending } from "three";
import { HEROES } from "../src/data.js";
import {
  ELEMENTAL_VFX, MAX_ELEMENTAL_EFFECTS, resolveElement,
  createElementalEffect, updateElementalEffect, disposeElementalEffect,
  clearElementalVfxCache, elementalVfxCacheStats, ElementalVfxSystem,
} from "../src/environment-vfx.js";

test("all twelve GDD elements resolve to distinct GPU geometry/pattern shader paths", () => {
  const effects = [];
  try {
    assert.equal(ELEMENTAL_VFX.length, 12);
    assert.equal(new Set(ELEMENTAL_VFX.map((e) => e.pattern)).size, 12);
    const shaders = new Set();
    for (const hero of HEROES) {
      const effect = createElementalEffect({ element: hero.element, color: hero.color });
      effects.push(effect);
      const metadata = effect.userData.elementalVfx;
      const mesh = effect.children[0];
      assert.ok(mesh.isMesh);
      assert.ok(mesh.material.isShaderMaterial);
      assert.equal(mesh.material.blending, AdditiveBlending);
      assert.equal(mesh.material.depthWrite, false);
      assert.equal(mesh.frustumCulled, false);
      assert.equal(mesh.geometry.type, "BufferGeometry");
      assert.ok(mesh.geometry.getAttribute("aStrip"));
      assert.ok(mesh.geometry.getAttribute("aAlong"));
      assert.ok(mesh.geometry.getAttribute("aSide"));
      assert.equal(mesh.geometry.index.count, metadata.parts * metadata.segments * 6);
      assert.equal(metadata.proceduralTextureCount, 0);
      assert.ok(mesh.material.vertexShader.includes(`ELEMENT_${metadata.element.toUpperCase()}`));
      assert.ok(mesh.material.vertexShader.includes("gl_Position"));
      assert.ok(mesh.material.fragmentShader.includes("gl_FragColor"));
      assert.doesNotMatch(mesh.material.vertexShader, /Math\.random|Tetrahedron/);
      shaders.add(mesh.material.vertexShader + mesh.material.fragmentShader);
      assert.equal(resolveElement(undefined, hero.color), metadata.element);
    }
    assert.equal(shaders.size, 12);
  } finally {
    for (const effect of effects) disposeElementalEffect(effect);
  }
});

test("aliases and hero indices preserve the source's twelve-element ordering", () => {
  HEROES.forEach((hero, i) => assert.equal(resolveElement(i), resolveElement(hero.element)));
  assert.equal(resolveElement("Âm Luật"), "music");
  assert.equal(resolveElement("am luat"), "music");
  assert.equal(resolveElement("am"), "dark");
  assert.equal(resolveElement("moc"), "wood");
  assert.equal(resolveElement(" LIGHTNING "), "lightning");
});

test("updates only change independent uniforms; reusable geometry never changes", () => {
  const a = createElementalEffect({ element: "fire", radius: 2, duration: 2 });
  const b = createElementalEffect({ element: "fire", radius: 3, duration: 4 });
  try {
    const ma = a.children[0], mb = b.children[0];
    assert.equal(ma.geometry, mb.geometry);
    assert.notEqual(ma.material, mb.material, "concurrent effects must not share mutable uniforms");
    const positions = ma.geometry.attributes.position.array;
    const original = positions.slice();
    for (let i = 0; i < 50; i++) updateElementalEffect(a, i / 50);
    assert.equal(ma.geometry.attributes.position.array, positions);
    assert.deepEqual(positions, original);
    assert.equal(ma.material.uniforms.uElapsed.value, 0.98);
    assert.equal(mb.material.uniforms.uElapsed.value, 0);
    assert.equal(ma.material.uniforms.uRadius.value, 2);
    assert.equal(mb.material.uniforms.uRadius.value, 3);
    assert.equal(updateElementalEffect(a, 2), false);
    assert.equal(a.visible, false);
    assert.equal(updateElementalEffect(a, NaN), false);
  } finally {
    disposeElementalEffect(a);
    disposeElementalEffect(b);
  }
});

test("disposal returns materials to a bounded pool without destroying shared borrowers", () => {
  const scene = new Scene();
  const a = createElementalEffect({ element: "ice" });
  const b = createElementalEffect({ element: "ice" });
  scene.add(a, b);
  const geometry = a.children[0].geometry;
  const material = a.children[0].material;
  let geometryDisposals = 0;
  const onDispose = () => geometryDisposals++;
  geometry.addEventListener("dispose", onDispose);
  try {
    assert.equal(clearElementalVfxCache(), false);
    assert.equal(disposeElementalEffect(a), true);
    assert.equal(disposeElementalEffect(a), false);
    assert.equal(a.parent, null);
    assert.equal(a.children.length, 0);
    assert.equal(a.userData.elementalVfx.disposed, true);
    assert.equal(geometryDisposals, 0);
    assert.equal(updateElementalEffect(b, 0.2), true);
    const c = createElementalEffect({ element: "ice", duration: 3 });
    assert.equal(c.children[0].material, material, "released shader material is reused");
    assert.equal(c.children[0].material.uniforms.uOpacity.value, 1);
    assert.equal(c.children[0].material.uniforms.uDuration.value, 3);
    disposeElementalEffect(c);
  } finally {
    disposeElementalEffect(a);
    disposeElementalEffect(b);
    geometry.removeEventListener("dispose", onDispose);
  }
});

test("quality changes ribbon density, lifetime inputs remain finite, and no textures allocate", () => {
  const low = createElementalEffect({ element: "wood", quality: "low", radius: Infinity, duration: -3, opacity: 8 });
  const high = createElementalEffect({ element: "wood", quality: "ultra", radius: 200, duration: Infinity });
  try {
    assert.ok(low.children[0].geometry.index.count < high.children[0].geometry.index.count);
    assert.equal(low.userData.elementalVfx.duration, 0.05);
    assert.equal(low.userData.elementalVfx.radius, 1.5);
    assert.equal(high.userData.elementalVfx.radius, 20);
    assert.equal(high.userData.elementalVfx.duration, 0.8);
    assert.equal(low.children[0].material.uniforms.uOpacity.value, 1);
    assert.equal(elementalVfxCacheStats().textureCount, 0);
  } finally {
    disposeElementalEffect(low);
    disposeElementalEffect(high);
  }
});

test("system caps active effects, expires them with elapsed time and removes scene children", () => {
  const scene = new Scene();
  const system = new ElementalVfxSystem(scene, { capacity: 2, quality: "low" });
  try {
    const a = system.emit({ element: "lightning", duration: 1 });
    const b = system.emit({ element: "poison", duration: 2 });
    const c = system.emit({ element: "music", duration: 2 });
    assert.equal(system.effects.size, 2);
    assert.equal(scene.children.length, 2);
    assert.equal(a.userData.elementalVfx.disposed, true);
    system.update(0.5);
    assert.equal(b.userData.elementalVfx.elapsed, 0.5);
    system.update(1.5);
    assert.equal(system.effects.size, 0);
    assert.equal(scene.children.length, 0);
    assert.equal(c.userData.elementalVfx.disposed, true);
  } finally { system.dispose(); }
});

test("global effect cap and teardown prevent unbounded meshes, buffers or pooled materials", () => {
  const effects = [];
  try {
    for (let i = 0; i < MAX_ELEMENTAL_EFFECTS; i++) {
      const effect = createElementalEffect({ element: "water", quality: "low" });
      assert.ok(effect);
      effects.push(effect);
    }
    assert.equal(createElementalEffect({ element: "earth" }), null);
    assert.equal(elementalVfxCacheStats().active, MAX_ELEMENTAL_EFFECTS);
  } finally {
    for (const effect of effects) disposeElementalEffect(effect);
  }
  assert.equal(elementalVfxCacheStats().active, 0);
  assert.ok(elementalVfxCacheStats().pooledMaterials <= 12 * 3 * 4);
  assert.equal(clearElementalVfxCache(), true);
  assert.equal(elementalVfxCacheStats().geometryCount, 0);
  assert.equal(elementalVfxCacheStats().pooledMaterials, 0);
});
