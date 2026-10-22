/** Fit actual unchanged source boot surfaces, not a virtual ankle marker.
 * Offline staging key-pose only; every subsequent weight change invalidates it.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Quaternion, Vector3 } from "three";
import { ReferencePose } from "./reference-pose.mjs";
import { threeRig } from "./animation-payload.mjs";
import { sourceFootContact } from "./source-foot-contact.mjs";
import { calibratedRotation } from "./source-bind-calibration.mjs";
import { solveOfflineChain } from "./offline-entrance-ik.mjs";
import { sourceBindIdentity } from "./source-bind-identity.mjs";

const [asset, poseFile, selectionFile, output] = process.argv.slice(2);
if (!asset || !poseFile || !selectionFile || !output)
  throw Error("Usage: asset pose-json source-selection-json output-json");
if (
  !path
    .resolve(asset)
    .startsWith(path.resolve(".local/rig-candidates") + path.sep)
)
  throw Error("Source contact fitting must use a staging asset");
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  assetBytes = await fs.readFile(asset),
  poseBytes = await fs.readFile(poseFile),
  sourcePose = JSON.parse(poseBytes),
  selectionBytes = await fs.readFile(selectionFile),
  selection = JSON.parse(selectionBytes),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(assetBytes),
  bindBytes = await fs.readFile(sourcePose.input);
if (
  sha(bindBytes) !== sourcePose.inputSha256 ||
  selection.hero !== sourcePose.hero
)
  throw Error("Stale or mismatched source pose");
if (sha(await fs.readFile(selection.source)) !== selection.sourceSha256)
  throw Error("Stale original boot source");
const original = await io.read(selection.source),
  primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  sourcePrimitive = original.getRoot().listMeshes()[0].listPrimitives()[0],
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
if (
  doc.getRoot().listMeshes().length !== 1 ||
  doc.getRoot().listMeshes()[0].listPrimitives().length !== 1
)
  throw Error("Explicit original source layout required");
for (const semantic of ["POSITION", "NORMAL", "TEXCOORD_0"])
  if (
    !raw(primitive.getAttribute(semantic).getArray()).equals(
      raw(sourcePrimitive.getAttribute(semantic).getArray()),
    )
  )
    throw Error("Source boot IDs differ: " + semantic);
if (
  !raw(primitive.getIndices().getArray()).equals(
    raw(sourcePrimitive.getIndices().getArray()),
  )
)
  throw Error("Source topology differs");
const bindDoc = await io.readBinary(bindBytes);
if (sourceBindIdentity(doc) !== sourceBindIdentity(bindDoc))
  throw Error("Pose uses a different bind");
const limits = {
    ...JSON.parse(await fs.readFile("data/rig/joint-limits.json")),
    pronation: { flex: [0, 0], lateral: [0, 0], twist: [-80, 80] },
  },
  pose = new ReferencePose(doc, sourcePose.frames, limits),
  rig = threeRig(doc),
  contact = sourceFootContact(doc, rig.root, { sourceSelection: selection });
for (const [name, q] of Object.entries(sourcePose.rotations)) {
  if (
    !pose.nodes.has(name) ||
    q.length !== 4 ||
    !q.every(Number.isFinite) ||
    Math.abs(Math.hypot(...q) - 1) > 1e-6
  )
    throw Error("Invalid source rotation " + name);
  pose.nodes.get(name).setRotation(q);
}
for (const [name, t] of Object.entries(sourcePose.translations)) {
  if (name !== "Hips" || t.length !== 3 || !t.every(Number.isFinite))
    throw Error("Invalid source root");
  pose.nodes.get(name).setTranslation(t);
}
function measure() {
  for (const [name, node] of pose.nodes) {
    const bone = rig.root.getObjectByName(name);
    bone.position.fromArray(node.getTranslation());
    bone.quaternion.fromArray(node.getRotation());
  }
  rig.root.updateWorldMatrix(true, true);
  return contact.measure();
}
const before = measure(),
  fits = [],
  traces = [];
for (const side of ["Right", "Left"]) {
  const foot = pose.nodes.get(side + "Foot"),
    toe = pose.nodes.get(side + "ToeBase"),
    anchor = pose.position(foot),
    orientation = pose.rotation(foot),
    kneePole = pose.position(pose.nodes.get(side + "Leg")),
    toeFlex = side === "Right" ? 20 : 0;
  // The existing calibrated ToeBase has a conservative +20 degree flex limit.
  // Do not widen it to flatten the forefoot artificially. Raised-heel support
  // is measured at the actual source underside; the flat foot remains flat.
  toe.setRotation(
    calibratedRotation(sourcePose.frames[toe.getName()], {
      flex: toeFlex,
    }).toArray(),
  );
  const target = anchor.clone(),
    iterations = [];
  let fit;
  for (let i = 0; i < 20; i++) {
    const surface = measure()[side];
    iterations.push({
      iteration: i,
      ankle: pose.position(foot).toArray(),
      surface,
    });
    if (Math.abs(surface.minimumY) <= 0.00005 && fit?.passed) break;
    target.y -= surface.minimumY;
    fit = solveOfflineChain(
      pose,
      [side + "UpLeg", side + "Leg", side + "Foot"],
      {
        target,
        orientation: new Quaternion().copy(orientation),
        pole: new Vector3().copy(kneePole),
        boundedFit: true,
      },
    );
    if (!fit.passed)
      throw Error(
        "Source floor correction cannot satisfy unchanged joint limits: " +
          side,
      );
  }
  fits.push({ chain: side + "Foot", ...fit });
  traces.push({ side, toeFlexDegrees: toeFlex, iterations });
}
const after = measure(),
  violations = [...pose.nodes.values()].flatMap((n) =>
    pose.inspect(n).map((v) => ({ joint: n.getName(), ...v })),
  ),
  contactPassed = Object.values(after).every(
    (s) => Math.abs(s.minimumY) <= 0.005,
  ),
  report = {
    ...sourcePose,
    scope:
      "Actual graph-selected source boot key-pose contact fit; not whole-motion, sole semantic, skin, garment, finger or appearance acceptance",
    surfaceAsset: asset,
    surfaceAssetSha256: sha(assetBytes),
    parentPose: poseFile,
    parentPoseSha256: sha(poseBytes),
    sourceSelection: selectionFile,
    sourceSelectionSha256: sha(selectionBytes),
    sourceSha256: selection.sourceSha256,
    accepted: false,
    activated: false,
    passed: fits.every((f) => f.passed) && !violations.length && contactPassed,
    footContactPassed: contactPassed,
    feet: { before, after, traces },
    fits: [
      ...fits,
      ...sourcePose.fits.filter((f) => !f.chain.endsWith("Foot")),
    ],
    violations,
    positions: Object.fromEntries(
      [...pose.nodes].map(([name, node]) => [
        name,
        pose.position(node).toArray(),
      ]),
    ),
    rotations: Object.fromEntries(
      [...pose.nodes].map(([name, node]) => [name, node.getRotation()]),
    ),
  };
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      hero: report.hero,
      passed: report.passed,
      before,
      after,
      iterations: traces.map((t) => t.iterations.length),
      violations: violations.length,
    },
    null,
    2,
  ),
);
process.exitCode = report.passed ? 0 : 1;
