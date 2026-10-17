import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{GameLifecycleStateMachine,PHASES,sanitizeStaleMatchStateOnBoot}from'../src/game-lifecycle.js';
import{AdaptiveResolution,ObjectPool}from'../src/runtime-performance.js';import{Match}from'../src/simulation.js';import*as R from'../src/rules.js';
import{NodeIO}from'@gltf-transform/core';import{ALL_EXTENSIONS}from'@gltf-transform/extensions';import{MeshoptDecoder}from'meshoptimizer';
test('boot and cancelled async loads cannot enter combat without a new trusted start',()=>{
 const life=new GameLifecycleStateMachine();life.boot();assert.equal(life.phase,PHASES.LOBBY);assert.equal(life.begin({isTrusted:false}),null);
 const token=life.begin({isTrusted:true});assert.equal(life.begin({isTrusted:true}),null);life.cancel();assert.equal(life.enter(token),false);
 const next=life.begin({isTrusted:true});assert.equal(life.enter(next),true);life.cleanup();assert.equal(life.phase,PHASES.LOBBY);assert.equal(life.enter(next),false);
});
test('storage sanitation preserves bank/profile and unrelated services',()=>{
 const map=new Map([['activeMatch','battle'],['hon-gioi-save-v2','profile'],['other-service','{"phase":"battle","balance":900}']]);const store={removeItem:k=>map.delete(k)};
 sanitizeStaleMatchStateOnBoot(store,store);assert.equal(map.has('activeMatch'),false);assert.equal(map.get('hon-gioi-save-v2'),'profile');assert.equal(map.get('other-service'),'{"phase":"battle","balance":900}');
});
test('resolution responds to sustained frame pressure, recovers slowly and respects the budget',()=>{
 const applied=[],scale=new AdaptiveResolution({max:1.5,min:.8,apply:v=>applied.push(v)});
 for(let i=0;i<30;i++)scale.sample(25);assert.equal(scale.ratio,1.35);
 for(let i=0;i<2000;i++)scale.sample(30);assert.equal(scale.ratio,.8);
 for(let i=0;i<6000;i++)scale.sample(16);assert.equal(scale.ratio,1.5);assert.ok(applied.length>2);
 scale.sample(10000);assert.equal(scale.ratio,1.5);
});
test('cosmetic pool exhaustion does not allocate and each lease releases exactly once',()=>{
 let created=0;const pool=new ObjectPool(2,()=>({id:++created}),x=>{x.used=false;});const a=pool.acquire(),b=pool.acquire();assert.equal(pool.acquire(),null);assert.equal(created,2);pool.release(a);pool.release(a);assert.equal(pool.acquire(),a);pool.clear();assert.equal(pool.free.length,2);assert.equal(pool.active.size,0);assert.equal(b.used,false);
});
test('far offline AI thinks at 4Hz but movement integrates at fixed tick; authoritative defaults stay full-rate',()=>{
 const m=new Match({hero:0,branch:0,rings:[0,0],bones:[],supports:[],mode:'solo',brought:0},R.newProfile());
 const actor=m.actors[1];Object.assign(actor,{x:70,z:70,realm:0,ccUntil:0,slowUntil:0,downedUntil:0});m.player.x=m.player.z=-70;
 let calls=0;m.ai=(a,dt)=>{calls++;m.move(a,1,0,dt);};m.performanceTiering=true;const start=actor.x;
 for(let i=0;i<30;i++){m.time=i/30;m.updateTieredAI(actor,1/30);}assert.equal(calls,4);assert.ok(actor.x>start+3,'Steering must keep moving between decisions');
 m.performanceTiering=false;calls=0;for(let i=0;i<30;i++)m.updateTieredAI(actor,1/30);assert.equal(calls,30);
});
test('mobile body is 15k triangles with complete rig/clips and GPU variants embed mipmapped KTX2',async()=>{
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const receipt=JSON.parse(await readFile('public/models/gpu-texture-provenance.json'));assert.deepEqual(receipt.reports.map(r=>r.key).sort(),['mobile-gpu','staff-medium-gpu','h02-body-medium-gpu','h02-hammer-medium-gpu'].sort());
 for(const r of receipt.reports){const bytes=await readFile('public/models/'+r.family+'/'+r.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);
  const doc=await io.read('public/models/'+r.family+'/'+r.file),root=doc.getRoot();assert.ok(root.listTextures().length>=3);
  for(const texture of root.listTextures()){assert.equal(texture.getMimeType(),'image/ktx2');const image=Buffer.from(texture.getImage());assert.equal(image.readUInt32LE(0),0x58544bab);assert.ok(image.readUInt32LE(40)>1);}
  if(r.key==='mobile-gpu'){assert.ok(r.triangles>=12000&&r.triangles<=18000);assert.equal(root.listSkins()[0].listJoints().length,52);assert.equal(root.listAnimations().length,6);}
 }
});
test('render packets omit hidden enemies and never carry executable simulation state',async()=>{
 const{packRenderMatch,hydrateRenderMatch}=await import('../src/render-packet.js');
 const m=new Match({hero:0,branch:0,rings:[0,0],bones:[],supports:[],mode:'solo',brought:0},R.newProfile());
 const hidden=m.actors[1];hidden.x=m.player.x+2;hidden.z=m.player.z;hidden.realm=0;hidden.team=3;hidden.stealthUntil=999;
 m.visible=(observer,target)=>target!==hidden;
 const packet=packRenderMatch(m);assert.ok(!packet.actors.some(a=>a.id===hidden.id));assert.equal(packet.player,undefined);assert.equal(packet.emit,undefined);
 const clone=structuredClone(packet),render=hydrateRenderMatch(clone);assert.equal(render.player.id,m.player.id);assert.equal(render.getStats(render.player).hp,m.getStats(m.player).hp);
 assert.equal(render.fixed,undefined);assert.equal(render.cast,undefined);
});
test('worker screen projection matches the real isometric camera ray and terrain',async()=>{
 const{RenderThread}=await import('../src/render-thread.js');const{PerspectiveCamera,Vector3,Raycaster,Vector2}=await import('three');const{projectGround}=await import('../src/art.js');
 const oldW=globalThis.innerWidth,oldH=globalThis.innerHeight;globalThis.innerWidth=1100;globalThis.innerHeight=650;
 try{
  const camera=new PerspectiveCamera(40,1100/650,.1,700);camera.position.set(8,18,24);camera.lookAt(0,0,0);camera.updateMatrixWorld();const e=camera.matrixWorld.elements;
  const proxy=Object.create(RenderThread.prototype);proxy.camera={position:{x:8,y:18,z:24}};proxy.focus={x:0,y:0,z:0};proxy.basis={right:e.slice(0,3),up:e.slice(4,7),forward:e.slice(8,11).map(n=>-n)};
  for(const [x,y]of [[550,325],[200,200],[900,500]]){const ray=new Raycaster();ray.setFromCamera(new Vector2(x/1100*2-1,1-y/650*2),camera);const actual=proxy.screenToWorld(x,y),expected=projectGround(ray.ray);assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<.00001);}
 }finally{if(oldW===undefined)delete globalThis.innerWidth;else globalThis.innerWidth=oldW;if(oldH===undefined)delete globalThis.innerHeight;else globalThis.innerHeight=oldH;}
});
test('GPU timing never reads an unavailable result and returns leases to the fixed pool',async()=>{
 const{GpuFrameTimer}=await import('../src/gpu-frame-timer.js');let available=false,reads=0,deleted=0;
 const ext={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};const gl={QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,getExtension:()=>ext,createQuery:()=>({}),beginQuery(){},endQuery(){},getParameter:()=>false,getQueryParameter:(q,key)=>key===3?available:(reads++,25000000),deleteQuery:()=>deleted++};
 const timer=new GpuFrameTimer({getContext:()=>gl,capabilities:{isWebGL2:true}});timer.begin();timer.end();timer.poll();assert.equal(reads,0);available=true;timer.poll();assert.equal(timer.lastMs,25);assert.equal(timer.samples,1);timer.dispose();assert.equal(deleted,4);
});
test('terrain streaming discards a cancelled region before adopting the current region',async()=>{
 const{BiomePBRManager,installTerrainTextureProvider,generateBiomeTextureSet}=await import('../src/environment-pbr.js');const{DataTexture}=await import('three');
 const pending=[];installTerrainTextureProvider((biome)=>new Promise(resolve=>pending.push({biome,resolve})));
 const manager=new BiomePBRManager({splatmap:new DataTexture(new Uint8Array([255,255,255,255]),1,1),textureSize:128,workerFactory:()=>{throw Error('A baked atlas should not start a procedural worker');}});
 try{manager.activate([0]);manager.activate([1]);const old=generateBiomeTextureSet(0,{size:128});pending[0].resolve(old);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(old.disposed,true);assert.equal(pending[1].biome,1);const current=generateBiomeTextureSet(1,{size:128});pending[1].resolve(current);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(manager.cache.has(0),false);assert.equal(manager.cache.get(1),current);manager.dispose();assert.equal(current.disposed,true);}
 finally{manager.dispose();installTerrainTextureProvider(null);}
});
test('team combat still downs for 25s, while explicit server surrender settles immediately once',async()=>{
 const{Room,AuthoritativeMatch}=await import('../server/room.js');const load={hero:0,branch:0,rings:[0,0],bones:[],supports:[],mode:'duo',brought:200};
 const combat=new Match(load,R.newProfile());combat.kill(combat.player,{team:-1,kind:'beast'});assert.equal(combat.player.alive,true);assert.equal(combat.player.downedUntil,25);
 const room=Object.create(Room.prototype),transfers=[];room.id='test-room';room.persist=async()=>{};room.transfer=async(actor,receipt)=>{transfers.push(receipt);};
 const match=new AuthoritativeMatch(load,room);room.match=match;match.player.accountId='account';room.players=new Map([['account',{accountId:'account',actorId:match.player.id,lastSeq:0}]]);
 await room.input('account',{seq:1,type:'action',action:'surrender'});await room.input('account',{seq:2,type:'action',action:'surrender'});
 assert.equal(match.player.alive,false);assert.equal(transfers.length,1);assert.equal(transfers[0].tb,100);assert.equal(transfers[0].outcome,'death');
});
