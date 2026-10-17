// Opt-in observation only. It does not select assets, change simulation or quality.
const requested=typeof location!=='undefined'&&new URLSearchParams(location.search).get('perf')==='1';
const records=[],windows=[];let appearance=null;
export const perfEnabled=()=>requested||globalThis.__HG_PERF_ENABLED__===true;
function push(kind,data){if(!perfEnabled())return;const entry={kind,at:performance.now(),thread:typeof document==='undefined'||typeof Window==='undefined'?'worker':'main',...data};records.push(entry);if(records.length>512)records.shift();console.info('[HG_PERF] '+JSON.stringify(entry));}
export function perfMeasure(name,fn,metadata={}){if(!perfEnabled())return fn();const start=performance.now();try{return fn();}finally{push('measure',{name,ms:performance.now()-start,...metadata});}}
export function perfAsync(name,fn,metadata={}){if(!perfEnabled())return fn();const start=performance.now();return Promise.resolve().then(fn).then(value=>{push('measure',{name,ms:performance.now()-start,...metadata});return value;},error=>{push('measure',{name,ms:performance.now()-start,failed:true,...metadata});throw error;});}
export function perfEvent(name,data={}){push('event',{name,...data});}
export function perfBeginAppearance(name){if(!perfEnabled())return;finishWindow();appearance={name,start:performance.now(),frames:0,maxFrameMs:0,over50:0,renderer:null};push('appearance',{name});}
function finishWindow(){if(!appearance)return;const durationMs=performance.now()-appearance.start,result={...appearance,durationMs,complete:durationMs>=5000};windows.push(result);if(windows.length>20)windows.shift();push('five-second-window',result);appearance=null;}
export function perfFrame(ms,info){if(!perfEnabled()||!appearance)return;appearance.frames++;appearance.maxFrameMs=Math.max(appearance.maxFrameMs,ms);if(ms>50)appearance.over50++;appearance.renderer={...info.memory,...info.render};if(performance.now()-appearance.start>=5000)finishWindow();}
export function perfSnapshot(){return{enabled:perfEnabled(),records:[...records],windows:[...windows],active:appearance?{...appearance}:null};}
if(requested)globalThis.__HG_PERF__={snapshot:perfSnapshot};
