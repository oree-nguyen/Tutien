/** Apply a hash-bound original-corner pattern to a current source-identical rig.
 * Ownership is independent of skinning: old 52-joint weights are never copied.
 * Output remains unapproved staging until pattern and all-pose checks pass.
 */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { animationSignature, sha256 } from "./animation-payload.mjs";
import { assertUnusedStagingOutput } from "./staging-output.mjs";

const [parent, pattern, output] = process.argv.slice(2);
assert(
  parent?.startsWith(".local/rig-candidates/") &&
    parent.endsWith("/H01-C0-rigged.glb"),
);
for (const d of [pattern, output])
  assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(d ?? ""));
assert.notEqual(pattern, output);
assert.notEqual(parent, output + "/H01-C0-rigged.glb");
await assertUnusedStagingOutput(output);
const bytes = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const input = await fs.readFile(parent),
  doc = await io.readBinary(input);
const planBytes = await fs.readFile(pattern + "/cut-plan.json"),
  plan = JSON.parse(planBytes);
const source = "public/models/hunyuan-original/H01-C0-source.glb";
const sourceBytes = await fs.readFile(source),
  original = await io.readBinary(sourceBytes);
assert.equal(sha256(sourceBytes), plan.sourceSha256);
const meshNodes = doc
  .getRoot()
  .listNodes()
  .filter((n) => n.getMesh());
assert.equal(
  meshNodes.length,
  1,
  "Rebase requires a single original source-layout mesh",
);
const oldNode = meshNodes[0],
  oldMesh = oldNode.getMesh(),
  sourceNode = original
    .getRoot()
    .listNodes()
    .find((n) => n.getMesh());
assert.equal(oldMesh.listPrimitives().length, 1);
const p = oldMesh.listPrimitives()[0],
  sourceP = sourceNode.getMesh().listPrimitives()[0];
assert.equal(
  p.listTargets().length,
  0,
  "Morphs need a separate exact source-corner exporter",
);
for (const semantic of sourceP.listSemantics())
  assert.deepEqual(
    bytes(p.getAttribute(semantic).getArray()),
    bytes(sourceP.getAttribute(semantic).getArray()),
    semantic + " differs from source",
  );
assert.deepEqual(
  bytes(p.getIndices().getArray()),
  bytes(sourceP.getIndices().getArray()),
);
const images = (d) =>
  d
    .getRoot()
    .listTextures()
    .map((t) => sha256(t.getImage()));
assert.deepEqual(images(doc), images(original));
const clips = (d) =>
  d
    .getRoot()
    .listAnimations()
    .map((a) => ({ name: a.getName(), channels: animationSignature(a) }));
const beforeClips = clips(doc),
  skin = oldNode.getSkin();
const boneSignature = (d) =>
  d
    .getRoot()
    .listSkins()
    .map((s) => ({
      joints: s
        .listJoints()
        .map((n) => ({
          name: n.getName(),
          parent: n.getParentNode()?.getName(),
          t: n.getTranslation(),
          q: n.getRotation(),
          s: n.getScale(),
        })),
      ibm: sha256(bytes(s.getInverseBindMatrices().getArray())),
    }));
const beforeBones = boneSignature(doc);
const read = async (name, Type) => {
  const b = await fs.readFile(pattern + "/" + name);
  assert.equal(sha256(b), plan.files[name].sha256);
  assert.equal(b.length, plan.files[name].bytes);
  return new Type(b.buffer, b.byteOffset, b.length / Type.BYTES_PER_ELEMENT);
};
const corners = await read("corner-components.u32bin", Uint32Array),
  roles = await read("face-roles.u8bin", Uint8Array);
const layers = plan.files["face-layers.u8bin"]
  ? await read("face-layers.u8bin", Uint8Array)
  : null;
if (layers) {
  assert.equal(layers.length, roles.length);
  assert(layers.every((v) => v <= 2));
}
await read("cut-edges.u32bin", Uint32Array);
const index = p.getIndices().getArray();
assert.equal(corners.length, index.length);
assert.equal(roles.length * 3, index.length);
const rawDir = ".local/rig-candidates/semantic-garment-v6";
const rawInput = JSON.parse(await fs.readFile(rawDir + "/input.json"));
assert.equal(rawInput.sourceSha256, sha256(sourceBytes));
const weldBytes = await fs.readFile(rawDir + "/source-welds.u32bin");
const weld = new Uint32Array(
  weldBytes.buffer,
  weldBytes.byteOffset,
  weldBytes.length / 4,
);
assert.equal(weld.length, p.getAttribute("POSITION").getCount());
const continuity = await fs.readFile(rawDir + "/source-continuity.json");
assert.equal(JSON.parse(continuity).weldMapSha256, sha256(weldBytes));
const lining = new Uint8Array(roles.length);
for (const side of ["left", "right"]) {
  const own = JSON.parse(
    await fs.readFile(
      ".local/rig-candidates/semantic-garment-v7/ownership.json",
    ),
  );
  assert.equal(own.sourceSha256, sha256(sourceBytes));
  const b = await fs.readFile(
    `.local/rig-candidates/semantic-garment-v7/lining-${side}.u32bin`,
  );
  assert.equal(sha256(b), own.files[`lining-${side}.u32bin`].sha256);
  for (const f of new Uint32Array(b.buffer, b.byteOffset, b.length / 4))
    lining[f] = 1;
}
for (const f of plan.additionalLiningFaces ?? []) lining[f] = 1;
const names = [
  "H01_Remaining_Source",
  "H01_Robe_Left",
  "H01_Robe_Right",
  "H01_Robe_Torso",
  "H01_Sleeve_Left",
  "H01_Sleeve_Right",
];
assert(roles.every((v) => v < names.length));
await fs.mkdir(output, { recursive: true });
for (const name of Object.keys(plan.files))
  await fs.copyFile(pattern + "/" + name, output + "/" + name);
await fs.writeFile(output + "/cut-plan.json", planBytes);
await fs.writeFile(output + "/source-welds.u32bin", weldBytes);
await fs.writeFile(output + "/source-continuity.json", continuity);
const orderedFaces = [],
  records = [],
  buffer = doc.getRoot().listBuffers()[0];
const sourceFaceFile = "H01-cut-source-triangles.u32bin";
for (let role = 0; role < names.length; role++) {
  const node = doc
    .createNode(names[role])
    .setMesh(doc.createMesh(names[role]))
    .setSkin(skin)
    .setTranslation(oldNode.getTranslation())
    .setRotation(oldNode.getRotation())
    .setScale(oldNode.getScale());
  if (oldNode.getParentNode()) oldNode.getParentNode().addChild(node);
  else
    for (const scene of doc.getRoot().listScenes())
      if (scene.listChildren().includes(oldNode)) scene.addChild(node);
  for (const inner of role === 1 || role === 2 ? [0, 1] : [0])
    for (const layer of layers && (role === 1 || role === 2) ? [1, 2] : [0]) {
      const faces = [];
      for (let f = 0; f < roles.length; f++)
        if (
          roles[f] === role &&
          (!(role === 1 || role === 2) || lining[f] === inner) &&
          (!layer || layers[f] === layer)
        )
          faces.push(f);
      assert(faces.length, "Empty actual source region");
      const sourceIds = [],
        fanIds = [],
        compact = new Map(),
        indices = new Uint32Array(faces.length * 3);
      for (const [i, f] of faces.entries())
        for (let k = 0; k < 3; k++) {
          const v = index[f * 3 + k],
            fan = corners[f * 3 + k],
            key = v + ":" + fan;
          if (!compact.has(key)) {
            compact.set(key, sourceIds.length);
            sourceIds.push(v);
            fanIds.push(fan);
          }
          indices[i * 3 + k] = compact.get(key);
        }
      const part = doc.createPrimitive().setMaterial(p.getMaterial()),
        hashes = {};
      for (const semantic of p.listSemantics()) {
        const a = p.getAttribute(semantic),
          values = a.getArray(),
          size = a.getElementSize(),
          out = new values.constructor(sourceIds.length * size);
        for (let i = 0; i < sourceIds.length; i++)
          out.set(
            values.subarray(sourceIds[i] * size, (sourceIds[i] + 1) * size),
            i * size,
          );
        part.setAttribute(
          semantic,
          doc
            .createAccessor("", buffer)
            .setType(a.getType())
            .setNormalized(a.getNormalized())
            .setArray(out),
        );
        hashes[semantic] = sha256(bytes(out));
      }
      for (const [name, array] of [
        ["_SOURCE_VERTEX", Uint32Array.from(sourceIds)],
        ["_SOURCE_WELD", Uint32Array.from(sourceIds, (v) => weld[v])],
        ["_SOURCE_CUT_WELD", Uint32Array.from(fanIds)],
      ])
        part.setAttribute(
          name,
          doc.createAccessor("", buffer).setType("SCALAR").setArray(array),
        );
      part.setIndices(
        doc.createAccessor("", buffer).setType("SCALAR").setArray(indices),
      );
      const offset = orderedFaces.length;
      for (const f of faces) orderedFaces.push(f);
      part.setExtras({
        sourceProvenance: {
          version: 1,
          sourceFile: source,
          sourceSha256: sha256(sourceBytes),
          sourceNodeIndex: original.getRoot().listNodes().indexOf(sourceNode),
          sourcePrimitiveIndex: 0,
          parentRigFile: parent,
          parentRigSha256: sha256(input),
          vertexAccessor: "_SOURCE_VERTEX",
          weldAccessor: "_SOURCE_WELD",
          weldMap: {
            file: "source-welds.u32bin",
            sha256: sha256(weldBytes),
            count: weld.length,
            method: "paired-opposite-source-boundary-halfedges",
            reviewed: true,
            review: {
              file: "source-continuity.json",
              sha256: sha256(continuity),
            },
          },
          triangleMap: {
            file: sourceFaceFile,
            sha256: "pending",
            offsetBytes: offset * 4,
            count: faces.length,
          },
          semanticRegion: names[role],
          garmentPatternReviewed: false,
        },
        sourceCutProposal: {
          file: "cut-plan.json",
          sha256: sha256(planBytes),
          approved: false,
        },
        clothLayer: layer,
        auditRegion: inner ? "existing-lining-trim" : "original-outer-region",
      });
      node.getMesh().addPrimitive(part);
      records.push({
        node: names[role],
        inner,
        layer,
        triangles: faces.length,
        vertices: sourceIds.length,
        attributeHashes: hashes,
      });
    }
}
assert.equal(orderedFaces.length, roles.length);
assert.equal(new Set(orderedFaces).size, roles.length);
const faceBytes = bytes(Uint32Array.from(orderedFaces));
await fs.writeFile(output + "/" + sourceFaceFile, faceBytes);
for (const mesh of doc.getRoot().listMeshes())
  for (const part of mesh.listPrimitives())
    if (part.getExtras().sourceProvenance) {
      const extra = part.getExtras();
      extra.sourceProvenance.triangleMap.sha256 = sha256(faceBytes);
      part.setExtras(extra);
    }
oldNode.dispose();
oldMesh.dispose();
p.dispose();
for (const a of doc.getRoot().listAccessors())
  if (a.listParents().every((p) => p.propertyType === "Root")) a.dispose();
const file = output + "/H01-C0-rigged.glb";
await io.write(file, doc);
const actual = await io.read(file);
assert.deepEqual(images(actual), images(original));
assert.deepEqual(clips(actual), beforeClips);
assert.deepEqual(boneSignature(actual), beforeBones);
let faceAt = 0,
  partAt = 0;
for (const node of actual.getRoot().listNodes())
  for (const part of node.getMesh()?.listPrimitives() ?? []) {
    const ids = part.getAttribute("_SOURCE_VERTEX").getArray(),
      fans = part.getAttribute("_SOURCE_CUT_WELD").getArray(),
      ix = part.getIndices().getArray();
    const expected = records[partAt++];
    assert.equal(node.getName(), expected.node);
    assert.equal(ids.length, expected.vertices);
    assert.equal(ix.length / 3, expected.triangles);
    assert.deepEqual(
      part
        .listSemantics()
        .filter((s) => !s.startsWith("_SOURCE_"))
        .sort(),
      Object.keys(expected.attributeHashes).sort(),
    );
    for (const [semantic, digest] of Object.entries(expected.attributeHashes))
      assert.equal(
        sha256(bytes(part.getAttribute(semantic).getArray())),
        digest,
        "Readback attribute changed: " + semantic,
      );
    for (let i = 0; i < ix.length; i++) {
      const originalFace = orderedFaces[faceAt + Math.floor(i / 3)];
      assert.equal(ids[ix[i]], index[originalFace * 3 + (i % 3)]);
      assert.equal(fans[ix[i]], corners[originalFace * 3 + (i % 3)]);
    }
    faceAt += ix.length / 3;
  }
assert.equal(faceAt, roles.length);
assert.equal(partAt, records.length);
const receipt = {
  input: parent,
  inputSha256: sha256(input),
  source,
  sourceSha256: sha256(sourceBytes),
  pattern,
  patternSha256: sha256(planBytes),
  output: file,
  sha256: sha256(await fs.readFile(file)),
  sourceTriangles: faceAt,
  sourceCornerCount: corners.length,
  coreJointCount: skin.listJoints().length,
  parts: records,
  allSourceAttributesWeightsImagesAndClipsPreserved: true,
  coreBindPreserved: true,
  accepted: false,
  activated: false,
  scope:
    "Current-bind mechanical source-corner partition only. Old ownership/cuts remain proposals; no animation, garment fit, cut closure or collision acceptance.",
};
await fs.writeFile(
  output + "/receipt.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    output: file,
    triangles: faceAt,
    bones: receipt.coreJointCount,
    accepted: false,
  }),
);
