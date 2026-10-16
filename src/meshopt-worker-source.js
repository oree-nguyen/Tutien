// Vite builds this as a separate local module; standalone.mjs embeds the same
// complete worker bundle in a Blob. No serialized function bodies are used.
export function createMeshoptWorker(){return new Worker(new URL('./meshopt-worker.js',import.meta.url),{type:'module'});}
