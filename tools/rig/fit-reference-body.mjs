import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { smoothJointWeights } from "./smooth-weights.mjs";
import { constrainHandWeights } from "./constrain-skin.mjs";
import { seedSleeveWeights } from "./sleeve-supports.mjs";

// Offline experiment: the runtime and original geometry/texture files are untouched.
const input = ".local/rig-candidates/reference/H01-C0-rigged.glb";
const continuous = process.argv.includes("--continuous-sleeves");
const preserveHands = process.argv.includes("--preserve-hands");
const analytic = continuous || process.argv.includes("--analytic-supports");
const output =
  ".local/rig-candidates/reference-body" +
  (continuous ? "-continuous" : analytic ? "-analytic" : "") +
  (preserveHands ? "-fixed-hands" : "");
const bytes = await fs.readFile(input),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(bytes),
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints();
const reference = JSON.parse(
  await fs.readFile("docs/anim-report/H01-reference-idle-solve.json"),
);
if (!reference.passed || reference.hero !== "H01")
  throw Error("Reference solve rejected");
const iterations = Number(process.env.SKIN_FIT_ITERATIONS ?? 1000);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 20000)
  throw Error("Invalid fitting iteration count");
const fingerIndices = new Set(
  joints.flatMap((node, i) =>
    /Hand(?:Thumb|Index|Middle|Ring|Pinky)[123]$/.test(node.getName())
      ? [i]
      : [],
  ),
);
const region = continuous
  ? (x, y) => y > 0.1 && y < 1.75 && Math.abs(x) > 0.05
  : (x, y) => y > 0.65 && y < 1.6 && Math.abs(x) > 0.15;
const reports = [];
const handFrames = JSON.parse(await fs.readFile("data/rig/hand-frames.json"))
  .heroes.H01.hands;
const handBounds = Object.values(handFrames).map((frame) => {
  const points = [
    frame.wrist,
    ...Object.values(frame.fingers).flatMap((f) => f.points),
  ];
  return {
    low: [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])) - 0.022),
    high: [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])) + 0.022),
  };
});
const fixedRegion = (x, y, z) =>
  handBounds.some((b) =>
    [x, y, z].every((value, k) => value >= b.low[k] && value <= b.high[k]),
  );
for (const mesh of doc.getRoot().listMeshes())
  for (const p of mesh.listPrimitives()) {
    const positions = p.getAttribute("POSITION").getArray(),
      triangles = p.getIndices().getArray();
    const ids = p.getAttribute("JOINTS_0").getArray(),
      weights = p.getAttribute("WEIGHTS_0").getArray();
    const protectedVertices = new Uint8Array(positions.length / 3);
    if (preserveHands) {
      const original = new Uint8Array(positions.length / 3);
      for (let i = 0; i < original.length; i++) {
        const fingerAffected = [0, 1, 2, 3].some(
          (k) => weights[i * 4 + k] > 1e-8 && fingerIndices.has(ids[i * 4 + k]),
        );
        original[i] =
          fixedRegion(...positions.slice(i * 3, i * 3 + 3)) || fingerAffected
            ? 1
            : 0;
      }
      protectedVertices.set(original);
      // The hand-edge check includes neighboring vertices outside its crop.
      // Preserve their weights too, so body fitting cannot move those endpoints.
      for (let i = 0; i < triangles.length; i += 3)
        for (let k = 0; k < 3; k++) {
          const a = triangles[i + k],
            b = triangles[i + ((k + 1) % 3)];
          if (original[a]) protectedVertices[b] = 1;
          if (original[b]) protectedVertices[a] = 1;
        }
    }
    const originalIds = preserveHands ? ids.slice() : null;
    const originalWeights = preserveHands ? weights.slice() : null;
    const supportSeed = analytic
      ? seedSleeveWeights(positions, ids, weights, joints, handFrames, region, {
          continuousFade: continuous,
        })
      : null;
    const smoothing = smoothJointWeights(
      positions,
      triangles,
      ids,
      weights,
      joints.length,
      fingerIndices,
      32,
      {
        distanceWeighted: true,
        region: preserveHands
          ? (x, y, z) => region(x, y, z) && !fixedRegion(x, y, z)
          : region,
      },
    );
    if (preserveHands)
      for (let i = 0; i < protectedVertices.length; i++)
        if (protectedVertices[i])
          for (let k = 0; k < 4; k++) {
            ids[i * 4 + k] = originalIds[i * 4 + k];
            weights[i * 4 + k] = originalWeights[i * 4 + k];
          }
    const fitting = constrainHandWeights(
      positions,
      triangles,
      ids,
      weights,
      joints,
      skin,
      {
        iterations,
        affectedRegion: region,
        fixedRegion: preserveHands
          ? (x, y, z, i) => !!protectedVertices[i]
          : null,
        poseSamples: preserveHands
          ? [{ rotations: reference.rotations }]
          : [
              { strength: 0.2 },
              { strength: 1 },
              { rotations: reference.rotations },
            ],
        onProgress: (progress) => console.log("body skin fit", progress),
      },
    );
    reports.push({ supportSeed, smoothing, fitting });
  }
await fs.mkdir(output, { recursive: true });
const exported = await io.writeBinary(doc);
await fs.writeFile(`${output}/H01-C0-rigged.glb`, exported);
const sha = (value) => createHash("sha256").update(value).digest("hex");
await fs.writeFile(
  `${output}/receipt.json`,
  JSON.stringify(
    {
      input,
      inputSha256: sha(bytes),
      outputSha256: sha(exported),
      referencePoseSha256: sha(JSON.stringify(reference.rotations)),
      reports,
      status:
        "diagnostic only; independent source/strain/contact checks required",
    },
    null,
    2,
  ) + "\n",
);
