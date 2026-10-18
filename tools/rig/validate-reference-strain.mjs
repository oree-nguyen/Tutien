import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { posedHand } from "./pose-hand.mjs";
import { handStrain } from "./hand-strain.mjs";
const hero = "H01",
  bytes = await fs.readFile(
    `${process.env.RIG_INPUT_DIR ?? "assets/rigged"}/${hero}-C0-rigged.glb`,
  ),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  pose = JSON.parse(
    await fs.readFile(
      process.env.REFERENCE_POSE ??
        `docs/anim-report/${hero}-reference-idle-solve.json`,
    ),
  ),
  frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands,
  nodes = new Map(
    doc
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
if (!pose.passed) throw Error("Reference pose solve failed");
for (const [name, q] of Object.entries(pose.rotations))
  nodes.get(name).setRotation(q);
const reports = ["Right", "Left"].map((side) => ({
  hand: side,
  ...handStrain(
    posedHand(doc, frames[side], side, null, { applyFingerPose: false }),
  ),
}));
if (process.argv.includes("--whole-body")) {
  const body = posedHand(doc, frames.Right, "Right", null, {
    applyFingerPose: false,
  });
  body.mask.fill(1);
  reports.push({ hand: "WholeBody", ...handStrain(body) });
}
const report = {
  hero,
  passed: reports.every((r) => r.passed),
  scope: process.argv.includes("--whole-body")
    ? "Both hands/cuffs and whole source topology at one upright pose; not full-animation acceptance"
    : "Both hands/cuffs at the actual upright reference pose; not whole-body or full-animation skin acceptance",
  rigSha256: createHash("sha256").update(bytes).digest("hex"),
  poseSha256: createHash("sha256")
    .update(JSON.stringify(pose.rotations))
    .digest("hex"),
  reports,
};
const output = process.env.RIG_REPORT_DIR ?? "docs/anim-report";
await fs.mkdir(output, { recursive: true });
await fs.writeFile(
  `${output}/${hero}-reference-strain.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
if (!report.passed) process.exitCode = 1;
