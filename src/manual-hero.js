import { manualHeroAssetUrls as files } from './manual-hero-assets.js';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildSoulWeapon } from './weapons.js';
import { buildHeroAnatomy } from './hero-anatomy.js';
import { syncSoulRingVisuals, disposeSoulRingVisuals } from './soul-ring-vfx.js';

const cache = new Map();
const animationStates = new WeakMap();

export function usesManualH01(actor) {
  return ['hero', 'clone'].includes(actor.kind) && actor.hero === 0 && (actor.costume ?? 0) === 0;
}
function load(detail) {
  if (!cache.has(detail)) {
    const promise = new GLTFLoader().loadAsync(files[detail]).then(gltf => {
      gltf.scene.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.geometry.userData.sharedArt = true;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          material.userData.sharedArt = true;
          for (const key of ['map', 'normalMap', 'metalnessMap', 'roughnessMap']) {
            const texture = material[key];
            if (texture) texture.anisotropy = 4;
          }
        }
      });
      return gltf;
    });
    cache.set(detail, promise);
  }
  return cache.get(detail);
}
export function createManualH01(actor, detail) {
  const root = new THREE.Group();
  root.name = 'manualHero_H01_C0';
  root.userData = {
    height: 1.82, detail, manualHunyuan: true,
    manualAsset: { id: 'H01-C0', status: 'loading', detail, rigged: true, source: 'a93d658b-a40d-4854-b755-ad1fa9bcc79b' },
  };
  syncSoulRingVisuals(root, actor, detail, 0);
  load(detail).then(source => {
    if (root.userData.manualAsset.disposed) return;
    const body = cloneSkeleton(source.scene);
    body.name = 'HunyuanBody';
    body.rotation.y = Math.PI;
    root.add(body);
    const mixer = new THREE.AnimationMixer(body);
    const actions = Object.fromEntries(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    for (const name of ['Attack', 'Cast', 'Dash']) {
      if (actions[name]) { actions[name].setLoop(THREE.LoopOnce, 1); actions[name].clampWhenFinished = true; }
    }
    animationStates.set(root, { mixer, actions, current: null, remaining: 0, cooldowns: [...(actor.cooldowns ?? [])] });
    root.userData.manualAsset.clips = source.animations.map(clip => clip.name);
    const weapon = buildSoulWeapon(0, detail, { skin: actor.skin ?? 0 });
    weapon.name = 'soulWeapon';
    const hand = body.getObjectByName('Hand_R');
    if (hand) {
      // Model-space offset is transformed into the hand's rest-frame socket.
      body.updateMatrixWorld(true);
      const grip = new THREE.Vector3(-0.48, 0.99, 0.015);
      const worldGrip = body.localToWorld(grip);
      weapon.position.copy(hand.worldToLocal(worldGrip));
      weapon.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert());
      weapon.quaternion.multiply(root.getWorldQuaternion(new THREE.Quaternion()));
      hand.add(weapon);
    } else {
      weapon.position.set(0.47, 0.93, -0.04);
      root.add(weapon);
    }
    root.userData.manualAsset.status = 'loaded';
    root.userData.modelLoadRevision = 1;
  }).catch(error => {
    if (root.userData.manualAsset.disposed) return;
    root.userData.manualAsset.status = 'failed';
    root.userData.manualAsset.error = error.message;
    const fallback = buildHeroAnatomy(actor, detail);
    disposeSoulRingVisuals(fallback);
    root.add(fallback);
    root.userData.modelLoadRevision = 1;
    console.error('H01 Hunyuan model failed to load', error);
  });
  return root;
}

/** Visual-only animation: never changes combat timing, costs or hitboxes. */
export function updateManualH01Animation(root, actor, speed, dt) {
  const state = animationStates.get(root);
  if (!state) return;
  const cooldowns = actor.cooldowns ?? [];
  let requested = null;
  for (let i = 0; i < 6; i++) {
    if ((cooldowns[i] ?? 0) > (state.cooldowns[i] ?? 0) + 0.08)
      requested = i === 5 ? 'Attack' : i === 4 ? 'Dash' : 'Cast';
  }
  state.cooldowns = [...cooldowns];
  state.remaining = Math.max(0, state.remaining - dt);
  if (requested) state.remaining = requested === 'Dash' ? 0.5 : requested === 'Attack' ? 0.8 : 1;
  const desired = requested ?? (state.remaining > 0 ? state.current : speed > 0.06 ? 'Run' : 'Idle');
  if (state.actions[desired] && (desired !== state.current || requested)) {
    state.actions[state.current]?.fadeOut(0.12);
    const action = state.actions[desired];
    action.reset().fadeIn(0.12).play();
    state.current = desired;
    root.userData.manualAsset.animation = desired;
  }
  state.mixer.update(Math.min(dt, 0.1));
}

export function disposeManualH01(root) {
  if (!root.userData.manualHunyuan) return;
  root.userData.manualAsset.disposed = true;
  const state = animationStates.get(root);
  if (state) {
    state.mixer.stopAllAction();
    state.mixer.uncacheRoot(state.mixer.getRoot());
    animationStates.delete(root);
  }
  const skeletons = new Set();
  root.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
}
