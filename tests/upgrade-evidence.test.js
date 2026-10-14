import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateUpgradeEvidence } from "../scripts/upgrade-evidence.mjs";

const sourceHash = "a".repeat(64),
  required = JSON.parse(
    await readFile(
      new URL("../acceptance/visual-requirements.json", import.meta.url),
      "utf8",
    ),
  ).required,
  png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6F7sAAAAASUVORK5CYII=",
    "base64",
  ),
  functionalKeys = [
    "launch",
    "landscape",
    "touchCombat",
    "extraction",
    "resume",
  ],
  ergonomicKeys = [
    "joystick",
    "skills",
    "skillCancel",
    "shop",
    "drawer",
    "contextActions",
    "noTouchOverlap",
  ],
  browserKeys = [
    "floatingJoystick",
    "multiTouch",
    "cancelSkill",
    "quickTransactions",
    "drawer",
    "appraisal",
    "altar",
    "contextGate",
  ];
const checks = (keys) => Object.fromEntries(keys.map((key) => [key, true]));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "hg-upgrade-gates-")),
    evidence = join(directory, "evidence");
  await mkdir(evidence);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const asset = async (name, bytes) => {
    const path = join(directory, name);
    await writeFile(path, bytes);
    return { path, sha256: createHash("sha256").update(bytes).digest("hex") };
  };
  const report = async (name, data) => {
    await writeFile(
      join(evidence, `${name}.json`),
      JSON.stringify({ passed: true, sourceHash, ...data }),
    );
  };
  const loadEvidence = async (name) =>
    JSON.parse(await readFile(join(evidence, `${name}.json`), "utf8"));
  const evaluate = () =>
    evaluateUpgradeEvidence({ sourceHash, required, loadEvidence });
  const image = await asset("review.png", png),
    trace = await asset(
      "physical-device.trace",
      Buffer.from("ISOLATED TEST FIXTURE; not real device evidence"),
    ),
    reference = await asset(
      "official-source-fixture.md",
      Buffer.from("Synthetic source for gate regression only"),
    ),
    physical = {
      device: { physical: true, model: "Fixture Android Device" },
      tracePath: trace.path,
      traceSha256: trace.sha256,
    };
  return {
    directory,
    image,
    trace,
    reference,
    physical,
    report,
    loadEvidence,
    evaluate,
  };
}
async function validReports(f) {
  const reports = {
    rules: {},
    "master-rules": {},
    server: {},
    artifacts: {},
    "upgrade-browser": {
      checks: {
        ...checks(browserKeys),
        quality: true,
        glb: true,
        drawersClosed: true,
        targets: true,
        radial: true,
        minimap: true,
        openArea: true,
        riskValue: true,
      },
    },
    "upgrade-art-review": {
      reviewer: "Fixture visual reviewer",
      approvedSections: ["ART01", "ART03", "ART05"],
      imageEvidence: [f.image],
    },
    "master-prompt": {
      passed: false,
      approvedSections: ["CR02", "GP02", "AR01"],
      gates: ["CR02", "GP02", "AR01"].map((id) => ({ id, passed: true })),
    },
    "master-source-data": {
      reviewer: "Fixture source reviewer",
      approvedSections: ["CR02", "GP02"],
      sourceReferences: [f.reference],
      implementationChecks: { CR02: true, GP02: true },
    },
    "master-full-art-review": {
      ...f.physical,
      reviewer: "Fixture full-art reviewer",
      fullArtFidelity: true,
      approvedSections: ["AR01"],
      checks: checks([
        "allAngles",
        "animation",
        "cosmetics",
        "detailFidelity",
        "onAndroid",
      ]),
      images: [f.image],
      reviewedCounts: {
        heroes: 12,
        weapons: 12,
        weaponSkins: 24,
        costumes: 48,
        creatures: 7,
        biomes: 7,
      },
    },
    "android-functional": {
      ...f.physical,
      checks: checks([...functionalKeys, ...ergonomicKeys]),
    },
    "android-performance": {
      ...f.physical,
      normalFps: 60,
      gateCombatFps: 30,
      combatants: 40,
      durationSeconds: 120,
      normalDurationSeconds: 60,
      gateCombatDurationSeconds: 60,
    },
  };
  for (const [name, data] of Object.entries(reports))
    await f.report(name, data);
  return reports;
}
const has = (report, id) =>
  report.gates.find((gate) => gate.id === id)?.passed === true;

test("visual art cannot approve source, full-art or physical gates even with all IDs listed", async (t) => {
  const f = await fixture(t);
  await f.report("upgrade-art-review", {
    reviewer: "Fixture reviewer",
    imageEvidence: [f.image],
    approvedSections: required,
  });
  const result = await f.evaluate();
  assert.deepEqual(result.approvedSections.sort(), ["ART01", "ART03", "ART05"]);
  for (const id of [
    "ART04",
    "ART10",
    "GAME02",
    "HUD09",
    "DEVICE01",
    "DEVICE02",
  ])
    assert.equal(has(result, id), false);
  assert.equal(result.passed, false);
});

test("visual approval requires current source, nonempty reviewer and existing image with matching SHA", async (t) => {
  const f = await fixture(t);
  const nonImagePath = join(f.directory, "not-image.png");
  await writeFile(nonImagePath, "not an image");
  const nonImage = {
    path: nonImagePath,
    sha256: createHash("sha256").update("not an image").digest("hex"),
  };
  for (const changed of [
    { sourceHash: "b".repeat(64) },
    { reviewer: " " },
    { imageEvidence: [] },
    { imageEvidence: [{ ...f.image, sha256: "0".repeat(64) }] },
    { imageEvidence: [{ ...f.image, path: join(f.directory, "missing.png") }] },
    { imageEvidence: [nonImage] },
  ]) {
    await f.report("upgrade-art-review", {
      reviewer: "Fixture reviewer",
      approvedSections: ["ART01", "ART03", "ART05"],
      imageEvidence: [f.image],
      ...changed,
    });
    assert.equal((await f.evaluate()).approvedSections.length, 0);
  }
});

test("all 26 gates have a valid evidence path without requiring overall Master completion", async (t) => {
  const f = await fixture(t);
  await validReports(f);
  const result = await f.evaluate();
  assert.equal(result.passed, true);
  assert.equal(result.gates.length, 26);
  assert.equal((await f.loadEvidence("master-prompt")).passed, false);
});

test("Master source transfer requires current fingerprint, explicit approval and a passed matching gate", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const changed of [
    { sourceHash: "b".repeat(64) },
    { approvedSections: [] },
    { gates: [] },
    { gates: ["CR02", "GP02", "AR01"].map((id) => ({ id, passed: false })) },
  ]) {
    await f.report("master-prompt", {
      ...reports["master-prompt"],
      ...changed,
    });
    const result = await f.evaluate();
    for (const id of ["ART04", "GAME02", "ART10"])
      assert.equal(has(result, id), false);
  }
});

test("source-data transfer rechecks official file SHA and implementation approval despite a passed Master gate", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const changed of [
    { implementationChecks: { CR02: false, GP02: false } },
    { sourceReferences: [] },
    { sourceReferences: [{ ...f.reference, sha256: "0".repeat(64) }] },
  ]) {
    await f.report("master-source-data", {
      ...reports["master-source-data"],
      ...changed,
    });
    const result = await f.evaluate();
    assert.equal(has(result, "ART04"), false);
    assert.equal(has(result, "GAME02"), false);
  }
  await f.report("master-source-data", reports["master-source-data"]);
  await writeFile(f.reference.path, "changed after Master review");
  const result = await f.evaluate();
  assert.equal(has(result, "ART04"), false);
  assert.equal(has(result, "GAME02"), false);
});

test("Tien khi source approval does not replace the original risk-value UI criterion", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  reports["upgrade-browser"].checks.riskValue = false;
  await f.report("upgrade-browser", reports["upgrade-browser"]);
  const result = await f.evaluate();
  assert.equal(has(result, "ART04"), true);
  assert.equal(has(result, "GAME02"), false);
});

test("full art gate additionally requires Android review, complete detail counts, images and its own device trace", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const changed of [
    { device: { physical: false, model: "Linux gallery" } },
    {
      checks: { ...reports["master-full-art-review"].checks, onAndroid: false },
    },
    {
      reviewedCounts: {
        ...reports["master-full-art-review"].reviewedCounts,
        costumes: 47,
      },
    },
    { traceSha256: "0".repeat(64) },
    { images: [{ ...f.image, sha256: "0".repeat(64) }] },
  ]) {
    await f.report("master-full-art-review", {
      ...reports["master-full-art-review"],
      ...changed,
    });
    assert.equal(has(await f.evaluate(), "ART10"), false);
  }
});

test("device gates reject missing trace, bad SHA, empty model, emulator and stale report", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const changed of [
    { tracePath: undefined },
    { tracePath: join(f.directory, "missing.trace") },
    { traceSha256: "0".repeat(64) },
    { traceSha256: "not-a-digest" },
    { device: { physical: true, model: " " } },
    { device: { physical: true, model: {} } },
    { device: { physical: false, model: "Emulator" } },
    { sourceHash: "b".repeat(64) },
  ]) {
    for (const name of [
      "android-functional",
      "android-performance",
      "master-full-art-review",
    ])
      await f.report(name, { ...reports[name], ...changed });
    const result = await f.evaluate();
    for (const id of ["DEVICE01", "DEVICE02", "HUD09", "ART10"])
      assert.equal(has(result, id), false);
  }
});

test("each required functional action must pass before DEVICE01 or HUD09 can pass", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const key of functionalKeys) {
    await f.report("android-functional", {
      ...reports["android-functional"],
      checks: { ...reports["android-functional"].checks, [key]: false },
    });
    const result = await f.evaluate();
    assert.equal(has(result, "DEVICE01"), false);
    assert.equal(has(result, "HUD09"), false);
  }
});

test("HUD09 needs every Android ergonomic check plus matching browser touch regressions", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const key of ergonomicKeys) {
    await f.report("android-functional", {
      ...reports["android-functional"],
      checks: { ...reports["android-functional"].checks, [key]: false },
    });
    const result = await f.evaluate();
    assert.equal(has(result, "DEVICE01"), true);
    assert.equal(has(result, "HUD09"), false);
  }
  await f.report("android-functional", reports["android-functional"]);
  for (const key of browserKeys) {
    await f.report("upgrade-browser", {
      checks: { ...reports["upgrade-browser"].checks, [key]: false },
    });
    assert.equal(has(await f.evaluate(), "HUD09"), false);
  }
});

test("DEVICE02 preserves FPS/actor/duration floors and requires at least 60 seconds in each scene", async (t) => {
  const f = await fixture(t),
    reports = await validReports(f);
  for (const changed of [
    { normalFps: 59.9 },
    { gateCombatFps: 29.9 },
    { combatants: 39 },
    { durationSeconds: 59.9 },
    { normalFps: "60" },
    { normalFps: Infinity },
    { normalDurationSeconds: undefined },
    { gateCombatDurationSeconds: undefined },
    {
      durationSeconds: 60,
      normalDurationSeconds: 30,
      gateCombatDurationSeconds: 30,
    },
    { normalDurationSeconds: 59.9 },
    { gateCombatDurationSeconds: 59.9 },
  ]) {
    await f.report("android-performance", {
      ...reports["android-performance"],
      ...changed,
    });
    assert.equal(has(await f.evaluate(), "DEVICE02"), false);
  }
  await f.report("android-performance", {
    ...reports["android-performance"],
    durationSeconds: 120,
    normalDurationSeconds: 60,
    gateCombatDurationSeconds: 60,
  });
  assert.equal(has(await f.evaluate(), "DEVICE02"), true);
});
