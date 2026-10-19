import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export async function entryStyles(directory, entry='index.html') {
  const manifest=JSON.parse(await fs.readFile(path.join(directory,'.vite/manifest.json'),'utf8'));
  const visited=new Set(),styles=new Set();
  function visit(key) {
    if(visited.has(key))return;
    visited.add(key);
    const item=manifest[key];
    if(!item)throw Error('Missing built entry/chunk in manifest: '+key);
    for(const dependency of item.imports??[])visit(dependency);
    for(const css of item.css??[])styles.add(css);
    for(const dependency of item.dynamicImports??[])visit(dependency);
  }
  visit(entry);
  if(!styles.size)throw Error('Game entry has no built stylesheet, including dynamic imports');
  const contents=[];
  for(const file of styles) {
    const resolved=path.resolve(directory,file),relative=path.relative(path.resolve(directory),resolved);
    if(relative.startsWith('..')||path.isAbsolute(relative)||!file.endsWith('.css'))throw Error('Non-local stylesheet: '+file);
    contents.push(await fs.readFile(resolved,'utf8'));
  }
  return contents.join('\n');
}

export function embeddedModelModule(keys, hashes) {
  for(const key of keys)if(!/^[a-z0-9-]+$/.test(key))throw Error('Invalid embedded model key: '+key);
  return `const urls={};for(const key of ${JSON.stringify(keys)})Object.defineProperty(urls,key,{enumerable:true,configurable:true,get(){const element=document.getElementById('hg-embedded-model-'+key);if(!element)throw Error('Missing embedded model: '+key);const value=element.textContent;Object.defineProperty(urls,key,{enumerable:true,value});element.remove();return value;}});export const manualHeroAssetUrls=urls;export const manualHeroAssetHashes=${JSON.stringify(hashes)};`;
}

/** Keep binary payload out of the JavaScript optimizer; preserve every source byte. */
export async function* embeddedModelBlocks(urls, hashes, directory='public') {
  const root=path.resolve(directory);
  for(const [key,url] of Object.entries(urls)) {
    if(!/^[a-z0-9-]+$/.test(key)||!url.startsWith('/'))throw Error('Non-local embedded model: '+key);
    const file=path.resolve(root,url.split('?')[0].slice(1)),relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Embedded model leaves public directory: '+key);
    const bytes=await fs.readFile(file);
    if(createHash('sha256').update(bytes).digest('hex')!==hashes[key])throw Error('Embedded model hash mismatch: '+key);
    yield '<script type="application/octet-stream" id="hg-embedded-model-'+key+'">data:model/gltf-binary;base64,'+bytes.toString('base64')+'</script>\n';
  }
}
