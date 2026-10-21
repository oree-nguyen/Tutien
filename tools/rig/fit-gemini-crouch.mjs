import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Quaternion, Vector3 } from "three";
import { ReferencePose } from "./reference-pose.mjs";
import { solveOfflineChain } from "./offline-entrance-ik.mjs";
import { handOrientation } from "../../src/rig/hand-frame.js";
import {
  sourceBindCalibration,
  calibratedRotation,
} from "./source-bind-calibration.mjs";
const hero = process.env.HERO ?? "H01",
  input =
    process.env.GEMINI_RIG ??
    `.local/rig-candidates/approved-source-bind-${hero.toLowerCase()}-v3/${hero}-C0-rigged.glb`,
  output =
    process.env.GEMINI_POSE_REPORT ??
    `docs/anim-report/conver10-approved-repair-2026-10-21/${hero}-crouch-fit.json`,
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  bytes = await fs.readFile(input),
  doc = await io.readBinary(bytes),
  hands = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands,
  frames = sourceBindCalibration(doc, hands),
  limits = {
    ...JSON.parse(await fs.readFile("data/rig/joint-limits.json")),
    pronation: { flex: [0, 0], lateral: [0, 0], twist: [-80, 80] },
  },
  pose = new ReferencePose(doc, frames, limits),
  h01 = hero === "H01";
const hips = pose.nodes.get("Hips");
hips.setTranslation(h01 ? [0, 0.52, -0.04] : [-0.04, 0.54, -0.04]);
const torsoPitch = Number(process.env.GEMINI_TORSO_PITCH ?? (h01 ? 28 : 90)),
  pelvisPitch = Number(process.env.GEMINI_PELVIS_PITCH ?? (h01 ? 28 : 25));
const pelvisLateral = Number(process.env.GEMINI_PELVIS_LATERAL ?? 0),
  spineFlex =
    process.env.GEMINI_SPINE_FLEX?.split(",").map(Number) ??
    (h01 ? Array(3).fill((torsoPitch - pelvisPitch) / 3) : [25, 25, 15]);
if (spineFlex.length !== 3 || !spineFlex.every(Number.isFinite))
  throw Error("Three finite spine angles required");
hips.setRotation(
  calibratedRotation(frames.Hips, {
    flex: pelvisPitch,
    lateral: pelvisLateral,
  }).toArray(),
);
const extra = (torsoPitch - pelvisPitch) / 3;
for (const [i, name] of ["Spine", "Spine1", "Spine2"].entries())
  pose.nodes.get(name).setRotation(
    calibratedRotation(frames[name], {
      flex: spineFlex[i],
    }).toArray(),
  );
pose.nodes.get("Neck").setRotation(
  calibratedRotation(frames.Neck, {
    flex: Number(
      process.env.GEMINI_NECK_FLEX ??
        (h01 ? -Math.min(50, torsoPitch - 8) : -50),
    ),
    lateral: -pelvisLateral,
  }).toArray(),
);
if (!h01 || torsoPitch > 58)
  pose.nodes.get("Head").setRotation(
    calibratedRotation(frames.Head, {
      flex: Number(
        process.env.GEMINI_HEAD_FLEX ?? (h01 ? -(torsoPitch - 58) : -30),
      ),
    }).toArray(),
  );
pose.nodes
  .get("RightShoulder")
  .setRotation(
    calibratedRotation(frames.RightShoulder, { flex: h01 ? 5 : 25 }).toArray(),
  );
const fits = [];
let gripSolution = null;
for (const side of ["Right", "Left"]) {
  const sign = side === "Right" ? -1 : 1,
    foot = h01
      ? side === "Right"
        ? [-0.05, 0.14, -0.04]
        : [0.16, 0.08, 0.35]
      : side === "Right"
        ? [-0.08, 0.15, -0.12]
        : [0.08, 0.085, 0.3],
    pole = h01
      ? side === "Right"
        ? [-0.26, 0.3, 0.24]
        : [0.24, 0.62, 0.22]
      : side === "Right"
        ? [-0.34, 0.42, 0.22]
        : [0.24, 0.45, 0.2];
  fits.push({
    chain: side + "Foot",
    ...solveOfflineChain(pose, [side + "UpLeg", side + "Leg", side + "Foot"], {
      target: new Vector3(...foot),
      orientation: new Quaternion(
        ...frames[side + "Foot"].worldRotation,
      ).multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(1, 0, 0),
          side === "Right" ? ((h01 ? 45 : 50) * Math.PI) / 180 : 0,
        ),
      ),
      pole: new Vector3(...pole),
      boundedFit: true,
    }),
  });
}
for (const side of ["Right", "Left"]) {
  const hand = hands[side];
  if (!h01 && side === "Left") {
    const names = [
        side + "Arm",
        side + "ForeArm",
        side + "Hand",
        side + "ForearmPronation",
      ],
      start = names.map((n) => pose.nodes.get(n).getRotation()),
      shaftAxis = new Vector3(
        -Math.sin((20 * Math.PI) / 180),
        Math.cos((20 * Math.PI) / 180),
        0,
      ),
      weapon = JSON.parse(await fs.readFile("data/weapons/H02.json")),
      weaponBytes = await fs.readFile(weapon.source);
    if (
      createHash("sha256").update(weaponBytes).digest("hex") !==
      weapon.sourceSha256
    )
      throw Error("Stale source hammer");
    const weaponDoc = await io.readBinary(weaponBytes),
      surface = weaponDoc
        .getRoot()
        .listMeshes()[0]
        .listPrimitives()[0]
        .getAttribute("POSITION")
        .getArray(),
      scale = 1.75 / weapon.length,
      weaponRotation = new Quaternion().setFromAxisAngle(
        new Vector3(0, 0, 1),
        Math.PI + (20 * Math.PI) / 180,
      ),
      point = new Vector3();
    let minimumY = Infinity,
      contactVertex = -1;
    for (let i = 0; i < surface.length; i += 3) {
      point
        .fromArray(surface, i)
        .multiplyScalar(scale)
        .applyQuaternion(weaponRotation);
      if (point.y < minimumY) {
        minimumY = point.y;
        contactVertex = i / 3;
      }
    }
    const headPoint = new Vector3(
        weapon.gripPivot[0],
        (weapon.headEnd + weapon.topEnd) / 2,
        weapon.gripPivot[2],
      )
        .multiplyScalar(scale)
        .applyQuaternion(weaponRotation),
      weaponPosition = new Vector3(
        0.34 - headPoint.x,
        -minimumY,
        Number(process.env.GEMINI_H02_GRIP_Z ?? 0.5),
      ),
      candidates = [];
    for (
      let y = weapon.gripSegment[0] + 0.05;
      y < weapon.gripSegment[1] - 0.05;
      y += 0.05
    ) {
      const center = new Vector3(weapon.gripPivot[0], y, weapon.gripPivot[2])
        .multiplyScalar(scale)
        .applyQuaternion(weaponRotation)
        .add(weaponPosition);
      if (center.y < 0.75 || center.y > 1.2) continue;
      let xmin = Infinity,
        xmax = -Infinity,
        zmin = Infinity,
        zmax = -Infinity,
        count = 0;
      for (let i = 0; i < surface.length; i += 3)
        if (Math.abs(surface[i + 1] - y) < 0.008) {
          xmin = Math.min(xmin, surface[i]);
          xmax = Math.max(xmax, surface[i]);
          zmin = Math.min(zmin, surface[i + 2]);
          zmax = Math.max(zmax, surface[i + 2]);
          count++;
        }
      if (count < 10) continue;
      const radius = Math.max(xmax - xmin, zmax - zmin) * 0.5 * scale;
      if (radius > 0.045) continue;
      candidates.push({ y, center, radius, sectionVertices: count });
    }
    const attempts = [];
    let best;
    for (const candidate of candidates) {
      const { center, radius } = candidate;
      for (const sign of [1, -1])
        for (let angle = 0; angle < 360; angle += 45) {
          names.forEach((n, i) => pose.nodes.get(n).setRotation(start[i]));
          const axis = shaftAxis.clone().multiplyScalar(sign),
            normal = new Vector3(0, 0, 1).applyAxisAngle(
              axis,
              (angle * Math.PI) / 180,
            ),
            rotation = handOrientation(
              { gripAxis: hand.gripAxis, n: hand.n },
              axis.toArray(),
              normal.toArray(),
            ),
            palmOffset = new Vector3(...hand.palmCenter)
              .sub(new Vector3(...hand.wrist))
              .applyQuaternion(rotation),
            target = center
              .clone()
              .addScaledVector(normal, -radius)
              .sub(palmOffset),
            orientation = rotation
              .clone()
              .multiply(new Quaternion(...frames[side + "Hand"].worldRotation)),
            fit = solveOfflineChain(
              pose,
              [side + "Arm", side + "ForeArm", side + "Hand"],
              {
                target,
                orientation,
                pole: new Vector3(0.5, 0.9, 0.3),
                pronationNode: side + "ForearmPronation",
                boundedFit: true,
              },
            ),
            score =
              fit.positionError * 1000 +
              fit.orientationErrorDegrees * 0.1 +
              Math.abs(center.y - 0.945);
          attempts.push({
            gripY: candidate.y,
            center: center.toArray(),
            sign,
            angle,
            passed: fit.passed,
            positionError: fit.positionError,
            orientationError: fit.orientationErrorDegrees,
          });
          if (
            !best ||
            (fit.passed && !best.fit.passed) ||
            (fit.passed === best.fit.passed && score < best.score)
          )
            best = {
              score,
              fit,
              rotations: names.map((n) => pose.nodes.get(n).getRotation()),
              axis: axis.toArray(),
              normal: normal.toArray(),
              target: target.toArray(),
              candidate,
            };
        }
      console.log(
        "SOURCE HAMMER GRIP",
        candidate.y,
        "worldHeight",
        candidate.center.y,
        "best",
        best.fit.positionError,
        best.fit.orientationErrorDegrees,
      );
    }
    if (!best) throw Error("No valid source hammer shaft section");
    names.forEach((n, i) => pose.nodes.get(n).setRotation(best.rotations[i]));
    fits.push({ chain: side + "Hand", ...best.fit });
    gripSolution = {
      center: best.candidate.center.toArray(),
      sourceGripY: best.candidate.y,
      shaftAxis: shaftAxis.toArray(),
      handAxis: best.axis,
      palmNormal: best.normal,
      radius: best.candidate.radius,
      wristTarget: best.target,
      weaponTransform: {
        position: weaponPosition.toArray(),
        quaternion: weaponRotation.toArray(),
        scale,
        contactVertex,
        minimumYAfterPlacement: 0,
        sourceSha256: weapon.sourceSha256,
      },
      attempts,
      scope:
        "Source palm landmark to fixed shaft surface; full weighted finger mesh contact remains unverified",
    };
    continue;
  }
  const target = h01
      ? side === "Right"
        ? [-0.16, 0.4, 0.2]
        : [0.13, 0.6, 0.22]
      : [-0.22, 0.205, 0.45],
    orientation = handOrientation(
      { gripAxis: hand.f, n: hand.n },
      [0, -1, 0],
      [0, 0, 1],
    ).multiply(new Quaternion(...frames[side + "Hand"].worldRotation));
  fits.push({
    chain: side + "Hand",
    ...solveOfflineChain(
      pose,
      [side + "Arm", side + "ForeArm", side + "Hand"],
      {
        target: new Vector3(...target),
        orientation,
        pole: new Vector3(side === "Right" ? -0.5 : 0.5, 0.7, 0.25),
        pronationNode: side + "ForearmPronation",
        boundedFit: true,
      },
    ),
  });
}
const violations = [...pose.nodes.values()].flatMap((n) =>
    pose.inspect(n).map((v) => ({ joint: n.getName(), ...v })),
  ),
  positions = Object.fromEntries(
    [...pose.nodes].map(([n, node]) => [n, pose.position(node).toArray()]),
  ),
  report = {
    hero,
    input,
    inputSha256: createHash("sha256").update(bytes).digest("hex"),
    passed: fits.every((f) => f.passed) && violations.length === 0,
    poseDataValid: true,
    activated: false,
    accepted: false,
    scope:
      "Fresh rebound source FK key-pose solve only; not skin, surface grip or full animation acceptance",
    torsoPitchRequested: torsoPitch,
    pelvisPitch,
    pelvisLateralDegrees: pelvisLateral,
    spineFlexDegrees: spineFlex,
    torsoPitchAccumulated: pelvisPitch + spineFlex.reduce((s, x) => s + x, 0),
    torsoInclinationDegrees:
      (Math.atan2(
        positions.Spine2[2] - positions.Hips[2],
        positions.Spine2[1] - positions.Hips[1],
      ) *
        180) /
      Math.PI,
    gripSolution,
    referenceDeviation: h01
      ? null
      : "H02 literal shoulder/arm lengths cannot touch floor at26degree torso pitch; this physical-contact trial records actual pelvis/spine angles separately and requires surface/visual review",
    fits,
    violations,
    positions,
    frames,
    rotations: Object.fromEntries(
      [...pose.nodes].map(([name, n]) => [name, n.getRotation()]),
    ),
    translations: { Hips: hips.getTranslation() },
  };
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(hero, {
  passed: report.passed,
  fits: fits.map((f) => ({
    chain: f.chain,
    passed: f.passed,
    positionError: f.positionError,
    orientationError: f.orientationErrorDegrees,
  })),
  violations: violations.length,
});
process.exitCode = report.passed ? 0 : 1;
