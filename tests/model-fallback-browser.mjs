import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/perf-audit/phase2';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:650},serviceWorkers:'block'}),events=[],errors=[];let blocked=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('[HG_PERF] '))events.push(JSON.parse(m.text().slice(10)));});
 await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true};});
 await page.route('**/models/optimized/**',route=>{blocked++;return route.fulfill({status:503,body:'Injected compressed-model outage'});});
 await page.goto((process.env.GAME_URL??'http://127.0.0.1:5175')+'?renderer=main&perf=1');
 await page.waitForFunction(()=>window.__HON_GIOI__?.world?.preview?.getObjectByName('manualHero_H01_C0')?.userData.manualAsset.status==='loaded',null,{timeout:90000});
 const state=await page.evaluate(()=>window.__HON_GIOI__.world.preview.getObjectByName('manualHero_H01_C0').userData.manualAsset);
 assert.equal(blocked,2);assert.equal(state.cache.gpuFallbacks,2);assert.equal(state.clips.length,6);assert.equal(errors.length,0);
 assert.equal(events.filter(e=>e.type==='model-fallback'||e.name==='model-fallback').length,2);
 await writeFile(out+'/fallback.json',JSON.stringify({blocked,state,events,errors},null,2)+'\n');
 console.log('Injected 503: both body and weapon used local plain GLB; 6 clips; no page errors.');
}finally{await browser.close();}
