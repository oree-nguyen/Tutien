// Works under both Capacitor's root and a WebView assets/ subdirectory.
export function localAssetUrl(url){
 if(!url.startsWith('/'))return url;
 const base=typeof document!=='undefined'&&document.baseURI?document.baseURI:typeof self!=='undefined'&&self.location?.href?new URL('../',self.location.href).href:new URL('../',import.meta.url).href;
 return new URL(url.slice(1),base).href;
}
