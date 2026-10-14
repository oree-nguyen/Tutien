import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Box3, Vector3, Raycaster } from "three";
import { anatomyCacheStats } from "../src/hero-anatomy.js";
import { visualTemplate, triangleCount, animateVisual } from "../src/art.js";
import { SOUL_WEAPON_SPEC, buildSoulWeapon } from "../src/weapons.js";

const heights = [
  1.82, 1.92, 1.68, 1.83, 1.69, 1.98, 1.82, 1.7, 1.7, 1.85, 1.67, 1.84,
];
const female = new Set([2, 4, 7, 8, 10]);
const panels = [
  "FrontApronPanel",
  "BackLongCape",
  "LeftHipTasset",
  "RightHipTasset",
];
const fingers = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const near = (a, b, tolerance = 2e-5) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
function sizeOf(mesh) {
  return new Box3().setFromObject(mesh).getSize(new Vector3());
}
function geometrySignature(root) {
  const hash = createHash("sha256");
  root.traverse((o) => {
    if (!o.isMesh) return;
    hash.update(o.name);
    hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));
    hash.update(JSON.stringify(o.position.toArray()));
    hash.update(JSON.stringify(o.rotation.toArray()));
  });
  return hash.digest("hex");
}

for (let hero = 0; hero < 12; hero++) {
  test(`Master anatomy H${String(hero + 1).padStart(2, "0")}: actual 8-head mesh, articulated hands and Hanfu`, () => {
    const root = visualTemplate({ kind: "hero", hero }, "high");
    root.updateMatrixWorld(true);
    const face = root.getObjectByName("VLineHeadFaceUV");
    const headBox = new Box3().setFromObject(face);
    near(headBox.max.y, heights[hero]);
    near(headBox.max.y - headBox.min.y, heights[hero] / 8);
    near(root.userData.anatomy.headHeightMeters, heights[hero] / 8);
    assert.equal(
      root.userData.anatomy.gender,
      female.has(hero) ? "female" : "male",
    );
    assert.equal(face.material.map.image.width, 2048);
    assert.equal(face.material.map.image.height, 2048);
    assert.equal(face.geometry.type, "BufferGeometry");
    assert.equal(root.getObjectByName("Pelvis").parent, root);
    const chain = [
      "Pelvis",
      "SpineLower",
      "SpineUpper",
      "Chest",
      "Neck",
      "Head",
    ];
    for (let i = 1; i < chain.length; i++)
      assert.equal(root.getObjectByName(chain[i]).parent.name, chain[i - 1]);
    const torso = root.getObjectByName("AnatomicalEllipticalTorso");
    assert.equal(torso.geometry.userData.radialSegments, 128);
    assert.equal(torso.geometry.userData.longitudinalSegments, 128);
    assert.equal(torso.geometry.userData.crossSections.length, 12);
    assert.ok(
      torso.geometry.userData.crossSections.every((s) => s.rx !== s.rz),
    );
    const sections = torso.geometry.userData.crossSections;
    assert.ok(
      sections[4].rx < Math.max(...sections.map((s) => s.rx)),
      "waist is narrower than the upper torso",
    );
    for (const side of ["L", "R"]) {
      const hierarchy = [
        "Chest",
        "Clavicle" + side,
        "Shoulder" + side,
        "UpperArm" + side,
        "Forearm" + side,
        "Hand" + side,
      ];
      for (let i = 1; i < hierarchy.length; i++)
        assert.equal(
          root.getObjectByName(hierarchy[i]).parent.name,
          hierarchy[i - 1],
        );
      assert.equal(root.getObjectByName("Thigh" + side).parent.name, "Pelvis");
      assert.equal(
        root.getObjectByName("Calf" + side).parent.name,
        "Thigh" + side,
      );
      assert.equal(
        root.getObjectByName("Ankle" + side).parent.name,
        "Calf" + side,
      );
      assert.equal(
        root.getObjectByName("Foot" + side).parent.name,
        "Ankle" + side,
      );
      for (const finger of fingers) {
        const f = root.getObjectByName(finger + side);
        assert.equal(f.parent.name, "Hand" + side);
        let segments = 0;
        f.traverse((o) => {
          if (o.userData.rigRole === "fingerSegment") segments++;
        });
        assert.equal(segments, 3);
      }
    }
    let pauldrons = 0;
    root.traverse((o) => {
      if (o.name === "SculptedPauldron") {
        assert.equal(o.geometry.type, "ExtrudeGeometry");
        pauldrons++;
      }
      if (
        [
          "AnatomicalEllipticalTorso",
          "TeardropDeltoid",
          "Bicep",
          "ThighAnatomy",
          "CalfAnatomy",
        ].includes(o.name)
      )
        assert.notEqual(o.geometry.type, "SphereGeometry");
    });
    assert.equal(pauldrons, 2);
    for (const name of panels) {
      const panel = root.getObjectByName(name);
      assert.equal(panel.children[0].geometry.parameters.widthSegments, 64);
      assert.equal(panel.children[0].geometry.parameters.heightSegments, 64);
      assert.equal(
        panel.children[0].geometry.attributes.position.count,
        65 * 65,
      );
      assert.equal(panel.children[0].material.side, 2);
    }
    assert.ok(root.getObjectByName("WaistSash"));
    assert.ok(root.getObjectByName("JadePendant"));
    let fringe = 0,
      back = 0;
    root.traverse((o) => {
      if (/^Fringe\d+$/.test(o.name)) fringe++;
      if (/^HairStrand\d+$/.test(o.name)) back++;
    });
    assert.ok(fringe >= 8 && fringe <= 12);
    assert.ok(back >= 16 && back <= 24);
    assert.ok(triangleCount(root) >= 50000);
  });
}

test("Master anatomy: twelve geometry silhouettes differ independently of material colors", () => {
  const signatures = Array.from({ length: 12 }, (_, hero) =>
    geometrySignature(visualTemplate({ kind: "hero", hero }, "medium")),
  );
  assert.equal(new Set(signatures).size, 12);
});

test("Ly Sa has two soft convex triangular fox ears with pale inner fur", () => {
  const root = visualTemplate({ kind: "hero", hero: 2 }, "high"),
    ears = [],
    inner = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.name === "FoxEar") ears.push(o);
    if (o.name === "FoxInnerEar") inner.push(o);
  });
  assert.equal(ears.length, 2);
  assert.equal(inner.length, 2);
  for (const ear of ears) {
    assert.equal(ear.geometry.type, "ExtrudeGeometry");
    const size = sizeOf(ear);
    assert.ok(size.y >= 0.1 && size.y <= 0.13, `ear height ${size.y}`);
    assert.ok(size.x >= 0.05 && size.x <= 0.09, `ear width ${size.x}`);
    const points = ear.geometry.parameters.shapes.extractPoints(24).shape;
    if (points[0].equals(points.at(-1))) points.pop();
    let orientation = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        c = points[(i + 2) % points.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-11) continue;
      if (!orientation) orientation = Math.sign(cross);
      assert.equal(
        Math.sign(cross),
        orientation,
        "ear outline must not contain bat-wing notches",
      );
    }
    const fur = ear.parent.getObjectByName("FoxInnerEar");
    const brightness = (color) => color.r + color.g + color.b;
    assert.ok(brightness(fur.material.color) > brightness(ear.material.color));
    assert.ok(
      fur.position.z < ear.position.z,
      "inner fur must face forward without overlapping its outer surface",
    );
  }
  const rig = root.getObjectByName("FoxEarRigL");
  animateVisual(root, { x: 0, z: 0, cooldowns: [] }, 0, 1 / 60);
  const first = rig.rotation.z;
  animateVisual(root, { x: 0, z: 0, cooldowns: [] }, 2, 1 / 60);
  assert.notEqual(rig.rotation.z, first);
  assert.ok(Math.abs(rig.rotation.z) < 0.18);
});

test("Master anatomy: every skin/costume keeps both mobile LOD triangle budgets", () => {
  for (let hero = 0; hero < 12; hero++)
    for (let skin = 0; skin < 3; skin++)
      for (let costume = 0; costume < 4; costume++) {
        for (const detail of ["medium", "low"]) {
          const root = visualTemplate(
            { kind: "hero", hero, skin, costume },
            detail,
          );
          assert.ok(
            triangleCount(root) <= (detail === "medium" ? 12000 : 2500),
            `${hero}/${skin}/${costume}/${detail} exceeds budget`,
          );
        }
      }
});

test("Master anatomy: cloned cape remains below its waist attachment throughout animation", () => {
  const root = visualTemplate({ kind: "hero", hero: 0 }, "high");
  for (const time of [0, 0.5, 1.7, 3.5, 9.2]) {
    animateVisual(root, { x: 0, z: 0, cooldowns: [] }, time, 1 / 60);
    root.updateMatrixWorld(true);
    const cape = root.getObjectByName("BackLongCape"),
      anchor = cape.getWorldPosition(new Vector3());
    const box = new Box3().setFromObject(cape);
    assert.ok(
      box.max.y <= anchor.y + 0.015,
      `cape inverted above waist at ${time}`,
    );
    assert.ok(box.min.y < anchor.y - 0.8);
  }
});

test("Master anatomy: outer robes occlude the legs instead of intersecting them", () => {
  for (let hero = 0; hero < 12; hero++) {
    const root = visualTemplate({ kind: "hero", hero }, "high");
    root.updateMatrixWorld(true);
    const panel = root.getObjectByName("FrontApronPanel").children[0];
    const bounds = new Box3().setFromObject(panel),
      legs = [];
    root.traverse((o) => {
      if (["ThighAnatomy", "CalfAnatomy"].includes(o.name)) legs.push(o);
    });
    for (const fraction of [0.25, 0.5, 0.75])
      for (const x of [-0.08, 0.08]) {
        const y = bounds.min.y + (bounds.max.y - bounds.min.y) * fraction;
        const ray = new Raycaster(new Vector3(x, y, -1), new Vector3(0, 0, 1));
        const cloth = ray.intersectObject(panel, false)[0],
          leg = ray.intersectObjects(legs, false)[0];
        assert.ok(
          cloth,
          `H${hero + 1} front robe must cover the sampled garment area`,
        );
        if (leg)
          assert.ok(
            cloth.distance + 0.015 < leg.distance,
            `H${hero + 1} leg penetrated the front robe`,
          );
      }
  }
});

test("Master anatomy: distant heroes generate 64px faces and medium 256px faces", () => {
  for (const [detail, width] of [
    ["low", 64],
    ["medium", 256],
  ]) {
    const root = visualTemplate({ kind: "hero", hero: 0 }, detail);
    const faces = [];
    root.traverse((o) => {
      if (o.isMesh && o.material.map?.userData.faceTexture)
        faces.push(o.material.map);
    });
    assert.equal(faces.length, 1);
    assert.equal(faces[0].image.width, width);
    assert.equal(faces[0].image.height, width);
  }
  assert.ok((anatomyCacheStats().faceResolutions[2048] ?? 0) <= 4);
});

test("Master weapons: all 108 authored variants have metre bounds and fixed ornamental counts", () => {
  assert.equal(SOUL_WEAPON_SPEC[0].petalCount, 12);
  assert.equal(SOUL_WEAPON_SPEC[3].featherCount, 9);
  assert.equal(SOUL_WEAPON_SPEC[3].fanAngleDegrees, 120);
  assert.equal(SOUL_WEAPON_SPEC[6].petalCount, 8);
  assert.equal(SOUL_WEAPON_SPEC[9].clawsPerHand, 4);
  assert.equal(SOUL_WEAPON_SPEC[10].stringCount, 7);
  assert.equal(SOUL_WEAPON_SPEC[11].serpentCount, 2);
  for (let hero = 0; hero < 12; hero++)
    for (let skin = 0; skin < 3; skin++)
      for (const detail of ["high", "medium", "low"]) {
        const root = buildSoulWeapon(hero, detail, { skin });
        root.updateMatrixWorld(true);
        const size = sizeOf(root),
          length = hero === 10 ? size.x : size.y;
        near(length, SOUL_WEAPON_SPEC[hero].metricLength);
        root.traverse((o) => {
          if (o.isMesh)
            assert.ok(
              o.geometry.attributes.position.array.every(Number.isFinite),
            );
        });
      }
});

test("Ninh Tu presents the seven-string playing surface forward and her animated fingers meet it", () => {
  const root = visualTemplate({ kind: "hero", hero: 10 }, "high");
  const instrument = root.getObjectByName("soulWeapon");
  assert.equal(instrument.userData.stringCount, 7);
  assert.equal(instrument.userData.primitiveCounts.guqinString, 7);
  const stringMeshes = [];
  instrument.traverse((o) => {
    if (o.isMesh && o.material.emissiveIntensity === 1.6) stringMeshes.push(o);
  });
  assert.equal(
    stringMeshes.length,
    1,
    "seven string geometries share one emissive draw batch",
  );
  for (const time of [0, 0.5, 1.5, 3]) {
    animateVisual(
      root,
      { x: 0, z: 0, cooldowns: [0, 0, 0, 0, 0, 1] },
      time,
      1 / 60,
    );
    root.updateMatrixWorld(true);
    const normal = new Vector3(0, 0, 1).transformDirection(
      instrument.matrixWorld,
    );
    assert.ok(normal.y > 0.8, "soundboard must remain mostly horizontal");
    assert.ok(
      normal.dot(new Vector3(0, 0, -1)) > 0.45,
      "strings must face the frontal showcase instead of the torso",
    );
    const surface = new Box3()
      .setFromObject(stringMeshes[0])
      .getCenter(new Vector3());
    for (const side of ["L", "R"]) {
      const index = root.getObjectByName("Index" + side);
      const last = index.getObjectByName("Phalanx2");
      const fingertip = new Vector3(0, -0.0182, 0).applyMatrix4(
        last.matrixWorld,
      );
      const planeDistance = Math.abs(fingertip.sub(surface).dot(normal));
      assert.ok(
        planeDistance < 0.02,
        `${side} animated finger is ${planeDistance}m away from the strings`,
      );
    }
  }
});
