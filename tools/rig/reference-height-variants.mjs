import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3 } from "three";
import { ReferencePose } from "./reference-pose.mjs";

const base = JSON.parse(
  await fs.readFile("docs/anim-report/H01-reference-idle-solve.json"),
);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(`${process.env.RIG_INPUT_DIR ?? "assets/rigged"}/H01-C0-rigged.glb`);
const frames = JSON.parse(await fs.readFile("data/rig/bind-frames.json")).heroes
  .H01.joints;
const limits = JSON.parse(await fs.readFile("data/rig/joint-limits.json"));
const pose = new ReferencePose(doc, frames, limits);
const output = ".local/rig-candidates/reference/heights";
await fs.mkdir(output, { recursive: true });
const heights = process.env.REFERENCE_HEIGHT_MM
  ? process.env.REFERENCE_HEIGHT_MM.split(",").map(Number)
  : [-40, -20, -10, 10, 20, 40];
if (
  !heights.length ||
  heights.some((value) => !Number.isInteger(value) || Math.abs(value) > 100)
)
  throw Error("Invalid diagnostic wrist heights");
for (const millimeters of heights) {
  pose.reset();
  for (const [name, q] of Object.entries(base.rotations))
    pose.nodes.get(name).setRotation(q);
  const wrist = new Vector3(...base.rightWrist).add(
    new Vector3(0, millimeters / 1000, 0),
  );
  const solved = pose.solveArm(
    "Right",
    wrist,
    pose.rotation(pose.nodes.get("RightHand")),
  );
  const violations = pose.report();
  const report = {
    ...base,
    passed: solved.passed && violations.length === 0,
    right: solved,
    rightWrist: wrist.toArray(),
    handHeightOffsetMeters: millimeters / 1000,
    violations,
    rotations: Object.fromEntries(
      pose.joints.map((node) => [node.getName(), node.getRotation()]),
    ),
  };
  await fs.writeFile(
    `${output}/${millimeters}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(millimeters, report.passed);
}
