import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import{createHash}from'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Vector3,Matrix4,AnimationMixer} from 'three';
import {loadCpuGlb} from './helpers/load-cpu-glb.mjs';
import{createH01IK,poseCrouch,poseRightHand}from'../src/h01-ik.js';
import{entranceFrame,H01_ENTRANCE}from'../src/h01-entrance.js';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});

test('three actual Hunyuan staff LODs have PBR, a real 4cm grip, correct length and attachment pivots',async()=>{
 const receipt=JSON.parse(await readFile('public/models/h01-staff/provenance.json'));
 assert.match(receipt.sourceShare,/4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6/);
 for(const level of receipt.levels){
  const path='public/models/h01-staff/'+level.file,raw=await readFile(path),doc=await io.read(path),root=doc.getRoot();
  assert.equal(createHash('sha256').update(raw).digest('hex'),level.sha256);
  for(const name of ['Staff_Root','Staff_Base_Tip','Staff_Head_Core'])assert.ok(root.listNodes().some(n=>n.getName()===name));
  assert.ok(root.listTextures().length>=3);assert.ok(root.listTextures().every(t=>t.getMimeType()==='image/webp'));
  const points=[];let triangles=0;
  for(const node of root.listNodes())if(node.getMesh())for(const primitive of node.getMesh().listPrimitives()){
   const material=primitive.getMaterial();assert.ok(material.getBaseColorTexture());assert.ok(material.getMetallicRoughnessTexture());assert.ok(material.getNormalTexture());
   triangles+=primitive.getIndices().getCount()/3;
   const position=primitive.getAttribute('POSITION'),matrix=new Matrix4().fromArray(node.getWorldMatrix());
   for(let i=0;i<position.getCount();i++)points.push(new Vector3().fromArray(position.getElement(i,[])).applyMatrix4(matrix));
  }
  assert.equal(triangles,level.triangles);
  const low=Math.min(...points.map(p=>p.y)),high=Math.max(...points.map(p=>p.y));
  assert.ok(Math.abs((high-low)-1.82*1.12)<.004);
  const tip=root.listNodes().find(n=>n.getName()==='Staff_Base_Tip').getWorldMatrix();assert.ok(Math.abs(tip[13]-low)<.003);
  if(level.detail==='high'){
   const grip=points.filter(p=>Math.abs(p.y)<.025);
   const diameter=Math.max(...grip.map(p=>p.x))-Math.min(...grip.map(p=>p.x));
   assert.ok(diameter>=.035&&diameter<=.045);
  }
 }
});
test('all thirty finger joints and both toes influence actual high LOD vertices',async()=>{
 const d=await io.read('public/models/h01-c0/h01-c0-high.glb'),root=d.getRoot(),skin=root.listSkins()[0],joints=skin.listJoints();
 assert.equal(joints.length,52);
 assert.ok(root.listNodes().some(n=>n.getName()==='RightHand_WeaponSocket'));
 const counts=new Map(joints.map(j=>[j.getName(),0]));
 for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
  const j=primitive.getAttribute('JOINTS_0'),w=primitive.getAttribute('WEIGHTS_0');
  for(let i=0;i<j.getCount();i++){
   const js=j.getElement(i,[]),ws=w.getElement(i,[]);assert.ok(Math.abs(ws.reduce((a,b)=>a+b,0)-1)<.001);
   for(let k=0;k<4;k++)if(ws[k]>.01)counts.set(joints[js[k]].getName(),counts.get(joints[js[k]].getName())+1);
  }
 }
 for(const [name,count]of counts)if(/Hand(Thumb|Index|Middle|Ring|Pinky)\d|ToeBase/.test(name))assert.ok(count>0,name+' must deform real vertices');
});
test('actual entrance clip plants the left palm and fingers fit the staff instead of being decorative nodes',async()=>{
 const gltf=await loadCpuGlb('public/models/h01-c0/h01-c0-high.glb'),body=gltf.scene,rig=createH01IK(body),mixer=new AnimationMixer(body);
 const clip=gltf.animations.find(a=>a.name==='Entrance');assert.ok(Math.abs(clip.duration-4.2)<.001);
 mixer.clipAction(clip).play();mixer.setTime(1.85);poseCrouch(rig,1);
 const palm=rig.leftSocket.getWorldPosition(new Vector3());assert.ok(palm.distanceTo(new Vector3(0,.025,.22))<.002);
 const hips=body.getObjectByName('Hips').getWorldPosition(new Vector3());assert.ok(Math.abs(hips.y-.48)<.001);
 mixer.setTime(3.55);poseRightHand(rig,[-.34,1.264,.18]);assert.ok(rig.lastError<.001);
 for(const finger of ['Thumb','Index','Middle','Ring','Pinky']){
  const point=body.getObjectByName('RightHand'+finger+'3').getWorldPosition(new Vector3()).sub(new Vector3(-.34,1.264,.18));
  const radius=Math.hypot(point.x,point.z);assert.ok(radius>.021&&radius<.032, finger+' must curl around the handle');
 }
});
test('entrance phases preserve the exact grip/impact times and support dropped frames',()=>{
 assert.equal(H01_ENTRANCE.duration,4.2);assert.equal(entranceFrame(3.049).gripped,false);assert.equal(entranceFrame(3.05).gripped,true);
 assert.equal(entranceFrame(3.549).impact,false);assert.equal(entranceFrame(3.55).impact,true);
 assert.equal(entranceFrame(4.2).complete,true);assert.equal(entranceFrame(.6).visible,false);
 assert.equal(entranceFrame(3.8).shake,0);assert.equal(entranceFrame(9).complete,true);
});
