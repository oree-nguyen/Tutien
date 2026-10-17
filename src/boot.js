import{waitForUiPaint}from'./runtime-performance.js';
// The HTML shell can paint before parsing gameplay or creating a WebGL context.
async function start(){
 await waitForUiPaint();
 try{
  const native=!!globalThis.HongioiNativeSecurity||globalThis.Capacitor?.isNativePlatform?.();
  if(native){
   if('serviceWorker' in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(registration=>registration.unregister()));}
   if('caches' in globalThis){const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('hon-gioi-')).map(key=>caches.delete(key)));}
  }
  if(!native&&import.meta.env.PROD&&'serviceWorker' in navigator){
   try{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>{const timer=setTimeout(resolve,1000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});});
   }catch{}
  }
  await import('./main.js');
 }
 catch(error){
  const stage=document.querySelector('.boot-stage');if(stage){stage.textContent='Không mở được ứng dụng: '+error.message;const retry=document.createElement('button');retry.textContent='THỬ LẠI';retry.onclick=()=>location.reload();stage.append(retry);}
  console.error('Game boot failed',error);
 }
}
void start();
