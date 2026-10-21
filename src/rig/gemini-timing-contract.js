/** Literal pelvis keypoints from the two SHA-bound Gemini documents.
 * No local Euler comparison: these are model-space Three positions in metres.
 */
export const GEMINI_TIMING = Object.freeze({
  H01: {
    visibleFrame: 46,
    pelvis: [
      { frame: 46, p: [0, 0.15, -0.02] },
      { frame: 52, p: [0, 0.78, -0.01] },
      { frame: 60, p: [0, 0.52, -0.04] },
      { frame: 65, p: [0, 0.495, -0.048] },
      { frame: 95, p: [0, 0.52, -0.04] },
      { frame: 112, p: [0.135, 0.652, -0.025] },
      { frame: 125, p: [0.292, 0.806, -0.012] },
      { frame: 138, p: [0.425, 0.935, -0.002] },
      { frame: 145, p: [0.45, 0.96, 0] },
      { frame: 180, p: [0.45, 0.96, 0] },
    ],
  },
  H02: {
    visibleFrame: 46,
    pelvis: [
      { frame: 46, p: [-0.04, 2.4, -0.02] },
      { frame: 60, p: [-0.04, 0.54, -0.04] },
      { frame: 65, p: [-0.04, 0.518, -0.048] },
      { frame: 95, p: [-0.04, 0.54, -0.04] },
      { frame: 112, p: [null, 0.68, -0.028] },
      { frame: 128, p: [null, 0.865, -0.01] },
      { frame: 140, p: [null, 0.985, -0.002] },
      { frame: 145, p: [null, 1.005, 0] },
      { frame: 180, p: [null, 1.005, 0] },
    ],
  },
});
export function evaluateGeminiTiming(hero, samples) {
  const contract = GEMINI_TIMING[hero];
  if (!contract) throw Error("Unknown Gemini hero");
  const failures = [],
    checks = [],
    tolerance = 0.01;
  for (const frame of [0, 45, 46]) {
    const sample = samples[frame],
      expected = frame >= contract.visibleFrame;
    const passed = sample?.visible === expected;
    checks.push({
      kind: "visibility",
      frame,
      expected,
      actual: sample?.visible ?? null,
      passed,
    });
    if (!passed) failures.push("visibility@" + frame);
  }
  for (const key of contract.pelvis) {
    const sample = samples[key.frame],
      actual = sample?.hips,
      errors = key.p.map((value, axis) =>
        value === null
          ? null
          : Array.isArray(actual) && Number.isFinite(actual[axis])
            ? actual[axis] - value
            : null,
      ),
      passed = errors.every(
        (error, axis) =>
          key.p[axis] === null ||
          (error !== null && Math.abs(error) <= tolerance),
      );
    checks.push({
      kind: "pelvis",
      frame: key.frame,
      target: key.p,
      actual: actual ?? null,
      errors,
      passed,
    });
    if (!passed) failures.push("pelvis@" + key.frame);
  }
  const landing = samples[60]?.hips?.[1],
    dip = samples[65]?.hips?.[1],
    settled = samples[95]?.hips?.[1],
    compression =
      Number.isFinite(landing) && Number.isFinite(dip) ? landing - dip : null,
    rebound =
      Number.isFinite(settled) && Number.isFinite(dip) ? settled - dip : null;
  const damped =
    compression !== null &&
    rebound !== null &&
    compression >= 0.015 &&
    rebound >= 0.015;
  checks.push({
    kind: "landing-damping",
    compression,
    rebound,
    passed: damped,
  });
  if (!damped) failures.push("landing-damping");
  if (hero === "H01") {
    const apex = samples[52]?.hips?.[1],
      start = samples[46]?.hips?.[1],
      land = samples[60]?.hips?.[1],
      passed =
        [apex, start, land].every(Number.isFinite) &&
        apex > start + 0.3 &&
        apex > land + 0.2;
    checks.push({ kind: "apex-and-descent", passed });
    if (!passed) failures.push("apex-and-descent");
  }
  return {
    passed: failures.length === 0,
    scope:
      "Literal model-space pelvis timing/visibility only; does not certify limb pose, skin, surface grip or camera",
    toleranceMetres: tolerance,
    failures,
    checks,
  };
}
