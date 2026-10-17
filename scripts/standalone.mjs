import {fingerprint} from './fingerprint.mjs';
import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
const workerBuild=await build({entryPoints:['src/meshopt-worker.js'],bundle:true,write:false,format:'iife',target:'es2022',minify:true});
const workerSource=workerBuild.outputFiles[0].text;
const result = await build({
  entryPoints: ["src/boot.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
  define: {
    "import.meta.env.HG_BUILD_ID":JSON.stringify(await fingerprint()),
    "import.meta.env.PROD": "false",
    "import.meta.env.DEV": "false",
    "import.meta.env.HG_STANDALONE":"true",
    "import.meta.env.VITE_API_ORIGIN": JSON.stringify(""),
  },
  plugins: [
    {name:"standalone-render-fallback",setup(build){build.onLoad({filter:/render-worker-source\.js$/},()=>({loader:"js",contents:"export function createRenderWorker(){throw Error(\"Single-file build uses the compatible renderer\");}"}));}},
    {name:'inline-meshopt-worker',setup(build){build.onLoad({filter:/meshopt-worker-source\.js$/},()=>({loader:'js',contents:'export function createMeshoptWorker(){const url=URL.createObjectURL(new Blob(['+JSON.stringify(workerSource)+'],{type:"text/javascript"}));const worker=new Worker(url);worker.objectURL=url;return worker;}'}));}},
    {name:'inline-terrain-atlas',setup(build){build.onLoad({filter:/terrain-gpu-assets\.js$/},async()=>{const{terrainGpuAssetUrls}=await import('../src/terrain-gpu-assets.js');const urls=[];for(const set of terrainGpuAssetUrls){const item={};for(const [key,url]of Object.entries(set))item[key]='data:image/ktx2;base64,'+(await readFile('public'+url)).toString('base64');urls.push(item);}return {loader:'js',contents:'export const terrainGpuAssetUrls='+JSON.stringify(urls)+';'};});}},
    {name:'inline-baked-environment',setup(build){for(const [file,exportName]of [['environment-baked-assets','environmentAssetUrls'],['environment-gpu-assets','environmentGpuAssetUrls'],['h01-bark-gpu-assets','barkGpuAssetUrls']])build.onLoad({filter:new RegExp(file+'\\.js$')},async()=>{const module=await import('../src/'+file+'.js');const result={};for(const [key,entry]of Object.entries(module[exportName])){if(typeof entry==='string')result[key]='data:image/ktx2;base64,'+(await readFile('public'+entry)).toString('base64');else{result[key]={};for(const [channel,url]of Object.entries(entry))result[key][channel]='data:image/'+(url.endsWith('.ktx2')?'ktx2':'webp')+';base64,'+(await readFile('public'+url)).toString('base64');}}return {loader:'js',contents:'export const '+exportName+'='+JSON.stringify(result)+';'};});}},
    {name:'inline-studio-ibl',setup(build){build.onLoad({filter:/studio-ibl-assets\.js$/},async()=>{const{studioIblInfo}=await import('../src/studio-ibl-assets.js');return {loader:'js',contents:'export const studioIblInfo='+JSON.stringify(studioIblInfo)+';export const studioIblUrl="data:application/octet-stream;base64,'+(await readFile('public/art/studio/ibl-rgba16f.bin')).toString('base64')+'";'};});}},
    {name:'inline-vine-geometry',setup(build){build.onLoad({filter:/h01-vine-assets\.js$/},async()=>{const{vineGeometryLayout}=await import('../src/h01-vine-assets.js');return {loader:'js',contents:'export const vineGeometryLayout='+JSON.stringify(vineGeometryLayout)+';export const vineGeometryUrl="data:application/octet-stream;base64,'+(await readFile('public/models/h01-vines/geometry.bin')).toString('base64')+'";'};});}},
    {name:'inline-basis',setup(build){build.onLoad({filter:/gpu-texture-assets\.js$/},async()=>({loader:'js',contents:'export const basisAssetUrls='+JSON.stringify({js:'data:text/javascript;base64,'+(await readFile('public/basis/basis_transcoder.js')).toString('base64'),wasm:'data:application/wasm;base64,'+(await readFile('public/basis/basis_transcoder.wasm')).toString('base64')})+';'}));}},
    {name:'inline-baked-character',setup(build){build.onLoad({filter:/baked-character-assets\.js$/},async()=>{const {bakedCharacterAssets}=await import('../src/baked-character-assets.js');const entries=structuredClone(bakedCharacterAssets);for(const spec of Object.values(entries))for(const asset of Object.values(spec.channels))for(const type of ['png','ktx2'])asset[type]='data:'+(type==='png'?'image/png':'image/ktx2')+';base64,'+(await readFile('public'+asset[type])).toString('base64');return {loader:'js',contents:'export const bakedCharacterAssets='+JSON.stringify(entries)+';'};});}},
    {name:'inline-baked-icons',setup(build){build.onLoad({filter:/baked-ui-assets\.js$/},async()=>{const {bakedUiAssetUrls}=await import('../src/baked-ui-assets.js');const urls={};for(const [key,url] of Object.entries(bakedUiAssetUrls))urls[key]='data:image/webp;base64,'+(await readFile('public'+url)).toString('base64');return {loader:'js',contents:'export const bakedUiAssetUrls='+JSON.stringify(urls)+';'};});}},
    {name:'inline-baked-bark',setup(build){build.onLoad({filter:/h01-bark-assets\.js$/},async()=>{const urls={};for(const key of ['albedo','normal','roughness'])urls[key]='data:image/webp;base64,'+(await readFile('public/art/h01-bark/'+key+'.webp')).toString('base64');return {loader:'js',contents:'export const barkAssetUrls='+JSON.stringify(urls)+';'};});}},
    {
      name: "inline-manual-hunyuan-models",
      setup(build) {
        build.onLoad({ filter: /model-asset-registry\.js$/ }, async () => {
          const assets = {};
          const {manualHeroAssetUrls,manualHeroAssetHashes}=await import('../src/model-asset-registry.js?build='+Date.now());
          for (const [key,url] of Object.entries(manualHeroAssetUrls)) {
            const bytes=await readFile('public'+url.split('?')[0]);
            assets[key]='data:model/gltf-binary;base64,'+bytes.toString('base64');
          }
          return {contents:'export const manualHeroAssetUrls='+JSON.stringify(assets)+';export const manualHeroAssetHashes='+JSON.stringify(manualHeroAssetHashes)+';',loader:'js'};
        });
      },
    },
    {
      name: "inline-css-separately",
      setup(build) {
        build.onLoad({ filter: /\.css$/ }, () => ({
          contents: "",
          loader: "js",
        }));
      },
    },
  ],
});
const file = (await readdir("dist/assets")).find((n) => n.endsWith(".css"));
const css = await readFile("dist/assets/" + file, "utf8");
let html = await readFile("index.html", "utf8");
html = html
  .replace(/<link[^>]*>/g, "")
  .replace(/<script[^>]*src="\/src\/boot\.js"[^>]*><\/script>/g, "");
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
html = html
  .replace("</head>", () => `<style>${css}</style></head>`)
  .replace("</body>", () => `<script>${js}</script></body>`);
await mkdir("release", { recursive: true });
await writeFile("release/Hon-Gioi-Sinh-Ton.html", html);
console.log(
  "Standalone HTML created:",
  Buffer.byteLength(html),
  "bytes, no external resources.",
);
