/** Separate connected hand domains so head/boot edges cannot dilute hand p999. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { threeRig, sha256 } from "../../../../tools/rig/animation-payload.mjs";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
} from "../../../../tools/rig/runtime-surface.mjs";
import { handStrain } from "../../../../tools/rig/hand-strain.mjs";
import { sourceHandDomains } from "../../../../tools/rig/source-hand-domains.mjs";
const [candidate, output, ...poseFiles] = process.argv.slice(2);
const bytes = await fs.readFile(candidate + "/H01-C0-rigged.glb"),
  solveBytes = await fs.readFile(candidate + "/solve.json"),
  solve = JSON.parse(solveBytes);
const receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
assert.equal(sha256(bytes), receipt.sha256);
assert.equal(sha256(solveBytes), receipt.solveSha256);
const metaBytes = await fs.readFile(solve.input + "/input.json");
assert.equal(sha256(metaBytes), solve.inputMetadataSha256);
const meta = JSON.parse(metaBytes),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  rig = threeRig(doc);
const s = createRuntimeSurfaces(doc, rig.root).find(
    (s) => s.name === meta.mesh && s.primitiveIndex === meta.primitive,
  ),
  p = s.primitive;
const raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
assert.equal(
  sha256(raw(p.getAttribute("POSITION").getArray())),
  meta.files["positions.f32bin"],
);
assert.equal(
  sha256(raw(p.getAttribute("_SOURCE_CUT_WELD").getArray())),
  meta.files["fans.u32bin"],
);
const touched = await fs.readFile(candidate + "/touched.u8bin");
assert.equal(sha256(touched), solve.files["touched.u8bin"]);
const masks = sourceHandDomains(
  p.getAttribute("_SOURCE_CUT_WELD").getArray(),
  s.index,
  touched,
  solve.hands,
);
const bind = [];
rig.root.traverse((n) => {
  if (n.isBone) bind.push([n, n.position.clone(), n.quaternion.clone()]);
});
const report = {
  asset: candidate + "/H01-C0-rigged.glb",
  assetSha256: sha256(bytes),
  solveSha256: sha256(solveBytes),
  maskScope:
    "Hash-bound touched source component, identified by all measured side seeds; no bounding box. Cuff copies remain independently covered by full-primitive diagnostics. Not an accepted anatomy mask.",
  accepted: false,
  activated: false,
  poses: [],
};
for (const file of poseFiles) {
  const b = await fs.readFile(file),
    pose = JSON.parse(b);
  assert.equal(Object.keys(pose.rotations).length, bind.length);
  for (const [n, t, q] of bind) {
    n.position.copy(t);
    n.quaternion.copy(q);
  }
  for (const [n, q] of Object.entries(pose.rotations))
    rig.root.getObjectByName(n).quaternion.fromArray(q);
  for (const [n, t] of Object.entries(pose.translations ?? {}))
    rig.root.getObjectByName(n).position.fromArray(t);
  rig.root.updateWorldMatrix(true, true);
  measureRuntimeSurface(s);
  report.poses.push({
    file,
    sha256: sha256(b),
    hands: masks.map(({ side, mask }) => ({
      side,
      ...handStrain({
        primitive: p,
        mask,
        position: (i) => new Vector3().fromArray(s.posed, i * 3),
      }),
    })),
  });
}
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  report.poses.map((p) => ({
    file: p.file,
    hands: p.hands.map((h) => ({
      side: h.side,
      passed: h.passed,
      p999: h.p999,
      max: h.maximum,
    })),
  })),
);
