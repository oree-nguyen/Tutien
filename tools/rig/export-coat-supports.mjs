/** Apply only source-fan support records; no activation or seam waiver. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
const directory=process.argv[2]??'.local/rig-candidates/coat-cut-fit-v1',solve=JSON.parse(await fs.readFile(directory+'/solve.json')),
 bytes=await fs.readFile(solve.base+'/H01-C0-rigged.glb');
assert.equal(sha256(bytes),solve.inputSha256);
for(const[file,hash]of Object.entries(solve.inputHashes))assert.equal(sha256(await fs.readFile(solve.base+'/'+file)),hash);
const read=async(file,Type)=>{const b=await fs.readFile(directory+'/'+file);assert.equal(sha256(b),solve.outputHashes[file]);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},
 ids=await read('result-ids.bin',Uint16Array),weights=await read('result-weights.bin',Float32Array),
 protectedMask=new Uint8Array(await fs.readFile(solve.base+'/solver-protected.bin')),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),
 strip=p=>{for(const mesh of p.meshes)for(const primitive of mesh.primitives){delete primitive.attributes.JOINTS_0;delete primitive.attributes.WEIGHTS_0;}return p;},
 immutable=strip(immutablePayload(doc)),clips=doc.getRoot().listAnimations().map(animationSignature);
let at=0;
for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){
 const size=p.getAttribute('POSITION').getCount(),oldIds=p.getAttribute('JOINTS_0').getArray(),oldWeights=p.getAttribute('WEIGHTS_0').getArray(),
  nextIds=ids.slice(at*4,(at+size)*4),nextWeights=weights.slice(at*4,(at+size)*4);
 for(let i=0;i<size;i++){
  assert(Math.abs(nextWeights.subarray(i*4,i*4+4).reduce((s,w)=>s+w,0)-1)<1e-5);
  if(protectedMask[at+i]){assert.deepEqual(nextIds.subarray(i*4,i*4+4),oldIds.subarray(i*4,i*4+4));assert.deepEqual(nextWeights.subarray(i*4,i*4+4),oldWeights.subarray(i*4,i*4+4));}
 }
 p.getAttribute('JOINTS_0').setArray(nextIds);p.getAttribute('WEIGHTS_0').setArray(nextWeights);at+=size;
 const provenance=p.getExtras().sourceProvenance;
 for(const file of [provenance.triangleMap.file,provenance.weldMap.file,provenance.weldMap.review.file])await fs.copyFile(path.resolve(solve.base,file),path.resolve(directory,file));
}
assert.equal(at*4,weights.length);assert.equal(at,protectedMask.length);
for(const file of ['cut-plan.json','cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin'])await fs.copyFile(solve.base+'/'+file,directory+'/'+file);
for(const a of doc.getRoot().listAccessors())if(a.listParents().every(p=>p.propertyType==='Root'))a.dispose();
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);const result=await io.read(output);
assert.deepEqual(strip(immutablePayload(result)),immutable);assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
const receipt={input:solve.base+'/H01-C0-rigged.glb',inputSha256:sha256(bytes),output,sha256:sha256(await fs.readFile(output)),solveSha256:sha256(await fs.readFile(directory+'/solve.json')),
 geometryUvImagesBonesAndLegacyClipsPreserved:true,protectedHandsPreserved:true,patternApproved:false,accepted:false,activated:false};
await fs.writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
