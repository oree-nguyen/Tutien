import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
const workerBuild=await build({entryPoints:['src/meshopt-worker.js'],bundle:true,write:false,format:'iife',target:'es2022',minify:true});
const workerSource=workerBuild.outputFiles[0].text;
const result = await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
  define: {
    "import.meta.env.PROD": "false",
    "import.meta.env.DEV": "false",
    "import.meta.env.VITE_API_ORIGIN": JSON.stringify(""),
  },
  plugins: [
    {name:'inline-meshopt-worker',setup(build){build.onLoad({filter:/meshopt-worker-source\.js$/},()=>({loader:'js',contents:'export function createMeshoptWorker(){const url=URL.createObjectURL(new Blob(['+JSON.stringify(workerSource)+'],{type:"text/javascript"}));const worker=new Worker(url);worker.objectURL=url;return worker;}'}));}},
    {
      name: "inline-manual-hunyuan-models",
      setup(build) {
        build.onLoad({ filter: /manual-hero-assets\.js$/ }, async () => {
          const assets = {};
          const {manualHeroAssetUrls,manualHeroAssetHashes}=await import('../src/manual-hero-assets.js?build='+Date.now());
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
  .replace(/<script[^>]*src="\/src\/main\.js"[^>]*><\/script>/g, "");
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
