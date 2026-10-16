import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
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
    {
      name: "inline-manual-hunyuan-models",
      setup(build) {
        build.onLoad({ filter: /manual-hero-assets\.js$/ }, async () => {
          const assets = {};
          for (const detail of ["high", "medium", "low"]) {
            const bytes = await readFile(`public/models/h01-c0/h01-c0-${detail}.glb`);
            assets[detail] = "data:model/gltf-binary;base64," + bytes.toString("base64");
          }
          return { contents: "export const manualHeroAssetUrls = " + JSON.stringify(assets), loader: "js" };
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
