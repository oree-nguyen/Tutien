import fs from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Vector3 } from "three";
import { createHash } from "node:crypto";
import { handStrain } from "./hand-strain.mjs";
import { SeamAccumulator } from "./mesh-seams.mjs";
import { SourceProvenanceValidator } from "./source-provenance.mjs";

const input =
  process.env.RIG_FILE ?? "assets/rigged/H01-C0-robe-panels-diagnostic.glb";
const bytes = await fs.readFile(input);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .readBinary(bytes);
const nodes = doc.getRoot().listNodes();
const errors = [];
let poseSha256 = null;
let poseValidation = null;
const appliedPoseChannels = { rotations: 0, translations: 0 };
if (process.env.REFERENCE_POSE) {
  const poseBytes = await fs.readFile(process.env.REFERENCE_POSE);
  poseSha256 = createHash("sha256").update(poseBytes).digest("hex");
  const pose = JSON.parse(poseBytes);
  const poseErrors = [];
  const pendingRotations = [],
    pendingTranslations = [];
  const upstreamPassed = pose.passed === true;
  const diagnosticOnly = !upstreamPassed && pose.poseDataValid === true;
  if (!upstreamPassed)
    errors.push("Reference pose upstream acceptance failed");
  if (!upstreamPassed && !diagnosticOnly)
    poseErrors.push(
      "Reference pose is not validated and has no explicit poseDataValid diagnostic declaration",
    );
  if (
    !pose.rotations ||
    typeof pose.rotations !== "object" ||
    Array.isArray(pose.rotations) ||
    !Object.keys(pose.rotations).length
  )
    poseErrors.push("Reference pose has no valid rotations map");
  else
    for (const [name, rotation] of Object.entries(pose.rotations)) {
      const matches = nodes.filter((node) => node.getName() === name);
      if (
        matches.length !== 1 ||
        !Array.isArray(rotation) ||
        rotation.length !== 4 ||
        !rotation.every(Number.isFinite) ||
        Math.abs(Math.hypot(...rotation) - 1) > 1e-5
      )
        poseErrors.push(
          "Missing, ambiguous, nonfinite or unnormalized pose target: " + name,
        );
      else {
        pendingRotations.push([matches[0], rotation]);
      }
    }
  if (pose.scales !== undefined)
    poseErrors.push("Scale pose channels are not supported");
  if (pose.translations !== undefined) {
    if (
      !pose.translations ||
      typeof pose.translations !== "object" ||
      Array.isArray(pose.translations)
    )
      poseErrors.push("Invalid pose translations map");
    else
      for (const [name, translation] of Object.entries(pose.translations)) {
        const matches = nodes.filter((node) => node.getName() === name);
        const isJoint =
          matches.length === 1 &&
          doc
            .getRoot()
            .listSkins()
            .some((skin) => skin.listJoints().includes(matches[0]));
        if (
          name !== "Hips" ||
          !isJoint ||
          !Array.isArray(translation) ||
          translation.length !== 3 ||
          !translation.every(Number.isFinite)
        )
          poseErrors.push(
            "Missing, ambiguous, unsupported or nonfinite translation target (only Hips joint local translation is supported): " +
              name,
          );
        else {
          pendingTranslations.push([matches[0], translation]);
        }
      }
  }
  // A failed upstream solve may still be inspected with an explicit diagnostic
  // declaration. Validate every channel before applying any, and retain the
  // upstream rejection independently of the resulting mesh measurements.
  if (!poseErrors.length) {
    for (const [node, rotation] of pendingRotations) node.setRotation(rotation);
    for (const [node, translation] of pendingTranslations)
      node.setTranslation(translation);
    appliedPoseChannels.rotations = pendingRotations.length;
    appliedPoseChannels.translations = pendingTranslations.length;
  }
  errors.push(...poseErrors);
  poseValidation = {
    upstreamPassed,
    poseDataValid: poseErrors.length === 0,
    diagnosticOnly,
    upstreamReasons: Object.fromEntries(
      ["reason", "reasons", "errors", "violations", "scope"]
        .filter((key) => pose[key] !== undefined)
        .map((key) => [key, pose[key]]),
    ),
  };
}
const provenance = new SourceProvenanceValidator(input);
const exactSeams = new SeamAccumulator(),
  inferredSeams = new SeamAccumulator();
const meshes = [];
let referencedVertices = 0,
  verifiedVertices = 0,
  mechanicallyVerifiedWeldPrimitives = 0;
for (const [nodeIndex, node] of nodes.entries()) {
  if (!node.getMesh()) continue;
  const skin = node.getSkin();
  const joints = skin?.listJoints(),
    inverseBind = skin?.getInverseBindMatrices();
  const matrices =
    joints && inverseBind && inverseBind.getCount() === joints.length
      ? joints.map((joint, i) =>
          new Matrix4()
            .fromArray(joint.getWorldMatrix())
            .multiply(new Matrix4().fromArray(inverseBind.getElement(i, []))),
        )
      : null;
  for (const [primitiveIndex, primitive] of node
    .getMesh()
    .listPrimitives()
    .entries()) {
    const identity = {
      nodeIndex,
      meshIndex: doc.getRoot().listMeshes().indexOf(node.getMesh()),
      primitiveIndex,
      node: node.getName(),
      mesh: node.getMesh().getName(),
    };
    const source = primitive.getAttribute("POSITION")?.getArray();
    const count = source?.length / 3;
    const jointAttribute = primitive.getAttribute("JOINTS_0"),
      weightAttribute = primitive.getAttribute("WEIGHTS_0");
    const ids = jointAttribute?.getArray();
    const skinErrors = [];
    const skinError = (message) => {
      if (skinErrors.length < 20) skinErrors.push(message);
    };
    if(primitive.listTargets().length)
      skinError('Morph targets require an explicit posed-morph validator; base skin alone cannot certify them');
    const posed = new Float64Array(source?.length ?? 0).fill(NaN);
    if (
      !Number.isInteger(count) ||
      !count ||
      primitive.getMode() !== 4 ||
      primitive.getAttribute("POSITION").getType() !== "VEC3" ||
      primitive.getAttribute("POSITION").getNormalized() ||
      !(source instanceof Float32Array)
    )
      skinError("Missing/unsupported triangle POSITION");
    else if (
      !matrices ||
      matrices.some((m) => !m.elements.every(Number.isFinite))
    )
      skinError(
        "Missing skin, inverse bind matrices, or nonfinite joint transform",
      );
    else if (
      jointAttribute?.getElementSize() !== 4 ||
      weightAttribute?.getElementSize() !== 4 ||
      jointAttribute.getNormalized() ||
      !(ids instanceof Uint8Array || ids instanceof Uint16Array) ||
      primitive.getAttribute("JOINTS_1") ||
      primitive.getAttribute("WEIGHTS_1") ||
      ids.length !== count * 4 ||
      weightAttribute.getCount() !== count
    )
      skinError("Invalid four-influence JOINTS_0/WEIGHTS_0 layout");
    else {
      const value = new Vector3(),
        transformed = new Vector3(),
        weights = [];
      for (let i = 0; i < count; i++) {
        weightAttribute.getElement(i, weights);
        if (
          weights.some((w) => !Number.isFinite(w) || w < 0 || w > 1) ||
          Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-3 ||
          [0, 1, 2, 3].some(
            (k) =>
              !Number.isInteger(ids[i * 4 + k]) ||
              ids[i * 4 + k] < 0 ||
              ids[i * 4 + k] >= matrices.length,
          )
        ) {
          skinError("Invalid skin influences at vertex " + i);
          continue;
        }
        value.set(0, 0, 0);
        for (let k = 0; k < 4; k++)
          if (weights[k]) {
            transformed
              .fromArray(source, i * 3)
              .applyMatrix4(matrices[ids[i * 4 + k]]);
            value.addScaledVector(transformed, weights[k]);
          }
        value.toArray(posed, i * 3);
      }
    }
    const mapped = await provenance.validate(primitive);
    const indices = primitive.getIndices()?.getArray();
    const used = new Uint8Array(Number.isInteger(count) ? count : 0);
    for (const i of indices ?? []) if (i < used.length) used[i] = 1;
    for (let i = 0; i < used.length; i++) {
      if (!used[i]) continue;
      referencedVertices++;
      const record = {
        identity: { ...identity, vertexIndex: i },
        bind: [...source.subarray(i * 3, i * 3 + 3)],
        position: [...posed.subarray(i * 3, i * 3 + 3)],
      };
      inferredSeams.add(record.bind.join(","), record);
      if (mapped.verified) {
        verifiedVertices++;
        record.sourceVertexId = mapped.vertexIds[i];
        const sourceId = mapped.weldIds
          ? mapped.weldIds[i]
          : mapped.vertexIds[i];
        exactSeams.add(mapped.source.namespace + ":" + sourceId, record);
      }
    }
    if (mapped.verified && mapped.weldIds) mechanicallyVerifiedWeldPrimitives++;
    const strain = handStrain({
      primitive,
      mask: new Uint8Array(Number.isInteger(count) ? count : 0).fill(1),
      position: (i) => new Vector3().fromArray(posed, i * 3),
    });
    meshes.push({
      ...identity,
      vertices: count ?? 0,
      sourceTriangles: (indices?.length ?? 0) / 3,
      ...strain,
      passed: strain.passed && skinErrors.length === 0,
      skinErrors,
      sourceProvenance: {
        verified: mapped.verified,
        errors: mapped.errors,
        sourceSha256: mapped.source?.sha256,
        sourceNodeIndex: mapped.source?.nodeIndex,
        sourcePrimitiveIndex: mapped.source?.primitiveIndex,
        triangleMap: mapped.triangleMap,
        weldStatus: mapped.weldStatus,
        weldProof: mapped.weldProof,
      },
    });
  }
}
const exact = exactSeams.measure(),
  inferred = inferredSeams.measure();
const sourceCoverage = provenance.coverage();
const provenancePassed =
  meshes.length > 0 &&
  meshes.every((m) => m.sourceProvenance.verified) &&
  sourceCoverage.passed;
const edgeStrainPassed = meshes.length > 0 && meshes.every((m) => m.passed);
const seamsPassed =
  provenancePassed &&
  exact.pairs > 0 &&
  exact.invalidPositions === 0 &&
  exact.maximumMillimetres <= 0.001;
const report = {
  input,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  pose: process.env.REFERENCE_POSE || "bind",
  poseSha256,
  poseValidation,
  appliedPoseChannels,
  passed: errors.length === 0 && edgeStrainPassed && seamsPassed,
  edgeStrainPassed,
  provenancePassed,
  errors,
  scope:
    "Every node/primitive at one pose; unchanged p99.9 1.5 / maximum 2.0 edge-stretch limits, fail-closed newly collapsed/nonfinite checks and provenance-bound source-copy seams. Existing source degeneracy is diagnostic. Not full-animation, volume, cross-section, semantic segmentation or phone acceptance.",
  meshes,
  sourceCoverage,
  seams: {
    passed: seamsPassed,
    status: !provenancePassed
      ? "unverified-source-provenance-or-coverage"
      : exact.pairs === 0
        ? "unmeasured-no-source-copy-pairs"
        : seamsPassed
          ? "measured-within-tolerance"
          : "failed",
    identityMode: mechanicallyVerifiedWeldPrimitives
      ? "source IDs plus hash-bound independently reconstructed opposite source boundary halfedges"
      : "verified exact source vertex IDs only; distinct original UV-seam IDs are not certified",
    numericalToleranceMillimetres: 0.001,
    referencedVertices,
    verifiedVertices,
    mechanicallyVerifiedWeldPrimitives,
    ...exact,
    inferredXYZDiagnostic: {
      acceptedAsSourceIdentity: false,
      scope:
        "Coincident bind XYZ only; may join unrelated/free surfaces and cannot certify source identity.",
      ...inferred,
    },
  },
};
const output =
  process.env.RIG_REPORT_FILE ??
  "docs/anim-report/robe-panels/all-mesh-strain.json";
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      poseValidation,
      appliedPoseChannels,
      errors,
      edgeStrainPassed,
      provenancePassed,
      meshes: meshes.map((m) => ({
        nodeIndex: m.nodeIndex,
        primitiveIndex: m.primitiveIndex,
        node: m.node,
        p999: m.p999,
        maximum: m.maximum,
        passed: m.passed,
        issueCounts: m.issueCounts,
        skinErrors: m.skinErrors,
        provenanceErrors: m.sourceProvenance.errors,
      })),
      sourceCoverage,
      seams: report.seams,
    },
    null,
    2,
  ),
);
if (!report.passed) process.exitCode = 1;
