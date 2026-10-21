import {getCharacterEnvironment} from './character-fidelity.js';
import * as THREE from "three";
import{loadTerrainTextureSet}from"./terrain-assets.js";
import{installTerrainTextureProvider}from"./environment-pbr.js";
import{GpuFrameTimer}from"./gpu-frame-timer.js";
import{warmSceneMaterials}from"./shader-warmup.js";
import{batchStaticSanctuary}from"./static-batching.js";
import {AdaptiveResolution,nextPaint,renderPixelRatio} from "./runtime-performance.js";
import {pooledGeometry} from "./geometry-pool.js";
import { disposeManualH01,configureManualH01,replayManualH01Entrance,seekManualH01Entrance,usesManualHero } from "./manual-hero.js";
import { releaseManualAssets } from "./manual-asset-cache.js";
import { ensureBakedCharacter } from "./baked-character-pbr.js";
import { perfBeginAppearance } from "./perf-debug.js";
import { configureGpuTextures } from "./gpu-textures.js";
import { prepareEnvironmentAssets } from "./environment-assets.js";
import {configureBakedCharacterEnvironment} from "./character-fidelity.js";
import { createCharacterStudio } from "./character-fidelity.js";
import { HEROES, REGIONS } from "./data.js";
import {
  visualTemplate,
  animateVisual,
  terrainHeight,
  groundHeight,
  projectGround,
  roundedBlock,
  proceduralMaps,
} from "./art.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { MAP_BUSHES, NAV_OBSTACLES } from "./systems.js";
import { createDeferredScenery, createPortal, updatePortal } from "./scenery.js";
import { SkillIndicatorRenderer } from "./skill-indicators.js";
import { characterPBR } from "./character-pbr.js";
import { disposeSoulRingVisuals } from "./soul-ring-vfx.js";
import {
  createElementalEffect,
  updateElementalEffect,
  disposeElementalEffect,
  prewarmElementalVfx,
} from "./environment-vfx.js";
export class World {
  static async create(canvas){
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
    configureGpuTextures(renderer);installTerrainTextureProvider(loadTerrainTextureSet);
    await prepareEnvironmentAssets();await configureBakedCharacterEnvironment(renderer);await nextPaint();
    const world=new World(canvas,{renderer});
    world.batching=await batchStaticSanctuary(world.scenery.sanctuary);
    world.warmupTasks=await warmSceneMaterials(renderer,world.scenery.sanctuary,world.camera,world.scene);
    return world;
  }
  constructor(canvas,options={}) {
    this.renderer = options.renderer??new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.quality = localStorage.getItem("hon-gioi-quality") || "balanced";
    this.currentMatchMode=null;
    this.renderer.setPixelRatio(renderPixelRatio(devicePixelRatio,this.quality,false));
    this.renderer.shadowMap.enabled = this.quality === "ultra";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.scene = new THREE.Scene();
    this.scene.environment=getCharacterEnvironment(this.renderer);
    this.scene.background = new THREE.Color(0x102b32);
    this.scene.fog = new THREE.FogExp2(0x1f3b40, 0.011);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 700);
    this.camera.position.set(17, 27, 23);
    this.camera.layers.enable(2);
    this.characterStudio=createCharacterStudio();this.scene.add(this.characterStudio);
    this.focus = new THREE.Vector3();
    this.clock = 0;this.gpuTimer=new GpuFrameTimer(this.renderer);
    this.models = new Map();this.actorIds=new Set();
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
    this.mapAmbient = new THREE.HemisphereLight(0xd6fcf1, 0x31444f, 2.4);
    this.scene.add(this.mapAmbient);
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
    this.mapRim = rim;
    this.scene.add(rim);
    this.environment();
    this.composer=null;this.bloom=null;
    if(this.quality==='ultra')this.ensureComposer();
    this.resolution=new AdaptiveResolution({max:Math.min(devicePixelRatio,this.quality==="ultra"?1.5:1.25),apply:ratio=>{this.renderer.setPixelRatio(ratio);this.resize();}});
    this._v1=new THREE.Vector3();this._v2=new THREE.Vector3();this._v3=new THREE.Vector3();this._ndc=new THREE.Vector2();
    this._frustum=new THREE.Frustum();this._cameraMatrix=new THREE.Matrix4();this._actorSphere=new THREE.Sphere(new THREE.Vector3(),3);
    this._instance=new THREE.Object3D();this._instanceColor=new THREE.Color();
    this.projectileMesh=new THREE.InstancedMesh(pooledGeometry('OctahedronGeometry',.16),new THREE.MeshBasicMaterial({color:0xffffff}),128);
    this.dropMesh=new THREE.InstancedMesh(pooledGeometry('OctahedronGeometry',.28),new THREE.MeshBasicMaterial({color:0xe3bf76}),128);
    for(const mesh of [this.projectileMesh,this.dropMesh]){mesh.count=0;mesh.frustumCulled=false;this.dynamic.add(mesh);}
    this.pooledRender={projectileCapacity:128,dropCapacity:128,projectileCount:0,dropCount:0,cosmeticsSkipped:0};
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
      pooledGeometry("RingGeometry",.94,1,32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(r);m.position.y = 0.06;
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
    this.scenery = createDeferredScenery({
      renderer: this.renderer,
      quality: this.quality,
      textureSize:this.quality==="ultra"?2048:1024,runtimeTextureBudget:true,
    });
    this.scene.add(this.scenery.battlefield, this.scenery.sanctuary);
    for(const light of [this.scenery.sanctuary.userData.sanctuary.key,this.scenery.sanctuary.userData.sanctuary.rim,this.scenery.sanctuary.userData.sanctuary.fill,this.scenery.sanctuary.userData.sanctuary.under])light.visible=false;
    this.sun.visible=this.mapRim.visible=this.mapAmbient.visible=false;
    this.scenery.sanctuary.userData.sanctuary.key.castShadow=this.quality==="ultra";
    this.markerMeshes = this.scenery.markerMeshes;
    this.obstacles = structuredClone(NAV_OBSTACLES);
    this.showcaseView = "full";
    this.showcaseYaw = Math.PI;
  }
  seekHeroEntrance(seconds) {
    this.preview?.traverse(node=>{if(node.userData.manualHunyuan)seekManualH01Entrance(node,seconds);});
  }
  replayHeroEntrance() {
    let asset;this.preview?.traverse(n=>{if(n.userData.manualHunyuan)asset=n.userData.manualAsset;});
    if(asset?.status==='failed'){
      const model=this.models.get('preview');this.releaseModelRings(model);this.dynamic.remove(model.group);this.models.delete('preview');this.preview=null;return;
    }
    this.preview?.traverse(node=>{if(node.userData.manualHunyuan)replayManualH01Entrance(node);});
  }
  async prepareBattlefield(appearance={hero:0,skin:0,costume:0,rings:[]}) {
    this.loadingBattlefield=true;const epoch=this.prepareEpoch=(this.prepareEpoch??0)+1;const check=()=>{if(epoch!==this.prepareEpoch)throw Error("Đã hủy tải chiến trường");};
    await this.scenery.prepare();check();await nextPaint();prewarmElementalVfx(this.quality);
    const saved=[this.scenery.sanctuary.visible,this.scenery.battlefield.visible,this.characterStudio.visible,this.sun.visible,this.mapRim.visible,this.mapAmbient.visible,this.weaponLight.visible];
    this.scenery.sanctuary.visible=false;this.scenery.battlefield.visible=true;this.characterStudio.visible=false;
    this.sun.visible=this.mapRim.visible=this.mapAmbient.visible=true;this.weaponLight.visible=this.quality==='ultra';
    try{
      await warmSceneMaterials(this.renderer,this.scenery.battlefield,this.camera,this.scene);
      check();for(let hero=1;hero<12;hero++){check();const templateActor={id:'prewarm',kind:'hero',hero,skin:0,costume:0,rings:[]};if(!usesManualHero(templateActor))visualTemplate(templateActor,'low');await nextPaint();}
      const actor={...appearance,id:'prewarm',kind:'hero',team:0},detail=usesManualHero(actor)?'high':'medium';
      const visual=visualTemplate(actor,detail);configureManualH01(visual,this.renderer,this.scene,this.camera);
      if(visual.userData.manualHunyuan){
        const started=performance.now();while(!['loaded','failed'].includes(visual.userData.manualAsset.status)){if(epoch!==this.prepareEpoch){disposeManualH01(visual);throw Error('Đã hủy tải nhân vật');}if(performance.now()-started>45000){disposeManualH01(visual);throw Error('Không chuẩn bị được nhân vật xuất chiến');}await nextPaint();}
        if(visual.userData.manualAsset.status==='failed')throw Error(visual.userData.manualAsset.error);
      }else await warmSceneMaterials(this.renderer,visual,this.camera,this.scene);
      if(epoch!==this.prepareEpoch){disposeSoulRingVisuals(visual);disposeManualH01(visual);check();}
      this.preparedPlayerVisual={visual,detail,key:this.appearanceKey(actor)};
    }finally{
      if(epoch===this.prepareEpoch)this.loadingBattlefield=false;
      [this.scenery.sanctuary.visible,this.scenery.battlefield.visible,this.characterStudio.visible,this.sun.visible,this.mapRim.visible,this.mapAmbient.visible,this.weaponLight.visible]=saved;
    }
  }
  releaseBattlefield(){this.loadingBattlefield=false;this.prepareEpoch=(this.prepareEpoch??0)+1;if(this.preparedPlayerVisual){disposeSoulRingVisuals(this.preparedPlayerVisual.visual);disposeManualH01(this.preparedPlayerVisual.visual);this.preparedPlayerVisual=null;}this.scenery.release();this.renderer.renderLists.dispose();}
  ensureComposer(){
    if(this.composer)return;this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.35,.5,1.05);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  }

  setShowcaseView(value) {
    if (!["face", "full"].includes(value)) throw Error("Góc sảnh không hợp lệ");
    this.showcaseView = value;
    if (this.preview)
      this.syncPortraitEquipment(this.preview, value === "face");
  }
  syncPortraitEquipment(group, faceView) {
    this.portraitEquipmentVisibility ??= new WeakMap();
    group.traverse((node) => {
      const equipment =
        node.name === "soulWeapon" || node.name === "Staff_Root" || node.name === "Hammer_Root" ||
        (node.userData.proceduralMasterwork === true &&
          typeof node.userData.weaponType === "string");
      if (!equipment) return;
      if (faceView) {
        if (!this.portraitEquipmentVisibility.has(node))
          this.portraitEquipmentVisibility.set(node, node.visible);
        node.visible = false;
      } else if (this.portraitEquipmentVisibility.has(node)) {
        node.visible = this.portraitEquipmentVisibility.get(node);
        this.portraitEquipmentVisibility.delete(node);
      }
    });
  }
  rotateShowcase(delta) {
    if (Number.isFinite(delta)) this.showcaseYaw += delta;
  }
  addDetail(model, a, detail) {
    if(usesManualHero(a))detail="high";
    if (model.details.has(detail)||(detail==="medium"&&model.details.has("mobile"))) return;
    let visual;
    if(a.id===this.localPlayerId&&this.preparedPlayerVisual?.key===this.appearanceKey(a)&&detail===this.preparedPlayerVisual.detail){visual=this.preparedPlayerVisual.visual;this.preparedPlayerVisual=null;}else visual=visualTemplate(a,detail);if(a.id==='preview')perfBeginAppearance('hero:'+a.hero+':'+detail);
    if(visual.userData.manualHunyuan)configureManualH01(visual,this.renderer,this.scene,this.camera);
    model.details.add(detail);
    model.lod.addLevel(
      visual,
      detail === "high" || detail === "mobile" ? 0 : detail === "medium" ? 28 : 48,
    );
  }

  appearanceKey(a) {
    return [
      a.kind,
      a.hero,
      a.skin ?? 0,
      a.costume ?? 0,
      a.mutant ?? false,
      a.tier ?? 0,
      a.kind==="beast"?(a.species??Number(a.id)%4):0,
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
    this.addDetail(model, a, a.id===this.localPlayerId&&this.preparedPlayerVisual?.key===this.appearanceKey(a)?this.preparedPlayerVisual.detail:a.id === "preview" ? (usesManualHero(a) ? (this.quality==="ultra"?"high":"mobile") : "medium") : (usesManualHero(a)&&a.id===this.localPlayerId?"mobile":"low"));
    return model;
  }
  setConcealment(model, active) {
    const revision = model.lod.levels.reduce((n, level) => n + (level.object.userData.modelLoadRevision ?? 0), 0);
    if (
      model.concealment === active &&
      model.concealmentDetails === model.details.size && model.concealmentRevision === revision
    )
      return;
    model.concealmentRevision = revision;
    model.concealment = active;
    model.concealmentDetails = model.details.size;
    model.lod.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.ownConcealmentMaterial) {
        if (!active) return;
        if (!o.userData.soulRing) o.material = o.material.clone();
        o.userData.ownConcealmentMaterial = true;
        o.userData.baseOpacity = o.material.opacity;
        o.userData.baseTransparent = o.material.transparent;
      }
      o.material.transparent = active || o.userData.baseTransparent;
      o.material.opacity = active
        ? o.userData.baseOpacity * 0.6
        : o.userData.baseOpacity;
      o.material.needsUpdate = true;
    });
  }
  releaseModelRings(model) {
    if(!model||model.released)return;model.released=true;
    releaseManualAssets(model.lod);
    for(const mesh of [model.bar,model.barBg]){mesh?.geometry.dispose();mesh?.material.dispose();}
    model.lod.traverse(node=>{if(node.userData.ownConcealmentMaterial&&!node.userData.soulRing)node.material?.dispose();});
    for (const level of model.lod.levels) {
      disposeSoulRingVisuals(level.object);
      disposeManualH01(level.object);
      level.object.traverse(node=>{if(node.userData.hunyuanStaff){node.userData.disposed=true;releaseManualAssets(node);}});
    }
  }
  setQuality(value) {
    if (!["balanced", "ultra"].includes(value))
      throw Error("Chất lượng không hợp lệ");
    this.scenery?.setQuality(value);
    this.quality = value;
    const textures = value === "ultra" ? proceduralMaps() : null;
    this.renderer.shadowMap.enabled=value==="ultra";
    if(value==="ultra")this.ensureComposer();else if(this.composer){this.composer.passes.forEach(p=>p.dispose?.());this.composer.dispose();this.composer=null;this.bloom=null;}
    const lobbyKey=this.scenery.sanctuary.userData.sanctuary.key;lobbyKey.castShadow=value==="ultra";
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
    const active=!!this.currentMatchMode,cap=renderPixelRatio(devicePixelRatio,this.quality,true);
    const target=renderPixelRatio(devicePixelRatio,this.quality,active);
    this.renderer.setPixelRatio(target);
    this.resolution.max=active?cap:devicePixelRatio;this.resolution.min=active?Math.min(.8,cap):devicePixelRatio;this.resolution.ratio=target;
    this.resize();
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h,false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
  }
  screenToWorld(clientX, clientY) {
    this.ray.setFromCamera(
      this._ndc.set((clientX/innerWidth)*2-1,(-clientY/innerHeight)*2+1),
      this.camera,
    );
    const v = projectGround(this.ray.ray) ?? this.focus;
    return { x: v.x, z: v.z };
  }
  render(match, dt, hubHero = 0, appearance = {}) {
    if(this.loadingBattlefield)return;
    const matchActive=!!match;
    if(this.currentMatchMode!==matchActive){
      this.currentMatchMode=matchActive;
      const cap=renderPixelRatio(devicePixelRatio,this.quality,true),target=renderPixelRatio(devicePixelRatio,this.quality,matchActive);
      this.renderer.setPixelRatio(target);this.resize();
      this.resolution.max=matchActive?cap:devicePixelRatio;this.resolution.min=matchActive?Math.min(.8,cap):devicePixelRatio;this.resolution.ratio=target;
    }
    this.clock += dt;
    this.characterStudio.visible=!match;
    this.renderer.toneMappingExposure=1;
    this.scenery.update(this.clock, match);
    this.sun.visible = this.mapRim.visible = this.mapAmbient.visible = !!match;
    this.scene.background.setHex(match ? 0x142d36 : 0x6a8da1);
    this.scene.fog.color.setHex(match ? 0x1f3b40 : 0x8baabb);
    this.scene.fog.density = match ? 0.011 : 0;
    const player = match?.player ?? { x: 0, z: 0 };this.localPlayerId=match?.player.id;
    const target = this._v1.set(player.x,match?groundHeight(player.x,player.z):0,player.z);
    this.focus.lerp(target, 1 - Math.exp(-dt * 8));
    const dist = match ? (this.quality === "ultra" ? 16 : 18) : 10.5;
    const elevation = (48 * Math.PI) / 180;
    if(match) this.camera.position
      .copy(this.focus)
      .add(
        this._v2.set(
          dist * Math.cos(elevation) * 0.477,
          dist * Math.sin(elevation),
          dist * Math.cos(elevation) * 0.879,
        ),
      );
    if (match) this.camera.position.y += 0.9;
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
        const pending=usesManualHero({hero:hubHero,...appearance,kind:'hero'})?null:ensureBakedCharacter({hero:hubHero,...appearance},'medium');
        this.loadingCharacter=!!pending&&pending.status==='loading';
        if(this.loadingCharacter){this.renderer.render(this.scene,this.camera);return;}

        this.previewHero=`${hubHero}:${appearance.skin??0}:${appearance.costume??0}:${appearance.rings?.some(id=>[6,8,9,12].includes(id))?'black':'purple'}`;
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
        this.releaseModelRings(this.models.get("preview"));
        this.dynamic.remove(this.preview);
        this.models.delete("preview");
        this.preview = null;
        this.previewHero = `${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}:${appearance.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple"}`;
        this.render(null, 0, hubHero, appearance);
        return;
      }
      this.preview.visible = true;
      this.preview.rotation.y = this.showcaseYaw;
      this.preview.position.set(0, 0.74, 0);
      const previewModel = this.models.get("preview"),
        visual = previewModel.lod.levels[0]?.object;
      visual?.traverse(node=>{if(node.userData.manualHunyuan)node.userData.previewAnimation=!!this.showcaseAnimationMode;});
      const heroHeight =
        (visual?.userData.height ??
          visual?.userData.anatomy?.heightMeters ??
          1.82) * 2.4;
      for (const level of previewModel.lod.levels)
        animateVisual(
          level.object,
          {
            id: "preview",
            kind: "hero",
            hero: hubHero,
            ...appearance,
            x: 0,
            z: 0,
            dir: { x: 0, z: -1 },
            cooldowns: [],
          },
          this.clock,
          dt,
        );
      const faceView = this.showcaseView === "face";
      const look=this._v1.set(0,.74+heroHeight*(faceView?.92:.53),0);
      const head=visual?.getObjectByName('Head');
      if(faceView&&head){head.getWorldPosition(look);look.y=Math.max(.74+heroHeight*.18,look.y+.24);}
      const entrance=visual?.userData.manualAsset?.entrance;
      const wideEntrance=!faceView&&entrance&&!entrance.complete&&entrance.time<(visual?.userData.manualH02?2.9:2.65);
      this.syncPortraitEquipment(this.preview, faceView);
      const cameraTarget=this._v2.copy(look).add(this._v3.set(0,faceView?.03:wideEntrance?1.0:.7,faceView?2.6:wideEntrance?12.3:10.5));
      if(!this.portraitCameraInitialized){this.camera.position.copy(cameraTarget);this.portraitLook=look.clone();this.portraitCameraInitialized=true;}
      else this.camera.position.lerp(cameraTarget,1-Math.exp(-12*dt));
      this.portraitLook.lerp(look,1-Math.exp(-12*dt));
      this.camera.lookAt(this.portraitLook);
      this.camera.position.y+=visual?.userData.manualAsset?.cameraShake??0;
      this.scenery.sanctuary.userData.sanctuary.rim.color.setHex(
        HEROES[hubHero].color,
      );
      for (const [id, model] of this.models)
        if (id !== "preview")
          model.group.visible =
            typeof id === "string" && id.startsWith("legend-");
      for (const e of this.effectMeshes.values()) e.mesh.visible = false;
      this.particleMesh.visible = false;
      if (this.pet) this.pet.visible = false;
      this.fogRegions?.forEach((m) => (m.visible = false));
      this.realmMarkers?.forEach((m) => (m.visible = false));
    } else {
      this.particleMesh.visible = true;
      this.camera.updateMatrixWorld();this._frustum.setFromProjectionMatrix(this._cameraMatrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
      if (this.preview) this.preview.visible = false;
      const actorIds=this.actorIds;actorIds.clear();for(const actor of match.actors)actorIds.add(actor.id);
      // An authoritative snapshot can remove an actor immediately when it
      // leaves visibility; retain its cached geometry, never its last image.
      for (const [id, model] of this.models)
        if (typeof id === "number" && !actorIds.has(id))
          model.group.visible = false;
      for (const a of match.actors) {
        let model = this.models.get(a.id);
        if (
          !a.alive ||
          a.extracted ||
          (a.x-player.x)**2+(a.z-player.z)**2>1600
        ) {
          if (model) model.group.visible = false;
          continue;
        }
        this._actorSphere.center.set(a.x,groundHeight(a.x,a.z)+1,a.z);
        if(a!==player&&!this._frustum.intersectsSphere(this._actorSphere)){if(model)model.group.visible=false;continue;}
        if (model && model.appearanceKey !== this.appearanceKey(a)) {
          this.releaseModelRings(model);
          this.dynamic.remove(model.group);
          this.models.delete(a.id);
          model = null;
        }
        if (!model) model = this.character(a);
        const g = model.group;
        g.visible = !(match.visible && !match.visible(player, a));
        if (!g.visible) continue;
        const inGrass = (match.bushes ?? MAP_BUSHES).some(
          (b) => Math.hypot(a.x - b.x, a.z - b.z) < b.r,
        );
        this.setConcealment(model, a === player && inGrass);
        if (
          this.camera.position.distanceTo(
            this._v1.set(a.x, groundHeight(a.x, a.z), a.z),
          ) < (a===player?48:18)
        )
          this.addDetail(model, a, "medium");
        if (
          this.quality === "ultra" &&
          (a === player || a.kind === "boss") &&
          this.camera.position.distanceTo(
            this._v1.set(a.x, groundHeight(a.x, a.z), a.z),
          ) < 28
        )
          this.addDetail(model, a, "high");
        model.lod.update(this.camera);
        for (const level of model.lod.levels)
          if(level.object.visible)animateVisual(level.object, a, this.clock, dt);
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
        if (
          !z.delayed &&
          (z.realm ?? z.owner.realm ?? 0) === (player.realm ?? 0) &&
          !this.effectMeshes.has("z" + z.id)
        ) {
          const woodZone = z.owner.hero === 0;
          let ring = woodZone ? createElementalEffect({ element: 'wood', skill: z.k,
            color: HEROES[0].color, radius: z.sk.radius, duration: z.end - match.time,
            quality: this.quality, seed: z.id }) : this.ring(
            HEROES[z.owner.hero]?.color ?? 0xffaa77, z.sk.radius);
          if (!ring) continue;
          ring.position.set(
            z.point.x,
            groundHeight(z.point.x, z.point.z) + 0.03,
            z.point.z,
          );
          this.scene.add(ring);
          this.effectMeshes.set("z" + z.id, {
            mesh: ring,
            elemental: woodZone,
            born: match.time,
            end: z.end,
            realm: z.realm ?? z.owner.realm ?? 0,
          });
        }
      for (const e of match.effects)
        if (
          (e.realm ?? 0) === (player.realm ?? 0) &&
          !this.effectMeshes.has(e.id)
        ) {
          const wood = e.visual?.hero === 0 ? e.visual : null;
          const directional = wood && [0, 4].includes(wood.skill);
          const effect = createElementalEffect({
            element: wood ? 'wood' : undefined,
            skill: wood?.skill,
            direction: wood?.direction,
            color: e.color,
            radius: directional ? wood.range : Math.max(0.4, e.radius),
            duration: e.end - e.born,
            quality: this.quality,
            x: directional ? wood.origin.x : e.x,
            y: groundHeight(e.x, e.z) + 0.06,
            z: directional ? wood.origin.z : e.z,
            seed: e.id,
          });
          if (!effect) continue;
          this.scene.add(effect);
          this.effectMeshes.set(e.id, {
            mesh: effect,
            elemental: true,
            end: e.end,
            born: e.born,
            animated: true,
            realm: e.realm ?? 0,
          });
        }
      for (const [key, e] of this.effectMeshes) {
        e.mesh.visible = (e.realm ?? 0) === (player.realm ?? 0);
        if (e.end <= match.time) {
          this.scene.remove(e.mesh);
          if (e.elemental) disposeElementalEffect(e.mesh);
          else {
            if(!e.mesh.geometry?.userData.sharedArt)e.mesh.geometry?.dispose();
            e.mesh.material?.dispose();
          }
          this.effectMeshes.delete(key);
        } else if (e.elemental) {
          updateElementalEffect(e.mesh, match.time - e.born);
          e.mesh.visible = (e.realm ?? 0) === (player.realm ?? 0);
        } else if (e.animated) {
          const scale = 0.45 + (match.time - e.born) * 1.8;
          e.mesh.scale.setScalar(scale);
          e.mesh.material.opacity = Math.max(0, (e.end - match.time) * 1.2);
        }
      }
      if (Math.floor(this.clock) % 2 === 0) {
        for (const [id, model] of this.models)
          if (typeof id === "number" && !actorIds.has(id)) {
            this.releaseModelRings(model);
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
      this.markerMeshes.forEach(
        ({ group }) => (group.visible = (player.realm ?? 0) === 0),
      );
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
    if (match?.player) {
      const local = this.models.get(match.player.id)?.group;
      if (local) characterPBR.prepare(local, "high");
    }
    this.animateParticles(dt);
    if (this.aimContext?.match === match && match) {
      const context = this.aimContext;
      const actor =
        context.actor.id === match.player.id ? match.player : context.actor;
      this.aim(actor, context.skill, context.dir, context.canceled, match);
    }
    const lit = match?.player ?? { x: 0, z: 0 };
    this.weaponLight.position.set(
      lit.x + 0.5,
      groundHeight(lit.x, lit.z) + 1.2,
      lit.z,
    );
    this.weaponLight.visible = !!match && this.quality === "ultra";
    this.projectileMesh.visible=this.dropMesh.visible=!!match;
    this.gpuTimer.begin();
    try{if(match&&this.quality==='ultra')this.composer.render();else this.renderer.render(this.scene,this.camera);}
    finally{this.gpuTimer.end();}

  }
  samplePerformance(frameMs){this.gpuTimer.poll();}
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
    this.fogRegions.forEach((m, i) => {
      m.visible = match.player.realm !== 1;
      m.material.opacity =
        match.time > 480 + i * 100
          ? 0.12 + Math.sin(this.clock * 0.8 + i) * 0.025
          : 0;
    });
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
        this.releaseModelRings(old);
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
    const channelGate = match.player.channel?.gate;
    const grace = (gate) =>
      channelGate &&
      Math.hypot(channelGate.x - gate.x, channelGate.z - gate.z) < 0.1;
    const liveGates = [...match.gates];
    if (channelGate && !liveGates.some(grace)) liveGates.push(channelGate);
    for (const marker of this.markerMeshes) {
      if (marker.p.type !== "gate") continue;
      const p = marker.p;
      const active = liveGates.some(
        (g) =>
          Math.hypot(g.x - p.x, g.z - p.z) < 1 &&
          (g.end > match.time || grace(g)),
      );
      const central = Math.hypot(p.x, p.z) < 20;
      const starts = central ? [1200] : [300, 600, 900];
      const warning = starts.some(
        (t) => match.time >= t - 60 && match.time < t,
      );
      marker.group.visible = (match.player.realm ?? 0) === 0;
      updatePortal(
        marker.group,
        active ? "open" : warning ? "warning" : "closed",
        this.clock,
      );
    }
    const keys = new Set();
    for (const gate of liveGates) {
      if (gate.end <= match.time && !grace(gate)) continue;
      if (
        this.markerMeshes.some(
          (m) =>
            m.p.type === "gate" &&
            Math.hypot(m.p.x - gate.x, m.p.z - gate.z) < 1,
        )
      )
        continue;
      const key = `${gate.x},${gate.z}`;
      keys.add(key);
      let model = this.activeGateModels.get(key);
      if (!model) {
        model = createPortal();
        this.scenery.battlefield.add(model);
        this.activeGateModels.set(key, model);
      }
      model.position.set(gate.x, groundHeight(gate.x, gate.z) + 0.05, gate.z);
      model.visible = (match.player.realm ?? 0) === (gate.realm ?? 0);
      updatePortal(model, "open", this.clock);
    }
    for (const [key, model] of this.activeGateModels)
      if (!keys.has(key)) {
        this.scenery.battlefield.remove(model);
        model.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
            o.material.dispose();
          }
        });
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
    this.pet.position.set(
      pet.x,
      groundHeight(pet.x, pet.z) + 1.05 + Math.sin(this.clock * 4) * 0.15,
      pet.z,
    );
    this.pet.rotation.y = this.clock;
  }
  renderProjectiles(match) {
    let count=0;const mesh=this.projectileMesh,dummy=this._instance;
    for(const p of match.projectiles){
      if((p.realm??p.owner.realm??0)!==(match.player.realm??0)||(p.x-match.player.x)**2+(p.z-match.player.z)**2>1600)continue;
      if(count>=128){this.pooledRender.cosmeticsSkipped++;continue;}
      dummy.position.set(p.x,groundHeight(p.x,p.z)+1,p.z);dummy.rotation.set(0,Math.atan2(p.dir.x,p.dir.z),0);dummy.scale.set(1,1,2.8);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);
      mesh.setColorAt(count,this._instanceColor.setHex(HEROES[p.owner.hero]?.color??0xffffff));count++;
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.pooledRender.projectileCount=count;
  }
  renderDrops(match) {
    let count=0;const mesh=this.dropMesh,dummy=this._instance;
    for(const d of match.drops){
      if((d.realm??0)!==(match.player.realm??0)||(d.x-match.player.x)**2+(d.z-match.player.z)**2>1225)continue;
      if(count>=128){this.pooledRender.cosmeticsSkipped++;continue;}
      dummy.position.set(d.x,groundHeight(d.x,d.z)+.6+Math.sin(this.clock*2+d.id)*.15,d.z);dummy.rotation.set(0,this.clock,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(count++,dummy.matrix);
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;this.pooledRender.dropCount=count;
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
    this.aimContext = null;
    if (this.guidePainter) {
      this.guidePainter.dispose();
      this.guidePainter = null;
    } else if (this.aimGuide) {
      this.scene.remove(this.aimGuide);
      this.aimGuide.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.aimGuide = null;
  }
  aim(actor, skill, dir = null, canceled = false, match = null) {
    const key = `${skill.shape}:${skill.range}:${skill.radius ?? 1}`;
    if (!this.guidePainter || this.aimGuide?.userData.skillKey !== key) {
      this.clearAim();
      this.guidePainter = new SkillIndicatorRenderer(this.scene, skill);
      this.aimGuide = this.guidePainter.group;
    }
    this.aiming = true;
    this.aimContext = { actor, skill, dir, canceled, match };
    this.targetRing.visible = false;
    this.guidePainter.update(
      actor,
      skill,
      dir,
      canceled,
      match,
      this.clock ?? 0,
    );
  }
  actorScreenPosition(actor, offset = 2) {
    const point = this._v1.set(actor.x,groundHeight(actor.x, actor.z)+offset,actor.z).project(this.camera);
    return {
      x: (point.x * 0.5 + 0.5) * innerWidth,
      y: (-point.y * 0.5 + 0.5) * innerHeight,
    };
  }

  reset() {
    for(const portal of this.activeGateModels?.values()??[]){portal.removeFromParent();portal.traverse(node=>{if(node.geometry&&!node.geometry.userData.sharedArt)node.geometry.dispose();node.material?.dispose();});}
    this.activeGateModels?.clear();
    for(const mesh of [...(this.fogRegions??[]),...(this.realmMarkers??[])]){mesh.removeFromParent();if(!mesh.geometry.userData.sharedArt)mesh.geometry.dispose();mesh.material.dispose();}
    this.fogRegions=this.realmMarkers=null;
    if(this.pet){this.pet.removeFromParent();if(!this.pet.geometry.userData.sharedArt)this.pet.geometry.dispose();this.pet=null;}
    this.projectileMesh.count=this.dropMesh.count=0;
    this.clearAim();
    this.particles = [];
    if (this.boltModels) {
      for (const m of this.boltModels.values()) {
        this.dynamic.remove(m);
        m.geometry.dispose();
      }
      this.boltModels.clear();
    }
    for (const model of this.models.values()) {
      this.releaseModelRings(model);
      this.dynamic.remove(model.group);
    }
    this.models.clear();
    this.preview = null;
    for (const e of this.effectMeshes.values()) {
      this.scene.remove(e.mesh);
      if (e.elemental) disposeElementalEffect(e.mesh);
      else {
        if(!e.mesh.geometry?.userData.sharedArt)e.mesh.geometry?.dispose();
        e.mesh.material?.dispose();
      }
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
