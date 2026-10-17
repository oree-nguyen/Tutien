import{perfBeginAppearance}from'./perf-debug.js';
import * as THREE from 'three';
import {clone as cloneSkeleton}from'three/addons/utils/SkeletonUtils.js';
import{loadManualAsset,manualAssetMetrics}from'./manual-asset-cache.js';
import{enhanceCharacterVisualFidelity}from'./character-fidelity.js';
import{warmSceneMaterials}from'./shader-warmup.js';
import{createH01IK,poseRightHand,solveTwoBoneIK}from'./h01-ik.js';
import{syncSoulRingVisuals}from'./soul-ring-vfx.js';
import{H02_ENTRANCE,H02_STANDING_HAMMER_Z,h02EntranceFrame,h02Smooth,createH02EntranceVfx,updateH02EntranceVfx,disposeH02EntranceVfx}from'./h02-entrance.js';
const states=new WeakMap(),contexts=new WeakMap(),Z=new THREE.Vector3(0,0,1);
export function usesManualH02(a){return['hero','clone'].includes(a.kind)&&a.hero===1&&(a.costume??0)===0;}
export function configureManualH02(root,renderer,scene,camera){contexts.set(root,{renderer,scene,camera});}
function cloneMaterials(root){root.traverse(n=>{if(n.isMesh){n.geometry.userData.sharedArt=true;n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();for(const m of Array.isArray(n.material)?n.material:[n.material])m.userData.sharedArt=true;}});}
function setWorldRotation(bone,q,s){bone.quaternion.copy(s.q2.copy(bone.parent.getWorldQuaternion(s.q3)).invert().multiply(q));bone.updateWorldMatrix(false,true);}
function localPoint(s,p,index){return s.body.localToWorld(s.v[index].copy(p));}
function poseLeftHip(s,crouch){
 const ik=s.ik,b=ik.bones,hand=b.LeftHand,target=s.v[0].set(.33,1.12-.65*crouch,-.04),q=s.q0.copy(s.body.getWorldQuaternion(s.q1)).multiply(s.leftHipFrame);
 const offset=s.v[1].copy(ik.leftSocket.position).multiply(hand.getWorldScale(s.v[2])).applyQuaternion(q);
 const goal=localPoint(s,target,3).sub(offset),pole=localPoint(s,s.v[4].set(.72,.9-.4*crouch,-.12),5);
 solveTwoBoneIK(b.LeftArm,b.LeftForeArm,hand,goal,pole);setWorldRotation(hand,q,s);
}
function poseFeet(s,crouch){
 if(crouch<.01)return;
 for(const [side,sign]of[['Left',1],['Right',-1]]){
  const b=s.ik.bones,foot=localPoint(s,s.v[0].set(sign*(.12+.17*crouch),.12,.08*crouch),1),pole=localPoint(s,s.v[2].set(sign*.51,.38,.52),3);
  solveTwoBoneIK(b[side+'UpLeg'],b[side+'Leg'],b[side+'Foot'],foot,pole);
  const q=s.q0.copy(s.body.getWorldQuaternion(s.q1)).multiply(s.ik.restFeet[side]);setWorldRotation(b[side+'Foot'],q,s);
 }
}
function orientHammer(s,flip=1){
 const q=s.q0.copy(s.body.getWorldQuaternion(s.q1)).multiply(s.q2.setFromAxisAngle(Z,Math.PI*(1-flip)));
 s.hammer.quaternion.copy(s.q3.copy(s.hammer.parent.getWorldQuaternion(s.q4)).invert().multiply(q));
}
function selectAction(s,name,restart=false){if(s.current===name&&!restart)return;s.actions[s.current]?.fadeOut(.12);s.actions[name].reset().fadeIn(.12).play();s.current=name;}
export function createManualH02(actor,detail){
 const root=new THREE.Group();root.name='manualHero_H02_C0';root.userData={height:2.2,detail,manualHunyuan:true,manualH02:true,manualAsset:{id:'H02-C0',status:'loading',detail,rigged:true,source:'cd050512-738f-449f-95d3-7c11a9c06851'}};
 const started=performance.now(),level=detail==='mobile'?'medium':detail;
 syncSoulRingVisuals(root,actor,detail,0);
 Promise.all([loadManualAsset('h02-body-'+level),loadManualAsset('h02-hammer-'+(level==='high'?'high':level))]).then(async([gltf,weapon])=>{
  if(root.userData.manualAsset.disposed)return;
  const stage=new THREE.Group();stage.name='H02_Entrance_Stage';stage.rotation.y=Math.PI;root.add(stage);
  const body=cloneSkeleton(gltf.scene);body.name='HunyuanBody';body.visible=false;body.userData.preserveMetalPbr=true;body.userData.rightElbowPole=[-.62,1.05,-.12];body.userData.ikLandmarks={right:[-.535,1.035,.125],left:[.535,1.035,.125],gripRadius:.033};cloneMaterials(body);stage.add(body);
  const source=weapon.scene.getObjectByName('Hammer_Root');if(!source?.getObjectByName('Hammer_Base_Tip')||!source.getObjectByName('Hammer_Head_Impact'))throw Error('H02 hammer attachment nodes missing');
  const hammer=source.clone(true);cloneMaterials(hammer);stage.add(hammer);
  const ik=createH01IK(body),mixer=new THREE.AnimationMixer(body),actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
  for(const n of ['Attack','Cast','Dash','Entrance']){if(!actions[n])throw Error('Missing H02 clip '+n);actions[n].setLoop(THREE.LoopOnce,1);actions[n].clampWhenFinished=true;}
  const preview=actor.id==='preview',s={root,stage,body,hammer,ik,mixer,actions,preview,current:null,remaining:0,introStart:performance.now(),cooldowns:[...(actor.cooldowns??[])],frame:{},gripped:false,impact:false,stamp:false,v:Array.from({length:10},()=>new THREE.Vector3()),q0:new THREE.Quaternion(),q1:new THREE.Quaternion(),q2:new THREE.Quaternion(),q3:new THREE.Quaternion(),q4:new THREE.Quaternion(),leftHipFrame:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1))),vfx:preview?createH02EntranceVfx():null};
  if(s.vfx)stage.add(s.vfx.root);
  const context=contexts.get(root);root.userData.manualAsset.status='preparing';
  if(context){enhanceCharacterVisualFidelity(body,context.renderer,context.scene);enhanceCharacterVisualFidelity(hammer,context.renderer,context.scene);root.userData.manualAsset.shaderWarmup=await warmSceneMaterials(context.renderer,stage,context.camera,context.scene,true);}
  if(root.userData.manualAsset.disposed){mixer.stopAllAction();s.vfx&&disposeH02EntranceVfx(s.vfx);return;}
  states.set(root,s);s.introStart=performance.now();body.visible=true;
  if(!preview){ik.socket.add(hammer);hammer.position.set(0,0,0);s.gripped=true;}
  if(preview)perfBeginAppearance('model:H02:'+detail);Object.assign(root.userData.manualAsset,{status:'loaded',clips:gltf.animations.map(c=>c.name),loadMs:performance.now()-started,cache:{...manualAssetMetrics},weaponSource:'45b118bc-58ce-4000-94c6-8e09945aa9f1'});root.userData.modelLoadRevision=1;
 }).catch(error=>{if(!root.userData.manualAsset.disposed){root.userData.manualAsset.status='failed';root.userData.manualAsset.error=error.message;console.error('H02 Hunyuan asset failed',error);}});
 return root;
}
function updateEntrance(root,s,t){
 const f=h02EntranceFrame(t,s.frame),k=H02_ENTRANCE;
 if(s.current!=='Entrance'){s.mixer.stopAllAction();s.actions.Entrance.reset().play();s.current='Entrance';}
 s.actions.Entrance.stopFading().setEffectiveWeight(1);s.actions.Entrance.time=Math.min(t,k.duration);s.mixer.update(0);
 s.body.visible=f.heroVisible;s.body.position.set(1.25*(1-f.heroFlight),1.65*(1-f.heroFlight),-.25*(1-f.heroFlight));s.body.rotation.z=-.22*(1-f.heroFlight);
 if(f.landed){s.body.position.set(0,0,0);s.body.rotation.z=0;s.body.userData.rightElbowPole[1]=1.05-.57*f.crouch;s.body.userData.rightElbowPole[2]=-.12+.45*f.crouch;poseFeet(s,f.crouch);poseLeftHip(s,f.crouch);}
 if(!f.gripped){
  if(s.gripped){s.stage.attach(s.hammer);s.gripped=false;}
  s.hammer.position.set(1.25*(1-f.hammerFall),.75+2.5*(1-f.hammerFall),.38);s.hammer.quaternion.setFromAxisAngle(Z,Math.PI-.6*(1-f.hammerFall));
  if(f.landed){const p=s.v[6].set(-.27,.48,.08).lerp(s.v[7].set(0,.75,.38),f.pickup);poseRightHand(s.ik,p,f.pickup>.8);}
 }else{
  const p=s.v[6].set(0,.75,.38).lerp(s.v[7].set(-.43,1.15,H02_STANDING_HAMMER_Z),f.stand);p.y+=f.stampLift;
  poseRightHand(s.ik,p,true);
  if(!s.gripped){s.ik.socket.add(s.hammer);s.gripped=true;root.userData.manualAsset.gripEvents=(root.userData.manualAsset.gripEvents??0)+1;}
  s.hammer.position.set(0,0,0);orientHammer(s,f.hammerFlip);
 }
 updateH02EntranceVfx(s.vfx,t);
 if(f.hammerImpact&&!s.impact){s.impact=true;root.userData.manualAsset.hammerImpactEvents=(root.userData.manualAsset.hammerImpactEvents??0)+1;}
 if(f.stamp&&!s.stamp){s.stamp=true;root.userData.manualAsset.stampEvents=(root.userData.manualAsset.stampEvents??0)+1;}
 root.userData.manualAsset.animation='Entrance';root.userData.manualAsset.entrance={...f,rightGripError:s.ik.lastError};root.userData.manualAsset.cameraShake=f.shake;
}
export function updateManualH02(root,actor,speed,dt){
 const s=states.get(root);if(!s)return;
 if(s.preview){const t=s.forcedTime??(performance.now()-s.introStart)/1000;if(t<=H02_ENTRANCE.duration){updateEntrance(root,s,t);return;}if(!s.stamp||!s.gripped)updateEntrance(root,s,H02_ENTRANCE.duration);s.body.position.set(0,0,0);s.body.rotation.z=0;s.body.visible=true;updateH02EntranceVfx(s.vfx,t);root.userData.manualAsset.entrance={time:t,complete:true};root.userData.manualAsset.cameraShake=0;}
 const cds=actor.cooldowns??[];let requested=null;for(let i=0;i<6;i++)if((cds[i]??0)>(s.cooldowns[i]??0)+.08)requested=i===5?'Attack':i===4?'Dash':'Cast';for(let i=0;i<6;i++)s.cooldowns[i]=cds[i]??0;
 s.remaining=Math.max(0,s.remaining-dt);if(requested)s.remaining=requested==='Dash'?.5:requested==='Attack'?.8:1;
 const desired=requested??(s.remaining>0?s.current:speed>.06?'Run':'Idle');selectAction(s,desired,!!requested);s.mixer.update(Math.min(.1,Math.max(0,dt)));
 const p=s.v[6].set(-.43,1.15,H02_STANDING_HAMMER_Z);if(desired==='Run')p.y+=.06*Math.sin(s.actions.Run.time*8);else if(desired!=='Idle')p.y+=.12*Math.sin(Math.PI*Math.min(1,s.actions[desired].time/s.actions[desired].getClip().duration));
 s.body.userData.rightElbowPole[1]=1.05;s.body.userData.rightElbowPole[2]=-.12;poseRightHand(s.ik,p,true);poseLeftHip(s,0);s.hammer.position.set(0,0,0);orientHammer(s);root.userData.manualAsset.animation=desired;root.userData.manualAsset.rightGripError=s.ik.lastError;
}
export function replayManualH02(root){const s=states.get(root);if(!s?.preview)return;delete s.forcedTime;s.introStart=performance.now();s.gripped=s.impact=s.stamp=false;s.stage.attach(s.hammer);s.current=null;s.mixer.stopAllAction();}
export function seekManualH02(root,time){const s=states.get(root);if(s?.preview)s.forcedTime=Math.max(0,time);}
export function disposeManualH02(root){
 root.userData.manualAsset.disposed=true;const s=states.get(root);if(s){s.mixer.stopAllAction();s.mixer.uncacheRoot(s.body);s.vfx&&disposeH02EntranceVfx(s.vfx);states.delete(root);}
 const materials=new Set(),skeletons=new Set();root.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});for(const skeleton of skeletons)skeleton.dispose();for(const m of materials)m.dispose();contexts.delete(root);
}
