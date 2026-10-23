/** Add independent finger articulation to a hash-locked fitting experiment. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { sha256 } from "./animation-payload.mjs";
import { isolateFingerPose } from "./finger-isolation.mjs";

const [base, stressFile, output] = process.argv.slice(2);
for (const p of [base,output]) assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(p??""));
await assert.rejects(fs.access(output), {code:"ENOENT"});
const metadata = await fs.readFile(base+"/feasibility-input.json"), meta=JSON.parse(metadata);
assert.equal(meta.kind,"source-support-layout");
for(const [name,hash] of Object.entries(meta.files)) assert.equal(sha256(await fs.readFile(base+"/"+name)),hash);
const bytes=await fs.readFile(base+"/H01-C0-rigged.glb");
assert.equal(sha256(bytes),meta.assetSha256);
const source=JSON.parse(await fs.readFile(meta.candidate+"/receipt.json"));
assert.equal(source.sha256,meta.assetSha256);
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
const skin=doc.getRoot().listSkins()[0], joints=skin.listJoints();
const bind=joints.map(n=>({n,p:n.getTranslation(),q:n.getRotation()}));
const stressBytes=await fs.readFile(stressFile), stress=JSON.parse(stressBytes);
assert.deepEqual(Object.keys(stress.rotations).sort(),joints.map(n=>n.getName()).sort());
const bindPose={rotations:Object.fromEntries(bind.map(({n,q})=>[n.getName(),q])),translations:Object.fromEntries(bind.map(({n,p})=>[n.getName(),p]))};
const priorMatrices=await fs.readFile(base+"/feasibility-matrices.bin");
const poses=[...meta.poses], data=[priorMatrices];
await fs.mkdir(output);
await fs.mkdir(output+"/poses");
for(const side of ["Left","Right"]) for(const finger of ["Thumb","Index","Middle","Ring","Pinky"]){
  const pose={...isolateFingerPose(bindPose,stress,side,finger),diagnostic:true,accepted:false,
    scope:"Single finger only, original bind body and immutable original stress angles. Not a replacement for complete stress/production poses.",
    derivedFrom:{file:stressFile,sha256:sha256(stressBytes)}};
  for(const {n} of bind){
    n.setTranslation(pose.translations[n.getName()]); n.setRotation(pose.rotations[n.getName()]);
  }
  const file=output+"/poses/"+side.toLowerCase()+"-"+finger.toLowerCase()+".json";
  const serialized=JSON.stringify(pose,null,2)+"\n";
  await fs.writeFile(file,serialized);
  poses.push({file,sha256:sha256(Buffer.from(serialized))});
  const matrices=new Float64Array(joints.length*16);
  for(let i=0;i<joints.length;i++) matrices.set(new Matrix4().fromArray(joints[i].getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))).elements,i*16);
  data.push(Buffer.from(matrices.buffer));
}
const files={...meta.files};
for(const name of Object.keys(meta.files)) if(name!=="feasibility-matrices.bin") await fs.link(base+"/"+name,output+"/"+name);
const matrices=Buffer.concat(data);
assert.equal(matrices.length,poses.length*joints.length*16*8);
await fs.writeFile(output+"/feasibility-matrices.bin",matrices);
files["feasibility-matrices.bin"]=sha256(matrices);
await fs.link(base+"/H01-C0-rigged.glb",output+"/H01-C0-rigged.glb");
await fs.writeFile(output+"/receipt.json",JSON.stringify({sha256:meta.assetSha256,accepted:false,activated:false},null,2)+"\n");
await fs.writeFile(output+"/feasibility-input.json",JSON.stringify({...meta,files,poseCount:poses.length,poses,matricesSha256:files["feasibility-matrices.bin"],
  independentFingerExtension:{base,baseMetadataSha256:sha256(metadata),stressFile,stressSha256:sha256(stressBytes),originalPosesRetained:meta.poses.length,addedPoses:10},accepted:false,activated:false},null,2)+"\n");
console.log(output, poses.length,"poses; original constraints retained");
