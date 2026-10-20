import test from 'node:test';
import assert from 'node:assert/strict';
import {Document} from '@gltf-transform/core';
import {Quaternion,Vector3,Euler} from 'three';
import {ReferencePose} from '../tools/rig/reference-pose.mjs';
import {alignSourceHead} from '../tools/rig/upright-head.mjs';

function fixture(){
 const d=new Document(),skin=d.createSkin(),torso=d.createNode('Spine2'),neck=d.createNode('Neck').setTranslation([0,.1,0]),head=d.createNode('Head').setTranslation([0,.1,0]);torso.addChild(neck);neck.addChild(head);
 const canonical=new Quaternion().setFromAxisAngle(new Vector3(1,1,0).normalize(),.4).toArray(),frames={};
 for(const n of [torso,neck,head]){skin.addJoint(n);frames[n.getName()]={type:'neck',canonicalLocal:canonical,bindRotation:n.getRotation()};}
 return new ReferencePose(d,frames,{tolerance:1,neck:{flex:[-50,60],lateral:[-35,35],twist:[-45,45]}});
}
test('head stays in the original source orientation using the real neck and arbitrary calibrated axes',()=>{
 const p=fixture(),target=p.rotation(p.nodes.get('Head')),headLocal=p.nodes.get('Head').getRotation(),neckPosition=p.nodes.get('Neck').getTranslation();
 p.nodes.get('Spine2').setRotation(new Quaternion().setFromEuler(new Euler(.3,.15,.2)).toArray());
 const result=alignSourceHead(p,target);assert(result.sourceHeadOrientationErrorDegrees<1e-5);assert.deepEqual(result.violations,[]);
 assert.deepEqual(p.nodes.get('Head').getRotation(),headLocal);assert.deepEqual(p.nodes.get('Neck').getTranslation(),neckPosition);
});
test('a neck-limited head reports remaining error instead of claiming an impossible upright alignment',()=>{
 const p=fixture(),target=p.rotation(p.nodes.get('Head'));p.nodes.get('Spine2').setRotation(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),2).toArray());
 const result=alignSourceHead(p,target);assert(result.sourceHeadOrientationErrorDegrees>30);assert.deepEqual(result.violations,[]);
});
test('a different actual head hierarchy is rejected',()=>{
 const p=fixture();p.nodes.get('Spine2').addChild(p.nodes.get('Head'));assert.throws(()=>alignSourceHead(p,new Quaternion()),/hierarchy/);
});
