import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HEROES } from "./data.js";
const shapes = new Map(),
  templates = new Map(),
  materials = new Map();
let maps;
export const DETAIL = {
  high: { radial: 128, sphere: 64, hair: 128, torus: 256 },
  medium: { radial: 12, sphere: 6, hair: 8, torus: 24 },
  low: { radial: 6, sphere: 3, hair: 2, torus: 8 },
};
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z),
    fade = T.MathUtils.smoothstep(r, 15, 24);
  return (
    fade *
    T.MathUtils.smoothstep(
      Math.min(Math.abs(x) / 10, Math.abs(z) / 6),
      1,
      1.8,
    ) *
    (Math.sin(x * 0.045) * Math.cos(z * 0.057) * 0.8 +
      Math.sin((x + z) * 0.09) * 0.18 +
      3.2 *
        Math.exp(-((x + 52) ** 2 + (z + 44) ** 2) / 650) *
        (0.7 + 0.3 * Math.sin((x - z) * 0.22)) +
      2.1 * Math.exp(-(x * x + (z + 72) ** 2) / 500) -
      1.8 *
        Math.exp(
          -(((x + 62 + Math.sin(z * 0.1) * 3) / 4) ** 2) - ((z + 20) / 25) ** 2,
        ))
  );
}
export const groundHeight = (x, z) =>
  Math.hypot(x, z) < 14 ? 0.83 : terrainHeight(x, z) + 0.08;
export function projectGround(ray) {
  if (ray.direction.y >= -0.00001) return null;
  let near = 0,
    far = Math.max(0, (-10 - ray.origin.y) / ray.direction.y);
  const point = new T.Vector3();
  for (let i = 0; i < 32; i++) {
    const t = (near + far) / 2;
    ray.at(t, point);
    if (point.y > groundHeight(point.x, point.z)) near = t;
    else far = t;
  }
  return ray.at((near + far) / 2, point);
}
function geometry(key, create) {
  if (!shapes.has(key)) {
    const g = create();
    g.computeVertexNormals();
    g.userData.sharedArt = true;
    shapes.set(key, g);
  }
  return shapes.get(key);
}
function sphere(d) {
  const s = DETAIL[d].sphere;
  return geometry("sphere" + d, () => new T.SphereGeometry(1, s * 2, s));
}
function cylinder(d) {
  const s = DETAIL[d].radial;
  return geometry("cylinder" + d, () => new T.CylinderGeometry(1, 1, 1, s, 2));
}
function textureMaps() {
  if (maps) return maps;
  const n = 1024,
    heights = new Float32Array(n * n),
    height = new Uint8Array(n * n * 4),
    normal = new Uint8Array(n * n * 4),
    rough = new Uint8Array(n * n * 4),
    metal = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      heights[y * n + x] =
        0.5 +
        0.18 * Math.sin(x * 0.16) * Math.sin(y * 0.16) +
        0.08 * Math.sin((x + y) * 0.035);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        k = i * 4,
        h = heights[i],
        dx =
          heights[y * n + ((x + 1) % n)] - heights[y * n + ((x + n - 1) % n)],
        dy =
          heights[((y + 1) % n) * n + x] - heights[((y + n - 1) % n) * n + x];
      height.set([h * 255, h * 255, h * 255, 255], k);
      normal.set([128 - dx * 180, 128 - dy * 180, 252, 255], k);
      rough.set([h * 255, (0.4 + h * 0.4) * 255, h * 255, 255], k);
      metal.set([255, 255, 220 + h * 35, 255], k);
    }
  const tex = (data) => {
    const t = new T.DataTexture(data, n, n, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.needsUpdate = true;
    return t;
  };
  maps = {
    normal: tex(normal),
    roughness: tex(rough),
    metalness: tex(metal),
    height: tex(height),
  };
  return maps;
}
function mat(color, type, d, skin = 0) {
  const key = [color, type, d, skin].join(":");
  if (materials.has(key)) return materials.get(key);
  const high = d === "high",
    m = new T.MeshPhysicalMaterial({
      color,
      roughness: type === "metal" ? 0.3 : 0.62,
      metalness: type === "metal" ? 0.8 : 0.08,
      clearcoat: high ? 1 : 0.15,
      sheen: high && type === "cloth" ? 1 : 0,
      sheenColor: new T.Color(color),
      iridescence: high && skin === 2 ? 0.4 : 0,
      transmission: high && type === "jade" ? 0.85 : 0,
      thickness: type === "jade" ? 0.08 : 0,
      emissive: type === "glow" ? color : 0,
      emissiveIntensity: type === "glow" ? 1.5 : 0,
      flatShading: false,
    });
  if (high) {
    const t = textureMaps();
    Object.assign(m, {
      normalMap: t.normal,
      roughnessMap: t.roughness,
      metalnessMap: t.metalness,
      bumpMap: t.height,
      bumpScale: 0.012,
      displacementMap: t.height,
      displacementScale: 0.003,
    });
    m.normalScale.set(0.25, 0.25);
  }
  m.userData.sharedArt = true;
  materials.set(key, m);
  return m;
}
function part(
  parent,
  geo,
  material,
  p = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const m = new T.Mesh(geo, material);
  m.position.set(...p);
  m.scale.set(...scale);
  m.rotation.set(...rotation);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function tube(parent, points, r, material, d, taper = false) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
    s = DETAIL[d];
  const g = new T.TubeGeometry(curve, s.hair, r, d === "high" ? 32 : 4, false);
  if (taper) {
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const u =
          Math.floor(i / (g.parameters.radialSegments + 1)) /
          g.parameters.tubularSegments,
        c = curve.getPointAt(u);
      v.setXYZ(
        i,
        c.x + (v.getX(i) - c.x) * (1 - u * 0.85),
        c.y + (v.getY(i) - c.y) * (1 - u * 0.85),
        c.z + (v.getZ(i) - c.z) * (1 - u * 0.85),
      );
    }
    g.computeVertexNormals();
  }
  return part(parent, g, material);
}
function ring(
  parent,
  r,
  tubeRadius,
  material,
  d,
  p = [0, 0, 0],
  rot = [0, 0, 0],
) {
  return part(
    parent,
    geometry(
      `ring:${r}:${tubeRadius}:${d}`,
      () =>
        new T.TorusGeometry(
          r,
          tubeRadius,
          d === "high" ? 64 : d === "medium" ? 6 : 3,
          DETAIL[d].torus,
        ),
    ),
    material,
    p,
    [1, 1, 1],
    rot,
  );
}
function joint(parent, name, pos) {
  const g = new T.Group();
  g.name = name;
  g.position.set(...pos);
  parent.add(g);
  return g;
}
function mergeParts(group) {
  for (const child of [...group.children]) if (child.isGroup) mergeParts(child);
  const buckets = new Map();
  for (const m of group.children.filter((c) => c.isMesh)) {
    m.updateMatrix();
    const geo = m.geometry.clone();
    geo.applyMatrix4(m.matrix);
    const converted = geo.index ? geo.toNonIndexed() : geo;
    if (converted !== geo) geo.dispose();
    const a = buckets.get(m.material) ?? [];
    a.push(converted);
    buckets.set(m.material, a);
    group.remove(m);
  }
  for (const [material, list] of buckets) {
    const g = mergeGeometries(list, false);
    if (!g) throw Error("Art geometry attributes mismatch");
    g.userData.sharedArt = true;
    list.forEach((g) => g.dispose());
    part(group, g, material);
  }
}
function weapon(parent, h, d, color, skin) {
  const g = joint(parent, "soulWeapon", [0, -0.13, 0]),
    gold = mat(skin === 2 ? 0xffcd69 : 0xa4bca7, "metal", d, skin),
    energy = mat(color, "glow", d, skin),
    jade = mat(color, "jade", d, skin),
    rod = (p, s) => part(g, cylinder(d), gold, p, s);
  if ([0, 3, 11].includes(h)) {
    rod([0, 0.37, 0], [0.024, 1.15, 0.024]);
    ring(g, 0.17, 0.018, gold, d, [0, 0.94, 0]);
    part(
      g,
      sphere(d === "high" ? "medium" : d),
      jade,
      [0, 0.94, 0],
      [0.12, 0.17, 0.1],
    );
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094;
      tube(
        g,
        [
          [0, 0.7, 0],
          [Math.cos(a) * 0.18, 0.9, Math.sin(a) * 0.18],
          [Math.cos(a) * 0.08, 1.15, Math.sin(a) * 0.08],
        ],
        0.018,
        gold,
        d,
        true,
      );
    }
    if (h === 3)
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.22;
        tube(
          g,
          [
            [0, 0.45, 0],
            [Math.sin(a) * 0.5, 0.85, 0],
            [Math.sin(a) * 0.6, 1.1, 0],
          ],
          0.035,
          energy,
          d,
          true,
        );
      }
  }
  if (h === 1) {
    rod([0, 0.3, 0], [0.04, 0.9, 0.04]);
    part(
      g,
      sphere(d === "high" ? "medium" : d),
      gold,
      [0, 0.8, 0],
      [0.3, 0.18, 0.18],
    );
    ring(g, 0.19, 0.035, energy, d, [0, 0.8, 0], [0, Math.PI / 2, 0]);
  }
  if (h === 2) {
    for (const side of [-1, 1]) {
      rod([side * 0.09, 0, 0], [0.025, 0.25, 0.025]);
      tube(
        g,
        [
          [side * 0.09, 0.1, 0],
          [side * 0.16, 0.35, 0],
          [side * 0.03, 0.63, 0],
        ],
        0.055,
        gold,
        d,
        true,
      );
    }
  }
  if ([4, 5].includes(h)) {
    part(
      g,
      sphere(d === "high" ? "medium" : d),
      h === 4 ? jade : gold,
      [0, 0.3, 0],
      [h === 5 ? 0.35 : 0.25, 0.37, 0.065],
    );
    ring(g, h === 5 ? 0.33 : 0.25, 0.025, gold, d, [0, 0.3, 0.075]);
  }
  if ([6, 7].includes(h)) {
    ring(g, 0.26, 0.028, gold, d, [0, 0.4, 0]);
    for (let i = 0; i < (h === 6 ? 8 : 6); i++) {
      const a = (i * 2 * Math.PI) / (h === 6 ? 8 : 6);
      part(
        g,
        sphere(d === "high" ? "medium" : d),
        jade,
        [Math.cos(a) * 0.23, 0.4 + Math.sin(a) * 0.23, 0],
        [0.045, 0.1, 0.035],
        [0, 0, a],
      );
    }
  }
  if (h === 8) {
    tube(
      g,
      [
        [0, -0.2, 0],
        [-0.23, 0.05, 0],
        [-0.27, 0.4, 0],
        [0, 0.7, 0],
      ],
      0.025,
      gold,
      d,
    );
    tube(
      g,
      [
        [0, -0.2, 0],
        [0.015, 0.25, 0],
        [0, 0.7, 0],
      ],
      0.005,
      energy,
      d,
    );
    rod([0, 0.25, 0], [0.018, 0.5, 0.018]);
  }
  if (h === 9) {
    for (let i = 0; i < 3; i++)
      tube(
        g,
        [
          [i * 0.065 - 0.065, 0, 0],
          [i * 0.065 - 0.065, 0.2, 0.07],
          [i * 0.08 - 0.08, 0.4, 0.13],
        ],
        0.022,
        gold,
        d,
        true,
      );
  }
  if (h === 10) {
    part(
      g,
      sphere(d === "high" ? "medium" : d),
      gold,
      [0, 0.25, 0],
      [0.2, 0.45, 0.055],
    );
    for (let i = 0; i < 7; i++)
      tube(
        g,
        [
          [-0.12 + i * 0.04, -0.04, 0.06],
          [-0.12 + i * 0.04, 0.55, 0.06],
        ],
        0.003,
        energy,
        d,
      );
  }
  if (skin)
    for (let i = 0; i < (skin === 2 ? 5 : 2); i++)
      part(
        g,
        sphere(d === "high" ? "medium" : d),
        energy,
        [Math.sin(i * 2.4) * 0.08, 0.08 + i * 0.1, 0.06],
        [0.025, 0.035, 0.025],
      );
  return g;
}
function humanoid(a, d) {
  const h = a.hero,
    costume = a.costume ?? 0,
    skin = a.skin ?? 0,
    s = DETAIL[d],
    root = new T.Group();
  const color = new T.Color(HEROES[h].color)
      .offsetHSL(
        costume * 0.065,
        costume === 2 ? 0.1 : 0,
        costume === 1 ? -0.1 : costume === 3 ? 0.08 : 0,
      )
      .getHex(),
    cloth = mat(color, "cloth", d, skin),
    gold = mat(skin === 2 ? 0xeac37a : 0x9da991, "metal", d, skin),
    flesh = mat(0xe5c6ad, "skin", d),
    hair = mat(h === 7 ? 0xc9e9f0 : 0x20313c, "cloth", d),
    glow = mat(color, "glow", d, skin),
    sp = sphere(d === "high" ? "medium" : d);
  const body = joint(root, "torso", [0, 0.86, 0]);
  const pts = [
    [0.24, -0.35],
    [0.32, -0.16],
    [0.24, 0.04],
    [0.34, 0.24],
    [0.29, 0.44],
    [0.12, 0.51],
  ].map((p) => new T.Vector2(...p));
  part(
    body,
    geometry("torso" + d, () => new T.LatheGeometry(pts, s.radial)),
    cloth,
  );
  part(body, sp, gold, [0, 0.17, -0.31], [0.26, 0.27, 0.045]);
  for (let i = 0; i < 3; i++)
    part(
      body,
      sp,
      gold,
      [0, -0.06 - i * 0.1, -0.25],
      [0.18 - i * 0.025, 0.04, 0.04],
    );
  for (const side of [-1, 1]) {
    part(body, sp, gold, [side * 0.31, 0.36, 0], [0.19, 0.13, 0.22]);
    part(body, sp, gold, [side * 0.14, 0.18, -0.23], [0.16, 0.2, 0.045]);
    const leg = joint(root, side < 0 ? "legLeft" : "legRight", [
      side * 0.15,
      0.67,
      0,
    ]);
    part(leg, cylinder(d), cloth, [0, -0.18, 0], [0.105, 0.36, 0.11]);
    part(leg, sp, gold, [0, -0.35, -0.04], [0.12, 0.095, 0.1]);
    const knee = joint(leg, side < 0 ? "kneeLeft" : "kneeRight", [0, -0.35, 0]);
    part(knee, cylinder(d), cloth, [0, -0.16, 0], [0.08, 0.3, 0.085]);
    part(knee, sp, gold, [0, -0.3, -0.055], [0.11, 0.075, 0.18]);
    const arm = joint(root, side < 0 ? "armLeft" : "armRight", [
      side * 0.38,
      1.22,
      0,
    ]);
    part(
      arm,
      cylinder(d),
      cloth,
      [side * 0.035, -0.16, 0],
      [0.082, 0.31, 0.09],
      [0, 0, side * 0.12],
    );
    part(arm, sp, gold, [side * 0.07, -0.32, 0], [0.085, 0.09, 0.085]);
    const elbow = joint(arm, side < 0 ? "elbowLeft" : "elbowRight", [
      side * 0.07,
      -0.32,
      0,
    ]);
    part(elbow, cylinder(d), gold, [0, -0.11, -0.025], [0.07, 0.23, 0.075]);
    part(elbow, sp, flesh, [0, -0.25, -0.035], [0.075, 0.085, 0.04]);
    if (d !== "low")
      for (let f = 0; f < 5; f++) {
        const x = (f - 2) * 0.023;
        tube(
          elbow,
          [
            [x, -0.25, -0.06],
            [x, -0.31, -0.09],
            [x, -0.35, -0.045],
          ],
          f === 0 ? 0.013 : 0.009,
          flesh,
          d,
        );
      }
    if (side === 1) weapon(elbow, h, d, color, skin);
  }
  const head = joint(root, "head", [0, 1.61, 0]);
  part(head, sphere(d), flesh, [0, 0, 0], [0.19, 0.245, 0.18]);
  part(head, sp, flesh, [0, -0.035, -0.18], [0.035, 0.06, 0.045]);
  for (const side of [-1, 1]) {
    part(head, sp, flesh, [side * 0.19, -0.005, 0], [0.035, 0.07, 0.05]);
    part(
      head,
      sp,
      mat(0xdfece4, "skin", d),
      [side * 0.075, 0.025, -0.157],
      [0.047, 0.027, 0.026],
    );
    part(head, sp, glow, [side * 0.075, 0.025, -0.179], [0.016, 0.02, 0.009]);
    if (d !== "low")
      tube(
        head,
        [
          [side * 0.035, 0.07, -0.175],
          [side * 0.08, 0.085, -0.17],
          [side * 0.12, 0.055, -0.155],
        ],
        0.012,
        hair,
        d,
      );
  }
  const hairs = d === "low" ? 4 : d === "medium" ? 10 : 24;
  part(head, sp, hair, [0, 0.16, 0], [0.196, 0.12, 0.185]);
  for (let i = 0; i < hairs; i++) {
    const a = (i / hairs) * Math.PI * 2,
      layer = i % 3,
      front = Math.cos(a) < -0.45;
    tube(
      head,
      [
        [Math.sin(a) * 0.12, 0.18, Math.cos(a) * 0.12],
        [
          Math.sin(a) * 0.2,
          front ? 0.15 : 0.06 - layer * 0.025,
          Math.cos(a) * 0.19,
        ],
        [
          Math.sin(a) * (0.2 + layer * 0.02),
          front ? 0.085 : -0.18 - layer * 0.1,
          Math.cos(a) * 0.21 + 0.025,
        ],
      ],
      0.022 + layer * 0.008,
      hair,
      d,
      true,
    );
  }
  tube(
    head,
    [
      [-0.06, -0.105, -0.153],
      [0, -0.12, -0.17],
      [0.06, -0.105, -0.153],
    ],
    0.008,
    mat(0x96665c, "skin", d),
    d,
  );
  ring(head, 0.2, 0.025, gold, d, [0, 0.18, 0], [Math.PI / 2, 0, 0]);
  if (h === 2)
    for (const side of [-1, 1])
      part(
        head,
        geometry(
          "foxEar" + d,
          () => new T.ConeGeometry(0.09, 0.3, DETAIL[d].radial),
        ),
        cloth,
        [side * 0.15, 0.29, 0],
        [1, 1, 0.55],
        [0, 0, -side * 0.18],
      );
  if (d !== "low") {
    const geo = new T.PlaneGeometry(
        0.75,
        0.85,
        d === "high" ? 64 : 8,
        d === "high" ? 64 : 8,
      ),
      v = geo.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const x = v.getX(i),
        y = v.getY(i);
      v.setXYZ(
        i,
        x * (1 - (y + 0.425) * 0.32),
        y,
        Math.sin(x * 18) * 0.045 + (y + 0.425) * 0.16,
      );
    }
    geo.computeVertexNormals();
    const cape = joint(root, "cape", [0, 0.85, 0.23]);
    part(cape, geo, cloth, [0, -0.1, 0], [1, 1, 1], [0, Math.PI, 0]);
  }
  if ([2, 9, 11].includes(h))
    for (let i = 0; i < (h === 2 ? 3 : 1); i++) {
      const tail = joint(root, "tail" + i, [(i - 1) * 0.12, 0.64, 0.22]);
      tube(
        tail,
        [
          [0, 0, 0],
          [0.1 * (i - 1), -0.2, 0.4],
          [0.2 * (i - 1), -0.05, 0.7],
        ],
        h === 11 ? 0.035 : 0.07,
        cloth,
        d,
        true,
      );
    }
  if ([3, 7].includes(h))
    for (const side of [-1, 1]) {
      const wing = joint(root, "wing" + side, [side * 0.26, 1.25, 0.17]);
      for (let i = 0; i < 5; i++)
        part(
          wing,
          sp,
          cloth,
          [side * (0.22 + i * 0.055), 0.1 + i * 0.05, 0.04 * i],
          [0.1, 0.42 - i * 0.035, 0.035],
          [0, 0, -side * (0.7 + i * 0.1)],
        );
    }
  if (h === 5)
    part(root, sp, mat(0x306e68, "metal", d), [0, 1, 0.31], [0.48, 0.53, 0.18]);
  if (h === 1)
    for (const side of [-1, 1])
      part(
        head,
        geometry("horn" + d, () => new T.ConeGeometry(0.08, 0.3, s.radial)),
        gold,
        [side * 0.16, 0.32, 0],
      );
  if ([0, 4, 6, 10].includes(h))
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      part(
        head,
        sp,
        glow,
        [Math.sin(a) * 0.2, 0.22 + Math.cos(a) * 0.08, Math.cos(a) * 0.14],
        [0.035, 0.11, 0.04],
        [0, 0, -a],
      );
    }
  if (costume === 1)
    for (const side of [-1, 1])
      part(root, sp, gold, [side * 0.3, 1.31, 0.05], [0.23, 0.12, 0.23]);
  if (costume === 2) ring(root, 0.36, 0.025, gold, d, [0, 1.9, 0.1]);
  if (costume === 3)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      part(
        root,
        sp,
        glow,
        [Math.sin(a) * 0.44, 1.3 + Math.cos(a) * 0.25, Math.cos(a) * 0.3],
        [0.035, 0.05, 0.035],
      );
    }
  const haloMaterial = mat(
    a.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? 0x8e76b8 : 0x975ad7,
    "glow",
    d,
  );
  for (let i = 0; i < 3; i++) {
    const halo = joint(root, "halo" + i, [0, 0.055 + i * 0.008, 0]);
    ring(
      halo,
      0.58 + i * 0.07,
      0.012,
      haloMaterial,
      d,
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    if (d === "high")
      for (let j = 0; j < 16; j++) {
        const a = (j * Math.PI) / 8;
        part(
          halo,
          cylinder(d),
          gold,
          [Math.cos(a) * (0.58 + i * 0.07), 0, Math.sin(a) * (0.58 + i * 0.07)],
          [0.007, 0.035, 0.007],
          [0, 0, Math.PI / 2],
        );
      }
    if (d !== "low")
      for (let j = 0; j < 4; j++) {
        const a = (j * Math.PI) / 2;
        part(
          halo,
          sp,
          glow,
          [
            Math.cos(a) * (0.58 + i * 0.07),
            0.05 + j * 0.012,
            Math.sin(a) * (0.58 + i * 0.07),
          ],
          [0.018, 0.018, 0.018],
        );
      }
  }
  if (d !== "low") {
    const backHalo = joint(root, "backHalo", [0, 1.15, 0.31]);
    ring(backHalo, 0.47, 0.009, haloMaterial, d);
    for (let j = 0; j < 8; j++) {
      const angle = (j * Math.PI) / 4;
      part(
        backHalo,
        sp,
        glow,
        [Math.cos(angle) * 0.47, Math.sin(angle) * 0.47, 0],
        [0.015, 0.027, 0.015],
      );
    }
  }
  root.userData.artHero = h;
  mergeParts(root);
  return root;
}
function creature(a, d) {
  const root = new T.Group(),
    boss = a.kind === "boss",
    kind =
      a.boss?.key ??
      (a.name?.includes("Long")
        ? "dragon"
        : a.name?.includes("Lân")
          ? "kirin"
          : "ape"),
    sp = sphere(d === "high" ? "medium" : d),
    color =
      kind === "dragon" ? 0x7250a8 : kind === "kirin" ? 0xb15936 : 0x746a4a,
    skin = mat(color, "skin", d),
    gold = mat(0xb9a77c, "metal", d),
    energy = mat(
      kind === "dragon" ? 0xb77aff : kind === "kirin" ? 0xff9655 : 0xb2d285,
      "glow",
      d,
    );
  if (kind === "dragon" && boss) {
    for (let i = 0; i < 10; i++)
      part(
        root,
        sp,
        skin,
        [Math.sin(i * 0.5) * 0.35, 0.5 + i * 0.13, (i - 4) * 0.3],
        [0.3 - i * 0.018, 0.27 - i * 0.015, 0.33],
      );
  } else
    part(
      root,
      sp,
      skin,
      [0, 0.7, 0],
      [kind === "ape" ? 0.56 : 0.35, 0.6, kind === "ape" ? 0.3 : 0.65],
    );
  part(root, sphere(d), skin, [0, 1.3, -0.32], [0.3, 0.3, 0.32]);
  if (boss && d === "high")
    for (const side of [-1, 1])
      part(root, sphere(d), skin, [side * 0.36, 1, 0.05], [0.24, 0.32, 0.26]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const g = joint(root, "leg" + side + i, [
        side * (kind === "ape" ? 0.43 : 0.26),
        0.7,
        (i - 0.5) * 0.62,
      ]);
      part(
        g,
        cylinder(d),
        skin,
        [0, -0.24, 0],
        [kind === "ape" ? 0.17 : 0.11, 0.55, 0.13],
      );
      part(g, sp, gold, [0, -0.52, -0.06], [0.15, 0.09, 0.2]);
    }
    part(root, sp, energy, [side * 0.13, 1.38, -0.57], [0.05, 0.035, 0.025]);
    tube(
      root,
      [
        [side * 0.2, 1.45, -0.2],
        [side * 0.32, 1.75, -0.1],
        [side * 0.2, 1.95, 0.1],
      ],
      0.06,
      gold,
      d,
      true,
    );
    for (let i = 0; i < 3; i++)
      tube(
        root,
        [
          [side * 0.2 + (i - 1) * 0.07, 0.1, -0.3],
          [side * 0.2 + (i - 1) * 0.07, 0.08, -0.55],
        ],
        0.035,
        gold,
        d,
        true,
      );
    if (kind === "dragon" && boss)
      for (let i = 0; i < 4; i++)
        tube(
          root,
          [
            [side * 0.2, 1, 0.3],
            [side * (0.8 + i * 0.1), 1.7 - i * 0.12, 0.45],
            [side * (1.2 - i * 0.07), 0.9 + i * 0.1, 0.6],
          ],
          0.065,
          skin,
          d,
          true,
        );
  }
  if (d !== "low")
    for (let i = 0; i < (boss ? 24 : 6); i++) {
      const t = i / 24,
        a = i * 2.4;
      part(
        root,
        sp,
        gold,
        [Math.cos(a) * 0.37, 0.4 + t * 0.8, Math.sin(a) * 0.38],
        [0.09, 0.035, 0.1],
      );
    }
  root.scale.setScalar(boss ? 2.5 : a.tier ? 1.2 : 0.85);
  mergeParts(root);
  return root;
}
export function visualTemplate(a, d = "low") {
  const key = [
    a.kind,
    a.hero,
    a.boss?.key ?? a.name,
    a.skin ?? 0,
    a.costume ?? 0,
    a.tier ?? 0,
    a.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple",
    d,
  ].join(":");
  if (!templates.has(key)) {
    const g = ["hero", "clone"].includes(a.kind)
      ? humanoid(a, d)
      : creature(a, d);
    g.userData.detail = d;
    templates.set(key, g);
    if (d === "high") {
      const highKeys = [...templates]
        .filter(([, g]) => g.userData.detail === "high")
        .map(([k]) => k);
      if (highKeys.length > 8) {
        const oldest = highKeys[0];
        templates.get(oldest).traverse((o) => {
          if (o.isMesh) o.geometry.dispose();
        });
        templates.delete(oldest);
      }
    }
  }
  return templates.get(key).clone(true);
}
export function triangleCount(root) {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh)
      n +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  return n;
}
export function animateVisual(root, a, time, dt) {
  const speed = Math.min(
    1,
    Math.hypot(
      a.x - (root.userData.lastX ?? a.x),
      a.z - (root.userData.lastZ ?? a.z),
    ) /
      Math.max(dt, 0.001) /
      4,
  );
  root.traverse((o) => {
    if (o.name === "legLeft") o.rotation.x = Math.sin(time * 10) * speed * 0.5;
    if (o.name === "legRight")
      o.rotation.x = -Math.sin(time * 10) * speed * 0.5;
    if (o.name === "armRight")
      o.rotation.x =
        -0.2 -
        Math.sin(time * 10) * speed * 0.2 -
        (a.cooldowns?.[5] > 0.6 ? 0.45 : 0);
    if (o.name === "armLeft") o.rotation.x = Math.sin(time * 10) * speed * 0.2;
    if (o.name.startsWith("knee"))
      o.rotation.x =
        Math.max(
          0,
          Math.sin(time * 10 + (o.name === "kneeLeft" ? 0 : Math.PI)),
        ) *
        speed *
        0.5;
    if (o.name.startsWith("elbow"))
      o.rotation.x =
        -0.15 - (a.cooldowns?.[5] > 0.6 ? 0.35 : 0) + Math.sin(time * 6) * 0.03;
    if (o.name.startsWith("leg") && !["legLeft", "legRight"].includes(o.name))
      o.rotation.x =
        Math.sin(time * 9 + (o.name.endsWith("0") ? 0 : Math.PI)) *
        speed *
        0.35;
    if (o.name.startsWith("halo"))
      o.rotation.y = time * (Number(o.name.slice(4)) % 2 ? -1 : 1) * 0.2;
    if (o.name === "backHalo") o.rotation.z = -time * 0.18;
    if (o.name.startsWith("tail")) o.rotation.z = Math.sin(time * 3) * 0.12;
    if (o.name === "cape") o.rotation.x = Math.sin(time * 2) * 0.07;
  });
  root.userData.lastX = a.x;
  root.userData.lastZ = a.z;
}
export function artCacheStats() {
  return {
    templates: templates.size,
    geometries: shapes.size,
    materials: materials.size,
    textureSize: maps?.normal.image.width ?? 0,
  };
}

export function roundedBlock(w = 1, h = 1, d = 1) {
  const r = Math.min(w, h, d) * 0.16,
    shape = new T.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new T.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: false,
    curveSegments: 8,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

export function treeTrunkGeometry() {
  return geometry("tree-root-branches", () => {
    const pieces = [new T.CylinderGeometry(0.65, 1, 1, 24, 8)];
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7,
        root = i < 4;
      const pts = root
        ? [
            [0, -0.38, 0],
            [Math.cos(a) * 0.8, -0.5, Math.sin(a) * 0.8],
            [Math.cos(a) * 2, -0.52, Math.sin(a) * 2],
          ]
        : [
            [0, 0.05, 0],
            [Math.cos(a) * 0.65, 0.32, Math.sin(a) * 0.65],
            [Math.cos(a) * 1.4, 0.55, Math.sin(a) * 1.4],
          ];
      pieces.push(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))),
          16,
          root ? 0.16 : 0.1,
          8,
          false,
        ),
      );
    }
    const plain = pieces.map((g) => (g.index ? g.toNonIndexed() : g)),
      merged = mergeGeometries(plain);
    pieces.forEach((g) => g.dispose());
    plain.forEach((g) => g.dispose());
    return merged;
  });
}

export { textureMaps as proceduralMaps };
