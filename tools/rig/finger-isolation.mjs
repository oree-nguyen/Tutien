import assert from "node:assert/strict";

/** Keep every non-target joint at bind; do not rename or weaken the full pose. */
export function isolateFingerPose(bind, articulated, side, finger) {
  assert(["Left", "Right"].includes(side));
  assert(["Thumb", "Index", "Middle", "Ring", "Pinky"].includes(finger));
  const names = Object.keys(bind.rotations).sort();
  assert.deepEqual(Object.keys(articulated.rotations).sort(), names);
  assert.deepEqual(Object.keys(bind.translations).sort(), names);
  const changedJoints = [1, 2, 3].map(i => side + "Hand" + finger + i);
  assert(changedJoints.every(n => names.includes(n)), "Missing actual finger chain");
  const rotations = {}, translations = {};
  for (const name of names) {
    for (const pose of [bind, articulated]) {
      const q = pose.rotations[name];
      assert(q?.length === 4 && q.every(Number.isFinite));
      assert(Math.abs(Math.hypot(...q) - 1) < 1e-6, "Invalid pose quaternion");
    }
    const p = bind.translations[name];
    assert(p?.length === 3 && p.every(Number.isFinite));
    rotations[name] = [...(changedJoints.includes(name) ? articulated : bind).rotations[name]];
    translations[name] = [...p];
  }
  return {rotations, translations, changedJoints};
}
