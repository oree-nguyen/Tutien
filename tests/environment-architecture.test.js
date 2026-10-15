import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createPortal,
  updatePortal,
  createShop,
  createAltar,
} from "../src/scenery.js";

function finiteGeometry(group) {
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    assert.ok(
      object.matrixWorld.elements.every(Number.isFinite),
      `${object.name} finite transform`,
    );
    if (object.geometry?.attributes.position)
      assert.ok(
        object.geometry.attributes.position.array.every(Number.isFinite),
      );
  });
}
function release(group) {
  const geometries = new Set(),
    materials = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat())
      if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

test("extraction portal has three real octagonal steps, four curved pillars and eight shader flames", () => {
  const portal = createPortal();
  try {
    const p = portal.userData.portal;
    assert.equal(p.diameter, 7);
    assert.equal(p.tiers.length, 3);
    assert.equal(
      p.tiers[0].geometry.parameters.radiusTop,
      3.5,
      "interactive 3.5m top platform remains unchanged",
    );
    assert.ok(
      p.tiers.every((step) => step.geometry.parameters.radialSegments === 8),
    );
    assert.ok(
      p.tiers[2].geometry.parameters.radiusTop >
        p.tiers[1].geometry.parameters.radiusTop,
    );
    assert.equal(p.pillars.length, 4);
    assert.ok(
      p.pillars.every((pillar) => pillar.geometry.type === "TubeGeometry"),
    );
    assert.equal(p.crystals.length, 4);
    assert.equal(p.energyBeams.length, 4);
    assert.equal(p.lamps.length, 8);
    assert.equal(new Set(p.lamps.map((lamp) => lamp.material)).size, 1);
    assert.ok(p.flameMaterial.isShaderMaterial);
    assert.equal(p.flameMaterial.depthWrite, false);
    assert.match(p.flameMaterial.vertexShader, /uniform float uTime/);
    assert.equal(p.goldRing.children.length, 12);
    assert.ok(p.sigil.material.isMeshPhysicalMaterial);
    assert.equal(p.sigil.material.bumpScale, 0.15);
    assert.equal(p.sigil.material.bumpMap.image.width, 1024);
    assert.equal(p.sigil.material.userData.trigrams.sectorCount, 8);
    const shader = {
      uniforms: {},
      fragmentShader: "#include <emissivemap_fragment>",
    };
    p.sigil.material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader, /floor\(\(atan/);
    assert.equal(
      shader.uniforms.uTrigramTime,
      p.sigil.material.userData.trigrams.clock,
    );
    assert.ok(
      p.tiers[0].material.map &&
        p.tiers[0].material.normalMap &&
        p.tiers[0].material.roughnessMap,
    );
    assert.equal(p.state, "closed");
    assert.equal(p.beam.visible, false);
    const platformPosition = p.tiers[0].position.clone(),
      positionData = p.pillars[0].geometry.attributes.position.array.slice();
    updatePortal(portal, "warning", 5);
    assert.equal(p.beam.visible, false);
    assert.equal(p.core.material.uniforms.uOpacity.value, 0.45);
    assert.equal(p.flameTime.value, 5);
    assert.equal(shader.uniforms.uTrigramTime.value, 5);
    const warningRotation = p.goldRing.rotation.z;
    updatePortal(portal, "open", 8);
    assert.equal(p.beam.visible, true);
    assert.equal(p.core.material.uniforms.uOpacity.value, 0.85);
    assert.notEqual(p.goldRing.rotation.z, warningRotation);
    assert.equal(p.flameMaterial.uniforms.uStrength.value, 1);
    assert.deepEqual(p.tiers[0].position, platformPosition);
    assert.deepEqual(
      p.pillars[0].geometry.attributes.position.array,
      positionData,
      "animation uses transforms/uniforms without rebuilding pillars",
    );
    updatePortal(portal, "closed", 11);
    assert.equal(p.beam.visible, false);
    assert.equal(p.core.material.uniforms.uOpacity.value, 0.12);
    assert.ok(p.energyBeams.every((beam) => beam.material.opacity < 0.05));
    finiteGeometry(portal);
  } finally {
    release(portal);
  }
});

test("pavilion has a curved eight-corner tiled roof, swinging lantern pivots and GPU cauldron smoke", () => {
  const time = { value: 3 },
    pavilion = createShop(time);
  try {
    const shop = pavilion.userData.shop;
    assert.equal(shop.roof.geometry.type, "LatheGeometry");
    assert.equal(shop.roof.geometry.parameters.segments, 8);
    const points = shop.roof.geometry.parameters.points;
    assert.ok(points.at(-1).y > points.at(-2).y, "eaves curve upward");
    assert.ok(
      shop.roof.material.normalMap &&
        shop.roof.material.roughnessMap &&
        shop.roof.material.bumpMap,
    );
    assert.equal(shop.roof.material.map.repeat.x, 2);
    assert.equal(shop.lanterns.length, 8);
    assert.ok(
      shop.lanterns.every((lamp) => lamp.isGroup && lamp.children.length === 3),
    );
    assert.equal(shop.cauldron.geometry.type, "LatheGeometry");
    assert.equal(shop.smoke.count, 10);
    assert.ok(
      shop.smoke.isInstancedMesh && shop.smoke.material.isShaderMaterial,
    );
    assert.equal(shop.smoke.material.uniforms.uTime, time);
    assert.equal(shop.smoke.geometry.attributes.phase.count, 10);
    assert.match(shop.smoke.material.vertexShader, /fract\(uTime/);
    assert.equal(shop.smoke.material.depthWrite, false);
    const phases = Array.from(shop.smoke.geometry.attributes.phase.array);
    time.value = 12;
    assert.equal(shop.smoke.material.uniforms.uTime.value, 12);
    assert.deepEqual(
      Array.from(shop.smoke.geometry.attributes.phase.array),
      phases,
    );
    finiteGeometry(pavilion);
  } finally {
    release(pavilion);
  }
});

test("altar has nine actual converging blood channels and a transmission crystal", () => {
  const altar = createAltar();
  try {
    const a = altar.userData.altar;
    assert.equal(a.channels.length, 9);
    const angles = new Set();
    for (const channel of a.channels) {
      assert.equal(channel.geometry.type, "TubeGeometry");
      const points = channel.geometry.parameters.path.points;
      assert.ok(
        Math.hypot(points[0].x, points[0].z) <
          Math.hypot(points.at(-1).x, points.at(-1).z),
      );
      angles.add(Math.atan2(points.at(-1).z, points.at(-1).x).toFixed(4));
      assert.ok(channel.material.emissiveIntensity > 0);
    }
    assert.equal(angles.size, 9);
    assert.equal(a.crystal.geometry.type, "OctahedronGeometry");
    assert.ok(a.crystal.material.transmission >= 0.5);
    assert.ok(a.crystal.scale.y > 1);
    assert.equal(a.sigil.material.bumpScale, 0.15);
    assert.equal(a.sigil.material.side, THREE.DoubleSide);
    finiteGeometry(altar);
  } finally {
    release(altar);
  }
});
