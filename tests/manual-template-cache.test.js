import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualTemplateCache} from '../src/manual-template-cache.js';

async function triangleFixture() {
  const {Document,NodeIO,Accessor}=await import('@gltf-transform/core');
  const doc=new Document(),buffer=doc.createBuffer();
  const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor('',buffer).setType(Accessor.Type.VEC3).setArray(new Float32Array([0,0,0,1,0,0,0,1,0])));
  doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(primitive)));
  const bytes=await new NodeIO().writeBinary(doc);
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}

test('shared source stays alive until every actor releases, then disposes once', async () => {
  let loads=0,disposals=0;
  const template={},cache=createManualTemplateCache(value=>{assert.equal(value,template);disposals++;});
  const a={},b={},url='https://localhost/models/source.glb?v=hash';
  const load=async()=>{loads++;return template;};
  const one=cache.acquire(url,load,{owner:a,retain:false});
  const two=cache.acquire(url,load,{owner:b,retain:false});
  assert.equal(one,two);
  assert.equal(await one,template);
  assert.equal(loads,1);
  assert.deepEqual(cache.metrics(),{templates:1,referenced:1,leases:2});
  cache.release(a);
  cache.releaseUrl(url);
  await Promise.resolve();
  assert.equal(disposals,0,'unowned release cannot evict another actor');
  cache.release(b);
  cache.release(b);
  await Promise.resolve();
  assert.equal(disposals,1);
  assert.deepEqual(cache.metrics(),{templates:0,referenced:0,leases:0});
});

test('disposing during decode cannot leak source or dispose a replacement entry', async () => {
  let resolve,disposed=[];
  const cache=createManualTemplateCache(t=>disposed.push(t)),a={},b={};
  const pending=cache.acquire('source',()=>new Promise(r=>{resolve=r;}),{owner:a,retain:false});
  await Promise.resolve();
  cache.release(a);
  const replacement=cache.acquire('source',async()=>2,{owner:b,retain:false});
  resolve(1);
  await pending;
  await replacement;
  assert.deepEqual(disposed,[1]);
  assert.deepEqual(cache.metrics(),{templates:1,referenced:1,leases:1});
  cache.release(b);
  await Promise.resolve();
  assert.deepEqual(disposed,[1,2]);
});

test('failed decode clears owner references and permits a fresh retry', async () => {
  const cache=createManualTemplateCache(()=>assert.fail('failed template must not dispose')),owner={};
  await assert.rejects(cache.acquire('broken',async()=>{throw Error('decode');},{owner,retain:false}),/decode/);
  assert.deepEqual(cache.metrics(),{templates:0,referenced:0,leases:0});
  cache.release(owner);
  assert.equal(await cache.acquire('broken',async()=>42,{owner}),42);
});

test('normal gameplay templates remain warm after clone disposal and share one owner lease', async () => {
  let loads=0;
  const cache=createManualTemplateCache(()=>assert.fail('retained template')),a={},b={};
  const load=async()=>++loads;
  await cache.acquire('driver',load,{owner:a});
  await cache.acquire('driver',load,{owner:a});
  assert.equal(cache.metrics().leases,1);
  cache.release(a);
  assert.deepEqual(cache.metrics(),{templates:1,referenced:0,leases:0});
  await cache.acquire('driver',load,{owner:b});
  assert.equal(loads,1);
});

test('real manual asset adapter uses one URL identity for load/release and releases shared GPU resources once', async () => {
  const {manualHeroAssetUrls}=await import('../src/model-asset-registry.js');
  const {loadManualAsset,releaseManualAssets,releaseManualSourceAsset,manualTemplateMetrics}=await import('../src/manual-asset-cache.js');
  const bytes=await triangleFixture(),originalFetch=globalThis.fetch;
  const a={},b={};
  let requests=0,disposed=0;
  manualHeroAssetUrls['source-test-cache']='/models/test-source.glb';
  globalThis.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>bytes.slice(0)};};
  try {
    const first=await loadManualAsset('source-test-cache',false,a);
    const second=await loadManualAsset('source-test-cache',false,b);
    assert.equal(first,second);
    first.scene.traverse(n=>n.geometry?.addEventListener('dispose',()=>disposed++));
    assert.equal(requests,1);
    releaseManualSourceAsset('source-test-cache',a);
    await Promise.resolve();
    assert.equal(disposed,0);
    assert.equal(manualTemplateMetrics().leases,1);
    releaseManualAssets(b);
    await Promise.resolve();
    assert.equal(disposed,1);
    assert.equal(manualTemplateMetrics().templates,0);
  } finally {
    globalThis.fetch=originalFetch;
    delete manualHeroAssetUrls['source-test-cache'];
    releaseManualAssets(a);releaseManualAssets(b);
  }
});

test('failed source pair releases its pending sibling without evicting another preview owner', async () => {
  const {manualHeroAssetUrls}=await import('../src/model-asset-registry.js');
  const {loadManualAsset,releaseManualAssets,releaseManualSourceAsset,manualTemplateMetrics}=await import('../src/manual-asset-cache.js');
  const bytes=await triangleFixture(),originalFetch=globalThis.fetch;
  const failedOwner={},liveOwner={},bodyKey='source-test-pair-body',weaponKey='source-test-pair-weapon';
  let finishBody,bodyRequests=0,disposed=0;
  manualHeroAssetUrls[bodyKey]='/models/test-source-pair-body.glb';
  manualHeroAssetUrls[weaponKey]='/models/test-source-pair-weapon.glb';
  globalThis.fetch=async url=>{
    if(url.endsWith('test-source-pair-weapon.glb'))return {ok:false,status:503};
    bodyRequests++;
    await new Promise(resolve=>{finishBody=resolve;});
    return {ok:true,arrayBuffer:async()=>bytes.slice(0)};
  };
  try {
    const body=loadManualAsset(bodyKey,false,failedOwner);
    const pair=Promise.all([body,loadManualAsset(weaponKey,false,failedOwner)]).catch(error=>{
      releaseManualSourceAsset(bodyKey,failedOwner);
      releaseManualSourceAsset(weaponKey,failedOwner);
      throw error;
    });
    const sharedBody=loadManualAsset(bodyKey,false,liveOwner);
    await assert.rejects(pair,/Model HTTP 503/);
    assert.deepEqual(manualTemplateMetrics(),{templates:1,referenced:1,leases:1});
    finishBody();
    const template=await sharedBody;
    assert.equal(await body,template);
    template.scene.traverse(node=>node.geometry?.addEventListener('dispose',()=>disposed++));
    assert.equal(bodyRequests,1);
    assert.equal(disposed,0);
    releaseManualAssets(liveOwner);
    await Promise.resolve();
    assert.equal(disposed,1);
    assert.deepEqual(manualTemplateMetrics(),{templates:0,referenced:0,leases:0});

    // The same failure with no second owner must evict even an unfinished load.
    const loneBody=loadManualAsset(bodyKey,false,failedOwner);
    await assert.rejects(Promise.all([loneBody,loadManualAsset(weaponKey,false,failedOwner)]).catch(error=>{
      releaseManualSourceAsset(bodyKey,failedOwner);
      releaseManualSourceAsset(weaponKey,failedOwner);
      throw error;
    }),/Model HTTP 503/);
    assert.deepEqual(manualTemplateMetrics(),{templates:0,referenced:0,leases:0});
    finishBody();
    await loneBody;
    assert.deepEqual(manualTemplateMetrics(),{templates:0,referenced:0,leases:0});
  } finally {
    finishBody?.();
    globalThis.fetch=originalFetch;
    delete manualHeroAssetUrls[bodyKey];delete manualHeroAssetUrls[weaponKey];
    releaseManualAssets(failedOwner);releaseManualAssets(liveOwner);
  }
});

test('late compressed failure does not reacquire a released owner while a live owner can fall back', async () => {
  const {manualHeroAssetUrls}=await import('../src/model-asset-registry.js');
  const {configureGpuTextures}=await import('../src/gpu-textures.js');
  const {loadManualAsset,releaseManualAssets,manualTemplateMetrics}=await import('../src/manual-asset-cache.js');
  configureGpuTextures({extensions:{has:()=>false},capabilities:{isWebGL2:true}});
  const bytes=await triangleFixture(),originalFetch=globalThis.fetch;
  const releasedOwner={},liveOwner={},key='source-test-late-fallback',companionKey='source-test-late-companion';
  const keys=[key,key+'-gpu',companionKey];
  manualHeroAssetUrls[key]='/models/test-late-fallback.glb';
  manualHeroAssetUrls[key+'-gpu']='/models/test-late-fallback-gpu.glb';
  manualHeroAssetUrls[companionKey]='/models/test-late-companion.glb';
  let failGpu,cpuRequests=0,gpuRequests=0;
  globalThis.fetch=async url=>{
    if(url.endsWith('test-late-fallback-gpu.glb')){
      gpuRequests++;
      await new Promise(resolve=>{failGpu=resolve;});
      return {ok:false,status:502};
    }
    if(url.endsWith('test-late-companion.glb'))return {ok:false,status:503};
    cpuRequests++;
    return {ok:true,arrayBuffer:async()=>bytes.slice(0)};
  };
  try {
    const abandoned=loadManualAsset(key,true,releasedOwner);
    const pair=Promise.all([abandoned,loadManualAsset(companionKey,false,releasedOwner)]).catch(error=>{
      releaseManualAssets(releasedOwner);
      throw error;
    });
    const shared=loadManualAsset(key,true,liveOwner);
    await assert.rejects(pair,/Model HTTP 503/);
    failGpu();
    await assert.rejects(abandoned,/Model HTTP 502/);
    const template=await shared;
    assert.ok(template.scene);
    assert.equal(gpuRequests,1);
    assert.equal(cpuRequests,1);
    assert.deepEqual(manualTemplateMetrics(),{templates:1,referenced:1,leases:1});
    releaseManualAssets(liveOwner);
    await Promise.resolve();
    assert.deepEqual(manualTemplateMetrics(),{templates:0,referenced:0,leases:0});
    // Release generations cancel old work without permanently banning reuse.
    await loadManualAsset(key,false,releasedOwner);
    assert.deepEqual(manualTemplateMetrics(),{templates:1,referenced:1,leases:1});
    releaseManualAssets(releasedOwner);
    await Promise.resolve();
    assert.deepEqual(manualTemplateMetrics(),{templates:0,referenced:0,leases:0});
  } finally {
    failGpu?.();
    globalThis.fetch=originalFetch;
    for(const entry of keys)delete manualHeroAssetUrls[entry];
    releaseManualAssets(releasedOwner);releaseManualAssets(liveOwner);
  }
});
