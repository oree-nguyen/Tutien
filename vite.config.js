import { defineConfig } from "vite";
import{fingerprint}from"./scripts/fingerprint.mjs";
import {copyRigReview} from "./scripts/copy-rig-review.mjs";
const includeRigReview=process.env.HG_INCLUDE_RIG_REVIEW === "1";
// Direct Vite builds also prune stale generated review copies before hashing/copying public/.
await copyRigReview({enabled:includeRigReview});
const sourceHash=await fingerprint();
export default defineConfig({
  base: "./",
  define:{"import.meta.env.HG_BUILD_ID":JSON.stringify(sourceHash),"import.meta.env.HG_INCLUDE_RIG_REVIEW":JSON.stringify(includeRigReview)},
  worker:{format:"es"},
  build: { rollupOptions: { input: includeRigReview ? { main:"index.html", rigReview:"rig-review.html" } : { main:"index.html" }, output: { manualChunks: { three: ["three"] } } } },
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
