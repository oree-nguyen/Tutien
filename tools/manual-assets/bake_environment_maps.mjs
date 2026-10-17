import fs from 'node:fs/promises';import sharp from 'sharp';
import{marbleCloudMaps,architecturalMaps}from'../../src/environment-pbr.js';
const folder='public/art/environment-baked';await fs.mkdir(folder,{recursive:true});const sets={};
for(const style of ['marble','roof','wood','gilt']){
 const maps=style==='marble'?marbleCloudMaps():architecturalMaps(style);sets[style]={};
 for(const [key,texture]of Object.entries(maps)){
  const {data,width,height}=texture.image;const file=style+'-'+key+'.webp';
  await sharp(Buffer.from(data.buffer,data.byteOffset,data.byteLength),{raw:{width,height,channels:4}}).webp({lossless:true}).toFile(folder+'/'+file);sets[style][key]='/art/environment-baked/'+file;
 }
}
await fs.writeFile('src/environment-baked-assets.js','export const environmentAssetUrls='+JSON.stringify(sets)+';\n');console.log('Baked shared marble, wood, gilt, roof maps');
