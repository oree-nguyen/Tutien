import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";
import { SeamAccumulator } from "../tools/rig/mesh-seams.mjs";
import { sourceBoundaryProof } from "../tools/rig/source-provenance.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");

// These are two different original faces sharing two source vertices. The
// exporter duplicates those vertices while preserving each original face once.
async function fixture(options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rig-all-mesh-"));
  try {
    const io = new NodeIO();
    const source = new Document(),
      sourceBuffer = source.createBuffer();
    const attr = (doc, buffer, type, array) =>
      doc.createAccessor("", buffer).setType(type).setArray(array);
    const sourcePositions = options.sourcePositions ?? [
      0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
    ];
    const sourceTriangles = options.sourceTriangles ?? [
      [0, 1, 2],
      [1, 3, 2],
    ];
    const sourcePrimitive = source
      .createPrimitive()
      .setAttribute(
        "POSITION",
        attr(
          source,
          sourceBuffer,
          Accessor.Type.VEC3,
          new Float32Array(sourcePositions),
        ),
      )
      .setIndices(
        attr(
          source,
          sourceBuffer,
          Accessor.Type.SCALAR,
          new Uint32Array(sourceTriangles.flat()),
        ),
      );
    const sourceNode = source
      .createNode("Source")
      .setMesh(source.createMesh().addPrimitive(sourcePrimitive));
    source.createScene().addChild(sourceNode);
    if (options.extraSourcePrimitive)
      sourceNode
        .getMesh()
        .addPrimitive(
          source
            .createPrimitive()
            .setAttribute("POSITION", sourcePrimitive.getAttribute("POSITION"))
            .setIndices(sourcePrimitive.getIndices()),
        );
    const sourceFile = path.join(directory, "source.glb");
    await io.write(sourceFile, source);
    const sourceSha256 = hash(await fs.readFile(sourceFile));
    const doc = new Document(),
      buffer = doc.createBuffer(),
      scene = doc.createScene();
    const offsets = options.offsets ?? [0, options.offset ?? 0];
    const scales = options.scales ?? [1, options.scale ?? 1];
    const joints = offsets.map((offset, i) =>
      doc
        .createNode(i === 0 ? "Hips" : "Joint" + i)
        .setTranslation([offset, 0, 0])
        .setScale(Array(3).fill(scales[i] ?? 1)),
    );
    for (const joint of joints) scene.addChild(joint);
    const inverse = new Float32Array(joints.length * 16);
    for (let j = 0; j < joints.length; j++)
      for (let k = 0; k < 4; k++) inverse[j * 16 + k * 5] = 1;
    const skin = doc
      .createSkin()
      .setInverseBindMatrices(attr(doc, buffer, Accessor.Type.MAT4, inverse));
    for (const joint of joints) skin.addJoint(joint);
    const parts = options.parts ?? sourceTriangles;
    const map = options.triangleIds ?? parts.map((_, i) => i);
    const triangleBytes = Buffer.alloc(map.length * 4);
    map.forEach((id, i) => triangleBytes.writeUInt32LE(id, i * 4));
    await fs.writeFile(path.join(directory, "triangles.u32bin"), triangleBytes);
    const metadata = {
      version: 1,
      sourceFile,
      sourceSha256: options.wrongSourceHash ? "0".repeat(64) : sourceSha256,
      sourceNodeIndex: 0,
      sourcePrimitiveIndex: 0,
      vertexAccessor: "_SOURCE_VERTEX",
    };
    if (options.brokenUltimate)
      Object.assign(metadata, {
        ultimateSourceFile: "missing-source.glb",
        ultimateSourceSha256: sourceSha256,
      });
    let weld;
    if (options.weld) {
      weld = sourceBoundaryProof(sourcePrimitive).ids;
      if (options.corruptWeld) weld[weld.length - 1] = 0;
      const bytes = Buffer.alloc(weld.length * 4);
      weld.forEach((id, i) => bytes.writeUInt32LE(id, i * 4));
      await fs.writeFile(path.join(directory, "weld.u32bin"), bytes);
      const record = Buffer.from(
        JSON.stringify({
          reviewed: true,
          sourceSha256,
          weldMapSha256: hash(bytes),
          method: "paired-opposite-source-boundary-halfedges",
        }),
      );
      await fs.writeFile(path.join(directory, "proof.json"), record);
      metadata.weldMap = {
        file: "weld.u32bin",
        sha256: hash(bytes),
        count: weld.length,
        method: "paired-opposite-source-boundary-halfedges",
        review: { file: "proof.json", sha256: hash(record) },
      };
    }
    const combined =
      options.layout === "one-primitive" || options.layout === "unsplit";
    const batches = combined ? [parts.flat()] : parts;
    const sharedMesh = options.layout === "same-node" ? doc.createMesh() : null;
    if (sharedMesh)
      scene.addChild(doc.createNode("Mesh").setMesh(sharedMesh).setSkin(skin));
    let mapOffset = 0;
    for (let m = 0; m < batches.length; m++) {
      const vertexIds =
        options.layout === "unsplit"
          ? Array.from({ length: sourcePositions.length / 3 }, (_, i) => i)
          : batches[m];
      const positions = Float32Array.from(
        vertexIds.flatMap((id) => sourcePositions.slice(id * 3, id * 3 + 3)),
      );
      if (options.corruptPosition) positions[0] += 0.01;
      const jointIds = new Uint16Array(vertexIds.length * 4),
        weights = new Float32Array(vertexIds.length * 4);
      for (let v = 0; v < vertexIds.length; v++) {
        jointIds[v * 4] = combined
          ? options.layout === "unsplit"
            ? 0
            : Math.floor(v / 3)
          : m;
        weights[v * 4] = 1;
      }
      const indices =
        options.layout === "unsplit"
          ? parts.flat()
          : vertexIds.map((_, i) => i);
      const primitive = doc
        .createPrimitive()
        .setAttribute(
          "POSITION",
          attr(doc, buffer, Accessor.Type.VEC3, positions),
        )
        .setAttribute(
          "JOINTS_0",
          attr(doc, buffer, Accessor.Type.VEC4, jointIds),
        )
        .setAttribute(
          "WEIGHTS_0",
          attr(doc, buffer, Accessor.Type.VEC4, weights),
        )
        .setIndices(
          attr(doc, buffer, Accessor.Type.SCALAR, new Uint32Array(indices)),
        );
      if (options.provenance !== false) {
        primitive.setAttribute(
          "_SOURCE_VERTEX",
          attr(doc, buffer, Accessor.Type.SCALAR, new Uint32Array(vertexIds)),
        );
        if (weld)
          primitive.setAttribute(
            "_SOURCE_WELD",
            attr(
              doc,
              buffer,
              Accessor.Type.SCALAR,
              Uint32Array.from(vertexIds, (id) => weld[id]),
            ),
          );
        primitive.setExtras({
          sourceProvenance: {
            ...metadata,
            triangleMap: {
              file: "triangles.u32bin",
              sha256: hash(triangleBytes),
              offsetBytes: mapOffset * 4,
              count: indices.length / 3,
            },
          },
        });
      }
      if (sharedMesh) sharedMesh.addPrimitive(primitive);
      else
        scene.addChild(
          doc
            .createNode(options.duplicateNames ? "Mesh" : "Mesh" + m)
            .setMesh(doc.createMesh().addPrimitive(primitive))
            .setSkin(skin),
        );
      mapOffset += indices.length / 3;
    }
    if (options.corruptMapHash)
      await fs.writeFile(
        path.join(directory, "triangles.u32bin"),
        Buffer.alloc(triangleBytes.length),
      );
    const input = path.join(directory, "fixture.glb"),
      output = path.join(directory, "report.json");
    await io.write(input, doc);
    const poseFile = path.join(directory, "pose.json");
    if (options.referencePose)
      await fs.writeFile(poseFile, JSON.stringify(options.referencePose));
    const child = spawnSync(
      process.execPath,
      ["tools/rig/validate-all-meshes.mjs"],
      {
        env: {
          ...process.env,
          RIG_FILE: input,
          RIG_REPORT_FILE: output,
          REFERENCE_POSE: options.referencePose ? poseFile : "",
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(child.status, null, child.stderr);
    const report = JSON.parse(await fs.readFile(output));
    return { child, report };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("validator rejects a distorted second mesh even when first mesh passes", async () => {
  const { child, report } = await fixture({ scale: 3 });
  assert.equal(child.status, 1);
  assert.equal(report.meshes[0].passed, true);
  assert.equal(report.meshes[1].passed, false);
  assert.equal(report.meshes[1].maximum, 3);
  assert.equal(report.seams.passed, false);
});

test("provenance-bound continuous source copies pass with complete oriented triangle coverage", async () => {
  const { child, report } = await fixture();
  assert.equal(child.status, 0, child.stderr);
  assert.equal(report.passed, true);
  assert.equal(report.meshes.length, 2);
  assert.equal(report.seams.pairs, 2);
  assert.equal(report.sourceCoverage.sources[0].measuredTriangles, 2);
  assert.equal(report.sourceCoverage.sources[0].duplicatedTriangles, 0);
});

for (const options of [
  {},
  { layout: "same-node" },
  { duplicateNames: true },
  { layout: "one-primitive" },
]) {
  test(
    "100 mm source-copy opening fails for " + JSON.stringify(options),
    async () => {
      const { child, report } = await fixture({ ...options, offset: 0.1 });
      assert(report.meshes.every((m) => m.passed));
      assert.equal(report.provenancePassed, true);
      assert.equal(report.edgeStrainPassed, true);
      assert.equal(report.seams.pairs, 2);
      assert.ok(Math.abs(report.seams.maximumMillimetres - 100) < 1e-9);
      assert.equal(report.seams.passed, false);
      assert.equal(child.status, 1);
    },
  );
}

test("seam maximum compares every pair instead of only the first source copy", async () => {
  const { report } = await fixture({
    sourcePositions: [
      0, 0, 0, 1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0, 0, 0, 1, 0, 1, 1,
    ],
    sourceTriangles: [
      [0, 1, 2],
      [0, 3, 4],
      [0, 5, 6],
    ],
    offsets: [0, 0.05, -0.05],
    scales: [1, 1, 1],
    layout: "same-node",
  });
  assert.equal(report.seams.pairs, 3);
  assert.ok(Math.abs(report.seams.maximumMillimetres - 100) < 1e-9);
  assert.equal(report.seams.worst.first.primitiveIndex, 1);
  assert.equal(report.seams.worst.second.primitiveIndex, 2);
});

test("coincident XYZ without source provenance is diagnostic and cannot certify seams", async () => {
  const { child, report } = await fixture({ provenance: false });
  assert.equal(child.status, 1);
  assert.equal(report.edgeStrainPassed, true);
  assert.equal(report.provenancePassed, false);
  assert.equal(report.seams.pairs, 0);
  assert.equal(report.seams.inferredXYZDiagnostic.pairs, 2);
  assert.equal(
    report.seams.inferredXYZDiagnostic.acceptedAsSourceIdentity,
    false,
  );
});

test("an unsplit asset with no duplicated source vertices is explicitly unmeasured", async () => {
  const { child, report } = await fixture({ layout: "unsplit" });
  assert.equal(report.provenancePassed, true);
  assert.equal(report.seams.pairs, 0);
  assert.equal(report.seams.status, "unmeasured-no-source-copy-pairs");
  assert.equal(report.passed, false);
  assert.equal(child.status, 1);
});

for (const options of [
  { wrongSourceHash: true },
  { corruptPosition: true },
  { triangleIds: [1, 0] },
  { corruptMapHash: true },
  { brokenUltimate: true },
  { extraSourcePrimitive: true },
  {
    parts: [
      [0, 1, 2],
      [0, 1, 2],
    ],
    triangleIds: [0, 0],
  },
]) {
  test(
    "source IDs and full triangle coverage are independently checked: " +
      JSON.stringify(options),
    async () => {
      const { child, report } = await fixture(options);
      assert.equal(child.status, 1);
      assert.equal(report.provenancePassed, false);
      assert.equal(report.seams.passed, false);
    },
  );
}

const tetraPositions = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
const tetraFaces = [
  [0, 2, 1],
  [0, 1, 3],
  [0, 3, 2],
  [1, 2, 3],
];
test("UV-chart seams use independently reconstructed opposite original boundary edges", async () => {
  const { child, report } = await fixture({
    sourcePositions: tetraFaces.flatMap((face) =>
      face.flatMap((id) => tetraPositions.slice(id * 3, id * 3 + 3)),
    ),
    sourceTriangles: tetraFaces.map((_, i) => [i * 3, i * 3 + 1, i * 3 + 2]),
    offsets: [0, 0, 0, 0],
    scales: [1, 1, 1, 1],
    weld: true,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(report.seams.pairs, 12);
  assert.equal(
    report.meshes[0].sourceProvenance.weldProof.uniqueOppositePairs,
    6,
  );
  assert.equal(
    report.meshes[0].sourceProvenance.weldProof.boundaryHalfedges,
    12,
  );
});

test("a self-authored reviewed map cannot weld unrelated coincident source vertices", async () => {
  const { child, report } = await fixture({
    sourcePositions: [...tetraPositions, 0, 0, 0],
    sourceTriangles: tetraFaces,
    offsets: [0, 0, 0, 0],
    scales: [1, 1, 1, 1],
    weld: true,
    corruptWeld: true,
  });
  assert.equal(child.status, 1);
  assert.equal(report.provenancePassed, false);
  assert.match(
    report.meshes[0].sourceProvenance.errors.join(" "),
    /independently reconstructed/,
  );
});

test("nonfinite positions in seam comparisons fail closed", () => {
  const seams = new SeamAccumulator();
  for (const position of [
    [0, 0, 0],
    [NaN, 0, 0],
  ])
    seams.add("source:1", { position, identity: {} });
  assert.equal(seams.measure().invalidPositions, 1);
  assert.equal(seams.measure().pairs, 1);
});

test("source boundary proof rejects ambiguous matches, wrong orientation and nonmanifold source edges", () => {
  const doc = new Document(),
    buffer = doc.createBuffer();
  function primitive(positions, triangles) {
    return doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc
          .createAccessor("", buffer)
          .setType(Accessor.Type.VEC3)
          .setArray(new Float32Array(positions)),
      )
      .setIndices(
        doc
          .createAccessor("", buffer)
          .setType(Accessor.Type.SCALAR)
          .setArray(new Uint32Array(triangles.flat())),
      );
  }
  const charts = tetraFaces.flatMap((face) =>
    face.flatMap((id) => tetraPositions.slice(id * 3, id * 3 + 3)),
  );
  const faces = tetraFaces.map((_, i) => [i * 3, i * 3 + 1, i * 3 + 2]);
  const reversed = faces.map((face, i) =>
    i === 0 ? [...face].reverse() : face,
  );
  assert.throws(
    () => sourceBoundaryProof(primitive(charts, reversed)),
    /not oppositely oriented/,
  );
  assert.throws(
    () =>
      sourceBoundaryProof(
        primitive(
          [...charts, ...charts],
          [...faces, ...faces.map((face) => face.map((i) => i + 12))],
        ),
      ),
    /ambiguous source boundary/,
  );
  assert.throws(
    () =>
      sourceBoundaryProof(
        primitive(tetraPositions, [...tetraFaces, tetraFaces[0]]),
      ),
    /Nonmanifold/,
  );
});

test("sampled Hips translation is applied before skinning instead of silently ignored", async () => {
  const { child, report } = await fixture({
    referencePose: {
      passed: true,
      rotations: { Hips: [0, 0, 0, 1] },
      translations: { Hips: [0.1, 0, 0] },
    },
  });
  assert.equal(child.status, 1);
  assert.deepEqual(report.appliedPoseChannels, {
    rotations: 1,
    translations: 1,
  });
  assert.ok(Math.abs(report.seams.maximumMillimetres - 100) < 1e-9);
  assert.equal(report.edgeStrainPassed, true);
  assert.match(report.poseSha256, /^[0-9a-f]{64}$/);
});

for (const referencePose of [
  { passed: true, rotations: { Unknown: [0, 0, 0, 1] } },
  { passed: true, rotations: { Hips: [0, 0, 0, 0] } },
  {
    passed: true,
    rotations: { Hips: [0, 0, 0, 1] },
    translations: { Hips: [null, 0, 0] },
  },
  {
    passed: true,
    rotations: { Hips: [0, 0, 0, 1] },
    translations: { Joint1: [0.1, 0, 0] },
  },
  {
    passed: true,
    rotations: { Hips: [0, 0, 0, 1] },
    scales: { Hips: [1, 1, 1] },
  },
]) {
  test(
    "invalid or unsupported sampled pose fails closed: " +
      JSON.stringify(referencePose),
    async () => {
      const { child, report } = await fixture({ referencePose });
      assert.equal(child.status, 1);
      assert.equal(report.passed, false);
      assert.ok(report.errors.length > 0);
    },
  );
}
