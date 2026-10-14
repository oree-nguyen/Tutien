import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const visualArtSections = new Set(["ART01", "ART03", "ART05"]);
const functionalChecks = [
  "launch",
  "landscape",
  "touchCombat",
  "extraction",
  "resume",
];
const ergonomicChecks = [
  "joystick",
  "skills",
  "skillCancel",
  "shop",
  "drawer",
  "contextActions",
  "noTouchOverlap",
];
const browserErgonomicChecks = [
  "floatingJoystick",
  "multiTouch",
  "cancelSkill",
  "quickTransactions",
  "drawer",
  "appraisal",
  "altar",
  "contextGate",
];
const fullArtChecks = ["allAngles", "animation", "cosmetics", "detailFidelity"];
const fullArtCounts = {
  heroes: 12,
  weapons: 12,
  weaponSkins: 24,
  costumes: 48,
  creatures: 7,
  biomes: 7,
};
const hasReviewer = (report) =>
  typeof report?.reviewer === "string" && report.reviewer.trim().length > 0;
const allChecks = (report, keys) =>
  keys.every((key) => report?.checks?.[key] === true);

/** Evaluate reports without writing evidence; fixture tests provide their own IO.
 * Image approval is limited to visual presence and never grants data/device IDs. */
export async function evaluateUpgradeEvidence({
  sourceHash,
  required,
  loadEvidence,
  readBytes = readFile,
}) {
  const fresh = async (name, allowIncomplete = false) => {
    try {
      const report = await loadEvidence(name);
      return report?.sourceHash === sourceHash &&
        (allowIncomplete || report.passed === true)
        ? report
        : null;
    } catch {
      return null;
    }
  };
  async function verifiedFiles(files, imagesOnly = false) {
    if (!Array.isArray(files) || !files.length) return false;
    try {
      for (const file of files) {
        if (
          typeof file?.path !== "string" ||
          !file.path ||
          !/^[a-f0-9]{64}$/i.test(file.sha256 ?? "")
        )
          return false;
        const bytes = Buffer.from(await readBytes(file.path));
        if (
          createHash("sha256").update(bytes).digest("hex") !==
          file.sha256.toLowerCase()
        )
          return false;
        if (imagesOnly) {
          const png = bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
          const jpeg =
            bytes.length >= 4 &&
            bytes[0] === 255 &&
            bytes[1] === 216 &&
            bytes[2] === 255 &&
            bytes.at(-2) === 255 &&
            bytes.at(-1) === 217;
          const webp =
            bytes.length >= 12 &&
            bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP";
          if (!png && !jpeg && !webp) return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  async function physicalTrace(report) {
    return (
      report?.device?.physical === true &&
      typeof report.device.model === "string" &&
      report.device.model.trim().length > 0 &&
      (await verifiedFiles([
        { path: report.tracePath, sha256: report.traceSha256 },
      ]))
    );
  }
  const rules = await fresh("rules"),
    unit = await fresh("master-rules"),
    browser = await fresh("upgrade-browser"),
    server = await fresh("server"),
    art = await fresh("upgrade-art-review"),
    android = await fresh("android-functional"),
    fps = await fresh("android-performance"),
    master = await fresh("master-prompt", true),
    sourceData = await fresh("master-source-data"),
    fullArt = await fresh("master-full-art-review"),
    artifacts = await fresh("artifacts");
  const masterGate = (id) =>
    master?.approvedSections?.includes(id) === true &&
    master.gates?.some((gate) => gate.id === id && gate.passed === true) ===
      true;
  const c = browser?.checks ?? {},
    approved = new Set();
  if (rules) for (const id of ["ART02", "ART06", "GAME01"]) approved.add(id);
  if (c.quality === true) approved.add("ART07");
  if (rules && c.glb === true)
    for (const id of ["ART08", "ART09"]) approved.add(id);
  for (const [id, ok] of Object.entries({
    HUD01: c.drawer && c.drawersClosed,
    HUD02: c.floatingJoystick && c.multiTouch,
    HUD03: c.quickTransactions,
    HUD04: rules && server && c.targets,
    HUD05: c.cancelSkill && c.radial,
    HUD06: c.appraisal && c.altar && c.contextGate,
    HUD07: c.minimap,
    HUD08: c.openArea,
    GAME03: c.appraisal,
    GAME04: rules && server,
    GAME05: artifacts,
  }))
    if (ok) approved.add(id);
  if (hasReviewer(art) && (await verifiedFiles(art.imageEvidence, true)))
    for (const id of art.approvedSections ?? [])
      if (visualArtSections.has(id)) approved.add(id);

  // Master may be incomplete overall. Only the individual, current gate and its
  // backing source files may transfer approval; unrelated missing gates stay so.
  const sourceVerified =
    hasReviewer(sourceData) &&
    unit &&
    rules &&
    server &&
    (await verifiedFiles(sourceData.sourceReferences));
  if (
    sourceVerified &&
    masterGate("CR02") &&
    sourceData.approvedSections?.includes("CR02") &&
    sourceData.implementationChecks?.CR02 === true
  )
    approved.add("ART04");
  if (
    sourceVerified &&
    masterGate("GP02") &&
    sourceData.approvedSections?.includes("GP02") &&
    sourceData.implementationChecks?.GP02 === true &&
    c.riskValue === true
  )
    approved.add("GAME02");

  // ART10 explicitly requires artwork review on Android, not a Linux gallery plus
  // an unrelated device launch. The signed review binds its own physical trace.
  if (
    masterGate("AR01") &&
    hasReviewer(fullArt) &&
    fullArt.fullArtFidelity === true &&
    fullArt.approvedSections?.includes("AR01") &&
    allChecks(fullArt, [...fullArtChecks, "onAndroid"]) &&
    Object.entries(fullArtCounts).every(
      ([key, count]) =>
        Number.isFinite(fullArt.reviewedCounts?.[key]) &&
        fullArt.reviewedCounts[key] >= count,
    ) &&
    (await verifiedFiles(fullArt.images, true)) &&
    (await physicalTrace(fullArt))
  )
    approved.add("ART10");

  const functional =
    (await physicalTrace(android)) && allChecks(android, functionalChecks);
  if (functional) approved.add("DEVICE01");
  if (
    functional &&
    allChecks(android, ergonomicChecks) &&
    browserErgonomicChecks.every((key) => c[key] === true)
  )
    approved.add("HUD09");
  if (
    (await physicalTrace(fps)) &&
    Number.isFinite(fps.normalFps) &&
    fps.normalFps >= 60 &&
    Number.isFinite(fps.gateCombatFps) &&
    fps.gateCombatFps >= 30 &&
    Number.isFinite(fps.combatants) &&
    fps.combatants >= 40 &&
    Number.isFinite(fps.durationSeconds) &&
    fps.durationSeconds >= 60 &&
    Number.isFinite(fps.normalDurationSeconds) &&
    fps.normalDurationSeconds >= 60 &&
    Number.isFinite(fps.gateCombatDurationSeconds) &&
    fps.gateCombatDurationSeconds >= 60
  )
    approved.add("DEVICE02");
  const gates = required.map((id) => ({
    id,
    passed: approved.has(id),
    reason: approved.has(id)
      ? "Bằng chứng hiện hành"
      : "Chưa đạt/chưa có bằng chứng nghiệm thu",
  }));
  return {
    passed: gates.every((gate) => gate.passed),
    approvedSections: [...approved],
    gates,
  };
}
