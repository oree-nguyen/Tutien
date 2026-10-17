import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelTemplateCache} from '../src/model-template-cache.js';
test('URL deduplication retains resources until the last live clone releases its lease',async()=>{
 const disposed=[],cache=new ModelTemplateCache({maxUnused:0,dispose:x=>disposed.push(x)}),a={},b={};let calls=0;
 const create=()=>({id:++calls});
 const first=cache.load('/a',create,a),second=cache.load('/a',create,b);
 assert.equal(first,second);const template=await first;assert.equal(calls,1);
 cache.release(a);assert.equal(disposed.length,0);assert.equal(cache.inspect().leases,1);
 cache.release(b);assert.deepEqual(disposed,[template]);assert.equal(cache.inspect().templates,0);
});
test('release while decoding disposes only after decode completes, and failed loads can retry',async()=>{
 let finish;const disposed=[],cache=new ModelTemplateCache({maxUnused:0,dispose:x=>disposed.push(x)}),owner={};
 const promise=cache.load('/pending',()=>new Promise(r=>finish=r),owner);await Promise.resolve();cache.release(owner);assert.equal(disposed.length,0);finish('decoded');await promise;assert.deepEqual(disposed,['decoded']);
 await assert.rejects(cache.load('/failure',()=>{throw Error('decode failure');},owner));
 assert.equal(await cache.load('/failure',()=>42,owner),42);cache.release(owner);assert.equal(disposed.at(-1),42);
});
test('LRU budget applies only to unused templates and never evicts a live actor',async()=>{
 const disposed=[],cache=new ModelTemplateCache({maxUnused:1,dispose:x=>disposed.push(x)}),owner={};
 await cache.load('/live',()=>1,owner);await cache.load('/old',()=>2);await cache.load('/new',()=>3);
 assert.deepEqual(disposed,[2]);assert.equal(cache.inspect().referenced,1);
 cache.release(owner);assert.deepEqual(disposed,[2,1]);assert.equal(cache.inspect().templates,1);
});
