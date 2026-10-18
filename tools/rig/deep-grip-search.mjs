import fs from "node:fs/promises";
import { Vector3, MathUtils } from "three";
import { solveGrip } from "../../src/rig/grip-solver.js";
const hero = "H02",
  hand = "Left";
const frame = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
  hero
].hands[hand];
const base = JSON.parse(
  await fs.readFile(`docs/hand-frames/${hero}-grip-patch-search.json`),
);
const weapon = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`));
const axis = new Vector3(...frame.u)
  .multiplyScalar(Math.cos(MathUtils.degToRad(base.tilt)))
  .addScaledVector(
    new Vector3(...frame.f),
    Math.sin(MathUtils.degToRad(base.tilt)),
  );
const normal =
  base.normalMode === "frame"
    ? new Vector3(...frame.n)
    : new Vector3(...base.contactPatch.normal).applyAxisAngle(
        axis,
        MathUtils.degToRad(base.normalMode),
      );
const result = solveGrip(
  {
    ...frame,
    palmCenter: base.contactPatch.center,
    gripAxis: axis.toArray(),
    surfaceNormal: base.contactPatch.normal,
    contactNormal: normal.toArray(),
  },
  weapon.shaftRadius,
  { skinGap: base.gap, globalSearchIterations: 1000 },
);
const report = {
  hero,
  hand,
  scope:
    "Deterministic global finger-angle search at one measured contact patch; diagnostic only",
  globalSearchIterations: 1000,
  palmCupping: false,
  passed: result.ok,
  base: {
    ratio: base.ratio,
    tilt: base.tilt,
    gap: base.gap,
    normalMode: base.normalMode,
  },
  result,
};
await fs.writeFile(
  `docs/hand-frames/${hero}-deep-grip-search.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log({
  passed: report.passed,
  fingers: Object.fromEntries(
    Object.entries(result.fingers).map(([name, f]) => [
      name,
      {
        valid: f.valid,
        penetration: f.penetration,
        totalFlexDeg: f.totalFlexDeg,
        wrap: f.signedWrapDeg,
        tipSurfaceDistance: f.tipSurfaceDistance,
      },
    ]),
  ),
});
if (!report.passed) process.exitCode = 1;
