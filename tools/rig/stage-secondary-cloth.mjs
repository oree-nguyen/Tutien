/** Source-bound secondary cloth staging; no primitive/model generation. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {appendClothChains,clothGuideRotations} from './secondary-cloth-chain.mjs';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
import {copyProvenance} from './copy-provenance.mjs';

const [base,output,poseFile]=process.argv.slice(2);for(const dir of [base,output])assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(dir));assert.notEqual(base,output);assert(poseFile);
const input=base+'/H01-C0-rigged.glb',bytes=await fs.readFile(input),poseBytes=await fs.readFile(poseFile),pose=JSON.parse(poseBytes),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),before=immutablePayload(doc),clips=doc.getRoot().listAnimations().map(animationSignature),
 core=doc.getRoot().listSkins()[0].listJoints(),coreIBM=doc.getRoot().listSkins()[0].getInverseBindMatrices().getArray().slice(),parts=[];
assert.equal(core.length,52);assert(pose.passed===true||pose.poseDataValid===true);assert(!pose.scales);
await fs.mkdir(output,{recursive:true});
let vertices=0,faces=0;for(const[nodeIndex,node]of doc.getRoot().listNodes().entries())for(const[primitiveIndex,p]of node.getMesh()?.listPrimitives().entries()??[]){
 parts.push({nodeIndex,primitiveIndex,name:node.getName(),offset:vertices,count:p.getAttribute('POSITION').getCount(),faces:p.getIndices().getCount()/3});vertices+=p.getAttribute('POSITION').getCount();faces+=p.getIndices().getCount()/3;
}
const position=new Float32Array(vertices*3),fans=new Uint32Array(vertices),ids=new Uint16Array(vertices*4),weights=new Float32Array(vertices*4),roles=new Uint8Array(vertices),triangles=new Uint32Array(faces*3),protectedMask=new Uint8Array(vertices),
 frames=JSON.parse(await fs.readFile('data/rig/hand-frames.json')).heroes.H01.hands,
 bounds=Object.values(frames).map(f=>{const pts=[f.wrist,...Object.values(f.fingers).flatMap(f=>f.points)];return{low:[0,1,2].map(k=>Math.min(...pts.map(p=>p[k]))-.022),high:[0,1,2].map(k=>Math.max(...pts.map(p=>p[k]))+.022)};}),
 finger=new Set(core.flatMap((n,i)=>/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(n.getName())?[i]:[]));let faceOffset=0;
for(const part of parts){
 const p=doc.getRoot().listNodes()[part.nodeIndex].getMesh().listPrimitives()[part.primitiveIndex],off=part.offset;
 position.set(p.getAttribute('POSITION').getArray(),off*3);fans.set(p.getAttribute('_SOURCE_CUT_WELD').getArray(),off);ids.set(p.getAttribute('JOINTS_0').getArray(),off*4);weights.set(p.getAttribute('WEIGHTS_0').getArray(),off*4);
 roles.fill(part.name==='H01_Robe_Left'?1:part.name==='H01_Robe_Right'?2:0,off,off+part.count);
 const index=p.getIndices().getArray();for(let i=0;i<index.length;i++)triangles[faceOffset+i]=off+index[i];faceOffset+=index.length;
 for(let i=off;i<off+part.count;i++)protectedMask[i]=bounds.some(b=>[0,1,2].every(k=>position[i*3+k]>=b.low[k]&&position[i*3+k]<=b.high[k]))||[0,1,2,3].some(k=>weights[i*4+k]>1e-8&&finger.has(ids[i*4+k]));
}
const median=values=>{values.sort((a,b)=>a-b);assert(values.length);return values[Math.floor(values.length/2)];},chains=[];
for(const[role,side]of [[1,'Left'],[2,'Right']])for(const[sign,face]of [[1,'Front'],[-1,'Back']]){
 const xs=[],zs=[];for(let i=0;i<vertices;i++)if(roles[i]===role&&position[i*3+1]>.90&&position[i*3+1]<1.03&&position[i*3+2]*sign>.02){xs.push(position[i*3]);zs.push(position[i*3+2]);}
 chains.push({name:`H01_Cloth_${side}_${face}`,role,sign,anchor:[median(xs),.99,median(zs)],rows:8,spacing:.13,anglesDegrees:[75,90,95,95,90,85,80,75].map(a=>-sign*a)});
}
const config={kind:'secondary-cloth-source-chain-staging',chains,transitionMetres:.12,waistFade:[.85,.99],accepted:false},skeleton=appendClothChains(doc,config),raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),files={};
for(const[name,a]of Object.entries({'positions.f32bin':position,'fans.u32bin':fans,'ids.u16bin':ids,'weights.f32bin':weights,'roles.u8bin':roles,'triangles.u32bin':triangles,'protected.u8bin':protectedMask})){const b=raw(a);await fs.writeFile(output+'/'+name,b);files[name]=sha256(b);}
const meta={input,inputSha256:sha256(bytes),poseFile,poseSha256:sha256(poseBytes),vertices,faces,parts,config,skeleton,files};await fs.writeFile(output+'/input.json',JSON.stringify(meta,null,2)+'\n');
const solve=spawnSync('python3',['tools/rig/secondary_cloth_weights.py',output],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'},maxBuffer:1024*1024});process.stdout.write(solve.stdout);process.stderr.write(solve.stderr);assert.equal(solve.status,0,'Secondary cloth support solve failed');
const read=async(file,Type)=>{const b=await fs.readFile(output+'/'+file);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},resultIds=await read('result-ids.u16bin',Uint16Array),resultWeights=await read('result-weights.f32bin',Float32Array),changed=await read('changed.u8bin',Uint8Array);
assert.equal(resultIds.length,ids.length);assert.equal(resultWeights.length,weights.length);assert.equal(changed.length,vertices);
for(const part of parts){const p=doc.getRoot().listNodes()[part.nodeIndex].getMesh().listPrimitives()[part.primitiveIndex],oldIds=p.getAttribute('JOINTS_0').getArray(),newIds=new oldIds.constructor(resultIds.subarray(part.offset*4,(part.offset+part.count)*4));
 assert.deepEqual(Uint16Array.from(newIds),resultIds.subarray(part.offset*4,(part.offset+part.count)*4),'Joint component type overflow');
 for(let i=part.offset;i<part.offset+part.count;i++)if(protectedMask[i]||!changed[i]){assert.deepEqual(resultIds.subarray(i*4,i*4+4),ids.subarray(i*4,i*4+4));assert.deepEqual(resultWeights.subarray(i*4,i*4+4),weights.subarray(i*4,i*4+4));}
 p.getAttribute('JOINTS_0').setArray(newIds);p.getAttribute('WEIGHTS_0').setArray(resultWeights.slice(part.offset*4,(part.offset+part.count)*4));
}
const provenanceFiles=await copyProvenance(doc,base,output);
const file=output+'/H01-C0-rigged.glb';await io.write(file,doc);const reread=await io.read(file),after=immutablePayload(reread),strip=a=>{for(const mesh of a.meshes)for(const p of mesh.primitives){delete p.attributes.JOINTS_0;delete p.attributes.WEIGHTS_0;}for(const skin of a.skins)delete skin.inverseBind;return a;};
after.nodes=after.nodes.slice(0,before.nodes.length);after.skins[0].joints=after.skins[0].joints.slice(0,52);assert.deepEqual(strip(after),strip(before));assert.deepEqual(reread.getRoot().listSkins()[0].getInverseBindMatrices().getArray().subarray(0,52*16),coreIBM);assert.deepEqual(reread.getRoot().listAnimations().map(animationSignature),clips);
const rotations=clothGuideRotations(config,skeleton,1),diagnostic={...pose,passed:false,poseDataValid:true,rotations:{...pose.rotations,...rotations},scope:'One-pose secondary-cloth source experiment. All original geometry/UV/images and52core joints preserved; extra32cloth joints, no runtime activation or animation acceptance.'};
await fs.writeFile(output+'/crouch-pose.json',JSON.stringify(diagnostic,null,2)+'\n');
const receipt={input,inputSha256:sha256(bytes),output:file,sha256:sha256(await fs.readFile(file)),sourceCoreJoints:52,additionalClothJoints:skeleton.records.length,geometryUvImagesAndLegacyClipsPreserved:true,coreJointTransformsAndInverseBindsPreserved:true,
 solveSha256:sha256(await fs.readFile(output+'/solve.json')),poseSha256:sha256(await fs.readFile(output+'/crouch-pose.json')),provenanceFiles,accepted:false,activated:false,scope:diagnostic.scope};
await fs.writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
