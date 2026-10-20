import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const output = process.env.GARMENT_PREVIEW_DIR ?? 'docs/anim-report/semantic-garment';
await fs.mkdir(output,{recursive:true});
// Rendering must not reload halfway through a capture when another task edits Vite configuration.
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5193,strictPort:true,watch:null,hmr:false}});
await server.listen();
let browser;
const captures=process.env.GARMENT_PREVIEW_RESUME?JSON.parse(await fs.readFile(output+'/capture-manifest.json')).captures:[];
const target=process.env.GARMENT_PREVIEW_CANDIDATE??'semantic-garment';
const morph=process.env.GARMENT_PREVIEW_MORPH===undefined?null:Number(process.env.GARMENT_PREVIEW_MORPH);
if(morph!==null&&![0,1].includes(morph))throw Error('Diagnostic morph weight must be zero or one');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1024,height:1024}}), errors=[];
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));
  const poseBytes=await fs.readFile(process.env.GARMENT_PREVIEW_POSE??'docs/anim-report/harmonic-held/H01-reference-idle-solve.json');
  const pose=JSON.parse(poseBytes);
  for(const candidate of process.env.GARMENT_SKIP_BASELINE?[target]:['harmonic-projected',target]) {
    const assetSha256=sha(await fs.readFile(`.local/rig-candidates/${candidate}/H01-C0-rigged.glb`));
    await page.goto(`http://127.0.0.1:5193/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate=${candidate}`);
    await page.waitForFunction(()=>window.ready,null,{timeout:120000});
    const cases=process.env.GARMENT_PREVIEW_FOCUS==='panels' ? [
      ['bind',null,0],['bind',null,2],
      ...['H01_Robe_Left','H01_Robe_Right','H01_Remaining_Source'].flatMap(name=>[0,2].map(view=>['isolated-bind',name,view]))
    ] : process.env.GARMENT_PREVIEW_FOCUS==='comparison' ? [['held',null,0],['held',null,2]] : candidate==='harmonic-projected' ? [['held',null,0],['held',null,1],['held',null,2]] : process.env.GARMENT_PREVIEW_FOCUS==='failure' ? [
      ['held',null,0],['held',null,2],
      ['isolated-held','H01_Robe_Right',2],['isolated-held','two-panels',2],
      ['isolated-held','H01_Sleeve_Right',0]
    ] : process.env.GARMENT_PREVIEW_FOCUS==='deformation' ? [
      ...[0,1,2].map(view=>['bind',null,view]),
      ...[0,1,2].map(view=>['held',null,view]),
      ...['H01_Sleeve_Left','H01_Sleeve_Right','two-panels'].flatMap(name=>[0,1,2].map(view=>['isolated-held',name,view]))
    ] : [
      ...[0,1,2].map(view=>['bind',null,view]),
      ...[0,1,2].map(view=>['held',null,view]),
      ...['H01_Remaining_Source','H01_Robe_Left','H01_Robe_Right','H01_Robe_Torso','H01_Sleeve_Left','H01_Sleeve_Right','two-panels'].flatMap(name=>[0,1,2].map(view=>['isolated-bind',name,view]))
    ];
    for(const [state,solo,view] of cases) {
      const held=state==='held'||state==='isolated-held';
      const name=`${candidate}-${state}${solo?'-'+solo:''}${morph===null?'':'-morph'+morph}-${['front','side','back'][view]}`;
      const path=`${output}/${name}.png`;
      const existing=captures.find(c=>c.path===path);
      if(existing){
        if(existing.assetSha256!==assetSha256)throw Error('Cannot resume capture from a different asset SHA');
        if(held&&existing.poseSha256!==sha(poseBytes))throw Error('Cannot resume capture from a different pose SHA');
        await fs.access(path);continue;
      }
      await page.evaluate(({held,solo,view,pose,name,morph})=>{
        const r=window.review;r.bindPose();
        const partMatches=n=>{for(let p=n;p;p=p.parent)if(solo==='two-panels'?['H01_Robe_Left','H01_Robe_Right'].includes(p.name):p.name===solo)return true;return false;};
        r.model.traverse(n=>{if(n.isSkinnedMesh)n.visible=!solo||partMatches(n);if(held&&pose.rotations[n.name])n.quaternion.fromArray(pose.rotations[n.name]);});
        if(morph!==null)r.model.traverse(n=>{if(n.morphTargetInfluences){if(n.morphTargetInfluences.length!==1)throw Error('Expected exactly one diagnostic corrective');n.morphTargetInfluences[0]=held?morph:0;}});
        r.setView(view);
        document.querySelector('#label').textContent=`H01 ${name} — SOURCE SURFACE DIAGNOSTIC, STAGING ONLY`;
      },{held,solo,view,pose,name,morph});
      await page.screenshot({path});
      captures.push({path,capturedAt:new Date().toISOString(),candidate,assetSha256,poseSha256:held?sha(poseBytes):null,state,solo,view,morphWeight:held?morph:0});
      await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({captures},null,2)+'\n');
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  const tiles=await Promise.all(captures.map(c=>sharp(c.path).resize(512,512).png().toBuffer()));
  const cols=3,rows=Math.ceil(tiles.length/cols),sheet=`${output}/semantic-garment-review-sheet.png`;
  await sharp({create:{width:512*cols,height:512*rows,channels:4,background:'#26323d'}}).composite(tiles.map((input,i)=>({input,left:(i%cols)*512,top:Math.floor(i/cols)*512}))).png().toFile(sheet);
  captures.push({path:sheet,capturedAt:new Date().toISOString(),kind:'lossless contact sheet from full-resolution screenshots'});
  await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({captures},null,2)+'\n');
  console.log(JSON.stringify({captures:captures.map(c=>c.path)},null,2));
} finally {await browser?.close();await server.close();}
