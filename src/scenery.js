import * as THREE from "three";
import { REGIONS, GATE_POS, SHRINES } from "./data.js";
import { MAP_BUSHES, NAV_OBSTACLES } from "./systems.js";
import { terrainHeight, groundHeight, treeTrunkGeometry } from "./art.js";

const TAU = Math.PI * 2;
let sharedSigilTexture;
const material = (color, options = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
    ...options,
  });
const glow = (color, strength = 1) =>
  material(color, {
    emissive: color,
    emissiveIntensity: strength,
    roughness: 0.25,
    metalness: 0.35,
  });
function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ring(parent, radius, width, mat, y = 0.04, segments = 96) {
  const m = mesh(
    parent,
    new THREE.RingGeometry(radius - width, radius, segments),
    mat,
    0,
    y,
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
function curve(parent, points, radius, mat, tubular = 32) {
  return mesh(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      tubular,
      radius,
      8,
      false,
    ),
    mat,
  );
}
function seeded(initial = 7169) {
  let seed = initial;
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}
export function biomeAt(x, z) {
  if (Math.hypot(x - 82, z) < 18) return 6;
  let best = 5,
    distance = Infinity;
  for (let i = 0; i < 6; i++) {
    const d = (x - REGIONS[i].x) ** 2 + (z - REGIONS[i].z) ** 2;
    if (d < distance) {
      best = i;
      distance = d;
    }
  }
  return best;
}
export function sceneryTerrainHeight(x, z) {
  const edge = THREE.MathUtils.smoothstep(
    Math.max(Math.abs(x), Math.abs(z)),
    95,
    180,
  );
  return (
    terrainHeight(x, z) +
    edge * (5 + Math.abs(Math.sin(x * 0.027) * Math.cos(z * 0.021)) * 28)
  );
}
export function generateTerrainSplatmap(size = 2048) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    data = ctx.createImageData(size, size);
  const palette = [
    [42, 88, 53],
    [131, 119, 86],
    [57, 45, 76],
    [203, 225, 233],
    [60, 38, 33],
    [100, 111, 108],
    [87, 50, 126],
  ];
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * 600 - 300,
        z = (py / (size - 1)) * 600 - 300;
      const biome = biomeAt(x, z),
        base = palette[biome];
      let noise = (Math.imul(px, 374761393) + Math.imul(py, 668265263)) | 0;
      noise = Math.imul(noise ^ (noise >>> 13), 1274126177);
      const grain = (noise >>> 0) / 4294967296 - 0.5;
      const broad = Math.sin(x * 0.52) * Math.cos(z * 0.43);
      const fissure =
        Math.abs(Math.sin(x * 0.54 + Math.sin(z * 0.65)) * Math.cos(z * 0.37)) <
        0.04;
      const t = 0.87 + grain * 0.1 + broad * 0.09,
        i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++)
        data.data[i + c] = Math.max(
          0,
          Math.min(
            255,
            base[c] * t + (biome === 4 && fissure ? [88, 20, 0][c] : 0),
          ),
        );
      // Interlocking ancient scales remain organic; no uniform square grid.
      if (
        biome === 5 &&
        Math.abs(Math.sin(x * 1.9 + Math.sin(z * 2.4))) < 0.045
      )
        for (let c = 0; c < 3; c++) data.data[i + c] *= 0.73;
      data.data[i + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData = {
    purpose: "seven-biome-splatmap",
    resolution: size,
    gameplayBounds: 94,
    renderExtent: 600,
  };
  return texture;
}
function sigilTexture() {
  if (sharedSigilTexture) return sharedSigilTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext("2d"),
    center = 512;
  c.translate(center, center);
  c.strokeStyle = "#bdedc9";
  c.lineWidth = 2;
  for (const r of [245, 305, 365, 405, 456, 485]) {
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.stroke();
  }
  for (let i = 0; i < 64; i++) {
    c.save();
    c.rotate((i * TAU) / 64);
    c.beginPath();
    c.moveTo(410, -4);
    c.lineTo(440, 0);
    c.lineTo(427, 10);
    c.stroke();
    c.restore();
  }
  c.strokeStyle = "#e9c876";
  c.lineWidth = 7;
  for (let i = 0; i < 8; i++) {
    c.save();
    c.rotate((i * TAU) / 8);
    for (let j = 0; j < 3; j++) {
      const r = 272 + j * 26;
      c.beginPath();
      c.moveTo(r, -47);
      c.lineTo(r, (i >> j) & 1 ? -8 : 47);
      c.stroke();
      if ((i >> j) & 1) {
        c.beginPath();
        c.moveTo(r, 8);
        c.lineTo(r, 47);
        c.stroke();
      }
    }
    c.restore();
  }
  c.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    c.save();
    c.rotate((i * TAU) / 12);
    c.beginPath();
    c.moveTo(135, 0);
    c.lineTo(215, 40);
    c.lineTo(145, 112);
    c.stroke();
    c.restore();
  }
  c.beginPath();
  c.arc(0, 0, 115, 0, TAU);
  c.stroke();
  c.beginPath();
  c.arc(0, -57, 57, Math.PI / 2, Math.PI * 1.5);
  c.arc(0, 57, 57, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.sharedScenery = true;
  sharedSigilTexture = texture;
  return sharedSigilTexture;
}
function cloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d"),
    gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(225,243,251,.82)");
  gradient.addColorStop(0.4, "rgba(211,233,246,.5)");
  gradient.addColorStop(1, "rgba(193,220,239,0)");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
function instanced(parent, geometry, mat, entries) {
  const m = new THREE.InstancedMesh(geometry, mat, entries.length),
    dummy = new THREE.Object3D();
  entries.forEach((e, i) => {
    dummy.position.set(e.x, e.y, e.z);
    dummy.rotation.set(e.rx || 0, e.ry || 0, e.rz || 0);
    dummy.scale.set(e.sx || 1, e.sy || 1, e.sz || 1);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  m.instanceMatrix.needsUpdate = true;
  parent.add(m);
  return m;
}
function bladeGeometry() {
  const positions = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7,
      w = 0.085 * (1 - t),
      lean = t * t * 0.25;
    positions.push(-w + lean, t * 1.05, 0, w + lean, t * 1.05, 0);
    uv.push(0, t, 1, t);
    if (i < 7) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function liquidMaterial(color, type, time) {
  const result = new THREE.ShaderMaterial({
    uniforms: {
      uTime: time,
      uColor: { value: new THREE.Color(color) },
      uType: { value: type },
      uMoonDirection: {
        value: new THREE.Vector3(-0.35, 0.64, -0.68).normalize(),
      },
      uReflectionStrength: { value: type === 0 ? 1 : 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float ax = p.x * 1.4 + uTime * 1.4;
        float az = p.z * 1.7 - uTime * .8;
        p.y += sin(ax) * cos(az) * .045;
        float derivativeX = 1.4 * cos(ax) * cos(az) * .045;
        float derivativeZ = -1.7 * sin(ax) * sin(az) * .045;
        vec3 baseNormal = normal.y < 0. ? -normal : normal;
        vec3 waveNormal = normalize(baseNormal + vec3(-derivativeX, 0., -derivativeZ));
        vWorldNormal = normalize(mat3(modelMatrix) * waveNormal);
        vec4 world = modelMatrix * vec4(p, 1.);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uType;
      uniform vec3 uMoonDirection;
      uniform float uReflectionStrength;
      varying vec3 vWorld;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      vec3 proceduralSky(vec3 ray) {
        float altitude = clamp(ray.y, 0., 1.);
        vec3 horizon = vec3(.23, .29, .40);
        vec3 zenith = vec3(.018, .035, .09);
        vec3 sky = mix(horizon, zenith, pow(altitude, .55));
        float moonDot = max(0., dot(ray, normalize(uMoonDirection)));
        float moonDisk = smoothstep(cos(.028), cos(.018), moonDot);
        float moonHalo = pow(moonDot, 120.);
        return sky + vec3(.84, .91, 1.) * (moonDisk * 4. + moonHalo * .18);
      }
      void main() {
        float wave = sin(vWorld.x * 2. + uTime) * sin(vWorld.z * 1.8 - uTime * .7);
        float rim = pow(abs(sin(vUv.x * 3.14159)), .4);
        vec3 color;
        float alpha;
        if (uType < .5) {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorld);
          float incidence = clamp(dot(N, V), 0., 1.);
          float fresnel = .035 + .965 * pow(1. - incidence, 5.);
          vec3 reflectedRay = normalize(reflect(-V, N));
          vec3 skyReflection = proceduralSky(reflectedRay);
          float reflectedFraction = clamp((.12 + fresnel * .82) * uReflectionStrength, 0., .98);
          color = mix(uColor * (.9 + wave * .06), skyReflection, reflectedFraction);
          alpha = .68 + .28 * rim;
        } else {
          color = uColor * (.9 + wave * .06) + vec3(.38, .07, .003) * pow(max(0., wave), 4.);
          alpha = .96;
        }
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  result.userData.liquidReflection = {
    analyticWaveNormals: true,
    viewDependentSky: type === 0,
    fresnel: type === 0,
    proceduralMoon: type === 0,
    sceneObjects: false,
    SSR: false,
  };
  return result;
}
function ribbonSurface(parent, x, z, width, length, mat, offset = 0.08) {
  const g = new THREE.PlaneGeometry(width, length, 24, 100),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const zz = p.getY(i) + z,
      xx = p.getX(i) + x + Math.sin(zz * 0.13) * 2;
    p.setXYZ(i, xx, terrainHeight(xx, zz) + offset, zz);
  }
  g.computeVertexNormals();
  return mesh(parent, g, mat);
}
function lantern(parent, x, y, z, gold) {
  const amber = glow(0xffbd52, 1.7);
  mesh(parent, new THREE.CylinderGeometry(0.14, 0.14, 0.32, 8), amber, x, y, z);
  mesh(
    parent,
    new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8),
    gold,
    x,
    y + 0.18,
    z,
  );
  mesh(
    parent,
    new THREE.CylinderGeometry(0.18, 0.18, 0.04, 8),
    gold,
    x,
    y - 0.18,
    z,
  );
}
export function createPortal() {
  const group = new THREE.Group(),
    stone = material(0x586963),
    gold = material(0xc6a36b, { metalness: 0.75, roughness: 0.3 }),
    energy = glow(0x5fffcf, 1.5);
  group.name = "seven-meter-extraction-portal";
  mesh(group, new THREE.CylinderGeometry(3.5, 3.7, 0.28, 8), stone, 0, 0.12);
  ring(group, 3.3, 0.07, gold, 0.28);
  const sigil = mesh(
    group,
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({
      map: sigilTexture(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      color: 0x8ffff0,
    }),
    0,
    0.29,
  );
  sigil.rotation.x = -Math.PI / 2;
  const crystals = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + Math.PI / 4,
      crystal = mesh(
        group,
        new THREE.OctahedronGeometry(0.42),
        energy,
        Math.cos(a) * 2.7,
        2.2,
        Math.sin(a) * 2.7,
      );
    crystal.scale.y = 3;
    crystal.rotation.z = Math.cos(a) * 0.2;
    crystal.rotation.x = Math.sin(a) * 0.2;
    crystals.push(crystal);
    mesh(
      group,
      new THREE.CylinderGeometry(0.42, 0.6, 0.45, 6),
      gold,
      Math.cos(a) * 2.7,
      0.45,
      Math.sin(a) * 2.7,
    );
  }
  const halo = mesh(
    group,
    new THREE.TorusGeometry(1.7, 0.07, 8, 72),
    energy,
    0,
    2.15,
  );
  const swirl = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x5fffd4) },
      uOpacity: { value: 0.5 },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform float uOpacity;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float spiral=pow(.5+.5*sin(a*5.+r*18.-uTime*2.),3.);float edge=1.-smoothstep(.7,1.,r);gl_FragColor=vec4(uColor*(.5+spiral),edge*uOpacity*(.35+spiral*.6));}`,
  });
  const core = mesh(group, new THREE.CircleGeometry(1.62, 64), swirl, 0, 2.15);
  const beam = mesh(
    group,
    new THREE.CylinderGeometry(0.3, 1.2, 15, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x60ffcb,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    0,
    7.5,
  );
  group.userData.portal = {
    energy,
    sigil,
    crystals,
    halo,
    core,
    beam,
    state: "closed",
  };
  return group;
}
export function updatePortal(group, state, time) {
  const p = group.userData.portal;
  if (!p) return;
  const color =
    state === "open" ? 0x63ffd5 : state === "warning" ? 0xffc45c : 0x647b7a;
  p.energy.color.setHex(color);
  p.energy.emissive.setHex(color);
  p.energy.emissiveIntensity =
    state === "open"
      ? 1.7
      : state === "warning"
        ? 0.8 + Math.sin(time * 4) * 0.5
        : 0.1;
  p.core.material.uniforms.uTime.value = time;
  p.core.material.uniforms.uColor.value.setHex(color);
  p.core.material.uniforms.uOpacity.value =
    state === "closed" ? 0.12 : state === "warning" ? 0.35 : 0.8;
  p.sigil.material.color.setHex(color);
  p.sigil.rotation.z = time * 0.12;
  p.crystals.forEach((m, i) => {
    m.position.y = 2.2 + Math.sin(time * 1.6 + i) * 0.12;
  });
  p.beam.visible = state === "open";
  p.state = state;
}
function createShop() {
  const g = new THREE.Group(),
    wood = material(0x553f30),
    gold = material(0xd0a962, { metalness: 0.7, roughness: 0.28 }),
    jade = material(0x205b54, { clearcoat: 0.8, roughness: 0.25 });
  g.name = "eight-corner-alchemy-pavilion";
  mesh(
    g,
    new THREE.CylinderGeometry(2.5, 2.7, 0.28, 8),
    material(0x89998d),
    0,
    0.14,
  );
  const roofPoints = [
    new THREE.Vector2(0.05, 4.4),
    new THREE.Vector2(0.45, 4.15),
    new THREE.Vector2(0.8, 3.7),
    new THREE.Vector2(1.5, 3.35),
    new THREE.Vector2(2.4, 3.1),
    new THREE.Vector2(2.7, 3.34),
  ];
  mesh(
    g,
    new THREE.LatheGeometry(roofPoints, 8),
    material(0x205b54, {
      clearcoat: 0.8,
      roughness: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8,
      x = Math.cos(a) * 2.25,
      z = Math.sin(a) * 2.25;
    mesh(g, new THREE.CylinderGeometry(0.09, 0.12, 2.9, 12), wood, x, 1.7, z);
    curve(
      g,
      [
        [0, 4.4, 0],
        [x * 0.55, 3.7, z * 0.55],
        [x, 3.2, z],
        [x * 1.18, 3.4, z * 1.18],
      ],
      0.035,
      gold,
      16,
    );
    lantern(g, x, 2.85, z, gold);
  }
  mesh(g, new THREE.CylinderGeometry(0.85, 0.6, 1.15, 12), jade, 0, 0.9);
  ring(g, 0.8, 0.05, glow(0x9ceacb), 1.5);
  mesh(g, new THREE.TorusGeometry(0.5, 0.05, 8, 32), gold, 0, 1.55).rotation.x =
    -Math.PI / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const c = canvas.getContext("2d");
  c.fillStyle = "#173e38";
  c.fillRect(0, 0, 256, 160);
  c.strokeStyle = "#d4b270";
  c.lineWidth = 8;
  c.strokeRect(8, 8, 240, 144);
  c.font = "bold 105px serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#f5d68c";
  c.fillText("Bảo", 128, 85);
  mesh(
    g,
    new THREE.PlaneGeometry(1.2, 0.75),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      side: THREE.DoubleSide,
    }),
    0,
    2.65,
    2.3,
  );
  return g;
}
function createAltar() {
  const g = new THREE.Group(),
    stone = material(0x675b72),
    glowMat = glow(0xba88ef, 1.1);
  g.name = "eight-second-soul-ring-altar";
  mesh(g, new THREE.CylinderGeometry(2.3, 2.6, 0.32, 8), stone, 0, 0.16);
  for (let i = 0; i < 3; i++)
    ring(g, 2.05 - i * 0.36, 0.025, glowMat, 0.33 + i * 0.005);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    curve(
      g,
      [
        [Math.cos(a) * 0.7, 0.35, Math.sin(a) * 0.7],
        [Math.cos(a + 0.1) * 1.25, 0.35, Math.sin(a + 0.1) * 1.25],
        [Math.cos(a) * 2.1, 0.35, Math.sin(a) * 2.1],
      ],
      0.022,
      glowMat,
      12,
    );
  }
  const floating = mesh(
    g,
    new THREE.TorusGeometry(0.68, 0.05, 10, 64),
    glowMat,
    0,
    1.65,
  );
  floating.rotation.x = Math.PI / 3;
  mesh(g, new THREE.CylinderGeometry(0.5, 0.8, 0.65, 8), stone, 0, 0.62);
  return g;
}
function createSanctuary() {
  const group = new THREE.Group();
  group.name = "celestial-sanctuary";
  const jade = material(0xd1e4d9, {
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 0.9,
    }),
    gold = material(0xd6b968, { roughness: 0.28, metalness: 0.75 }),
    emerald = glow(0x70ddca, 1.5);
  for (let i = 0; i < 3; i++)
    mesh(
      group,
      new THREE.CylinderGeometry(3.3 - i * 0.35, 3.45 - i * 0.35, 0.24, 96),
      jade,
      0,
      0.12 + i * 0.24,
    );
  for (let i = 0; i < 3; i++)
    ring(group, 3.3 - i * 0.35, 0.035, gold, 0.25 + i * 0.24);
  const sigil = mesh(
    group,
    new THREE.CircleGeometry(2.55, 96),
    new THREE.MeshBasicMaterial({
      map: sigilTexture(),
      transparent: true,
      color: 0x99ffe4,
      opacity: 0.85,
      depthWrite: false,
    }),
    0,
    0.735,
  );
  sigil.rotation.x = -Math.PI / 2;
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + Math.PI / 4,
      x = Math.cos(a) * 4.3,
      z = Math.sin(a) * 4.3;
    mesh(
      group,
      new THREE.CylinderGeometry(0.32, 0.5, 0.28, 12),
      gold,
      x,
      0.14,
      z,
    );
    const pillar = mesh(
      group,
      new THREE.CylinderGeometry(0.19, 0.25, 3.3, 24),
      jade,
      x,
      1.9,
      z,
    );
    const points = [];
    for (let j = 0; j <= 70; j++) {
      const t = j / 70,
        angle = t * TAU * 2.5;
      points.push([
        x + Math.cos(angle) * 0.3,
        0.4 + t * 3.1,
        z + Math.sin(angle) * 0.3,
      ]);
    }
    curve(group, points, 0.07, gold, 90);
    const head = mesh(
      group,
      new THREE.ConeGeometry(0.18, 0.4, 6),
      gold,
      x + 0.28,
      3.56,
      z,
    );
    head.rotation.z = -0.7;
    mesh(
      group,
      new THREE.TorusGeometry(0.25, 0.04, 6, 24),
      gold,
      x,
      3.58,
      z,
    ).rotation.x = Math.PI / 2;
    const flame = mesh(
      group,
      new THREE.ConeGeometry(0.17, 0.65, 12),
      emerald,
      x,
      3.95,
      z,
    );
    flames.push(flame);
    pillar.userData.carvedDragon = true;
  }
  const gate = new THREE.Group();
  gate.position.set(0, 2, -11);
  group.add(gate);
  for (const side of [-1, 1]) {
    mesh(
      gate,
      new THREE.CylinderGeometry(0.44, 0.65, 7, 8),
      jade,
      side * 4,
      3.5,
    );
    mesh(
      gate,
      new THREE.CylinderGeometry(0.6, 0.6, 0.2, 8),
      gold,
      side * 4,
      6.7,
    );
    curve(
      gate,
      [
        [side * 4, 6.6, 0],
        [side * 2.8, 7.8, 0],
        [0, 8.2, 0],
      ],
      0.17,
      gold,
      32,
    );
  }
  mesh(
    gate,
    new THREE.TorusGeometry(3.6, 0.2, 10, 96, Math.PI),
    jade,
    0,
    3.3,
  ).rotation.z = 0;
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTexture(),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    color: 0xccdeee,
  });
  const clouds = [],
    rand = seeded(984);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Sprite(cloudMat);
    m.position.set((rand() - 0.5) * 70, -0.8 - rand() * 3, (rand() - 0.5) * 60);
    const size = 7 + rand() * 14;
    m.scale.set(size, size * 0.4, 1);
    group.add(m);
    clouds.push({ mesh: m, x: m.position.x, speed: 0.025 + rand() * 0.05 });
  }
  const mountainMat = material(0x6e91a6, { roughness: 1, metalness: 0 });
  for (let i = 0; i < 18; i++) {
    const angle = (i * TAU) / 18,
      r = 38 + rand() * 18,
      h = 8 + rand() * 20;
    const m = mesh(
      group,
      new THREE.ConeGeometry(6 + rand() * 6, h, 7),
      mountainMat,
      Math.cos(angle) * r,
      h * 0.25 - 5,
      Math.sin(angle) * r,
    );
    m.rotation.y = rand() * TAU;
  }
  const motes = [];
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(0.08, 0.05, 0.12, 0.2, 0, 0.23);
  petalShape.bezierCurveTo(-0.12, 0.2, -0.08, 0.05, 0, 0);
  const petalGeometry = new THREE.ShapeGeometry(petalShape),
    petalMat = material(0xffc6d1, {
      side: THREE.DoubleSide,
      emissive: 0x401623,
      emissiveIntensity: 0.2,
    });
  for (let i = 0; i < 38; i++) {
    const a = rand() * TAU,
      r = 2 + rand() * 5,
      m = mesh(
        group,
        petalGeometry,
        petalMat,
        Math.cos(a) * r,
        0.8 + rand() * 4,
        Math.sin(a) * r,
      );
    motes.push({ mesh: m, phase: a, r, petal: true });
  }
  const key = new THREE.DirectionalLight(0xfffbeb, 2.2);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 7, bottom: -3 });
  key.shadow.normalBias = 0.02;
  const rim = new THREE.SpotLight(0x38bdf8, 3, 25, Math.PI / 4, 0.5, 1);
  rim.position.set(-2, 5, -4);
  rim.target.position.set(0, 2, 0);
  const fill = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.1),
    under = new THREE.PointLight(0x6becc8, 1.5, 1.5, 2);
  under.position.set(0, 0.9, 0);
  group.add(key, key.target, rim, rim.target, fill, under);
  group.userData.sanctuary = {
    sigil,
    flames,
    clouds,
    motes,
    key,
    rim,
    fill,
    under,
  };
  return group;
}
export function createScenery() {
  const battlefield = new THREE.Group();
  battlefield.name = "thuong-mang-seven-biome-battlefield";
  const time = { value: 0 },
    playerPosition = { value: new THREE.Vector3(10000, 0, 10000) };
  const splatmap = generateTerrainSplatmap(),
    terrainGeometry = new THREE.PlaneGeometry(600, 600, 256, 256),
    vertices = terrainGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++)
    vertices.setZ(i, sceneryTerrainHeight(vertices.getX(i), -vertices.getY(i)));
  terrainGeometry.computeVertexNormals();
  const terrain = mesh(
    battlefield,
    terrainGeometry,
    material(0xffffff, { map: splatmap, roughness: 0.93, metalness: 0.04 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.name = "600-meter-art-terrain-gameplay-bounds-94";
  // The original central collision floor stays at groundHeight=.83; the outer
  // 600m scenery is visual only and does not expand the authoritative map.
  mesh(
    battlefield,
    new THREE.CylinderGeometry(14, 14.3, 0.8, 64),
    material(0x75857a),
    0,
    0.39,
  );
  const plazaSigil = mesh(
    battlefield,
    new THREE.CircleGeometry(13.4, 96),
    new THREE.MeshBasicMaterial({
      map: sigilTexture(),
      transparent: true,
      opacity: 0.32,
      color: 0xd5be7c,
      depthWrite: false,
    }),
    0,
    0.802,
  );
  plazaSigil.rotation.x = -Math.PI / 2;
  const roots = [],
    canopy = [],
    rocks = [],
    snowTrees = [],
    deadTrees = [],
    crystals = [],
    rand = seeded();
  for (let i = 0; i < 340; i++) {
    const x = rand() * 186 - 93,
      z = rand() * 186 - 93,
      b = biomeAt(x, z);
    if (
      Math.abs(x) < 11 ||
      Math.abs(z) < 7 ||
      Math.hypot(x, z) < 19 ||
      GATE_POS.some((p) => Math.hypot(p.x - x, p.z - z) < 7)
    )
      continue;
    const h = 3 + rand() * 3,
      y = terrainHeight(x, z);
    if (b === 0) {
      roots.push({ x, y: y + h * 0.4, z, sx: 0.35, sy: h * 0.8, sz: 0.35 });
      for (let layer = 0; layer < 5; layer++)
        for (let j = 0; j < 7; j++) {
          const a = (j * TAU) / 7 + layer * 0.5,
            r = (1 - layer * 0.13) * 1.2;
          canopy.push({
            x: x + Math.cos(a) * r,
            y: y + h + layer * 0.42,
            z: z + Math.sin(a) * r,
            sx: 1.1 - layer * 0.12,
            sy: 0.32,
            sz: 1.1 - layer * 0.12,
            ry: a,
          });
        }
    } else if (b === 3) {
      roots.push({ x, y: y + h * 0.3, z, sx: 0.16, sy: h * 0.6, sz: 0.16 });
      for (let j = 0; j < 5; j++)
        snowTrees.push({
          x,
          y: y + 1.2 + j * 0.7,
          z,
          sx: 1.7 - j * 0.26,
          sy: 1.5,
          sz: 1.7 - j * 0.26,
        });
    } else if (b === 2)
      deadTrees.push({
        x,
        y: y + h * 0.35,
        z,
        sx: 0.32,
        sy: h * 0.7,
        sz: 0.3,
        ry: rand() * TAU,
      });
    else if (b === 6)
      crystals.push({
        x,
        y: y + 0.7,
        z,
        sx: 0.5 + rand(),
        sy: 1.5 + rand() * 2,
        sz: 0.4,
        ry: rand() * TAU,
      });
    else
      rocks.push({
        x,
        y: y + 0.6,
        z,
        sx: 1 + rand() * 2,
        sy: 1 + rand() * 2,
        sz: 1.2 + rand(),
        ry: rand() * TAU,
      });
  }
  instanced(battlefield, treeTrunkGeometry(), material(0x63533b), roots);
  instanced(
    battlefield,
    new THREE.SphereGeometry(1, 10, 7),
    material(0x2e6948),
    canopy,
  );
  instanced(
    battlefield,
    new THREE.ConeGeometry(1, 1, 12),
    material(0xd2e4e5),
    snowTrees,
  );
  instanced(battlefield, treeTrunkGeometry(), material(0x3c3347), deadTrees);
  instanced(
    battlefield,
    new THREE.DodecahedronGeometry(1, 1),
    material(0x776e5a),
    rocks,
  );
  instanced(
    battlefield,
    new THREE.OctahedronGeometry(1),
    glow(0x9c65db, 0.65),
    crystals,
  );
  // Authoritative obstacle coordinates remain unchanged: carved ancient
  // monoliths replace the former smooth columns without changing navigation.
  for (const o of NAV_OBSTACLES) {
    const g = new THREE.Group();
    g.position.set(o.x, terrainHeight(o.x, o.z), o.z);
    battlefield.add(g);
    const stone = material(0x586c63),
      gold = glow(0xb5b67c, 0.3);
    mesh(g, new THREE.DodecahedronGeometry(0.85, 0), stone, 0, 1.1).scale.y =
      2.1;
    for (let j = 0; j < 3; j++)
      ring(g, 0.7 - j * 0.1, 0.025, gold, 0.8 + j * 0.7, 6);
  }
  const grassMaterial = material(0x4b8855, {
    side: THREE.DoubleSide,
    roughness: 0.92,
  });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uSceneryTime = time;
    shader.uniforms.uSceneryPlayer = playerPosition;
    shader.vertexShader =
      "uniform float uSceneryTime;uniform vec3 uSceneryPlayer;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
    vec3 center=instanceMatrix[3].xyz;float bladeTip=uv.y*uv.y;transformed.x+=sin(uSceneryTime*3.+center.x*.5+center.z*.4)*.12*bladeTip;
    vec2 away=center.xz-uSceneryPlayer.xz;float proximity=1.-smoothstep(.2,1.2,length(away));transformed.xz+=normalize(away+vec2(.001))*.4*proximity*bladeTip;`,
      );
  };
  grassMaterial.customProgramCacheKey = () => "blade-wind-player-v1";
  const grassEntries = [];
  MAP_BUSHES.forEach((b, index) => {
    for (let i = 0; i < 100; i++) {
      const a = i * 2.399,
        r = Math.sqrt((i + 0.5) / 100) * b.r,
        x = b.x + Math.cos(a) * r,
        z = b.z + Math.sin(a) * r;
      grassEntries.push({
        x,
        y: terrainHeight(x, z) + 0.02,
        z,
        sx: 0.8 + rand() * 0.6,
        sy: 0.7 + rand() * 0.7,
        sz: 1,
        ry: a + index,
      });
    }
  });
  const grass = instanced(
    battlefield,
    bladeGeometry(),
    grassMaterial,
    grassEntries,
  );
  grass.name = "stealth-grass-100-blades-per-authoritative-cluster";
  grass.userData.bladesPerCluster = 100;
  const flowers = [],
    ore = [],
    fireColumns = [],
    poisonBubbles = [];
  for (let i = 0; i < 110; i++) {
    const a = rand() * TAU,
      r = 8 + rand() * 21,
      x = 52 + Math.cos(a) * r,
      z = -48 + Math.sin(a) * r;
    flowers.push({
      x,
      y: terrainHeight(x, z) + 0.18,
      z,
      sx: 0.08,
      sy: 0.12,
      sz: 0.08,
      ry: a,
    });
  }
  for (let i = 0; i < 35; i++) {
    const a = rand() * TAU,
      r = 5 + rand() * 23,
      x = -52 + Math.cos(a) * r,
      z = -44 + Math.sin(a) * r;
    ore.push({
      x,
      y: terrainHeight(x, z) + 0.35,
      z,
      sx: 0.18 + rand() * 0.4,
      sy: 0.5 + rand() * 0.9,
      sz: 0.2,
      ry: a,
      rz: 0.25,
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12,
      x = -53 + Math.cos(a) * 17,
      z = 47 + Math.sin(a) * 17;
    fireColumns.push({
      x,
      y: terrainHeight(x, z) + 1.1,
      z,
      sx: 0.6,
      sy: 1.8 + rand() * 2,
      sz: 0.6,
      ry: a,
    });
  }
  instanced(
    battlefield,
    new THREE.OctahedronGeometry(1),
    glow(0x7feaa8, 1.1),
    flowers,
  );
  instanced(
    battlefield,
    new THREE.OctahedronGeometry(1),
    glow(0xd9a24c, 0.4),
    ore,
  );
  instanced(
    battlefield,
    new THREE.CylinderGeometry(0.6, 0.85, 1, 7),
    material(0x513b37, { emissive: 0x69210b, emissiveIntensity: 0.5 }),
    fireColumns,
  );
  const poisonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xba72d4,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    transmission: 0.45,
    depthWrite: false,
  });
  for (let i = 0; i < 16; i++) {
    const x = 49 + (rand() - 0.5) * 8,
      z = 47 + (rand() - 0.5) * 45,
      m = mesh(
        battlefield,
        new THREE.IcosahedronGeometry(0.15 + rand() * 0.15, 1),
        poisonMaterial,
        x,
        terrainHeight(x, z) + 0.3,
        z,
      );
    poisonBubbles.push({
      mesh: m,
      base: terrainHeight(x, z),
      phase: rand() * TAU,
    });
  }
  const water = ribbonSurface(
    battlefield,
    50,
    47,
    10,
    53,
    liquidMaterial(0x392047, 0, time),
  );
  water.name = "view-dependent-procedural-sky-poison-water";
  const lava = ribbonSurface(
    battlefield,
    -53,
    47,
    4,
    55,
    liquidMaterial(0xc33d0a, 1, time),
    0.1,
  );
  lava.name = "animated-emissive-lava";
  const iceGeometry = new THREE.CircleGeometry(9, 64);
  iceGeometry.rotateX(-Math.PI / 2);
  const ice = mesh(
    battlefield,
    iceGeometry,
    material(0x9dd8ee, {
      transmission: 0.8,
      thickness: 0.18,
      roughness: 0.12,
      clearcoat: 1,
      transparent: true,
      opacity: 0.86,
    }),
    5,
    terrainHeight(5, -65) + 0.13,
    -65,
  );
  ice.name = "transparent-frozen-lake";
  const markerMeshes = [];
  const specs = [
    ...[...GATE_POS, { x: -10, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 14 }].map(
      (p) => ({ ...p, type: "gate" }),
    ),
    ...REGIONS.slice(0, 6).map((r) => ({
      x: r.x + 5,
      z: r.z + 5,
      type: "shop",
    })),
    ...SHRINES.map((p) => ({ ...p, type: "shrine" })),
  ];
  for (const p of specs) {
    const g =
      p.type === "gate"
        ? createPortal()
        : p.type === "shop"
          ? createShop()
          : createAltar();
    g.position.set(p.x, groundHeight(p.x, p.z), p.z);
    battlefield.add(g);
    const halo = ring(
      g,
      3.5,
      0.035,
      new THREE.MeshBasicMaterial({
        color:
          p.type === "gate"
            ? 0x71e2c7
            : p.type === "shop"
              ? 0xe4bd75
              : 0xc19be9,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      0.04,
    );
    markerMeshes.push({ group: g, ring: halo, p });
  }
  const hidden = new THREE.Group();
  hidden.position.set(82, 0, 0);
  hidden.name = "hidden-realm-floating-crystal-island";
  battlefield.add(hidden);
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9,
      m = mesh(
        hidden,
        new THREE.OctahedronGeometry(2),
        material(0x554273, { roughness: 0.5, metalness: 0.4 }),
        Math.cos(a) * 12,
        1 + Math.sin(i) * 2,
        Math.sin(a) * 12,
      );
    m.scale.y = 1.8;
  }
  const sanctuary = createSanctuary();
  return {
    battlefield,
    sanctuary,
    terrain,
    splatmap,
    grass,
    markerMeshes,
    time,
    playerPosition,
    hidden,
    liquids: { water, lava },
    update(clock, match) {
      time.value = clock;
      playerPosition.value.set(
        match?.player.x ?? 10000,
        0,
        match?.player.z ?? 10000,
      );
      battlefield.visible = !!match;
      sanctuary.visible = !match;
      hidden.visible = !!match && match.player.realm === 1;
      const s = sanctuary.userData.sanctuary;
      if (!match) {
        s.flames.forEach((m, i) => {
          m.scale.y = 0.85 + Math.sin(clock * 5 + i) * 0.15;
        });
        s.clouds.forEach((c) => {
          c.mesh.position.x = c.x + Math.sin(clock * c.speed) * 2;
        });
        s.motes.forEach((p, i) => {
          p.mesh.position.set(
            Math.cos(p.phase + clock * 0.07) * p.r,
            1.8 + Math.sin(clock * 0.4 + i) * 1.2,
            Math.sin(p.phase + clock * 0.07) * p.r,
          );
          p.mesh.rotation.set(clock * 0.3 + i, clock * 0.2, clock * 0.4 + i);
        });
      } else {
        poisonBubbles.forEach((p) => {
          p.mesh.position.y = p.base + 0.15 + ((clock * 0.28 + p.phase) % 1.2);
          const scale = 0.5 + 0.5 * Math.sin(clock + p.phase);
          p.mesh.scale.setScalar(scale);
        });
      }
    },
  };
}
