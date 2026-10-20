import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Quaternion,Matrix4,Vector3} from 'three';
import {torsoDirection,referenceTorsoValid} from '../tools/rig/stance-direction.mjs';

test('a backward or sideways torso cannot pass the forward-crouch reference',()=>{
 const angle=20*Math.PI/180,forward=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),angle),back=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-angle),side=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),angle);
 assert(referenceTorsoValid(forward));assert(!referenceTorsoValid(back));assert(!referenceTorsoValid(side));
 assert(Math.abs(torsoDirection(forward).tilt-torsoDirection(back).tilt)<1e-9);
});
test('the historical source H02 stance really leans backwards despite passing its absolute-tilt scope',async()=>{
 const frames=JSON.parse(await fs.readFile('data/rig/bind-frames.json')).heroes.H02.joints,pose=JSON.parse(await fs.readFile('docs/anim-report/conver10-redo/animation/stances/H02-ground.json')),worlds={};
 for(const[name,f]of Object.entries(frames)){
  const matrix=new Matrix4().compose(new Vector3(...(pose.translations?.[name]??f.bindPosition)),new Quaternion(...(pose.rotations[name]??f.bindRotation)),new Vector3(1,1,1));if(worlds[f.parent])matrix.premultiply(worlds[f.parent]);worlds[name]=matrix;
 }
 const rotation=new Quaternion().setFromRotationMatrix(worlds.Spine2).normalize(),m=torsoDirection(rotation);
 assert(m.tilt<=26);assert(m.forwardLean<0);assert.equal(referenceTorsoValid(rotation),false);
});
test('independent Python direction checks reject scaled and backward frames',()=>{
 const result=execFileSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_stance_direction.py'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,OPENBLAS_NUM_THREADS:'1'}});assert.equal(result,'');
});
