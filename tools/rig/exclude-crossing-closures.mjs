/** Translate actual BVH crossing pairs into stable same-node source-fan triples. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {sha256} from './animation-payload.mjs';

const [candidate,auditDirectory,output,previous]=process.argv.slice(2);assert(candidate&&auditDirectory&&output);
const raw=await fs.readFile(auditDirectory+'/audit.json'),audit=JSON.parse(raw),receipt=JSON.parse(await fs.readFile(candidate+'/receipt.json')),
 bytes=await fs.readFile(candidate+'/H01-C0-rigged.glb');assert.equal(audit.sha256,sha256(bytes));assert.equal(receipt.sha256,audit.sha256);
const measurement=audit.measurements.find(m=>m.name==='after'),pairsBytes=await fs.readFile(auditDirectory+'/'+measurement.pairFile);assert.equal(sha256(pairsBytes),measurement.pairSha256);
const pairs=new Uint32Array(pairsBytes.buffer,pairsBytes.byteOffset,pairsBytes.length/4),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),derived=new Map(),nodes={};let face=0;
for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){
 const index=p.getIndices().getArray(),fans=p.getAttribute('_SOURCE_CUT_WELD').getArray();
 for(let i=0;i<index.length;i+=3,face++)if(p.getExtras().derivedBoundaryPatch)derived.set(face,{node:node.getName(),fans:Array.from(index.subarray(i,i+3),v=>fans[v]).sort((a,b)=>a-b)});
}
const report={kind:'measured-derived-closure-crossing-exclusions',baseSha256:receipt.inputSha256,poseSha256:receipt.poseSha256,cutEdgesSha256:sha256(await fs.readFile(candidate+'/cut-edges.u32bin')),nodes,
 measuredCandidateSha256:audit.sha256,auditFile:auditDirectory+'/audit.json',auditSha256:sha256(raw),crossingPairs:measurement.crossingPairs,derivedCrossingPairs:0,previousSha256:null,accepted:false};
if(previous){
 const priorBytes=await fs.readFile(previous),prior=JSON.parse(priorBytes);for(const field of ['kind','baseSha256','poseSha256','cutEdgesSha256'])assert.equal(prior[field],report[field]);
 for(const[node,triples]of Object.entries(prior.nodes))nodes[node]=triples.map(t=>t.slice());report.previousSha256=sha256(priorBytes);
}
for(let i=0;i<pairs.length;i+=2){
 const found=[derived.get(pairs[i]),derived.get(pairs[i+1])].filter(Boolean);if(found.length)report.derivedCrossingPairs++;
 for(const d of found){const list=nodes[d.node]??=[];if(!list.some(t=>t.join(':')===d.fans.join(':')))list.push(d.fans);}
}
report.forbiddenTriangles=Object.values(nodes).reduce((n,list)=>n+list.length,0);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({crossingPairs:report.crossingPairs,derivedCrossingPairs:report.derivedCrossingPairs,forbiddenTriangles:report.forbiddenTriangles,accepted:false}));
