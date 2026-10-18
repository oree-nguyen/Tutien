import fs from "node:fs/promises";
import { Vector3, MathUtils } from "three";
import { solveGrip } from "../../src/rig/grip-solver.js";
const frames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
const reports = [];
for (const hero of ["H01", "H02"].filter(
  (h) => !process.env.HERO || h === process.env.HERO,
)) {
  const hand = hero === "H01" ? "Right" : "Left";
  const frame = frames[hero].hands[hand];
  const weapon = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`));
  let best;
  const passingCandidates = [];
  for (const patch of frame.palmCandidates)
    for (const tilt of [-20, -15, 0, 15, 20])
      for (const gap of [0.003, 0.004, 0.005])
        for (const normalMode of ["frame", 0, -15, 15, -30, 30]) {
          const angle = MathUtils.degToRad(tilt);
          const axis = new Vector3(...frame.u)
            .multiplyScalar(Math.cos(angle))
            .addScaledVector(new Vector3(...frame.f), Math.sin(angle));
          const contactNormal =
            normalMode === "frame"
              ? new Vector3(...frame.n)
              : new Vector3(...patch.normal).applyAxisAngle(
                  axis,
                  MathUtils.degToRad(normalMode),
                );
          const result = solveGrip(
            {
              ...frame,
              palmCenter: patch.center,
              gripAxis: axis.toArray(),
              surfaceNormal: patch.normal,
              contactNormal: contactNormal.toArray(),
            },
            weapon.shaftRadius,
            { skinGap: gap },
          );
          if (result.ok)
            passingCandidates.push({
              ratio: patch.ratio,
              tilt,
              gap,
              normalMode,
              result,
            });
          const bad = Object.values(result.fingers).filter(
            (f) => !f.valid,
          ).length;
          const score =
            (bad + (result.ok ? 0 : 1)) * 1e12 +
            Object.values(result.fingers).reduce((sum, f) => sum + f.score, 0);
          if (!best || score < best.score)
            best = {
              ratio: patch.ratio,
              tilt,
              gap,
              normalMode,
              bad,
              score,
              result,
            };
        }
  const report = {
    hero,
    hand,
    passed: best.result.ok,
    rigJoints: 52,
    palmCupping: false,
    ...best,
  };
  reports.push(report);
  await fs.writeFile(
    `docs/hand-frames/${hero}-grip-candidates.json`,
    JSON.stringify({ hero, hand, passingCandidates }, null, 2) + "\n",
  );
  await fs.writeFile(
    `docs/hand-frames/${hero}-grip-patch-search.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    hero,
    report.passed ? "PASS" : "FAIL",
    Object.fromEntries(
      Object.entries(best.result.fingers).map(([name, f]) => [
        name,
        {
          valid: f.valid,
          penetrationMm: f.penetration * 1000,
          wrapDeg: f.wrapDeg,
        },
      ]),
    ),
  );
}
for (const hero of ["H01", "H02"])
  if (!reports.some((r) => r.hero === hero))
    reports.push(
      JSON.parse(
        await fs.readFile(`docs/hand-frames/${hero}-grip-patch-search.json`),
      ),
    );
reports.sort((a, b) => a.hero.localeCompare(b.hero));
await fs.writeFile(
  "docs/hand-frames/grip-acceptance.json",
  JSON.stringify(
    {
      passed: reports.every((r) => r.passed),
      thresholds: {
        penetrationMm: 3,
        fourFingerWrapDeg: 100,
        totalFlexDeg: [150, 260],
        thumbSurfaceDistanceMm: 25,
        shaftTiltDeg: 20,
        palmSkinGapMm: [3, 5],
        thumbOppositionMinimumDeg: 90,
      },
      reports,
    },
    null,
    2,
  ) + "\n",
);
if (reports.some((r) => !r.passed)) process.exitCode = 1;
