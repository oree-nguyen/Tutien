import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {entryStyles,embeddedModelModule,embeddedModelBlocks} from '../scripts/standalone-payload.mjs';

async function fixture(action) {
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hg-standalone-'));
 try{await fs.mkdir(path.join(directory,'.vite'));return await action(directory);}
 finally{await fs.rm(directory,{recursive:true,force:true});}
}
test('entry stylesheet collection follows static and lazy game chunks without including the separate review page',async()=>fixture(async directory=>{
 await fs.writeFile(path.join(directory,'.vite/manifest.json'),JSON.stringify({
  'index.html':{imports:['shared'],dynamicImports:['src/main.js']},
  shared:{css:['shared.css']},
  'src/main.js':{imports:['shared'],css:['game.css'],dynamicImports:['late']},
  late:{imports:['shared'],css:['late.css']},
  'rig-review.html':{css:['review.css']},
 }));
 for(const key of ['shared','game','late','review'])await fs.writeFile(path.join(directory,key+'.css'),'.'+key+'{}');
 assert.equal(await entryStyles(directory),'.shared{}\n.game{}\n.late{}');
}));
test('missing game CSS, missing chunks and non-local CSS fail before expensive embedding',async()=>fixture(async directory=>{
 const write=value=>fs.writeFile(path.join(directory,'.vite/manifest.json'),JSON.stringify(value));
 await write({'index.html':{}});await assert.rejects(entryStyles(directory),/no built stylesheet/);
 await write({'index.html':{dynamicImports:['missing']}});await assert.rejects(entryStyles(directory),/Missing built entry/);
 await write({'index.html':{css:['../outside.css']}});await assert.rejects(entryStyles(directory),/Non-local stylesheet/);
}));
test('model blocks preserve original bytes and refuse changed hashes or external inputs',async()=>fixture(async directory=>{
 const bytes=Buffer.from([0x67,0x6c,0x54,0x46,0,1,2,255]),hash=createHash('sha256').update(bytes).digest('hex');
 await fs.writeFile(path.join(directory,'source.glb'),bytes);
 const urls={high:'/source.glb?v=immutable'},hashes={high:hash},blocks=[];
 for await(const block of embeddedModelBlocks(urls,hashes,directory))blocks.push(block);
 assert.equal(blocks.length,1);
 assert.match(blocks[0],/^<script type="application\/octet-stream" id="hg-embedded-model-high">/);
 assert.deepEqual(Buffer.from(blocks[0].split(';base64,')[1].split('</script>')[0],'base64'),bytes);
 const collect=async(u,h)=>{for await(const block of embeddedModelBlocks(u,h,directory))void block;};
 await assert.rejects(collect(urls,{high:'0'.repeat(64)}),/hash mismatch/);
 await assert.rejects(collect({high:'https://outside.test/source.glb'},hashes),/Non-local/);
 await assert.rejects(collect({high:'/../source.glb'},hashes),/leaves public directory/);
}));
test('embedded module reads a model lazily once and releases its inert DOM block without changing its URL',async()=>{
 const original=globalThis.document,reads=[];
 globalThis.document={getElementById(id){reads.push(id);return{textContent:'data:model/gltf-binary;base64,Z2xURg==',remove(){reads.push('removed');}};}};
 try{
  const code=embeddedModelModule(['high','source-h01-body'],{high:'hash'});
  const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  assert.deepEqual(Object.keys(module.manualHeroAssetUrls),['high','source-h01-body']);
  assert.deepEqual(reads,[]);
  assert.equal(module.manualHeroAssetUrls.high,'data:model/gltf-binary;base64,Z2xURg==');
  assert.equal(module.manualHeroAssetUrls.high,'data:model/gltf-binary;base64,Z2xURg==');
  assert.deepEqual(reads,['hg-embedded-model-high','removed']);
  assert.deepEqual(module.manualHeroAssetHashes,{high:'hash'});
 }finally{globalThis.document=original;}
});
