import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Matrix4, Quaternion } from "three";
import { MeshContact } from "./mesh-contact.mjs";
import { posedHand } from "./pose-hand.mjs";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  reports = [];
const frames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
for (const hero of ["H01", "H02"].filter(
  (h) => !process.env.HERO || h === process.env.HERO,
)) {
  const bytes = await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`),
    doc = await io.readBinary(bytes),
    weaponSpec = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`)),
    weaponBytes = await fs.readFile(weaponSpec.source),
    weapon = await io.readBinary(weaponBytes),
    weaponNode = weapon
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh()),
    primitive = weaponNode.getMesh().listPrimitives()[0],
    input = primitive.getAttribute("POSITION").getArray(),
    matrix = new Matrix4().fromArray(weaponNode.getWorldMatrix()),
    positions = new Float32Array(input.length),
    p = new Vector3();
  for (let i = 0; i < input.length; i += 3) {
    p.fromArray(input, i).applyMatrix4(matrix);
    p.toArray(positions, i);
  }
  const indices = primitive.getIndices().getArray().slice();
  if (matrix.determinant() < 0)
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const mesh = new MeshContact(positions, indices),
    candidate = JSON.parse(
      await fs.readFile(`docs/hand-frames/${hero}-grip-patch-search.json`),
    ),
    side = candidate.hand,
    frame = frames[hero].hands[side],
    hand = posedHand(doc, frame, side, candidate.result),
    q = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(...candidate.result.shaftAxis),
    ),
    inverse = q.clone().invert(),
    center = new Vector3(...candidate.result.shaftCenter),
    pivot = new Vector3(...weaponSpec.gripPivot);
  let maxIntrusion = 0,
    inside = 0,
    ambiguous = 0,
    worst;
  const started = performance.now();
  for (let i = 0; i < hand.vertices.length; i++) {
    p.copy(hand.vertices[i]).sub(center).applyQuaternion(inverse).add(pivot);
    const query = mesh.distance(p, { parity: true });
    if (query.ambiguous) ambiguous++;
    if (query.inside) {
      inside++;
      if (query.distance > maxIntrusion) {
        maxIntrusion = query.distance;
        worst = {
          vertex: hand.sourceIds[i],
          worldPosition: hand.vertices[i].toArray(),
          weaponPosition: p.toArray(),
          ...query,
        };
      }
    }
  }
  const report = {
    hero,
    hand: side,
    rigSha256: createHash("sha256").update(bytes).digest("hex"),
    weaponSha256: createHash("sha256").update(weaponBytes).digest("hex"),
    scope:
      "Exact source weapon triangles versus posed source hand-region vertices, including cuffs; three-ray parity checks near contacts; not a complete animation acceptance",
    geometricGripPassed: candidate.passed,
    handVertices: hand.vertices.length,
    insideVertices: inside,
    ambiguousQueries: ambiguous,
    maxIntrusionMeters: maxIntrusion,
    worst,
    elapsedMs: performance.now() - started,
    passed: candidate.passed && maxIntrusion <= 0.003 && ambiguous === 0,
  };
  reports.push(report);
  mesh.dispose();
  console.log(report);
}
await fs.writeFile(
  "docs/hand-frames/exact-mesh-contact.json",
  JSON.stringify({ passed: reports.every((r) => r.passed), reports }, null, 2) +
    "\n",
);
if (reports.some((r) => !r.passed)) process.exitCode = 1;
