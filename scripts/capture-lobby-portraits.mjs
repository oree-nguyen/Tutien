// Rebuild portraits against a development server with HMR disabled. Uses only existing game models.
import {chromium} from 'playwright-core';
import {mkdir,copyFile} from 'node:fs/promises';
import sharp from 'sharp';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:844,height:600}});
await mkdir('/tmp/hg-portraits',{recursive:true});
try{
await p.goto((process.env.GAME_URL??'http://127.0.0.1:5174')+'/?renderer=main');await p.waitForFunction(()=>window.__HON_GIOI__?.world,{timeout:120000});
await p.evaluate(()=>{const w=window.__HON_GIOI__.world;w.renderer.render=()=>{};});
await p.locator('.lobby-bottom-nav [data-lobby-view="heroes"]').click();
for(let i=0;i<12;i++){
await p.locator(`[data-hero="${i}"]`).click();
await p.evaluate(()=>{window.__HON_GIOI__.world.setShowcaseAnimationMode(false);window.__HON_GIOI__.world.setShowcaseView('face');});
await p.waitForFunction(i=>{const w=window.__HON_GIOI__?.world;if(!w?.previewHero?.startsWith(i+':'))return false;if(i>1)return !w.loadingCharacter;return !!w.preview?.getObjectByName(i===0?'H01_Tencent_Original_Body':'H02_Tencent_Original_Body')?.visible;},i,{timeout:120000});
await p.waitForTimeout(2000);
await p.evaluate(async i=>{
 const w=window.__HON_GIOI__.world;
 const T=await import('/node_modules/three/build/three.module.js');
 const {clone}=await import('/node_modules/three/examples/jsm/utils/SkeletonUtils.js');
 const scene=new T.Scene();scene.background=new T.Color(0x163038);
 const model=clone(w.preview);scene.add(model);model.updateWorldMatrix(true,true);
 const target=new T.Vector3();
 const source=model.getObjectByName(i===0?'H01_Tencent_Original_Body':'H02_Tencent_Original_Body');
 if(i<2&&source){const box=new T.Box3().setFromObject(source);box.getCenter(target);target.y=box.min.y+(box.max.y-box.min.y)*(i===0?.88:.78);}
 else{model.getObjectByName('Head').getWorldPosition(target);target.y+=.2;}
 scene.add(new T.HemisphereLight(0xe6f5ff,0x31423a,2));
 const key=new T.DirectionalLight(0xffefd4,3);key.position.set(3,8,7);scene.add(key);
 const camera=new T.PerspectiveCamera(32,1,.01,50);camera.position.copy(target).add(new T.Vector3(0,0,1.8));camera.lookAt(target);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(384,384);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.render(scene,camera);
 renderer.domElement.id='portrait-output';Object.assign(renderer.domElement.style,{position:'fixed',left:'0',top:'0',zIndex:'99999'});document.body.append(renderer.domElement);window._portraitRenderer=renderer;
 },i);
const name='H'+String(i+1).padStart(2,'0');
await p.locator('#portrait-output').screenshot({path:'/tmp/hg-portraits/'+name+'.png'});
await p.evaluate(()=>{document.querySelector('#portrait-output').remove();window._portraitRenderer.dispose();});
console.log(name,'captured');
}
}finally{await b.close();}
await mkdir('public/art/portraits',{recursive:true});await mkdir('docs/ui-lobby-v25/portraits',{recursive:true});
for(let i=1;i<=12;i++){const name='H'+String(i).padStart(2,'0');await copyFile('/tmp/hg-portraits/'+name+'.png','docs/ui-lobby-v25/portraits/'+name+'.png');await sharp('/tmp/hg-portraits/'+name+'.png').webp({lossless:true}).toFile('public/art/portraits/'+name+'.webp');}
