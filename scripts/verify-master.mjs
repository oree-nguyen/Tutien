import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "./fingerprint.mjs";
const sourceHash = await fingerprint();
const spec = JSON.parse(
  await readFile("acceptance/master-requirements.json", "utf8"),
);
async function evidence(name) {
  try {
    const data = JSON.parse(
      await readFile(`acceptance/evidence/${name}.json`, "utf8"),
    );
    return data.passed === true && data.sourceHash === sourceHash ? data : null;
  } catch {
    return null;
  }
}
async function verifiedFiles(files) {
  if (!Array.isArray(files) || !files.length) return false;
  try {
    for (const file of files) {
      if (!file.path || !/^[a-f0-9]{64}$/i.test(file.sha256 ?? ""))
        return false;
      const bytes = await readFile(file.path);
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
async function physicalTrace(report) {
  return !!(
    report?.device?.physical === true &&
    typeof report.device.model === "string" &&
    report.device.model.trim().length > 0 &&
    (await verifiedFiles([
      { path: report.tracePath, sha256: report.traceSha256 },
    ]))
  );
}
const unit = await evidence("master-rules"),
  rules = await evidence("rules"),
  browser = await evidence("master-browser"),
  oldUI = await evidence("upgrade-browser"),
  server = await evidence("server"),
  native = await evidence("native-hardening"),
  art = await evidence("master-art-review"),
  fullArt = await evidence("master-full-art-review"),
  sourceData = await evidence("master-source-data"),
  nativeAttack = await evidence("android-native-security"),
  device = await evidence("android-functional"),
  fps = await evidence("android-performance");
const approved = new Set();
if (unit)
  for (const id of [
    "AN01",
    "AN02",
    "AN03",
    "AN05",
    "AN06",
    "WP01",
    "CR01",
    "SE01",
    "SE02",
  ])
    approved.add(id);
const c = browser?.checks ?? {};
const checks = {
  AN04: c.faceTexture2048 && c.anatomyPreview,
  WP02: unit && rules && c.ornateWeapons,
  IC01: c.illustrated149 && c.iconCache,
  IC02: c.illustrated149 && c.splitInventory,
  IC03: c.skillManaBadges && c.illustrated149,
  LB02: c.showcaseDrag && c.anatomyPreview,
  HU01: c.actionPadExact && oldUI?.checks?.openArea,
  HU02:
    c.gpuClothShader &&
    c.facingHeldGuide &&
    c.fDragCancel &&
    oldUI?.checks?.cancelSkill &&
    oldUI?.checks?.multiTouch,
  HU03: unit && c.appraisal800ms && c.selectedPickup && c.splitInventory,
  HU04:
    oldUI?.checks?.quickTransactions &&
    oldUI?.checks?.minimap &&
    oldUI?.checks?.drawer,
  SE03: rules && server,
  SE04: unit && server,
  SE05: native && unit,
  SE06: c.securityUI && c.runtimeTamperRestore,
  GP01: rules && server,
  PK01: !!(await evidence("artifacts")),
};
for (const [id, passed] of Object.entries(checks)) if (passed) approved.add(id);
// Image review can approve only visual presence. Source-data and physical-device
// gates require their own evidence and cannot be bypassed by an art report.
const artSections = new Set(["AN07", "LB01", "EN01", "EN02", "EN03", "EN04"]);
if (art?.reviewer && (await verifiedFiles(art.images)))
  for (const id of art.approvedSections ?? [])
    if (artSections.has(id)) approved.add(id);
if (
  fullArt?.reviewer &&
  fullArt.fullArtFidelity === true &&
  fullArt.approvedSections?.includes("AR01") &&
  ["allAngles", "animation", "cosmetics", "detailFidelity"].every(
    (k) => fullArt.checks?.[k] === true,
  ) &&
  Object.entries({
    heroes: 12,
    weapons: 12,
    weaponSkins: 24,
    costumes: 48,
    creatures: 7,
    biomes: 7,
  }).every(([k, n]) => fullArt.reviewedCounts?.[k] >= n) &&
  (await verifiedFiles(fullArt.images))
)
  approved.add("AR01");
if (
  sourceData?.reviewer &&
  unit &&
  rules &&
  server &&
  (await verifiedFiles(sourceData.sourceReferences))
)
  for (const id of ["CR02", "GP02"])
    if (
      sourceData.approvedSections?.includes(id) &&
      sourceData.implementationChecks?.[id] === true
    )
      approved.add(id);
if (
  (await physicalTrace(nativeAttack)) &&
  [
    "releaseTrustedSignature",
    "wrongSignatureBlocked",
    "modifiedApkBlocked",
    "rootSignalsMeasured",
    "fridaSignalsMeasured",
  ].every((k) => nativeAttack.checks?.[k] === true)
)
  approved.add("SE07");
if (
  (await physicalTrace(device)) &&
  ["launch", "landscape", "touchCombat", "extraction", "resume"].every(
    (k) => device.checks?.[k] === true,
  )
)
  approved.add("DV01");
if (
  (await physicalTrace(fps)) &&
  [
    "normalFps",
    "gateCombatFps",
    "durationSeconds",
    "normalDurationSeconds",
    "gateCombatDurationSeconds",
    "combatants",
  ].every((key) => Number.isFinite(fps[key])) &&
  fps.normalFps >= 60 &&
  fps.gateCombatFps >= 30 &&
  fps.durationSeconds >= 60 &&
  fps.normalDurationSeconds >= 60 &&
  fps.gateCombatDurationSeconds >= 60 &&
  fps.combatants >= 40
)
  approved.add("DV02");
const gates = spec.required.map((id) => ({
  id,
  passed: approved.has(id),
  requirement: spec.criteria[id],
}));
const report = {
  sourceHash,
  passed: gates.every((g) => g.passed),
  approvedSections: [...approved],
  gates,
  limitations: [
    "Boss thứ4/Tiên khí chờ nguồn gốc theo quyết định người dùng.",
    "Chưa có Android vật lý: không suy diễn FPS/chống can thiệp từ SwiftShader, APK tồn tại hoặc R8compile.",
    "Review mỹ thuật toàn bộ chi tiết/biến thể vẫn bắt buộc; tính năng kỹ thuật không tự chứng nhận AAA.",
    "JavaScript/native heuristics có thể bị thay thế trên máy người dùng; quyền kinh tế online ở server.",
  ],
  recordedAt: new Date().toISOString(),
};
await mkdir("acceptance/evidence", { recursive: true });
await writeFile(
  "acceptance/evidence/master-prompt.json",
  JSON.stringify(report, null, 2) + "\n",
);
for (const g of gates) console.log(`${g.passed ? "PASS" : "BLOCKED"} ${g.id}`);
console.log(
  `Master Prompt: ${gates.filter((g) => g.passed).length}/${gates.length};${report.passed ? " COMPLETE" : " NOT100%"}`,
);
process.exitCode = report.passed ? 0 : 1;
