import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
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
