import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright-core";
const output = "docs/anim-report/garment-separated";
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5198, strictPort: true },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
  });
  const pose = JSON.parse(
    await fs.readFile(".local/rig-candidates/reference/heights/22.json"),
  );
  for (const candidate of process.argv.includes("--isolated")
    ? ["garment-separated"]
    : ["harmonic-projected", "garment-separated"]) {
    await page.goto(
      `http://127.0.0.1:5198/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate=${candidate}`,
    );
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    await page.evaluate((pose) => {
      window.review.bindPose();
      window.review.model.traverse((n) => {
        if (pose.rotations[n.name])
          n.quaternion.fromArray(pose.rotations[n.name]);
      });
    }, pose);
    if (process.argv.includes("--isolated"))
      await page.evaluate(() => {
        window.review.model.traverse((n) => {
          if (n.isMesh && n.name !== "H01_AoNgoai_SourceSurface")
            n.visible = false;
        });
      });
    for (let view = 0; view < 3; view++) {
      await page.evaluate(
        ({ view, candidate }) => {
          window.review.setView(view);
          document.querySelector("#label").textContent =
            `H01 ${candidate} — diagnostic, NOT accepted — view ${view}`;
        },
        { view, candidate },
      );
      await page.screenshot({
        path: `${output}/${candidate}${process.argv.includes("--isolated") ? "-isolated" : ""}-view-${view}.png`,
      });
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
