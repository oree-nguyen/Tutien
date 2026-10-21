import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Matrix4 } from "three";
const hero = process.env.HERO ?? "H01";
if (!["H01", "H02"].includes(hero)) throw Error("Unknown hero");
const voxel = Number(process.env.SOURCE_HEAT_VOXEL ?? 0);
if (!Number.isFinite(voxel) || voxel < 0) throw Error("Invalid voxel size");
const folder = path.resolve(
  process.env.SOURCE_HEAT_OUTPUT ??
    `.local/rig-candidates/approved-source-heat-${hero.toLowerCase()}${voxel ? "-voxel" + Math.round(voxel * 1000) : ""}${process.env.SOURCE_HEAT_RIG ? "-rebind" : ""}${process.env.SOURCE_HEAT_BODY_ONLY === "1" ? "-body" : ""}`,
);
if (!folder.startsWith(path.resolve(".local/rig-candidates") + path.sep))
  throw Error("Source-weight outputs must remain in staging");
await fs.mkdir(folder, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  input = process.env.SOURCE_HEAT_RIG ?? `assets/rigged/${hero}-C0-rigged.glb`,
  bytes = await fs.readFile(input),
  doc = await io.readBinary(bytes),
  skin = doc.getRoot().listSkins()[0],
  joints = skin.listJoints(),
  nodes = doc
    .getRoot()
    .listNodes()
    .filter((n) => n.getMesh());
if (nodes.length !== 1 || nodes[0].getMesh().listPrimitives().length !== 1)
  throw Error("Heat experiment requires explicit source layout");
const p = nodes[0].getMesh().listPrimitives()[0],
  positions = p.getAttribute("POSITION").getArray(),
  triangles = p.getIndices().getArray();
if (
  !(positions instanceof Float32Array) ||
  p.getAttribute("POSITION").getNormalized()
)
  throw Error("Exact float source required");
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  raw = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength),
  hands = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands;
const original = {
  positions: hash(raw(positions)),
  normals: hash(raw(p.getAttribute("NORMAL").getArray())),
  uv: hash(raw(p.getAttribute("TEXCOORD_0").getArray())),
  triangles: hash(raw(triangles)),
  images: doc
    .getRoot()
    .listTextures()
    .map((t) => hash(t.getImage())),
};
const records = joints.map((j) => {
  const head = new Vector3().setFromMatrixPosition(
      new Matrix4().fromArray(j.getWorldMatrix()),
    ),
    name = j.getName(),
    child =
      j.getName().endsWith("ForeArm") ||
      j.getName().endsWith("ForearmPronation")
        ? joints.find(
            (n) =>
              n.getName() ===
              j.getName().replace(/ForeArm$|ForearmPronation$/, "Hand"),
          )
        : j.listChildren().find((n) => joints.includes(n)),
    match = name.match(/^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)3$/);
  let tail = child
    ? new Vector3().setFromMatrixPosition(
        new Matrix4().fromArray(child.getWorldMatrix()),
      )
    : head.clone().add(new Vector3(0, 0.08, 0));
  if (match) tail.fromArray(hands[match[1]].fingers[match[2]].points[3]);
  if (head.distanceTo(tail) < 0.005)
    throw Error("Degenerate source bone " + name);
  return {
    name,
    parent: j.getParentNode()?.getName(),
    head: head.toArray(),
    tail: tail.toArray(),
  };
});
await fs.writeFile(folder + "/positions.bin", raw(positions));
await fs.writeFile(folder + "/triangles.bin", raw(triangles));
await fs.writeFile(
  folder + "/input.json",
  JSON.stringify(
    { hero, input, inputSha256: hash(bytes), joints: records, original },
    null,
    2,
  ) + "\n",
);
const code = await new Promise((resolve, reject) => {
  const c = spawn(
    "blender",
    [
      "-b",
      "--python-exit-code",
      "1",
      "-t",
      "4",
      "--python",
      "tools/rig/blender-source-heat.py",
      "--",
      folder,
      "--voxel",
      String(voxel),
      ...(process.env.SOURCE_HEAT_BODY_ONLY === "1" ? ["--body-only"] : []),
      ...(process.env.SOURCE_HEAT_LARGEST === "1"
        ? ["--largest-component"]
        : []),
    ],
    { stdio: "inherit" },
  );
  c.on("error", reject);
  c.on("exit", resolve);
});
const receipt = JSON.parse(await fs.readFile(folder + "/heat-solve.json"));
if (code !== 0 || !receipt.weightsValid)
  throw Error("Source bone heat rejected; no candidate exported");
const idBytes = await fs.readFile(folder + "/heat-ids.bin"),
  weightBytes = await fs.readFile(folder + "/heat-weights.bin"),
  ids = new Uint16Array(
    idBytes.buffer.slice(
      idBytes.byteOffset,
      idBytes.byteOffset + idBytes.byteLength,
    ),
  ),
  w = new Float32Array(
    weightBytes.buffer.slice(
      weightBytes.byteOffset,
      weightBytes.byteOffset + weightBytes.byteLength,
    ),
  );
if (ids.length !== (positions.length / 3) * 4 || w.length !== ids.length)
  throw Error("Unexpected weight bytes");
p.getAttribute("JOINTS_0").setArray(ids);
p.getAttribute("WEIGHTS_0").setArray(w).setNormalized(false);
const output = folder + `/${hero}-C0-rigged.glb`;
await io.write(output, doc);
const after = await io.read(output),
  ap = after.getRoot().listMeshes()[0].listPrimitives()[0];
if (
  hash(raw(ap.getAttribute("POSITION").getArray())) !== original.positions ||
  hash(raw(ap.getAttribute("NORMAL").getArray())) !== original.normals ||
  hash(raw(ap.getAttribute("TEXCOORD_0").getArray())) !== original.uv ||
  hash(raw(ap.getIndices().getArray())) !== original.triangles ||
  JSON.stringify(
    after
      .getRoot()
      .listTextures()
      .map((t) => hash(t.getImage())),
  ) !== JSON.stringify(original.images)
)
  throw Error("Source payload changed");
await fs.writeFile(
  folder + "/export.json",
  JSON.stringify(
    {
      hero,
      input,
      inputSha256: hash(bytes),
      output,
      outputSha256: hash(await fs.readFile(output)),
      originalPayloadPreserved: true,
      accepted: false,
      activated: false,
      solver: receipt,
    },
    null,
    2,
  ) + "\n",
);
console.log("Staging source-weight candidate", output);
