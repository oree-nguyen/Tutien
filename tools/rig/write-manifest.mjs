import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const structure = JSON.parse(
  await fs.readFile("docs/rig-audit/fullres-structure.json"),
);
const skin = JSON.parse(await fs.readFile("docs/rig-audit/skin-strain.json"));
const grip = JSON.parse(
  await fs.readFile("docs/hand-frames/grip-acceptance.json"),
);
const joints = JSON.parse(
  await fs.readFile("docs/rig-audit/legacy-joint-limits.json"),
);
const browser = JSON.parse(
  await fs.readFile("docs/rig-audit/fullres-browser/report.json"),
);
const assets = [];
for (const hero of ["H01", "H02"]) {
  const receipt = JSON.parse(
    await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb.json`),
  );
  const actualHash = createHash("sha256")
    .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
    .digest("hex");
  if (actualHash !== receipt.sha256)
    throw new Error(hero + " receipt is stale");
  for (const [name, report] of [
    ["structure", structure],
    ["skin", skin],
    ["joints", joints],
    ["browser", browser],
  ])
    if (report.reports.find((r) => r.hero === hero)?.rigSha256 !== actualHash)
      throw new Error(hero + " " + name + " report is stale; rerun its check");
  assets.push({
    id: hero + "-C0",
    file: receipt.file,
    sha256: receipt.sha256,
    bytes: receipt.bytes,
    source: receipt.source,
    sourceSha256: receipt.sourceHash,
    status: "staging",
    runtimeEnabled: false,
    checks: {
      sourceBytesAndRigStructure: structure.passed,
      diagnosticHandSkin: skin.reports.find((r) => r.hero === hero).passed,
      geometricGripCandidate: grip.reports.find((r) => r.hero === hero).passed,
      legacyJointLimits: joints.reports.find((r) => r.hero === hero).passed,
      newReferenceEntrance: false,
      actualSkinnedGripContact: false,
      androidDevice: false,
    },
  });
}
await fs.writeFile(
  "assets/rigged/manifest.json",
  JSON.stringify(
    {
      version: 1,
      status:
        "Staging only; runtime activation requires all animation/contact checks, not just byte preservation",
      assets,
    },
    null,
    2,
  ) + "\n",
);
