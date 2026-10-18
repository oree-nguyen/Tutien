import { Vector3 } from "three";

/** Adaptive signed-distance bounds over actual deformed source triangles.
 * Distance to a closed surface is 1-Lipschitz: depth(center)+coverRadius bounds
 * the penetration anywhere on the triangle. Unresolved bounds reject the pose.
 */
export function verifyContactSurface(
  mesh,
  hand,
  toWeapon,
  { limit = 0.003, maxDepth = 12 } = {},
) {
  const index = hand.primitive.getIndices().getArray(),
    positions = new Map(),
    result = {
      passed: true,
      sourceTriangles: 0,
      queries: 0,
      subdivisions: 0,
      ambiguousQueries: 0,
      unresolvedTriangles: 0,
      maximumSampledIntrusion: 0,
      maximumCertifiedUpperBound: 0,
      worst: null,
      limit,
      maxDepth,
      method:
        "Adaptive 1-Lipschitz signed-distance bounds over original deformed triangles; three-ray classification",
    };
  function vertex(i) {
    if (!positions.has(i)) positions.set(i, toWeapon(hand.position(i)));
    return positions.get(i);
  }
  function inspect(a, b, c, sourceTriangle, depth) {
    const center = a
        .clone()
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3),
      query = mesh.distance(center, { parity: true });
    result.queries++;
    if (query.ambiguous) {
      result.ambiguousQueries++;
      result.passed = false;
    }
    const penetration = -query.signedDistance,
      cover = Math.max(
        center.distanceTo(a),
        center.distanceTo(b),
        center.distanceTo(c),
      ),
      upper = penetration + cover;
    if (penetration > result.maximumSampledIntrusion) {
      result.maximumSampledIntrusion = penetration;
      result.worst = {
        sourceTriangle,
        depth,
        position: center.toArray(),
        ...query,
      };
    }
    if (penetration > limit) {
      result.passed = false;
      return;
    }
    if (upper <= limit) {
      result.maximumCertifiedUpperBound = Math.max(
        result.maximumCertifiedUpperBound,
        upper,
      );
      return;
    }
    if (depth === maxDepth) {
      result.unresolvedTriangles++;
      result.passed = false;
      return;
    }
    result.subdivisions++;
    const ab = a.clone().add(b).multiplyScalar(0.5),
      bc = b.clone().add(c).multiplyScalar(0.5),
      ca = c.clone().add(a).multiplyScalar(0.5);
    inspect(a, ab, ca, sourceTriangle, depth + 1);
    inspect(ab, b, bc, sourceTriangle, depth + 1);
    inspect(ca, bc, c, sourceTriangle, depth + 1);
    inspect(ab, bc, ca, sourceTriangle, depth + 1);
  }
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i],
      b = index[i + 1],
      c = index[i + 2];
    if (!hand.mask[a] && !hand.mask[b] && !hand.mask[c]) continue;
    result.sourceTriangles++;
    inspect(vertex(a), vertex(b), vertex(c), i / 3, 0);
  }
  return result;
}
