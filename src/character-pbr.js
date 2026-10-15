import * as THREE from "three";

export const BROCADE_PATTERNS = Object.freeze({
  CLOUD_CRANE: "CLOUD_CRANE",
  SPIRIT_VINE_LOTUS: "SPIRIT_VINE_LOTUS",
  MOUNTAIN_FLAME_SCALE: "MOUNTAIN_FLAME_SCALE",
  NIGHT_FOX_CRESCENT: "NIGHT_FOX_CRESCENT",
});
export const HERO_BROCADE_PATTERNS = Object.freeze([
  "SPIRIT_VINE_LOTUS",
  "MOUNTAIN_FLAME_SCALE",
  "NIGHT_FOX_CRESCENT",
  "CLOUD_CRANE",
  "CLOUD_CRANE",
  "MOUNTAIN_FLAME_SCALE",
  "SPIRIT_VINE_LOTUS",
  "NIGHT_FOX_CRESCENT",
  "NIGHT_FOX_CRESCENT",
  "MOUNTAIN_FLAME_SCALE",
  "CLOUD_CRANE",
  "NIGHT_FOX_CRESCENT",
]);
const DIMENSIONS = { high: 2048, medium: 256, low: 64 };
const channels = ["albedo", "normal", "roughness", "metalness", "emissive"];
const parse = (hex) => {
  const s =
    typeof hex === "number"
      ? hex
      : Number.parseInt(String(hex).replace("#", ""), 16);
  return [(s >> 16) & 255, (s >> 8) & 255, s & 255];
};
const css = (rgb) => `rgb(${rgb.map((n) => Math.round(n)).join(",")})`;
const colorKey = (hex) =>
  parse(hex)
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
const mix = (a, b, t) => a + (b - a) * t;
const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)));
function canvas(size) {
  if (typeof document === "undefined" || !document.createElement) return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}
function path(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.stroke();
}
function leaf(ctx, x, y, a, length = 80) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    -length * 0.45,
    -length * 0.2,
    -length * 0.3,
    -length * 0.75,
    0,
    -length,
  );
  ctx.bezierCurveTo(
    length * 0.3,
    -length * 0.75,
    length * 0.45,
    -length * 0.2,
    0,
    0,
  );
  ctx.stroke();
  ctx.restore();
}
function lotus(ctx, x, y) {
  for (let p = 0; p < 8; p++) leaf(ctx, x, y, (p * Math.PI) / 4, 105);
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, Math.PI * 2);
  ctx.stroke();
}
function cloud(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 130, y);
  ctx.bezierCurveTo(x - 165, y - 65, x - 70, y - 92, x - 47, y - 47);
  ctx.bezierCurveTo(x - 10, y - 145, x + 105, y - 120, x + 105, y - 43);
  ctx.bezierCurveTo(x + 190, y - 78, x + 200, y + 35, x + 110, y + 24);
  ctx.bezierCurveTo(x + 40, y + 70, x - 55, y + 40, x - 130, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 65, y + 5);
  ctx.bezierCurveTo(x - 15, y - 35, x + 35, y - 20, x + 16, y + 5);
  ctx.stroke();
}
function motifMask(size, pattern) {
  const c = canvas(size),
    data = new Uint8Array(size * size);
  if (c) {
    const g = c.getContext("2d");
    g.scale(size / 2048, size / 2048);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 2048, 2048);
    g.strokeStyle = "#fff";
    g.fillStyle = "#fff";
    g.lineWidth = 5;
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const x of [48, 80, 1968, 2000])
      path(g, [
        [x, 0],
        [x, 2048],
      ]);
    for (let y = 64; y < 2048; y += 128)
      for (const x of [64, 1984]) {
        g.beginPath();
        g.moveTo(x, y - 18);
        g.lineTo(x + 12, y);
        g.lineTo(x, y + 18);
        g.lineTo(x - 12, y);
        g.closePath();
        g.stroke();
      }
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 2; col++) {
        const x = 512 + col * 1024,
          y = 260 + row * 480;
        g.save();
        g.translate(x, y);
        if ((row + col) % 2) g.scale(-1, 1);
        if (pattern === "CLOUD_CRANE") {
          cloud(g, -30, 30);
          g.beginPath();
          g.moveTo(-40, -50);
          g.bezierCurveTo(12, -95, 32, -182, 82, -163);
          g.bezierCurveTo(113, -143, 72, -124, 60, -148);
          g.stroke();
          path(g, [
            [91, -160],
            [130, -169],
            [97, -151],
          ]);
          for (const side of [-1, 1])
            for (let p = 0; p < 5; p++) {
              g.beginPath();
              g.moveTo(-25, -48);
              g.bezierCurveTo(
                side * (100 + p * 14),
                -152 + p * 5,
                side * (165 + p * 10),
                -50 + p * 20,
                side * 80,
                8 + p * 7,
              );
              g.stroke();
            }
        } else if (pattern === "SPIRIT_VINE_LOTUS") {
          g.beginPath();
          g.moveTo(0, 200);
          g.bezierCurveTo(-160, 80, 140, -50, 0, -210);
          g.stroke();
          for (let p = 0; p < 6; p++)
            leaf(
              g,
              Math.sin(p * 1.4) * 45,
              150 - p * 55,
              p % 2 ? 0.9 : -0.9,
              65,
            );
          lotus(g, 0, 70);
        } else if (pattern === "MOUNTAIN_FLAME_SCALE") {
          for (let p = 0; p < 3; p++)
            path(g, [
              [-180 + p * 100, 90],
              [-90 + p * 90, -90 - p * 25],
              [45 + p * 90, 90],
            ]);
          for (let a = 0; a < 3; a++)
            for (let b = 0; b < 4; b++) {
              g.beginPath();
              g.arc(-130 + b * 85 + (a % 2) * 35, 100 + a * 45, 42, 0, Math.PI);
              g.stroke();
            }
          g.beginPath();
          g.moveTo(10, 55);
          g.bezierCurveTo(-55, -30, 47, -85, 30, -180);
          g.bezierCurveTo(150, -85, 46, -12, 95, 45);
          g.stroke();
        } else {
          g.beginPath();
          g.arc(-60, -45, 125, -1.25, 1.25);
          g.bezierCurveTo(-16, 35, -18, -110, -20, -163);
          g.stroke();
          g.beginPath();
          g.moveTo(-90, 145);
          g.quadraticCurveTo(-136, 62, -95, -15);
          g.lineTo(-30, 58);
          g.quadraticCurveTo(0, 36, 30, 58);
          g.lineTo(95, -15);
          g.quadraticCurveTo(136, 62, 90, 145);
          g.quadraticCurveTo(0, 220, -90, 145);
          g.stroke();
          path(g, [
            [-50, 108],
            [-12, 124],
            [0, 160],
            [12, 124],
            [50, 108],
          ]);
          for (let p = 0; p < 3; p++) {
            g.beginPath();
            g.moveTo(70, 166);
            g.bezierCurveTo(230, 80 + p * 45, 80, -130, 180, -180 + p * 40);
            g.stroke();
          }
        }
        for (let p = 0; p < 9; p++) {
          const a = p * 2.4,
            r = 160 + (p % 3) * 20,
            xx = Math.cos(a) * r,
            yy = Math.sin(a) * r;
          g.beginPath();
          g.moveTo(xx - 4, yy);
          g.lineTo(xx, yy - 8);
          g.lineTo(xx + 4, yy);
          g.lineTo(xx, yy + 8);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
    const image = g.getImageData(0, 0, size, size).data;
    for (let i = 0; i < data.length; i++) data[i] = image[i * 4];
    return data;
  }
  const kind = Object.values(BROCADE_PATTERNS).indexOf(pattern),
    tile = 256,
    base = new Uint8Array(tile * tile);
  for (let y = 0; y < tile; y++)
    for (let x = 0; x < tile; x++) {
      const u = x / tile,
        v = y / tile,
        xx = ((u * 2) % 1) - 0.5,
        yy = ((v * 4) % 1) - 0.5;
      let d;
      if (kind === 0)
        d = Math.min(
          Math.abs(Math.hypot(xx, yy * 0.8) - 0.26),
          Math.abs(yy - 0.12 * Math.sin(xx * 12)),
        );
      else if (kind === 1)
        d = Math.min(
          Math.abs(xx - 0.18 * Math.sin(yy * 12)),
          Math.abs(
            Math.hypot(xx, yy) -
              (0.17 + 0.055 * Math.cos(Math.atan2(yy, xx) * 8)),
          ),
        );
      else if (kind === 2)
        d = Math.min(
          Math.abs(yy + 0.2 - Math.abs(xx) * 0.8),
          Math.abs(Math.hypot((xx + 0.2) % 0.2, yy % 0.2) - 0.15),
        );
      else
        d = Math.min(
          Math.abs(Math.hypot(xx + 0.09, yy + 0.12) - 0.22),
          Math.abs(yy - 0.2 + Math.abs(xx) * 0.8),
        );
      base[y * tile + x] =
        u < 0.04 || u > 0.96 || d < 0.012 ? 255 : d < 0.02 ? 110 : 0;
    }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      data[y * size + x] =
        base[
          Math.floor((y / size) * tile) * tile + Math.floor((x / size) * tile)
        ];
  return data;
}
function drawImages(size, spec) {
  const mask = motifMask(size, spec.pattern),
    arrays = Object.fromEntries(
      channels.map((k) => [k, new Uint8Array(size * size * 4)]),
    ),
    primary = parse(spec.primary),
    secondary = parse(spec.secondary),
    gold = parse(spec.gold),
    weaveX = new Float32Array(size),
    weaveY = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    weaveX[i] = Math.sin(i * Math.PI * 0.5);
    weaveY[i] = Math.sin(i * Math.PI * 0.5 + 0.5);
  }
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1),
      ombre = Math.pow(t, 0.85);
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        k = i * 4,
        m = mask[i] / 255,
        weave = weaveX[x] * weaveY[y],
        light = 1 + weave * 0.025;
      for (let ch = 0; ch < 3; ch++) {
        arrays.albedo[k + ch] = clampByte(
          mix(mix(primary[ch], secondary[ch], ombre) * light, gold[ch], m),
        );
        arrays.emissive[k + ch] = clampByte(gold[ch] * m * 0.25);
      }
      const dx =
        ((mask[y * size + Math.min(size - 1, x + 1)] -
          mask[y * size + Math.max(0, x - 1)]) /
          255) *
          0.8 +
        (weaveX[Math.min(size - 1, x + 1)] - weaveX[Math.max(0, x - 1)]) *
          weaveY[y] *
          0.045;
      const dy =
        ((mask[Math.min(size - 1, y + 1) * size + x] -
          mask[Math.max(0, y - 1) * size + x]) /
          255) *
          0.8 +
        (weaveY[Math.min(size - 1, y + 1)] - weaveY[Math.max(0, y - 1)]) *
          weaveX[x] *
          0.045;
      const nx = -dx,
        ny = dy,
        nz = 1,
        l = Math.hypot(nx, ny, nz);
      arrays.normal.set(
        [
          clampByte(128 + (nx / l) * 127),
          clampByte(128 + (ny / l) * 127),
          clampByte(128 + (nz / l) * 127),
          255,
        ],
        k,
      );
      const rough = clampByte(mix(168 + weave * 7, 64, m)),
        metal = clampByte(mix(5, 242, m));
      arrays.roughness.set([rough, rough, rough, 255], k);
      arrays.metalness.set([metal, metal, metal, 255], k);
      arrays.albedo[k + 3] = arrays.emissive[k + 3] = 255;
    }
  }
  return Object.fromEntries(
    channels.map((name) => {
      const c = canvas(size);
      if (c) {
        const ctx = c.getContext("2d"),
          pixels = ctx.createImageData(size, size);
        pixels.data.set(arrays[name]);
        ctx.putImageData(pixels, 0, 0);
        return [name, { image: c, isCanvas: true }];
      }
      return [
        name,
        {
          image: { data: arrays[name], width: size, height: size },
          isCanvas: false,
        },
      ];
    }),
  );
}
function texture(image, name, key, size) {
  const t = image.isCanvas
    ? new THREE.CanvasTexture(image.image)
    : new THREE.DataTexture(image.image.data, size, size, THREE.RGBAFormat);
  t.colorSpace =
    name === "albedo" || name === "emissive"
      ? THREE.SRGBColorSpace
      : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.flipY = true;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  t.userData = {
    sharedArt: true,
    generatedCharacterPBR: true,
    pbrKey: key,
    channel: name,
    pbrResolution: size,
    renderer: image.isCanvas ? "canvas2d" : "node-raster",
  };
  return t;
}
export class ProceduralCharacterPBRGenerator {
  static generateSilkBrocadeTexture(...args) {
    return characterPBR.generateSilkBrocadeTexture(...args);
  }
  constructor({ highLimit = 1, mediumLimit = 6, lowLimit = 12 } = {}) {
    this.limits = { high: highLimit, medium: mediumLimit, low: lowLimit };
    this.caches = { high: new Map(), medium: new Map(), low: new Map() };
    this.registry = new Map();
    this.entriesByTexture = new WeakMap();
    this.hairCache = new Map();
    this.jadeCache = new Map();
    this.engravedMaterials = new Map();
    this.engravedGeometry = new WeakMap();
  }
  generateSilkBrocadeTexture(
    primaryHex,
    secondaryHex,
    goldAccentHex,
    patternType,
    { detail = "high" } = {},
  ) {
    if (!Object.values(BROCADE_PATTERNS).includes(patternType))
      throw Error("Unknown brocade motif");
    if (!DIMENSIONS[detail]) throw Error("Unknown character PBR tier");
    const spec = {
      primary: colorKey(primaryHex),
      secondary: colorKey(secondaryHex),
      gold: colorKey(goldAccentHex),
      pattern: patternType,
    };
    const key = JSON.stringify({ ...spec, requestedTier: detail });
    let entry = this.registry.get(key);
    if (!entry) {
      this.#evictFor(detail);
      const images = drawImages(DIMENSIONS[detail], spec),
        maps = Object.fromEntries(
          channels.map((name) => [
            name,
            texture(images[name], name, key, DIMENSIONS[detail]),
          ]),
        );
      entry = {
        key,
        spec,
        maps,
        size: DIMENSIONS[detail],
        tier: detail,
        requestedTier: detail,
      };
      for (const tex of Object.values(maps))
        this.entriesByTexture.set(tex, entry);
      this.registry.set(key, entry);
      while (this.registry.size > 64)
        this.registry.delete(this.registry.keys().next().value);
    }
    this.#activate(entry, detail);
    return this.#public(entry);
  }
  #public(entry) {
    return {
      ...entry.maps,
      map: entry.maps.albedo,
      albedoMap: entry.maps.albedo,
      normalMap: entry.maps.normal,
      roughnessMap: entry.maps.roughness,
      metalnessMap: entry.maps.metalness,
      emissiveMap: entry.maps.emissive,
      get size() {
        return entry.size;
      },
      patternType: entry.spec.pattern,
    };
  }
  #resize(entry, size) {
    if (entry.size === size) return;
    const images = drawImages(size, entry.spec);
    for (const name of channels) {
      const t = entry.maps[name];
      t.dispose();
      t.image = images[name].image;
      t.userData.pbrResolution = size;
      t.needsUpdate = true;
    }
    entry.size = size;
  }
  #evictFor(tier) {
    const cache = this.caches[tier];
    while (cache.size >= this.limits[tier]) {
      const [key, entry] = cache.entries().next().value;
      cache.delete(key);
      this.#resize(entry, 64);
      entry.tier = "retired";
    }
  }
  #activate(entry, detail) {
    if (this.caches[detail].get(entry.key) === entry) {
      this.caches[detail].delete(entry.key);
      this.caches[detail].set(entry.key, entry);
      return;
    }
    for (const cache of Object.values(this.caches)) cache.delete(entry.key);
    this.#evictFor(detail);
    this.#resize(entry, DIMENSIONS[detail]);
    entry.tier = detail;
    this.caches[detail].set(entry.key, entry);
  }
  prepare(root, detail = "high") {
    const seen = new Set();
    root.traverse((o) => {
      if (!o.isMesh) return;
      const anchor = [o.material.map, o.material.normalMap].find(
        (t) => t?.userData.generatedCharacterPBR,
      );
      const entry = anchor && this.entriesByTexture.get(anchor);
      if (entry && entry.requestedTier === detail && !seen.has(entry)) {
        seen.add(entry);
        this.#activate(entry, detail);
      }
    });
  }
  engravedMaterial(base, atlas, role = "metal") {
    if (!["metal", "wood", "stone"].includes(role)) return base;
    if (
      !atlas?.normalMap?.userData.generatedCharacterPBR ||
      !atlas.roughnessMap
    )
      throw new Error("Engraving requires the character's shared PBR atlas");
    if (base.userData.characterEngraving && base.normalMap === atlas.normalMap)
      return base;
    const key = `${base.uuid}:${atlas.normalMap.uuid}:${role}`;
    if (this.engravedMaterials.has(key)) return this.engravedMaterials.get(key);
    const m = base.clone();
    m.normalMap = atlas.normalMap;
    m.roughnessMap = atlas.roughnessMap;
    m.normalScale.setScalar(
      role === "metal" ? 0.3 : role === "stone" ? 0.36 : 0.2,
    );
    if (role === "metal") {
      m.metalness = Math.max(0.9, base.metalness);
      m.roughness = Math.min(0.4, base.roughness);
      m.emissiveMap = atlas.emissiveMap;
      m.emissive.setHex(0xffffff);
      m.emissiveIntensity = 0.06;
    }
    m.userData = {
      ...base.userData,
      sharedArt: true,
      characterEngraving: true,
      engravingRole: role,
    };
    this.engravedMaterials.set(key, m);
    while (this.engravedMaterials.size > 128)
      this.engravedMaterials.delete(this.engravedMaterials.keys().next().value);
    return m;
  }
  applyEngraving(root, atlas) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const role = o.material.userData.weaponRole;
      if (["metal", "wood", "stone"].includes(role)) {
        o.material = this.engravedMaterial(o.material, atlas, role);
        o.geometry = this.engravingGeometry(o.geometry);
      }
    });
    return root;
  }
  engravingGeometry(geometry) {
    const uv = geometry.attributes.uv;
    if (!uv) return geometry;
    if (this.engravedGeometry.has(geometry))
      return this.engravedGeometry.get(geometry);
    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i));
      maxU = Math.max(maxU, uv.getX(i));
      minV = Math.min(minV, uv.getY(i));
      maxV = Math.max(maxV, uv.getY(i));
    }
    if (minU >= 0 && maxU <= 1 && minV >= 0 && maxV <= 1) return geometry;
    const copy = geometry.clone(),
      target = copy.attributes.uv;
    for (let i = 0; i < target.count; i++)
      target.setXY(
        i,
        (uv.getX(i) - minU) / Math.max(1e-6, maxU - minU),
        (uv.getY(i) - minV) / Math.max(1e-6, maxV - minV),
      );
    target.needsUpdate = true;
    copy.userData.normalizedEngravingUV = true;
    copy.userData.sharedArt = true;
    this.engravedGeometry.set(geometry, copy);
    return copy;
  }
  createSilkMaterial(
    hero,
    detail,
    { primary, secondary, gold, skin = 0 } = {},
  ) {
    const maps = this.generateSilkBrocadeTexture(
      primary,
      secondary,
      gold,
      HERO_BROCADE_PATTERNS[hero],
      { detail },
    );
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      metalnessMap: maps.metalnessMap,
      emissiveMap: maps.emissiveMap,
      emissive: 0xffffff,
      emissiveIntensity: 0.16,
      roughness: 1,
      metalness: 1,
      sheen: 0.85,
      sheenRoughness: 0.25,
      sheenColor: new THREE.Color(secondary),
      clearcoat: 0.12,
      iridescence: skin === 2 ? 0.4 : 0,
      side: THREE.DoubleSide,
    });
    m.normalScale.set(0.34, 0.34);
    m.userData = {
      sharedArt: true,
      characterPBR: true,
      hero,
      patternType: HERO_BROCADE_PATTERNS[hero],
    };
    return m;
  }
  hairMaterial(color, detail = "high") {
    const size = detail === "high" ? 512 : detail === "medium" ? 128 : 64,
      key = `${color}:${size}`;
    if (this.hairCache.has(key)) return this.hairCache.get(key);
    const n = new Uint8Array(size * size * 4),
      h = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const k = (y * size + x) * 4,
          w = Math.sin(x * Math.PI * 0.5 + Math.sin(y * 0.08) * 0.3);
        n.set([128 + w * 13, 128, 253, 255], k);
        const v = clampByte(128 + w * 36);
        h.set([v, v, v, 255], k);
      }
    const asTexture = (a) => {
      const c = canvas(size);
      if (c) {
        const g = c.getContext("2d"),
          d = g.createImageData(size, size);
        d.data.set(a);
        g.putImageData(d, 0, 0);
        return new THREE.CanvasTexture(c);
      }
      const t = new THREE.DataTexture(a, size, size);
      t.needsUpdate = true;
      return t;
    };
    const m = new THREE.MeshPhysicalMaterial({
      color,
      normalMap: asTexture(n),
      bumpMap: asTexture(h),
      bumpScale: 0.0015,
      roughness: 0.35,
      anisotropy: 0.78,
      anisotropyRotation: Math.PI / 2,
      clearcoat: 0.38,
      sheen: 0.7,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color(color),
    });
    m.normalScale.set(0.22, 0.22);
    m.userData = { sharedArt: true, hairPBR: true };
    this.hairCache.set(key, m);
    while (this.hairCache.size > 24)
      this.hairCache.delete(this.hairCache.keys().next().value);
    return m;
  }
  jadeMaterial(color) {
    if (this.jadeCache.has(color)) return this.jadeCache.get(color);
    const m = new THREE.MeshPhysicalMaterial({
      color,
      transmission: 0.8,
      ior: 1.6,
      thickness: 0.018,
      roughness: 0.16,
      clearcoat: 0.85,
      emissive: color,
      emissiveIntensity: 0.6,
    });
    m.userData = { sharedArt: true, jadePBR: true };
    this.jadeCache.set(color, m);
    return m;
  }
  stats() {
    return {
      limits: { ...this.limits },
      sets: Object.fromEntries(
        Object.entries(this.caches).map(([k, v]) => [k, v.size]),
      ),
      allocatedCachedBytes: Object.values(this.caches).reduce(
        (sum, cache) =>
          sum +
          [...cache.values()].reduce((s, e) => s + e.size * e.size * 4 * 5, 0),
        0,
      ),
      registry: this.registry.size,
      hairMaterials: this.hairCache.size,
      engravedMaterials: this.engravedMaterials.size,
    };
  }
}
export const characterPBR = new ProceduralCharacterPBRGenerator();
