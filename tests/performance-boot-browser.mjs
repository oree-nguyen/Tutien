import{chromium}from'playwright-core';import assert from'node:assert/strict';import{readFile,mkdir,writeFile}from'node:fs/promises';import{Match}from'../src/simulation.js';import*as R from'../src/rules.js';import{RINGS,BONES}from'../src/data.js';
const out='test-results/boot-performance';await mkdir(out,{recursive:true});const errors=[],requests=[];
const profile=R.newProfile();profile.tb=4900;profile.stash=[...RINGS.map(x=>R.loot('ring',x.id)),...BONES.map(x=>R.loot('bone',x.id))];
const fixture=new Match({hero:0,branch:0,rings:[0,0],bones:[],supports:[],mode:'solo',brought:100},profile);fixture.player.wallet.brought=80;
const saved=JSON.stringify({version:2,profile,match:fixture.snapshot()});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:650},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await page.addInitScript(data=>{if(!sessionStorage.getItem('boot-test-seeded')){localStorage.setItem('hon-gioi-save-v2',data);localStorage.setItem('activeMatch','true');sessionStorage.setItem('autoStartMatch','true');localStorage.setItem('other-service','{"phase":"battle","balance":900}');sessionStorage.setItem('boot-test-seeded','yes');}},saved);
 await page.goto(process.env.GAME_URL??'http://127.0.0.1:5175');
 await page.waitForFunction(()=>(window.__HON_GIOI__?.world?.previewAsset??window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0')?.userData.manualAsset)?.status==='loaded',null,{timeout:90000});
 await page.waitForTimeout(10000);
 const boot=await page.evaluate(async()=>{
  const app=window.__HON_GIOI__,w=app.world;
  let data;
  if(w.backend==='worker')data=await w.inspect();
  else{
   const root=w.preview.getObjectByName('manualHero_H01_C0'),body=root.getObjectByName('HunyuanBody');let material;body.traverse(n=>{if(n.isSkinnedMesh)material=n.material;});
   data={previewAsset:root.userData.manualAsset,material:{vertexColors:material.vertexColors,colorSpace:material.map.colorSpace,compressed:!!material.map.isCompressedTexture,metalness:material.metalness,emissive:material.emissiveIntensity},render:{...w.renderer.info.render},memory:{...w.renderer.info.memory},batching:w.batching};
  }
  return {backend:w.backend,lifecycle:app.lifecycle,match:app.match,profile:app.profile,save:JSON.parse(localStorage.getItem('hon-gioi-save-v2')),other:localStorage.getItem('other-service'),stale:localStorage.getItem('activeMatch'),metrics:app.boot,paints:performance.getEntriesByType('paint').map(p=>({name:p.name,start:p.startTime})),draws:data.render.calls,memory:data.memory,batching:data.batching,ratio:w.renderer.getPixelRatio(),asset:data.previewAsset,material:data.material,battlefieldReady:w.scenery.ready};
 });
 assert.equal(boot.backend,'worker','This gate must exercise the dedicated renderer, not silently fall back');
 assert.equal(boot.lifecycle.phase,'LOBBY_HON_THANH');assert.equal(boot.match,null);assert.equal(boot.profile.tb,4940);assert.equal(boot.profile.matches,1);assert.equal(boot.save.match,null);assert.equal(boot.save.activeRun,null);assert.equal(boot.stale,null);assert.equal(boot.other,'{"phase":"battle","balance":900}');assert.equal(boot.battlefieldReady,false);
 for(const selector of ['.hero-heading','.loadout-panel','#start','.hero-grid'])assert.ok(await page.locator(selector).isVisible());assert.equal(await page.locator('[data-hero]').count(),12);
 assert.equal(boot.material.vertexColors,false);assert.equal(boot.material.colorSpace,'srgb');assert.equal(boot.material.compressed,true);assert.ok(boot.material.metalness<=.05);
 assert.ok(!requests.some(p=>p.endsWith('h01-c0-high.glb')),'Balanced boot must not fetch desktop high model');
 await page.locator('#start').evaluate(el=>el.click());await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__HON_GIOI__.lifecycle.phase),'LOBBY_HON_THANH');
 await page.screenshot({path:out+'/lobby.png'});
 const phases=[];
 for(const time of [.6,1.85,3.05,3.55,4.3]){
  await page.evaluate(t=>window.__HON_GIOI__.world.seekHeroEntrance(t),time);
  await page.waitForFunction(t=>{const s=window.__HON_GIOI__.world.previewAsset?.entrance;return s?.time===t||t===4.3&&s?.complete;},time);
  const sample=await page.evaluate(()=>window.__HON_GIOI__.world.inspect());phases.push({time,pose:sample.pose,entrance:sample.previewAsset.entrance});
  if(time===1.85||time===3.55)await page.screenshot({path:out+'/phase-'+time+'.png'});
 }
 const squat=phases.find(p=>p.time===1.85);assert.ok(Math.abs(squat.pose.LeftHand_GroundSocket[1]-.025)<.005);assert.ok(Math.abs(squat.pose.RightHand_WeaponSocket[0]+.22)<.005);
 const impact=phases.find(p=>p.time===3.55);assert.ok(Math.abs(impact.pose.Staff_Base_Tip[1])<.025);
 const started=Date.now();await page.locator('#start').tap();await page.waitForFunction(()=>window.__HON_GIOI__.lifecycle.phase==='IN_MATCH',null,{timeout:120000});
 const loadingMs=Date.now()-started;
 await page.waitForFunction(()=>!!document.querySelector('#exitGame'));
 const before=await page.evaluate(()=>window.__HON_GIOI__.match.player.x);await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');
 assert.ok(await page.evaluate(x=>window.__HON_GIOI__.match.player.x>x+.05,before),'Movement must remain active with the renderer in a worker');
 await page.locator('[data-skill="4"]').tap();assert.ok(await page.evaluate(()=>window.__HON_GIOI__.match.player.cooldowns[4]>0));
 await page.locator('.hud-options summary').tap();await page.locator('#pause').tap();
 let terrain;for(let i=0;i<80;i++){const actual=await page.evaluate(()=>window.__HON_GIOI__.world.inspect());terrain=actual.terrain;if(terrain?.gpuCompressedBiomes===1)break;await page.waitForTimeout(100);}
 assert.equal(terrain?.textureSize,1024);assert.equal(terrain?.gpuCompressedBiomes,1,'The live region must use the actual compressed atlas');
await page.locator('#exitGame').tap();await page.locator('#confirmExit').tap();await page.locator('#backHub').waitFor({timeout:15000});await page.locator('#backHub').tap();
 assert.equal(await page.evaluate(()=>window.__HON_GIOI__.world.scenery.ready),false);
 const cancelledBank=await page.evaluate(()=>window.__HON_GIOI__.profile.tb);
 await page.locator('#start').tap();await page.evaluate(()=>{window.dispatchEvent(new Event('hon-gioi-native-pause'));window.dispatchEvent(new Event('hon-gioi-native-resume'));});
 await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__HON_GIOI__.lifecycle.phase),'LOBBY_HON_THANH');assert.equal(await page.evaluate(()=>window.__HON_GIOI__.profile.tb),cancelledBank);
 await page.reload();await page.waitForFunction(()=>window.__HON_GIOI__?.world,null,{timeout:90000});await page.waitForTimeout(10000);
 assert.equal(await page.evaluate(()=>window.__HON_GIOI__.lifecycle.phase),'LOBBY_HON_THANH');assert.equal(await page.evaluate(()=>window.__HON_GIOI__.match),null);assert.deepEqual(errors,[]);
 const fcp=boot.paints.find(p=>p.name==='first-contentful-paint')?.start??null;const longTasks=boot.metrics.longTasks??[];
 assert.ok(longTasks.every(t=>t.duration<=150),'Renderer loading must not block the UI thread for >150ms');
 const report={passed:true,functionalPassed:true,boot,matchLoadingMs:loadingMs,phases,terrain,errors,requests,performanceTargets:{fcpMs:fcp,fcpUnder200:fcp!==null&&fcp<200,maxLongTaskMs:Math.max(0,...longTasks.map(t=>t.duration)),noTaskOver150:longTasks.every(t=>t.duration<=150)},physicalAndroidTested:false,fullPerformanceAccepted:false,scope:'Functional and measured cloud Chromium SwiftShader results. GPU shader/driver blocking is included; no native equivalence or device FPS claim.'};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,performanceTargets:report.performanceTargets,draws:boot.draws,batching:boot.batching,memory:boot.memory,loadMs:boot.asset.loadMs}));
}finally{await browser.close();}
