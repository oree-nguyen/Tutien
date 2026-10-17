import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {getGpuTextureLoader,gpuTextureMetrics} from './gpu-textures.js';
import {threadedMeshoptDecoder} from './meshopt-worker-bridge.js';
import {perfEvent} from './perf-debug.js';

let sharedLoader,gpuAtCreation;
export function compressedModelsSupported(){
 const s=gpuTextureMetrics.support;
 return !!getGpuTextureLoader()&&!!s&&(s.astcSupported||s.etc2Supported||s.dxtSupported||s.bptcSupported);
}
export function modelLoader(){
 const gpu=getGpuTextureLoader();
 if(sharedLoader&&gpu===gpuAtCreation)return sharedLoader;
 sharedLoader=new GLTFLoader().setMeshoptDecoder(threadedMeshoptDecoder);
 gpuAtCreation=gpu;if(gpu)sharedLoader.setKTX2Loader(gpu);
 if(typeof Image==='undefined'&&typeof createImageBitmap==='function')sharedLoader.register(parser=>({
  name:'EXT_texture_webp',loadTexture:index=>{
   const extension=parser.json.textures[index].extensions?.EXT_texture_webp;
   return extension?parser.loadTextureImage(index,extension.source,parser.textureLoader):null;
  }
 }));
 return sharedLoader;
}
export function logModelFallback(key,reason){
 perfEvent('model-fallback',{key,reason});
 console.warn('[Hồn Giới] GLB dự phòng:',key,reason);
}
export function disposeModelTemplate(gltf){
 const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
 gltf.scene.traverse(node=>{
  if(node.geometry)geometries.add(node.geometry);
  if(node.skeleton)skeletons.add(node.skeleton);
  for(const m of (Array.isArray(node.material)?node.material:[node.material]).filter(Boolean)){
   materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  }
 });
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
 for(const t of textures){t.dispose();t.source?.data?.close?.();}for(const s of skeletons)s.dispose();
}
