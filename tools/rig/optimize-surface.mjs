import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4 } from "three";
import { createHash } from "node:crypto";
const projected = process.argv.includes("--projected");
const input = projected
    ? ".local/rig-candidates/harmonic-global/H01-C0-rigged.glb"
    : ".local/rig-candidates/harmonic/H01-C0-rigged.glb",
  output = projected
    ? ".local/rig-candidates/harmonic-projected"
    : ".local/rig-candidates/harmonic-global";
const bytes = await fs.readFile(input),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes);
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints();
const iterations = Number(process.env.SKIN_FIT_ITERATIONS ?? 300);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 2000)
  throw Error("Invalid surface optimizer iteration count");
await fs.mkdir(output, { recursive: true });
const write = (name, array) =>
  fs.writeFile(
    `${output}/${name}.bin`,
    Buffer.from(array.buffer, array.byteOffset, array.byteLength),
  );
await write("positions", primitive.getAttribute("POSITION").getArray());
await write("triangles", Uint32Array.from(primitive.getIndices().getArray()));
await write(
  "ids",
  Uint16Array.from(primitive.getAttribute("JOINTS_0").getArray()),
);
await write("weights", primitive.getAttribute("WEIGHTS_0").getArray());
await fs.copyFile(
  ".local/rig-candidates/harmonic/protected.bin",
  `${output}/protected.bin`,
);
const reference = JSON.parse(
  await fs.readFile("docs/anim-report/H01-reference-idle-solve.json"),
);
if (!reference.passed) throw Error("Reference pose rejected");
const binds = joints.map((j) => j.getRotation());
for (const j of joints) j.setRotation(reference.rotations[j.getName()]);
const matrices = joints.flatMap(
  (j, i) =>
    new Matrix4()
      .fromArray(j.getWorldMatrix())
      .multiply(
        new Matrix4().fromArray(
          skin.getInverseBindMatrices().getElement(i, []),
        ),
      ).elements,
);
joints.forEach((j, i) => j.setRotation(binds[i]));
await write("matrices", Float64Array.from(matrices));
await fs.writeFile(
  `${output}/input.json`,
  JSON.stringify({
    jointNames: joints.map((j) => j.getName()),
    iterations,
    backend: projected ? "projected" : "lbfgs",
  }),
);
await new Promise((resolve, reject) => {
  const child = spawn("python3", ["tools/rig/optimize_surface.py", output], {
    stdio: "inherit",
    env: { ...process.env, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "4" },
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(Error("Global surface optimization failed: " + code)),
  );
});
const result = await fs.readFile(`${output}/result-weights.bin`),
  weights = primitive.getAttribute("WEIGHTS_0").getArray();
if (result.length !== weights.length * 4)
  throw Error("Invalid optimizer output length");
for (let i = 0; i < weights.length; i++) weights[i] = result.readFloatLE(i * 4);
const exported = await io.writeBinary(doc);
await fs.writeFile(`${output}/H01-C0-rigged.glb`, exported);
const sha = (value) => createHash("sha256").update(value).digest("hex");
await fs.writeFile(
  `${output}/receipt.json`,
  JSON.stringify(
    {
      input,
      inputSha256: sha(bytes),
      rigSha256: sha(exported),
      solve: JSON.parse(await fs.readFile(`${output}/solve.json`)),
    },
    null,
    2,
  ) + "\n",
);
