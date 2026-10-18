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
