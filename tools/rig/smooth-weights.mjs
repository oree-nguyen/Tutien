// Skin-weight processing only: position, normal, UV and triangle accessors stay untouched.
export function smoothJointWeights(
  positions,
  triangles,
  indices,
  weights,
  jointCount,
  fingerIndices,
  passes = 3,
  options = {},
) {
  const count = positions.length / 3;
  const representatives = new Uint32Array(count),
    unique = new Map();
  for (let i = 0; i < count; i++) {
    const key = [0, 1, 2]
      .map((k) => Math.round(positions[i * 3 + k] * 1e6))
      .join(",");
    if (!unique.has(key)) unique.set(key, i);
    representatives[i] = unique.get(key);
  }
  const degree = new Uint32Array(count);
  for (let t = 0; t < triangles.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = representatives[triangles[t + e]],
        b = representatives[triangles[t + ((e + 1) % 3)]];
      if (a !== b) {
        degree[a]++;
        degree[b]++;
      }
    }
  const offsets = new Uint32Array(count + 1);
  for (let i = 0; i < count; i++) offsets[i + 1] = offsets[i] + degree[i];
  const neighbors = new Uint32Array(offsets[count]),
    cursor = offsets.slice();
  for (let t = 0; t < triangles.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = representatives[triangles[t + e]],
        b = representatives[triangles[t + ((e + 1) % 3)]];
      if (a !== b) {
        neighbors[cursor[a]++] = b;
        neighbors[cursor[b]++] = a;
      }
    }
  const finger = new Uint8Array(count);
  for (let i = 0; i < count; i++)
    for (let k = 0; k < 4; k++)
      if (weights[i * 4 + k] > 1e-6 && fingerIndices.has(indices[i * 4 + k]))
        finger[representatives[i]] = 1;
  const sums = new Float64Array(jointCount);
  const region = options.region
    ? Uint8Array.from({ length: count }, (_, i) =>
        options.region(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        )
          ? 1
          : 0,
      )
    : null;
  const conductance = new Float64Array(neighbors.length);
  if (options.distanceWeighted)
    for (let i = 0; i < count; i++)
      for (let n = offsets[i]; n < offsets[i + 1]; n++) {
        const j = neighbors[n];
        conductance[n] =
          1 /
          Math.max(
            1e-12,
            (positions[i * 3] - positions[j * 3]) ** 2 +
              (positions[i * 3 + 1] - positions[j * 3 + 1]) ** 2 +
              (positions[i * 3 + 2] - positions[j * 3 + 2]) ** 2,
          );
      }
  let changed = 0;
  for (let pass = 0; pass < passes; pass++) {
    const nextIds = indices.slice(),
      nextWeights = weights.slice();
    for (let i = 0; i < count; i++) {
      if (
        representatives[i] !== i ||
        (!options.includeFingers && finger[i]) ||
        !degree[i] ||
        (region && !region[i])
      )
        continue;
      let transition = !!region || weights[i * 4 + 1] > 0.01;
      for (let n = offsets[i]; !transition && n < offsets[i + 1]; n++)
        transition = indices[neighbors[n] * 4] !== indices[i * 4];
      if (!transition) continue;
      sums.fill(0);
      for (let k = 0; k < 4; k++)
        sums[indices[i * 4 + k]] += 0.5 * weights[i * 4 + k];
      let validNeighbors = 0;
      for (let n = offsets[i]; n < offsets[i + 1]; n++)
        if (options.includeFingers || !finger[neighbors[n]])
          validNeighbors += options.distanceWeighted ? conductance[n] : 1;
      if (!validNeighbors) continue;
      for (let n = offsets[i]; n < offsets[i + 1]; n++) {
        const neighbor = neighbors[n];
        if (!options.includeFingers && finger[neighbor]) continue;
        for (let k = 0; k < 4; k++)
          sums[indices[neighbor * 4 + k]] +=
            ((0.5 * (options.distanceWeighted ? conductance[n] : 1)) /
              validNeighbors) *
            weights[neighbor * 4 + k];
      }
      const top = [];
      for (let j = 0; j < jointCount; j++)
        if (sums[j] > 1e-8) {
          top.push(j);
          top.sort((a, b) => sums[b] - sums[a]);
          if (top.length > 4) top.pop();
        }
      const total = top.reduce((s, j) => s + sums[j], 0);
      for (let k = 0; k < 4; k++) {
        nextIds[i * 4 + k] = top[k] ?? 0;
        nextWeights[i * 4 + k] =
          top[k] === undefined ? 0 : sums[top[k]] / total;
      }
      changed++;
    }
    for (let i = 0; i < count; i++)
      for (let k = 0; k < 4; k++) {
        indices[i * 4 + k] = nextIds[representatives[i] * 4 + k];
        weights[i * 4 + k] = nextWeights[representatives[i] * 4 + k];
      }
  }
  return {
    passes,
    factor: 0.5,
    processedVertexPasses: changed,
    fingerVerticesDetected: finger.reduce((s, f) => s + f, 0),
    fingerVerticesExcluded: options.includeFingers
      ? 0
      : finger.reduce((s, f) => s + f, 0),
    weldedPositions: unique.size,
    regionVertices: region?.reduce((s, f) => s + f, 0),
    includesFingerTransitions: !!options.includeFingers,
    distanceWeighted: !!options.distanceWeighted,
  };
}
