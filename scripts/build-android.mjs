import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "./fingerprint.mjs";
import {
  reportEntranceUrls,
  reportEntranceHashes,
  reportEntranceRevision,
} from "../src/report-entrance-assets.js";
const sdk = process.env.ANDROID_HOME ?? "/workspace/android-sdk",
  jdk = process.env.JAVA_HOME ?? "/workspace/jdk21/jdk-21.0.8+9",
  cache = process.env.GRADLE_USER_HOME ?? "/workspace/.gradle",
  prefs = process.env.ANDROID_USER_HOME ?? "/workspace/android-user";
const includeRigReview = process.env.HG_INCLUDE_RIG_REVIEW === "1";
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
await run("node", ["scripts/copy-rig-review.mjs"]);
const buildId = await fingerprint();
await run("npm", ["run", "android:sync"], {
  HG_ANDROID_BUILD_ID: buildId,
  HG_SKIP_STANDALONE: "1",
});
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
const reviewFiles = [
  "rig-review.html",
  "models/rig-review/H01.glb",
  "models/rig-review/H02.glb",
  "models/rig-review/H01-held.json",
  "models/rig-review/manifest.json",
];
const includedReviewFiles = await Promise.all(
  reviewFiles.map((path) => exists("dist/" + path)),
);
if (includedReviewFiles.some((included) => included !== includeRigReview))
  throw Error(
    "Built rig-review files do not match HG_INCLUDE_RIG_REVIEW; refusing APK build",
  );
const rigReviewIncluded = includedReviewFiles.every(Boolean);
const lobbyMotionAssets = [];
for (const [hero, url] of Object.entries(reportEntranceUrls)) {
  const file = url.split("?")[0].replace(/^\//, ""),
    bytes = await readFile("dist/" + file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== reportEntranceHashes[hero])
    throw Error("Stale packaged entrance motion: " + hero);
  lobbyMotionAssets.push({ hero, file, sha256, bytes: bytes.length });
}
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
if ((await fingerprint()) !== buildId)
  throw Error("Source changed during APK build; rebuild before publishing");
const bytes = await readFile(target);
const gradleMetadata = await readFile("android/app/build.gradle", "utf8");
const versionCode = Number(gradleMetadata.match(/versionCode\s+(\d+)/)?.[1]);
const versionName = gradleMetadata.match(/versionName\s+"([^"]+)"/)?.[1];
if (!versionCode || !versionName) throw Error("Missing native APK version");

await writeFile(
  "release/build-provenance.json",
  JSON.stringify(
    {
      sourceHash: buildId,
      apkSha256: createHash("sha256").update(bytes).digest("hex"),
      apkBytes: bytes.length,
      buildType: "debug",
      versionCode,
      versionName,
      rigReviewIncluded,
      runtimeRigReplaced: false,
      lobbyEntranceRevision: reportEntranceRevision,
      lobbyMotionAssets,
      signed: true,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Verified APK and source provenance saved to release/.");
