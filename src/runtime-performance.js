export const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
export function renderPixelRatio(deviceRatio,quality,matchActive){
 const nativeRatio=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
 return matchActive?Math.min(nativeRatio,quality==='ultra'?1.5:1.25):nativeRatio;
}
export class AdaptiveResolution{
 constructor({max=1.3,min=.8,apply=()=>{}}={}){this.max=max;this.min=Math.min(min,max);this.ratio=max;this.apply=apply;this.slow=0;this.slowMs=0;this.fast=0;this.cooldown=0;this.changes=0;}
 sample(ms,active=true){if(!active||ms<=0||ms>5000)return;this.cooldown=Math.max(0,this.cooldown-ms);this.slow=ms>22?this.slow+1:Math.max(0,this.slow-1);this.fast=ms<17?this.fast+1:0;this.slowMs=ms>22?this.slowMs+ms:Math.max(0,this.slowMs-ms);if(this.cooldown)return;
  let next=this.ratio;if(this.slow>=30||this.slowMs>=1000)next=Math.max(this.min,this.ratio>.0?this.ratio-.15:this.min);else if(this.fast>=180)next=Math.min(this.max,this.ratio+.05);
  if(Math.abs(next-this.ratio)>.001){this.ratio=Number(next.toFixed(2));this.slow=this.fast=this.slowMs=0;this.cooldown=2500;this.changes++;this.apply(this.ratio);}
 }
}
/** Bounded leases: exhaustion skips a cosmetic, never allocates during combat. */
export class ObjectPool{
 constructor(capacity,create,reset=()=>{}){this.items=Array.from({length:capacity},(_,i)=>create(i));this.free=[...this.items];this.active=new Set();this.reset=reset;this.misses=0;}
 acquire(){const item=this.free.pop();if(!item){this.misses++;return null;}this.active.add(item);return item;}
 release(item){if(!this.active.delete(item))return;this.reset(item);this.free.push(item);}
 clear(){for(const item of this.active)this.reset(item);this.active.clear();this.free.length=0;this.free.push(...this.items);}
}
export function observeBoot(){
 const metrics=globalThis.__HON_GIOI_BOOT__??={started:performance.now(),longTasks:[],marks:{}};
 if(typeof PerformanceObserver!=='undefined')try{const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(metrics.longTasks.length<200)metrics.longTasks.push({start:entry.startTime,duration:entry.duration});});observer.observe({type:'longtask',buffered:true});metrics.stopObserver=()=>observer.disconnect();}catch{}
 return metrics;
}
/** Do not initialize WebGL until the browser has actually presented the UI. */
export function waitForUiPaint(){
 if(typeof PerformanceObserver==='undefined'||performance.getEntriesByType('paint').some(p=>p.name==='first-contentful-paint'))return nextPaint();
 return new Promise(resolve=>{
  let done=false;const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timeout);resolve();};
  const observer=new PerformanceObserver(list=>{if(list.getEntries().some(p=>p.name==='first-contentful-paint'))finish();});
  const timeout=setTimeout(finish,1000);
  try{observer.observe({type:'paint',buffered:true});}catch{finish();}
 });
}
