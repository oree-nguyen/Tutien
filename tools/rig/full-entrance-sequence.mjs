import { Quaternion, Vector3, MathUtils } from "three";
import { handOrientation } from "../../src/rig/hand-frame.js";
import { solveOfflineChain as solveChain, limitAngularStep,limitAngularChain } from "./offline-entrance-ik.mjs";
import {inspectJoint,clampJoint} from "../../src/rig/joint-limits.js";

const smooth = (a, b, t) => { const x = MathUtils.clamp((t-a)/(b-a),0,1); return x*x*(3-2*x); };
const Q = a => new Quaternion(...a), V = a => new Vector3(...a);
const sideName = s => s[0].toUpperCase()+s.slice(1);

/** Offline complete-duration choreography attempt. Failure measurements are retained;
 * exporting sampled FK never implies acceptance of contacts, skin or visual pose. */
export function createFullEntranceSequence({hero,spec,pose,handFrames,reference,gripProof,weapon,heldContact,stance,weaponFloorCheck,boundedFit=false,velocityAware=false}) {
  if(velocityAware&&!boundedFit)throw Error('Velocity-aware solve requires bounded refinement');
  const solveOfflineChain=(pose,names,options)=>solveChain(pose,names,{...options,boundedFit,maxStepDegrees:velocityAware&&options.previousRotations?8:undefined});
  const joints=pose.joints, frames=pose.frames,
    bind=Object.fromEntries(joints.map(n=>[n.getName(),{position:pose.position(n),rotation:pose.rotation(n)}])),
    gripSide=sideName(spec.gripHand), groundSide=sideName(spec.groundHand),
    otherSide=gripSide==="Right"?"Left":"Right",
    apply=rotations=>{pose.reset();for(const [name,rotation] of Object.entries(rotations??{}))pose.nodes.get(name).setRotation(rotation);},
    anatomical=(name,degrees)=>{const node=pose.nodes.get(name),f=Q(frames[name].canonicalLocal);node.setRotation(Q(pose.bind.get(node).rotation).multiply(f).multiply(new Quaternion().setFromAxisAngle(V([1,0,0]),MathUtils.degToRad(degrees))).multiply(f.invert()).normalize().toArray());},
    grip=gripProof.selected?.candidate?.result??gripProof.result,
    bindGrip=bind[gripSide+"Hand"],
    localPalm=Object.fromEntries(["Left","Right"].map(s=>[s,V(handFrames[s].palmCenter).sub(bind[s+"Hand"].position).applyQuaternion(bind[s+"Hand"].rotation.clone().invert())]));
  let upright, gripDelta, gripCenter;
  if(hero==="H01") {
    if(!reference?.rotations)throw Error("H01 inspected upright reference is required");
    apply(reference.rotations); upright=structuredClone(reference.rotations);
    gripDelta=pose.rotation(pose.nodes.get(gripSide+"Hand")).multiply(bindGrip.rotation.clone().invert());
    gripCenter=V(heldContact.weaponCenter);
  } else {
    apply();
    gripDelta=handOrientation({gripAxis:grip.shaftAxis,n:grip.contactNormal},[0,1,0],[-0.65,0,0.76]);
    let best;
    for(const yaw of [-90,-60,-30,0,30,60,90])for(const x of [.44,.50,.56])for(const y of [1.2,1.225,1.25]) {
      apply();
      const normal=[Math.sin(MathUtils.degToRad(yaw)),0,Math.cos(MathUtils.degToRad(yaw))],
        delta=handOrientation({gripAxis:grip.shaftAxis,n:grip.contactNormal},[0,1,0],normal),
        orientation=delta.clone().multiply(bindGrip.rotation),target=V([x,y,.16]),
        solve=pose.solveArm(gripSide,target,orientation),cost=solve.passed?solve.cost+Math.abs(y-1.225)*.01:1e12+(solve.cost??1e10);
      if(!best||cost<best.cost)best={cost,delta,target,orientation};
    }
    apply();gripDelta=best.delta;
    const target=best.target,orientation=best.orientation;
    solveOfflineChain(pose,[gripSide+"Arm",gripSide+"ForeArm",gripSide+"Hand"],{target,orientation,pole:V([.43,1.1,.3])});
    const free=otherSide,delta=handOrientation({gripAxis:handFrames[free].f,n:handFrames[free].n},[0,-1,0],[free==="Left"?-1:1,0,0]);
    solveOfflineChain(pose,[free+"Arm",free+"ForeArm",free+"Hand"],{target:V([free==="Left"?.3:-.3,1.01,.06]),orientation:delta.multiply(bind[free+"Hand"].rotation),pole:V([free==="Left"?.4:-.4,1.2,.12])});
    for(const[name,f]of Object.entries(grip.fingers))pose.setFinger(gripSide,name,f);
    for(const name of Object.keys(handFrames[free].fingers))pose.setFinger(free,name,{angles:[12,20,15]});
    upright=Object.fromEntries(joints.map(n=>[n.getName(),n.getRotation()]));
    gripCenter=V(grip.shaftCenter).sub(bindGrip.position).applyQuaternion(gripDelta).add(target);
  }
  apply(upright);
  const uprightHips=pose.position(pose.nodes.get("Hips")),
    uprightHands=Object.fromEntries(["Left","Right"].map(s=>[s,{position:pose.position(pose.nodes.get(s+"Hand")),rotation:pose.rotation(pose.nodes.get(s+"Hand"))}])),
    uprightFeet=Object.fromEntries(["Left","Right"].map(s=>[s,{position:pose.position(pose.nodes.get(s+"Foot")),rotation:pose.rotation(pose.nodes.get(s+"Foot"))}])),
    crouchHips=V(stance?.translations.Hips??(hero==="H01"?[0,.10,-.06]:[0,.10,-.12])),
    crouchFeet=Object.fromEntries(["Left","Right"].map(s=>[s,V(stance?.footPositions?.[s]??(hero==="H01"?[s==="Left"?.18:-.14,.12,s==="Left"?.20:-.18]:[s==="Left"?.34:-.34,.12,.12]))])),
    groundDelta=handOrientation({gripAxis:handFrames[groundSide].f,n:handFrames[groundSide].n},[0,0,1],[0,-1,0]),
    groundOrientation=stance?(()=>{const saved=Object.fromEntries(joints.map(n=>[n.getName(),n.getRotation()]));for(const[n,r]of Object.entries(stance.rotations))pose.nodes.get(n).setRotation(r);const result=pose.rotation(pose.nodes.get(groundSide+"Hand"));for(const[n,r]of Object.entries(saved))pose.nodes.get(n).setRotation(r);return result;})():groundDelta.clone().multiply(bind[groundSide+"Hand"].rotation),
    groundPalm=V(stance?.groundPalm??(hero==="H01"?[-.24,.01,.26]:[-.32,.01,.24])),
    groundWrist=groundPalm.clone().sub(localPalm[groundSide].clone().applyQuaternion(groundOrientation)),
    groundNormal=V(handFrames[groundSide].n).applyQuaternion(bind[groundSide+"Hand"].rotation.clone().invert()),
    gripOffset=hero==="H01"?gripCenter.clone().sub(uprightHands[gripSide].position).applyQuaternion(uprightHands[gripSide].rotation.clone().invert()):V(grip.shaftCenter).sub(bindGrip.position).applyQuaternion(bindGrip.rotation.clone().invert()),
    // The normalized hammer source already has an upright +Y shaft. Hand-frame
    // retargeting rotates the hand; applying that same delta to this mesh tilts it.
    weaponQ=hero==="H01"?Q(heldContact.weaponQuaternion):new Quaternion(),
    handToWeapon=uprightHands[gripSide].rotation.clone().invert().multiply(weaponQ),
    hammerGroundTurn=new Quaternion().setFromAxisAngle(V([0,0,1]),MathUtils.degToRad(-160)),
    hammerGroundQ=hammerGroundTurn.clone().multiply(weaponQ),
    hammerGroundCenter=V([.54,hero==="H02"?-weaponFloorCheck.minimum(hammerGroundQ):.55,.22]),
    hammerGroundHandQ=hammerGroundTurn.clone().multiply(uprightHands[gripSide].rotation),
    hammerGroundWrist=hammerGroundCenter.clone().sub(gripOffset.clone().applyQuaternion(hammerGroundHandQ)),
    previous=new Map(), exportedPrevious=new Map(), frameReports=[];
  let previousClip;
  let groundHammerFit;
  if(hero==="H02"&&stance){
    for(const yaw of [-50,0,50])for(const spin of [-120,-60,0,60,120,180])for(const x of [.42,.50,.58])for(const z of [-.2,0,.2]){
      apply(upright);for(const[name,r]of Object.entries(stance.rotations))pose.nodes.get(name).setRotation(r);
      pose.nodes.get("Hips").setTranslation(crouchHips.toArray());
      const turn=new Quaternion().setFromAxisAngle(V([0,1,0]),MathUtils.degToRad(yaw)).multiply(hammerGroundTurn).multiply(new Quaternion().setFromAxisAngle(V([0,1,0]),MathUtils.degToRad(spin))),
        rotation=turn.clone().multiply(weaponQ),center=V([x,-weaponFloorCheck.minimum(rotation),z]),
        handQ=turn.clone().multiply(uprightHands[gripSide].rotation),target=center.clone().sub(gripOffset.clone().applyQuaternion(handQ)),
        result=solveOfflineChain(pose,[gripSide+"Arm",gripSide+"ForeArm",gripSide+"Hand"],{target,orientation:handQ,pole:V([.4,crouchHips.y+.25,.3])}),
        cost=result.positionError**2+MathUtils.degToRad(result.orientationErrorDegrees)**2*.02;
      if(!groundHammerFit||cost<groundHammerFit.cost)groundHammerFit={cost,yaw,spin,x,z,rotation,center,handQ,target,positionError:result.positionError,orientationErrorDegrees:result.orientationErrorDegrees};
    }
    hammerGroundQ.copy(groundHammerFit.rotation);hammerGroundCenter.copy(groundHammerFit.center);
    hammerGroundHandQ.copy(groundHammerFit.handQ);hammerGroundWrist.copy(groundHammerFit.target);apply(upright);
  }
  const setAngles=(node,a)=>{
    const frame=frames[node.getName()],f=Q(frame.canonicalLocal),axis=V([MathUtils.degToRad(a.flex),0,MathUtils.degToRad(a.lateral*(frame.lateralSign??1))]),angle=axis.length();
    node.setRotation(Q(pose.bind.get(node).rotation).multiply(f).multiply(new Quaternion().setFromAxisAngle(angle?axis.divideScalar(angle):V([1,0,0]),angle)).multiply(new Quaternion().setFromAxisAngle(V([0,1,0]),MathUtils.degToRad(a.twist*(frame.twistSign??1)))).multiply(f.invert()).normalize().toArray());
  };
  const setFingers=(side,amount)=>{
    for(const name of Object.keys(handFrames[side].fingers))pose.setFinger(side,name,{angles:name==="Thumb"?[3,10,8]:[8,14,10]});
    if(side===gripSide&&amount>0)for(const name of Object.keys(handFrames[side].fingers))for(let i=1;i<=3;i++){
      const node=pose.nodes.get(`${side}Hand${name}${i}`);
      const open=pose.angles(node),closed=pose.angles(node,Q(upright[node.getName()])),frame=frames[node.getName()],f=Q(frame.canonicalLocal),
        flex=MathUtils.lerp(open.flex,closed.flex,amount),lateral=MathUtils.lerp(open.lateral,closed.lateral,amount)*(frame.lateralSign??1),
        twist=MathUtils.lerp(open.twist,closed.twist,amount)*(frame.twistSign??1),axis=V([MathUtils.degToRad(flex),0,MathUtils.degToRad(lateral)]),angle=axis.length();
      node.setRotation(Q(pose.bind.get(node).rotation).multiply(f).multiply(new Quaternion().setFromAxisAngle(angle?axis.divideScalar(angle):V([1,0,0]),angle)).multiply(new Quaternion().setFromAxisAngle(V([0,1,0]),MathUtils.degToRad(twist))).multiply(f.invert()).normalize().toArray());
    }
  };
  let releaseGroundOrientation=groundOrientation.clone();
  if(velocityAware&&stance){
    const saved=Object.fromEntries(joints.map(n=>[n.getName(),n.getRotation()]));
    for(const[name,rotation]of Object.entries(stance.rotations))pose.nodes.get(name).setRotation(rotation);
    const hand=pose.nodes.get(groundSide+'Hand'),frame=frames[hand.getName()],local=Q(hand.getRotation());
    clampJoint(local,Q(pose.bind.get(hand).rotation),Q(frame.canonicalLocal),pose.limits.wrist,frame);
    releaseGroundOrientation=pose.rotation(hand.getParentNode()).multiply(local).normalize();
    for(const[name,rotation]of Object.entries(saved))pose.nodes.get(name).setRotation(rotation);
  }
  const sample=(clip,time)=>{
    const idle=clip==="IDLE_HOLD", start=hero==="H01"?.9:.55, land=hero==="H01"?1.9:1.25,
      riseStart=hero==="H01"?2.6:1.75, riseEnd=hero==="H01"?3.7:3,
      rise=idle?1:smooth(riseStart,riseEnd,time),arrival=idle?1:smooth(start,land,time),
      visible=idle||time>=start, support=!idle&&time>=land&&time<=riseStart,
      grab=spec.events.find(e=>e.type==="grab").time,close=idle?1:smooth(grab,grab+.15,time),
      groundRelease=velocityAware?(idle?1:smooth(riseStart-.15,riseStart,time)):0,
      movingGroundOrientation=groundOrientation.clone().slerp(releaseGroundOrientation,groundRelease);
    apply(upright);
    const hips=crouchHips.clone().lerp(uprightHips,rise);
    if(!idle&&time<land)hips.y+=(hero==="H01"?-.5:1.5)*(1-arrival);
    pose.nodes.get("Hips").setTranslation(hips.toArray());
    if(stance)for(const[name,rotation]of Object.entries(stance.rotations)){
      const node=pose.nodes.get(name),a=pose.angles(node,Q(rotation)),b=pose.angles(node,Q(upright[name]));
      setAngles(node,Object.fromEntries(["flex","lateral","twist"].map(axis=>[axis,MathUtils.lerp(a[axis],b[axis],rise)])));
    }
    else for(const name of ["Spine","Spine1","Spine2"])anatomical(name,(1-rise)*25/3);
    anatomical("Neck",-(1-rise)*20);
    const solutions=[];
    const footContacts={};
    for(const side of ["Left","Right"]) {
      const step=hero==="H01"?(side==="Right"?[2.7,3.25]:[3.25,3.65]):(side==="Left"?[2.0,2.35]:[2.4,2.8]),
        stepProgress=idle?1:smooth(step[0],step[1],time),inSwing=!idle&&time>step[0]&&time<step[1],
        target=crouchFeet[side].clone().lerp(uprightFeet[side].position,stepProgress),
        orientation=Q(stance?.footRotations?.[side]??uprightFeet[side].rotation.toArray()).slerp(uprightFeet[side].rotation,stepProgress);
      if(inSwing)target.y+=.08*Math.sin(Math.PI*(time-step[0])/(step[1]-step[0]))**2;
      if(!idle&&time<land)target.y+=hips.y-crouchHips.y;
      footContacts[side]={planted:(idle||time>=land)&&!inSwing,anchorJoint:hero==="H01"&&side==="Right"&&stepProgress===0?"RightToeBase":side+"Foot",step:inSwing,stepProgress};
      const names=[side+"UpLeg",side+"Leg",side+"Foot"];
      if(!stance||rise>0||idle){const result=solveOfflineChain(pose,names,{target,orientation,pole:V([side==="Left"?.34:-.34,.35,.55]),previousRotations:previous.get(names[0])});solutions.push({chain:names[0],...result});previous.set(names[0],names.map(n=>Q(pose.nodes.get(n).getRotation())));}
    }
    const groundTarget=groundRelease>0?groundPalm.clone().sub(localPalm[groundSide].clone().applyQuaternion(movingGroundOrientation)):groundWrist.clone();if(!idle&&time<land)groundTarget.y+=hips.y-crouchHips.y;
    const freeSide=groundSide==="Left"?"Right":"Left",knee=pose.position(pose.nodes.get(freeSide+"Leg")),freeTarget=knee.add(V([0,.08,.03])),
      heldOrientation=hero==="H02"?hammerGroundHandQ.clone().slerp(uprightHands[gripSide].rotation,rise):uprightHands[gripSide].rotation.clone(),
      heldTarget=hero==="H02"?hammerGroundWrist.clone().lerp(uprightHands[gripSide].position,rise):uprightHands[gripSide].position.clone();
    if(hero==="H02"&&!idle&&time<land)heldTarget.y+=hips.y-crouchHips.y;
    if(hero==="H02"&&(idle||time>=riseStart)){
      const plannedQ=heldOrientation.clone().multiply(handToWeapon),
        plannedCenter=heldTarget.clone().add(gripOffset.clone().applyQuaternion(heldOrientation)),
        minimum=plannedCenter.y+weaponFloorCheck.minimum(plannedQ);
      if(minimum<0)heldTarget.y-=minimum;
    }
    for(const side of ["Left","Right"]) {
      let target,orientation;
      if(side===groundSide){target=groundTarget.clone().lerp(uprightHands[side].position,rise);orientation=movingGroundOrientation.clone().slerp(uprightHands[side].rotation,rise);}
      else {target=freeTarget.clone().lerp(uprightHands[side].position,rise);orientation=uprightHands[side].rotation.clone();}
      if(hero==="H02"&&side===gripSide){target=heldTarget;orientation=heldOrientation;}
      if(hero==="H01"&&side===gripSide&&rise>0){target=groundTarget.clone().lerp(heldTarget,rise);orientation=groundOrientation.clone().slerp(heldOrientation,rise);}
      if(hero==="H01"&&side==="Left"&&rise<.9)orientation=undefined;
      const names=[side+"Arm",side+"ForeArm",side+"Hand"];
      if(!stance||rise>0||idle||side!==groundSide||groundRelease>0){const result=solveOfflineChain(pose,names,{target,orientation,pole:V([side==="Left"?.4:-.4,hips.y+.25,.3]),flexRange:side===groundSide&&support?[0,10]:undefined,endLimits:side===groundSide&&support?{...pose.limits.wristGround,flex:[MathUtils.lerp(pose.limits.wristGround.flex[0],pose.limits.wrist.flex[0],groundRelease),pose.limits.wristGround.flex[1]]}:undefined,previousRotations:previous.get(names[0])});solutions.push({chain:names[0],...result});previous.set(names[0],names.map(n=>Q(pose.nodes.get(n).getRotation())));}
      setFingers(side,side===gripSide?close:0);
    }
    // Keep every planted-chain solve authoritative throughout the rise. Once the
    // hips reach the upright endpoint, the hold keys settle the 0.999 reach margin.
    const settle=rise===1&&!velocityAware?1:0;
    if(settle)for(const joint of joints)if(!/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(joint.getName()))joint.setRotation(Q(joint.getRotation()).slerp(Q(upright[joint.getName()]),settle).normalize().toArray());
    if(idle&&time!==0&&time!==spec.idleDuration) {
      for(const name of ["Spine","Spine1","Spine2"])anatomical(name,Math.sin(time/spec.idleDuration*Math.PI*2)*spec.breathingDegreesPerSpine);
      for(const side of ["Left","Right"]){
        if(!velocityAware)pose.solveArm(side,uprightHands[side].position,uprightHands[side].rotation);
        else{
          const names=[side+'Arm',side+'ForeArm',side+'Hand'],result=solveOfflineChain(pose,names,{target:uprightHands[side].position,orientation:uprightHands[side].rotation,pole:V([side==='Left'?.4:-.4,hips.y+.25,.3]),previousRotations:previous.get(names[0])});
          const index=solutions.findIndex(s=>s.chain===names[0]);assertSolutionIndex(index);solutions[index]={chain:names[0],...result};
          previous.set(names[0],names.map(n=>Q(pose.nodes.get(n).getRotation())));
        }
      }
    }
    for(const solution of solutions){
      const end=solution.chain.replace(/UpLeg$/,"Foot").replace(/Arm$/,"Hand");
      solution.beforeVelocityLimit={positionError:pose.position(pose.nodes.get(end)).distanceTo(V(solution.target)),orientationErrorDegrees:solution.targetQuaternion?MathUtils.radToDeg(pose.rotation(pose.nodes.get(end)).angleTo(Q(solution.targetQuaternion))):0};
    }
    if(previousClip!==clip){exportedPrevious.clear();previousClip=clip;}
    const linked=new Map();
    for(const side of ["Left","Right"])for(const chain of [["UpLeg","Leg","Foot"],["Arm","ForeArm","Hand"]]){
      const names=chain.map(suffix=>side+suffix);
      if(names.every(name=>exportedPrevious.has(name))){
        const filtered=limitAngularChain(names.map(name=>exportedPrevious.get(name)),names.map(name=>Q(pose.nodes.get(name).getRotation())),8);
        for(let i=0;i<names.length;i++)linked.set(names[i],filtered[i]);
      }
    }
    for(const joint of joints){
      const name=joint.getName(),current=Q(joint.getRotation()),prior=exportedPrevious.get(name),finger=/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(name),
        filtered=linked.get(name)??(prior?limitAngularStep(prior,current,finger?16:8):current),
        frame=frames[name],limits=support&&name===groundSide+"Hand"?pose.limits.wristGround:pose.limits[frame.type];
      clampJoint(filtered,Q(pose.bind.get(joint).rotation),Q(frame.canonicalLocal),limits,frame);
      joint.setRotation(filtered.toArray());exportedPrevious.set(name,filtered);
    }
    // The next solve follows the exported limb, including the velocity limiter.
    // Tracking an unexported branch lets the raw solve flip while playback lags.
    for(const side of ["Left","Right"])for(const chain of [["UpLeg","Leg","Foot"],["Arm","ForeArm","Hand"]]){
      const names=chain.map(suffix=>side+suffix);
      previous.set(names[0],names.map(name=>Q(pose.nodes.get(name).getRotation())));
    }
    for(const solution of solutions){
      const end=solution.chain.replace(/UpLeg$/,"Foot").replace(/Arm$/,"Hand");
      solution.positionError=pose.position(pose.nodes.get(end)).distanceTo(V(solution.target));
      solution.orientationErrorDegrees=solution.targetQuaternion?MathUtils.radToDeg(pose.rotation(pose.nodes.get(end)).angleTo(Q(solution.targetQuaternion))):0;
      solution.violations=[solution.chain,solution.chain.replace(/UpLeg$/,"Leg").replace(/Arm$/,"ForeArm"),end].flatMap(name=>{
        const node=pose.nodes.get(name),frame=frames[name];
        return inspectJoint(Q(node.getRotation()),Q(pose.bind.get(node).rotation),Q(frame.canonicalLocal),support&&name===groundSide+"Hand"?pose.limits.wristGround:pose.limits[frame.type],{...frame,tolerance:pose.limits.tolerance});
      });
      solution.passed=solution.violations.length===0&&solution.positionError<=.005&&solution.orientationErrorDegrees<=1;
    }
    const groundQ=pose.rotation(pose.nodes.get(groundSide+"Hand")),
      palm=localPalm[groundSide].clone().applyQuaternion(groundQ).add(pose.position(pose.nodes.get(groundSide+"Hand"))),
      normal=groundNormal.clone().applyQuaternion(groundQ),handQ=pose.rotation(pose.nodes.get(gripSide+"Hand")),
      handPosition=pose.position(pose.nodes.get(gripSide+"Hand"));
    let center,rotation;
    if(hero==="H01"||idle||time>=riseStart) {
      // Keep the actual source-weapon trajectory on its own contact constraints.
      // A bounded hand that cannot reach it must retain a nonzero grip error.
      rotation=hero==="H01"?weaponQ.clone():heldOrientation.clone().multiply(handToWeapon);
      center=hero==="H01"?gripCenter.clone():gripOffset.clone().applyQuaternion(heldOrientation).add(heldTarget);
    } else {rotation=hammerGroundQ.clone();center=hammerGroundCenter.clone();if(time<.55)center.y+=2*(1-smooth(0,.55,time));}
    const violations=pose.report().filter(v=>!(support&&v.joint===groundSide+"Hand"));
    if(support){const n=pose.nodes.get(groundSide+"Hand"),f=frames[n.getName()];violations.push(...inspectJoint(Q(n.getRotation()),Q(f.bindRotation),Q(f.canonicalLocal),pose.limits.wristGround,f).map(v=>({joint:n.getName(),...v})));}
    const report={clip,time,visible,support,afterGrab:idle||time>=grab+.15,rise,hip:hips.toArray(),solutions,violations,
      groundPalm:palm.toArray(),groundFacingUpDot:normal.y,groundElbowFlex:pose.angles(pose.nodes.get(groundSide+"ForeArm")).flex,
      footContacts,feet:Object.fromEntries(["Left","Right"].map(s=>[s,pose.position(pose.nodes.get(s+"Foot")).toArray()])),
      footAnchors:Object.fromEntries(["Left","Right"].map(s=>[s,pose.position(pose.nodes.get(footContacts[s].anchorJoint)).toArray()])),
      gripWrist:handPosition.toArray(),gripWristQuaternion:handQ.toArray(),
      weapon:{position:center.clone().sub(V(weapon.gripPivot).applyQuaternion(rotation)).toArray(),quaternion:rotation.toArray()},
      weaponShaftTiltDegrees:MathUtils.radToDeg(Math.acos(MathUtils.clamp(V(weapon.shaftAxis).applyQuaternion(rotation).normalize().y,-1,1))),
      weaponMinimumY:center.y+weaponFloorCheck.minimum(rotation),
      gripOffsetError:handPosition.clone().add(gripOffset.clone().applyQuaternion(handQ)).distanceTo(center)};
    frameReports.push(report);return report;
  };
  return {sample,frameReports,upright,localPalm:Object.fromEntries(Object.entries(localPalm).map(([s,p])=>[s,p.toArray()])),
    provenance:{boundedFitExperiment:boundedFit,velocityAware,gripProofPassed:!!gripProof.passed,stancePassed:stance?.passed??false,stanceMetrics:stance?.metrics??null,weaponSourceVertices:weaponFloorCheck.vertices,hammerGroundTiltFromDownDegrees:hero==="H02"?20:null,groundHammerFit:groundHammerFit?{yaw:groundHammerFit.yaw,spin:groundHammerFit.spin,x:groundHammerFit.x,z:groundHammerFit.z,positionError:groundHammerFit.positionError,orientationErrorDegrees:groundHammerFit.orientationErrorDegrees}:null,angularVelocityLimit:{bodyDegreesPerFrame:8,fingerDegreesPerFrame:16,endpointErrorsMeasuredAfterFilter:true},handFramesVerified:Object.fromEntries(Object.entries(handFrames).map(([s,f])=>[s,f.verified])),
      note:"Complete-duration attempted choreography; VFX/visibility use phase data. Mesh contact and hand-frame verification are independent acceptance gates."}};
}

function assertSolutionIndex(index){if(index<0)throw Error('Missing pre-breathing chain solution');}
