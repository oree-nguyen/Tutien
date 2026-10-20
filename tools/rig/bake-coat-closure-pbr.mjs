/** Offline PBR transfer for derived garment closure faces only. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Vector2,Vector3,Triangle,Quaternion} from 'three';
import sharp from 'sharp';
import {MeshContact} from './mesh-contact.mjs';
import {immutablePayload,animationSignature,sha256} from './animation-payload.mjs';

const [base,output]=process.argv.slice(2);for(const dir of [base,output])assert(/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(dir));assert.notEqual(base,output);
const input=base+'/H01-C0-rigged.glb',bytes=await fs.readFile(input),receipt=JSON.parse(await fs.readFile(base+'/receipt.json'));assert.equal(sha256(bytes),receipt.sha256);
const sourceFile='public/models/hunyuan-original/H01-C0-source.glb',sourceBytes=await fs.readFile(sourceFile),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),source=await io.readBinary(sourceBytes),
 original=immutablePayload(doc),clips=doc.getRoot().listAnimations().map(animationSignature),sourcePrimitive=source.getRoot().listNodes().find(n=>n.getMesh()).getMesh().listPrimitives()[0],
 sourceMaterial=sourcePrimitive.getMaterial(),atlasSize=4096,channels=3,images={};
let contact,srcPositions,srcNormals,srcUv;const neighborhoods=[];
for(const[name,texture]of [['albedo',sourceMaterial.getBaseColorTexture()],['normal',sourceMaterial.getNormalTexture()],['metalRough',sourceMaterial.getMetallicRoughnessTexture()]]){
 assert(texture);const {data,info}=await sharp(texture.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});assert(info.width===4096&&info.height===4096&&info.channels===3);images[name]={data,info,output:Buffer.alloc(atlasSize*atlasSize*channels)};
}
const caps=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives().filter(p=>p.getExtras().derivedBoundaryPatch)),total=caps.reduce((n,p)=>n+p.getIndices().getCount()/3,0),grid=Math.ceil(Math.sqrt(total)),cell=Math.floor(atlasSize/grid),pad=3,side=cell-pad*2-1,
 triangle=new Triangle(),bary=new Vector3(),point=new Vector3(),nearest={},sA=new Vector3(),sB=new Vector3(),sC=new Vector3(),
 sUvA=new Vector2(),sUvB=new Vector2(),sUvC=new Vector2(),srcN=new Vector3(),srcT=new Vector3(),srcB=new Vector3(),scratch=new Vector3(),worldNormal=new Vector3(),transport=new Quaternion();
assert(caps.length&&cell>8);let number=0,texels=0,maxProjectionDistance=0,started=performance.now();await fs.mkdir(output,{recursive:true});
function frame(a,b,c,ua,ub,uc,normal){
 const ab=b.clone().sub(a),ac=c.clone().sub(a),du=ub.x-ua.x,dv=ub.y-ua.y,eu=uc.x-ua.x,ev=uc.y-ua.y,det=du*ev-eu*dv;
 const t=Math.abs(det)>1e-15?ab.clone().multiplyScalar(ev).addScaledVector(ac,-dv).divideScalar(det):ab.clone();t.projectOnPlane(normal).normalize();
 if(t.lengthSq()<.9)t.set(1,0,0).projectOnPlane(normal).normalize();if(t.lengthSq()<.9)t.set(0,1,0).projectOnPlane(normal).normalize();
 const reference=Math.abs(det)>1e-15?ac.clone().multiplyScalar(du).addScaledVector(ab,-eu).divideScalar(det):normal.clone().cross(t),bdir=normal.clone().cross(t).normalize();if(bdir.dot(reference)<0)bdir.negate();return{t,b:bdir};
}
function sample(image,u,v,out){
 const x=Math.max(0,Math.min(4095,u*4096-.5)),y=Math.max(0,Math.min(4095,v*4096-.5)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 for(let k=0;k<3;k++){const a=image.data[(iy*4096+ix)*3+k],b=image.data[(iy*4096+Math.min(ix+1,4095))*3+k],c=image.data[(Math.min(iy+1,4095)*4096+ix)*3+k],d=image.data[(Math.min(iy+1,4095)*4096+Math.min(ix+1,4095))*3+k];out[k]=(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;}
}
const color=[0,0,0],normalPixel=[0,0,0],metal=[0,0,0];
try{
 for(const cap of caps){
  const owner=doc.getRoot().listNodes().find(n=>n.getMesh()?.listPrimitives().includes(cap)),rim=new Set(cap.getExtras().derivedBoundaryPatch.sourceCornerFans),
   projected={position:[],normal:[],uv:[],indices:[]},picked=[];
  assert(owner);
  for(const[part,p]of owner.getMesh().listPrimitives().entries())if(!p.getExtras().derivedBoundaryPatch){
   const fans=p.getAttribute('_SOURCE_CUT_WELD').getArray(),idx=p.getIndices().getArray(),lookup=new Map();
   for(let i=0;i<idx.length;i+=3)if([0,1,2].some(k=>rim.has(fans[idx[i+k]]))){
    picked.push([part,i/3]);for(let k=0;k<3;k++){
     const vertex=idx[i+k];let local=lookup.get(vertex);if(local===undefined){local=projected.position.length/3;lookup.set(vertex,local);projected.position.push(...p.getAttribute('POSITION').getElement(vertex,[]));projected.normal.push(...p.getAttribute('NORMAL').getElement(vertex,[]));projected.uv.push(...p.getAttribute('TEXCOORD_0').getElement(vertex,[]));}projected.indices.push(local);
    }
   }
  }
  assert(picked.length,'Missing actual same-piece source rim');srcPositions=Float32Array.from(projected.position);srcNormals=Float32Array.from(projected.normal);srcUv=Float32Array.from(projected.uv);
  contact=new MeshContact(srcPositions,Uint32Array.from(projected.indices));const sourceIndex=contact.geometry.index;
  neighborhoods.push({node:owner.getName(),rimFaces:picked.length,sourceFacesSha256:sha256(Buffer.from(Uint32Array.from(picked.flat()).buffer))});
  const idx=cap.getIndices().getArray(),positions=cap.getAttribute('POSITION').getArray(),normal=cap.getAttribute('NORMAL'),uv=new Float32Array(idx.length*2),sourceVertices=Array.from(idx),attributes={};
  for(const semantic of cap.listSemantics())if(semantic!=='TEXCOORD_0'){
   const a=cap.getAttribute(semantic),size=a.getElementSize(),values=a.getArray(),next=new(values.constructor)(idx.length*size);for(let i=0;i<idx.length;i++)next.set(values.subarray(idx[i]*size,(idx[i]+1)*size),i*size);attributes[semantic]={a,next};
  }
  for(let at=0;at<idx.length;at+=3,number++){
   const x0=number%grid*cell,y0=Math.floor(number/grid)*cell,vertices=[0,1,2].map(k=>idx[at+k]),points=vertices.map(v=>new Vector3().fromArray(positions,v*3)),n=new Vector3(...normal.getElement(vertices[0],[])).normalize(),
    texcoords=[new Vector2((x0+pad+.5)/atlasSize,(y0+pad+.5)/atlasSize),new Vector2((x0+pad+side+.5)/atlasSize,(y0+pad+.5)/atlasSize),new Vector2((x0+pad+.5)/atlasSize,(y0+pad+side+.5)/atlasSize)],targetFrame=frame(...points,...texcoords,n);
   for(let k=0;k<3;k++)uv.set(texcoords[k].toArray(),(at+k)*2);
   for(let y=0;y<=side;y++)for(let x=0;x<=side-y;x++){
    const u=x/side,v=y/side;point.copy(points[0]).multiplyScalar(1-u-v).addScaledVector(points[1],u).addScaledVector(points[2],v);
    const hit=contact.bvh.closestPointToPoint(point,nearest);assert(hit&&Number.isFinite(hit.distance));maxProjectionDistance=Math.max(maxProjectionDistance,hit.distance);
    const a=sourceIndex.getX(hit.faceIndex*3),b=sourceIndex.getX(hit.faceIndex*3+1),c=sourceIndex.getX(hit.faceIndex*3+2);
    sA.fromArray(srcPositions,a*3);sB.fromArray(srcPositions,b*3);sC.fromArray(srcPositions,c*3);triangle.set(sA,sB,sC);triangle.getBarycoord(hit.point,bary);assert(bary.toArray().every(Number.isFinite));
    sUvA.fromArray(srcUv,a*2);sUvB.fromArray(srcUv,b*2);sUvC.fromArray(srcUv,c*2);const su=sUvA.x*bary.x+sUvB.x*bary.y+sUvC.x*bary.z,sv=sUvA.y*bary.x+sUvB.y*bary.y+sUvC.y*bary.z;
    sample(images.albedo,su,sv,color);sample(images.normal,su,sv,normalPixel);sample(images.metalRough,su,sv,metal);
    srcN.fromArray(srcNormals,a*3).multiplyScalar(bary.x).addScaledVector(scratch.fromArray(srcNormals,b*3),bary.y).addScaledVector(scratch.fromArray(srcNormals,c*3),bary.z).normalize();
    const sourceFrame=frame(sA,sB,sC,sUvA,sUvB,sUvC,srcN);srcT.copy(sourceFrame.t);srcB.copy(sourceFrame.b);
    worldNormal.copy(srcT).multiplyScalar(normalPixel[0]/127.5-1).addScaledVector(srcB,normalPixel[1]/127.5-1).addScaledVector(srcN,normalPixel[2]/127.5-1).normalize().applyQuaternion(transport.setFromUnitVectors(srcN,n));
    const pixel=((y0+pad+y)*atlasSize+x0+pad+x)*3;
    for(let k=0;k<3;k++){images.albedo.output[pixel+k]=Math.round(color[k]);images.metalRough.output[pixel+k]=Math.round(metal[k]);}
    images.normal.output[pixel]=Math.round((worldNormal.dot(targetFrame.t)*.5+.5)*255);images.normal.output[pixel+1]=Math.round((worldNormal.dot(targetFrame.b)*.5+.5)*255);images.normal.output[pixel+2]=Math.round((worldNormal.dot(n)*.5+.5)*255);texels++;
   }
   // Extend real baked edge texels through each private tile's padding. This
   // avoids dark mip edges without more nearest-surface queries or atlas bleed.
   for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
    const bx=Math.max(0,Math.min(side,x-pad)),by=Math.max(0,Math.min(side-bx,y-pad));if(x>=pad&&y>=pad&&x-pad+y-pad<=side)continue;
    const from=((y0+pad+by)*atlasSize+x0+pad+bx)*3,to=((y0+y)*atlasSize+x0+x)*3;for(const image of Object.values(images))for(let k=0;k<3;k++)image.output[to+k]=image.output[from+k];
   }
   if(number%50===49){console.log(JSON.stringify({triangles:number+1,total,texels,seconds:(performance.now()-started)/1000}));await new Promise(resolve=>setImmediate(resolve));}
  }
  for(const[semantic,{a,next}]of Object.entries(attributes))cap.setAttribute(semantic,doc.createAccessor('',a.getBuffer()).setType(a.getType()).setNormalized(a.getNormalized()).setArray(next));
  cap.setAttribute('TEXCOORD_0',doc.createAccessor('',doc.getRoot().listBuffers()[0]).setType('VEC2').setArray(uv));cap.setIndices(doc.createAccessor('',doc.getRoot().listBuffers()[0]).setType('SCALAR').setArray(Uint32Array.from({length:idx.length},(_,i)=>i)));
  cap.setExtras({...cap.getExtras(),bakedClosurePbr:{sourceFile,sourceSha256:sha256(sourceBytes),inputClosureSha256:sha256(bytes),atlasSize,method:'Nearest actual same-piece original rim triangle PBR transfer, no cross-layer surface search; micro normals transported onto closure normal and new UV frame; original meshes/images unchanged'}});
  contact.dispose();contact=null;
 }
 const material=doc.createMaterial().copy(caps[0].getMaterial()).setName('H01_Derived_Closure_Transferred_PBR'),files={};
 for(const[name,image]of Object.entries(images)){
  const png=await sharp(image.output,{raw:{width:atlasSize,height:atlasSize,channels:3}}).png({compressionLevel:9}).toBuffer(),file='closure-'+name+'-4096.png';await fs.writeFile(output+'/'+file,png);files[file]={sha256:sha256(png),bytes:png.length};
  const texture=doc.createTexture('H01_Closure_'+name+'_4096').setImage(png).setMimeType('image/png');if(name==='albedo')material.setBaseColorTexture(texture);else if(name==='normal')material.setNormalTexture(texture);else material.setMetallicRoughnessTexture(texture);
 }
 for(const cap of caps)cap.setMaterial(material);for(const a of doc.getRoot().listAccessors())if(a.listParents().every(p=>p.propertyType==='Root'))a.dispose();
 const file=output+'/H01-C0-rigged.glb';await io.write(file,doc);const result=await io.read(file),payload=immutablePayload(result);
 for(let i=0;i<original.meshes.length;i++)payload.meshes[i].primitives=payload.meshes[i].primitives.slice(0,doc.getRoot().listMeshes()[i].listPrimitives().findIndex(p=>p.getExtras().derivedBoundaryPatch) <0?original.meshes[i].primitives.length:doc.getRoot().listMeshes()[i].listPrimitives().findIndex(p=>p.getExtras().derivedBoundaryPatch));
 const sourceOnly=structuredClone(original);for(let i=0;i<sourceOnly.meshes.length;i++)sourceOnly.meshes[i].primitives=sourceOnly.meshes[i].primitives.slice(0,payload.meshes[i].primitives.length);payload.images=payload.images.slice(0,original.images.length);assert.deepEqual(payload,sourceOnly);assert.deepEqual(result.getRoot().listAnimations().map(animationSignature),clips);
 for(const node of doc.getRoot().listNodes())for(const p of node.getMesh()?.listPrimitives()??[]){const m=p.getExtras().sourceProvenance;if(m)for(const name of [m.triangleMap.file,m.weldMap.file,m.weldMap.review.file])await fs.copyFile(path.resolve(base,name),path.resolve(output,name));}
 for(const name of ['cut-plan.json','cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin'])await fs.copyFile(base+'/'+name,output+'/'+name);
 const report={base,inputSha256:sha256(bytes),sourceFile,sourceSha256:sha256(sourceBytes),output:file,sha256:sha256(await fs.readFile(file)),originalSourcePayloadAndImagesPreserved:true,
  sourceImageResolution:[4096,4096],derivedAtlasResolution:[4096,4096],bakedTriangles:total,bakedTexels:texels,maximumProjectionDistanceMetres:maxProjectionDistance,seconds:(performance.now()-started)/1000,neighborhoods,files,accepted:false,activated:false,
  scope:'Texture transfer for derived closure faces only. Original source geometry/UV/images, skeleton and clips remain exact. New UVs/PBR atlases explicitly derived; independent image/geometry/collision/full-animation review still required.'};
 await fs.writeFile(output+'/receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{contact?.dispose();}
