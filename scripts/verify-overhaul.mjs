import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { fingerprint } from "./fingerprint.mjs";

const imageReviewSections = new Set(["EV03", "EV04"]);
const fullArtCounts = {
  heroes: 12,
  weapons: 12,
  weaponSkins: 24,
  costumes: 48,
  creatures: 7,
  biomes: 7,
};
const fullArtChecks = [
  "allAngles",
  "animation",
  "cosmetics",
  "detailFidelity",
  "overhaulVisualFidelity",
];
const reviewerPresent = (report) =>
  typeof report?.reviewer === "string" && report.reviewer.trim().length > 0;

/** Pure evaluation permits temporary fixture checks without writing real evidence.
 * All technical gates need both the current complete logic run and real WebGL/HUD
 * run. A gallery review is limited to two visual-presence criteria, never VF01. */
export async function evaluateOverhaulEvidence({
  sourceHash,
  spec,
  loadEvidence,
  loadProvenance,
  readBytes = readFile,
}) {
  const current = async (name) => {
    try {
      const report = await loadEvidence(name);
      return report?.passed === true && report.sourceHash === sourceHash
        ? report
        : null;
    } catch {
      return null;
    }
  };
  async function verifiedFiles(files) {
    if (!Array.isArray(files) || !files.length) return false;
    try {
      for (const file of files) {
        if (
          typeof file?.path !== "string" ||
          !file.path ||
          !/^[a-f0-9]{64}$/i.test(file.sha256 ?? "")
        )
          return false;
        const bytes = await readBytes(file.path);
        if (
          createHash("sha256").update(bytes).digest("hex") !==
          file.sha256.toLowerCase()
        )
          return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  const unit = await current("master-rules"),
    browser = await current("overhaul-browser"),
    artifacts = await current("artifacts"),
    gallery = await current("art-gallery"),
    review = await current("overhaul-art-review"),
    fullArt = await current("master-full-art-review");
  const browserStable =
    browser?.sourceHashStart === sourceHash &&
    browser?.sourceHashEnd === sourceHash;
  const gpuVerified =
    browser?.checks?.actualGPUNoGLError === true &&
    Array.isArray(browser.errors) &&
    browser.errors.length === 0 &&
    Array.isArray(browser.shaderErrors) &&
    browser.shaderErrors.length === 0;
  const technicalBase = !!(unit && browser && browserStable && gpuVerified),
    approved = new Set(),
    origins = new Map(),
    missingChecks = {};
  for (const id of spec.required) {
    const keys = spec.browserChecks[id];
    if (!Array.isArray(keys) || !keys.length) continue;
    const missing = keys.filter((key) => browser?.checks?.[key] !== true);
    if (missing.length) missingChecks[id] = missing;
    if (technicalBase && missing.length === 0) {
      approved.add(id);
      origins.set(id, "master-rules + overhaul-browser");
    }
  }

  // Scoped image review may establish visible creature/VFX presence. It cannot
  // grant quality fidelity, source-data, packaging or any physical-device gate.
  const reviewedGallery =
    technicalBase &&
    reviewerPresent(review) &&
    gallery?.sourceHashStart === sourceHash &&
    gallery?.sourceHashEnd === sourceHash &&
    (await verifiedFiles(gallery?.images)) &&
    (await verifiedFiles(review?.images));
  if (reviewedGallery)
    for (const id of review.approvedSections ?? [])
      if (imageReviewSections.has(id)) {
        approved.add(id);
        origins.set(
          id,
          "master-rules + current WebGL + scoped gallery/image review",
        );
      }

  let apkCurrent = false;
  if (technicalBase && artifacts) {
    try {
      const provenance = await loadProvenance(),
        bytes = await readBytes("release/Hon-Gioi-Sinh-Ton-debug.apk");
      apkCurrent =
        provenance.sourceHash === sourceHash &&
        provenance.signed === true &&
        provenance.apkBytes === bytes.length &&
        bytes.length > 0 &&
        provenance.apkSha256 ===
          createHash("sha256").update(bytes).digest("hex");
    } catch {
      apkCurrent = false;
    }
  }
  if (apkCurrent) {
    approved.add("PK01");
    origins.set(
      "PK01",
      "current logic/WebGL + artifacts + APK provenance/SHA-256",
    );
  }

  const visualFidelity =
    technicalBase &&
    reviewerPresent(fullArt) &&
    fullArt.fullArtFidelity === true &&
    fullArt.approvedSections?.includes("AR01") === true &&
    fullArtChecks.every((key) => fullArt.checks?.[key] === true) &&
    Object.entries(fullArtCounts).every(
      ([key, count]) =>
        Number.isFinite(fullArt.reviewedCounts?.[key]) &&
        fullArt.reviewedCounts[key] >= count,
    ) &&
    (await verifiedFiles(fullArt.images));
  if (visualFidelity) {
    approved.add("VF01");
    origins.set(
      "VF01",
      "master-full-art-review with overhaulVisualFidelity and verified images",
    );
  }
  const gates = spec.required.map((id) => ({
    id,
    passed: approved.has(id),
    requirement: spec.criteria[id],
    reason: approved.has(id)
      ? origins.get(id)
      : !technicalBase
        ? "Thiếu master-rules/WebGL hiện hành hoặc nguồn thay đổi/lỗi GPU trong lượt chạy"
        : id === "VF01"
          ? "Chưa có nghiệm thu mỹ thuật đầy đủ cho đợt nâng cấp"
          : id === "PK01"
            ? "Artifacts/APK/provenance chưa khớp nguồn/chữ ký/SHA-256"
            : `Chưa có kiểm chứng tương ứng: ${(missingChecks[id] ?? []).join(", ")}`,
  }));
  return {
    goal: spec.goal,
    sourceHash,
    passed: gates.every((gate) => gate.passed),
    approvedSections: [...approved],
    gates,
    missingBrowserChecks: missingChecks,
    evidence: {
      unitCurrent: !!unit,
      browserCurrent: !!browser,
      browserStable,
      gpuVerified,
      apkCurrent,
      visualFidelity: !!visualFidelity,
    },
    limitations: [
      "Kiểm thử ở bước dt1/60 vàdt1/120 chứng minh logic smoothing, không chứng minh Android chạy60/120FPS.",
      "Ảnh và map/geometry chỉ chứng minh phạm vi kiểm tra; VF01 cần review toàn bộ chi tiết/biến thể, không tự nhận AAA.",
      "Các gate GDD/Markdown/Master và Android DV01/DV02/SE07 vẫn giữ nguyên; APK debug không thay bằng chứng thiết bị thật.",
      "Boss thứ4 và bảng chỉ số/độ bền Tiên khí vẫn chờ dữ liệu gốc theo quyết định người dùng.",
    ],
  };
}

async function main() {
  const sourceHash = await fingerprint(),
    spec = JSON.parse(
      await readFile("acceptance/overhaul-requirements.json", "utf8"),
    );
  const report = await evaluateOverhaulEvidence({
    sourceHash,
    spec,
    loadEvidence: async (name) =>
      JSON.parse(await readFile(`acceptance/evidence/${name}.json`, "utf8")),
    loadProvenance: async () =>
      JSON.parse(await readFile("release/build-provenance.json", "utf8")),
  });
  report.recordedAt = new Date().toISOString();
  await mkdir("acceptance/evidence", { recursive: true });
  await writeFile(
    "acceptance/evidence/overhaul-prompt.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  for (const gate of report.gates)
    console.log(
      `${gate.passed ? "PASS" : "BLOCKED"} ${gate.id}: ${gate.reason}`,
    );
  console.log(
    `PBR/Skillshot/AutoFarm: ${report.gates.filter((gate) => gate.passed).length}/${report.gates.length}; ${report.passed ? "COMPLETE" : "NOT100%"}`,
  );
  process.exitCode = report.passed ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
