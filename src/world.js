import * as THREE from "three";
import { HEROES, REGIONS, GATE_POS, SHRINES } from "./data.js";
import {
  visualTemplate,
  animateVisual,
  terrainHeight,
  groundHeight,
  projectGround,
  roundedBlock,
  treeTrunkGeometry,
  proceduralMaps,
} from "./art.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { staffAssets } from "./staff-asset.js";
import { MAP_BUSHES, infected } from "./systems.js";
export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.quality = localStorage.getItem("hon-gioi-quality") || "balanced";
    this.staffCache = new Map();
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.quality === "ultra" ? 1.8 : 1.3),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x102b32);
    this.scene.fog = new THREE.FogExp2(0x1f3b40, 0.011);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 350);
    this.camera.position.set(17, 27, 23);
    this.focus = new THREE.Vector3();
    this.clock = 0;
    this.models = new Map();
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.effectMeshes = new Map();
    this.markerMeshes = [];
    this.materials = new Map();
    this.geos = {
      body: new THREE.CylinderGeometry(0.32, 0.48, 0.95, 6),
      head: new THREE.IcosahedronGeometry(0.25, 1),
      cone: new THREE.ConeGeometry(0.42, 0.7, 5),
      box: roundedBlock(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
      ring: new THREE.TorusGeometry(0.65, 0.025, 4, 32),
      staff: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5),
    };
    this.scene.add(new THREE.HemisphereLight(0xd6fcf1, 0x31444f, 2.4));
    const sun = new THREE.DirectionalLight(0xffdfad, 3.3);
    sun.position.set(-20, 35, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(
      this.quality === "ultra" ? 4096 : 1024,
      this.quality === "ultra" ? 4096 : 1024,
    );
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.normalBias = 0.05;
    this.sun = sun;
    this.scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0x69f0e7, 1.4);
    rim.position.set(10, 10, -20);
    this.scene.add(rim);
    this.environment();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.35,
      0.5,
      1.05,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.weaponLight = new THREE.PointLight(0x70edc5, 2, 4, 2);
    this.scene.add(this.weaponLight);
    this.particles = [];
    this.particleMesh = new THREE.InstancedMesh(
      new THREE.TetrahedronGeometry(0.07),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      256,
    );
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    this.particleDummy = new THREE.Object3D();
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.targetRing = this.ring(0x90ffe0, 1);
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  mat(color, emissive = false) {
    const key = color + "-" + emissive;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.75,
          metalness: 0.15,
          emissive: emissive ? color : 0,
          emissiveIntensity: emissive ? 0.6 : 0,
        }),
      );
    return this.materials.get(key);
  }
  mesh(geo, color, parent = this.scene) {
    let m = new THREE.Mesh(geo, this.mat(color));
    parent.add(m);
    return m;
  }
  ring(color, r = 1) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.94, r, 64),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.06;
    return m;
  }
  instances(geo, color, entries) {
    const m = new THREE.InstancedMesh(geo, this.mat(color), entries.length),
      dummy = new THREE.Object3D();
    entries.forEach((e, i) => {
      dummy.position.set(e.x, (e.y ?? 0) + terrainHeight(e.x, e.z), e.z);
      dummy.scale.set(e.sx ?? 1, e.sy ?? 1, e.sz ?? 1);
      dummy.rotation.y = e.rot ?? 0;
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  environment() {
    const groundGeometry = new THREE.PlaneGeometry(210, 210, 256, 256);
    const vertices = groundGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++)
      vertices.setZ(i, terrainHeight(vertices.getX(i), -vertices.getY(i)));
    groundGeometry.computeVertexNormals();
    const ground = this.mesh(groundGeometry, 0x3c6056);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const colors = new Float32Array(vertices.count * 3);
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        z = -vertices.getY(i);
      const r = REGIONS.filter(
        (r, j) => j !== 6 || Math.hypot(x - 82, z) < 18,
      ).reduce(
        (best, r) =>
          Math.hypot(r.x - x, r.z - z) < Math.hypot(best.x - x, best.z - z)
            ? r
            : best,
        REGIONS[0],
      );
      const color = new THREE.Color(r.color).multiplyScalar(
        0.8 + 0.1 * Math.sin(x * 0.17) * Math.cos(z * 0.13),
      );
      color.toArray(colors, i * 3);
    }
    groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    ground.material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02,
    });
    let road = this.mesh(new THREE.PlaneGeometry(17, 190), 0x72786c);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.025;
    road.receiveShadow = true;
    let road2 = this.mesh(new THREE.PlaneGeometry(190, 10), 0x737c6d);
    road2.rotation.x = -Math.PI / 2;
    road2.position.y = 0.03;
    const platform = this.mesh(
      new THREE.CylinderGeometry(14, 15, 0.7, 12),
      0x8d9785,
    );
    platform.position.y = 0.3;
    platform.receiveShadow = true;
    const inset = this.mesh(
      new THREE.CylinderGeometry(12, 12, 0.72, 12),
      0x52685f,
    );
    inset.position.y = 0.33;
    inset.receiveShadow = true;
    this.scene.add(this.ring(0xc6c894, 11.6));
    const tiles = [];
    for (let x = -12; x <= 12; x += 3)
      for (let z = -12; z <= 12; z += 3)
        if (Math.hypot(x, z) < 12)
          tiles.push({ x, y: 0.72, z, sx: 2.85, sy: 0.08, sz: 2.85 });
    this.instances(this.geos.box, 0x7c8c7b, tiles);
    this.obstacles = [];
    for (const [x, z] of [
      [-15, -15],
      [15, -15],
      [-15, 15],
      [15, 15],
      [-8, -22],
      [8, -22],
    ]) {
      const col = this.mesh(
        new THREE.CylinderGeometry(0.65, 0.9, 5, 7),
        0x738b7b,
      );
      col.position.set(x, 2.5, z);
      col.castShadow = true;
      const cap = this.mesh(roundedBlock(2, 0.4, 2), 0xbaa779);
      cap.position.set(x, 5, z);
      this.obstacles.push({ x, z, r: 0.85, blocksSight: true });
      const gem = this.mesh(new THREE.OctahedronGeometry(0.45), 0x83ffd5);
      gem.material = this.mat(0x83ffd5, true);
      gem.position.set(x, 5.7, z);
    }
    let trunks = [],
      leaves = [],
      rocks = [],
      snow = [];
    let seed = 2741;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 430; i++) {
      const x = rand() * 186 - 93,
        z = rand() * 186 - 93;
      if (
        Math.abs(x) < 12 ||
        Math.abs(z) < 8 ||
        Math.hypot(x, z) < 20 ||
        GATE_POS.some((p) => Math.hypot(p.x - x, p.z - z) < 7)
      )
        continue;
      const h = 2 + rand() * 4;
      if (z < -48 && Math.abs(x) < 30) {
        snow.push({ x, y: h / 2 + 0.5, z, sx: 2, sy: h, sz: 2 });
        trunks.push({ x, y: h / 3, z, sx: 0.2, sy: h / 2, sz: 0.2 });
      } else if ((x > 15 && z < 15) || rand() < 0.4) {
        trunks.push({ x, y: h / 2, z, sx: 0.35, sy: h, sz: 0.35 });
        leaves.push({ x, y: h + 1, z, sx: 1.5 + rand(), sy: 2, sz: 1.8 });
      } else
        rocks.push({
          x,
          y: 0.5,
          z,
          sx: 1 + rand() * 2,
          sy: 1 + rand() * 2,
          sz: 1.5,
          rot: rand() * 6,
        });
    }
    this.instances(
      this.geos.sphere,
      0x36694b,
      MAP_BUSHES.map((b) => ({
        x: b.x,
        z: b.z,
        y: 0.6,
        sx: b.r,
        sy: 1.2,
        sz: b.r,
      })),
    );
    this.instances(treeTrunkGeometry(), 0x574b38, trunks);
    const canopy = [];
    leaves.forEach((e, index) => {
      for (let j = 0; j < 24; j++) {
        const a = j * 2.399,
          r = 0.35 + 0.65 * Math.sqrt((j + 0.5) / 24);
        canopy.push({
          x: e.x + Math.cos(a) * e.sx * r,
          y: e.y + Math.sin(j * 0.7) * 0.55,
          z: e.z + Math.sin(a) * e.sz * r,
          sx: 0.5,
          sy: 0.35,
          sz: 0.6,
          rot: a,
        });
      }
    });
    this.instances(new THREE.SphereGeometry(1, 12, 8), 0x3e795d, canopy);

    this.instances(this.geos.cone, 0xbad9d5, snow);
    this.instances(new THREE.SphereGeometry(1, 24, 16), 0x68736c, rocks);
    const waterGeometry = new THREE.PlaneGeometry(5, 56, 16, 128),
      wv = waterGeometry.attributes.position;
    for (let i = 0; i < wv.count; i++) {
      const z = wv.getY(i) + 47,
        x = wv.getX(i) + 49 + Math.sin(z * 0.13) * 3;
      wv.setXYZ(i, x, terrainHeight(x, z) + 0.035, z);
    }
    waterGeometry.computeVertexNormals();
    const water = new THREE.Mesh(
      waterGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x356b76,
        roughness: 0.24,
        metalness: 0.1,
        clearcoat: 1,
        transmission: 0.35,
        thickness: 0.05,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(water);
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
    specs.forEach((p) => {
      const g = new THREE.Group();
      g.position.set(p.x, terrainHeight(p.x, p.z), p.z);
      this.scene.add(g);
      const color =
        p.type === "gate" ? 0x72ffdb : p.type === "shop" ? 0xf1c878 : 0xb5a1ff;
      const base = this.mesh(
        new THREE.CylinderGeometry(2.4, 2.8, 0.5, 8),
        0x7b8980,
        g,
      );
      base.position.y = 0.25;
      base.receiveShadow = true;
      if (p.type === "gate") {
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.19, 6, 36, Math.PI * 1.4),
          this.mat(0xb4bba0),
        );
        arch.rotation.z = -0.2 * Math.PI;
        arch.position.y = 1.8;
        g.add(arch);
        const core = new THREE.Mesh(
          new THREE.CircleGeometry(1.55, 40),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.17,
            side: THREE.DoubleSide,
          }),
        );
        core.position.y = 1.8;
        g.add(core);
      } else {
        const col = this.mesh(
          new THREE.CylinderGeometry(0.7, 1, 1.5, 6),
          0xadb59a,
          g,
        );
        col.position.y = 1;
        const gem = this.mesh(new THREE.OctahedronGeometry(0.65), color, g);
        gem.material = this.mat(color, true);
        gem.position.y = 2.3;
      }
      const ring = this.ring(color, 3.5);
      g.add(ring);
      this.markerMeshes.push({ group: g, ring, p });
    });
    // Broken arches and floating islands mark the hidden realm.
    for (let i = 0; i < 8; i++) {
      let a = (i / 8) * Math.PI * 2;
      const m = this.mesh(new THREE.OctahedronGeometry(2.3), 0x8e78b1);
      m.position.set(
        82 + Math.cos(a) * 12,
        3 + Math.sin(i) * 2,
        Math.sin(a) * 12,
      );
    }
  }
  loadStaff(detail) {
    if (!this.staffCache.has(detail))
      this.staffCache.set(
        detail,
        new GLTFLoader().loadAsync(staffAssets[detail]).then((g) => {
          g.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              const old = o.material;
              const m = new THREE.MeshPhysicalMaterial();
              THREE.MeshStandardMaterial.prototype.copy.call(m, old);
              m.clearcoat = 1;
              m.flatShading = false;
              m.userData.sharedArt = true;
              o.material = m;
              o.geometry.computeVertexNormals();
              o.geometry.userData.sharedArt = true;
            }
          });
          return g.scene;
        }),
      );
    return this.staffCache.get(detail);
  }
  addDetail(model, a, detail) {
    if (model.details.has(detail)) return;
    const visual = visualTemplate(a, detail);
    model.details.add(detail);
    model.lod.addLevel(
      visual,
      detail === "high" ? 0 : detail === "medium" ? 28 : 48,
    );
    if (a.kind === "hero" && a.hero === 0) {
      this.loadStaff(detail)
        .then((source) => {
          const weapon = visual.getObjectByName("soulWeapon");
          if (!weapon) return;
          weapon.clear();
          const staff = source.clone(true);
          staff.scale.setScalar(0.38);
          staff.position.y = -0.35;
          weapon.add(staff);
          if (a.skin) {
            staff.traverse((o) => {
              if (o.isMesh) {
                o.material = o.material.clone();
                o.material.iridescence = a.skin === 2 ? 0.4 : 0;
                if (a.skin === 2) o.material.color.offsetHSL(0.025, 0.08, 0.03);
              }
            });
            for (let i = 0; i < (a.skin === 2 ? 5 : 2); i++) {
              const gem = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 24, 12),
                new THREE.MeshPhysicalMaterial({
                  color: a.skin === 2 ? 0xffd179 : 0x92edcf,
                  emissive: a.skin === 2 ? 0xffa95c : 0x62d8a1,
                  emissiveIntensity: 1,
                  metalness: 0.55,
                  roughness: 0.25,
                  iridescence: a.skin === 2 ? 0.4 : 0,
                  clearcoat: 1,
                }),
              );
              gem.position.set(
                Math.sin(i * 2.4) * 0.08,
                0.5 + i * 0.06,
                Math.cos(i * 2.4) * 0.08,
              );
              weapon.add(gem);
            }
          }
        })
        .catch((e) => console.error("GLB staff load failed", e.message));
    }
  }
  appearanceKey(a) {
    return [
      a.kind,
      a.hero,
      a.skin ?? 0,
      a.costume ?? 0,
      a.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple",
    ].join(":");
  }
  character(a) {
    const group = new THREE.Group(),
      lod = new THREE.LOD();
    group.add(lod);
    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x17272c, depthTest: false }),
    );
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.065),
      new THREE.MeshBasicMaterial({
        color:
          a.team === 0
            ? 0x81e5b1
            : ["hero", "clone"].includes(a.kind)
              ? 0xf1817e
              : 0xdeb969,
        depthTest: false,
      }),
    );
    bar.position.z = 0.01;
    barBg.add(bar);
    barBg.position.y = a.kind === "boss" ? 5.2 : 2.35;
    group.add(barBg);
    this.dynamic.add(group);
    const model = {
      group,
      lod,
      barBg,
      bar,
      details: new Set(),
      appearanceKey: this.appearanceKey(a),
    };
    this.models.set(a.id, model);
    this.addDetail(model, a, a.id === "preview" ? "high" : "low");
    return model;
  }
  setQuality(value) {
    if (!["balanced", "ultra"].includes(value))
      throw Error("Chất lượng không hợp lệ");
    this.quality = value;
    const textures = value === "ultra" ? proceduralMaps() : null;
    for (const m of this.materials.values()) {
      Object.assign(m, {
        clearcoat: value === "ultra" ? 1 : 0.1,
        normalMap: textures?.normal ?? null,
        roughnessMap: textures?.roughness ?? null,
        metalnessMap: textures?.metalness ?? null,
        bumpMap: textures?.height ?? null,
        bumpScale: 0.01,
      });
      m.needsUpdate = true;
    }
    localStorage.setItem("hon-gioi-quality", value);
    const size = value === "ultra" ? 4096 : 1024;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, value === "ultra" ? 1.8 : 1.3),
    );
    this.resize();
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
  }
  screenToWorld(clientX, clientY) {
    this.ray.setFromCamera(
      new THREE.Vector2(
        (clientX / innerWidth) * 2 - 1,
        (-clientY / innerHeight) * 2 + 1,
      ),
      this.camera,
    );
    const v = projectGround(this.ray.ray) ?? this.focus;
    return { x: v.x, z: v.z };
  }
  render(match, dt, hubHero = 0, appearance = {}) {
    this.clock += dt;
    const player = match?.player ?? { x: 0, z: 0 };
    const target = new THREE.Vector3(
      player.x,
      match ? groundHeight(player.x, player.z) : 0,
      player.z,
    );
    this.focus.lerp(target, 1 - Math.exp(-dt * 8));
    const dist = match ? (this.quality === "ultra" ? 25 : 31) : 22;
    const elevation = (48 * Math.PI) / 180;
    this.camera.position
      .copy(this.focus)
      .add(
        new THREE.Vector3(
          dist * Math.cos(elevation) * 0.477,
          dist * Math.sin(elevation),
          dist * Math.cos(elevation) * 0.879,
        ),
      );
    this.camera.lookAt(
      this.focus.x,
      this.focus.y + (match ? 0.9 : 2.6),
      this.focus.z,
    );
    this.sun.position.set(
      this.focus.x - 20,
      this.focus.y + 35,
      this.focus.z + 10,
    );
    this.sun.target.position.copy(this.focus);
    if (!match) {
      if (!this.preview) {
        this.preview = this.character({
          id: "preview",
          kind: "hero",
          hero: hubHero,
          team: 0,
          rings: [1],
          ...appearance,
        }).group;
        this.preview.scale.setScalar(2.4);
        this.models.get("preview").barBg.visible = false;
      }
      if (
        this.previewHero !==
        `${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}:${appearance.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple"}`
      ) {
        this.dynamic.remove(this.preview);
        this.models.delete("preview");
        this.preview = null;
        this.previewHero = `${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}:${appearance.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple"}`;
        this.render(null, 0, hubHero, appearance);
        return;
      }
      this.preview.visible = true;
      this.preview.rotation.y = Math.PI + Math.sin(this.clock * 0.3) * 0.3;
      this.preview.position.set(0, 0.7, 0);
    } else {
      if (this.preview) this.preview.visible = false;
      for (const a of match.actors) {
        let model = this.models.get(a.id);
        if (
          !a.alive ||
          a.extracted ||
          Math.abs(a.x - player.x) > 42 ||
          Math.abs(a.z - player.z) > 42
        ) {
          if (model) model.group.visible = false;
          continue;
        }
        if (model && model.appearanceKey !== this.appearanceKey(a)) {
          this.dynamic.remove(model.group);
          this.models.delete(a.id);
          model = null;
        }
        if (!model) model = this.character(a);
        const g = model.group;
        g.visible = !(match.visible && !match.visible(player, a));
        if (
          this.camera.position.distanceTo(
            new THREE.Vector3(a.x, groundHeight(a.x, a.z), a.z),
          ) < 48
        )
          this.addDetail(model, a, "medium");
        if (
          this.quality === "ultra" &&
          (a === player || a.kind === "boss") &&
          this.camera.position.distanceTo(
            new THREE.Vector3(a.x, groundHeight(a.x, a.z), a.z),
          ) < 28
        )
          this.addDetail(model, a, "high");
        for (const level of model.lod.levels)
          animateVisual(level.object, a, this.clock, dt);
        g.position.set(
          a.x,
          groundHeight(a.x, a.z) + Math.sin(this.clock * 5 + a.id) * 0.025,
          a.z,
        );
        g.rotation.y = Math.atan2(a.dir.x, a.dir.z) + Math.PI;
        if (a.kind === "hero" && a.downedUntil) g.rotation.z = 0.9;
        else g.rotation.z = 0;
        const max = match.getStats(a).hp;
        model.bar.scale.x = Math.max(0.001, a.hp / max);
        model.bar.position.x = -(1 - a.hp / max) * 0.625;
        model.barBg.quaternion.copy(this.camera.quaternion);
      }
      for (const z of match.zones)
        if (!z.delayed && !this.effectMeshes.has("z" + z.id)) {
          let ring = this.ring(
            HEROES[z.owner.hero]?.color ?? 0xffaa77,
            z.sk.radius,
          );
          ring.position.set(
            z.point.x,
            groundHeight(z.point.x, z.point.z) + 0.03,
            z.point.z,
          );
          this.scene.add(ring);
          this.effectMeshes.set("z" + z.id, { mesh: ring, end: z.end });
        }
      for (const e of match.effects)
        if (!this.effectMeshes.has(e.id)) {
          this.spawnParticles(e);
          let ring = this.ring(e.color, Math.max(0.4, e.radius));
          ring.position.set(e.x, groundHeight(e.x, e.z) + 0.05, e.z);
          this.scene.add(ring);
          this.effectMeshes.set(e.id, {
            mesh: ring,
            end: e.end,
            born: e.born,
            animated: true,
          });
        }
      for (const [key, e] of this.effectMeshes) {
        if (e.end <= match.time) {
          this.scene.remove(e.mesh);
          e.mesh.geometry.dispose();
          e.mesh.material.dispose();
          this.effectMeshes.delete(key);
        } else if (e.animated) {
          const scale = 0.45 + (match.time - e.born) * 1.8;
          e.mesh.scale.setScalar(scale);
          e.mesh.material.opacity = Math.max(0, (e.end - match.time) * 1.2);
        }
      }
      if (Math.floor(this.clock) % 2 === 0) {
        const ids = new Set(match.actors.map((a) => a.id));
        for (const [id, model] of this.models)
          if (typeof id === "number" && !ids.has(id)) {
            this.dynamic.remove(model.group);
            const shared = new Set(Object.values(this.geos));
            model.group.traverse((child) => {
              if (
                child.isMesh &&
                !shared.has(child.geometry) &&
                !child.geometry.userData.sharedArt
              )
                child.geometry.dispose();
            });
            this.models.delete(id);
          }
      }
      this.renderMapEffects(match);
      this.renderDynamicGates(match);
      this.renderCompanion(match);
      this.renderProjectiles(match);
      this.renderDrops(match);
      this.markerMeshes.forEach(({ ring, p }) => {
        ring.material.opacity =
          p.type === "gate"
            ? match.gates.some(
                (g) =>
                  Math.hypot(g.x - p.x, g.z - p.z) < 2 && g.end > match.time,
              )
              ? 0.9
              : 0.12
            : 0.5 + Math.sin(this.clock * 2) * 0.15;
      });
      if (match.player.channel) {
        const c = match.player.channel;
        this.targetRing.visible = true;
        this.targetRing.scale.setScalar(3.5);
        this.targetRing.position.set(
          c.gate.x,
          groundHeight(c.gate.x, c.gate.z) + 0.1,
          c.gate.z,
        );
      } else if (!this.aiming) this.targetRing.visible = false;
    }
    this.animateParticles(dt);
    const lit = match?.player ?? { x: 0, z: 0 };
    this.weaponLight.position.set(
      lit.x + 0.5,
      groundHeight(lit.x, lit.z) + 1.2,
      lit.z,
    );
    this.weaponLight.visible = !match || this.quality === "ultra";
    if (this.quality === "ultra") this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  renderMapEffects(match) {
    if (!this.fogRegions) {
      this.fogRegions = REGIONS.slice(0, 5).map((r, i) => {
        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(38, 32),
          new THREE.MeshBasicMaterial({
            color: 0x8b548e,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(r.x, 0.15, r.z);
        this.scene.add(mesh);
        return mesh;
      });
    }
    this.fogRegions.forEach(
      (m, i) =>
        (m.material.opacity =
          match.time > 480 + i * 100
            ? 0.12 + Math.sin(this.clock * 0.8 + i) * 0.025
            : 0),
    );
    if (!this.realmMarkers) {
      this.realmMarkers = [
        { x: 58, z: 32 },
        { x: 70, z: -7 },
        { x: 70, z: 7 },
      ].map((p) => {
        const m = this.ring(0xbda1ff, 2.3);
        m.position.set(p.x, 0.2, p.z);
        this.scene.add(m);
        return m;
      });
    }
    this.realmMarkers.forEach((m, i) => {
      m.visible =
        i === 0
          ? match.time >= 600 && match.time < 840
          : match.player.realm === 1;
    });
  }
  setLeaders(rows) {
    for (let i = 0; i < 3; i++) {
      const key = "legend-" + i,
        old = this.models.get(key);
      if (old) {
        this.dynamic.remove(old.group);
        this.models.delete(key);
      }
      if (!rows[i]) continue;
      const model = this.character({
        id: key,
        kind: "hero",
        hero: rows[i].hero ?? 0,
        team: 0,
        skin: 2,
        costume: 2,
        rings: [],
      });
      model.group.position.set((i - 1) * 3, 0.8, -6);
      model.group.scale.setScalar(i === 0 ? 1.35 : 1.05);
      model.barBg.visible = false;
      for (const child of model.group.children)
        if (child.isMesh) child.material = this.mat(0xa88d5d);
    }
  }
  renderDynamicGates(match) {
    if (!this.activeGateModels) this.activeGateModels = new Map();
    const ids = new Set();
    for (const gate of match.gates) {
      if (gate.end <= match.time && !match.player.channel) continue;
      const key = gate.x + "," + gate.z;
      ids.add(key);
      let model = this.activeGateModels.get(key);
      if (!model) {
        model = new THREE.Group();
        const ring = this.ring(0x9affda, 3.5);
        model.add(ring);
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.13, 5, 28),
          this.mat(0xa1d9ba, true),
        );
        arch.position.y = 1.8;
        model.add(arch);
        this.scene.add(model);
        this.activeGateModels.set(key, model);
      }
      model.position.set(gate.x, groundHeight(gate.x, gate.z) + 0.05, gate.z);
    }
    for (const [key, m] of this.activeGateModels)
      if (!ids.has(key)) {
        this.scene.remove(m);
        for (const c of m.children) {
          c.geometry.dispose();
        }
        this.activeGateModels.delete(key);
      }
  }
  renderCompanion(match) {
    const pet = match.player.companion;
    if (!pet) {
      if (this.pet) this.pet.visible = false;
      return;
    }
    if (!this.pet) {
      this.pet = this.mesh(
        new THREE.OctahedronGeometry(0.22),
        0xacecff,
        this.dynamic,
      );
      this.pet.material = this.mat(0xacecff, true);
    }
    this.pet.visible = true;
    this.pet.position.set(pet.x, 1.05 + Math.sin(this.clock * 4) * 0.15, pet.z);
    this.pet.rotation.y = this.clock;
  }
  renderProjectiles(match) {
    if (!this.boltModels) this.boltModels = new Map();
    const ids = new Set();
    for (const p of match.projectiles) {
      ids.add(p.id);
      let mesh = this.boltModels.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.16),
          this.mat(HEROES[p.owner.hero].color, true),
        );
        mesh.scale.z = 2.8;
        this.dynamic.add(mesh);
        this.boltModels.set(p.id, mesh);
      }
      mesh.position.set(p.x, groundHeight(p.x, p.z) + 1, p.z);
      mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z);
    }
    for (const [id, mesh] of this.boltModels)
      if (!ids.has(id)) {
        this.dynamic.remove(mesh);
        mesh.geometry.dispose();
        this.boltModels.delete(id);
      }
  }
  renderDrops(match) {
    if (!this.dropModels) this.dropModels = new Map();
    const ids = new Set();
    for (const d of match.drops) {
      ids.add(d.id);
      let g = this.dropModels.get(d.id);
      if (!g) {
        g = this.mesh(
          new THREE.OctahedronGeometry(0.28),
          0xe3bf76,
          this.dynamic,
        );
        g.material = this.mat(0xe3bf76, true);
        this.dropModels.set(d.id, g);
      }
      g.position.set(
        d.x,
        groundHeight(d.x, d.z) + 0.6 + Math.sin(this.clock * 2 + d.id) * 0.15,
        d.z,
      );
      g.rotation.y = this.clock;
      g.visible = Math.hypot(d.x - match.player.x, d.z - match.player.z) < 35;
    }
    for (const [id, g] of this.dropModels)
      if (!ids.has(id)) {
        this.dynamic.remove(g);
        g.geometry.dispose();
        this.dropModels.delete(id);
      }
  }
  spawnParticles(e) {
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= 256) break;
      const angle = Math.random() * Math.PI * 2,
        speed = 1 + Math.random() * 3;
      this.particles.push({
        x: e.x,
        y: groundHeight(e.x, e.z) + 0.4,
        z: e.z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        color: e.color,
      });
    }
  }
  animateParticles(dt) {
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particleMesh.count = this.particles.length;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 7 * dt;
      const d = this.particleDummy;
      d.position.set(p.x, Math.max(groundHeight(p.x, p.z) + 0.1, p.y), p.z);
      d.scale.setScalar(Math.max(0.1, p.life * 1.5));
      d.updateMatrix();
      this.particleMesh.setMatrixAt(i, d.matrix);
      this.particleMesh.setColorAt(i, new THREE.Color(p.color));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor)
      this.particleMesh.instanceColor.needsUpdate = true;
  }
  clearAim() {
    this.aiming = false;
    this.targetRing.visible = false;
    if (this.aimGuide) {
      this.scene.remove(this.aimGuide);
      for (const child of [...this.aimGuide.children]) {
        child.geometry.dispose();
        child.material.dispose();
      }
      this.aimGuide = null;
    }
  }
  aim(a, skill, dir) {
    this.clearAim();
    this.aiming = true;
    const group = new THREE.Group(),
      color = 0x9fffe1;
    group.position.set(a.x, groundHeight(a.x, a.z) + 0.1, a.z);
    group.rotation.y = Math.atan2(dir.x, dir.z);
    const material = () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    if (skill.shape === "line" || skill.shape === "cone") {
      if (skill.shape === "line") {
        let strip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, skill.range),
          material(),
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.z = skill.range / 2;
        group.add(strip);
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 0.9, 3),
          material(),
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.position.z = skill.range;
        group.add(arrow);
      } else {
        const geometry = new THREE.CircleGeometry(
          skill.range,
          40,
          Math.PI / 6,
          (Math.PI * 2) / 3,
        );
        const cone = new THREE.Mesh(geometry, material());
        cone.rotation.x = -Math.PI / 2;
        group.add(cone);
      }
    } else {
      const ring = this.ring(color, skill.radius || 1);
      ring.position.z = skill.range * 0.7;
      group.add(ring);
    }
    this.aimGuide = group;
    this.scene.add(group);
  }

  reset() {
    this.clearAim();
    this.particles = [];
    if (this.boltModels) {
      for (const m of this.boltModels.values()) {
        this.dynamic.remove(m);
        m.geometry.dispose();
      }
      this.boltModels.clear();
    }
    for (const { group } of this.models.values()) this.dynamic.remove(group);
    this.models.clear();
    this.preview = null;
    for (const e of this.effectMeshes.values()) {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
    }
    this.effectMeshes.clear();
    if (this.dropModels) {
      for (const m of this.dropModels.values()) {
        this.dynamic.remove(m);
        m.geometry.dispose();
      }
      this.dropModels.clear();
    }
  }
}
