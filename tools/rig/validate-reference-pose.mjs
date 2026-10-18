import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Quaternion, Matrix4, Triangle, MathUtils } from "three";
import { MeshContact } from "./mesh-contact.mjs";
import { posedHand } from "./pose-hand.mjs";
import { verifyContactSurface } from "./contact-surface.mjs";
const hero = "H01",
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  bytes = await fs.readFile(
    `${process.env.RIG_INPUT_DIR ?? "assets/rigged"}/${hero}-C0-rigged.glb`,
  ),
  doc = await io.readBinary(bytes),
  pose = JSON.parse(
    await fs.readFile(
      process.env.REFERENCE_POSE ??
        `docs/anim-report/${hero}-reference-idle-solve.json`,
    ),
  ),
  proof = JSON.parse(
    await fs.readFile(`docs/hand-frames/${hero}-exact-grip-search.json`),
  ),
  frame = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands.Right,
  weaponSpec = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`)),
  weapon = await io.read(weaponSpec.source),
  node = weapon
    .getRoot()
    .listNodes()
    .find((n) => n.getMesh()),
  p = node.getMesh().listPrimitives()[0],
  input = p.getAttribute("POSITION").getArray(),
  weaponPositions = new Float32Array(input.length),
  matrix = new Matrix4().fromArray(node.getWorldMatrix()),
  v = new Vector3();
if (!pose.passed || !proof.passed)
  throw Error("Reference pose or local grip not accepted");
for (let i = 0; i < input.length; i += 3)
  v.fromArray(input, i).applyMatrix4(matrix).toArray(weaponPositions, i);
const mesh = new MeshContact(weaponPositions, p.getIndices().getArray()),
  nodes = new Map(
    doc
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
for (const [name, rotation] of Object.entries(pose.rotations))
  nodes.get(name).setRotation(rotation);
const hand = posedHand(doc, frame, "Right", proof.selected.candidate.result, {
    applyFingerPose: false,
  }),
  source = hand.primitive,
  bodyPositions = source.getAttribute("POSITION").getArray(),
  bodyMesh = new MeshContact(bodyPositions, source.getIndices().getArray());
try {
  const patch = frame.palmCandidates.find(
      (p) => p.ratio === proof.selected.candidate.ratio,
    ),
    query = bodyMesh.distance(new Vector3(...patch.center)),
    ids = [0, 1, 2].map((k) =>
      bodyMesh.geometry.index.getX(query.face * 3 + k),
    ),
    triangle = new Triangle(
      ...ids.map((i) => new Vector3().fromArray(bodyPositions, i * 3)),
    ),
    bary = triangle
      .getBarycoord(new Vector3(...query.closest), new Vector3())
      .toArray(),
    corners = ids.map(hand.position),
    palm = corners.reduce(
      (sum, p, i) => sum.addScaledVector(p, bary[i]),
      new Vector3(),
    ),
    normal = new Triangle(...corners).getNormal(new Vector3()),
    restNormal = triangle.getNormal(new Vector3());
  if (restNormal.dot(new Vector3(...patch.normal)) < 0) normal.negate();
  const evaluated = [],
    cache = new Map(),
    selectedSourceRoll = proof.selected.weaponRollDegrees;
  function measure(roll, certify = false) {
    const key = `${roll}:${certify}`;
    if (cache.has(key)) return cache.get(key);
    const q = new Quaternion(...pose.handWorldDelta)
        .multiply(
          new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            new Vector3(...proof.selected.candidate.result.shaftAxis),
          ),
        )
        .multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 1, 0),
            MathUtils.degToRad(roll),
          ),
        ),
      inverse = q.clone().invert(),
      center = new Vector3(...pose.shaftCenter),
      pivot = new Vector3(...weaponSpec.gripPivot),
      toWeapon = (point) =>
        point.clone().sub(center).applyQuaternion(inverse).add(pivot),
      contact = mesh.distance(toWeapon(palm), { parity: certify }),
      nearestWorld = new Vector3(...contact.closest)
        .sub(pivot)
        .applyQuaternion(q)
        .add(center),
      palmNormalDot = normal.dot(nearestWorld.sub(palm).normalize());
    let maximumIntrusion = 0,
      ambiguousQueries = 0;
    for (const vertex of hand.vertices) {
      const query = mesh.distance(toWeapon(vertex), { parity: certify });
      if (query.inside)
        maximumIntrusion = Math.max(maximumIntrusion, query.distance);
      if (query.ambiguous) ambiguousQueries++;
    }
    const gap = contact.signedDistance,
      cost =
        ((Math.max(0, maximumIntrusion - 0.003) * 1000) ** 2 +
          (Math.max(0, 0.003 - gap, gap - 0.005) * 1000) ** 2 +
          (Math.max(0, 0.8 - palmNormalDot) * 100) ** 2) *
          1e6 +
        (maximumIntrusion * 1000) ** 2 +
        ((gap - 0.004) * 1000) ** 2 * 0.1,
      pointPassed =
        maximumIntrusion <= 0.003 &&
        gap >= 0.003 &&
        gap <= 0.005 &&
        palmNormalDot >= 0.8 &&
        ambiguousQueries === 0 &&
        !contact.ambiguous,
      surface =
        certify && pointPassed
          ? verifyContactSurface(mesh, hand, toWeapon)
          : null,
      report = {
        weaponRollDegrees: roll,
        passed: pointPassed && !!surface?.passed,
        palmGap: gap,
        palmNormalDot,
        vertexMaximumIntrusion: maximumIntrusion,
        ambiguousQueries,
        cost,
        surface,
        weaponQuaternion: q.toArray(),
        weaponCenter: pose.shaftCenter,
      };
    cache.set(key, report);
    evaluated.push(report);
    return report;
  }
  let ranked = [];
  if (process.env.CONTACT_ROLLS) {
    const rolls = process.env.CONTACT_ROLLS.split(",").map(Number);
    if (
      !rolls.length ||
      rolls.some(
        (value) => !Number.isFinite(value) || value < 0 || value >= 360,
      )
    )
      throw Error("Invalid diagnostic weapon rolls");
    ranked = rolls.map((roll) => measure(roll));
  } else if (process.argv.includes("--search-roll")) {
    for (let roll = 0; roll < 360; roll += 15) ranked.push(measure(roll));
    ranked.sort((a, b) => a.cost - b.cost);
    const coarse = ranked[0].weaponRollDegrees;
    for (let offset = -14; offset <= 14; offset++)
      ranked.push(measure((coarse + offset + 360) % 360));
  } else ranked.push(measure(selectedSourceRoll));
  ranked.sort((a, b) => a.cost - b.cost);
  let selected;
  for (const candidate of ranked.slice(0, 8)) {
    const checked = measure(candidate.weaponRollDegrees, true);
    if (
      !selected ||
      (checked.passed && !selected.passed) ||
      (checked.passed === selected.passed && checked.cost < selected.cost)
    )
      selected = checked;
    if (checked.passed) break;
  }
  const report = {
    hero,
    scope:
      "Actual full-arm reference pose, exact original weapon and skinned hand/cuff triangles; not full-body strain or animation acceptance",
    rigSha256: createHash("sha256").update(bytes).digest("hex"),
    ...selected,
    evaluated,
    poseSha256: createHash("sha256")
      .update(JSON.stringify(pose.rotations))
      .digest("hex"),
  };
  const output = process.env.RIG_REPORT_DIR ?? "docs/anim-report";
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(
    `${output}/${hero}-reference-contact.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(report);
  if (!report.passed) process.exitCode = 1;
} finally {
  mesh.dispose();
  bodyMesh.dispose();
}
