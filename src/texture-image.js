import{Texture,TextureLoader}from'three';
export async function loadImageTexture(url){
 if(typeof createImageBitmap!=='function')return new TextureLoader().loadAsync(url);
 const response=await fetch(url);if(!response.ok)throw Error('Texture HTTP '+response.status);
 const image=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none'});
 const texture=new Texture(image);texture.flipY=false;texture.needsUpdate=true;return texture;
}
