import{createRenderWorker}from'./render-worker-source.js';
import{packRenderMatch}from'./render-packet.js';
import{groundHeight}from'./ground-math.js';
import{NAV_OBSTACLES}from'./systems.js';
export class RenderThread{
 static async create(canvas){
  const worker=createRenderWorker();if(!worker)throw Error('Render worker unavailable');
  const engine=new RenderThread(worker);engine.canvas=canvas;
  const offscreen=canvas.transferControlToOffscreen();
  try{engine.apply(await engine.request('init',{canvas:offscreen,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,quality:localStorage.getItem('hon-gioi-quality')??'balanced'},[offscreen]));}
  catch(error){worker.terminate();throw error;}
  engine.ready=true;engine.onResize=()=>engine.command('resize',[innerWidth,innerHeight]);window.addEventListener('resize',engine.onResize);return engine;
 }
 constructor(worker){
  this.backend='worker';this.worker=worker;this.sequence=0;this.pending=new Map();this.epoch=0;this.busy=false;this.latest=null;this.aimState=null;
  this.camera={position:{x:0,y:8,z:10}};this.focus={x:0,y:0,z:0};this.scenery={ready:false};this.obstacles=structuredClone(NAV_OBSTACLES);
  this.renderer={info:{render:{calls:0},memory:{}},getPixelRatio:()=>this.diagnostic?.ratio??1};this.renderMetrics={fps:0};this.previewAsset=null;
  worker.onmessage=event=>{
   const data=event.data;
   if(data.type==='reply'){
    const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);clearTimeout(pending.timer);
    if(data.error)pending.reject(Error(data.error));else{this.apply(data.value);pending.resolve(data.value);}return;
   }
   if(data.type==='frame'){
    this.busy=false;if(data.epoch===this.epoch&&!data.skipped)this.apply(data.diagnostic);this.flush();return;
   }
   if(data.type==='fatal')this.fail(data.error);
  };
  worker.onerror=event=>this.fail(event.message);
 }
 apply(data){if(!data)return;this.diagnostic=data;this.previewAsset=data.previewAsset;this.scenery.ready=data.sceneryReady;this.quality=data.quality;this.camera.position=data.camera;this.focus=data.focus;this.basis=data.basis;this.batching=data.batching;this.renderer.info={render:data.render,memory:data.memory};this.renderMetrics.fps=data.fps;}
 fail(error){if(this.failed)return;this.failed=true;for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(Error(error));}this.pending.clear();if(this.ready&&this.canvas)window.dispatchEvent(new CustomEvent('hon-gioi-render-error',{detail:error}));}
 request(type,args={},transfer=[]){const id=++this.sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Render worker timeout: '+(args.method??type)));},120000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({type,id,...args},transfer);});}
 command(method,args=[]){this.worker.postMessage({type:'command',method,args,epoch:this.epoch});}
 render(match,dt,hero,appearance){this.latest={match,hero,appearance};this.flush();}
 flush(){
  if(this.failed||this.busy||!this.latest)return;const {match,hero,appearance}=this.latest;this.latest=null;this.busy=true;
  this.worker.postMessage({type:'frame',epoch:this.epoch,match:packRenderMatch(match),hero,appearance:{hero:appearance.hero,branch:appearance.branch,skin:appearance.skin,costume:appearance.costume,rings:appearance.rings,bones:appearance.bones},aim:this.aimState});
 }
 async prepareBattlefield(appearance){await this.request('command',{method:'prepareBattlefield',args:[appearance]});}
 releaseBattlefield(){this.scenery.ready=false;this.command('releaseBattlefield');}
 reset(){this.latest=null;this.epoch++;this.aimState=null;this.command('reset');}
 setQuality(value){localStorage.setItem('hon-gioi-quality',value);this.quality=value;this.command('setQuality',[value]);}
 setShowcaseView(value){this.command('setShowcaseView',[value]);}
 rotateShowcase(value){this.command('rotateShowcase',[value]);}
 replayHeroEntrance(){this.command('replayHeroEntrance');}
 seekHeroEntrance(time){return this.request('command',{method:'seekHeroEntrance',args:[time]});}
 setLeaders(rows){this.command('setLeaders',[rows]);}
 aim(actor,skill,dir,canceled){this.aimState={actorId:actor.id,skill,dir,canceled};}
 clearAim(){this.aimState=null;}
 inspect(){return this.request('command',{method:'inspect'});}
 screenToWorld(x,y){
  const p=this.camera.position,b=this.basis;if(!b)return {x:this.focus.x,z:this.focus.z};
  const tangent=Math.tan(40*Math.PI/360),nx=(x/innerWidth*2-1)*tangent*innerWidth/innerHeight,ny=(1-y/innerHeight*2)*tangent;
  let dx=b.forward[0]+b.right[0]*nx+b.up[0]*ny,dy=b.forward[1]+b.right[1]*nx+b.up[1]*ny,dz=b.forward[2]+b.right[2]*nx+b.up[2]*ny;
  const length=Math.hypot(dx,dy,dz);dx/=length;dy/=length;dz/=length;if(dy>=-.00001)return {x:this.focus.x,z:this.focus.z};
  let near=0,far=Math.max(0,(-10-p.y)/dy);for(let i=0;i<32;i++){const t=(near+far)/2;if(p.y+dy*t>groundHeight(p.x+dx*t,p.z+dz*t))near=t;else far=t;}
  const t=(near+far)/2;return {x:p.x+dx*t,z:p.z+dz*t};
 }
 actorScreenPosition(actor,offset=2){const p=this.camera.position,b=this.basis;if(!b)return{x:innerWidth/2,y:innerHeight/2};const v=[actor.x-p.x,groundHeight(actor.x,actor.z)+offset-p.y,actor.z-p.z],dot=a=>v[0]*a[0]+v[1]*a[1]+v[2]*a[2],depth=Math.max(.01,dot(b.forward)),tangent=Math.tan(40*Math.PI/360);return{x:(dot(b.right)/(depth*tangent*innerWidth/innerHeight)*.5+.5)*innerWidth,y:(-.5*dot(b.up)/(depth*tangent)+.5)*innerHeight};}
 dispose(){this.failed=true;this.ready=false;window.removeEventListener('resize',this.onResize);this.worker.terminate();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Renderer disposed'));}this.pending.clear();}
}
