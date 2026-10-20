/** Unapproved cut-pattern diagnostic: exact source fans, kept seams and crossings. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {SourceProvenanceValidator} from './source-provenance.mjs';
import {SeamAccumulator} from './mesh-seams.mjs';
import {sourceSurfaceIntersections} from './surface-intersections.mjs';
import {sha256} from './animation-payload.mjs';

const directory=process.argv[2],output=process.argv[3];assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory)&&output);
const solve=JSON.parse(await fs.readFile(directory+'/solve.json')),receipt=JSON.parse(await fs.readFile(directory+'/receipt.json')),
 poseBytes=await fs.readFile(solve.poseFile),pose=JSON.parse(poseBytes),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),
 plan=JSON.parse(await fs.readFile(directory+'/cut-plan.json')),cutBytes=await fs.readFile(directory+'/cut-edges.u32bin'),
 labels=new Uint8Array(await fs.readFile(directory+'/face-roles.u8bin')),results=[],raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
assert.equal(sha256(poseBytes),solve.poseSha256);assert(pose.passed&&!pose.scales&&!pose.translations);
assert.equal(sha256(cutBytes),plan.files['cut-edges.u32bin'].sha256);await fs.mkdir(output,{recursive:true});
let expectedFans;
for(const[name,file,expectedSha]of [['before',solve.base+'/H01-C0-rigged.glb',solve.assetSha256],['after',directory+'/H01-C0-rigged.glb',receipt.sha256]]){
 const bytes=await fs.readFile(file);assert.equal(sha256(bytes),expectedSha);const doc=await io.readBinary(bytes),provenance=new SourceProvenanceValidator(file),
  primitives=doc.getRoot().listNodes().flatMap(n=>(n.getMesh()?.listPrimitives()??[]).map(p=>({n,p}))),mapped=[];
 for(const{p}of primitives){
  const cut=p.getAttribute('_SOURCE_CUT_WELD');assert(cut);p.setAttribute('_SOURCE_CUT_WELD',null);
  // Source conservation is separate from cut approval. This diagnostic never
  // grants a pattern review and cannot authorize runtime activation.
  const m=await provenance.validate(p);p.setAttribute('_SOURCE_CUT_WELD',cut);
  assert(m.verified,m.errors.join(';'));mapped.push(m);
 }
 assert(provenance.coverage().passed);const source=mapped[0].source;assert.equal(source.sha256,plan.sourceSha256);
 if(!expectedFans){
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'hg-cut-diagnostic-'));
  try{
   await fs.writeFile(temporary+'/triangles.u32bin',raw(Uint32Array.from(source.primitive.getIndices().getArray())));
   await fs.writeFile(temporary+'/welds.u32bin',raw(source.boundaryProof.ids));await fs.writeFile(temporary+'/cuts.u32bin',cutBytes);
   execFileSync('python3',['tools/rig/verify_cut_fans.py',temporary],{env:{...process.env,OPENBLAS_NUM_THREADS:'1'},stdio:['ignore','pipe','pipe']});
   const b=await fs.readFile(temporary+'/expected-corners.u32bin');expectedFans=Uint32Array.from(new Uint32Array(b.buffer,b.byteOffset,b.length/4));
  }finally{await fs.rm(temporary,{recursive:true,force:true});}
 }
 for(const[n,q]of Object.entries(pose.rotations)){const nodes=doc.getRoot().listNodes().filter(x=>x.getName()===n);assert.equal(nodes.length,1);nodes[0].setRotation(q);}
 const total=primitives.reduce((sum,{p})=>sum+p.getAttribute('POSITION').getCount(),0),positions=new Float32Array(total*3),welds=new Uint32Array(total),
  sourceIds=[],indices=[],kept=new SeamAccumulator(),original=new SeamAccumulator(),value=new Vector3(),v=new Vector3();let at=0;
 for(const[part,{n,p}]of primitives.entries()){
  const m=mapped[part],src=p.getAttribute('POSITION').getArray(),ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray(),
   fans=p.getAttribute('_SOURCE_CUT_WELD').getArray(),idx=p.getIndices().getArray(),map=p.getExtras().sourceProvenance.triangleMap,
   mapBytes=await fs.readFile(path.resolve(path.dirname(file),map.file)),skin=n.getSkin(),
   matrices=skin.listJoints().map((joint,i)=>new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
  assert.equal(p.listTargets().length,0);assert.equal(sha256(mapBytes),map.sha256);
  for(let k=0;k<idx.length;k+=3){
   const face=mapBytes.readUInt32LE(map.offsetBytes+k/3*4);sourceIds.push(face);
   for(let j=0;j<3;j++){assert.equal(fans[idx[k+j]],expectedFans[face*3+j]);indices.push(at+idx[k+j]);}
  }
  for(let i=0;i<fans.length;i++){
   value.set(0,0,0);for(let k=0;k<4;k++)if(weights[i*4+k])value.addScaledVector(v.fromArray(src,i*3).applyMatrix4(matrices[ids[i*4+k]]),weights[i*4+k]);
   assert(value.toArray().every(Number.isFinite));value.toArray(positions,(at+i)*3);welds[at+i]=fans[i];
   const record={position:value.toArray(),bind:Array.from(src.slice(i*3,i*3+3)),identity:{part,vertex:i},sourceVertexId:m.vertexIds[i]};
   kept.add(fans[i],record);original.add(m.weldIds[i],record);
  }at+=fans.length;
 }
 assert.equal(sourceIds.length,labels.length);assert.equal(new Set(sourceIds).size,labels.length);
 const started=performance.now(),measurement=sourceSurfaceIntersections({positions,triangles:Uint32Array.from(indices),welds,labels:Uint8Array.from(sourceIds,id=>labels[id])}),
  pairs=measurement.pairs.map(([a,b])=>[sourceIds[a],sourceIds[b]].sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),pairBytes=raw(Uint32Array.from(pairs.flat())),pairFile='pairs-'+name+'.u32bin';
 await fs.writeFile(output+'/'+pairFile,pairBytes);const {pairs:omitted,...summary}=measurement;
 results.push({name,file,sha256:expectedSha,sourceConservationPassed:true,expectedFanCornersChecked:expectedFans.length,keptSeams:kept.measure(),originalBeforeCutDiagnostic:original.measure(),
  ...summary,pairFile,pairSha256:sha256(pairBytes),seconds:(performance.now()-started)/1000,pairs});
 console.log(JSON.stringify({name,crossingPairs:measurement.crossingPairs,keptSeamMaximumMm:results.at(-1).keptSeams.maximumMillimetres,seconds:results.at(-1).seconds}));
}
const keys=r=>new Set(r.pairs.map(([a,b])=>a*labels.length+b)),before=keys(results[0]),after=keys(results[1]),
 added=[...after].filter(k=>!before.has(k)).length,resolved=[...before].filter(k=>!after.has(k)).length,
 report={sourceSha256:plan.sourceSha256,poseFile:solve.poseFile,poseSha256:solve.poseSha256,cutEdgesSha256:sha256(cutBytes),cutEdges:cutBytes.length/8,
  independentFanSha256:sha256(raw(expectedFans)),measurements:results.map(({pairs,...r})=>r),newCrossingPairs:added,resolvedCrossingPairs:resolved,accepted:false,activated:false,patternReviewed:false,
  scope:'Diagnostic for an unapproved cut pattern. Full source-attribute/oriented-face conservation and independently reconstructed source-corner fans checked. Kept seams measured at unchanged 0.001mm tolerance. No seam exception in acceptance: pattern review and full-animation acceptance remain required. Crossings do not certify volume/thickness.'};
await fs.writeFile(output+'/audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({added,resolved,accepted:false}));
