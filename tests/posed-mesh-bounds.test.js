import test from 'node:test';
import assert from 'node:assert/strict';
import {posedMeshBounds} from '../tools/rig/posed-mesh-bounds.mjs';

test('whole-mesh floor measurement exposes a garment below correctly grounded boots',()=>{
 const r=posedMeshBounds(Float64Array.from([0,.001,0, .1,-.12,.2, -.1,.002,.3]),Uint8Array.from([1,1,1]),Uint32Array.from([10,20,30]));
 assert.equal(r.minimum[1],-.12);assert.equal(r.minimumYVertex.sourceVertex,20);assert.deepEqual(r.maximum,[.1,.002,.3]);
});
test('unused accessor outliers are excluded, and a source identity is never guessed',()=>{
 const r=posedMeshBounds(Float64Array.from([0,.001,0, -9,-99,-8]),Uint8Array.from([1,0]));
 assert.deepEqual(r.minimum,[0,.001,0]);assert.equal(r.usedVertices,1);assert.equal(r.minimumYVertex.sourceVertex,null);
});
test('nonfinite used coordinates and mismatched layouts reject measurement',()=>{
 assert.throws(()=>posedMeshBounds(Float64Array.from([0,NaN,0]),Uint8Array.from([1])),/Nonfinite/);
 assert.throws(()=>posedMeshBounds(new Float64Array(6),new Uint8Array(1)),/layout/);
 assert.equal(posedMeshBounds(new Float64Array(3),new Uint8Array(1)),null);
});
