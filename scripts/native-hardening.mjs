import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "./fingerprint.mjs";
const sdk = process.env.ANDROID_HOME ?? "/workspace/android-sdk",
  jdk = process.env.JAVA_HOME ?? "/workspace/jdk21/jdk-21.0.8+9",
  prefs = process.env.ANDROID_USER_HOME ?? "/workspace/android-user",
  cache = process.env.GRADLE_USER_HOME ?? "/workspace/.gradle";
const run = (command, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ANDROID_HOME: sdk,
        JAVA_HOME: jdk,
        ANDROID_USER_HOME: prefs,
        GRADLE_USER_HOME: cache,
      },
    });
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(command + " exited " + code)),
    );
  });
await run("node", ["scripts/configure-android.mjs"]);
await run("./android/gradlew", [
  "-p",
  "android",
  ":app:checkDebugDuplicateClasses",
  ":app:dexBuilderDebug",
  ":app:minifyReleaseWithR8",
  "--no-daemon",
  "--max-workers=2",
  `-Duser.home=${prefs}`,
  "-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts",
  `-Dorg.gradle.java.installations.paths=${jdk}`,
]);
const apkPath = "release/Hon-Gioi-Sinh-Ton-debug.apk",
  apk = await readFile(apkPath),
  names = execFileSync("unzip", ["-Z1", apkPath], { encoding: "utf8" })
    .split("\n")
    .filter((n) => /^classes\d*\.dex$/.test(n));
let embedded = false;
for (const name of names) {
  const data = execFileSync("unzip", ["-p", apkPath, name], {
    maxBuffer: 32 * 1024 * 1024,
  });
  if (data.includes(Buffer.from("Lvn/hongioi/sinhton/SecurityGuard;")))
    embedded = true;
}
if (!embedded) throw Error("SecurityGuard is absent from the built APK DEX");
const mappingPath = "android/app/build/outputs/mapping/release/mapping.txt";
const mapping = await readFile(mappingPath);
if (!mapping.length) throw Error("R8 mapping empty");
const sourceHash = await fingerprint(),
  provenance = JSON.parse(
    await readFile("release/build-provenance.json", "utf8"),
  );
if (provenance.sourceHash !== sourceHash)
  throw Error("APK source fingerprint differs");
if (provenance.apkSha256 !== createHash("sha256").update(apk).digest("hex"))
  throw Error("APK checksum differs");
const report = {
  sourceHash,
  passed: true,
  checks: {
    kotlinCompiled: true,
    nativeDexEmbedded: embedded,
    duplicateClasses: false,
    releaseR8: true,
    debugApkSigned: provenance.signed,
  },
  apkSha256: provenance.apkSha256,
  r8MappingSha256: createHash("sha256").update(mapping).digest("hex"),
  guardSourceSha256: createHash("sha256")
    .update(await readFile("android-webview/SecurityGuard.kt"))
    .digest("hex"),
  scope:
    "Native compilation/DEX/R8 and debug APK packaging only; no real-device anti-tamper, root or Frida certification.",
  recordedAt: new Date().toISOString(),
};
await mkdir("acceptance/evidence", { recursive: true });
await writeFile(
  "acceptance/evidence/native-hardening.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "PASS native guard compiled, embedded in APK DEX and release R8 built; device enforcement remains untested.",
);
