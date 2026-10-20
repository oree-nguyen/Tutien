import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const base='.local/rig-candidates/semantic-garment-v6',selection='.local/rig-candidates/remaining-source-review',
  output=process.env.REMAINING_PREVIEW_OUTPUT??'docs/anim-report/conver10-redo/remaining-source-review';
await fs.mkdir(output,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),report=JSON.parse(await fs.readFile(selection+'/components.json')),
  bytes=await fs.readFile(base+'/H01-C0-rigged.glb'),fb=await fs.readFile(selection+'/largest-remaining-source-faces.u32bin'),
  wanted=new Set(new Uint32Array(fb.buffer,fb.byteOffset,fb.byteLength/4)),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  node=doc.getRoot().listNodes().find(n=>n.getName()==='H01_Remaining_Source'),p=node.getMesh().listPrimitives()[0],map=p.getExtras().sourceProvenance.triangleMap,
  mb=await fs.readFile(base+'/'+map.file),ids=new Uint32Array(mb.buffer,mb.byteOffset+map.offsetBytes,map.count),selected=[];
assert.equal(hash(bytes),report.parentCandidateSha256);assert.equal(hash(fb),report.largestSourceFaceListSha256);
for(let i=0;i<ids.length;i++)if(wanted.has(ids[i]))selected.push(i);
assert.equal(selected.length,wanted.size);
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5193,strictPort:true,watch:null,hmr:false}});await server.listen();
let browser;const captures=[];
try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1024,height:1024}}),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5193/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate=semantic-garment-v6');await page.waitForFunction(()=>window.ready);
  await page.evaluate(selected=>{
    const r=window.review;r.bindPose();
    r.model.traverse(n=>{if(!n.isSkinnedMesh)return;n.visible=n.name==='H01_Remaining_Source';if(!n.visible)return;
      const index=n.geometry.index,subset=new Uint32Array(selected.length*3);
      for(let i=0;i<selected.length;i++)for(let k=0;k<3;k++)subset[i*3+k]=index.getX(selected[i]*3+k);
      n.geometry.setIndex(Array.from(subset));
    });
  },selected);
  for(const view of [0,2]){
    await page.evaluate(({view,count})=>{const r=window.review;r.camera.position.set(0,.65,view===0?2.5:-2.5);r.camera.lookAt(0,.58,0);r.renderer.render(r.scene,r.camera);document.querySelector('#label').textContent='H01 original Remaining_Source component · '+count+' faces · '+(view===0?'front':'back')+' · SEMANTICS UNAPPROVED';},{view,count:selected.length});
    const file=`${output}/largest-remaining-${view===0?'front':'back'}.png`;await page.screenshot({path:file});captures.push({path:file,capturedAt:new Date().toISOString(),view,assetSha256:hash(bytes),selectedSourceFaces:wanted.size,selectionSha256:hash(fb)});
    await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({captures,scope:'Exact source-face subset only; not an invented body, complete model or semantic approval.'},null,2)+'\n');
  }
  assert.deepEqual(errors,[]);await fs.copyFile(selection+'/components.json',output+'/components.json');await fs.copyFile(selection+'/largest-remaining-source-faces.u32bin',output+'/largest-remaining-source-faces.u32bin');
  console.log(JSON.stringify({captures}));
}finally{await browser?.close();await server.close();}
