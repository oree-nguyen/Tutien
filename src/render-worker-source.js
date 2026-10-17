export function createRenderWorker(){return new Worker(new URL('./render-worker.js',import.meta.url),{type:'module'});}
