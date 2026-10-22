import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { sourceSeedLineage } from "../tools/rig/source-seed-lineage.mjs";

test("source seed lineage survives intervening support edits and rejects stale parent or missing proof", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "source-seeds-"));
  try {
    const seed = path.join(root, "seed"),
      edit = path.join(root, "edit"),
      current = path.join(root, "current");
    for (const d of [seed, edit, current]) await fs.mkdir(d);
    const write = async (d, report) => {
      const bytes = Buffer.from(JSON.stringify(report));
      await fs.writeFile(path.join(d, "heat-solve.json"), bytes);
      return createHash("sha256").update(bytes).digest("hex");
    };
    const original = {
      hands: [
        {
          seeds: [
            { joint: "RightHandIndex1", originalSourceVertexIDs: [2, 4, 7] },
          ],
        },
      ],
    };
    const seedSha = await write(seed, original),
      editSha = await write(edit, { parent: seed, parentSolveSha256: seedSha });
    await write(current, { parent: edit, parentSolveSha256: editSha });
    const actual = await sourceSeedLineage(current, root);
    assert.deepEqual(actual.report, original);
    assert.equal(actual.chain.length, 3);
    await write(seed, { ...original, changed: true });
    await assert.rejects(sourceSeedLineage(current, root), /Stale parent/);
    await write(current, { parent: edit });
    await assert.rejects(
      sourceSeedLineage(current, root),
      /Missing hash-locked/,
    );
    await write(current, {
      parent: path.dirname(root),
      parentSolveSha256: seedSha,
    });
    await assert.rejects(sourceSeedLineage(current, root), /Invalid or cyclic/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
