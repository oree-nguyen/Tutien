import * as THREE from 'three';
import {bakedCharacterAssets} from './baked-character-assets.js';
import {characterPBR} from './character-pbr.js';
import {getGpuTextureLoader} from './gpu-textures.js';
import {compressedFidelityAssetsApproved} from './fidelity-policy.js';
import {loadImageTexture} from './texture-image.js';
import {localAssetUrl} from './local-asset-url.js';
import {perfAsync,perfEvent} from './perf-debug.js';
const sets=new Map();
export function ensureBakedCharacter(actor,detail){
 if((actor.costume??0)!==0)return null;
 const id=(actor.hero??0)+':'+detail,spec=bakedCharacterAssets[id];if(!spec)return null;
 if(!sets.has(id)){
  const state={status:'loading',promise:null};sets.set(id,state);
  state.promise=perfAsync('texture:baked-character',async()=>{
   const maps={};
   try{
    for(const [channel,asset] of Object.entries(spec.channels)){
     let texture;
     if(compressedFidelityAssetsApproved&&getGpuTextureLoader())try{texture=await getGpuTextureLoader().loadAsync(localAssetUrl(asset.ktx2));}catch(error){perfEvent('texture:baked-fallback',{id,channel,reason:error.message});}
     texture??=await loadImageTexture(localAssetUrl(asset.png));
     texture.colorSpace=['albedo','emissive'].includes(channel)?THREE.SRGBColorSpace:THREE.NoColorSpace;
     texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=4;
     texture.minFilter=THREE.LinearMipmapLinearFilter;
     texture.userData={sharedArt:true,generatedCharacterPBR:true,pbrKey:spec.key,channel,pbrResolution:spec.size,renderer:'baked'};
     maps[channel]=texture;
    }
    if(!characterPBR.installBaked(spec.key,maps,spec.size))for(const texture of Object.values(maps)){texture.dispose();texture.source?.data?.close?.();}
    state.status='ready';
   }catch(error){for(const texture of Object.values(maps)){texture.dispose();texture.source?.data?.close?.();}state.status='failed';console.warn('[Hồn Giới] Atlas dự phòng:',id,error.message);}
  },{id,size:spec.size});
 }
 return sets.get(id);
}
export async function prepareBakedCharacter(actor,detail){await ensureBakedCharacter(actor,detail)?.promise;}
