/** Partition actual source triangles without inventing hidden anatomy or surfaces. */
export function partitionTriangles(indices, vertexMask) {
  const garment = [],
    remainder = [];
  for (let i = 0; i < indices.length; i += 3) {
    const ids = [indices[i], indices[i + 1], indices[i + 2]];
    (ids.filter((id) => vertexMask[id]).length >= 2 ? garment : remainder).push(
      ...ids,
    );
  }
  return {
    garment: new Uint32Array(garment),
    remainder: new Uint32Array(remainder),
  };
}

/** Detach the hanging central robe from arm influences, blending at waist and sides. */
export function repairHangingRobe(positions, ids, weights, hipIndex) {
  const outIds = ids.slice(),
    outWeights = weights.slice();
  let changed = 0;
  for (let i = 0; i < positions.length / 3; i++) {
    const x = Math.abs(positions[i * 3]),
      y = positions[i * 3 + 1];
    if (y < 0.2 || y > 0.98 || x > 0.3) continue;
    const smooth = (t) => {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    };
    const amount =
      smooth((0.98 - y) / 0.14) *
      smooth((0.3 - x) / 0.08) *
      smooth((y - 0.2) / 0.05);
    if (!amount) continue;
    const merged = new Map([[hipIndex, amount]]);
    for (let k = 0; k < 4; k++)
      merged.set(
        ids[i * 4 + k],
        (merged.get(ids[i * 4 + k]) ?? 0) + weights[i * 4 + k] * (1 - amount),
      );
    const top = [...merged]
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const total = top.reduce((s, [, w]) => s + w, 0);
    for (let k = 0; k < 4; k++) {
      outIds[i * 4 + k] = top[k]?.[0] ?? hipIndex;
      outWeights[i * 4 + k] = (top[k]?.[1] ?? 0) / total;
    }
    changed++;
  }
  return { ids: outIds, weights: outWeights, changed };
}
