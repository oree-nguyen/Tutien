import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import{createHash}from'node:crypto';
import{NodeIO}from'@gltf-transform/core';import{ALL_EXTENSIONS,KHRTextureBasisu}from'@gltf-transform/extensions';import{MeshoptDecoder,MeshoptEncoder}from'meshoptimizer';import sharp from'sharp';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const executable=process.env.TOKTX??'/workspace/ktx-tools/KTX-Software-4.4.2-Linux-x86_64/bin/toktx';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'honyuan-gpu-'));const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});const reports=[];
try{
 for(const [family,detail,key]of[['h01-c0','mobile','mobile-gpu'],['h01-staff','medium','staff-medium-gpu']]){
  const prefix='public/models/'+family,source=JSON.parse(await fs.readFile(prefix+'/provenance.json')).levels.find(l=>l.detail===detail);
  const document=await io.read(prefix+'/'+source.file),root=document.getRoot();const colorTextures=new Set(root.listMaterials().flatMap(m=>[m.getBaseColorTexture(),m.getEmissiveTexture()]).filter(Boolean));
  let i=0;const textures=[];
  for(const texture of root.listTextures()){
   const base=path.join(tmp,family+'-'+i++),input=base+'.png',output=base+'.ktx2';await sharp(texture.getImage()).png().toFile(input);
   const srgb=colorTextures.has(texture);const args=['--t2','--encode','uastc','--uastc_quality','2','--uastc_rdo_l','1','--zcmp','18','--genmipmap','--assign_oetf',srgb?'srgb':'linear','--assign_primaries','bt709','--threads','2',output,input];
   const run=spawnSync(executable,args,{encoding:'utf8'});if(run.status!==0)throw Error(run.stderr||run.error||'toktx failed');
   const image=await fs.readFile(output);texture.setImage(image).setMimeType('image/ktx2');textures.push({bytes:image.length,colorSpace:srgb?'srgb':'linear',width:image.readUInt32LE(20),height:image.readUInt32LE(24),mipLevels:image.readUInt32LE(40)});
  }
  document.createExtension(KHRTextureBasisu).setRequired(true);
  const file=family+'-'+detail+'-gpu.glb';await io.write(prefix+'/'+file,document);const bytes=await fs.readFile(prefix+'/'+file);reports.push({key,file,family,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles:source.triangles,sourceSha256:source.sha256,textures,format:'KTX2 UASTC + Zstandard; transcodes in one Basis worker to supported GPU blocks',lossy:true});
 }
 const {manualHeroAssetUrls:urls,manualHeroAssetHashes:hashes}=await import('../../src/manual-hero-assets.js?gpu='+Date.now());for(const r of reports){urls[r.key]='/models/'+r.family+'/'+r.file+'?v='+r.sha256.slice(0,12);hashes[r.key]=r.sha256;}
 await fs.writeFile('src/manual-hero-assets.js','export const manualHeroAssetUrls='+JSON.stringify(urls,null,2)+';\nexport const manualHeroAssetHashes='+JSON.stringify(hashes,null,2)+';\n');
 await fs.writeFile('public/models/gpu-texture-provenance.json',JSON.stringify({tool:'KTX-Software 4.4.2',reports},null,2)+'\n');console.log(JSON.stringify(reports,null,2));
}finally{await fs.rm(tmp,{recursive:true,force:true});}
