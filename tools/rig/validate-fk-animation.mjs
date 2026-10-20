import fs from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { AnimationMixer, LoopOnce, Quaternion, Vector3 } from "three";
import { HeroPoseController } from "../../src/rig/hero-pose-controller.js";
import { inspectJoint, anatomicalAngles } from "../../src/rig/joint-limits.js";
import { threeRig, sha256 } from "./animation-payload.mjs";
import {sourceFootContact,updatePlantedContact} from "./source-foot-contact.mjs";
import {torsoDirection} from './stance-direction.mjs';
const hero=process.env.HERO??"H01",input=process.env.RIG_FILE??`.local/rig-candidates/fk-full-staging/${hero}-C0-rigged.glb`,
  output=process.env.FK_REPORT_DIR??"docs/anim-report/conver10-redo/animation/full",
  bytes=await fs.readFile(input),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  frames=JSON.parse(await fs.readFile("data/rig/bind-frames.json")).heroes[hero].joints,
  hands=JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[hero].hands,
  limits=JSON.parse(await fs.readFile("data/rig/joint-limits.json")),spec=JSON.parse(await fs.readFile(`data/hero-entrance/${hero}.json`)),
  receipt=JSON.parse(await fs.readFile(`${output}/${hero}-bake.json`)),sidecar=JSON.parse(await fs.readFile(`${output}/${hero}-frames.json`)),
  rig=threeRig(doc),controller=new HeroPoseController(rig.root,rig.clips,{events:spec.events}),joints=doc.getRoot().listSkins()[0].listJoints(),
  groundSide=spec.groundHand[0].toUpperCase()+spec.groundHand.slice(1),hand=rig.root.getObjectByName(groundSide+"Hand"),
  footNames=["LeftFoot","RightFoot"],anchorNames=["LeftHand","RightHand",...footNames],bindWorldHand=hand.getWorldQuaternion(new Quaternion()),
  groundNormal=new Vector3(...hands[groundSide].n).applyQuaternion(bindWorldHand.clone().invert()),
  localPalm=new Vector3(...sidecar.localPalm[groundSide]),violations=[],groundFailures=[],meshGroundFailures=[],stanceFailures=[],angularStepFailures=[],samples=[],
  feet=sourceFootContact(doc,rig.root),bindHeadWorld=rig.root.getObjectByName('Head').getWorldQuaternion(new Quaternion()),
  metrics={maximumAngularStepDegrees:0,maximumBodyAngularStepDegrees:0,maximumFingerAngularStepDegrees:0,maximumPlantedFootSlide:0,maximumGroundPalmHeight:0,worstGroundFacingUpDot:-1,maximumGroundElbowFlex:0,maximumGroundWristExtension:0,maximumHoldAnchorDrift:0,maximumBlendAnchorStep:0,maximumFootPenetration:0,maximumLowerSourcePenetration:0,maximumPlantedFootGap:0,maximumPlantedFlatSoleHeight:0,maximumPlantedFlatSoleVerticalError:0,maximumSupportTorsoTiltDegrees:0,minimumSupportTorsoForwardLeanDegrees:Infinity,maximumSupportTorsoForwardLeanDegrees:-Infinity,maximumSupportPelvisTiltDegrees:0,maximumSupportRightKneeHeight:0,minimumSupportRightKneeHeight:Infinity},
  mixer=new AnimationMixer(rig.root),angle=(a,b)=>a.clone().normalize().angleTo(b.clone().normalize())*180/Math.PI;
if(receipt.outputSha256!==sha256(bytes)||sidecar.outputSha256!==sha256(bytes))throw Error("Stale bake/frame evidence does not match the actual GLB");
let previous;
for(const clip of[controller.entranceClip,controller.idleClip]){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();previous=null;
  const landed=spec.events.find(e=>e.type==="land").time,holdAnchors={},footAnchors={};
  for(let sample=0;sample<=Math.round(clip.duration*60);sample++){
    const time=Math.min(sample/60,clip.duration),source=sidecar.frames.find(f=>f.clip===clip.name&&Math.abs(f.time-time)<1e-5);
    if(!source)throw Error("Missing measured source frame: "+clip.name+" "+time);
    action.time=time;mixer.update(0);rig.root.updateMatrixWorld(true);
    const errors=[],rotations={};
    for(const joint of joints){
      const bone=rig.root.getObjectByName(joint.getName()),frame=frames[bone.name],q=bone.quaternion.clone().normalize();rotations[bone.name]=q.toArray();
      const groundWrist=source.support&&bone.name===groundSide+"Hand";
      errors.push(...inspectJoint(q,new Quaternion(...frame.bindRotation),new Quaternion(...frame.canonicalLocal),limits[groundWrist?"wristGround":frame.type],{...frame,tolerance:limits.tolerance,finger:frame.type.startsWith("finger")}).map(e=>({joint:bone.name,...e})));
      if(previous){
        const step=angle(q,new Quaternion(...previous[bone.name])),finger=/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(bone.name),limit=finger?16:8,
          metric=finger?'maximumFingerAngularStepDegrees':'maximumBodyAngularStepDegrees';
        metrics.maximumAngularStepDegrees=Math.max(metrics.maximumAngularStepDegrees,step);metrics[metric]=Math.max(metrics[metric],step);
        if(step>limit+1e-5)angularStepFailures.push({clip:clip.name,time,joint:bone.name,step,limit});
      }
    }
    const sourceFeet=feet.measure();
    if(source.visible)metrics.maximumSourceHeadOrientationErrorDegrees=Math.max(metrics.maximumSourceHeadOrientationErrorDegrees??0,angle(rig.root.getObjectByName('Head').getWorldQuaternion(new Quaternion()),bindHeadWorld));
    for(const side of ["Left","Right"]){
      const contact=source.footContacts[side],point=rig.root.getObjectByName(contact.anchorJoint).getWorldPosition(new Vector3()),
        result=updatePlantedContact(footAnchors[side],contact,point);
      footAnchors[side]=result.state;metrics.maximumPlantedFootSlide=Math.max(metrics.maximumPlantedFootSlide,result.slide);
      // Emergence deliberately begins under the floor and uses a clipping plane.
      // All post-landing frames, including swing, still fail mesh penetration.
      const floorRelevant=clip.name==="IDLE_HOLD"||time>=landed-1e-7||(hero==="H02"&&source.visible),
        measure=sourceFeet[side],flat=contact.planted&&contact.anchorJoint.endsWith("Foot");
      if(floorRelevant){
        metrics.maximumFootPenetration=Math.max(metrics.maximumFootPenetration,-measure.soleMinimumY);
        metrics.maximumLowerSourcePenetration=Math.max(metrics.maximumLowerSourcePenetration,-measure.lowerSourceMinimumY);
        if(contact.planted)metrics.maximumPlantedFootGap=Math.max(metrics.maximumPlantedFootGap,measure.minimumY);
        if(flat){metrics.maximumPlantedFlatSoleHeight=Math.max(metrics.maximumPlantedFlatSoleHeight,measure.soleMaximumY);metrics.maximumPlantedFlatSoleVerticalError=Math.max(metrics.maximumPlantedFlatSoleVerticalError,measure.soleMaximumVerticalError);}
        if(measure.minimumY<-.005||(contact.planted&&measure.minimumY>.005)||(flat&&measure.soleMaximumVerticalError>.005))
          meshGroundFailures.push({clip:clip.name,time,side,contact,...measure});
      }
    }
    if(clip.name==="IDLE_HOLD")for(const name of anchorNames){const point=rig.root.getObjectByName(name).getWorldPosition(new Vector3());holdAnchors[name]??=point.clone();metrics.maximumHoldAnchorDrift=Math.max(metrics.maximumHoldAnchorDrift,point.distanceTo(holdAnchors[name]));}
    if(source.support){
      const torsoUp=new Vector3(0,1,0).applyQuaternion(rig.root.getObjectByName("Spine2").getWorldQuaternion(new Quaternion())),
        torso=torsoDirection(rig.root.getObjectByName("Spine2").getWorldQuaternion(new Quaternion())),pelvis=torsoDirection(rig.root.getObjectByName("Hips").getWorldQuaternion(new Quaternion())),
        kneeY=rig.root.getObjectByName("RightLeg").getWorldPosition(new Vector3()).y;
      metrics.maximumSupportTorsoTiltDegrees=Math.max(metrics.maximumSupportTorsoTiltDegrees,Math.acos(Math.max(-1,Math.min(1,torsoUp.y)))*180/Math.PI);
      metrics.maximumSupportRightKneeHeight=Math.max(metrics.maximumSupportRightKneeHeight,kneeY);
      metrics.minimumSupportRightKneeHeight=Math.min(metrics.minimumSupportRightKneeHeight,kneeY);
      metrics.minimumSupportTorsoForwardLeanDegrees=Math.min(metrics.minimumSupportTorsoForwardLeanDegrees,torso.forwardLean);metrics.maximumSupportTorsoForwardLeanDegrees=Math.max(metrics.maximumSupportTorsoForwardLeanDegrees,torso.forwardLean);metrics.maximumSupportPelvisTiltDegrees=Math.max(metrics.maximumSupportPelvisTiltDegrees,pelvis.tilt);
      if(torso.tilt>26||torso.forwardLean<15||torso.forwardLean>25||pelvis.tilt>15||(hero==="H01"&&(kneeY<0||kneeY>.08)))stanceFailures.push({clip:clip.name,time,torso,pelvisTilt:pelvis.tilt,rightKneeHeight:kneeY});
      const worldQ=hand.getWorldQuaternion(new Quaternion()),palm=localPalm.clone().applyQuaternion(worldQ).add(hand.getWorldPosition(new Vector3())),dot=groundNormal.clone().applyQuaternion(worldQ).y,
        elbow=rig.root.getObjectByName(groundSide+"ForeArm"),ef=frames[elbow.name],wf=frames[hand.name],
        elbowErrors=inspectJoint(elbow.quaternion,new Quaternion(...ef.bindRotation),new Quaternion(...ef.canonicalLocal),{flex:[-5,10],lateral:[-8,8],twist:[0,0]},ef),
        wristErrors=inspectJoint(hand.quaternion,new Quaternion(...wf.bindRotation),new Quaternion(...wf.canonicalLocal),limits.wristGround,wf);
      const elbowAngle=anatomicalAngles(elbow.quaternion,new Quaternion(...ef.bindRotation),new Quaternion(...ef.canonicalLocal),ef),
        wristAngle=anatomicalAngles(hand.quaternion,new Quaternion(...wf.bindRotation),new Quaternion(...wf.canonicalLocal),wf);
      metrics.maximumGroundPalmHeight=Math.max(metrics.maximumGroundPalmHeight,Math.abs(palm.y));metrics.worstGroundFacingUpDot=Math.max(metrics.worstGroundFacingUpDot,dot);
      metrics.maximumGroundElbowFlex=Math.max(metrics.maximumGroundElbowFlex,elbowAngle.flex);
      metrics.maximumGroundWristExtension=Math.max(metrics.maximumGroundWristExtension,-wristAngle.flex);
      if(Math.abs(palm.y)>.015||dot>-.85||elbowErrors.length||wristErrors.length)groundFailures.push({time,palmHeight:palm.y,palmUpDot:dot,elbowErrors,wristErrors});
    }
    if(errors.length)violations.push({clip:clip.name,time,violations:errors});
    samples.push({clip:clip.name,time,violations:errors.length,feet:sourceFeet});previous=rotations;
  }
}
mixer.stopAllAction();mixer.uncacheRoot(rig.root);
controller.start();let previousAnchors;
for(let n=0;n<=Math.round((controller.duration+spec.blendDuration+10)*60);n++){
  controller.update(n?1/60:0);rig.root.updateMatrixWorld(true);
  const points=Object.fromEntries(anchorNames.map(name=>[name,rig.root.getObjectByName(name).getWorldPosition(new Vector3())]));
  if(controller.elapsed>=controller.duration&&controller.elapsed<=controller.duration+spec.blendDuration+1e-7&&previousAnchors)
    for(const name of anchorNames)metrics.maximumBlendAnchorStep=Math.max(metrics.maximumBlendAnchorStep,points[name].distanceTo(previousAnchors[name]));
  previousAnchors=points;
}
const heldTime=controller.elapsed,held=Object.fromEntries(anchorNames.map(name=>[name,rig.root.getObjectByName(name).getWorldPosition(new Vector3()).toArray()]));
controller.seek(heldTime);rig.root.updateMatrixWorld(true);let seekError=0;
for(const name of anchorNames)seekError=Math.max(seekError,rig.root.getObjectByName(name).getWorldPosition(new Vector3()).distanceTo(new Vector3(...held[name])));
const retainedMixer=controller.mixer,retainedEntrance=controller.entrance,retainedIdle=controller.idle;
for(let n=0;n<10;n++){controller.start();controller.update(15);}
const report={hero,input,sha256:sha256(bytes),passed:false,activated:false,
  scope:"Independent Three AnimationMixer FK from actual GLB at every 60Hz key, complete Entrance and idle; narrow FK result below, no whole-mesh/contact certificate",
  exportPreservationPassed:receipt.exportPassed,clips:[controller.entranceClip,controller.idleClip].map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length,samples:Math.round(c.duration*60)+1})),
  sampledFrames:samples.length,metrics,violatingFrames:violations.length,violations,groundFailureFrames:groundFailures.length,groundFailures,
  meshGroundFailureFrames:meshGroundFailures.length,meshGroundFailures,referenceStanceFailureFrames:stanceFailures.length,stanceFailures,angularStepFailures,
  sourceFootSelection:{path:`${output}/${hero}-foot-source-vertices.json`,method:feet.selection.method,visuallyVerified:false,sides:Object.fromEntries(Object.entries(feet.selection.sides).map(([side,v])=>[side,{vertices:v.vertices,soleVertices:v.soleVertices}]))},
  fkCriteriaPassed:violations.length===0&&groundFailures.length===0&&meshGroundFailures.length===0&&stanceFailures.length===0&&angularStepFailures.length===0&&metrics.maximumPlantedFootSlide<=.01&&metrics.maximumHoldAnchorDrift<=.005&&metrics.maximumBlendAnchorStep<=.005,
  controllerPassed:seekError<=1e-6&&controller.idle.isRunning()&&retainedMixer===controller.mixer&&retainedEntrance===controller.entrance&&retainedIdle===controller.idle,
  seekError,replayCount:10,idleRunning:controller.idle.isRunning(),state:controller.state,
  unverified:["adaptive source-triangle weapon contact on every frame","independent visual approval of the automatic source-foot regions","joint cross-sections, garment/body collision and strain","hammer/head distance","reference visual acceptance","physical Android"]};
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,`${hero}-foot-source-vertices.json`),JSON.stringify({hero,inputSha256:sha256(bytes),...feet.selection},null,2)+"\n");
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,`${hero}-fk-validation.json`),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,violations:undefined,groundFailures:undefined,meshGroundFailures:undefined,stanceFailures:undefined},null,2));if(!report.passed)process.exitCode=1;
