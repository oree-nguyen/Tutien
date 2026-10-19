import {localAssetUrl} from './local-asset-url.js';
import {getGpuTextureLoader,gpuTextureMetrics} from './gpu-textures.js';
import {getModelLoader} from './model-loader.js';
import { threadedMeshoptDecoder as MeshoptDecoder,meshoptWorkerMetrics } from './meshopt-worker-bridge.js';
import { manualHeroAssetUrls, manualHeroAssetHashes } from './model-asset-registry.js';
import {createManualTemplateCache} from './manual-template-cache.js';

function disposeTemplate(gltf){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 gltf.scene.traverse(node=>{
  if(node.geometry)geometries.add(node.geometry);
  for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){
   materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 for(const texture of textures)texture.dispose();
 for(const material of materials)material.dispose();
 for(const geometry of geometries)geometry.dispose();
}
const loaded=createManualTemplateCache(disposeTemplate);
const ownerReleaseGenerations=new WeakMap();
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
export async function manualAssetBuffer(key,persist=true){
 const url=manualHeroAssetUrls[key];if(!url)throw Error('Unknown manual asset '+key);
 const cacheKey=key+':'+manualHeroAssetHashes[key];
 let buffer=persist?await stored(cacheKey):null;
 if(await valid(buffer,key)){manualAssetMetrics.hits++;return buffer;}
 const response=await fetch(localAssetUrl(url));if(!response.ok)throw Error('Model HTTP '+response.status);
 buffer=await response.arrayBuffer();
 if(!await valid(buffer,key))throw Error('Model integrity check failed: '+key);
 manualAssetMetrics.misses++;manualAssetMetrics.bytes+=buffer.byteLength;
 if(persist)void stored(cacheKey,buffer);
 return buffer;
}
export function loadManualAsset(key,allowGpu=true,owner){
 const originalKey=key;
 const ownerGeneration=owner?ownerReleaseGenerations.get(owner)??0:0;
 const gpu=getGpuTextureLoader();
 if(allowGpu&&gpu&&manualHeroAssetUrls[key+'-gpu'])key+='-gpu';
 const url=manualHeroAssetUrls[key];
 if(!url)return Promise.reject(Error('Unknown manual asset '+key));
 return loaded.acquire(localAssetUrl(url),()=>manualAssetBuffer(key,!key.startsWith('source-')).then(buffer=>{
   const job=decodeQueue.catch(()=>{}).then(async()=>{
    await yieldFrame();
    const loader=getModelLoader();
    const start=performance.now();
    const gltf=await loader.parseAsync(buffer,'');
    manualAssetMetrics.gpu={...gpuTextureMetrics};manualAssetMetrics.decoded++;manualAssetMetrics.lastDecodeMs=performance.now()-start;manualAssetMetrics.worker={...meshoptWorkerMetrics};
    return gltf;
   });
   decodeQueue=job.then(()=>undefined,()=>undefined);return job;
  }),{owner,retain:!key.startsWith('source-')}).catch(error=>{if(key!==originalKey){if(owner&&(ownerReleaseGenerations.get(owner)??0)!==ownerGeneration)throw error;console.warn('Compressed GLB fallback:',originalKey,error.message);manualAssetMetrics.gpuFallbacks=(manualAssetMetrics.gpuFallbacks??0)+1;return loadManualAsset(originalKey,false,owner);}throw error;});
}

export function releaseManualSourceAsset(key,owner){
 const url=manualHeroAssetUrls[key]&&localAssetUrl(manualHeroAssetUrls[key]);
 if(!url)return;
 return loaded.releaseUrl(url,owner);
}

if(typeof indexedDB!=='undefined')void db();

// Gameplay templates stay warm; full source previews leave when their last clone does.
export function releaseManualAssets(owner) {if(owner)ownerReleaseGenerations.set(owner,(ownerReleaseGenerations.get(owner)??0)+1);loaded.release(owner);}
export const manualTemplateMetrics=()=>loaded.metrics();
