import { createHunyuanStaffGroup,hydrateHunyuanStaff } from './manual-staff.js';
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { characterPBR, HERO_BROCADE_PATTERNS } from "./character-pbr.js";

// All dimensions are metres. Geometry and materials are shared between clones;
// animation changes articulated groups rather than their shared buffers.
const templates = new Map();
const geometries = new Map();
const materials = new Map();
const LEVELS = {
  high: { radial: 24, tube: 32, curved: 18, bevel: 3, ornaments: 12 },
  medium: { radial: 6, tube: 6, curved: 5, bevel: 1, ornaments: 4 },
  low: { radial: 4, tube: 3, curved: 2, bevel: 0, ornaments: 3 },
};
const COLORS = [
  0x10b981, 0xf59e0b, 0xc084fc, 0x38bdf8, 0xfde047, 0x0ea5e9, 0xef4444,
  0x67e8f9, 0x818cf8, 0xfbbf24, 0x34d399, 0xa855f7,
];
export const SOUL_WEAPON_SPEC = [
  {
    name: "Mộc Tinh Trượng",
    weaponType: "wood-dragon-lotus-staff",
    metricLength: 2.0384,
    handedness: "right",
    woodStrands: 3,
    petalCount: 12,
  },
  {
    name: "Chấn Nhạc Chùy",
    weaponType: "octagonal-stone-hammer",
    metricLength: 1.85,
    handedness: "both",
    headSides: 8,
  },
  {
    name: "Song Ảnh Nhận",
    weaponType: "reverse-crescent-blades",
    metricLength: 0.65,
    handedness: "paired",
    bladeCount: 2,
  },
  {
    name: "Lôi Vũ Phiến",
    weaponType: "nine-feather-lightning-fan",
    metricLength: 0.9,
    handedness: "right",
    featherCount: 9,
    fanAngleDegrees: 120,
  },
  {
    name: "Nguyệt Linh Kính",
    weaponType: "floating-moon-mirror",
    metricLength: 0.65,
    handedness: "floating",
    intrinsicDiameter: 0.65,
    transmission: 0.85,
    iridescence: 1,
  },
  {
    name: "Huyền Quy Thuẫn",
    weaponType: "hexagonal-turtle-shield",
    metricLength: 1.35,
    handedness: "left",
    shieldSides: 6,
  },
  {
    name: "Diệm Liên Luân",
    weaponType: "eight-petal-fire-wheel",
    metricLength: 0.86,
    handedness: "floating",
    petalCount: 8,
  },
  {
    name: "Pháp Trượng Băng Điệp",
    weaponType: "articulated-butterfly-staff",
    metricLength: 1.65,
    handedness: "right",
    wingCount: 4,
  },
  {
    name: "Huyền Nguyệt Cung",
    weaponType: "hawk-crescent-energy-bow",
    metricLength: 1.55,
    handedness: "left",
    stringCount: 1,
  },
  {
    name: "Kim Hổ Trảo",
    weaponType: "four-claw-tiger-gauntlets",
    metricLength: 0.69,
    handedness: "paired",
    clawsPerHand: 4,
    clawLength: 0.45,
  },
  {
    name: "Thanh Ngọc Cầm",
    weaponType: "seven-string-phoenix-guqin",
    metricLength: 1.3,
    handedness: "floating",
    stringCount: 7,
  },
  {
    name: "Hư Ảnh Xà Trượng",
    weaponType: "dual-serpent-void-staff",
    metricLength: 1.9,
    handedness: "right",
    serpentCount: 2,
  },
];

function cachedGeometry(key, build) {
  if (!geometries.has(key)) {
    const geometry = build();
    geometry.computeVertexNormals();
    geometry.userData.sharedArt = true;
    geometries.set(key, geometry);
  }
  return geometries.get(key);
}

function material(color, role, detail, skin) {
  const key = `${color}:${role}:${detail}:${skin}`;
  if (!materials.has(key)) {
    const glow = role === "energy",
      moonMirror = role === "mirror",
      glass = role === "jade" || moonMirror || role === "void";
    const m = new T.MeshPhysicalMaterial({
      color,
      metalness: moonMirror
        ? 0.04
        : role === "metal"
          ? 0.84
          : role === "stone"
            ? 0.18
            : 0.12,
      roughness: moonMirror
        ? 0.07
        : role === "wood"
          ? 0.62
          : role === "stone"
            ? 0.52
            : 0.24,
      clearcoat: moonMirror ? 1 : detail === "high" ? 0.95 : 0.3,
      clearcoatRoughness: moonMirror ? 0.06 : 0.2,
      emissive: glow
        ? color
        : glass && !moonMirror
          ? new T.Color(color).multiplyScalar(0.12)
          : 0,
      emissiveIntensity: glow ? 1.6 : 0.25,
      transmission: moonMirror
        ? 0.85
        : glass && detail === "high"
          ? role === "void"
            ? 0.25
            : 0.45
          : 0,
      thickness: moonMirror ? 0.045 : glass ? 0.08 : 0,
      iridescence: moonMirror
        ? 1
        : role === "void"
          ? 0.9
          : skin === 2
            ? 0.7
            : glass
              ? 0.3
              : 0,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: moonMirror ? [120, 420] : [100, 400],
      ior: moonMirror ? 1.52 : 1.5,
      attenuationColor: moonMirror ? 0xdcefff : 0xffffff,
      attenuationDistance: moonMirror ? 0.8 : Infinity,
      envMapIntensity: moonMirror ? 1.25 : 1,
      side: T.DoubleSide,
    });
    m.userData.sharedArt = true;
    m.userData.weaponRole = role;
    if (moonMirror) {
      m.name = "MoonMirrorTransmissiveSurface";
      m.userData.soulOpticalSurface = true;
    }
    materials.set(key, m);
  }
  const result = materials.get(key);
  result.userData.weaponRole = role;
  return result;
}

function group(parent, name, position = [0, 0, 0]) {
  const g = new T.Group();
  g.name = name;
  g.position.fromArray(position);
  parent.add(g);
  return g;
}

function mesh(
  parent,
  geometry,
  mat,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const m = new T.Mesh(geometry, mat);
  m.position.fromArray(position);
  m.scale.fromArray(scale);
  m.rotation.set(...rotation);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cylinder(
  parent,
  mat,
  radius,
  length,
  position,
  d,
  rotation = [0, 0, 0],
  top = radius,
) {
  const geometry = cachedGeometry(
    `cylinder:${d}:${top / radius}`,
    () => new T.CylinderGeometry(top / radius, 1, 1, LEVELS[d].radial, 1),
  );
  return mesh(
    parent,
    geometry,
    mat,
    position,
    [radius, length, radius],
    rotation,
  );
}

function orb(parent, mat, r, position, d, scale = [1, 1, 1]) {
  const geometry = cachedGeometry(
    `orb:${d}`,
    () =>
      new T.SphereGeometry(
        1,
        LEVELS[d].radial,
        Math.max(4, LEVELS[d].radial / 2),
      ),
  );
  return mesh(
    parent,
    geometry,
    mat,
    position,
    scale.map((v) => v * r),
  );
}

function ring(
  parent,
  mat,
  radius,
  thickness,
  position,
  d,
  rotation = [0, 0, 0],
  arc = Math.PI * 2,
) {
  const geometry = cachedGeometry(
    `ring:${d}:${thickness / radius}:${arc}`,
    () =>
      new T.TorusGeometry(
        1,
        thickness / radius,
        Math.max(3, LEVELS[d].radial / 2),
        LEVELS[d].tube * 2,
        arc,
      ),
  );
  return mesh(
    parent,
    geometry,
    mat,
    position,
    [radius, radius, radius],
    rotation,
  );
}

function tube(parent, mat, points, radius, d, name = "engravedCurve") {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  const geometry = new T.TubeGeometry(
    curve,
    LEVELS[d].tube,
    radius,
    Math.max(3, Math.floor(LEVELS[d].radial / 2)),
    false,
  );
  geometry.userData.sharedArt = true;
  const m = mesh(parent, geometry, mat);
  m.name = name;
  return m;
}

function shapeMesh(parent, mat, points, depth, d, name) {
  const shape = new T.Shape();
  shape.moveTo(...points[0]);
  for (const p of points.slice(1)) shape.lineTo(...p);
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: LEVELS[d].bevel > 0,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.35,
    bevelSegments: LEVELS[d].bevel,
    curveSegments: LEVELS[d].curved,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.userData.sharedArt = true;
  const m = mesh(parent, geometry, mat);
  m.name = name;
  return m;
}

function petal(
  parent,
  mat,
  width,
  length,
  depth,
  d,
  angle = 0,
  position = [0, 0, 0],
  name = "petal",
) {
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(
    -width * 0.56,
    length * 0.27,
    -width * 0.56,
    length * 0.72,
    0,
    length,
  );
  shape.bezierCurveTo(
    width * 0.56,
    length * 0.72,
    width * 0.56,
    length * 0.27,
    0,
    0,
  );
  const geometry = new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: LEVELS[d].bevel > 0,
    bevelThickness: depth * 0.4,
    bevelSize: depth * 0.35,
    bevelSegments: LEVELS[d].bevel,
    curveSegments: LEVELS[d].curved,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.userData.sharedArt = true;
  const m = mesh(parent, geometry, mat, position, [1, 1, 1], [0, 0, angle]);
  m.name = name;
  return m;
}

function gem(parent, mat, r, position, d) {
  return mesh(
    parent,
    cachedGeometry(
      `gem:${d}`,
      () => new T.OctahedronGeometry(1, d === "high" ? 1 : 0),
    ),
    mat,
    position,
    [r, r * 1.35, r],
  );
}

function engrave(parent, mat, radius, count, d, z = 0.04) {
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count;
    tube(
      parent,
      mat,
      [
        [Math.sin(a) * radius * 0.72, Math.cos(a) * radius * 0.72, z],
        [
          Math.sin(a + 0.1) * radius * 0.86,
          Math.cos(a + 0.1) * radius * 0.86,
          z,
        ],
        [Math.sin(a) * radius, Math.cos(a) * radius, z],
      ],
      0.005,
      d,
      "carvedRune",
    );
  }
}

function staff(parent, ctx, height, twists = 0) {
  const { d, gold, wood } = ctx;
  if (twists) {
    for (let j = 0; j < twists; j++) {
      const pts = [];
      for (let i = 0; i <= LEVELS[d].tube; i++) {
        const t = i / LEVELS[d].tube,
          a = t * Math.PI * 5 + (j * Math.PI * 2) / twists;
        pts.push([
          Math.cos(a) * 0.025,
          -height / 2 + t * height,
          Math.sin(a) * 0.025,
        ]);
      }
      tube(parent, wood, pts, 0.018, d, "twistedWoodStrand");
    }
  } else cylinder(parent, gold, 0.027, height, [0, 0, 0], d, [0, 0, 0], 0.021);
  for (const y of [-height * 0.42, -height * 0.14, height * 0.16, height * 0.4])
    ring(parent, gold, 0.035, 0.007, [0, y, 0], d, [Math.PI / 2, 0, 0]);
}


function stoneHammer(g, c) {
  staff(g, c, 1.45);
  for (let i = 0; i < (c.d === "low" ? 3 : 13); i++)
    ring(g, c.wood, 0.036, 0.011, [0, -0.5 + i * 0.055, 0], c.d, [
      Math.PI / 2,
      0,
      0,
    ]);
  const head = group(g, "octagonalHammerHead", [0, 0.77, 0]);
  const geo = cachedGeometry(
    "octagonalHammerHead",
    () => new T.CylinderGeometry(1, 1, 1, 8, 1),
  );
  mesh(head, geo, c.stone, [0, 0, 0], [0.29, 0.67, 0.29], [0, 0, Math.PI / 2]);
  for (const x of [-0.34, 0.34]) {
    mesh(
      head,
      geo,
      c.gold,
      [x, 0, 0],
      [0.31, 0.035, 0.31],
      [0, 0, Math.PI / 2],
    );
    petal(
      head,
      c.gold,
      0.18,
      0.2,
      0.04,
      c.d,
      Math.PI,
      [x, 0.07, 0.27],
      "stoneQilinMuzzle",
    );
  }
  for (let i = 0; i < (c.d === "low" ? 3 : 7); i++) {
    const x = -0.26 + i * 0.085;
    tube(
      head,
      c.energy,
      [
        [x, -0.17, 0.244],
        [x + 0.055, -0.05, 0.294],
        [x - 0.015, 0.07, 0.294],
        [x + 0.025, 0.23, 0.24],
      ],
      0.007,
      c.d,
      "moltenStoneCrack",
    );
  }
  for (let i = 0; i < (c.d === "low" ? 3 : 5); i++)
    ring(
      g,
      c.gold,
      0.036,
      0.009,
      [Math.sin(i * 0.55) * 0.065, -0.75 - i * 0.055, 0],
      c.d,
      [0, ((i % 2) * Math.PI) / 2, 0],
    );
  mesh(
    g,
    cachedGeometry("chainMace", () => new T.IcosahedronGeometry(1, 0)),
    c.stone,
    [0.06, -1.055, 0],
    [0.08, 0.08, 0.08],
  );
}

function crescentBlade(g, c, offset = 0) {
  const h = group(g, "reverseGripBlade", [offset, 0, 0]);
  cylinder(h, c.wood, 0.026, 0.2, [0, 0.06, 0], c.d);
  ring(h, c.gold, 0.055, 0.012, [0, 0.18, 0], c.d, [Math.PI / 2, 0, 0]);
  const points = [
    [-0.025, 0.13],
    [-0.15, -0.07],
    [-0.18, -0.33],
    [-0.075, -0.46],
    [0.13, -0.5],
    [0.23, -0.4],
    [0.07, -0.42],
    [-0.015, -0.32],
    [-0.035, -0.14],
    [0.045, 0.13],
  ];
  shapeMesh(h, c.jade, points, 0.025, c.d, "reverseCrescentEdge");
  tube(
    h,
    c.energy,
    [
      [-0.025, 0.13, 0.017],
      [-0.11, -0.11, 0.017],
      [-0.12, -0.3, 0.017],
      [0.02, -0.43, 0.017],
      [0.22, -0.4, 0.017],
    ],
    0.006,
    c.d,
    "moonBladeRim",
  );
  gem(h, c.energy, 0.032, [0, 0.2, 0], c.d);
}

function lightningFan(g, c) {
  cylinder(g, c.gold, 0.023, 0.25, [0, -0.14, 0], c.d);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 3 + (i * Math.PI) / 12;
    const feather = group(g, "lightningFeather");
    feather.rotation.z = a;
    petal(
      feather,
      c.jade,
      0.112,
      0.68,
      0.015,
      c.d,
      0,
      [0, 0, (i % 2) * 0.009],
      "crystalFeatherBlade",
    );
    tube(
      feather,
      c.gold,
      [
        [0, 0, 0.022],
        [0, 0.3, 0.022],
        [0, 0.65, 0.022],
      ],
      0.008,
      c.d,
      "featherSpine",
    );
    if (c.d !== "low")
      for (const s of [-1, 1])
        for (let j = 1; j <= (c.d === "high" ? 3 : 2); j++)
          tube(
            feather,
            c.energy,
            [
              [0, 0.16 + j * 0.1, 0.024],
              [s * 0.032, 0.2 + j * 0.1, 0.024],
            ],
            0.003,
            c.d,
            "featherBarb",
          );
  }
  const core = group(g, "thunderOrb", [0, 0.13, 0.04]);
  core.userData.soulMotion = "orb";
  orb(core, c.energy, 0.06, [0, 0, 0], c.d);
  ring(core, c.gold, 0.09, 0.008, [0, 0, 0], c.d);
  for (let i = 0; i < 3; i++)
    tube(
      g,
      c.energy,
      [
        [-0.36 + i * 0.25, 0.36, 0.04],
        [-0.29 + i * 0.25, 0.45, 0.04],
        [-0.35 + i * 0.25, 0.47, 0.04],
        [-0.26 + i * 0.25, 0.57, 0.04],
      ],
      0.006,
      c.d,
      "lightningArc",
    );
}

function moonMirror(g, c) {
  const frameDetail = c.d === "low" ? "medium" : c.d;
  const circle = cachedGeometry(
    `mirror:${c.d}`,
    () => new T.CircleGeometry(1, Math.max(12, LEVELS[c.d].tube * 2)),
  );
  const surface = mesh(g, circle, c.mirror, [0, 0, 0], [0.292, 0.292, 1]);
  surface.name = "paleReflectiveMirrorSurface";
  surface.castShadow = false;
  surface.receiveShadow = false;
  ring(g, c.gold, 0.306, 0.018, [0, 0, 0], frameDetail);
  ring(g, c.gold, 0.286, 0.005, [0, 0, 0.012], frameDetail);
  // The moon relief follows the left rim, leaving the optical field open.
  const crescent = new T.Shape();
  crescent.moveTo(0, 0.3);
  crescent.bezierCurveTo(-0.18, 0.3, -0.31, 0.16, -0.31, 0);
  crescent.bezierCurveTo(-0.31, -0.16, -0.18, -0.3, 0, -0.3);
  crescent.bezierCurveTo(-0.16, -0.23, -0.265, -0.13, -0.265, 0);
  crescent.bezierCurveTo(-0.265, 0.13, -0.16, 0.23, 0, 0.3);
  const relief = new T.ExtrudeGeometry(crescent, {
    depth: 0.012,
    bevelEnabled: LEVELS[c.d].bevel > 0,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: LEVELS[c.d].bevel,
    curveSegments: LEVELS[c.d].curved,
    steps: 1,
  });
  relief.userData.sharedArt = true;
  mesh(g, relief, c.gold, [0, 0, 0.012]).name = "whiteGoldRimCrescent";
  engrave(g, c.gold, 0.3, LEVELS[c.d].ornaments, c.d, 0.025);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      tube(
        g,
        c.gold,
        [
          [side * (0.247 + i * 0.013), -0.08 + i * 0.07, 0.03],
          [side * (0.277 + i * 0.008), -0.1 + i * 0.07, 0.03],
          [side * (0.302 - i * 0.003), -0.055 + i * 0.07, 0.03],
        ],
        0.006,
        c.d,
        "auspiciousCloudCarving",
      );
  if (c.skin) {
    const count = c.skin === 2 ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count + Math.PI / 6;
      gem(
        g,
        c.skin === 2 ? c.jade : c.gold,
        0.011,
        [Math.sin(a) * 0.302, Math.cos(a) * 0.302, 0.025],
        c.d,
      );
    }
    if (c.skin === 2)
      ring(g, c.energy, 0.298, 0.003, [0, 0, 0.025], frameDetail);
  }
  g.userData.soulMotion = "floating";
}

function turtleShield(g, c) {
  const points = Array.from({ length: 6 }, (_, i) => [
    Math.sin((i * Math.PI) / 3) * 0.48,
    Math.cos((i * Math.PI) / 3) * 0.675,
  ]);
  shapeMesh(g, c.stone, points, 0.13, c.d, "hexagonalTurtleShell");
  for (let i = 0; i < 6; i++) {
    const a = points[i],
      b = points[(i + 1) % 6];
    tube(
      g,
      c.gold,
      [
        [...a, 0.085],
        [...b, 0.085],
      ],
      0.025,
      c.d,
      "shieldRim",
    );
    const next = points[(i + 1) % 6];
    tube(
      g,
      c.energy,
      [
        [a[0] * 0.83, a[1] * 0.83, 0.1],
        [a[0] * 0.36, a[1] * 0.36, 0.15],
        [next[0] * 0.36, next[1] * 0.36, 0.15],
      ],
      0.009,
      c.d,
      "turtleHexEngraving",
    );
  }
  shapeMesh(
    g,
    c.gold,
    [
      [-0.12, -0.11],
      [-0.17, 0.02],
      [-0.12, 0.18],
      [0, 0.24],
      [0.12, 0.18],
      [0.17, 0.02],
      [0.12, -0.11],
    ],
    0.095,
    c.d,
    "xuanwuHeadRelief",
  ).position.z = 0.12;
  gem(g, c.jade, 0.085, [0, -0.07, 0.21], c.d);
  for (const x of [-0.075, 0.075])
    gem(g, c.energy, 0.022, [x, 0.11, 0.19], c.d);
  ring(g, c.energy, 0.37, 0.006, [0, 0, 0.11], c.d);
}

function fireWheel(g, c) {
  const rotor = group(g, "fireWheelRotor");
  rotor.userData.soulMotion = "wheel";
  ring(rotor, c.gold, 0.24, 0.026, [0, 0, 0], c.d);
  ring(rotor, c.energy, 0.3, 0.01, [0, 0, 0], c.d);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    petal(
      rotor,
      c.jade,
      0.16,
      0.28,
      0.025,
      c.d,
      a,
      [-Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0],
      "fireLotusPetal",
    );
    tube(
      rotor,
      c.energy,
      [
        [Math.sin(a) * 0.09, Math.cos(a) * 0.09, 0.025],
        [Math.sin(a + 0.13) * 0.32, Math.cos(a + 0.13) * 0.32, 0.025],
        [Math.sin(a) * 0.41, Math.cos(a) * 0.41, 0.025],
      ],
      0.005,
      c.d,
      "firePetalEngraving",
    );
  }
  gem(rotor, c.energy, 0.07, [0, 0, 0], c.d);
}

function butterflyStaff(g, c) {
  staff(g, c, 1.36);
  tube(
    g,
    c.jade,
    [
      [0, -0.64, 0],
      [-0.03, 0, 0],
      [0.05, 0.62, 0],
      [0, 0.78, 0],
    ],
    0.018,
    c.d,
    "iceCrystalStaff",
  );
  const butterfly = group(g, "iceButterfly", [0, 0.78, 0]);
  cylinder(butterfly, c.gold, 0.017, 0.2, [0, 0, 0], c.d);
  for (const side of [-1, 1]) {
    const wing = group(butterfly, `butterflyWing${side}`, [side * 0.015, 0, 0]);
    wing.userData.soulMotion = "wing";
    wing.userData.side = side;
    petal(
      wing,
      c.jade,
      0.22,
      0.35,
      0.012,
      c.d,
      -side * 0.93,
      [0, 0, 0],
      "upperIceWing",
    );
    petal(
      wing,
      c.jade,
      0.18,
      0.25,
      0.012,
      c.d,
      -side * 2.1,
      [0, 0.015, 0],
      "lowerIceWing",
    );
    for (let i = 0; i < (c.d === "low" ? 2 : 5); i++) {
      const a = (0.42 + i * 0.19) * side;
      tube(
        wing,
        c.energy,
        [
          [0, 0, 0.012],
          [Math.sin(a) * 0.18, Math.cos(a) * 0.14, 0.014],
          [Math.sin(a) * 0.29, Math.cos(a) * 0.2, 0.012],
        ],
        0.003,
        c.d,
        "frostWingVein",
      );
    }
  }
  for (const side of [-1, 1])
    tube(
      butterfly,
      c.gold,
      [
        [0, 0.09, 0],
        [side * 0.04, 0.17, 0],
        [side * 0.075, 0.18, 0],
      ],
      0.005,
      c.d,
      "butterflyAntenna",
    );
}

function moonBow(g, c) {
  for (const side of [-1, 1]) {
    tube(
      g,
      c.gold,
      [
        [0, 0, 0],
        [-0.2, side * 0.25, 0],
        [-0.23, side * 0.5, 0],
        [0.04, side * 0.775, 0],
      ],
      0.028,
      c.d,
      "hawkBowLimb",
    );
    for (let i = 0; i < (c.d === "low" ? 2 : 5); i++) {
      const f = petal(
        g,
        c.jade,
        0.085,
        0.22,
        0.012,
        c.d,
        side * (0.38 + i * 0.1),
        [-0.12 - i * 0.018, side * (0.26 + i * 0.068), 0],
        "hawkWingFeather",
      );
      if (side < 0) f.rotation.z += Math.PI;
    }
  }
  tube(
    g,
    c.energy,
    [
      [0.04, -0.775, 0],
      [0.13, 0, 0],
      [0.04, 0.775, 0],
    ],
    0.004,
    c.d,
    "energyBowstring",
  );
  ring(
    g,
    c.gold,
    0.1,
    0.018,
    [-0.035, 0, 0],
    c.d,
    [0, 0, -0.7],
    Math.PI * 1.35,
  );
  tube(
    g,
    c.energy,
    [
      [-0.39, 0, 0.035],
      [0.13, 0, 0.035],
      [0.45, 0, 0.035],
    ],
    0.007,
    c.d,
    "condensedStarlightArrow",
  );
  shapeMesh(
    g,
    c.energy,
    [
      [0.45, 0.06],
      [0.59, 0],
      [0.45, -0.06],
      [0.48, 0],
    ],
    0.008,
    c.d,
    "starlightArrowhead",
  ).position.z = 0.035;
}

function tigerClaws(g, c, offset = 0) {
  const hand = group(g, "tigerClawUnit", [offset, 0, 0]);
  cylinder(hand, c.gold, 0.085, 0.22, [0, -0.13, 0], c.d, [0, 0, 0], 0.1);
  const face = shapeMesh(
    hand,
    c.gold,
    [
      [-0.11, -0.18],
      [-0.11, 0.02],
      [-0.065, 0.09],
      [0, 0.055],
      [0.065, 0.09],
      [0.11, 0.02],
      [0.11, -0.18],
    ],
    0.1,
    c.d,
    "tigerHeadGauntlet",
  );
  face.position.z = 0.035;
  for (const s of [-1, 1]) {
    gem(hand, c.energy, 0.017, [s * 0.051, -0.015, 0.095], c.d);
    for (let i = 0; i < 2; i++)
      tube(
        hand,
        c.stone,
        [
          [s * 0.09, -0.04 - i * 0.035, 0.097],
          [s * 0.04, -0.07 - i * 0.035, 0.097],
        ],
        0.005,
        c.d,
        "tigerFaceStripe",
      );
  }
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.05;
    const claw = shapeMesh(
      hand,
      c.energy,
      [
        [x - 0.016, 0],
        [x - 0.02, 0.17],
        [x + 0.008, 0.35],
        [x + 0.07, 0.45],
        [x + 0.041, 0.3],
        [x + 0.019, 0.13],
        [x + 0.016, 0],
      ],
      0.016,
      c.d,
      "goldEnergyClaw",
    );
    claw.geometry.computeBoundingBox();
    const bounds = claw.geometry.boundingBox;
    claw.geometry.translate(0, -bounds.min.y, 0);
    claw.geometry.scale(1, 0.45 / (bounds.max.y - bounds.min.y), 1);
    claw.position.z = 0.07;
    claw.userData.metricLength = 0.45;
  }
}

function phoenixGuqin(g, c) {
  shapeMesh(
    g,
    c.jade,
    [
      [-0.65, -0.095],
      [-0.56, -0.12],
      [0.47, -0.12],
      [0.65, -0.065],
      [0.65, 0.065],
      [0.47, 0.12],
      [-0.56, 0.12],
      [-0.65, 0.095],
    ],
    0.08,
    c.d,
    "solidJadeGuqinSoundboard",
  );
  for (const y of [-0.108, 0.108])
    tube(
      g,
      c.gold,
      [
        [-0.59, y, 0.055],
        [0, y, 0.055],
        [0.56, y * 0.75, 0.055],
      ],
      0.008,
      c.d,
      "guqinGoldInlay",
    );
  for (const x of [-0.48, 0.48])
    cylinder(g, c.gold, 0.013, 0.2, [x, 0, 0.06], c.d, [0, 0, 0]);
  for (let i = 0; i < 7; i++) {
    const y = (i - 3) * 0.025;
    tube(
      g,
      c.energy,
      [
        [-0.51, y, 0.077],
        [0, y, 0.077],
        [0.51, y, 0.077],
      ],
      0.0027,
      c.d,
      "guqinString",
    );
  }
  for (let i = 0; i < 5; i++)
    petal(
      g,
      i % 2 ? c.gold : c.jade,
      0.07,
      0.22 - Math.abs(i - 2) * 0.025,
      0.013,
      c.d,
      -Math.PI / 2 + (i - 2) * 0.16,
      [0.43, (i - 2) * 0.025, 0.02],
      "phoenixTailCarving",
    );
  const count = c.d === "low" ? 3 : 13;
  for (let i = 0; i < count; i++)
    gem(g, c.gold, 0.007, [-0.43 + i * 0.065, 0.075, 0.065], c.d);
}

function serpentStaff(g, c) {
  staff(g, c, 1.59);
  for (let side = 0; side < 2; side++) {
    const points = [];
    for (let i = 0; i <= LEVELS[c.d].tube; i++) {
      const t = i / LEVELS[c.d].tube,
        a = t * Math.PI * 6 + side * Math.PI;
      points.push([
        Math.cos(a) * (0.04 + t * 0.075),
        -0.68 + t * 1.6,
        Math.sin(a) * 0.055,
      ]);
    }
    tube(g, c.jade, points, 0.028, c.d, "voidCrystalSerpent");
    const s = side ? -1 : 1;
    shapeMesh(
      g,
      c.jade,
      [
        [s * 0.12, 0.82],
        [s * 0.14, 0.95],
        [s * 0.06, 1],
        [s * 0.015, 0.94],
        [s * 0.06, 0.9],
      ],
      0.055,
      c.d,
      "openSerpentJaw",
    );
    gem(g, c.energy, 0.013, [s * 0.085, 0.962, 0.036], c.d);
    if (c.d !== "low")
      for (let i = 0; i < 8; i++)
        ring(
          g,
          c.gold,
          0.032,
          0.003,
          [Math.cos(i * 0.7 + side * Math.PI) * 0.07, -0.4 + i * 0.14, 0.04],
          c.d,
        );
  }
  orb(g, c.voidMat, 0.09, [0, 1.005, 0], c.d);
  const orbit = group(g, "voidOrbOrbit", [0, 1.005, 0]);
  orbit.userData.soulMotion = "orb";
  ring(orbit, c.energy, 0.12, 0.006, [0, 0, 0], c.d, [0.5, 0.7, 0]);
  ring(orbit, c.gold, 0.135, 0.005, [0, 0, 0], c.d, [-0.7, 0.2, 0]);
}

function skinOrnaments(g, c, hero) {
  if (!c.skin) return;
  const count =
    c.skin === 2
      ? c.d === "high"
        ? 6
        : c.d === "medium"
          ? 4
          : 3
      : c.d === "low"
        ? 2
        : 3;
  const radius = hero === 10 ? 0.13 : 0.16;
  const ornament = group(
    g,
    c.skin === 2 ? "imperialSkinCrown" : "celestialSkinJewelry",
    [hero === 10 ? -0.22 : 0, 0, 0],
  );
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count;
    gem(
      ornament,
      c.skin === 2 ? c.jade : c.gold,
      c.skin === 2 ? 0.025 : 0.02,
      [Math.sin(a) * radius, Math.cos(a) * radius, 0.07],
      c.d,
    );
    if (c.skin === 2)
      petal(
        ornament,
        c.gold,
        0.035,
        0.095,
        0.009,
        c.d,
        -a,
        [Math.sin(a) * radius, Math.cos(a) * radius, 0.035],
        "imperialSkinFlame",
      );
  }
  if (c.skin === 2) ring(ornament, c.energy, radius, 0.005, [0, 0, 0.055], c.d);
}

function batchStatic(group) {
  for (const child of [...group.children])
    if (child.isGroup) batchStatic(child);
  const buckets = new Map();
  group.updateMatrix();
  for (const child of [...group.children]) {
    if (!child.isMesh) continue;
    child.updateMatrix();
    const geometry = (
      child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone()
    ).applyMatrix4(child.matrix);
    if (!buckets.has(child.material)) buckets.set(child.material, []);
    buckets.get(child.material).push(geometry);
    group.remove(child);
  }
  for (const [mat, list] of buckets) {
    const merged = mergeGeometries(list, false);
    for (const geometry of list) geometry.dispose();
    if (!merged) throw Error("Soul weapon geometry attributes differ");
    merged.userData.sharedArt = true;
    const m = mesh(group, merged, mat);
    m.name = "batchedWeaponCarving";
    if (mat.userData.soulOpticalSurface) {
      m.name = "paleReflectiveMirrorSurface";
      m.castShadow = false;
      m.receiveShadow = false;
    }
  }
}

function makeTemplate(hero, detail, color, skin, side) {
  const root = new T.Group();
  root.name = "soulWeapon";
  const sculpt = group(root, "weaponSculpt");
  const goldColor =
    hero === 4
      ? skin === 2
        ? 0xfff1be
        : skin === 1
          ? 0xe0ebff
          : 0xeee7d4
      : skin === 2
        ? 0xffd36b
        : skin === 1
          ? 0xf4e7c4
          : [2, 3, 4, 7, 8].includes(hero)
            ? 0xc4d6e3
            : 0xc6a04e;
  const c = {
    d: detail,
    skin,
    gold: material(goldColor, "metal", detail, skin),
    energy: material(color, "energy", detail, skin),
    jade: material(color, "jade", detail, skin),
    wood: material(hero === 0 ? 0x4b3924 : 0x302625, "wood", detail, skin),
    stone: material(hero === 5 ? 0x103d43 : 0x303340, "stone", detail, skin),
    mirror: material(0xe9f6ff, "mirror", detail, skin),
    voidMat: material(0x130b28, "void", detail, skin),
  };
  const builders = [
    null,
    stoneHammer,
    null,
    lightningFan,
    moonMirror,
    turtleShield,
    fireWheel,
    butterflyStaff,
    moonBow,
    null,
    phoenixGuqin,
    serpentStaff,
  ];
  if (hero === 2 || hero === 9) {
    const build = hero === 2 ? crescentBlade : tigerClaws;
    if (side === "left" || side === "right" || side === -1 || side === 1)
      build(sculpt, c);
    else {
      build(sculpt, c, -0.2);
      build(sculpt, c, 0.2);
    }
  } else builders[hero](sculpt, c);
  if (hero !== 4) skinOrnaments(sculpt, c, hero);
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(root, true),
    size = bounds.getSize(new T.Vector3());
  const axis = hero === 10 ? "x" : "y";
  const factor = SOUL_WEAPON_SPEC[hero].metricLength / size[axis];
  sculpt.scale.setScalar(factor);
  sculpt.position
    .copy(bounds.getCenter(new T.Vector3()))
    .multiplyScalar(-factor);
  const primitiveCounts = {};
  sculpt.traverse((o) => {
    if (o.isMesh)
      primitiveCounts[o.name || "mesh"] =
        (primitiveCounts[o.name || "mesh"] || 0) + 1;
  });
  root.userData = {
    ...SOUL_WEAPON_SPEC[hero],
    heroIndex: hero,
    detail,
    skin,
    side: side ?? "display",
    metricAxis: axis,
    proceduralMasterwork: true,
    primitiveCounts,
  };
  if (hero === 2 && side != null) root.userData.bladeCount = 1;
  if (hero === 9) root.userData.clawCount = (side == null ? 2 : 1) * 4;
  batchStatic(sculpt);
  root.updateMatrixWorld(true);
  const measured = new T.Box3()
    .setFromObject(root, true)
    .getSize(new T.Vector3());
  root.userData.measuredMetricLength = measured[axis];
  root.userData.triangleCount = 0;
  root.traverse((o) => {
    if (o.isMesh)
      root.userData.triangleCount +=
        (o.geometry.index
          ? o.geometry.index.count
          : o.geometry.attributes.position.count) / 3;
  });
  return root;
}

export function buildSoulWeapon(
  heroIndex,
  detail = "high",
  { color, skin = 0, side, engravingAtlas } = {},
) {
  const hero = Number.isInteger(heroIndex)
    ? heroIndex
    : /^H\d\d$/.test(heroIndex)
      ? Number(heroIndex.slice(1)) - 1
      : -1;
  if (hero < 0 || hero >= 12)
    throw new RangeError("Soul weapon heroIndex must be 0–11 or H01–H12");
  if (!LEVELS[detail])
    throw new RangeError("Soul weapon detail must be high, medium or low");
  if (![0, 1, 2].includes(skin))
    throw new RangeError("Soul weapon skin must be 0, 1 or 2");
  if (hero === 0) return createHunyuanStaffGroup(detail,skin);
  const tint = new T.Color(color ?? COLORS[hero]).getHex();
  const key = `${hero}:${detail}:${tint}:${skin}:${side ?? "display"}`;
  if (!templates.has(key))
    templates.set(key, makeTemplate(hero, detail, tint, skin, side));
  const clone = templates.get(key).clone(true);
  const atlas =
    engravingAtlas ??
    characterPBR.generateSilkBrocadeTexture(
      "#999999",
      "#555555",
      "#D4AF37",
      HERO_BROCADE_PATTERNS[hero],
      { detail },
    );
  return characterPBR.applyEngraving(clone, atlas);
}

export function animateSoulWeapons(root, time) {
  root.traverse((o) => {
    if(o.userData.hunyuanStaff&&['pending','loading'].includes(o.userData.status))hydrateHunyuanStaff(o);
    const motion = o.userData.soulMotion;
    if (motion === "lotus") o.rotation.y = time * 0.42;
    else if (motion === "wheel") o.rotation.z = time * 2.2;
    else if (motion === "orb") {
      o.rotation.y = time * 0.8;
      o.rotation.z = time * 0.4;
    } else if (motion === "wing")
      o.rotation.y = o.userData.side * (0.22 + Math.sin(time * 5) * 0.3);
  });
}
