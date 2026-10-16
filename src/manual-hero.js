import { manualHeroAssetUrls as files } from './manual-hero-assets.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildSoulWeapon } from './weapons.js';
import { buildHeroAnatomy } from './hero-anatomy.js';
import { syncSoulRingVisuals, disposeSoulRingVisuals } from './soul-ring-vfx.js';

const cache = new Map();

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
      return gltf.scene;
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
    manualAsset: { id: 'H01-C0', status: 'loading', detail, rigged: false, source: 'a93d658b-a40d-4854-b755-ad1fa9bcc79b' },
  };
  syncSoulRingVisuals(root, actor, detail, 0);
  load(detail).then(source => {
    const body = source.clone(true);
    body.name = 'HunyuanBody';
    body.rotation.y = Math.PI;
    root.add(body);
    // Keep the existing independently equipped staff; this trial replaces only
    // the body. Its rigid attachment is not represented as skeletal animation.
    const weapon = buildSoulWeapon(0, detail, { skin: actor.skin ?? 0 });
    weapon.name = 'soulWeapon';
    weapon.position.set(0.47, 0.93, -0.04);
    root.add(weapon);
    root.userData.manualAsset.status = 'loaded';
    root.userData.modelLoadRevision = 1;
  }).catch(error => {
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
