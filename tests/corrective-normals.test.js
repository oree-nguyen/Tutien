import test from 'node:test';
import assert from 'node:assert/strict';
import {Matrix3,Vector3} from 'three';
import {correctiveNormalDelta,accumulateSurfaceNormals} from '../tools/rig/corrective-normals.mjs';

test('a 90-degree surface turn transports the authored normal without replacing its detail',()=>{
  const n=[.2,0,1],d=correctiveNormalDelta(n,[0,0,1],[0,-1,0],new Matrix3());
  const transformed=new Vector3(...n).add(new Vector3(...d));
  assert.ok(transformed.distanceTo(new Vector3(.2,-1,0))<1e-12);
  assert.deepEqual(correctiveNormalDelta(n,[0,0,1],[0,0,1],new Matrix3()),[0,0,0]);
});

test('transport through a blended skin transform preserves the desired world normal',()=>{
  const skin=new Matrix3().set(.7,.1,0,0,.8,0,0,0,1),n=[.2,.1,1],
    d=correctiveNormalDelta(n,[0,0,1],[1,0,0],skin),
    actual=new Vector3(...n).add(new Vector3(...d)).applyMatrix3(skin),
    source=new Vector3(...n).applyMatrix3(skin);
  assert.ok(Math.abs(actual.x-source.z)<1e-12);
  assert.ok(Math.abs(actual.y-source.y)<1e-12);
  assert.ok(Math.abs(actual.z+source.x)<1e-12);
  assert.deepEqual(correctiveNormalDelta(n,[0,0,1],[1,0,0],skin,true),[0,0,0]);
  assert.throws(()=>correctiveNormalDelta(n,[0,0,1],[1,0,0],new Matrix3().set(0,0,0,0,0,0,0,0,0)),/Singular/);
});

test('UV copies use exact weld identities while separate coincident layers stay separate',()=>{
  const positions=[0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,-1,0],groups=[0,1,2,0,1,3],out=new Float64Array(12);
  accumulateSurfaceNormals([0,1,2,3,4,5],positions,groups,out);
  assert.deepEqual(Array.from(out.slice(0,6)),[0,0,0,0,0,0]);
  assert.deepEqual(Array.from(out.slice(6)),[0,0,1,0,0,-1]);
});
