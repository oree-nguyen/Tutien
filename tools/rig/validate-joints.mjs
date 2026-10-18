import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Quaternion } from "three";
import { inspectJoint } from "../../src/rig/joint-limits.js";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const limits = JSON.parse(await fs.readFile("data/rig/joint-limits.json"));
const frames = JSON.parse(
  await fs.readFile("data/rig/bind-frames.json"),
).heroes;
const reports = [];
for (const hero of ["H01", "H02"]) {
  const doc = await io.read(`assets/rigged/${hero}-C0-rigged.glb`);
  const clips = [];
  for (const clip of doc.getRoot().listAnimations()) {
    const entries = new Map();
    let violations = 0;
    for (const channel of clip.listChannels()) {
      if (channel.getTargetPath() !== "rotation") continue;
      const name = channel.getTargetNode().getName(),
        frame = frames[hero].joints[name];
      if (!frame) throw Error("Missing calibrated joint frame: " + name);
      const sampler = channel.getSampler(),
        times = sampler.getInput().getArray(),
        values = sampler.getOutput().getArray();
      const bind = new Quaternion(...frame.bindRotation),
        canonical = new Quaternion(...frame.canonicalLocal),
        a = new Quaternion(),
        b = new Quaternion();
      let segment = 0;
      for (let f = 0; f <= Math.ceil(times.at(-1) * 60); f++) {
        const time = Math.min(f / 60, times.at(-1));
        while (segment < times.length - 2 && times[segment + 1] < time)
          segment++;
        a.fromArray(values, segment * 4);
        b.fromArray(values, Math.min(segment + 1, times.length - 1) * 4);
        a.slerp(
          b,
          Math.max(
            0,
            Math.min(
              1,
              (time - times[segment]) /
                Math.max(
                  1e-9,
                  times[Math.min(segment + 1, times.length - 1)] -
                    times[segment],
                ),
            ),
          ),
        );
        for (const violation of inspectJoint(
          a,
          bind,
          canonical,
          limits[frame.type],
          {
            finger: frame.type.startsWith("finger"),
            tolerance: limits.tolerance,
            lateralSign: frame.lateralSign,
            twistSign: frame.twistSign,
          },
        )) {
          violations++;
          const key = name + ":" + violation.axis;
          const entry = entries.get(key) ?? {
            joint: name,
            axis: violation.axis,
            code: violation.code,
            allowed: [violation.min, violation.max],
            observed: [Infinity, -Infinity],
            violatingSamples: 0,
            firstTime: time,
          };
          entry.observed[0] = Math.min(entry.observed[0], violation.value);
          entry.observed[1] = Math.max(entry.observed[1], violation.value);
          entry.violatingSamples++;
          entries.set(key, entry);
        }
      }
    }
    clips.push({
      name: clip.getName(),
      passed: violations === 0,
      violatingJointSamples: violations,
      violations: [...entries.values()],
    });
  }
  reports.push({
    hero,
    rigSha256: createHash("sha256")
      .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
      .digest("hex"),
    passed: clips.every((c) => c.passed),
    clips,
  });
  console.log(
    hero,
    clips.map((c) => `${c.name}: ${c.violatingJointSamples}`).join(", "),
  );
}
await fs.writeFile(
  "docs/rig-audit/legacy-joint-limits.json",
  JSON.stringify(
    {
      passed: reports.every((r) => r.passed),
      scope:
        "Legacy clips retargeted onto the calibrated full-resolution rig; this is a blocker report, not entrance acceptance",
      sampleRateHz: 60,
      toleranceDegrees: limits.tolerance,
      reports,
    },
    null,
    2,
  ) + "\n",
);
if (reports.some((r) => !r.passed)) process.exitCode = 1;
