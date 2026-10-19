import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('source graph, UV seam identity and continuous four-bone supports pass independent Python regressions',()=>{
  const result=spawnSync('python3',['tools/rig/test_source_garment_graph.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
  assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
  assert.match(result.stderr,/Ran [1-9][0-9]* tests/,'Python must execute real regressions');
});
