import * as THREE from "three";

// Each ribbon is deformed on the GPU. Instances only change uniforms; no geometry
// or textures are rebuilt while an effect is playing.
export const MAX_ELEMENTAL_EFFECTS = 128;
const TAU = Math.PI * 2;
const DEFINITIONS = [
  {
    key: "wood",
    name: "Mộc",
    color: 0x64e9a6,
    parts: 12,
    pattern: "leaf-veined-vines",
    vertex: `
      float angle = s * TAU / PARTS + 0.45 * sin(t * PI);
      float leaf = pow(abs(sin(t * PI * 4.0)), 5.0);
      float width = (0.018 + 0.09 * leaf) * sin(t * PI);
      float distance = 0.08 + t * 0.88;
      p = vec3(cos(angle) * distance, 0.10 + sin(t * PI) * 0.42, sin(angle) * distance);
      p.xz += vec2(-sin(angle), cos(angle)) * side * width;
      p.y += 0.035 * sin(phase + t * 10.0 + s);
      if (uSkill > -0.5 && uSkill < 0.5) {
        // Tangled directional lash, built in +Z and oriented by the cast vector.
        p = vec3((s / PARTS - 0.5) * 0.10 + sin(t * 19.0 + s) * 0.025,
          0.12 + sin(t * PI) * 0.18, t);
        p.x += side * 0.012 * sin(t * PI);
      } else if (uSkill > 0.5 && uSkill < 1.5) {
        float a = t * TAU + s * TAU / PARTS;
        float r = 0.76 + 0.15 * sin(t * PI * 4.0 + s);
        p = vec3(cos(a) * r, 0.05 + t * 0.42, sin(a) * r);
        p.xz += vec2(cos(a), sin(a)) * side * 0.022;
      } else if (uSkill > 1.5 && uSkill < 2.5) {
        float a = s * TAU / PARTS;
        float r = sin(t * PI) * 0.92;
        p = vec3(cos(a) * r, 0.025 + sin(t * PI) * 0.13, sin(a) * r);
        p.xz += vec2(-sin(a), cos(a)) * side * sin(t * PI) * 0.11;
      } else if (uSkill > 2.5 && uSkill < 3.5) {
        float a = s * TAU / PARTS + 0.24 * sin(t * PI * 3.0 + phase);
        float r = 0.96 - 0.22 * t * t;
        p = vec3(cos(a) * r, t * 1.15, sin(a) * r);
        p.xz += vec2(-sin(a), cos(a)) * side * 0.025;
      } else if (uSkill > 3.5) {
        p = vec3((s / PARTS - 0.5) * 0.24 + sin(t * 15.0 + s) * 0.018,
          0.10 + sin(t * PI) * 0.13, t);
        p.x += side * 0.018 * sin(t * PI);
      }

    `,
    fragment: `
      float vein = exp(-abs(vUv.y - 0.5) * 65.0);
      float branches = pow(max(0.0, cos(vUv.x * 48.0 - abs(vUv.y - 0.5) * 12.0)), 12.0);
      tint *= 0.55 + vein * 1.4 + branches * 0.45;
    `,
  },
  {
    key: "earth",
    name: "Thổ",
    color: 0xdcb47d,
    parts: 16,
    pattern: "erupting-stone-facets",
    vertex: `
      float angle = floor(s / 2.0) * TAU / ceil(PARTS / 2.0);
      float crossing = mod(s, 2.0) * PI * 0.5;
      vec2 radial = vec2(cos(angle), sin(angle));
      vec2 tangent = vec2(cos(angle + crossing), sin(angle + crossing));
      float width = (0.09 + hash(s) * 0.09) * (1.0 - t * 0.85);
      p = vec3(radial.x * (0.34 + t * 0.26), t * (0.50 + hash(s + 4.0) * 0.58), radial.y * (0.34 + t * 0.26));
      p.xz += tangent * side * width;
      p.y *= smoothstep(0.0, 0.13, life);
    `,
    fragment: `
      float facet = step(0.5, vUv.y);
      float crack = pow(max(0.0, sin(vUv.x * 23.0 + floor(vUv.y * 5.0) * 2.1)), 28.0);
      tint *= 0.36 + facet * 0.65 + crack * 2.0;
    `,
  },
  {
    key: "wind",
    name: "Phong",
    color: 0x9cdacb,
    parts: 7,
    pattern: "ascending-helical-gusts",
    vertex: `
      float angle = t * TAU * 1.35 + phase * 2.0 + s * TAU / PARTS;
      float radius = 0.22 + t * 0.68;
      p = vec3(cos(angle) * radius, 0.08 + t * 0.55 + s * 0.025, sin(angle) * radius);
      p.xz += vec2(cos(angle), sin(angle)) * side * (0.012 + sin(t * PI) * 0.022);
    `,
    fragment: `
      float streak = smoothstep(0.0, 0.3, vUv.x) * (1.0 - smoothstep(0.68, 1.0, vUv.x));
      alpha *= streak;
      tint += vec3(0.20, 0.35, 0.30) * core;
    `,
  },
  {
    key: "lightning",
    name: "Lôi",
    color: 0xac9cff,
    parts: 12,
    pattern: "branched-stepped-lightning",
    vertex: `
      float angle = s * TAU / PARTS;
      float segment = floor(t * 10.0);
      float kink = (hash(segment + s * 19.0 + floor(phase * 14.0)) - 0.5) * 0.19;
      vec2 radial = vec2(cos(angle), sin(angle));
      vec2 tangent = vec2(-sin(angle), cos(angle));
      p = vec3(radial.x * t, (1.0 - t) * (0.75 + hash(s) * 0.55) + 0.08, radial.y * t);
      p.xz += tangent * (kink + side * 0.014);
    `,
    fragment: `
      float flash = 0.60 + 0.40 * step(0.2, sin(uElapsed * 72.0 + vPart * 2.2));
      tint = mix(uColor, vec3(1.0), pow(core, 2.0)) * (1.3 + core);
      alpha *= flash;
    `,
  },
  {
    key: "light",
    name: "Quang",
    color: 0xffedb0,
    parts: 20,
    pattern: "radiant-sunburst",
    vertex: `
      float angle = s * TAU / PARTS + phase * 0.12;
      float distance = 0.16 + t * (0.63 + 0.20 * mod(s, 2.0));
      float width = sin(t * PI) * (0.018 + 0.012 * mod(s, 2.0));
      p = vec3(cos(angle) * distance, 0.14 + 0.08 * sin(t * PI), sin(angle) * distance);
      p.xz += vec2(-sin(angle), cos(angle)) * side * width;
    `,
    fragment: `
      float beam = pow(sin(vUv.x * PI), 0.5);
      tint = mix(uColor, vec3(1.0, 0.98, 0.83), core) * 1.5;
      alpha *= beam;
    `,
  },
  {
    key: "water",
    name: "Thủy",
    color: 0x63c0d4,
    parts: 6,
    pattern: "expanding-caustic-ripples",
    vertex: `
      float angle = t * TAU;
      float ring = fract((s + 0.18 + phase * 0.75) / PARTS);
      float radius = 0.08 + ring * 0.92;
      p = vec3(cos(angle) * radius, 0.075 + sin(angle * 5.0 + phase * 3.0) * 0.016, sin(angle) * radius);
      p.xz += vec2(cos(angle), sin(angle)) * side * (0.014 + (1.0 - ring) * 0.018);
    `,
    fragment: `
      float caustic = 0.65 + 0.35 * sin(vUv.x * TAU * 8.0 + uElapsed * 5.0 + vPart);
      tint = mix(uColor, vec3(0.62, 0.95, 1.0), core * caustic);
      alpha *= caustic;
    `,
  },
  {
    key: "fire",
    name: "Hỏa",
    color: 0xff713e,
    parts: 14,
    pattern: "rising-turbulent-flames",
    vertex: `
      float angle = s * TAU / PARTS;
      float sway = sin(phase * 4.0 + t * 9.0 + s * 1.7) * t * 0.16;
      float radius = (0.10 + hash(s) * 0.48) * (1.0 - t * 0.7);
      p = vec3(cos(angle) * radius + sway, t * (0.85 + hash(s + 2.0) * 0.8), sin(angle) * radius);
      p.xz += vec2(-sin(angle), cos(angle)) * side * (0.065 + hash(s + 7.0) * 0.065) * sin(t * PI);
    `,
    fragment: `
      float turbulence = sin(vUv.x * 38.0 - uElapsed * 10.0 + vPart * 2.0) * 0.14;
      alpha *= smoothstep(0.0, 0.22, core + turbulence) * (1.0 - vUv.x * 0.6);
      tint = mix(vec3(1.0, 0.78, 0.12), uColor, smoothstep(0.0, 0.72, vUv.x));
      tint *= 1.5;
    `,
  },
  {
    key: "ice",
    name: "Băng",
    color: 0x99eaff,
    parts: 14,
    pattern: "prismatic-frost-spires",
    vertex: `
      float pair = floor(s / 2.0);
      float angle = pair * TAU / ceil(PARTS / 2.0);
      float face = mod(s, 2.0) * PI * 0.5;
      float taper = min(1.0, (1.0 - t) * 5.0);
      float height = 0.65 + hash(pair) * 0.85;
      p = vec3(cos(angle) * (0.24 + t * 0.35), t * height, sin(angle) * (0.24 + t * 0.35));
      p.xz += vec2(cos(angle + face), sin(angle + face)) * side * 0.075 * taper;
    `,
    fragment: `
      float facets = floor(vUv.y * 3.0) / 3.0;
      float glint = pow(max(0.0, sin(vUv.x * 18.0 - uElapsed * 4.0 + vPart)), 18.0);
      tint = mix(uColor * 0.55, vec3(0.9, 1.0, 1.0), facets * 0.7 + glint * 0.5);
      alpha *= 0.65 + core * 0.35;
    `,
  },
  {
    key: "dark",
    name: "Ám",
    color: 0xaca7ff,
    parts: 8,
    pattern: "inward-void-spirals",
    vertex: `
      float angle = t * TAU * 1.6 - phase * 1.8 + s * TAU / PARTS;
      float radius = 0.08 + pow(1.0 - t, 0.7) * 0.89;
      p = vec3(cos(angle) * radius, 0.1 + t * 0.35, sin(angle) * radius);
      p.xz += vec2(cos(angle), sin(angle)) * side * (0.012 + t * 0.025);
    `,
    fragment: `
      float filament = 0.55 + 0.45 * sin(vUv.x * 45.0 + uElapsed * 9.0 + vPart);
      tint = mix(vec3(0.12, 0.01, 0.28), uColor, core * filament);
      alpha *= 0.5 + filament * 0.5;
    `,
  },
  {
    key: "metal",
    name: "Kim",
    color: 0xffc85b,
    parts: 12,
    pattern: "orbiting-metal-crescents",
    vertex: `
      float angle = s * TAU / PARTS + phase * 2.5 + t * 0.72;
      float radius = 0.54 + sin(t * PI) * 0.23;
      float width = sin(t * PI) * 0.105;
      p = vec3(cos(angle) * radius, 0.16 + sin(t * PI) * 0.18, sin(angle) * radius);
      p.xz += vec2(cos(angle), sin(angle)) * side * width;
    `,
    fragment: `
      float bevel = pow(abs(vUv.y * 2.0 - 1.0), 7.0);
      float polished = 0.4 + 0.6 * pow(max(0.0, sin(vUv.x * PI + uElapsed * 2.0 + vPart)), 6.0);
      tint = mix(uColor * 0.65, vec3(1.0, 0.98, 0.85), max(bevel, polished));
    `,
  },
  {
    key: "music",
    name: "Âm Luật",
    color: 0xff9cd1,
    parts: 8,
    pattern: "harmonic-standing-waves",
    vertex: `
      float angle = t * TAU;
      float harmonic = sin(angle * (3.0 + mod(s, 3.0)) - phase * 4.0 + s);
      float radius = 0.23 + s / PARTS * 0.68 + harmonic * 0.025;
      p = vec3(cos(angle) * radius, 0.19 + harmonic * 0.11 + s * 0.025, sin(angle) * radius);
      p.y += side * 0.014;
    `,
    fragment: `
      float beat = 0.6 + 0.4 * sin(uElapsed * 8.0 + vPart * 0.6);
      tint = mix(uColor, vec3(0.78, 0.9, 1.0), 0.5 + 0.5 * sin(vUv.x * TAU * 3.0 + vPart));
      alpha *= beat;
    `,
  },
  {
    key: "poison",
    name: "Độc",
    color: 0xc491ed,
    parts: 14,
    pattern: "rising-toxic-bubbles",
    vertex: `
      float orbit = s * TAU / PARTS + phase * 0.22;
      float ascent = fract(phase * 0.4 + s / PARTS);
      float bubble = (0.045 + hash(s) * 0.095) * sin(ascent * PI);
      float angle = t * TAU;
      vec2 center = vec2(cos(orbit), sin(orbit)) * (0.17 + hash(s + 5.0) * 0.65);
      p = vec3(center.x, 0.12 + ascent * 1.45, center.y);
      p.xz += vec2(cos(orbit), sin(orbit)) * cos(angle) * bubble;
      p.y += sin(angle) * bubble;
      p.xz += vec2(cos(orbit), sin(orbit)) * side * 0.011;
    `,
    fragment: `
      float iridescence = 0.5 + 0.5 * sin(vUv.x * TAU + uElapsed * 2.0 + vPart);
      tint = mix(uColor, vec3(0.57, 1.0, 0.20), iridescence * 0.65);
      alpha *= 0.55 + 0.45 * iridescence;
    `,
  },
];

export const ELEMENTAL_VFX = Object.freeze(
  DEFINITIONS.map((d) =>
    Object.freeze({
      key: d.key,
      name: d.name,
      color: d.color,
      pattern: d.pattern,
    }),
  ),
);
const definitionByKey = new Map(
  DEFINITIONS.flatMap((d) => [
    [d.key, d],
    [d.name.toLowerCase(), d],
  ]),
);
const aliases = new Map([
  ["moc", "wood"],
  ["tho", "earth"],
  ["phong", "wind"],
  ["loi", "lightning"],
  ["quang", "light"],
  ["thuy", "water"],
  ["hoa", "fire"],
  ["bang", "ice"],
  ["am", "dark"],
  ["kim", "metal"],
  ["am luat", "music"],
  ["doc", "poison"],
]);
const geometries = new Map();
const materialPool = new Map();
const instances = new WeakMap();
const active = new Set();
let serial = 0;
const qualities = { low: [0.65, 12], balanced: [1, 20], ultra: [1.25, 32] };

function finite(value, fallback, min, max) {
  return Number.isFinite(Number(value))
    ? THREE.MathUtils.clamp(Number(value), min, max)
    : fallback;
}

export function resolveElement(element, color) {
  if (typeof element === "string") {
    const key = element.trim().toLowerCase();
    const definition =
      definitionByKey.get(key) ?? definitionByKey.get(aliases.get(key));
    if (definition) return definition.key;
  }
  if (Number.isInteger(element) && element >= 0 && element < DEFINITIONS.length)
    return DEFINITIONS[element].key;
  const c = new THREE.Color(color ?? 0x64e9a6);
  let best = DEFINITIONS[0],
    distance = Infinity;
  for (const definition of DEFINITIONS) {
    const candidate = new THREE.Color(definition.color);
    const d =
      (c.r - candidate.r) ** 2 +
      (c.g - candidate.g) ** 2 +
      (c.b - candidate.b) ** 2;
    if (d < distance) {
      best = definition;
      distance = d;
    }
  }
  return best.key;
}

function ribbonGeometry(parts, segments) {
  const key = `${parts}:${segments}`;
  if (geometries.has(key)) return geometries.get(key);
  const vertices = parts * (segments + 1) * 2;
  const positions = new Float32Array(vertices * 3);
  const strip = new Float32Array(vertices);
  const along = new Float32Array(vertices);
  const side = new Float32Array(vertices);
  const indices = [];
  for (let p = 0, cursor = 0; p < parts; p++) {
    for (let step = 0; step <= segments; step++) {
      for (let edge = 0; edge < 2; edge++, cursor++) {
        strip[cursor] = p;
        along[cursor] = step / segments;
        side[cursor] = edge * 2 - 1;
        positions[cursor * 3] = side[cursor];
        positions[cursor * 3 + 1] = along[cursor];
      }
      if (step < segments) {
        const a = p * (segments + 1) * 2 + step * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aStrip", new THREE.BufferAttribute(strip, 1));
  geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  geometry.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  geometry.setIndex(indices);
  // Shader deformation is bounded by these values. Per-instance frustum culling
  // is disabled because uRadius is independent from this shared buffer.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
  geometry.userData = { sharedEnvironmentVfx: true, parts, segments };
  geometries.set(key, geometry);
  return geometry;
}

function shaderSource(definition, parts) {
  const vertexShader = `
    #define ELEMENT_${definition.key.toUpperCase()} 1
    #define PARTS ${parts.toFixed(1)}
    const float PI = 3.141592653589793;
    const float TAU = 6.283185307179586;
    uniform float uElapsed;
    uniform float uDuration;
    uniform float uRadius;
    uniform float uSeed;
    uniform float uSkill;
    attribute float aStrip;
    attribute float aAlong;
    attribute float aSide;
    varying vec2 vUv;
    varying float vPart;
    float hash(float n) { return fract(sin(n * 127.1 + uSeed * 13.7) * 43758.5453); }
    void main() {
      float s = aStrip, t = aAlong, side = aSide;
      float phase = uElapsed + uSeed * 0.37;
      float life = clamp(uElapsed / uDuration, 0.0, 1.0);
      vec3 p = vec3(0.0);
      ${definition.vertex}
      float arrival = 0.45 + 0.55 * (1.0 - pow(1.0 - min(1.0, life * 4.0), 2.0));
      p.xz *= uRadius * arrival;
      p.y *= min(uRadius, 2.5);
      vUv = vec2(t, side * 0.5 + 0.5);
      vPart = s;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const fragmentShader = `
    #define ELEMENT_${definition.key.toUpperCase()} 1
    const float PI = 3.141592653589793;
    const float TAU = 6.283185307179586;
    uniform float uElapsed;
    uniform float uDuration;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vPart;
    void main() {
      float life = clamp(uElapsed / uDuration, 0.0, 1.0);
      float core = 1.0 - abs(vUv.y * 2.0 - 1.0);
      float alpha = smoothstep(0.0, 0.18, core) * smoothstep(0.0, 0.06, life);
      alpha *= 1.0 - smoothstep(0.55, 1.0, life);
      vec3 tint = uColor;
      ${definition.fragment}
      alpha *= uOpacity;
      if (alpha < 0.005) discard;
      gl_FragColor = vec4(tint, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;
  return { vertexShader, fragmentShader };
}

function borrowMaterial(definition, parts) {
  const key = `${definition.key}:${parts}`;
  const pool = materialPool.get(key);
  const material =
    pool?.pop() ??
    new THREE.ShaderMaterial({
      ...shaderSource(definition, parts),
      uniforms: {
        uElapsed: { value: 0 },
        uDuration: { value: 1 },
        uRadius: { value: 1 },
        uSeed: { value: 0 },
        uSkill: { value: -1 },
        uColor: { value: new THREE.Color(definition.color) },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
    });
  material.name = `ElementalVfx_${definition.key}`;
  material.userData = {
    poolKey: key,
    sharedProgram: true,
    element: definition.key,
  };
  return material;
}

/** Returns a THREE.Group, or null when the global safety bound is reached. */
export function createElementalEffect({
  element,
  skill = -1,
  direction,
  color,
  radius = 1.5,
  duration = 0.8,
  quality = "balanced",
  seed,
  opacity = 1,
  x = 0,
  y = 0,
  z = 0,
} = {}) {
  if (active.size >= MAX_ELEMENTAL_EFFECTS) return null;
  const definition = definitionByKey.get(resolveElement(element, color));
  const [density, segments] = qualities[quality] ?? qualities.balanced;
  const parts = Math.max(4, Math.round(definition.parts * density));
  const geometry = ribbonGeometry(parts, segments);
  const material = borrowMaterial(definition, parts);
  const lifespan = finite(duration, 0.8, 0.05, 120);
  const effectRadius = finite(radius, 1.5, 0.1, 20);
  material.uniforms.uDuration.value = lifespan;
  material.uniforms.uElapsed.value = 0;
  material.uniforms.uSkill.value = Number.isInteger(skill) && skill >= 0 && skill <= 4 ? skill : -1;
  material.uniforms.uRadius.value = effectRadius;
  material.uniforms.uSeed.value = finite(
    seed,
    (++serial % 997) / 997,
    -1e5,
    1e5,
  );
  material.uniforms.uColor.value.set(color ?? definition.color);
  material.uniforms.uOpacity.value = finite(opacity, 1, 0, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ElementalRibbon_${definition.pattern}`;
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  const group = new THREE.Group();
  group.name = `ElementalEffect_${definition.key}`;
  group.position.set(
    finite(x, 0, -1e5, 1e5),
    finite(y, 0, -1e5, 1e5),
    finite(z, 0, -1e5, 1e5),
  );
  if ((skill === 0 || skill === 4) && direction) group.rotation.y = Math.atan2(direction.x, direction.z);
  group.add(mesh);
  group.userData.elementalVfx = {
    element: definition.key,
    skill: material.uniforms.uSkill.value,
    pattern: definition.pattern,
    duration: lifespan,
    radius: effectRadius,
    elapsed: 0,
    parts,
    segments,
    disposed: false,
    sharedGeometry: true,
    pooledMaterial: true,
    proceduralTextureCount: 0,
  };
  instances.set(group, { mesh, material, poolKey: material.userData.poolKey });
  active.add(group);
  return group;
}

/** elapsed is seconds since this effect was born, not the global game time. */
export function updateElementalEffect(effect, elapsed) {
  const instance = instances.get(effect);
  if (!instance || effect.userData.elementalVfx.disposed) return false;
  const metadata = effect.userData.elementalVfx;
  metadata.elapsed = finite(elapsed, metadata.elapsed, 0, 1e9);
  instance.material.uniforms.uElapsed.value = metadata.elapsed;
  effect.visible = metadata.elapsed < metadata.duration;
  return effect.visible;
}

/** Releases this instance; callers must not dispose its borrowed mesh resources. */
export function disposeElementalEffect(effect) {
  const instance = instances.get(effect);
  if (!instance) return false;
  const pool = materialPool.get(instance.poolKey) ?? [];
  instance.material.uniforms.uOpacity.value = 0;
  if (pool.length < 4) {
    pool.push(instance.material);
    materialPool.set(instance.poolKey, pool);
  } else instance.material.dispose();
  effect.removeFromParent();
  effect.clear();
  effect.visible = false;
  effect.userData.elementalVfx.disposed = true;
  instances.delete(effect);
  active.delete(effect);
  return true;
}

export function elementalVfxCacheStats() {
  return Object.freeze({
    active: active.size,
    limit: MAX_ELEMENTAL_EFFECTS,
    geometryCount: geometries.size,
    pooledMaterials: [...materialPool.values()].reduce(
      (total, pool) => total + pool.length,
      0,
    ),
    textureCount: 0,
  });
}

/** Call on renderer teardown after disposing effects. Active borrowers are safe. */
export function clearElementalVfxCache() {
  if (active.size) return false;
  for (const geometry of geometries.values()) geometry.dispose();
  for (const pool of materialPool.values())
    for (const material of pool) material.dispose();
  geometries.clear();
  materialPool.clear();
  return true;
}

/** Optional bounded owner for callers that do not already have effect lifetime maps. */
export class ElementalVfxSystem {
  constructor(scene, { quality = "balanced", capacity } = {}) {
    this.scene = scene;
    this.quality = qualities[quality] ? quality : "balanced";
    this.capacity = Math.round(
      finite(capacity, quality === "ultra" ? 48 : 32, 1, MAX_ELEMENTAL_EFFECTS),
    );
    this.effects = new Map();
  }

  emit(options = {}) {
    if (this.effects.size >= this.capacity) {
      const oldest = this.effects.keys().next().value;
      disposeElementalEffect(oldest);
      this.effects.delete(oldest);
    }
    const effect = createElementalEffect({ quality: this.quality, ...options });
    if (!effect) return null;
    this.effects.set(effect, 0);
    this.scene?.add(effect);
    return effect;
  }

  update(dt) {
    const delta = finite(dt, 0, 0, 120);
    for (const [effect, age] of this.effects) {
      const elapsed = age + delta;
      if (!updateElementalEffect(effect, elapsed)) {
        disposeElementalEffect(effect);
        this.effects.delete(effect);
      } else this.effects.set(effect, elapsed);
    }
  }

  dispose() {
    for (const effect of this.effects.keys()) disposeElementalEffect(effect);
    this.effects.clear();
  }
}
