import test from "node:test";
import assert from "node:assert/strict";
import {
  GEMINI_TIMING,
  evaluateGeminiTiming,
} from "../src/rig/gemini-timing-contract.js";
function reference(hero) {
  const c = GEMINI_TIMING[hero],
    s = {
      0: { visible: false },
      45: { visible: false },
      46: { visible: true },
    };
  for (const k of c.pelvis)
    s[k.frame] = { visible: true, hips: k.p.map((x) => x ?? 0.18) };
  return s;
}
test("literal reference trajectories pass their timing scope without certifying skin", () => {
  for (const h of ["H01", "H02"]) {
    const r = evaluateGeminiTiming(h, reference(h));
    assert.equal(r.passed, true);
    assert.match(r.scope, /does not certify/);
  }
});
test("monotonic H01 emergence and frozen landing are rejected even with correct duration", () => {
  const s = reference("H01");
  s[52].hips[1] = 0.12679;
  s[60].hips[1] = 0.43;
  s[65].hips[1] = 0.43;
  s[95].hips[1] = 0.43;
  const r = evaluateGeminiTiming("H01", s);
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes("apex-and-descent"));
  assert.ok(r.failures.includes("landing-damping"));
});
test("one-frame late visibility and missing snapshots cannot pass", () => {
  const s = reference("H02");
  s[46].visible = false;
  delete s[145];
  const r = evaluateGeminiTiming("H02", s);
  assert.ok(r.failures.includes("visibility@46"));
  assert.ok(r.failures.includes("pelvis@145"));
});
