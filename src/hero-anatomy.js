import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildSoulWeapon, animateSoulWeapons } from "./weapons.js";
import { characterPBR } from "./character-pbr.js";
import { syncSoulRingVisuals } from "./soul-ring-vfx.js";

const faceCache = new Map(),
  materialCache = new Map(),
  meshCache = new Map();
const Q = { high: [128, 128], medium: [8, 10], low: [3, 6] };
const silkMaterials = new Map(),
  silkTime = { value: 0 };
function flowingSilk(base) {
  if (silkMaterials.has(base.uuid)) return silkMaterials.get(base.uuid);
  const m = base.clone();
  m.onBeforeCompile = (shader) => {
    shader.uniforms.hgSilkTime = silkTime;
    shader.vertexShader = "uniform float hgSilkTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float hgHem = pow(1.0 - uv.y, 1.5);
      transformed.z += sin(hgSilkTime * 2.5 + position.y * 7.0 + position.x * 13.0) * 0.012 * hgHem;
      transformed.x += sin(hgSilkTime * 1.8 + position.y * 5.0) * 0.007 * hgHem;
    `,
    );
  };
  m.customProgramCacheKey = () => "hanfu-silk-wind-v1";
  m.userData.sharedArt = true;
  m.userData.animatedSilk = true;
  silkMaterials.set(base.uuid, m);
  return m;
}
let textileMaps;
function garmentMaps() {
  if (textileMaps) return textileMaps;
  const size = 1024,
    normal = new Uint8Array(size * size * 4),
    rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = (y * size + x) * 4,
        n = Math.sin(x * 0.9) * Math.cos(y * 0.8);
      normal.set([128 + n * 8, 128 - n * 8, 253, 255], k);
      const r = 175 + Math.sin((x + y) * 0.5) * 22;
      rough.set([r, r, r, 255], k);
    }
  const tex = (data) => {
    const t = new THREE.DataTexture(data, size, size);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  };
  return (textileMaps = { normal: tex(normal), roughness: tex(rough) });
}
export const HERO_APPEARANCE = [
  {
    gender: "male",
    height: 1.82,
    outer: 0x065f46,
    inner: 0xecfdf5,
    gold: 0xd4af37,
    hair: 0x132f27,
    eye: "#10B981",
    robe: 1.05,
    style: "scholar",
    hairLength: 0.6,
  },
  {
    gender: "male",
    height: 1.92,
    outer: 0x1e293b,
    inner: 0x473324,
    gold: 0xb45309,
    hair: 0x181d25,
    eye: "#F59E0B",
    robe: 0.42,
    style: "mountain",
    hairLength: 0.15,
  },
  {
    gender: "female",
    height: 1.68,
    outer: 0x3b0764,
    inner: 0x0f172a,
    gold: 0xe2e8f0,
    hair: 0xd9d3ed,
    eye: "#C084FC",
    robe: 0.48,
    style: "fox",
    hairLength: 0.78,
  },
  {
    gender: "male",
    height: 1.83,
    outer: 0xf8fafc,
    inner: 0x0284c7,
    gold: 0xe4bf69,
    hair: 0xd2e8f2,
    eye: "#38BDF8",
    robe: 0.96,
    style: "thunder",
    hairLength: 0.48,
  },
  {
    gender: "female",
    height: 1.69,
    outer: 0xeff6ff,
    inner: 0xbae6fd,
    gold: 0xfacc15,
    hair: 0x131929,
    eye: "#FDE047",
    robe: 1.08,
    style: "moon",
    hairLength: 0.84,
  },
  {
    gender: "male",
    height: 1.98,
    outer: 0x0f3d3e,
    inner: 0x164e50,
    gold: 0xca8a04,
    hair: 0x142125,
    eye: "#0EA5E9",
    robe: 0.61,
    style: "turtle",
    hairLength: 0.22,
  },
  {
    gender: "male",
    height: 1.82,
    outer: 0x7f1d1d,
    inner: 0x25171d,
    gold: 0xf59e0b,
    hair: 0xb82f20,
    eye: "#EF4444",
    robe: 0.8,
    style: "fire",
    hairLength: 0.39,
  },
  {
    gender: "female",
    height: 1.7,
    outer: 0xecfeff,
    inner: 0x1e3a8a,
    gold: 0xa5e9f6,
    hair: 0xe0f5fb,
    eye: "#67E8F9",
    robe: 1.12,
    style: "ice",
    hairLength: 1.28,
  },
  {
    gender: "female",
    height: 1.7,
    outer: 0x1e1b4b,
    inner: 0x3b82f6,
    gold: 0xcbd5e1,
    hair: 0x122139,
    eye: "#818CF8",
    robe: 0.53,
    style: "ranger",
    hairLength: 0.75,
  },
  {
    gender: "male",
    height: 1.85,
    outer: 0xf1f5f9,
    inner: 0x756039,
    gold: 0xeab308,
    hair: 0x9b732d,
    eye: "#FBBF24",
    robe: 0.54,
    style: "tiger",
    hairLength: 0.28,
  },
  {
    gender: "female",
    height: 1.67,
    outer: 0xd1fae5,
    inner: 0xf8fffd,
    gold: 0xfdba74,
    hair: 0x172b2a,
    eye: "#34D399",
    robe: 1.03,
    style: "music",
    hairLength: 0.85,
  },
  {
    gender: "male",
    height: 1.84,
    outer: 0x2e1065,
    inner: 0x10141d,
    gold: 0xa88ab8,
    hair: 0xb9a9d4,
    eye: "#A855F7",
    robe: 1.02,
    style: "snake",
    hairLength: 0.86,
  },
];
function group(parent, name, pos = [0, 0, 0], role) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...pos);
  if (role) g.userData.rigRole = role;
  parent.add(g);
  return g;
}
function material(color, type = "cloth", skin = 0) {
  const key = [color, type, skin].join(":");
  if (materialCache.has(key)) return materialCache.get(key);
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: type === "metal" ? 0.27 : type === "skin" ? 0.42 : 0.63,
    metalness: type === "metal" ? 0.83 : 0.02,
    clearcoat: type === "metal" ? 1 : 0.2,
    sheen: type === "cloth" ? 0.65 : type === "skin" ? 0.35 : 0,
    sheenColor: new THREE.Color(color),
    side: type === "cloth" ? THREE.DoubleSide : THREE.FrontSide,
    iridescence: skin === 2 ? 0.65 : 0,
    emissive: type === "glow" ? color : 0,
    emissiveIntensity: type === "glow" ? 1.15 : 0,
  });
  if (type === "cloth" || type === "metal") {
    const t = garmentMaps();
    m.normalMap = t.normal;
    m.roughnessMap = t.roughness;
    m.normalScale.set(0.12, 0.12);
  }
  m.userData.sharedArt = true;
  materialCache.set(key, m);
  return m;
}
function mesh(
  parent,
  geo,
  mat,
  pos = [0, 0, 0],
  scale = [1, 1, 1],
  rot = [0, 0, 0],
  name = "",
) {
  const m = new THREE.Mesh(
    mat.userData.characterEngraving ? characterPBR.engravingGeometry(geo) : geo,
    mat,
  );
  m.name = name;
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cached(key, fn) {
  if (!meshCache.has(key)) {
    const g = fn();
    g.userData.sharedArt = true;
    meshCache.set(key, g);
  }
  return meshCache.get(key);
}
function interpolate(slices, t) {
  let n = 0;
  while (n < slices.length - 2 && t > slices[n + 1].y) n++;
  const a = slices[n],
    b = slices[n + 1],
    u = THREE.MathUtils.clamp((t - a.y) / (b.y - a.y), 0, 1),
    span = b.y - a.y,
    u2 = u * u,
    u3 = u2 * u;
  const sample = (key) => {
    const before = slices[Math.max(0, n - 1)],
      after = slices[Math.min(slices.length - 1, n + 2)],
      av = a[key] ?? 0,
      bv = b[key] ?? 0,
      ma = (bv - (before[key] ?? 0)) / (b.y - before.y),
      mb = ((after[key] ?? 0) - av) / (after.y - a.y);
    return (
      (2 * u3 - 3 * u2 + 1) * av +
      (u3 - 2 * u2 + u) * ma * span +
      (-2 * u3 + 3 * u2) * bv +
      (u3 - u2) * mb * span
    );
  };
  return {
    rx: Math.max(0.001, sample("rx")),
    rz: Math.max(0.001, sample("rz")),
    z: sample("z"),
  };
}
/** Continuous elliptical cross-sections. Rx and Rz remain independent at every vertex. */
export function createEllipticalLoftedMesh(
  slices,
  radialSegments = 128,
  longitudinalSegments = 128,
  { anatomical = false } = {},
) {
  const p = [],
    uv = [],
    idx = [],
    bottom = slices[0].y,
    top = slices.at(-1).y;
  for (let j = 0; j <= longitudinalSegments; j++) {
    const t = j / longitudinalSegments,
      y = THREE.MathUtils.lerp(bottom, top, t),
      s = interpolate(slices, y);
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments,
        a = (u - 0.5) * Math.PI * 2;
      let x = Math.sin(a) * s.rx,
        z = -Math.cos(a) * s.rz + s.z;
      if (anatomical) {
        const chest = Math.exp(-(((t - 0.73) / 0.14) ** 2)),
          front = Math.max(0, Math.cos(a));
        z -=
          0.009 *
          chest *
          front *
          Math.exp(-(((Math.abs(x) - s.rx * 0.45) / 0.065) ** 2));
        z += 0.006 * chest * front * Math.exp(-((x / 0.022) ** 2));
      }
      p.push(x, y, z);
      uv.push(u, t);
      if (j < longitudinalSegments && i < radialSegments) {
        const q = j * (radialSegments + 1) + i;
        idx.push(
          q,
          q + radialSegments + 1,
          q + 1,
          q + 1,
          q + radialSegments + 1,
          q + radialSegments + 2,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData = {
    ellipticalLoft: true,
    radialSegments,
    longitudinalSegments,
    crossSections: slices.map((s) => ({ ...s })),
  };
  return g;
}
function loft(parent, slices, d, mat, name, extra = {}) {
  const [y, r] = Q[d],
    g = createEllipticalLoftedMesh(slices, r, y, extra);
  return mesh(parent, g, mat, [0, 0, 0], [1, 1, 1], [0, 0, 0], name);
}
function simpleLoft(parent, length, topR, bottomR, depth, mat, d, pos, name) {
  const segments = d === "high" ? 20 : d === "medium" ? 5 : 2;
  return mesh(
    parent,
    createEllipticalLoftedMesh(
      [
        { y: -length, rx: bottomR, rz: bottomR * depth },
        { y: -length * 0.42, rx: topR * 0.97, rz: topR * depth },
        { y: 0, rx: topR, rz: topR * depth },
      ],
      d === "high" ? 32 : d === "medium" ? 8 : 5,
      segments,
    ),
    mat,
    pos,
    [1, 1, 1],
    [0, 0, 0],
    name,
  );
}
function line(parent, points, r, mat, d, name = "", taper = false) {
  const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    ),
    g = new THREE.TubeGeometry(
      curve,
      d === "high" ? 48 : d === "medium" ? 7 : 3,
      r,
      d === "high" ? 12 : d === "medium" ? 4 : 3,
      false,
    );
  if (taper) {
    const p = g.attributes.position,
      rs = g.parameters.radialSegments + 1,
      ts = g.parameters.tubularSegments;
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / rs) / ts,
        c = curve.getPointAt(t),
        f = Math.max(0.035, Math.sin(Math.PI * t) * (1 - 0.85 * t));
      p.setXYZ(
        i,
        c.x + (p.getX(i) - c.x) * f,
        c.y + (p.getY(i) - c.y) * f,
        c.z + (p.getZ(i) - c.z) * f,
      );
    }
    g.computeVertexNormals();
  }
  return mesh(parent, g, mat, [0, 0, 0], [1, 1, 1], [0, 0, 0], name);
}
function plateShape(width, height, style = "wing") {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, -height * 0.3);
  s.quadraticCurveTo(-width * 0.55, height * 0.05, -width * 0.35, height * 0.4);
  s.quadraticCurveTo(
    0,
    height * 0.2,
    width * 0.48,
    height * (style === "flame" ? 0.85 : 0.6),
  );
  s.quadraticCurveTo(width * 0.3, -height * 0.08, width * 0.5, -height * 0.32);
  s.quadraticCurveTo(0, -height * 0.5, -width * 0.5, -height * 0.3);
  return s;
}
function plate(parent, w, h, depth, mat, d, pos, rot, name, style) {
  const geo = new THREE.ExtrudeGeometry(plateShape(w, h, style), {
    depth,
    steps: 1,
    bevelEnabled: d !== "low",
    bevelSize: 0.006,
    bevelThickness: 0.003,
    bevelSegments: d === "high" ? 3 : 1,
    curveSegments: d === "high" ? 32 : d === "medium" ? 5 : 2,
  });
  geo.translate(0, 0, -depth * 0.5);
  return mesh(parent, geo, mat, pos, [1, 1, 1], rot, name);
}
function ornament(parent, r, mat, d, pos, rot = [Math.PI / 2, 0, 0]) {
  return mesh(
    parent,
    cached(
      "ring" + r + d,
      () =>
        new THREE.TorusGeometry(
          r,
          0.006,
          d === "high" ? 10 : d === "medium" ? 4 : 3,
          d === "high" ? 96 : d === "medium" ? 20 : 6,
        ),
    ),
    mat,
    pos,
    [1, 1, 1],
    rot,
  );
}
function soft(ctx, x, y, rx, ry, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(220,160,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}
export function generateHighResCharacterFaceTexture(
  heroId,
  gender = "male",
  skinTone = "#efd3bd",
  eyeColor = "#10B981",
  makeupStyle = "scholar",
  resolution = 2048,
) {
  const size = resolution;
  const key = [heroId, gender, skinTone, eyeColor, makeupStyle, size].join(":");
  if (faceCache.has(key)) return faceCache.get(key);
  let tex;
  if (typeof document !== "undefined" && document.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d");
    c.scale(size / 2048, size / 2048);
    const skinGradient = c.createLinearGradient(0, 0, 0, 2048);
    skinGradient.addColorStop(0, "#FFE4E6");
    skinGradient.addColorStop(1, "#FDEAD7");
    c.fillStyle = skinGradient;
    c.fillRect(0, 0, 2048, 2048);
    soft(c, 820, 1040, 230, 260, "rgba(238,131,137,.23)");
    soft(c, 1228, 1040, 230, 260, "rgba(238,131,137,.23)");
    soft(c, 1024, 700, 100, 410, "rgba(255,245,220,.4)");
    for (const side of [-1, 1]) {
      const x = 1024 + side * 368,
        y = 850;
      const eye = c.createLinearGradient(0, y - 40, 0, y + 48);
      eye.addColorStop(0, "#a59c9b");
      eye.addColorStop(0.45, "#fffdf5");
      eye.addColorStop(1, "#f5edea");
      c.fillStyle = eye;
      c.beginPath();
      c.moveTo(x - 115, y);
      c.bezierCurveTo(x - 47, y - 72, x + 63, y - 66, x + 119, y - 9);
      c.bezierCurveTo(x + 54, y + 63, x - 58, y + 56, x - 115, y);
      c.fill();
      c.save();
      c.beginPath();
      c.ellipse(x, y, 49, 58, 0, 0, Math.PI * 2);
      c.clip();
      const iris = c.createRadialGradient(x - 10, y - 12, 6, x, y, 64);
      iris.addColorStop(0, "#e5fff8");
      iris.addColorStop(0.3, eyeColor);
      iris.addColorStop(0.7, eyeColor);
      iris.addColorStop(1, "#18242e");
      c.fillStyle = iris;
      c.fillRect(x - 70, y - 70, 140, 140);
      c.strokeStyle = "rgba(245,255,255,.32)";
      c.lineWidth = 2;
      for (let j = 0; j < 36; j++) {
        const a = (j / 36) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
        c.lineTo(x + Math.cos(a) * 53, y + Math.sin(a) * 53);
        c.stroke();
      }
      c.fillStyle = "#111224";
      c.beginPath();
      c.ellipse(x, y, makeupStyle === "snake" ? 7 : 22, 32, 0, 0, Math.PI * 2);
      c.fill();
      for (const [dx, dy, r] of [
        [-18, -22, 14],
        [15, 24, 7],
        [27, -7, 4],
      ]) {
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      c.strokeStyle = "#34303a";
      c.lineWidth = gender === "female" ? 12 : 10;
      c.beginPath();
      c.moveTo(x - 118, y - 2);
      c.bezierCurveTo(x - 45, y - 73, x + 60, y - 68, x + 122, y - 11);
      c.stroke();
      if (gender === "female")
        for (let k = 0; k < 6; k++) {
          const xx = x + side * (62 + k * 10),
            yy = y - 32 + k * 3;
          c.beginPath();
          c.moveTo(xx, yy);
          c.quadraticCurveTo(xx + side * 10, yy - 15, xx + side * 15, yy - 28);
          c.stroke();
        }
      c.strokeStyle = "#363039";
      c.lineWidth = gender === "female" ? 14 : 22;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x - 100, y - 105);
      c.quadraticCurveTo(x, y - 153, x + 102, y - 111);
      c.stroke();
    }
    soft(c, 1060, 1232, 45, 235, "rgba(127,89,83,.18)");
    soft(c, 1005, 1378, 52, 46, "rgba(255,239,215,.72)");
    c.strokeStyle = gender === "female" ? "#af6271" : "#a77873";
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(955, 1604);
    c.quadraticCurveTo(1024, 1625, 1093, 1604);
    c.stroke();
    c.fillStyle = gender === "female" ? "#d98f9c" : "#c39083";
    c.beginPath();
    c.moveTo(955, 1604);
    c.quadraticCurveTo(987, 1578, 1024, 1596);
    c.quadraticCurveTo(1061, 1578, 1093, 1604);
    c.quadraticCurveTo(1024, 1640, 955, 1604);
    c.fill();
    soft(c, 1024, 1620, 65, 8, "rgba(255,235,227,.6)");
    if (makeupStyle === "fire") {
      c.strokeStyle = "#b52531";
      c.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.ellipse(
          1024 + Math.sin(i * 1.256) * 17,
          620 + Math.cos(i * 1.256) * 12,
          10,
          22,
          -i * 1.256,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    }
    if (makeupStyle === "tiger") {
      c.strokeStyle = "rgba(130,92,47,.32)";
      c.lineWidth = 7;
      for (const side of [-1, 1])
        for (let i = 0; i < 2; i++) {
          c.beginPath();
          c.moveTo(1024 + side * 300, 1070 + i * 35);
          c.lineTo(1024 + side * 245, 1090 + i * 35);
          c.stroke();
        }
    }
    if (makeupStyle === "turtle") {
      c.fillStyle = "rgba(36,40,40,.5)";
      for (let i = 0; i < 280; i++) {
        const a = i * 2.4,
          rr = 70 + ((i * 13) % 85);
        c.fillRect(1024 + Math.sin(a) * rr, 1740 + Math.cos(a) * 48, 3, 9);
      }
    }
    tex = new THREE.CanvasTexture(canvas);
  } else {
    const a = new Uint8Array(size * size * 4);
    for (let i = 0; i < a.length; i += 4) {
      const v = Math.floor(i / 4 / size) / Math.max(1, size - 1);
      a[i] = 255 - v * 2;
      a[i + 1] = 228 + v * 6;
      a[i + 2] = 230 - v * 15;
      a[i + 3] = 255;
    }
    tex = new THREE.DataTexture(a, size, size);
    tex.needsUpdate = true;
    tex.userData.nodeFallback = true;
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = true;
  tex.anisotropy = 4;
  tex.userData.eyeLayers = 6;
  tex.userData.irisRays = 36;
  tex.userData.catchlights = 3;
  tex.userData.hairPaintedOnFace = false;
  tex.userData.faceTexture = true;
  tex.userData.heroId = heroId;
  faceCache.set(key, tex);
  const sameResolution = [...faceCache].filter(
    ([, value]) => value.image.width === size,
  );
  const limit = size === 2048 ? 4 : 12;
  while (sameResolution.length > limit)
    faceCache.delete(sameResolution.shift()[0]);
  return tex;
}
function headGeometry(female, d, front = true) {
  const hh = female ? 0.21 : 1.82 / 8,
    slices = [
      { y: 0, rx: female ? 0.016 : 0.02, rz: 0.038, z: -0.023 },
      { y: hh * 0.12, rx: female ? 0.043 : 0.049, rz: 0.058, z: -0.012 },
      { y: hh * 0.3, rx: female ? 0.061 : 0.06, rz: 0.077 },
      { y: hh * 0.53, rx: female ? 0.073 : 0.0775, rz: 0.091 },
      { y: hh * 0.77, rx: 0.075, rz: 0.095 },
      { y: hh * 0.91, rx: 0.065, rz: 0.081 },
      { y: hh, rx: 0.015, rz: 0.024 },
    ];
  return cached((front ? "facefront" : "headback") + female + d, () => {
    const rows = d === "high" ? 128 : d === "medium" ? 16 : 6;
    const columns =
      d === "high"
        ? front
          ? 46
          : 82
        : d === "medium"
          ? front
            ? 6
            : 10
          : front
            ? 3
            : 5;
    const arc = (65 * Math.PI) / 180;
    const points = [],
      uvs = [],
      indices = [];
    for (let j = 0; j <= rows; j++) {
      const v = j / rows,
        y = v * hh,
        shape = interpolate(slices, y);
      for (let i = 0; i <= columns; i++) {
        const u = i / columns,
          angle = front
            ? -arc + u * arc * 2
            : arc + u * (Math.PI * 2 - arc * 2);
        points.push(
          Math.sin(angle) * shape.rx,
          y,
          -Math.cos(angle) * shape.rz + shape.z,
        );
        uvs.push(u, v);
        if (i < columns && j < rows) {
          const k = j * (columns + 1) + i;
          indices.push(
            k,
            k + columns + 1,
            k + 1,
            k + 1,
            k + columns + 1,
            k + columns + 2,
          );
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.userData.faceFrontMesh = front;
    g.userData.frontArcDegrees = front ? 130 : 0;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (!front || z >= 0) continue;
      // A broad, shallow nose joins the facial plane without the tight bulb
      // whose lower normals picked up an isolated dark green studio reflection.
      const bridge = 0.0027 * Math.exp(-(((y - hh * 0.47) / (hh * 0.22)) ** 2));
      const tip = 0.002 * Math.exp(-(((y - hh * 0.335) / (hh * 0.105)) ** 2));
      p.setZ(i, z - (bridge + tip) * Math.exp(-((x / 0.019) ** 2)));
    }
    g.computeVertexNormals();
    return g;
  });
}
function clothPanel(
  parent,
  name,
  width,
  length,
  d,
  mat,
  pos,
  angle = 0,
  flared = 0.3,
  cut = 0,
) {
  const seg = d === "high" ? 64 : d === "medium" ? 8 : 2,
    g = new THREE.PlaneGeometry(width, length, seg, seg),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      t = (length * 0.5 - y) / length,
      xx = x * (1 + t * flared);
    p.setXYZ(
      i,
      xx,
      -t * length,
      Math.sin((x / width) * Math.PI * 8) * 0.006 -
        Math.sin(t * Math.PI) * 0.035 +
        (cut ? Math.cos((x / width) * Math.PI * 2) * t * 0.035 : 0),
    );
  }
  g.computeVertexNormals();
  const q = group(parent, name, pos, "cloth");
  q.rotation.y = angle;
  q.userData.cloth = {
    phase: name.length * 0.73,
    length,
    baseRotation: [0, angle, 0],
  };
  mesh(q, g, d === "low" ? mat : flowingSilk(mat));
  return q;
}
function outerCoat(parent, slices, d, mat) {
  const sections = slices.map((s) => ({
    ...s,
    rx: s.rx + 0.008,
    rz: s.rz + 0.009,
  }));
  const longitudinal = d === "high" ? 128 : d === "medium" ? 6 : 3;
  const radial = d === "high" ? 128 : d === "medium" ? 8 : 6;
  const points = [],
    uvs = [],
    indices = [];
  for (let j = 0; j <= longitudinal; j++) {
    const v = j / longitudinal,
      y = THREE.MathUtils.lerp(sections[0].y, sections.at(-1).y, v);
    const shape = interpolate(sections, y),
      opening = 0.13 + 0.73 * THREE.MathUtils.smoothstep(y, 0.2, 0.53);
    for (let i = 0; i <= radial; i++) {
      const u = i / radial,
        angle = opening + (Math.PI * 2 - opening * 2) * u;
      points.push(
        Math.sin(angle) * shape.rx,
        y,
        -Math.cos(angle) * shape.rz + shape.z,
      );
      uvs.push(u, v);
      if (i < radial && j < longitudinal) {
        const k = j * (radial + 1) + i;
        indices.push(
          k,
          k + radial + 1,
          k + 1,
          k + 1,
          k + radial + 1,
          k + radial + 2,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.userData.openCollarArc = true;
  const coat = mesh(
    parent,
    g,
    mat,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    "OuterCrossCollarCoat",
  );
  coat.userData.garmentLayer = 2;
  return coat;
}
function hairSystem(parent, h, c, d, mats) {
  const head = parent,
    female = c.gender === "female",
    hh = female ? 0.21 : 1.82 / 8;
  const scalpSlices = [
    { y: hh * 0.68, rx: 0.081, rz: 0.109 },
    { y: hh * 0.84, rx: 0.083, rz: 0.107 },
    { y: hh * 0.99, rx: 0.057, rz: 0.082 },
    { y: hh * 1.08, rx: 0.002, rz: 0.005 },
  ];
  mesh(
    head,
    cached("scalp" + d + female, () =>
      createEllipticalLoftedMesh(
        scalpSlices,
        d === "high" ? 64 : d === "medium" ? 12 : 6,
        d === "high" ? 32 : d === "medium" ? 8 : 3,
      ),
    ),
    mats.hair,
    [0, 0, 0.003],
  );
  const frontCount = d === "low" ? 4 : d === "medium" ? 8 : 10,
    backCount = d === "low" ? 5 : d === "medium" ? 10 : 20;
  for (let i = 0; i < frontCount; i++) {
    const x = (i / (frontCount - 1) - 0.5) * 0.142,
      side = i < frontCount / 2 ? -1 : 1,
      temple = i < 2 || i > frontCount - 3;
    line(
      head,
      [
        [x * 0.55, hh * 1.025, 0.006],
        [temple ? side * 0.1 : x, hh * 0.87, temple ? -0.02 : -0.107],
        [
          temple ? side * 0.105 : x + side * 0.013,
          temple ? hh * 0.24 : hh * 0.72,
          temple ? 0.025 : -0.111,
        ],
      ],
      0.018,
      mats.hair,
      d,
      "Fringe" + i,
      true,
    );
  }
  for (let i = 0; i < backCount; i++) {
    const a = -1.42 + (i / (backCount - 1)) * 2.84,
      x = Math.sin(a) * 0.079,
      z = Math.cos(a) * 0.075 + 0.03,
      short = c.style === "mountain" || c.style === "tiger";
    const strand = group(head, "HairStrand" + i, [0, hh * 0.88, 0], "hair");
    strand.userData.hair = { index: i, amplitude: short ? 0.015 : 0.045 };
    line(
      strand,
      [
        [x * 0.5, 0.02, z * 0.6],
        [x, -0.1, z + 0.02],
        [x * 1.12, -c.hairLength * 0.6, z + 0.03],
        [x * 1.25 + (h === 8 ? 0.065 : 0), -c.hairLength, z + 0.06],
      ],
      0.014 + (i % 3) * 0.003,
      mats.hair,
      d,
      "HairRibbon",
      true,
    );
  }
  if (!["mountain", "tiger", "snake"].includes(c.style)) {
    loft(
      head,
      [
        { y: hh * 1.02, rx: 0.039, rz: 0.033 },
        { y: hh * 1.17, rx: 0.045, rz: 0.04 },
        { y: hh * 1.3, rx: 0.015, rz: 0.02 },
      ],
      d,
      mats.hair,
      "HairBun",
    );
    ornament(head, 0.041, mats.gold, d, [0, hh * 1.18, 0]);
  }
  line(
    head,
    [
      [-0.12, hh * 1.2, 0.005],
      [0, hh * 1.25, 0],
      [0.13, hh * 1.18, 0.012],
    ],
    0.008,
    mats.gold,
    d,
    "JadeHairPin",
  );
  if (h === 2) {
    const earShape = (width, height) => {
      const s = new THREE.Shape(),
        half = width / 2;
      const corner = 0.085;
      s.moveTo(-half + width * corner, 0);
      s.lineTo(half - width * corner, 0);
      s.quadraticCurveTo(half, 0, half * (1 - corner), height * corner);
      s.lineTo(half * corner, height * (1 - corner));
      s.quadraticCurveTo(0, height, -half * corner, height * (1 - corner));
      s.lineTo(-half * (1 - corner), height * corner);
      s.quadraticCurveTo(-half, 0, -half + width * corner, 0);
      s.closePath();
      return s;
    };
    const fur = material(0xf4d9ed, "cloth");
    for (const side of [-1, 1]) {
      const ear = group(
        head,
        side < 0 ? "FoxEarRigL" : "FoxEarRigR",
        [side * 0.072, hh * 0.94, 0.008],
        "foxEar",
      );
      ear.userData.foxEar = { side, baseTilt: -side * 0.14 };
      ear.rotation.z = ear.userData.foxEar.baseTilt;
      for (const inner of [false, true]) {
        const width = inner ? 0.041 : 0.066,
          height = inner ? 0.084 : 0.12,
          depth = inner ? 0.003 : 0.018;
        const geo = cached(`fox-ear:${d}:${inner}`, () => {
          const g = new THREE.ExtrudeGeometry(earShape(width, height), {
            depth,
            steps: 1,
            bevelEnabled: d !== "low",
            bevelSize: inner ? 0.001 : 0.0025,
            bevelThickness: inner ? 0.0007 : 0.002,
            bevelSegments: d === "high" ? 3 : 1,
            curveSegments: d === "high" ? 16 : d === "medium" ? 5 : 2,
          });
          g.translate(0, 0, -depth / 2);
          return g;
        });
        mesh(
          ear,
          geo,
          inner ? fur : mats.hair,
          [0, inner ? 0.013 : 0, inner ? -0.012 : 0],
          [1, 1, 1],
          [0, 0, 0],
          inner ? "FoxInnerEar" : "FoxEar",
        );
      }
    }
  }
  if (h === 4)
    for (let j = 0; j < 9; j++) {
      const a = (j - 4) * 0.15;
      mesh(head, new THREE.OctahedronGeometry(0.009, 0), mats.gold, [
        Math.sin(a) * 0.083,
        0.17 + Math.cos(a) * 0.008,
        -0.073,
      ]);
    }
}
function buildHands(parent, side, female, d, mats) {
  const suffix = side < 0 ? "L" : "R",
    hand = group(
      parent,
      "Hand" + suffix,
      [0, -(female ? 0.238 : 0.26), -0.005],
      "hand",
    );
  simpleLoft(
    hand,
    0.095,
    female ? 0.033 : 0.0425,
    female ? 0.026 : 0.037,
    0.36,
    mats.flesh,
    d,
    [0, 0, 0],
    "Palm",
  );
  for (let finger = 0; finger < 5; finger++) {
    const thumb = finger === 0;
    const root = group(
      hand,
      ["Thumb", "Index", "Middle", "Ring", "Pinky"][finger] + suffix,
      [
        thumb ? side * 0.035 : (finger - 2.3) * 0.016,
        -(thumb ? 0.038 : 0.079),
        -0.005,
      ],
      "finger",
    );
    root.rotation.z = thumb ? -side * 0.65 : (finger - 2) * 0.055;
    const lengths = thumb
      ? [0.026, 0.024, 0.021]
      : [
          0.034 - finger * 0.001,
          0.024 - finger * 0.001,
          0.019 - finger * 0.0008,
        ];
    let q = root;
    for (let ph = 0; ph < 3; ph++) {
      const g = group(
        q,
        "Phalanx" + ph,
        [0, ph === 0 ? 0 : -lengths[ph - 1], 0],
        "fingerSegment",
      );
      g.rotation.x = 0.34 + ph * 0.2;
      const radius = (female ? 0.007 : 0.0085) * (1 - ph * 0.14);
      if (d !== "low")
        mesh(
          g,
          new THREE.CylinderGeometry(
            radius * 0.83,
            radius,
            lengths[ph],
            d === "high" ? 16 : 6,
            1,
          ),
          mats.flesh,
          [0, -lengths[ph] * 0.5, 0],
        );
      q = g;
    }
  }
  batchGeometrySubtree(hand);
  return hand;
}
function geometryHex(r, h) {
  const g = new THREE.CylinderGeometry(r, r, h, 6, 1);
  g.rotateX(Math.PI / 2);
  return g;
}
function customOutfit(root, pelvis, chest, head, h, c, d, mats) {
  if (h === 0) {
    for (let i = 0; i < 4; i++)
      line(
        chest,
        [
          [0.16, -0.02, 0.03],
          [0.29, -0.08, 0.09 + i * 0.015],
          [0.23, -0.17, 0.12],
        ],
        0.008,
        mats.jade,
        d,
        "LeafArmor" + i,
        true,
      );
  }
  if (h === 1) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++)
        plate(
          chest,
          0.16,
          0.2,
          0.045,
          mats.gold,
          d,
          [side * (0.2 + i * 0.025), 0.09 + i * 0.025, 0.005],
          [0, 0, side * 0.3],
          "MountainArmor",
        );
      line(
        chest,
        [
          [side * 0.17, 0.11, -0.105],
          [side * 0.11, -0.08, -0.15],
          [0, -0.14, -0.14],
        ],
        0.012,
        mats.gold,
        d,
        "HeartChain",
      );
    }
  }
  if (h === 2) {
    for (let i = 0; i < 3; i++) {
      const q = group(pelvis, "FoxTail" + i, [0, -0.03, 0.1], "tail");
      line(
        q,
        [
          [0, 0, 0],
          [(i - 1) * 0.17, -0.13, 0.24],
          [(i - 1) * 0.32, 0.08, 0.48],
          [(i - 1) * 0.34, 0.28, 0.61],
        ],
        0.083,
        mats.ghost,
        d,
        "TailFur",
        true,
      );
    }
  }
  if (h === 3) {
    for (const side of [-1, 1]) {
      const g = group(chest, "ThunderFeatherMantle" + side, [
        side * 0.13,
        0.1,
        0.055,
      ]);
      for (let i = 0; i < (d === "low" ? 4 : d === "medium" ? 4 : 10); i++)
        plate(
          g,
          0.055,
          0.28 + i * 0.01,
          0.008,
          mats.cloth,
          d,
          [side * i * 0.02, -i * 0.018, 0.012 * i],
          [0, side * 0.15, side * (0.4 + i * 0.08)],
          "Feather",
        );
    }
  }
  if (h === 4) {
    for (let j = 0; j < 3; j++)
      clothPanel(
        pelvis,
        "MoonPleat" + j,
        0.16 + j * 0.07,
        0.85 - j * 0.08,
        d,
        mats.veil,
        [0, -0.01 - j * 0.02, -0.12 - j * 0.008],
        0,
        0.5,
      );
    ornament(root, 0.38, mats.jade, d, [0, 1.2, 0.15], [0, 0, 0]);
  }
  if (h === 5) {
    for (const side of [-1, 1])
      for (let j = 0; j < 3; j++)
        mesh(chest, geometryHex(0.077, 0.027), mats.gold, [
          side * 0.081,
          -j * 0.095,
          -0.138,
        ]);
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2;
      mesh(chest, geometryHex(0.115, 0.055), mats.cloth, [
        Math.sin(a) * 0.2,
        -0.08 + Math.cos(a) * 0.25,
        0.17,
      ]);
    }
    plate(
      head,
      0.22,
      0.18,
      0.09,
      mats.gold,
      d,
      [0, 0.17, 0.045],
      [0, 0, 0],
      "TurtleHelm",
    );
  }
  if (h === 6) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      plate(
        pelvis,
        0.13,
        0.35,
        0.01,
        mats.cloth,
        d,
        [Math.sin(a) * 0.12, -0.14, Math.cos(a) * 0.115],
        [0.1, Math.PI - a, Math.sin(a) * 0.2],
        "FireLotusHem",
        "flame",
      );
    }
  }
  if (h === 7) {
    for (const side of [-1, 1]) {
      const w = group(
        chest,
        "IceWing" + side,
        [side * 0.1, 0.08, 0.12],
        "wing",
      );
      for (let i = 0; i < 3; i++)
        plate(
          w,
          0.22,
          0.42,
          0.006,
          mats.ice,
          d,
          [side * (0.1 + i * 0.05), -0.08 - i * 0.075, 0.01 * i],
          [0, side * 0.25, -side * (0.4 + i * 0.45)],
          "IceCrystalWing",
        );
    }
  }
  if (h === 8) {
    clothPanel(
      chest,
      "RangerCloak",
      0.27,
      0.6,
      d,
      mats.cloth,
      [-0.13, 0.07, 0.12],
      Math.PI,
      0.45,
    );
    const q = group(head, "Ponytail", [0, 0.21, 0.075], "hair");
    line(
      q,
      [
        [0, 0, 0],
        [0.09, -0.14, 0.14],
        [0.15, -0.48, 0.17],
        [0.07, -0.69, 0.1],
      ],
      0.036,
      mats.hair,
      d,
      "PonytailFlow",
      true,
    );
  }
  if (h === 9) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      plate(
        chest,
        0.045,
        0.15,
        0.02,
        i % 3 === 0 ? mats.dark : mats.inner,
        d,
        [Math.sin(a) * 0.17, 0.13, Math.cos(a) * 0.11],
        [0, a, 0],
        "TigerFur",
      );
    }
    plate(
      chest,
      0.24,
      0.2,
      0.075,
      mats.gold,
      d,
      [-0.23, 0.1, 0],
      [0, 0, -0.18],
      "TigerHeadShoulder",
    );
    for (const side of [-1, 1])
      plate(
        chest,
        0.05,
        0.08,
        0.04,
        mats.gold,
        d,
        [-0.23 + side * 0.045, 0.18, -0.05],
        [0, 0, side * 0.25],
        "TigerEar",
      );
  }
  if (h === 10) {
    for (let i = 0; i < 4; i++)
      line(
        head,
        [
          [0.06, 0.23, 0],
          [0.09, 0.25 + i * 0.008, 0.015],
          [0.11, 0.22, 0.028],
        ],
        0.013,
        mats.inner,
        d,
        "OrchidPetal" + i,
        true,
      );
  }
  if (h === 11) {
    for (const side of [-1, 1])
      plate(
        chest,
        0.12,
        0.23,
        0.015,
        mats.cloth,
        d,
        [side * 0.08, 0.14, 0.035],
        [0, 0, side * 0.32],
        "HighSnakeCollar",
      );
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 3; x++)
        plate(
          chest,
          0.065,
          0.08,
          0.006,
          mats.jade,
          d,
          [(x - 1) * 0.068, -y * 0.072, -0.143],
          [0, 0, (x - 1) * 0.08],
          "SnakeScale",
        );
  }
}
function buildAnatomy(actor, d, female) {
  const h = actor.hero ?? 0,
    c = HERO_APPEARANCE[h],
    costume = actor.costume ?? 0,
    skin = actor.skin ?? 0,
    height = c.height,
    baseHeight = female ? 1.68 : 1.82,
    scale = height / baseHeight,
    muscle = h === 1 ? 1.11 : h === 5 ? 1.19 : 1;
  const root = new THREE.Group();
  root.name = "Root";
  root.userData = {
    artHero: h,
    height,
    anatomy: {
      gender: c.gender,
      height: height,
      heightMeters: height,
      headCount: 8,
      headHeightMeters: height / 8,
      baseHeadHeight: female ? 0.21 : 1.82 / 8,
      legRatio: female ? 0.54 : 0.52,
      faceTextureSize: 2048,
      torsoLoft: { longitudinal: Q[d][0], radial: Q[d][1] },
      garmentLayers: 4,
      clothPanels: 4,
      frontHairStrands: d === "low" ? 4 : d === "medium" ? 8 : 10,
      backHairStrands: d === "low" ? 5 : d === "medium" ? 10 : 20,
    },
    appearanceStyle: c.style,
  };
  const outerColor = new THREE.Color(c.outer)
    .offsetHSL(
      costume * 0.035,
      0,
      costume === 1 ? -0.055 : costume === 2 ? 0.055 : 0,
    )
    .getHex();
  const mats = {
    cloth: characterPBR.createSilkMaterial(h, d, {
      primary: outerColor,
      secondary: new THREE.Color(outerColor)
        .lerp(new THREE.Color(c.inner), 0.3)
        .getHex(),
      gold: c.gold,
      skin,
    }),
    inner: material(c.inner, "cloth"),
    gold: material(c.gold, "metal", skin),
    flesh: material(0xefd3bd, "skin"),
    hair: characterPBR.hairMaterial(c.hair, d),
    jade: characterPBR.jadeMaterial(new THREE.Color(c.eye).getHex()),
    dark: material(0x171b24, "cloth"),
  };
  mats.gold = characterPBR.engravedMaterial(mats.gold, mats.cloth, "metal");
  mats.veil = mats.cloth.clone();
  mats.veil.side = THREE.DoubleSide;
  mats.veil.transparent = true;
  mats.veil.opacity = 0.62;
  mats.veil.transmission = 0.65;
  mats.veil.thickness = 0.002;
  mats.veil.userData.sharedArt = true;
  mats.ghost = mats.hair.clone();
  mats.ghost.transparent = true;
  mats.ghost.opacity = 0.7;
  mats.ghost.emissive = new THREE.Color(c.eye);
  mats.ghost.emissiveIntensity = 0.25;
  mats.ghost.userData.sharedArt = true;
  mats.ice = mats.veil.clone();
  mats.ice.transmission = 0.85;
  mats.ice.iridescence = 0.7;
  mats.ice.userData.sharedArt = true;
  const hip = female ? 0.905 : 0.946,
    pelvis = group(root, "Pelvis", [0, hip, 0], "pelvis"),
    spineLower = group(pelvis, "SpineLower", [0, 0.11, 0], "spineLower"),
    spineUpper = group(spineLower, "SpineUpper", [0, 0.135, 0], "spineUpper"),
    chest = group(spineUpper, "Chest", [0, female ? 0.1 : 0.12, 0], "chest"),
    neck = group(chest, "Neck", [0, female ? 0.135 : 0.2015, 0], "neck"),
    head = group(neck, "Head", [0, female ? 0.085 : 0.08, 0], "head");
  const torso = female
    ? [
        [0, 0.153, 0.105],
        [0.05, 0.168, 0.115],
        [0.12, 0.149, 0.104],
        [0.19, 0.114, 0.085],
        [0.24, 0.102, 0.078],
        [0.29, 0.113, 0.087],
        [0.34, 0.138, 0.108],
        [0.39, 0.155, 0.125],
        [0.43, 0.158, 0.12],
        [0.47, 0.175, 0.095],
        [0.49, 0.148, 0.087],
        [0.51, 0.045, 0.055],
      ]
    : [
        [0, 0.155, 0.105],
        [0.05, 0.16, 0.11],
        [0.12, 0.151, 0.104],
        [0.2, 0.13, 0.095],
        [0.25, 0.14, 0.104],
        [0.3, 0.155, 0.115],
        [0.36, 0.18, 0.13],
        [0.4, 0.195, 0.135],
        [0.45, 0.206, 0.13],
        [0.49, 0.225, 0.12],
        [0.52, 0.17, 0.1],
        [0.545, 0.052, 0.065],
      ];
  const slices = torso.map(([y, rx, rz]) => ({
    y,
    rx: rx * muscle,
    rz: rz * (1 + (muscle - 1) * 0.7),
    z: female ? Math.sin(y * 8) * 0.008 : 0,
  }));
  loft(
    pelvis,
    slices,
    d,
    h === 1 ? mats.flesh : mats.inner,
    "AnatomicalEllipticalTorso",
    { anatomical: true },
  );
  const robed = ![1, 2, 5, 8, 9].includes(h);
  if (robed) outerCoat(pelvis, slices, d, mats.cloth);
  const neckLength = female ? 0.085 : 0.08;
  mesh(
    neck,
    createEllipticalLoftedMesh(
      [
        { y: -0.026, rx: female ? 0.038 : 0.044, rz: female ? 0.027 : 0.032 },
        { y: 0.015, rx: female ? 0.028 : 0.035, rz: female ? 0.024 : 0.029 },
        {
          y: neckLength,
          rx: female ? 0.026 : 0.031,
          rz: female ? 0.023 : 0.027,
        },
      ],
      d === "high" ? 48 : d === "medium" ? 8 : 5,
      d === "high" ? 32 : d === "medium" ? 6 : 2,
    ),
    mats.flesh,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    "NeckSkin",
  );
  const faceMat = material(0xffffff, "skin").clone();
  faceMat.map = generateHighResCharacterFaceTexture(
    h,
    c.gender,
    h === 11 ? "#e1d7d1" : "#efd3bd",
    c.eye,
    c.style,
    d === "high" ? 2048 : d === "medium" ? 256 : 64,
  );
  faceMat.metalness = 0;
  faceMat.roughness = 0.58;
  faceMat.clearcoat = 0;
  faceMat.sheen = 0.15;
  faceMat.emissive.set(0xffeadb);
  faceMat.emissiveIntensity = 0.025;
  faceMat.userData.sharedArt = true;
  const front = group(head, "FaceFrontMesh");
  const face = mesh(
    front,
    headGeometry(female, d, true),
    faceMat,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    "VLineHeadFaceUV",
  );
  face.userData.faceFrontMesh = true;
  face.receiveShadow = false;
  const rearSkin = material(0xffe5dc, "skin");
  mesh(
    head,
    headGeometry(female, d, false),
    rearSkin,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    "RearCraniumSkin",
  );
  for (const side of [-1, 1]) {
    simpleLoft(
      head,
      0.05,
      0.014,
      0.01,
      0.45,
      mats.flesh,
      d,
      [side * 0.079, 0.125, 0.006],
      "Ear" + side,
    );
  }
  hairSystem(head, h, c, d, mats);
  for (const side of [-1, 1]) {
    const suf = side < 0 ? "L" : "R",
      clavicle = group(
        chest,
        "Clavicle" + suf,
        [side * (female ? 0.13 : 0.172) * muscle, 0.067, 0],
        "clavicle",
      ),
      shoulder = group(
        clavicle,
        "Shoulder" + suf,
        [side * 0.035, 0, 0],
        "shoulder",
      ),
      arm = group(shoulder, "UpperArm" + suf, [0, 0, 0], "upperArm");
    arm.rotation.z = side * 0.12;
    simpleLoft(
      arm,
      0.14,
      female ? 0.045 : 0.057,
      female ? 0.036 : 0.043,
      0.9,
      mats.inner,
      d,
      [0, 0.015, 0],
      "TeardropDeltoid",
    );
    simpleLoft(
      arm,
      female ? 0.255 : 0.28,
      female ? 0.046 : 0.068,
      female ? 0.038 : 0.054,
      0.85,
      mats.inner,
      d,
      [0, -0.015, 0],
      "Bicep",
    );
    const elbow = group(
      arm,
      "Forearm" + suf,
      [0, -(female ? 0.265 : 0.28), 0],
      "forearm",
    );
    if (h === 10) elbow.rotation.x = 1.48;
    simpleLoft(
      elbow,
      female ? 0.238 : 0.26,
      female ? 0.038 : 0.056,
      female ? 0.028 : 0.04,
      0.75,
      mats.inner,
      d,
      [0, 0, 0],
      "ForearmSkin",
    );
    simpleLoft(
      elbow,
      0.13,
      female ? 0.041 : 0.06,
      female ? 0.031 : 0.043,
      0.85,
      mats.gold,
      d,
      [0, -0.075, 0],
      "EngravedBracer",
    );
    const compatibilityJoint = group(
      elbow,
      side < 0 ? "elbowLeft" : "elbowRight",
      [0, 0, 0],
    );
    compatibilityJoint.userData.compatibilityAlias = true;
    const hand = buildHands(elbow, side, female, d, mats);
    plate(
      shoulder,
      female ? 0.15 : 0.19,
      female ? 0.1 : 0.14,
      0.018,
      mats.gold,
      d,
      [side * 0.035, 0.025, 0],
      [0, 0, side * 0.15],
      "SculptedPauldron",
      h === 6 ? "flame" : "wing",
    );
    if ([3, 4, 10].includes(h)) {
      const sleeve = clothPanel(
        arm,
        "SilkSleeve" + suf,
        0.23,
        female ? 0.4 : 0.43,
        d,
        h === 4 ? mats.veil : mats.cloth,
        [0, -0.03, 0.035],
        0,
        0.5,
      );
      sleeve.rotation.z = side * 0.15;
      sleeve.userData.cloth.baseRotation[2] = side * 0.15;
    }
    const thigh = group(
      pelvis,
      "Thigh" + suf,
      [side * (female ? 0.09 : 0.1), -0.01, 0],
      "thigh",
    );
    thigh.rotation.z = -side * THREE.MathUtils.degToRad(3.5);
    const thighLength = female ? 0.432 : 0.46,
      calfLength = female ? 0.401 : 0.43;
    simpleLoft(
      thigh,
      thighLength,
      female ? 0.082 : 0.095,
      female ? 0.052 : 0.062,
      1.075,
      mats.inner,
      d,
      [0, 0, 0],
      "ThighAnatomy",
    );
    const calf = group(thigh, "Calf" + suf, [0, -thighLength, 0], "calf");
    loft(
      calf,
      [
        {
          y: -calfLength,
          rx: female ? 0.034 : 0.042,
          rz: female ? 0.039 : 0.047,
        },
        {
          y: -calfLength * 0.67,
          rx: female ? 0.044 : 0.052,
          rz: female ? 0.045 : 0.057,
        },
        {
          y: -calfLength * 0.3,
          rx: female ? 0.054 : 0.066,
          rz: female ? 0.054 : 0.068,
        },
        { y: 0, rx: female ? 0.052 : 0.062, rz: female ? 0.052 : 0.065 },
      ],
      d,
      mats.inner,
      "CalfAnatomy",
    );
    const ankle = group(calf, "Ankle" + suf, [0, -calfLength, 0], "ankle"),
      foot = group(ankle, "Foot" + suf, [0, 0, -0.035], "foot");
    loft(
      foot,
      [
        { y: -0.008, rx: 0.048, rz: 0.115, z: -0.025 },
        { y: 0.025, rx: 0.053, rz: 0.125, z: -0.032 },
        { y: 0.065, rx: 0.047, rz: 0.1, z: -0.018 },
        { y: 0.09, rx: 0.03, rz: 0.06 },
      ],
      d,
      mats.dark,
      "CurvedWarBoot",
    );
    plate(
      foot,
      0.095,
      0.06,
      0.012,
      mats.gold,
      d,
      [0, 0.046, -0.129],
      [Math.PI / 2, 0, 0],
      "MetalBootToe",
    );
    if ([2, 8].includes(h))
      simpleLoft(
        calf,
        0.32,
        0.055,
        0.039,
        0.9,
        mats.dark,
        d,
        [0, 0.08, 0],
        "TallAssassinBoot",
      );
    if (
      (side === 1 && ![2, 4, 5, 8, 9, 10].includes(h)) ||
      (side === -1 && [2, 5, 8, 9].includes(h)) ||
      (side === 1 && [2, 9].includes(h))
    ) {
      const weapon = buildSoulWeapon(h, d, {
        color: new THREE.Color(c.eye).getHex(),
        skin,
        side: side < 0 ? "left" : "right",
        engravingAtlas: mats.cloth,
      });
      weapon.position.set(side * 0.045, -0.055, -0.06);
      if (h === 1) weapon.rotation.z = -0.28;
      if (h === 2) weapon.rotation.z = side * 0.12;
      hand.add(weapon);
    }
  }
  // Separate Y-crossed collar ribbons follow the anatomical chest instead of adding a round shell.
  for (const side of [-1, 1])
    line(
      pelvis,
      [
        [side * 0.053, female ? 0.5 : 0.54, -0.075],
        [side * 0.112, 0.43, -0.112],
        [0, 0.29, -0.126],
        [side * 0.07, 0.16, -0.106],
      ],
      0.012,
      mats.gold,
      d,
      "YCollar" + side,
    );
  const sash = loft(
    pelvis,
    [
      { y: 0.185, rx: female ? 0.109 : 0.137, rz: female ? 0.085 : 0.102 },
      { y: 0.215, rx: female ? 0.111 : 0.141, rz: female ? 0.086 : 0.105 },
      { y: 0.245, rx: female ? 0.108 : 0.14, rz: female ? 0.083 : 0.104 },
    ],
    d,
    mats.gold,
    "WaistSash",
  );
  sash.userData.garmentLayer = 3;
  mesh(
    pelvis,
    new THREE.OctahedronGeometry(0.033, d === "high" ? 2 : 0),
    mats.jade,
    [0, 0.115, -0.119],
    [0.75, 1.3, 0.3],
    [0, 0, 0.16],
    "JadePendant",
  );
  for (let i = 0; i < 2; i++)
    line(
      pelvis,
      [
        [(i ? 1 : -1) * 0.018, 0.09, -0.135],
        [(i ? 1 : -1) * 0.024, 0.01, -0.145],
        [(i ? 1 : -1) * 0.03, -0.075, -0.15],
      ],
      0.0025,
      mats.gold,
      d,
      "Tassel" + i,
    );
  const len = Math.min(c.robe, hip - 0.06),
    flare = ["moon", "ice", "music"].includes(c.style) ? 0.75 : 0.32;
  clothPanel(
    pelvis,
    "FrontApronPanel",
    female ? 0.235 : 0.27,
    len,
    d,
    mats.cloth,
    [0, 0.02, -0.168],
    0,
    flare,
    h === 6,
  );
  clothPanel(
    pelvis,
    "BackLongCape",
    female ? 0.29 : 0.32,
    len + 0.04,
    d,
    mats.cloth,
    [0, 0.025, 0.165],
    Math.PI,
    flare,
  );
  clothPanel(
    pelvis,
    "LeftHipTasset",
    0.15,
    len * 0.82,
    d,
    mats.cloth,
    [-(female ? 0.18 : 0.195), 0, 0],
    Math.PI / 2,
    0.32,
  );
  clothPanel(
    pelvis,
    "RightHipTasset",
    0.15,
    len * 0.82,
    d,
    mats.cloth,
    [female ? 0.18 : 0.195, 0, 0],
    -Math.PI / 2,
    0.32,
  );
  for (const side of [-1, 1]) {
    const ribbon = group(
      chest,
      "CelestialRibbon" + side,
      [side * 0.12, 0.05, 0.07],
      "ribbon",
    );
    line(
      ribbon,
      [
        [0, 0, 0],
        [side * 0.23, 0.08, 0.1],
        [side * 0.39, -0.18, 0.14],
        [side * 0.25, -0.42, 0.18],
        [side * 0.12, -0.25, 0.18],
      ],
      0.013,
      h === 4 ? mats.veil : mats.cloth,
      d,
      "FloatingSilkRibbon",
    );
  }
  customOutfit(root, pelvis, chest, head, h, c, d, mats);
  if ([4, 6, 10].includes(h)) {
    const w = buildSoulWeapon(h, d, {
      color: new THREE.Color(c.eye).getHex(),
      skin,
      engravingAtlas: mats.cloth,
    });
    w.position.set(
      h === 10 || h === 6 ? 0 : 0.32,
      h === 10 ? 1.03 : 1.16,
      h === 6 ? 0.24 : -0.31,
    );
    if (h === 10) w.rotation.x = -Math.PI / 2 - 0.52;
    if (h === 4) {
      w.position.set(0.43, 1.4, 0.21);
      w.rotation.y = Math.PI - 0.15;
    }
    root.add(w);
  }
  if (costume === 1)
    for (const side of [-1, 1])
      plate(
        chest,
        0.19,
        0.2,
        0.025,
        mats.gold,
        d,
        [side * 0.19, 0.08, 0.03],
        [0, 0, side * 0.4],
        "CostumeGrandArmor",
      );
  if (costume === 2)
    ornament(root, 0.29, mats.gold, d, [0, height + 0.07, 0], [0, 0, 0]);
  if (costume === 3)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mesh(
        root,
        new THREE.OctahedronGeometry(0.022, 0),
        mats.jade,
        [Math.sin(a) * 0.3, 1.25 + Math.cos(a) * 0.15, 0.17],
        [1, 2, 1],
      );
    }
  root.scale.setScalar(scale);
  if (d === "low") batchGeometrySubtree(root);
  syncSoulRingVisuals(root, actor, d, 0);
  return root;
}
function batchGeometrySubtree(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(),
    buckets = new Map(),
    all = [];
  root.traverse((o) => {
    if (o.isMesh) all.push(o);
  });
  for (const o of all) {
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    const list = buckets.get(o.material) ?? [];
    list.push(flat);
    buckets.set(o.material, list);
    o.removeFromParent();
  }
  for (const [mat, list] of buckets) {
    const g = mergeGeometries(list, false);
    if (!g) throw Error("Distant hero material batch mismatch");
    g.userData.sharedArt = true;
    list.forEach((v) => v.dispose());
    mesh(root, g, mat, [0, 0, 0], [1, 1, 1], [0, 0, 0], "DistantMaterialBatch");
  }
  if (root.userData.anatomy) root.userData.anatomy.distantStaticBatch = true;
}
export function buildMaleHeroAnatomy(actor, detail = "high") {
  return buildAnatomy(actor, detail, false);
}
export function buildFemaleHeroAnatomy(actor, detail = "high") {
  return buildAnatomy(actor, detail, true);
}
export function buildHeroAnatomy(actor, detail = "high") {
  return HERO_APPEARANCE[actor.hero ?? 0].gender === "female"
    ? buildFemaleHeroAnatomy(actor, detail)
    : buildMaleHeroAnatomy(actor, detail);
}
export function animateHeroAnatomy(root, actor, time, speed) {
  silkTime.value = time;
  syncSoulRingVisuals(root, actor, root.userData.detail ?? "low", time);
  if (root.userData.detail === "high" && actor.id === "preview")
    characterPBR.prepare(root, "high");
  root.traverse((o) => {
    const role = o.userData.rigRole,
      side = o.name.endsWith("L") ? 1 : -1;
    if (role === "thigh")
      o.rotation.x = Math.sin(time * 9) * speed * 0.43 * side;
    if (role === "calf")
      o.rotation.x = Math.max(0, -Math.sin(time * 9) * side) * speed * 0.42;
    if (role === "upperArm")
      o.rotation.x =
        root.userData.artHero === 10
          ? 0
          : -0.08 -
            Math.sin(time * 9) * speed * 0.18 * side -
            (actor.cooldowns?.[5] > 0.6 ? 0.3 : 0);
    if (role === "forearm")
      o.rotation.x =
        root.userData.artHero === 10
          ? 1.48 + Math.sin(time * 3) * 0.01
          : -0.13 +
            Math.sin(time * 3) * 0.025 -
            (actor.cooldowns?.[5] > 0.6 ? 0.3 : 0);
    if (role === "hair")
      o.rotation.x =
        Math.sin(time * 2.5 + (o.userData.hair?.index ?? 2) * 0.4) *
          (o.userData.hair?.amplitude ?? 0.025) +
        speed * 0.09;
    if (role === "cloth") {
      const b = o.userData.cloth?.baseRotation ?? [0, 0, 0];
      o.rotation.set(
        b[0] +
          Math.sin(time * 2.4 + (o.userData.cloth?.phase ?? 0)) * 0.025 +
          speed * 0.12,
        b[1],
        b[2],
      );
    }
    if (role === "ribbon")
      o.rotation.x = Math.sin(time * 2 + side) * 0.08 + speed * 0.11;
    if (role === "tail")
      o.rotation.z = Math.sin(time * 2.5 + o.name.length) * 0.08;
    if (role === "wing") o.rotation.y = Math.sin(time * 2.5) * 0.1 * side;
    if (role === "foxEar") {
      const ear = o.userData.foxEar;
      o.rotation.set(
        Math.sin(time * 2 + ear.side) * 0.012,
        0,
        ear.baseTilt + Math.sin(time * 1.7 + ear.side) * 0.016,
      );
    }
  });
  animateSoulWeapons(root, time);
}
export function anatomyCacheStats() {
  return {
    faces: faceCache.size,
    geometry: meshCache.size,
    materials: materialCache.size,
    textureSize: textileMaps?.normal.image.width ?? 0,
    characterPBR: characterPBR.stats(),
    faceResolutions: [...faceCache.values()].reduce((a, t) => {
      a[t.image.width] = (a[t.image.width] ?? 0) + 1;
      return a;
    }, {}),
  };
}
