import * as THREE from 'three';
import {studioIblUrl,studioIblInfo} from './studio-ibl-assets.js';
const environments=new WeakMap();let bakedLighting;
export async function configureBakedCharacterEnvironment(renderer){
 if(!bakedLighting)bakedLighting=fetch(studioIblUrl).then(response=>{if(!response.ok)throw Error('Studio IBL HTTP '+response.status);return response.arrayBuffer();});
 const buffer=await bakedLighting;
 const texture=new THREE.DataTexture(new Uint16Array(buffer),studioIblInfo.width,studioIblInfo.height,THREE.RGBAFormat,THREE.HalfFloatType);
 texture.mapping=THREE.CubeUVReflectionMapping;texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=false;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
 environments.set(renderer,{texture,dispose:()=>texture.dispose(),baked:true});
}


export function getCharacterEnvironment(renderer){return environments.get(renderer)?.texture??null;}

export function enhanceCharacterVisualFidelity(modelRoot,renderer,scene){
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1;
 const environment=environments.get(renderer);
 if(!environment)throw Error('Neutral glTF environment must be loaded before model appearance');
 scene.environment=environment.texture;
 modelRoot.traverse(node=>{
  if(!node.isMesh)return;
  node.layers.enable(2);
  // The authoring material, vertex colors, map color spaces, normals, AO and
  // emissive are owned by GLTFLoader. Bind only the external viewing environment.

 });
 modelRoot.userData.fidelity={srgb:true,neutralIBL:true,studioIBL:true,authoredMaterialsPreserved:true,bakedStudioIBL:!!environment.baked};
 return modelRoot;
}
export function createCharacterStudio(){
 const root=new THREE.Group();root.name='Neutral_GLTF_Environment';return root;
}
export function disposeCharacterEnvironment(renderer){const target=environments.get(renderer);target?.dispose();environments.delete(renderer);}
