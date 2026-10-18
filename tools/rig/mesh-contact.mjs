import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  Triangle,
  Ray,
  DoubleSide,
} from "three";
import { MeshBVH, CENTER } from "three-mesh-bvh";

/** Offline exact-source triangle queries. The BVH reorders only its private copy. */
export class MeshContact {
  constructor(positions, indices) {
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(positions), 3),
    );
    this.geometry.setIndex([...indices]);
    this.bvh = new MeshBVH(this.geometry, {
      strategy: CENTER,
      maxLeafTris: 12,
    });
    this.closest = {};
    this.triangle = new Triangle();
    this.delta = new Vector3();
    this.ray = new Ray();
    this.directions = [
      [0.317, 0.719, 0.618],
      [-0.811, 0.239, 0.534],
      [0.431, -0.852, 0.298],
    ].map((p) => new Vector3(...p).normalize());
  }
  distance(point, { parity = false } = {}) {
    const hit = this.bvh.closestPointToPoint(point, this.closest);
    const pos = this.geometry.attributes.position,
      index = this.geometry.index;
    const offset = hit.faceIndex * 3;
    this.triangle.set(
      ...[0, 1, 2].map((k) =>
        new Vector3().fromBufferAttribute(pos, index.getX(offset + k)),
      ),
    );
    const normal = this.triangle.getNormal(new Vector3());
    const nearestInside = this.delta.copy(point).sub(hit.point).dot(normal) < 0;
    let inside = nearestInside,
      ambiguous = false,
      votes;
    if (parity && hit.distance > 1e-7) {
      votes = this.directions.map((direction) => {
        this.ray.set(point, direction);
        const intersections = this.bvh
          .raycast(this.ray, DoubleSide)
          .sort((a, b) => a.distance - b.distance);
        let count = 0,
          last = -Infinity;
        for (const intersection of intersections)
          if (
            intersection.distance > 1e-7 &&
            intersection.distance - last > 1e-6
          ) {
            count++;
            last = intersection.distance;
          }
        return count % 2 === 1;
      });
      const total = votes.filter(Boolean).length;
      inside = total >= 2;
      ambiguous = (total !== 0 && total !== 3) || inside !== nearestInside;
    }
    return {
      distance: hit.distance,
      inside,
      signedDistance: inside ? -hit.distance : hit.distance,
      face: hit.faceIndex,
      closest: hit.point.toArray(),
      normal: normal.toArray(),
      ambiguous,
      votes,
    };
  }
  dispose() {
    this.geometry.dispose();
  }
}
