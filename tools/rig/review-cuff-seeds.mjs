import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';

const base='.local/rig-candidates/semantic-garment-v3';
const output='docs/anim-report/semantic-garment-cuff-review';
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5193,strictPort:true}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1024,height:1024}});page.setDefaultTimeout(120000);
 await page.goto('http://127.0.0.1:5193/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate=semantic-garment-v3');
 await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 const captures=[],picks=[];
 for(const [side,name,samples] of [
  ['Left','H01_Robe_Left',[[641,600],[649,600],[637,590],[640,610],[658,590]]],
  ['Right','H01_Robe_Right',[[382,600],[374,600],[386,590],[383,610],[365,590]]]
 ]){
  const picked=await page.evaluate(async({name,samples})=>{
   const THREE=await import('/node_modules/three/build/three.module.js');
   const r=window.review;r.bindPose();let target;
   r.model.traverse(n=>{if(n.isSkinnedMesh){n.visible=n.name===name;if(n.visible)target=n;}});r.setView(0);
   const ray=new THREE.Raycaster();
   return samples.map(([x,y])=>{
    ray.setFromCamera(new THREE.Vector2(x/1024*2-1,1-y/1024*2),r.camera);
    const hit=ray.intersectObject(target,false)[0];
    return {pixel:[x,y],hit:hit?{mesh:target.name,triangleWithinPart:hit.faceIndex,point:hit.point.toArray(),attributes:Object.keys(target.geometry.attributes)}:null};
   });
  },{name,samples});
  const manifest=JSON.parse(await fs.readFile(base+'/receipt.json'));
  const sourceTriangles=await fs.readFile(base+'/H01-source-triangles.u32bin');
  const offset=manifest.parts.slice(0,manifest.parts.findIndex(p=>p.name===name)).reduce((sum,p)=>sum+p.triangles,0);
  for(const pick of picked)if(pick.hit)pick.hit.originalSourceFace=sourceTriangles.readUInt32LE((offset+pick.hit.triangleWithinPart)*4);
  picks.push({side,mesh:name,picks:picked});
  await page.evaluate(({side,picked})=>{document.querySelector('#label').textContent=`H01 ${side} cuff source-ray picks — staging; red crosses are exact selected pixels`;for(const pick of picked){const mark=document.createElement('span');mark.className='raypick';mark.textContent='+';mark.style.cssText=`position:fixed;left:${pick.pixel[0]-5}px;top:${pick.pixel[1]-10}px;color:#ff3232;font:bold 20px monospace;pointer-events:none`;document.body.append(mark);}},{side,picked});
  const path=`${output}/${side.toLowerCase()}-cuff-source-ray-picks.png`;await page.screenshot({path});captures.push({path,capturedAt:new Date().toISOString()});
  await page.evaluate(()=>document.querySelectorAll('.raypick').forEach(n=>n.remove()));
 }
 const receipt=JSON.parse(await fs.readFile(base+'/receipt.json'));
 await fs.writeFile(output+'/source-ray-picks.json',JSON.stringify({assetSha256:receipt.sha256,sourceSha256:receipt.sourceSha256,camera:'Exact front camera used by isolated-v3 screenshots;1024x1024',picks,captures},null,2)+'\n');
 console.log(JSON.stringify(picks,null,2));
}finally{await browser?.close();await server.close();}
