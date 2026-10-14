import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildCreatureVisual,
  animateCreatureVisual,
  creatureVisualSpecies,
} from "../src/creature-art.js";

function actor(species, extra = {}) {
  return {
    id: 120,
    kind: ["ape", "kirin", "dragon"].includes(species) ? "boss" : "beast",
    boss: { key: species },
    species,
    name: "Tên chiến đấu gốc",
    tier: 1,
    hp: 850,
    atk: 44,
    x: 0,
    z: 0,
    ...extra,
  };
}

function triangles(root) {
  let count = 0;
  root.traverse((o) => {
    if (o.isMesh)
      count +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  return count;
}

function bounds(root) {
  root.updateMatrixWorld(true);
  return new T.Box3().setFromObject(root);
}

test("Generic wildlife renders four distinct species while preserving combat data", () => {
  const selected = new Set(),
    dimensions = new Set();
  for (let id = 0; id < 4; id++) {
    const a = actor(undefined, { id }),
      before = structuredClone(a);
    selected.add(creatureVisualSpecies(a));
    const root = buildCreatureVisual(a, "medium");
    const size = bounds(root).getSize(new T.Vector3());
    dimensions.add(
      size
        .toArray()
        .map((n) => n.toFixed(3))
        .join(":"),
    );
    assert.deepEqual(a, before);
    assert.ok(
      root.getObjectByName("creatureHead") ||
        root.userData.creatureArt.species === "icebutterfly",
    );
  }
  assert.deepEqual([...selected].sort(), [
    "firebird",
    "icebutterfly",
    "rhino",
    "wolf",
  ]);
  assert.equal(dimensions.size, 4);
});

for (const [species, expected, dimension] of [
  ["ape", 4.5, "y"],
  ["kirin", 4, "y"],
  ["dragon", 12, "z"],
]) {
  test(`${species}: all LODs retain source dimensions and efficient low mesh`, () => {
    let previous = 0;
    for (const detail of ["low", "medium", "high"]) {
      const root = buildCreatureVisual(actor(species), detail);
      const box = bounds(root),
        size = box.getSize(new T.Vector3()),
        count = triangles(root);
      assert.ok(
        Math.abs(size[dimension] - expected) < 1e-5,
        `${detail}: ${dimension}=${size[dimension]}`,
      );
      assert.ok(Math.abs(box.min.y) < 1e-5, "terrain contact remains at zero");
      assert.ok(count > previous, "each LOD has additional visible geometry");
      previous = count;
      if (detail === "low") assert.ok(count < 2500, `${count} low triangles`);
      if (detail === "high")
        assert.ok(count >= 50000, `${count} high triangles`);
      root.traverse((o) => {
        if (!o.isMesh) return;
        assert.equal(o.geometry.userData.sharedArt, true);
        assert.equal(o.material.userData.sharedArt, true);
        assert.notEqual(o.geometry.type, "SphereGeometry");
        for (const value of o.geometry.attributes.position.array)
          assert.ok(Number.isFinite(value));
      });
    }
  });
}

test("Mutant visual scales by 1.35 and includes animated blood arcs without changing stats", () => {
  const a = actor("wolf"),
    original = structuredClone(a);
  const ordinary = buildCreatureVisual(a, "medium");
  const mutantActor = { ...a, mutant: true },
    before = structuredClone(mutantActor);
  const mutant = buildCreatureVisual(mutantActor, "medium");
  assert.ok(Math.abs(mutant.scale.x / ordinary.scale.x - 1.35) < 1e-8);
  const arcs = mutant.getObjectByName("creatureBloodArcs");
  assert.ok(arcs);
  animateCreatureVisual(mutant, mutantActor, 1, 1 / 60);
  assert.notEqual(arcs.rotation.y, 0);
  assert.deepEqual(a, original);
  assert.deepEqual(mutantActor, before);
});

test("Cached meshes share GPU resources while animated clones retain independent joints", () => {
  const a = actor("wolf"),
    first = buildCreatureVisual(a, "medium"),
    second = buildCreatureVisual(a, "medium");
  assert.notEqual(first, second);
  assert.notEqual(
    first.getObjectByName("creatureTail"),
    second.getObjectByName("creatureTail"),
  );
  const firstMeshes = [],
    secondMeshes = [];
  first.traverse((o) => {
    if (o.isMesh) firstMeshes.push(o);
  });
  second.traverse((o) => {
    if (o.isMesh) secondMeshes.push(o);
  });
  assert.equal(firstMeshes.length, secondMeshes.length);
  for (let i = 0; i < firstMeshes.length; i++) {
    assert.equal(firstMeshes[i].geometry, secondMeshes[i].geometry);
    assert.equal(firstMeshes[i].material, secondMeshes[i].material);
  }
  animateCreatureVisual(first, a, 0.4, 1 / 60);
  assert.notEqual(first.getObjectByName("creatureTail").rotation.y, 0);
  assert.equal(second.getObjectByName("creatureTail").rotation.y, 0);
});

test("Flying species animate independent wing joints and dragon void smoke", () => {
  for (const species of ["firebird", "icebutterfly", "dragon"]) {
    const a = actor(species),
      before = structuredClone(a),
      root = buildCreatureVisual(a, "medium");
    const wings = [-1, 1].map((side) =>
      root.getObjectByName(`creatureWing:${side}`),
    );
    assert.ok(wings.every(Boolean));
    const rotations = wings.map((wing) => wing.rotation.toArray());
    animateCreatureVisual(root, a, 0.7, 1 / 60);
    for (let i = 0; i < wings.length; i++)
      assert.notDeepEqual(wings[i].rotation.toArray(), rotations[i]);
    if (species === "dragon") {
      const smoke = root.getObjectByName("creatureSmoke");
      assert.ok(smoke);
      assert.notEqual(smoke.rotation.y, 0);
      assert.ok(
        smoke.children.some(
          (o) => o.isMesh && o.material.transparent && !o.material.depthWrite,
        ),
      );
    }
    assert.deepEqual(a, before);
  }
});
