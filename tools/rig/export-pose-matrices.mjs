/** Record actual joint-world × inverse-bind matrices for a staged mesh. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4} from 'three';
import {sha256} from './animation-payload.mjs';

const base=process.argv[2],poseFile=process.argv[3]??'docs/anim-report/harmonic-held/H01-reference-idle-solve.json';
assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(base));
const bytes=await fs.readFile(base+'/H01-C0-rigged.glb'),poseBytes=await fs.readFile(poseFile),
 receipt=JSON.parse(await fs.readFile(base+'/receipt.json')),pose=JSON.parse(poseBytes);
assert.equal(sha256(bytes),receipt.sha256);
assert.equal(pose.passed,true);assert(pose.rotations&&Object.keys(pose.rotations).length);
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
for(const[name,q]of Object.entries(pose.rotations)){
 const matches=doc.getRoot().listNodes().filter(n=>n.getName()===name);
 assert.equal(matches.length,1);assert(q.length===4&&q.every(Number.isFinite)&&Math.abs(Math.hypot(...q)-1)<1e-5);
 matches[0].setRotation(q);
}
assert(!pose.scales);for(const[name,t]of Object.entries(pose.translations??{})){
 assert.equal(name,'Hips');const matches=doc.getRoot().listNodes().filter(n=>n.getName()===name);
 assert.equal(matches.length,1);assert(t.length===3&&t.every(Number.isFinite));matches[0].setTranslation(t);
}
const skins=doc.getRoot().listSkins();assert.equal(skins.length,1);
const skin=skins[0],values=Float64Array.from(skin.listJoints().flatMap((joint,i)=>
 new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))).elements));
assert([...values].every(Number.isFinite));const matrices=Buffer.from(values.buffer);
await fs.writeFile(base+'/feasibility-matrices.bin',matrices);
await fs.writeFile(base+'/feasibility-input.json',JSON.stringify({assetSha256:sha256(bytes),poseFile,poseSha256:sha256(poseBytes),matricesSha256:sha256(matrices)},null,2)+'\n');
console.log(JSON.stringify({assetSha256:sha256(bytes),poseSha256:sha256(poseBytes),joints:skin.listJoints().length}));
