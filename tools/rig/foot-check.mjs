import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {sha256} from './animation-payload.mjs';
import {handStrain} from './hand-strain.mjs';
const hero=process.env.HERO??'H01',input=process.env.RIG_FILE??`assets/rigged/${hero}-C0-rigged.glb`,directory=process.env.FOOT_SOURCE_DIR??`.local/rig-candidates/foot-source/${hero}`,output=process.env.FOOT_REPORT_FILE??`docs/anim-report/conver10-redo/feet/${hero}/contact.json`,
 poseFiles=(process.env.FOOT_POSES??`.local/rig-candidates/fk-full-staging/${hero}-land-pose.json,.local/rig-candidates/fk-full-staging/${hero}-planted-slip-peak-pose.json`).split(','),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input),doc=await io.readBinary(bytes),selectionBytes=await fs.readFile(directory+'/selection.json'),selection=JSON.parse(selectionBytes),nodes=doc.getRoot().listNodes(),bind=new Map(nodes.map(n=>[n,{r:n.getRotation(),t:n.getTranslation()}])),
 selected=Object.fromEntries(Object.entries(selection.sides).map(([s,r])=>[s,new Set(r.vertexIds)])),sole=Object.fromEntries(Object.entries(selection.sides).map(([s,r])=>[s,new Set(r.soleVertexIds)])),samples=[];
const sourceDoc=await io.read(selection.source),sourcePosition=sourceDoc.getRoot().listNodes().find(n=>n.getMesh()).getMesh().listPrimitives()[0].getAttribute('POSITION').getArray();
assert.equal(sha256(await fs.readFile(selection.source)),selection.sourceSha256);
for(const poseFile of poseFiles){
 for(const[n,v]of bind){n.setRotation(v.r);n.setTranslation(v.t);}
 const poseBytes=await fs.readFile(poseFile),pose=JSON.parse(poseBytes);assert(pose.passed===true||pose.poseDataValid===true,'Missing diagnostic data-valid declaration');assert(!pose.scales,'Unsupported pose scales');
 for(const[name,r]of Object.entries(pose.rotations)){const targets=nodes.filter(n=>n.getName()===name);assert(targets.length===1&&r.length===4&&r.every(Number.isFinite)&&Math.abs(Math.hypot(...r)-1)<1e-5);targets[0].setRotation(r);}
 for(const[name,t]of Object.entries(pose.translations??{})){assert(name==='Hips'&&t.length===3&&t.every(Number.isFinite));nodes.find(n=>n.getName()===name).setTranslation(t);}
 const sides=Object.fromEntries(Object.keys(selected).map(s=>[s,{vertices:0,soleVertices:0,minimumY:Infinity,maximumY:-Infinity,soleMinimumY:Infinity,soleMaximumY:-Infinity,minimumSource:null}])),strains=[];
 for(const[nodeIndex,node]of nodes.entries())if(node.getMesh())for(const[primitiveIndex,p]of node.getMesh().listPrimitives().entries()){
  const pos=p.getAttribute('POSITION').getArray(),map=p.getAttribute('_SOURCE_VERTEX')?.getArray(),ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0'),skin=node.getSkin(),ibm=skin.getInverseBindMatrices(),matrices=skin.listJoints().map((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(ibm.getElement(i,[])))),mask=new Uint8Array(pos.length/3),cache=new Map();
  if(!map){assert.equal(pos.length,sourcePosition.length);assert.deepEqual(pos,sourcePosition);}
  const position=i=>{if(cache.has(i))return cache.get(i);const out=new Vector3(),v=new Vector3(),w=weights.getElement(i,[]);for(let k=0;k<4;k++)if(w[k])out.addScaledVector(v.fromArray(pos,i*3).applyMatrix4(matrices[ids[i*4+k]]),w[k]);assert(out.toArray().every(Number.isFinite));cache.set(i,out);return out;};
  for(let v=0;v<mask.length;v++){const id=map?map[v]:v;for(const[side,wanted]of Object.entries(selected))if(wanted.has(id)){mask[v]=1;const out=position(v),s=sides[side];s.vertices++;if(out.y<s.minimumY){s.minimumY=out.y;s.minimumSource={nodeIndex,primitiveIndex,vertex:v,sourceVertexId:id,bind:Array.from(pos.subarray(v*3,v*3+3)),posed:out.toArray()};}s.maximumY=Math.max(s.maximumY,out.y);if(sole[side].has(id)){s.soleVertices++;s.soleMinimumY=Math.min(s.soleMinimumY,out.y);s.soleMaximumY=Math.max(s.soleMaximumY,out.y);}}}
  if(mask.some(Boolean))strains.push({nodeIndex,primitiveIndex,node:node.getName(),scope:'Every triangle touching the exact boot source-ID domain, including its unmodified neighboring boundary vertices',...handStrain({primitive:p,mask,position})});
 }
 samples.push({poseFile,poseSha256:sha256(poseBytes),clip:pose.clip??null,time:pose.time??null,upstreamPassed:pose.passed===true,sourcePoseRigSha256:pose.inputSha256??null,sides,edgeStrainPassed:strains.every(s=>s.passed),strains});
}
const report={hero,input,inputSha256:sha256(bytes),selection:directory+'/selection.json',selectionSha256:sha256(selectionBytes),sourceSha256:selection.sourceSha256,accepted:false,activated:false,scope:'Exact graph-selected lower boot source vertices and underside patch skinned at frozen diagnostic FK poses; 5mm ground criteria and unchanged1.5/2.0 edge limits. Upstream failures retained; no complete animation or semantic acceptance inferred.',samples};await fs.mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:samples.map(s=>({...s,strains:s.strains.map(t=>({node:t.node,p999:t.p999,maximum:t.maximum,passed:t.passed,issueCounts:t.issueCounts,worst:t.worst}))}))},null,2));
