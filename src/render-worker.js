import{hydrateRenderMatch}from'./render-packet.js';
let world,preparing=false,epoch=0,last=performance.now(),renderFrames=0,renderTime=0,fps=0;
function diagnostic(full=false){
 const root=world.preview?.getObjectByName('manualHero_H01_C0');let material;
 root?.traverse(node=>{if(node.isSkinnedMesh)material=node.material;});
 let pose;
 if(full&&root){const body=root.getObjectByName('HunyuanBody');if(body){body.updateWorldMatrix(true,true);pose={};for(const name of ['Hips','LeftHand_GroundSocket','RightHand_WeaponSocket','Staff_Base_Tip']){const node=root.getObjectByName(name);if(node){const point=node.getWorldPosition(body.position.clone());body.worldToLocal(point);pose[name]=point.toArray();}}}}
 return {pose,terrain:full?world.scenery.stats():undefined,backend:'worker',previewAsset:root?.userData.manualAsset??null,quality:world.quality,sceneryReady:world.scenery.ready,
  camera:{x:world.camera.position.x,y:world.camera.position.y,z:world.camera.position.z},focus:{x:world.focus.x,y:world.focus.y,z:world.focus.z},look:world.portraitLook?{x:world.portraitLook.x,y:world.portraitLook.y,z:world.portraitLook.z}:null,
  basis:{right:Array.from(world.camera.matrixWorld.elements.slice(0,3)),up:Array.from(world.camera.matrixWorld.elements.slice(4,7)),forward:Array.from(world.camera.matrixWorld.elements.slice(8,11)).map(n=>-n)},
  gpuTiming:{available:!!world.gpuTimer.ext,ms:world.gpuTimer.lastMs,samples:world.gpuTimer.samples},
  ratio:world.renderer.getPixelRatio(),fps,render:{...world.renderer.info.render},memory:{...world.renderer.info.memory},batching:world.batching,
  material:material?{vertexColors:material.vertexColors,colorSpace:material.map?.colorSpace,compressed:!!material.map?.isCompressedTexture,metalness:material.metalness,emissive:material.emissiveIntensity}:null,
  pooledRender:{...world.pooledRender},shaderWarmup:world.warmupTasks};
}
function reply(id,value,error){postMessage({type:'reply',id,value,error});}
self.onmessage=async event=>{
 const message=event.data;
 try{
  if(message.type==='init'){
   globalThis.innerWidth=message.width;globalThis.innerHeight=message.height;globalThis.devicePixelRatio=message.dpr;
   globalThis.window=globalThis;globalThis.localStorage={getItem:key=>key==='hon-gioi-quality'?message.quality:null,setItem:(key,value)=>{if(key==='hon-gioi-quality')message.quality=value;}};
   globalThis.document={createElement:name=>{if(name==='canvas')return new OffscreenCanvas(1,1);throw Error('Unsupported renderer DOM element '+name);}};
   const {World}=await import('./world.js');world=await World.create(message.canvas);
   message.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();postMessage({type:'fatal',error:'WebGL context lost'});});
   last=performance.now();reply(message.id,diagnostic());return;
  }
  if(!world)throw Error('Render engine is not initialized');
  if(message.type==='frame'){
   if(preparing){postMessage({type:'frame',epoch:message.epoch,skipped:true});return;}
   if(message.epoch<epoch){postMessage({type:'frame',epoch:message.epoch,skipped:true});return;}
   await new Promise(resolve=>typeof requestAnimationFrame==='function'?requestAnimationFrame(resolve):setTimeout(resolve,16));
   if(message.epoch<epoch){postMessage({type:'frame',epoch:message.epoch,skipped:true});return;}
   epoch=message.epoch;const now=performance.now(),raw=now-last,dt=Math.min(.1,Math.max(0,raw/1000));last=now;
   world.samplePerformance(raw);const match=hydrateRenderMatch(message.match);
   if(message.aim&&match){const actor=match.actors.find(a=>a.id===message.aim.actorId)??match.player;world.aim(actor,message.aim.skill,message.aim.dir,message.aim.canceled,match);}else world.clearAim();
   world.render(match,dt,message.hero,message.appearance);renderFrames++;renderTime+=raw;
   if(renderTime>=1000){fps=Math.round(renderFrames*1000/renderTime);renderTime=renderFrames=0;}
   postMessage({type:'frame',epoch,diagnostic:diagnostic()});return;
  }
  if(message.type==='command'){
   const {method,args=[]}=message;
   if(method==='reset'){epoch=message.epoch;world.reset();}
   else if(method==='prepareBattlefield'){preparing=true;try{await world.prepareBattlefield(...args);}finally{preparing=false;last=performance.now();}}
   else if(method==='resize'){globalThis.innerWidth=args[0];globalThis.innerHeight=args[1];world.resize();}
   else if(method==='inspect'){reply(message.id,diagnostic(true));return;}
   else if(['prepareBattlefield','releaseBattlefield','setQuality','setShowcaseView','rotateShowcase','replayHeroEntrance','seekHeroEntrance','setLeaders'].includes(method))await world[method](...args);
   else throw Error('Invalid render command');
   if(message.id)reply(message.id,diagnostic());
  }
 }catch(error){if(message.id)reply(message.id,null,error.stack??error.message);else postMessage({type:'fatal',error:error.stack??error.message});}
};
