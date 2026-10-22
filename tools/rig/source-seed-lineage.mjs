import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

/** Recover source seed IDs through hash-locked weight edits. This is provenance,
 * not anatomical approval; callers must recheck support on the current mesh. */
export async function sourceSeedLineage(
  candidate,
  staging = ".local/rig-candidates",
) {
  const root = path.resolve(staging),
    seen = new Set(),
    chain = [];
  let directory = path.resolve(candidate),
    expected = null;
  while (true) {
    if (!directory.startsWith(root + path.sep) || seen.has(directory))
      throw Error("Invalid or cyclic source seed lineage");
    seen.add(directory);
    const file = path.join(directory, "heat-solve.json"),
      bytes = await fs.readFile(file),
      sha256 = createHash("sha256").update(bytes).digest("hex"),
      report = JSON.parse(bytes);
    if (expected && expected !== sha256)
      throw Error("Stale parent source seed report");
    chain.push({ file, sha256 });
    if (report.hands?.length) return { report, chain };
    if (
      !report.parent ||
      !/^[a-f0-9]{64}$/.test(report.parentSolveSha256 ?? "")
    )
      throw Error("Missing hash-locked source seed parent");
    directory = path.resolve(report.parent);
    expected = report.parentSolveSha256;
  }
}
