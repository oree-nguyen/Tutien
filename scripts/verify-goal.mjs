import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fingerprint } from "./fingerprint.mjs";
const required = JSON.parse(
    await readFile("acceptance/requirements.json", "utf8"),
  ).required,
  hash = await fingerprint(),
  record = process.argv.indexOf("--record");
if (record >= 0) {
  const id = process.argv[record + 1],
    gate = required.find((g) => g.id === id);
  if (!gate || gate.kind !== "automated")
    throw Error("Chỉ ghi bằng chứng từ lệnh tự động đã đăng ký");
  const child = spawn(gate.command, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  const code = await new Promise((resolve) => child.on("exit", resolve));
  await mkdir("acceptance/evidence", { recursive: true });
  await writeFile(
    `acceptance/evidence/${id}.json`,
    JSON.stringify(
      {
        id,
        sourceHash: hash,
        passed: code === 0,
        exitCode: code,
        command: gate.command,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(code ?? 1);
}
const report = [];
for (const gate of required) {
  let passed = false,
    reason = "Chưa có bằng chứng";
  try {
    if (gate.kind === "artifact") {
      const bytes = await readFile(gate.path),
        provenance = JSON.parse(
          await readFile("release/build-provenance.json", "utf8"),
        );
      passed =
        provenance.sourceHash === hash &&
        provenance.apkSha256 ===
          createHash("sha256").update(bytes).digest("hex");
      reason = passed
        ? "APK khớp mã nguồn và SHA-256"
        : "APK/provenance chưa khớp mã nguồn";
    } else {
      const e = JSON.parse(
        await readFile(
          gate.evidence ?? `acceptance/evidence/${gate.id}.json`,
          "utf8",
        ),
      );
      passed = e.passed === true && e.sourceHash === hash;
      reason = passed
        ? "Bằng chứng hiện hành"
        : "Chưa đạt hoặc bằng chứng đã cũ";
      if (
        gate.id === "android-functional" ||
        gate.id === "android-performance"
      ) {
        passed =
          passed &&
          e.device?.physical === true &&
          typeof e.device?.model === "string" &&
          e.device.model.trim().length > 0 &&
          !!e.tracePath;
        const trace = await readFile(e.tracePath);
        passed =
          passed &&
          createHash("sha256").update(trace).digest("hex") === e.traceSha256;
        if (gate.id === "android-performance")
          passed =
            passed &&
            [
              "normalFps",
              "gateCombatFps",
              "combatants",
              "durationSeconds",
              "normalDurationSeconds",
              "gateCombatDurationSeconds",
            ].every((key) => Number.isFinite(e[key])) &&
            e.normalFps >= 60 &&
            e.gateCombatFps >= 30 &&
            e.combatants >= 40 &&
            e.durationSeconds >= 60 &&
            e.normalDurationSeconds >= 60 &&
            e.gateCombatDurationSeconds >= 60;
        if (gate.id === "android-functional")
          passed =
            passed &&
            [
              "launch",
              "landscape",
              "touchCombat",
              "extraction",
              "resume",
            ].every((k) => e.checks?.[k] === true);
        reason = passed
          ? "Thiết bị thật và trace đạt"
          : "Thiếu thiết bị thật/trace/chỉ tiêu bắt buộc";
      }
      if (gate.id === "md-upgrade") {
        const ids = JSON.parse(
          await readFile("acceptance/visual-requirements.json", "utf8"),
        ).required;
        passed = passed && ids.every((id) => e.approvedSections?.includes(id));
        reason = passed
          ? "Đã nghiệm thu nâng cấp Markdown"
          : "Nâng cấp Markdown còn mục chưa đạt";
      }
      if (gate.id === "master-prompt") {
        const ids = JSON.parse(
          await readFile("acceptance/master-requirements.json", "utf8"),
        ).required;
        passed = passed && ids.every((id) => e.approvedSections?.includes(id));
        reason = passed
          ? "Master Prompt đã đủ bằng chứng"
          : "Master Prompt còn mục chưa đạt";
      }
      if (gate.id === "overhaul-prompt") {
        const ids = JSON.parse(
          await readFile("acceptance/overhaul-requirements.json", "utf8"),
        ).required;
        passed = passed && ids.every((id) => e.approvedSections?.includes(id));
        reason = passed
          ? "Nâng cấp PBR, điều khiển và Auto Farm đã đủ bằng chứng"
          : "Nâng cấp PBR, điều khiển và Auto Farm còn mục chưa đạt";
      }
      if (gate.id === "gdd-audit") {
        passed =
          passed &&
          typeof e.reviewer === "string" &&
          [
            "C2",
            "C3-36",
            "D1",
            "D2",
            "D3",
            "E1",
            "E2",
            "E3",
            "E4",
            "F",
            "G",
            "H",
            "I",
            "J",
          ].every((k) => e.approvedSections?.includes(k));
        reason = passed
          ? "Đã nghiệm thu đủ mục GDD"
          : "Chưa có nghiệm thu đủ mục GDD";
      }
      if (gate.id === "timeline")
        passed = passed && e.simulatedSeconds >= 1320 && e.frames >= 39600;
      if (gate.id === "server-performance")
        passed =
          passed &&
          e.participants >= 100 &&
          e.tickP95Ms < 1000 / 30 &&
          e.ackP95Ms < 60;
    }
  } catch (e) {
    if (e.code !== "ENOENT") reason = "Bằng chứng không hợp lệ";
  }
  report.push({ id: gate.id, passed, reason });
  console.log(`${passed ? "PASS" : "BLOCKED"} ${gate.id}: ${reason}`);
}
await mkdir("acceptance/evidence", { recursive: true });
const passed = report.every((g) => g.passed);
await writeFile(
  "acceptance/evidence/goal-status.json",
  JSON.stringify(
    {
      goal: "GDD-V2.5-complete",
      sourceHash: hash,
      passed,
      gates: report,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  passed
    ? "GOAL PASSED — được dùng làm baseline hoàn tất."
    : "GOAL BLOCKED — chỉ dùng để tiếp tục phát triển; không gắn nhãn100%.",
);
process.exit(passed ? 0 : 1);
