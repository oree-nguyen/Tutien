import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceSurfaceIntersections} from '../tools/rig/surface-intersections.mjs';

test('actual crossing source faces are detected while separated faces are clear',()=>{
  const p=[-1,-1,0,1,-1,0,0,1,0,0,-.5,-1,0,-.5,1,0,.5,0],t=[0,1,2,3,4,5],w=[0,1,2,3,4,5],labels=[1,2];
  assert.equal(sourceSurfaceIntersections({positions:p,triangles:t,welds:w,labels}).crossingPairs,1);
  const shifted=p.map((n,i)=>i>=9&&i%3===0?n+5:n);
  assert.equal(sourceSurfaceIntersections({positions:shifted,triangles:t,welds:w,labels}).crossingPairs,0);
});

test('original welded seam neighbors are excluded and coplanar overlap stays ambiguous',()=>{
  const p=[0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,-1,0],t=[0,1,2,3,4,5];
  const stitched=sourceSurfaceIntersections({positions:p,triangles:t,welds:[0,1,2,0,1,3],labels:[1,2]});
  assert.equal(stitched.crossingPairs,0);assert.ok(stitched.excludedSourceNeighborPairs>0);
  const overlap=sourceSurfaceIntersections({positions:[...p.slice(0,9),.1,.1,0,.6,.1,0,.1,.6,0],triangles:t,welds:[0,1,2,3,4,5],labels:[1,2]});
  assert.equal(overlap.crossingPairs,0);assert.equal(overlap.coplanarOverlapPairs,1);assert.equal(overlap.accepted,false);
});
