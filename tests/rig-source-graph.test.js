import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('source graph, UV seam identity and continuous four-bone supports pass independent Python regressions',()=>{
  const result=spawnSync('python3',['tools/rig/test_source_garment_graph.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
  assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
  assert.match(result.stderr,/Ran [1-9][0-9]* tests/,'Python must execute real regressions');
});

test('explicit source-edge cuts match an independent sparse corner-fan oracle and reject invalid topology',()=>{
 const result=spawnSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_coat_cut_topology.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stderr,/Ran 4 tests/);
});

test('bounded FEM projected Newton matches an independent NNLS optimum without a small-field tolerance escape',()=>{
 const result=spawnSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_bounded_fem_newton.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stderr,/Ran 2 tests/);
});

test('source boot graph refuses attached clothing and invalid sole domains',()=>{
 const result=spawnSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_lower_leg_domains.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stderr,/Ran 3 tests/);
});

test('offline mesh-floor residual agrees with independent source-vertex matrix skinning',()=>{
 const result=spawnSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_mesh_foot_constraints.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stderr,/Ran 2 tests/);
});
