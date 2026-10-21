import { Matrix4 } from "three";
export const SURFACE_LIMITS = Object.freeze({
  p999: 1.5,
  maximum: 2,
  minimumSourceEdge: 1e-12,
  minimumAreaRatio: 1e-12,
});
export function decodeAttribute(attribute) {
  if (!attribute) throw Error("Missing required skin attribute");
  const values = new Float64Array(
      attribute.getCount() * attribute.getElementSize(),
    ),
    v = [];
  for (let i = 0; i < attribute.getCount(); i++) {
    attribute.getElement(i, v);
    for (let k = 0; k < attribute.getElementSize(); k++) {
      if (!Number.isFinite(v[k])) throw Error("Nonfinite decoded attribute");
      values[i * attribute.getElementSize() + k] = v[k];
    }
  }
  return values;
}
function percentile(values, index) {
  let lo = 0,
    hi = values.length - 1;
  while (lo < hi) {
    const pivot = values[(lo + hi) >>> 1];
    let a = lo,
      b = hi;
    while (a <= b) {
      while (values[a] < pivot) a++;
      while (values[b] > pivot) b--;
      if (a <= b) {
        const v = values[a];
        values[a++] = values[b];
        values[b--] = v;
      }
    }
    if (index <= b) hi = b;
    else if (index >= a) lo = a;
    else break;
  }
  return values[index];
}
function skinPositions(surface) {
  const matrices = surface.joints.map(
      (joint, i) =>
        new Matrix4().copy(joint.matrixWorld).multiply(surface.inverseBind[i])
          .elements,
    ),
    p = surface.positions,
    w = surface.weights,
    j = surface.ids,
    out = surface.posed;
  for (let v = 0; v < surface.count; v++) {
    const x = p[v * 3],
      y = p[v * 3 + 1],
      z = p[v * 3 + 2];
    let a = 0,
      b = 0,
      c = 0;
    for (let k = 0; k < 4; k++) {
      const weight = w[v * 4 + k];
      if (!weight) continue;
      const m = matrices[j[v * 4 + k]];
      a += weight * (m[0] * x + m[4] * y + m[8] * z + m[12]);
      b += weight * (m[1] * x + m[5] * y + m[9] * z + m[13]);
      c += weight * (m[2] * x + m[6] * y + m[10] * z + m[14]);
    }
    if (!Number.isFinite(a + b + c))
      throw Error("Nonfinite skinned vertex " + v);
    out[v * 3] = a;
    out[v * 3 + 1] = b;
    out[v * 3 + 2] = c;
  }
  return out;
}
function doubleArea(p, a, b, c) {
  const x = p[b * 3] - p[a * 3],
    y = p[b * 3 + 1] - p[a * 3 + 1],
    z = p[b * 3 + 2] - p[a * 3 + 2],
    u = p[c * 3] - p[a * 3],
    v = p[c * 3 + 1] - p[a * 3 + 1],
    w = p[c * 3 + 2] - p[a * 3 + 2];
  return Math.hypot(y * w - z * v, z * u - x * w, x * v - y * u);
}
function length(p, a, b) {
  return Math.hypot(
    p[a * 3] - p[b * 3],
    p[a * 3 + 1] - p[b * 3 + 1],
    p[a * 3 + 2] - p[b * 3 + 2],
  );
}
/** Every primitive is measured. Unknown morph/additional influences fail closed. */
export function createRuntimeSurfaces(document, root) {
  root.updateWorldMatrix(true, true);
  const boneNames = new Map();
  root.traverse((n) => {
    if (n.isBone) {
      if (boneNames.has(n.name)) throw Error("Ambiguous bone " + n.name);
      boneNames.set(n.name, n);
    }
  });
  const result = [];
  for (const [nodeIndex, node] of document.getRoot().listNodes().entries()) {
    if (!node.getMesh()) continue;
    const skin = node.getSkin();
    if (!skin)
      throw Error("Body contains unvalidated unskinned mesh " + node.getName());
    const joints = skin.listJoints().map((j) => {
        const b = boneNames.get(j.getName());
        if (!b) throw Error("Missing skin joint " + j.getName());
        return b;
      }),
      ibm = skin.getInverseBindMatrices();
    if (ibm?.getCount() !== joints.length)
      throw Error("Invalid inverse bind matrices");
    for (const [primitiveIndex, primitive] of node
      .getMesh()
      .listPrimitives()
      .entries()) {
      if (primitive.getMode() !== 4 || !primitive.getIndices())
        throw Error("Expected indexed triangle surface");
      if (primitive.listTargets().length)
        throw Error(
          "Morph target evaluation is required; refusing base-only approval",
        );
      if (
        primitive.getAttribute("JOINTS_1") ||
        primitive.getAttribute("WEIGHTS_1")
      )
        throw Error("Additional influences cannot be ignored");
      const positions = decodeAttribute(primitive.getAttribute("POSITION")),
        ids = decodeAttribute(primitive.getAttribute("JOINTS_0")),
        weights = decodeAttribute(primitive.getAttribute("WEIGHTS_0")),
        count = positions.length / 3,
        index = primitive.getIndices().getArray();
      if (
        !Number.isInteger(count) ||
        !count ||
        ids.length !== count * 4 ||
        weights.length !== count * 4 ||
        index.length % 3
      )
        throw Error("Invalid surface layout");
      for (let v = 0; v < count; v++) {
        let total = 0;
        for (let k = 0; k < 4; k++) {
          const at = v * 4 + k;
          if (
            !Number.isInteger(ids[at]) ||
            ids[at] < 0 ||
            ids[at] >= joints.length ||
            weights[at] < 0 ||
            weights[at] > 1
          )
            throw Error("Invalid joint/weight at " + v);
          total += weights[at];
        }
        if (Math.abs(total - 1) > 0.001)
          throw Error("Skin weights do not sum to one at " + v);
      }
      const s = {
        nodeIndex,
        primitiveIndex,
        name: node.getName(),
        primitive,
        positions,
        ids,
        weights,
        count,
        index,
        joints,
        inverseBind: joints.map((j, i) =>
          new Matrix4().fromArray(ibm.getElement(i, [])),
        ),
        posed: new Float64Array(positions.length),
      };
      s.bind = skinPositions(s).slice();
      const keys = new Float64Array(index.length);
      let at = 0;
      for (let i = 0; i < index.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          const a = index[i + k],
            b = index[i + ((k + 1) % 3)];
          if (a >= count || b >= count)
            throw Error("Surface index out of bounds");
          keys[at++] = Math.min(a, b) * count + Math.max(a, b);
        }
      }
      keys.sort();
      let unique = 0,
        degenerateEdges = 0,
        last = -1;
      for (const key of keys) {
        if (key === last) continue;
        last = key;
        const a = Math.floor(key / count),
          b = key - a * count;
        if (length(s.bind, a, b) <= SURFACE_LIMITS.minimumSourceEdge) {
          degenerateEdges++;
          continue;
        }
        keys[unique++] = key;
      }
      s.edges = keys.slice(0, unique);
      s.bindLengths = Float64Array.from(s.edges, (key) => {
        const a = Math.floor(key / count);
        return length(s.bind, a, key - a * count);
      });
      s.ratios = new Float64Array(unique);
      s.bindAreas = new Float64Array(index.length / 3);
      for (let i = 0; i < index.length; i += 3)
        s.bindAreas[i / 3] = doubleArea(
          s.bind,
          index[i],
          index[i + 1],
          index[i + 2],
        );
      s.degenerateEdges = degenerateEdges;
      if (!unique) throw Error("No measurable source edges");
      result.push(s);
    }
  }
  if (!result.length) throw Error("No body surfaces");
  return result;
}
export function measureRuntimeSurface(surface) {
  const posed = skinPositions(surface);
  let maximum = 0,
    minimum = Infinity,
    minY = Infinity,
    worst = null,
    collapsed = 0,
    minimumAreaRatio = Infinity,
    measuredTriangles = 0;
  for (let i = 1; i < posed.length; i += 3) minY = Math.min(minY, posed[i]);
  for (let i = 0; i < surface.edges.length; i++) {
    const key = surface.edges[i],
      a = Math.floor(key / surface.count),
      b = key - a * surface.count,
      dist = length(posed, a, b),
      ratio = dist / surface.bindLengths[i];
    if (!Number.isFinite(ratio)) throw Error("Nonfinite edge ratio");
    surface.ratios[i] = ratio;
    minimum = Math.min(minimum, ratio);
    if (ratio > maximum) {
      maximum = ratio;
      worst = { a, b, bindLength: surface.bindLengths[i], posedLength: dist };
    }
    if (ratio <= SURFACE_LIMITS.minimumAreaRatio) collapsed++;
  }
  for (let i = 0; i < surface.index.length; i += 3) {
    const area = surface.bindAreas[i / 3];
    if (area <= 1e-24) continue;
    measuredTriangles++;
    const ratio =
      doubleArea(
        posed,
        surface.index[i],
        surface.index[i + 1],
        surface.index[i + 2],
      ) / area;
    minimumAreaRatio = Math.min(minimumAreaRatio, ratio);
    if (ratio <= SURFACE_LIMITS.minimumAreaRatio) collapsed++;
  }
  const p999 = percentile(
    surface.ratios,
    Math.floor((surface.ratios.length - 1) * 0.999),
  );
  return {
    passed:
      p999 <= SURFACE_LIMITS.p999 &&
      maximum <= SURFACE_LIMITS.maximum &&
      collapsed === 0 &&
      measuredTriangles > 0,
    p999,
    maximum,
    minimum,
    minimumAreaRatio,
    collapsed,
    minimumY: minY,
    edges: surface.edges.length,
    triangles: measuredTriangles,
    sourceDegenerateEdges: surface.degenerateEdges,
    worst,
  };
}
