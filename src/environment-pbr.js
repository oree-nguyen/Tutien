import * as THREE from "three";
import { REGIONS } from "./data.js";

export const ENVIRONMENT_PBR_SIZE = 2048;
export const ENVIRONMENT_PBR_REPEAT = 24;
export const BIOME_SURFACES = [
  {
    name: "moss-and-loam",
    color: [66, 92, 47],
    roughness: 0.91,
    normal: 0.52,
    emission: 0.12,
  },
  {
    name: "weathered-gold-granite",
    color: [137, 126, 99],
    roughness: 0.84,
    normal: 0.75,
    emission: 0.05,
  },
  {
    name: "wet-poison-peat",
    color: [63, 45, 76],
    roughness: 0.2,
    normal: 0.35,
    emission: 0.17,
  },
  {
    name: "snow-and-blue-ice",
    color: [222, 237, 240],
    roughness: 0.58,
    normal: 0.42,
    emission: 0.04,
  },
  {
    name: "fissured-emissive-basalt",
    color: [49, 36, 33],
    roughness: 0.87,
    normal: 0.82,
    emission: 1.05,
  },
  {
    name: "dragon-engraved-ancient-stone",
    color: [128, 137, 124],
    roughness: 0.76,
    normal: 0.63,
    emission: 0.14,
  },
  {
    name: "faceted-void-crystal",
    color: [94, 57, 134],
    roughness: 0.29,
    normal: 0.7,
    emission: 0.65,
  },
];
const byte = (value) => Math.max(0, Math.min(255, Math.round(value)));
function texture(
  pixels,
  size,
  colorSpace,
  anisotropy,
  repeat = ENVIRONMENT_PBR_REPEAT,
) {
  const t = new THREE.DataTexture(
    pixels,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  t.colorSpace = colorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  t.userData.sharedEnvironment = true;
  return t;
}
function noise(x, y, seed = 0) {
  let n =
    (Math.imul(x, 374761393) +
      Math.imul(y, 668265263) +
      Math.imul(seed + 1, 1274126177)) |
    0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n >>> 0) / 4294967296;
}

/** Pure raster code is serialized into the offline Blob worker. Every helper
 * and input is local, including under Vite's production identifier minification. */
export function rasterBiomePixels(biome, size, spec) {
  if (
    !Number.isInteger(biome) ||
    biome < 0 ||
    biome > 6 ||
    !spec ||
    !Number.isInteger(size) ||
    size < 16 ||
    size > 2048
  )
    throw Error("Invalid biome texture request");
  const byte = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const noise = (x, y, seed) => {
    let n =
      (Math.imul(x, 374761393) +
        Math.imul(y, 668265263) +
        Math.imul(seed + 1, 1274126177)) |
      0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n >>> 0) / 4294967296;
  };
  const waves = (length) => {
    const values = [];
    for (const frequency of [3, 7, 13, 29]) {
      const row = new Float32Array(length);
      for (let i = 0; i < length; i++)
        row[i] = Math.sin((i / length) * Math.PI * 2 * frequency);
      values.push(row);
    }
    return values;
  };
  const count = size * size,
    height = new Float32Array(count),
    albedo = new Uint8Array(count * 4),
    packed = new Uint8Array(count * 4),
    normal = new Uint8Array(count * 4),
    emissive = new Uint8Array(count * 4);
  const [a, b, c, d] = waves(size);
  const emissionColor =
    biome === 4
      ? [255, 73, 7]
      : biome === 6
        ? [166, 96, 255]
        : biome === 2
          ? [73, 199, 136]
          : [153, 210, 139];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        k = i * 4,
        grain = noise(x, y, biome),
        broad = a[x] * b[y],
        fine = c[x] * d[y];
      let h = 0.5,
        variation = 0.78 + grain * 0.15 + broad * 0.13,
        rough = spec.roughness,
        glow = 0;
      const seam = Math.abs(a[x] + b[y] * 0.65 + c[x] * c[y] * 0.17);
      if (biome === 0) {
        h += broad * 0.15 + fine * 0.05 + (grain - 0.5) * 0.065;
        rough -= Math.max(0, broad) * 0.1;
        glow = grain > 0.998 && fine > 0.6 ? 0.6 : 0;
      }
      if (biome === 1) {
        h += Math.abs(broad) * 0.23 + (grain - 0.5) * 0.16;
        variation += grain > 0.965 ? 0.32 : 0;
        rough -= grain > 0.965 ? 0.25 : 0;
      }
      if (biome === 2) {
        h += broad * 0.06 + fine * 0.025 + (grain - 0.5) * 0.025;
        rough += fine * 0.08;
        glow = Math.max(0, broad - 0.5) * 0.25;
      }
      if (biome === 3) {
        h += Math.abs(c[x] + c[y]) * 0.09 + (grain - 0.5) * 0.055;
        const ice = seam < 0.1;
        rough = ice ? 0.18 : 0.72;
        variation += ice ? -0.18 : grain > 0.98 ? 0.13 : 0;
      }
      if (biome === 4) {
        const crack = seam < 0.075;
        h += crack ? -0.3 : broad * 0.13 + fine * 0.08;
        glow = crack ? 1 - seam / 0.075 : 0;
        variation *= crack ? 0.24 : 1;
      }
      if (biome === 5) {
        const carving = Math.abs(a[x] * a[y] + c[x] * b[y] * 0.4) < 0.055;
        h += carving ? -0.19 : broad * 0.055 + (grain - 0.5) * 0.04;
        glow = carving ? 0.45 : 0;
        variation *= carving ? 0.58 : 1;
      }
      if (biome === 6) {
        const facet = Math.abs(a[x] - b[y]);
        h += facet * 0.14 + fine * 0.07;
        rough += fine * 0.06;
        glow = seam < 0.08 ? 0.7 : Math.max(0, fine - 0.8) * 0.35;
      }
      height[i] = h;
      for (let channel = 0; channel < 3; channel++)
        albedo[k + channel] = byte(spec.color[channel] * variation);
      albedo[k + 3] = 255;
      packed[k] = byte(h * 255);
      packed[k + 1] = byte(rough * 255);
      packed[k + 2] = byte((0.78 + h * 0.3) * 255);
      packed[k + 3] = 255;
      emissive[k] = byte(emissionColor[0] * glow);
      emissive[k + 1] = byte(emissionColor[1] * glow);
      emissive[k + 2] = byte(emissionColor[2] * glow);
      emissive[k + 3] = 255;
    }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        k = i * 4;
      const nx =
        (height[y * size + ((x + size - 1) % size)] -
          height[y * size + ((x + 1) % size)]) *
        3.5;
      const ny =
        (height[((y + size - 1) % size) * size + x] -
          height[((y + 1) % size) * size + x]) *
        3.5;
      const length = Math.hypot(nx, ny, 1);
      normal[k] = byte(((nx / length) * 0.5 + 0.5) * 255);
      normal[k + 1] = byte(((ny / length) * 0.5 + 0.5) * 255);
      normal[k + 2] = byte(((1 / length) * 0.5 + 0.5) * 255);
      normal[k + 3] = 255;
    }
  return { albedo, normal, roughnessHeight: packed, emissive };
}

/** Four real maps per biome. Height is packed in roughness.R, roughness in G,
 * and micro occlusion in B; bumpMap and roughnessMap share that GPU texture. */
export function generateBiomeTextureSet(
  biome,
  { size = ENVIRONMENT_PBR_SIZE, anisotropy = 1 } = {},
) {
  const spec = BIOME_SURFACES[biome];
  return textureSetFromPixels(
    biome,
    size,
    spec,
    rasterBiomePixels(biome, size, spec),
    anisotropy,
  );
}

function textureSetFromPixels(biome, size, spec, pixels, anisotropy) {
  const set = {
    biome,
    size,
    name: spec.name,
    albedo: texture(pixels.albedo, size, THREE.SRGBColorSpace, anisotropy),
    normal: texture(pixels.normal, size, THREE.NoColorSpace, anisotropy),
    roughnessHeight: texture(
      pixels.roughnessHeight,
      size,
      THREE.NoColorSpace,
      anisotropy,
    ),
    emissive: texture(pixels.emissive, size, THREE.SRGBColorSpace, anisotropy),
    bytes: size * size * 16,
    disposed: false,
  };
  set.dispose = () => {
    if (set.disposed) return;
    for (const key of ["albedo", "normal", "roughnessHeight", "emissive"])
      set[key].dispose();
    set.disposed = true;
  };
  return set;
}

export function biomePBRWorkerSource() {
  return `"use strict";
const raster = (${rasterBiomePixels.toString()});
self.onmessage = function (event) {
  const request = event.data;
  try {
    const pixels = raster(request.biome, request.size, request.spec);
    const buffers = {
      albedo: pixels.albedo.buffer,
      normal: pixels.normal.buffer,
      roughnessHeight: pixels.roughnessHeight.buffer,
      emissive: pixels.emissive.buffer,
    };
    self.postMessage({ id: request.id, biome: request.biome, size: request.size, buffers },
      [buffers.albedo, buffers.normal, buffers.roughnessHeight, buffers.emissive]);
  } catch (error) {
    self.postMessage({ id: request.id, biome: request.biome, error: String(error && error.message || error) });
  }
};`;
}

/** Reorder indices, never positions: actor movement and ground picking retain
 * their existing coordinates and height function. All seven groups are real. */
export function assignTerrainBiomeGroups(geometry, biomeAt) {
  const index = geometry.index,
    position = geometry.attributes.position;
  if (!index) throw Error("Terrain must be indexed");
  const buckets = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const x = ids.reduce((sum, id) => sum + position.getX(id), 0) / 3;
    const z = -ids.reduce((sum, id) => sum + position.getY(id), 0) / 3;
    buckets[biomeAt(x, z)].push(...ids);
  }
  const reordered = new Uint32Array(index.count);
  geometry.clearGroups();
  let offset = 0;
  buckets.forEach((values, biome) => {
    reordered.set(values, offset);
    geometry.addGroup(offset, values.length, biome);
    offset += values.length;
  });
  geometry.setIndex(new THREE.BufferAttribute(reordered, 1));
  geometry.userData.biomeGroups = buckets.map((values) => values.length / 3);
  return geometry;
}

let bakedTerrainProvider=null;
export function installTerrainTextureProvider(provider){bakedTerrainProvider=provider;}
export class BiomePBRManager {
  constructor({
    splatmap,
    renderer = null,
    quality = "balanced",
    textureSize = ENVIRONMENT_PBR_SIZE,
    fallbackSize = 128,
    workerFactory = null,
    workerTimeoutMs = 20000,
  } = {}) {
    if (!splatmap?.isTexture) throw Error("Terrain splatmap texture required");
    if (
      !Number.isInteger(textureSize) ||
      textureSize < 16 ||
      textureSize > 2048
    )
      throw Error("Invalid biome texture request");
    if (![128, 256].includes(fallbackSize))
      throw Error("Low biome textures must be 128 or 256 pixels");
    if (!["balanced", "ultra"].includes(quality))
      throw Error("Unknown environment quality");
    this.textureSize = textureSize;
    this.fallbackSize = Math.min(textureSize, fallbackSize);
    this.cache = new Map();
    this.active = [];
    this.generated = this.evicted = this.staleResults = 0;
    this.workerErrors = 0;
    this.workerError = "";
    this.worker = null;
    this.workerURL = null;
    this.pending = null;
    this.queue = [];
    this.requestId = 0;
    this.workerEpoch = 0;
    this.workerTimer = null;
    this.workerTimeoutMs = Math.max(1, workerTimeoutMs);
    this.workerFactory = workerFactory;
    this.asyncGeneration =
      Boolean(workerFactory || typeof globalThis.Worker === "function") &&
      typeof globalThis.Blob === "function" &&
      typeof globalThis.URL?.createObjectURL === "function";
    this.workerDisabled = false;
    this.disposed = false;
    this.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
    this.quality = quality;
    this.maximumResidentBiomes = quality === "ultra" ? 2 : 1;
    this.fallback = texture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      THREE.SRGBColorSpace,
      1,
      1,
    );
    this.lowFallbacks = BIOME_SURFACES.map((_, biome) =>
      generateBiomeTextureSet(biome, {
        size: this.fallbackSize,
        anisotropy: this.anisotropy,
      }),
    );
    this.materials = BIOME_SURFACES.map((spec, biome) => {
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: splatmap,
        roughness: spec.roughness,
        metalness: biome === 6 ? 0.24 : 0.025,
      });
      const uniforms = {
        uBiomeAlbedo: { value: this.fallback },
        uBiomeStrength: { value: 0 },
      };
      m.userData.biomePBR = {
        biome,
        name: spec.name,
        resolution: textureSize,
        fallbackResolution: this.fallbackSize,
        repeat: 24,
        active: false,
        fallback: false,
        packedHeightRoughness: true,
        uniforms,
      };
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader =
          "uniform sampler2D uBiomeAlbedo;uniform float uBiomeStrength;\n" +
          shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          vec3 environmentMicroAlbedo = texture2D(uBiomeAlbedo, vMapUv * 24.0).rgb;
          diffuseColor.rgb *= mix(vec3(1.0), environmentMicroAlbedo * 1.65 + vec3(.2), uBiomeStrength);
          #ifdef USE_ROUGHNESSMAP
            diffuseColor.rgb *= mix(1.0, texture2D(roughnessMap, vRoughnessMapUv).b, .2);
          #endif`,
          );
      };
      m.customProgramCacheKey = () => "biome-pbr-layer-v2-async";
      return m;
    });
    if (this.asyncGeneration)
      for (let biome = 0; biome < BIOME_SURFACES.length; biome++)
        this.attach(biome, this.lowFallbacks[biome], false);
  }
  configureRenderer(renderer) {
    this.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
    for (const set of [...this.lowFallbacks, ...this.cache.values()])
      for (const key of ["albedo", "normal", "roughnessHeight", "emissive"]) {
        set[key].anisotropy = this.anisotropy;
        set[key].needsUpdate = true;
      }
  }
  setQuality(quality) {
    if (!["balanced", "ultra"].includes(quality))
      throw Error("Unknown environment quality");
    this.quality = quality;
    this.maximumResidentBiomes = quality === "ultra" ? 2 : 1;
    this.activate(this.active.slice(0, this.maximumResidentBiomes));
  }
  attach(biome, set, high = true) {
    const m = this.materials[biome],
      spec = BIOME_SURFACES[biome];
    const textureBindingsChanged =
      m.normalMap !== set.normal ||
      m.roughnessMap !== set.roughnessHeight ||
      m.emissiveMap !== set.emissive;
    m.normalMap = set.normal;
    m.normalScale.set(spec.normal, spec.normal);
    m.roughnessMap = m.bumpMap = set.roughnessHeight;
    m.bumpScale = biome === 4 ? 0.16 : 0.07;
    m.roughness = 1;
    m.emissiveMap = set.emissive;
    m.emissive.setHex(0xffffff);
    m.emissiveIntensity = spec.emission;
    m.userData.biomePBR.active = high;
    m.userData.biomePBR.fallback = !high;
    m.userData.biomePBR.uniforms.uBiomeAlbedo.value = set.albedo;
    m.userData.biomePBR.uniforms.uBiomeStrength.value = 0.48;
    if (textureBindingsChanged) m.needsUpdate = true;
  }
  detach(biome) {
    if (this.asyncGeneration) {
      this.attach(biome, this.lowFallbacks[biome], false);
      return;
    }
    // Node and Worker-less integrations retain their synchronous API semantics.
    const m = this.materials[biome];
    m.normalMap = m.roughnessMap = m.bumpMap = m.emissiveMap = null;
    m.roughness = BIOME_SURFACES[biome].roughness;
    m.emissive.setHex(0);
    m.userData.biomePBR.active = false;
    m.userData.biomePBR.fallback = false;
    m.userData.biomePBR.uniforms.uBiomeAlbedo.value = this.fallback;
    m.userData.biomePBR.uniforms.uBiomeStrength.value = 0;
    m.needsUpdate = true;
  }
  activate(biomes) {
    if (this.disposed) return;
    const desired = [...new Set(biomes)].slice(0, this.maximumResidentBiomes);
    if (desired.some((i) => !Number.isInteger(i) || !BIOME_SURFACES[i]))
      throw Error("Unknown terrain biome");
    this.active
      .filter((i) => !desired.includes(i))
      .forEach((i) => this.detach(i));
    for (const [biome, set] of this.cache)
      if (!desired.includes(biome)) {
        set.dispose();
        this.cache.delete(biome);
        this.evicted++;
      }
    this.active = desired;
    if (!desired.length) {
      this.queue = [];
      this.stopWorker();
      return;
    }
    if (this.asyncGeneration) {
      for (const biome of desired) {
        const set = this.cache.get(biome);
        if (set) this.attach(biome, set, true);
        else this.attach(biome, this.lowFallbacks[biome], false);
      }
      this.refreshQueue();
      this.pumpWorker();
      return;
    }
    for (const biome of desired) {
      let set = this.cache.get(biome);
      if (!set) {
        set = generateBiomeTextureSet(biome, {
          size: this.textureSize,
          anisotropy: this.anisotropy,
        });
        this.generated++;
      }
      this.cache.delete(biome);
      this.cache.set(biome, set);
      this.attach(biome, set, true);
    }
  }
  refreshQueue() {
    this.queue =
      this.workerDisabled || this.disposed
        ? []
        : this.active
            .filter(
              (biome) =>
                !this.cache.has(biome) && this.pending?.biome !== biome,
            )
            .slice(0, this.maximumResidentBiomes);
  }
  openWorker() {
    if (this.worker) return true;
    if (this.disposed || this.workerDisabled) return false;
    try {
      this.workerURL = URL.createObjectURL(
        new Blob([biomePBRWorkerSource()], { type: "text/javascript" }),
      );
      const epoch = ++this.workerEpoch;
      const worker = this.workerFactory
        ? this.workerFactory(this.workerURL)
        : new Worker(this.workerURL, { name: "hon-gioi-biome-pbr" });
      this.worker = worker;
      worker.onmessage = (event) => {
        if (
          this.disposed ||
          this.worker !== worker ||
          this.workerEpoch !== epoch
        )
          return;
        this.completeWorker(event.data);
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        if (this.worker === worker && this.workerEpoch === epoch)
          this.failWorker(event.message || "Biome texture worker failed");
      };
      worker.onmessageerror = () => {
        if (this.worker === worker && this.workerEpoch === epoch)
          this.failWorker("Biome texture transfer failed");
      };
      return true;
    } catch (error) {
      this.failWorker(error?.message ?? String(error));
      return false;
    }
  }
  pumpWorker() {
    if (
      this.pending ||
      this.disposed ||
      this.workerDisabled ||
      !this.queue.length
    )
      return;
    if(bakedTerrainProvider&&!this.providerFailed){
      const biome=this.queue.shift(),id=++this.requestId;this.pending={id,biome,size:this.textureSize};
      bakedTerrainProvider(biome,this.textureSize,this.anisotropy).then(set=>{
        if(this.disposed||this.pending?.id!==id||!this.active.includes(biome)){set.dispose();this.staleResults++;if(this.pending?.id===id)this.pending=null;}
        else{this.pending=null;this.cache.set(biome,set);this.generated++;this.attach(biome,set,true);}
        this.refreshQueue();this.pumpWorker();
      }).catch(()=>{if(this.pending?.id===id){this.pending=null;this.providerFailed=true;this.refreshQueue();this.pumpWorker();}});
      return;
    }
    if (!this.openWorker()) return;
    const biome = this.queue.shift(),
      id = ++this.requestId;
    this.pending = { id, biome, size: this.textureSize };
    this.workerTimer = setTimeout(() => {
      if (this.pending?.id === id)
        this.failWorker("Biome texture worker timed out");
    }, this.workerTimeoutMs);
    this.workerTimer.unref?.();
    try {
      this.worker.postMessage({
        id,
        biome,
        size: this.textureSize,
        spec: BIOME_SURFACES[biome],
      });
    } catch (error) {
      this.failWorker(error?.message ?? String(error));
    }
  }
  completeWorker(message) {
    const request = this.pending;
    if (!request || message?.id !== request.id) return;
    clearTimeout(this.workerTimer);
    this.workerTimer = null;
    this.pending = null;
    if (message.error) {
      this.failWorker(message.error);
      return;
    }
    if (!this.active.includes(request.biome)) {
      this.staleResults++;
      this.refreshQueue();
      this.pumpWorker();
      return;
    }
    try {
      if (message.biome !== request.biome || message.size !== request.size)
        throw Error("Unexpected biome texture response");
      const pixels = {};
      for (const key of ["albedo", "normal", "roughnessHeight", "emissive"]) {
        const buffer = message.buffers?.[key];
        if (!buffer || buffer.byteLength !== request.size * request.size * 4)
          throw Error("Invalid biome pixel transfer");
        pixels[key] = new Uint8Array(buffer);
        if (pixels[key].length !== request.size * request.size * 4)
          throw Error("Invalid biome pixel buffer");
      }
      const set = textureSetFromPixels(
        request.biome,
        request.size,
        BIOME_SURFACES[request.biome],
        pixels,
        this.anisotropy,
      );
      const old = this.cache.get(request.biome);
      if (old) {
        old.dispose();
        this.evicted++;
      }
      this.cache.set(request.biome, set);
      this.generated++;
      this.attach(request.biome, set, true);
      this.refreshQueue();
      this.pumpWorker();
    } catch (error) {
      this.failWorker(error?.message ?? String(error));
    }
  }
  stopWorker() {
    clearTimeout(this.workerTimer);
    this.workerTimer = null;
    this.pending = null;
    this.workerEpoch++;
    if (this.worker) {
      this.worker.onmessage =
        this.worker.onerror =
        this.worker.onmessageerror =
          null;
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerURL) {
      URL.revokeObjectURL(this.workerURL);
      this.workerURL = null;
    }
  }
  failWorker(message) {
    this.workerErrors++;
    this.workerError = String(message);
    this.workerDisabled = true;
    this.queue = [];
    this.stopWorker();
    // Actual low PBR maps remain bound; an error never schedules a blocking
    // 2048px main-thread bake or leaves an unresolved in-flight request.
  }
  update(player, biomeAt, visible = true) {
    if (this.disposed) return;
    if (!visible || !player) {
      if (
        this.active.length ||
        this.cache.size ||
        this.pending ||
        this.queue.length
      )
        this.activate([]);
      return;
    }
    const current = biomeAt(player.x, player.z),
      desired = [current];
    if (this.maximumResidentBiomes > 1) {
      const nearest = REGIONS.map((r, i) => ({
        i,
        distance: Math.hypot(r.x - player.x, r.z - player.z),
      }))
        .filter((r) => r.i !== current)
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance < 70) desired.push(nearest.i);
    }
    if (desired.join(":") !== this.active.join(":")) this.activate(desired);
  }
  stats() {
    const bytes = [...this.cache.values()].reduce(
      (sum, set) => sum + set.bytes,
      0,
    );
    const lowBytes = this.lowFallbacks.reduce((sum, set) => sum + set.bytes, 0);
    return {
      generated: this.generated,
      evicted: this.evicted,
      activeBiomes: [...this.active],
      residentBiomes: this.cache.size,
      maximumResidentBiomes: this.maximumResidentBiomes,
      residentMaps: this.cache.size * 4,
      bytesWithoutMipmaps: bytes,
      highBudgetBytes:
        this.maximumResidentBiomes * this.textureSize * this.textureSize * 16,
      lowFallbackBiomes: this.lowFallbacks.length,
      lowFallbackMaps: this.lowFallbacks.length * 4,
      lowFallbackBytes: lowBytes,
      lowFallbackResolution: this.fallbackSize,
      totalBytesWithoutMipmaps: bytes + lowBytes,
      asyncGeneration: this.asyncGeneration,
      pending: this.pending
        ? { biome: this.pending.biome, id: this.pending.id }
        : null,
      pendingJobs: this.pending ? 1 : 0,
      queuedBiomes: [...this.queue],
      staleResults: this.staleResults,
      workerErrors: this.workerErrors,
      workerError: this.workerError,
      gpuCompressedBiomes:[...this.cache.values()].filter(set=>set.gpuCompressed).length,
      textureSize: this.textureSize,
      anisotropy: this.anisotropy,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.activate([]);
    this.disposed = true;
    this.materials.forEach((m) => m.dispose());
    this.lowFallbacks.forEach((set) => set.dispose());
    this.fallback.dispose();
  }
}

let sanctuaryMaps,
  architecturalAnisotropy = 1;
const architectureCache = new Map();
export function configureEnvironmentAnisotropy(renderer) {
  architecturalAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
  const groups = [
    ...architectureCache.values(),
    ...(sanctuaryMaps ? [sanctuaryMaps] : []),
  ];
  for (const group of groups)
    for (const t of Object.values(group)) {
      t.anisotropy = architecturalAnisotropy;
      t.needsUpdate = true;
    }
  return architecturalAnisotropy;
}
export function installPrebakedEnvironmentMaps(sets){
 sanctuaryMaps=sets.marble;for(const style of ['roof','wood','gilt'])architectureCache.set(style,sets[style]);
}
export function architecturalMaps(
  style,
  { anisotropy = architecturalAnisotropy } = {},
) {
  if (!["roof", "wood", "gilt"].includes(style))
    throw Error("Unknown architectural finish");
  if (architectureCache.has(style)) return architectureCache.get(style);
  const size = 512,
    albedo = new Uint8Array(size * size * 4),
    packed = new Uint8Array(size * size * 4),
    normal = new Uint8Array(size * size * 4),
    height = new Float32Array(size * size);
  const colors = {
      roof: [31, 83, 75],
      wood: [91, 27, 24],
      gilt: [211, 171, 83],
    },
    base = colors[style];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        k = (y * size + x) * 4,
        n = noise(x, y, 23);
      const ridges =
        style === "roof"
          ? Math.pow(0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 16), 3)
          : style === "wood"
            ? 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 4 + Math.sin(u * 19) * 0.7)
            : 0.5 +
              0.5 *
                Math.sin((u + v) * Math.PI * 2 * 12) *
                Math.cos(v * Math.PI * 2 * 9);
      const overlap = style === "roof" && (v * 12) % 1 < 0.08 ? 0.55 : 1;
      const factor = (0.7 + ridges * 0.3 + n * 0.07) * overlap;
      height[y * size + x] = ridges * 0.6 + overlap * 0.2 + n * 0.025;
      for (let c = 0; c < 3; c++) albedo[k + c] = byte(base[c] * factor);
      albedo[k + 3] = 255;
      packed[k] = byte(height[y * size + x] * 255);
      packed[k + 1] = style === "gilt" ? 60 : style === "wood" ? 118 : 91;
      packed[k + 2] = 255;
      packed[k + 3] = 255;
    }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = (y * size + x) * 4,
        dx =
          (height[y * size + ((x + size - 1) % size)] -
            height[y * size + ((x + 1) % size)]) *
          2,
        dy =
          (height[((y + size - 1) % size) * size + x] -
            height[((y + 1) % size) * size + x]) *
          2,
        len = Math.hypot(dx, dy, 1);
      normal[k] = byte(((dx / len) * 0.5 + 0.5) * 255);
      normal[k + 1] = byte(((dy / len) * 0.5 + 0.5) * 255);
      normal[k + 2] = byte(((1 / len) * 0.5 + 0.5) * 255);
      normal[k + 3] = 255;
    }
  const maps = {
    albedo: texture(
      albedo,
      size,
      THREE.SRGBColorSpace,
      anisotropy,
      style === "roof" ? 2 : 1,
    ),
    roughnessHeight: texture(
      packed,
      size,
      THREE.NoColorSpace,
      anisotropy,
      style === "roof" ? 2 : 1,
    ),
    normal: texture(
      normal,
      size,
      THREE.NoColorSpace,
      anisotropy,
      style === "roof" ? 2 : 1,
    ),
  };
  architectureCache.set(style, maps);
  return maps;
}
/** One shared 1024 set for the sanctuary, not one set per column/portal. */
export function marbleCloudMaps({
  size = 1024,
  anisotropy = architecturalAnisotropy,
} = {}) {
  if (sanctuaryMaps) {
    for (const t of Object.values(sanctuaryMaps)) {
      t.anisotropy = anisotropy;
      t.needsUpdate = true;
    }
    return sanctuaryMaps;
  }
  const albedo = new Uint8Array(size * size * 4),
    packed = new Uint8Array(size * size * 4),
    normals = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2,
        v = (y / size) * Math.PI * 2,
        n = noise(x, y, 41),
        wave = Math.sin(
          u * 3 + Math.sin(v * 2) * 1.8 + Math.sin(u * 7 + v * 5) * 0.2,
        ),
        vein = Math.exp(-Math.abs(wave) * 22),
        cloud = 0.5 + 0.5 * Math.sin(u * 2 + v + Math.sin(v * 3));
      const k = (y * size + x) * 4;
      albedo.set(
        [
          byte(200 + cloud * 31 - vein * 62),
          byte(220 + cloud * 24 - vein * 43),
          byte(209 + cloud * 31 - vein * 49),
          255,
        ],
        k,
      );
      packed.set(
        [byte(150 - vein * 65 + n * 9), byte(40 + vein * 30), 255, 255],
        k,
      );
      normals.set(
        [
          byte(128 + Math.cos(u * 3 + Math.sin(v * 2)) * vein * 23),
          byte(128 + Math.sin(v * 2) * vein * 20),
          252,
          255,
        ],
        k,
      );
    }
  sanctuaryMaps = {
    albedo: texture(albedo, size, THREE.SRGBColorSpace, anisotropy, 1),
    roughnessHeight: texture(packed, size, THREE.NoColorSpace, anisotropy, 1),
    normal: texture(normals, size, THREE.NoColorSpace, anisotropy, 1),
  };
  return sanctuaryMaps;
}
