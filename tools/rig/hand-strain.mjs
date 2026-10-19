/** Edge/triangle checks at one pose. These do not measure volume or cross-sections. */
export function handStrain(hand) {
  const source = hand.primitive.getAttribute("POSITION")?.getArray();
  const index = hand.primitive.getIndices()?.getArray();
  const count = source?.length / 3;
  const issues = [],
    counts = {},
    sourceDiagnostics = {};
  const sourceDiagnostic = (code) => {
    sourceDiagnostics[code] = (sourceDiagnostics[code] ?? 0) + 1;
  };
  const issue = (code, detail = {}) => {
    counts[code] = (counts[code] ?? 0) + 1;
    if (issues.length < 20) issues.push({ code, ...detail });
  };
  const thresholds = { p999: 1.5, maximum: 2 };
  const numerical = {
    minimumSourceEdgeMeters: 1e-12,
    minimumSourceDoubleAreaSquareMeters: 1e-24,
    collapseRatio: 1e-12,
  };
  if (
    !source ||
    !Number.isInteger(count) ||
    !count ||
    !index?.length ||
    index.length % 3 ||
    hand.mask?.length !== count ||
    typeof hand.position !== "function"
  ) {
    return {
      passed: false,
      p999: null,
      maximum: null,
      edges: 0,
      triangles: 0,
      thresholds,
      numerical,
      issues: [{ code: "INVALID_TOPOLOGY_OR_MASK" }],
      issueCounts: { INVALID_TOPOLOGY_OR_MASK: 1 },
    };
  }
  const positions = new Map(),
    edges = new Set(),
    ratios = [];
  const point = (i) => {
    if (!positions.has(i)) {
      try {
        const p = hand.position(i);
        const a = [p.x, p.y, p.z];
        positions.set(i, a.every(Number.isFinite) ? a : null);
        if (!positions.get(i)) issue("NONFINITE_POSED_POSITION", { vertex: i });
      } catch {
        positions.set(i, null);
        issue("INVALID_POSED_POSITION", { vertex: i });
      }
    }
    return positions.get(i);
  };
  const bindPoint = (i) => [...source.subarray(i * 3, i * 3 + 3)];
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const doubleArea = (a, b, c) => {
    const u = b.map((x, k) => x - a[k]),
      v = c.map((x, k) => x - a[k]);
    return Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
  };
  let maximum = 0,
    minimum = Infinity,
    minimumAreaRatio = Infinity,
    maximumAreaRatio = 0,
    worst,
    measuredTriangles = 0,
    selectedTriangles = 0;
  for (let at = 0; at < index.length; at += 3) {
    const ids = [index[at], index[at + 1], index[at + 2]];
    if (ids.some((i) => !Number.isInteger(i) || i < 0 || i >= count)) {
      issue("INDEX_OUT_OF_RANGE", { triangle: at / 3 });
      continue;
    }
    if (!ids.some((i) => hand.mask[i])) continue;
    selectedTriangles++;
    const bind = ids.map(bindPoint),
      posed = ids.map(point);
    if (bind.some((p) => !p.every(Number.isFinite))) {
      issue("NONFINITE_SOURCE_POSITION", { triangle: at / 3 });
      continue;
    }
    if (posed.some((p) => !p)) continue;
    const bindArea = doubleArea(...bind),
      posedArea = doubleArea(...posed);
    if (!Number.isFinite(bindArea) || !Number.isFinite(posedArea))
      issue("NONFINITE_TRIANGLE_AREA", { triangle: at / 3 });
    else if (bindArea <= numerical.minimumSourceDoubleAreaSquareMeters)
      sourceDiagnostic("SOURCE_DEGENERATE_TRIANGLE");
    else {
      measuredTriangles++;
      const areaRatio = posedArea / bindArea;
      minimumAreaRatio = Math.min(minimumAreaRatio, areaRatio);
      maximumAreaRatio = Math.max(maximumAreaRatio, areaRatio);
      if (areaRatio <= numerical.collapseRatio)
        issue("COLLAPSED_TRIANGLE", { triangle: at / 3, areaRatio });
    }
    for (let k = 0; k < 3; k++) {
      const a = ids[k],
        b = ids[(k + 1) % 3];
      if (!hand.mask[a] && !hand.mask[b]) continue;
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (edges.has(key)) continue;
      edges.add(key);
      const bindLength = distance(bind[k], bind[(k + 1) % 3]);
      const posedLength = distance(posed[k], posed[(k + 1) % 3]);
      // A zero source edge/area is an existing input defect, not newly posed
      // collapse. Count it separately; it must not hide other measured defects.
      if (bindLength <= numerical.minimumSourceEdgeMeters) {
        sourceDiagnostic("SOURCE_DEGENERATE_EDGE");
        continue;
      }
      const ratio = posedLength / bindLength;
      if (!Number.isFinite(ratio)) {
        issue("NONFINITE_EDGE_STRAIN", { a, b });
        continue;
      }
      if (ratio <= numerical.collapseRatio)
        issue("COLLAPSED_EDGE", { a, b, ratio });
      ratios.push(ratio);
      minimum = Math.min(minimum, ratio);
      if (ratio > maximum) {
        maximum = ratio;
        worst = {
          a,
          b,
          bindLength,
          posedLength,
          sourceA: bind[k],
          sourceB: bind[(k + 1) % 3],
          posedA: posed[k],
          posedB: posed[(k + 1) % 3],
        };
      }
    }
  }
  ratios.sort((a, b) => a - b);
  const p999 = ratios.length
    ? ratios[Math.floor((ratios.length - 1) * 0.999)]
    : null;
  if (!ratios.length || !measuredTriangles) issue("NO_MEASURED_GEOMETRY");
  return {
    passed:
      !issues.length &&
      p999 !== null &&
      p999 <= thresholds.p999 &&
      maximum <= thresholds.maximum,
    p999,
    maximum: ratios.length ? maximum : null,
    minimum: ratios.length ? minimum : null,
    edges: ratios.length,
    triangles: measuredTriangles,
    selectedTriangles,
    areaRatios: {
      minimum: measuredTriangles ? minimumAreaRatio : null,
      maximum: measuredTriangles ? maximumAreaRatio : null,
      scope:
        "Triangle area only; does not measure volume, orientation or joint cross-sections.",
    },
    sourceDiagnostics,
    thresholds,
    numerical,
    worst,
    issues,
    issueCounts: counts,
    scope:
      "Selected source edges and triangles at one pose; newly collapsed/nonfinite geometry fails. Existing source degeneracy is diagnostic. No volume or cross-section measurement.",
  };
}
