import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../src/world.js";
import { visualTemplate } from "../src/art.js";
const equipment = (root) => {
  const result = [];
  root.traverse((node) => {
    if (
      node.name === "soulWeapon" ||
      (node.userData.proceduralMasterwork === true &&
        typeof node.userData.weaponType === "string")
    )
      result.push(node);
  });
  return result;
};
const make = (hero, detail = "medium") =>
  visualTemplate(
    { kind: "hero", hero, skin: 0, costume: 0, rings: [] },
    detail,
  );
for (let hero = 0; hero < 12; hero++)
  test(
    "face showcase hides/restores only weapon roots for H" +
      String(hero + 1).padStart(2, "0"),
    () => {
      const world = Object.create(World.prototype),
        preview = make(hero);
      world.preview = preview;
      preview.rotation.y = 1.17;
      const gear = equipment(preview),
        original = new Map();
      preview.traverse((node) => original.set(node, node.visible));
      assert.ok(gear.length >= 1);
      if (hero === 2 || hero === 9)
        assert.ok(gear.length >= 2, "Both hand weapons must be covered");
      world.setShowcaseView("face");
      assert.ok(gear.every((node) => node.visible === false));
      preview.traverse((node) => {
        if (!gear.includes(node))
          assert.equal(
            node.visible,
            original.get(node),
            "Portrait must preserve nonweapon visibility: " + node.name,
          );
      });
      assert.equal(preview.rotation.y, 1.17);
      world.setShowcaseView("full");
      preview.traverse((node) =>
        assert.equal(node.visible, original.get(node)),
      );
      assert.equal(preview.rotation.y, 1.17);
    },
  );
test("H08 high portrait affects neither cached/fresh/gameplay clones nor visibility restored after hero replacement", () => {
  const world = Object.create(World.prototype),
    first = make(7, "high"),
    gameplay = make(7, "high");
  world.preview = first;
  const firstGear = equipment(first),
    gameplayGear = equipment(gameplay);
  assert.ok(firstGear.length > 0);
  firstGear[0].visible = false;
  world.setShowcaseView("face");
  assert.ok(firstGear.every((node) => !node.visible));
  assert.ok(gameplayGear.every((node) => node.visible));
  const fresh = make(7, "high");
  assert.ok(
    equipment(fresh).every((node) => node.visible),
    "Cached template must remain unchanged",
  );
  world.setShowcaseView("full");
  assert.equal(
    firstGear[0].visible,
    false,
    "Originally hidden equipment must remain hidden",
  );
  world.setShowcaseView("face");
  world.preview = make(2);
  world.syncPortraitEquipment(world.preview, true);
  assert.ok(equipment(world.preview).every((node) => !node.visible));
  world.setShowcaseView("full");
  assert.ok(equipment(world.preview).every((node) => node.visible));
  assert.ok(gameplayGear.every((node) => node.visible));
});
