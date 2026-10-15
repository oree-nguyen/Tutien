import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { getCreaturePBR } from "./creature-pbr.js";

// Each species has its own silhouette and articulated mesh. These are visual
// descriptions; authoritative combat names, health and rewards remain unchanged.
const geometryCache = new Map();
const materialCache = new Map();
const templateCache = new Map();
const emberMatrix = new T.Matrix4();
let activeProfile = "hide";
const lod = {
  high: { radial: 64, rows: 48, tube: 64, tubeRadial: 16, decoration: 1 },
  medium: { radial: 16, rows: 12, tube: 16, tubeRadial: 6, decoration: 0.5 },
  low: { radial: 8, rows: 5, tube: 6, tubeRadial: 4, decoration: 0.2 },
};
const species = ["wolf", "rhino", "firebird", "icebutterfly"];
const vec = (p) => new T.Vector3(...p);

function geometry(key, create) {
  if (!geometryCache.has(key)) {
    const g = create();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.userData.sharedArt = true;
    geometryCache.set(key, g);
  }
  return geometryCache.get(key);
}

function material(color, kind = "hide", detail = "medium") {
  const key = `${activeProfile}:${color}:${kind}:${detail}`;
  if (!materialCache.has(key)) {
    const glass = kind === "ice" || kind === "smoke";
    const m = new T.MeshPhysicalMaterial({
      color,
      roughness:
        kind === "metal" ? 0.32 : kind === "stone" ? 0.9 : glass ? 0.16 : 0.65,
      metalness: kind === "metal" ? 0.76 : 0.07,
      clearcoat: kind === "stone" ? 0.12 : detail === "high" ? 0.85 : 0.15,
      sheen: kind === "fur" ? 0.7 : 0,
      sheenColor: new T.Color(color),
      emissive: kind === "glow" || kind === "smoke" ? color : 0,
      emissiveIntensity: kind === "glow" ? 1.8 : kind === "smoke" ? 0.4 : 0,
      transmission:
        kind === "ice"
          ? detail === "high"
            ? 0.42
            : detail === "medium"
              ? 0.18
              : 0
          : 0,
      iridescence: kind === "ice" && detail === "high" ? 0.7 : 0,
      thickness: glass ? 0.06 : 0,
      transparent: glass,
      opacity: kind === "smoke" ? 0.32 : kind === "ice" ? 0.88 : 1,
      depthWrite: !glass,
      side:
        kind === "wing" ||
        kind === "smoke" ||
        kind === "ice" ||
        activeProfile === "firebird"
          ? T.DoubleSide
          : T.FrontSide,
    });
    if (["hide", "fur", "metal", "stone", "ice", "wing"].includes(kind)) {
      const maps = getCreaturePBR(activeProfile, detail, color);
      Object.assign(m, maps);
      m.normalScale.set(
        kind === "fur" ? 0.5 : kind === "stone" ? 0.7 : 0.25,
        kind === "fur" ? 0.5 : kind === "stone" ? 0.7 : 0.25,
      );
      if (maps.emissiveMap) {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity =
          activeProfile === "firebird" ? 0.55 : kind === "ice" ? 0.24 : 0.16;
      }
    }
    m.userData.creatureProfile = activeProfile;
    m.userData.sharedArt = true;
    materialCache.set(key, m);
  }
  return materialCache.get(key);
}

function mesh(
  parent,
  g,
  m,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const part = new T.Mesh(g, m);
  part.position.set(...position);
  part.scale.set(...scale);
  part.rotation.set(...rotation);
  part.castShadow = part.receiveShadow = m.opacity === 1;
  parent.add(part);
  return part;
}

function joint(parent, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const g = new T.Group();
  g.name = name;
  g.position.set(...position);
  g.rotation.set(...rotation);
  g.userData.restRotation = rotation;
  parent.add(g);
  return g;
}

// Smooth elliptical sections avoid spherical bead construction. Every profile
// controls its own flattened cross-section and can bend the longitudinal axis.
function loft(key, sections, detail, density = 1) {
  return geometry(`loft:${key}:${detail}:${density}`, () => {
    const s = lod[detail];
    const rows = Math.max(sections.length - 1, Math.round(s.rows * density));
    const radial = s.radial;
    const centers = new T.CatmullRomCurve3(
      sections.map((p) => new T.Vector3(p[3] || 0, p[0], p[4] || 0)),
    );
    const radii = new T.CatmullRomCurve3(
      sections.map(
        (p, i) => new T.Vector3(p[1], p[2], i / (sections.length - 1)),
      ),
    );
    const positions = [],
      uv = [],
      index = [];
    const ascending = sections.at(-1)[0] >= sections[0][0];
    for (let i = 0; i <= rows; i++) {
      const t = i / rows,
        c = centers.getPoint(t),
        r = radii.getPoint(t);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        positions.push(
          c.x + Math.cos(a) * Math.max(0.002, r.x),
          c.y,
          c.z + Math.sin(a) * Math.max(0.002, r.y),
        );
        uv.push(j / radial, t);
        if (i < rows && j < radial) {
          const k = i * (radial + 1) + j;
          if (ascending)
            index.push(
              k,
              k + radial + 1,
              k + 1,
              k + 1,
              k + radial + 1,
              k + radial + 2,
            );
          else
            index.push(
              k,
              k + 1,
              k + radial + 1,
              k + 1,
              k + radial + 2,
              k + radial + 1,
            );
        }
      }
    }
    for (const end of [0, rows]) {
      const c = centers.getPoint(end / rows),
        center = positions.length / 3;
      positions.push(c.x, c.y, c.z);
      uv.push(0.5, end / rows);
      for (let j = 0; j < radial; j++) {
        const k = end * (radial + 1) + j;
        if ((end === 0) === ascending) index.push(center, k, k + 1);
        else index.push(center, k + 1, k);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    return g;
  });
}

function form(
  parent,
  key,
  sections,
  m,
  detail,
  position,
  scale,
  rotation,
  density = 1,
) {
  return mesh(
    parent,
    loft(key, sections, detail, density),
    m,
    position,
    scale,
    rotation,
  );
}

function tube(parent, key, points, radius, m, detail, taper = 0.9, segments) {
  const g = geometry(`tube:${key}:${detail}:${segments || 0}`, () => {
    const c = new T.CatmullRomCurve3(points.map(vec));
    const longitudinal = segments || lod[detail].tube;
    const radial = lod[detail].tubeRadial;
    const g = new T.TubeGeometry(c, longitudinal, radius, radial, false);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / (radial + 1)) / longitudinal,
        center = c.getPointAt(t),
        k = 1 - taper * t;
      p.setXYZ(
        i,
        center.x + (p.getX(i) - center.x) * k,
        center.y + (p.getY(i) - center.y) * k,
        center.z + (p.getZ(i) - center.z) * k,
      );
    }
    g.computeVertexNormals();
    return g;
  });
  return mesh(parent, g, m);
}

function crystal(parent, detail, m, position, scale, rotation = [0, 0, 0]) {
  return mesh(
    parent,
    geometry(
      `crystal:${detail}`,
      () => new T.ConeGeometry(1, 1, detail === "low" ? 4 : 6, 1),
    ),
    m,
    position,
    scale,
    rotation,
  );
}

function eye(parent, detail, color, position, scale = [0.05, 0.025, 0.018]) {
  const g = geometry(`eye:${detail}`, () => {
    const shape = new T.Shape();
    shape.moveTo(-1, 0);
    shape.quadraticCurveTo(0, 0.9, 1, 0);
    shape.quadraticCurveTo(0, -0.6, -1, 0);
    return new T.ShapeGeometry(shape, detail === "high" ? 16 : 4);
  });
  mesh(parent, g, material(color, "glow", detail), position, scale, [
    0,
    Math.PI,
    0,
  ]);
  if (detail !== "low") {
    const pupilPosition = [position[0], position[1], position[2] - 0.003];
    mesh(
      parent,
      g,
      material(0x100d1e, "eye", detail),
      pupilPosition,
      [scale[0] * 0.2, scale[1] * 0.8, scale[2]],
      [0, Math.PI, Math.PI / 2],
    );
  }
}

function talons(parent, detail, m, width = 0.2, length = 0.25, count = 3) {
  for (let i = 0; i < count; i++) {
    const x = ((i - (count - 1) / 2) * width) / count;
    tube(
      parent,
      `claw:${width}:${length}:${count}:${i}`,
      [
        [x, 0.045, -0.02],
        [x, 0.04, -length * 0.6],
        [x, 0.015, -length],
      ],
      width * 0.1,
      m,
      detail,
      0.95,
    );
  }
}

function quadrupedLeg(
  parent,
  detail,
  name,
  position,
  size,
  hide,
  hoof,
  phase = 0,
) {
  const upper = joint(parent, `creatureLeg:${name}:${phase}`, position);
  upper.userData.gaitPhase = phase * Math.PI;
  form(
    upper,
    "quadruped-upper",
    [
      [0, 0.1, 0.1],
      [-0.16, 0.13, 0.115],
      [-0.38, 0.065, 0.07],
    ],
    hide,
    detail,
    [0, 0, 0],
    [size, size, size],
  );
  const lower = joint(upper, `creatureKnee:${name}`, [0, -0.35 * size, 0]);
  lower.userData.gaitPhase = phase * Math.PI;
  form(
    lower,
    "quadruped-lower",
    [
      [0, 0.065, 0.07],
      [-0.18, 0.05, 0.045, 0, 0.04],
      [-0.34, 0.045, 0.05, 0, -0.01],
    ],
    hide,
    detail,
    [0, 0, 0],
    [size, size, size],
  );
  const ankle = joint(lower, `creatureAnkle:${name}`, [0, -0.36 * size, 0]);
  ankle.userData.gaitPhase = phase * Math.PI;
  form(
    ankle,
    "quadruped-paw",
    [
      [0, 0.065, 0.12, 0, -0.05],
      [0.08, 0.08, 0.12, 0, -0.05],
      [0.12, 0.045, 0.06],
    ],
    hoof,
    detail,
    [0, 0, 0],
    [size, size, size],
    [0, 0, 0],
    0.4,
  );
  return upper;
}

function feather(parent, detail, m, key, position, length, width, rotation) {
  return form(
    parent,
    `feather:${key}`,
    [
      [0, 0.01, 0.008],
      [0.25, 0.16, 0.025],
      [0.65, 0.105, 0.02],
      [1, 0.002, 0.002],
    ],
    m,
    detail,
    position,
    [width, length, width],
    rotation,
    0.3,
  );
}

function flightFeather(
  parent,
  detail,
  m,
  position,
  length,
  width,
  rotation,
  descriptor,
) {
  const rows = detail === "high" ? 24 : detail === "medium" ? 8 : 3;
  const spans = detail === "high" ? 8 : detail === "medium" ? 4 : 2;
  const g = geometry(`flight-feather:${detail}`, () => {
    const p = [],
      uv = [],
      index = [];
    for (let y = 0; y <= rows; y++) {
      const t = y / rows,
        halfWidth = 0.12 * (Math.sin(Math.PI * t) ** 0.65 + (1 - t) * 0.08);
      for (let x = 0; x <= spans; x++) {
        const side = (x / spans) * 2 - 1;
        p.push(
          side * halfWidth,
          t,
          Math.sin(Math.PI * t) * 0.045 +
            side * side * 0.02 * Math.sin(Math.PI * t),
        );
        // Select one feather from the shared plumage atlas. The torso keeps
        // the complete atlas while each wing quill receives its own barbs.
        uv.push(x / spans / 8, t / 7);
        if (y < rows && x < spans) {
          const k = y * (spans + 1) + x;
          index.push(
            k,
            k + 1,
            k + spans + 1,
            k + 1,
            k + spans + 2,
            k + spans + 1,
          );
        }
      }
    }
    const shape = new T.BufferGeometry();
    shape.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    shape.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    shape.setIndex(index);
    return shape;
  });
  const plume = mesh(parent, g, m, position, [width, length, width], rotation);
  plume.userData.creaturePart = descriptor;
  return plume;
}

function firebirdEmbers(root, detail) {
  const count = detail === "high" ? 18 : detail === "medium" ? 10 : 6;
  const emberMaterialKey = "ember-basic";
  if (!materialCache.has(emberMaterialKey)) {
    const m = new T.MeshBasicMaterial({
      color: 0xffd57b,
      transparent: true,
      opacity: 0.82,
      blending: T.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    m.userData.sharedArt = true;
    materialCache.set(emberMaterialKey, m);
  }
  const particles = new T.InstancedMesh(
    geometry("ember-octahedron", () => new T.OctahedronGeometry(0.018, 0)),
    materialCache.get(emberMaterialKey),
    count,
  );
  particles.name = "creatureEmbers";
  particles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  particles.userData.preserveCreatureVFX = true;
  const matrix = new T.Matrix4(),
    color = new T.Color();
  for (let i = 0; i < count; i++) {
    matrix.makeTranslation(
      Math.sin(i * 2.4) * 0.6,
      1.2 + (i / count) * 0.75,
      0.2 + (i / count) * 0.4,
    );
    particles.setMatrixAt(i, matrix);
    particles.setColorAt(i, color.setHSL(0.065 + (i / count) * 0.075, 1, 0.6));
  }
  particles.computeBoundingBox();
  particles.computeBoundingSphere();
  root.add(particles);
}

function membrane(parent, key, outline, m, detail, soften = false) {
  const g = geometry(`membrane:${key}:${detail}:${soften}`, () => {
    const shape = new T.Shape();
    if (soften) {
      shape.moveTo(
        (outline.at(-1)[0] + outline[0][0]) / 2,
        (outline.at(-1)[1] + outline[0][1]) / 2,
      );
      for (let i = 0; i < outline.length; i++) {
        const next = outline[(i + 1) % outline.length];
        shape.quadraticCurveTo(
          ...outline[i],
          (outline[i][0] + next[0]) / 2,
          (outline[i][1] + next[1]) / 2,
        );
      }
    } else {
      shape.moveTo(...outline[0]);
      for (let i = 1; i < outline.length; i++) shape.lineTo(...outline[i]);
    }
    shape.closePath();
    const g = new T.ShapeGeometry(shape, detail === "high" ? 24 : 6);
    return g;
  });
  return mesh(parent, g, m);
}

function buildWolf(root, a, detail) {
  const hide = material(a.tier ? 0x1f6c68 : 0x487e77, "fur", detail),
    silver = material(0xb6d8c8, "hide", detail),
    dark = material(0x152d31, "hide", detail),
    fang = material(0xf0dfb0, "metal", detail);
  form(
    root,
    "wolf-ribcage",
    [
      [-0.78, 0.13, 0.14],
      [-0.5, 0.23, 0.28],
      [0.02, 0.28, 0.35],
      [0.55, 0.2, 0.25],
      [0.8, 0.09, 0.14],
    ],
    hide,
    detail,
    [0, 1.04, 0],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  form(
    root,
    "wolf-neck",
    [
      [0, 0.22, 0.22],
      [0.25, 0.24, 0.22],
      [0.5, 0.14, 0.16, 0, -0.13],
    ],
    silver,
    detail,
    [0, 1.03, -0.55],
    [1, 1, 1],
    [-0.4, 0, 0],
  );
  const head = joint(root, "creatureHead", [0, 1.55, -0.76]);
  form(
    head,
    "wolf-skull",
    [
      [-0.18, 0.1, 0.15],
      [0, 0.18, 0.19],
      [0.2, 0.12, 0.15],
      [0.24, 0.04, 0.06],
    ],
    hide,
    detail,
  );
  form(
    head,
    "wolf-snout",
    [
      [-0.3, 0.065, 0.055],
      [-0.1, 0.1, 0.085],
      [0.1, 0.13, 0.1],
    ],
    silver,
    detail,
    [0, -0.06, -0.2],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  form(
    head,
    "wolf-nose",
    [
      [0, 0.04, 0.025],
      [0.06, 0.075, 0.045],
      [0.1, 0.035, 0.025],
    ],
    dark,
    detail,
    [0, -0.07, -0.49],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
    0.25,
  );
  for (const side of [-1, 1]) {
    crystal(
      head,
      detail,
      hide,
      [side * 0.13, 0.33, 0],
      [0.11, 0.32, 0.085],
      [0.05, 0, side * -0.14],
    );
    crystal(
      head,
      detail,
      material(0xd5a8a5, "hide", detail),
      [side * 0.13, 0.34, -0.05],
      [0.06, 0.21, 0.025],
      [0.05, 0, side * -0.14],
    );
    eye(head, detail, 0x8dffca, [side * 0.12, 0.04, -0.177], [0.052, 0.021, 1]);
    crystal(
      head,
      detail,
      fang,
      [side * 0.075, -0.15, -0.32],
      [0.025, 0.12, 0.027],
      [Math.PI, 0, 0],
    );
    for (let i = 0; i < 2; i++)
      quadrupedLeg(
        root,
        detail,
        `${side}:${i}`,
        [side * 0.22, 0.85, (i ? 1 : -1) * 0.5],
        1,
        hide,
        dark,
        (side < 0 ? 1 : 0) ^ i,
      );
    if (detail !== "low")
      for (let i = 0; i < 4; i++)
        feather(
          root,
          detail,
          silver,
          `wolf-ruff:${side}:${i}`,
          [side * 0.14, 1.2 + i * 0.05, -0.56 + i * 0.1],
          0.3,
          0.6,
          [0.8, 0, side * -0.9],
        );
  }
  const tail = joint(root, "creatureTail", [0, 1.06, 0.66]);
  tube(
    tail,
    "wolf-tail",
    [
      [0, 0, 0],
      [0.03, 0.05, 0.32],
      [0.08, 0.04, 0.65],
      [0.1, 0.21, 0.85],
    ],
    0.12,
    silver,
    detail,
    0.96,
  );
  root.userData.creatureArt = { species: "wolf", length: 2.8, stature: 1.98 };
}

function buildRhino(root, a, detail) {
  const hide = material(a.tier ? 0x606555 : 0x747a69, "hide", detail),
    rock = material(0x9b9c84, "stone", detail),
    dark = material(0x3e4847, "hide", detail),
    glow = material(0xe8b94f, "glow", detail);
  form(
    root,
    "rhino-body",
    [
      [-1, 0.18, 0.17],
      [-0.65, 0.46, 0.5],
      [-0.1, 0.5, 0.6],
      [0.6, 0.35, 0.4],
      [0.96, 0.15, 0.2],
    ],
    hide,
    detail,
    [0, 1.12, 0.15],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  const head = joint(root, "creatureHead", [0, 0.95, -0.96], [-0.2, 0, 0]);
  form(
    head,
    "rhino-head",
    [
      [-0.5, 0.2, 0.18],
      [-0.2, 0.3, 0.3],
      [0.2, 0.28, 0.28],
      [0.35, 0.18, 0.16],
    ],
    hide,
    detail,
    [0, 0, 0],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  tube(
    head,
    "rhino-horn",
    [
      [0, 0.13, -0.46],
      [0, 0.47, -0.54],
      [0, 0.8, -0.63],
    ],
    0.14,
    rock,
    detail,
    0.99,
  );
  tube(
    head,
    "rhino-smallhorn",
    [
      [0, 0.25, -0.05],
      [0, 0.49, -0.13],
      [0, 0.6, -0.26],
    ],
    0.09,
    rock,
    detail,
    0.99,
  );
  for (const side of [-1, 1]) {
    eye(head, detail, 0xffb86b, [side * 0.25, 0.1, -0.27], [0.04, 0.02, 1]);
    crystal(
      head,
      detail,
      dark,
      [side * 0.25, 0.4, 0.15],
      [0.13, 0.25, 0.07],
      [0, 0, side * -0.4],
    );
    for (let i = 0; i < 2; i++)
      quadrupedLeg(
        root,
        detail,
        `${side}:${i}`,
        [side * 0.38, 0.86, i ? 0.76 : -0.5],
        1.04,
        hide,
        dark,
        (side < 0 ? 1 : 0) ^ i,
      );
  }
  const plateCount = detail === "low" ? 4 : detail === "medium" ? 8 : 16;
  for (let i = 0; i < plateCount; i++) {
    const t = i / plateCount,
      angle = i * 2.4;
    mesh(
      root,
      geometry(
        `rhino-plate:${detail}`,
        () => new T.DodecahedronGeometry(1, detail === "high" ? 1 : 0),
      ),
      rock,
      [Math.cos(angle) * 0.42, 1.23 + Math.sin(angle) * 0.3, -0.65 + t * 1.6],
      [0.3, 0.13, 0.29],
      [Math.sin(angle) * 0.6, angle, Math.cos(angle) * 0.5],
    );
    if (a.tier)
      crystal(
        root,
        detail,
        glow,
        [Math.cos(angle) * 0.4, 1.55, -0.5 + t * 1.2],
        [0.035, 0.1, 0.035],
      );
  }
  const tail = joint(root, "creatureTail", [0, 1.13, 1.04]);
  tube(
    tail,
    "rhino-tail",
    [
      [0, 0, 0],
      [0.05, -0.25, 0.23],
      [0.08, -0.35, 0.38],
    ],
    0.045,
    dark,
    detail,
  );
  root.userData.creatureArt = { species: "rhino", length: 3.1, stature: 1.9 };
}

function buildFirebird(root, a, detail) {
  const red = material(0xae3022, "hide", detail),
    flame = material(a.tier ? 0xffbd47 : 0xff8b51, "wing", detail),
    gold = material(0xe7b95f, "metal", detail);
  form(
    root,
    "bird-torso",
    [
      [-0.35, 0.05, 0.08],
      [-0.16, 0.2, 0.26],
      [0.12, 0.23, 0.3],
      [0.4, 0.12, 0.16],
      [0.5, 0.04, 0.06],
    ],
    red,
    detail,
    [0, 1.3, 0],
    [1, 1, 1],
    [0.25, 0, 0],
  );
  const head = joint(root, "creatureHead", [0, 1.87, -0.11]);
  form(
    head,
    "bird-skull",
    [
      [-0.16, 0.06, 0.08],
      [0, 0.14, 0.15],
      [0.17, 0.09, 0.1],
      [0.22, 0.015, 0.025],
    ],
    red,
    detail,
  );
  tube(
    head,
    "bird-beak",
    [
      [0, 0.02, -0.13],
      [0, -0.01, -0.3],
      [0, -0.1, -0.37],
    ],
    0.08,
    gold,
    detail,
    0.99,
  );
  for (const side of [-1, 1]) {
    eye(head, detail, 0xffed91, [side * 0.09, 0.07, -0.155], [0.045, 0.028, 1]);
    tube(
      root,
      `bird-leg:${side}`,
      [
        [side * 0.1, 1, 0.05],
        [side * 0.13, 0.6, 0.15],
        [side * 0.14, 0.16, -0.04],
      ],
      0.04,
      gold,
      detail,
      0.2,
    );
    const paw = joint(root, `birdFoot:${side}`, [side * 0.14, 0.05, -0.05]);
    talons(paw, detail, gold, 0.21, 0.23);
    const wing = joint(root, `creatureWing:${side}`, [side * 0.18, 1.55, 0]);
    for (let i = 0; i < 12; i++) {
      const primary = i < 7,
        t = primary ? i / 6 : (i - 7) / 4;
      flightFeather(
        wing,
        detail,
        primary ? flame : red,
        [
          side * (0.06 + t * 0.58),
          t * 0.045 + (primary ? 0 : 0.11),
          t * 0.2 - (primary ? 0 : 0.06),
        ],
        primary ? 1.02 - t * 0.15 : 0.66 - t * 0.12,
        primary ? 1.05 : 1.13,
        [0.42 + t * 0.25, 0, side * (-0.93 - t * 0.85)],
        {
          kind: "flightFeather",
          side,
          index: i,
          layer: primary ? "primary" : "covert",
        },
      );
    }
  }
  for (let i = 0; i < 5; i++)
    flightFeather(
      root,
      detail,
      gold,
      [(i - 2) * 0.022, 1.99, 0.02],
      0.38 - Math.abs(i - 2) * 0.045,
      0.45,
      [0.3, 0, (i - 2) * 0.17],
      { kind: "goldenCrest", index: i },
    );
  const tail = joint(root, "creatureTail", [0, 1.05, 0.23]);
  for (let i = 0; i < 3; i++) {
    const ribbon = joint(tail, `creatureFireTail:${i}`, [
      (i - 1) * 0.085,
      0,
      0,
    ]);
    flightFeather(
      ribbon,
      detail,
      flame,
      [0, 0, 0],
      i === 1 ? 1.55 : 1.35,
      1.25,
      [1.83, 0, (i - 1) * 0.22],
      { kind: "fireTailPlume", index: i },
    );
  }
  firebirdEmbers(root, detail);
  root.userData.creatureArt = {
    species: "firebird",
    wingSpan: 2.8,
    stature: 2.4,
  };
}

function buildButterfly(root, a, detail) {
  const shell = material(0x344e83, "metal", detail),
    ice = material(a.tier ? 0x82d8ff : 0xb8f3f2, "ice", detail),
    vein = material(0x4ed6f1, "glow", detail),
    goldVein = material(0xffd98e, "glow", detail);
  form(
    root,
    "butterfly-body",
    [
      [0, 0.035, 0.04],
      [0.25, 0.075, 0.08],
      [0.56, 0.055, 0.055],
      [0.72, 0.09, 0.08],
      [0.86, 0.04, 0.04],
    ],
    shell,
    detail,
    [0, 0.8, 0],
    [1, 1, 1],
    [0.1, 0, 0],
  );
  for (const side of [-1, 1]) {
    const wing = joint(
      root,
      `creatureWing:${side}`,
      [side * 0.035, 1.35, 0.02],
      [0, 0, side * 0.18],
    );
    membrane(
      wing,
      `butterfly:${side}`,
      [
        [0, 0],
        [side * 0.3, 0.65],
        [side * 0.95, 0.95],
        [side * 1.3, 0.74],
        [side * 1.18, 0.25],
        [side * 0.9, 0.04],
        [side * 1.1, -0.38],
        [side * 0.92, -0.7],
        [side * 0.48, -0.8],
        [side * 0.14, -0.4],
      ],
      ice,
      detail,
      true,
    );
    for (let i = 0; i < (detail === "low" ? 3 : 7); i++) {
      const a = -1.1 + i * 0.34,
        x = side * (0.8 + 0.25 * Math.cos(a)),
        y = Math.sin(a) * 0.8;
      tube(
        wing,
        `butterfly-vein:${side}:${i}`,
        [
          [0, 0, -0.01],
          [x * 0.45, y * 0.4, -0.015],
          [x, y, -0.01],
        ],
        0.015,
        i % 3 === 0 ? goldVein : vein,
        detail,
        0.65,
      );
      if (detail !== "low")
        crystal(
          wing,
          detail,
          vein,
          [x * 0.75, y * 0.8, -0.02],
          [0.07, 0.12, 0.025],
          [0, 0, -side * a],
        );
    }
    tube(
      root,
      `butterfly-antenna:${side}`,
      [
        [side * 0.04, 1.61, 0],
        [side * 0.18, 1.92, 0],
        [side * 0.3, 1.98, -0.05],
      ],
      0.018,
      vein,
      detail,
      0.6,
    );
    eye(root, detail, 0xf0f6ff, [side * 0.04, 1.58, -0.065], [0.022, 0.028, 1]);
  }
  root.userData.creatureArt = {
    species: "icebutterfly",
    wingSpan: 2.6,
    stature: 2.1,
  };
}

function buildApe(root, a, detail) {
  const hide = material(0x655942, "fur", detail),
    chest = material(0x99876d, "hide", detail),
    rock = material(0x8a6744, "metal", detail),
    amber = material(0xffae38, "glow", detail),
    fang = material(0xf4dcad, "hide", detail);
  form(
    root,
    "ape-torso",
    [
      [0, 0.44, 0.38],
      [0.35, 0.6, 0.45],
      [0.8, 0.84, 0.5],
      [1.2, 0.9, 0.46],
      [1.45, 0.48, 0.37],
    ],
    hide,
    detail,
    [0, 1.64, 0.2],
    [1, 1, 1],
    [-0.12, 0, 0],
    1.6,
  );
  for (const side of [-1, 1]) {
    form(
      root,
      "ape-pectoral",
      [
        [0, 0.2, 0.1],
        [0.25, 0.42, 0.17],
        [0.54, 0.32, 0.1],
        [0.65, 0.08, 0.02],
      ],
      chest,
      detail,
      [side * 0.4, 2.3, -0.28],
      [1, 1, 1],
      [0.05, 0, side * -0.12],
      0.8,
    );
    const arm = joint(root, `creatureArm:${side}`, [side * 0.83, 2.92, 0]);
    form(
      arm,
      "ape-upperarm",
      [
        [0.2, 0.25, 0.27],
        [-0.14, 0.4, 0.34],
        [-0.58, 0.32, 0.28],
        [-1.03, 0.23, 0.23],
      ],
      hide,
      detail,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, side * 0.2],
    );
    const forearm = joint(arm, `creatureForearm:${side}`, [
      side * 0.2,
      -0.96,
      0,
    ]);
    form(
      forearm,
      "ape-forearm",
      [
        [0.12, 0.23, 0.22],
        [-0.22, 0.35, 0.3],
        [-0.72, 0.27, 0.27],
        [-1.1, 0.2, 0.19],
      ],
      hide,
      detail,
      [0, 0, 0],
      [1, 1, 1],
      [-0.3, 0, 0],
    );
    form(
      forearm,
      "ape-hand",
      [
        [0, 0.17, 0.16],
        [-0.3, 0.29, 0.15],
        [-0.48, 0.2, 0.12],
      ],
      chest,
      detail,
      [0, -1.02, 0.31],
    );
    for (let finger = 0; finger < 4; finger++)
      tube(
        forearm,
        `ape-finger:${finger}`,
        [
          [(finger - 1.5) * 0.12, -1.28, 0.27],
          [(finger - 1.5) * 0.12, -1.46, 0.2],
          [(finger - 1.5) * 0.12, -1.49, 0.08],
        ],
        0.065,
        chest,
        detail,
        0.3,
      );
    tube(
      forearm,
      `ape-thumb:${side}`,
      [
        [side * -0.23, -1.15, 0.28],
        [side * -0.34, -1.32, 0.14],
        [side * -0.2, -1.39, 0.06],
      ],
      0.075,
      chest,
      detail,
      0.3,
    );
    const leg = joint(root, `creatureLeg:ape:${side === 1 ? 1 : 0}`, [
      side * 0.42,
      1.8,
      0.2,
    ]);
    form(
      leg,
      "ape-thigh",
      [
        [0, 0.27, 0.28],
        [-0.4, 0.32, 0.28],
        [-0.9, 0.19, 0.2],
      ],
      hide,
      detail,
      [0, 0, 0],
      [1, 1, 1],
      [-0.2, 0, 0],
    );
    form(
      leg,
      "ape-shin",
      [
        [0, 0.2, 0.19],
        [-0.43, 0.19, 0.17],
        [-0.75, 0.12, 0.14],
      ],
      hide,
      detail,
      [0, -0.84, 0.16],
    );
    form(
      leg,
      "ape-foot",
      [
        [0, 0.2, 0.33],
        [0.14, 0.26, 0.36],
        [0.24, 0.14, 0.2],
      ],
      chest,
      detail,
      [0, -1.75, -0.08],
    );
    const crystals = detail === "low" ? 2 : detail === "medium" ? 4 : 7;
    for (let i = 0; i < crystals; i++)
      crystal(
        arm,
        detail,
        i % 2 ? amber : rock,
        [side * (0.1 + i * 0.05), 0.3 + i * 0.025, (i - crystals / 2) * 0.16],
        [0.14, 0.45 + (i % 3) * 0.14, 0.16],
        [0.25, 0, side * -0.4],
      );
  }
  const head = joint(root, "creatureHead", [0, 3.45, -0.02]);
  form(
    head,
    "ape-skull",
    [
      [-0.4, 0.27, 0.27],
      [-0.12, 0.4, 0.38],
      [0.3, 0.37, 0.32],
      [0.66, 0.18, 0.17],
      [0.7, 0.035, 0.04],
    ],
    hide,
    detail,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    1.2,
  );
  form(
    head,
    "ape-muzzle",
    [
      [-0.27, 0.19, 0.12],
      [-0.1, 0.3, 0.19],
      [0.12, 0.28, 0.17],
      [0.27, 0.13, 0.07],
    ],
    chest,
    detail,
    [0, -0.06, -0.31],
  );
  for (const side of [-1, 1]) {
    eye(head, detail, 0xffcf6f, [side * 0.17, 0.29, -0.415], [0.11, 0.042, 1]);
    form(
      head,
      "ape-brow",
      [
        [0, 0.07, 0.055],
        [0.08, 0.14, 0.08],
        [0.16, 0.06, 0.04],
      ],
      hide,
      detail,
      [side * 0.17, 0.35, -0.34],
      [1.2, 1, 1],
      [0, 0, side * -0.4],
      0.3,
    );
    crystal(
      head,
      detail,
      fang,
      [side * 0.19, -0.2, -0.45],
      [0.055, 0.27, 0.065],
      [Math.PI, 0, 0],
    );
  }
  for (let i = 0; i < (detail === "low" ? 3 : 9); i++)
    crystal(
      root,
      detail,
      amber,
      [((i % 3) - 1) * 0.3, 2.5 + Math.floor(i / 3) * 0.26, 0.72],
      [0.12, 0.48, 0.12],
      [0.9, 0, ((i % 3) - 1) * -0.2],
    );
  root.userData.creatureArt = {
    species: "ape",
    stature: 4.5,
    authoritativeBoss: true,
  };
}

function buildKirin(root, a, detail) {
  const scale = material(0xb1642f, "metal", detail),
    gold = material(0xe7b95b, "metal", detail),
    flame = material(0xff742c, "glow", detail),
    horn = material(0xdba9ff, "glow", detail),
    dark = material(0x523a3a, "hide", detail);
  form(
    root,
    "kirin-ribcage",
    [
      [-1.36, 0.18, 0.2],
      [-0.8, 0.48, 0.58],
      [0.1, 0.51, 0.56],
      [0.9, 0.35, 0.4],
      [1.4, 0.12, 0.16],
    ],
    scale,
    detail,
    [0, 1.76, 0.17],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
    1.4,
  );
  form(
    root,
    "kirin-neck",
    [
      [0, 0.33, 0.36],
      [0.45, 0.36, 0.31],
      [0.94, 0.23, 0.23],
      [1.2, 0.17, 0.15],
    ],
    scale,
    detail,
    [0, 1.7, -0.93],
    [1, 1, 1],
    [-0.3, 0, 0],
  );
  const head = joint(root, "creatureHead", [0, 2.93, -1.27]);
  form(
    head,
    "kirin-skull",
    [
      [-0.2, 0.14, 0.12],
      [0, 0.24, 0.24],
      [0.3, 0.2, 0.2],
      [0.45, 0.08, 0.08],
    ],
    scale,
    detail,
    [0, 0, 0],
  );
  form(
    head,
    "kirin-snout",
    [
      [-0.47, 0.1, 0.11],
      [-0.17, 0.14, 0.14],
      [0.1, 0.16, 0.16],
    ],
    gold,
    detail,
    [0, -0.01, -0.21],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  for (const side of [-1, 1]) {
    eye(head, detail, 0xbcd5ff, [side * 0.18, 0.18, -0.255], [0.075, 0.04, 1]);
    tube(
      head,
      `kirin-antler:${side}`,
      [
        [side * 0.14, 0.34, 0.02],
        [side * 0.26, 0.65, 0.05],
        [side * 0.38, 0.9, 0.15],
        [side * 0.42, 1.05, 0.36],
      ],
      0.075,
      horn,
      detail,
      0.9,
    );
    for (let i = 0; i < (detail === "low" ? 1 : 3); i++)
      tube(
        head,
        `kirin-antler-branch:${side}:${i}`,
        [
          [side * (0.24 + i * 0.055), 0.56 + i * 0.12, 0.06 + i * 0.04],
          [side * (0.47 + i * 0.045), 0.66 + i * 0.13, -0.03],
          [side * (0.53 + i * 0.035), 0.79 + i * 0.1, -0.09],
        ],
        0.04,
        horn,
        detail,
        0.98,
      );
    for (let i = 0; i < 2; i++)
      quadrupedLeg(
        root,
        detail,
        `${side}:${i}`,
        [side * 0.37, 1.44, i ? 1.06 : -0.87],
        1.85,
        scale,
        dark,
        (side < 0 ? 1 : 0) ^ i,
      );
    tube(
      head,
      `kirin-moustache:${side}`,
      [
        [side * 0.1, -0.02, -0.47],
        [side * 0.36, 0.13, -0.7],
        [side * 0.5, 0.27, -0.82],
      ],
      0.035,
      gold,
      detail,
      0.98,
    );
  }
  const rows = detail === "low" ? 2 : detail === "medium" ? 7 : 13,
    around = detail === "low" ? 3 : detail === "medium" ? 5 : 9;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < around; j++) {
      const t = i / rows,
        a = (j / around) * Math.PI * 1.5 + Math.PI * 0.25;
      feather(
        root,
        detail,
        (i + j) % 3 ? gold : scale,
        `kirin-scale:${i}:${j}:${rows}:${around}`,
        [Math.sin(a) * 0.49, 1.76 + Math.cos(a) * 0.5, -0.91 + t * 2.26],
        0.3,
        1,
        [1.28, Math.PI, -a],
      );
    }
  const maneCount = detail === "low" ? 4 : detail === "medium" ? 8 : 17;
  const mane = joint(root, "creatureMane", [0, 2, -1.01]);
  for (let i = 0; i < maneCount; i++) {
    const t = i / (maneCount - 1);
    tube(
      mane,
      `kirin-mane:${i}:${maneCount}`,
      [
        [Math.sin(i * 2.4) * 0.17, t * 0.94, t * -0.2],
        [Math.sin(i * 2.4) * 0.23, t * 0.94 + 0.3, 0.18 - t * 0.2],
        [Math.sin(i * 2.4) * 0.14, t * 0.94 + 0.5, 0.4 - t * 0.16],
      ],
      0.085 + (i % 3) * 0.015,
      flame,
      detail,
      0.99,
    );
  }
  const tail = joint(root, "creatureTail", [0, 1.9, 1.38]);
  tube(
    tail,
    "kirin-tail",
    [
      [0, 0, 0],
      [0.15, 0.2, 0.6],
      [0.31, 0.55, 0.9],
      [0.24, 0.75, 1.25],
    ],
    0.115,
    gold,
    detail,
    0.8,
  );
  for (let i = 0; i < 4; i++)
    tube(
      tail,
      `kirin-tail-flame:${i}`,
      [
        [0.24, 0.7, 1.1],
        [0.15 + i * 0.06, 0.93 + i * 0.04, 1.3],
        [0.1 + i * 0.07, 1.05 + i * 0.03, 1.6],
      ],
      0.07,
      flame,
      detail,
      0.99,
    );
  root.userData.creatureArt = {
    species: "kirin",
    stature: 4,
    length: 4.9,
    authoritativeBoss: true,
  };
}

function buildDragon(root, a, detail) {
  const skin = material(0x342549, "metal", detail),
    plate = material(0x615078, "metal", detail),
    glow = material(0xc08aff, "glow", detail),
    membraneMaterial = material(0x3f294f, "wing", detail),
    smoke = material(0x7b46ac, "smoke", detail);
  const spine = [
    [0, 2.75, -4.6],
    [-0.4, 2.55, -3.3],
    [0.05, 2.6, -1.9],
    [0.45, 2.3, -0.1],
    [-0.05, 1.8, 1.8],
    [-0.6, 1.45, 3.3],
    [-0.1, 1.25, 5.3],
    [0.7, 1.5, 6.35],
  ];
  const body = tube(
    root,
    "dragon-spine",
    spine,
    0.55,
    skin,
    detail,
    0.98,
    detail === "high" ? 128 : detail === "medium" ? 40 : 16,
  );
  body.userData.spineSegments =
    detail === "high" ? 128 : detail === "medium" ? 40 : 16;
  const head = joint(root, "creatureHead", [0, 2.75, -4.65]);
  form(
    head,
    "dragon-skull",
    [
      [-0.4, 0.2, 0.2],
      [-0.1, 0.45, 0.44],
      [0.3, 0.41, 0.35],
      [0.65, 0.2, 0.22],
      [0.7, 0.05, 0.08],
    ],
    skin,
    detail,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    1.8,
  );
  form(
    head,
    "dragon-snout",
    [
      [-1.0, 0.13, 0.12],
      [-0.6, 0.24, 0.18],
      [-0.1, 0.34, 0.26],
      [0.2, 0.32, 0.2],
    ],
    plate,
    detail,
    [0, -0.12, -0.3],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++)
      eye(
        head,
        detail,
        0xf2b3ff,
        [side * (0.24 + i * 0.11), 0.22 + i * 0.16, -0.39 + i * 0.04],
        [0.09 - i * 0.02, 0.046, 1],
      );
    tube(
      head,
      `dragon-horn:${side}`,
      [
        [side * 0.3, 0.4, 0.05],
        [side * 0.55, 0.85, 0.28],
        [side * 0.7, 1.18, 0.71],
      ],
      0.16,
      plate,
      detail,
      0.99,
    );
    tube(
      head,
      `dragon-jawhorn:${side}`,
      [
        [side * 0.24, -0.2, -0.5],
        [side * 0.5, -0.4, -0.25],
        [side * 0.65, -0.3, 0.1],
      ],
      0.09,
      plate,
      detail,
      0.99,
    );
    for (let i = 0; i < (detail === "low" ? 2 : 5); i++)
      crystal(
        head,
        detail,
        glow,
        [side * 0.21, -0.28, -0.55 - i * 0.1],
        [0.034, 0.18, 0.035],
        [Math.PI, 0, 0],
      );
    const wing = joint(
      root,
      `creatureWing:${side}`,
      [side * 0.34, 2.63, -1.76],
      [0.1, 0, 0],
    );
    const outline = [
      [0, 0],
      [side * 1.0, 1.55],
      [side * 2.7, 2.45],
      [side * 4.35, 1.8],
      [side * 3.58, 1.05],
      [side * 3.05, 0.95],
      [side * 3.28, 0.35],
      [side * 2.4, 0.3],
      [side * 2.1, -0.25],
      [side * 1.35, 0.1],
      [side * 0.8, -0.55],
      [0, -0.3],
    ];
    membrane(wing, `dragon:${side}`, outline, membraneMaterial, detail);
    for (const [i, end] of [
      [0, [side * 4.35, 1.8, 0]],
      [1, [side * 3.28, 0.35, 0]],
      [2, [side * 2.1, -0.25, 0]],
      [3, [side * 0.8, -0.55, 0]],
    ]) {
      tube(
        wing,
        `dragon-wingbone:${side}:${i}`,
        [
          [0, 0, -0.02],
          [side * 1.15, 1.5, -0.03],
          [side * 2.65, 2.43, -0.01],
          end,
        ],
        i === 0 ? 0.12 : 0.065,
        plate,
        detail,
        0.94,
      );
    }
    for (let i = 0; i < 2; i++) {
      const leg = joint(root, `creatureLeg:dragon:${(side < 0 ? 1 : 0) ^ i}`, [
        side * 0.38,
        2.35 - i * 0.45,
        i ? 1.7 : -2.4,
      ]);
      tube(
        leg,
        `dragon-limb:${side}:${i}`,
        [
          [0, 0, 0],
          [side * 0.4, -0.45, 0.3],
          [side * 0.54, -1.1, -0.1],
          [side * 0.62, -1.45, -0.4],
        ],
        0.16,
        skin,
        detail,
        0.55,
      );
      const paw = joint(leg, `dragonPaw:${side}:${i}`, [
        side * 0.62,
        -1.45,
        -0.4,
      ]);
      talons(paw, detail, glow, 0.38, 0.46);
    }
  }
  const curve = new T.CatmullRomCurve3(spine.map(vec));
  const dorsal = detail === "low" ? 9 : detail === "medium" ? 18 : 40;
  for (let i = 0; i < dorsal; i++) {
    const t = i / dorsal,
      c = curve.getPoint(t);
    crystal(
      root,
      detail,
      i % 3 ? plate : glow,
      [c.x, c.y + (1 - t) * 0.5, c.z],
      [0.14 * (1 - t * 0.8), 0.6 * (1 - t * 0.8), 0.2 * (1 - t * 0.8)],
      [0.6, 0, 0],
    );
  }
  if (detail === "high") {
    // Scale rows follow the long curved spine, rather than opaque high-poly
    // filler hidden inside the animal. Their silhouettes remain visible.
    for (let i = 0; i < 30; i++) {
      const t = i / 30,
        c = curve.getPoint(t);
      for (let side = -1; side <= 1; side += 2)
        feather(
          root,
          detail,
          plate,
          `dragon-scale:${i}:${side}`,
          [c.x + side * 0.4 * (1 - t * 0.8), c.y + 0.17, c.z],
          0.38 * (1 - t * 0.7),
          1,
          [1.2, 0, side * 0.8],
        );
    }
  }
  const aura = joint(root, "creatureSmoke", [0, 2.2, -1.5]);
  for (
    let i = 0;
    i < (detail === "low" ? 2 : detail === "medium" ? 4 : 8);
    i++
  ) {
    const a = i * 2.4;
    tube(
      aura,
      `dragon-smoke:${i}`,
      [
        [Math.cos(a) * 0.6, 0, Math.sin(a)],
        [Math.cos(a + 0.8) * 1.3, 0.4, Math.sin(a + 0.8) * 1.8],
        [Math.cos(a + 1.5) * 1.9, 1, Math.sin(a + 1.5) * 2.4],
      ],
      0.17,
      smoke,
      detail,
      0.9,
    );
  }
  root.userData.creatureArt = {
    species: "dragon",
    length: 12,
    spineSegments: detail === "high" ? 128 : detail === "medium" ? 40 : 16,
    glowingEyes: 4,
    authoritativeBoss: true,
  };
}

function addMutant(root, detail, kind) {
  const red = material(0xff253d, "glow", detail);
  const height =
    kind === "firebird" ? 2.1 : kind === "icebutterfly" ? 1.7 : 1.75;
  for (const side of [-1, 1])
    tube(
      root,
      `mutant-horn:${kind}:${side}`,
      [
        [side * 0.12, height - 0.05, -0.25],
        [side * 0.25, height + 0.2, -0.3],
        [side * 0.34, height + 0.44, -0.4],
      ],
      0.065,
      red,
      detail,
      0.99,
    );
  const arcs = joint(root, "creatureBloodArcs", [0, 0.85, 0]);
  for (let i = 0; i < (detail === "low" ? 2 : 4); i++) {
    const points = [];
    for (let j = 0; j < 7; j++) {
      const a = (i * Math.PI) / 2 + j * 0.19;
      points.push([
        Math.cos(a) * (0.9 + (j % 2) * 0.06),
        Math.sin(j * 2) * 0.055,
        Math.sin(a) * (0.9 + (j % 2) * 0.06),
      ]);
    }
    tube(arcs, `mutant-arc:${i}`, points, 0.018, red, detail, 0.2);
  }
  root.scale.multiplyScalar(1.35);
  root.userData.creatureArt.mutantVisualScale = 1.35;
}

function mergePerJoint(parent) {
  for (const child of [...parent.children])
    if (child.isGroup) mergePerJoint(child);
  const sets = new Map();
  for (const child of [...parent.children]) {
    if (!child.isMesh || child.userData.preserveCreatureVFX) continue;
    child.updateMatrix();
    const g = child.geometry.clone().applyMatrix4(child.matrix);
    // Normalize attribute layouts across lofts, extrusions, tubes and crystals.
    for (const name of Object.keys(g.attributes))
      if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new T.Float32BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      );
    if (!g.index) {
      const index = Array.from(
        { length: g.attributes.position.count },
        (_, i) => i,
      );
      g.setIndex(index);
    }
    const key = child.material.uuid;
    if (!sets.has(key))
      sets.set(key, {
        material: child.material,
        geometries: [],
        parts: [],
        triangles: 0,
      });
    const set = sets.get(key),
      triangleCount = g.index.count / 3;
    if (child.userData.creaturePart)
      set.parts.push({
        ...child.userData.creaturePart,
        triangleStart: set.triangles,
        triangleCount,
      });
    set.geometries.push(g);
    set.triangles += triangleCount;
    parent.remove(child);
  }
  for (const set of sets.values()) {
    const g = mergeGeometries(set.geometries, false);
    if (!g) throw new Error("Creature joint geometry merge failed");
    g.userData.sharedArt = true;
    if (set.parts.length) g.userData.creatureParts = set.parts;
    mesh(parent, g, set.material);
    for (const intermediate of set.geometries) intermediate.dispose();
  }
}

export function creatureVisualSpecies(actor) {
  if (actor.kind === "boss")
    return ["ape", "kirin", "dragon"].includes(actor.boss?.key)
      ? actor.boss.key
      : "ape";
  if (species.includes(actor.species)) return actor.species;
  return species[Math.abs(Number(actor.id) || 0) % species.length];
}

export function buildCreatureVisual(actor, detail = "low") {
  if (!lod[detail]) throw new Error(`Unknown creature LOD ${detail}`);
  const kind = creatureVisualSpecies(actor),
    key = `${kind}:${actor.tier || 0}:${!!actor.mutant}:${detail}`;
  if (!templateCache.has(key)) {
    const root = new T.Group();
    root.name = `creature:${kind}:${detail}`;
    const previousProfile = activeProfile;
    activeProfile = kind;
    try {
      ({
        wolf: buildWolf,
        rhino: buildRhino,
        firebird: buildFirebird,
        icebutterfly: buildButterfly,
        ape: buildApe,
        kirin: buildKirin,
        dragon: buildDragon,
      })[kind](root, actor, detail);
    } finally {
      activeProfile = previousProfile;
    }
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root),
      size = box.getSize(new T.Vector3());
    // Contact points sit on the terrain; Boss dimensions come from chapter 3.3.
    // Butterfly wings intentionally hover above it, rather than clipping snow.
    const hover = kind === "icebutterfly" ? 0.25 : 0;
    for (const child of root.children) child.position.y += hover - box.min.y;
    if (actor.kind === "boss") {
      const factor =
        kind === "ape"
          ? 4.5 / size.y
          : kind === "kirin"
            ? 4 / size.y
            : 12 / size.z;
      root.scale.setScalar(factor);
    }
    if (actor.kind !== "boss") {
      const tierScale = actor.tier ? 1.13 : 0.9;
      root.scale.multiplyScalar(tierScale);
      root.userData.creatureArt.tierVisualScale = tierScale;
      if (actor.mutant) addMutant(root, detail, kind);
    }
    mergePerJoint(root);
    root.userData.detail = detail;
    root.userData.sharedArt = true;
    templateCache.set(key, root);
  }
  return templateCache.get(key).clone(true);
}

export function animateCreatureVisual(root, actor, time, dt = 1 / 60) {
  if (!root.userData.creatureArt) return;
  const speed = Math.min(
    1,
    Math.hypot(
      actor.x - (root.userData.lastCreatureX ?? actor.x),
      actor.z - (root.userData.lastCreatureZ ?? actor.z),
    ) /
      Math.max(dt, 0.001) /
      3.5,
  );
  const pulse = Math.sin(time * 4);
  root.traverse((node) => {
    if (node.isInstancedMesh && node.name === "creatureEmbers") {
      for (let i = 0; i < node.count; i++) {
        const progress = (time * 0.65 + i / node.count) % 1;
        const scale = 1.2 - progress * 0.9;
        emberMatrix.makeScale(scale, scale, scale);
        emberMatrix.setPosition(
          Math.sin(i * 2.4 + progress * 2) * (0.35 + progress * 0.35),
          1.1 + progress * 0.95,
          0.15 + progress * 0.8,
        );
        node.setMatrixAt(i, emberMatrix);
      }
      node.instanceMatrix.needsUpdate = true;
      return;
    }
    const rest = node.userData.restRotation;
    if (!rest) return;
    if (node.name.startsWith("creatureLeg:")) {
      const phase = Number(node.name.split(":").at(-1)) || 0;
      node.rotation.x =
        rest[0] + Math.sin(time * 9 + phase * Math.PI) * speed * 0.35;
    } else if (node.name.startsWith("creatureKnee:")) {
      const swing = Math.sin(time * 9 + node.userData.gaitPhase);
      node.rotation.x = rest[0] + Math.max(0, swing) * speed * 0.65;
    } else if (node.name.startsWith("creatureAnkle:")) {
      const phase = time * 9 + node.userData.gaitPhase;
      node.rotation.x =
        rest[0] -
        (Math.max(0, Math.sin(phase)) * 0.5 + Math.sin(phase) * 0.1) * speed;
    } else if (node.name.startsWith("creatureWing:")) {
      const side = Number(node.name.split(":")[1]);
      const kind = root.userData.creatureArt.species;
      node.rotation.y =
        rest[1] +
        side *
          Math.sin(
            time *
              (kind === "icebutterfly" ? 7.5 : kind === "dragon" ? 1.8 : 5.2),
          ) *
          (kind === "icebutterfly" ? 0.6 : 0.16);
      node.rotation.z =
        rest[2] +
        side *
          Math.cos(time * (kind === "dragon" ? 1.8 : 5.2)) *
          (kind === "icebutterfly" ? 0.08 : kind === "dragon" ? 0.22 : 0.38);
    } else if (node.name.startsWith("creatureArm:")) {
      const side = Number(node.name.split(":")[1]);
      node.rotation.x =
        rest[0] +
        Math.sin(time * 3 + side) * 0.12 +
        Math.sin(time * 9 + side) * speed * 0.25;
    } else if (node.name === "creatureTail") {
      node.rotation.y = rest[1] + Math.sin(time * 3.2) * (0.15 + speed * 0.2);
    } else if (node.name.startsWith("creatureFireTail:")) {
      const index = Number(node.name.split(":")[1]);
      node.rotation.z = rest[2] + Math.sin(time * 3.5 + index * 0.9) * 0.12;
    } else if (node.name === "creatureHead") {
      node.rotation.y = rest[1] + Math.sin(time * 1.2) * 0.045;
    } else if (node.name === "creatureMane") {
      node.rotation.x = rest[0] + pulse * 0.035;
    } else if (node.name === "creatureSmoke") {
      node.rotation.y = time * 0.12;
      node.scale.setScalar(1 + Math.sin(time * 0.7) * 0.07);
    } else if (node.name === "creatureBloodArcs") node.rotation.y = time * 1.5;
  });
  root.userData.lastCreatureX = actor.x;
  root.userData.lastCreatureZ = actor.z;
}
