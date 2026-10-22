import test from 'node:test';
import assert from 'node:assert/strict';
import {Document} from '@gltf-transform/core';
import {Matrix4,Quaternion,Vector3} from 'three';
import {appendClothChains,clothGuideRotations} from '../tools/rig/secondary-cloth-chain.mjs';

function fixture(){
 const d=new Document(),buffer=d.createBuffer(),hips=d.createNode('Hips').setTranslation([.1,.9,-.2]).setRotation(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.2).toArray()),skin=d.createSkin().addJoint(hips);
 d.createScene().addChild(hips);skin.setInverseBindMatrices(d.createAccessor('',buffer).setType('MAT4').setArray(Float32Array.from(new Matrix4().fromArray(hips.getWorldMatrix()).invert().elements)));
 return{d,hips,config:{chains:[{name:'Cloth_Left',rows:4,spacing:.12,anchor:[.2,.95,.1],anglesDegrees:[-70,-90,-95,-85]}]}};
}
test('secondary joints preserve original bind matrices and leave every source point unchanged at rest',()=>{
 const{d,hips,config}=fixture(),original=hips.getMatrix().slice(),prefix=d.getRoot().listSkins()[0].getInverseBindMatrices().getArray().slice(),s=appendClothChains(d,config),skin=d.getRoot().listSkins()[0];
 assert.deepEqual(hips.getMatrix(),original);assert.deepEqual(skin.getInverseBindMatrices().getArray().subarray(0,16),prefix);assert.equal(s.coreJointCount,1);assert.equal(s.records.length,4);
 for(const r of s.records){const m=new Matrix4().fromArray(skin.listJoints()[r.index].getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(r.index,[])));
  for(const p of [[.1,.7,-.1],[.2,.9,.1],[-.2,.3,.2]])assert(new Vector3(...p).applyMatrix4(m).distanceTo(new Vector3(...p))<2e-7);
 }
});
test('drape rotates existing links without scaling them or moving the human joint',()=>{
 const{d,hips,config}=fixture(),s=appendClothChains(d,config),skin=d.getRoot().listSkins()[0],original=hips.getMatrix().slice(),rotations=clothGuideRotations(config,s,1);
 for(const r of s.records){const n=skin.listJoints()[r.index];n.setRotation(rotations[r.name]);assert.deepEqual(n.getTranslation(),r.bindTranslation);assert.deepEqual(n.getScale(),[1,1,1]);}
 for(let i=1;i<s.records.length;i++){const a=new Vector3().fromArray(skin.listJoints()[s.records[i-1].index].getWorldMatrix(),12),b=new Vector3().fromArray(skin.listJoints()[s.records[i].index].getWorldMatrix(),12);assert(Math.abs(a.distanceTo(b)-.12)<2e-7);}
 assert.deepEqual(hips.getMatrix(),original);
});
test('zero activation returns the exact secondary bind rotations and invalid activation rejects',()=>{
 const{d,config}=fixture(),s=appendClothChains(d,config),r=clothGuideRotations(config,s,0);
 for(const bone of s.records)assert(new Quaternion(...r[bone.name]).angleTo(new Quaternion(...bone.bindRotation))<1e-7);
 for(const value of [-.1,1.1,NaN])assert.throws(()=>clothGuideRotations(config,s,value));
});

test('zero-angle waist rows share the exact hip skin transform after a crouch, across distinct source cloth anchors',()=>{
 const{d,hips}=fixture(),config={chains:['Front','Back'].map((face,i)=>({name:'Cloth_'+face,rows:4,spacing:.13,anchor:[.12,.99,i?-.1:.1],anglesDegrees:[0,0,0,i?40:-65]}))},
  s=appendClothChains(d,config),skin=d.getRoot().listSkins()[0],rotations=clothGuideRotations(config,s,1);
 hips.setTranslation([0,.52,-.04]).setRotation(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.49).toArray());
 for(const r of s.records)skin.listJoints()[r.index].setRotation(rotations[r.name]);
 const hipMatrix=new Matrix4().fromArray(hips.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(0,[])));
 for(const r of s.records.filter(r=>r.row<3)){
  const matrix=new Matrix4().fromArray(skin.listJoints()[r.index].getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(r.index,[])));
  for(const point of [[.12,.86,.15],[-.1,.76,-.13],[0,1,0]])assert(new Vector3(...point).applyMatrix4(matrix).distanceTo(new Vector3(...point).applyMatrix4(hipMatrix))<1e-6);
 }
});
