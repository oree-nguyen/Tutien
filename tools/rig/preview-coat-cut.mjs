/** Review actual cut edges and both preserved source surfaces, without proxies. */
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {sha256} from './animation-payload.mjs';

const candidate=process.env.COAT_CANDIDATE??'coat-cut-fit-v1',base='.local/rig-candidates/'+candidate,
 output=process.env.COAT_REVIEW_DIR??'docs/anim-report/conver10-redo/coat-cut-boundaries-v1';
await fs.mkdir(output,{recursive:true});
const cutsBytes=await fs.readFile(base+'/cut-edges.u32bin'),cuts=Array.from(new Uint32Array(cutsBytes.buffer,cutsBytes.byteOffset,cutsBytes.length/4)),
 poseBytes=await fs.readFile('docs/anim-report/harmonic-held/H01-reference-idle-solve.json'),pose=JSON.parse(poseBytes),captures=[];
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5193,strictPort:true,watch:null,hmr:false}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1024,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5193/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate='+candidate);await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 for(const side of ['Left','Right'])for(const held of [false,true])for(const back of [false,true]){
  const state=(held?'held':'bind')+'-'+side.toLowerCase()+'-'+(back?'back':'front');
  const result=await page.evaluate(async({side,held,back,cuts,pose})=>{
   const THREE=await import('/node_modules/three/build/three.module.js'),r=window.review;
   r.bindPose();for(const n of [...r.scene.children])if(n.userData.cutOverlay){n.geometry.dispose();n.material.dispose();r.scene.remove(n);}
   r.model.traverse(n=>{if(n.isSkinnedMesh)n.visible=[`H01_Sleeve_${side}`,`H01_Robe_${side}`,'H01_Robe_Torso'].some(name=>{for(let p=n;p;p=p.parent)if(p.name===name)return true;return false;});if(held&&pose.rotations[n.name])n.quaternion.fromArray(pose.rotations[n.name]);});
   r.model.updateMatrixWorld(true);const key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b),wanted=new Set();for(let k=0;k<cuts.length;k+=2)wanted.add(key(cuts[k],cuts[k+1]));
   const lines=[],box=new THREE.Box3(),seen=new Set();let edges=0;
   r.model.traverse(n=>{
    if(!n.isSkinnedMesh||!n.visible)return;n.skeleton.update();const weld=n.geometry.getAttribute('_source_weld'),idx=n.geometry.index;if(!weld)throw Error('Missing original source welds');
    for(let at=0;at<idx.count;at+=3)for(let k=0;k<3;k++){
     const a=idx.getX(at+k),b=idx.getX(at+(k+1)%3),id=key(weld.getX(a),weld.getX(b));if(!wanted.has(id)||seen.has(n.id+':'+id))continue;
     seen.add(n.id+':'+id);const x=n.getVertexPosition(a,new THREE.Vector3()).applyMatrix4(n.matrixWorld),y=n.getVertexPosition(b,new THREE.Vector3()).applyMatrix4(n.matrixWorld);lines.push(...x.toArray(),...y.toArray());box.expandByPoint(x);box.expandByPoint(y);edges++;
    }
   });
   if(!edges)throw Error('No actual cut-boundary edges found');
   const overlay=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3)),new THREE.LineBasicMaterial({color:0xff5f22,depthTest:false,transparent:true,opacity:.85}));overlay.userData.cutOverlay=true;overlay.renderOrder=99;r.scene.add(overlay);
   const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),distance=Math.max(size.y,size.x,.55)*2.8;
   r.camera.position.copy(center).add(new THREE.Vector3((side==='Right'?-1:1)*distance*.2,.07,(back?-1:1)*distance));r.camera.lookAt(center);r.renderer.render(r.scene,r.camera);
   document.querySelector('#label').textContent=`H01 ${side} ${held?'HELD':'BIND'} ${back?'BACK':'FRONT'} — orange: actual cut source edges; staging`;
   const textures=new Map();r.model.traverse(n=>{for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)for(const slot of ['map','normalMap','metalnessMap','roughnessMap']){
    const t=m[slot];if(t)textures.set(t.uuid,{width:t.image?.width,height:t.image?.height,colorSpace:t.colorSpace});
   }});
   return{renderedSourceEdges:edges,bounds:box.min.toArray().concat(box.max.toArray()),renderer:{...r.renderer.info.render,...r.renderer.info.memory},textures:[...textures.values()]};
  },{side,held,back,cuts,pose});
  const file=output+'/'+state+'.png';await page.screenshot({path:file});captures.push({path:file,capturedAt:new Date().toISOString(),state,...result,assetSha256:sha256(await fs.readFile(base+'/H01-C0-rigged.glb')),cutEdgesSha256:sha256(cutsBytes),poseSha256:held?sha256(poseBytes):null});
  await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({captures,errors},null,2)+'\n');
 }
 if(errors.length)throw Error(errors.join('\n'));
 const tiles=await Promise.all(captures.map(c=>sharp(c.path).resize(512,512).png().toBuffer())),sheet=output+'/cut-boundary-sheet.png';
 await sharp({create:{width:2048,height:1024,channels:4,background:'#26323d'}}).composite(tiles.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*512}))).png().toFile(sheet);
 captures.push({path:sheet,capturedAt:new Date().toISOString(),kind:'contact sheet; originals preserved'});await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({captures,errors},null,2)+'\n');console.log(JSON.stringify({captures:captures.length,errors}));
}finally{await browser?.close();await server.close();}
