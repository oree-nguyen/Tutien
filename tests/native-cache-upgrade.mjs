import{createServer}from'node:http';import fs from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import{chromium}from'playwright-core';import*as R from'../src/rules.js';
const base=path.resolve('dist');const server=createServer(async(req,res)=>{
 const name=new URL(req.url,'http://local').pathname;
 if(name==='/legacy-sw.js'){res.setHeader('Content-Type','text/javascript');res.end("self.addEventListener('install',e=>e.waitUntil(caches.open('hon-gioi-legacy-test').then(c=>c.put('/index.html',new Response('<html><body>OLD APK CACHE</body></html>',{headers:{'Content-Type':'text/html'}}))).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(c=>c||fetch(e.request))));");return;}
 if(name==='/setup.html'){res.setHeader('Content-Type','text/html');res.end('<html><body>Cache fixture</body></html>');return;}
 try{const file=path.resolve(base,'.'+decodeURIComponent(name==='/'?'/index.html':name));if(!file.startsWith(base+path.sep))throw Error('Invalid path');const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:650}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.HongioiNativeSecurity={};});await page.goto(url+'/setup.html');
 const profile=R.newProfile();profile.tb=6123;profile.nb=1234;await page.evaluate(profile=>{localStorage.setItem('hon-gioi-save-v2',JSON.stringify({version:3,profile,activeRun:null,match:null}));},profile);
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/legacy-sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await page.goto(url+'/index.html');assert.match(await page.locator('body').innerText(),/OLD APK CACHE/);
 await page.goto(url+'/startup.html');await page.waitForFunction(()=>window.__HON_GIOI__?.profile?.tb===6123,null,{timeout:45000});
 const result=await page.evaluate(async()=>({tb:window.__HON_GIOI__.profile.tb,nb:window.__HON_GIOI__.profile.nb,phase:window.__HON_GIOI__.lifecycle.phase,registrations:(await navigator.serviceWorker.getRegistrations()).length,caches:await caches.keys()}));
 assert.equal(result.tb,6123);assert.equal(result.nb,1234);assert.equal(result.phase,'LOBBY_HON_THANH');assert.equal(result.registrations,0);assert.ok(!result.caches.some(k=>k.startsWith('hon-gioi-')));assert.deepEqual(errors,[]);
 await fs.mkdir('test-results/boot-performance',{recursive:true});await fs.writeFile('test-results/boot-performance/native-cache-upgrade.json',JSON.stringify({passed:true,result,scope:'Chromium simulation of a legacy native-origin service worker; not a physical Android test.'},null,2));console.log('Legacy cache was bypassed; native boot removed only app caches and preserved both wallet balances.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
