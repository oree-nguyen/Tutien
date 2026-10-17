import {getGpuTextureLoader,gpuTextureMetrics} from './gpu-textures.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { threadedMeshoptDecoder as MeshoptDecoder,meshoptWorkerMetrics } from './meshopt-worker-bridge.js';
import { manualHeroAssetUrls, manualHeroAssetHashes } from './manual-hero-assets.js';

const loaded=new Map();
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
 const response=await fetch(url);if(!response.ok)throw Error('Model HTTP '+response.status);
 buffer=await response.arrayBuffer();
 if(!await valid(buffer,key))throw Error('Model integrity check failed: '+key);
 manualAssetMetrics.misses++;manualAssetMetrics.bytes+=buffer.byteLength;
 void stored(cacheKey,buffer);
 return buffer;
}
export function loadManualAsset(key,allowGpu=true){
 const originalKey=key;
 const gpu=getGpuTextureLoader();
 if(allowGpu&&gpu&&manualHeroAssetUrls[key+'-gpu'])key+='-gpu';
 if(!loaded.has(key)){
  const promise=manualAssetBuffer(key).then(buffer=>{
   const job=decodeQueue.catch(()=>{}).then(async()=>{
    await yieldFrame();
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    if(gpu)loader.setKTX2Loader(gpu);
    // Embedded WebP can decode directly to ImageBitmap inside the render worker.
    // Three r160's default capability probe uses DOM Image, which workers lack.
    if(typeof Image==='undefined'&&typeof createImageBitmap==='function')loader.register(parser=>({
     name:'EXT_texture_webp',loadTexture:index=>{
      const texture=parser.json.textures[index],extension=texture.extensions?.EXT_texture_webp;
      return extension?parser.loadTextureImage(index,extension.source,parser.textureLoader):null;
     }
    }));
    const start=performance.now();
    const gltf=await loader.parseAsync(buffer,'');
    manualAssetMetrics.gpu={...gpuTextureMetrics};manualAssetMetrics.decoded++;manualAssetMetrics.lastDecodeMs=performance.now()-start;manualAssetMetrics.worker={...meshoptWorkerMetrics};
    return gltf;
   });
   decodeQueue=job;return job;
  }).catch(error=>{loaded.delete(key);if(key!==originalKey){manualAssetMetrics.gpuFallbacks=(manualAssetMetrics.gpuFallbacks??0)+1;return loadManualAsset(originalKey,false);}throw error;});
  loaded.set(key,promise);
 }
 return loaded.get(key);
}

if(typeof indexedDB!=='undefined')void db();
