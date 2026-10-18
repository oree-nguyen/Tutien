import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const expanded = process.argv.includes("--expanded");
const input = ".local/rig-candidates/reference/H01-C0-rigged.glb",
  output = expanded
    ? ".local/rig-candidates/harmonic-expanded"
    : ".local/rig-candidates/harmonic";
const bytes = await fs.readFile(input),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(bytes),
  primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
if (
  doc.getRoot().listMeshes().length !== 1 ||
  doc.getRoot().listMeshes()[0].listPrimitives().length !== 1
)
  throw Error("Expected one source primitive");
const joints = doc.getRoot().listSkins()[0].listJoints(),
  positions = primitive.getAttribute("POSITION").getArray(),
  triangles = primitive.getIndices().getArray();
const ids = primitive.getAttribute("JOINTS_0").getArray(),
  weights = primitive.getAttribute("WEIGHTS_0").getArray();
const frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes
  .H01.hands;
const bounds = Object.values(frames).map((frame) => {
  const points = [
    frame.wrist,
    ...Object.values(frame.fingers).flatMap((f) => f.points),
  ];
  return {
    low: [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])) - 0.022),
    high: [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])) + 0.022),
  };
});
const protectedVertices = new Uint8Array(positions.length / 3),
  original = new Uint8Array(protectedVertices.length);
for (let i = 0; i < original.length; i++)
  original[i] =
    bounds.some((b) =>
      [0, 1, 2].every(
        (k) =>
          positions[i * 3 + k] >= b.low[k] && positions[i * 3 + k] <= b.high[k],
      ),
    ) ||
    [0, 1, 2, 3].some(
      (k) =>
        weights[i * 4 + k] > 1e-8 &&
        /Hand(?:Thumb|Index|Middle|Ring|Pinky)[123]$/.test(
          joints[ids[i * 4 + k]].getName(),
        ),
    )
      ? 1
      : 0;
protectedVertices.set(original);
for (let i = 0; i < triangles.length; i += 3)
  for (let k = 0; k < 3; k++) {
    const a = triangles[i + k],
      b = triangles[i + ((k + 1) % 3)];
    if (original[a]) protectedVertices[b] = 1;
    if (original[b]) protectedVertices[a] = 1;
  }
await fs.mkdir(output, { recursive: true });
const write = (name, array) =>
  fs.writeFile(
    `${output}/${name}.bin`,
    Buffer.from(array.buffer, array.byteOffset, array.byteLength),
  );
await write("positions", positions);
await write("triangles", Uint32Array.from(triangles));
await write("ids", Uint16Array.from(ids));
await write("weights", weights);
await write("protected", protectedVertices);
await fs.writeFile(
  `${output}/input.json`,
  JSON.stringify({
    jointNames: joints.map((j) => j.getName()),
    domain: expanded
      ? { minY: 0.2, maxY: 1.7, minAbsX: 0.03 }
      : { minY: 0.55, maxY: 1.62, minAbsX: 0.12 },
  }),
);
await new Promise((resolve, reject) => {
  const child = spawn("python3", ["tools/rig/harmonic_body.py", output], {
    stdio: "inherit",
    env: { ...process.env, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "4" },
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(Error("Surface interpolation rejected: " + code)),
  );
});
const resultIds = await fs.readFile(`${output}/result-ids.bin`),
  resultWeights = await fs.readFile(`${output}/result-weights.bin`);
if (
  resultIds.length !== ids.length * 2 ||
  resultWeights.length !== weights.length * 4
)
  throw Error("Invalid output array length");
for (let i = 0; i < ids.length; i++) {
  ids[i] = resultIds.readUInt16LE(i * 2);
  weights[i] = resultWeights.readFloatLE(i * 4);
}
const result = await io.writeBinary(doc);
await fs.writeFile(`${output}/H01-C0-rigged.glb`, result);
const sha = (value) => createHash("sha256").update(value).digest("hex");
await fs.writeFile(
  `${output}/receipt.json`,
  JSON.stringify(
    {
      input,
      inputSha256: sha(bytes),
      rigSha256: sha(result),
      status: "diagnostic; source/strain/contact/animation checks required",
      solve: JSON.parse(await fs.readFile(`${output}/solve.json`)),
    },
    null,
    2,
  ) + "\n",
);
