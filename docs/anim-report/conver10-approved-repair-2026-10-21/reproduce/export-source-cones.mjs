/** Export experimental cone weights and only witnessed zero-slot joint changes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {sha256,immutablePayload,animationSignature} from '../../../../tools/rig/animation-payload.mjs';
const [directory]=process.argv.slice(2),root=path.resolve('.local/rig-candidates');
assert(directory&&path.resolve(directory).startsWith(root+path.sep));
const solveBytes=await fs.readFile(directory+'/solve.json'),solve=JSON.parse(solveBytes);
assert(solve.outputWritten,'Rejected local cone result');
const base=solve.base,hero=solve.parameters.hero,input=base+'/'+hero+'-C0-rigged.glb',bytes=await fs.readFile(input);
assert.equal(sha256(bytes),solve.assetSha256);
for(const [name,hash]of Object.entries(solve.inputHashes))assert.equal(sha256(await fs.readFile(base+'/'+name)),hash);
const poseBytes=await fs.readFile(solve.poseFile);assert.equal(sha256(poseBytes),solve.poseSha256);
const raw=await fs.readFile(directory+'/result-weights.bin');assert.equal(sha256(raw),solve.outputWeightsSha256);
const array=(raw,Type)=>new Type(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),weights=array(raw,Float32Array),
 protectedMask=await fs.readFile(base+'/protected.bin'),baseWeights=array(await fs.readFile(base+'/result-weights.bin'),Float32Array),baseIds=array(await fs.readFile(base+'/result-ids.bin'),Uint16Array);
assert.equal(weights.length,protectedMask.length*4);
const parentBytes=await fs.readFile(solve.parent+'/solve.json'),parent=JSON.parse(parentBytes);
assert.equal(sha256(parentBytes),solve.parentSolveSha256);assert.equal(parent.assetSha256,solve.assetSha256);
const parentRaw=await fs.readFile(solve.parent+'/result-weights.bin');assert.equal(sha256(parentRaw),parent.outputWeightsSha256);
const parentWeights=array(parentRaw,Float32Array);
let ids=baseIds;
if(solve.parameters.anatomicalZeroSlots) {
 const idBytes=await fs.readFile(directory+'/result-ids.bin');assert.equal(sha256(idBytes),solve.outputIdsSha256);ids=array(idBytes,Uint16Array);
 assert.equal(ids.length,baseIds.length);
 for(let i=0;i<ids.length;i++)if(ids[i]!==baseIds[i])assert.equal(parentWeights[i],0,'A positive parent support was reassigned');
} else assert.equal(solve.jointIdsChanged,false);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),
 strip=p=>{for(const m of p.meshes)for(const q of m.primitives){delete q.attributes.WEIGHTS_0;delete q.attributes.JOINTS_0;}return p;},
 clips=d=>d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:animationSignature(a)})),before=strip(immutablePayload(doc)),oldClips=clips(doc);
assert.equal(doc.getRoot().listMeshes().length,1);assert.equal(doc.getRoot().listMeshes()[0].listPrimitives().length,1);
const p=doc.getRoot().listMeshes()[0].listPrimitives()[0],jointCount=doc.getRoot().listSkins()[0].listJoints().length;
assert.deepEqual(Uint16Array.from(p.getAttribute('JOINTS_0').getArray()),baseIds);
for(let v=0;v<protectedMask.length;v++) {
 let total=0;for(let k=0;k<4;k++){const i=v*4+k;assert(ids[i]<jointCount);assert(Number.isFinite(weights[i])&&weights[i]>=0);total+=weights[i];if(protectedMask[v])assert.equal(weights[i],baseWeights[i]);}
 assert(Math.abs(total-1)<1e-5);
}
p.getAttribute('JOINTS_0').setArray(ids);p.getAttribute('WEIGHTS_0').setArray(weights).setNormalized(false);
const output=directory+'/'+hero+'-C0-rigged.glb';await io.write(output,doc);const result=await io.read(output),rp=result.getRoot().listMeshes()[0].listPrimitives()[0];
assert.deepEqual(strip(immutablePayload(result)),before);assert.deepEqual(clips(result),oldClips);
assert.deepEqual(rp.getAttribute('WEIGHTS_0').getArray(),weights);assert.deepEqual(rp.getAttribute('JOINTS_0').getArray(),ids);
const receipt={hero,input,inputSha256:sha256(bytes),output,outputSha256:sha256(await fs.readFile(output)),solveSha256:sha256(solveBytes),sourcePayloadExceptSkinPreserved:true,protectedSourceSupportsPreserved:true,positiveParentJointIdsPreserved:true,legacyClipsPreserved:true,accepted:false,activated:false,scope:'Readback-verified staging weights/zero-slot support changes only. Not animation, contact, collision, compression, visual or runtime acceptance.'};
await fs.writeFile(directory+'/export.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
