import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import {
  ProceduralCharacterPBRGenerator,
  HERO_BROCADE_PATTERNS,
  BROCADE_PATTERNS,
} from "../src/character-pbr.js";
import { buildHeroAnatomy } from "../src/hero-anatomy.js";

const palette = ["#065F46", "#163F53", "#D4AF37"];
const bytes = (t) => t.image.data;

test("PBR silk produces five real 2048 channels with registered gold relief, metalness and roughness", () => {
  const generator = new ProceduralCharacterPBRGenerator();
  const maps = generator.generateSilkBrocadeTexture(
    ...palette,
    BROCADE_PATTERNS.SPIRIT_VINE_LOTUS,
  );
  for (const key of [
    "albedoMap",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "emissiveMap",
  ]) {
    assert.equal(maps[key].image.width, 2048);
    assert.equal(maps[key].image.height, 2048);
    assert.equal(maps[key].wrapS, THREE.ClampToEdgeWrapping);
    assert.equal(maps[key].wrapT, THREE.ClampToEdgeWrapping);
    assert.equal(maps[key].flipY, true);
  }
  assert.equal(maps.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(maps.normalMap.colorSpace, THREE.NoColorSpace);
  const metal = bytes(maps.metalnessMap),
    rough = bytes(maps.roughnessMap),
    albedo = bytes(maps.map),
    glow = bytes(maps.emissiveMap),
    normal = bytes(maps.normalMap);
  let gold = 0,
    silk = 0,
    relief = 0;
  for (let k = 0; k < metal.length; k += 4 * 31) {
    if (metal[k] > 230) {
      gold++;
      assert.ok(Math.abs(rough[k] - 64) <= 2);
      assert.ok(Math.abs(albedo[k] - 212) <= 2);
      assert.ok(glow[k] > 40);
    }
    if (metal[k] < 10) {
      silk++;
      assert.ok(rough[k] > 150);
      assert.ok(glow[k] < 4);
    }
    if (Math.abs(normal[k] - 128) > 12 || Math.abs(normal[k + 1] - 128) > 12)
      relief++;
  }
  assert.ok(gold > 100 && silk > 100 && relief > 50);
});

test("All twelve heroes have the requested four brocade motif assignments and distinct motif masks", () => {
  assert.deepEqual(HERO_BROCADE_PATTERNS, [
    "SPIRIT_VINE_LOTUS",
    "MOUNTAIN_FLAME_SCALE",
    "NIGHT_FOX_CRESCENT",
    "CLOUD_CRANE",
    "CLOUD_CRANE",
    "MOUNTAIN_FLAME_SCALE",
    "SPIRIT_VINE_LOTUS",
    "NIGHT_FOX_CRESCENT",
    "NIGHT_FOX_CRESCENT",
    "MOUNTAIN_FLAME_SCALE",
    "CLOUD_CRANE",
    "NIGHT_FOX_CRESCENT",
  ]);
  const generator = new ProceduralCharacterPBRGenerator(),
    hashes = [];
  for (const motif of Object.values(BROCADE_PATTERNS)) {
    const maps = generator.generateSilkBrocadeTexture(...palette, motif, {
      detail: "low",
    });
    hashes.push(
      createHash("sha256").update(bytes(maps.metalnessMap)).digest("hex"),
    );
  }
  assert.equal(new Set(hashes).size, 4);
});

test("One hundred distant actors do not allocate full-resolution PBR atlases", () => {
  const generator = new ProceduralCharacterPBRGenerator();
  for (let hero = 0; hero < 100; hero++) {
    const maps = generator.generateSilkBrocadeTexture(
      0x123548 + hero,
      0x163f53,
      0xd4af37,
      HERO_BROCADE_PATTERNS[hero % 12],
      { detail: "low" },
    );
    assert.equal(maps.map.image.width, 64);
  }
  const stats = generator.stats();
  assert.equal(stats.sets.high, 0);
  assert.equal(stats.sets.medium, 0);
  assert.ok(stats.sets.low <= 12);
  assert.ok(stats.registry <= 64);
  assert.ok(stats.allocatedCachedBytes <= 1024 * 1024);
});

test("High-tier eviction demotes shared texture objects, including cloned materials, and can restore the selected actor", () => {
  const generator = new ProceduralCharacterPBRGenerator();
  const first = generator.createSilkMaterial(0, "high", {
    primary: palette[0],
    secondary: palette[1],
    gold: palette[2],
  });
  const clone = first.clone();
  assert.equal(first.map, clone.map);
  assert.equal(first.normalMap.image.width, 2048);
  generator.createSilkMaterial(3, "high", {
    primary: "#F8FAFC",
    secondary: "#0284C7",
    gold: "#D4AF37",
  });
  assert.equal(first.map.image.width, 64);
  assert.equal(clone.normalMap.image.width, 64);
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.PlaneGeometry(), clone));
  generator.prepare(root, "high");
  assert.equal(first.map.image.width, 2048);
  assert.equal(generator.stats().sets.high, 1);
  assert.equal(first.sheen, 0.85);
  assert.equal(first.sheenRoughness, 0.25);
  assert.equal(first.sheenColor.getHex(), new THREE.Color(palette[1]).getHex());
});

test("Hair has fibre normal/bump and anisotropy; jade has the requested optical material", () => {
  const generator = new ProceduralCharacterPBRGenerator(),
    hair = generator.hairMaterial(0x172b2a, "high"),
    jade = generator.jadeMaterial(0x34d399);
  assert.ok(hair.normalMap && hair.bumpMap && hair.bumpScale > 0);
  assert.ok(hair.anisotropy > 0.7);
  assert.equal(jade.transmission, 0.8);
  assert.equal(jade.ior, 1.6);
  assert.equal(jade.emissiveIntensity, 0.6);
});

test("Frontal face uses a separate 130-degree UV patch and hair stays outside the eye region", () => {
  for (let hero = 0; hero < 12; hero++) {
    const root = buildHeroAnatomy({ kind: "hero", hero }, "medium"),
      face = root.getObjectByName("VLineHeadFaceUV"),
      head = root.getObjectByName("Head");
    assert.equal(face.parent.name, "FaceFrontMesh");
    assert.equal(face.geometry.userData.frontArcDegrees, 130);
    assert.equal(face.material.map.wrapS, THREE.ClampToEdgeWrapping);
    assert.equal(face.material.map.wrapT, THREE.ClampToEdgeWrapping);
    assert.equal(face.material.map.flipY, true);
    assert.equal(face.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(face.material.map.userData.eyeLayers, 6);
    assert.equal(face.material.map.userData.irisRays, 36);
    assert.equal(face.material.map.userData.catchlights, 3);
    assert.equal(face.receiveShadow, false);
    assert.ok(root.getObjectByName("RearCraniumSkin"));
    const uv = face.geometry.attributes.uv;
    let min = 1,
      max = 0;
    for (let i = 0; i < uv.count; i++) {
      min = Math.min(min, uv.getX(i));
      max = Math.max(max, uv.getX(i));
    }
    assert.equal(min, 0);
    assert.equal(max, 1);
    root.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(head.matrixWorld).invert(),
      point = new THREE.Vector3(),
      height = root.userData.anatomy.baseHeadHeight;
    root.traverse((o) => {
      if (!/^Fringe\d+$/.test(o.name)) return;
      const p = o.geometry.attributes.position,
        transform = new THREE.Matrix4().multiplyMatrices(
          inverse,
          o.matrixWorld,
        );
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i).applyMatrix4(transform);
        assert.ok(
          !(
            Math.abs(point.x) < 0.076 &&
            point.y > height * 0.35 &&
            point.y < height * 0.66 &&
            point.z < -0.04
          ),
          `H${hero + 1} hair crosses the eye area`,
        );
      }
    });
  }
});

test("Jade pendant has two cords, and H05 mirror floats to the right behind the chest", () => {
  const hero = buildHeroAnatomy({ kind: "hero", hero: 0 }, "medium"),
    pendant = hero.getObjectByName("JadePendant"),
    cords = [];
  assert.equal(pendant.material.transmission, 0.8);
  hero.traverse((o) => {
    if (/^Tassel\d+$/.test(o.name)) cords.push(o);
  });
  assert.equal(cords.length, 2);
  const moon = buildHeroAnatomy({ kind: "hero", hero: 4 }, "medium"),
    mirror = moon.getObjectByName("soulWeapon");
  assert.ok(
    mirror.position.x > 0.35 &&
      mirror.position.y > 1.3 &&
      mirror.position.z > 0.15,
  );
  let optical = false;
  mirror.traverse((o) => {
    if (
      o.isMesh &&
      o.material.transmission === 0.85 &&
      o.material.iridescence === 1
    )
      optical = true;
  });
  assert.ok(optical);
  moon.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0.12, 1.4, -2),
    new THREE.Vector3(0, 0, 1),
  );
  const body = ray.intersectObject(
      moon.getObjectByName("AnatomicalEllipticalTorso"),
      false,
    )[0],
    mirrorHit = ray.intersectObject(mirror, true)[0];
  if (body && mirrorHit)
    assert.ok(
      body.distance < mirrorHit.distance,
      "mirror must remain behind the chest",
    );
});

test("The nose joins the facial plane smoothly and matte skin does not add a lacquer reflection", () => {
  for (const hero of [0, 4]) {
    const root = buildHeroAnatomy({ kind: "hero", hero }, "high"),
      face = root.getObjectByName("VLineHeadFaceUV"),
      p = face.geometry.attributes.position,
      n = face.geometry.attributes.normal,
      headHeight = root.userData.anatomy.baseHeadHeight;
    let previous = null,
      samples = 0;
    for (let i = 0; i < p.count; i++) {
      if (
        Math.abs(p.getX(i)) > 0.001 ||
        p.getY(i) < headHeight * 0.24 ||
        p.getY(i) > headHeight * 0.52
      )
        continue;
      assert.ok(n.getZ(i) < -0.9, "nose normals keep facing the front");
      if (previous !== null)
        assert.ok(
          Math.abs(n.getY(i) - previous) < 0.035,
          "nose must not form a tight, reflection-catching bulb",
        );
      previous = n.getY(i);
      samples++;
    }
    assert.ok(samples > 25);
    assert.equal(face.material.metalness, 0);
    assert.equal(face.material.clearcoat, 0);
    assert.ok(face.material.roughness >= 0.55);
    assert.equal(face.receiveShadow, false);
  }
});

test("Engraved opaque materials keep base paint and share the silk normal/roughness atlas without changing optical materials", () => {
  const generator = new ProceduralCharacterPBRGenerator();
  const atlas = generator.createSilkMaterial(0, "medium", {
    primary: palette[0],
    secondary: palette[1],
    gold: palette[2],
  });
  const base = new THREE.MeshPhysicalMaterial({
    color: 0xbca375,
    metalness: 0.84,
    roughness: 0.3,
  });
  base.userData.weaponRole = "metal";
  const engraved = generator.engravedMaterial(base, atlas, "metal");
  assert.notEqual(engraved, base);
  assert.equal(base.normalMap, null);
  assert.equal(engraved.map, base.map);
  assert.equal(engraved.color.getHex(), base.color.getHex());
  assert.equal(engraved.normalMap, atlas.normalMap);
  assert.equal(engraved.roughnessMap, atlas.roughnessMap);
  assert.equal(engraved.emissiveMap, atlas.emissiveMap);
  assert.ok(engraved.metalness >= 0.9);
  const alternate = generator.createSilkMaterial(3, "medium", {
    primary: "#F8FAFC",
    secondary: "#0284C7",
    gold: "#D4AF37",
  });
  const other = generator.engravedMaterial(base, alternate, "metal");
  assert.notEqual(other, engraved);
  assert.equal(engraved.normalMap, atlas.normalMap);
  const root = new THREE.Group(),
    optical = [];
  for (const role of ["mirror", "jade", "energy", "void"]) {
    const m = new THREE.MeshPhysicalMaterial({
      transmission: role === "mirror" ? 0.85 : 0.4,
      iridescence: role === "mirror" ? 1 : 0.3,
    });
    m.userData.weaponRole = role;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), m);
    root.add(mesh);
    optical.push(mesh);
  }
  const before = optical.map((o) => o.material);
  generator.applyEngraving(root, atlas);
  optical.forEach((o, i) => {
    assert.equal(o.material, before[i]);
    assert.equal(o.material.normalMap, null);
  });
  for (let i = 0; i < 140; i++)
    generator.engravedMaterial(base.clone(), atlas, "metal");
  assert.ok(generator.stats().engravedMaterials <= 128);
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, -0.1);
  shape.lineTo(0.2, -0.1);
  shape.lineTo(0, 0.3);
  shape.closePath();
  const source = new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: false,
    }),
    original = source.attributes.uv.array.slice(),
    copy = generator.engravingGeometry(source);
  assert.notEqual(copy, source);
  assert.deepEqual(source.attributes.uv.array, original);
  assert.deepEqual(
    copy.attributes.position.array,
    source.attributes.position.array,
  );
  assert.equal(copy.index?.count, source.index?.count);
  assert.ok(copy.attributes.uv.array.every((v) => v >= 0 && v <= 1));
});

test("Legacy weapons share their costume atlas; imported H01 keeps its own validated PBR", () => {
  const sample = buildHeroAnatomy({ kind: "hero", hero: 0 }, "high"),
    activeAtlas =
      sample.getObjectByName("FrontApronPanel").children[0].material;
  assert.equal(
    activeAtlas.normalMap.image.width,
    2048,
    "weapon build must not evict its character silk atlas",
  );
  for (let hero = 0; hero < 12; hero++) {
    const root = buildHeroAnatomy({ kind: "hero", hero }, "medium"),
      atlas = root.getObjectByName("FrontApronPanel").children[0].material;
    const armor = root.getObjectByName("SculptedPauldron").material;
    assert.equal(armor.normalMap, atlas.normalMap);
    assert.equal(armor.roughnessMap, atlas.roughnessMap);
    let opaque = 0,
      optical = 0;
    root.traverse((o) => {
      if (!o.isMesh || !o.material.userData.weaponRole) return;
      const role = o.material.userData.weaponRole;
      if (["metal", "wood", "stone"].includes(role)) {
        opaque++;
        assert.equal(o.material.normalMap, atlas.normalMap);
        assert.equal(o.material.roughnessMap, atlas.roughnessMap);
        assert.equal(o.material.userData.characterEngraving, true);
      } else if (["mirror", "jade", "energy", "void"].includes(role)) {
        optical++;
        assert.equal(o.material.userData.characterEngraving, undefined);
      }
    });
    if(hero===0){assert.equal(root.getObjectByName("soulWeapon").userData.hunyuanStaff,true);continue;}
    assert.ok(opaque > 0, `H${hero + 1} has engraved opaque weapon parts`);
    assert.ok(optical > 0, `H${hero + 1} retains its optical/energy parts`);
  }
  assert.equal(
    activeAtlas.normalMap.image.width,
    2048,
    "medium/distant weapon builds must not allocate a competing high atlas",
  );
});
