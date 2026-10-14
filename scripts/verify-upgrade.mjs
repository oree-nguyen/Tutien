import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fingerprint } from "./fingerprint.mjs";
import { evaluateUpgradeEvidence } from "./upgrade-evidence.mjs";
const hash = await fingerprint(),
  required = JSON.parse(
    await readFile("acceptance/visual-requirements.json", "utf8"),
  ).required;
async function evidence(name) {
  try {
    const e = JSON.parse(
      await readFile("acceptance/evidence/" + name + ".json", "utf8"),
    );
    return e;
  } catch {
    return null;
  }
}
const result = await evaluateUpgradeEvidence({
  sourceHash: hash,
  required,
  loadEvidence: evidence,
});
const gates = result.gates;
const report = {
  sourceHash: hash,
  ...result,
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
