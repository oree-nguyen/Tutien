import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  classifyAnimationGate,
  validateAnimationGoalSpec,
} from "../scripts/check-animation-goal.mjs";
const original = JSON.parse(
  await fs.readFile("acceptance/goals/rig-animation-gemini.json"),
);
test("goal refuses removing device or mesh scope and refuses relaxed limits", () => {
  assert.doesNotThrow(() => validateAnimationGoalSpec(original));
  const missing = structuredClone(original);
  missing.required = missing.required.filter(
    (g) => g.id !== "ANDROID_PHYSICAL",
  );
  assert.throws(() => validateAnimationGoalSpec(missing), /goal gate/);
  const relaxed = structuredClone(original);
  relaxed.thresholds.edgeMaximum = 2.01;
  assert.throws(() => validateAnimationGoalSpec(relaxed), /weakened/);
});
test("stale, absent, nonboolean and self-labelled pass cannot complete a gate", () => {
  assert.equal(classifyAnimationGate("FINGERS", null, "current").passed, false);
  assert.equal(
    classifyAnimationGate(
      "FINGERS",
      { sourceHash: "old", passed: true },
      "current",
    ).passed,
    false,
  );
  assert.equal(
    classifyAnimationGate(
      "FINGERS",
      { sourceHash: "current", passed: "true", status: "passed" },
      "current",
    ).status,
    "failed",
  );
  assert.equal(
    classifyAnimationGate(
      "FINGERS",
      { sourceHash: "current", passed: false, status: "passed" },
      "current",
    ).status,
    "failed",
  );
});
