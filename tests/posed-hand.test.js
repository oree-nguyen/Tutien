import test from 'node:test';
import assert from 'node:assert/strict';
import {Document} from '@gltf-transform/core';
import {Matrix4,Vector3,Quaternion} from 'three';
import {posedHand} from '../tools/rig/pose-hand.mjs';

function fixture(){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),root=doc.createNode('LeftHand'),skin=doc.createSkin(),joints=[root];scene.addChild(root);
 let parent=root;
 for(let i=1;i<=3;i++){const n=doc.createNode('LeftHandThumb'+i).setTranslation([0,.03,0]);parent.addChild(n);joints.push(n);parent=n;}
 const inverse=new Float32Array(joints.length*16);
 joints.forEach((n,i)=>{skin.addJoint(n);new Matrix4().fromArray(n.getWorldMatrix()).invert().toArray(inverse,i*16);});
 skin.setInverseBindMatrices(doc.createAccessor('',buffer).setType('MAT4').setArray(inverse));
 const p=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor('',buffer).setType('VEC3').setArray(new Float32Array([0,.03,0,0,.06,0,0,.09,0])))
  .setAttribute('JOINTS_0',doc.createAccessor('',buffer).setType('VEC4').setArray(new Uint16Array([1,0,0,0,2,0,0,0,3,0,0,0])))
  .setAttribute('WEIGHTS_0',doc.createAccessor('',buffer).setType('VEC4').setArray(new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0])));
 scene.addChild(doc.createNode('surface').setMesh(doc.createMesh().addPrimitive(p)).setSkin(skin));
 return{doc,frame:{wrist:[0,0,0],fingers:{Thumb:{points:[[0,.03,0],[0,.06,0],[0,.09,0],[0,.12,0]]}}}};
}
test('independent hand FK preserves actual bind finger joints and tip from inverse-bind matrices',()=>{
 const {doc,frame}=fixture(),result=posedHand(doc,frame,'Left',{fingers:{Thumb:{angles:[0,0,0],opposition:0,twists:[0,0,0],points:Array(4).fill([999,999,999])}}});
 result.fingerPoints.Thumb.forEach((p,i)=>assert.ok(p.distanceTo(new Vector3(...frame.fingers.Thumb.points[i]))<1e-8));
});
test('independent finger measurements use the actual posed hierarchy rather than supplied search landmarks',()=>{
 const {doc,frame}=fixture(),result=posedHand(doc,frame,'Left',{fingers:{Thumb:{angles:[90,0,0],opposition:0,twists:[0,0,0],points:Array(4).fill([999,999,999])}}});
 assert.ok(result.fingerPoints.Thumb[3].distanceTo(new Vector3(0,.03,.09))<1e-7);
 assert.ok(result.position(2).distanceTo(new Vector3(0,.03,.06))<1e-7);
});
test('measured flex basis is conjugated into the actual source hierarchy and skin matrices',()=>{
 const {doc,frame}=fixture(),basis=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2).toArray(),
  result=posedHand(doc,frame,'Left',{fingers:{Thumb:{angles:[90,0,0],opposition:0,twists:[0,0,0],canonicalLocal:[basis,[0,0,0,1],[0,0,0,1]]}}});
 assert(result.fingerPoints.Thumb[3].distanceTo(new Vector3(.09,.03,0))<1e-7);
 assert(result.position(2).distanceTo(new Vector3(.06,.03,0))<1e-7);
});
test('nonfinite and nonunit finger frames reject instead of producing false FK contact',()=>{
 for(const basis of [[0,0,0,2],[0,NaN,0,1]]){
  const {doc,frame}=fixture();assert.throws(()=>posedHand(doc,frame,'Left',{fingers:{Thumb:{angles:[90,0,0],opposition:0,twists:[0,0,0],canonicalLocal:[basis]}}}),/Invalid measured finger frame/);
 }
});
