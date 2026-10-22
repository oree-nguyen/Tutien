/** Uncropped source candidate review; never loads a game fallback/static cover. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const [asset,poseFile,output]=process.argv.slice(2);
if(!asset?.startsWith('.local/rig-candidates/')||asset.includes('..')||!poseFile||!output)throw Error('Local staging asset/pose/output required');
const sha=b=>createHash('sha256').update(b).digest('hex'),assetSha256=sha(await fs.readFile(asset)),poseBytes=await fs.readFile(poseFile),pose=JSON.parse(poseBytes),captures=[];
await fs.mkdir(output,{recursive:true});
const server=await createServer({configFile:false,plugins:[{name:'uncropped-source-review',configureServer(s){s.middlewares.use('/__uncropped-source',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><body style="margin:0"><div id="label" style="position:absolute;color:white;background:#17212bee;font:17px sans-serif;padding:12px"></div></body></html>');});}}],server:{host:'127.0.0.1',port:5195,strictPort:true,watch:null,hmr:false}});
await server.listen();const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1024,height:1024}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('http://127.0.0.1:5195/__uncropped-source');
 const setup=await page.evaluate(async({asset,pose})=>{
  const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{RoomEnvironment}=await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1024,1024);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#26323d');const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight(0xffffff,0x596578,2));const key=new T.DirectionalLight(0xffffff,2);key.position.set(2,3,4);scene.add(key);scene.add(new T.GridHelper(3,60,0x8496a5,0x455563));
  const gltf=await new GLTFLoader().loadAsync('/'+asset),model=gltf.scene;scene.add(model);const channels=new Set(Object.keys(pose.rotations));let sourceTriangles=0,bones=0;const maps=[];
  model.traverse(n=>{if(n.isBone){bones++;if(!channels.delete(n.name))throw Error('Missing or duplicate pose bone '+n.name);n.quaternion.fromArray(pose.rotations[n.name]);if(pose.translations[n.name])n.position.fromArray(pose.translations[n.name]);}if(n.isMesh){sourceTriangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;for(const m of [n.material].flat())for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(m[k])maps.push({material:m.name,slot:k,width:m[k].image.width,height:m[k].image.height});}});
  if(channels.size)throw Error('Pose references absent bones');model.updateWorldMatrix(true,true);model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
  const camera=new T.PerspectiveCamera(30,1,.001,20);window.fullSource={renderer,scene,camera,model,T};return{sourceTriangles,bones,maps};
 },{asset,pose});
 for(const [view,offset]of [['front',[0,.05,3.2]],['side',[-3.2,.18,0]],['back',[0,.15,-3.2]],['three-quarter',[2,.18,2.5]]]) {
  const camera=await page.evaluate(({offset,view,hero})=>{const r=window.fullSource;r.camera.position.set(...offset).add(new r.T.Vector3(0,.72,.13));r.camera.lookAt(0,.72,.13);document.querySelector('#label').textContent=`${hero} / ${view} / FULL SOURCE / OPEN-HAND CROUCH — NOT ACCEPTED`;r.renderer.render(r.scene,r.camera);return{position:r.camera.position.toArray(),quaternion:r.camera.quaternion.toArray()};},{offset,view,hero:pose.hero});
  const path=`${output}/${pose.hero}-${view}.png`;await page.screenshot({path,timeout:180000});captures.push({path,capturedAt:new Date().toISOString(),asset,assetSha256,poseFile,poseSha256:sha(poseBytes),camera,...setup});await fs.writeFile(output+'/capture-manifest.json',JSON.stringify({accepted:false,scope:'Cloud SwiftShader uncropped source diagnostics, not final animation, texture comparison or phone acceptance',captures},null,2)+'\n');
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('Full original source captures',captures.length);
} finally {await browser.close();await server.close();}
