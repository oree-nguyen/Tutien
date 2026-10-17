import{perfMeasure}from'./perf-debug.js';
import * as T from "three";
import { RINGS } from "./data.js";

const textureCache = new Map();
const owners = new WeakMap();
const plane = new T.PlaneGeometry(1, 1);
plane.userData.sharedArt = true;
const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));
const band = (radius, center, width) =>
  Math.exp(-(((radius - center) / width) ** 2));

// Geometric seal strokes are drawn as paths, without depending on a font or
// substituting item codes for the ring's illustrated ancient glyphs.
const glyphs = [
  [
    [0, -0.8, 0, 0.8],
    [-0.35, -0.5, 0.35, -0.5],
    [-0.3, 0.3, 0, 0.65],
    [0, 0.65, 0.3, 0.3],
  ],
  [
    [-0.32, -0.7, 0.3, -0.7],
    [0.3, -0.7, -0.15, 0.1],
    [-0.15, 0.1, 0.3, 0.75],
    [-0.3, 0.4, 0.24, 0.4],
  ],
  [
    [-0.32, -0.65, 0.32, -0.65],
    [-0.32, -0.65, -0.32, 0.55],
    [0.32, -0.65, 0.32, 0.55],
    [-0.32, 0.1, 0.32, 0.1],
    [0, 0.1, 0, 0.8],
  ],
  [
    [0, -0.8, -0.32, -0.2],
    [-0.32, -0.2, 0, 0.35],
    [0, 0.35, 0.32, -0.2],
    [0.32, -0.2, 0, -0.8],
    [0, 0.35, 0, 0.8],
  ],
  [
    [-0.32, -0.75, 0.28, -0.2],
    [0.28, -0.2, -0.32, 0.3],
    [-0.32, 0.3, 0.28, 0.75],
    [0, -0.8, 0, 0.8],
  ],
  [
    [-0.3, -0.7, 0.3, -0.7],
    [0, -0.7, 0, 0.75],
    [-0.3, -0.05, 0.3, -0.05],
    [-0.3, 0.65, 0, 0.3],
    [0, 0.3, 0.3, 0.65],
  ],
  [
    [-0.3, -0.7, -0.3, 0.65],
    [-0.3, 0.65, 0.3, 0.65],
    [0.3, 0.65, 0.3, -0.7],
    [-0.3, -0.1, 0.3, -0.1],
    [0, -0.8, 0, 0.8],
  ],
  [
    [0, -0.8, -0.32, -0.3],
    [-0.32, -0.3, 0.32, 0.15],
    [0.32, 0.15, -0.3, 0.7],
    [0, -0.35, 0, 0.8],
  ],
];

function segmentDistance(x, y, segment) {
  const dx = segment[2] - segment[0],
    dy = segment[3] - segment[1];
  const t = clamp(
    ((x - segment[0]) * dx + (y - segment[1]) * dy) / (dx * dx + dy * dy),
  );
  return Math.hypot(x - segment[0] - dx * t, y - segment[1] - dy * t);
}

function makePixels(ring, size) {
  const pixels = new Uint8Array(size * size * 4),
    black = ring.black;
  const sectors = 18 + (ring.id % 5) * 2,
    seed = ring.id * 0.191;
  const baseColor = black ? [13, 10, 23] : [76, 24, 132];
  const rimColor = black ? [155, 99, 217] : [195, 108, 255];
  const runeColor = black ? [245, 215, 158] : [229, 183, 255];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = ((x + 0.5) / size) * 2 - 1,
        py = ((y + 0.5) / size) * 2 - 1;
      const radius = Math.hypot(px, py);
      if (radius < 0.58 || radius > 0.99) continue;
      const angle = (Math.atan2(py, px) + TAU + seed) % TAU;
      const sector = Math.floor((angle / TAU) * sectors);
      const localX = ((angle / TAU) * sectors - sector - 0.5) * 0.85;
      const localY = (radius - 0.787) / 0.092;
      let glyphDistance = 10;
      if (radius > 0.692 && radius < 0.885) {
        const strokes =
          glyphs[(ring.id * 7 + sector * 3 + (sector >> 2)) % glyphs.length];
        for (const stroke of strokes)
          glyphDistance = Math.min(
            glyphDistance,
            segmentDistance(localX, localY, stroke),
          );
      }
      const glyphCore = Math.exp(-((glyphDistance / 0.048) ** 2));
      const glyphGlow = Math.exp(-((glyphDistance / 0.16) ** 2));
      const rim = band(radius, 0.674, 0.005) + band(radius, 0.9, 0.006);
      const spokes =
        Math.pow(Math.max(0, Math.cos(angle * (6 + (ring.id % 4)))), 20) *
        band(radius, 0.933, 0.014);
      const thinRipple =
        band(radius, 0.947, 0.006) * 0.26 + band(radius, 0.625, 0.007) * 0.22;
      const innerPlate = Math.exp(-(((radius - 0.787) / 0.105) ** 8));
      const energy = clamp(rim + spokes + thinRipple + glyphGlow * 0.47);
      const alpha = clamp(
        (black ? 0.64 : 0.17) * innerPlate + glyphCore * 0.9 + energy * 0.52,
      );
      const rune = clamp(glyphCore * 0.95),
        luminous = clamp(energy * 0.84);
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const lit =
          baseColor[channel] * (1 - luminous) + rimColor[channel] * luminous;
        pixels[offset + channel] = Math.round(
          lit * (1 - rune) + runeColor[channel] * rune,
        );
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  return pixels;
}

function textureForMeasured(id, resolution) {
  const key = `${id}:${resolution}`;
  if (!textureCache.has(key)) {
    const ring = RINGS[id - 1],
      pixels = makePixels(ring, resolution);
    let canvas, context;
    try {
      if (typeof document !== "undefined" && document.createElement) {
        canvas = document.createElement("canvas");
        canvas.width = canvas.height = resolution;
        context = canvas.getContext("2d", { alpha: true });
      } else if (typeof OffscreenCanvas !== "undefined") {
        canvas = new OffscreenCanvas(resolution, resolution);
        context = canvas.getContext("2d", { alpha: true });
      }
    } catch {
      context = null;
    }
    let texture;
    if (context) {
      const image = context.createImageData(resolution, resolution);
      image.data.set(pixels);
      context.putImageData(image, 0, 0);
      texture = new T.CanvasTexture(canvas);
    } else
      texture = new T.DataTexture(pixels, resolution, resolution, T.RGBAFormat);
    texture.name = `soul-ring:${ring.code}:${resolution}`;
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.generateMipmaps = true;
    texture.flipY = false;
    texture.userData = {
      sharedArt: true,
      ringId: id,
      tier: ring.black ? "black" : "purple",
      resolution,
      source: "procedural-ancient-seal",
    };
    texture.needsUpdate = true;
    textureCache.set(key, texture);
  }
  return textureCache.get(key);
}

function ringMaterial(id, slot, placement, resolution) {
  const ring = RINGS[id - 1],
    texture = textureFor(id, resolution);
  const uniforms = {
    time: { value: 0 },
    seed: { value: id * 0.071 + slot * 0.23 },
  };
  const material = new T.MeshPhysicalMaterial({
    color: 0xffffff,
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: ring.black ? 0.75 : 0.86,
    roughness: 0.45,
    metalness: 0.08,
    clearcoat: 0.18,
    transparent: true,
    opacity: placement === "back" ? 0.66 : 0.8,
    blending: ring.black ? T.NormalBlending : T.AdditiveBlending,
    depthWrite: false,
    side: T.DoubleSide,
    toneMapped: false,
  });
  material.userData = {
    sharedArt: true,
    ownedSoulRing: true,
    ringId: id,
    slot,
    tier: ring.black ? "black" : "purple",
    placement,
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSoulTime = uniforms.time;
    shader.uniforms.uSoulSeed = uniforms.seed;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uSoulTime;
uniform float uSoulSeed;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float soulRadius = length(vMapUv * 2.0 - 1.0);
float soulWaveRadius = 0.63 + fract(uSoulTime * 0.16 + uSoulSeed) * 0.31;
float soulWave = exp(-pow((soulRadius - soulWaveRadius) / 0.038, 2.0));
totalEmissiveRadiance *= 0.88 + soulWave * 0.3;`,
      );
  };
  material.customProgramCacheKey = () => "soul-ring-ripple-v1";
  return { material, uniforms };
}

function buildSlot(group, id, slot, resolution) {
  const record = { id, slot, resolution, meshes: [], uniforms: [] };
  for (const placement of ["foot", "back"]) {
    const { material, uniforms } = ringMaterial(
      id,
      slot,
      placement,
      resolution,
    );
    const mesh = new T.Mesh(plane, material);
    mesh.name = `soulRing:${slot}:${placement}`;
    mesh.userData = {
      soulRing: true,
      ringId: id,
      slot,
      tier: RINGS[id - 1].black ? "black" : "purple",
      placement,
      resolution,
    };
    if (placement === "foot") {
      mesh.position.set(0, 0.017 + slot * 0.008, 0);
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.setScalar(1.55 + slot * 0.28);
    } else {
      mesh.position.set(0, 1.04 + slot * 0.045, 0.23 + slot * 0.015);
      mesh.scale.setScalar(1.44 + slot * 0.23);
    }
    mesh.renderOrder = placement === "foot" ? 3 + slot : 1 + slot;
    mesh.castShadow = mesh.receiveShadow = false;
    group.add(mesh);
    record.meshes.push(mesh);
    record.uniforms.push(uniforms);
  }
  return record;
}

function removeSlot(group, record) {
  if (!record) return;
  for (const mesh of record.meshes) {
    group?.remove(mesh);
    // Only this root's material is owned. Geometry and textures stay borrowed.
    mesh.material.dispose();
  }
}

function loadout(actor) {
  return [0, 1].map((slot) => {
    const id = actor?.rings?.[slot];
    return Number.isInteger(id) &&
      id > 0 &&
      id <= RINGS.length &&
      RINGS[id - 1]?.id === id
      ? id
      : 0;
  });
}

/** Call after static mesh batching, and during animation. No actor fields change. */
export function syncSoulRingVisuals(root, actor, detail = "low", time = 0) {
  if (!root?.isObject3D)
    throw new TypeError("A THREE.Object3D root is required");
  let state = owners.get(root);
  if (!state) {
    // Object3D.clone copies materials by reference. Detach its inherited aura
    // without disposing a material that still belongs to the original root.
    for (const child of [...root.children])
      if (child.userData.soulRingVFX) root.remove(child);
    state = { signature: null, group: null, slots: [null, null], revision: 0 };
    owners.set(root, state);
  }
  const ids = loadout(actor),
    resolution = detail === "high" ? 512 : 256;
  const signature = `${ids.join(",")}@${resolution}`;
  if (signature !== state.signature) {
    if (ids.some(Boolean) && !state.group) {
      state.group = new T.Group();
      state.group.name = "soulRingVisuals";
      state.group.userData.soulRingVFX = true;
      root.add(state.group);
    }
    for (let slot = 0; slot < 2; slot++) {
      const old = state.slots[slot];
      if (old?.id === ids[slot] && old.resolution === resolution) continue;
      removeSlot(state.group, old);
      state.slots[slot] = ids[slot]
        ? buildSlot(state.group, ids[slot], slot, resolution)
        : null;
    }
    if (!ids.some(Boolean) && state.group) {
      root.remove(state.group);
      state.group = null;
    }
    state.signature = signature;
    state.revision++;
    root.userData.soulRingVFX = {
      signature,
      ringIds: [...ids],
      resolution,
      revision: state.revision,
    };
    if (state.group)
      state.group.userData.slots = state.slots.filter(Boolean).map((slot) => ({
        slot: slot.slot,
        ringId: slot.id,
        tier: RINGS[slot.id - 1].black ? "black" : "purple",
      }));
  }
  const seconds = Number.isFinite(time) ? time : 0;
  if (!state.group) return null;
  state.group.userData.detail =
    detail === "high" ? "high" : detail === "medium" ? "medium" : "low";
  for (const slot of state.slots) {
    if (!slot) continue;
    for (let i = 0; i < slot.meshes.length; i++) {
      const mesh = slot.meshes[i],
        placement = mesh.userData.placement;
      const phase = seconds * 1.65 + slot.id * 0.47;
      const diameter =
        placement === "foot"
          ? 1.55 + slot.slot * 0.28
          : 1.44 + slot.slot * 0.23;
      mesh.scale.setScalar(diameter * (1 + Math.sin(phase) * 0.014));
      mesh.rotation.z =
        seconds *
          (slot.slot ? -0.14 : 0.18) *
          (placement === "back" ? -0.7 : 1) +
        slot.id * 0.21;
      mesh.material.opacity =
        (placement === "back" ? 0.66 : 0.8) + Math.sin(phase) * 0.045;
      slot.uniforms[i].time.value = seconds;
    }
  }
  return state.group;
}

/** Release only materials allocated by this module for this particular root. */
export function disposeSoulRingVisuals(root) {
  const state = owners.get(root);
  if (state) {
    for (const slot of state.slots) removeSlot(state.group, slot);
    if (state.group) root.remove(state.group);
    owners.delete(root);
  } else if (root?.children) {
    for (const child of [...root.children])
      if (child.userData.soulRingVFX) root.remove(child);
  }
  if (root?.userData) delete root.userData.soulRingVFX;
}

/** Two immutable resolutions per source ID: at most 12 profiles/24 textures. */
export function getSoulRingTextureCacheInfo() {
  const entries = [...textureCache].map(([key, texture]) => ({
    key,
    ringId: texture.userData.ringId,
    resolution: texture.userData.resolution,
    bytes: texture.userData.resolution ** 2 * 4,
  }));
  const bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  return {
    profileCount: new Set(entries.map((entry) => entry.ringId)).size,
    textureCount: entries.length,
    bytes,
    estimatedGPUMipBytes: Math.ceil((bytes * 4) / 3),
    maxProfiles: RINGS.length,
    maxTextures: RINGS.length * 2,
    entries,
  };
}

function textureFor(...args){return perfMeasure('texture:textureFor',()=>textureForMeasured(...args),{arguments:args.map(a=>typeof a==='object'?a?.detail??a?.size??null:a)});}
