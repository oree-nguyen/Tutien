import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
for(const folder of (process.argv.includes('--body-only')?['h01-c0']:process.argv.includes('--staff-only')?['h01-staff']:['h01-c0','h01-staff'])) {
 const path=`public/models/${folder}`,receipt=JSON.parse(await fs.readFile(path+'/provenance.json'));
 for(const level of receipt.levels) {
  if(level.detail==='mobile')continue;
  const file=path+'/'+level.file;
  const document=await io.read(file);
  const size=folder==='h01-c0'?(level.detail==='high'?2048:level.detail==='medium'?512:256):(level.detail==='high'?1024:level.detail==='medium'?512:256);
  const dataSize=Math.min(size,1024);
  await document.transform(dedup(),resample(),prune({keepLeaves:true}),
    textureCompress({encoder:sharp,targetFormat:'webp',slots:/baseColorTexture|emissiveTexture/,resize:[size,size],quality:90,effort:4}),
    textureCompress({encoder:sharp,targetFormat:'webp',slots:/normalTexture|metallicRoughnessTexture|occlusionTexture/,resize:[dataSize,dataSize],quality:92,effort:4}),
    meshopt({encoder:MeshoptEncoder,level:'medium'}));
  level.textureResolution=size;level.dataTextureResolution=dataSize;
  await io.write(file,document);
  const raw=await fs.readFile(file);level.bytes=raw.length;level.sha256=createHash('sha256').update(raw).digest('hex');level.compression='EXT_meshopt_compression + EXT_texture_webp';
  console.log(folder,level.detail,raw.length);
 }
 await fs.writeFile(path+'/provenance.json',JSON.stringify(receipt,null,2)+'\n');
}
await fs.copyFile('public/models/h01-c0/h01-c0-high.glb','assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb');
const body=JSON.parse(await fs.readFile('public/models/h01-c0/provenance.json'));
await fs.writeFile('assets/base_models/H01-C0-import.json',JSON.stringify({...body,bankFileIsPreparedDerivative:true,rawSourcePreservedLocally:true},null,2)+'\n');
const urls={},hashes={};
for(const folder of ['h01-c0','h01-staff']) {
 const receipt=JSON.parse(await fs.readFile(`public/models/${folder}/provenance.json`));
 for(const level of receipt.levels){const key=folder==='h01-c0'?level.detail:'staff-'+level.detail;urls[key]=`/models/${folder}/${level.file}?v=${level.sha256.slice(0,12)}`;hashes[key]=level.sha256;}
}
await fs.writeFile('src/manual-hero-assets.js','// Local, content-versioned assets; all are packaged for offline Android use.\nexport const manualHeroAssetUrls = '+JSON.stringify(urls,null,2)+';\nexport const manualHeroAssetHashes = '+JSON.stringify(hashes,null,2)+';\n');
