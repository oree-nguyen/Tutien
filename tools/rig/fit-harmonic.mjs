import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { constrainHandWeights } from "./constrain-skin.mjs";
const input = ".local/rig-candidates/harmonic",
  output = ".local/rig-candidates/harmonic-fit";
const bytes = await fs.readFile(`${input}/H01-C0-rigged.glb`),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes);
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints();
const positions = primitive.getAttribute("POSITION").getArray(),
  triangles = primitive.getIndices().getArray(),
  ids = primitive.getAttribute("JOINTS_0").getArray(),
  weights = primitive.getAttribute("WEIGHTS_0").getArray();
const protectedVertices = await fs.readFile(`${input}/protected.bin`),
  region = new Uint8Array(positions.length / 3);
const reference = JSON.parse(
  await fs.readFile("docs/anim-report/H01-reference-idle-solve.json"),
);
const iterations = Number(process.env.SKIN_FIT_ITERATIONS ?? 300);
if (
  !Number.isInteger(iterations) ||
  iterations < 1 ||
  iterations > 20000 ||
  !reference.passed
)
  throw Error("Invalid reference fitting configuration");
for (let i = 0; i < region.length; i++) {
  const names = [...ids.slice(i * 4, i * 4 + 4)].map((j) =>
    joints[j].getName(),
  );
  if (
    !protectedVertices[i] &&
    names[0] === "Spine2" &&
    /^(Right|Left)Arm$/.test(names[1]) &&
    names[2].endsWith("ForeArm") &&
    names[3].endsWith("Hand")
  ) {
    region[i] = 1;
    // Keep all four support bones available to the constrained solver.
    const total = weights
      .slice(i * 4, i * 4 + 4)
      .reduce((sum, w) => sum + Math.max(w, 1e-6), 0);
    for (let k = 0; k < 4; k++)
      weights[i * 4 + k] = Math.max(weights[i * 4 + k], 1e-6) / total;
  }
}
const report = constrainHandWeights(
  positions,
  triangles,
  ids,
  weights,
  joints,
  skin,
  {
    iterations,
    poseSamples: [{ rotations: reference.rotations }],
    affectedRegion: (x, y, z, i) => !!region[i],
    fixedRegion: (x, y, z, i) => !!protectedVertices[i],
    onProgress: (p) => console.log(p),
  },
);
await fs.mkdir(output, { recursive: true });
const result = await io.writeBinary(doc);
await fs.writeFile(`${output}/H01-C0-rigged.glb`, result);
const sha = (value) => createHash("sha256").update(value).digest("hex");
await fs.writeFile(
  `${output}/receipt.json`,
  JSON.stringify(
    {
      inputSha256: sha(bytes),
      rigSha256: sha(result),
      scope: "Diagnostic static reference pose; independent checks required",
      report,
    },
    null,
    2,
  ) + "\n",
);
