// Works under both Capacitor's root and a WebView assets/ subdirectory.
export function localAssetUrl(url){
 if(!url.startsWith('/'))return url;
 return new URL(url.slice(1),new URL('../',import.meta.url)).href;
}
