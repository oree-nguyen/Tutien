import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evaluateOverhaulEvidence } from "../scripts/verify-overhaul.mjs";

// These are isolated in-memory gate fixtures, never production evidence files.
const spec = JSON.parse(
    await readFile(
      new URL("../acceptance/overhaul-requirements.json", import.meta.url),
      "utf8",
    ),
  ),
  sourceHash = "a".repeat(64),
  staleHash = "b".repeat(64),
  apkPath = "release/Hon-Gioi-Sinh-Ton-debug.apk",
  imagePath = "fixture-only/review.png",
  digest = (bytes) => createHash("sha256").update(bytes).digest("hex"),
  has = (report, id) =>
    report.gates.find((gate) => gate.id === id)?.passed === true;

function fixture() {
  const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6F7sAAAAASUVORK5CYII=",
      "base64",
    ),
    apk = Buffer.from("ISOLATED APK HASH FIXTURE; not an installable artifact"),
    imageReference = { path: imagePath, sha256: digest(image) },
    files = new Map([
      [imagePath, image],
      [apkPath, apk],
    ]),
    current = (fields = {}) => ({ passed: true, sourceHash, ...fields }),
    checks = Object.fromEntries(
      Object.values(spec.browserChecks)
        .flat()
        .map((key) => [key, true]),
    ),
    reports = new Map([
      ["master-rules", current()],
      [
        "overhaul-browser",
        current({
          sourceHashStart: sourceHash,
          sourceHashEnd: sourceHash,
          errors: [],
          shaderErrors: [],
          checks: { ...checks, actualGPUNoGLError: true },
        }),
      ],
      ["artifacts", current()],
    ]),
    provenance = {
      sourceHash,
      signed: true,
      apkBytes: apk.length,
      apkSha256: digest(apk),
    };
  const fullReview = () =>
    current({
      reviewer: "Synthetic full-art fixture reviewer",
      fullArtFidelity: true,
      approvedSections: ["AR01"],
      checks: {
        allAngles: true,
        animation: true,
        cosmetics: true,
        detailFidelity: true,
        overhaulVisualFidelity: true,
      },
      reviewedCounts: {
        heroes: 12,
        weapons: 12,
        weaponSkins: 24,
        costumes: 48,
        creatures: 7,
        biomes: 7,
      },
      images: [structuredClone(imageReference)],
    });
  return {
    reports,
    files,
    provenance,
    imageReference,
    fullReview,
    current,
    evaluate: () =>
      evaluateOverhaulEvidence({
        sourceHash,
        spec,
        loadEvidence: async (name) => structuredClone(reports.get(name)),
        loadProvenance: async () => structuredClone(provenance),
        readBytes: async (path) => {
          if (!files.has(path)) throw Error("Missing fixture byte stream");
          return files.get(path);
        },
      }),
  };
}

test("technical evidence cannot imply full visual fidelity when no full-art review exists", async () => {
  const f = fixture(),
    result = await f.evaluate();
  assert.equal(result.passed, false);
  assert.equal(result.approvedSections.length, 23);
  assert.equal(has(result, "VF01"), false);
  assert.equal(result.evidence.visualFidelity, false);
  assert.ok(has(result, "PK01"));
});

test("all24 gates retain a valid future path with complete source-bound reports and real matching fixture bytes", async () => {
  const f = fixture();
  f.reports.set("master-full-art-review", f.fullReview());
  const result = await f.evaluate();
  assert.equal(result.passed, true);
  assert.deepEqual(new Set(result.approvedSections), new Set(spec.required));
  assert.equal(result.evidence.visualFidelity, true);
  assert.equal(result.evidence.apkCurrent, true);
});

test("stale rules/browser or source changes during a GPU run block every overhaul gate", async () => {
  for (const [reportName, field] of [
    ["master-rules", "sourceHash"],
    ["overhaul-browser", "sourceHash"],
    ["overhaul-browser", "sourceHashStart"],
    ["overhaul-browser", "sourceHashEnd"],
  ]) {
    const f = fixture();
    f.reports.set("master-full-art-review", f.fullReview());
    f.reports.get(reportName)[field] = staleHash;
    const result = await f.evaluate();
    assert.equal(result.approvedSections.length, 0, `${reportName}.${field}`);
    assert.equal(result.passed, false);
  }
});

test("missing or failed full logic/GPU runs cannot be replaced by visual reviews", async () => {
  for (const name of ["master-rules", "overhaul-browser"])
    for (const failed of [false, true]) {
      const f = fixture();
      f.reports.set("master-full-art-review", f.fullReview());
      if (failed) f.reports.get(name).passed = false;
      else f.reports.delete(name);
      assert.equal((await f.evaluate()).approvedSections.length, 0);
    }
});

test("GPU proof requires an affirmative check and explicit empty runtime/shader error arrays", async () => {
  const changes = [
    (browser) => delete browser.checks.actualGPUNoGLError,
    (browser) => (browser.checks.actualGPUNoGLError = false),
    (browser) => delete browser.errors,
    (browser) => (browser.errors = ["fixture runtime failure"]),
    (browser) => delete browser.shaderErrors,
    (browser) => (browser.shaderErrors = ["fixture shader failure"]),
  ];
  for (const change of changes) {
    const f = fixture();
    f.reports.set("master-full-art-review", f.fullReview());
    change(f.reports.get("overhaul-browser"));
    const result = await f.evaluate();
    assert.equal(result.evidence.gpuVerified, false);
    assert.equal(result.approvedSections.length, 0);
  }
});

test("a generic GL pass does not grant missing specific scene or interaction assertions", async () => {
  const f = fixture();
  f.reports.get("overhaul-browser").checks = { actualGPUNoGLError: true };
  const result = await f.evaluate();
  assert.equal(has(result, "PK01"), true);
  assert.deepEqual(result.approvedSections, ["PK01"]);
  for (const id of Object.keys(spec.browserChecks)) {
    assert.equal(has(result, id), false);
    assert.deepEqual(result.missingBrowserChecks[id], spec.browserChecks[id]);
  }
});

test("scoped image review can approve only EV03/EV04 and cannot bypass missing visual, package or fidelity gates", async () => {
  const f = fixture();
  f.reports.get("overhaul-browser").checks = { actualGPUNoGLError: true };
  f.reports.delete("artifacts");
  f.reports.set(
    "art-gallery",
    f.current({
      sourceHashStart: sourceHash,
      sourceHashEnd: sourceHash,
      images: [f.imageReference],
    }),
  );
  f.reports.set(
    "overhaul-art-review",
    f.current({
      reviewer: "Synthetic scoped fixture reviewer",
      approvedSections: spec.required,
      fullArtFidelity: true,
      checks: { overhaulVisualFidelity: true },
      images: [f.imageReference],
    }),
  );
  const result = await f.evaluate();
  assert.deepEqual(result.approvedSections.sort(), ["EV03", "EV04"]);
  assert.equal(has(result, "VF01"), false);
  assert.equal(has(result, "PK01"), false);
});

test("scoped review rejects stale gallery, absent reviewer and forged/missing image bytes", async () => {
  for (const change of [
    (f) => (f.reports.get("art-gallery").sourceHashEnd = staleHash),
    (f) => (f.reports.get("overhaul-art-review").sourceHash = staleHash),
    (f) => (f.reports.get("overhaul-art-review").reviewer = " "),
    (f) => (f.reports.get("overhaul-art-review").images = []),
    (f) =>
      (f.reports.get("overhaul-art-review").images[0].sha256 = "0".repeat(64)),
    (f) => f.files.delete(imagePath),
  ]) {
    const f = fixture();
    f.reports.get("overhaul-browser").checks = { actualGPUNoGLError: true };
    f.reports.set(
      "art-gallery",
      f.current({
        sourceHashStart: sourceHash,
        sourceHashEnd: sourceHash,
        images: [structuredClone(f.imageReference)],
      }),
    );
    f.reports.set(
      "overhaul-art-review",
      f.current({
        reviewer: "Synthetic scoped fixture reviewer",
        approvedSections: ["EV03", "EV04"],
        images: [structuredClone(f.imageReference)],
      }),
    );
    change(f);
    const result = await f.evaluate();
    assert.equal(has(result, "EV03"), false);
    assert.equal(has(result, "EV04"), false);
  }
});

test("packaging rejects a forged hash, modified APK bytes, unsigned provenance and stale artifacts", async () => {
  for (const change of [
    (f) => (f.provenance.apkSha256 = "0".repeat(64)),
    (f) => f.files.set(apkPath, Buffer.from("MODIFIED FIXTURE BYTES")),
    (f) => f.files.delete(apkPath),
    (f) => (f.provenance.apkBytes += 1),
    (f) => (f.provenance.signed = false),
    (f) => (f.provenance.sourceHash = staleHash),
    (f) => (f.reports.get("artifacts").sourceHash = staleHash),
    (f) => f.reports.delete("artifacts"),
  ]) {
    const f = fixture();
    change(f);
    const result = await f.evaluate();
    assert.equal(has(result, "PK01"), false);
    assert.equal(result.evidence.apkCurrent, false);
    assert.equal(has(result, "SC01"), true);
  }
});

test("full fidelity requires every original population/check, explicit authorization and matching image SHA", async () => {
  for (const change of [
    (review) => (review.sourceHash = staleHash),
    (review) => (review.reviewer = " "),
    (review) => (review.fullArtFidelity = false),
    (review) => (review.approvedSections = ["VF01"]),
    (review) => (review.checks.overhaulVisualFidelity = false),
    (review) => delete review.checks.detailFidelity,
    (review) => (review.reviewedCounts.costumes = 47),
    (review) => (review.reviewedCounts.weapons = "12"),
    (review) => (review.images[0].sha256 = "0".repeat(64)),
    (review) => (review.images = []),
  ]) {
    const f = fixture(),
      review = f.fullReview();
    change(review);
    f.reports.set("master-full-art-review", review);
    const result = await f.evaluate();
    assert.equal(has(result, "VF01"), false);
    assert.equal(result.passed, false);
    assert.equal(result.approvedSections.length, 23);
  }
});
