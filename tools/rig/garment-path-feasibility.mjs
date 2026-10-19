import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4} from 'three';

const base=process.env.GARMENT_PATH_DIR??'.local/rig-candidates/semantic-garment-v3';
const poseFile=process.env.REFERENCE_POSE??'docs/anim-report/harmonic-held/H01-reference-idle-solve.json';
const output=process.env.GARMENT_PATH_REPORT??'docs/anim-report/semantic-garment-v3/cuff-waist-paths.json';
const bytes=await fs.readFile(base+'/H01-C0-rigged.glb'),poseBytes=await fs.readFile(poseFile);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(await fs.readFile(base+'/receipt.json'));
assert.equal(sha(bytes),receipt.sha256,'Asset differs from source support receipt');
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
const pose=JSON.parse(poseBytes);assert(pose.passed&&pose.rotations,'Unvalidated pose');
for(const [name,q] of Object.entries(pose.rotations)){
  const nodes=doc.getRoot().listNodes().filter(n=>n.getName()===name);
  assert.equal(nodes.length,1,'Ambiguous pose target '+name);
  assert(q.length===4&&q.every(Number.isFinite));nodes[0].setRotation(q);
}
const skins=doc.getRoot().listSkins();assert.equal(skins.length,1,'Expected one explicitly shared source skin');
const skin=skins[0],matrices=skin.listJoints().flatMap((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))).elements);
const values=Float64Array.from(matrices);
await fs.writeFile(base+'/feasibility-matrices.bin',Buffer.from(values.buffer));
await fs.writeFile(base+'/feasibility-input.json',JSON.stringify({assetSha256:sha(bytes),sourceSha256:receipt.sourceSha256,poseFile,poseSha256:sha(poseBytes),matricesSha256:sha(Buffer.from(values.buffer))},null,2)+'\n');
await new Promise((resolve,reject)=>{
  const child=spawn('python3',['tools/rig/garment_path_feasibility.py',base,output],{stdio:'inherit',env:{...process.env,OPENBLAS_NUM_THREADS:'1'}});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Path feasibility audit failed: '+code)));
});
