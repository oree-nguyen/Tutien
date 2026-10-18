import { Matrix4, Vector3, MathUtils, Quaternion } from "three";
import { fingerBindMatrix } from "./hand-frame.js";
const X = new Vector3(1, 0, 0),
  Z = new Vector3(0, 0, 1),
  vector = (p) => new Vector3(...p);
const radians = MathUtils.degToRad;
function halton(index, base) {
  let value = 0,
    scale = 1;
  while (index > 0) {
    scale /= base;
    value += scale * (index % base);
    index = Math.floor(index / base);
  }
  return value;
}
export function buildFingerChain(points, normal, carpalRoot = null) {
  const bind = points
    .slice(0, 3)
    .map((p, i) => fingerBindMatrix(p, points[i + 1], normal));
  const carpal = carpalRoot
    ? fingerBindMatrix(carpalRoot, points[0], normal)
    : null;
  return {
    bind,
    carpal,
    local: bind.map((m, i) =>
      i
        ? bind[i - 1].clone().invert().multiply(m)
        : carpal
          ? carpal.clone().invert().multiply(m)
          : m.clone(),
    ),
    tip: vector(points[3]).applyMatrix4(bind[2].clone().invert()),
  };
}
export function evaluateFinger(
  chain,
  angles,
  opposition = 0,
  twists = [0, 0, 0],
  cup = 0,
) {
  let world = chain.carpal
    ? chain.carpal.clone().multiply(new Matrix4().makeRotationX(radians(cup)))
    : new Matrix4();
  const points = [];
  for (let i = 0; i < 3; i++) {
    world.multiply(chain.local[i]);
    const swingVector = new Vector3(
        radians(angles[i]),
        0,
        i === 0 ? radians(opposition) : 0,
      ),
      swingAngle = swingVector.length(),
      rotation = new Quaternion()
        .setFromAxisAngle(
          swingAngle > 1e-9 ? swingVector.multiplyScalar(1 / swingAngle) : X,
          swingAngle,
        )
        .multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 1, 0),
            radians(twists[i] ?? 0),
          ),
        );
    world.multiply(new Matrix4().makeRotationFromQuaternion(rotation));
    points.push(new Vector3().setFromMatrixPosition(world));
  }
  points.push(chain.tip.clone().applyMatrix4(world));
  return points;
}
function radial(point, center, axis) {
  const p = point.clone().sub(center);
  return p.addScaledVector(axis, -p.dot(axis));
}
function capsuleAxisDistance(a, b, center, axis) {
  const p = radial(a, center, axis),
    q = radial(b, center, axis).sub(p),
    t = MathUtils.clamp(-p.dot(q) / Math.max(1e-12, q.lengthSq()), 0, 1);
  return p.addScaledVector(q, t).length();
}
export function fingerContactMetrics(
  points,
  normal,
  center,
  axis,
  radius,
  thickness,
) {
  const contact = normal.clone().negate(),
    tipRadial = radial(points[3], center, axis),
    tipDistance = tipRadial.length(),
    wrap =
      tipRadial.lengthSq() > 1e-12
        ? MathUtils.radToDeg(contact.angleTo(tipRadial))
        : 0;
  let penetration = 0;
  const penetrations = [];
  for (let i = 0; i < 3; i++) {
    const r = ((thickness[i] ?? 0.025) + (thickness[i + 1] ?? 0.025)) * 0.25,
      depth =
        radius +
        r -
        capsuleAxisDistance(points[i], points[i + 1], center, axis);
    penetrations.push(Math.max(0, depth));
    penetration = Math.max(penetration, depth);
  }
  return {
    wrapDeg: wrap,
    signedWrapDeg: MathUtils.radToDeg(
      Math.atan2(
        axis.dot(contact.clone().cross(tipRadial)),
        contact.dot(tipRadial),
      ),
    ),
    tipSurfaceDistance: Math.abs(tipDistance - radius),
    penetration: Math.max(0, penetration),
    segmentPenetrations: penetrations,
  };
}
export function solveGrip(
  frame,
  radius,
  { skinGap = 0.004, allowPalmCupping = false } = {},
) {
  if (!(radius > 0) || !Number.isFinite(radius))
    throw new Error("Grip shaft radius must be a positive measured value");
  const n = vector(frame.n).normalize(),
    axis = vector(frame.gripAxis).normalize(),
    palm = vector(frame.palmCenter),
    center = palm.clone().addScaledVector(n, radius + skinGap),
    f = vector(frame.f),
    sign = axis.clone().cross(n.clone().negate()).dot(f) >= 0 ? 1 : -1;
  const fingers = {};
  let allValid = true;
  for (const [name, data] of Object.entries(frame.fingers)) {
    const cupAllowed = allowPalmCupping && ["Ring", "Pinky"].includes(name),
      chain = buildFingerChain(
        data.points,
        frame.n,
        cupAllowed ? frame.wrist : null,
      ),
      mcp = vector(data.points[0]),
      height = mcp.clone().sub(center).dot(axis),
      thumb = name === "Thumb",
      limits = [90, 100, 80, 20, 10, 10, 10, ...(cupAllowed ? [25] : [])];
    let winner;
    for (const targetAngle of thumb
      ? [-110, -140, -170]
      : [102, 110, 125, 145]) {
      const radialGoal = n
          .clone()
          .negate()
          .applyAxisAngle(axis, radians(sign * targetAngle)),
        tipRadius = radius + (data.thickness[3] ?? 0.02) * 0.5 + 0.001,
        goal = center
          .clone()
          .addScaledVector(axis, height)
          .addScaledVector(radialGoal, tipRadius);
      function evaluate(input) {
        const values = [...input];
        let sum = values[0] + values[1] + values[2];
        if (sum < 150) {
          let missing = 150 - sum;
          for (let i = 2; i >= 0; i--) {
            const add = Math.min(missing, limits[i] - values[i]);
            values[i] += add;
            missing -= add;
          }
        } else if (sum > 260) {
          let excess = sum - 260;
          for (let i = 2; i >= 0; i--) {
            const subtract = Math.min(excess, values[i]);
            values[i] -= subtract;
            excess -= subtract;
          }
        }
        const angles = values.slice(0, 3),
          opposition = values[3] ?? 0,
          twists = values.slice(4, 7),
          cup = cupAllowed ? (values[7] ?? 0) : 0,
          points = evaluateFinger(chain, angles, opposition, twists, cup),
          metrics = fingerContactMetrics(
            points,
            n,
            center,
            axis,
            radius,
            data.thickness,
          ),
          total = angles.reduce((a, b) => a + b, 0),
          curlPenalty = Math.max(0, 150 - total, total - 260),
          wrapPenalty = thumb
            ? Math.max(0, 90 + metrics.signedWrapDeg * sign)
            : Math.max(0, 100 - metrics.signedWrapDeg * sign);
        // Hard contact constraints dominate the aesthetic tip target. Otherwise a
        // prettier target could win while penetrating the shaft by several mm.
        const contactPenalty = metrics.segmentPenetrations.reduce(
            (s, x) => s + (Math.max(0, x - 0.003) / 0.001) ** 2,
            0,
          ),
          thumbPenalty = thumb
            ? (Math.max(0, metrics.tipSurfaceDistance - 0.025) / 0.001) ** 2
            : 0;
        const score =
          (contactPenalty +
            curlPenalty ** 2 +
            wrapPenalty ** 2 +
            thumbPenalty) *
            1e4 +
          points[3].distanceToSquared(goal);
        return {
          values: [...values],
          angles,
          opposition,
          twists,
          cup,
          points: points.map((p) => p.toArray()),
          metrics,
          total,
          score,
        };
      }
      const seeds = [];
      for (const a of [15, 35, 55, 75, 90])
        for (const b of [20, 50, 80, 100])
          for (const c of [20, 50, 80])
            for (const opposition of [-20, 0, 20])
              for (const cup of cupAllowed ? [0, 12, 25] : [0]) {
                const sum = a + b + c;
                if (sum < 150 || sum > 260) continue;
                seeds.push(
                  evaluate([
                    a,
                    b,
                    c,
                    opposition,
                    0,
                    0,
                    0,
                    ...(cupAllowed ? [cup] : []),
                  ]),
                );
              }
      for (let sample = 1; sample <= 384; sample++) {
        const values = limits.map((limit, j) => {
          const t = halton(sample, [2, 3, 5, 7, 11, 13, 17, 19][j]);
          return j >= 3 && j < 7 ? (t * 2 - 1) * limit : t * limit;
        });
        seeds.push(evaluate(values));
      }
      seeds.sort((a, b) => a.score - b.score);
      for (const seed of seeds.slice(0, 12)) {
        let current = seed;
        for (const step of [20, 10, 5, 2, 1, 0.5, 0.2, 0.1])
          for (let pass = 0; pass < 4; pass++) {
            let improved = false;
            for (let j = 0; j < current.values.length; j++)
              for (const d of [-step, step]) {
                const values = [...current.values];
                values[j] = MathUtils.clamp(
                  values[j] + d,
                  j >= 3 && j < 7 ? -limits[j] : 0,
                  limits[j],
                );
                const next = evaluate(values);
                if (next.score < current.score - 1e-10) {
                  current = next;
                  improved = true;
                }
              }
            if (!improved) break;
          }
        if (!winner || current.score < winner.score) winner = current;
      }
    }
    const valid =
      winner.metrics.penetration <= 0.003 + 1e-6 &&
      winner.total >= 150 - 1e-6 &&
      winner.total <= 260 + 1e-6 &&
      (thumb
        ? winner.metrics.tipSurfaceDistance <= 0.025 &&
          winner.metrics.signedWrapDeg * sign <= -90
        : winner.metrics.signedWrapDeg * sign >= 100);
    allValid &&= valid;
    fingers[name] = {
      angles: winner.angles,
      opposition: winner.opposition,
      twists: winner.twists,
      cup: winner.cup,
      points: winner.points,
      ...winner.metrics,
      totalFlexDeg: winner.total,
      valid,
      score: winner.score,
    };
  }
  const fingerAxisErrorDeg = Math.abs(90 - MathUtils.radToDeg(f.angleTo(axis)));
  return {
    ok:
      allValid &&
      fingerAxisErrorDeg <= 20 + 1e-6 &&
      skinGap >= 0.003 &&
      skinGap <= 0.005,
    radius,
    skinGap,
    palmCenter: palm.toArray(),
    shaftCenter: center.toArray(),
    shaftAxis: axis.toArray(),
    palmTowardShaftDot: n.dot(center.clone().sub(palm).normalize()),
    gripAxisErrorDeg: 0,
    fingerAxisErrorDeg,
    fingers,
  };
}
