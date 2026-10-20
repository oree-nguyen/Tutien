import assert from 'node:assert/strict';
import {Matrix4,Quaternion,Vector3,MathUtils} from 'three';

/** Secondary deformation joints, never replacement body/garment geometry.
 * The existing skeleton is immutable; each new inverse bind comes from the
 * actual appended hierarchy, not a guessed identity matrix.
 */
export function appendClothChains(doc,config){
 const skin=doc.getRoot().listSkins()[0];assert.equal(doc.getRoot().listSkins().length,1);
 const core=skin.listJoints(),hips=core.find(n=>n.getName()==='Hips');assert(hips);
 const rootInverse=new Matrix4().fromArray(hips.getWorldMatrix()).invert(),hipQ=new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(hips.getWorldMatrix())).normalize(),
  names=new Set(doc.getRoot().listNodes().map(n=>n.getName())),records=[];
 for(const chain of config.chains){
  assert(chain.rows>=2&&chain.rows<=16&&chain.spacing>0&&chain.anchor.length===3&&chain.anchor.every(Number.isFinite));
  let parent=hips;
  for(let row=0;row<chain.rows;row++){
   const name=chain.name+'_'+row;assert(!names.has(name));names.add(name);
   const node=doc.createNode(name).setExtras({secondaryCloth:{chain:chain.name,row,sourceMeshRequired:true,accepted:false}});
   if(row===0)node.setTranslation(new Vector3(...chain.anchor).applyMatrix4(rootInverse).toArray()).setRotation(hipQ.clone().invert().toArray());
   else node.setTranslation([0,-chain.spacing,0]);
   parent.addChild(node);skin.addJoint(node);records.push({name,chain:chain.name,row,index:skin.listJoints().length-1,bindRotation:node.getRotation(),bindTranslation:node.getTranslation()});parent=node;
  }
 }
 const original=skin.getInverseBindMatrices(),old=original.getArray(),values=new Float32Array((core.length+records.length)*16);values.set(old);
 for(const r of records)new Matrix4().fromArray(skin.listJoints()[r.index].getWorldMatrix()).invert().toArray(values,r.index*16);
 skin.setInverseBindMatrices(doc.createAccessor('Source_And_Secondary_Cloth_InverseBind',doc.getRoot().listBuffers()[0]).setType('MAT4').setArray(values));
 assert.deepEqual(values.subarray(0,old.length),old);assert.deepEqual(skin.listJoints().slice(0,core.length),core);
 return{coreJointCount:core.length,jointCount:skin.listJoints().length,records};
}

/** A staged drape guide in calibrated source space. Actual mesh collision and
 * strain must be checked separately. Fixed offsets preserve every link length.
 */
export function clothGuideRotations(config,skeleton,activation){
 assert(Number.isFinite(activation)&&activation>=0&&activation<=1);const result={};
 for(const chain of config.chains){
  assert(chain.anglesDegrees.length===chain.rows);
  for(let row=0;row<chain.rows;row++){
   const r=skeleton.records.find(r=>r.chain===chain.name&&r.row===row);assert(r);
   const turn=(chain.anglesDegrees[row]-(row?chain.anglesDegrees[row-1]:0))*activation;
   result[r.name]=new Quaternion(...r.bindRotation).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),MathUtils.degToRad(turn))).normalize().toArray();
  }
 }
 return result;
}
