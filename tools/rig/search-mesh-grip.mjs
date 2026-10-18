import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Matrix4, Quaternion, Triangle, MathUtils } from "three";
import { MeshContact } from "./mesh-contact.mjs";
import { verifyContactSurface } from "./contact-surface.mjs";
import { posedHand } from "./pose-hand.mjs";
import { auditSurface } from "./audit-surface.mjs";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  hero = process.env.HERO ?? "H01",
  bytes = await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`),
  doc = await io.readBinary(bytes),
  frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes,
  candidates = JSON.parse(
    await fs.readFile(`docs/hand-frames/${hero}-grip-candidates.json`),
  ),
  side = candidates.hand,
  frame = frames[hero].hands[side],
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
  weaponPositions = new Float32Array(input.length),
  p = new Vector3();
for (let i = 0; i < input.length; i += 3) {
  p.fromArray(input, i).applyMatrix4(matrix);
  p.toArray(weaponPositions, i);
}
const weaponIndices = primitive.getIndices().getArray().slice();
if (matrix.determinant() < 0)
  for (let i = 0; i < weaponIndices.length; i += 3)
    [weaponIndices[i + 1], weaponIndices[i + 2]] = [
      weaponIndices[i + 2],
      weaponIndices[i + 1],
    ];
const bodyPrimitive = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  bodyPositions = bodyPrimitive.getAttribute("POSITION").getArray(),
  bodyMesh = new MeshContact(
    bodyPositions,
    bodyPrimitive.getIndices().getArray(),
  ),
  mesh = new MeshContact(weaponPositions, weaponIndices),
  surfaces = new Map();
const topology = auditSurface(weaponPositions, weaponIndices);
if (!topology.closedOrientedParityChain)
  throw Error(
    "Weapon surface is not a closed oriented parity chain; signed-distance certification rejected",
  );
function palmPatch(candidate, hand) {
  let descriptor = surfaces.get(candidate.ratio);
  if (!descriptor) {
    const source =
        candidate.contactPatch ??
        frame.palmCandidates.find((p) => p.ratio === candidate.ratio),
      query = bodyMesh.distance(new Vector3(...source.center)),
      offset = query.face * 3,
      ids = [0, 1, 2].map((k) => bodyMesh.geometry.index.getX(offset + k)),
      triangle = new Triangle(
        ...ids.map((i) => new Vector3().fromArray(bodyPositions, i * 3)),
      );
    if (query.distance > 0.0001)
      throw Error("Contact patch missed source mesh");
    descriptor = {
      ids,
      bary: triangle
        .getBarycoord(new Vector3(...query.closest), new Vector3())
        .toArray(),
      sourceNormal: source.normal,
    };
    surfaces.set(candidate.ratio, descriptor);
  }
  const corners = descriptor.ids.map(hand.position),
    center = corners.reduce(
      (sum, p, i) => sum.addScaledVector(p, descriptor.bary[i]),
      new Vector3(),
    ),
    normal = new Triangle(...corners).getNormal(new Vector3());
  if (normal.dot(new Vector3(...descriptor.sourceNormal)) < 0) normal.negate();
  return { center, normal };
}
const evaluated = [],
  ranked = [],
  cache = new Map(),
  started = performance.now();
function measure(candidate, index, roll, parity = false) {
  const key = `${index}:${roll}:${parity}`;
  if (cache.has(key)) return cache.get(key);
  const hand = posedHand(doc, frame, side, candidate.result),
    patch = palmPatch(candidate, hand),
    q = new Quaternion()
      .setFromUnitVectors(
        new Vector3(0, 1, 0),
        new Vector3(...candidate.result.shaftAxis),
      )
      .multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 1, 0),
          MathUtils.degToRad(roll),
        ),
      ),
    inverse = q.clone().invert(),
    center = new Vector3(...candidate.result.shaftCenter),
    pivot = new Vector3(...weaponSpec.gripPivot),
    local = (point) =>
      point.clone().sub(center).applyQuaternion(inverse).add(pivot);
  let maximumIntrusion = 0,
    ambiguousQueries = 0,
    insideVertices = 0,
    worst;
  for (let i = 0; i < hand.vertices.length; i++) {
    const point = local(hand.vertices[i]),
      query = mesh.distance(point, { parity });
    if (query.ambiguous) ambiguousQueries++;
    if (query.inside) {
      insideVertices++;
      if (query.distance > maximumIntrusion) {
        maximumIntrusion = query.distance;
        worst = {
          vertex: hand.sourceIds[i],
          worldPosition: hand.vertices[i].toArray(),
          weaponPosition: point.toArray(),
          ...query,
        };
      }
    }
  }
  const palm = mesh.distance(local(patch.center), { parity }),
    nearestWorld = new Vector3(...palm.closest)
      .sub(pivot)
      .applyQuaternion(q)
      .add(center),
    contactNormalDot = patch.normal.dot(
      nearestWorld.sub(patch.center).normalize(),
    ),
    gap = palm.signedDistance,
    score =
      (Math.max(0, maximumIntrusion - 0.003) * 1000) ** 2 +
      (Math.max(0, 0.003 - gap, gap - 0.005) * 1000) ** 2 +
      (Math.max(0, 0.8 - contactNormalDot) * 100) ** 2,
    passed =
      candidate.result.ok &&
      maximumIntrusion <= 0.003 &&
      gap >= 0.003 &&
      gap <= 0.005 &&
      contactNormalDot >= 0.8 &&
      ambiguousQueries === 0 &&
      !palm.ambiguous,
    value = {
      candidateIndex: index,
      weaponRollDegrees: roll,
      maximumIntrusion,
      gap,
      contactNormalDot,
      insideVertices,
      ambiguousQueries,
      palmAmbiguous: palm.ambiguous,
      handVertices: hand.vertices.length,
      parity,
      score,
      passed,
      worst,
    };
  cache.set(key, value);
  evaluated.push(value);
  return value;
}
try {
  if (process.argv.includes("--verify-selected")) {
    const previous = JSON.parse(
      await fs.readFile(`docs/hand-frames/${hero}-exact-grip-search.json`),
    );
    if (
      previous.rigSha256 !== createHash("sha256").update(bytes).digest("hex") ||
      previous.weaponSha256 !==
        createHash("sha256").update(weaponBytes).digest("hex")
    )
      throw Error("Selected contact evidence is stale");
    ranked.push(previous.selected);
  } else {
    for (const [index, candidate] of candidates.passingCandidates.entries()) {
      for (const roll of [0, 45, 90, 135, 180, 225, 270, 315])
        ranked.push(measure(candidate, index, roll));
      if (index % 5 === 0)
        console.log(
          hero,
          "candidates",
          index + 1,
          "best cost",
          Math.min(...ranked.map((r) => r.score)),
        );
    }
    ranked.sort((a, b) => a.score - b.score);
    for (const start of ranked.slice(0, 6)) {
      let current = start;
      for (const step of [15, 5, 1])
        for (let pass = 0; pass < 3; pass++) {
          let improved = false;
          for (const direction of [-1, 1]) {
            const roll =
                (current.weaponRollDegrees + direction * step + 360) % 360,
              next = measure(
                candidates.passingCandidates[current.candidateIndex],
                current.candidateIndex,
                roll,
              );
            if (next.score < current.score - 1e-8) {
              current = next;
              improved = true;
            }
          }
          if (!improved) break;
        }
      ranked.push(current);
    }
    ranked.sort((a, b) => a.score - b.score);
  }
  let selected;
  for (const candidate of ranked.slice(0, 8)) {
    const exact = measure(
      candidates.passingCandidates[candidate.candidateIndex],
      candidate.candidateIndex,
      candidate.weaponRollDegrees,
      true,
    );
    if (
      !selected ||
      (exact.passed && !selected.passed) ||
      (exact.passed === selected.passed && exact.score < selected.score)
    )
      selected = exact;
    if (exact.passed) {
      const candidate = candidates.passingCandidates[exact.candidateIndex],
        hand = posedHand(doc, frame, side, candidate.result),
        q = new Quaternion()
          .setFromUnitVectors(
            new Vector3(0, 1, 0),
            new Vector3(...candidate.result.shaftAxis),
          )
          .multiply(
            new Quaternion().setFromAxisAngle(
              new Vector3(0, 1, 0),
              MathUtils.degToRad(exact.weaponRollDegrees),
            ),
          ),
        inverse = q.clone().invert(),
        center = new Vector3(...candidate.result.shaftCenter),
        pivot = new Vector3(...weaponSpec.gripPivot);
      exact.surfaceVerification = verifyContactSurface(mesh, hand, (p) =>
        p.clone().sub(center).applyQuaternion(inverse).add(pivot),
      );
      exact.passed = exact.surfaceVerification.passed;
      selected = exact;
      if (exact.passed) break;
    }
  }
  const report = {
    hero,
    hand: side,
    rigSha256: createHash("sha256").update(bytes).digest("hex"),
    weaponSha256: createHash("sha256").update(weaponBytes).digest("hex"),
    topology,
    scope:
      "Source triangle contact search, cuff included, no geometry/texture/scale changes; best candidates verified by three-ray parity. Not complete entrance acceptance.",
    elapsedMs: performance.now() - started,
    evaluationCount: evaluated.length,
    selected: selected
      ? {
          ...selected,
          candidate: candidates.passingCandidates[selected.candidateIndex],
        }
      : null,
    passed: selected?.passed ?? false,
    evaluated,
  };
  await fs.writeFile(
    `docs/hand-frames/${hero}-exact-grip-search.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log("RESULT", report.passed, report.selected);
  if (!report.passed) process.exitCode = 1;
} finally {
  bodyMesh.dispose();
  mesh.dispose();
}
