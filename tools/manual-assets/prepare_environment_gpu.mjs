import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{spawnSync}from'node:child_process';import sharp from'sharp';
import{environmentAssetUrls}from'../../src/environment-baked-assets.js';import{barkAssetUrls}from'../../src/h01-bark-assets.js';
const executable=process.env.TOKTX??'/workspace/ktx-tools/KTX-Software-4.4.2-Linux-x86_64/bin/toktx',tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hg-env-gpu-'));
const baked={},bark={},reports=[];
try{
 for(const [style,urls]of [...Object.entries(environmentAssetUrls),['bark',barkAssetUrls]]){
  const result={};for(const [key,url]of Object.entries(urls)){
   const input=path.join(tmp,style+'-'+key+'.png'),output='public'+url.replace('.webp','.ktx2');await sharp('public'+url).png().toFile(input);
   const run=spawnSync(executable,['--t2','--encode','uastc','--uastc_quality','2','--zcmp','18','--genmipmap','--assign_oetf',key==='albedo'?'srgb':'linear','--assign_primaries','bt709','--threads','2',output,input],{encoding:'utf8'});if(run.status!==0)throw Error(run.stderr||run.error);
   result[key]=url.replace('.webp','.ktx2');const b=await fs.readFile(output);reports.push({style,key,file:output,bytes:b.length,width:b.readUInt32LE(20),height:b.readUInt32LE(24),mips:b.readUInt32LE(40)});
  }
  if(style==='bark')Object.assign(bark,result);else baked[style]=result;
 }
 await fs.writeFile('src/environment-gpu-assets.js','export const environmentGpuAssetUrls='+JSON.stringify(baked)+';\n');
 await fs.writeFile('src/h01-bark-gpu-assets.js','export const barkGpuAssetUrls='+JSON.stringify(bark)+';\n');
 await fs.writeFile('public/art/environment-baked/gpu-provenance.json',JSON.stringify({tool:'KTX-Software 4.4.2',format:'UASTC + Zstandard',reports},null,2)+'\n');console.log('Encoded',reports.length,'shared environment and bark GPU maps');
}finally{await fs.rm(tmp,{recursive:true,force:true});}
