import{loadImageTexture}from'./texture-image.js';
import * as THREE from 'three';
import{environmentAssetUrls}from'./environment-baked-assets.js';
import{environmentGpuAssetUrls}from'./environment-gpu-assets.js';
import{getGpuTextureLoader}from'./gpu-textures.js';
import{installPrebakedEnvironmentMaps}from'./environment-pbr.js';
let loading;
export function prepareEnvironmentAssets(){
 if(!loading)loading=(async()=>{
  const sets={};
  // Bound decode concurrency instead of exploding thirteen image decoders at boot.
  for(const [style,urls] of Object.entries(environmentAssetUrls)){
   sets[style]={};for(const [key,url]of Object.entries(urls)){
    const gpu=getGpuTextureLoader();let texture;
    try{texture=await(gpu?gpu.loadAsync(environmentGpuAssetUrls[style][key]):loadImageTexture(url));}
    catch{texture=await loadImageTexture(url);}
    texture.colorSpace=key==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.setScalar(style==='roof'?2:1);texture.anisotropy=4;sets[style][key]=texture;
   }
  }
  installPrebakedEnvironmentMaps(sets);return sets;
 })().catch(error=>{loading=null;throw error;});
 return loading;
}
