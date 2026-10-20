/** Semantic-only source repartition. It does not certify weights or activate a rig. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO,Accessor} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {compactTriangleIndices} from './robe-panels.mjs';
import {animationSignature} from './animation-payload.mjs';

const base=process.argv[2],output=process.argv[3];
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(base??'')&&/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(output??'')&&base!==output);
const hash=b=>createHash('sha256').update(b).digest('hex'),arrayBytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),
  own=JSON.parse(await fs.readFile(output+'/ownership.json')),bytes=await fs.readFile(base+'/H01-C0-rigged.glb'),
  meta=JSON.parse(await fs.readFile(base+'/input.json')),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes);
assert.equal(hash(bytes),own.candidateSha256);
const rawBytes=await fs.readFile(meta.source),raw=await io.readBinary(rawBytes),rawNode=raw.getRoot().listNodes().find(n=>n.getMesh()),rawP=rawNode.getMesh().listPrimitives()[0];
assert.equal(hash(rawBytes),meta.sourceSha256);
const read=async(file,Type)=>{const b=await fs.readFile(file);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},
  triangles=await read(base+'/triangles.bin',Uint32Array),labels=await read(base+'/face-labels.bin',Uint8Array),
  welds=await read(base+'/source-welds.u32bin',Uint32Array),ids=await read(base+'/result-ids.bin',Uint16Array),weights=await read(base+'/result-weights.bin',Float32Array),
  left=await read(output+'/lining-left.u32bin',Uint32Array),right=await read(output+'/lining-right.u32bin',Uint32Array),selected=new Uint8Array(labels.length);
for(const[name,faces]of [['lining-left.u32bin',left],['lining-right.u32bin',right]]){
  assert.equal(hash(arrayBytes(faces)),own.files[name].sha256);
  for(const f of faces){assert.equal(labels[f],0);assert.equal(selected[f],0);selected[f]=1;}
}
assert.equal(left.length+right.length,own.selectedSourceFaces);
assert.deepEqual(arrayBytes(rawP.getIndices().getArray()),arrayBytes(triangles));
const oldNodes=doc.getRoot().listNodes().filter(n=>n.getMesh()),first=oldNodes[0],skin=first.getSkin(),
  material=first.getMesh().listPrimitives()[0].getMaterial(),buffer=doc.getRoot().listBuffers()[0],
  sampleProvenance=first.getMesh().listPrimitives()[0].getExtras().sourceProvenance,
  images=doc.getRoot().listTextures().map(t=>hash(t.getImage())),clips=doc.getRoot().listAnimations().map(animationSignature),
  bones=skin.listJoints().map(n=>({name:n.getName(),r:n.getRotation(),t:n.getTranslation(),s:n.getScale(),parent:n.getParentNode()?.getName()})),
  ibmHash=hash(arrayBytes(skin.getInverseBindMatrices().getArray()));
for(const node of oldNodes){assert.equal(node.getSkin(),skin);assert.equal(node.listChildren().length,0);assert.deepEqual(node.getTranslation(),first.getTranslation());assert.deepEqual(node.getRotation(),first.getRotation());assert.deepEqual(node.getScale(),first.getScale());for(const p of node.getMesh().listPrimitives()){assert.equal(p.getMaterial(),material);assert.equal(p.listTargets().length,0);}}
const facesFor=predicate=>{const faces=[];for(let i=0;i<labels.length;i++)if(predicate(labels[i],i))faces.push(i);return Uint32Array.from(faces);};
const specs=[
  ['H01_Remaining_Source',[['remaining-anatomy-accessories',facesFor((v,i)=>v===0&&!selected[i])]]],
  ['H01_Robe_Left',[['original-v6-left-panel',facesFor(v=>v===1)],['existing-left-lining-trim',left]]],
  ['H01_Robe_Right',[['original-v6-right-panel',facesFor(v=>v===2)],['existing-right-lining-trim',right]]],
  ['H01_Robe_Torso',[['original-v6-torso',facesFor(v=>v===3)]]],
  ['H01_Sleeve_Left',[['original-v6-left-sleeve',facesFor(v=>v===4)]]],
  ['H01_Sleeve_Right',[['original-v6-right-sleeve',facesFor(v=>v===5)]]],
];
const sourceFaces=Uint32Array.from(specs.flatMap(([,parts])=>parts.flatMap(([,a])=>Array.from(a))));
assert.equal(sourceFaces.length,labels.length);assert.equal(new Set(sourceFaces).size,labels.length);
const faceFile='H01-source-triangles.u32bin';await fs.writeFile(output+'/'+faceFile,arrayBytes(sourceFaces));
for(const name of ['source-welds.u32bin','source-continuity.json'])await fs.copyFile(base+'/'+name,output+'/'+name);
const created=[],parents=first.getParentNode(),scenes=doc.getRoot().listScenes().filter(s=>s.listChildren().includes(first));let offset=0;
for(const[name,parts]of specs){
  const mesh=doc.createMesh(name),node=doc.createNode(name).setMesh(mesh).setSkin(skin).setTranslation(first.getTranslation()).setRotation(first.getRotation()).setScale(first.getScale());
  if(parents)parents.addChild(node);else for(const scene of scenes)scene.addChild(node);
  for(const[auditRegion,faces]of parts){
    const chosen=new Uint32Array(faces.length*3);for(let i=0;i<faces.length;i++)chosen.set(triangles.subarray(faces[i]*3,faces[i]*3+3),i*3);
    const compact=compactTriangleIndices(chosen),primitive=doc.createPrimitive().setMaterial(material),attributeHashes={};
    const attr=(semantic,source,type,normalized=false)=>{
      const size=Accessor.getElementSize(type),values=new source.constructor(compact.sourceVertices.length*size);
      for(let i=0;i<compact.sourceVertices.length;i++){const v=compact.sourceVertices[i];values.set(source.subarray(v*size,(v+1)*size),i*size);}
      primitive.setAttribute(semantic,doc.createAccessor(name+'_'+semantic,buffer).setType(type).setNormalized(normalized).setArray(values));attributeHashes[semantic]=hash(arrayBytes(values));
    };
    for(const semantic of rawP.listSemantics()){const a=rawP.getAttribute(semantic);attr(semantic,a.getArray(),a.getType(),a.getNormalized());}
    attr('JOINTS_0',ids,'VEC4');attr('WEIGHTS_0',weights,'VEC4');
    primitive.setAttribute('_SOURCE_VERTEX',doc.createAccessor('',buffer).setType('SCALAR').setArray(compact.sourceVertices));
    primitive.setAttribute('_SOURCE_WELD',doc.createAccessor('',buffer).setType('SCALAR').setArray(Uint32Array.from(compact.sourceVertices,i=>welds[i])));
    primitive.setIndices(doc.createAccessor('',buffer).setType('SCALAR').setArray(compact.indices));
    primitive.setExtras({sourceProvenance:{...sampleProvenance,parentRigFile:base+'/H01-C0-rigged.glb',parentRigSha256:hash(bytes),semanticRegion:name,garmentPatternReviewed:false,triangleMap:{file:faceFile,sha256:hash(arrayBytes(sourceFaces)),offsetBytes:offset*4,count:faces.length}},auditRegion,sourcePanelRegionPreserved:auditRegion.startsWith('original-v6-')});
    mesh.addPrimitive(primitive);created.push({node:name,auditRegion,triangles:faces.length,vertices:compact.sourceVertices.length,attributeHashes});offset+=faces.length;
  }
}
const oldMeshes=new Set(oldNodes.map(n=>n.getMesh())),oldPrimitives=new Set([...oldMeshes].flatMap(m=>m.listPrimitives())),oldAccessors=new Set([...oldPrimitives].flatMap(p=>[...p.listAttributes(),p.getIndices()]));
for(const n of oldNodes)n.dispose();for(const m of oldMeshes)m.dispose();for(const p of oldPrimitives)p.dispose();
for(const a of oldAccessors)if(a.listParents().every(p=>p.propertyType==='Root'))a.dispose();
const file=output+'/H01-C0-rigged.glb';await io.write(file,doc);const result=await io.read(file);
assert.deepEqual(result.getRoot().listTextures().map(t=>hash(t.getImage())),images);assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
assert.deepEqual(result.getRoot().listSkins()[0].listJoints().map(n=>({name:n.getName(),r:n.getRotation(),t:n.getTranslation(),s:n.getScale(),parent:n.getParentNode()?.getName()})),bones);
assert.equal(hash(arrayBytes(result.getRoot().listSkins()[0].getInverseBindMatrices().getArray())),ibmHash);
const sourceCount=rawP.getAttribute('POSITION').getCount(),seen=new Uint8Array(sourceCount);
for(const n of result.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){
  const map=p.getAttribute('_SOURCE_VERTEX').getArray();
  for(let i=0;i<map.length;i++){
    const v=map[i];seen[v]=1;
    for(const semantic of rawP.listSemantics()){const a=rawP.getAttribute(semantic),b=p.getAttribute(semantic);assert.deepEqual(b.getElement(i,[]),a.getElement(v,[]));}
    assert.deepEqual(p.getAttribute('JOINTS_0').getElement(i,[]),Array.from(ids.subarray(v*4,v*4+4)));
    assert.deepEqual(p.getAttribute('WEIGHTS_0').getElement(i,[]),Array.from(weights.subarray(v*4,v*4+4)));
  }
}
assert(seen.every(Boolean));
const receipt={input:base+'/H01-C0-rigged.glb',parentRigSha256:hash(bytes),source:meta.source,sourceSha256:meta.sourceSha256,output:file,sha256:hash(await fs.readFile(file)),
  totalTriangles:sourceFaces.length,totalSourceVertices:sourceCount,parts:created,sourceAttributesAndImagesPreserved:true,allSourceWeightsPreserved:true,legacyClipsAnd52BonesPreserved:true,
  originalRegionsRetainedAsSeparatePrimitives:true,liningOwnership:output+'/ownership.json',liningOwnershipSha256:hash(await fs.readFile(output+'/ownership.json')),
  activated:false,accepted:false,scope:'Semantic-only complete lined panel grouping. No geometric, skinning or animation repair claimed; old v6 panel primitives stay separate so lining cannot dilute their strain metrics.'};
await fs.writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
