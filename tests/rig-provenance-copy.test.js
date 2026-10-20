import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Document} from '@gltf-transform/core';
import {sha256} from '../tools/rig/animation-payload.mjs';
import {copyProvenance} from '../tools/rig/copy-provenance.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rig-proof-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source=root+'/source',output=root+'/output';await fs.mkdir(source);
 const doc=new Document(),p=doc.createPrimitive();doc.createMesh().addPrimitive(p);
 const write=async(file,value)=>{const bytes=Buffer.from(value);await fs.writeFile(source+'/'+file,bytes);return{file,sha256:sha256(bytes)};};
 return{root,source,output,doc,p,write};
}

test('baked rig carries unchanged source maps and complete rejected cut evidence',async t=>{
 const f=await fixture(t),tri=await f.write('tri.bin','triangles'),weld=await f.write('weld.bin','welds'),review=await f.write('review.json','{"approved":false}'),cut=await f.write('edges.bin','edges'),
  plan=await f.write('cut.json',JSON.stringify({approved:false,files:{'edges.bin':{sha256:cut.sha256}}}));
 f.p.setExtras({sourceProvenance:{triangleMap:tri,weldMap:{...weld,review}},sourceCutProposal:plan});
 const result=await copyProvenance(f.doc,f.source,f.output);assert.equal(Object.keys(result).length,5);
 for(const[file,hash]of Object.entries(result))assert.equal(sha256(await fs.readFile(f.output+'/'+file)),hash);
 assert.equal(JSON.parse(await fs.readFile(f.output+'/cut.json')).approved,false);
});

test('tampered dependency fails before evidence is exported',async t=>{
 const f=await fixture(t),tri=await f.write('tri.bin','triangles'),weld=await f.write('weld.bin','welds'),review=await f.write('review.json','original');
 f.p.setExtras({sourceProvenance:{triangleMap:tri,weldMap:{...weld,review}}});await fs.writeFile(f.source+'/review.json','changed');
 await assert.rejects(copyProvenance(f.doc,f.source,f.output),/hash mismatch/);await assert.rejects(fs.stat(f.output),{code:'ENOENT'});
});

test('provenance rejects parent traversal and symlinks outside input directory',async t=>{
 const f=await fixture(t),outside=f.root+'/private.bin';await fs.writeFile(outside,'private');const hash=sha256(Buffer.from('private'));
 f.p.setExtras({sourceProvenance:{triangleMap:{file:'../private.bin',sha256:hash}}});await assert.rejects(copyProvenance(f.doc,f.source,f.output),/Unsafe provenance path/);
 await fs.symlink(outside,f.source+'/link.bin');f.p.setExtras({sourceProvenance:{triangleMap:{file:'link.bin',sha256:hash}}});await assert.rejects(copyProvenance(f.doc,f.source,f.output),/symlink escapes/);
});
