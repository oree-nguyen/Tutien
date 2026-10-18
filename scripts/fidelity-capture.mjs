import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {manualHeroAssetUrls} from '../src/manual-hero-assets.js';
const phase=process.env.FIDELITY_PHASE??'before',out='docs/fidelity/'+phase;await fs.mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5187,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:760},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hon-gioi-quality','ultra'));
 await page.goto('http://127.0.0.1:5187/?renderer=main');
 const reports=[];
 const sourceProof=[];for(const [key,file] of [['high','H01-C0_lam_dat_thanh_moc_y.glb'],['h02-body-high','H02-C0_han_trach_son_thiet_giap.glb'],['staff-high','H01-W0_moc_tinh_truong_nguyen_ban.glb'],['h02-hammer-high','H02-W0_chan_nhac_chuy_nguyen_ban.glb']]){const original=await fs.readFile('assets/base_models/'+file),runtime=await fs.readFile('public'+manualHeroAssetUrls[key].split('?')[0]);assert.ok(original.equals(runtime),'Reference source differs: '+file);sourceProof.push({path:'assets/base_models/'+file,sha256:createHash('sha256').update(original).digest('hex')});}
 for(const hero of [0,1]){
  if(hero)await page.locator('[data-hero="1"]').tap();
  await page.waitForFunction(h=>window.__HON_GIOI__?.world?.preview?.getObjectByName(h?'manualHero_H02_C0':'manualHero_H01_C0')?.userData.manualAsset.status==='loaded',hero,{timeout:90000});
  await page.evaluate(()=>window.__HON_GIOI__.world.seekHeroEntrance(6));
  for(const {view,component} of [{view:'full',component:'body'},{view:'face',component:'body'},{view:'full',component:'weapon'}]){
   const prefix=`h0${hero+1}-${view}`+(component==='weapon'?'-weapon':'');
   await page.evaluate(v=>window.__HON_GIOI__.world.setShowcaseView(v),view);await page.waitForTimeout(1000);
   await page.screenshot({path:`${out}/${prefix}-lobby.png`});
   const result=await page.evaluate(async({hero,view,component})=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {clone}=await import('/node_modules/three/examples/jsm/utils/SkeletonUtils.js');
    const {RoomEnvironment}=await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    const {loadManualAsset}=await import('/src/manual-asset-cache.js');
    const w=window.__HON_GIOI__.world,body=w.preview.getObjectByName(component==='body'?'HunyuanBody':hero?'Hammer_Root':'Staff_Root');
    body.updateWorldMatrix(true,true);const source=await loadManualAsset(component==='body'?(hero?'h02-body-high':'high'):(hero?'h02-hammer-high':'staff-high'),false);
    const originals=new Map();source.scene.traverse(n=>{if(n.isMesh)originals.set(n.name,n.material);});
    const camera=w.camera.clone();camera.updateMatrixWorld();const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(1280,760);r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
    const pmrem=new THREE.PMREMGenerator(r),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04,.1,30);room.dispose();pmrem.dispose();
    const a=clone(body),b=clone(body);for(const node of [a,b]){node.matrixAutoUpdate=false;node.matrix.copy(body.matrixWorld);node.visible=true;node.traverse(n=>{if(component==='body'&&n.isMesh&&!n.isSkinnedMesh)n.visible=false;});}
    const materials=[];b.traverse(n=>{if(!n.isMesh||(component==='body'&&!n.isSkinnedMesh))return;const original=originals.get(n.name);if(!original)throw Error('Missing source material for '+n.name);const current=Array.isArray(n.material)?n.material[0]:n.material,raw=Array.isArray(original)?original[0]:original;
     const props=m=>({vertexColors:m.vertexColors,color:m.color.toArray(),colorSpace:m.map?.colorSpace,metalness:m.metalness,roughness:m.roughness,normalScale:m.normalScale?.toArray(),emissive:m.emissive.toArray(),emissiveIntensity:m.emissiveIntensity,emissiveMap:!!m.emissiveMap,aoMapIntensity:m.aoMapIntensity,envMapIntensity:m.envMapIntensity});materials.push({mesh:n.name,original:props(raw),game:props(current)});
     n.material=Array.isArray(original)?original.map(m=>m.clone()):original.clone();
    });
    const sourceScene=new THREE.Scene();sourceScene.environment=env.texture;sourceScene.add(b);
    r.toneMappingExposure=1;r.render(sourceScene,camera);const reference=r.domElement.toDataURL();
    const gameScene=new THREE.Scene();gameScene.environment=w.scene.environment;gameScene.add(a);w.scene.traverseVisible(n=>{if(!n.isLight)return;const light=n.clone();n.getWorldPosition(light.position);if(n.target){light.target=new THREE.Object3D();n.target.getWorldPosition(light.target.position);gameScene.add(light.target);}gameScene.add(light);});
    // glTF material overrides are reproduced without portal/background/UI pixels.
    gameScene.fog=w.scene.fog?.clone()??null;r.toneMappingExposure=w.renderer.toneMappingExposure;r.render(gameScene,camera);const game=r.domElement.toDataURL();
    const maskMat=new THREE.MeshBasicMaterial({color:0xffffff});b.traverse(n=>{if(n.isMesh&&(component==='weapon'||n.isSkinnedMesh))n.material=maskMat;});sourceScene.environment=null;r.toneMapping=THREE.NoToneMapping;r.render(sourceScene,camera);const mask=r.domElement.toDataURL();
    const result={hero,view,component,reference,game,mask,materials,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect},head:body.getObjectByName('Head')?.getWorldPosition(new THREE.Vector3()).toArray(),sourceBytes:source.parser.json.asset,exposure:w.renderer.toneMappingExposure};
    env.dispose();r.dispose();return result;
   },{hero,view,component});
   for(const k of ['reference','game','mask']){await fs.writeFile(`${out}/${prefix}-${k}.png`,Buffer.from(result[k].split(',')[1],'base64'));delete result[k];}reports.push(result);
  }
 }
 await fs.writeFile(out+'/capture.json',JSON.stringify({phase,sourceProof,reports,errors,scope:'Cloud Chromium SwiftShader; glTF reference uses ACES exposure1, sRGB, RoomEnvironment PMREM, same posed source mesh and camera. Game isolated comparison retains game lighting/material/fog/exposure; lobby image is an actual screenshot.'},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();await server.close();}
