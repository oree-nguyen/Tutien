import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Matrix4, Quaternion, Vector3, Triangle, Ray, DoubleSide } from 'three';
import { MeshContact } from './mesh-contact.mjs';

// Isolated H02 experiment. Every exported contact vertex carries its original
// source vertex ID. No source geometry, skin, material or frame is modified.
const dir = process.env.GRIP_SOURCE_DIR??'.local/rig-candidates/h02-left-grip';
await fs.mkdir(dir, {recursive:true});
const file = process.env.RIG_FILE ?? 'assets/rigged/H02-C0-rigged.glb';
const bytes = await fs.readFile(file);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(bytes);
const instances = doc.getRoot().listNodes().filter(n=>n.getMesh());
if (instances.length !== 1 || instances[0].getMesh().listPrimitives().length !== 1)
  throw Error('This experiment explicitly requires the unsplit single source primitive.');
const node=instances[0], skin=node.getSkin(), joints=skin.listJoints();
const prim=node.getMesh().listPrimitives()[0];
const pos=prim.getAttribute('POSITION').getArray(), ids=prim.getAttribute('JOINTS_0').getArray(), ws=prim.getAttribute('WEIGHTS_0').getArray(), indices=prim.getIndices().getArray();
const frame=JSON.parse(await fs.readFile('data/rig/hand-frames.json')).heroes.H02.hands.Left;
let fingerFrameCalibration=null;
if(process.argv.includes('--thumb-palm-plane')){
 const name='LeftHandThumb1',joint=joints.find(j=>j.getName()===name),world=new Matrix4().fromArray(joint.getWorldMatrix()),
  y=new Vector3(...frame.fingers.Thumb.points[1]).sub(new Vector3(...frame.fingers.Thumb.points[0])).normalize(),
  curl=new Vector3(...frame.palmCenter).sub(new Vector3(...frame.fingers.Thumb.points[0])).projectOnPlane(y).normalize(),
  normal=new Vector3(...frame.n).projectOnPlane(y).normalize();
 assert(curl.dot(normal)>.2,'Measured thumb-to-palm flex plane faces the wrong side');
 const x=y.clone().cross(curl).normalize(),z=x.clone().cross(y).normalize(),
  basis=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z)),
  correction=new Quaternion().setFromRotationMatrix(world).invert().multiply(basis).normalize();
 fingerFrameCalibration={method:'Thumb metacarpal positive flex plane from unchanged source CMC/MCP landmarks and measured palm center; all positions, bind rotations and skin weights remain unchanged',
  rigSha256:createHash('sha256').update(bytes).digest('hex'),canonicalLocal:{[name]:correction.toArray()},
  positiveFlexPalmDot:curl.dot(new Vector3(...frame.n)),sourcePalm:frame.palmCenter,sourcePoints:frame.fingers.Thumb.points,reviewed:false,accepted:false};
}
const landmarks=[frame.wrist,...Object.values(frame.fingers).flatMap(f=>f.points)];
const low=[0,1,2].map(k=>Math.min(...landmarks.map(p=>p[k]))-.022);
const high=[0,1,2].map(k=>Math.max(...landmarks.map(p=>p[k]))+.022);
const selected=new Set(), crop=new Set(), fingerJoint=new Set(joints.map((j,i)=>/^LeftHand(Thumb|Index|Middle|Ring|Pinky)/.test(j.getName())?i:-1));
for(let i=0;i<pos.length/3;i++) {
  const within=[0,1,2].every(k=>pos[i*3+k]>=low[k]&&pos[i*3+k]<=high[k]);
  const influenced=[0,1,2,3].some(k=>ws[i*4+k]>0&&fingerJoint.has(ids[i*4+k]));
  if(within||influenced) {selected.add(i);if(within)crop.add(i);}
}
const faces=[];
for(let i=0;i<indices.length;i+=3) {
  const vs=[...indices.slice(i,i+3)];
  if(vs.some(i=>selected.has(i))) faces.push({id:i/3,vertices:vs});
}
const included=new Set(faces.flatMap(f=>f.vertices));
const sourceIds=[...included].sort((a,b)=>a-b), remap=new Map(sourceIds.map((v,i)=>[v,i]));
const mesh=new MeshContact(pos,indices), tri=new Triangle();
const extras=JSON.parse(await fs.readFile('docs/hand-frames/H02-distal-contact-probe.json')).palmCandidates;
const grid=[];
if(process.argv.includes('--palm-grid')) {
  for(const lateral of [-.025,-.015,-.005,.005,.015,.025,.035])for(const distal of [.025,.035,.045,.055]) {
    const origin=new Vector3(...frame.wrist).addScaledVector(new Vector3(...frame.u),lateral).addScaledVector(new Vector3(...frame.f),distal).addScaledVector(new Vector3(...frame.n),.12);
    const ray=new Ray(origin,new Vector3(...frame.n).negate());
    const hits=mesh.bvh.raycast(ray,DoubleSide).sort((a,b)=>a.distance-b.distance);
    const hit=hits.find(h=>h.distance>=.055&&h.distance<=.125);
    if(!hit)continue;
    const vs=[0,1,2].map(k=>mesh.geometry.index.getX(hit.faceIndex*3+k));
    const triangle=new Triangle(...vs.map(i=>new Vector3().fromArray(pos,i*3)));
    const normal=triangle.getNormal(new Vector3());
    if(normal.dot(new Vector3(...frame.n))<.45)continue;
    if(vs.some(i=>!remap.has(i)))continue;
    grid.push({ratio:100+grid.length,center:hit.point.toArray(),normal:normal.toArray(),lateral,distal,scope:'Source palm-grid sample; semantic and visual check required.'});
  }
}
const patches=[...frame.palmCandidates,...extras,...grid].map(p=> {
  const q=mesh.distance(new Vector3(...p.center));
  if(q.distance>1e-5)throw Error('Palm patch is not source geometry');
  const vs=[0,1,2].map(k=>mesh.geometry.index.getX(q.face*3+k));
  tri.set(...vs.map(i=>new Vector3().fromArray(pos,i*3)));
  return {...p,vertices:vs.map(i=>remap.get(i)),sourceVertices:vs,bary:tri.getBarycoord(new Vector3(...q.closest),new Vector3()).toArray()};
});
mesh.dispose();
const out={file,rigSha256:createHash('sha256').update(bytes).digest('hex'),frame,fingerFrameCalibration,
  joints:joints.map((j,i)=>({name:j.getName(),parent:joints.indexOf(j.getParentNode()),local:j.getMatrix(),world:j.getWorldMatrix(),inverse:skin.getInverseBindMatrices().getElement(i,[])})),
  sourceIds,positions:sourceIds.map(i=>[...pos.slice(i*3,i*3+3)]),
  ids:sourceIds.map(i=>[...ids.slice(i*4,i*4+4)]),weights:sourceIds.map(i=>[...ws.slice(i*4,i*4+4)]),
  mask:sourceIds.map(i=>selected.has(i)?1:0),legacyCrop:sourceIds.map(i=>crop.has(i)?1:0),
  faces:faces.map(f=>({id:f.id,vertices:f.vertices.map(i=>remap.get(i))})),patches,
  weapon:JSON.parse(await fs.readFile('data/weapons/H02.json')),
  initial:JSON.parse(await fs.readFile('docs/hand-frames/H02-grip-patch-search.json'))};
await fs.writeFile(`${dir}/input.json`,JSON.stringify(out));
console.log({file,rigSha256:out.rigSha256,vertices:sourceIds.length,triangles:faces.length,selected:selected.size,legacyCrop:crop.size,patches:patches.length,missingPatchVertices:patches.filter(p=>p.vertices.includes(undefined)).length});
