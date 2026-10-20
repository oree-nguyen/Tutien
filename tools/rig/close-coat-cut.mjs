/** Seal actual cut garment cross-sections. No body or weapon geometry is made. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Vector3,Matrix4} from 'three';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
import {triangulateCut} from './triangulate-cut.mjs';

const [base,output]=process.argv.slice(2);for(const dir of [base,output])assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(dir));assert.notEqual(base,output);
const closureMethod=process.env.CLOSURE_METHOD??'projected';
const bytes=await fs.readFile(base+'/H01-C0-rigged.glb'),receipt=JSON.parse(await fs.readFile(base+'/receipt.json'));assert.equal(sha256(bytes),receipt.sha256);
const cutBytes=await fs.readFile(base+'/cut-edges.u32bin'),cuts=new Uint32Array(cutBytes.buffer,cutBytes.byteOffset,cutBytes.length/4),plan=JSON.parse(await fs.readFile(base+'/cut-plan.json'));
assert.equal(sha256(cutBytes),plan.files['cut-edges.u32bin'].sha256);
const key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b),wanted=new Set();for(let i=0;i<cuts.length;i+=2)wanted.add(key(cuts[i],cuts[i+1]));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),buffer=doc.getRoot().listBuffers()[0],
 original=immutablePayload(doc),clips=doc.getRoot().listAnimations().map(animationSignature),patches=[];
let posedPosition,poseSha256=null;
if(process.env.CLOSURE_POSE){
 const poseBytes=await fs.readFile(process.env.CLOSURE_POSE),pose=JSON.parse(poseBytes),posedDoc=await io.readBinary(bytes);poseSha256=sha256(poseBytes);
 assert(pose.passed&&!pose.translations&&!pose.scales);
 for(const[name,q]of Object.entries(pose.rotations)){const targets=posedDoc.getRoot().listNodes().filter(n=>n.getName()===name);assert.equal(targets.length,1);assert(q.length===4&&q.every(Number.isFinite)&&Math.abs(Math.hypot(...q)-1)<1e-5);targets[0].setRotation(q);}
 const transforms=new Map();for(const[index,node]of doc.getRoot().listNodes().entries()){
  if(!node.getMesh())continue;const posedNode=posedDoc.getRoot().listNodes()[index],skin=posedNode.getSkin(),matrices=skin.listJoints().map((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
  for(const p of node.getMesh().listPrimitives())transforms.set(p,matrices);
 }
 posedPosition=ref=>{const {p,index}=ref,ids=p.getAttribute('JOINTS_0').getElement(index,[]),weights=p.getAttribute('WEIGHTS_0').getElement(index,[]),point=new Vector3(...p.getAttribute('POSITION').getElement(index,[])),out=new Vector3();
  for(let k=0;k<4;k++)if(weights[k])out.addScaledVector(point.clone().applyMatrix4(transforms.get(p)[ids[k]]),weights[k]);return out;};
}
let forbidden=null,forbiddenSha256=null;
if(process.env.CLOSURE_FORBIDDEN){
 const raw=await fs.readFile(process.env.CLOSURE_FORBIDDEN);forbidden=JSON.parse(raw);forbiddenSha256=sha256(raw);
 assert.equal(forbidden.baseSha256,sha256(bytes));assert.equal(forbidden.poseSha256,poseSha256);assert.equal(forbidden.cutEdgesSha256,sha256(cutBytes));
 assert.equal(forbidden.kind,'measured-derived-closure-crossing-exclusions');
}
await fs.mkdir(output,{recursive:true});
for(const node of doc.getRoot().listNodes())if(node.getMesh()){
 const originals=node.getMesh().listPrimitives(),next=new Map(),vertex=new Map();
 for(const p of originals){
  assert(!p.getExtras().derivedBoundaryPatch,'Use an unclosed source cut');
  const idx=p.getIndices().getArray(),weld=p.getAttribute('_SOURCE_WELD').getArray(),fans=p.getAttribute('_SOURCE_CUT_WELD').getArray();
  for(let i=0;i<idx.length;i+=3)for(let k=0;k<3;k++){
   const a=idx[i+k],b=idx[i+(k+1)%3];if(!wanted.has(key(weld[a],weld[b])))continue;
   const from=fans[a],to=fans[b];assert(!next.has(from),'A cut fan must have one outgoing boundary edge');next.set(from,to);vertex.set(from,{p,index:a});
  }
  const metadata=p.getExtras().sourceProvenance;
  for(const file of [metadata.triangleMap.file,metadata.weldMap.file,metadata.weldMap.review.file])await fs.copyFile(path.resolve(base,file),path.resolve(output,file));
 }
 const visited=new Set();
 for(const start of next.keys())if(!visited.has(start)){
  const forward=[];let at=start;
  do{assert(next.has(at)&&!visited.has(at),'Open or branching garment cut');visited.add(at);forward.push(at);at=next.get(at);}while(at!==start);
  assert(forward.length>=3);const loop=forward.toReversed(),points=loop.map(id=>{const ref=vertex.get(id);return new Vector3(...ref.p.getAttribute('POSITION').getElement(ref.index,[]));}),
   lookup=new Map(loop.map((id,i)=>[id,i])),forbiddenTriangles=new Set((forbidden?.nodes[node.getName()]??[]).filter(t=>t.every(id=>lookup.has(id))).map(t=>t.map(id=>lookup.get(id)).sort((a,b)=>a-b).join(':'))),
   {triangles,normal}=triangulateCut(points,{method:closureMethod,posedPoints:posedPosition?loop.map(id=>posedPosition(vertex.get(id))):undefined,maxEdgeRatio:1.49,forbiddenTriangles});
  const halfedges=new Map();for(const triangle of triangles)for(let k=0;k<3;k++){const a=triangle[k],b=triangle[(k+1)%3],id=key(a,b),group=halfedges.get(id)??[];group.push([a,b]);halfedges.set(id,group);}
  let boundary=0;for(const pairs of halfedges.values()){
   if(pairs.length===2)assert(pairs[0][0]===pairs[1][1]&&pairs[0][1]===pairs[1][0],'Closure winding disagrees');
   else{assert.equal(pairs.length,1);const[a,b]=pairs[0];assert.equal((a+1)%loop.length,b,'Closure must reverse every original cut halfedge');boundary++;}
  }assert.equal(boundary,loop.length);
  const material=vertex.get(loop[0]).p.getMaterial(),cap=doc.createPrimitive().setMaterial(material);
  for(const semantic of vertex.get(loop[0]).p.listSemantics()){
   const template=vertex.get(loop[0]).p.getAttribute(semantic),size=template.getElementSize(),values=new(template.getArray().constructor)(loop.length*size);
   for(let i=0;i<loop.length;i++){
    const ref=vertex.get(loop[i]);assert.equal(ref.p.getMaterial(),material,'Closure crosses material boundary');
    const element=semantic==='NORMAL'?normal.toArray():ref.p.getAttribute(semantic).getElement(ref.index,[]);values.set(element,i*size);
   }
   cap.setAttribute(semantic,doc.createAccessor('',buffer).setType(template.getType()).setNormalized(template.getNormalized()).setArray(values));
  }
  cap.setIndices(doc.createAccessor('',buffer).setType('SCALAR').setArray(Uint32Array.from(triangles.flat())));
  const patch={node:node.getName(),sourceSha256:plan.sourceSha256,cutEdgesSha256:sha256(cutBytes),sourceCornerFans:loop,vertices:loop.length,triangles:triangles.length,
   method:closureMethod+' source-corner disk; reversed actual cut halfedges; original source boundary UV/skin supports, derived closure normals. No body fabrication.',reviewed:false,accepted:false};
  cap.setExtras({derivedBoundaryPatch:patch});node.getMesh().addPrimitive(cap);patches.push(patch);
 }
}
assert(patches.length>0);const file=output+'/H01-C0-rigged.glb';await io.write(file,doc);const result=await io.read(file);
assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
const after=immutablePayload(result);for(let i=0;i<original.meshes.length;i++)after.meshes[i].primitives=after.meshes[i].primitives.slice(0,original.meshes[i].primitives.length);
assert.deepEqual(after,original,'Original mesh/material/images/skin must remain unchanged');
for(const name of ['cut-plan.json','cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin'])await fs.copyFile(base+'/'+name,output+'/'+name);
const report={base,inputSha256:sha256(bytes),output:file,sha256:sha256(await fs.readFile(file)),originalPayloadPreserved:true,sourceImagesAndClipsPreserved:true,poseFile:process.env.CLOSURE_POSE??null,poseSha256,maximumDesignEdgeRatio:posedPosition?1.49:null,
 forbiddenFile:process.env.CLOSURE_FORBIDDEN??null,forbiddenSha256,addedClosureTriangles:patches.reduce((n,p)=>n+p.triangles,0),patches,accepted:false,activated:false,scope:'Derived garment closure staging experiment. New faces explicitly declared, not passed off as original source triangles. Source-provenance acceptance remains blocked pending independent closure proof, deformation/collision and visual review.'};
await fs.writeFile(output+'/receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,closures:patches.length,triangles:report.addedClosureTriangles,accepted:false}));
