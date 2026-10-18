import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {threadedMeshoptDecoder} from './meshopt-worker-bridge.js';
import {getGpuTextureLoader} from './gpu-textures.js';
let loader,configuredGpu;
export function getModelLoader(){
 const gpu=getGpuTextureLoader();if(loader&&gpu===configuredGpu)return loader;
 configuredGpu=gpu;loader=new GLTFLoader().setMeshoptDecoder(threadedMeshoptDecoder);if(gpu)loader.setKTX2Loader(gpu);
 if(typeof Image==='undefined'&&typeof createImageBitmap==='function')loader.register(parser=>({name:'EXT_texture_webp',loadTexture:index=>{const extension=parser.json.textures[index].extensions?.EXT_texture_webp;return extension?parser.loadTextureImage(index,extension.source,parser.textureLoader):null;}}));
 return loader;
}
