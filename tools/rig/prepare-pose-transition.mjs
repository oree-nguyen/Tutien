import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sha256 } from "./animation-payload.mjs";
import { interpolatePose } from "./pose-transition.mjs";

const [asset, poseFile, output, count = "20"] = process.argv.slice(2);
assert(
  asset && poseFile && output,
  "Usage: asset pose-json unused-output steps",
);
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output));
const steps = Number(count);
assert(Number.isInteger(steps) && steps >= 4 && steps <= 120);
assert(
  !(await fs.stat(output).catch(() => null)),
  "Transition output already exists",
);
const bytes = await fs.readFile(asset),
  poseBytes = await fs.readFile(poseFile),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  target = JSON.parse(poseBytes),
  skins = doc.getRoot().listSkins();
assert.equal(skins.length, 1);
assert.equal(target.poseDataValid, true);
const bind = { rotations: {}, translations: {} };
for (const node of skins[0].listJoints()) {
  assert(!bind.rotations[node.getName()], "Duplicate bound joint name");
  bind.rotations[node.getName()] = node.getRotation();
  bind.translations[node.getName()] = node.getTranslation();
  assert.deepEqual(node.getScale(), [1, 1, 1], "No scaled diagnostic joints");
}
const files = [];
await fs.mkdir(output);
for (let i = 0; i <= steps; i++) {
  const pose = {
    ...interpolatePose(bind, target, i / steps),
    asset,
    assetSha256: sha256(bytes),
    targetPose: poseFile,
    targetPoseSha256: sha256(poseBytes),
  };
  const file = path.join(
      output,
      "pose-" + String(i).padStart(3, "0") + ".json",
    ),
    raw = Buffer.from(JSON.stringify(pose, null, 2) + "\n");
  await fs.writeFile(file, raw);
  files.push({ file, sha256: sha256(raw), t: pose.t });
}
await fs.writeFile(
  path.join(output, "input.json"),
  JSON.stringify(
    {
      asset,
      assetSha256: sha256(bytes),
      poseFile,
      poseSha256: sha256(poseBytes),
      steps,
      samples: files.length,
      files,
      accepted: false,
      activated: false,
      scope:
        "Diagnostic joint interpolation, not authored/contact-constrained animation. All samples must be measured on actual GLB primitives.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ output, samples: files.length }));
