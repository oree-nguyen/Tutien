import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Quaternion,Vector3,Triangle,MathUtils} from 'three';
import {MeshContact} from './mesh-contact.mjs';
import {auditSurface} from './audit-surface.mjs';
import {verifyContactSurface} from './contact-surface.mjs';
import {posedHand} from './pose-hand.mjs';
import {fingerContactMetrics} from '../../src/rig/grip-solver.js';
const dir=process.env.GRIP_SOURCE_DIR??'.local/rig-candidates/h02-left-grip';
const input=JSON.parse(await fs.readFile(`${dir}/input.json`));
const poseFile=process.env.GRIP_POSE??`${dir}/patch-0.5.json`;
const outputPose=process.env.GRIP_STATIC_POSE??`${dir}/static-pose.json`;
const outputReport=process.env.GRIP_REPORT_FILE??'docs/anim-report/conver10-redo/h02-left-grip/exact-contact.json';
const candidate=JSON.parse(await fs.readFile(poseFile));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input.file),hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(bytes)!==input.rigSha256||candidate.rigSha256!==input.rigSha256)throw Error('H02 contact candidate has stale source skin');
const doc=await io.readBinary(bytes),frame=input.frame;
if(JSON.stringify(candidate.fingerFrameCalibration??null)!==JSON.stringify(input.fingerFrameCalibration??null))throw Error('Search finger calibration differs from measured source input');
for(const[name,f]of Object.entries(candidate.fingers))if(f.canonicalLocal){
 const expected=[1,2,3].map(i=>input.fingerFrameCalibration?.canonicalLocal['LeftHand'+name+i]??[0,0,0,1]);
 if(JSON.stringify(f.canonicalLocal)!==JSON.stringify(expected))throw Error('Unbound finger axes '+name);
}
const hand=posedHand(doc,frame,'Left',candidate);
// Strict union: legacy measured hand/cuff crop plus every vertex with any
// nonzero left-finger influence, and every source triangle touching that union.
hand.mask.fill(0);
for(let i=0;i<input.sourceIds.length;i++)if(input.mask[i])hand.mask[input.sourceIds[i]]=1;
const corners=candidate.patch.sourceVertices.map(hand.position),palm=corners.reduce((a,p,i)=>a.addScaledVector(p,candidate.patch.bary[i]),new Vector3());
const normal=new Triangle(...corners).getNormal(new Vector3());
if(normal.dot(new Vector3(...candidate.patch.normal))<0)normal.negate();
const axis=new Vector3(...candidate.shaftAxis),center=new Vector3(...candidate.shaftCenter),contactNormal=center.clone().sub(palm).normalize(),pivot=new Vector3(...input.weapon.gripPivot);
const weaponBytes=await fs.readFile(input.weapon.source),weapon=await io.readBinary(weaponBytes),nodes=weapon.getRoot().listNodes().filter(n=>n.getMesh());
if(nodes.length!==1||nodes[0].getMesh().listPrimitives().length!==1)throw Error('Unexpected multi-primitive weapon source');
const wp=nodes[0].getMesh().listPrimitives()[0],mat=new Matrix4().fromArray(nodes[0].getWorldMatrix()),source=wp.getAttribute('POSITION').getArray(),positions=new Float32Array(source.length),v=new Vector3();
for(let i=0;i<source.length;i+=3)v.fromArray(source,i).applyMatrix4(mat).toArray(positions,i);
const indices=wp.getIndices().getArray().slice();
if(mat.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
const topology=auditSurface(positions,indices);
if(!topology.closedOrientedParityChain)throw Error('Weapon source is not an oriented closed parity chain');
const mesh=new MeshContact(positions,indices),finger={},independentTipErrors={};
const sign=axis.clone().cross(contactNormal.clone().negate()).dot(new Vector3(...frame.f))>=0?1:-1;
for(const[name,p]of Object.entries(candidate.fingers)) {
 const actual=hand.fingerPoints[name];
 if(!actual||p.points.length!==4)throw Error('Missing independent actual-source finger chain '+name);
 const maximumFkPointError=Math.max(...actual.map((point,i)=>point.distanceTo(new Vector3(...p.points[i]))));
 independentTipErrors[name]=maximumFkPointError;
 const metrics=fingerContactMetrics(actual,contactNormal,center,axis,input.weapon.shaftRadius,frame.fingers[name].thickness);
 const total=p.angles.reduce((s,v)=>s+v,0);
 const valid=maximumFkPointError<=1e-6&&total>=150-1e-6&&total<=260+1e-6&&metrics.penetration<=.003+1e-6&&(name==='Thumb'?metrics.tipSurfaceDistance<=.025&&metrics.signedWrapDeg*sign<=-90:metrics.signedWrapDeg*sign>=100);
 finger[name]={...p,points:actual.map(p=>p.toArray()),...metrics,maximumFkPointError,totalFlexDeg:total,valid};
}
const evaluated=[];
try {
 for(const roll of [0,45,90,135,180,225,270,315]) {
  const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),axis).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(roll))),inv=q.clone().invert();
  const toWeapon=p=>p.clone().sub(center).applyQuaternion(inv).add(pivot);
  let maximumIntrusion=0,worst=null;
  for(let i=0;i<input.sourceIds.length;i++)if(input.mask[i]) {
   const sourceId=input.sourceIds[i],point=toWeapon(hand.position(sourceId)),query=mesh.distance(point);
   if(-query.signedDistance>maximumIntrusion){maximumIntrusion=-query.signedDistance;worst={sourceId,sourcePosition:input.positions[i],jointNames:input.ids[i].map(j=>input.joints[j].name),weights:input.weights[i],...query};}
  }
  const query=mesh.distance(toWeapon(palm),{parity:true}),near=new Vector3(...query.closest).sub(pivot).applyQuaternion(q).add(center),facingDot=normal.dot(near.sub(palm).normalize());
  const score=(Math.max(0,maximumIntrusion-.003)*1000)**2+(Math.max(0,.003-query.signedDistance,query.signedDistance-.005)*1000)**2+(Math.max(0,.8-facingDot)*100)**2;
  evaluated.push({roll,weaponQuaternion:q.toArray(),maximumIntrusion,palmGap:query.signedDistance,facingDot,palmAmbiguous:query.ambiguous,score,worst});
 }
 evaluated.sort((a,b)=>a.score-b.score);
 const best=evaluated[0],q=new Quaternion(...best.weaponQuaternion),inv=q.clone().invert();
 const toWeapon=p=>p.clone().sub(center).applyQuaternion(inv).add(pivot);
 const surface=verifyContactSurface(mesh,hand,toWeapon);
 const exactPassed=surface.passed&&best.maximumIntrusion<=.003&&best.palmGap>=.003&&best.palmGap<=.005&&best.facingDot>=.8&&!best.palmAmbiguous;
 const fingerPassed=Object.values(finger).every(f=>f.valid);
 const rotations={};
 for(const j of doc.getRoot().listSkins()[0].listJoints()) {
  const match=j.getName().match(/^LeftHand(Thumb|Index|Middle|Ring|Pinky)([123])$/);if(!match)continue;
  const p=candidate.fingers[match[1]],i=Number(match[2])-1,swing=new Vector3(MathUtils.degToRad(p.angles[i]),0,i===0?MathUtils.degToRad(p.opposition):0),a=swing.length();
  const basis=new Quaternion(...(p.canonicalLocal?.[i]??[0,0,0,1]));
  rotations[j.getName()]=new Quaternion(...j.getRotation()).multiply(basis).multiply(new Quaternion().setFromAxisAngle(a?swing.divideScalar(a):new Vector3(1,0,0),a)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(p.twists[i]))).multiply(basis.clone().invert()).toArray();
 }
 const pose={hero:'H02',hand:'Left',rigFile:input.file,rigSha256:input.rigSha256,weaponSha256:hash(weaponBytes),rotations,fingerParameters:finger,shaftCenter:center.toArray(),shaftAxis:axis.toArray(),weaponQuaternion:best.weaponQuaternion,weaponGripPivot:pivot.toArray(),palmSource: candidate.patch,palm:palm.toArray(),palmNormal:normal.toArray(),passed:exactPassed&&fingerPassed};
 const poseBytes=Buffer.from(JSON.stringify(pose,null,2)+'\n');
 await fs.mkdir(path.dirname(outputPose),{recursive:true});
 await fs.mkdir(path.dirname(outputReport),{recursive:true});
 await fs.writeFile(outputPose,poseBytes);
 const report={hero:'H02',hand:'Left',rigFile:input.file,rigSha256:input.rigSha256,weaponSha256:hash(weaponBytes),poseFile:outputPose,poseSha256:hash(poseBytes),candidateFile:poseFile,passed:pose.passed,exactPassed,fingerPassed,scope:'Actual source weapon and all source hand/cuff triangles touched by the legacy crop or left-finger skin influences. Finger geometry independently reconstructed from actual node FK and inverse-bind matrices. No runtime activation or animation acceptance.',sourceVertexCount:input.sourceIds.length,selectedVertexCount:input.mask.filter(Boolean).length,pythonNodePalmError:palm.distanceTo(new Vector3(...candidate.palm)),independentTipErrors,topology,finger,selected:{...best,surface},evaluated};
 await fs.writeFile(outputReport,JSON.stringify(report,null,2)+'\n');
 console.log({passed:report.passed,exactPassed,fingerPassed,pythonNodePalmError:report.pythonNodePalmError,selected:{...best,worst:best.worst?.sourceId,surface},finger:Object.fromEntries(Object.entries(finger).map(([f,p])=>[f,{valid:p.valid,total:p.totalFlexDeg,wrap:p.signedWrapDeg*sign,penetration:p.penetration}]))});
 if(!report.passed)process.exitCode=1;
}finally{mesh.dispose();}
