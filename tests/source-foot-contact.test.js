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
