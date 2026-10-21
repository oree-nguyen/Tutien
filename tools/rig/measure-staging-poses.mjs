import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { threeRig } from "./animation-payload.mjs";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
  SURFACE_LIMITS,
} from "./runtime-surface.mjs";
const [file, output, ...poses] = process.argv.slice(2);
if (!file || !output || !poses.length)
  throw Error("Usage: asset output pose-json...");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  bytes = await fs.readFile(file),
  doc = await io.readBinary(bytes),
  rig = threeRig(doc),
  surfaces = createRuntimeSurfaces(doc, rig.root),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  bind = [];
rig.root.traverse((n) => {
  if (n.isBone)
    bind.push([n, n.position.clone(), n.quaternion.clone(), n.scale.clone()]);
});
const report = {
  file,
  sha256: hash(bytes),
  scope:
    "Staging key-pose diagnostics only; not animation/texture/provenance/contact/collision acceptance and not runtime activation",
  thresholds: SURFACE_LIMITS,
  activated: false,
  accepted: false,
  poses: [],
};
for (const name of poses) {
  for (const [n, p, q, s] of bind) {
    n.position.copy(p);
    n.quaternion.copy(q);
    n.scale.copy(s);
  }
  const input = await fs.readFile(name),
    pose = JSON.parse(input);
  for (const [node, q] of Object.entries(pose.rotations ?? {})) {
    const n = rig.root.getObjectByName(node);
    if (!n || q.length !== 4 || !q.every(Number.isFinite))
      throw Error("Invalid pose node " + node);
    n.quaternion.fromArray(q);
  }
  for (const [node, p] of Object.entries(pose.translations ?? {})) {
    const n = rig.root.getObjectByName(node);
    if (!n || p.length !== 3 || !p.every(Number.isFinite))
      throw Error("Invalid pose translation " + node);
    n.position.fromArray(p);
  }
  rig.root.updateWorldMatrix(true, true);
  const meshes = surfaces.map((s) => ({
    name: s.name,
    primitive: s.primitiveIndex,
    ...measureRuntimeSurface(s),
  }));
  report.poses.push({
    name,
    sha256: hash(input),
    upstreamPassed: pose.passed === true,
    meshes,
    skinPassed: meshes.every((m) => m.passed),
  });
  console.log(
    name,
    meshes.map((m) => ({
      name: m.name,
      p999: m.p999,
      max: m.maximum,
      minY: m.minimumY,
    })),
  );
}
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
process.exitCode = report.poses.every((p) => p.skinPassed) ? 0 : 1;
