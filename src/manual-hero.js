import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { loadManualAsset,manualAssetMetrics } from './manual-asset-cache.js';
import { cloneHunyuanStaff } from './manual-staff.js';
import { enhanceCharacterVisualFidelity } from './character-fidelity.js';
import { createH01IK,poseRightHand,poseCrouch,setFingerGrip,orientStaffUpright } from './h01-ik.js';
import { H01_ENTRANCE,entranceFrame,smoothWindow,createH01EntranceVfx,updateH01EntranceVfx,disposeH01EntranceVfx } from './h01-entrance.js';
import { syncSoulRingVisuals } from './soul-ring-vfx.js';

const states=new WeakMap(),contexts=new WeakMap();
export function usesManualH01(actor){return ['hero','clone'].includes(actor.kind)&&actor.hero===0&&(actor.costume??0)===0;}
export function configureManualH01(root,renderer,scene,camera){contexts.set(root,{renderer,scene,camera});}
function cloneMaterials(body){body.traverse(node=>{
 if(!node.isMesh)return;
 node.geometry.userData.sharedArt=true;
 node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();
 for(const m of Array.isArray(node.material)?node.material:[node.material]){
  m.userData.sharedArt=true;
  for(const key of ['map','normalMap','metalnessMap','roughnessMap'])if(m[key])m[key].anisotropy=4;
 }
});}
function applyStaffReveal(staff){staff.traverse(node=>{
 if(!node.isMesh)return;
 if(!node.geometry.getAttribute('staffRevealHeight')){
  staff.updateWorldMatrix(true,true);
  const positions=node.geometry.getAttribute('position'),height=new Float32Array(positions.count);
  const point=new THREE.Vector3(),matrix=new THREE.Matrix4().copy(staff.matrixWorld).invert().multiply(node.matrixWorld);
  const base=staff.getObjectByName('Staff_Base_Tip').position.y;
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(matrix);height[i]=THREE.MathUtils.clamp((point.y-base)/2.0384,0,1);}
  node.geometry.setAttribute('staffRevealHeight',new THREE.BufferAttribute(height,1));
 }
 const material=node.material;material.userData.reveal={value:1};
 material.onBeforeCompile=shader=>{
  shader.uniforms.h01Reveal=material.userData.reveal;
  shader.vertexShader='attribute float staffRevealHeight;varying float h01Height;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh01Height=staffRevealHeight;');
  shader.fragmentShader='uniform float h01Reveal;varying float h01Height;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`if(h01Reveal<.999&&h01Height<1.-h01Reveal)discard;gl_FragColor.rgb+=vec3(.1,.7,.3)*max(0.,1.-abs(h01Height-(1.-h01Reveal))*24.)*(1.-step(.999,h01Reveal));\n#include <dithering_fragment>`);
 };
 material.customProgramCacheKey=()=> 'h01-hunyuan-staff-reveal-v1';
});}
export function createManualH01(actor,detail){
 const root=new THREE.Group();root.name='manualHero_H01_C0';
 root.userData={height:1.82,detail,manualHunyuan:true,
  manualAsset:{id:'H01-C0',status:'loading',detail,rigged:true,source:'a93d658b-a40d-4854-b755-ad1fa9bcc79b'}};
 const started=performance.now();
 syncSoulRingVisuals(root,actor,detail,0);
 Promise.all([loadManualAsset(detail),loadManualAsset('staff-'+detail)]).then(async([gltf,staffGltf])=>{
  if(root.userData.manualAsset.disposed)return;
  const body=cloneSkeleton(gltf.scene);body.name='HunyuanBody';body.visible=false;body.rotation.y=Math.PI;cloneMaterials(body);root.add(body);
  const staff=cloneHunyuanStaff(staffGltf);body.add(staff);applyStaffReveal(staff);
  body.updateWorldMatrix(true,true);
  const ik=createH01IK(body),mixer=new THREE.AnimationMixer(body);
  staff.updateWorldMatrix(true,true);
  const tip=staff.worldToLocal(staff.getObjectByName('Staff_Base_Tip').getWorldPosition(new THREE.Vector3()));
  const plantedGrip=new THREE.Vector3(-.34,0,.18).sub(tip);
  const coreLight=new THREE.PointLight(0x82ffc5,.12,1.6,2);coreLight.layers.set(2);
  staff.getObjectByName('Staff_Head_Core').add(coreLight);
  const actions=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  for(const name of ['Attack','Cast','Dash','Entrance']){actions[name].setLoop(THREE.LoopOnce,1);actions[name].clampWhenFinished=true;}
  const preview=actor.id==='preview';
  const state={body,staff,ik,mixer,actions,plantedGrip,coreLight,current:null,remaining:0,cooldowns:[...(actor.cooldowns??[])],preview,
   introStart:performance.now(),gripped:false,impact:false,vfx:preview?createH01EntranceVfx():null};
  if(state.vfx)body.add(state.vfx.root);
  const context=contexts.get(root);
  root.userData.manualAsset.status='preparing';
  if(context){
   enhanceCharacterVisualFidelity(body,context.renderer,context.scene);
   if(context.renderer.compileAsync)await context.renderer.compileAsync(body,context.camera,context.scene);
  }
  if(root.userData.manualAsset.disposed){mixer.stopAllAction();state.vfx&&disposeH01EntranceVfx(state.vfx);return;}
  state.introStart=performance.now();states.set(root,state);body.visible=true;
  if(!preview){ik.socket.add(staff);staff.position.set(0,0,0);state.gripped=true;}
  root.userData.manualAsset.status='loaded';root.userData.manualAsset.clips=gltf.animations.map(c=>c.name);
  root.userData.manualAsset.loadMs=performance.now()-started;root.userData.manualAsset.cache={...manualAssetMetrics};
  root.userData.modelLoadRevision=1;
 }).catch(error=>{
  if(root.userData.manualAsset.disposed)return;
  root.userData.manualAsset.status='failed';root.userData.manualAsset.error=error.message;
  console.error('H01 Hunyuan asset failed',error);
 });
 return root;
}
function selectAction(state,name,restart=false){
 if(state.current===name&&!restart)return;
 state.actions[state.current]?.fadeOut(.12);
 state.actions[name].reset().fadeIn(.12).play();state.current=name;
}
function staffReveal(state,amount){
 state.staff.visible=amount>0;state.staff.scale.setScalar(.85+.15*amount);
 state.staff.traverse(node=>{if(node.material?.userData.reveal)node.material.userData.reveal.value=amount;});
}
export function replayManualH01Entrance(root){
 const s=states.get(root);if(!s?.preview)return;
 s.introStart=performance.now();delete s.forcedTime;s.gripped=false;s.impact=false;
 s.body.attach(s.staff);s.staff.position.set(-.38,1.45,.12);s.staff.quaternion.identity();s.current=null;s.mixer.stopAllAction();
 if(!s.vfx){s.vfx=createH01EntranceVfx();s.body.add(s.vfx.root);}
}
// Deterministic art review of frame 183/213 without modifying gameplay time.
export function seekManualH01Entrance(root,seconds){const state=states.get(root);if(state?.preview){if(!state.vfx){state.vfx=createH01EntranceVfx();state.body.add(state.vfx.root);}state.forcedTime=Math.max(0,seconds);}}
function updateEntrance(root,state,t){
 const f=entranceFrame(t);
 if(state.current!=='Entrance'){state.mixer.stopAllAction();state.actions.Entrance.reset().play();state.current='Entrance';}
 state.actions.Entrance.stopFading().setEffectiveWeight(1);
 state.actions.Entrance.time=Math.min(t,4.2);state.mixer.update(0);
 if(t>=3.55){const age=t-3.55;state.body.getObjectByName('Hips').rotateX(.003*Math.sin(age*85)*Math.exp(-age*14));}
 poseCrouch(state.ik,f.crouch);
 state.body.traverse(node=>{if(node.isSkinnedMesh)node.visible=f.visible;});
 if(!f.gripped){
  if(state.gripped){state.body.attach(state.staff);state.gripped=false;}
  state.staff.position.set(-.38,1.45,.12);state.staff.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),f.morph*Math.PI*2);
  const target=new THREE.Vector3(-.22,.28,-.02).lerp(new THREE.Vector3(-.38,1.45,.12),f.reach);
  // Raise the hip-hand target with the standing transition.
  target.y+=.72*(1-f.crouch)*(1-f.reach);
  poseRightHand(state.ik,target.toArray(),false);
 }else{
  const target=new THREE.Vector3(-.38,1.45,.12).lerp(state.plantedGrip,f.plant);
  if(t>3.25&&t<3.38)target.y+=.035*Math.sin((t-3.25)/.13*Math.PI);
  poseRightHand(state.ik,target.toArray());
  if(!state.gripped){state.ik.socket.attach(state.staff);state.staff.position.set(0,0,0);state.gripped=true;root.userData.manualAsset.gripEvents=(root.userData.manualAsset.gripEvents??0)+1;}
  state.staff.position.set(0,0,0);orientStaffUpright(state.staff,state.body);
 }
 staffReveal(state,f.staff);setFingerGrip(state.body,f.gripped?1:0);
 updateH01EntranceVfx(state.vfx,f);
 state.coreLight.intensity=.12+.35*Math.exp(-Math.abs(t-3.05)*45)+.45*Math.exp(-Math.abs(t-3.55)*45);
 if(t>=3.55){const age=t-3.55;state.staff.rotateZ(.012*Math.sin(age*85)*Math.exp(-age*14));}
 if(f.impact&&!state.impact){state.impact=true;root.userData.manualAsset.impactEvents=(root.userData.manualAsset.impactEvents??0)+1;}
 root.userData.manualAsset.entrance={...f,leftGroundError:state.ik.leftGroundError,rightGripError:state.ik.lastError};
 root.userData.manualAsset.cameraShake=f.shake;
 return f;
}
/** Poses are visual only: combat clocks, costs, movement and hitboxes stay authoritative. */
export function updateManualH01Animation(root,actor,speed,dt){
 const s=states.get(root);if(!s)return;
 if(s.preview){
  const elapsed=s.forcedTime??((performance.now()-s.introStart)/1000);
  if(elapsed<=4.2){updateEntrance(root,s,elapsed);root.userData.manualAsset.animation='Entrance';return;}
  if(!s.gripped||!s.impact)updateEntrance(root,s,4.2);
  if(s.vfx){disposeH01EntranceVfx(s.vfx);s.vfx=null;}
  s.body.traverse(n=>{if(n.isSkinnedMesh)n.visible=true;});staffReveal(s,1);
  if(!s.gripped){s.ik.socket.add(s.staff);s.staff.position.set(0,0,0);s.gripped=true;}
  root.userData.manualAsset.cameraShake=0;root.userData.manualAsset.entrance={time:elapsed,complete:true};
 }
 const cooldowns=actor.cooldowns??[];let requested=null;
 for(let i=0;i<6;i++)if((cooldowns[i]??0)>(s.cooldowns[i]??0)+.08)requested=i===5?'Attack':i===4?'Dash':'Cast';
 s.cooldowns=[...cooldowns];s.remaining=Math.max(0,s.remaining-dt);
 if(requested)s.remaining=requested==='Dash'?.5:requested==='Attack'?.8:1;
 const desired=requested??(s.remaining>0?s.current:speed>.06?'Run':'Idle');
 selectAction(s,desired,!!requested);s.mixer.update(Math.min(Math.max(dt,0),.1));
 const grip=s.plantedGrip.clone();
 if(desired==='Run'){grip.y+=.12;grip.z+=Math.sin(s.actions.Run.time*8)*.03;}
 else if(desired!=='Idle')grip.y+=.12+.16*Math.sin(Math.PI*Math.min(1,s.actions[desired].time/s.actions[desired].getClip().duration));
 poseRightHand(s.ik,grip.toArray());
 s.coreLight.intensity=.12;
 s.staff.position.set(0,0,0);orientStaffUpright(s.staff,s.body);
 root.userData.manualAsset.animation=desired;
 root.userData.manualAsset.rightGripError=s.ik.lastError;
}
export function disposeManualH01(root){
 if(!root.userData.manualHunyuan)return;
 root.userData.manualAsset.disposed=true;const s=states.get(root);
 if(s){s.mixer.stopAllAction();s.mixer.uncacheRoot(s.body);if(s.vfx)disposeH01EntranceVfx(s.vfx);states.delete(root);}
 const materials=new Set(),skeletons=new Set();
 root.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});
 for(const s of skeletons)s.dispose();for(const m of materials)m.dispose();contexts.delete(root);
}
