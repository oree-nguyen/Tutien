import fs from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { splitRobePanels, compactTriangleIndices } from "./robe-panels.mjs";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const input = "assets/rigged/H01-C0-garment-diagnostic.glb";
const bytes = await fs.readFile(input),
  doc = await io.readBinary(bytes);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const arrayHash = (a) =>
  hash(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const animationSignature = (d) =>
  d
    .getRoot()
    .listAnimations()
    .map((a) => ({
      name: a.getName(),
      channels: a.listChannels().map((c) => ({
        target: c.getTargetNode().getName(),
        path: c.getTargetPath(),
        interpolation: c.getSampler().getInterpolation(),
        input: arrayHash(c.getSampler().getInput().getArray()),
        output: arrayHash(c.getSampler().getOutput().getArray()),
      })),
    }));
const animations = animationSignature(doc);
const textures = doc
  .getRoot()
  .listTextures()
  .map((t) => hash(t.getImage()));
const originalNodes = doc
  .getRoot()
  .listNodes()
  .filter((n) => n.getMesh());
const originalTotalTriangles = originalNodes.reduce(
  (sum, n) =>
    sum +
    n
      .getMesh()
      .listPrimitives()
      .reduce((v, p) => v + p.getIndices().getCount() / 3, 0),
  0,
);
const robe = originalNodes.find(
  (n) => n.getName() === "H01_AoNgoai_SourceSurface",
);
assert(robe);
const skin = robe.getSkin(),
  joints = skin.listJoints().map((j) => j.getName());
const buffer = doc.getRoot().listBuffers()[0];
const recipe = {
  waistY: 0.9,
  hemY: 0.2,
  halfWidth: 0.245,
  classifier: "Spatial nearest green/white fabric seed; lower region only",
};
const sourcePrimitive = robe.getMesh().listPrimitives()[0];
for (const original of originalNodes) {
  const p = original.getMesh().listPrimitives()[0];
  assert.equal(
    p.getMaterial(),
    sourcePrimitive.getMaterial(),
    "Cannot merge surfaces with distinct materials",
  );
  assert.deepEqual(p.listSemantics(), sourcePrimitive.listSemantics());
  for (const s of p.listSemantics())
    assert.equal(
      arrayHash(p.getAttribute(s).getArray()),
      arrayHash(sourcePrimitive.getAttribute(s).getArray()),
      "Source mapping mismatch: " + s,
    );
  assert.equal(p.listTargets().length, sourcePrimitive.listTargets().length);
}
const positions = sourcePrimitive.getAttribute("POSITION").getArray(),
  uv = sourcePrimitive.getAttribute("TEXCOORD_0").getArray();
const scratch = ".local/rig-candidates/robe-panels";
await fs.mkdir(scratch, { recursive: true });
const { data, info } = await sharp(
  sourcePrimitive.getMaterial().getBaseColorTexture().getImage(),
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const seeds = new Uint8Array(positions.length / 3);
for (let i = 0; i < seeds.length; i++) {
  const x = Math.max(
      0,
      Math.min(info.width - 1, Math.floor(uv[i * 2] * info.width)),
    ),
    y = Math.max(
      0,
      Math.min(info.height - 1, Math.floor(uv[i * 2 + 1] * info.height)),
    );
  const [r, g, b] = data.subarray(
      (y * info.width + x) * 4,
      (y * info.width + x) * 4 + 3,
    ),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (g > r * 1.07 && g > b * 0.95) seeds[i] = 1;
  else if (max > 35 && min > max * 0.78) seeds[i] = 2;
}
await fs.writeFile(
  scratch + "/positions.bin",
  Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength),
);
await fs.writeFile(scratch + "/seeds.bin", seeds);
execFileSync("python3", ["tools/rig/classify_robe_panels.py", scratch], {
  stdio: "inherit",
});
const panelMask = new Uint8Array(
  await fs.readFile(scratch + "/panel-mask.bin"),
);
const splits = originalNodes.map((n) => ({
  node: n,
  parts: splitRobePanels(
    positions,
    n.getMesh().listPrimitives()[0].getIndices().getArray(),
    { ...recipe, panelMask },
  ),
}));
const join = (arrays) => {
  const result = new Uint32Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of arrays) {
    result.set(a, at);
    at += a.length;
  }
  return result;
};
const parts = {
  left: join(splits.map((s) => s.parts.left)),
  right: join(splits.map((s) => s.parts.right)),
  upper: splits.find((s) => s.node === robe).parts.upper,
};
const remainder = join(
  splits.flatMap((s) =>
    s.node === robe ? [s.parts.remainder] : [s.parts.upper, s.parts.remainder],
  ),
);
const expected = new Map(),
  reportParts = [];
function build(source, indices, name, parent) {
  assert(indices.length > 0, name + " is empty");
  const compact = compactTriangleIndices(indices),
    p = doc.createPrimitive().setMaterial(source.getMaterial());
  const hashes = {};
  function copyAttribute(accessor, label) {
    const sourceArray = accessor.getArray(),
      size = accessor.getElementSize();
    const out = new sourceArray.constructor(
      compact.sourceVertices.length * size,
    );
    for (let i = 0; i < compact.sourceVertices.length; i++)
      out.set(
        sourceArray.subarray(
          compact.sourceVertices[i] * size,
          (compact.sourceVertices[i] + 1) * size,
        ),
        i * size,
      );
    const result = doc
      .createAccessor(name + "_" + label, buffer)
      .setType(accessor.getType())
      .setNormalized(accessor.getNormalized())
      .setArray(out);
    hashes[label] = arrayHash(out);
    return result;
  }
  for (const s of source.listSemantics())
    p.setAttribute(s, copyAttribute(source.getAttribute(s), s));
  for (const [index, target] of source.listTargets().entries()) {
    const t = doc.createPrimitiveTarget();
    for (const s of target.listSemantics())
      t.setAttribute(
        s,
        copyAttribute(target.getAttribute(s), "morph" + index + "_" + s),
      );
    p.addTarget(t);
  }
  p.setIndices(
    doc
      .createAccessor(name + "_indices", buffer)
      .setType(Accessor.Type.SCALAR)
      .setArray(compact.indices),
  );
  const mesh = doc
    .createMesh(name)
    .addPrimitive(p)
    .setWeights(parent.getMesh().getWeights());
  const node = doc
    .createNode(name)
    .setMesh(mesh)
    .setSkin(parent.getSkin())
    .setTranslation(parent.getTranslation())
    .setRotation(parent.getRotation())
    .setScale(parent.getScale())
    .setWeights(parent.getWeights());
  if (parent.getParentNode()) parent.getParentNode().addChild(node);
  else
    for (const scene of doc.getRoot().listScenes())
      if (scene.listChildren().includes(parent)) scene.addChild(node);
  expected.set(name, {
    hashes,
    indices: arrayHash(compact.indices),
    material: source.getMaterial().getName(),
    morphs: source.listTargets().length,
  });
  // Independent reconstruction of every oriented triangle's original source IDs.
  for (let i = 0; i < indices.length; i++)
    assert.equal(compact.sourceVertices[compact.indices[i]], indices[i]);
  reportParts.push({
    name,
    triangles: indices.length / 3,
    vertices: compact.sourceVertices.length,
  });
}
build(sourcePrimitive, parts.upper, "H01_Ao_ThanVaTay", robe);
build(sourcePrimitive, parts.left, "H01_Ao_VatTrai", robe);
build(sourcePrimitive, parts.right, "H01_Ao_VatPhai", robe);
build(sourcePrimitive, remainder, "H01_ThanConLai", robe);
for (const node of originalNodes) {
  const mesh = node.getMesh();
  node.dispose();
  for (const primitive of mesh.listPrimitives()) {
    for (const target of primitive.listTargets()) target.dispose();
    primitive.dispose();
  }
  mesh.dispose();
}
// Remove orphaned source buffers only after recording and rebuilding every surface.
for (const a of doc.getRoot().listAccessors())
  if (a.listParents().every((p) => p.propertyType === "Root")) a.dispose();
const local = ".local/rig-candidates/robe-panels/H01-C0-rigged.glb";
await fs.mkdir(".local/rig-candidates/robe-panels", { recursive: true });
await io.write(local, doc);
const result = await io.read(local);
assert.deepEqual(animationSignature(result), animations);
assert.deepEqual(
  result
    .getRoot()
    .listTextures()
    .map((t) => hash(t.getImage())),
  textures,
);
assert.deepEqual(
  result
    .getRoot()
    .listSkins()[0]
    .listJoints()
    .map((j) => j.getName()),
  joints,
);
const distinctPositions = new Set();
for (const node of result
  .getRoot()
  .listNodes()
  .filter((n) => n.getMesh())) {
  const p = node.getMesh().listPrimitives()[0],
    e = expected.get(node.getName());
  assert(e);
  assert.equal(arrayHash(p.getIndices().getArray()), e.indices);
  for (const s of p.listSemantics())
    assert.equal(arrayHash(p.getAttribute(s).getArray()), e.hashes[s]);
  for (const [i, t] of p.listTargets().entries())
    for (const s of t.listSemantics())
      assert.equal(
        arrayHash(t.getAttribute(s).getArray()),
        e.hashes["morph" + i + "_" + s],
      );
  assert.equal(p.listTargets().length, e.morphs);
  distinctPositions.add(p.getAttribute("POSITION"));
}
assert.equal(
  distinctPositions.size,
  4,
  "Panels must have independent vertex buffers",
);
const totalTriangles = reportParts.reduce((sum, p) => sum + p.triangles, 0);
assert.equal(totalTriangles, originalTotalTriangles);
const output = "assets/rigged/H01-C0-robe-panels-diagnostic.glb";
await fs.copyFile(local, output);
const report = {
  input,
  inputSha256: hash(bytes),
  output,
  outputSha256: hash(await fs.readFile(output)),
  recipe,
  parts: reportParts,
  totalTriangles,
  bones: joints.length,
  clips: animations.map((a) => a.name),
  checks: {
    everySourceTrianglePreserved: true,
    independentVertexBuffers: true,
    sourceUVAndWeightsPreserved: true,
    embeddedImagesPreserved: true,
    animationKeyframesPreserved: true,
  },
  scope:
    "Lower anatomical left/right outer-robe panels split from upper torso/sleeves, with spatial green/white seed propagation to clean lower-robe color holes. No hidden body reconstruction, weight correction or runtime activation.",
};
await fs.mkdir("docs/anim-report/robe-panels", { recursive: true });
await fs.writeFile(
  "docs/anim-report/robe-panels/separation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
