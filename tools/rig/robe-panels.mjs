/** Split existing outer-robe triangles into anatomical left/right lower panels.
 * No cutting, deleting, projecting, or fabricating source triangles. */
export function splitRobePanels(
  positions,
  indices,
  { waistY = 0.9, hemY = 0.2, halfWidth = 0.3, panelMask = null } = {},
) {
  if (
    ![waistY, hemY, halfWidth].every(Number.isFinite) ||
    waistY <= hemY ||
    halfWidth <= 0
  )
    throw Error("Invalid robe panel bounds");
  const lists = { upper: [], left: [], right: [], remainder: [] };
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i],
      b = indices[i + 1],
      c = indices[i + 2];
    const x = (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3;
    const y =
      (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3;
    const key =
      y >= hemY && y < waistY && Math.abs(x) < halfWidth
        ? panelMask && [a, b, c].filter((i) => panelMask[i]).length < 2
          ? "remainder"
          : x >= 0
            ? "left"
            : "right"
        : "upper";
    lists[key].push(a, b, c);
  }
  return Object.fromEntries(
    Object.entries(lists).map(([k, v]) => [k, new Uint32Array(v)]),
  );
}

/** Compact each disconnected mesh; duplicate boundary vertices with exact data. */
export function compactTriangleIndices(indices) {
  const map = new Map(),
    sourceVertices = [],
    compact = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const old = indices[i];
    if (!map.has(old)) {
      map.set(old, sourceVertices.length);
      sourceVertices.push(old);
    }
    compact[i] = map.get(old);
  }
  return { indices: compact, sourceVertices: new Uint32Array(sourceVertices) };
}
