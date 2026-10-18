/** Edge incidence after exact position welding; does not modify geometry. */
export function auditSurface(positions, indices) {
  const welds = new Map(),
    map = new Uint32Array(positions.length / 3);
  for (let i = 0; i < map.length; i++) {
    const key = `${positions[i * 3]},${positions[i * 3 + 1]},${positions[i * 3 + 2]}`;
    if (!welds.has(key)) welds.set(key, welds.size);
    map[i] = welds.get(key);
  }
  const count = welds.size,
    edges = new Float64Array(indices.length);
  let used = 0,
    degenerateEdges = 0;
  for (let i = 0; i < indices.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = map[indices[i + k]],
        b = map[indices[i + ((k + 1) % 3)]];
      if (a === b) {
        degenerateEdges++;
        continue;
      }
      edges[used++] =
        (Math.min(a, b) * count + Math.max(a, b)) * 2 + (a < b ? 0 : 1);
    }
  const sorted = edges.subarray(0, used);
  sorted.sort();
  let boundaryEdges = 0,
    nonManifoldEdges = 0,
    inconsistentWindingEdges = 0,
    uniqueEdges = 0,
    oddIncidenceEdges = 0,
    unbalancedWindingEdges = 0;
  for (let i = 0; i < sorted.length; ) {
    const key = Math.floor(sorted[i] / 2);
    let j = i + 1;
    while (j < sorted.length && Math.floor(sorted[j] / 2) === key) j++;
    const incidence = j - i;
    uniqueEdges++;
    let forward = 0;
    for (let k = i; k < j; k++) if (sorted[k] % 2 === 0) forward++;
    if (incidence % 2) oddIncidenceEdges++;
    if (forward * 2 !== incidence) unbalancedWindingEdges++;
    if (incidence === 1) boundaryEdges++;
    else if (incidence !== 2) nonManifoldEdges++;
    else if (sorted[i] % 2 === sorted[i + 1] % 2) inconsistentWindingEdges++;
    i = j;
  }
  return {
    method:
      "Exact float-coordinate welding, undirected edge incidence and winding; source geometry unchanged",
    vertices: map.length,
    weldedVertices: count,
    triangles: indices.length / 3,
    uniqueEdges,
    degenerateEdges,
    boundaryEdges,
    nonManifoldEdges,
    inconsistentWindingEdges,
    oddIncidenceEdges,
    unbalancedWindingEdges,
    closedOrientedParityChain:
      oddIncidenceEdges === 0 &&
      unbalancedWindingEdges === 0 &&
      indices.length > 0,
    closedOriented:
      boundaryEdges === 0 &&
      nonManifoldEdges === 0 &&
      inconsistentWindingEdges === 0 &&
      degenerateEdges === 0,
  };
}
