import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sourceCutProof } from './source-cut-proof.mjs';

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** Reconstruct original UV-chart seams from source topology, never XYZ alone. */
export function sourceBoundaryProof(primitive) {
  const positions = primitive.getAttribute("POSITION")?.getArray();
  const indices = primitive.getIndices()?.getArray();
  const count = positions?.length / 3;
  if (
    !Number.isInteger(count) ||
    !count ||
    !indices?.length ||
    indices.length % 3 ||
    count * count * 2 > Number.MAX_SAFE_INTEGER
  )
    throw Error("Unsupported source topology for boundary proof");
  const parent = Uint32Array.from({ length: count }, (_, i) => i);
  const edges = new Float64Array(indices.length);
  for (let at = 0; at < indices.length; at += 3)
    for (let k = 0; k < 3; k++) {
      const a = indices[at + k],
        b = indices[at + ((k + 1) % 3)];
      if (
        !Number.isInteger(a) ||
        !Number.isInteger(b) ||
        a < 0 ||
        b < 0 ||
        a >= count ||
        b >= count
      )
        throw Error("Invalid source index in boundary proof");
      edges[at + k] =
        (Math.min(a, b) * count + Math.max(a, b)) * 2 + Number(a > b);
    }
  edges.sort();
  const boundary = [];
  let nonmanifold = 0;
  for (let start = 0; start < edges.length; ) {
    const key = Math.floor(edges[start] / 2);
    let end = start + 1;
    while (end < edges.length && Math.floor(edges[end] / 2) === key) end++;
    if (end - start > 2) nonmanifold++;
    if (end - start === 1) {
      const low = Math.floor(key / count),
        high = key % count;
      boundary.push(edges[start] % 2 ? [high, low] : [low, high]);
    }
    start = end;
  }
  if (nonmanifold)
    throw Error(
      "Nonmanifold original source edges cannot establish boundary continuity",
    );
  const coordinateIds = new Map(),
    geometryEdges = new Map();
  const coordinateId = (vertex) => {
    const xyz = positions.subarray(vertex * 3, vertex * 3 + 3);
    if (![...xyz].every(Number.isFinite))
      throw Error("Nonfinite source boundary coordinates");
    const key = xyz.join(",");
    if (!coordinateIds.has(key)) coordinateIds.set(key, vertex);
    return coordinateIds.get(key);
  };
  for (const edge of boundary) {
    const a = coordinateId(edge[0]),
      b = coordinateId(edge[1]);
    if (a === b)
      throw Error("Zero-length source boundary cannot establish continuity");
    const key = Math.min(a, b) * count + Math.max(a, b);
    const group = geometryEdges.get(key) ?? [];
    group.push({ edge, a, b });
    geometryEdges.set(key, group);
  }
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    parent[Math.max(a, b)] = Math.min(a, b);
  };
  for (const pair of geometryEdges.values()) {
    if (pair.length !== 2)
      throw Error("Unpaired or ambiguous source boundary halfedges");
    const [a, b] = pair;
    if (a.a !== b.b || a.b !== b.a)
      throw Error("Source boundary halfedges are not oppositely oriented");
    union(a.edge[0], b.edge[1]);
    union(a.edge[1], b.edge[0]);
  }
  let sewnCopies = 0;
  for (let i = 0; i < count; i++) {
    parent[i] = find(i);
    if (parent[i] !== i) sewnCopies++;
  }
  return {
    ids: parent,
    method: "paired-opposite-source-boundary-halfedges",
    rawNonmanifoldEdges: 0,
    boundaryHalfedges: boundary.length,
    uniqueOppositePairs: geometryEdges.size,
    ambiguousPairs: 0,
    orientationDisagreements: 0,
    coordinateMismatch: 0,
    sourceVertices: count,
    sewnCopies,
  };
}

const validHash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** Source identity is independently checked against bytes, not inferred from XYZ. */
export class SourceProvenanceValidator {
  constructor(input, {cutRegistryFile} = {}) {
    this.directory = path.dirname(path.resolve(input));
    this.cutRegistryFile = cutRegistryFile;
    this.documents = new Map();
    this.files = new Map();
    this.sources = new Map();
  }
  async readFile(file, expectedHash, relativeToInput = false) {
    if (typeof file !== "string" || !file || !validHash(expectedHash))
      throw Error("Missing source/map path or SHA-256");
    const candidates = path.isAbsolute(file)
      ? [file]
      : relativeToInput
        ? [path.resolve(this.directory, file)]
        : [path.resolve(file), path.resolve(this.directory, file)];
    let actualPath, bytes;
    for (const candidate of candidates) {
      try {
        bytes = this.files.get(candidate) ?? (await fs.readFile(candidate));
        actualPath = candidate;
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    if (!bytes) throw Error("Missing provenance file: " + file);
    this.files.set(actualPath, bytes);
    if (sha256(bytes) !== expectedHash)
      throw Error("Provenance SHA-256 mismatch: " + file);
    return { bytes, path: actualPath };
  }
  async source(metadata) {
    const useUltimate =
      metadata.ultimateSourceFile !== undefined ||
      metadata.ultimateSourceSha256 !== undefined;
    const sourceFile = useUltimate
      ? metadata.ultimateSourceFile
      : metadata.sourceFile;
    const sourceSha256 = useUltimate
      ? metadata.ultimateSourceSha256
      : metadata.sourceSha256;
    const loaded = await this.readFile(sourceFile, sourceSha256);
    let document = this.documents.get(sourceSha256);
    if (!document) {
      document = await new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .readBinary(loaded.bytes);
      this.documents.set(sourceSha256, document);
      // Coverage includes every source instance/primitive, including namespaces
      // omitted entirely from the output's metadata.
      for (const [i, node] of document.getRoot().listNodes().entries())
        for (const [j, primitive] of (
          node.getMesh()?.listPrimitives() ?? []
        ).entries()) {
          const index = primitive.getIndices();
          const namespace = `${sourceSha256}:${i}:${j}`;
          this.sources.set(namespace, {
            namespace,
            file: sourceFile,
            sha256: sourceSha256,
            nodeIndex: i,
            primitiveIndex: j,
            primitive,
            triangleCounts: new Uint32Array(
              index && primitive.getMode() === 4 && index.getCount() % 3 === 0
                ? index.getCount() / 3
                : 0,
            ),
            validatedOutputPrimitives: 0,
          });
        }
    }
    const nodes = document.getRoot().listNodes();
    let nodeIndex = useUltimate
      ? metadata.ultimateSourceNodeIndex
      : metadata.sourceNodeIndex;
    let primitiveIndex = useUltimate
      ? metadata.ultimateSourcePrimitiveIndex
      : metadata.sourcePrimitiveIndex;
    if (nodeIndex === undefined || primitiveIndex === undefined) {
      const primitives = nodes.flatMap((node, i) =>
        (node.getMesh()?.listPrimitives() ?? []).map((primitive, j) => ({
          primitive,
          i,
          j,
        })),
      );
      if (primitives.length !== 1)
        throw Error("Ambiguous source node/primitive namespace");
      nodeIndex ??= primitives[0].i;
      primitiveIndex ??= primitives[0].j;
    }
    if (
      !Number.isInteger(nodeIndex) ||
      !Number.isInteger(primitiveIndex) ||
      nodeIndex < 0 ||
      primitiveIndex < 0
    )
      throw Error("Invalid source node/primitive index");
    const primitive = nodes[nodeIndex]?.getMesh()?.listPrimitives()[
      primitiveIndex
    ];
    const position = primitive?.getAttribute("POSITION");
    const index = primitive?.getIndices();
    if (
      !position ||
      !index ||
      primitive.getMode() !== 4 ||
      index.getCount() % 3
    )
      throw Error("Source must have indexed triangle geometry");
    const namespace = `${sourceSha256}:${nodeIndex}:${primitiveIndex}`;
    if (!this.sources.has(namespace))
      this.sources.set(namespace, {
        namespace,
        file: sourceFile,
        sha256: sourceSha256,
        nodeIndex,
        primitiveIndex,
        primitive,
        triangleCounts: new Uint32Array(index.getCount() / 3),
        validatedOutputPrimitives: 0,
      });
    return this.sources.get(namespace);
  }
  async validate(primitive) {
    const errors = [];
    const fail = (message) => {
      if (errors.length < 20) errors.push(message);
    };
    const metadata = primitive.getExtras().sourceProvenance;
    if (!metadata || metadata.version !== 1)
      return {
        verified: false,
        errors: [
          "Missing sourceProvenance version 1; XYZ coincidence is diagnostic only",
        ],
      };
    try {
      const source = await this.source(metadata);
      const accessor = primitive.getAttribute(metadata.vertexAccessor);
      const vertexIds = accessor?.getArray();
      const count = primitive.getAttribute("POSITION")?.getCount();
      if (
        metadata.vertexAccessor !== "_SOURCE_VERTEX" ||
        accessor?.getType() !== Accessor.Type.SCALAR ||
        accessor.getNormalized() ||
        !(vertexIds instanceof Uint32Array) ||
        vertexIds.length !== count
      )
        throw Error(
          "_SOURCE_VERTEX must be unnormalized UINT32 SCALAR, one ID per vertex",
        );
      const sourceCount = source.primitive.getAttribute("POSITION").getCount();
      for (let i = 0; i < vertexIds.length; i++)
        if (vertexIds[i] >= sourceCount) {
          fail(`Source vertex ID out of range at ${i}`);
          break;
        }
      const immutableSemantics = new Set(
        [
          ...source.primitive.listSemantics(),
          ...primitive.listSemantics(),
        ].filter((name) => !/^JOINTS_|^WEIGHTS_|^_SOURCE_/.test(name)),
      );
      for (const semantic of immutableSemantics) {
        const expected = source.primitive.getAttribute(semantic),
          actual = primitive.getAttribute(semantic);
        if (!expected && !actual) continue;
        if (
          !expected ||
          !actual ||
          expected.getType() !== actual.getType() ||
          expected.getComponentType() !== actual.getComponentType() ||
          expected.getNormalized() !== actual.getNormalized() ||
          actual.getCount() !== count
        ) {
          fail("Source attribute layout differs: " + semantic);
          continue;
        }
        const a = expected.getArray(),
          b = actual.getArray(),
          size = actual.getElementSize();
        for (let i = 0; i < count; i++) {
          let mismatch = false;
          for (let k = 0; k < size; k++)
            if (
              !Number.isFinite(b[i * size + k]) ||
              b[i * size + k] !== a[vertexIds[i] * size + k]
            ) {
              mismatch = true;
              break;
            }
          if (mismatch) {
            fail(`Mapped source ${semantic} differs at vertex ${i}`);
            break;
          }
        }
      }
      const triangleMap = metadata.triangleMap;
      const index = primitive.getIndices()?.getArray();
      if (primitive.getMode() !== 4 || !index || index.length % 3)
        throw Error("Output must have indexed triangle geometry");
      if (
        !triangleMap ||
        !Number.isInteger(triangleMap.offsetBytes) ||
        triangleMap.offsetBytes < 0 ||
        triangleMap.offsetBytes % 4 ||
        triangleMap.count !== index.length / 3
      )
        throw Error("Missing/invalid oriented triangleMap coverage");
      const { bytes } = await this.readFile(
        triangleMap.file,
        triangleMap.sha256,
        true,
      );
      if (
        bytes.length % 4 ||
        triangleMap.offsetBytes + triangleMap.count * 4 > bytes.length
      )
        throw Error("Triangle map range exceeds sidecar");
      const sourceIndices = source.primitive.getIndices().getArray();
      const triangleIds = new Uint32Array(triangleMap.count);
      for (let i = 0; i < triangleIds.length; i++) {
        const id = bytes.readUInt32LE(triangleMap.offsetBytes + i * 4);
        triangleIds[i] = id;
        if (id >= source.triangleCounts.length) {
          fail(`Source triangle ID out of range at ${i}`);
          continue;
        }
        for (let k = 0; k < 3; k++)
          if (
            index[i * 3 + k] >= count ||
            vertexIds[index[i * 3 + k]] !== sourceIndices[id * 3 + k]
          ) {
            fail(`Oriented source triangle differs at ${i}`);
            break;
          }
      }
      let weldIds,
        weldProof,
        weldStatus =
          "not provided; original UV-seam copies have distinct source IDs";
      if (metadata.weldMap || primitive.getAttribute("_SOURCE_WELD")) {
        const map = metadata.weldMap;
        // A hash or reviewed boolean alone does not establish source continuity.
        if (!map?.review || !validHash(map.review.sha256)) {
          weldStatus =
            "unreviewed weld candidates; excluded from accepted identity";
          fail("Supplied weld map has no hash-bound source boundary proof");
        } else {
          const record = JSON.parse(
            (await this.readFile(map.review.file, map.review.sha256, true))
              .bytes,
          );
          if (
            record.sourceSha256 !== source.sha256 ||
            record.weldMapSha256 !== map.sha256 ||
            map.method !== "paired-opposite-source-boundary-halfedges" ||
            record.method !== map.method
          )
            throw Error(
              "Weld proof does not bind source, map hashes and boundary method",
            );
          const data = (await this.readFile(map.file, map.sha256, true)).bytes;
          if (map.count !== sourceCount || data.length !== sourceCount * 4)
            throw Error("Weld map does not cover every source vertex");
          const weldAccessor = primitive.getAttribute("_SOURCE_WELD");
          weldIds = weldAccessor?.getArray();
          if (
            weldAccessor?.getType() !== Accessor.Type.SCALAR ||
            weldAccessor.getNormalized() ||
            !(weldIds instanceof Uint32Array) ||
            weldIds.length !== count
          )
            throw Error("Invalid _SOURCE_WELD accessor");
          source.boundaryProof ??= sourceBoundaryProof(source.primitive);
          const { ids: expectedWeld, ...proof } = source.boundaryProof;
          weldProof = proof;
          for (let i = 0; i < sourceCount; i++) {
            const group = data.readUInt32LE(i * 4);
            if (group !== expectedWeld[i]) {
              fail(
                "Weld map differs from independently reconstructed source boundary at vertex " +
                  i,
              );
              break;
            }
          }
          for (let i = 0; i < count; i++)
            if (weldIds[i] !== data.readUInt32LE(vertexIds[i] * 4)) {
              fail("Mapped source weld ID differs at vertex " + i);
              break;
            }
          weldStatus =
            "hash-bound independently reconstructed opposite source boundary halfedges; garment pattern unreviewed";
        }
      }
      let seamIds, cutProof;
      if (metadata.cutPattern || primitive.getAttribute('_SOURCE_CUT_WELD')) {
        if (!metadata.cutPattern) throw Error('Source-corner cuts require a reviewed pattern declaration');
        const proof = await sourceCutProof(source,metadata,this.readFile.bind(this),
          this.cutRegistryFile ? {registryFile:this.cutRegistryFile} : {});
        const attribute = primitive.getAttribute('_SOURCE_CUT_WELD');
        seamIds = attribute?.getArray();
        if (attribute?.getType() !== Accessor.Type.SCALAR || attribute.getNormalized() ||
          !(seamIds instanceof Uint32Array) || seamIds.length !== count)
          throw Error('Invalid _SOURCE_CUT_WELD accessor');
        for (let i=0;i<index.length;i++) if (seamIds[index[i]] !== proof.corners[triangleIds[Math.floor(i/3)]*3+i%3]) {
          fail('Cut fan differs from independently reconstructed original corner at output corner '+i);break;
        }
        const {corners,...summary}=proof;cutProof=summary;
      }
      if (!errors.length) {
        source.validatedOutputPrimitives++;
        for (const id of triangleIds) source.triangleCounts[id]++;
      }
      return {
        verified: errors.length === 0,
        errors,
        source,
        vertexIds,
        weldIds,
        seamIds,
        cutProof,
        weldProof,
        weldStatus,
        triangleMap: {
          sha256: triangleMap.sha256,
          count: triangleMap.count,
          offsetBytes: triangleMap.offsetBytes,
        },
      };
    } catch (error) {
      fail(error.message);
      return { verified: false, errors };
    }
  }
  coverage() {
    const sources = [...this.sources.values()].map((source) => {
      let missing = 0,
        duplicate = 0,
        measured = 0;
      for (const count of source.triangleCounts) {
        if (!count) missing++;
        else measured++;
        if (count > 1) duplicate += count - 1;
      }
      return {
        sourceSha256: source.sha256,
        sourceNodeIndex: source.nodeIndex,
        sourcePrimitiveIndex: source.primitiveIndex,
        sourceTriangles: source.triangleCounts.length,
        measuredTriangles: measured,
        missingTriangles: missing,
        duplicatedTriangles: duplicate,
        validatedOutputPrimitives: source.validatedOutputPrimitives,
        passed:
          source.triangleCounts.length > 0 && missing === 0 && duplicate === 0,
      };
    });
    return {
      passed: sources.length > 0 && sources.every((s) => s.passed),
      sources,
    };
  }
}
