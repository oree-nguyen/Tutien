import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='test-results/h01-entrance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:650},hasTouch:true});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
const ready=async()=>{
 try{await page.waitForFunction(()=>{const root=window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0');return root?.userData.manualAsset.status==='loaded';},null,{timeout:45000});}
 catch(error){console.log('LOAD FAILURE',await page.evaluate(()=>window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0')?.userData.manualAsset),errors);throw error;}
};
const frame=async time=>{
 await page.evaluate(t=>window.__HON_GIOI__.world.seekHeroEntrance(t),time);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.evaluate(()=>{
  const root=window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0'),body=root.getObjectByName('HunyuanBody');
  const point=node=>{const p=node.getWorldPosition(body.position.clone());body.worldToLocal(p);return p.toArray();};
  const staff=body.getObjectByName('Staff_Root'),socket=body.getObjectByName('RightHand_WeaponSocket');
  const a=staff.getWorldPosition(body.position.clone()),b=socket.getWorldPosition(body.position.clone());
  return {state:root.userData.manualAsset,staffParent:staff.parent.name,gripDistance:a.distanceTo(b),tip:point(staff.getObjectByName('Staff_Base_Tip')),hips:point(body.getObjectByName('Hips')),leftHand:point(body.getObjectByName('LeftHand')),leftPalm:point(body.getObjectByName('LeftHand_GroundSocket')),
   vinePbr:(()=>{const m=body.getObjectByName('H01_EntranceVFX')?.children[0];return m?{triangles:m.geometry.index.count/3,standard:m.material.isMeshStandardMaterial,maps:['map','normalMap','roughnessMap'].map(k=>m.material[k]?.image.width)}:null;})(),
   fingers:body.getObjectByName('RightHandIndex1').quaternion.toArray(),fidelity:body.userData.fidelity,material:body.getObjectByProperty('isSkinnedMesh',true).material.normalScale.toArray(),battlefieldReady:window.__HON_GIOI__.world.scenery.ready};
 });
};
try{
 const start=Date.now();await page.goto((process.env.GAME_URL??'http://127.0.0.1:5173')+'?renderer=main');const documentMs=Date.now()-start;await ready();const assetMs=Date.now()-start;
 await page.evaluate(()=>window.__HON_GIOI__.world.replayHeroEntrance());
 const samples=[];
 for(const t of [0,.6,1.45,1.85,2.5,3.05,3.55,4.3]){
  const data=await frame(t);samples.push({time:t,...data});
  await page.screenshot({path:`${out}/phase-${t.toFixed(2)}.png`});
  if(t===1.85){
   await page.evaluate(()=>{window.__HON_GIOI__.world.showcaseYaw+=Math.PI/2;});await page.waitForTimeout(300);
   await page.screenshot({path:out+'/crouch-profile.png'});
   await page.evaluate(()=>{window.__HON_GIOI__?.world?.preview?.getObjectByName('H01_EntranceVFX').traverse(n=>{if(n.material)n.material.visible=false;});});
   await page.screenshot({path:out+'/crouch-profile-pose.png'});
   await page.evaluate(()=>{window.__HON_GIOI__?.world?.preview?.getObjectByName('H01_EntranceVFX').traverse(n=>{if(n.material)n.material.visible=true;});});
   await page.evaluate(()=>{window.__HON_GIOI__.world.showcaseYaw-=Math.PI/2;});await page.waitForTimeout(300);
   await page.locator('#showcaseFace').tap();await page.waitForTimeout(400);
   await page.screenshot({path:out+'/crouch-face.png'});
   const pose=await page.evaluate(()=>({time:window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0').userData.manualAsset.entrance.time,y:window.__HON_GIOI__.world.camera.position.y}));
   assert.equal(pose.time,1.85);assert.ok(pose.y>.74);
   await page.locator('#showcaseFull').tap();await page.waitForTimeout(400);
  }
 }
 const grip=samples.find(s=>s.time===3.05),impact=samples.find(s=>s.time===3.55);
 const squat=samples.find(s=>s.time===1.45);assert.deepEqual(squat.vinePbr,{triangles:32000,standard:true,maps:[1024,1024,1024]});assert.ok(Math.abs(squat.hips[1]-.16)<.005);assert.ok(Math.abs(squat.leftPalm[1]-.025)<.005);
 assert.equal(grip.staffParent,'RightHand_WeaponSocket');assert.ok(grip.gripDistance<.005);
 assert.ok(Math.abs(impact.tip[1])<.025,'Staff tip must touch the stage at frame 213');
 console.log('Pose diagnostics',JSON.stringify(samples.map(s=>({t:s.time,hips:s.hips,leftHand:s.leftHand,tip:s.tip,meta:s.state.entrance}))));
 assert.equal(samples[0].battlefieldReady,false,'Map must not build during first hub load');
 assert.ok(grip.fidelity.studioIBL&&grip.fidelity.srgb);
 const oldCounts=await page.evaluate(()=>{const s=window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0').userData.manualAsset;return {grip:s.gripEvents,impact:s.impactEvents};});
 await page.evaluate(()=>window.__HON_GIOI__.world.replayHeroEntrance());
 const skipped=await frame(4.3);
 assert.equal(skipped.state.gripEvents,oldCounts.grip+1);assert.equal(skipped.state.impactEvents,oldCounts.impact+1);
 await page.locator('#showcaseFace').tap();await page.waitForTimeout(500);await page.screenshot({path:out+'/face.png'});
 await page.locator('#showcaseFull').tap();await page.waitForTimeout(500);
 await page.reload();await ready();const cached=await page.evaluate(()=>window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0').userData.manualAsset.cache);
 console.log('Cache diagnostics',JSON.stringify(cached));
 assert.ok(cached.hits>=2,'Both body and staff must load from validated IndexedDB buffers');
 assert.ok(cached.worker.decoded>0&&cached.worker.fallbacks===0);
 let offline=false;
 if(new URL(page.url()).port==='5175'){
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('hon-gioi-manual-assets-v1');request.onerror=()=>reject(Error('Cache open failed'));request.onsuccess=()=>{const database=request.result;const tx=database.transaction('glb','readwrite');tx.objectStore('glb').clear();tx.oncomplete=()=>{database.close();resolve();};};}));
  await page.context().setOffline(true);await page.reload();await ready();offline=true;
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,documentMs,assetMs,samples,cached,offline,errors,scope:'Chromium SwiftShader on cloud CPU. Not Android FPS certification.'},null,2));
 console.log(JSON.stringify({passed:true,documentMs,assetMs,cached,samples:samples.map(s=>({t:s.time,hips:s.hips,leftHand:s.leftHand,tip:s.tip,gripDistance:s.gripDistance}))}));
}finally{await browser.close();}
