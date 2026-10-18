import {localAssetUrl} from './local-asset-url.js';
import{perfEvent}from'./perf-debug.js';
import {LoadingManager} from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {basisAssetUrls} from './gpu-texture-assets.js';
let loader;
export const gpuTextureMetrics={configured:false,workers:1,support:null};
export function configureGpuTextures(renderer){
 if(loader)return loader;
 const manager=new LoadingManager();manager.setURLModifier(url=>url.endsWith('basis_transcoder.js')?localAssetUrl(basisAssetUrls.js):url.endsWith('basis_transcoder.wasm')?localAssetUrl(basisAssetUrls.wasm):url);
 loader=new KTX2Loader(manager).setTranscoderPath('/basis/').setWorkerLimit(1).detectSupport(renderer);
 perfEvent('gpu-support',{support:{...loader.workerConfig}});gpuTextureMetrics.configured=true;gpuTextureMetrics.support={...loader.workerConfig};return loader;
}
export function getGpuTextureLoader(){return loader;}
