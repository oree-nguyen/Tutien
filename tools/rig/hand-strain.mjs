/** Independent edge-strain check on the deformed source hand/cuff topology. */
export function handStrain(hand) {
  const source = hand.primitive.getAttribute("POSITION").getArray(),
    index = hand.primitive.getIndices().getArray(),
    count = source.length / 3,
    edges = new Set(),
    positions = new Map(),
    ratios = [];
  const point = (i) => {
    if (!positions.has(i)) positions.set(i, hand.position(i));
    return positions.get(i);
  };
  let maximum = 0,
    worst;
  for (let i = 0; i < index.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = index[i + k],
        b = index[i + ((k + 1) % 3)];
      if (!hand.mask[a] && !hand.mask[b]) continue;
      const key = Math.min(a, b) * count + Math.max(a, b);
      if (edges.has(key)) continue;
      edges.add(key);
      const bind = Math.hypot(
        source[a * 3] - source[b * 3],
        source[a * 3 + 1] - source[b * 3 + 1],
        source[a * 3 + 2] - source[b * 3 + 2],
      );
      if (bind < 1e-12) continue;
      const posed = point(a).distanceTo(point(b)),
        ratio = posed / bind;
      ratios.push(ratio);
      if (ratio > maximum) {
        maximum = ratio;
        worst = {
          a,
          b,
          bindLength: bind,
          posedLength: posed,
          sourceA: [...source.slice(a * 3, a * 3 + 3)],
          sourceB: [...source.slice(b * 3, b * 3 + 3)],
          posedA: point(a).toArray(),
          posedB: point(b).toArray(),
        };
      }
    }
  ratios.sort((a, b) => a - b);
  const p999 = ratios[Math.floor((ratios.length - 1) * 0.999)];
  return {
    passed: p999 <= 1.5 && maximum <= 2,
    p999,
    maximum,
    edges: ratios.length,
    thresholds: { p999: 1.5, maximum: 2 },
    worst,
  };
}
