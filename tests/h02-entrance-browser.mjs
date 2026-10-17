import{chromium}from'playwright-core';import assert from'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const out='test-results/h02-entrance';await mkdir(out,{recursive:true});const errors=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:760},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
 await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');await page.waitForFunction(()=>window.__HON_GIOI__?.world?.previewAsset?.status==='loaded',null,{timeout:90000});await page.locator('[data-hero="1"]').tap();
 await page.waitForFunction(()=>window.__HON_GIOI__?.world?.previewAsset?.id==='H02-C0'&&window.__HON_GIOI__.world.previewAsset.status==='loaded',null,{timeout:120000});
 const samples=[];
 for(const time of [0,.3,.65,2.15,2.45,2.65,2.82,3.5,4.2,4.65,5.1,5.7]){
  await page.evaluate(t=>window.__HON_GIOI__.world.seekHeroEntrance(t),time);
  await page.waitForFunction(t=>{const e=window.__HON_GIOI__.world.previewAsset?.entrance;return e?.time===t;},time,{timeout:15000});
  const data=await page.evaluate(()=>window.__HON_GIOI__.world.inspect());samples.push({time,pose:data.pose,asset:data.previewAsset,material:data.material});
  await page.screenshot({path:out+'/phase-'+time+'.png'});
 }
 console.log(JSON.stringify({phases:samples.length,firstImpact:samples.find(s=>s.time===.65).pose.Hammer_Head_Impact,stamp:samples.find(s=>s.time===5.1).pose.Hammer_Base_Tip,gripError:samples.find(s=>s.time===4.65).asset.entrance.rightGripError}));
 await writeFile(out+'/inspection.json',JSON.stringify({samples,errors},null,2));
 assert.deepEqual(errors,[]);assert.ok(samples.every(s=>s.material.compressed));
 const a=samples.find(s=>s.time===.65),b=samples.find(s=>s.time===5.1);assert.ok(Math.abs(a.pose.Hammer_Head_Impact[1])<.03);assert.ok(Math.abs(b.pose.Hammer_Base_Tip[1])<.03);
 assert.equal(samples.find(s=>s.time===3.5).asset.entrance.gripped,true);assert.ok(samples.find(s=>s.time===4.65).asset.entrance.rightGripError<.03);
 await page.evaluate(()=>window.__HON_GIOI__.world.rotateShowcase(Math.PI));await page.waitForTimeout(500);await page.screenshot({path:out+'/back.png'});await page.evaluate(()=>window.__HON_GIOI__.world.rotateShowcase(-Math.PI));
 await page.locator('#showcaseFace').tap();await page.waitForTimeout(500);await page.screenshot({path:out+'/face.png'});assert.equal((await page.evaluate(()=>window.__HON_GIOI__.world.inspect())).weapon.visible,false);await page.locator('#showcaseFull').tap();await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>window.__HON_GIOI__.world.inspect())).weapon.visible,true);
 await page.locator('#start').tap();await page.waitForFunction(()=>window.__HON_GIOI__.lifecycle.phase==='IN_MATCH',null,{timeout:120000});
 const before=await page.evaluate(()=>window.__HON_GIOI__.match.player.x);await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');assert.ok(await page.evaluate(x=>window.__HON_GIOI__.match.player.x>x+.05,before));
 await page.locator('[data-skill="4"]').tap();assert.ok(await page.evaluate(()=>window.__HON_GIOI__.match.player.cooldowns[4]>0));
 await page.locator('.hud-options summary').tap();await page.locator('#exitGame').tap();await page.locator('#confirmExit').tap();await page.locator('#backHub').waitFor({timeout:15000});await page.locator('#backHub').tap();
 await page.waitForFunction(()=>window.__HON_GIOI__.world.previewAsset?.id==='H02-C0'&&window.__HON_GIOI__.world.previewAsset.status==='loaded');
 let offline=false;if(new URL(page.url()).port==='5175'){await page.evaluate(()=>navigator.serviceWorker.ready);await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('hon-gioi-manual-assets-v1');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,t=d.transaction('glb','readwrite');t.objectStore('glb').clear();t.oncomplete=()=>{d.close();resolve();};};}));await page.context().setOffline(true);await page.reload();await page.waitForFunction(()=>window.__HON_GIOI__?.world?.previewAsset?.status==='loaded',null,{timeout:90000});await page.locator('[data-hero="1"]').tap();await page.waitForFunction(()=>window.__HON_GIOI__.world.previewAsset?.id==='H02-C0'&&window.__HON_GIOI__.world.previewAsset.status==='loaded',null,{timeout:90000});offline=true;}
 assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,samples,errors,offline,physicalAndroidTested:false,scope:'Actual two supplied Hunyuan GLBs, rigged mesh, render-worker entrance and gameplay; cloud Chromium SwiftShader.'},null,2));console.log('H02 entrance and runtime passed.');
}finally{await browser.close();}
