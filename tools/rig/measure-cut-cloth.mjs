/** Actual exported cut-cloth diagnostics, with an independent corner oracle.
 * Proposed cuts do not grant a seam exception to the animation acceptance gate.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { threeRig, sha256 } from "./animation-payload.mjs";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
  SURFACE_LIMITS,
} from "./runtime-surface.mjs";
import { SeamAccumulator } from "./mesh-seams.mjs";
import { sourceSurfaceIntersections } from "./surface-intersections.mjs";
import { measureSkinNormalAgreement } from "./normal-agreement.mjs";
import { Matrix4 } from "three";

const [directory, poseFile, output] = process.argv.slice(2);
assert(
  /^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory ?? "") &&
    poseFile &&
    output,
);
const file = directory + "/H01-C0-rigged.glb",
  bytes = await fs.readFile(file),
  poseBytes = await fs.readFile(poseFile),
  pose = JSON.parse(poseBytes),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  rig = threeRig(doc),
  surfaces = createRuntimeSurfaces(doc, rig.root),
  planBytes = await fs.readFile(directory + "/cut-plan.json"),
  plan = JSON.parse(planBytes),
  sourceBytes = await fs.readFile(
    "public/models/hunyuan-original/H01-C0-source.glb",
  ),
  source = await io.readBinary(sourceBytes),
  sourceP = source.getRoot().listMeshes()[0].listPrimitives()[0],
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
assert.equal(sha256(sourceBytes), plan.sourceSha256);
assert.deepEqual(
  doc
    .getRoot()
    .listTextures()
    .map((t) => sha256(t.getImage())),
  source
    .getRoot()
    .listTextures()
    .map((t) => sha256(t.getImage())),
);
const cutBytes = await fs.readFile(directory + "/cut-edges.u32bin"),
  weldBytes = await fs.readFile(directory + "/source-welds.u32bin"),
  proof = JSON.parse(await fs.readFile(directory + "/source-continuity.json"));
assert.equal(sha256(cutBytes), plan.files["cut-edges.u32bin"].sha256);
assert.equal(sha256(weldBytes), proof.weldMapSha256);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "hg-panel-fans-"));
let expectedFans;
try {
  await fs.writeFile(
    temporary + "/triangles.u32bin",
    raw(Uint32Array.from(sourceP.getIndices().getArray())),
  );
  await fs.writeFile(temporary + "/welds.u32bin", weldBytes);
  await fs.writeFile(temporary + "/cuts.u32bin", cutBytes);
  execFileSync("python3", ["tools/rig/verify_cut_fans.py", temporary], {
    env: { ...process.env, OPENBLAS_NUM_THREADS: "1" },
  });
  const b = await fs.readFile(temporary + "/expected-corners.u32bin");
  expectedFans = Uint32Array.from(
    new Uint32Array(b.buffer, b.byteOffset, b.length / 4),
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
const faces = sourceP.getIndices().getCount() / 3,
  seen = new Uint8Array(faces),
  faceOrder = [],
  sourceIndex = sourceP.getIndices().getArray(),
  mappings = [];
for (const s of surfaces) {
  const p = s.primitive,
    extra = p.getExtras(),
    map = extra.sourceProvenance.triangleMap,
    mapBytes = await fs.readFile(path.resolve(directory, map.file));
  assert.equal(sha256(mapBytes), map.sha256);
  assert.equal(map.count * 3, s.index.length);
  const sourceIds = p.getAttribute("_SOURCE_VERTEX").getArray(),
    fans = p.getAttribute("_SOURCE_CUT_WELD").getArray();
  assert.equal(sourceIds.length, s.count);
  for (let v = 0; v < s.count; v++)
    for (const semantic of sourceP.listSemantics())
      assert.deepEqual(
        p.getAttribute(semantic).getElement(v, []),
        sourceP.getAttribute(semantic).getElement(sourceIds[v], []),
        "Changed source surface " + semantic,
      );
  const mapped = [];
  for (let i = 0; i < s.index.length; i += 3) {
    const f = mapBytes.readUInt32LE(map.offsetBytes + (i / 3) * 4);
    assert(f < faces && !seen[f]);
    seen[f] = 1;
    mapped.push(f);
    faceOrder.push(f);
    for (let k = 0; k < 3; k++) {
      assert.equal(sourceIds[s.index[i + k]], sourceIndex[f * 3 + k]);
      assert.equal(fans[s.index[i + k]], expectedFans[f * 3 + k]);
    }
  }
  mappings.push({ sourceIds, fans, mapped });
}
assert(seen.every((v) => v === 1));
const channels = new Set(Object.keys(pose.rotations));
rig.root.traverse((n) => {
  if (n.isBone) {
    assert(channels.delete(n.name), "Missing pose joint " + n.name);
    n.quaternion.fromArray(pose.rotations[n.name]);
    if (pose.translations[n.name])
      n.position.fromArray(pose.translations[n.name]);
  }
});
assert.equal(channels.size, 0);
assert(!pose.scales);
rig.root.updateWorldMatrix(true, true);
const total = surfaces.reduce((sum, s) => sum + s.count, 0),
  points = new Float32Array(total * 3),
  fans = new Uint32Array(total),
  indices = new Uint32Array(faces * 3),
  labels = new Uint8Array(faces),
  kept = new SeamAccumulator(),
  meshes = [];
let vertexAt = 0,
  faceAt = 0;
for (const [i, s] of surfaces.entries()) {
  const metric = measureRuntimeSurface(s);
  const normalAgreement = measureSkinNormalAgreement({
    positions: s.positions,
    posed: s.posed,
    normals: s.primitive.getAttribute("NORMAL").getArray(),
    indices: s.index,
    ids: s.ids,
    weights: s.weights,
    matrices: s.joints.map(
      (joint, j) =>
        new Matrix4().copy(joint.matrixWorld).multiply(s.inverseBind[j])
          .elements,
    ),
  });
  meshes.push({
    name: s.name,
    primitive: s.primitiveIndex,
    ...metric,
    normalAgreement,
  });
  const m = mappings[i];
  points.set(s.posed, vertexAt * 3);
  fans.set(m.fans, vertexAt);
  for (let v = 0; v < s.count; v++)
    kept.add(m.fans[v], {
      position: Array.from(s.posed.subarray(v * 3, v * 3 + 3)),
      bind: Array.from(s.positions.subarray(v * 3, v * 3 + 3)),
      sourceVertexId: m.sourceIds[v],
      identity: { mesh: i, vertex: v },
    });
  for (let k = 0; k < s.index.length; k++)
    indices[faceAt * 3 + k] = vertexAt + s.index[k];
  const label =
    s.name === "H01_Robe_Left" ? 1 : s.name === "H01_Robe_Right" ? 2 : 0;
  labels.fill(label, faceAt, faceAt + s.index.length / 3);
  faceAt += s.index.length / 3;
  vertexAt += s.count;
}
assert.equal(faceAt, faces);
const started = performance.now(),
  crossings = sourceSurfaceIntersections({
    positions: points,
    triangles: indices,
    welds: fans,
    labels,
    witnessLimit: 40,
  });
const { pairs, ...crossingSummary } = crossings,
  sourcePairs = Uint32Array.from(
    pairs.flatMap(([a, b]) => [faceOrder[a], faceOrder[b]]),
  ),
  pairFile = output.replace(/\.json$/, "-pairs.u32bin");
await fs.writeFile(pairFile, raw(sourcePairs));
const report = {
  file,
  sha256: sha256(bytes),
  poseFile,
  poseSha256: sha256(poseBytes),
  sourceSha256: sha256(sourceBytes),
  sourceFaces: faces,
  sourceCornersChecked: expectedFans.length,
  sourceAttributesAndImagesPreserved: true,
  independentFansPassed: true,
  cutEdges: cutBytes.length / 8,
  cutEdgesSha256: sha256(cutBytes),
  thresholds: SURFACE_LIMITS,
  meshes,
  keptSeams: kept.measure(),
  skinPassed: meshes.every((m) => m.passed),
  crossings: {
    ...crossingSummary,
    witnesses: crossingSummary.witnesses.map((w) => ({
      ...w,
      sourceFaces: w.sourceFaces.map((f) => faceOrder[f]),
    })),
    pairFile,
    pairSha256: sha256(raw(sourcePairs)),
    seconds: (performance.now() - started) / 1000,
  },
  accepted: false,
  activated: false,
  patternReviewed: false,
  scope:
    "Cloud exported one-pose source conservation/fan/strain/kept-seam/crossing diagnostics. Proposed cuts remain unapproved. No whole-motion, penetration-depth, thickness, natural-drape or phone acceptance.",
};
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    skinPassed: report.skinPassed,
    keptSeamMm: report.keptSeams.maximumMillimetres,
    crossingPairs: crossings.crossingPairs,
  }),
);
