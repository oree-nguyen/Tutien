import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "./fingerprint.mjs";
const sdk = process.env.ANDROID_HOME ?? "/workspace/android-sdk",
  jdk = process.env.JAVA_HOME ?? "/workspace/jdk21/jdk-21.0.8+9",
  cache = process.env.GRADLE_USER_HOME ?? "/workspace/.gradle",
  prefs = process.env.ANDROID_USER_HOME ?? "/workspace/android-user";
await access(sdk + "/platforms/android-35/android.jar");
await access(jdk + "/bin/javac");
await mkdir(prefs, { recursive: true });
async function run(cmd, args, env = {}) {
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(cmd + " exited " + code)),
    );
  });
}
await run("npm", ["run", "android:sync"]);
await run(
  "./android/gradlew",
  [
    "-p",
    "android",
    "assembleDebug",
    "--no-daemon",
    "--max-workers=2",
    `-Duser.home=${prefs}`,
    "-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts",
    `-Dorg.gradle.java.installations.paths=${jdk}`,
  ],
  {
    JAVA_HOME: jdk,
    ANDROID_HOME: sdk,
    ANDROID_USER_HOME: prefs,
    GRADLE_USER_HOME: cache,
  },
);
await mkdir("release", { recursive: true });
const target = "release/Hon-Gioi-Sinh-Ton-debug.apk";
await copyFile("android/app/build/outputs/apk/debug/app-debug.apk", target);
await run(
  sdk + "/build-tools/35.0.0/apksigner",
  ["verify", "--verbose", target],
  { JAVA_HOME: jdk },
);
const bytes = await readFile(target);
await writeFile(
  "release/build-provenance.json",
  JSON.stringify(
    {
      sourceHash: await fingerprint(),
      apkSha256: createHash("sha256").update(bytes).digest("hex"),
      apkBytes: bytes.length,
      buildType: "debug",
      signed: true,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Verified APK and source provenance saved to release/.");
