import{chromium}from'playwright-core';import fs from'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage();await page.route('**/__bake.html',r=>r.fulfill({contentType:'text/html',body:'<html><body>Studio IBL bake</body></html>'}));await page.goto('http://127.0.0.1:5173/__bake.html');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const{RoomEnvironment}=await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const renderer=new THREE.WebGLRenderer();const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  // Offline only: pin the cube resolution to 64 while preserving Three r160's CubeUV layout.
  const set=pmrem._setSize.bind(pmrem);pmrem._setSize=()=>set(64);
  const target=pmrem.fromScene(room,.04,.1,30);const {width,height}=target;const pixels=new Uint16Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
  if(!pixels.some(v=>v!==0)||renderer.getContext().getError())throw Error('Invalid HalfFloat CubeUV readback');
  let text='';for(const byte of new Uint8Array(pixels.buffer))text+=String.fromCharCode(byte);
  const data={base64:btoa(text),width,height,format:'RGBA16F CubeUV',three:'0.160.1',cubeSize:64};room.dispose();target.dispose();pmrem.dispose();renderer.dispose();return data;
 });
 await fs.mkdir('public/art/studio',{recursive:true});await fs.writeFile('public/art/studio/ibl-rgba16f.bin',Buffer.from(result.base64,'base64'));delete result.base64;
 await fs.writeFile('public/art/studio/ibl.json',JSON.stringify(result,null,2)+'\n');await fs.writeFile('src/studio-ibl-assets.js','export const studioIblUrl="/art/studio/ibl-rgba16f.bin";\nexport const studioIblInfo='+JSON.stringify(result)+';\n');console.log(result);
}finally{await browser.close();}
