import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  statSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  SecureMemoryVault,
  TimeMovementValidator,
  ReplayGuard,
  runSecuritySimulation,
} from "../src/security.js";
import { createItemSigner } from "../server/security.js";
import { loot } from "../src/rules.js";

test("sealed snapshot restores wallet, HP, nested cooldowns and gate without accepting nonfinite edits", () => {
  const state = {
      tb: 300,
      hp: 950,
      mp: 100,
      cooldowns: [0, 0, 0, 8],
      channel: { remaining: 20 },
    },
    alerts = [],
    vault = SecureMemoryVault(state, (event) => alerts.push(event));
  state.tb = 999999;
  state.hp = NaN;
  state.cooldowns[3] = 0;
  state.channel.remaining = 0;
  const check = vault.inspect(state);
  assert.equal(check.detected, 4);
  assert.equal(check.restored, 4);
  assert.deepEqual(state, {
    tb: 300,
    hp: 950,
    mp: 100,
    cooldowns: [0, 0, 0, 8],
    channel: { remaining: 20 },
  });
  assert.equal(alerts.length, 1);
  assert.equal(vault.inspect(state).ok, true);
});

test("trusted capture is atomic on invalid values and readonly API snapshots do not mutate the vault", () => {
  const vault = SecureMemoryVault({ tb: 300, cooldowns: [8] });
  vault.capture({ tb: 200, cooldowns: [4] });
  assert.throws(() => vault.capture({ tb: 100, cooldowns: [Infinity] }));
  assert.equal(vault.read("tb"), 200);
  assert.equal(Object.isFrozen(vault), true);
  assert.equal(Object.isFrozen(vault.snapshot()), true);
  assert.throws(() => {
    vault.snapshot().cooldowns[0] = 0;
  }, TypeError);
  assert.deepEqual(vault.read("cooldowns"), [4]);
  const frozenTarget = Object.freeze({ tb: 999999, cooldowns: [0] });
  const check = vault.inspect(frozenTarget);
  assert.equal(check.detected, 2);
  assert.equal(check.restored, 0);
});

test("movement accepts normal and low-FPS motion and blocks an unapproved teleport", () => {
  let clock = 0,
    x = 0;
  const validator = TimeMovementValidator({
    now: () => clock,
    wallNow: () => clock,
  });
  validator.sample({ x, z: 0, speed: 5, dt: 0 });
  for (const dt of [1 / 60, 1 / 30, 0.2, 0.25, 1 / 60, 0.1]) {
    clock += dt * 1000;
    x += 5 * dt;
    assert.equal(validator.sample({ x, z: 0, speed: 5, dt }).blocked, false);
  }
  clock += 100;
  const attack = validator.sample({ x: x + 50, z: 0, speed: 5, dt: 0.1 });
  assert.equal(attack.blocked, true);
  assert.equal(attack.x, x);
});

test("a trusted Linh Bo dash allowance is consumed once rather than disabling speed checks", () => {
  let clock = 0;
  const validator = TimeMovementValidator({
    now: () => clock,
    wallNow: () => clock,
  });
  validator.sample({ x: 0, z: 0, speed: 5, dt: 0 });
  validator.authorizeDisplacement(2.8);
  clock += 100;
  assert.equal(
    validator.sample({ x: 2.8, z: 0, speed: 5, dt: 0.1 }).blocked,
    false,
  );
  clock += 100;
  assert.equal(
    validator.sample({ x: 5.6, z: 0, speed: 5, dt: 0.1 }).blocked,
    true,
  );
});

test("rolling movement budget rejects a sustained two-times speedhack below per-frame slack", () => {
  let clock = 0,
    x = 0,
    blocked = 0;
  const validator = TimeMovementValidator({
    now: () => clock,
    wallNow: () => clock,
  });
  validator.sample({ x, z: 0, speed: 5, dt: 0 });
  for (let index = 0; index < 60; index++) {
    clock += 1000 / 60;
    const check = validator.sample({
      x: x + 10 / 60,
      z: 0,
      speed: 5,
      dt: 1 / 60,
    });
    if (check.blocked) blocked++;
    x = check.x;
  }
  assert.ok(blocked > 0);
  assert.ok(x < 6);
});

test("background resume, paused frames and wall-clock corrections do not automatically ban legitimate movement", () => {
  let mono = 0,
    wall = 0;
  const validator = TimeMovementValidator({
    now: () => mono,
    wallNow: () => wall,
  });
  validator.sample({ x: 0, z: 0, speed: 5, dt: 0 });
  mono += 4000;
  wall += 4000;
  let check = validator.sample({ x: 0, z: 0, speed: 5, dt: 4 });
  assert.equal(check.resumed, true);
  assert.equal(check.safeDt, 0);
  check = validator.sample({ x: 0, z: 0, speed: 5, dt: 0.1, paused: true });
  assert.equal(check.blocked, false);
  wall += 60000;
  for (let index = 0; index < 4; index++) {
    mono += 100;
    wall += 100;
    check = validator.sample({ x: 0, z: 0, speed: 5, dt: 0.1 });
    assert.equal(check.blocked, false);
    assert.equal(check.ok, true);
  }
  assert.equal(check.clockDrift, true);
});

test("replay cache isolates scopes, rejects reuse, bounds memory and expires entries", () => {
  let clock = 0;
  const guard = ReplayGuard({ now: () => clock, ttlMs: 100, capacity: 2 });
  assert.equal(guard.accept("account-a", "gate-1"), true);
  assert.equal(guard.accept("account-a", "gate-1"), false);
  assert.equal(guard.accept("account-b", "gate-1"), true);
  assert.equal(guard.accept("account-a", "gate-2"), false);
  assert.equal(guard.size(), 2);
  clock = 101;
  assert.equal(guard.accept("account-a", "gate-1"), true);
  assert.equal(guard.size(), 1);
});

test("security shield simulation uses disposable state and reports real checks separately", () => {
  const untouchedProfile = { tb: 5000, nb: 2000 };
  const report = runSecuritySimulation();
  assert.equal(report.passed, true);
  assert.equal(report.isolated, true);
  assert.equal(report.changedRealWallet, false);
  assert.deepEqual(untouchedProfile, { tb: 5000, nb: 2000 });
  assert.ok(
    report.checks.some(
      (check) => check.id === "memory-restore" && check.passed,
    ),
  );
  assert.ok(
    report.checks.some((check) => check.id === "replay-block" && check.passed),
  );
});

test("server HMAC binds owner, UUID, kind, ID, tier, economic fields and quantity", () => {
  const signer = createItemSigner({ key: Buffer.alloc(32, 7) }),
    original = loot("ring", 1),
    signed = signer.signItem("account-a", original);
  assert.equal(signer.verifyItem("account-a", signed), true);
  assert.equal(signer.verifyItem("account-b", signed), false);
  assert.equal(signer.verifyItem("account-a", original), false);
  for (const changed of [
    { uid: "different" },
    { kind: "bone" },
    { id: 2 },
    { tier: 2 },
    { code: "HR-99" },
    { w: 0 },
    { value: 9999 },
    { brought: true },
    { count: 99 },
    { signature: `v1.${"00".repeat(32)}` },
  ]) {
    assert.equal(
      signer.verifyItem("account-a", { ...signed, ...changed }),
      false,
    );
  }
  const authoritativeTransfer = signer.signItem("account-b", {
    ...signed,
    brought: true,
  });
  assert.equal(signer.verifyItem("account-b", authoritativeTransfer), true);
  assert.equal(signer.verifyItem("account-a", authoritativeTransfer), false);
});

test("server HMAC key survives restart in a private file and rejects undersized keys", () => {
  const directory = mkdtempSync(join(tmpdir(), "hg-item-signing-")),
    path = join(directory, "key"),
    signer = createItemSigner({ keyPath: path }),
    restarted = createItemSigner({ keyPath: path }),
    signed = signer.signItem("account-a", loot("material"));
  assert.equal(restarted.verifyItem("account-a", signed), true);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.throws(() => createItemSigner({ key: "short" }));
});

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
function serviceFixture({
  active,
  backup,
  signedSql = true,
  existingContainers = false,
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "hg-security-restore-")),
    backups = join(directory, ".local/backups"),
    bin = join(directory, "bin");
  mkdirSync(backups, { recursive: true });
  mkdirSync(bin);
  writeFileSync(
    join(directory, ".local/services.json"),
    JSON.stringify({
      databaseUrl: "postgresql://fixture:fixture@127.0.0.1:54329/fixture",
      redisUrl: "redis://127.0.0.1:63799",
    }),
  );
  writeFileSync(
    join(backups, "hongioi.sql"),
    signedSql
      ? "-- fixture: itemSignatureVersion"
      : "-- unsigned legacy fixture",
  );
  if (active)
    writeFileSync(join(directory, ".local/item-signing.key"), active, {
      mode: 0o600,
    });
  if (backup)
    writeFileSync(join(backups, "item-signing.key"), backup, { mode: 0o600 });
  writeFileSync(
    join(bin, "docker"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'inspect') process.exit(process.env.HG_TEST_CONTAINERS_EXIST === '1' ? 0 : 1);
if (args[0] === 'exec' && args.includes('psql')) fs.writeFileSync('.sql-restored', fs.readFileSync(0));
process.exit(0);
`,
    { mode: 0o700 },
  );
  const result = spawnSync(
    process.execPath,
    [join(projectRoot, "scripts/services.mjs")],
    {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        HG_ITEM_HMAC_KEY: "",
        HG_TEST_CONTAINERS_EXIST: existingContainers ? "1" : "0",
        PATH: `${bin}:${process.env.PATH}`,
      },
    },
  );
  return {
    directory,
    result,
    activePath: join(directory, ".local/item-signing.key"),
    restored: existsSync(join(directory, ".sql-restored")),
  };
}

test("setup restores a missing local HMAC key before restoring signed SQL using an isolated Docker fixture", () => {
  const key = Buffer.alloc(32, 17),
    fixture = serviceFixture({ backup: key });
  assert.equal(fixture.result.status, 0, fixture.result.stderr);
  assert.equal(fixture.restored, true);
  assert.deepEqual(readFileSync(fixture.activePath), key);
  assert.equal(statSync(fixture.activePath).mode & 0o777, 0o600);
});

test("setup refuses a mismatching active HMAC key and never replaces it or restores SQL", () => {
  const active = Buffer.alloc(32, 23),
    fixture = serviceFixture({ active, backup: Buffer.alloc(32, 24) });
  assert.notEqual(fixture.result.status, 0);
  assert.match(fixture.result.stderr, /Khóa HMAC hiện hành khác/);
  assert.equal(fixture.restored, false);
  assert.deepEqual(readFileSync(fixture.activePath), active);
});

test("setup fails closed for signed SQL without its HMAC key but permits legacy unsigned SQL", () => {
  const missing = serviceFixture();
  assert.notEqual(missing.result.status, 0);
  assert.match(missing.result.stderr, /thiếu khóa HMAC/);
  assert.equal(missing.restored, false);
  const legacy = serviceFixture({ signedSql: false });
  assert.equal(legacy.result.status, 0, legacy.result.stderr);
  assert.equal(legacy.restored, true);
  assert.equal(existsSync(legacy.activePath), false);
});

test("starting existing containers never silently restores or replaces an absent active key", () => {
  const fixture = serviceFixture({
    backup: Buffer.alloc(32, 17),
    existingContainers: true,
  });
  assert.equal(fixture.result.status, 0, fixture.result.stderr);
  assert.equal(fixture.restored, false);
  assert.equal(existsSync(fixture.activePath), false);
});

test("Android configuration is repeatable, retains certificate pins and integrates native guard before WebView creation", () => {
  const directory = mkdtempSync(join(tmpdir(), "hg-security-android-")),
    main = join(directory, "android/app/src/main"),
    pin = "AB".repeat(32);
  mkdirSync(main, { recursive: true });
  mkdirSync(join(directory, "android-webview"));
  for (const name of ["SecurityGuard.kt", "proguard-rules.pro"])
    copyFileSync(
      join(projectRoot, "android-webview", name),
      join(directory, "android-webview", name),
    );
  writeFileSync(
    join(main, "AndroidManifest.xml"),
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:allowBackup="true"><activity android:name=".MainActivity" /></application></manifest>',
  );
  writeFileSync(
    join(directory, "android/app/build.gradle"),
    "apply plugin: 'com.android.application'\nandroid { buildTypes { release { minifyEnabled false\nproguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n} } }\n",
  );
  const env = {
    ...process.env,
    HG_TRUSTED_SIGNING_SHA256: pin.match(/../g).join(":"),
  };
  let result = spawnSync(
    process.execPath,
    [join(projectRoot, "scripts/configure-android.mjs")],
    { cwd: directory, env, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  delete env.HG_TRUSTED_SIGNING_SHA256;
  result = spawnSync(
    process.execPath,
    [join(projectRoot, "scripts/configure-android.mjs")],
    { cwd: directory, env, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const activity = readFileSync(
      join(main, "java/vn/hongioi/sinhton/MainActivity.java"),
      "utf8",
    ),
    gradle = readFileSync(join(directory, "android/app/build.gradle"), "utf8");
  assert.ok(
    activity.indexOf("SecurityGuard.enforce(this, BuildConfig.DEBUG, false)") <
      activity.indexOf("super.onCreate"),
  );
  assert.match(activity, /setFilterTouchesWhenObscured\(true\)/);
  assert.match(
    activity,
    /addJavascriptInterface\(new NativeSecurityBridge\(this\), "HongioiNativeSecurity"\)/,
  );
  assert.match(
    activity,
    /@JavascriptInterface public String status\(\) \{ return SecurityGuard.statusJson\(context\); \}/,
  );
  assert.match(
    readFileSync(join(directory, "android/app/proguard-rules.pro"), "utf8"),
    /MainActivity\$NativeSecurityBridge/,
  );
  assert.match(
    readFileSync(join(main, "res/values/security-pins.xml"), "utf8"),
    new RegExp(pin),
  );
  assert.equal(
    (gradle.match(/apply from: 'security.build.gradle'/g) ?? []).length,
    1,
  );
  assert.match(gradle, /minifyEnabled true/);
  assert.match(gradle, /shrinkResources true/);
  assert.ok(existsSync(join(main, "java/vn/hongioi/sinhton/SecurityGuard.kt")));
  result = spawnSync(
    process.execPath,
    [join(projectRoot, "scripts/configure-android.mjs")],
    {
      cwd: directory,
      env: { ...env, HG_TRUSTED_SIGNING_SHA256: "invalid-pin" },
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HG_TRUSTED_SIGNING_SHA256/);
});
