import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "./fingerprint.mjs";
const adb = process.env.ADB ?? "/workspace/android-sdk/platform-tools/adb";
try {
  const listed = execFileSync(adb, ["devices"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const devices = listed
    .split("\n")
    .filter((l) => /\sdevice$/.test(l))
    .map((l) => l.split("\t")[0]);
  if (devices.length !== 1)
    throw Error("Cần đúng một thiết bị Android đã cấp quyền ADB");
  const serial = devices[0],
    run = (args) =>
      execFileSync(adb, ["-s", serial, ...args], { encoding: "utf8" }).trim();
  const physical = run(["shell", "getprop", "ro.kernel.qemu"]) !== "1";
  if (!physical)
    throw Error(
      "Goal yêu cầu thiết bị thật; emulator không thay thế bằng chứng FPS",
    );
  const device = {
    model: run(["shell", "getprop", "ro.product.model"]),
    sdk: run(["shell", "getprop", "ro.build.version.sdk"]),
    physical,
  };
  run(["install", "-r", "release/Hon-Gioi-Sinh-Ton-debug.apk"]);
  run(["shell", "am", "start", "-n", "vn.hongioi.sinhton/.MainActivity"]);
  await mkdir("acceptance/evidence", { recursive: true });
  const report = {
    sourceHash: await fingerprint(),
    passed: false,
    device,
    checks: {
      launch: true,
      landscape: false,
      touchCombat: false,
      extraction: false,
      resume: false,
    },
    note: "Đã cài/chạy. Cần kiểm tra chức năng và đo FPS bằng trace thiết bị; không tự đánh dấu những mục chưa xác thực.",
  };
  await writeFile(
    "acceptance/evidence/android-functional.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "APK installed and launched. Functional/performance gates remain blocked until measured evidence is supplied.",
  );
  process.exitCode = 1;
} catch (e) {
  console.error(e.stderr?.toString().split("\n").find(Boolean) ?? e.message);
  console.error("Không có bằng chứng thiết bị thật; goal chưa đạt.");
  process.exitCode = 1;
}
