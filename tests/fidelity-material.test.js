import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {configureBakedCharacterEnvironment,enhanceCharacterVisualFidelity,createCharacterStudio} from '../src/character-fidelity.js';
test('neutral glTF presentation leaves all authored material and texture properties unchanged',async()=>{
 const originalFetch=globalThis.fetch,renderer={},scene=new THREE.Scene(),root=new THREE.Group();
 const source=await fs.readFile('public/art/studio/ibl-rgba16f.bin');globalThis.fetch=async()=>new Response(source);
 try{
  await configureBakedCharacterEnvironment(renderer);
  const m=new THREE.MeshStandardMaterial({color:0x917e5a,metalness:.76,roughness:.43,vertexColors:true,emissive:0x010305,emissiveIntensity:.2});m.normalScale.set(1,-1);m.aoMapIntensity=.82;m.envMapIntensity=.9;
  const map=new THREE.Texture({width:2048,height:2048});map.colorSpace=THREE.SRGBColorSpace;m.map=map;
  const snapshot=()=>({color:m.color.toArray(),metalness:m.metalness,roughness:m.roughness,vertexColors:m.vertexColors,emissive:m.emissive.toArray(),emissiveIntensity:m.emissiveIntensity,emissiveMap:m.emissiveMap,normalScale:m.normalScale.toArray(),ao:m.aoMapIntensity,env:m.envMapIntensity,colorSpace:map.colorSpace,width:map.image.width,height:map.image.height});
  root.add(new THREE.Mesh(new THREE.BufferGeometry(),m));const before=snapshot();enhanceCharacterVisualFidelity(root,renderer,scene);assert.deepEqual(snapshot(),before);assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);assert.equal(renderer.toneMappingExposure,1);assert.equal(m.envMap,null);assert.ok(scene.environment);assert.equal(createCharacterStudio().children.length,0);
 }finally{globalThis.fetch=originalFetch;}
});
