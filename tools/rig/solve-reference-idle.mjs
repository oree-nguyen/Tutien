import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Quaternion, MathUtils } from "three";
import { handOrientation } from "../../src/rig/hand-frame.js";
import { ReferencePose } from "./reference-pose.mjs";
const hero = "H01",
  doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .read(`assets/rigged/${hero}-C0-rigged.glb`),
  frames = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands,
  joints = JSON.parse(await fs.readFile("data/rig/bind-frames.json")).heroes[
    hero
  ].joints,
  limits = JSON.parse(await fs.readFile("data/rig/joint-limits.json")),
  proof = JSON.parse(
    await fs.readFile(`docs/hand-frames/${hero}-exact-grip-search.json`),
  );
if (!proof.passed)
  throw Error("No accepted local grip to solve reference idle");
const pose = new ReferencePose(doc, joints, limits),
  grip = proof.selected.candidate.result,
  right = pose.nodes.get("RightHand"),
  left = pose.nodes.get("LeftHand"),
  rightBindPosition = pose.position(right),
  rightBindQ = pose.rotation(right),
  leftBindQ = pose.rotation(left),
  desiredLeftQ = handOrientation(
    { gripAxis: frames.Left.f, n: frames.Left.n },
    [0, -1, 0],
    [-1, 0, 0],
  ).multiply(leftBindQ);
let best;
for (const yaw of [-90, -60, -30, 0, 30, 60, 90]) {
  const normal = [
      Math.sin(MathUtils.degToRad(yaw)),
      0,
      Math.cos(MathUtils.degToRad(yaw)),
    ],
    delta = handOrientation(
      { gripAxis: grip.shaftAxis, n: grip.contactNormal },
      [0, 1, 0],
      normal,
    ),
    desiredRightQ = delta.clone().multiply(rightBindQ);
  for (const x of [-0.42, -0.44, -0.46, -0.48, -0.5, -0.52, -0.54, -0.56])
    for (const z of [0.04, 0.08, 0.12, 0.16, 0.2]) {
      pose.reset();
      const shaftCenter = new Vector3(x, 1.64, z),
        wrist = shaftCenter
          .clone()
          .sub(
            new Vector3(...grip.shaftCenter)
              .sub(rightBindPosition)
              .applyQuaternion(delta),
          ),
        result = pose.solveArm("Right", wrist, desiredRightQ);
      const cost =
        (result.cost ?? 1e15) +
        Math.abs(x + 0.5) * 0.001 +
        Math.abs(z - 0.12) * 0.001;
      if (!best || cost < best.cost)
        best = {
          cost,
          result,
          shaftCenter: shaftCenter.toArray(),
          wrist: wrist.toArray(),
          desiredRightQ: desiredRightQ.toArray(),
          delta: delta.toArray(),
          normal,
        };
    }
}
pose.reset();
const resultRight = pose.solveArm(
    "Right",
    new Vector3(...best.wrist),
    new Quaternion(...best.desiredRightQ),
  ),
  resultLeft = pose.solveArm(
    "Left",
    new Vector3(0.24, 0.915, 0.04),
    desiredLeftQ,
  );
if (resultRight.passed)
  for (const [name, finger] of Object.entries(grip.fingers))
    pose.setFinger("Right", name, finger);
if (resultLeft.passed)
  for (const name of Object.keys(frames.Left.fingers))
    pose.setFinger("Left", name, {
      angles: name === "Thumb" ? [0, 15, 10] : [8, 12, 8],
    });
const violations = pose.report(),
  passed = resultRight.passed && resultLeft.passed && violations.length === 0,
  report = {
    hero,
    scope:
      "Offline upright reference pose solve; not baked entrance or runtime activation",
    passed,
    right: resultRight,
    left: resultLeft,
    shaftCenter: best.shaftCenter,
    rightWrist: best.wrist,
    handWorldDelta: best.delta,
    palmWorldNormal: best.normal,
    violations,
    rotations: Object.fromEntries(
      pose.joints.map((node) => [node.getName(), node.getRotation()]),
    ),
  };
await fs.mkdir("docs/anim-report", { recursive: true });
await fs.writeFile(
  "docs/anim-report/H01-reference-idle-solve.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log({ passed, right: resultRight, left: resultLeft, violations });
if (!passed) process.exitCode = 1;
