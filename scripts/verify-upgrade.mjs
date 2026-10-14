import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fingerprint } from "./fingerprint.mjs";
const hash = await fingerprint(),
  required = JSON.parse(
    await readFile("acceptance/visual-requirements.json", "utf8"),
  ).required;
async function evidence(name) {
  try {
    const e = JSON.parse(
      await readFile("acceptance/evidence/" + name + ".json", "utf8"),
    );
    return e.sourceHash === hash && e.passed === true ? e : null;
  } catch {
    return null;
  }
}
const rules = await evidence("rules"),
  browser = await evidence("upgrade-browser"),
  server = await evidence("server"),
  art = await evidence("upgrade-art-review"),
  android = await evidence("android-functional"),
  fps = await evidence("android-performance");
const c = browser?.checks ?? {},
  approved = new Set();
if (rules) for (const id of ["ART02", "ART06", "GAME01"]) approved.add(id);
if (c.quality) approved.add("ART07");
if (rules && c.glb) for (const id of ["ART08", "ART09"]) approved.add(id);
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
  GAME05: !!(await evidence("artifacts")),
}))
  if (ok) approved.add(id);
if (art?.reviewer && art?.imageEvidence?.length)
  for (const id of art.approvedSections ?? [])
    if (required.includes(id)) approved.add(id);
if (android && android.device?.physical && android.tracePath)
  approved.add("DEVICE01");
if (
  fps &&
  fps.device?.physical &&
  fps.normalFps >= 60 &&
  fps.gateCombatFps >= 30
)
  approved.add("DEVICE02");
const gates = required.map((id) => ({
  id,
  passed: approved.has(id),
  reason: approved.has(id)
    ? "Bằng chứng hiện hành"
    : "Chưa đạt/chưa có bằng chứng nghiệm thu",
}));
const report = {
  sourceHash: hash,
  passed: gates.every((g) => g.passed),
  approvedSections: [...approved],
  gates,
  blockers: [
    "Người dùng yêu cầu giữ dữ liệu gốc: chưa có đặc tả Boss thứ4, chỉ số/độ bền Tiên khí.",
    "Chưa có thiết bị Android thật kết nối cho nghiệm thu cảm ứng/FPS.",
    "Mỹ thuật từng nhân vật/skin/trang phục/Boss và địa hình cần nghiệm thu đầy đủ.",
  ],
  recordedAt: new Date().toISOString(),
};
await mkdir("acceptance/evidence", { recursive: true });
await writeFile(
  "acceptance/evidence/md-upgrade.json",
  JSON.stringify(report, null, 2) + "\n",
);
for (const g of gates) console.log(`${g.passed ? "PASS" : "BLOCKED"} ${g.id}`);
console.log(
  `Markdown goal: ${gates.filter((g) => g.passed).length}/${gates.length}`,
);
process.exitCode = report.passed ? 0 : 1;
