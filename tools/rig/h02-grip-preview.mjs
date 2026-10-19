import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const input=JSON.parse(await fs.readFile('.local/rig-candidates/h02-left-grip/input.json'));
const posePath=process.env.GRIP_POSE;
const pose=posePath?JSON.parse(await fs.readFile(posePath)):null;
const output=process.env.GRIP_PREVIEW_DIR??'docs/anim-report/conver10-redo/h02-left-grip';
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5271,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1024,height:1024}});
 await page.goto('http://127.0.0.1:5271/tools/rig-review.html?hero=H02&hand=L&rigged=1');
 await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 const proof=await page.evaluate(async({input,pose})=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {model,scene,camera,renderer,bindPose}=review;bindPose();
  const node=model.getObjectByProperty('isSkinnedMesh',true);
  const geometry=node.geometry.clone();
  const source=input.faces.flatMap(f=>f.vertices.map(i=>input.sourceIds[i]));
  geometry.setIndex(source);
  const cropped=new T.SkinnedMesh(geometry,node.material);
  cropped.bind(node.skeleton,node.bindMatrix);cropped.frustumCulled=false;
  scene.add(cropped);node.visible=false;
  if(pose)for(const [f,p]of Object.entries(pose.fingers))for(let i=0;i<3;i++) {
    const bone=model.getObjectByName(`LeftHand${f}${i+1}`);
    const swing=new T.Vector3(T.MathUtils.degToRad(p.angles[i]),0,i===0?T.MathUtils.degToRad(p.opposition):0),angle=swing.length();
    bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(angle?swing.divideScalar(angle):new T.Vector3(1,0,0),angle)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(p.twists[i])));
  }
  model.updateMatrixWorld(true);node.skeleton.update();
  const fkv={};
  for(const[f,data]of Object.entries(input.frame.fingers)) {
    const points=[];
    for(let i=0;i<3;i++)points.push(model.getObjectByName(`LeftHand${f}${i+1}`).getWorldPosition(new T.Vector3()));
    const bone=model.getObjectByName(`LeftHand${f}3`),j=node.skeleton.bones.indexOf(bone);
    points.push(new T.Vector3(...data.points[3]).applyMatrix4(node.skeleton.boneInverses[j]).applyMatrix4(bone.matrixWorld));
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:{Thumb:0xffe040,Index:0x20ff80,Middle:0x20e0ff,Ring:0xcc88ff,Pinky:0xff80b0}[f],depthTest:false}));
    line.renderOrder=100;scene.add(line);
    fkv[f]=pose?points.map((p,i)=>p.distanceTo(new T.Vector3(...pose.fingers[f].points[i]))):points.map(p=>p.toArray());
  }
  let weaponQ;
  if(pose) {
    const weapon=await new GLTFLoader().loadAsync('/models/hunyuan-original/H02-W0-source.glb');
    const holder=new T.Group();weaponQ=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...pose.shaftAxis));
    holder.quaternion.copy(weaponQ);holder.position.copy(new T.Vector3(...pose.shaftCenter)).sub(new T.Vector3(...input.weapon.gripPivot).applyQuaternion(weaponQ));holder.add(weapon.scene);scene.add(holder);
  }
  const center=new T.Vector3(.51,1.025,.14),n=new T.Vector3(...input.frame.n),u=new T.Vector3(...input.frame.u);
  const palm=new T.Vector3(...(pose?pose.palm:input.frame.palmCenter));
  scene.add(new T.ArrowHelper(n,palm,.055,0xff4444,.009,.005));
  review.gripView=i=>{
    const direction=i===0?n:i===1?u:n.clone().negate();
    camera.position.copy(center).addScaledVector(direction,.48);camera.up.set(0,1,0);camera.lookAt(center);
    document.querySelector('#label').textContent='H02 actual Left hand · '+(pose?'REJECTED SEARCH CANDIDATE':'SOURCE BIND + MEASURED JOINTS')+' · '+['palm','side','back'][i];
    renderer.render(scene,camera);
  };
  review.gripView(0);
  return {fkv,weaponQuaternion:weaponQ?.toArray(),sourceTriangles:input.faces.length,sourceVertices:input.sourceIds.length,scope:'Original source triangle crop; colored lines are measured joints, red arrow is anatomical palm normal; source materials and images unchanged.'};
 },{input,pose});
 const prefix=pose?'candidate':'source-bind';
 const images=[];
 for(let i=0;i<3;i++) {await page.evaluate(i=>review.gripView(i),i);const path=`${output}/${prefix}-${['palm','side','back'][i]}.png`;await page.screenshot({path});images.push({path,capturedAt:new Date().toISOString()});}
 await fs.writeFile(`${output}/${prefix}-preview.json`,JSON.stringify({...proof,posePath,images},null,2)+'\n');
 console.log({images,...proof});
}finally{await browser.close();await server.close();}
