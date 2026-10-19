import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { NodeIO, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { compactTriangleIndices } from './robe-panels.mjs';

function option(name,fallback) {
  const at=process.argv.indexOf(name);
  if(at<0)return fallback;
  if(!process.argv[at+1]||process.argv[at+1].startsWith('--'))throw Error('Missing value for '+name);
  return process.argv[at+1];
}
const directory = option('--output',process.env.GARMENT_CANDIDATE_DIR ?? '.local/rig-candidates/semantic-garment');
const input = option('--input',process.env.GARMENT_INPUT_FILE ?? 'assets/rigged/H01-C0-rigged.glb');
const source = option('--source','public/models/hunyuan-original/H01-C0-source.glb');
const reuseSolve=process.argv.includes('--reuse-solve');
const reuseSupports=option('--reuse-supports-from',null);
const seedPatches=option('--seed-patches',null);
const supportOperator=option('--support-operator','edge-metric');
if(!['edge-metric','cotangent-fem'].includes(supportOperator))throw Error('Unknown source support operator');
if(reuseSolve&&(reuseSupports||seedPatches))throw Error('--reuse-solve cannot reclassify or select different support arrays');
if(!/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory))throw Error('Output must be an isolated .local/rig-candidates/<name> directory');
if(input===directory+'/H01-C0-rigged.glb')throw Error('The garment exporter cannot overwrite its input');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha = b => createHash('sha256').update(b).digest('hex');
for(const file of [input,source,'data/rig/hand-frames.json'])try{await fs.access(file);}catch{throw Error('Missing garment prerequisite '+file+'. Supply an existing source-identical single-primitive humanoid rig with --input; canonical tracked input is assets/rigged/H01-C0-rigged.glb. See tools/rig/SEMANTIC-GARMENT.md.');}
const bytes = await fs.readFile(input), sourceBytes = await fs.readFile(source);
const expectedParentSha=option('--expected-parent-sha',null);
if(expectedParentSha)assert.equal(sha(bytes),expectedParentSha,'Parent rig SHA differs from the requested experiment');
if(reuseSolve){
  const cached=JSON.parse(await fs.readFile(directory+'/input.json'));
  assert.equal(cached.sourceSha256,sha(sourceBytes),'Cached source SHA differs');
  assert.equal(cached.parentRigSha256,sha(bytes),'Cached parent rig SHA differs');
}
const doc = await io.readBinary(bytes), original = await io.readBinary(sourceBytes);
const sourceNodes = original.getRoot().listNodes();
const sourceNodeIndex = sourceNodes.findIndex(n=>n.getMesh());
const sourcePrimitive = sourceNodes[sourceNodeIndex].getMesh().listPrimitives()[0];
const meshNodes = doc.getRoot().listNodes().filter(n=>n.getMesh());
assert.equal(meshNodes.length,1);
const node = meshNodes[0], primitive = node.getMesh().listPrimitives()[0];
assert.equal(node.getMesh().listPrimitives().length,1);
const arrayBytes = a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
for(const name of ['POSITION','NORMAL','TEXCOORD_0'])
  assert.deepEqual(arrayBytes(primitive.getAttribute(name).getArray()),arrayBytes(sourcePrimitive.getAttribute(name).getArray()),name+' source mapping changed');
assert.deepEqual(arrayBytes(primitive.getIndices().getArray()),arrayBytes(sourcePrimitive.getIndices().getArray()));
const images = doc.getRoot().listTextures().map(t=>sha(t.getImage()));
assert.deepEqual(images,original.getRoot().listTextures().map(t=>sha(t.getImage())));
const signature = d=>d.getRoot().listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),input:sha(arrayBytes(c.getSampler().getInput().getArray())),output:sha(arrayBytes(c.getSampler().getOutput().getArray()))}))}));
const clips = signature(doc);
await fs.mkdir(directory,{recursive:true});
const positions = primitive.getAttribute('POSITION').getArray();
const indices = Uint32Array.from(primitive.getIndices().getArray());
const write = (name,array)=>fs.writeFile(directory+'/'+name,arrayBytes(array));
await write('positions.bin',positions);
await write('triangles.bin',indices);
await write('ids.bin',Uint16Array.from(primitive.getAttribute('JOINTS_0').getArray()));
await write('weights.bin',primitive.getAttribute('WEIGHTS_0').getArray());
const {data,info} = await sharp(primitive.getMaterial().getBaseColorTexture().getImage()).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const uv = primitive.getAttribute('TEXCOORD_0').getArray(),rgb = new Uint8Array(positions.length);
for(let i=0;i<positions.length/3;i++){
  const x=Math.max(0,Math.min(info.width-1,Math.floor(uv[i*2]*info.width)));
  const y=Math.max(0,Math.min(info.height-1,Math.floor(uv[i*2+1]*info.height)));
  rgb.set(data.subarray((y*info.width+x)*4,(y*info.width+x)*4+3),i*3);
}
await write('rgb.bin',rgb);
const skin = node.getSkin(),joints=skin.listJoints();
const framesBytes=await fs.readFile('data/rig/hand-frames.json');
const frames=JSON.parse(framesBytes).heroes.H01.hands;
const handBounds=Object.values(frames).map(frame=>{
  const points=[frame.wrist,...Object.values(frame.fingers).flatMap(f=>f.points)];
  return {low:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))-.022),high:[0,1,2].map(k=>Math.max(...points.map(p=>p[k]))+.022)};
});
const originalProtection=new Uint8Array(positions.length/3),protectedVertices=new Uint8Array(positions.length/3);
const originalIds=primitive.getAttribute('JOINTS_0').getArray(),originalWeights=primitive.getAttribute('WEIGHTS_0').getArray();
for(let i=0;i<originalProtection.length;i++)originalProtection[i]=handBounds.some(b=>[0,1,2].every(k=>positions[i*3+k]>=b.low[k]&&positions[i*3+k]<=b.high[k]))||[0,1,2,3].some(k=>originalWeights[i*4+k]>1e-8&&/Hand(?:Thumb|Index|Middle|Ring|Pinky)[123]$/.test(joints[originalIds[i*4+k]].getName()))?1:0;
protectedVertices.set(originalProtection);
for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
  const a=indices[i+k],b=indices[i+(k+1)%3];
  if(originalProtection[a])protectedVertices[b]=1;
  if(originalProtection[b])protectedVertices[a]=1;
}
const protectedMask={method:'Tracked H01 hand-frame bounds expanded22mm, every finger-influenced vertex, then one original triangle-edge ring',sourceSha256:sha(sourceBytes),parentRigSha256:sha(bytes),handFramesSha256:sha(framesBytes),sha256:sha(arrayBytes(protectedVertices)),count:protectedVertices.length,protectedCount:protectedVertices.reduce((a,b)=>a+b,0)};
if(reuseSolve)assert.equal(sha(await fs.readFile(directory+'/protected.bin')),protectedMask.sha256,'Cached solve protected-mask SHA differs');
await write('protected.bin',protectedVertices);
await fs.writeFile(directory+'/input.json',JSON.stringify({source,sourceSha256:sha(sourceBytes),parentRigFile:input,parentRigSha256:sha(bytes),protectedMask,jointNames:joints.map(j=>j.getName()),jointPositions:Object.fromEntries(joints.map(j=>[j.getName(),[j.getWorldMatrix()[12],j.getWorldMatrix()[13],j.getWorldMatrix()[14]]]))},null,2)+'\n');
if(!reuseSolve)await new Promise((resolve,reject)=>{
  const args=['tools/rig/source_garment_graph.py',directory];
  if(seedPatches)args.push('--seed-patches',seedPatches);
  if(reuseSupports)args.push('--reuse-supports-from',reuseSupports);
  args.push('--support-operator',supportOperator);
  const process=spawn('python3',args,{stdio:'inherit',env:{...globalThis.process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'2'}});
  process.on('error',reject);process.on('exit',code=>code===0?resolve():reject(Error('Source graph solve rejected: '+code)));
});
const labels=new Uint8Array(await fs.readFile(directory+'/face-labels.bin'));
const weldBytes=await fs.readFile(directory+'/source-welds.u32bin');
const weld=new Uint32Array(weldBytes.buffer,weldBytes.byteOffset,weldBytes.byteLength/4);
const outIdsBytes=await fs.readFile(directory+'/result-ids.bin'),outWeightsBytes=await fs.readFile(directory+'/result-weights.bin');
const outIds=new Uint16Array(outIdsBytes.buffer,outIdsBytes.byteOffset,outIdsBytes.byteLength/2);
const outWeights=new Float32Array(outWeightsBytes.buffer,outWeightsBytes.byteOffset,outWeightsBytes.byteLength/4);
assert.equal(labels.length,indices.length/3);
assert.equal(outIds.length,primitive.getAttribute('JOINTS_0').getArray().length);
assert.equal(outWeights.length,primitive.getAttribute('WEIGHTS_0').getArray().length);
if(reuseSupports){
  const priorReceipt=JSON.parse(await fs.readFile(reuseSupports+'/receipt.json'));
  assert.equal(priorReceipt.sourceSha256,sha(sourceBytes),'Reused candidate source SHA differs');
  assert.equal(priorReceipt.parentRigSha256,sha(bytes),'Reused candidate parent SHA differs');
  const priorBytes=await fs.readFile(reuseSupports+'/H01-C0-rigged.glb');
  assert.equal(sha(priorBytes),priorReceipt.sha256,'Reused candidate GLB differs from its receipt');
  const prior=await io.readBinary(priorBytes),seen=new Uint8Array(outWeights.length/4);
  for(const n of prior.getRoot().listNodes().filter(n=>n.getMesh()))for(const p of n.getMesh().listPrimitives()){
    const sourceIds=p.getAttribute('_SOURCE_VERTEX')?.getArray();
    assert(sourceIds,'Reused candidate requires exact original source-vertex IDs');
    const ids=p.getAttribute('JOINTS_0').getArray(),weights=p.getAttribute('WEIGHTS_0').getArray();
    for(let i=0;i<sourceIds.length;i++){
      const sourceId=sourceIds[i];assert(sourceId<seen.length,'Reused source-vertex ID out of range');seen[sourceId]=1;
      for(let k=0;k<4;k++){
        assert.equal(ids[i*4+k],outIds[sourceId*4+k],'Reused raw joints differ from receipt-bound GLB');
        assert.equal(weights[i*4+k],outWeights[sourceId*4+k],'Reused raw weights differ from receipt-bound GLB');
      }
    }
  }
  assert(seen.every(Boolean),'Reused candidate does not cover every source vertex');
}
const names=['H01_Remaining_Source','H01_Robe_Left','H01_Robe_Right','H01_Robe_Torso','H01_Sleeve_Left','H01_Sleeve_Right'];
const triangleMap=new Uint32Array(labels.length);
let triangleAt=0;
for(let label=0;label<names.length;label++)for(let i=0;i<labels.length;i++)if(labels[i]===label)triangleMap[triangleAt++]=i;
const triangleFile='H01-source-triangles.u32bin';
await write(triangleFile,triangleMap);
const triangleHash=sha(arrayBytes(triangleMap));
const proof=JSON.parse(await fs.readFile(directory+'/graph-report.json'));
const continuityBytes=Buffer.from(JSON.stringify({sourceSha256:sha(sourceBytes),weldMapSha256:sha(weldBytes),...proof.sourceContinuity,reviewed:true,reviewKind:'mechanically-audited-original-UV-chart-continuity',reviewScope:'Unique opposite source boundary halfedges only; does not approve clothing pattern boundaries'},null,2)+'\n');
await fs.writeFile(directory+'/source-continuity.json',continuityBytes);
const buffer=doc.getRoot().listBuffers()[0];
const expected=[];
let offset=0;
for(let label=0;label<names.length;label++){
  const sourceTriangles=[];for(let i=0;i<labels.length;i++)if(labels[i]===label)sourceTriangles.push(i);
  assert(sourceTriangles.length>0,names[label]+' empty');
  const chosen=new Uint32Array(sourceTriangles.length*3);
  sourceTriangles.forEach((triangle,i)=>chosen.set(indices.subarray(triangle*3,triangle*3+3),i*3));
  const compact=compactTriangleIndices(chosen);
  const p=doc.createPrimitive().setMaterial(primitive.getMaterial());
  function attribute(name,accessor,inputArray){
    const size=accessor.getElementSize(),out=new inputArray.constructor(compact.sourceVertices.length*size);
    compact.sourceVertices.forEach((old,i)=>out.set(inputArray.subarray(old*size,(old+1)*size),i*size));
    const result=doc.createAccessor(names[label]+'_'+name,buffer).setType(accessor.getType()).setNormalized(accessor.getNormalized()).setArray(out);
    p.setAttribute(name,result);return sha(arrayBytes(out));
  }
  const hashes={};
  for(const name of primitive.listSemantics())hashes[name]=attribute(name,primitive.getAttribute(name),name==='JOINTS_0'?outIds:name==='WEIGHTS_0'?outWeights:primitive.getAttribute(name).getArray());
  p.setAttribute('_SOURCE_VERTEX',doc.createAccessor('',buffer).setType(Accessor.Type.SCALAR).setArray(compact.sourceVertices));
  p.setAttribute('_SOURCE_WELD',doc.createAccessor('',buffer).setType(Accessor.Type.SCALAR).setArray(Uint32Array.from(compact.sourceVertices,v=>weld[v])));
  p.setIndices(doc.createAccessor('',buffer).setType(Accessor.Type.SCALAR).setArray(compact.indices));
  p.setExtras({sourceProvenance:{version:1,sourceFile:source,sourceSha256:sha(sourceBytes),sourceNodeIndex,sourcePrimitiveIndex:0,parentRigFile:input,parentRigSha256:sha(bytes),vertexAccessor:'_SOURCE_VERTEX',weldAccessor:'_SOURCE_WELD',weldMap:{file:'source-welds.u32bin',sha256:sha(weldBytes),count:weld.length,method:'paired-opposite-source-boundary-halfedges',reviewed:true,review:{file:'source-continuity.json',sha256:sha(continuityBytes)}},triangleMap:{file:triangleFile,sha256:triangleHash,offsetBytes:offset*4,count:sourceTriangles.length},semanticRegion:names[label],garmentPatternReviewed:false}});
  const n=doc.createNode(names[label]).setMesh(doc.createMesh(names[label]).addPrimitive(p)).setSkin(skin).setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale());
  if(node.getParentNode())node.getParentNode().addChild(n);else for(const scene of doc.getRoot().listScenes())if(scene.listChildren().includes(node))scene.addChild(n);
  expected.push({name:names[label],triangles:sourceTriangles.length,vertices:compact.sourceVertices.length,attributeHashes:hashes});offset+=sourceTriangles.length;
}
const oldMesh=node.getMesh();node.dispose();primitive.dispose();oldMesh.dispose();
for(const accessor of doc.getRoot().listAccessors())if(accessor.listParents().every(p=>p.propertyType==='Root'))accessor.dispose();
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);
const result=await io.read(output);assert.deepEqual(signature(result),clips);assert.deepEqual(result.getRoot().listTextures().map(t=>sha(t.getImage())),images);
const receipt={input,parentRigSha256:sha(bytes),source,sourceSha256:sha(sourceBytes),output,sha256:sha(await fs.readFile(output)),parts:expected,totalTriangles:offset,sourceAttributesAndImagesPreserved:true,protectedHandWeightsPreserved:true,protectedMask,legacyClipsPreserved:true,solveReused:reuseSolve,status:'Staging; independent multipose, collision/contact, volume and visual gates required',graph:proof};
await fs.writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({output,sha256:receipt.sha256,parts:expected.map(({name,triangles,vertices})=>({name,triangles,vertices}))},null,2));
