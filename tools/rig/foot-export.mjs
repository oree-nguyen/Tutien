import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
const hero=process.env.HERO??'H01',input=process.env.RIG_FILE??`assets/rigged/${hero}-C0-rigged.glb`,directory=process.env.FOOT_SOURCE_DIR??`.local/rig-candidates/foot-source/${hero}`,output=process.env.FOOT_OUTPUT_DIR??'.local/rig-candidates/foot-correction-v1';
assert(output.startsWith('.local/rig-candidates/')&&!output.includes('..'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input),doc=await io.readBinary(bytes),selection=JSON.parse(await fs.readFile(directory+'/selection.json')),meta=JSON.parse(await fs.readFile(directory+'/input.json'));
assert.equal(selection.sourceSha256,meta.sourceSha256);const source=await io.read(meta.source),sourceP=source.getRoot().listNodes().find(n=>n.getMesh()).getMesh().listPrimitives()[0],sourcePositions=sourceP.getAttribute('POSITION').getArray();
const mask=new Uint8Array(await fs.readFile(directory+'/patch-mask.bin')),ib=await fs.readFile(directory+'/result-ids.bin'),wb=await fs.readFile(directory+'/result-weights.bin'),ids=new Uint16Array(ib.buffer,ib.byteOffset,ib.byteLength/2),weights=new Float32Array(wb.buffer,wb.byteOffset,wb.byteLength/4);
for(const file of ['patch-mask.bin','result-ids.bin','result-weights.bin'])assert.equal(sha256(await fs.readFile(directory+'/'+file)),selection.files[file].sha256);
const baseline=immutablePayload(doc),animations=doc.getRoot().listAnimations().map(animationSignature),strip=p=>{for(const m of p.meshes)for(const q of m.primitives){delete q.attributes.JOINTS_0;delete q.attributes.WEIGHTS_0;}return p;};
let changedCopies=0;const seen=new Set();
for(const node of doc.getRoot().listNodes())if(node.getMesh())for(const p of node.getMesh().listPrimitives()){
 const map=p.getAttribute('_SOURCE_VERTEX')?.getArray(),position=p.getAttribute('POSITION').getArray(),ji=p.getAttribute('JOINTS_0').getArray(),we=p.getAttribute('WEIGHTS_0').getArray();
 if(!map){assert.equal(position.length,sourcePositions.length);assert.deepEqual(position,sourcePositions,'Unmapped input is not exact original source');}
 if(map)assert.equal(p.getExtras().sourceProvenance.sourceSha256,meta.sourceSha256);
 for(let v=0;v<position.length/3;v++){const id=map?map[v]:v;if(!mask[id])continue;for(let k=0;k<3;k++)assert.equal(position[v*3+k],sourcePositions[id*3+k]);ji.set(ids.subarray(id*4,id*4+4),v*4);we.set(weights.subarray(id*4,id*4+4),v*4);changedCopies++;seen.add(id);}
}
assert.equal(seen.size,selection.changedVertices,'Not every patch source vertex is present');
await fs.mkdir(output,{recursive:true});const file=output+`/${hero}-C0-rigged.glb`;assert.notEqual(file,input);await io.write(file,doc);const resultBytes=await fs.readFile(file),result=await io.readBinary(resultBytes);assert.deepEqual(strip(immutablePayload(result)),strip(baseline),'Immutable geometry/material/skin hierarchy payload changed');assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),animations);assert.equal(result.getRoot().listSkins()[0].listJoints().length,52);
const receipt={hero,input,inputSha256:sha256(bytes),output:file,outputSha256:sha256(resultBytes),sourceSha256:meta.sourceSha256,selection:directory+'/selection.json',selectionSha256:sha256(await fs.readFile(directory+'/selection.json')),changedSourceVertices:seen.size,changedExportCopies:changedCopies,sourceGeometryUvImagesAnimationsAnd52BonesPreserved:true,accepted:false,activated:false,scope:'Boot support trial only; independent actual source contact and whole-mesh edge/seam validation still required'};await fs.writeFile(output+`/${hero}-foot-receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
