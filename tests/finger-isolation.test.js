import test from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vector3 } from "three";
import { isolateFingerPose } from "../tools/rig/finger-isolation.mjs";
import { handStrain } from "../tools/rig/hand-strain.mjs";

function poses() {
  const names=["Hips","LeftHand","RightHand",...["Left","Right"].flatMap(s=>["Thumb","Index","Middle","Ring","Pinky"].flatMap(f=>[1,2,3].map(i=>s+"Hand"+f+i)))];
  return [
    {rotations:Object.fromEntries(names.map(n=>[n,[0,0,0,1]])),translations:Object.fromEntries(names.map(n=>[n,[.1,.2,.3]]))},
    {rotations:Object.fromEntries(names.map(n=>[n,new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/4).toArray()])),translations:Object.fromEntries(names.map(n=>[n,[7,8,9]]))}
  ];
}

test("finger counterfactual preserves body, other fingers, translations and inputs",()=>{
  const [bind,stress]=poses(), before=JSON.stringify([bind,stress]);
  const result=isolateFingerPose(bind,stress,"Left","Index");
  assert.deepEqual(result.changedJoints,["LeftHandIndex1","LeftHandIndex2","LeftHandIndex3"]);
  for(const n of Object.keys(bind.rotations)) {
    assert.deepEqual(result.rotations[n],(result.changedJoints.includes(n)?stress:bind).rotations[n]);
    assert.deepEqual(result.translations[n],bind.translations[n]);
  }
  result.rotations.LeftHandIndex1[0]=99;
  assert.equal(JSON.stringify([bind,stress]),before);
});

test("missing bone or invalid quaternion fails closed",()=>{
  const [bind,stress]=poses();
  delete stress.rotations.LeftHandIndex3;
  assert.throws(()=>isolateFingerPose(bind,stress,"Left","Index"));
  const [b,s]=poses();s.rotations.RightHandThumb1=[0,0,0,2];
  assert.throws(()=>isolateFingerPose(b,s,"Left","Index"));
});

test("simultaneous finger motion can conceal wrong cross-finger ownership",()=>{
  const [bind,stress]=poses(), single=isolateFingerPose(bind,stress,"Left","Index");
  const source=new Float32Array([1,0,0,1,.001,0,1.001,0,0]);
  const primitive={getAttribute:n=>n==="POSITION"?{getArray:()=>source}:null,getIndices:()=>({getArray:()=>new Uint16Array([0,1,2])})};
  const joints=["LeftHandIndex1","LeftHandMiddle1","LeftHandMiddle1"];
  const measure=pose=>handStrain({primitive,mask:new Uint8Array([1,1,1]),position:i=>new Vector3().fromArray(source,i*3).applyQuaternion(new Quaternion(...pose.rotations[joints[i]]))});
  const together=measure(stress), isolated=measure(single);
  assert.equal(together.passed,true);
  assert.ok(together.maximum<1.000001);
  assert.equal(isolated.passed,false);
  assert.ok(isolated.maximum>500);
  assert.equal(isolated.thresholds.maximum,2);
});
