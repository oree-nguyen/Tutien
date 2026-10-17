import {localAssetUrl} from './local-asset-url.js';
import{perfAsync,perfEnabled,perfEvent}from'./perf-debug.js';
import {getGpuTextureLoader,gpuTextureMetrics} from './gpu-textures.js';
import {modelLoader,compressedModelsSupported,logModelFallback,disposeModelTemplate} from './model-loader.js';
import {ModelTemplateCache} from './model-template-cache.js';
import { threadedMeshoptDecoder as MeshoptDecoder,meshoptWorkerMetrics } from './meshopt-worker-bridge.js';
import { manualHeroAssetUrls, manualHeroAssetHashes } from './model-asset-registry.js';

const loaded=new ModelTemplateCache({maxUnused:4,dispose:disposeModelTemplate});
export function releaseManualAssets(root){root.traverse(node=>loaded.release(node));manualAssetMetrics.templates=loaded.inspect();}
export const manualTemplateMetrics=()=>loaded.inspect();
let decodeQueue=Promise.resolve(),database;
export const manualAssetMetrics={hits:0,misses:0,bytes:0,decoded:0};
const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
async function db(){
 if(!globalThis.indexedDB)return null;
 if(!database)database=new Promise(resolve=>{
  let done=false;const finish=value=>{if(!done){done=true;resolve(value);}};
  const timeout=setTimeout(()=>{manualAssetMetrics.cacheError='open-timeout';finish(null);},15000);
  try {
   const request=indexedDB.open('hon-gioi-manual-assets-v1',2);
   request.onupgradeneeded=()=>{const store=request.result.objectStoreNames.contains('glb')?request.transaction.objectStore('glb'):request.result.createObjectStore('glb',{keyPath:'key'});if(!store.indexNames.contains('used'))store.createIndex('used','used');};
   request.onsuccess=()=>{clearTimeout(timeout);if(done)request.result.close();else finish(request.result);};
   request.onerror=request.onblocked=()=>{manualAssetMetrics.cacheError=request.error?.name??'blocked';clearTimeout(timeout);finish(null);};
  }catch(error){manualAssetMetrics.cacheError=error.name;clearTimeout(timeout);finish(null);}
 });
 return database;
}
async function stored(key,value){
 const database=await db();if(!database)return null;
 return new Promise(resolve=>{
  try{
   const tx=database.transaction('glb',value?'readwrite':'readonly'),store=tx.objectStore('glb');
   const request=value?store.put({key,bytes:value,used:Date.now()}):store.get(key);
   request.onsuccess=()=>{if(value)manualAssetMetrics.cacheWrites=(manualAssetMetrics.cacheWrites??0)+1;resolve(value??request.result?.bytes??null);};
   request.onerror=()=>{manualAssetMetrics.cacheError=request.error?.name;resolve(null);};
   tx.onabort=()=>resolve(null);
   if(value){
    let count=0;const keys=store.index('used').openKeyCursor(null,'prev');keys.onsuccess=()=>{const cursor=keys.result;if(!cursor)return;if(++count>12)store.delete(cursor.primaryKey);cursor.continue();};
   }
  }catch(error){manualAssetMetrics.cacheError=error.name;resolve(null);}
 });
}
async function valid(buffer,key){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||new DataView(buffer).getUint32(0,true)!==0x46546c67)return false;
 if(globalThis.crypto?.subtle&&manualHeroAssetHashes[key]){
  const hash=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')===manualHeroAssetHashes[key];
 }
 return true;
}
export async function manualAssetBuffer(key){
 const url=manualHeroAssetUrls[key];if(!url)throw Error('Unknown manual asset '+key);
 const cacheKey=key+':'+manualHeroAssetHashes[key];
 let buffer=await stored(cacheKey);
 if(await valid(buffer,key)){manualAssetMetrics.hits++;return buffer;}
 const response=await fetch(localAssetUrl(url));if(!response.ok)throw Error('Model HTTP '+response.status);
 buffer=await response.arrayBuffer();
 if(!await valid(buffer,key))throw Error('Model integrity check failed: '+key);
 manualAssetMetrics.misses++;manualAssetMetrics.bytes+=buffer.byteLength;
 void stored(cacheKey,buffer);
 return buffer;
}
export function loadManualAsset(key,allowGpu=true,owner){return perfAsync('glb:load',()=>loadManualAssetMeasured(key,allowGpu,owner),{key,allowGpu});}
function loadManualAssetMeasured(key,allowGpu=true,owner){
 const originalKey=key;
 if(allowGpu&&manualHeroAssetUrls[key+'-gpu']){
  if(compressedModelsSupported())key+='-gpu';
  else if(getGpuTextureLoader())logModelFallback(key,'no ASTC/ETC2/BC support');
 }
 const url=manualHeroAssetUrls[key];
 return loaded.load(url,()=>manualAssetBuffer(key).then(buffer=>{
  const job=decodeQueue.catch(()=>{}).then(async()=>{
   await yieldFrame();
   const start=performance.now();
   const gltf=await perfAsync('glb:decode',()=>modelLoader().parseAsync(buffer,''),{key,bytes:buffer.byteLength});
   if(perfEnabled()){const formats=new Set();gltf.scene.traverse(n=>{for(const m of (Array.isArray(n.material)?n.material:[n.material]).filter(Boolean))for(const slot of ['map','normalMap','metalnessMap','roughnessMap'])if(m[slot])formats.add(m[slot].format);});perfEvent('gpu-formats',{key,formats:[...formats]});}
   manualAssetMetrics.gpu={...gpuTextureMetrics};manualAssetMetrics.decoded++;manualAssetMetrics.lastDecodeMs=performance.now()-start;manualAssetMetrics.worker={...meshoptWorkerMetrics};manualAssetMetrics.templates=loaded.inspect();
   return gltf;
  });
  decodeQueue=job;return job;
 }),owner).catch(error=>{
  if(key!==originalKey){manualAssetMetrics.gpuFallbacks=(manualAssetMetrics.gpuFallbacks??0)+1;logModelFallback(originalKey,error.message);return loadManualAsset(originalKey,false,owner);}throw error;
 });
}

if(typeof indexedDB!=='undefined')void db();
