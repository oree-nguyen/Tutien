/** Exact original-corner export of an explicit staging garment pattern. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {animationSignature,sha256} from './animation-payload.mjs';
import {SourceProvenanceValidator} from './source-provenance.mjs';

const directory=process.argv[2]??'.local/rig-candidates/coat-cut-v1';
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory));
const planBytes=await fs.readFile(directory+'/cut-plan.json'),plan=JSON.parse(planBytes),inputBytes=await fs.readFile(plan.parentRig);
assert.equal(sha256(inputBytes),plan.parentRigSha256);
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),
 read=async(name,Type)=>{const b=await fs.readFile(directory+'/'+name);assert.equal(sha256(b),plan.files[name].sha256);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},
 corners=await read('corner-components.u32bin',Uint32Array),faceRoles=await read('face-roles.u8bin',Uint8Array),
 protectedMask=new Uint8Array(await fs.readFile('.local/rig-candidates/semantic-garment-v6/protected.bin')),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(inputBytes),buffer=doc.getRoot().listBuffers()[0],
 clips=doc.getRoot().listAnimations().map(animationSignature),imageHashes=doc.getRoot().listTextures().map(t=>sha256(t.getImage())),
 sourceMeta=JSON.parse(await fs.readFile('.local/rig-candidates/semantic-garment-v6/input.json')),
 positionChunks=[],jointChunks=[],weightChunks=[],groupChunks=[],sourceChunks=[],protectionChunks=[],indexChunks=[],roleChunks=[],parts=[];
let vertexOffset=0,triangles=0;
let repartitionMap;
if(plan.smoothing){
 const verifier=new SourceProvenanceValidator(plan.parentRig),instances=doc.getRoot().listNodes().flatMap(node=>(node.getMesh()?.listPrimitives()??[]).map((p,pi)=>({node,p,pi}))),
  mapped=[];
 for(const{p}of instances){const m=await verifier.validate(p);assert(m.verified,m.errors.join(';'));mapped.push(m);}
 assert(verifier.coverage().passed);
 const source=mapped[0].source,sourceIndices=source.primitive.getIndices().getArray(),sourceCount=source.primitive.getAttribute('POSITION').getCount(),
  template=instances[0].p,semantics=template.listSemantics(),full={},lining=new Uint8Array(faceRoles.length),seen=new Uint8Array(sourceCount);
 assert.equal(source.sha256,plan.sourceSha256);
 for(const semantic of semantics){const a=template.getAttribute(semantic);full[semantic]=new(a.getArray().constructor)(sourceCount*a.getElementSize());}
 for(const[part,{p,pi}]of instances.entries()){
  const ids=mapped[part].vertexIds;
  for(let i=0;i<ids.length;i++){
   for(const semantic of semantics){const a=p.getAttribute(semantic),size=a.getElementSize(),values=a.getArray(),target=full[semantic];
    for(let k=0;k<size;k++){const old=values[i*size+k],at=ids[i]*size+k;if(seen[ids[i]])assert.equal(target[at],old);else target[at]=old;}
   }seen[ids[i]]=1;
  }
  if(pi>0){const m=p.getExtras().sourceProvenance.triangleMap,b=await fs.readFile(path.resolve(path.dirname(plan.parentRig),m.file));assert.equal(sha256(b),m.sha256);
   for(let i=0;i<m.count;i++)lining[b.readUInt32LE(m.offsetBytes+i*4)]=1;
  }
 }
 assert(seen.every(Boolean));const accessors={};for(const semantic of semantics){const original=template.getAttribute(semantic);accessors[semantic]=doc.createAccessor('',buffer).setType(original.getType()).setNormalized(original.getNormalized()).setArray(full[semantic]);}
 const roles={H01_Remaining_Source:0,H01_Robe_Left:1,H01_Robe_Right:2,H01_Robe_Torso:3,H01_Sleeve_Left:4,H01_Sleeve_Right:5},partitions=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  assert(Object.hasOwn(roles,node.getName()));const role=roles[node.getName()],old=node.getMesh().listPrimitives(),first=old[0],metadata=structuredClone(first.getExtras().sourceProvenance),material=first.getMaterial();
  for(const p of old)node.getMesh().removePrimitive(p);
  const variants=role===1||role===2?[0,1]:[0];
  for(const inner of variants){
   const faces=[];for(let f=0;f<faceRoles.length;f++)if(faceRoles[f]===role&&(!(role===1||role===2)||lining[f]===inner))faces.push(f);
   assert(faces.length);const p=doc.createPrimitive().setMaterial(material),indices=Uint32Array.from(faces.flatMap(f=>Array.from(sourceIndices.subarray(f*3,f*3+3))));
   for(const semantic of semantics)p.setAttribute(semantic,accessors[semantic]);p.setIndices(doc.createAccessor('',buffer).setType('SCALAR').setArray(indices));
   p.setExtras({sourceProvenance:structuredClone(metadata)});node.getMesh().addPrimitive(p);partitions.push({p,faces});
  }
  for(const p of old)p.dispose();
 }
 const map=Uint32Array.from(partitions.flatMap(p=>p.faces));repartitionMap=raw(map);await fs.writeFile(directory+'/H01-cut-source-triangles.u32bin',repartitionMap);
 let offset=0;for(const{p,faces}of partitions){const extras=p.getExtras();extras.sourceProvenance.triangleMap={file:'H01-cut-source-triangles.u32bin',sha256:sha256(repartitionMap),offsetBytes:offset*4,count:faces.length};p.setExtras(extras);offset+=faces.length;}
 assert.equal(offset,faceRoles.length);
}
for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){
 const provenance=p.getExtras().sourceProvenance,index=p.getIndices().getArray(),sourceIds=p.getAttribute('_SOURCE_VERTEX').getArray(),
  mapBytes=repartitionMap??await fs.readFile(path.resolve(path.dirname(plan.parentRig),provenance.triangleMap.file));
 assert.equal(sha256(mapBytes),provenance.triangleMap.sha256);
 const selected=new Map(),oldVertices=[],groups=[],indices=new Uint32Array(index.length);
 for(let i=0;i<index.length;i++){
  const face=mapBytes.readUInt32LE(provenance.triangleMap.offsetBytes+Math.floor(i/3)*4),old=index[i],sourceId=sourceIds[old],component=corners[face*3+i%3],key=sourceId*corners.length+component;
  let at=selected.get(key);if(at===undefined){at=oldVertices.length;selected.set(key,at);oldVertices.push(old);groups.push(component);}indices[i]=at;
 }
 const hashes={};
 for(const semantic of p.listSemantics()){
  const original=p.getAttribute(semantic),values=original.getArray(),size=original.getElementSize(),next=new values.constructor(oldVertices.length*size);
  for(let i=0;i<oldVertices.length;i++)next.set(values.subarray(oldVertices[i]*size,(oldVertices[i]+1)*size),i*size);
  p.setAttribute(semantic,doc.createAccessor('',buffer).setType(original.getType()).setNormalized(original.getNormalized()).setArray(next));hashes[semantic]=sha256(raw(next));
 }
 const componentIds=Uint32Array.from(groups);p.setAttribute('_SOURCE_CUT_WELD',doc.createAccessor('',buffer).setType('SCALAR').setArray(componentIds));
 p.setIndices(doc.createAccessor('',buffer).setType('SCALAR').setArray(indices));
 p.setExtras({...p.getExtras(),sourceCutProposal:{file:'cut-plan.json',sha256:sha256(planBytes),approved:false}});
 const afterIds=p.getAttribute('_SOURCE_VERTEX').getArray(),roles=new Uint8Array(afterIds.length);
 roles.fill(node.getName().includes('Robe_Left')?1:node.getName().includes('Robe_Right')?2:node.getName().includes('Robe_Torso')?3:node.getName().includes('Sleeve_Left')?4:node.getName().includes('Sleeve_Right')?5:0);
 positionChunks.push(p.getAttribute('POSITION').getArray());jointChunks.push(p.getAttribute('JOINTS_0').getArray());weightChunks.push(p.getAttribute('WEIGHTS_0').getArray());
 groupChunks.push(componentIds);sourceChunks.push(afterIds);protectionChunks.push(Uint8Array.from(afterIds,id=>protectedMask[id]));indexChunks.push(Uint32Array.from(indices,i=>i+vertexOffset));roleChunks.push(roles);
 parts.push({node:node.getName(),vertices:afterIds.length,triangles:indices.length/3,hashes});vertexOffset+=afterIds.length;triangles+=indices.length/3;
 for(const file of [provenance.triangleMap.file,provenance.weldMap.file,provenance.weldMap.review.file])if(!(repartitionMap&&file===provenance.triangleMap.file))await fs.copyFile(path.resolve(path.dirname(plan.parentRig),file),path.resolve(directory,file));
}
assert.equal(triangles,faceRoles.length);
const concat=async(name,chunks,Type)=>{const array=new Type(chunks.reduce((n,a)=>n+a.length,0));let at=0;for(const a of chunks){array.set(a,at);at+=a.length;}await fs.writeFile(directory+'/'+name,raw(array));};
for(const[name,chunks,Type]of [['solver-positions.bin',positionChunks,Float32Array],['solver-ids.bin',jointChunks,Uint16Array],['solver-weights.bin',weightChunks,Float32Array],['solver-groups.bin',groupChunks,Uint32Array],['solver-source.bin',sourceChunks,Uint32Array],['solver-protected.bin',protectionChunks,Uint8Array],['solver-triangles.bin',indexChunks,Uint32Array],['solver-roles.bin',roleChunks,Uint8Array]])await concat(name,chunks,Type);
for(const a of doc.getRoot().listAccessors())if(a.listParents().every(p=>p.propertyType==='Root'))a.dispose();
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);const reread=await io.read(output);
assert.deepEqual(reread.getRoot().listAnimations().map(animationSignature),clips);assert.deepEqual(reread.getRoot().listTextures().map(t=>sha256(t.getImage())),imageHashes);
const skin=doc.getRoot().listSkins()[0];await fs.writeFile(directory+'/solver-meta.json',JSON.stringify({sourceSha256:plan.sourceSha256,cutPlanSha256:sha256(planBytes),joints:skin.listJoints().map(n=>({name:n.getName(),world:n.getWorldMatrix()})),originalJointPositions:sourceMeta.jointPositions},null,2)+'\n');
await fs.writeFile(directory+'/export.json',JSON.stringify({input:plan.parentRig,inputSha256:plan.parentRigSha256,output,sha256:sha256(await fs.readFile(output)),sourceTriangles:triangles,exportVertices:vertexOffset,parts,sourceImagesAndLegacyClipsPreserved:true,sourceGeometryCornersPreserved:true,patternApproved:false,accepted:false,activated:false},null,2)+'\n');
console.log(JSON.stringify({output,triangles,vertices:vertexOffset,accepted:false}));
