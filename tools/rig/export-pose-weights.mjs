/** Export a rejected-or-unverified skin-only trial; source payload stays exact. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {immutablePayload,animationSignature} from './animation-payload.mjs';

const [base,directory]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex'),
 bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory??'')&&directory!==base);
const solve=JSON.parse(await fs.readFile(directory+'/solve.json')),input=await fs.readFile(base+'/H01-C0-rigged.glb');
assert.equal(solve.base,base);assert.equal(sha(input),solve.assetSha256);
for(const[name,hash]of Object.entries(solve.inputHashes))assert.equal(sha(await fs.readFile(base+'/'+name)),hash);
assert.equal(sha(await fs.readFile(solve.poseFile)),solve.poseSha256);
const raw=await fs.readFile(directory+'/result-weights.bin');assert.equal(sha(raw),solve.outputWeightsSha256);
const values=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),protectedMask=new Uint8Array(await fs.readFile(base+'/protected.bin')),
 originalRaw=await fs.readFile(base+'/result-weights.bin'),original=new Float32Array(originalRaw.buffer,originalRaw.byteOffset,originalRaw.byteLength/4);
assert.equal(values.length,protectedMask.length*4);assert(values.every(v=>Number.isFinite(v)&&v>=0));
for(let i=0;i<protectedMask.length;i++){
 assert(Math.abs(values.subarray(i*4,i*4+4).reduce((a,b)=>a+b,0)-1)<1e-5);
 if(protectedMask[i])assert.deepEqual(values.subarray(i*4,i*4+4),original.subarray(i*4,i*4+4));
}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(input),
 strip=payload=>{for(const mesh of payload.meshes)for(const primitive of mesh.primitives)delete primitive.attributes.WEIGHTS_0;return payload;},
 before=strip(immutablePayload(doc)),clips=doc.getRoot().listAnimations().map(animationSignature),seen=new Uint8Array(protectedMask.length);
let copies=0;
for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){
 const ids=p.getAttribute('_SOURCE_VERTEX')?.getArray();assert(ids,'Exact source-ID mesh required');
 const weights=p.getAttribute('WEIGHTS_0').getArray();assert.equal(weights.length,ids.length*4);
 for(let i=0;i<ids.length;i++){
  const id=ids[i];assert(id<seen.length);seen[id]=1;weights.set(values.subarray(id*4,id*4+4),i*4);copies++;
 }
 const provenance=p.getExtras().sourceProvenance;
 for(const file of [provenance.triangleMap.file,provenance.weldMap.file,provenance.weldMap.review.file])await fs.copyFile(path.resolve(base,file),path.resolve(directory,file));
}
assert(seen.every(Boolean));
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);const result=await io.read(output);
assert.deepEqual(strip(immutablePayload(result)),before,'Source geometry, UV/images, joint IDs, hierarchy or inverse binds changed');
assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips,'Legacy clip payload changed');
for(const n of result.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){
 const ids=p.getAttribute('_SOURCE_VERTEX').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray();
 for(let i=0;i<ids.length;i++)assert.deepEqual(weights.subarray(i*4,i*4+4),values.subarray(ids[i]*4,ids[i]*4+4));
}
const receipt={input:base+'/H01-C0-rigged.glb',inputSha256:sha(input),output,sha256:sha(await fs.readFile(output)),solveFile:directory+'/solve.json',solveSha256:sha(await fs.readFile(directory+'/solve.json')),
 sourcePayloadExceptSkinWeightsPreserved:true,protectedHandWeightsPreserved:true,legacyClipsPreserved:true,sourceVertices:seen.length,exportCopies:copies,accepted:false,activated:false,
 scope:'Four-source-joint weight-only one-pose trial; independent all-mesh, source/seam, collision, contact, full animation and visual gates required.'};
await fs.writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
