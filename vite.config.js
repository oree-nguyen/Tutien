import { defineConfig } from "vite";
import{fingerprint}from"./scripts/fingerprint.mjs";
const sourceHash=await fingerprint();
export default defineConfig({
  base: "./",
  define:{"import.meta.env.HG_BUILD_ID":JSON.stringify(sourceHash)},
  worker:{format:"es"},
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": process.env.HG_API_TARGET ?? "http://127.0.0.1:3001",
      "/socket": {
        target: (process.env.HG_API_TARGET ?? "http://127.0.0.1:3001").replace(
          "http",
          "ws",
        ),
        ws: true,
      },
    },
  },
});
