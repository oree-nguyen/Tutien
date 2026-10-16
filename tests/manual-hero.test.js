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
  assert.equal(receipt.rigged,false);
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
    assert.equal(d.skins?.length??0,0);
  }
});
