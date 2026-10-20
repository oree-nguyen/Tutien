/** Export and independently measure a zero-default, exact-pose corrective morph.
 * This is isolated staging tooling and never authorizes runtime activation.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO, Accessor} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4, Vector3} from 'three';
import {SourceProvenanceValidator} from './source-provenance.mjs';
import {SeamAccumulator} from './mesh-seams.mjs';
import {handStrain} from './hand-strain.mjs';
import {correctiveNormalDelta,accumulateSurfaceNormals,blendedSkinLinear} from './corrective-normals.mjs';

const base=process.argv[2], directory=process.argv[3];
assert(base && /^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory), 'Usage: node tools/rig/cloth-corrective.mjs <source-candidate-dir> .local/rig-candidates/<new-dir>');
assert.notEqual(base,directory);
const sha=b=>createHash('sha256').update(b).digest('hex');
const arrayBytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const solve=JSON.parse(await fs.readFile(directory+'/solve.json'));
assert.equal(solve.base,base);
const inputBytes=await fs.readFile(base+'/H01-C0-rigged.glb');
assert.equal(sha(inputBytes),solve.assetSha256);
for(const [name,expected] of Object.entries(solve.inputHashes))assert.equal(sha(await fs.readFile(base+'/'+name)),expected,name+' changed after solve');
const poseBytes=await fs.readFile(solve.poseFile);assert.equal(sha(poseBytes),solve.poseSha256);
const pose=JSON.parse(poseBytes);assert.equal(pose.passed,true,'Pose must be upstream validated');
const morphBytes=await fs.readFile(directory+'/morph-position.f32bin');assert.equal(sha(morphBytes),solve.morphSha256);
const morph=new Float32Array(morphBytes.buffer,morphBytes.byteOffset,morphBytes.byteLength/4);
const protectedBytes=await fs.readFile(base+'/protected.bin');
assert.equal(morph.length,protectedBytes.length*3);
for(let i=0;i<protectedBytes.length;i++)if(protectedBytes[i])for(let k=0;k<3;k++)assert.equal(morph[i*3+k],0,'Protected hand morph must be zero');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS), doc=await io.readBinary(inputBytes);
const normalMorphEnabled=process.env.CLOTH_CORRECTIVE_NORMALS==='1';
const normalMorph=normalMorphEnabled?await generateNormalMorph():null;
const buffer=doc.getRoot().listBuffers()[0];
const originals=[];
for(const node of doc.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
  assert.equal(primitive.listTargets().length,0,'Existing morphs require explicit compositing');
  const sourceIds=primitive.getAttribute('_SOURCE_VERTEX')?.getArray();assert(sourceIds);
  const values=new Float32Array(sourceIds.length*3);
  for(let i=0;i<sourceIds.length;i++)values.set(morph.subarray(sourceIds[i]*3,sourceIds[i]*3+3),i*3);
  const target=doc.createPrimitiveTarget().setAttribute('POSITION',doc.createAccessor('HeldPose_SurfaceCorrection',buffer).setType(Accessor.Type.VEC3).setArray(values));
  if(normalMorph){
    const normals=new Float32Array(values.length);
    for(let i=0;i<sourceIds.length;i++)normals.set(normalMorph.subarray(sourceIds[i]*3,sourceIds[i]*3+3),i*3);
    target.setAttribute('NORMAL',doc.createAccessor('HeldPose_NormalCorrection',buffer).setType(Accessor.Type.VEC3).setArray(normals));
  }
  primitive.addTarget(target);
  node.getMesh().setWeights([0]);
  node.setWeights([0]);
  node.getMesh().setExtras({...node.getMesh().getExtras(),targetNames:['HeldPose_SurfaceCorrection'],correctivePrototype:{accepted:false,poseSha256:solve.poseSha256,defaultWeight:0}});
  originals.push({node:node.getName(),attributes:Object.fromEntries(primitive.listSemantics().map(s=>[s,sha(arrayBytes(primitive.getAttribute(s).getArray()))])),indices:sha(arrayBytes(primitive.getIndices().getArray()))});
  const provenance=primitive.getExtras().sourceProvenance;
  for(const file of [provenance.triangleMap.file,provenance.weldMap.file,provenance.weldMap.review.file])await fs.copyFile(path.resolve(base,file),path.resolve(directory,file));
}
const images=doc.getRoot().listTextures().map(t=>sha(t.getImage()));
const output=directory+'/H01-C0-rigged.glb';await io.write(output,doc);
const reread=await io.read(output);
assert.deepEqual(reread.getRoot().listTextures().map(t=>sha(t.getImage())),images);
const actual=[];
for(const node of reread.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
  assert.deepEqual(node.getWeights(),[0]);
  assert.equal(primitive.listTargets().length,1);
  const target=primitive.listTargets()[0],sourceIds=primitive.getAttribute('_SOURCE_VERTEX').getArray(),
    positionDelta=target.getAttribute('POSITION').getArray(),normalDelta=target.getAttribute('NORMAL')?.getArray();
  assert.equal(!!normalDelta,normalMorphEnabled,'NORMAL morph must survive serialization');
  for(let i=0;i<sourceIds.length;i++)for(let k=0;k<3;k++){
    assert.equal(positionDelta[i*3+k],morph[sourceIds[i]*3+k]);
    if(normalDelta)assert.equal(normalDelta[i*3+k],normalMorph[sourceIds[i]*3+k]);
  }
  actual.push({node:node.getName(),attributes:Object.fromEntries(primitive.listSemantics().map(s=>[s,sha(arrayBytes(primitive.getAttribute(s).getArray()))])),indices:sha(arrayBytes(primitive.getIndices().getArray()))});
}
assert.deepEqual(actual,originals,'Source attributes, skin weights or triangles changed on morph export');

async function validate(weight,held){
  const candidate=await io.read(output), validator=new SourceProvenanceValidator(output), seams=new SeamAccumulator();
  if(held)for(const [name,q] of Object.entries(pose.rotations)){
    const nodes=candidate.getRoot().listNodes().filter(n=>n.getName()===name);assert.equal(nodes.length,1);nodes[0].setRotation(q);
  }
  assert(!pose.translations&&!pose.scales,'This exact held-pose exporter requires rotation-only channels');
  const meshes=[];let protectedMax=0;
  for(const node of candidate.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    const provenance=await validator.validate(primitive);assert.equal(provenance.verified,true,JSON.stringify(provenance.errors));
    const source=primitive.getAttribute('POSITION').getArray(),delta=primitive.listTargets()[0].getAttribute('POSITION').getArray();
    const skin=node.getSkin(),matrices=skin.listJoints().map((joint,i)=>new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[]))));
    const ids=primitive.getAttribute('JOINTS_0').getArray(),weights=primitive.getAttribute('WEIGHTS_0').getArray();
    const posed=new Float64Array(source.length),v=new Vector3(),q=new Vector3();
    for(let i=0;i<source.length/3;i++){
      v.set(0,0,0);
      for(let k=0;k<4;k++)if(weights[i*4+k]){
        q.fromArray(source,i*3);q.x+=weight*delta[i*3];q.y+=weight*delta[i*3+1];q.z+=weight*delta[i*3+2];
        q.applyMatrix4(matrices[ids[i*4+k]]);v.addScaledVector(q,weights[i*4+k]);
      }
      v.toArray(posed,i*3);
      const sourceId=provenance.vertexIds[i];
      if(protectedBytes[sourceId])protectedMax=Math.max(protectedMax,Math.hypot(delta[i*3],delta[i*3+1],delta[i*3+2])*weight);
      seams.add(provenance.source.namespace+':'+provenance.weldIds[i],{identity:{node:node.getName(),vertex:i},bind:Array.from(source.subarray(i*3,i*3+3)),position:Array.from(posed.subarray(i*3,i*3+3))});
    }
    const strain=handStrain({primitive,mask:new Uint8Array(source.length/3).fill(1),position:i=>new Vector3().fromArray(posed,i*3)});
    meshes.push({node:node.getName(),vertices:source.length/3,...strain,sourceProvenanceVerified:true});
  }
  const coverage=validator.coverage(),seam=seams.measure();
  const measured=meshes.every(m=>m.passed)&&coverage.passed&&seam.pairs>0&&seam.invalidPositions===0&&seam.maximumMillimetres<=.001&&protectedMax===0;
  return {pose:held?solve.poseFile:'bind',poseSha256:held?solve.poseSha256:null,morphWeight:weight,sourceCoverage:coverage,seams:seam,protectedMorphMaximumMetres:protectedMax,meshes,measuredGeometryGatesPassed:measured,accepted:false,scope:'Original unchanged 1.5/2 strain limits, source coverage and source-copy seams at one pose. Full animation, collision, cross-section, normals and visual acceptance are unverified.'};
}
const validation={input:output,sha256:sha(await fs.readFile(output)),parentSha256:solve.assetSha256,sourceAttributesAndImagesPreserved:true,normalMorphEnabled,normalMorphMethod:normalMorph?'Authored normal rotated with original-to-corrected geometric surface normals, then inverse exact blended skin; protected hand normal deltas remain zero':null,defaultMorphWeight:0,bind:await validate(0,false),held:await validate(1,true),accepted:false};
await fs.writeFile(directory+'/validation.json',JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({output,sha256:validation.sha256,bindPassed:validation.bind.measuredGeometryGatesPassed,heldPassed:validation.held.measuredGeometryGatesPassed,seams:validation.held.seams,meshes:validation.held.meshes.map(({node,p999,maximum,passed})=>({node,p999,maximum,passed})),accepted:false},null,2));

async function generateNormalMorph(){
  const copy=await io.readBinary(inputBytes);
  for(const[name,rotation]of Object.entries(pose.rotations)){
    const matches=copy.getRoot().listNodes().filter(n=>n.getName()===name);assert.equal(matches.length,1);matches[0].setRotation(rotation);
  }
  assert(!pose.translations&&!pose.scales,'Normal transport requires the same rotation-only held pose');
  const weldBytes=await fs.readFile(base+'/source-welds.u32bin'),weld=new Uint32Array(weldBytes.buffer,weldBytes.byteOffset,weldBytes.byteLength/4),
    beforeNormals=new Float64Array(morph.length),afterNormals=new Float64Array(morph.length),records=[];
  assert.equal(weld.length,protectedBytes.length);
  for(const node of copy.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    const sourceIds=primitive.getAttribute('_SOURCE_VERTEX').getArray(),source=primitive.getAttribute('POSITION').getArray(),
      normals=primitive.getAttribute('NORMAL').getArray(),ids=primitive.getAttribute('JOINTS_0').getArray(),weights=primitive.getAttribute('WEIGHTS_0').getArray(),
      skin=node.getSkin(),matrices=skin.listJoints().map((j,i)=>new Matrix4().fromArray(j.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[])))),
      before=new Float64Array(source.length),after=new Float64Array(source.length),groups=new Uint32Array(sourceIds.length),v=new Vector3(),q=new Vector3(),a=new Vector3();
    for(let i=0;i<sourceIds.length;i++){
      groups[i]=weld[sourceIds[i]];v.set(0,0,0);a.set(0,0,0);
      for(let k=0;k<4;k++)if(weights[i*4+k]){
        q.fromArray(source,i*3).applyMatrix4(matrices[ids[i*4+k]]);v.addScaledVector(q,weights[i*4+k]);
        q.fromArray(source,i*3).add(new Vector3().fromArray(morph,sourceIds[i]*3)).applyMatrix4(matrices[ids[i*4+k]]);a.addScaledVector(q,weights[i*4+k]);
      }
      v.toArray(before,i*3);a.toArray(after,i*3);
    }
    const indices=primitive.getIndices().getArray();
    accumulateSurfaceNormals(indices,before,groups,beforeNormals);accumulateSurfaceNormals(indices,after,groups,afterNormals);
    records.push({sourceIds,normals,ids,weights,matrices,groups});
  }
  const result=new Float32Array(morph.length),seen=new Uint8Array(protectedBytes.length);
  for(const r of records)for(let i=0;i<r.sourceIds.length;i++){
    const id=r.sourceIds[i];if(seen[id])continue;seen[id]=1;
    const group=r.groups[i],delta=correctiveNormalDelta(Array.from(r.normals.subarray(i*3,i*3+3)),
      Array.from(beforeNormals.subarray(group*3,group*3+3)),Array.from(afterNormals.subarray(group*3,group*3+3)),
      blendedSkinLinear(r.matrices,r.ids,r.weights,i),protectedBytes[id]!==0);
    assert(delta.every(Number.isFinite));result.set(delta,id*3);
  }
  assert(seen.every(Boolean),'Normal transport must retain every original source vertex');
  return result;
}
