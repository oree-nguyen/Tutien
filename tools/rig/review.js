import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const params = new URLSearchParams(location.search);
const hero = params.get("hero") ?? "H02";
const hand = params.get("hand") ?? "R";
const full = params.get("view") === "full";
if (!["H01", "H02"].includes(hero)) throw new Error("Unsupported review hero");
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(1024, 1024);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#26323d");
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff, 0x596578, 2));
const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(2, 3, 4);
scene.add(key);
const gltf = await new GLTFLoader().loadAsync(
  params.has("rigged")
    ? (params.get("candidate") === "reference"
        ? "/.local/rig-candidates/reference/"
        : "/assets/rigged/") +
        hero +
        "-C0-rigged.glb"
    : "/models/hunyuan-original/" + hero + "-C0-source.glb",
);
const model = gltf.scene;
scene.add(model);
const center = new THREE.Vector3(
  (hand === "R" ? -1 : 1) * (hero === "H01" ? 0.565 : 0.53),
  hero === "H01" ? 0.97 : 1.01,
  0.13,
);
const camera = new THREE.PerspectiveCamera(30, 1, 0.001, 20);
model.updateMatrixWorld(true);
model.traverse((node) => {
  if (node.isSkinnedMesh) node.skeleton.update();
});
const bounds = new THREE.Box3().setFromObject(model);
const height = bounds.max.y - bounds.min.y;
if (full) bounds.getCenter(center);
const mixer = new THREE.AnimationMixer(model);
let playing = false;
const binds = new Map();
const bindPositions = new Map();
model.traverse((n) => {
  if (n.isBone) {
    binds.set(n, n.quaternion.clone());
    bindPositions.set(n, n.position.clone());
  }
});
const label = document.querySelector("#label");
function draw() {
  model.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function setView(i) {
  const distance = height * 2.5;
  const offsets = full
    ? [
        [0, 0, distance],
        [(hand === "R" ? -1 : 1) * distance, distance * 0.15, 0],
        [0, distance * 0.23, -distance],
      ]
    : [
        [0, 0, 0.65],
        [(hand === "R" ? -1 : 1) * 0.55, 0.1, 0],
        [0, 0.15, -0.63],
      ];
  camera.position.copy(center).add(new THREE.Vector3(...offsets[i]));
  camera.lookAt(center);
  label.textContent =
    hero +
    " " +
    hand +
    " — " +
    ["front", "side", "back"][i] +
    " · " +
    (params.has("rigged") ? "SOURCE MESH + CANDIDATE RIG" : "SOURCE GLB");
  draw();
}
function bindPose() {
  playing = false;
  mixer.stopAllAction();
  for (const [bone, bind] of binds) {
    bone.quaternion.copy(bind);
    bone.position.copy(bindPositions.get(bone));
  }
  draw();
}
function setFingerPose(strength) {
  bindPose();
  for (const [bone, bind] of binds) {
    const m = bone.name.match(/Hand(Thumb|Index|Middle|Ring|Pinky)([123])$/);
    if (!m) continue;
    const angle = THREE.MathUtils.degToRad(
      [60, 70, 48][Number(m[2]) - 1] * strength,
    );
    bone.quaternion
      .copy(bind)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          angle,
        ),
      );
  }
  draw();
}
function setClip(name, time = 0, render = true) {
  const clip = gltf.animations.find((c) => c.name === name);
  if (!clip) throw new Error("Unknown clip: " + name);
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).reset().play();
  action.time = time;
  mixer.update(0);
  playing = false;
  if (render) draw();
  return clip.duration;
}
if (full) {
  const controls = document.createElement("nav");
  controls.style.cssText =
    "position:fixed;bottom:12px;left:12px;display:flex;gap:8px;flex-wrap:wrap;max-width:990px";
  for (const [name, run] of [
    ["Bind", bindPose],
    ...gltf.animations.map((c) => [
      c.name,
      () => {
        setClip(c.name);
        playing = true;
      },
    ]),
    ...["Front", "Side", "Back"].map((s, i) => [s, () => setView(i)]),
  ]) {
    const button = document.createElement("button");
    button.textContent = name;
    button.style.cssText =
      "padding:12px;color:white;background:#123548;border:1px solid #c6ac76";
    button.onclick = run;
    controls.append(button);
  }
  document.body.append(controls);
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (playing) {
    mixer.update(dt);
    draw();
  }
});
window.review = {
  scene,
  model,
  camera,
  renderer,
  center,
  mixer,
  getAction: (name) =>
    mixer.clipAction(gltf.animations.find((c) => c.name === name)),
  clips: gltf.animations.map((c) => ({ name: c.name, duration: c.duration })),
  setView,
  setFingerPose,
  setClip,
  bindPose,
};
setView(0);
window.ready = true;
