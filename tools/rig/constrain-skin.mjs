import { Matrix4, Quaternion, Vector3 } from "three";

/** Offline constrained skin-weight fitting; topology and texture data are never edited. */
export function constrainHandWeights(
  positions,
  triangles,
  ids,
  weights,
  joints,
  skin,
  { iterations = 500, targetStretch = 1.45, tipCores = [] } = {},
) {
  const count = positions.length / 3,
    finger = new Uint8Array(joints.length),
    distal = new Uint8Array(joints.length);
  joints.forEach((joint, i) => {
    finger[i] = /Hand(?:Thumb|Index|Middle|Ring|Pinky)[123]$/.test(
      joint.getName(),
    )
      ? 1
      : 0;
    distal[i] = /Hand(?:Thumb|Index|Middle|Ring|Pinky)3$/.test(joint.getName())
      ? 1
      : 0;
  });
  const coreMask = new Uint8Array(count);
  for (const core of tipCores) {
    let nearest = Infinity;
    for (let i = 0; i < count; i++)
      nearest = Math.min(
        nearest,
        Math.hypot(
          positions[i * 3] - core.point[0],
          positions[i * 3 + 1] - core.point[1],
          positions[i * 3 + 2] - core.point[2],
        ),
      );
    for (let i = 0; i < count; i++)
      if (
        Math.hypot(
          positions[i * 3] - core.point[0],
          positions[i * 3 + 1] - core.point[1],
          positions[i * 3 + 2] - core.point[2],
        ) <=
        nearest + 0.002
      ) {
        for (let k = 0; k < 4; k++) {
          ids[i * 4 + k] = k === 0 ? core.joint : 0;
          weights[i * 4 + k] = k === 0 ? 1 : 0;
        }
        coreMask[i] = 1;
      }
  }
  const lookup = new Int32Array(count).fill(-1),
    vertices = [],
    supports = [],
    pinned = [];
  for (let i = 0; i < count; i++) {
    let affected = false;
    for (let k = 0; k < 4; k++)
      if (weights[i * 4 + k] > 1e-8 && finger[ids[i * 4 + k]]) affected = true;
    if (!affected) continue;
    lookup[i] = vertices.length;
    vertices.push(i);
    supports.push([0, 1, 2, 3].filter((k) => weights[i * 4 + k] > 1e-8));
    pinned.push(
      !!coreMask[i] ||
        [0, 1, 2, 3].some(
          (k) => distal[ids[i * 4 + k]] && weights[i * 4 + k] >= 0.95,
        ),
    );
  }
  const welds = new Map(),
    groups = [];
  for (let n = 0; n < vertices.length; n++) {
    const i = vertices[n],
      key = [0, 1, 2]
        .map((k) => Math.round(positions[i * 3 + k] * 1e6))
        .join(",");
    let group = welds.get(key);
    if (!group) {
      group = [];
      welds.set(key, group);
    }
    group.push(n);
    groups[n] = group;
  }
  for (const group of welds.values())
    if (group.some((n) => pinned[n])) for (const n of group) pinned[n] = true;
  const poses = [0.2, 1].map((strength) => {
    const worlds = new Map();
    function world(node) {
      if (worlds.has(node)) return worlds.get(node);
      const q = new Quaternion(...node.getRotation()),
        m = node
          .getName()
          .match(/Hand(?:Thumb|Index|Middle|Ring|Pinky)([123])$/);
      if (m)
        q.multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(1, 0, 0),
            ([60, 70, 48][Number(m[1]) - 1] * strength * Math.PI) / 180,
          ),
        );
      const matrix = new Matrix4().compose(
        new Vector3(...node.getTranslation()),
        q,
        new Vector3(...node.getScale()),
      );
      if (node.getParentNode()) matrix.premultiply(world(node.getParentNode()));
      worlds.set(node, matrix);
      return matrix;
    }
    const matrices = joints.map(
        (j, k) =>
          world(j)
            .clone()
            .multiply(
              new Matrix4().fromArray(
                skin.getInverseBindMatrices().getElement(k, []),
              ),
            ).elements,
      ),
      transforms = new Float64Array(vertices.length * 12),
      current = new Float64Array(vertices.length * 3);
    for (let n = 0; n < vertices.length; n++) {
      const i = vertices[n],
        x = positions[i * 3],
        y = positions[i * 3 + 1],
        z = positions[i * 3 + 2];
      for (let k = 0; k < 4; k++) {
        const m = matrices[ids[i * 4 + k]],
          o = n * 12 + k * 3;
        transforms[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
        transforms[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        transforms[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      }
    }
    return { transforms, current };
  });
  function refresh(n) {
    const vertex = vertices[n];
    for (const pose of poses) {
      const o = n * 3,
        t = n * 12;
      pose.current[o] = pose.current[o + 1] = pose.current[o + 2] = 0;
      for (const k of supports[n])
        for (let d = 0; d < 3; d++)
          pose.current[o + d] +=
            weights[vertex * 4 + k] * pose.transforms[t + k * 3 + d];
    }
  }
  for (let n = 0; n < vertices.length; n++) refresh(n);
  const edges = [];
  for (let t = 0; t < triangles.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = triangles[t + k],
        b = triangles[t + ((k + 1) % 3)];
      if (lookup[a] < 0 && lookup[b] < 0) continue;
      const length = Math.hypot(
        positions[a * 3] - positions[b * 3],
        positions[a * 3 + 1] - positions[b * 3 + 1],
        positions[a * 3 + 2] - positions[b * 3 + 2],
      );
      if (length > 1e-12) edges.push(a, b, length);
    }
  const ga = new Float64Array(4),
    gb = new Float64Array(4),
    candidate = new Float64Array(4),
    sorted = new Float64Array(4);
  function gradient(pose, n, nx, ny, nz, out) {
    out.fill(0);
    if (n < 0 || pinned[n] || supports[n].length < 2) return 0;
    let mean = 0;
    for (const k of supports[n]) {
      const o = n * 12 + k * 3;
      out[k] =
        nx * pose.transforms[o] +
        ny * pose.transforms[o + 1] +
        nz * pose.transforms[o + 2];
      mean += out[k];
    }
    mean /= supports[n].length;
    let square = 0;
    for (const k of supports[n]) {
      out[k] -= mean;
      square += out[k] ** 2;
    }
    return square;
  }
  function project(n, g, step) {
    if (n < 0 || pinned[n] || supports[n].length < 2) return;
    const vertex = vertices[n],
      support = supports[n],
      length = support.length;
    for (let j = 0; j < length; j++) {
      const k = support[j];
      candidate[j] = weights[vertex * 4 + k] + step * g[k];
      sorted[j] = candidate[j];
    }
    const ordered = sorted.subarray(0, length);
    ordered.sort().reverse();
    let sum = 0,
      theta = 0;
    for (let j = 0; j < length; j++) {
      sum += ordered[j];
      const next = (sum - 1) / (j + 1);
      if (ordered[j] - next > 0) theta = next;
    }
    let total = 0;
    for (let j = 0; j < length; j++) {
      candidate[j] = Math.max(0, candidate[j] - theta);
      total += candidate[j];
    }
    for (let j = 0; j < length; j++)
      weights[vertex * 4 + support[j]] = candidate[j] / total;
    for (const member of groups[n]) {
      const other = vertices[member];
      if (member !== n)
        for (let k = 0; k < 4; k++) {
          ids[other * 4 + k] = ids[vertex * 4 + k];
          weights[other * 4 + k] = weights[vertex * 4 + k];
        }
      refresh(member);
    }
  }
  const history = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let maximum = 1,
      violations = 0;
    for (const pose of poses)
      for (let e = 0; e < edges.length; e += 3) {
        const a = edges[e],
          b = edges[e + 1],
          bind = edges[e + 2],
          ia = lookup[a],
          ib = lookup[b],
          ax = ia >= 0 ? pose.current[ia * 3] : positions[a * 3],
          ay = ia >= 0 ? pose.current[ia * 3 + 1] : positions[a * 3 + 1],
          az = ia >= 0 ? pose.current[ia * 3 + 2] : positions[a * 3 + 2],
          bx = ib >= 0 ? pose.current[ib * 3] : positions[b * 3],
          by = ib >= 0 ? pose.current[ib * 3 + 1] : positions[b * 3 + 1],
          bz = ib >= 0 ? pose.current[ib * 3 + 2] : positions[b * 3 + 2];
        let nx = ax - bx,
          ny = ay - by,
          nz = az - bz;
        const distance = Math.hypot(nx, ny, nz),
          ratio = distance / bind;
        maximum = Math.max(maximum, ratio);
        if (ratio <= targetStretch + 1e-5) continue;
        violations++;
        nx /= distance;
        ny /= distance;
        nz /= distance;
        const square =
          gradient(pose, ia, nx, ny, nz, ga) +
          gradient(pose, ib, nx, ny, nz, gb);
        if (square < 1e-14) continue;
        const step = (distance - bind * targetStretch) / square;
        project(ia, ga, -step);
        project(ib, gb, step);
      }
    if (iteration % 10 === 0 || iteration === iterations - 1 || !violations)
      history.push({
        iteration,
        maximumEdgeStretch: maximum,
        violatingTriangleEdges: violations,
      });
    if (!violations) break;
  }
  return {
    method:
      "Projected skin-weight constraints on actual source edges; four fixed influences, normalized; distal rigid cores pinned",
    strengthSamples: [0.2, 1],
    targetStretch,
    vertices: vertices.length,
    pinnedDistalVertices: pinned.filter(Boolean).length,
    maximumIterations: iterations,
    weldedSurfaceGroups: welds.size,
    history,
  };
}
