import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('offline four-weight simplex projection satisfies feasibility and Euclidean optimality',()=>{
 const text=execFileSync('python3',['-m','unittest','discover','-s','tools/rig','-p','test_pose_weight_fit.py'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 assert.equal(text,'');
});
