/** Inspect the source sleeve/waist attachment independently of shared weights.
 * This deliberately opens source interfaces and MUST fail the sewn-seam gate.
 * It is not an approved cut, an activation tool, or a seam exemption.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Vector3} from 'three';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';

const input='.local/rig-candidates/semantic-garment-v7/H01-C0-rigged.glb',output='.local/rig-candidates/detached-coat-trial',
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input),doc=await io.readBinary(bytes),
 protectedMask=new Uint8Array(await fs.readFile('.local/rig-candidates/semantic-garment-v6/protected.bin')),
 strip=p=>{for(const m of p.meshes)for(const q of m.primitives){delete q.attributes.JOINTS_0;delete q.attributes.WEIGHTS_0;}return p;},
 original=strip(immutablePayload(doc)),clips=doc.getRoot().listAnimations().map(animationSignature),changed=[];
assert.equal(sha256(bytes),'5fcf74580c7bcb9d48adcaebbdb1c379712f89ad2e34d0d55a18d7a6a6902db4');
await fs.mkdir(output,{recursive:true});
for(const node of doc.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
 const sourceIds=primitive.getAttribute('_SOURCE_VERTEX').getArray(),skin=node.getSkin(),joints=skin.listJoints(),names=joints.map(j=>j.getName()),
  ids=primitive.getAttribute('JOINTS_0').getArray(),weights=primitive.getAttribute('WEIGHTS_0').getArray(),positions=primitive.getAttribute('POSITION').getArray(),
  source=primitive.getExtras().sourceProvenance,part=node.getName();
 let count=0;
 if(part==='H01_Robe_Left'||part==='H01_Robe_Right'){
  for(let i=0;i<sourceIds.length;i++)if(!protectedMask[sourceIds[i]]){
   // Restore lower cloth to the pelvis instead of forcing it to follow a cuff.
   // A short waist transition retains a torso attachment at the existing source.
   const t=Math.max(0,Math.min(1,(positions[i*3+1]-.89)/.14)),alpha=t*t*(3-2*t);
   ids.set([names.indexOf('Hips'),names.indexOf('Spine'),0,0],i*4);weights.set([1-alpha,alpha,0,0],i*4);count++;
  }
 }else if(part==='H01_Sleeve_Left'||part==='H01_Sleeve_Right'){
  const side=part.endsWith('Left')?'Left':'Right',arm=joints.find(j=>j.getName()===side+'Arm'),fore=joints.find(j=>j.getName()===side+'ForeArm'),
   a=new Vector3().fromArray(arm.getWorldMatrix(),12),b=new Vector3().fromArray(fore.getWorldMatrix(),12),axis=b.clone().sub(a),v=new Vector3();
  for(let i=0;i<sourceIds.length;i++)if(!protectedMask[sourceIds[i]]){
   const along=v.fromArray(positions,i*3).sub(a).dot(axis)/axis.lengthSq(),t=Math.max(0,Math.min(1,(along-.15)/1.05)),alpha=t*t*(3-2*t);
   ids.set([names.indexOf(side+'Arm'),names.indexOf(side+'ForeArm'),0,0],i*4);weights.set([1-alpha,alpha,0,0],i*4);count++;
  }
 }
 changed.push({part,primitive:primitive.getExtras().auditRegion??null,changedCopies:count});
 for(const file of [source.triangleMap.file,source.weldMap.file,source.weldMap.review.file])await fs.copyFile(path.resolve(path.dirname(input),file),path.resolve(output,file));
}
const file=output+'/H01-C0-rigged.glb';await io.write(file,doc);const result=await io.read(file);
assert.deepEqual(strip(immutablePayload(result)),original);assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
const receipt={input,inputSha256:sha256(bytes),output:file,sha256:sha256(await fs.readFile(file)),changed,
 sourceGeometryUvImagesAndLegacyClipsPreserved:true,protectedHandsPreserved:true,approvedCuts:false,seamExemptions:false,accepted:false,activated:false,
 scope:'Visual/source-interface diagnostic only. Panel and sleeve supports are intentionally independent at original attachment copies. Existing sewn-seam checker must reject openings; no statement that a proper garment cut has been made.'};
await fs.writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
