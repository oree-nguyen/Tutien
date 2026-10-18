import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Vector3 } from "three";
import { createHash } from "node:crypto";
import { handStrain } from "./hand-strain.mjs";
const input =
  process.env.RIG_FILE ?? "assets/rigged/H01-C0-robe-panels-diagnostic.glb";
const bytes = await fs.readFile(input),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
if (process.env.REFERENCE_POSE) {
  const pose = JSON.parse(await fs.readFile(process.env.REFERENCE_POSE));
  if (!pose.passed) throw Error("Reference pose is not validated");
  for (const node of doc.getRoot().listNodes())
    if (pose.rotations[node.getName()])
      node.setRotation(pose.rotations[node.getName()]);
}
const meshes = [],
  shared = new Map();
let maxSeamGap = 0,
  seamPairs = 0,
  worstSeam;
for (const node of doc
  .getRoot()
  .listNodes()
  .filter((n) => n.getMesh())) {
  const skin = node.getSkin();
  if (!skin) throw Error("Unskinned mesh " + node.getName());
  const matrices = skin
    .listJoints()
    .map((j, i) =>
      new Matrix4()
        .fromArray(j.getWorldMatrix())
        .multiply(
          new Matrix4().fromArray(
            skin.getInverseBindMatrices().getElement(i, []),
          ),
        ),
    );
  for (const p of node.getMesh().listPrimitives()) {
    const source = p.getAttribute("POSITION").getArray(),
      ids = p.getAttribute("JOINTS_0").getArray(),
      weights = p.getAttribute("WEIGHTS_0").getArray(),
      count = source.length / 3,
      posed = new Float64Array(source.length);
    const value = new Vector3(),
      q = new Vector3();
    for (let i = 0; i < count; i++) {
      value.set(0, 0, 0);
      for (let k = 0; k < 4; k++)
        if (weights[i * 4 + k]) {
          q.fromArray(source, i * 3).applyMatrix4(matrices[ids[i * 4 + k]]);
          value.addScaledVector(q, weights[i * 4 + k]);
        }
      value.toArray(posed, i * 3);
      const key =
          source[i * 3] + "," + source[i * 3 + 1] + "," + source[i * 3 + 2],
        prev = shared.get(key);
      if (prev && prev.node !== node.getName()) {
        const gap = value.distanceTo(new Vector3(...prev.point));
        seamPairs++;
        if (gap > maxSeamGap) {
          maxSeamGap = gap;
          worstSeam = {
            firstMesh: prev.node,
            secondMesh: node.getName(),
            bind: [...source.slice(i * 3, i * 3 + 3)],
            gapMillimetres: gap * 1000,
          };
        }
      } else if (!prev)
        shared.set(key, { node: node.getName(), point: value.toArray() });
    }
    const report = handStrain({
      primitive: p,
      mask: new Uint8Array(count).fill(1),
      position: (i) => new Vector3().fromArray(posed, i * 3),
    });
    meshes.push({
      node: node.getName(),
      vertices: count,
      triangles: p.getIndices().getCount() / 3,
      ...report,
    });
  }
}
const report = {
  input,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  pose: process.env.REFERENCE_POSE ?? "bind",
  edgeStrainPassed: meshes.length > 0 && meshes.every((m) => m.passed),
  passed:
    meshes.length > 0 && meshes.every((m) => m.passed) && maxSeamGap <= 1e-6,
  scope:
    "Every mesh/primitive at one pose; unchanged edge-strain thresholds plus identical-source seam continuity (1 micrometre numerical tolerance). Intentional free seams require explicit reviewed mapping. Not full-animation or cloth-volume approval.",
  meshes,
  seams: {
    passed: maxSeamGap <= 1e-6,
    numericalToleranceMillimetres: 0.001,
    pairs: seamPairs,
    maximumMillimetres: maxSeamGap * 1000,
    worst: worstSeam,
  },
};
const output =
  process.env.RIG_REPORT_FILE ??
  "docs/anim-report/robe-panels/all-mesh-strain.json";
await fs.mkdir(output.slice(0, output.lastIndexOf("/")), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  meshes.map((m) => ({
    node: m.node,
    p999: m.p999,
    maximum: m.maximum,
    passed: m.passed,
  })),
  report.seams,
);
if (!report.passed) process.exitCode = 1;
