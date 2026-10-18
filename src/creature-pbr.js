import{perfMeasure}from'./perf-debug.js';
import * as T from "three";

// Albedo stays light so the creature's material tint remains authoritative.
// A profile is a visual surface, independent of combat or progression data.
const resolutions = Object.freeze({ high: 512, medium: 128, low: 32 });
const profiles = Object.freeze([
  "wolf",
  "rhino",
  "firebird",
  "icebutterfly",
  "ape",
  "kirin",
  "dragon",
  "hide",
  "gold",
]);
const profileNames = new Set(profiles);
const cache = new Map();
const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const mix = (a, b, t) => a + (b - a) * t;
const fract = (n) => n - Math.floor(n);
const smooth = (a, b, n) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pulse = (distance, width) => 1 - smooth(width * 0.22, width, distance);

function hash(x, y, seed = 0) {
  let h = Math.imul(x ^ 0x45d9f3b, 0x27d4eb2d);
  h = Math.imul(h ^ y ^ seed, 0x85ebca6b);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}

// The integer frequency is also the wrapping period, giving seamless repeats.
function noise(u, v, frequency, seed = 0) {
  const x = u * frequency,
    y = v * frequency,
    ix = Math.floor(x),
    iy = Math.floor(y),
    fx = fract(x),
    fy = fract(y),
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    wrap = (n) => ((n % frequency) + frequency) % frequency;
  return mix(
    mix(hash(wrap(ix), wrap(iy), seed), hash(wrap(ix + 1), wrap(iy), seed), sx),
    mix(
      hash(wrap(ix), wrap(iy + 1), seed),
      hash(wrap(ix + 1), wrap(iy + 1), seed),
      sx,
    ),
    sy,
  );
}

function grain(u, v, seed = 0) {
  return (
    noise(u, v, 8, seed) * 0.52 +
    noise(u, v, 32, seed + 89) * 0.3 +
    noise(u, v, 64, seed + 173) * 0.18
  );
}

// Difference between the nearest two sites makes connected plate boundaries,
// rather than disconnected lines painted across an otherwise smooth surface.
function stoneCell(u, v, frequency = 7) {
  const px = u * frequency,
    py = v * frequency,
    ix = Math.floor(px),
    iy = Math.floor(py),
    wrap = (n) => ((n % frequency) + frequency) % frequency;
  let nearest = 10,
    second = 10,
    id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const xx = ix + dx,
        yy = iy + dy,
        hx = hash(wrap(xx), wrap(yy), 19),
        hy = hash(wrap(xx), wrap(yy), 271),
        sx = xx + 0.15 + hx * 0.7 - px,
        sy = yy + 0.15 + hy * 0.7 - py,
        distance = sx * sx + sy * sy;
      if (distance < nearest) {
        second = nearest;
        nearest = distance;
        id = hx;
      } else if (distance < second) second = distance;
    }
  }
  return [Math.sqrt(second) - Math.sqrt(nearest), id, nearest];
}

function feather(u, v, coarse) {
  const rows = coarse ? 5 : 7,
    row = Math.floor(v * rows),
    x = fract(u * 8 + (row % 2) * 0.5) - 0.5,
    y = fract(v * rows),
    shaft = pulse(Math.abs(x), 0.035),
    barbs = Math.pow(
      0.5 + 0.5 * Math.sin((y * 15 - Math.abs(x) * 12) * TAU),
      4,
    ),
    edge = pulse(
      Math.abs(Math.abs(x) - (0.12 + Math.sin(y * Math.PI) * 0.34)),
      0.045,
    );
  return [shaft, barbs, edge, y];
}

function scaleField(u, v, rows = 9) {
  const row = Math.floor(v * rows),
    x = fract(u * 10 + (row % 2) * 0.5) - 0.5,
    y = fract(v * rows),
    curve = Math.sqrt(Math.max(0, 1 - x * x * 4)),
    lip = pulse(Math.abs(y - curve * 0.81), 0.06),
    dome = Math.max(0, Math.sin(y * Math.PI) * (1 - x * x * 3.4));
  return [dome, lip, x, y];
}

// Return height, roughness, light albedo RGB, emissive RGB and opacity.
function surface(profile, u, v, g) {
  if (profile === "wolf" || profile === "ape") {
    const ape = profile === "ape",
      bend = Math.sin(v * TAU * (ape ? 2 : 3)) * (ape ? 0.32 : 0.58),
      fur = Math.pow(
        0.5 + 0.5 * Math.sin((u * (ape ? 21 : 35) + bend + g * 0.5) * TAU),
        ape ? 3 : 7,
      ),
      barb = 0.5 + 0.5 * Math.sin((v * 43 + u * 13) * TAU),
      wind = ape
        ? 0
        : pulse(
            Math.abs(Math.sin((u * 3 + Math.sin(v * TAU) * 0.32) * TAU)),
            0.14,
          ),
      shade = 0.78 + fur * 0.16 + g * 0.055,
      emission = wind * (0.35 + 0.65 * smooth(0.45, 0.8, g));
    return [
      0.28 + fur * 0.4 + barb * 0.04 + g * 0.09,
      0.73 + g * 0.19 - fur * 0.13,
      mix(shade, 0.56, wind * 0.66),
      mix(shade, 1, wind * 0.7),
      mix(shade, 0.72, wind * 0.65),
      emission * 0.16,
      emission * 0.62,
      emission * 0.28,
      1,
    ];
  }
  if (profile === "rhino") {
    const [boundary, id, center] = stoneCell(u, v),
      crack = 1 - smooth(0.017, 0.075, boundary),
      core = 1 - smooth(0.006, 0.025, boundary),
      fleck = Math.pow(noise(u, v, 64, 727), 6),
      shade = 0.77 + id * 0.14 + g * 0.07 - crack * 0.16,
      glow = core * (0.4 + id * 0.6);
    return [
      clamp(0.65 + g * 0.18 - center * 0.1 - crack * 0.53),
      0.73 + g * 0.2 - core * 0.36,
      mix(shade, 1, core * 0.88) + fleck * 0.04,
      mix(shade, 0.83, core * 0.8),
      mix(shade, 0.34, core * 0.8),
      glow,
      glow * 0.54,
      glow * 0.055,
      1,
    ];
  }
  if (profile === "firebird") {
    const [shaft, barbs, edge, y] = feather(u, v, false),
      flame = Math.pow(
        0.5 + 0.5 * Math.sin((u * 7 + Math.sin(v * TAU * 3) * 0.25) * TAU),
        7,
      ),
      warm = smooth(0.25, 1, y),
      shade = 0.81 + barbs * 0.12 + shaft * 0.07 - edge * 0.09,
      glow = clamp(shaft * 0.7 + flame * warm * 0.75 + edge * 0.25);
    return [
      0.25 + barbs * 0.19 + shaft * 0.35 + y * 0.1 - edge * 0.11,
      0.48 + g * 0.2 - shaft * 0.15,
      Math.min(1, shade + warm * 0.06),
      shade * (1 - warm * 0.08),
      shade * (1 - warm * 0.22),
      glow,
      glow * mix(0.16, 0.74, shaft),
      glow * 0.04,
      1,
    ];
  }
  if (profile === "icebutterfly") {
    const x = u - 0.5,
      y = v - 0.5,
      angle = Math.atan2(y, x),
      radius = Math.sqrt(x * x + y * y),
      radialVein = pulse(Math.abs(Math.sin(angle * 6 + radius * 5)), 0.07),
      rings = pulse(Math.abs(Math.sin(radius * TAU * 7)), 0.1),
      sixfold =
        pulse(Math.abs(Math.sin(angle * 3)), 0.1) *
        (1 - smooth(0.12, 0.38, radius)),
      crystals =
        Math.pow(0.5 + 0.5 * Math.sin((u * 17 + v * 11) * TAU), 24) *
        Math.pow(g, 3),
      vein = clamp(radialVein * 0.78 + rings * 0.45),
      frost = clamp(sixfold + crystals * 2),
      shade = 0.85 + g * 0.08 + frost * 0.07;
    return [
      0.15 + vein * 0.33 + frost * 0.18 + g * 0.12,
      clamp(0.18 + frost * 0.29 + g * 0.16 - vein * 0.11),
      mix(shade * 0.93, 1, vein * 0.7),
      mix(shade * 0.98, 0.88, vein * 0.7),
      mix(shade, 0.43, vein * 0.7),
      vein * 0.29 + frost * 0.11,
      vein * 0.22 + frost * 0.2,
      vein * 0.06 + frost * 0.3,
      0.63 + vein * 0.23 + frost * 0.1,
    ];
  }
  if (profile === "kirin" || profile === "dragon") {
    const dragon = profile === "dragon",
      [dome, lip, x, y] = scaleField(u, v, dragon ? 12 : 9),
      scratches = pulse(Math.abs(Math.sin((u * 23 + v * 17) * TAU)), 0.055) * g,
      crack = lip * (0.4 + 0.6 * smooth(0.25, 0.75, g)),
      mane = dragon
        ? 0
        : Math.pow(
            0.5 + 0.5 * Math.sin((u * 8 + Math.sin(v * TAU * 3) * 0.25) * TAU),
            11,
          ) * smooth(0.45, 1, y),
      eye = dragon ? pulse(Math.hypot(x * 1.5, y - 0.3), 0.055) : 0,
      shade = 0.79 + dome * 0.14 + g * 0.06 - lip * 0.16,
      glow = clamp(crack * 0.9 + mane * 0.65 + eye);
    return [
      0.18 + dome * 0.58 - lip * 0.1 + scratches * 0.035,
      0.36 + g * 0.24 + lip * 0.11,
      mix(shade, dragon ? 0.91 : 1, glow * 0.7),
      mix(shade, dragon ? 0.69 : 0.79, glow * 0.7),
      mix(shade, dragon ? 1 : 0.43, glow * 0.7),
      glow * (dragon ? 0.57 : 1),
      glow * (dragon ? 0.12 : 0.48),
      glow * (dragon ? 1 : 0.05),
      1,
    ];
  }
  if (profile === "gold") {
    const brush =
        0.5 + 0.5 * Math.sin((v * 63 + noise(u, v, 8, 7) * 0.1) * TAU),
      scroll = pulse(
        Math.abs(Math.sin((u * 5 + Math.sin(v * TAU * 4) * 0.22) * TAU)),
        0.12,
      ),
      hammer = noise(u, v, 32, 77),
      shade = 0.85 + hammer * 0.1 + brush * 0.045;
    return [
      0.25 + hammer * 0.09 + scroll * 0.12 + brush * 0.025,
      0.22 + brush * 0.13 + hammer * 0.1,
      shade,
      shade * (1 - scroll * 0.08),
      shade * (1 - scroll * 0.2),
      scroll * 0.1,
      scroll * 0.07,
      scroll * 0.02,
      1,
    ];
  }
  const pore = noise(u, v, 64, 951),
    wrinkle = Math.pow(
      0.5 + 0.5 * Math.sin((u * 13 + Math.sin(v * TAU * 3) * 0.2) * TAU),
      12,
    ),
    shade = 0.8 + g * 0.12 + pore * 0.055;
  return [
    0.34 + pore * 0.14 + g * 0.16 - wrinkle * 0.12,
    0.61 + g * 0.22 + pore * 0.08,
    shade,
    shade,
    shade,
    0,
    0,
    0,
    1,
  ];
}

function texture(pixels, size, profile, detail, channel, colorSpace) {
  let canvas, context;
  try {
    if (typeof document !== "undefined" && document.createElement) {
      canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      context = canvas.getContext("2d", { alpha: true });
    } else if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(size, size);
      context = canvas.getContext("2d", { alpha: true });
    }
  } catch {
    context = null;
  }
  let result;
  if (context) {
    const image = context.createImageData(size, size);
    image.data.set(pixels);
    context.putImageData(image, 0, 0);
    result = new T.CanvasTexture(canvas);
  } else result = new T.DataTexture(pixels, size, size, T.RGBAFormat);
  result.name = `creature:${profile}:${detail}:${channel}`;
  result.colorSpace = colorSpace;
  result.wrapS = result.wrapT = T.RepeatWrapping;
  result.minFilter = T.LinearMipmapLinearFilter;
  result.magFilter = T.LinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = detail === "high" ? 4 : 1;
  // Canvas and headless DataTexture paths use identical UV orientation.
  result.flipY = false;
  result.userData = {
    sharedArt: true,
    profile,
    detail,
    channel,
    resolution: size,
    source: "procedural-heightfield",
  };
  result.needsUpdate = true;
  return result;
}

function createMapsMeasured(profile, detail) {
  const size = resolutions[detail],
    count = size * size,
    height = new Float32Array(count),
    albedo = new Uint8Array(count * 4),
    normal = new Uint8Array(count * 4),
    roughness = new Uint8Array(count * 4),
    emissive =
      profile === "hide" || profile === "ape"
        ? null
        : new Uint8Array(count * 4),
    alpha = profile === "icebutterfly" ? new Uint8Array(count * 4) : null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        k = i * 4,
        u = x / size,
        v = y / size,
        field = surface(
          profile,
          u,
          v,
          grain(u, v, profiles.indexOf(profile) * 101),
        );
      height[i] = field[0];
      albedo[k] = Math.round(clamp(field[2]) * 255);
      albedo[k + 1] = Math.round(clamp(field[3]) * 255);
      albedo[k + 2] = Math.round(clamp(field[4]) * 255);
      albedo[k + 3] = 255;
      const r = Math.round(clamp(field[1]) * 255);
      roughness[k] = roughness[k + 1] = roughness[k + 2] = r;
      roughness[k + 3] = 255;
      if (emissive) {
        emissive[k] = Math.round(clamp(field[5]) * 255);
        emissive[k + 1] = Math.round(clamp(field[6]) * 255);
        emissive[k + 2] = Math.round(clamp(field[7]) * 255);
        emissive[k + 3] = 255;
      }
      if (alpha) {
        const a = Math.round(clamp(field[8]) * 255);
        alpha[k] = alpha[k + 1] = alpha[k + 2] = a;
        alpha[k + 3] = 255;
      }
    }
  }
  // Central differences construct tangent-space normals from the same raised
  // fur, scale, feather and crack fields that modulate albedo and roughness.
  const strength = size / (profile === "rhino" ? 58 : 74);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = (y * size + x) * 4,
        left = height[y * size + ((x + size - 1) % size)],
        right = height[y * size + ((x + 1) % size)],
        down = height[((y + size - 1) % size) * size + x],
        up = height[((y + 1) % size) * size + x],
        nx = (left - right) * strength,
        ny = (down - up) * strength,
        inverseLength = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      normal[k] = Math.round((nx * inverseLength * 0.5 + 0.5) * 255);
      normal[k + 1] = Math.round((ny * inverseLength * 0.5 + 0.5) * 255);
      normal[k + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
      normal[k + 3] = 255;
    }
  }
  const result = {
    map: texture(albedo, size, profile, detail, "albedo", T.SRGBColorSpace),
    normalMap: texture(normal, size, profile, detail, "normal", T.NoColorSpace),
    roughnessMap: texture(
      roughness,
      size,
      profile,
      detail,
      "roughness",
      T.NoColorSpace,
    ),
  };
  if (emissive)
    result.emissiveMap = texture(
      emissive,
      size,
      profile,
      detail,
      "emissive",
      T.SRGBColorSpace,
    );
  if (alpha)
    result.alphaMap = texture(
      alpha,
      size,
      profile,
      detail,
      "alpha",
      T.NoColorSpace,
    );
  return Object.freeze(result);
}

/** Shared maps; color is deliberately applied by the caller's material. */
export function getCreaturePBR(profile, detail = "medium", color = 0xffffff) {
  const name = profileNames.has(profile) ? profile : "hide";
  const level = Object.hasOwn(resolutions, detail) ? detail : "medium";
  const key = `${name}:${level}`;
  if (!cache.has(key)) cache.set(key, createMaps(name, level));
  return cache.get(key);
}

/** Reports bounded allocation; mipmap estimate is the complete 4/3 chain. */
export function creaturePBRCacheInfo() {
  const entries = [];
  let textureCount = 0,
    bytes = 0;
  for (const [key, maps] of cache) {
    const [profile, detail] = key.split(":"),
      count = Object.keys(maps).length,
      resolution = resolutions[detail],
      baseBytes = count * resolution * resolution * 4;
    textureCount += count;
    bytes += baseBytes;
    entries.push({
      profile,
      detail,
      resolution,
      textureCount: count,
      bytes: baseBytes,
    });
  }
  return {
    entries,
    profileCount: profiles.length,
    levelCount: Object.keys(resolutions).length,
    maxEntries: profiles.length * Object.keys(resolutions).length,
    entryCount: cache.size,
    textureCount,
    bytes,
    estimatedGPUMipBytes: Math.ceil((bytes * 4) / 3),
  };
}

function createMaps(...args){return perfMeasure('texture:createMaps',()=>createMapsMeasured(...args),{arguments:args.map(a=>typeof a==='object'?a?.detail??a?.size??null:a)});}
