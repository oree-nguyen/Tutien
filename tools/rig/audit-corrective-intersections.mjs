import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {sourceSurfaceIntersections} from './surface-intersections.mjs';

const directory=process.argv[2],output=process.argv[3];
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory??'')&&output);
const hash=b=>createHash('sha256').update(b).digest('hex'),solve=JSON.parse(await fs.readFile(directory+'/solve.json')),
  bytes=await fs.readFile(directory+'/H01-C0-rigged.glb'),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  poseBytes=await fs.readFile(solve.poseFile),pose=JSON.parse(poseBytes),
  tb=await fs.readFile(solve.base+'/triangles.bin'),wb=await fs.readFile(solve.base+'/source-welds.u32bin'),lb=await fs.readFile(solve.base+'/face-labels.bin'),
  triangles=new Uint32Array(tb.buffer,tb.byteOffset,tb.byteLength/4),welds=new Uint32Array(wb.buffer,wb.byteOffset,wb.byteLength/4),labels=new Uint8Array(lb);
assert.equal(hash(poseBytes),solve.poseSha256);assert.equal(hash(tb),solve.inputHashes['triangles.bin']);assert.equal(hash(wb),solve.inputHashes['source-welds.u32bin']);assert.equal(hash(lb),solve.inputHashes['face-labels.bin']);
assert(pose.passed&&!pose.translations&&!pose.scales);
for(const[name,r]of Object.entries(pose.rotations)){const targets=doc.getRoot().listNodes().filter(n=>n.getName()===name);assert.equal(targets.length,1);targets[0].setRotation(r);}
const measurements=[];
await fs.mkdir(output,{recursive:true});
for(const morphWeight of [0,1]){
  const positions=new Float32Array(welds.length*3),seen=new Uint8Array(welds.length),v=new Vector3(),q=new Vector3();
  for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){
    assert.equal(p.listTargets().length,1);
    const sourceIds=p.getAttribute('_SOURCE_VERTEX').getArray(),source=p.getAttribute('POSITION').getArray(),delta=p.listTargets()[0].getAttribute('POSITION').getArray(),
      ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray(),skin=node.getSkin(),
      matrices=skin.listJoints().map((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
    for(let i=0;i<sourceIds.length;i++){
      v.set(0,0,0);
      for(let k=0;k<4;k++)if(weights[i*4+k]){
        q.fromArray(source,i*3);q.x+=morphWeight*delta[i*3];q.y+=morphWeight*delta[i*3+1];q.z+=morphWeight*delta[i*3+2];
        v.addScaledVector(q.applyMatrix4(matrices[ids[i*4+k]]),weights[i*4+k]);
      }
      assert(v.toArray().every(Number.isFinite));
      const id=sourceIds[i];if(seen[id])for(let k=0;k<3;k++)assert.equal(positions[id*3+k],Math.fround(v.getComponent(k)));
      v.toArray(positions,id*3);seen[id]=1;
    }
  }
  assert(seen.every(Boolean));
  const started=performance.now(),measured=sourceSurfaceIntersections({positions,triangles,welds,labels}),{pairs,...summary}=measured,
    pairBytes=Buffer.from(Uint32Array.from(pairs.flat()).buffer),file=`pairs-morph${morphWeight}.u32bin`;
  await fs.writeFile(path.join(output,file),pairBytes);
  measurements.push({...summary,morphWeight,seconds:(performance.now()-started)/1000,pairFile:file,pairSha256:hash(pairBytes),pairs});
  console.log(JSON.stringify({morphWeight,crossingPairs:measured.crossingPairs,coplanarOverlapPairs:measured.coplanarOverlapPairs,seconds:measurements.at(-1).seconds}));
}
const before=new Set(measurements[0].pairs.map(([a,b])=>a*labels.length+b)),after=new Set(measurements[1].pairs.map(([a,b])=>a*labels.length+b)),
  added=[...after].filter(key=>!before.has(key)),resolved=[...before].filter(key=>!after.has(key)),
  report={asset:directory+'/H01-C0-rigged.glb',assetSha256:hash(bytes),pose:solve.poseFile,poseSha256:hash(poseBytes),
    sourceTriangles:labels.length,sourceVertices:welds.length,helperSha256:hash(await fs.readFile('tools/rig/surface-intersections.mjs')),
    inputHashes:solve.inputHashes,measurements:measurements.map(({pairs,...rest})=>rest),newCrossingPairs:added.length,resolvedCrossingPairs:resolved.length,
    unchangedCrossingPairs:after.size-added.length,accepted:false,
    scope:'Same actual source topology and held pose, morph0 versus morph1. Nonlocal surface crossings involving garments; exact source-weld neighbors excluded. Coplanarity, containment/thickness, full animation and visual acceptance remain separate.'};
await fs.writeFile(path.join(output,'intersections.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({newCrossingPairs:added.length,resolvedCrossingPairs:resolved.length,accepted:false}));
