/** Blend adjacent phalanges along the measured finger centreline, not all bones by inverse distance. */
export function phalangeWeights(points, distances) {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(...p.map((x, k) => x - points[i][k])));
  let nearest = 0;
  for (let i = 1; i < 3; i++)
    if (distances[i].distance < distances[nearest].distance) nearest = i;
  const start = lengths.slice(0, nearest).reduce((a, b) => a + b, 0);
  const s =
    start + Math.max(0, Math.min(1, distances[nearest].t)) * lengths[nearest];
  const centers = [
    lengths[0] * 0.5,
    lengths[0] + lengths[1] * 0.5,
    lengths[0] + lengths[1] + lengths[2] * 0.5,
  ];
  if (s <= centers[0]) return [1, 0, 0];
  if (s >= centers[2]) return [0, 0, 1];
  const k = s < centers[1] ? 0 : 1,
    t = (s - centers[k]) / (centers[k + 1] - centers[k]),
    blend = t * t * (3 - 2 * t),
    result = [0, 0, 0];
  result[k] = 1 - blend;
  result[k + 1] = blend;
  return result;
}
