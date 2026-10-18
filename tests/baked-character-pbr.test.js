import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {ProceduralCharacterPBRGenerator,HERO_BROCADE_PATTERNS} from '../src/character-pbr.js';
import {bakedCharacterAssets} from '../src/baked-character-assets.js';
import {HERO_APPEARANCE} from '../src/hero-anatomy.js';
test('24 fixed presets match current palettes and keep original dimensions with local PNG fallbacks',()=>{
 assert.equal(Object.keys(bakedCharacterAssets).length,24);
 for(const [id,entry] of Object.entries(bakedCharacterAssets)){
  const [hero,detail]=id.split(':'),c=HERO_APPEARANCE[Number(hero)],outer=new THREE.Color(c.outer).offsetHSL(0,0,0).getHex();
  const hex=v=>new THREE.Color(v).getHexString();
  const primary=hex(outer),secondary=hex(new THREE.Color(outer).lerp(new THREE.Color(c.inner),.3));
  assert.deepEqual(JSON.parse(entry.key),{primary,secondary,gold:hex(c.gold),pattern:HERO_BROCADE_PATTERNS[hero],requestedTier:detail});
  assert.equal(entry.size,detail==='medium'?256:64);
  for(const [channel,asset] of Object.entries(entry.channels)){
   const bytes=fs.readFileSync('public'+asset.ktx2);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
   assert.equal(bytes.readUInt32LE(20),entry.size);assert.ok(bytes.readUInt32LE(40)>1);assert.ok(fs.statSync('public'+asset.png).size>0);
   assert.equal(asset.encoding,['albedo','emissive'].includes(channel)?'ETC1S':'UASTC');
  }
 }
});
test('installed baked atlas is reused without procedural regeneration or resizing a shared image',()=>{
 const generator=new ProceduralCharacterPBRGenerator({mediumLimit:1}),entry=bakedCharacterAssets['4:medium'];
 const maps=Object.fromEntries(Object.keys(entry.channels).map(k=>[k,new THREE.Texture()]));
 assert.equal(generator.installBaked(entry.key,maps,entry.size),true);
 const spec=JSON.parse(entry.key),request=()=>generator.generateSilkBrocadeTexture('#'+spec.primary,'#'+spec.secondary,'#'+spec.gold,spec.pattern,{detail:'medium'});
 assert.equal(request().map,maps.albedo);assert.equal(request().normalMap,maps.normal);
 assert.equal(generator.installBaked(entry.key,maps,entry.size),false);
 assert.throws(()=>generator.installBaked(JSON.stringify({...spec,requestedTier:'high'}),maps,256),/Invalid baked/);
});
