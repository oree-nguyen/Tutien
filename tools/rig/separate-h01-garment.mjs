import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";
import {
  partitionTriangles,
  repairHangingRobe,
} from "./garment-separation.mjs";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const animationSignature = (d) =>
  d
    .getRoot()
    .listAnimations()
    .map((a) => ({
      name: a.getName(),
      channels: a.listChannels().map((c) => ({
        node: c.getTargetNode()?.getName(),
        path: c.getTargetPath(),
        interpolation: c.getSampler().getInterpolation(),
        input: sha(Buffer.from(c.getSampler().getInput().getArray().buffer)),
        output: sha(Buffer.from(c.getSampler().getOutput().getArray().buffer)),
      })),
    }));
const input = ".local/rig-candidates/harmonic-projected/H01-C0-rigged.glb";
const bytes = await fs.readFile(input),
  doc = await io.readBinary(bytes);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const node = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getMesh());
const mesh = node.getMesh(),
  primitive = mesh.listPrimitives()[0];
assert.equal(mesh.listPrimitives().length, 1);
const skin = node.getSkin(),
  positions = primitive.getAttribute("POSITION").getArray();
const beforeAnimations = animationSignature(doc);
const beforeJoints = skin.listJoints().map((j) => j.getName());
const beforeTextures = doc
  .getRoot()
  .listTextures()
  .map((t) => sha(t.getImage()));
const originalIndices = primitive.getIndices().getArray().slice();
const originalAttributes = primitive
  .listSemantics()
  .filter((s) => !["JOINTS_0", "WEIGHTS_0"].includes(s))
  .map((s) => [
    s,
    sha(Buffer.from(primitive.getAttribute(s).getArray().buffer)),
  ]);
const originalIds = primitive.getAttribute("JOINTS_0").getArray().slice();
const originalWeights = primitive.getAttribute("WEIGHTS_0").getArray().slice();
const repair = repairHangingRobe(
  positions,
  primitive.getAttribute("JOINTS_0").getArray(),
  primitive.getAttribute("WEIGHTS_0").getArray(),
  skin.listJoints().findIndex((j) => j.getName() === "Hips"),
);
primitive.getAttribute("JOINTS_0").setArray(repair.ids);
primitive.getAttribute("WEIGHTS_0").setArray(repair.weights);
await fs.mkdir(".local/rig-candidates/robe-repaired", { recursive: true });
await io.write(".local/rig-candidates/robe-repaired/H01-C0-rigged.glb", doc);
// Reject the failed weight trial; partition uses unchanged baseline skin weights.
primitive.getAttribute("JOINTS_0").setArray(originalIds);
primitive.getAttribute("WEIGHTS_0").setArray(originalWeights);
const texture = primitive.getMaterial().getBaseColorTexture();
const { data, info } = await sharp(texture.getImage())
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const uv = primitive.getAttribute("TEXCOORD_0").getArray(),
  mask = new Uint8Array(positions.length / 3);
for (let i = 0; i < mask.length; i++) {
  const x = Math.abs(positions[i * 3]),
    y = positions[i * 3 + 1];
  const px = Math.min(
    info.width - 1,
    Math.max(0, Math.floor(uv[i * 2] * info.width)),
  );
  const py = Math.min(
    info.height - 1,
    Math.max(0, Math.floor(uv[i * 2 + 1] * info.height)),
  );
  const offset = (py * info.width + px) * 4,
    [r, g, b] = data.subarray(offset, offset + 3);
  const green = g > r * 1.07 && g > b * 0.95;
  const gold = r > g * 1.05 && g > b * 1.15;
  // Conservative visible-surface selection: no imaginary body beneath the robe.
  mask[i] = Number(
    y > 0.2 && y < 1.46 && (green || (gold && (y < 0.88 || x < 0.43))),
  );
}
const parts = partitionTriangles(originalIndices, mask);
assert(parts.garment.length > 0 && parts.remainder.length > 0);
const buffer = primitive.getIndices().getBuffer();
primitive.setIndices(
  doc
    .createAccessor("H01_Remainder_Indices", buffer)
    .setType(Accessor.Type.SCALAR)
    .setArray(parts.remainder),
);
const cloth = doc.createPrimitive().setMaterial(primitive.getMaterial());
for (const semantic of primitive.listSemantics())
  cloth.setAttribute(semantic, primitive.getAttribute(semantic));
for (const target of primitive.listTargets()) cloth.addTarget(target);
cloth.setIndices(
  doc
    .createAccessor("H01_Garment_Indices", buffer)
    .setType(Accessor.Type.SCALAR)
    .setArray(parts.garment),
);
const clothNode = doc
  .createNode("H01_AoNgoai_SourceSurface")
  .setMesh(doc.createMesh("H01_AoNgoai").addPrimitive(cloth))
  .setSkin(skin);
clothNode
  .setTranslation(node.getTranslation())
  .setRotation(node.getRotation())
  .setScale(node.getScale());
if (node.getParentNode()) node.getParentNode().addChild(clothNode);
else
  for (const scene of doc.getRoot().listScenes())
    if (scene.listChildren().includes(node)) scene.addChild(clothNode);
node.setName("H01_RemainingSourceSurface");
assert.deepEqual(
  doc
    .getRoot()
    .listTextures()
    .map((t) => sha(t.getImage())),
  beforeTextures,
);
for (const [semantic, hash] of originalAttributes)
  assert.equal(
    sha(Buffer.from(cloth.getAttribute(semantic).getArray().buffer)),
    hash,
  );
assert.equal(
  parts.garment.length + parts.remainder.length,
  originalIndices.length,
);
const output = ".local/rig-candidates/garment-separated/H01-C0-rigged.glb";
await fs.mkdir(".local/rig-candidates/garment-separated", { recursive: true });
await io.write(output, doc);
const publishedCandidate = "assets/rigged/H01-C0-garment-diagnostic.glb";
await fs.copyFile(output, publishedCandidate);
const reread = await io.read(output);
assert.deepEqual(
  reread
    .getRoot()
    .listTextures()
    .map((t) => sha(t.getImage())),
  beforeTextures,
);
assert.deepEqual(animationSignature(reread), beforeAnimations);
assert.deepEqual(
  reread
    .getRoot()
    .listSkins()[0]
    .listJoints()
    .map((j) => j.getName()),
  beforeJoints,
);
const outputPrimitives = reread
  .getRoot()
  .listMeshes()
  .flatMap((m) => m.listPrimitives());
for (const p of outputPrimitives) {
  assert.deepEqual(p.getAttribute("JOINTS_0").getArray(), originalIds);
  assert.deepEqual(p.getAttribute("WEIGHTS_0").getArray(), originalWeights);
  for (const [semantic, hash] of originalAttributes)
    assert.equal(
      sha(Buffer.from(p.getAttribute(semantic).getArray().buffer)),
      hash,
    );
}
assert.equal(
  outputPrimitives.reduce((n, p) => n + p.getIndices().getCount(), 0),
  originalIndices.length,
);
const report = {
  boneCount: beforeJoints.length,
  animationsPreserved: beforeAnimations.map((a) => a.name),
  input,
  inputSha256: sha(bytes),
  output,
  publishedCandidate,
  outputSha256: sha(await fs.readFile(output)),
  trialChangedWeights: repair.changed,
  separatedWeightsUnchanged: true,
  trialDisposition:
    "Rejected: whole-body strain worsened; weights are not used in the separated candidate.",
  garmentTriangles: parts.garment.length / 3,
  remainingTriangles: parts.remainder.length / 3,
  totalTriangles: originalIndices.length / 3,
  textureHashes: beforeTextures,
  sourceAttributesUnchanged: true,
  scope:
    "Conservative UV-color visible garment partition; no hidden torso reconstruction. Diagnostic, not runtime accepted. Seam and full-animation checks remain required.",
};
await fs.mkdir("docs/anim-report/garment-separated", { recursive: true });
await fs.writeFile(
  "docs/anim-report/garment-separated/separation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
