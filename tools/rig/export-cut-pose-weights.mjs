/** Apply an exact cut-fan weight trial in exported vertex order. No activation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
const directory=process.argv[2],solve=JSON.parse(await fs.readFile(directory+'/solve.json'));
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory));assert.equal(solve.parameters.cutFans,true);
const base=solve.base,sourceSolve=JSON.parse(await fs.readFile(base+'/solve.json')),layout=sourceSolve.base,
 bytes=await fs.readFile(base+'/H01-C0-rigged.glb');assert.equal(sha256(bytes),solve.assetSha256);
const paths={};for(const name of ['positions.bin','triangles.bin','protected.bin'])paths[name]=layout+'/solver-'+name;
paths['groups.bin']=layout+'/solver-groups.bin';for(const name of ['result-ids.bin','result-weights.bin','feasibility-matrices.bin'])paths[name]=base+'/'+name;
for(const[name,expected]of Object.entries(solve.inputHashes))assert.equal(sha256(await fs.readFile(paths[name])),expected);
const weightsBytes=await fs.readFile(directory+'/result-weights.bin');assert.equal(sha256(weightsBytes),solve.outputWeightsSha256);
const weights=new Float32Array(weightsBytes.buffer,weightsBytes.byteOffset,weightsBytes.length/4),protectedMask=new Uint8Array(await fs.readFile(paths['protected.bin'])),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),
 strip=p=>{for(const mesh of p.meshes)for(const primitive of mesh.primitives)delete primitive.attributes.WEIGHTS_0;return p;},
 immutable=strip(immutablePayload(doc)),clips=doc.getRoot().listAnimations().map(animationSignature);
let at=0;
for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){
 const count=p.getAttribute('POSITION').getCount(),old=p.getAttribute('WEIGHTS_0').getArray(),next=weights.slice(at*4,(at+count)*4);
 assert.equal(next.length,old.length);
 for(let i=0;i<count;i++){
  assert([...next.subarray(i*4,i*4+4)].every(w=>Number.isFinite(w)&&w>=0&&w<=1));assert(Math.abs(next.subarray(i*4,i*4+4).reduce((a,b)=>a+b,0)-1)<1e-5);
  if(protectedMask[at+i])assert.deepEqual(next.subarray(i*4,i*4+4),old.subarray(i*4,i*4+4));
 }
 p.getAttribute('WEIGHTS_0').setArray(next);at+=count;
 const provenance=p.getExtras().sourceProvenance;
 for(const file of [provenance.triangleMap.file,provenance.weldMap.file,provenance.weldMap.review.file])await fs.copyFile(path.resolve(base,file),path.resolve(directory,file));
}
assert.equal(at*4,weights.length);assert.equal(at,protectedMask.length);
for(const file of ['cut-plan.json','cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin'])await fs.copyFile(base+'/'+file,directory+'/'+file);
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);const result=await io.read(output);
assert.deepEqual(strip(immutablePayload(result)),immutable);assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
const receipt={input:base+'/H01-C0-rigged.glb',inputSha256:sha256(bytes),output,sha256:sha256(await fs.readFile(output)),solveSha256:sha256(await fs.readFile(directory+'/solve.json')),geometryUvImagesBonesAndLegacyClipsPreserved:true,protectedHandsPreserved:true,patternApproved:false,accepted:false,activated:false};
await fs.writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
