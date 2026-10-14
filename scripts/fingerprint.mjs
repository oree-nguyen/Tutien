import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
export async function fingerprint() {
  const files = [];
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = dir + "/" + e.name;
      if (e.isDirectory()) await walk(p);
      else files.push(p);
    }
  }
  for (const dir of [
    "src",
    "server",
    "tests",
    "scripts",
    "public",
    "android-webview",
    "tools",
  ])
    await walk(dir);
  for (const p of [
    "package.json",
    "package-lock.json",
    "capacitor.config.json",
    "index.html",
    "vite.config.js",
    "acceptance/requirements.json",
    "acceptance/visual-requirements.json",
    "docs/requests/AI-Studio-Android-V2.5.md",
  ])
    files.push(p);
  const h = createHash("sha256");
  for (const p of files.sort()) {
    h.update(p);
    h.update(await readFile(p));
  }
  return h.digest("hex");
}
