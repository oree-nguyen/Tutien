import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Document,NodeIO} from '@gltf-transform/core';
import {SourceProvenanceValidator} from '../tools/rig/source-provenance.mjs';
import {SeamAccumulator} from '../tools/rig/mesh-seams.mjs';
import {sha256} from '../tools/rig/animation-payload.mjs';

async function fixture(options={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hg-reviewed-cut-'));
 const doc=new Document(),buffer=doc.createBuffer(),attr=(type,array)=>doc.createAccessor('',buffer).setType(type).setArray(array),
  points=new Float32Array([0,0,0,1,0,0,0,1,0,0,0,1]),triangles=new Uint32Array([0,2,1,0,1,3,0,3,2,1,2,3]),
  sourcePrimitive=doc.createPrimitive().setAttribute('POSITION',attr('VEC3',points)).setIndices(attr('SCALAR',triangles)),
  node=doc.createNode('Source').setMesh(doc.createMesh().addPrimitive(sourcePrimitive));doc.createScene().addChild(node);
 const sourceFile=path.join(dir,'source.glb');await new NodeIO().write(sourceFile,doc);const sourceSha=sha256(await fs.readFile(sourceFile));
 const write=async(name,array)=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);await fs.writeFile(path.join(dir,name),bytes);return sha256(bytes);},
  weldHash=await write('weld.bin',Uint32Array.from([0,1,2,3])),mapHash=await write('faces.bin',Uint32Array.from([0,1,2,3])),
  cutsHash=await write('cuts.bin',Uint32Array.from([0,1,0,2,1,2]));
 const weldRecord=Buffer.from(JSON.stringify({sourceSha256:sourceSha,weldMapSha256:weldHash,method:'paired-opposite-source-boundary-halfedges'}));await fs.writeFile(path.join(dir,'weld.json'),weldRecord);
 const registry=path.join(dir,'registry.json');await fs.writeFile(registry,JSON.stringify({patterns:[{id:'triangle-cut',reviewed:!options.unreviewed,sourceSha256:options.wrongSource?'0'.repeat(64):sourceSha,edgesSha256:cutsHash,edgeCount:3}]}));
 const expected=[0,1,2,3,4,5,3,5,8,4,8,5],primitives=[];
 for(let face=0;face<4;face++){
  const ids=triangles.slice(face*3,face*3+3),p=doc.createPrimitive()
   .setAttribute('POSITION',attr('VEC3',Float32Array.from([...ids].flatMap(i=>[...points.slice(i*3,i*3+3)]))))
   .setAttribute('_SOURCE_VERTEX',attr('SCALAR',ids))
   .setAttribute('_SOURCE_WELD',attr('SCALAR',ids))
   .setAttribute('_SOURCE_CUT_WELD',attr('SCALAR',Uint32Array.from(expected.slice(face*3,face*3+3).map((v,i)=>options.forgedFan&&face===1&&i===0?0:v))))
   .setIndices(attr('SCALAR',Uint32Array.from([0,1,2])));
  const metadata={version:1,sourceFile,sourceSha256:sourceSha,sourceNodeIndex:0,sourcePrimitiveIndex:0,vertexAccessor:'_SOURCE_VERTEX',
   triangleMap:{file:'faces.bin',sha256:mapHash,count:1,offsetBytes:face*4},
   weldMap:{file:'weld.bin',sha256:weldHash,count:4,method:'paired-opposite-source-boundary-halfedges',review:{file:'weld.json',sha256:sha256(weldRecord)}},
   cutPattern:{id:'triangle-cut',accessor:'_SOURCE_CUT_WELD',edges:{file:'cuts.bin',sha256:options.wrongEdges?'0'.repeat(64):cutsHash}}};
  if(options.noDeclaration)delete metadata.cutPattern;p.setExtras({sourceProvenance:metadata});primitives.push(p);
 }
 return{dir,primitives,validator:new SourceProvenanceValidator(path.join(dir,'output.glb'),{cutRegistryFile:registry}),close:()=>fs.rm(dir,{recursive:true,force:true})};
}

test('reviewed cut preserves every original oriented face and independently reconstructed kept seams',async()=>{
 const f=await fixture();try{
  const acc=new SeamAccumulator();let openedCopies=0;
  for(const[pIndex,p]of f.primitives.entries()){
   const r=await f.validator.validate(p);assert.equal(r.verified,true,r.errors.join(';'));assert.equal(r.cutProof.edgeCount,3);
   for(let i=0;i<3;i++){
    const position=[...p.getAttribute('POSITION').getArray().slice(i*3,i*3+3)];if(pIndex===0){position[2]+=.04;openedCopies++;}
    acc.add(r.seamIds[i],{position,identity:{pIndex,i}});
   }
  }
  assert.equal(f.validator.coverage().passed,true);assert.equal(openedCopies,3);
  assert(acc.measure().pairs>0);assert.equal(acc.measure().maximumMillimetres,0);
 }finally{await f.close();}
});

test('a reviewed cut still fails the unchanged one-micrometre tolerance on any kept seam',async()=>{
 const f=await fixture();try{
  const acc=new SeamAccumulator();for(const[part,p]of f.primitives.entries()){
   const r=await f.validator.validate(p);assert(r.verified);
   for(let i=0;i<3;i++){
    const position=[...p.getAttribute('POSITION').getArray().slice(i*3,i*3+3)];if(part===1&&i===0)position[0]+=.000002;
    acc.add(r.seamIds[i],{position,identity:{part,i}});
   }
  }
  assert(acc.measure().maximumMillimetres>.001);
 }finally{await f.close();}
});

for(const option of ['unreviewed','wrongSource','wrongEdges','forgedFan','noDeclaration'])test('cut proof rejects '+option,async()=>{
 const f=await fixture({[option]:true});try{
  const results=await Promise.all(f.primitives.map(p=>f.validator.validate(p)));
  assert(results.some(r=>!r.verified));assert.equal(f.validator.coverage().passed,false);
  assert(results.some(r=>r.errors.some(e=>option==='noDeclaration'?e.includes('require a reviewed'):option==='forgedFan'?e.includes('Cut fan differs'):option==='wrongEdges'?e.includes('differs from reviewed'):e.includes('not in the reviewed'))));
 }finally{await f.close();}
});
