import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { fingerprint } from "./fingerprint.mjs";
import { validateRuntimeAnimation } from "../tools/rig/validate-runtime-animation.mjs";
const hash = (b) => createHash("sha256").update(b).digest("hex");
export const REQUIRED_ANIMATION_GATES = Object.freeze([
  "SOURCES",
  "RUNTIME_MODES",
  "BIND",
  "SKIN_ALL_FRAMES",
  "PROVENANCE",
  "H01_TIMING",
  "H02_TIMING",
  "CROUCH",
  "H01_ARM",
  "H02_GRIP_CONTINUITY",
  "FINGERS",
  "FEET",
  "WEAPONS",
  "CONTINUITY",
  "VFX",
  "COMBAT",
  "FIDELITY",
  "CACHE",
  "REGRESSION",
  "APK_ANIMATION",
  "H01_SLEEVES_LAST",
  "PUBLISH",
  "ANDROID_PHYSICAL",
]);
export function validateAnimationGoalSpec(spec) {
  if (
    JSON.stringify(spec.required?.map((g) => g.id).sort()) !==
    JSON.stringify([...REQUIRED_ANIMATION_GATES].sort())
  )
    throw Error("Missing, duplicate or unsupported goal gate");
  if (
    spec.thresholds.edgeP999 !== 1.5 ||
    spec.thresholds.edgeMaximum !== 2 ||
    spec.thresholds.contactMetres !== 0.005 ||
    spec.thresholds.keptSeamMetres !== 0.000001 ||
    JSON.stringify(spec.thresholds.animationSampleHz) !== "[60,120]"
  )
    throw Error("Goal thresholds cannot be weakened");
}
export function classifyAnimationGate(id, proof, sourceHash) {
  if (!proof)
    return {
      id,
      status: "blocked",
      passed: false,
      reason:
        "No registered fresh validator has established this complete scope",
    };
  if (proof.sourceHash !== sourceHash)
    return {
      id,
      status: "blocked",
      passed: false,
      reason: "Stale or unbound source evidence",
    };
  const passed = proof.passed === true;
  return { ...proof, id, status: passed ? "passed" : "failed", passed };
}
async function run(command, args, log, env = {}) {
  const stream = await fs.open(log, "w");
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      const c = spawn(command, args, {
        stdio: ["ignore", stream.fd, stream.fd],
        env: { ...process.env, ...env },
      });
      c.on("error", reject);
      c.on("exit", resolve);
    });
  } finally {
    await stream.close();
  }
  return code;
}
export async function checkAnimationGoal() {
  const specFile = "acceptance/goals/rig-animation-gemini.json",
    specBytes = await fs.readFile(specFile),
    spec = JSON.parse(specBytes),
    startHash = await fingerprint(),
    folder = "docs/anim-report/conver10-approved-repair-2026-10-21",
    iteration = path.join(
      folder,
      "iterations",
      new Date().toISOString().replace(/[:.]/g, "-"),
    );
  await fs.mkdir(iteration, { recursive: true });
  const evidence = new Map(),
    sources = [];
  validateAnimationGoalSpec(spec);
  for (const input of [...spec.sourceAssets, ...spec.references]) {
    try {
      const actual = hash(await fs.readFile(input.file));
      sources.push({ ...input, actual, passed: actual === input.sha256 });
    } catch (error) {
      sources.push({
        ...input,
        passed: false,
        error: error.code ?? error.message,
      });
    }
  }
  const requirements = JSON.parse(
    await fs.readFile(
      "docs/anim-report/conver10-gemini-audit-2026-10-21/requirements.json",
    ),
  );
  const ids = requirements.narrativeRequirements.map((r) => r.id).sort(),
    coverage =
      JSON.stringify(ids) ===
      JSON.stringify([...spec.referenceRequirements].sort());
  evidence.set("SOURCES", {
    sourceHash: startHash,
    passed: sources.every((r) => r.passed) && coverage,
    coverage,
    sources,
  });
  const browserReport = path.join(iteration, "showcase.json");
  const browserLog = path.join(iteration, "browser.log"),
    browserExit = await run(
      process.execPath,
      ["tests/showcase-mode-browser.mjs"],
      browserLog,
      { SHOWCASE_REPORT: browserReport },
    );
  let browser;
  try {
    browser = JSON.parse(await fs.readFile(browserReport));
  } catch {}
  evidence.set("RUNTIME_MODES", {
    passed:
      browserExit === 0 &&
      browser?.passed === true &&
      browser?.sourceHash === startHash &&
      browser?.states?.length === 16 &&
      browser?.parity?.length === 10,
    browserExit,
    sourceHash: browser?.sourceHash,
    states: browser?.states?.length,
    log: browserLog,
  });
  const surface = await validateRuntimeAnimation({
    output: path.join(iteration, "surface.json"),
    onProgress: (progress) => console.log("SURFACE", JSON.stringify(progress)),
  });
  evidence.set("SKIN_ALL_FRAMES", {
    sourceHash: surface.sourceHash,
    passed:
      surface.sourceHash === startHash &&
      surface.passed &&
      surface.coverage?.combat === true &&
      !Object.values(surface.heroes).some((h) => h.staging),
    report: path.join(iteration, "surface.json"),
    heroes: Object.fromEntries(
      Object.entries(surface.heroes).map(([h, r]) => [
        h,
        {
          p999: r.worstP999,
          maximum: r.worstMaximum,
          failures: r.failures,
          primitives: r.primitives.length,
          sampleRates: r.sampleRates,
        },
      ]),
    ),
  });
  for (const hero of ["H01", "H02"])
    evidence.set(hero + "_TIMING", {
      sourceHash: surface.sourceHash,
      ...surface.heroes[hero].timing,
    });
  const commands = [];
  for (const name of ["test", "test:master", "verify:master", "goal:rig"]) {
    const log = path.join(iteration, name.replaceAll(":", "-") + ".log"),
      exitCode = await run("npm", ["run", name], log);
    commands.push({ command: "npm run " + name, exitCode, log });
    console.log("REGRESSION", name, exitCode);
  }
  evidence.set("REGRESSION", {
    sourceHash: startHash,
    passed: commands.every((c) => c.exitCode === 0),
    commands,
  });
  const gates = spec.required.map((g) => ({
      ...g,
      ...classifyAnimationGate(g.id, evidence.get(g.id), startHash),
    })),
    endHash = await fingerprint();
  const report = {
    goal: spec.id,
    specSha256: hash(specBytes),
    sourceHash: startHash,
    stableSource: startHash === endHash,
    passed: startHash === endHash && gates.every((g) => g.passed),
    recordedAt: new Date().toISOString(),
    iteration,
    gates,
    scope:
      "Every goal gate is mandatory. A narrow validator cannot approve unknown hand/cloth/combat/APK/device scope. Existing rig goal and master gates remain unchanged.",
  };
  await fs.writeFile(
    path.join(iteration, "goal.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(folder, "goal-latest.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  for (const gate of gates) console.log(gate.status.toUpperCase(), gate.id);
  console.log(
    report.passed
      ? "GOAL COMPLETE"
      : "GOAL INCOMPLETE — no completion percentage assigned",
  );
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await checkAnimationGoal();
  process.exitCode = result.passed ? 0 : 1;
}
