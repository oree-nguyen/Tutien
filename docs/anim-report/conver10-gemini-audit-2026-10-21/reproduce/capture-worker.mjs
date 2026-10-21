import fs from 'node:fs/promises';import path from'node:path';import http from'node:http';import{chromium}from'playwright-core';import{createHash}from'node:crypto';
const output='docs/anim-report/conver10-gemini-audit-2026-10-21',root=path.resolve('.local/audit-apk-ba97bec3');await fs.mkdir(output,{recursive:true});const expected=JSON.parse(await fs.readFile('release/build-provenance.json'));
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.ktx2':'image/ktx2','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let data,file;if(pathname==='/audit/three.module.js')file='node_modules/three/build/three.module.js';else if(pathname==='/audit/SkeletonUtils.js'){data=Buffer.from((await fs.readFile('node_modules/three/examples/jsm/utils/SkeletonUtils.js','utf8')).replaceAll("from 'three'","from './three.module.js'"));file='helper.js';}else if(pathname==='/audit/studio.js')file='docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/studio.mjs';else{file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('Unsafe path');}data??=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':data.length});res.end(data);}catch(e){res.writeHead(404);res.end('Not found');}});await new Promise(r=>server.listen(5221,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1280,height:576},deviceScaleFactor:1,hasTouch:true,serviceWorkers:'allow'}),page=await context.newPage();

const report={scope:'Read-only corrected worker audit with matching hero ID, loaded body and loaded original source before capture; exact APK.',apk:expected,worker:[],screenshots:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const save=async()=>fs.writeFile(output+'/worker-verified-evidence.json',JSON.stringify(report,null,2)+'\n');
async function shot(name,meta){const file=output+'/'+name,capturedAt=new Date().toISOString();await page.screenshot({path:file,timeout:120000});report.screenshots.push({file,capturedAt,...meta});await save();}
try{
 await page.goto('http://127.0.0.1:5221/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__HON_GIOI__?.world,{timeout:240000});
 for(const h of[0,1]){
  if(h)await page.locator('[data-hero="1"]').click();
  await page.waitForFunction(h=>{const w=window.__HON_GIOI__.world,a=w.previewAsset;return a?.id===(h?'H02-C0':'H01-C0')&&a.status==='loaded'&&a.sourceFidelity?.status==='loaded'&&!w.loadingCharacter;},h,{timeout:300000});
  console.log('Fully loaded matching hero',h);
  if(await page.evaluate(()=>!!window.__HON_GIOI__.world.showcaseAnimationMode))await page.locator('#showcaseMotion').click();
  await page.evaluate(async()=>await window.__HON_GIOI__.world.seekHeroEntrance(3.05));await shot(`worker-verified-H0${h+1}-default.png`,{hero:h,mode:'default'});
  await page.evaluate(()=>{const w=window.__HON_GIOI__.world;window.__auditWorkerMessages=[];const original=w.worker.postMessage.bind(w.worker);w.worker.postMessage=(message,...args)=>{window.__auditWorkerMessages.push({type:message.type,method:message.method,args:message.args,appearanceKeys:message.appearance?Object.keys(message.appearance):undefined});return original(message,...args);};});
  await page.locator('#showcaseMotion').click();await page.evaluate(async()=>await window.__HON_GIOI__.world.seekHeroEntrance(3.05));
  const data=await page.evaluate(async()=>{const w=window.__HON_GIOI__.world;return{backend:w.backend,uiProxyFlag:w.showcaseAnimationMode,button:document.querySelector('#showcaseMotion').textContent,diagnostic:await w.inspect(),messages:window.__auditWorkerMessages,sourceHash:window.__HON_GIOI__.build.sourceHash};});report.worker.push({hero:h,...data});await shot(`worker-verified-H0${h+1}-motion-button.png`,{hero:h,mode:'requested-animation'});console.log('Verified',h,data.backend,data.diagnostic.previewAsset.status);
 }
 report.complete=true;await save();
}finally{await save();await browser.close();await new Promise(r=>server.close(r));}
