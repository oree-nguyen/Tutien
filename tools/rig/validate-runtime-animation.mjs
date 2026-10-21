import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { Group } from "three";
import { threeRig } from "./animation-payload.mjs";
import { decodeReportMotion } from "../../src/rig/report-motion-codec.js";
import { ReportEntrancePlayer } from "../../src/report-entrance.js";
import { manualHeroAssetUrls } from "../../src/model-asset-registry.js";
import {
  createRuntimeSurfaces,
  measureRuntimeSurface,
  SURFACE_LIMITS,
} from "./runtime-surface.mjs";
import { fingerprint } from "../../scripts/fingerprint.mjs";
import {
  GEMINI_TIMING,
  evaluateGeminiTiming,
} from "../../src/rig/gemini-timing-contract.js";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function validateRuntimeAnimation({
  output,
  diagnostic = false,
  onProgress = () => {},
} = {}) {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const report = {
    sourceHash: await fingerprint(),
    validatorSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))),
    recordedAt: new Date().toISOString(),
    scope:
      "Fresh all-primitive physical-space LBS from actual report player. Animation-mode Entrance/Hold only, not battle IK, surface grip, source fidelity or physical Android approval.",
    coverage: {
      entrance: true,
      hold: true,
      combat: false,
      framesHz: diagnostic ? [60] : [60, 120],
    },
    diagnosticOnly: diagnostic,
    thresholds: SURFACE_LIMITS,
    passed: false,
    heroes: {},
  };
  for (const hero of ["H01", "H02"]) {
    const key = hero === "H01" ? "high" : "h02-body-high",
      runtimeFile = "public" + manualHeroAssetUrls[key].split("?")[0],
      file = process.env["ANIMATION_BODY_" + hero] ?? runtimeFile,
      motionFile =
        process.env["ANIMATION_MOTION_" + hero] ??
        `public/animations/report-entrances/${hero}.bin`,
      bytes = await fs.readFile(file),
      motion = await fs.readFile(motionFile),
      doc = await io.readBinary(bytes),
      rig = threeRig(doc),
      data = decodeReportMotion(
        motion.buffer.slice(
          motion.byteOffset,
          motion.byteOffset + motion.byteLength,
        ),
      );
    const surfaces = createRuntimeSurfaces(doc, rig.root),
      player = new ReportEntrancePlayer(hero, rig.root, data),
      weapon = new Group();
    const result = {
      file,
      motionFile,
      runtimeFile,
      staging:
        file !== runtimeFile || !!process.env["ANIMATION_MOTION_" + hero],
      bodySha256: hash(bytes),
      motionSha256: hash(motion),
      primitives: surfaces.map((s) => ({
        node: s.name,
        nodeIndex: s.nodeIndex,
        primitiveIndex: s.primitiveIndex,
        vertices: s.count,
        triangles: s.index.length / 3,
        edges: s.edges.length,
      })),
      timingSamples: {},
      sampleRates: [],
      frames: [],
      failures: 0,
      worstP999: 0,
      worstMaximum: 0,
      passed: false,
    };
    for (const hz of diagnostic ? [60] : [60, 120]) {
      player.replay();
      let frames = 0,
        visible = 0,
        failures = 0;
      for (let frame = 0; frame <= 7 * hz; frame++) {
        const t = frame / hz,
          state = player.sample(t, weapon);
        rig.root.updateWorldMatrix(true, true);
        frames++;
        if (
          hz === 60 &&
          ([0, 45, 46].includes(frame) ||
            GEMINI_TIMING[hero].pelvis.some((k) => k.frame === frame))
        ) {
          const hips = rig.root.getObjectByName("Hips");
          result.timingSamples[frame] = {
            hips: hips.getWorldPosition(weapon.position.clone()).toArray(),
            visible: state.heroVisible,
          };
        }
        if (!state.heroVisible) continue;
        visible++;
        const measurements = surfaces.map((s) => measureRuntimeSurface(s)),
          passed = measurements.every((m) => m.passed);
        if (!passed) {
          failures++;
          result.failures++;
        }
        for (const m of measurements) {
          result.worstP999 = Math.max(result.worstP999, m.p999);
          result.worstMaximum = Math.max(result.worstMaximum, m.maximum);
        }
        result.frames.push({
          hz,
          frame,
          time: t,
          passed,
          meshes: measurements,
        });
        if (frame % (hz * 2) === 0)
          onProgress({ hero, hz, frame, total: 7 * hz, failures });
      }
      result.sampleRates.push({ hz, frames, visible, failures });
    }
    result.timing = evaluateGeminiTiming(hero, result.timingSamples);
    player.dispose();
    result.passed =
      !diagnostic &&
      result.failures === 0 &&
      result.sampleRates.every((s) => s.visible > 0);
    report.heroes[hero] = result;
  }
  report.passed =
    !diagnostic && Object.values(report.heroes).every((h) => h.passed);
  if (output)
    await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output =
    process.env.ANIMATION_SURFACE_REPORT ??
    "docs/anim-report/conver10-approved-repair-2026-10-21/runtime-surface.json";
  const report = await validateRuntimeAnimation({
    output,
    diagnostic: process.argv.includes("--diagnostic"),
    onProgress: console.log,
  });
  for (const [hero, r] of Object.entries(report.heroes))
    console.log(
      hero,
      r.passed ? "PASS" : "FAIL",
      "p999",
      r.worstP999,
      "maximum",
      r.worstMaximum,
    );
  process.exitCode = report.passed ? 0 : 1;
}
