import {Quaternion,Vector3,MathUtils} from "three";
import {clampJoint,inspectJoint} from "../../src/rig/joint-limits.js";
import {fitBoundedChain} from './bounded-chain-fit.mjs';

/** Build-time two-link IK in calibrated bind frames. No translations or scales change.
 * A rejected result still exports the nearest measured attempt for review. */
export function solveOfflineChain(pose, names, {target, orientation, pole, flexRange, previousRotations,endLimits,boundedFit=false,maxStepDegrees}) {
  if(maxStepDegrees!==undefined&&(!boundedFit||!previousRotations))throw Error('A velocity limit requires bounded fitting and previous rotations');
  const [upper,middle,end]=names.map((n)=>pose.nodes.get(n));
  if(!upper||!middle||!end)throw Error("Incomplete offline IK chain: "+names.join("/"));
  const sourceRotations=[upper,middle,end].map(n=>new Quaternion(...n.getRotation())),sourcePositionError=pose.position(end).distanceTo(target),
    sourceOrientationError=orientation?pose.rotation(end).angleTo(orientation):0;
  const offset=new Vector3(...pose.bind.get(middle).position),endOffset=new Vector3(...pose.bind.get(end).position),
    bind=new Quaternion(...pose.bind.get(middle).rotation),frame=new Quaternion(...pose.frames[middle.getName()].canonicalLocal),
    root=pose.position(upper),parentInverse=pose.rotation(upper.getParentNode()).invert(),
    vector=target.clone().sub(root),distance=vector.length(),direction=vector.clone().normalize(),
    maximumReach=0.999*(offset.length()+endOffset.length()),solveDistance=Math.min(distance,maximumReach),
    bounds=flexRange??pose.limits[pose.frames[middle.getName()].type].flex,
    rotationAt=(deg)=>bind.clone().multiply(frame).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),MathUtils.degToRad(deg))).multiply(frame.clone().invert()).normalize(),
    endpoint=(deg)=>endOffset.clone().applyQuaternion(rotationAt(deg)).add(offset);
  let theta=bounds[0],error=Infinity,previous=bounds[0],prevError=endpoint(previous).length()-solveDistance;
  for(let t=bounds[0];t<=bounds[1]+1e-7;t+=0.5){
    const e=endpoint(t).length()-solveDistance;
    if(Math.abs(e)<error){error=Math.abs(e);theta=t;}
    if(t>previous&&e*prevError<=0){let low=previous,high=t,le=prevError;for(let n=0;n<30;n++){const m=(low+high)/2,me=endpoint(m).length()-solveDistance;if(le*me<=0)high=m;else{low=m;le=me;}}theta=(low+high)/2;break;}
    previous=t;prevError=e;
  }
  const middleQ=rotationAt(theta),localEnd=endpoint(theta),align=new Quaternion().setFromUnitVectors(localEnd.clone().normalize(),direction);
  const inspect=(node,q,override)=>{const f=pose.frames[node.getName()];return inspectJoint(q,new Quaternion(...pose.bind.get(node).rotation),new Quaternion(...f.canonicalLocal),override??pose.limits[f.type],{...f,tolerance:pose.limits.tolerance});},
    bounded=(node,q,override)=>{const f=pose.frames[node.getName()];clampJoint(q,new Quaternion(...pose.bind.get(node).rotation),new Quaternion(...f.canonicalLocal),override??pose.limits[f.type],f);return q;},
    parentQ=parentInverse.clone().invert();
  if(boundedFit){
    const current=[upper,middle,end].map(n=>new Quaternion(...n.getRotation())),positionError=pose.position(end).distanceTo(target),
      orientationErrorDegrees=orientation?MathUtils.radToDeg(pose.rotation(end).angleTo(orientation)):0,
      violations=[...inspect(upper,current[0]),...inspect(middle,current[1]),...inspect(end,current[2],endLimits)],flex=pose.angles(middle).flex,
      step=previousRotations?Math.max(...current.map((q,i)=>MathUtils.radToDeg(q.angleTo(previousRotations[i])))):0;
    // Keep an exact feasible source pose. In particular, a straight planted leg
    // must not be bent merely to satisfy the analytic seed's 0.999 reach margin.
    // This is checked against actual FK, joint bounds and the velocity budget.
    if(positionError<=1e-8&&orientationErrorDegrees<=1e-6&&!violations.length&&(!flexRange||(flex>=flexRange[0]&&flex<=flexRange[1]))&&(maxStepDegrees===undefined||step<=maxStepDegrees))
      return{passed:true,method:'already-exact-feasible-source-FK',target:target.toArray(),targetQuaternion:orientation?.toArray()??null,positionError,orientationErrorDegrees,requestedDistance:distance,maximumReach,flex,elbow:pose.position(middle).toArray(),violations,boundedFitAttempted:false,maximumStepDegrees:previousRotations?step:null};
  }
  let best;
  for(let roll=0;roll<360;roll++){
    const desiredWorldUpper=new Quaternion().setFromAxisAngle(direction,MathUtils.degToRad(roll)).multiply(align),
      upperQ=bounded(upper,parentInverse.clone().multiply(desiredWorldUpper).normalize()),
      worldUpper=parentQ.clone().multiply(upperQ),
      endQ=bounded(end,orientation?worldUpper.clone().multiply(middleQ).invert().multiply(orientation).normalize():new Quaternion(...pose.bind.get(end).rotation).normalize(),endLimits),
      violations=[...inspect(upper,upperQ),...inspect(middle,middleQ),...inspect(end,endQ,endLimits)],
      elbow=root.clone().add(offset.clone().applyQuaternion(worldUpper)),
      endpointError=root.clone().add(localEnd.clone().applyQuaternion(worldUpper)).distanceToSquared(target),
      orientationError=orientation?worldUpper.clone().multiply(middleQ).multiply(endQ).angleTo(orientation):0,
      continuity=previousRotations ? [upperQ,middleQ,endQ].reduce((sum,q,i)=>sum+q.angleTo(previousRotations[i])**2,0) : 0,
      cost=endpointError*1000+orientationError**2*.5+elbow.distanceToSquared(pole)*.01+continuity*.05;
    if(!best||cost<best.cost)best={cost,roll,theta,upperQ,middleQ,endQ,elbow:elbow.toArray(),violations};
  }
  const analytic=[best.upperQ,best.middleQ,best.endQ],analyticPosition=root.clone().add(offset.clone().applyQuaternion(parentQ.clone().multiply(best.upperQ))).add(endOffset.clone().applyQuaternion(parentQ.clone().multiply(best.upperQ).multiply(best.middleQ))),
    analyticOrientation=parentQ.clone().multiply(best.upperQ).multiply(best.middleQ).multiply(best.endQ),
    needsFit=!!previousRotations||analyticPosition.distanceTo(target)>.001||(orientation&&analyticOrientation.angleTo(orientation)>.004)||
      sourcePositionError<analyticPosition.distanceTo(target)||(orientation&&sourceOrientationError<analyticOrientation.angleTo(orientation));
  let fitted=null;
  if(boundedFit&&needsFit){
    // Without history, retain the caller's current source pose as the weak
    // null-space preference. A pole tie-break alone can add knee/twist motion
    // even when both candidates have virtually identical endpoint contact.
    const continuityReference=previousRotations??sourceRotations;
    fitted=fitBoundedChain(pose,names,{target,orientation,pole,seeds:[...(previousRotations?[previousRotations]:[]),sourceRotations,analytic],endLimits,flexRange,previousRotations:continuityReference,maxStepDegrees});
    const originalCost=analyticPosition.distanceToSquared(target)*400+(orientation?analyticOrientation.angleTo(orientation)**2*4:0)+analytic.reduce((s,q,i)=>s+q.angleTo(continuityReference[i])**2*.015**2,0);
    const analyticVelocityInvalid=maxStepDegrees!==undefined&&previousRotations&&analytic.some((r,i)=>MathUtils.radToDeg(r.angleTo(previousRotations[i]))>maxStepDegrees+1e-8);
    if(fitted.objective<originalCost||analyticVelocityInvalid){[best.upperQ,best.middleQ,best.endQ]=fitted.rotations;}
  }
  best.violations=[...inspect(upper,best.upperQ),...inspect(middle,best.middleQ),...inspect(end,best.endQ,endLimits)];
  upper.setRotation(best.upperQ.toArray());middle.setRotation(best.middleQ.toArray());end.setRotation(best.endQ.toArray());
  const positionError=pose.position(end).distanceTo(target);
  const orientationErrorDegrees=orientation?MathUtils.radToDeg(pose.rotation(end).angleTo(orientation)):0;
  return{passed:best.violations.length===0&&positionError<=0.005&&orientationErrorDegrees<=1,target:target.toArray(),targetQuaternion:orientation?.toArray()??null,positionError,orientationErrorDegrees,requestedDistance:distance,maximumReach,flex:pose.angles(middle).flex,elbow:pose.position(middle).toArray(),violations:best.violations,boundedFitAttempted:!!fitted,maximumStepDegrees:previousRotations?Math.max(...[best.upperQ,best.middleQ,best.endQ].map((r,i)=>MathUtils.radToDeg(r.angleTo(previousRotations[i])))):null};
}

/** Build-time angular velocity limit. Any resulting endpoint error must be measured
 * after this pass; it cannot turn an unreachable contact into an accepted solve. */
export function limitAngularStep(previous,current,degrees=8) {
  const angle=previous.angleTo(current),limit=MathUtils.degToRad(degrees);
  return angle>limit?previous.clone().slerp(current,limit/angle).normalize():current.clone().normalize();
}

/** A linked limb advances by one shared fraction. Limiting every bone separately
 * can fully extend a knee while its hip still lags, moving a planted foot. */
export function limitAngularChain(previous,current,degrees=8) {
  const largest=Math.max(...current.map((q,i)=>previous[i].angleTo(q))),limit=MathUtils.degToRad(degrees),fraction=largest>limit?limit/largest:1;
  return current.map((q,i)=>previous[i].clone().slerp(q,fraction).normalize());
}
