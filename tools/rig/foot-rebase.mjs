import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {sha256} from './animation-payload.mjs';
const hero=process.env.HERO??'H01',base=process.env.FOOT_BASE_DIR??`.local/rig-candidates/foot-source/${hero}`,directory=process.env.FOOT_SOURCE_DIR??`.local/rig-candidates/foot-source-v2/${hero}`,input=process.env.RIG_FILE??`.local/rig-candidates/semantic-garment-v6/${hero}-C0-rigged.glb`,meta=JSON.parse(await fs.readFile(base+'/input.json')),bytes=await fs.readFile(input),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),ids=new Uint16Array(meta.sourceVertices*4),weights=new Float32Array(meta.sourceVertices*4),seen=new Uint8Array(meta.sourceVertices);
await fs.mkdir(directory,{recursive:true});for(const file of ['positions.bin','triangles.bin','uv.bin','rgb.bin','source-welds.u32bin','lower-components.u32bin','lower-components.json','selection.json'])await fs.copyFile(base+'/'+file,directory+'/'+file);
const sourcePositions=new Float32Array((await fs.readFile(base+'/positions.bin')).buffer);
for(const node of doc.getRoot().listNodes())if(node.getMesh())for(const p of node.getMesh().listPrimitives()){
 const map=p.getAttribute('_SOURCE_VERTEX')?.getArray(),position=p.getAttribute('POSITION').getArray(),ji=p.getAttribute('JOINTS_0').getArray(),we=p.getAttribute('WEIGHTS_0').getArray();
 if(!map)assert.equal(position.length,meta.sourceVertices*3);
 for(let v=0;v<position.length/3;v++){const id=map?map[v]:v;for(let k=0;k<4;k++){if(seen[id]){assert.equal(ids[id*4+k],ji[v*4+k]);assert.equal(weights[id*4+k],we[v*4+k]);}else{ids[id*4+k]=ji[v*4+k];weights[id*4+k]=we[v*4+k];}}seen[id]=1;}
}
assert(seen.every(Boolean));await fs.writeFile(directory+'/ids.bin',Buffer.from(ids.buffer));await fs.writeFile(directory+'/weights.bin',Buffer.from(weights.buffer));await fs.writeFile(directory+'/input.json',JSON.stringify({...meta,input,inputSha256:sha256(bytes),scope:'Exact source-ID scattered parent support extraction; geometry source remains byte-identical'},null,2)+'\n');console.log(JSON.stringify({directory,input,inputSha256:sha256(bytes)}));
