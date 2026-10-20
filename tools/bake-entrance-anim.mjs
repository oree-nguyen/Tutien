import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Quaternion } from "three";
import { ReferencePose } from "./rig/reference-pose.mjs";
import { immutablePayload, animationSignature, sha256 } from "./rig/animation-payload.mjs";
import { createFullEntranceSequence } from "./rig/full-entrance-sequence.mjs";
import { weaponFloor } from "./rig/weapon-floor.mjs";
import {inspectJoint} from "../src/rig/joint-limits.js";

const json=async file=>JSON.parse(await fs.readFile(file,"utf8"));
const save=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+"\n");};

/** Export all source channels plus attempted full Entrance/IDLE_HOLD, even when
 * constraints fail. Only a separate certificate may authorize activation. */
export async function bakeEntrance({hero="H01",input,output=".local/rig-candidates/fk-full-staging",report="docs/anim-report/conver10-redo/animation/full",boundedFit=false,velocityAware=false,jointRise=false,stancePoseFile}={}) {
  if(!["H01","H02"].includes(hero))throw Error("Unsupported hero");
  const spec=await json(`data/hero-entrance/${hero}.json`);
  input??=hero==="H01"?".local/rig-candidates/semantic-garment-v3/H01-C0-rigged.glb":"assets/rigged/H02-C0-rigged.glb";
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input),doc=await io.readBinary(bytes),original=immutablePayload(doc),
    frames=(await json("data/rig/bind-frames.json")).heroes[hero].joints,limits=await json("data/rig/joint-limits.json"),
    handFrames=(await json("data/rig/hand-frames.json")).heroes[hero].hands,
    reference=hero==="H01"?await json(spec.staging.referencePose):null,
    gripProofPath=`docs/hand-frames/${hero}-${hero==="H01"?"exact-grip-search":"grip-patch-search"}.json`,
    gripProof=await json(gripProofPath),weapon=await json(`data/weapons/${hero}.json`),
    heldContact=hero==="H01"?await json(spec.staging.contactEvidence):null,pose=new ReferencePose(doc,frames,limits),
    actualStanceFile=stancePoseFile??spec.staging.stancePose,
    stance=actualStanceFile?await json(actualStanceFile):null,
    weaponBytes=await fs.readFile(weapon.source),weaponDoc=await io.readBinary(weaponBytes),weaponFloorCheck=weaponFloor(weaponDoc,weapon.gripPivot);
  if(stance){
    for(const[name,r]of Object.entries(stance.rotations))pose.nodes.get(name).setRotation(r);
    pose.nodes.get("Hips").setTranslation(stance.translations.Hips);
    const support=spec.groundHand[0].toUpperCase()+spec.groundHand.slice(1)+"Hand",frame=frames[support],
      violations=pose.report().filter(v=>v.joint!==support);
    violations.push(...inspectJoint(new Quaternion(...pose.nodes.get(support).getRotation()),new Quaternion(...frame.bindRotation),new Quaternion(...frame.canonicalLocal),limits.wristGround,frame));
    if(violations.length)throw Error("Fitted stance violates calibrated joint bounds on actual source hierarchy: "+JSON.stringify(violations));
    stance.footPositions=Object.fromEntries(["Left","Right"].map(s=>[s,pose.position(pose.nodes.get(s+"Foot")).toArray()]));
    stance.footRotations=Object.fromEntries(["Left","Right"].map(s=>[s,pose.rotation(pose.nodes.get(s+"Foot")).toArray()]));
    pose.reset();
  }
  const sequence=createFullEntranceSequence({hero,spec,pose,handFrames,reference,gripProof,weapon,heldContact,stance,weaponFloorCheck,boundedFit,velocityAware,jointRise}),
    preserved=doc.getRoot().listAnimations().map(a=>({originalName:a.getName(),name:a.getName()==="Entrance"?"Entrance_LEGACY_C10":a.getName(),signature:animationSignature(a)}));
  if(preserved.some(a=>["IDLE_HOLD","Entrance_LEGACY_C10"].includes(a.originalName)))throw Error("Use the immutable pre-bake source");
  const curves=[],samples=[],selected=[];
  for(const[name,duration]of [["Entrance",spec.entranceDuration],["IDLE_HOLD",spec.idleDuration]]){
    const count=Math.round(duration*spec.sampleRateHz),times=Float32Array.from({length:count+1},(_,i)=>i/spec.sampleRateHz),
      rotations=new Map(pose.joints.map(j=>[j,new Float32Array((count+1)*4)])),translations=new Float32Array((count+1)*3);
    for(let sample=0;sample<=count;sample++){
      const time=sample/spec.sampleRateHz,result=sequence.sample(name,time);samples.push(result);
      for(const joint of pose.joints){const q=new Quaternion(...joint.getRotation()).normalize(),values=rotations.get(joint);if(sample&&q.dot(new Quaternion().fromArray(values,(sample-1)*4))<0)q.set(-q.x,-q.y,-q.z,-q.w);q.toArray(values,sample*4);}
      translations.set(pose.nodes.get("Hips").getTranslation(),sample*3);
      const landmarks=name==="Entrance"?[0,...spec.phases.flatMap(p=>[p.start,p.end]),...spec.events.map(e=>e.time)]:[0,1,2,3,4];
      if(landmarks.some(t=>Math.abs(t-time)<1/(spec.sampleRateHz*3)))selected.push({hero,clip:name,time,passed:false,poseDataValid:result.violations.length===0,scope:"Unaccepted full choreography FK sample; finite bounded diagnostic channels only, mesh/contact certification separate",rotations:Object.fromEntries(pose.joints.map(j=>[j.getName(),j.getRotation()])),translations:{Hips:pose.nodes.get("Hips").getTranslation()}});
    }
    curves.push({name,duration,times,rotations,translations});
  }
  pose.reset();
  for(const animation of doc.getRoot().listAnimations())if(animation.getName()==="Entrance")animation.setName("Entrance_LEGACY_C10");
  const buffer=doc.getRoot().listBuffers()[0];
  for(const curve of curves){
    const animation=doc.createAnimation(curve.name),times=doc.createAccessor(curve.name+"_time").setType("SCALAR").setArray(curve.times).setBuffer(buffer);
    const add=(joint,values,type,target)=>{const output=doc.createAccessor(curve.name+"_"+joint.getName()+"_"+target).setType(type).setArray(values).setBuffer(buffer),sampler=doc.createAnimationSampler().setInput(times).setOutput(output).setInterpolation("LINEAR"),channel=doc.createAnimationChannel().setTargetNode(joint).setTargetPath(target).setSampler(sampler);animation.addSampler(sampler).addChannel(channel);};
    for(const[joint,values]of curve.rotations)add(joint,values,"VEC4","rotation");
    add(pose.nodes.get("Hips"),curve.translations,"VEC3","translation");
    animation.setExtras({hero,scope:"full-reference-choreography-attempt",accepted:false,sampleRateHz:spec.sampleRateHz,events:curve.name==="Entrance"?spec.events:[]});
  }
  await fs.mkdir(output,{recursive:true});const outputFile=`${output}/${hero}-C0-rigged.glb`;await io.write(outputFile,doc);
  const outputBytes=await fs.readFile(outputFile),reread=await io.readBinary(outputBytes),payloadPreserved=JSON.stringify(original)===JSON.stringify(immutablePayload(reread)),
    oldClipsPreserved=preserved.every(a=>JSON.stringify(a.signature)===JSON.stringify(animationSignature(reread.getRoot().listAnimations().find(b=>b.getName()===a.name)))),
    support=samples.filter(s=>s.support),postGrab=samples.filter(s=>s.afterGrab),violating=samples.filter(s=>s.violations.length),
    failures=[...spec.staging.missing];
  if(violating.length)failures.unshift(`${violating.length}/${samples.length} sampled frames violate calibrated anatomical joint limits`);
  if(!gripProof.passed)failures.unshift("Selected local grip is rejected; it is used only to expose the closest attempted left-hand choreography");
  const metrics={sampledFrames:samples.length,violatingFrames:violating.length,failedIKFrames:samples.filter(s=>s.solutions.some(r=>!r.passed)).length,
    maximumGroundPalmHeight:support.length?Math.max(...support.map(s=>Math.abs(s.groundPalm[1]))):null,
    worstGroundFacingUpDot:support.length?Math.max(...support.map(s=>s.groundFacingUpDot)):null,
    maximumGroundElbowFlex:support.length?Math.max(...support.map(s=>s.groundElbowFlex)):null,
    maximumPostGrabOffsetError:Math.max(...postGrab.map(s=>s.gripOffsetError)),
    maximumIKEndpointError:Math.max(...samples.flatMap(s=>s.solutions.map(r=>r.positionError))),
    maximumUprightWeaponTiltDegrees:Math.max(...samples.filter(s=>s.clip==="IDLE_HOLD"||s.time>=spec.phases.at(-1).start).map(s=>s.weaponShaftTiltDegrees)),
    finalWeaponMinimumY:samples.findLast(s=>s.clip==="Entrance").weaponMinimumY,
    minimumVisibleWeaponY:Math.min(...samples.filter(s=>hero==="H02"||s.clip==="IDLE_HOLD"||s.time>=spec.events.find(e=>e.type==="staff_formed").time).map(s=>s.weaponMinimumY))};
  const pipelineFiles=['tools/bake-entrance-anim.mjs','tools/rig/full-entrance-sequence.mjs','tools/rig/offline-entrance-ik.mjs','tools/rig/bounded-chain-fit.mjs','tools/rig/reference-pose.mjs','tools/rig/upright-head.mjs','data/rig/bind-frames.json','data/rig/hand-frames.json','data/rig/joint-limits.json',`data/weapons/${hero}.json`],
    pipelineInputs=Object.fromEntries(await Promise.all(pipelineFiles.map(async file=>[file,sha256(await fs.readFile(file))])));
  const receipt={hero,scope:"full-reference-choreography-attempt",passed:false,exportPassed:payloadPreserved&&oldClipsPreserved,activated:false,pipelineInputs,
    input,inputSha256:sha256(bytes),output:outputFile,outputSha256:sha256(outputBytes),
    specSha256:sha256(await fs.readFile(`data/hero-entrance/${hero}.json`)),gripProofPath,gripProofSha256:sha256(await fs.readFile(gripProofPath)),
    stancePose:actualStanceFile??null,stancePoseSha256:actualStanceFile?sha256(await fs.readFile(actualStanceFile)):null,weaponSha256:sha256(weaponBytes),
    referencePose:spec.staging.referencePose??null,referencePoseSha256:spec.staging.referencePose?sha256(await fs.readFile(spec.staging.referencePose)):null,
    gripHand:spec.gripHand,groundHand:spec.groundHand,sampleRateHz:spec.sampleRateHz,runtimeIK:false,
    immutablePayloadPreserved:payloadPreserved,legacyClipsPreserved:oldClipsPreserved,preservedClips:preserved.map(({signature,...rest})=>rest),
    clips:curves.map(c=>({name:c.name,duration:c.duration,rotationTracks:c.rotations.size,translationTracks:1,samples:c.times.length})),events:spec.events,
    metrics,provenance:sequence.provenance,blockers:failures,
    note:"Complete-duration FK exported for actual review, not activated. Numeric local/FK checks cannot certify full-mesh contact, clothing, head clearance, ground sole or visual reference acceptance."};
  await save(`${report}/${hero}-frames.json`,{hero,inputSha256:receipt.inputSha256,outputSha256:receipt.outputSha256,sampleRateHz:spec.sampleRateHz,localPalm:sequence.localPalm,frames:samples});
  for(const p of selected)await save(`${report}/${hero}-${p.clip}-${p.time.toFixed(3)}-pose.json`,p);
  await save(`${report}/${hero}-bake.json`,receipt);
  if(!receipt.exportPassed)throw Error("Export changed immutable source payload or legacy animation data");
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const receipt=await bakeEntrance({hero:process.env.HERO??"H01",input:process.env.RIG_FILE,output:process.env.FK_OUTPUT_DIR,report:process.env.FK_REPORT_DIR,boundedFit:process.env.FK_BOUNDED_FIT==='1',velocityAware:process.env.FK_VELOCITY_AWARE==='1',jointRise:process.env.FK_JOINT_RISE==='1',stancePoseFile:process.env.FK_STANCE_FILE});console.log(JSON.stringify(receipt,null,2));if(!receipt.passed)process.exitCode=1;}
