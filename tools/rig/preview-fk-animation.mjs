import fs from "node:fs/promises";
import {createServer} from "vite";
import {chromium} from "playwright-core";
import {createHash} from "node:crypto";
const hero=process.env.HERO??"H01",output=process.env.FK_REPORT_DIR??"docs/anim-report/conver10-redo/animation/full",
  asset=process.env.RIG_FILE??`.local/rig-candidates/fk-full-staging/${hero}-C0-rigged.glb`,
  assetSha256=createHash("sha256").update(await fs.readFile(asset)).digest("hex"),
  server=await createServer({server:{host:"127.0.0.1",port:5207,strictPort:true,hmr:false}});await server.listen();let browser;
try{
  await fs.mkdir(output,{recursive:true});browser=await chromium.launch({executablePath:"/usr/bin/chromium",headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const page=await browser.newPage({viewport:{width:1024,height:1024}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:5207/tools/animation-review.html?asset="+encodeURIComponent("/"+asset)+"&frames="+encodeURIComponent(`/${output}/${hero}-frames.json`));await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  const samples=[],times=process.env.FK_TIMES?process.env.FK_TIMES.split(",").map(Number):hero==="H01"?[1.9,2.6,3.1,3.55,4.1,5.1,14.1]:[.55,1.25,1.75,2.4,3.5,4.5,13.5],
    views=process.env.FK_VIEWS?process.env.FK_VIEWS.split(",").map(Number):[0,1,2];
  for(const time of times)for(const view of views){
    const sampled=await page.evaluate(({time,view})=>window.animationReview.sample(time,view),{time,view}),file=`${output}/${hero}-full-${assetSha256.slice(0,8)}-${time.toFixed(2)}-${["front","side","back"][view]}.png`,capturedAt=new Date().toISOString();
    await page.screenshot({path:file});samples.push({time,view,file,capturedAt,...sampled});
    await fs.writeFile(`${output}/${hero}-browser-fk-progress.json`,JSON.stringify({hero,asset,assetSha256,samples,complete:false,errors},null,2)+"\n");
  }
  const result={hero,asset,assetSha256,scope:"Source GLB full-duration FK attempt; explicitly rejected, no production activation",samples,complete:true,errors};
  await fs.writeFile(`${output}/${hero}-browser-fk.json`,JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify({hero,asset,screenshots:samples.length,errors}));if(errors.length)process.exitCode=1;
}finally{await browser?.close();await server.close();}
