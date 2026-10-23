import { Quaternion } from "three";

/** Diagnostic joint interpolation, not an authored/contact-constrained clip. */
export function interpolatePose(bind, target, t) {
  if (!Number.isFinite(t) || t < 0 || t > 1 || target.scales)
    throw Error("Invalid diagnostic pose interpolation");
  const names = Object.keys(bind.rotations).sort();
  if (
    JSON.stringify(names) !==
    JSON.stringify(Object.keys(target.rotations).sort())
  )
    throw Error("Every bound joint must have a target rotation");
  const rotations = {},
    translations = {};
  for (const name of names) {
    const a = bind.rotations[name],
      b = target.rotations[name];
    for (const q of [a, b])
      if (
        q.length !== 4 ||
        !q.every(Number.isFinite) ||
        Math.abs(Math.hypot(...q) - 1) > 1e-6
      )
        throw Error("Invalid unit quaternion " + name);
    rotations[name] = new Quaternion()
      .fromArray(a)
      .slerp(new Quaternion().fromArray(b), t)
      .toArray();
    const p = bind.translations[name],
      q = target.translations?.[name] ?? p;
    for (const value of [p, q])
      if (!value || value.length !== 3 || !value.every(Number.isFinite))
        throw Error("Invalid joint translation " + name);
    translations[name] = p.map((v, i) => v + (q[i] - v) * t);
  }
  for (const name of Object.keys(target.translations ?? {}))
    if (!names.includes(name))
      throw Error("Unknown target translation " + name);
  return {
    rotations,
    translations,
    t,
    poseDataValid: true,
    passed: false,
    accepted: false,
    activated: false,
    scope:
      "Diagnostic bind-to-crouch joint interpolation only. Not an authored Gemini timeline, contact solution, or animation acceptance.",
  };
}
