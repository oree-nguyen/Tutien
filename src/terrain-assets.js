import * as THREE from'three';
import{terrainGpuAssetUrls}from'./terrain-gpu-assets.js';
import{getGpuTextureLoader}from'./gpu-textures.js';
export async function loadTerrainTextureSet(biome,size,anisotropy){
 const loader=getGpuTextureLoader();if(!loader||size!==1024)throw Error('Use procedural ultra/fallback terrain');
 const maps={},textures=[];
 try{
  for(const key of ['albedo','normal','roughnessHeight','emissive']){
   const texture=await loader.loadAsync(terrainGpuAssetUrls[biome][key]);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(24,24);texture.anisotropy=anisotropy;
   texture.colorSpace=['albedo','emissive'].includes(key)?THREE.SRGBColorSpace:THREE.NoColorSpace;maps[key]=texture;textures.push(texture);
  }
  return {biome,size,...maps,bytes:textures.reduce((n,t)=>n+t.mipmaps[0].data.byteLength,0),gpuBytesWithMips:textures.reduce((n,t)=>n+t.mipmaps.reduce((m,l)=>m+l.data.byteLength,0),0),gpuCompressed:true,dispose:()=>textures.forEach(t=>t.dispose())};
 }catch(error){textures.forEach(t=>t.dispose());throw error;}
}
