export async function createRenderEngine(canvas,{forceMain=false}={}){
 const main=forceMain||import.meta.env.HG_STANDALONE||new URLSearchParams(location.search).get('renderer')==='main';
 if(!main&&typeof OffscreenCanvas!=='undefined'&&canvas.transferControlToOffscreen&&typeof Worker!=='undefined'){
  try{const{RenderThread}=await import('./render-thread.js');return await RenderThread.create(canvas);}
  catch(error){console.warn('Dedicated renderer unavailable; using compatible renderer.',error.message);const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;}
 }
 const{World}=await import('./world.js');const world=await World.create(canvas);world.backend='main';return world;
}
