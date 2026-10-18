import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/perf-audit/phase4-visual';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{for(const baked of [false,true]){
 const context=await browser.newContext({viewport:{width:1280,height:760},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true};});page.on('pageerror',e=>errors.push(e.message));
 if(!baked)await page.route('**/art/character-baked/**',r=>r.fulfill({status:503,body:'Force unchanged procedural reference'}));
 await page.goto((process.env.GAME_URL??'http://127.0.0.1:5175')+'?renderer=main&perf=1');await page.locator('[data-hero="4"]').tap();
 await page.waitForFunction(()=>window.__HON_GIOI__?.world?.previewHero?.startsWith('4:')&&!window.__HON_GIOI__.world.loadingCharacter,null,{timeout:90000});await page.waitForTimeout(1500);
 const data=await page.evaluate(()=>{
  const world=window.__HON_GIOI__.world,renderers=new Set(),maps=new Set();world.preview.traverse(n=>{for(const m of (Array.isArray(n.material)?n.material:[n.material]).filter(Boolean))if(m.userData.characterPBR){renderers.add(m.map.userData.renderer);for(const slot of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])maps.add(m[slot]);}});
  return {hero:world.previewHero,renderers:[...renderers],maps:[...maps].map(t=>({width:t.image.width,height:t.image.height,compressed:!!t.isCompressedTexture,channel:t.userData.channel})),windows:world.renderer.info.memory};
 });
 assert.deepEqual(data.renderers,[baked?'baked':'canvas2d']);assert.equal(data.maps.length,5);assert.ok(data.maps.every(t=>t.width===256&&t.height===256));assert.ok(data.maps.every(t=>t.compressed===baked));assert.deepEqual(errors,[]);
 await page.screenshot({path:out+'/'+(baked?'after-ktx2':'before-procedural')+'.png'});reports.push({baked,...data,errors});await context.close();
}await writeFile(out+'/report.json',JSON.stringify(reports,null,2)+'\n');console.log('Same H05 palette/resolution: procedural reference and 5 compressed maps both render without page errors.');}finally{await browser.close();}
