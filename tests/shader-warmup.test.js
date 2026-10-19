import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {warmSceneMaterials} from '../src/shader-warmup.js';
test('all unique images upload even when meshes share the same shader program',async()=>{
 const original=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=fn=>setImmediate(fn);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),uploads=[],compiled=[];
 const textures=[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()];
 const geometry=new THREE.BufferGeometry();
 for(const texture of [...textures,textures[0]])scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture})));
 try{
  const result=await warmSceneMaterials({initTexture:t=>uploads.push(t),compileAsync:async m=>compiled.push(m)},scene,camera,scene,true);
  assert.deepEqual(uploads,textures);assert.equal(compiled.length,1);assert.equal(result.filter(x=>x.kind==='texture').length,3);
 }finally{globalThis.requestAnimationFrame=original;geometry.dispose();}
});

test('cancelling during a texture yield prevents remaining uploads and program compilation',async t=>{
 const original=globalThis.requestAnimationFrame;
 let now=0,paint,cancelled=false,paints=0;
 t.mock.method(performance,'now',()=>now);
 globalThis.requestAnimationFrame=callback=>{paints++;paint=callback;};
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),uploads=[],compiled=[];
 const textures=[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()];
 const geometry=new THREE.BufferGeometry(),materials=textures.map(map=>new THREE.MeshStandardMaterial({map}));
 for(const material of materials)scene.add(new THREE.Mesh(geometry,material));
 try{
  const pending=warmSceneMaterials({initTexture:texture=>{uploads.push(texture);now+=5;},compileAsync:async mesh=>compiled.push(mesh)},scene,camera,scene,true,()=>cancelled);
  assert.deepEqual(uploads,[textures[0]]);
  assert.equal(paints,1,'first upload exhausted the texture slice');
  cancelled=true;
  paint();
  const result=await pending;
  assert.deepEqual(uploads,[textures[0]]);
  assert.deepEqual(compiled,[]);
  assert.equal(paints,1,'cancelled warmup does not schedule another slice');
  assert.deepEqual(result.map(timing=>timing.kind),['texture']);
 }finally{globalThis.requestAnimationFrame=original;geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();}
});

test('cancelling while the first program compiles prevents later program work',async()=>{
 const original=globalThis.requestAnimationFrame;
 let finishCompile,cancelled=false,paints=0;
 globalThis.requestAnimationFrame=callback=>{paints++;return setImmediate(callback);};
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),compiled=[];
 const geometry=new THREE.BufferGeometry(),materials=[new THREE.MeshStandardMaterial(),new THREE.MeshBasicMaterial(),new THREE.MeshPhongMaterial()];
 const meshes=materials.map(material=>new THREE.Mesh(geometry,material));
 scene.add(...meshes);
 try{
  const pending=warmSceneMaterials({initTexture:()=>assert.fail('fixture has no textures'),compileAsync:mesh=>{compiled.push(mesh);return new Promise(resolve=>{finishCompile=resolve;});}},scene,camera,scene,true,()=>cancelled);
  assert.deepEqual(compiled,[meshes[0]]);
  cancelled=true;
  finishCompile();
  await pending;
  assert.deepEqual(compiled,[meshes[0]],'existing compile finishes but later materials stay untouched');
  assert.equal(paints,0,'cancelled warmup stops as soon as the compile promise settles');
 }finally{globalThis.requestAnimationFrame=original;geometry.dispose();for(const material of materials)material.dispose();}
});
