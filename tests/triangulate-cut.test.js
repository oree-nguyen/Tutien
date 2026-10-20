import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {triangulateCut} from '../tools/rig/triangulate-cut.mjs';

test('cloth closure retains every collinear source corner and its directed boundary',()=>{
 const original=[[0,0,0],[1,0,0],[2,0,0],[2,1,0],[0,1,0]];
 for(const rows of [original,original.toReversed()]){
  const {triangles}=triangulateCut(rows.map(p=>new Vector3(...p)));assert.equal(triangles.length,3);
  assert.deepEqual([...new Set(triangles.flat())].sort(),[0,1,2,3,4]);
 }
});
test('nonplanar garment closure uses existing source corners without inventing a body surface',()=>{
 const rows=[[0,0,0],[1,0,.01],[2,0,0],[2,1,.02],[0,1,0]],points=rows.map(p=>new Vector3(...p)),before=points.map(p=>p.toArray()),r=triangulateCut(points);
 assert.equal(r.triangles.length,3);assert.deepEqual(points.map(p=>p.toArray()),before);assert(r.triangles.flat().every(i=>i>=0&&i<points.length));
});
test('degenerate and crossed closure boundaries reject instead of omitting source corners',()=>{
 for(const rows of [[[0,0,0],[1,0,0],[2,0,0]],[[0,0,0],[1,1,0],[0,1,0],[1,0,0]]])assert.throws(()=>triangulateCut(rows.map(p=>new Vector3(...p))));
});
test('minimum-area 3D disk keeps concave boundary corners and the exact planar area',()=>{
 const points=[[0,0,0],[2,0,0],[2,1,0],[1,1,0],[1,2,0],[0,2,0]].map(p=>new Vector3(...p));
 const r=triangulateCut(points,{method:'minimum-area'});assert.equal(r.triangles.length,4);
 const area=r.triangles.reduce((sum,[a,b,c])=>sum+points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a])).length()/2,0);assert(Math.abs(area-3)<1e-12);
});
test('pose-constrained closure rejects an impossible boundary instead of reporting a false edge pass',()=>{
 const points=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]].map(p=>new Vector3(...p)),posedPoints=points.map(p=>p.clone().multiplyScalar(2));
 assert.throws(()=>triangulateCut(points,{method:'minimum-area',posedPoints,maxEdgeRatio:1.49}),/No nondegenerate source-corner disk/);
 const rigid=points.map(p=>p.clone().add(new Vector3(2,3,4))),r=triangulateCut(points,{method:'minimum-area',posedPoints:rigid,maxEdgeRatio:1.49});assert.equal(r.triangles.length,2);
});
test('a measured crossing exclusion forces another disk without changing any rim corner',()=>{
 const points=[[0,0,0],[2,0,0],[2,1,0],[0,1,0]].map(p=>new Vector3(...p)),before=points.map(p=>p.toArray()),initial=triangulateCut(points,{method:'minimum-area'}),
  forbiddenTriangles=new Set([initial.triangles[0].slice().sort((a,b)=>a-b).join(':')]),result=triangulateCut(points,{method:'minimum-area',forbiddenTriangles});
 assert(result.triangles.every(t=>!forbiddenTriangles.has(t.slice().sort((a,b)=>a-b).join(':'))));assert.deepEqual(points.map(p=>p.toArray()),before);assert.equal(result.triangles.length,2);
});
test('an unavoidable excluded source-rim triangle fails instead of reusing its measured crossing',()=>{
 const points=[[0,0,0],[1,0,0],[0,1,0]].map(p=>new Vector3(...p));
 assert.throws(()=>triangulateCut(points,{method:'minimum-area',forbiddenTriangles:new Set(['0:1:2'])}),/No nondegenerate source-corner disk/);
});
