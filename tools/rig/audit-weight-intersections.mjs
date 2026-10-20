/** Same-source, same-pose surface crossings before/after a skin-weight trial. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {sourceSurfaceIntersections} from './surface-intersections.mjs';

const [directory,output]=process.argv.slice(2),hash=b=>createHash('sha256').update(b).digest('hex');
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory??'')&&output);
const solve=JSON.parse(await fs.readFile(directory+'/solve.json')),receipt=JSON.parse(await fs.readFile(directory+'/receipt.json')),
 poseBytes=await fs.readFile(solve.poseFile),pose=JSON.parse(poseBytes),
 read=async(name,Type)=>{const b=await fs.readFile(solve.base+'/'+name);return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);},
 triangles=await read('triangles.bin',Uint32Array),welds=await read('source-welds.u32bin',Uint32Array),labels=await read('face-labels.bin',Uint8Array);
assert.equal(hash(poseBytes),solve.poseSha256);assert(pose.passed&&!pose.translations&&!pose.scales);
for(const name of ['triangles.bin','source-welds.u32bin'])assert.equal(hash(await fs.readFile(solve.base+'/'+name)),solve.inputHashes[name]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),cases=[['before',solve.base+'/H01-C0-rigged.glb',solve.assetSha256],['after',directory+'/H01-C0-rigged.glb',receipt.sha256]],results=[];
await fs.mkdir(output,{recursive:true});
for(const[name,file,expected]of cases){
 const bytes=await fs.readFile(file);assert.equal(hash(bytes),expected);const doc=await io.readBinary(bytes);
 for(const[n,r]of Object.entries(pose.rotations)){const nodes=doc.getRoot().listNodes().filter(x=>x.getName()===n);assert.equal(nodes.length,1);nodes[0].setRotation(r);}
 const positions=new Float32Array(welds.length*3),seen=new Uint8Array(welds.length),value=new Vector3(),v=new Vector3();
 for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){
  assert.equal(p.listTargets().length,0,'This comparison explicitly measures skin-only trials');
  const source=p.getAttribute('POSITION').getArray(),sourceIds=p.getAttribute('_SOURCE_VERTEX').getArray(),ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray(),skin=node.getSkin(),
   matrices=skin.listJoints().map((n,i)=>new Matrix4().fromArray(n.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
  for(let i=0;i<sourceIds.length;i++){
   value.set(0,0,0);for(let k=0;k<4;k++)if(weights[i*4+k])value.addScaledVector(v.fromArray(source,i*3).applyMatrix4(matrices[ids[i*4+k]]),weights[i*4+k]);
   assert(value.toArray().every(Number.isFinite));const id=sourceIds[i];assert(id<seen.length);
   if(seen[id])for(let k=0;k<3;k++)assert.equal(positions[id*3+k],Math.fround(value.getComponent(k)));
   value.toArray(positions,id*3);seen[id]=1;
  }
 }
 assert(seen.every(Boolean));const started=performance.now(),measurement=sourceSurfaceIntersections({positions,triangles,welds,labels}),{pairs,...summary}=measurement,
  pairBytes=Buffer.from(Uint32Array.from(pairs.flat()).buffer),pairFile='pairs-'+name+'.u32bin';
 await fs.writeFile(path.join(output,pairFile),pairBytes);
 results.push({name,asset:file,assetSha256:expected,...summary,pairFile,pairSha256:hash(pairBytes),seconds:(performance.now()-started)/1000,pairs});
 console.log(JSON.stringify({name,crossingPairs:measurement.crossingPairs,seconds:results.at(-1).seconds}));
}
const keys=row=>new Set(row.pairs.map(([a,b])=>a*labels.length+b)),before=keys(results[0]),after=keys(results[1]),
 added=[...after].filter(k=>!before.has(k)).length,resolved=[...before].filter(k=>!after.has(k)).length,
 report={pose:solve.poseFile,poseSha256:hash(poseBytes),sourceVertices:welds.length,sourceTriangles:labels.length,
  labelsSha256:hash(await fs.readFile(solve.base+'/face-labels.bin')),measurements:results.map(({pairs,...r})=>r),
  newCrossingPairs:added,resolvedCrossingPairs:resolved,unchangedCrossingPairs:after.size-added,accepted:false,
  scope:'Actual original source topology and identical held pose, before/after skin-only changes. Source-weld neighbors excluded. Surface crossings do not certify containment, thickness, volume, animation or visual acceptance.'};
await fs.writeFile(path.join(output,'intersections.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({added,resolved,accepted:false}));
