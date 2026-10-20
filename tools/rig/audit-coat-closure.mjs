/** Independently check declared garment closures against their exact parent. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';
import {sourceSurfaceIntersections} from './surface-intersections.mjs';

const [directory,output]=process.argv.slice(2);assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory)&&output);
const receipt=JSON.parse(await fs.readFile(directory+'/receipt.json')),bytes=await fs.readFile(directory+'/H01-C0-rigged.glb'),baseBytes=await fs.readFile(receipt.base+'/H01-C0-rigged.glb'),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS);assert.equal(sha256(bytes),receipt.sha256);assert.equal(sha256(baseBytes),receipt.inputSha256);
const base=await io.readBinary(baseBytes),doc=await io.readBinary(bytes),original=immutablePayload(base),after=immutablePayload(doc),
 originals=new Map(),reports=[],key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b),cutBytes=await fs.readFile(directory+'/cut-edges.u32bin'),cut=new Uint32Array(cutBytes.buffer,cutBytes.byteOffset,cutBytes.length/4),wanted=new Set();
for(let i=0;i<cut.length;i+=2)wanted.add(key(cut[i],cut[i+1]));
for(let i=0;i<original.meshes.length;i++)after.meshes[i].primitives=after.meshes[i].primitives.slice(0,original.meshes[i].primitives.length);
assert.deepEqual(after,original);assert.deepEqual(doc.getRoot().listAnimations().map(animationSignature),base.getRoot().listAnimations().map(animationSignature));
for(const node of base.getRoot().listNodes())if(node.getMesh()){
 const refs=new Map(),boundary=new Map();
 for(const p of node.getMesh().listPrimitives()){
  const fans=p.getAttribute('_SOURCE_CUT_WELD').getArray(),weld=p.getAttribute('_SOURCE_WELD').getArray(),idx=p.getIndices().getArray();
  for(let i=0;i<idx.length;i+=3)for(let k=0;k<3;k++){
   const a=idx[i+k],b=idx[i+(k+1)%3];if(!wanted.has(key(weld[a],weld[b])))continue;
   const list=refs.get(fans[a])??[];list.push({p,i:a});refs.set(fans[a],list);
   const id=fans[a]+':'+fans[b];assert(!boundary.has(id));boundary.set(id,true);
  }
 }originals.set(node.getName(),{refs,boundary,primitives:node.getMesh().listPrimitives().length});
}
let triangles=0;
for(const node of doc.getRoot().listNodes())if(node.getMesh()){
 const source=originals.get(node.getName());assert(source);const closedEdges=new Set();
 for(const[primitiveIndex,p]of node.getMesh().listPrimitives().entries())if(primitiveIndex>=source.primitives){
  assert(/^H01_(Robe|Sleeve)_(Left|Right)$/.test(node.getName()),'Closure must be existing garment only');
  const declaration=p.getExtras().derivedBoundaryPatch;assert(declaration&&!p.getExtras().sourceProvenance,'New faces cannot impersonate original triangles');
  const count=p.getAttribute('POSITION').getCount(),fans=p.getAttribute('_SOURCE_CUT_WELD').getArray(),idx=p.getIndices().getArray(),edges=new Map();
  assert.equal(idx.length/3,count-2);
  for(let i=0;i<count;i++){
   const matches=source.refs.get(fans[i])??[];assert(matches.some(ref=>p.listSemantics().filter(s=>s!=='NORMAL').every(s=>{
    const expected=ref.p.getAttribute(s),actual=p.getAttribute(s);return expected&&expected.getType()===actual.getType()&&expected.getComponentType()===actual.getComponentType()&&expected.getNormalized()===actual.getNormalized()&&JSON.stringify(expected.getElement(ref.i,[]))===JSON.stringify(actual.getElement(i,[]));
   })),'Closure vertex differs from actual cut boundary position/UV/skin/source ID');
  }
  for(let i=0;i<idx.length;i+=3)for(let k=0;k<3;k++){
   const a=fans[idx[i+k]],b=fans[idx[i+(k+1)%3]],group=edges.get(key(a,b))??[];group.push([a,b]);edges.set(key(a,b),group);
  }
  let boundary=0;for(const pairs of edges.values()){
   if(pairs.length===2)assert(pairs[0][0]===pairs[1][1]&&pairs[0][1]===pairs[1][0]);
   else{assert.equal(pairs.length,1);const[a,b]=pairs[0],reverse=b+':'+a;assert(source.boundary.has(reverse),'Closure boundary is not the actual parent cut');assert(!closedEdges.has(reverse),'Duplicate closure edge');closedEdges.add(reverse);boundary++;}
  }
  assert.equal(boundary,count);triangles+=idx.length/3;reports.push({node:node.getName(),primitiveIndex,vertices:count,triangles:idx.length/3,boundaryEdges:boundary});
 }
 assert.equal(closedEdges.size,source.boundary.size,'Every parent cut must be sealed once');
}
assert.equal(triangles,receipt.addedClosureTriangles);
const poseBytes=await fs.readFile(receipt.poseFile),pose=JSON.parse(poseBytes);assert.equal(sha256(poseBytes),receipt.poseSha256);assert(pose.passed&&!pose.scales&&!pose.translations);
const cases=[['before',base],['after',doc]],measurements=[];await fs.mkdir(output,{recursive:true});
for(const[name,current]of cases){
 for(const[n,q]of Object.entries(pose.rotations)){const targets=current.getRoot().listNodes().filter(x=>x.getName()===n);assert.equal(targets.length,1);targets[0].setRotation(q);}
 const parts=current.getRoot().listNodes().flatMap(n=>(n.getMesh()?.listPrimitives()??[]).map(p=>({n,p}))),total=parts.reduce((sum,{p})=>sum+p.getAttribute('POSITION').getCount(),0),
  positions=new Float32Array(total*3),welds=new Uint32Array(total),index=[],labels=[],v=new Vector3(),value=new Vector3();let at=0;
 for(const{n,p}of parts){
  const pos=p.getAttribute('POSITION').getArray(),ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray(),skin=n.getSkin(),
   matrices=skin.listJoints().map((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
  for(let i=0;i<pos.length/3;i++){value.set(0,0,0);for(let k=0;k<4;k++)if(weights[i*4+k])value.addScaledVector(v.fromArray(pos,i*3).applyMatrix4(matrices[ids[i*4+k]]),weights[i*4+k]);value.toArray(positions,(at+i)*3);}
  welds.set(p.getAttribute('_SOURCE_CUT_WELD').getArray(),at);const idx=p.getIndices().getArray();for(let i=0;i<idx.length;i++)index.push(at+idx[i]);
  const label=p.getExtras().derivedBoundaryPatch?6:n.getName()==='H01_Remaining_Source'?0:1;for(let i=0;i<idx.length/3;i++)labels.push(label);at+=pos.length/3;
 }
 const result=sourceSurfaceIntersections({positions,triangles:Uint32Array.from(index),welds,labels:Uint8Array.from(labels)}),{pairs,...summary}=result;
 const pairBytes=Buffer.from(Uint32Array.from(pairs.flat()).buffer),pairFile='pairs-'+name+'.u32bin';await fs.writeFile(output+'/'+pairFile,pairBytes);
 measurements.push({name,...summary,pairFile,pairSha256:sha256(pairBytes)});console.log(JSON.stringify({name,crossings:result.crossingPairs}));
}
const report={input:directory+'/H01-C0-rigged.glb',sha256:sha256(bytes),parent:receipt.base+'/H01-C0-rigged.glb',parentSha256:sha256(baseBytes),poseSha256:sha256(poseBytes),
 structuralProofPassed:true,originalPayloadAndClipsPreserved:true,originalCutHalfedgesSealedExactlyOnce:true,closureVerticesMatchActualBoundary:true,derivedTriangles:triangles,patches:reports,measurements,
 accepted:false,activated:false,scope:'Independent parent comparison and directed source-fan boundary/UV/skin proof. Actual source-geometry crossings measured separately. This is not full-animation, pattern review, volume or visual acceptance.'};
await fs.writeFile(path.join(output,'audit.json'),JSON.stringify(report,null,2)+'\n');
