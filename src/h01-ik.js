import * as THREE from 'three';
const scratchVectors=Array.from({length:512},()=>new THREE.Vector3()),scratchQuaternions=Array.from({length:128},()=>new THREE.Quaternion());
let vectorCursor=0,quaternionCursor=0;
function beginScratch(){vectorCursor=quaternionCursor=0;}
function vector(value){const out=scratchVectors[vectorCursor]??(scratchVectors[vectorCursor]=new THREE.Vector3());vectorCursor++;return value?out.copy(value):out.set(0,0,0);}
function quaternion(){const out=scratchQuaternions[quaternionCursor]??(scratchQuaternions[quaternionCursor]=new THREE.Quaternion());quaternionCursor++;return out.identity();}
const identity=new THREE.Quaternion();
const Y=new THREE.Vector3(0,1,0);
const clamp=THREE.MathUtils.clamp;
function worldPosition(node){return node.getWorldPosition(vector());}
function setWorldRotation(bone,rotation){
 const parent=bone.parent.getWorldQuaternion(quaternion());
 bone.quaternion.copy(parent.invert().multiply(rotation));bone.updateWorldMatrix(false,true);
}
function pointBone(bone,child,target){
 const origin=worldPosition(bone),direction=worldPosition(child).sub(origin).normalize();
 const desired=vector(target).sub(origin).normalize();
 const q=bone.getWorldQuaternion(quaternion());
 setWorldRotation(bone,quaternion().setFromUnitVectors(direction,desired).multiply(q));
}
/** Analytic two-bone solver with a stable elbow/knee pole, in world coordinates. */
export function solveTwoBoneIK(upper,middle,end,target,pole){
 upper.updateWorldMatrix(true,true);
 const a=worldPosition(upper),b=worldPosition(middle),c=worldPosition(end);
 const l1=a.distanceTo(b),l2=b.distanceTo(c);
 if(l1<1e-5||l2<1e-5)return Infinity;
 const axis=vector(target).sub(a),distance=axis.length();axis.normalize();
 const d=clamp(distance,Math.abs(l1-l2)+1e-5,l1+l2-1e-5);
 const along=(l1*l1+d*d-l2*l2)/(2*d);
 const bend=vector(pole).sub(a).addScaledVector(axis,-vector(pole).sub(a).dot(axis));
 if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(axis,-axis.z);
 bend.normalize();
 const elbow=vector(a).addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
 pointBone(upper,middle,elbow);pointBone(middle,end,vector(a).addScaledVector(axis,d));
 return worldPosition(end).distanceTo(target);
}
export function createH01IK(body){
 const names=['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
 const bones=Object.fromEntries(names.map(n=>[n,body.getObjectByName(n)]));
 if(Object.values(bones).some(b=>!b))throw Error('H01 humanoid rig is incomplete');
 body.updateWorldMatrix(true,true);
 const hand=bones.RightHand;
 let socket=body.getObjectByName('RightHand_WeaponSocket');
 if(!socket){socket=new THREE.Object3D();socket.name='RightHand_WeaponSocket';hand.add(socket);}
 // Reviewed palm center on the supplied mesh, not the old approximate wrist.
 const palm=body.localToWorld(new THREE.Vector3().fromArray(body.userData.ikLandmarks?.right??[-.535,.985,.125]));
 socket.position.copy(hand.worldToLocal(palm));socket.quaternion.identity();
 socket.position.z-=.025;
 const leftSocket=new THREE.Object3D();leftSocket.name='LeftHand_GroundSocket';bones.LeftHand.add(leftSocket);
 leftSocket.position.copy(bones.LeftHand.worldToLocal(body.localToWorld(new THREE.Vector3().fromArray(body.userData.ikLandmarks?.left??[.535,.985,.125]))));
 const leftFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,-1,0)));
 const handFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0,1,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1)));
 const restFeet={};for(const side of ['Left','Right'])restFeet[side]=body.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bones[side+'Foot'].getWorldQuaternion(new THREE.Quaternion()));
 return {body,bones,socket,leftSocket,leftFrame,handFrame,restFeet,lastError:0};
}
function toWorld(rig,point){return rig.body.localToWorld(point.isVector3?vector(point):vector().fromArray(point));}
export function poseRightHand(rig,palmTarget,closedGrip=true){
 beginScratch();
 rig.body.updateWorldMatrix(true,true);
 const q=rig.body.getWorldQuaternion(quaternion()).multiply(rig.handFrame);
 const scale=rig.bones.RightHand.getWorldScale(vector());
 const offset=vector(rig.socket.position).multiply(scale).applyQuaternion(q);
 const target=toWorld(rig,palmTarget).sub(offset);
 const error=solveTwoBoneIK(rig.bones.RightArm,rig.bones.RightForeArm,rig.bones.RightHand,target,toWorld(rig,rig.body.userData.rightElbowPole??(closedGrip?[-.7,1.25,-.15]:[-.52,(palmTarget.y??palmTarget[1])+.12,-.16])));
 setWorldRotation(rig.bones.RightHand,q);rig.lastError=error;
 if(closedGrip){
  if(!rig.gripPose){
   const axis=rig.body.getWorldQuaternion(quaternion());
   const up=vector(Y).applyQuaternion(axis);
   const center=worldPosition(rig.socket),radius=(rig.body.userData.ikLandmarks?.gripRadius??.026)*rig.body.getWorldScale(vector()).y;
   rig.gripPose=[];
   for(const finger of ['Thumb','Index','Middle','Ring','Pinky']){
    const joints=[1,2,3].map(i=>rig.body.getObjectByName('RightHand'+finger+i));
    const position=worldPosition(joints[2]),delta=vector(position).sub(center),height=delta.dot(up);
    const radial=delta.addScaledVector(up,-height);
    if(radial.lengthSq()<1e-8)radial.set(0,0,1).applyQuaternion(axis);
    const target=center.clone().addScaledVector(up,height).add(radial.normalize().multiplyScalar(radius));
    const pole=worldPosition(joints[1]);
    solveTwoBoneIK(joints[0],joints[1],joints[2],target,pole);
    rig.gripPose.push(...joints.slice(0,2).map(bone=>({bone,rotation:bone.quaternion.clone()})));
   }
  }else for(const {bone,rotation} of rig.gripPose)bone.quaternion.copy(rotation);
  rig.bones.RightHand.updateWorldMatrix(false,true);
 }
 return error;
}
export function poseCrouch(rig,amount){
 beginScratch();
 if(amount<=.01){rig.leftGroundError=null;return;}
 rig.body.updateWorldMatrix(true,true);
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  const foot=toWorld(rig,[sign*(.105+.14*amount),.12,.08*amount]);
  solveTwoBoneIK(rig.bones[side+'UpLeg'],rig.bones[side+'Leg'],rig.bones[side+'Foot'],foot,toWorld(rig,[sign*.45,.28,.5]));
  setWorldRotation(rig.bones[side+'Foot'],rig.body.getWorldQuaternion(quaternion()).multiply(rig.restFeet[side]).multiply(quaternion().setFromAxisAngle(Y,-sign*amount*Math.PI/9)));
 }
 const q=rig.body.getWorldQuaternion(quaternion()).multiply(rig.leftFrame);
 const offset=vector(rig.leftSocket.position).multiply(rig.bones.LeftHand.getWorldScale(vector())).applyQuaternion(q);
 const palm=toWorld(rig,[.535*(1-amount),.985-.96*amount,.125+.095*amount]);
 const target=vector(palm).sub(offset);
 solveTwoBoneIK(rig.bones.LeftArm,rig.bones.LeftForeArm,rig.bones.LeftHand,target,toWorld(rig,[.45,.3,.45]));
 setWorldRotation(rig.bones.LeftHand,q);
 rig.leftGroundError=worldPosition(rig.leftSocket).distanceTo(palm);
}
export function setFingerGrip(body,strength){
 // Clips already hold the authored closed grip. During the entrance the mixer
 // supplies the open -> closed pose; this function supports the hip-hand stage.
 for(const finger of ['Thumb','Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){
  const bone=body.getObjectByName('RightHand'+finger+i);
  if(bone)bone.quaternion.slerp(identity,1-clamp(strength,0,1));
 }
}
export function orientStaffUpright(staff,body){
 beginScratch();
 const world=body.getWorldQuaternion(quaternion());
 const parent=staff.parent.getWorldQuaternion(quaternion());
 staff.quaternion.copy(parent.invert().multiply(world));
}
