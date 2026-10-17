import{readdir,readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
// A new native entry bypasses service workers installed by earlier APKs.
await writeFile('dist/startup.html',await readFile('dist/index.html'));
const entries=[];async function walk(dir=''){for(const e of await readdir('dist/'+dir,{withFileTypes:true})){const p=dir+e.name;if(e.isDirectory())await walk(p+'/');else if(e.name!=='sw.js')entries.push(p);}}
await walk();const hash=createHash('sha256');for(const p of entries)hash.update(await readFile('dist/'+p));const cache='hon-gioi-'+hash.digest('hex').slice(0,12);
const core=entries.filter(p=>['index.html','manifest.json','icon.svg'].includes(p)||(/^assets\/[^/]+\.(js|css)$/.test(p)&&!/^assets\/(world|three|meshopt-worker)-/.test(p)));
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(cache)},FILES=${JSON.stringify(entries)},CORE=${JSON.stringify(core)};
const allowed=new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(p=>new URL(p,self.registration.scope).href))));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hon-gioi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);url.search='';if(event.request.mode==='navigate'&&url.pathname.endsWith('/'))url.pathname+='index.html';if(!allowed.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(url.href);if(cached)return cached;try{const response=await fetch(event.request);if(response.ok)await cache.put(url.href,response.clone());return response;}catch{return event.request.mode==='navigate'?(await cache.match(new URL('index.html',self.registration.scope).href)):Response.error();}}));});
`);
console.log('Offline shell precache:',core.length,'assets. Models, textures and dynamic chunks cache only when requested.');
