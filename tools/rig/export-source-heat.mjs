import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const directory = path.resolve(process.argv[2]),
  workspace = path.resolve(".local/rig-candidates");
if (!directory.startsWith(workspace + path.sep))
  throw Error("Candidate export must remain in staging");
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  array = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength),
  input = JSON.parse(await fs.readFile(directory + "/input.json")),
  solve = JSON.parse(await fs.readFile(directory + "/heat-solve.json"));
if (!solve.weightsValid) throw Error("Rejected weight solve");
const bytes = await fs.readFile(input.input);
if (hash(bytes) !== input.inputSha256) throw Error("Stale source rig");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.readBinary(bytes),
  meshes = doc.getRoot().listMeshes();
if (meshes.length !== 1 || meshes[0].listPrimitives().length !== 1)
  throw Error("Ambiguous source layout");
const p = meshes[0].listPrimitives()[0];
const data = async (file, Type) => {
  const b = await fs.readFile(directory + "/" + file);
  return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const ids = await data("heat-ids.bin", Uint16Array),
  weights = await data("heat-weights.bin", Float32Array);
if (
  ids.length !== p.getAttribute("POSITION").getCount() * 4 ||
  weights.length !== ids.length
)
  throw Error("Weight count mismatch");
for (let i = 0; i < weights.length; i += 4) {
  let total = 0;
  for (let k = 0; k < 4; k++) {
    total += weights[i + k];
    if (
      ids[i + k] >= input.joints.length ||
      weights[i + k] < 0 ||
      !Number.isFinite(weights[i + k])
    )
      throw Error("Invalid skin");
  }
  if (Math.abs(total - 1) > 1e-5) throw Error("Invalid weight sum");
}
p.getAttribute("JOINTS_0").setArray(ids);
p.getAttribute("WEIGHTS_0").setArray(weights).setNormalized(false);
const output = directory + `/${input.hero}-C0-rigged.glb`;
await io.write(output, doc);
const check = await io.read(output),
  ap = check.getRoot().listMeshes()[0].listPrimitives()[0];
for (const [semantic, name] of [
  ["POSITION", "positions"],
  ["NORMAL", "normals"],
  ["TEXCOORD_0", "uv"],
])
  if (
    hash(array(ap.getAttribute(semantic).getArray())) !== input.original[name]
  )
    throw Error("Source " + name + " changed");
if (
  hash(array(ap.getIndices().getArray())) !== input.original.triangles ||
  JSON.stringify(
    check
      .getRoot()
      .listTextures()
      .map((t) => hash(t.getImage())),
  ) !== JSON.stringify(input.original.images)
)
  throw Error("Source triangles/images changed");
await fs.writeFile(
  directory + "/export.json",
  JSON.stringify(
    {
      hero: input.hero,
      input: input.input,
      inputSha256: input.inputSha256,
      output,
      outputSha256: hash(await fs.readFile(output)),
      originalPayloadPreserved: true,
      solver: solve,
      accepted: false,
      activated: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
