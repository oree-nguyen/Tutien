import { usesManualH01, createManualH01, updateManualH01Animation } from './manual-hero.js';
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  buildHeroAnatomy,
  animateHeroAnatomy,
  anatomyCacheStats,
} from "./hero-anatomy.js";
import { buildCreatureVisual, animateCreatureVisual } from "./creature-art.js";
import {
  syncSoulRingVisuals,
  disposeSoulRingVisuals,
} from "./soul-ring-vfx.js";
export {
  buildHeroAnatomy,
  buildMaleHeroAnatomy,
  buildFemaleHeroAnatomy,
  createEllipticalLoftedMesh,
  generateHighResCharacterFaceTexture,
  HERO_APPEARANCE,
} from "./hero-anatomy.js";
const shapes = new Map(),
  templates = new Map();
let maps;
export const DETAIL = {
  high: { radial: 128, sphere: 64, hair: 128, torus: 256 },
  medium: { radial: 12, sphere: 6, hair: 8, torus: 24 },
  low: { radial: 6, sphere: 3, hair: 2, torus: 8 },
};
export {terrainHeight,groundHeight} from './ground-math.js';
import {terrainHeight,groundHeight} from './ground-math.js';
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
export function visualTemplate(a, d = "low") {
  // Browser GLTF textures need an image decoder; CPU-only geometry tooling
  // retains the legacy generator. The imported browser path is tested separately.
  if (typeof document !== "undefined" && usesManualH01(a)) return createManualH01(a, d);
  const key = [
    a.kind,
    a.hero,
    a.boss?.key ?? a.name,
    a.skin ?? 0,
    a.costume ?? 0,
    a.tier ?? 0,
    a.kind === "beast"
      ? (a.species ??
        ["wolf", "rhino", "firebird", "icebutterfly"][Number(a.id) % 4])
      : "",
    Boolean(a.mutant),
    a.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple",
    d,
  ].join(":");
  if (!templates.has(key)) {
    const g = ["hero", "clone"].includes(a.kind)
      ? buildHeroAnatomy(a, d)
      : buildCreatureVisual(a, d);
    g.userData.detail = d;
    templates.set(key, g);
    if (d === "high") {
      const highKeys = [...templates]
        .filter(([, g]) => g.userData.detail === "high")
        .map(([k]) => k);
      if (highKeys.length > 8) {
        const oldest = highKeys[0];
        disposeSoulRingVisuals(templates.get(oldest));
        templates.get(oldest).traverse((o) => {
          if (o.isMesh && !o.geometry.userData.sharedArt) o.geometry.dispose();
        });
        templates.delete(oldest);
      }
    }
  }
  const copy = templates.get(key).clone(true);
  if (copy.userData.anatomy) syncSoulRingVisuals(copy, a, d, 0);
  return copy;
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
  if (root.userData.manualHunyuan) syncSoulRingVisuals(root, a, root.userData.detail, time);
  const speed = Math.min(
    1,
    Math.hypot(
      a.x - (root.userData.lastX ?? a.x),
      a.z - (root.userData.lastZ ?? a.z),
    ) /
      Math.max(dt, 0.001) /
      4,
  );
  if (root.userData.manualHunyuan) updateManualH01Animation(root, a, speed, dt);
  if (root.userData.anatomy) animateHeroAnatomy(root, a, time, speed);
  if (root.userData.creatureArt) animateCreatureVisual(root, a, time, dt);
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
    materials: anatomyCacheStats().materials,
    textureSize: anatomyCacheStats().textureSize,
    anatomy: anatomyCacheStats(),
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
