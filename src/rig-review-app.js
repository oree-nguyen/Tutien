import "./rig-review.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const $ = (id) => document.getElementById(id),
  viewport = $("viewport");
$("build").textContent = "Bản " + import.meta.env.HG_BUILD_ID.slice(0, 8);
$("back").onclick = () =>
  location.replace(import.meta.env.DEV ? "./" : "./startup.html");
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(devicePixelRatio || 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
viewport.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#26323d");
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment(),
  environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff, 0x596578, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 3, 4);
scene.add(light);
const camera = new THREE.PerspectiveCamera(30, 1, 0.001, 30),
  center = new THREE.Vector3();
let model,
  mixer,
  clips = [],
  binds = [],
  height = 1.82,
  epoch = 0,
  playing = false,
  frame = 0,
  last = 0,
  ready = false,
  currentHero = "H01",
  poseName = "bind";
function draw() {
  model?.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function view() {
  const distance = height * 2.5,
    angle = Number($("view").value),
    offset = [
      [0, 0, distance],
      [distance, distance * 0.15, 0],
      [0, distance * 0.23, -distance],
    ][angle];
  camera.position.copy(center).add(new THREE.Vector3(...offset));
  camera.lookAt(center);
  draw();
}
function resize() {
  const r = viewport.getBoundingClientRect();
  renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
  camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
  camera.updateProjectionMatrix();
  view();
}
new ResizeObserver(resize).observe(viewport);
function stop() {
  playing = false;
  cancelAnimationFrame(frame);
  mixer?.stopAllAction();
}
function reset() {
  poseName = "bind";
  stop();
  for (const [node, p, q, s] of binds) {
    node.position.copy(p);
    node.quaternion.copy(q);
    node.scale.copy(s);
  }
  draw();
}
function dispose(root) {
  const geometry = new Set(),
    materials = new Set(),
    textures = new Set(),
    skeletons = new Set();
  root.traverse((n) => {
    if (n.geometry) geometry.add(n.geometry);
    if (n.skeleton) skeletons.add(n.skeleton);
    for (const m of n.material
      ? Array.isArray(n.material)
        ? n.material
        : [n.material]
      : []) {
      materials.add(m);
      for (const value of Object.values(m))
        if (value?.isTexture) textures.add(value);
    }
  });
  geometry.forEach((g) => g.dispose());
  textures.forEach((t) => {
    t.dispose();
    t.source?.data?.close?.();
  });
  materials.forEach((m) => m.dispose());
  skeletons.forEach((s) => s.dispose());
  root.removeFromParent();
}
function selectPart() {
  const value = $("part").value;
  model?.traverse((n) => {
    if (n.isMesh) n.visible = value === "all" || n.name === value;
  });
  draw();
}
function tick(now) {
  if (!playing || document.hidden) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mixer.update(dt);
  draw();
  frame = requestAnimationFrame(tick);
}
async function load() {
  const token = ++epoch;
  $("reload").disabled = true;
  $("hero").disabled = true;
  ready = false;
  reset();
  if (model) {
    dispose(model);
    model = null;
    binds = [];
    clips = [];
    mixer = null;
    renderer.renderLists.dispose();
  }
  const hero = $("hero").value;
  currentHero = hero;
  $("status").textContent = "Đang mở mô hình thử…";
  $("part").disabled = hero !== "H01";
  $("part").value = "all";
  $("held").disabled = hero !== "H01";
  const started = performance.now();
  try {
    const gltf = await new GLTFLoader().loadAsync(
      new URL("models/rig-review/" + hero + ".glb", document.baseURI).href,
    );
    if (token !== epoch) {
      dispose(gltf.scene);
      return;
    }
    model = gltf.scene;
    scene.add(model);
    clips = gltf.animations;
    mixer = new THREE.AnimationMixer(model);
    model.traverse((n) => {
      if (n.isBone)
        binds.push([
          n,
          n.position.clone(),
          n.quaternion.clone(),
          n.scale.clone(),
        ]);
      if (n.isMesh)
        for (const m of Array.isArray(n.material) ? n.material : [n.material])
          for (const value of Object.values(m))
            if (value?.isTexture)
              value.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });
    model.updateMatrixWorld(true);
    model.traverse((node) => {
      if (node.isSkinnedMesh) node.skeleton.update();
    });
    const bounds = new THREE.Box3().setFromObject(model, true);
    bounds.getCenter(center);
    height = bounds.max.y - bounds.min.y;
    $("clip").replaceChildren(
      new Option("Tư thế gốc", "bind"),
      ...clips.map((c) => new Option(c.name, c.name)),
    );
    view();
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    if (token !== epoch) return;
    draw();
    ready = true;
    $("status").textContent =
      "Đã mở " + hero + " · " + Math.round(performance.now() - started) + " ms";
    let triangles = 0,
      meshes = 0;
    model.traverse((n) => {
      if (n.isMesh) {
        meshes++;
        triangles +=
          (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
      }
    });
    $("stats").textContent =
      meshes +
      " mesh · " +
      triangles.toLocaleString("vi-VN") +
      " tam giác · " +
      clips.length +
      " clip. Chưa nghiệm thu biến dạng/tiếp xúc vũ khí.";
  } catch (e) {
    if (token === epoch) {
      $("status").textContent =
        "Không mở được mô hình. Bấm “Tải lại mô hình” để thử lại.";
      console.error("Rig review load failed", e);
    }
  } finally {
    if (token === epoch) {
      $("reload").disabled = false;
      $("hero").disabled = false;
    }
  }
}
$("hero").onchange = load;
$("reload").onclick = load;
$("view").onchange = view;
$("part").onchange = selectPart;
$("clip").onchange = () => {
  reset();
  const clip = clips.find((c) => c.name === $("clip").value);
  if (clip) {
    mixer.clipAction(clip).reset().play();
    playing = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
};
$("held").onclick = async () => {
  try {
    const token = epoch;
    if (currentHero !== "H01" || !model) return;
    const response = await fetch(
      new URL("models/rig-review/H01-held.json", document.baseURI),
    );
    if (!response.ok) throw Error("Missing held pose");
    const pose = await response.json();
    if (token !== epoch) return;
    reset();
    model.traverse((n) => {
      if (pose.rotations[n.name])
        n.quaternion.fromArray(pose.rotations[n.name]);
    });
    $("clip").value = "bind";
    poseName = "held";
    draw();
  } catch (e) {
    $("status").textContent = "Không mở được tư thế nâng tay.";
    console.error(e);
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
  } else if (playing) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
});
window.rigReview = {
  get pose() {
    return poseName;
  },
  get ready() {
    return ready;
  },
  get hero() {
    return currentHero;
  },
  get clips() {
    return clips.map((c) => c.name);
  },
  get model() {
    return model;
  },
  get screenBounds() {
    if (!model) return null;
    const b = new THREE.Box3().setFromObject(model, true),
      corners = [];
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z])
          corners.push(new THREE.Vector3(x, y, z).project(camera).toArray());
    return corners;
  },
  get renderer() {
    return renderer;
  },
};
load();
