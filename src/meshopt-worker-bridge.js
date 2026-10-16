import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createMeshoptWorker} from './meshopt-worker-source.js';
let serial=0,cursor=0,pool;
export const meshoptWorkerMetrics={decoded:0,fallbacks:0};
function workers(){
 if(pool)return pool;
 pool=[];
 if(typeof Worker==='undefined')return pool;
 try{
  const count=Math.min(2,Math.max(1,(navigator.hardwareConcurrency??2)-1));
  for(let i=0;i<count;i++){
   const worker=createMeshoptWorker(),jobs=new Map(),entry={worker,jobs};
   worker.onmessage=({data})=>{
    if(data.ready){if(worker.objectURL)URL.revokeObjectURL(worker.objectURL);return;}
    const job=jobs.get(data.id);if(!job)return;
    jobs.delete(data.id);clearTimeout(job.timeout);
    if(data.error)job.reject(Error(data.error));else{meshoptWorkerMetrics.decoded++;job.resolve(new Uint8Array(data.output));}
   };
   worker.onerror=event=>{
    event.preventDefault();for(const job of jobs.values()){clearTimeout(job.timeout);job.reject(Error('Meshopt worker failed'));}
    jobs.clear();worker.terminate();const index=pool.indexOf(entry);if(index>=0)pool.splice(index,1);
   };
   pool.push(entry);
  }
 }catch{for(const e of pool)e.worker.terminate();pool=[];}
 return pool;
}
export const threadedMeshoptDecoder={
 supported:MeshoptDecoder.supported,ready:MeshoptDecoder.ready,
 async decodeGltfBufferAsync(count,size,source,mode,filter){
  const available=workers();
  if(available.length){
   const entry=available[cursor++%available.length];
   try{
    return await new Promise((resolve,reject)=>{
     const id=++serial,copy=source.slice();
     const timeout=setTimeout(()=>{entry.jobs.delete(id);reject(Error('Meshopt worker timeout'));},20000);
     entry.jobs.set(id,{resolve,reject,timeout});
     try{entry.worker.postMessage({id,count,size,source:copy.buffer,mode,filter},[copy.buffer]);}
     catch(error){clearTimeout(timeout);entry.jobs.delete(id);reject(error);}
    });
   }catch{meshoptWorkerMetrics.fallbacks++;}
  }
  await MeshoptDecoder.ready;
  return MeshoptDecoder.decodeGltfBufferAsync(count,size,source,mode,filter);
 }
};
