import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';

const hero=process.env.HERO??'H01',input=process.env.RIG_FILE??`assets/rigged/${hero}-C0-rigged.glb`,
 source=`public/models/hunyuan-original/${hero}-C0-source.glb`,directory=process.env.FOOT_SOURCE_DIR??`.local/rig-candidates/foot-source/${hero}`,
 sha=b=>createHash('sha256').update(b).digest('hex'),raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),
 io=new NodeIO().registerExtensions(ALL_EXTENSIONS),bytes=await fs.readFile(input),sourceBytes=await fs.readFile(source),
 doc=await io.readBinary(bytes),original=await io.readBinary(sourceBytes),nodes=doc.getRoot().listNodes(),
 meshNodes=nodes.filter(n=>n.getMesh());
assert.equal(meshNodes.length,1,'Source extraction requires the original single-primitive rig');
const node=meshNodes[0],p=node.getMesh().listPrimitives()[0],s=original.getRoot().listNodes().find(n=>n.getMesh()).getMesh().listPrimitives()[0];
assert.equal(node.getMesh().listPrimitives().length,1);
for(const semantic of ['POSITION','NORMAL','TEXCOORD_0'])assert.deepEqual(raw(p.getAttribute(semantic).getArray()),raw(s.getAttribute(semantic).getArray()),semantic+' differs from original source');
assert.deepEqual(raw(p.getIndices().getArray()),raw(s.getIndices().getArray()),'Source triangle order differs');
await fs.mkdir(directory,{recursive:true});
for(const [file,array]of Object.entries({'positions.bin':p.getAttribute('POSITION').getArray(),'triangles.bin':Uint32Array.from(p.getIndices().getArray()),'ids.bin':Uint16Array.from(p.getAttribute('JOINTS_0').getArray()),'weights.bin':p.getAttribute('WEIGHTS_0').getArray(),'uv.bin':p.getAttribute('TEXCOORD_0').getArray()}))await fs.writeFile(directory+'/'+file,raw(array));
const texture=p.getMaterial().getBaseColorTexture(),{data,info}=await sharp(texture.getImage()).ensureAlpha().raw().toBuffer({resolveWithObject:true}),uv=p.getAttribute('TEXCOORD_0').getArray(),rgb=new Uint8Array(p.getAttribute('POSITION').getCount()*3);
for(let i=0;i<rgb.length/3;i++){
 const x=Math.max(0,Math.min(info.width-1,Math.floor(uv[i*2]*info.width))),y=Math.max(0,Math.min(info.height-1,Math.floor(uv[i*2+1]*info.height)));
 rgb.set(data.subarray((y*info.width+x)*4,(y*info.width+x)*4+3),i*3);
}
await fs.writeFile(directory+'/rgb.bin',rgb);
const joints=node.getSkin().listJoints(),metadata={hero,input,inputSha256:sha(bytes),source,sourceSha256:sha(sourceBytes),sourceNodeIndex:original.getRoot().listNodes().findIndex(n=>n.getMesh()),sourcePrimitiveIndex:0,sourceVertices:p.getAttribute('POSITION').getCount(),sourceTriangles:p.getIndices().getCount()/3,joints:joints.map(n=>n.getName()),jointPositions:Object.fromEntries(joints.map(j=>[j.getName(),j.getWorldMatrix().slice(12,15)])),inverseBindMatrices:Array.from(node.getSkin().getInverseBindMatrices().getArray()),attributeHashes:Object.fromEntries(p.listSemantics().map(k=>[k,sha(raw(p.getAttribute(k).getArray()))])),imageHashes:doc.getRoot().listTextures().map(t=>sha(t.getImage())),scope:'Source identity extraction only; no inferred anatomical region or weight acceptance'};
await fs.writeFile(directory+'/input.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({hero,directory,sourceSha256:metadata.sourceSha256,vertices:metadata.sourceVertices,triangles:metadata.sourceTriangles}));
