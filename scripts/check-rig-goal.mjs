import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { fingerprint } from "./fingerprint.mjs";

const requiredIds = [
  "garment",
  "skin",
  "contact",
  "animation",
  "runtime",
  "tests",
  "apk",
  "publish",
];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const validHash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const io = () => new NodeIO().registerExtensions(ALL_EXTENSIONS);

export function rigClipHashes(doc) {
  const nodes = doc.getRoot().listNodes(),
    hashes = {};
  for (const name of ["Entrance", "IDLE_HOLD"]) {
    const clips = doc
      .getRoot()
      .listAnimations()
      .filter((a) => a.getName() === name);
    if (clips.length !== 1 || !clips[0].listChannels().length)
      throw Error("Missing or ambiguous nonempty clip: " + name);
    hashes[name] = digest(
      JSON.stringify(
        clips[0].listChannels().map((c) => {
          const sampler = c.getSampler(),
            input = sampler.getInput().getArray(),
            output = sampler.getOutput().getArray();
          return {
            nodeIndex: nodes.indexOf(c.getTargetNode()),
            path: c.getTargetPath(),
            interpolation: sampler.getInterpolation() ?? "LINEAR",
            input: digest(
              Buffer.from(input.buffer, input.byteOffset, input.byteLength),
            ),
            output: digest(
              Buffer.from(output.buffer, output.byteOffset, output.byteLength),
            ),
          };
        }),
      ),
    );
  }
  return hashes;
}

async function boundFile(record, root) {
  if (
    !record ||
    typeof record.file !== "string" ||
    !record.file ||
    !validHash(record.sha256)
  )
    throw Error("Missing file/SHA-256 binding");
  const file = path.resolve(root, record.file),
    bytes = await fs.readFile(file);
  if (digest(bytes) !== record.sha256)
    throw Error("Stale file SHA-256: " + record.file);
  return { ...record, file, bytes };
}

// Only validators which actually run here can certify their registered scope.
// Existing FK reports explicitly exclude the complete reference Entrance and
// contact sequence. Those reports cannot complete the animation condition.
const registry = {
  "all-meshes": {
    condition: "skin",
    script: "tools/rig/validate-all-meshes.mjs",
  },
  "fk-animation": {
    condition: null,
    script: "tools/rig/validate-fk-animation.mjs",
    reason:
      "FK diagnostics do not certify the complete reference Entrance/contact sequence",
  },
};
async function freshValidator(kind, hero, binding, root) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "rig-goal-"));
  try {
    const output = path.join(temporary, "report.json");
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [registry[kind].script], {
        cwd: root,
        stdio: ["ignore", "ignore", "pipe"],
        env: {
          ...process.env,
          HERO: hero,
          RIG_FILE: binding.asset.file,
          REFERENCE_POSE: binding.pose.file,
          RIG_REPORT_FILE: output,
        },
      });
      child.stderr.resume();
      child.on("error", reject);
      child.on("exit", resolve);
    });
    if (code !== 0)
      throw Error("Fresh " + kind + " validator failed (exit " + code + ")");
    return JSON.parse(await fs.readFile(output));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
function checkSkinReport(report, binding) {
  if (
    report.passed !== true ||
    report.sha256 !== binding.asset.sha256 ||
    report.poseSha256 !== binding.pose.sha256 ||
    report.edgeStrainPassed !== true ||
    report.provenancePassed !== true ||
    report.sourceCoverage?.passed !== true ||
    report.seams?.passed !== true ||
    !(report.seams.pairs > 0) ||
    report.seams.maximumMillimetres > 0.001 ||
    report.seams.invalidPositions !== 0 ||
    !Array.isArray(report.meshes) ||
    !report.meshes.length
  )
    throw Error(
      "All-mesh report failed or does not identify the bound asset/pose and measured seams",
    );
  for (const mesh of report.meshes)
    if (
      mesh.passed !== true ||
      mesh.sourceProvenance?.verified !== true ||
      mesh.thresholds?.p999 !== 1.5 ||
      mesh.thresholds?.maximum !== 2 ||
      !Number.isFinite(mesh.p999) ||
      mesh.p999 > 1.5 ||
      !Number.isFinite(mesh.maximum) ||
      mesh.maximum > 2 ||
      !(mesh.edges > 0) ||
      !(mesh.triangles > 0)
    )
      throw Error(
        "All-mesh report has missing coverage or changed strain limits",
      );
}

/** No status string or saved passed:true substitutes for current bound evidence. */
export async function verifyRigGoal(goal, options = {}) {
  const root = options.root ?? process.cwd(),
    run = options.runValidator ?? freshValidator;
  const results = [],
    conditions = Array.isArray(goal.required) ? goal.required : [];
  const verification = goal.verification;
  let sourceHash, bindingsPromise;
  const bindings = () =>
    (bindingsPromise ??= (async () => {
      if (verification?.version !== 1 || !validHash(verification.sourceHash))
        throw Error("Missing verification v1/current source fingerprint");
      sourceHash = await (options.fingerprint ?? fingerprint)();
      if (verification.sourceHash !== sourceHash)
        throw Error("Stale source fingerprint");
      const verified = {};
      for (const hero of ["H01", "H02"]) {
        const entry = verification.heroes?.[hero];
        if (!entry)
          throw Error("Missing asset/pose/weapon/clip bindings for " + hero);
        const asset = await boundFile(entry.asset, root),
          pose = await boundFile(entry.pose, root),
          weapon = await boundFile(entry.weapon, root);
        const hashes = rigClipHashes(await io().readBinary(asset.bytes));
        for (const name of ["Entrance", "IDLE_HOLD"])
          if (entry.clips?.[name] !== hashes[name])
            throw Error("Stale " + hero + " " + name + " clip hash");
        verified[hero] = { asset, pose, weapon, clips: hashes };
      }
      return verified;
    })());
  for (const id of requiredIds) {
    const matches = conditions.filter((c) => c.id === id),
      condition = matches[0];
    try {
      if (matches.length !== 1)
        throw Error("Missing or duplicate required condition");
      if (condition.status !== "completed")
        throw Error(condition.status ?? "not completed");
      if (!Array.isArray(condition.evidence) || !condition.evidence.length)
        throw Error(
          "No registered hash-bound evidence; status alone is insufficient",
        );
      const current = await bindings();
      const heroes = new Set();
      for (const evidence of condition.evidence) {
        const registered = registry[evidence.validator];
        if (!registered || registered.condition !== id)
          throw Error(
            registered?.reason ??
              "No complete verifier registered for this condition/evidence",
          );
        if (
          !["H01", "H02"].includes(evidence.hero) ||
          heroes.has(evidence.hero)
        )
          throw Error("Missing, duplicate or invalid hero evidence");
        heroes.add(evidence.hero);
        const receipt = await boundFile(evidence.report, root),
          report = JSON.parse(receipt.bytes);
        checkSkinReport(report, current[evidence.hero]);
        const fresh = await run(
          evidence.validator,
          evidence.hero,
          current[evidence.hero],
          root,
        );
        checkSkinReport(fresh, current[evidence.hero]);
      }
      if (heroes.size !== 2)
        throw Error("Both H01 and H02 need independent evidence");
      results.push({
        id,
        passed: true,
        reason: "Current hash bindings and fresh registered validators passed",
      });
    } catch (error) {
      results.push({ id, passed: false, reason: error.message });
    }
  }
  if (conditions.some((c) => !requiredIds.includes(c.id)))
    results.push({
      id: "schema",
      passed: false,
      reason: "Unknown required condition",
    });
  return {
    passed: goal.status === "completed" && results.every((r) => r.passed),
    results,
    sourceHash,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const goal = JSON.parse(await fs.readFile("acceptance/goals/rig-apk.json"));
  const report = await verifyRigGoal(goal);
  for (const condition of report.results)
    console.log(
      (condition.passed ? "PASS " : "BLOCKED ") +
        condition.id +
        ": " +
        condition.reason,
    );
  console.log(
    report.passed
      ? "RIG/APK GOAL COMPLETE"
      : "RIG/APK GOAL BLOCKED — do not claim 100%",
  );
  process.exitCode = report.passed ? 0 : 1;
}
