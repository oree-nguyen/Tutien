import * as THREE from 'three';
import {studioIblUrl,studioIblInfo} from './studio-ibl-assets.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const environments=new WeakMap();let bakedLighting;
export async function configureBakedCharacterEnvironment(renderer){
 if(!bakedLighting)bakedLighting=fetch(studioIblUrl).then(response=>{if(!response.ok)throw Error('Studio IBL HTTP '+response.status);return response.arrayBuffer();});
 const buffer=await bakedLighting;
 const texture=new THREE.DataTexture(new Uint16Array(buffer),studioIblInfo.width,studioIblInfo.height,THREE.RGBAFormat,THREE.HalfFloatType);
 texture.mapping=THREE.CubeUVReflectionMapping;texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=false;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
 environments.set(renderer,{texture,dispose:()=>texture.dispose(),baked:true});
}


export function enhanceCharacterVisualFidelity(modelRoot,renderer,scene){
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.35;
 let environment=environments.get(renderer);
 if(!environment){
  const room=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromScene(room,.04,.1,30);
  room.dispose();pmrem.dispose();
  environment=target;environments.set(renderer,target);
 }
 modelRoot.traverse(node=>{
  if(!node.isMesh)return;
  node.layers.enable(2);
  // Hunyuan's rebaked normal maps already encode high-frequency detail.
  // Preserve valid authored normals and UV seams; avoid blanket recomputation.
  if(!node.geometry.attributes.normal)node.geometry.computeVertexNormals();
  node.castShadow=false;
  node.receiveShadow=false;
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   material.vertexColors=false;
   if(node.isSkinnedMesh&&!modelRoot.userData.preserveMetalPbr){material.metalness=Math.min(material.metalness??0,.05);material.emissiveMap=material.map;material.emissive.setHex(0xffffff);material.emissiveIntensity=.28;}
   if(material.map)material.map.colorSpace=THREE.SRGBColorSpace;
   for(const key of ['normalMap','roughnessMap','metalnessMap','aoMap'])if(material[key])material[key].colorSpace=THREE.NoColorSpace;
   if(material.emissiveMap)material.emissiveMap.colorSpace=THREE.SRGBColorSpace;
   material.envMap=environment.texture;
   material.envMapIntensity=1.1;
   material.normalScale?.set(.35,.35);
   material.aoMapIntensity=.25;
   material.needsUpdate=true;
  }
 });
 modelRoot.userData.fidelity={srgb:true,studioIBL:true,vertexColorsDisabled:true,normalStrength:.35,bakedStudioIBL:!!environment.baked};
 return modelRoot;
}
export function createCharacterStudio(){
 const root=new THREE.Group();root.name='H01_StudioLighting';
 for(const [color,intensity,position] of [[0xfff1df,2.4,[3,7,8]],[0xe2f5ff,2.0,[-4,4,7]],[0x98ffd7,1.2,[4,6,-4]],[0xe9ffef,.55,[0,1.5,5]]]){
  const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);light.layers.set(2);
  light.target.position.set(0,3,0);root.add(light,light.target);
 }
 return root;
}
export function disposeCharacterEnvironment(renderer){const target=environments.get(renderer);target?.dispose();environments.delete(renderer);}
