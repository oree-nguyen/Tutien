import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { usesManualH01 } from '../src/manual-hero.js';

test('manual trial applies only to H01 base costume and keeps other loadouts', () => {
  assert.equal(usesManualH01({kind:'hero',hero:0,costume:0}),true);
  assert.equal(usesManualH01({kind:'hero',hero:0,costume:1}),false);
  assert.equal(usesManualH01({kind:'hero',hero:4,costume:0}),false);
  assert.equal(usesManualH01({kind:'beast',hero:0,costume:0}),false);
});
test('actual imported LODs match source receipt and embed all three PBR channels', async () => {
  const receipt=JSON.parse(await readFile('public/models/h01-c0/provenance.json','utf8'));
  assert.equal(receipt.rigged,true);
  assert.equal(receipt.anatomicallySegmented,false);
  const budgets={high:60000,medium:9000,low:900};
  for(const level of receipt.levels){
    const raw=await readFile('public/models/h01-c0/'+level.file);
    assert.equal(createHash('sha256').update(raw).digest('hex'),level.sha256);
    assert.equal(raw.readUInt32LE(8),raw.length);
    const d=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
    let triangles=0;
    for(const mesh of d.meshes)for(const primitive of mesh.primitives){
      triangles+=d.accessors[primitive.indices].count/3;
      assert.ok(Number.isInteger(primitive.attributes.TEXCOORD_0));
      const material=d.materials[primitive.material];
      assert.ok(material.pbrMetallicRoughness.baseColorTexture);
      assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);
      assert.ok(material.normalTexture);
    }
    assert.equal(triangles,level.triangles);
    assert.ok(triangles<=budgets[level.detail]);
    assert.ok(d.images.length>=3 && d.images.every(image=>Number.isInteger(image.bufferView)&&!image.uri));
    assert.equal(d.skins?.length,1);
    assert.equal(d.skins[0].joints.length,52);
    for(const mesh of d.meshes)for(const primitive of mesh.primitives){
      assert.ok(Number.isInteger(primitive.attributes.JOINTS_0));
      assert.ok(Number.isInteger(primitive.attributes.WEIGHTS_0));
    }
    assert.deepEqual(d.animations.map(a=>a.name).sort(),['Attack','Cast','Dash','Entrance','Idle','Run']);
    for(const clip of d.animations) {
      assert.ok(clip.channels.some(c=>d.nodes[c.target.node].name==='RightHand'));
      assert.ok(clip.channels.some(c=>d.nodes[c.target.node].name==='LeftLeg'));
    }
  }
});

test('real embedded animations deform hands and legs, cloned actors remain independent', async () => {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const { AnimationMixer, Vector3 } = await import('three');
  const raw=await readFile('public/models/h01-c0/h01-c0-medium.glb');
  const jsonLength=raw.readUInt32LE(12);
  const document=JSON.parse(raw.subarray(20,20+jsonLength).toString());
  // CPU-only loader omits image decoding; the preceding test validates actual
  // embedded images. Geometry, joints, weights and clip samples stay untouched.
  delete document.images;delete document.textures;delete document.materials;
  for(const mesh of document.meshes)for(const p of mesh.primitives)delete p.material;
  const json=Buffer.from(JSON.stringify(document));
  const padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const binary=raw.subarray(20+jsonLength);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);
  header.writeUInt32LE(20+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const clean=Buffer.concat([header,padded,binary]);
  const gltf=await new GLTFLoader().setMeshoptDecoder((await import('three/addons/libs/meshopt_decoder.module.js')).MeshoptDecoder).parseAsync(clean.buffer.slice(clean.byteOffset,clean.byteOffset+clean.byteLength),'');
  const first=clone(gltf.scene),second=clone(gltf.scene);
  const mixer=new AnimationMixer(first);
  mixer.clipAction(gltf.animations.find(c=>c.name==='Run')).play();
  first.updateMatrixWorld(true);second.updateMatrixWorld(true);
  const hand=first.getObjectByName('RightHand'),leg=first.getObjectByName('LeftLeg');
  const handBefore=hand.getWorldPosition(new Vector3()),legBefore=leg.getWorldPosition(new Vector3());
  mixer.update(.2);first.updateMatrixWorld(true);
  assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(handBefore)>.02);
  assert.ok(leg.getWorldPosition(new Vector3()).distanceTo(legBefore)>.02);
  assert.ok(second.getObjectByName('RightHand').getWorldPosition(new Vector3()).distanceTo(handBefore)<1e-6);
  let skin;first.traverse(n=>{if(n.isSkinnedMesh)skin=n;});
  skin.skeleton.update();
  const posed=skin.getVertexPosition(0,new Vector3());
  const staticVertex=skin.geometry.attributes.position;
  let changed=posed.distanceTo(new Vector3().fromBufferAttribute(staticVertex,0))>.001;
  for(let i=1;!changed&&i<staticVertex.count;i+=37)
    changed=skin.getVertexPosition(i,new Vector3()).distanceTo(new Vector3().fromBufferAttribute(staticVertex,i))>.001;
  assert.ok(changed,'skin weights must deform actual source vertices');
});
