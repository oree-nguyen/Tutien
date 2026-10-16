import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
self.onmessage=async({data})=>{
 try{
  await MeshoptDecoder.ready;
  const output=new Uint8Array(data.count*data.size);
  MeshoptDecoder.decodeGltfBuffer(output,data.count,data.size,new Uint8Array(data.source),data.mode,data.filter);
  self.postMessage({id:data.id,output:output.buffer},[output.buffer]);
 }catch(error){self.postMessage({id:data.id,error:error.message});}
};
self.postMessage({ready:true});
