/** Retarget motion only to the already shipped rigs. Rejected staging skin weights
 * are never imported. Original GLBs, materials and all old clips stay untouched. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import {
  AnimationMixer,
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  Quaternion,
  Vector3,
  MathUtils,
} from "three";
import { solveOfflineChain } from "./offline-entrance-ik.mjs";
import { handOrientation } from "../../src/rig/hand-frame.js";
import { ReferencePose } from "./reference-pose.mjs";
import { threeRig, sha256 } from "./animation-payload.mjs";
import {
  encodeReportMotion,
  decodeReportMotion,
} from "../../src/rig/report-motion-codec.js";
import { HeroPoseController } from "../../src/rig/hero-pose-controller.js";
const read = async (f) => JSON.parse(await fs.readFile(f));
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const configurations = {
  H01: {
    input: "assets/rigged/H01-C0-rigged.glb",
    motion: "data/hero-entrance/gemini-input/H01.bin",
    frames:
      "docs/anim-report/conver10-redo/animation/h01-keys-v6/H01-frames.json",
    donor: "public/models/h01-c0/h01-c0-high.glb",
    map: [
      [0, 0],
      [0.75, 0.9],
      [1, 1.9],
      [1.6, 2.6],
      [2.416666667, 4.1],
      [3, 4.1],
    ],
    grip: 2.2,
  },
  H02: {
    input: "assets/rigged/H02-C0-rigged.glb",
    motion: "data/hero-entrance/gemini-input/H02.bin",
    frames:
      "docs/anim-report/conver10-redo/animation/joint-rise-v8/H02-frames.json",
    donor: "public/models/h02-body/h02-body-high.glb",
    map: [
      [0, 0],
      [0.3, 0.55],
      [0.766666667, 0.55],
      [1, 1.25],
      [1.6, 1.75],
      [2.416666667, 3.5],
      [3, 3.5],
    ],
    grip: 1.6,
  },
};
function remap(t, map) {
  for (let i = 1; i < map.length; i++)
    if (t <= map[i][0]) {
      const [a, b] = [map[i - 1], map[i]];
      return MathUtils.lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]));
    }
  return map.at(-1)[1];
}
const smooth = (a, b, t) => {
  const x = MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const output = {
  version: 1,
  scope:
    "Motion retarget on shipped legacy rigs; source-resolution skin replacement remains blocked",
  sampleRate: 60,
  duration: 3,
  idleDuration: 4,
  heroes: {},
};
const receipts = [];
for (const [hero, cfg] of Object.entries(configurations)) {
  const sourceBytes = await fs.readFile(cfg.input),
    source = await io.readBinary(sourceBytes),
    frames = await read(cfg.frames),
    donorBytes = await fs.readFile(cfg.donor),
    donor = await io.readBinary(donorBytes);
  const motionBytes = await fs.readFile(cfg.motion),
    inputMotion = decodeReportMotion(
      motionBytes.buffer.slice(
        motionBytes.byteOffset,
        motionBytes.byteOffset + motionBytes.byteLength,
      ),
    );
  assert.equal(
    inputMotion.sourceSha256,
    frames.outputSha256,
    "Stale source pose sidecar",
  );
  assert.equal(
    inputMotion.framesSha256,
    sha256(await fs.readFile(cfg.frames)),
    "Stale source pose frames",
  );
  const canonical = threeRig(source),
    legacy = threeRig(donor),
    sourceBones = new Map(),
    legacyBones = new Map();
  canonical.root.traverse((n) => {
    if (n.isBone) sourceBones.set(n.name, n);
  });
  legacy.root.traverse((n) => {
    if (n.isBone) legacyBones.set(n.name, n);
  });
  assert.deepEqual(
    [...sourceBones.keys()].sort(),
    [...legacyBones.keys()].sort(),
  );
  canonical.root.updateMatrixWorld(true);
  legacy.root.updateMatrixWorld(true);
  canonical.clips = inputMotion.curves.map(
    (c) =>
      new AnimationClip(
        c.name,
        c.duration,
        c.tracks.map(
          (t) =>
            new (t.type === "quaternion"
              ? QuaternionKeyframeTrack
              : VectorKeyframeTrack)(t.name, t.times, t.values),
        ),
      ),
  );
  const bind = new Map(
    [...sourceBones].map(([name, node]) => [
      name,
      {
        sourceLocal: node.quaternion.clone(),
        sourceWorld: node.getWorldQuaternion(new Quaternion()),
        legacyLocal: legacyBones.get(name).quaternion.clone(),
        legacyWorld: legacyBones.get(name).getWorldQuaternion(new Quaternion()),
      },
    ]),
  );
  const mixer = new AnimationMixer(canonical.root),
    entrance = canonical.clips.find((c) => c.name === "Entrance"),
    idle = canonical.clips.find((c) => c.name === "IDLE_HOLD"),
    action = mixer.clipAction(entrance);
  action.play();
  let finalArm = null,
    finalSolve = null;
  {
    const calibrated = (await read("data/rig/bind-frames.json")).heroes[hero]
        .joints,
      limits = await read("data/rig/joint-limits.json"),
      pose = new ReferencePose(source, calibrated, limits);
    for (const track of entrance.tracks) {
      const k = track.name.lastIndexOf(".");
      sourceBones
        .get(track.name.slice(0, k))
        [
          track.name.slice(k + 1)
        ].fromArray(track.createInterpolant().evaluate(entrance.duration));
    }
    for (const [name, node] of sourceBones)
      pose.nodes.get(name).setRotation(node.quaternion.toArray());
    const side = hero === "H01" ? "Right" : "Left",
      arm = pose.position(pose.nodes.get(side + "Arm")),
      orientation = pose.rotation(pose.nodes.get(side + "Hand"));
    const reach = 0.475,
      angle = MathUtils.degToRad(35),
      target =
        hero === "H01"
          ? arm
              .clone()
              .add(
                new Vector3(
                  -Math.cos(angle) * reach,
                  Math.sin(angle) * reach,
                  0.035,
                ),
              )
          : new Vector3(0.5, 1.12, 0.16);
    finalSolve = pose.solveArm(side, target, orientation);
    if (hero === "H02" && !finalSolve.passed) {
      let best;
      for (const yaw of [0, -15, 15, -30, 30, -45, 45, -60, 60, -90, 90])
        for (const x of [0.44, 0.5, 0.56])
          for (const y of [1.12, 1.18, 1.24]) {
            const rotation = new Quaternion()
                .setFromAxisAngle(new Vector3(0, 1, 0), MathUtils.degToRad(yaw))
                .multiply(orientation),
              p = new Vector3(x, y, 0.16),
              result = pose.solveArm(side, p, rotation);
            if (result.passed) {
              const cost =
                p.distanceToSquared(target) + Math.abs(yaw) * 0.00001;
              if (!best || cost < best.cost)
                best = {
                  cost,
                  result,
                  rotations: Object.fromEntries(
                    ["Arm", "ForeArm", "Hand"].map((suffix) => [
                      side + suffix,
                      pose.nodes.get(side + suffix).getRotation(),
                    ]),
                  ),
                };
            }
          }
      if (best) {
        finalSolve = best.result;
        for (const [name, q] of Object.entries(best.rotations))
          pose.nodes.get(name).setRotation(q);
      }
    }
    assert.equal(
      finalSolve.passed,
      true,
      hero + " final grip arm solve failed",
    );
    finalArm = Object.fromEntries(
      ["Arm", "ForeArm", "Hand"].map((suffix) => [
        side + suffix,
        new Quaternion(...pose.nodes.get(side + suffix).getRotation()),
      ]),
    );
    pose.reset();
  }
  const uprightLegs = Object.fromEntries(
    [...sourceBones]
      .filter(([n]) => /(UpLeg|Leg|Foot)$/.test(n))
      .map(([n, b]) => [n, b.quaternion.clone()]),
  );
  const calibrated = (await read("data/rig/bind-frames.json")).heroes[hero]
      .joints,
    limits = await read("data/rig/joint-limits.json"),
    fitPose = new ReferencePose(source, calibrated, limits),
    handFrames = (await read("data/rig/hand-frames.json")).heroes[hero].hands;
  const crouchHip = new Vector3(
      hero === "H01" ? 0 : -0.04,
      hero === "H01" ? 0.43 : 0.4,
      -0.04,
    ),
    crouchRotations = {},
    crouchFits = [];
  const originalCrouch = hero === "H01" ? 1.9 : 1.25;
  for (const track of entrance.tracks) {
    const k = track.name.lastIndexOf("."),
      name = track.name.slice(0, k),
      property = track.name.slice(k + 1);
    sourceBones
      .get(name)
      [property].fromArray(track.createInterpolant().evaluate(originalCrouch));
  }
  for (const [name, node] of sourceBones)
    fitPose.nodes.get(name).setRotation(node.quaternion.toArray());
  fitPose.nodes.get("Hips").setTranslation(crouchHip.toArray());
  const crouchFeet = {
      Left: new Vector3(
        hero === "H01" ? 0.18 : 0.34,
        0.12,
        hero === "H01" ? 0.12 : 0.06,
      ),
      Right: new Vector3(
        hero === "H01" ? -0.18 : -0.34,
        0.12,
        hero === "H01" ? 0.12 : 0.06,
      ),
    },
    standingFeet = {};
  for (const side of ["Left", "Right"]) {
    const foot = fitPose.nodes.get(side + "Foot"),
      orientation = new Quaternion().fromArray(
        calibrated[side + "Foot"].bindRotation,
      );
    fitPose.reset();
    standingFeet[side] = fitPose.position(foot);
    const worldOrientation = fitPose.rotation(foot);
    for (const [name, node] of sourceBones)
      fitPose.nodes.get(name).setRotation(node.quaternion.toArray());
    fitPose.nodes.get("Hips").setTranslation(crouchHip.toArray());
    const result = solveOfflineChain(
      fitPose,
      [side + "UpLeg", side + "Leg", side + "Foot"],
      {
        target: crouchFeet[side],
        orientation: worldOrientation,
        pole: new Vector3(side === "Left" ? 0.45 : -0.45, 0.4, 0.6),
        boundedFit: true,
      },
    );
    if (!result.passed) console.error(JSON.stringify({ hero, side, result }));
    assert.equal(
      result.passed,
      true,
      hero + " crouch " + side + " foot fit failed",
    );
    crouchFits.push({ chain: side + "Foot", ...result });
    for (const name of [side + "UpLeg", side + "Leg", side + "Foot"])
      crouchRotations[name] = fitPose.nodes.get(name).getRotation();
  }
  for (const [name, node] of sourceBones)
    fitPose.nodes.get(name).setRotation(node.quaternion.toArray());
  for (const [name, q] of Object.entries(crouchRotations))
    fitPose.nodes.get(name).setRotation(q);
  fitPose.nodes.get("Hips").setTranslation(crouchHip.toArray());
  for (const side of ["Right", "Left"]) {
    const targets =
      side === "Right"
        ? [
            [hero === "H01" ? -0.16 : -0.22, 0.44, 0.2],
            [hero === "H01" ? -0.16 : -0.22, 0.48, 0.2],
            [hero === "H01" ? -0.16 : -0.22, 0.52, 0.2],
          ]
        : hero === "H01"
          ? [
              [0.15, 0.6, 0.22],
              [0.2, 0.65, 0.2],
            ]
          : [
              [0.35, 0.84, 0.16],
              [0.38, 0.78, 0.16],
              [0.4, 0.72, 0.16],
            ];
    const frame = handFrames[side],
      rest = bind.get(side + "Hand").sourceWorld,
      orientation =
        side === "Right"
          ? handOrientation(
              { gripAxis: frame.f, n: frame.n },
              [0, -1, 0],
              [0, 0, 1],
            ).multiply(rest)
          : fitPose.rotation(fitPose.nodes.get(side + "Hand"));
    let best;
    for (const target of targets)
      for (const yaw of [0, -30, 30, -60, 60, -90, 90]) {
        const q = new Quaternion()
            .setFromAxisAngle(new Vector3(0, 1, 0), MathUtils.degToRad(yaw))
            .multiply(orientation),
          result = fitPose.solveArm(side, new Vector3(...target), q);
        if (result.passed) {
          const cost =
            Math.abs(yaw) * 0.0001 +
            new Vector3(...target).distanceToSquared(
              new Vector3(...targets[0]),
            );
          if (!best || cost < best.cost)
            best = {
              cost,
              result,
              rotations: Object.fromEntries(
                ["Arm", "ForeArm", "Hand"].map((n) => [
                  side + n,
                  fitPose.nodes.get(side + n).getRotation(),
                ]),
              ),
            };
        }
      }
    if (!best) {
      for (const target of targets) {
        const result = solveOfflineChain(
          fitPose,
          [side + "Arm", side + "ForeArm", side + "Hand"],
          {
            target: new Vector3(...target),
            pole: new Vector3(side === "Left" ? 0.45 : -0.45, 0.65, 0.3),
            boundedFit: true,
          },
        );
        if (result.passed) {
          best = {
            cost: 0,
            result,
            rotations: Object.fromEntries(
              ["Arm", "ForeArm", "Hand"].map((n) => [
                side + n,
                fitPose.nodes.get(side + n).getRotation(),
              ]),
            ),
          };
          break;
        }
      }
    }
    assert.ok(best, hero + " crouch " + side + " arm has no bounded solution");
    Object.assign(crouchRotations, best.rotations);
    crouchFits.push({ chain: side + "Arm", ...best.result });
  }
  const weaponSpec = await read(`data/weapons/${hero}.json`);
  const frameFits = [];
  const curves = [],
    weaponKeys = [],
    names = [...sourceBones.keys()];
  for (const [clipName, duration] of [
    ["Entrance", 3],
    ["IDLE_HOLD", 4],
  ]) {
    const times = Array.from(
        { length: Math.round(duration * 60) + 1 },
        (_, i) => i / 60,
      ),
      tracks = names.map((name) => ({
        name: name + ".quaternion",
        type: "quaternion",
        times,
        values: [],
      }));
    tracks.push({ name: "Hips.position", type: "vector", times, values: [] });
    mixer.stopAllAction();
    const clip = clipName === "Entrance" ? entrance : idle,
      a = mixer.clipAction(clip);
    a.reset().play();
    const sourceFrames = frames.frames.filter((f) => f.clip === clipName);
    const weapon = [],
      previousFeet = new Map();
    for (const t of times) {
      const mapped = clipName === "Entrance" ? remap(t, cfg.map) : t;
      for (const track of clip.tracks) {
        const index = track.name.lastIndexOf("."),
          name = track.name.slice(0, index),
          property = track.name.slice(index + 1);
        sourceBones
          .get(name)
          [property].fromArray(track.createInterpolant().evaluate(mapped));
      }
      const rise = clipName === "Entrance" ? smooth(1.6, 2.416666667, t) : 1;
      for (const [name, q] of Object.entries(crouchRotations))
        sourceBones.get(name).quaternion.slerp(new Quaternion(...q), 1 - rise);
      const standingHip = new Vector3(0, hero === "H01" ? 0.85 : 0.96, 0);
      if (hero === "H01") standingHip.x = 0.45;
      const bodyHip = crouchHip.clone().lerp(standingHip, rise),
        arrival = smooth(0.766666667, 1, clipName === "Entrance" ? t : 3);
      if (clipName === "Entrance" && t < 1) {
        bodyHip.y += (hero === "H01" ? -0.5 : 1.5) * (1 - arrival);
        if (hero === "H02") bodyHip.x -= 1.1 * (1 - arrival);
      }
      sourceBones.get("Hips").position.copy(bodyHip);
      for (const [name, q] of Object.entries(finalArm))
        sourceBones.get(name).quaternion.slerp(q, rise);
      for (const [name, node] of sourceBones)
        fitPose.nodes.get(name).setRotation(node.quaternion.toArray());
      fitPose.nodes.get("Hips").setTranslation(bodyHip.toArray());
      for (const side of ["Left", "Right"]) {
        const start = side === "Right" ? 1.6 : 1.95,
          end = side === "Right" ? 2.05 : 2.416666667,
          step = clipName === "Entrance" ? smooth(start, end, t) : 1,
          target = crouchFeet[side]
            .clone()
            .lerp(
              standingFeet[side]
                .clone()
                .add(new Vector3(hero === "H01" ? 0.45 : 0, 0, 0)),
              step,
            );
        if (clipName === "Entrance" && t > start && t < end)
          target.y +=
            0.065 * Math.sin((Math.PI * (t - start)) / (end - start)) ** 2;
        if (clipName === "Entrance" && t < 1) {
          target.y += bodyHip.y - crouchHip.y;
          if (hero === "H02") target.x -= 1.1 * (1 - arrival);
        }
        const parent = fitPose.nodes.get(side + "Foot");
        fitPose.reset();
        const orientation = fitPose.rotation(parent);
        for (const [name, node] of sourceBones)
          fitPose.nodes.get(name).setRotation(node.quaternion.toArray());
        fitPose.nodes.get("Hips").setTranslation(bodyHip.toArray());
        const result = solveOfflineChain(
          fitPose,
          [side + "UpLeg", side + "Leg", side + "Foot"],
          {
            target,
            orientation,
            pole: new Vector3(
              (side === "Left" ? 0.45 : -0.45) +
                (hero === "H01" ? 0.45 * rise : 0),
              0.4,
              0.6,
            ),
            boundedFit: true,
            previousRotations: previousFeet.get(side),
            maxStepDegrees: previousFeet.has(side) ? 8 : undefined,
          },
        );
        frameFits.push({
          clip: clipName,
          time: t,
          side,
          passed: result.passed,
          positionError: result.positionError,
          orientationErrorDegrees: result.orientationErrorDegrees,
          violations: result.violations,
        });
        previousFeet.set(
          side,
          [side + "UpLeg", side + "Leg", side + "Foot"].map(
            (n) => new Quaternion(...fitPose.nodes.get(n).getRotation()),
          ),
        );
        for (const name of [side + "UpLeg", side + "Leg", side + "Foot"])
          sourceBones
            .get(name)
            .quaternion.fromArray(fitPose.nodes.get(name).getRotation());
      }
      if (clipName === "Entrance" && t > 2.416666667)
        for (const [name, q] of Object.entries(uprightLegs))
          sourceBones
            .get(name)
            .quaternion.slerp(q, smooth(2.416666667, 2.95, t));
      for (let k = 0; k < names.length; k++) {
        const name = names[k],
          b = bind.get(name),
          q = sourceBones.get(name).quaternion.clone();
        // Preserve the actual legacy bind. Finger reorientation is expressed in
        // world bind axes, rather than copying canonical finger Euler values.
        const worldDelta = b.sourceWorld
          .clone()
          .multiply(b.sourceLocal.clone().invert().multiply(q))
          .multiply(b.sourceWorld.clone().invert());
        const target = b.legacyLocal
          .clone()
          .multiply(
            b.legacyWorld
              .clone()
              .invert()
              .multiply(worldDelta)
              .multiply(b.legacyWorld),
          )
          .normalize();
        const values = tracks[k].values;
        if (values.length) {
          const previous = new Quaternion().fromArray(
              values,
              values.length - 4,
            ),
            angle = previous.angleTo(target),
            limit = MathUtils.degToRad(
              /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(name) ? 16 : 8,
            );
          if (angle > limit) target.copy(previous.slerp(target, limit / angle));
        }
        if (
          values.length &&
          target.dot(new Quaternion().fromArray(values, values.length - 4)) < 0
        )
          target.set(-target.x, -target.y, -target.z, -target.w);
        values.push(...target.toArray());
        legacyBones.get(name).quaternion.copy(target);
      }
      const hips = sourceBones.get("Hips").position;
      tracks.at(-1).values.push(...hips.toArray());
      legacyBones.get("Hips").position.copy(hips);
      legacy.root.updateMatrixWorld(true);
      const index = Math.min(mapped * 60, sourceFrames.length - 1),
        lo = Math.floor(index),
        hi = Math.min(lo + 1, sourceFrames.length - 1),
        fraction = index - lo;
      const wa = sourceFrames[lo].weapon,
        wb = sourceFrames[hi].weapon;
      const p = new Vector3(...wa.position).lerp(
          new Vector3(...wb.position),
          fraction,
        ),
        q = new Quaternion(...wa.quaternion).slerp(
          new Quaternion(...wb.quaternion),
          fraction,
        );
      {
        const side = hero === "H01" ? "Right" : "Left",
          f = frames.localPalm[side],
          hand = legacyBones.get(side + "Hand"),
          scale = hero === "H02" ? 1.75 / weaponSpec.length : 1;
        const target = hand
          .localToWorld(new Vector3(...f))
          .sub(
            new Vector3(...weaponSpec.gripPivot)
              .multiplyScalar(scale)
              .applyQuaternion(q),
          );
        p.lerp(
          target,
          smooth(
            hero === "H01" ? 1.95 : 1.6,
            hero === "H01" ? 2.2 : 2.416666667,
            clipName === "Entrance" ? t : 3,
          ),
        );
      }
      const visible =
        clipName !== "Entrance" ||
        t >= (hero === "H01" ? 0.766666667 : 0.766666667);
      weapon.push({ position: p.toArray(), quaternion: q.toArray(), visible });
    }
    curves.push({ name: clipName, duration, tracks });
    weaponKeys.push({ name: clipName, keys: weapon });
  }
  // Three's independent FK controller catches binding, finite tracks, loop and
  // Entrance->Idle discontinuities before this motion enters an APK.

  const controller = new HeroPoseController(
    legacy.root,
    curves.map((c) => AnimationClip.parse(c)),
  );
  controller.start();
  controller.update(3.3);
  assert.equal(controller.state, "IDLE_HOLD");
  controller.seek(8);
  controller.start();
  controller.dispose();
  const entry = {
    hero,
    gripHand: hero === "H01" ? "right" : "left",
    groundHand: "right",
    curves,
    weaponKeys,
    weaponScale: hero === "H02" ? 1.75 / weaponSpec.length : 1,
    events: [
      { time: 1, type: "land" },
      { time: cfg.grip, type: "grab" },
    ],
    timeline: cfg.map,
    sourceSha256: sha256(sourceBytes),
    donorSha256: sha256(donorBytes),
    gripPivot: weaponSpec.gripPivot,
    palmOffset: frames.localPalm[hero === "H01" ? "Right" : "Left"],
    weightChanges: false,
    fullResolutionSkinActivated: false,
  };
  output.heroes[hero] = entry;
  receipts.push({
    hero,
    source: cfg.input,
    sourceSha256: entry.sourceSha256,
    donor: cfg.donor,
    donorSha256: entry.donorSha256,
    sourceMotionOnly: true,
    sourceWeightBytesImported: 0,
    inputMotion: cfg.motion,
    inputMotionSha256: sha256(motionBytes),
    controllerPassed: true,
    preRetargetFootFk: {
      frames: frameFits.length,
      failed: frameFits.filter((f) => !f.passed).length,
      maximumEndpointError: Math.max(...frameFits.map((f) => f.positionError)),
      maximumOrientationError: Math.max(
        ...frameFits.map((f) => f.orientationErrorDegrees),
      ),
    },
    finalGripArmSolve: finalSolve,
    crouchFits,
    clips: curves.map((c) => ({
      name: c.name,
      duration: c.duration,
      tracks: c.tracks.length,
      samples: c.tracks[0].times.length,
    })),
    clothAcceptance: false,
  });
}
const urls = {},
  hashes = {};
await fs.mkdir("public/animations/report-entrances", { recursive: true });
for (const [hero, data] of Object.entries(output.heroes)) {
  const bytes = Buffer.from(encodeReportMotion(data)),
    sha = sha256(bytes),
    file = `public/animations/report-entrances/${hero}.bin`;
  await fs.writeFile(file, bytes);
  urls[hero] = `/animations/report-entrances/${hero}.bin?v=${sha.slice(0, 12)}`;
  hashes[hero] = sha;
  const receipt = receipts.find((r) => r.hero === hero);
  Object.assign(receipt, { file, bytes: bytes.length, sha256: sha });
}
await fs.writeFile(
  "src/report-entrance-assets.js",
  '// Generated by tools/rig/build-report-entrances.mjs\nexport const reportEntranceRevision="gemini-2026-10-21";\nexport const reportEntranceUrls=' +
    JSON.stringify(urls, null, 2) +
    ";\nexport const reportEntranceHashes=" +
    JSON.stringify(hashes, null, 2) +
    ";\n",
);
await fs.writeFile(
  "docs/anim-report/conver10-redo/gemini-2026-10-21/motion-build.json",
  JSON.stringify({ scope: output.scope, receipts }, null, 2) + "\n",
);
console.log(JSON.stringify({ receipts }, null, 2));
