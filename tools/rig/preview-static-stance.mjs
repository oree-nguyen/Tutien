/** Frozen source-mesh pose review; deliberately independent of clip acceptance. */
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {sha256} from './animation-payload.mjs';

const hero=process.env.STANCE_HERO??'H02',output=process.env.STANCE_REVIEW_DIR??'docs/anim-report/conver10-redo/animation/forward-stance',newPose=process.env.STANCE_NEW_POSE??`.local/rig-candidates/stance-forward-v3/${hero}-ground.json`,
 cases=process.env.STANCE_REVIEW_CANDIDATE?[{name:'leg-support',pose:newPose,candidate:process.env.STANCE_REVIEW_CANDIDATE}]:[
  {name:'historical-stance',pose:`docs/anim-report/conver10-redo/animation/stances/${hero}-ground.json`,candidate:null},
  {name:'forward-stance',pose:newPose,candidate:null}],captures=[];
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5193,strictPort:true,watch:null,hmr:false}});await server.listen();let browser;
await fs.mkdir(output,{recursive:true});
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1024,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const c of cases){
  const file=c.candidate?'.local/rig-candidates/'+c.candidate+`/${hero}-C0-rigged.glb`:`assets/rigged/${hero}-C0-rigged.glb`,assetBytes=await fs.readFile(file),poseBytes=await fs.readFile(c.pose),pose=JSON.parse(poseBytes);
  await page.goto(`http://127.0.0.1:5193/tools/rig-review.html?hero=${hero}&rigged=1&view=full`+(c.candidate?'&candidate='+c.candidate:''));await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  for(const view of [0,1,2]){
   const info=await page.evaluate(async({pose,view,name,hero})=>{
    const T=await import('/node_modules/three/build/three.module.js'),r=window.review;r.bindPose();
    for(const[name,q]of Object.entries(pose.rotations)){const bones=[];r.model.traverse(n=>{if(n.isBone&&n.name===name)bones.push(n);});if(bones.length!==1||q.length!==4||!q.every(Number.isFinite)||Math.abs(Math.hypot(...q)-1)>1e-5)throw Error('Invalid frozen bone channel '+name);bones[0].quaternion.fromArray(q);}
    for(const[name,p]of Object.entries(pose.translations??{})){if(name!=='Hips'||p.length!==3||!p.every(Number.isFinite))throw Error('Invalid frozen hip translation');r.model.getObjectByName(name).position.fromArray(p);}
    if(!r.scene.getObjectByName('Diagnostic_Floor')){const grid=new T.GridHelper(2,20,0x708090,0x445361);grid.name='Diagnostic_Floor';r.scene.add(grid);}
    r.setView(view);document.querySelector('#label').textContent=`${hero} ${name} ${['FRONT','SIDE','BACK'][view]} — FROZEN FK ONLY; MESH/ANIMATION NOT ACCEPTED`;r.model.updateMatrixWorld(true);r.renderer.render(r.scene,r.camera);
    return{renderer:{...r.renderer.info.render,...r.renderer.info.memory},clipAcceptance:false};
   },{pose,view,name:c.name,hero});
   const path=output+'/'+c.name+'-'+['front','side','back'][view]+'.png';await page.screenshot({path});captures.push({path,capturedAt:new Date().toISOString(),asset:file,assetSha256:sha256(assetBytes),pose:c.pose,poseSha256:sha256(poseBytes),view,case:c.name,...info});
   await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({hero,captures,errors},null,2)+'\n');
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 const tiles=await Promise.all(captures.map(c=>sharp(c.path).resize(512,512).png().toBuffer())),sheet=output+'/stance-sheet.png';
 await sharp({create:{width:1536,height:Math.ceil(tiles.length/3)*512,channels:4,background:'#26323d'}}).composite(tiles.map((input,i)=>({input,left:i%3*512,top:Math.floor(i/3)*512}))).png().toFile(sheet);
 captures.push({path:sheet,capturedAt:new Date().toISOString(),kind:'contact sheet; full-resolution originals preserved'});await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({hero,captures,errors},null,2)+'\n');console.log(JSON.stringify({screenshots:captures.length,errors}));
}finally{await browser?.close();await server.close();}
