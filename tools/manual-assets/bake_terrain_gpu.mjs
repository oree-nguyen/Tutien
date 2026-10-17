import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{spawnSync}from'node:child_process';import sharp from'sharp';import{rasterBiomePixels,BIOME_SURFACES}from'../../src/environment-pbr.js';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hg-biome-')),folder='public/art/terrain-gpu',executable=process.env.TOKTX??'/workspace/ktx-tools/KTX-Software-4.4.2-Linux-x86_64/bin/toktx';await fs.mkdir(folder,{recursive:true});const urls=[],report=[];
try{for(let biome=0;biome<7;biome++){
 const pixels=rasterBiomePixels(biome,1024,BIOME_SURFACES[biome]),entry={};
 for(const key of ['albedo','normal','roughnessHeight','emissive']){
  const input=path.join(tmp,key+'.png'),file=biome+'-'+key+'.ktx2',output=folder+'/'+file;
  await sharp(Buffer.from(pixels[key].buffer),{raw:{width:1024,height:1024,channels:4}}).png().toFile(input);
  const run=spawnSync(executable,['--t2','--encode','uastc','--uastc_quality','2','--uastc_rdo_l','1','--zcmp','18','--genmipmap','--assign_oetf',['albedo','emissive'].includes(key)?'srgb':'linear','--assign_primaries','bt709','--threads','2',output,input],{encoding:'utf8'});if(run.status!==0)throw Error(run.stderr||run.error);
  entry[key]='/art/terrain-gpu/'+file;const bytes=await fs.readFile(output);report.push({biome,key,file,bytes:bytes.length,width:bytes.readUInt32LE(20),height:bytes.readUInt32LE(24),mips:bytes.readUInt32LE(40)});
 }
 urls.push(entry);console.log('Baked biome',biome);
}
await fs.writeFile('src/terrain-gpu-assets.js','export const terrainGpuAssetUrls='+JSON.stringify(urls)+';\n');await fs.writeFile(folder+'/provenance.json',JSON.stringify({tool:'KTX-Software 4.4.2',resolution:1024,lossy:true,report},null,2)+'\n');
}finally{await fs.rm(tmp,{recursive:true,force:true});}
