import test from "node:test";
import assert from "node:assert/strict";
import {Document} from "@gltf-transform/core";
import {Bone,Group,Vector3} from "three";
import {sourceFootContact,updatePlantedContact} from "../tools/rig/source-foot-contact.mjs";

test("steps reset only after a declared swing or supporting-joint change",()=>{
  const contact={planted:true,anchorJoint:"RightToeBase"},p=new Vector3(0,0,0);
  let r=updatePlantedContact(null,contact,p);
  r=updatePlantedContact(r.state,contact,new Vector3(.025,0,0));
  assert.equal(r.slide,.025);
  const swing=updatePlantedContact(r.state,{planted:false,anchorJoint:"RightFoot"},new Vector3(.2,.08,0));
  assert.equal(swing.state,null);
  r=updatePlantedContact(swing.state,{planted:true,anchorJoint:"RightFoot"},new Vector3(.2,0,0));
  assert.equal(r.slide,0);
  assert.ok(Math.abs(updatePlantedContact(r.state,{planted:true,anchorJoint:"RightFoot"},new Vector3(.209,0,0)).slide-.009)<1e-12);
});

test("actual source vertex skinning exposes penetration even when the foot is called airborne",()=>{
  const d=new Document(),buffer=d.createBuffer(),a=(type,array)=>d.createAccessor().setType(type).setArray(array).setBuffer(buffer),
    joint=d.createNode("foot"),ibm=a("MAT4",Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])),
    skin=d.createSkin().addJoint(joint).setInverseBindMatrices(ibm),
    p=d.createPrimitive().setAttribute("POSITION",a("VEC3",Float32Array.from([-.1,0,0,.1,0,0,-.1,.02,.1,.1,.02,.1])))
      .setAttribute("JOINTS_0",a("VEC4",new Uint16Array(16)))
      .setAttribute("WEIGHTS_0",a("VEC4",Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0])));
  d.createNode("source").setMesh(d.createMesh().addPrimitive(p)).setSkin(skin);
  const root=new Group(),bone=new Bone();bone.name="foot";root.add(bone);root.updateMatrixWorld(true);
  const foot=sourceFootContact(d,root);
  assert.equal(foot.selection.sides.Left.vertices,2);
  assert.equal(foot.measure().Left.minimumY,0);
  bone.position.y=-.03;root.updateMatrixWorld(true);
  const airborne=updatePlantedContact(null,{planted:false,anchorJoint:"foot"},new Vector3());
  assert.equal(airborne.slide,0);
  assert.equal(foot.measure().Right.minimumY,-.03);
  bone.position.y=.08;root.updateMatrixWorld(true);
  assert.equal(foot.measure().Left.soleMaximumY,.08);
});

test('graph boot measurements retain source IDs while the original floor gate still exposes cloth penetration',()=>{
 const d=new Document(),buffer=d.createBuffer(),a=(type,array)=>d.createAccessor().setType(type).setArray(array).setBuffer(buffer),
  foot=d.createNode('Foot'),cloth=d.createNode('Cloth'),matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],skin=d.createSkin().addJoint(foot).addJoint(cloth).setInverseBindMatrices(a('MAT4',Float32Array.from([...matrix,...matrix]))),
  p=d.createPrimitive().setAttribute('POSITION',a('VEC3',Float32Array.from([-.1,0,0,.1,0,0,-.1,.2,.1,.1,.2,.1,-.2,.1,0,.2,.1,0])))
   .setAttribute('_SOURCE_VERTEX',a('SCALAR',Uint32Array.from([10,11,12,13,14,15])))
   .setAttribute('JOINTS_0',a('VEC4',Uint16Array.from([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0])))
   .setAttribute('WEIGHTS_0',a('VEC4',Float32Array.from(Array.from({length:24},(_,i)=>i%4===0?1:0))));
 d.createNode('source').setMesh(d.createMesh().addPrimitive(p)).setSkin(skin);
 const root=new Group(),footBone=new Bone(),clothBone=new Bone();footBone.name='Foot';clothBone.name='Cloth';clothBone.position.y=-.3;root.add(footBone,clothBone);root.updateMatrixWorld(true);
 const selection={sides:{Left:{vertexIds:[11,13],soleVertexIds:[11]},Right:{vertexIds:[10,12],soleVertexIds:[10]}}},all=sourceFootContact(d,root),boots=sourceFootContact(d,root,{sourceSelection:selection});
 assert(Math.abs(all.measure().Right.minimumY+.2)<1e-7);assert.equal(boots.measure().Right.minimumY,0);assert.equal(boots.selection.sides.Left.vertices,2);
 assert.equal(boots.selection.visuallyVerified,false);selection.sides.Left.vertexIds.push(999);
 assert.throws(()=>sourceFootContact(d,root,{sourceSelection:selection}),/Missing mapped source boot vertices/);
});
