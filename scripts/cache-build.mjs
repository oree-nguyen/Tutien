import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const entries = [];
async function walk(dir = "") {
  for (const e of await readdir("dist/" + dir, { withFileTypes: true })) {
    const p = dir + e.name;
    if (e.isDirectory()) await walk(p + "/");
    else if (e.name !== "sw.js") entries.push(p);
  }
}
await walk();
const hash = createHash("sha256");
for (const p of entries) hash.update(await readFile("dist/" + p));
const cache = "hon-gioi-" + hash.digest("hex").slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const FILES=${JSON.stringify(entries)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(p=>new URL(p,self.registration.scope).href))));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hon-gioi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;try{return await fetch(event.request);}catch{return event.request.mode==='navigate'?(await cache.match(new URL('index.html',self.registration.scope).href)):Response.error();}}));});
`,
);
console.log("Offline precache generated:", entries.length, "assets.");
