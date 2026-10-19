/** Numeric node/primitive/vertex indices identify instances; names are display only. */
export class SeamAccumulator {
  constructor() {
    this.groups = new Map();
  }
  add(key, vertex) {
    const group = this.groups.get(key);
    if (group) group.push(vertex);
    else this.groups.set(key, [vertex]);
  }
  measure() {
    let maximum = 0,
      pairs = 0,
      groups = 0,
      invalidPositions = 0,
      worst;
    for (const vertices of this.groups.values()) {
      if (vertices.length < 2) continue;
      groups++;
      // Comparing only with the first copy misses openings on opposite sides.
      for (let i = 0; i < vertices.length; i++)
        for (let j = i + 1; j < vertices.length; j++) {
          const a = vertices[i],
            b = vertices[j];
          pairs++;
          if (
            ![a.position, b.position].every(
              (position) =>
                position?.length === 3 &&
                Array.from(position).every(Number.isFinite),
            )
          ) {
            invalidPositions++;
            continue;
          }
          const gap = Math.hypot(
            ...a.position.map((v, k) => v - b.position[k]),
          );
          if (!Number.isFinite(gap)) {
            invalidPositions++;
            continue;
          }
          if (gap > maximum) {
            maximum = gap;
            worst = {
              first: a.identity,
              second: b.identity,
              bind: a.bind,
              sourceVertexId: a.sourceVertexId,
              gapMillimetres: gap * 1000,
            };
          }
        }
    }
    return {
      groups,
      pairs,
      maximumMillimetres: maximum * 1000,
      invalidPositions,
      worst,
    };
  }
}
