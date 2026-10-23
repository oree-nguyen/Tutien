/** Independent native LBS hand shape diagnostics, never a contact certificate. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { threeRig, sha256 } from "./animation-payload.mjs";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
} from "./runtime-surface.mjs";
import { sourceHandDomains } from "./source-hand-domains.mjs";
import { measureSkinNormalAgreement } from "./normal-agreement.mjs";
import { sourceSurfaceIntersections } from "./surface-intersections.mjs";

const [candidate, output, ...poseFiles] = process.argv.slice(2);
assert(
  candidate?.startsWith(".local/rig-candidates/") && output && poseFiles.length,
);
const asset = candidate + "/H01-C0-rigged.glb",
  bytes = await fs.readFile(asset),
  solveBytes = await fs.readFile(candidate + "/solve.json"),
  solve = JSON.parse(solveBytes),
  receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
assert.equal(sha256(bytes), receipt.sha256);
assert.equal(sha256(solveBytes), receipt.solveSha256);
const metaBytes = await fs.readFile(solve.input + "/input.json");
assert.equal(sha256(metaBytes), solve.inputMetadataSha256);
const meta = JSON.parse(metaBytes),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  rig = threeRig(doc);
const surface = createRuntimeSurfaces(doc, rig.root).find(
  (s) => s.name === meta.mesh && s.primitiveIndex === meta.primitive,
);
const p = surface.primitive,
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength),
  fans = p.getAttribute("_SOURCE_CUT_WELD").getArray();
assert.equal(
  sha256(raw(p.getAttribute("POSITION").getArray())),
  meta.files["positions.f32bin"],
);
assert.equal(sha256(raw(fans)), meta.files["fans.u32bin"]);
const touched = await fs.readFile(candidate + "/touched.u8bin");
assert.equal(sha256(touched), solve.files["touched.u8bin"]);
const domains = sourceHandDomains(
  fans,
  surface.index,
  touched,
  solve.hands,
).map((domain) => {
  const triangles = [],
    mapping = [],
    vertices = [],
    lookup = new Map();
  for (let at = 0; at < surface.index.length; at += 3) {
    const row = Array.from(surface.index.subarray(at, at + 3));
    if (!row.some((v) => domain.mask[v])) continue;
    mapping.push(at / 3);
    for (const v of row) {
      if (!lookup.has(v)) {
        lookup.set(v, vertices.length);
        vertices.push(v);
      }
      triangles.push(lookup.get(v));
    }
  }
  const positions = new Float64Array(vertices.length * 3),
    welds = Uint32Array.from(vertices, (v) =>
      p.getAttribute("_SOURCE_WELD").getScalar(v),
    );
  for (let v = 0; v < vertices.length; v++)
    positions.set(
      surface.positions.subarray(vertices[v] * 3, vertices[v] * 3 + 3),
      v * 3,
    );
  const labels = new Uint8Array(mapping.length).fill(1);
  const base = sourceSurfaceIntersections({
    positions,
    triangles,
    welds,
    labels,
    witnessLimit: 20,
  });
  return {
    ...domain,
    vertices,
    triangles,
    mapping,
    welds,
    labels,
    bind: base,
    bindPairs: new Set(base.pairs.map((pair) => pair.join(":"))),
    indices: Uint32Array.from(triangles, (v) => vertices[v]),
  };
});
const saved = [];
rig.root.traverse((n) => {
  if (n.isBone) saved.push([n, n.position.clone(), n.quaternion.clone()]);
});
const report = {
  asset,
  assetSha256: sha256(bytes),
  solveSha256: sha256(solveBytes),
  accepted: false,
  activated: false,
  scope:
    "Hash-bound Remaining_Source hand components only. Includes all incident faces. Original source-weld neighbors excluded from self-crossings. Does not cover cuff copies, external palm seed, garment collisions, containment, thickness, volume, contact or complete animation. Diagnostic only.",
  poses: [],
};
for (const file of poseFiles) {
  const bytes = await fs.readFile(file),
    pose = JSON.parse(bytes);
  assert.equal(Object.keys(pose.rotations).length, saved.length);
  for (const [n, t, q] of saved) {
    n.position.copy(t);
    n.quaternion.copy(q);
  }
  for (const [name, q] of Object.entries(pose.rotations))
    rig.root.getObjectByName(name).quaternion.fromArray(q);
  for (const [name, t] of Object.entries(pose.translations ?? {}))
    rig.root.getObjectByName(name).position.fromArray(t);
  rig.root.updateWorldMatrix(true, true);
  measureRuntimeSurface(surface);
  const matrices = surface.joints.map(
    (n, i) =>
      new Matrix4().copy(n.matrixWorld).multiply(surface.inverseBind[i])
        .elements,
  );
  const hands = domains.map((d) => {
    const positions = new Float64Array(d.vertices.length * 3);
    for (let v = 0; v < d.vertices.length; v++)
      positions.set(
        surface.posed.subarray(d.vertices[v] * 3, d.vertices[v] * 3 + 3),
        v * 3,
      );
    const current = sourceSurfaceIntersections({
      positions,
      triangles: d.triangles,
      welds: d.welds,
      labels: d.labels,
      witnessLimit: 20,
    });
    const pairs = new Set(current.pairs.map((pair) => pair.join(":")));
    return {
      side: d.side,
      vertices: d.vertices.length,
      triangles: d.mapping.length,
      normals: measureSkinNormalAgreement({
        positions: surface.positions,
        posed: surface.posed,
        normals: p.getAttribute("NORMAL").getArray(),
        indices: d.indices,
        ids: surface.ids,
        weights: surface.weights,
        matrices,
      }),
      selfCrossings: {
        bind: d.bind.crossingPairs,
        posed: current.crossingPairs,
        newPairs: [...pairs].filter((k) => !d.bindPairs.has(k)).length,
        removedPairs: [...d.bindPairs].filter((k) => !pairs.has(k)).length,
        coplanarAmbiguous: current.coplanarOverlapPairs,
        pointTouches: current.pointTouchPairs,
        witnesses: current.witnesses.map((w) => ({
          ...w,
          remainingPrimitiveFaces: w.sourceFaces.map((f) => d.mapping[f]),
        })),
      },
    };
  });
  report.poses.push({ file, sha256: sha256(bytes), hands });
}
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  report.poses.map((p) => ({
    file: p.file,
    hands: p.hands.map((h) => ({
      side: h.side,
      newOpposed: h.normals.newOpposed,
      crossings: h.selfCrossings,
    })),
  })),
);
