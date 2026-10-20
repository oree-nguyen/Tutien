import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('offline cloth projection rejects collapse and retains legacy upper-only behavior',()=>{
 const r=spawnSync('python3',['tools/rig/test_cloth_corrective.py'],{encoding:'utf8',env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(r.stderr,/Ran 3 tests/);
});
