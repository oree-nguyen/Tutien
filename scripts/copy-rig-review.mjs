import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const directory = "public/models/rig-review";
await fs.mkdir(directory, { recursive: true });
const entries = [];
for (const [hero, source] of [
  ["H01", "assets/rigged/H01-C0-robe-panels-diagnostic.glb"],
  ["H02", "assets/rigged/H02-C0-rigged.glb"],
]) {
  const bytes = await fs.readFile(source);
  if (bytes.subarray(0, 4).toString() !== "glTF")
    throw Error("Missing LFS asset: " + source);
  const hash = createHash("sha256").update(bytes).digest("hex"),
    target = directory + "/" + hero + ".glb";
  let same = false;
  try {
    same =
      createHash("sha256")
        .update(await fs.readFile(target))
        .digest("hex") === hash;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (!same) await fs.writeFile(target, bytes);
  entries.push({
    hero,
    file: hero + ".glb",
    sha256: hash,
    bytes: bytes.length,
    status: "diagnostic-not-approved",
  });
}
await fs.copyFile(
  "docs/anim-report/harmonic-held/H01-reference-idle-solve.json",
  directory + "/H01-held.json",
);
await fs.writeFile(
  directory + "/manifest.json",
  JSON.stringify({ version: 1, assets: entries }, null, 2) + "\n",
);
console.log("Offline rig review assets ready; originals unchanged.");
