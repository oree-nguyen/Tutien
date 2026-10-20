/** Export only the lower-support trial, preserving source data and all clips. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
import {sourceBoundaryProof} from './source-provenance.mjs';

const directory=process.argv[2];assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory));
const solve=JSON.parse(await fs.readFile(directory+'/solve.json')),bytes=await fs.readFile(solve.input);assert.equal(sha256(bytes),solve.inputSha256);
for(const[file,hash]of Object.entries(solve.inputHashes))assert.equal(sha256(await fs.readFile(solve.base+'/'+file)),hash);
for(const[file,hash]of Object.entries(solve.outputHashes))assert.equal(sha256(await fs.readFile(directory+'/'+file)),hash);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),sourceBytes=await fs.readFile(solve.source);assert.equal(sha256(sourceBytes),solve.sourceSha256);
const source=await io.readBinary(sourceBytes),nodes=source.getRoot().listNodes(),sourceNodeIndex=nodes.findIndex(n=>n.getMesh()),sp=nodes[sourceNodeIndex].getMesh().listPrimitives()[0],
 inputNodes=doc.getRoot().listNodes().filter(n=>n.getMesh());assert.equal(inputNodes.length,1);assert.equal(inputNodes[0].getMesh().listPrimitives().length,1);
const p=inputNodes[0].getMesh().listPrimitives()[0],count=p.getAttribute('POSITION').getCount(),buffer=doc.getRoot().listBuffers()[0],original=immutablePayload(doc),clips=doc.getRoot().listAnimations().map(animationSignature),
 raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),read=async(name,Type)=>{const b=await fs.readFile(directory+'/'+name);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},
 ids=await read('result-ids.bin',Uint16Array),weights=await read('result-weights.bin',Float32Array),protectedMask=await read('protected.bin',Uint8Array);
for(const semantic of sp.listSemantics())assert.deepEqual(raw(p.getAttribute(semantic).getArray()),raw(sp.getAttribute(semantic).getArray()));
assert.deepEqual(p.getIndices().getArray(),sp.getIndices().getArray());assert.equal(count,protectedMask.length);assert.equal(ids.length,count*4);assert.equal(weights.length,count*4);
const oldIds=p.getAttribute('JOINTS_0').getArray(),oldWeights=p.getAttribute('WEIGHTS_0').getArray(),canonicalIds=new oldIds.constructor(ids);
const jointCount=doc.getRoot().listSkins()[0].listJoints().length;assert(ids.every(i=>i<jointCount));
assert.equal(canonicalIds.BYTES_PER_ELEMENT,oldIds.BYTES_PER_ELEMENT);
for(let i=0;i<count;i++){
 assert(Math.abs(weights.subarray(i*4,i*4+4).reduce((n,w)=>n+w,0)-1)<1e-5);assert([...weights.subarray(i*4,i*4+4)].every(w=>Number.isFinite(w)&&w>=0&&w<=1));
 if(protectedMask[i]){assert.deepEqual(canonicalIds.subarray(i*4,i*4+4),oldIds.subarray(i*4,i*4+4));assert.deepEqual(weights.subarray(i*4,i*4+4),oldWeights.subarray(i*4,i*4+4));}
}
p.getAttribute('JOINTS_0').setArray(canonicalIds);p.getAttribute('WEIGHTS_0').setArray(weights.slice());
const proof=sourceBoundaryProof(sp),weldBytes=await fs.readFile(solve.base+'/source-welds.u32bin');assert.deepEqual(raw(proof.ids),weldBytes);
await fs.writeFile(directory+'/source-welds.u32bin',weldBytes);const {ids:omitted,...summary}=proof,review=Buffer.from(JSON.stringify({sourceSha256:solve.sourceSha256,weldMapSha256:sha256(weldBytes),...summary},null,2)+'\n');await fs.writeFile(directory+'/source-boundary-proof.json',review);
const faces=Uint32Array.from({length:p.getIndices().getCount()/3},(_,i)=>i),mapBytes=raw(faces);await fs.writeFile(directory+'/source-triangles.u32bin',mapBytes);
p.setAttribute('_SOURCE_VERTEX',doc.createAccessor('',buffer).setType('SCALAR').setArray(Uint32Array.from({length:count},(_,i)=>i)));
p.setAttribute('_SOURCE_WELD',doc.createAccessor('',buffer).setType('SCALAR').setArray(proof.ids));
p.setExtras({...p.getExtras(),sourceProvenance:{version:1,sourceFile:solve.source,sourceSha256:solve.sourceSha256,sourceNodeIndex,sourcePrimitiveIndex:0,vertexAccessor:'_SOURCE_VERTEX',
 triangleMap:{file:'source-triangles.u32bin',sha256:sha256(mapBytes),count:faces.length,offsetBytes:0},
 weldMap:{file:'source-welds.u32bin',sha256:sha256(weldBytes),count,method:proof.method,review:{file:'source-boundary-proof.json',sha256:sha256(review)}}}});
const file=directory+'/H02-C0-rigged.glb';await io.write(file,doc);const result=await io.read(file),strip=payload=>{
 for(const m of payload.meshes)for(const q of m.primitives)for(const semantic of Object.keys(q.attributes))if(/^JOINTS_|^WEIGHTS_|^_SOURCE_/.test(semantic))delete q.attributes[semantic];return payload;
};assert.deepEqual(strip(immutablePayload(result)),strip(original));assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
const receipt={input:solve.input,inputSha256:sha256(bytes),output:file,sha256:sha256(await fs.readFile(file)),sourceSha256:solve.sourceSha256,solveSha256:sha256(await fs.readFile(directory+'/solve.json')),
 geometryUvImagesBonesAndLegacyClipsPreserved:true,protectedHandsPreserved:true,sourceTriangles:faces.length,accepted:false,activated:false,scope:'Lower-body support staging only. Exact oriented source provenance and opposite UV seams exported; all-pose mesh/contact/volume/collision/visual checks still required.'};
await fs.writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
