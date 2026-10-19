import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/fingerprint.mjs',import.meta.url).href;
test('source fingerprint ignores Python caches but still detects real code changes',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hg-fingerprint-'));
 try{
  for(const dir of ['src','server','tests','scripts','public','android-webview','tools','data'])await fs.mkdir(path.join(directory,dir),{recursive:true});
  for(const name of ['package.json','package-lock.json','capacitor.config.json','index.html','rig-review.html','vite.config.js','acceptance/requirements.json','acceptance/visual-requirements.json','docs/requests/AI-Studio-Android-V2.5.md','docs/requests/MASTER-ENGINEERING-ART-V2.5.md','docs/requests/PBR-SKILLSHOT-AUTOFARM-V2.5.md','acceptance/master-requirements.json','acceptance/overhaul-requirements.json']){
   await fs.mkdir(path.dirname(path.join(directory,name)),{recursive:true});await fs.writeFile(path.join(directory,name),'fixture');
  }
  await fs.writeFile(path.join(directory,'src/main.js'),'original source');
  const fingerprint=()=>{const r=spawnSync(process.execPath,['--input-type=module','--eval','const {fingerprint}=await import('+JSON.stringify(script)+');console.log(await fingerprint());'],{cwd:directory,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  const first=fingerprint();
  await fs.mkdir(path.join(directory,'tools/__pycache__'));await fs.writeFile(path.join(directory,'tools/__pycache__/cache.pyc'),'machine path and timestamp');await fs.writeFile(path.join(directory,'tools/cache.pyc'),'another interpreter output');
  assert.equal(fingerprint(),first);
  await fs.writeFile(path.join(directory,'src/main.js'),'changed source');
  assert.notEqual(fingerprint(),first);
  const beforeData=fingerprint();
  await fs.mkdir(path.join(directory,'data/hero-entrance'));
  await fs.writeFile(path.join(directory,'data/hero-entrance/H01.json'),JSON.stringify({gripHand:'right'}));
  assert.notEqual(fingerprint(),beforeData,'entrance and rig configuration changes must change build identity');
 }finally{await fs.rm(directory,{recursive:true});}
});
