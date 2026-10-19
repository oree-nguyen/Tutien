import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";
import { rigClipHashes, verifyRigGoal } from "../scripts/check-rig-goal.mjs";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ids = [
  "garment",
  "skin",
  "contact",
  "animation",
  "runtime",
  "tests",
  "apk",
  "publish",
];
const sourceHash = "a".repeat(64);
async function fixture(action) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "rig-goal-fixture-"),
  );
  try {
    const doc = new Document(),
      buffer = doc.createBuffer(),
      node = doc.createNode("Hip");
    doc.createScene().addChild(node);
    const attr = (type, array) =>
      doc.createAccessor("", buffer).setType(type).setArray(array);
    for (const name of ["Entrance", "IDLE_HOLD"]) {
      const animation = doc.createAnimation(name);
      const sampler = doc
        .createAnimationSampler()
        .setInput(attr(Accessor.Type.SCALAR, new Float32Array([0, 1])))
        .setOutput(
          attr(Accessor.Type.VEC4, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1])),
        );
      animation
        .addSampler(sampler)
        .addChannel(
          doc
            .createAnimationChannel()
            .setTargetNode(node)
            .setTargetPath("rotation")
            .setSampler(sampler),
        );
    }
    const assetBytes = await new NodeIO().writeBinary(doc),
      clips = rigClipHashes(doc);
    async function file(name, value) {
      const bytes =
        typeof value === "string" || value instanceof Uint8Array
          ? value
          : JSON.stringify(value);
      const output = path.join(directory, name);
      await fs.writeFile(output, bytes);
      return { file: output, sha256: hash(bytes) };
    }
    const asset = await file("asset.glb", assetBytes),
      pose = await file("pose.json", { passed: true, rotations: {} }),
      weapon = await file("weapon.glb", "source weapon bytes");
    const heroes = Object.fromEntries(
      ["H01", "H02"].map((hero) => [
        hero,
        { asset, pose, weapon, clips: { ...clips } },
      ]),
    );
    const report = {
      passed: true,
      sha256: asset.sha256,
      poseSha256: pose.sha256,
      edgeStrainPassed: true,
      provenancePassed: true,
      sourceCoverage: { passed: true },
      seams: {
        passed: true,
        pairs: 1,
        maximumMillimetres: 0,
        invalidPositions: 0,
      },
      meshes: [
        {
          passed: true,
          sourceProvenance: { verified: true },
          thresholds: { p999: 1.5, maximum: 2 },
          p999: 1,
          maximum: 1,
          edges: 3,
          triangles: 1,
        },
      ],
    };
    const receipt = await file("report.json", report);
    const goal = {
      status: "completed",
      verification: { version: 1, sourceHash, heroes },
      required: ids.map((id) => ({
        id,
        status: id === "skin" ? "completed" : "blocked",
        evidence:
          id === "skin"
            ? ["H01", "H02"].map((hero) => ({
                hero,
                validator: "all-meshes",
                report: receipt,
              }))
            : undefined,
      })),
    };
    const options = {
      fingerprint: async () => sourceHash,
      runValidator: async () => structuredClone(report),
    };
    return await action({ goal, options, report, receipt, file, directory });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
const skin = (result) => result.results.find((r) => r.id === "skin");
test("changing every status to completed cannot manufacture goal completion", async () => {
  const result = await verifyRigGoal({
    status: "completed",
    required: ids.map((id) => ({ id, status: "completed" })),
  });
  assert.equal(result.passed, false);
  assert.equal(
    result.results.every((r) => r.passed === false),
    true,
  );
  assert.equal(
    result.results.every((r) => /status alone/.test(r.reason)),
    true,
  );
});
test("bound evidence is followed by a fresh registered validator for each hero", async () =>
  fixture(async ({ goal, options }) => {
    const calls = [];
    options.runValidator = async (kind, hero, binding) => {
      calls.push({ kind, hero, binding });
      return {
        ...JSON.parse(
          await fs.readFile(goal.required[1].evidence[0].report.file),
        ),
      };
    };
    const result = await verifyRigGoal(goal, options);
    assert.equal(skin(result).passed, true);
    assert.deepEqual(
      calls.map((c) => [c.kind, c.hero]),
      [
        ["all-meshes", "H01"],
        ["all-meshes", "H02"],
      ],
    );
    assert.equal(result.passed, false); // Other user conditions are still blocked.
  }));
for (const kind of [
  "source",
  "asset",
  "pose",
  "weapon",
  "clip",
  "receipt",
  "report-asset",
  "report-pose",
  "threshold",
  "one-hero",
  "validator-scope",
]) {
  test(
    "goal rejects stale, unrelated or incomplete evidence: " + kind,
    async () =>
      fixture(async ({ goal, options, report, file }) => {
        if (kind === "source") goal.verification.sourceHash = "b".repeat(64);
        if (["asset", "pose", "weapon"].includes(kind))
          goal.verification.heroes.H01[kind] = {
            ...goal.verification.heroes.H01[kind],
            sha256: "b".repeat(64),
          };
        if (kind === "clip")
          goal.verification.heroes.H01.clips.IDLE_HOLD = "b".repeat(64);
        if (kind === "receipt")
          goal.required[1].evidence[0].report = {
            ...goal.required[1].evidence[0].report,
            sha256: "b".repeat(64),
          };
        if (["report-asset", "report-pose", "threshold"].includes(kind)) {
          if (kind === "report-asset") report.sha256 = "b".repeat(64);
          if (kind === "report-pose") report.poseSha256 = "b".repeat(64);
          if (kind === "threshold") report.meshes[0].thresholds.maximum = 200;
          goal.required[1].evidence[0].report = await file(
            "bad-report.json",
            report,
          );
        }
        if (kind === "one-hero") goal.required[1].evidence.pop();
        if (kind === "validator-scope")
          goal.required[1].evidence[0].validator = "fk-animation";
        const result = await verifyRigGoal(goal, options);
        assert.equal(result.passed, false);
        assert.equal(skin(result).passed, false);
      }),
  );
}
test("a saved passing report cannot override a failing fresh validator", async () =>
  fixture(async ({ goal, options }) => {
    options.runValidator = async () => {
      throw Error("Fresh all-meshes validator failed (exit 1)");
    };
    const result = await verifyRigGoal(goal, options);
    assert.equal(skin(result).passed, false);
    assert.match(skin(result).reason, /Fresh all-meshes validator failed/);
  }));
test("default fresh runner really rejects an asset with clips but no mesh or skin", async () =>
  fixture(async ({ goal, options }) => {
    delete options.runValidator;
    const result = await verifyRigGoal(goal, options);
    assert.equal(skin(result).passed, false);
    assert.match(
      skin(result).reason,
      /Fresh all-meshes validator failed \(exit 1\)/,
    );
  }));
test("missing user conditions cannot disappear from the goal", async () => {
  const result = await verifyRigGoal({ status: "completed", required: [] });
  assert.equal(result.passed, false);
  assert.equal(result.results.length, 8);
  assert(result.results.every((r) => /Missing or duplicate/.test(r.reason)));
});
