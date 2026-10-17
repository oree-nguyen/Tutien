import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='test-results/manual-h01';await mkdir(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],models=[];
const page=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true,isMobile:true,deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
page.on('response',r=>{if(r.url().includes('/models/h01-c0/'))models.push({path:new URL(r.url()).pathname,status:r.status()});});
const state=()=>page.evaluate(()=>{
 const world=window.__HON_GIOI__.world;const result=[];
 world.preview?.traverse(n=>{if(n.userData.manualAsset)result.push(n.userData.manualAsset);});
 return result;
});
try{
 await page.goto((process.env.GAME_URL??'http://127.0.0.1:5173')+'?renderer=main');
 await page.waitForFunction(()=>window.__HON_GIOI__);
 await page.waitForFunction(()=>{let ready=false;window.__HON_GIOI__?.world?.preview?.traverse(n=>{if(n.userData.manualAsset?.status==='loaded')ready=true;});return ready;},null,{timeout:90000});
 await page.waitForFunction(()=>window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0')?.userData.manualAsset.animation==='Idle',null,{timeout:30000});
 assert.equal((await state())[0].source,'a93d658b-a40d-4854-b755-ad1fa9bcc79b');
 const rig = await page.evaluate(async()=>{
   const root=window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0');
   let skinned=0;root.traverse(n=>{if(n.isSkinnedMesh)skinned++;});
   return {skinned,clips:root.userData.manualAsset.clips,animation:root.userData.manualAsset.animation,
     weaponParent:root.getObjectByName('Staff_Root').parent.name};
 });
 assert.ok(rig.skinned>0);
 assert.deepEqual(rig.clips.slice().sort(),['Attack','Cast','Dash','Entrance','Idle','Run']);
 assert.equal(rig.weaponParent,'RightHand_WeaponSocket');
 assert.equal(rig.animation,'Idle');
 await page.screenshot({path:directory+'/hub-full.png'});
 await page.locator('#showcaseFace').tap();
 await page.waitForTimeout(200);
 await page.screenshot({path:directory+'/hub-face.png'});
 await page.locator('#showcaseFull').tap();
 await page.locator('[data-hero="4"]').tap();
 await page.waitForFunction(()=>window.__HON_GIOI__?.world?.preview && !window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0'));
 await page.locator('[data-hero="0"]').tap();
 await page.waitForFunction(()=>{let ready=false;window.__HON_GIOI__?.world?.preview?.traverse(n=>{if(n.userData.manualAsset?.status==='loaded')ready=true;});return ready;},null,{timeout:60000});
 await page.locator('#start').tap();
 await page.waitForFunction(()=>window.__HON_GIOI__.match?.player);
 await page.waitForFunction(()=>{
  const game=window.__HON_GIOI__,model=game.world.models.get(game.match.player.id);let loaded=false;
  model?.lod.traverse(n=>{if(n.userData.manualAsset?.status==='loaded')loaded=true;});return loaded;
 },null,{timeout:60000});
 const before=await page.evaluate(()=>({x:window.__HON_GIOI__.match.player.x,z:window.__HON_GIOI__.match.player.z}));
 const box=await page.locator('#joystickZone').boundingBox();
 const x=box.x+Math.min(90,box.width/2),y=box.y+box.height/2;
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+55,y,id:1}]});
 await page.waitForTimeout(600);
 const running = await page.evaluate(()=>{
  const game=window.__HON_GIOI__;let state;
  game.world.models.get(game.match.player.id).lod.traverse(n=>{if(n.userData.manualAsset?.status==='loaded')state=n.userData.manualAsset.animation;});return state;
 });
 assert.equal(running,'Run');
 await page.screenshot({path:directory+'/running.png'});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>({x:window.__HON_GIOI__.match.player.x,z:window.__HON_GIOI__.match.player.z}));
 assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>0.05,'Imported actor still moves through gameplay controls');
 await page.locator('[data-skill="4"]').tap();
 const dashReady=await page.evaluate(()=>window.__HON_GIOI__.match.player.cooldowns[4]>0);
 assert.equal(dashReady,true,'Linh Bộ remains playable with the imported body');
 await page.screenshot({path:directory+'/battle.png'});
 assert.deepEqual(errors,[]);
 assert.ok(models.some(r=>r.path.endsWith('mobile-gpu.glb')&&r.status===200));
 const activeDetails=await page.evaluate(()=>window.__HON_GIOI__.world.models.get(window.__HON_GIOI__.match.player.id).lod.levels.map(l=>l.object.userData.detail));
 assert.ok(activeDetails.includes('mobile'));assert.equal(activeDetails.includes('high'),false,'Balanced player must reuse the prepared mobile visual');
 await writeFile(directory+'/report.json',JSON.stringify({passed:true,models,errors,playerMoved:true,joystickTouch:true,dashSkill:true,rigged:true,rig,runAnimation:true,scope:'Chromium software WebGL and mobile viewport only; no physical Android/FPS acceptance'},null,2));
 console.log('Manual H01: packaged model loaded in full/face hub and battle, hero switching/movement passed.');
}finally{await browser.close();}
