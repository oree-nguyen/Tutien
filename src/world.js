import * as THREE from "three";
import { HEROES, REGIONS, GATE_POS, SHRINES } from "./data.js";
import { adorn, animateRig, costumeColor } from "./cosmetics.js";
import { MAP_BUSHES, infected } from "./systems.js";
export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
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
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
      ring: new THREE.TorusGeometry(0.65, 0.025, 4, 32),
      staff: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5),
    };
    this.scene.add(new THREE.HemisphereLight(0xd6fcf1, 0x31444f, 2.4));
    const sun = new THREE.DirectionalLight(0xffdfad, 3.3);
    sun.position.set(-20, 35, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
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
        new THREE.MeshStandardMaterial({
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
      dummy.position.set(e.x, e.y ?? 0, e.z);
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
    const ground = this.mesh(new THREE.PlaneGeometry(210, 210), 0x3c6056);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    REGIONS.forEach((r) => {
      let tile = this.mesh(
        new THREE.CylinderGeometry(
          r.name.includes("Bí Cảnh") ? 18 : 39,
          39,
          0.12,
          7,
        ),
        r.color,
      );
      tile.position.set(r.x, -0.02, r.z);
      tile.receiveShadow = true;
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
      const cap = this.mesh(new THREE.BoxGeometry(2, 0.4, 2), 0xbaa779);
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
    this.instances(this.geos.box, 0x574b38, trunks);
    this.instances(new THREE.IcosahedronGeometry(1, 0), 0x3e795d, leaves);
    this.instances(this.geos.cone, 0xbad9d5, snow);
    this.instances(new THREE.DodecahedronGeometry(1, 0), 0x68736c, rocks);
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
      g.position.set(p.x, 0, p.z);
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
  character(a) {
    const group = new THREE.Group(),
      hero = a.kind === "hero",
      h = HEROES[a.hero],
      color = hero
        ? h.color
        : a.kind === "boss"
          ? 0xc4a87c
          : a.mutant
            ? 0xf27292
            : a.tier
              ? 0xb3a171
              : 0x91a89b;
    const body = this.mesh(this.geos.body, color, group);
    body.position.y = 0.9;
    body.castShadow = true;
    const head = this.mesh(this.geos.head, hero ? 0xe8caa4 : 0x61717b, group);
    head.position.y = 1.68;
    head.castShadow = true;
    if (hero) {
      for (const x of [-0.15, 0.15]) {
        const leg = this.mesh(
          new THREE.CylinderGeometry(0.1, 0.09, 0.45, 5),
          0x263f49,
          group,
        );
        leg.position.set(x, 0.28, 0);
        leg.name = x < 0 ? "legLeft" : "legRight";
      }
      const hair = this.mesh(
        new THREE.ConeGeometry(0.29, 0.4, 5),
        0x20343f,
        group,
      );
      hair.position.y = 1.92;
      const shoulders = this.mesh(
        new THREE.BoxGeometry(0.9, 0.2, 0.35),
        0xa6ac8b,
        group,
      );
      shoulders.position.y = 1.23;
      const cape = this.mesh(new THREE.ConeGeometry(0.52, 1, 4), color, group);
      cape.position.set(0, 0.85, 0.15);
      cape.scale.z = 0.4;
      const weapon = new THREE.Group();
      weapon.position.set(0.5, 1, 0);
      weapon.rotation.z = -0.3;
      group.add(weapon);
      const rod = this.mesh(this.geos.staff, 0xcbb67b, weapon);
      rod.position.y = 0.3;
      let tip;
      if ([1, 5, 9].includes(a.hero)) {
        tip = this.mesh(
          new THREE.BoxGeometry(0.65, 0.4, 0.4),
          0x9ba9a2,
          weapon,
        );
      } else if ([2, 8].includes(a.hero)) {
        tip = this.mesh(
          new THREE.TorusGeometry(0.3, 0.055, 4, 10, Math.PI),
          color,
          weapon,
        );
        tip.rotation.z = Math.PI / 2;
      } else tip = this.mesh(new THREE.OctahedronGeometry(0.21), color, weapon);
      tip.position.y = 1.05;
      tip.material = this.mat(color, true);
      const halo = this.mesh(
        this.geos.ring,
        a.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? 0xd8b7ff : 0x9560ff,
        group,
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.09;
      halo.material = this.mat(color, true);
    } else {
      group.scale.setScalar(a.kind === "boss" ? 3.4 : a.tier ? 1.5 : 1);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.65;
      head.position.set(0, 0.7, -0.6);
      const horn = this.mesh(
        new THREE.ConeGeometry(0.14, 0.5, 4),
        0xdfc9a3,
        group,
      );
      horn.position.set(0, 1.05, -0.6);
    }
    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x17272c, depthTest: false }),
    );
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.065),
      new THREE.MeshBasicMaterial({
        color: a.team === 0 ? 0x81e5b1 : hero ? 0xf1817e : 0xdeb969,
        depthTest: false,
      }),
    );
    bar.position.z = 0.01;
    barBg.add(bar);
    barBg.position.y = 2.35;
    group.add(barBg);
    this.dynamic.add(group);
    if (hero && a.costume) {
      body.material = this.mat(
        new THREE.Color(color)
          .offsetHSL(a.costume * 0.08, 0.05, -0.08)
          .getHex(),
      );
    }
    if (hero) adorn(this, group, a);
    const model = { group, body, barBg, bar };
    this.models.set(a.id, model);
    return model;
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  screenToWorld(clientX, clientY) {
    this.ray.setFromCamera(
      new THREE.Vector2(
        (clientX / innerWidth) * 2 - 1,
        (-clientY / innerHeight) * 2 + 1,
      ),
      this.camera,
    );
    const v = new THREE.Vector3();
    this.ray.ray.intersectPlane(this.plane, v);
    return { x: v.x, z: v.z };
  }
  render(match, dt, hubHero = 0, appearance = {}) {
    this.clock += dt;
    const player = match?.player ?? { x: 0, z: 0 };
    const target = new THREE.Vector3(player.x, 0, player.z);
    this.focus.lerp(target, 1 - Math.exp(-dt * 8));
    const dist = match ? 31 : 22;
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
    this.camera.lookAt(this.focus.x, match ? 0.9 : 2.6, this.focus.z);
    this.sun.position.set(this.focus.x - 20, 35, this.focus.z + 10);
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
        `${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}`
      ) {
        this.dynamic.remove(this.preview);
        this.models.delete("preview");
        this.preview = null;
        this.previewHero = `${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}`;
        this.render(null, 0, hubHero, appearance);
        return;
      }
      this.preview.visible = true;
      this.preview.rotation.y = Math.sin(this.clock * 0.3) * 0.3;
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
        if (!model) model = this.character(a);
        const g = model.group;
        g.visible = !(match.visible && !match.visible(player, a));
        animateRig(g, a, this.clock, dt);
        g.position.set(
          a.x,
          (Math.hypot(a.x, a.z) < 14 ? 0.83 : 0.08) +
            Math.sin(this.clock * 5 + a.id) * 0.025,
          a.z,
        );
        g.rotation.y = Math.atan2(a.dir.x, a.dir.z);
        if (a.kind === "hero" && a.downedUntil) g.rotation.z = 0.9;
        else g.rotation.z = 0;
        const max = match.getStats(a).hp;
        model.bar.scale.x = Math.max(0.001, a.hp / max);
        model.bar.position.x = -(1 - a.hp / max) * 0.625;
        model.barBg.quaternion.copy(this.camera.quaternion);
        model.body.material = this.mat(
          a.immuneCC > match.time
            ? 0xffd75f
            : a.kind === "hero"
              ? costumeColor(a.hero, a.costume)
              : a.kind === "boss"
                ? 0xc4a87c
                : a.mutant
                  ? 0xf27292
                  : a.tier
                    ? 0xb3a171
                    : 0x91a89b,
        );
      }
      for (const z of match.zones)
        if (!z.delayed && !this.effectMeshes.has("z" + z.id)) {
          let ring = this.ring(
            HEROES[z.owner.hero]?.color ?? 0xffaa77,
            z.sk.radius,
          );
          ring.position.set(z.point.x, 0.11, z.point.z);
          this.scene.add(ring);
          this.effectMeshes.set("z" + z.id, { mesh: ring, end: z.end });
        }
      for (const e of match.effects)
        if (!this.effectMeshes.has(e.id)) {
          this.spawnParticles(e);
          let ring = this.ring(e.color, Math.max(0.4, e.radius));
          ring.position.set(e.x, 0.13, e.z);
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
              if (child.isMesh && !shared.has(child.geometry))
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
        this.targetRing.position.set(c.gate.x, 0.18, c.gate.z);
      } else if (!this.aiming) this.targetRing.visible = false;
    }
    this.animateParticles(dt);
    this.renderer.render(this.scene, this.camera);
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
      model.position.set(gate.x, 0.13, gate.z);
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
      mesh.position.set(p.x, 1.05, p.z);
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
      g.position.set(d.x, 0.7 + Math.sin(this.clock * 2 + d.id) * 0.15, d.z);
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
        y: 0.4,
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
      d.position.set(p.x, Math.max(0.1, p.y), p.z);
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
    group.position.set(a.x, 0.19, a.z);
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
