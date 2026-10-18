/** Continuous source-space arm supports for offline fitting, excluding measured hands. */
export function seedSleeveWeights(
  positions,
  ids,
  weights,
  joints,
  handFrames,
  region,
  { continuousFade = false } = {},
) {
  const indices = new Map(joints.map((node, i) => [node.getName(), i]));
  const bounds = Object.values(handFrames).map((frame) => {
    const points = [
      frame.wrist,
      ...Object.values(frame.fingers).flatMap((f) => f.points),
    ];
    return {
      low: [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])) - 0.022),
      high: [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])) + 0.022),
    };
  });
  const sides = Object.fromEntries(
    ["Right", "Left"].map((side) => {
      const names = ["Spine2", side + "Arm", side + "ForeArm", side + "Hand"];
      const support = names.map((name) => {
        if (!indices.has(name)) throw Error("Missing sleeve joint " + name);
        return indices.get(name);
      });
      const x = support
        .slice(1)
        .map((i) => Math.abs(joints[i].getWorldMatrix()[12]));
      const knots = [x[0] - 0.08, x[0] + 0.04, x[1] + 0.03, x[2]];
      if (!knots.every((value, i) => i === 0 || value > knots[i - 1]))
        throw Error("Arm is not in the expected outward source bind pose");
      return [side, { support, knots }];
    }),
  );
  let changed = 0;
  for (let i = 0; i < positions.length / 3; i++) {
    const point = [...positions.slice(i * 3, i * 3 + 3)];
    if (
      !region(...point) ||
      bounds.some((b) => point.every((v, k) => v >= b.low[k] && v <= b.high[k]))
    )
      continue;
    const { support, knots } = sides[point[0] < 0 ? "Right" : "Left"],
      x = Math.abs(point[0]);
    let segment = 0;
    while (segment < 2 && x > knots[segment + 1]) segment++;
    const t = Math.max(
      0,
      Math.min(1, (x - knots[segment]) / (knots[segment + 1] - knots[segment])),
    );
    const result = new Float64Array(4).fill(1e-6);
    result[segment] += 1 - t;
    result[segment + 1] += t;
    if (continuousFade) {
      const mass = result.reduce((sum, value) => sum + value, 0);
      for (let k = 0; k < 4; k++) result[k] /= mass;
      const smooth = (value) => {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
      };
      const blend =
        smooth((point[1] - 0.25) / 0.65) *
        (1 - smooth((point[1] - 1.45) / 0.25));
      for (let k = 1; k < 4; k++) result[k] *= blend;
      result[0] = 1 - result[1] - result[2] - result[3];
    }
    const total = result.reduce((sum, w) => sum + w, 0);
    for (let k = 0; k < 4; k++) {
      ids[i * 4 + k] = support[k];
      weights[i * 4 + k] = result[k] / total;
    }
    changed++;
  }
  return {
    method:
      "Continuous bind-space sleeve weights with four common arm/spine supports; measured hand regions preserved",
    changedVertices: changed,
    sides,
  };
}
