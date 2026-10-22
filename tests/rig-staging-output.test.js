import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { assertUnusedStagingOutput } from "../tools/rig/staging-output.mjs";

test("source-panel tools refuse occupied or archived trials before reading another source or writing data", async () => {
  const directory = ".local/rig-candidates/test-staging-guard-" + randomUUID(),
    old = Buffer.from("untouched completed trial bytes"),
    base = ".local/rig-candidates/missing-source",
    pattern = ".local/rig-candidates/missing-pattern";
  await fs.mkdir(directory);
  try {
    await fs.writeFile(directory + "/H01-C0-rigged.glb", old);
    for (const [tool, args] of [
      [
        "rebase-source-garment.mjs",
        [base + "/H01-C0-rigged.glb", pattern, directory],
      ],
      [
        "prepare-cut-cloth-feasibility.mjs",
        [base, directory, "missing-pose.json"],
      ],
      ["export-cut-cloth-fit.mjs", [directory]],
      ["stage-secondary-cloth.mjs", [base, directory, "missing-pose.json"]],
    ]) {
      const result = spawnSync(
        process.execPath,
        ["tools/rig/" + tool, ...args],
        { encoding: "utf8" },
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Staging output already exists/);
      assert.deepEqual(
        await fs.readFile(directory + "/H01-C0-rigged.glb"),
        old,
      );
      assert.deepEqual(await fs.readdir(directory), ["H01-C0-rigged.glb"]);
    }
    await fs.unlink(directory + "/H01-C0-rigged.glb");
    await fs.writeFile(directory + "/model-archive.json", "{}");
    await assert.rejects(
      assertUnusedStagingOutput(directory),
      /already exists/,
    );
    await fs.unlink(directory + "/model-archive.json");
    await fs.symlink("missing-target", directory + "/H01-C0-rigged.glb");
    await assert.rejects(
      assertUnusedStagingOutput(directory),
      /already exists/,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
