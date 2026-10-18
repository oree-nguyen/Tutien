import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,KHRTextureBasisu,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function preservationSignature(doc){
 const root=doc.getRoot(),joints=[...new Set(root.listSkins().flatMap(s=>s.listJoints()))];
 return {joints:joints.map(n=>n.getName()),skins:root.listSkins().map(s=>({joints:s.listJoints().map(n=>n.getName()),inverseBindMatrices:Array.from(s.getInverseBindMatrices()?.getArray()??[])})),
 meshes:root.listMeshes().map(m=>({name:m.getName(),primitives:m.listPrimitives().map(p=>({mode:p.getMode(),indices:Array.from(p.getIndices()?.getArray()??[]),attributes:p.listSemantics().map(k=>({name:k,normalized:p.getAttribute(k).getNormalized(),values:Array.from(p.getAttribute(k).getArray())})),morphs:p.listTargets().map(t=>t.listSemantics().map(k=>({name:k,values:Array.from(t.getAttribute(k).getArray())})))}))})),
 animations:root.listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode()?.getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),time:Array.from(c.getSampler().getInput().getArray()),values:Array.from(c.getSampler().getOutput().getArray())}))}))};
}
export async function fidelityModels(){
 const config=JSON.parse(await fs.readFile('assets/fidelity-models.json'));
 const executable=process.env.TOKTX??'/workspace/ktx-tools/KTX-Software-4.4.2-Linux-x86_64/bin/toktx';
 const version=spawnSync(executable,['--version'],{encoding:'utf8'});if(version.status!==0)throw Error('toktx unavailable');
 await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
 const folder='public/models/fidelity',temporary=await fs.mkdtemp(path.join(os.tmpdir(),'hg-full-size-'));await fs.mkdir(folder,{recursive:true});
 const urls={},hashes={},entries=[];
 try{for(const model of config.models){
  const input='assets/base_models/'+model.file,source=await fs.readFile(input),sourceHash=hash(source),target=folder+'/'+model.file,cache=target+'.json';
  const settings=hash(Buffer.from(JSON.stringify({sourceHash,tool:version.stdout,config,script:hash(await fs.readFile('scripts/fidelity-models.mjs'))})));
  let receipt;try{receipt=JSON.parse(await fs.readFile(cache));}catch{}
  if(receipt?.settings!==settings||!await fs.readFile(target).then(b=>hash(b)===receipt.sha256).catch(()=>false)){
   const doc=await io.read(input),signature=preservationSignature(doc),root=doc.getRoot();
   assert.equal(signature.joints.length,model.requiredBones,'Bone mismatch in source '+model.file);assert.deepEqual(signature.animations.map(a=>a.name).sort(),[...model.requiredClips].sort());
   const colors=new Set(root.listMaterials().flatMap(m=>[m.getBaseColorTexture(),m.getEmissiveTexture()]).filter(Boolean)),textures=[];let index=0;
   for(const texture of root.listTextures()){
    const png=path.join(temporary,'map-'+index+'.png'),ktx=path.join(temporary,'map-'+index+++'.ktx2'),metadata=await sharp(texture.getImage()).metadata();
    await sharp(texture.getImage()).png().toFile(png);
    const run=spawnSync(executable,['--t2','--encode','uastc','--uastc_quality','4','--zcmp','18','--genmipmap','--assign_oetf',colors.has(texture)?'srgb':'linear','--assign_primaries','bt709','--threads','2',ktx,png],{encoding:'utf8'});
    if(run.status!==0)throw Error(model.file+': '+run.stderr);
    const bytes=await fs.readFile(ktx);assert.equal(bytes.readUInt32LE(20),metadata.width,'Texture width changed');assert.equal(bytes.readUInt32LE(24),metadata.height,'Texture height changed');assert.ok(bytes.readUInt32LE(40)>1);
    texture.setImage(bytes).setMimeType('image/ktx2');textures.push({name:texture.getName(),width:metadata.width,height:metadata.height,mips:bytes.readUInt32LE(40),encoding:'UASTC quality4 without RDO'});
   }
   doc.createExtension(KHRTextureBasisu).setRequired(true);
   // No quantize/reorder/simplify/resample transform. Method QUANTIZE selects
   // filter NONE in the extension encoder; existing accessor bytes stay intact.
   doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
   const checking=target+'.checking.glb';await io.write(checking,doc);const exported=await io.read(checking);assert.deepEqual(preservationSignature(exported),signature,'Geometry/bone/morph/keyframe changed: '+model.file);
   assert.equal(hash(await fs.readFile(input)),sourceHash,'Original source was modified');
   await fs.rename(checking,target);receipt={file:model.file,key:model.key,sourceHash,settings,sha256:hash(await fs.readFile(target)),sourceBytes:source.length,bytes:(await fs.stat(target)).size,bones:signature.joints.length,clips:signature.animations.map(a=>a.name),exactAccessorData:true,textures};await fs.writeFile(cache,JSON.stringify(receipt,null,2)+'\n');console.log('UASTC full-size / lossless mesh:',model.key);
  }else console.log('Cached verified:',model.key);
  urls[model.key+'-gpu']='/models/fidelity/'+model.file+'?v='+receipt.sha256.slice(0,12);hashes[model.key+'-gpu']=receipt.sha256;entries.push(receipt);
 }
 await fs.writeFile('src/fidelity-model-assets.js','export const fidelityModelUrls='+JSON.stringify(urls)+';\nexport const fidelityModelHashes='+JSON.stringify(hashes)+';\n');
 await fs.writeFile(folder+'/manifest.json',JSON.stringify({policy:config,entries},null,2)+'\n');
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
}
if(process.argv[1]?.endsWith('/fidelity-models.mjs'))fidelityModels().catch(error=>{console.error(error.stack);process.exitCode=1;});
