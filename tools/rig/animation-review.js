import * as T from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {HeroPoseController} from "../../src/rig/hero-pose-controller.js";
const params=new URLSearchParams(location.search),asset=params.get("asset")??"/.local/rig-candidates/fk-full-staging/H01-C0-rigged.glb",
  hero=asset.includes("H02")?"H02":"H01",framePath=params.get("frames")??`/docs/anim-report/conver10-redo/animation/full/${hero}-frames.json`;
if(!asset.startsWith("/.local/rig-candidates/")||asset.includes(".."))throw Error("Only local staging rigs may be reviewed");
if(!framePath.startsWith("/docs/anim-report/conver10-redo/animation/")||framePath.includes(".."))throw Error("Only local FK sidecars may be reviewed");
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1024,1024);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.localClippingEnabled=true;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color("#26323d");const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight(0xffffff,0x596578,2));const key=new T.DirectionalLight(0xffffff,2);key.position.set(2,3,4);scene.add(key);
const [bytes,frames,spec,weaponSpec]=await Promise.all([
  fetch(asset).then(r=>{if(!r.ok)throw Error("Staging GLB load failed: "+r.status);return r.arrayBuffer();}),fetch(framePath).then(r=>r.json()),
  fetch(`/data/hero-entrance/${hero}.json`).then(r=>r.json()),fetch(`/data/weapons/${hero}.json`).then(r=>r.json())
]),assetSha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),v=>v.toString(16).padStart(2,"0")).join("");
if(frames.outputSha256!==assetSha256)throw Error("Stale FK sidecar does not match the reviewed GLB");
const gltf=await new GLTFLoader().parseAsync(bytes,asset.slice(0,asset.lastIndexOf("/")+1)),model=gltf.scene;scene.add(model);
const weapon=await new GLTFLoader().loadAsync("/"+weaponSpec.source),holder=new T.Group();holder.add(weapon.scene);scene.add(holder);
const controller=new HeroPoseController(model,gltf.animations,{events:spec.events}),clips=Object.fromEntries(["Entrance","IDLE_HOLD"].map(name=>[name,frames.frames.filter(f=>f.clip===name)])),
  camera=new T.PerspectiveCamera(30,1,.001,20),center=new T.Vector3(0,.92,0),floor=new T.GridHelper(2,20,0x708090,0x445361);
scene.add(floor);
const sampleFrame=(name,time)=>{const list=clips[name],x=Math.min(time*60,list.length-1),i=Math.floor(x),a=list[i],b=list[Math.min(i+1,list.length-1)],r=x-i;return {a,position:new T.Vector3(...a.weapon.position).lerp(new T.Vector3(...b.weapon.position),r),quaternion:new T.Quaternion(...a.weapon.quaternion).slerp(new T.Quaternion(...b.weapon.quaternion),r)};};
window.animationReview={model,controller,renderer,scene,camera,sample(time,view=0){
  controller.seek(time);
  const entrance=time<=controller.duration,clip=entrance?"Entrance":"IDLE_HOLD",t=entrance?time:(time-controller.duration)%spec.idleDuration,f=sampleFrame(clip,t);
  model.visible=f.a.visible;holder.position.copy(f.position);holder.quaternion.copy(f.quaternion);holder.visible=hero==="H02"||!entrance||time>=2.6;
  const offsets=[[0,0,4.8],[-4.8,.25,0],[0,.35,-4.8]];camera.position.copy(center).add(new T.Vector3(...offsets[view]));camera.lookAt(center);model.updateMatrixWorld(true);renderer.render(scene,camera);
  document.querySelector("#label").textContent=`${hero} · FULL FK CANDIDATE: REJECTED · ${time.toFixed(3)}s · ${["front","side","back"][view]} · JOINT / GROUND / CLOTHING ACCEPTANCE FAILED`;
  return {assetSha256,framePath,state:controller.state,idleRunning:controller.idle.isRunning(),characterVisible:model.visible,weaponVisible:holder.visible,clip,clipTime:t};
}};
window.animationReview.sample(0);window.ready=true;
