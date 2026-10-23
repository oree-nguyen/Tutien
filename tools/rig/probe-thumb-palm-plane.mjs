/** Compare CMC curl planes without changing a joint, a weight or an old pose. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Quaternion, Vector3 } from "three";
import { sourceBindCalibration } from "./source-bind-calibration.mjs";
import { anatomicalAngles } from "../../src/rig/joint-limits.js";
import { sha256 } from "./animation-payload.mjs";

const [asset, sourcePose, output] = process.argv.slice(2);
assert(asset?.startsWith(".local/rig-candidates/") && sourcePose && output);
await assert.rejects(fs.access(output), {code:"ENOENT"});
const bytes=await fs.readFile(asset), poseBytes=await fs.readFile(sourcePose);
const framesBytes=await fs.readFile("data/rig/hand-frames.json");
const hands=JSON.parse(framesBytes).heroes.H01.hands;
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
const joints=doc.getRoot().listSkins()[0].listJoints(), calibration=sourceBindCalibration(doc,hands);
const pose=JSON.parse(poseBytes), records=[];
for(const side of ["Left","Right"]){
  const name=side+"HandThumb1", node=joints.find(n=>n.getName()===name), frame=calibration[name];
  assert(node && frame);
  const world=new Matrix4().fromArray(node.getWorldMatrix());
  const rotation=new Quaternion().setFromRotationMatrix(world).normalize();
  const origin=new Vector3(...hands[side].fingers.Thumb.points[0]);
  const axis=new Vector3(...hands[side].fingers.Thumb.points[1]).sub(origin).normalize();
  const curl=new Vector3(...hands[side].palmCenter).sub(origin).projectOnPlane(axis);
  assert(curl.length()>1e-6,"Ambiguous CMC-to-palm plane"); curl.normalize();
  const x=axis.clone().cross(curl).normalize(), z=x.clone().cross(axis).normalize();
  const worldBasis=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,axis,z));
  const basis=rotation.clone().invert().multiply(worldBasis).normalize();
  const bind=new Quaternion(...node.getRotation()), oldBasis=new Quaternion(...frame.canonicalLocal);
  const oldDelta=oldBasis.clone().invert().multiply(bind.clone().invert()).multiply(new Quaternion(...pose.rotations[name])).multiply(oldBasis).normalize();
  const angles=anatomicalAngles(new Quaternion(...pose.rotations[name]),bind,oldBasis,frame);
  const target=bind.clone().multiply(basis).multiply(oldDelta).multiply(basis.clone().invert()).normalize();
  const after=anatomicalAngles(target,bind,basis,frame);
  for(const key of ["flex","lateral","twist"]) assert(Math.abs(angles[key]-after[key])<1e-7);
  records.push({name,origin:origin.toArray(),axis:axis.toArray(),measuredPalm:hands[side].palmCenter,
    originalPalmNormal:hands[side].n,projectedTowardPalm:curl.toArray(),
    towardPalmDotOriginalNormal:curl.dot(new Vector3(...hands[side].n)),
    oldCanonicalLocal:frame.canonicalLocal,newCanonicalLocal:basis.toArray(),anglesBefore:angles,anglesAfter:after});
  pose.rotations[name]=target.toArray();
}
pose.thumbPlaneProposal={asset,assetSha256:sha256(bytes),sourcePose,sourcePoseSha256:sha256(poseBytes),
  framesSha256:sha256(framesBytes),records,accepted:false,activated:false,
  scope:"Counterfactual CMC plane toward measured palm only. Original stress angles, all joint translations/lengths and every other rotation retained. Not an approved calibration or replacement test."};
await fs.writeFile(output,JSON.stringify(pose,null,2)+"\n");
console.log(records.map(r=>({name:r.name,palmDot:r.towardPalmDotOriginalNormal,angles:r.anglesAfter})));
