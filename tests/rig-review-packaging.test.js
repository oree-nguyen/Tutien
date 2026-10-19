import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { transform } from "esbuild";
import { copyRigReview } from "../scripts/copy-rig-review.mjs";

async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hg-rig-packaging-"));
  try { await fn(root); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

test("default packaging prunes only known generated copies without reading source models", async () => {
  await fixture(async root => {
    const directory = path.join(root, "public/models/rig-review");
    await fs.mkdir(path.join(directory, "user-folder"), { recursive: true });
    for (const name of ["H01.glb", "H02.glb", "H01-held.json", "manifest.json"])
      await fs.writeFile(path.join(directory, name), "stale");
    await fs.writeFile(path.join(directory, "user-notes.txt"), "keep me");
    const result = await copyRigReview({ root, enabled: false });
    assert.equal(result.removedBytes, 20);
    assert.deepEqual((await fs.readdir(directory)).sort(), ["user-folder", "user-notes.txt"]);
    assert.equal(await fs.readFile(path.join(directory, "user-notes.txt"), "utf8"), "keep me");
    assert.deepEqual(await copyRigReview({ root, enabled: false }), { enabled: false, removedBytes: 0 });
  });
});

test("opt-in copies model bytes unchanged and disabling it removes those copies", async () => {
  await fixture(async root => {
    const sources = ["assets/rigged/H01-C0-robe-panels-diagnostic.glb", "assets/rigged/H02-C0-rigged.glb"];
    const models = sources.map((_, i) => Buffer.from("glTF fixture original " + i));
    await fs.mkdir(path.join(root, "assets/rigged"), { recursive: true });
    await fs.mkdir(path.join(root, "docs/anim-report/harmonic-held"), { recursive: true });
    await fs.writeFile(path.join(root, "docs/anim-report/harmonic-held/H01-reference-idle-solve.json"), '{"diagnostic":true}\n');
    for (const [i, source] of sources.entries()) await fs.writeFile(path.join(root, source), models[i]);
    const result = await copyRigReview({ root, enabled: true });
    assert.equal(result.modelBytes, models.reduce((sum, bytes) => sum + bytes.length, 0));
    const directory = path.join(root, "public/models/rig-review");
    const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
    for (const [i, asset] of manifest.assets.entries()) {
      assert.deepEqual(await fs.readFile(path.join(directory, asset.file)), models[i]);
      assert.equal(asset.sha256, createHash("sha256").update(models[i]).digest("hex"));
      assert.equal(asset.status, "diagnostic-not-approved");
    }
    assert.equal(await fs.readFile(path.join(directory, "H01-held.json"), "utf8"), '{"diagnostic":true}\n');
    await copyRigReview({ root, enabled: false });
    assert.deepEqual(await fs.readdir(directory), []);
    for (const [i, source] of sources.entries()) assert.deepEqual(await fs.readFile(path.join(root, source)), models[i]);
  });
});

test("only the exact environment opt-in enables the CLI", async () => {
  await fixture(async root => {
    const script = new URL("../scripts/copy-rig-review.mjs", import.meta.url);
    for (const flag of ["", "true", "0"]) {
      const result = spawnSync(process.execPath, [script.pathname], {
        cwd: root, encoding: "utf8", env: { ...process.env, HG_INCLUDE_RIG_REVIEW: flag },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Rig review excluded/);
    }
    const enabled = spawnSync(process.execPath, [script.pathname], {
      cwd: root, encoding: "utf8", env: { ...process.env, HG_INCLUDE_RIG_REVIEW: "1" },
    });
    assert.notEqual(enabled.status, 0, "enabled copying must require the source assets");
  });
});

test("packaging refuses a symlinked copy directory and preserves its contents", async () => {
  await fixture(async root => {
    const userDirectory = path.join(root, "user-assets");
    await fs.mkdir(userDirectory);
    await fs.writeFile(path.join(userDirectory, "H01.glb"), "user content");
    await fs.mkdir(path.join(root, "public/models"), { recursive: true });
    await fs.symlink(userDirectory, path.join(root, "public/models/rig-review"));
    await assert.rejects(copyRigReview({ root, enabled: false }), /symlinked/);
    assert.equal(await fs.readFile(path.join(userDirectory, "H01.glb"), "utf8"), "user content");
  });
});

test("game help offers the separate review route only in an enabled build", async () => {
  const source = await fs.readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const start = source.indexOf("function showHelp() {");
  const end = source.indexOf("\nasync function startMatch", start);
  assert.ok(start >= 0 && end > start);
  for (const enabled of [false, true]) {
    const { code } = await transform(source.slice(start, end) + "\nshowHelp();", {
      define: { "import.meta.env.HG_INCLUDE_RIG_REVIEW": JSON.stringify(enabled) },
    });
    let body;
    runInNewContext(code, { showModal: (_title, html) => { body = html; } });
    assert.equal(body.includes('href="./rig-review.html"'), enabled);
    assert.match(body, /Android \/ AI Studio/);
  }
});
