import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Quaternion, Vector3, Triangle, MathUtils } from "three";
import { solveGrip } from "../../src/rig/grip-solver.js";
import sharp from "sharp";

// Couple finger FK with the actual skinned palm, whose contact point is not
// stationary when finger weights extend into the palm/webbing.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const frames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
const reports = [];
for (const hero of ["H01", "H02"]) {
  const file = `assets/rigged/${hero}-C0-rigged.glb`,
    bytes = await fs.readFile(file),
    doc = await io.read(file),
    skin = doc.getRoot().listSkins()[0],
    joints = skin.listJoints(),
    node = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh()),
    prim = node.getMesh().listPrimitives()[0],
    positions = prim.getAttribute("POSITION").getArray(),
    indices = prim.getIndices().getArray(),
    ids = prim.getAttribute("JOINTS_0").getArray(),
    weights = prim.getAttribute("WEIGHTS_0").getArray(),
    initial = JSON.parse(
      await fs.readFile(`docs/hand-frames/${hero}-grip-patch-search.json`),
    ),
    weapon = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`)),
    frame = frames[hero].hands[initial.hand],
    patch = frame.palmCandidates.find((p) => p.ratio === initial.ratio),
    triangle = new Triangle(),
    near = new Vector3();
  const albedo = await sharp(
    prim.getMaterial().getBaseColorTexture().getImage(),
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  function sourceAlbedoRgb(vertex) {
    const uv = prim.getAttribute("TEXCOORD_0").getElement(vertex, []),
      x = MathUtils.clamp(
        Math.round(uv[0] * (albedo.info.width - 1)),
        0,
        albedo.info.width - 1,
      ),
      y = MathUtils.clamp(
        Math.round(uv[1] * (albedo.info.height - 1)),
        0,
        albedo.info.height - 1,
      ),
      offset = (y * albedo.info.width + x) * albedo.info.channels;
    return [...albedo.data.slice(offset, offset + 3)];
  }
  const surfaces = new Map();
  function findSurface(candidatePatch) {
    if (surfaces.has(candidatePatch.ratio))
      return surfaces.get(candidatePatch.ratio);
    const point = new Vector3(...candidatePatch.center);
    let nearest = Infinity,
      surface;
    for (let i = 0; i < indices.length; i += 3) {
      triangle.set(
        ...[0, 1, 2].map((k) =>
          new Vector3().fromArray(positions, indices[i + k] * 3),
        ),
      );
      triangle.closestPointToPoint(point, near);
      const distance = near.distanceToSquared(point);
      if (distance < nearest) {
        nearest = distance;
        surface = {
          indices: [...indices.slice(i, i + 3)],
          bary: triangle.getBarycoord(near, new Vector3()).toArray(),
        };
      }
    }
    if (Math.sqrt(nearest) > 0.0001)
      throw Error(hero + " palm contact does not lie on source surface");
    surfaces.set(candidatePatch.ratio, surface);
    return surface;
  }
  let activePatch = patch,
    surface = findSurface(patch);
  const handPoints = [
      frame.wrist,
      ...Object.values(frame.fingers).flatMap((f) => f.points),
    ],
    low = [0, 1, 2].map(
      (k) => Math.min(...handPoints.map((p) => p[k])) - 0.022,
    ),
    high = [0, 1, 2].map(
      (k) => Math.max(...handPoints.map((p) => p[k])) + 0.022,
    ),
    handVertices = [];
  for (let i = 0; i < positions.length / 3; i++)
    if (
      [0, 1, 2].every(
        (k) =>
          positions[i * 3 + k] >= low[k] && positions[i * 3 + k] <= high[k],
      )
    )
      handVertices.push(i);
  function evaluateSkin(result) {
    const worlds = new Map();
    function world(j) {
      if (worlds.has(j)) return worlds.get(j);
      const q = new Quaternion(...j.getRotation()),
        match = j
          .getName()
          .match(
            new RegExp(
              "^" +
                initial.hand +
                "Hand(Thumb|Index|Middle|Ring|Pinky)([123])$",
            ),
          );
      if (match) {
        const pose = result.fingers[match[1]],
          index = Number(match[2]) - 1,
          swing = new Vector3(
            MathUtils.degToRad(pose.angles[index]),
            0,
            index === 0 ? MathUtils.degToRad(pose.opposition) : 0,
          ),
          length = swing.length();
        q.multiply(
          new Quaternion().setFromAxisAngle(
            length ? swing.divideScalar(length) : new Vector3(1, 0, 0),
            length,
          ),
        ).multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 1, 0),
            MathUtils.degToRad(pose.twists[index]),
          ),
        );
      }
      const m = new Matrix4().compose(
        new Vector3(...j.getTranslation()),
        q,
        new Vector3(...j.getScale()),
      );
      if (j.getParentNode()) m.premultiply(world(j.getParentNode()));
      worlds.set(j, m);
      return m;
    }
    const matrices = joints.map((j, i) =>
      world(j)
        .clone()
        .multiply(
          new Matrix4().fromArray(
            skin.getInverseBindMatrices().getElement(i, []),
          ),
        ),
    );
    const p = new Vector3(),
      tmp = new Vector3();
    function posed(index) {
      p.set(0, 0, 0);
      for (let k = 0; k < 4; k++)
        if (weights[index * 4 + k]) {
          tmp
            .fromArray(positions, index * 3)
            .applyMatrix4(matrices[ids[index * 4 + k]]);
          p.addScaledVector(tmp, weights[index * 4 + k]);
        }
      return p.clone();
    }
    const corners = surface.indices.map(posed),
      palm = corners.reduce(
        (sum, p, i) => sum.addScaledVector(p, surface.bary[i]),
        new Vector3(),
      ),
      normal = new Triangle(...corners).getNormal(new Vector3());
    if (normal.dot(new Vector3(...activePatch.normal)) < 0) normal.negate();
    const axis = new Vector3(...result.shaftAxis),
      center = new Vector3(...result.shaftCenter);
    let maximumIntrusion = 0,
      count = 0,
      worst = null;
    for (const index of handVertices) {
      const delta = posed(index).sub(center),
        along = delta.dot(axis),
        sourceY = along + weapon.gripPivot[1];
      if (sourceY < weapon.gripSegment[0] || sourceY > weapon.gripSegment[1])
        continue;
      const intrusion =
        weapon.shaftRadius - delta.addScaledVector(axis, -along).length();
      if (intrusion > 0) count++;
      if (intrusion > maximumIntrusion) {
        maximumIntrusion = intrusion;
        worst = {
          vertex: index,
          sourceAlbedoRgb: sourceAlbedoRgb(index),
          sourcePosition: [...positions.slice(index * 3, index * 3 + 3)],
          posedPosition: posed(index).toArray(),
          joints: [...ids.slice(index * 4, index * 4 + 4)].map((i) =>
            joints[i].getName(),
          ),
          weights: [...weights.slice(index * 4, index * 4 + 4)],
        };
      }
    }
    const normalTowardShaft = palm
      .clone()
      .sub(center)
      .negate()
      .projectOnPlane(axis)
      .normalize();
    const actualGap =
      palm.clone().sub(center).projectOnPlane(axis).length() -
      weapon.shaftRadius;
    return {
      palm: palm.toArray(),
      normal: normal.toArray(),
      actualGap,
      palmNormalDot: normal.dot(normalTowardShaft),
      maximumIntrusion,
      intrudingVertices: count,
      worst,
    };
  }
  let result = initial.result,
    best;
  const history = [];
  for (let iteration = 0; iteration < 10; iteration++) {
    const measured = evaluateSkin(result),
      bad = Object.values(result.fingers).filter((f) => !f.valid).length,
      contactValid =
        measured.maximumIntrusion <= 0.003 &&
        measured.actualGap >= 0.003 &&
        measured.actualGap <= 0.005 &&
        measured.palmNormalDot >= 0.8,
      score =
        (bad + (result.ok ? 0 : 1)) * 1e6 +
        Math.max(0, measured.maximumIntrusion - 0.003) * 1e4 +
        Math.abs(measured.actualGap - 0.004) * 1e3;
    history.push({ iteration, geometricPassed: result.ok, bad, ...measured });
    if (!best || score < best.score)
      best = {
        score,
        result,
        measured,
        sourceSurface: surface,
        passed: result.ok && contactValid,
      };
    if (result.ok && contactValid) break;
    result = solveGrip(
      {
        ...frame,
        palmCenter: measured.palm,
        contactNormal: measured.normal,
        surfaceNormal: measured.normal,
        gripAxis: initial.result.shaftAxis,
      },
      weapon.shaftRadius,
      { skinGap: 0.004 },
    );
  }
  const candidateAudit = [];
  let candidateSource = "not generated";
  try {
    const candidates = JSON.parse(
      await fs.readFile(`docs/hand-frames/${hero}-grip-candidates.json`),
    );
    candidateSource = "all geometric passes from source-patch search";
    for (const candidate of candidates.passingCandidates) {
      activePatch = frame.palmCandidates.find(
        (p) => p.ratio === candidate.ratio,
      );
      surface = findSurface(activePatch);
      const measured = evaluateSkin(candidate.result),
        passed =
          candidate.result.ok &&
          measured.maximumIntrusion <= 0.003 &&
          measured.actualGap >= 0.003 &&
          measured.actualGap <= 0.005 &&
          measured.palmNormalDot >= 0.8,
        score =
          Math.max(0, measured.maximumIntrusion - 0.003) * 1e4 +
          Math.abs(measured.actualGap - 0.004) * 1e3;
      candidateAudit.push({
        ratio: candidate.ratio,
        tilt: candidate.tilt,
        gap: candidate.gap,
        normalMode: candidate.normalMode,
        passed,
        ...measured,
      });
      if (
        (passed && !best.passed) ||
        (passed === best.passed && score < best.score)
      )
        best = {
          score,
          result: candidate.result,
          measured,
          passed,
          sourceSurface: surface,
          candidate: {
            ratio: candidate.ratio,
            tilt: candidate.tilt,
            gap: candidate.gap,
            normalMode: candidate.normalMode,
          },
        };
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const optimizationHistory = [],
    evaluations = new Map();
  function contactScore(result, measured) {
    return (
      Object.values(result.fingers).reduce((sum, f) => sum + f.score / 1e4, 0) +
      Math.max(0, result.fingerAxisErrorDeg - 20) ** 2 +
      Math.max(0, result.gripAxisErrorDeg - 25) ** 2 +
      (Math.max(0, 0.8 - result.palmSurfaceNormalDot) * 100) ** 2 +
      (Math.max(0, measured.maximumIntrusion - 0.003) * 1000) ** 2 +
      (Math.max(0, 0.003 - measured.actualGap, measured.actualGap - 0.005) *
        1000) **
        2 +
      (Math.max(0, 0.8 - measured.palmNormalDot) * 100) ** 2
    );
  }
  function evaluateParameters(parameters) {
    const key = JSON.stringify(parameters);
    if (evaluations.has(key)) return evaluations.get(key);
    activePatch = frame.palmCandidates.find(
      (p) => p.ratio === parameters.ratio,
    );
    surface = findSurface(activePatch);
    const axis = new Vector3(...frame.u)
        .multiplyScalar(Math.cos(MathUtils.degToRad(parameters.tilt)))
        .addScaledVector(
          new Vector3(...frame.f),
          Math.sin(MathUtils.degToRad(parameters.tilt)),
        ),
      normal = new Vector3(
        ...(parameters.normalBase === "frame" ? frame.n : activePatch.normal),
      ).applyAxisAngle(axis, MathUtils.degToRad(parameters.roll)),
      result = solveGrip(
        {
          ...frame,
          palmCenter: activePatch.center,
          gripAxis: axis.toArray(),
          contactNormal: normal.toArray(),
          surfaceNormal: activePatch.normal,
        },
        weapon.shaftRadius,
        { skinGap: parameters.gap },
      ),
      measured = evaluateSkin(result),
      score = contactScore(result, measured),
      passed =
        result.ok &&
        measured.maximumIntrusion <= 0.003 &&
        measured.actualGap >= 0.003 &&
        measured.actualGap <= 0.005 &&
        measured.palmNormalDot >= 0.8,
      record = {
        score,
        result,
        measured,
        passed,
        sourceSurface: surface,
        candidate: parameters,
      };
    evaluations.set(key, record);
    return record;
  }
  const starts = (candidateAudit.length ? candidateAudit : [initial]).map(
    (candidate) => ({
      ratio: candidate.ratio,
      tilt: candidate.tilt,
      gap: candidate.gap,
      normalBase: candidate.normalMode === "frame" ? "frame" : "surface",
      roll: typeof candidate.normalMode === "number" ? candidate.normalMode : 0,
    }),
  );
  const ranked = starts
    .map(evaluateParameters)
    .sort((a, b) => a.score - b.score);
  let optimized = ranked[0];
  for (const seed of ranked.slice(0, 4)) {
    let current = seed;
    for (const step of [5, 2, 1, 0.5]) {
      for (let pass = 0; pass < 3; pass++) {
        let improved = false;
        for (const variable of ["tilt", "roll", "gap"])
          for (const direction of [-1, 1]) {
            const values = { ...current.candidate },
              delta = variable === "gap" ? step * 0.0001 : step;
            values[variable] = MathUtils.clamp(
              values[variable] + direction * delta,
              variable === "tilt" ? -20 : variable === "roll" ? -35 : 0.003,
              variable === "tilt" ? 20 : variable === "roll" ? 35 : 0.005,
            );
            const next = evaluateParameters(values);
            if (next.score < current.score - 1e-9) {
              current = next;
              improved = true;
            }
            if (
              (next.passed && !optimized.passed) ||
              (next.passed === optimized.passed && next.score < optimized.score)
            )
              optimized = next;
          }
        if (current.passed || !improved) break;
      }
      optimizationHistory.push({
        parameters: current.candidate,
        score: current.score,
        passed: current.passed,
        maximumIntrusion: current.measured.maximumIntrusion,
        actualGap: current.measured.actualGap,
      });
      if (current.passed) break;
    }
    if (optimized.passed) break;
  }
  best = optimized;
  const report = {
    hero,
    hand: initial.hand,
    rigSha256: createHash("sha256").update(bytes).digest("hex"),
    scope:
      "Offline coupled grip/skin diagnostic; cylinder excludes weapon ornaments; not runtime activation",
    sourceSurface: surface,
    candidateSource,
    candidateAudit,
    optimizationEvaluations: evaluations.size,
    optimizationHistory,
    history,
    ...best,
  };
  await fs.writeFile(
    `docs/hand-frames/${hero}-grip-contact-refinement.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  reports.push(report);
  console.log(hero, best.passed, best.measured);
}
await fs.writeFile(
  "docs/hand-frames/grip-contact-refinement.json",
  JSON.stringify({ passed: reports.every((r) => r.passed), reports }, null, 2) +
    "\n",
);
if (reports.some((r) => !r.passed)) process.exitCode = 1;
