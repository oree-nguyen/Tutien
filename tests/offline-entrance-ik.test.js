import test from "node:test";
import assert from "node:assert/strict";
import {Document} from "@gltf-transform/core";
import {Vector3,Quaternion} from "three";
import {ReferencePose} from "../tools/rig/reference-pose.mjs";
import {solveOfflineChain,limitAngularStep,limitAngularChain} from "../tools/rig/offline-entrance-ik.mjs";
function fixture(){const d=new Document(),root=d.createNode("root"),a=d.createNode("upper").setTranslation([0,1,0]),b=d.createNode("middle").setTranslation([0,-.4,0]),c=d.createNode("end").setTranslation([0,-.35,0]);root.addChild(a);a.addChild(b);b.addChild(c);const skin=d.createSkin();for(const n of[root,a,b,c])skin.addJoint(n);const frames=Object.fromEntries([root,a,b,c].map(n=>[n.getName(),{bindRotation:[0,0,0,1],canonicalLocal:[0,0,0,1],type:n===b?"hinge":"broad"}])),broad={flex:[-180,180],lateral:[-180,180],twist:[-180,180]};return new ReferencePose(d,frames,{tolerance:1,broad,hinge:{...broad,flex:[0,150]}});}
test("offline two-link solver preserves source bone lengths and follows its pole",()=>{const pose=fixture(),before=pose.joints.map(n=>[n.getTranslation(),n.getScale()]),target=new Vector3(.2,.55,.1),r=solveOfflineChain(pose,["upper","middle","end"],{target,orientation:new Quaternion(),pole:new Vector3(0,.7,-.4)});assert.equal(r.passed,true);assert.ok(pose.position(pose.nodes.get("end")).distanceTo(target)<1e-7);assert.ok(r.elbow[2]<0);assert.deepEqual(pose.joints.map(n=>[n.getTranslation(),n.getScale()]),before);});
test("offline solver records unreachable ground target and never claims contact",()=>{const pose=fixture(),r=solveOfflineChain(pose,["upper","middle","end"],{target:new Vector3(0,0,0),orientation:new Quaternion(),pole:new Vector3(0,.5,-.4),flexRange:[0,10]});assert.equal(r.passed,false);assert.ok(r.positionError>.2);assert.ok(r.maximumReach<.75);});
test("unreachable contact exports bounded joints and retains the measured endpoint error",()=>{
 const pose=fixture();pose.frames.upper.type="restricted";pose.limits.restricted={flex:[-15,15],lateral:[-15,15],twist:[-10,10]};
 const r=solveOfflineChain(pose,["upper","middle","end"],{target:new Vector3(.7,.95,0),orientation:new Quaternion(),pole:new Vector3(0,.7,-.4)});
 assert.equal(r.passed,false);assert.ok(r.positionError>.2);assert.deepEqual(pose.report(),[]);assert.deepEqual(r.violations,[]);
 assert.ok(Math.abs(r.positionError-pose.position(pose.nodes.get("end")).distanceTo(new Vector3(.7,.95,0)))<1e-12);
});
test("offline branch smoothing limits a measured jump while preserving the eventual endpoint",()=>{
 const initial=new Quaternion(),target=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI*.75);
 let previous=initial.clone();
 for(let sample=0;sample<30;sample++){const next=limitAngularStep(previous,target,8);assert.ok(previous.angleTo(next)<=8*Math.PI/180+1e-12);assert.ok(Math.abs(next.length()-1)<1e-12);previous=next;}
 assert.ok(previous.angleTo(target)<1e-7);assert.deepEqual(initial.toArray(),[0,0,0,1]);
});
test("linked limb smoothing keeps knee and ankle at the same transition progress as the hip",()=>{
 const previous=[new Quaternion(),new Quaternion(),new Quaternion()],current=[60,20,40].map(degrees=>new Quaternion().setFromAxisAngle(new Vector3(1,0,0),degrees*Math.PI/180)),
   next=limitAngularChain(previous,current,8),progress=next.map((q,i)=>previous[i].angleTo(q)/previous[i].angleTo(current[i]));
 assert.ok(Math.max(...next.map((q,i)=>previous[i].angleTo(q)))<=8*Math.PI/180+1e-12);
 assert.ok(Math.max(...progress)-Math.min(...progress)<1e-12);
 assert.ok(progress[0]>0&&progress[0]<1);
});
test('bounded offline refinement recovers an attainable off-axis hinge contact without stretching bones',()=>{
 const pose=fixture();pose.limits.hinge.lateral=[-8,8];pose.limits.hinge.twist=[0,0];
 const upper=pose.nodes.get('upper'),middle=pose.nodes.get('middle'),end=pose.nodes.get('end');
 upper.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.3).toArray());
 const swing=new Vector3(Math.PI/3,0,6*Math.PI/180),a=swing.length();middle.setRotation(new Quaternion().setFromAxisAngle(swing.divideScalar(a),a).toArray());
 const target=pose.position(end),orientation=pose.rotation(end),original=pose.joints.map(n=>[n.getTranslation(),n.getScale()]);pose.reset();
 const result=solveOfflineChain(pose,['upper','middle','end'],{target,orientation,pole:new Vector3(0,.7,-.4),endLimits:{flex:[0,0],lateral:[0,0],twist:[0,0]},boundedFit:true});
 assert.equal(result.boundedFitAttempted,true);assert.equal(result.passed,true);assert.ok(result.positionError<.005);assert.ok(result.orientationErrorDegrees<1);
 assert.deepEqual(pose.joints.map(n=>[n.getTranslation(),n.getScale()]),original);
});
