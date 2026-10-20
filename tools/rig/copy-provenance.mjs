import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha256} from './animation-payload.mjs';

/** Carry hash-bound mesh evidence with a staged GLB. Copying evidence never
 * approves a cut pattern or changes a validation result. Verify every input
 * before writing any output, including dependencies named by the cut plan. */
export async function copyProvenance(doc,sourceDirectory,outputDirectory){
 const base=await fs.realpath(sourceDirectory),output=path.resolve(outputDirectory),pending=new Map();
 assert.notEqual(base,output,'Provenance must be exported to a separate staging directory');
 const add=async(reference,plan=false)=>{
  assert(reference&&typeof reference.file==='string'&&/^[a-f0-9]{64}$/.test(reference.sha256),'Invalid provenance reference');
  const file=reference.file;
  assert(file&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'),'Unsafe provenance path');
  if(pending.has(file)){assert.equal(pending.get(file).sha256,reference.sha256,'Conflicting provenance hashes');return;}
  const source=await fs.realpath(path.join(base,file));assert(source.startsWith(base+path.sep),'Provenance symlink escapes source directory');
  const bytes=await fs.readFile(source);assert.equal(sha256(bytes),reference.sha256,'Provenance hash mismatch: '+file);
  pending.set(file,{sha256:reference.sha256,bytes});
  if(plan){const value=JSON.parse(bytes);assert(value.files&&typeof value.files==='object','Cut plan lacks dependencies');for(const[name,entry]of Object.entries(value.files))await add({file:name,sha256:entry.sha256});}
 };
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const extras=p.getExtras(),proof=extras.sourceProvenance;
  if(proof){await add(proof.triangleMap);await add(proof.weldMap);await add(proof.weldMap.review);}
  if(extras.sourceCutProposal)await add(extras.sourceCutProposal,true);
 }
 for(const[file,item]of pending){const target=path.join(output,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,item.bytes);}
 return Object.fromEntries([...pending].map(([file,item])=>[file,item.sha256]));
}
