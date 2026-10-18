import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright-core";
const output = "docs/anim-report/robe-panels";
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5197, strictPort: true },
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
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    "http://127.0.0.1:5197/tools/rig-review.html?hero=H01&rigged=1&view=full&candidate=robe-panels",
  );
  await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
  const heldPose = JSON.parse(
    await fs.readFile(".local/rig-candidates/reference/heights/22.json"),
  );
  const cases = [
    ["assembled-front", null, 0],
    ["left-panel", "H01_Ao_VatTrai", 0],
    ["right-panel", "H01_Ao_VatPhai", 0],
    ["torso-sleeves", "H01_Ao_ThanVaTay", 0],
    ["separated-panels", "exploded", 0],
    ["assembled-back", null, 2],
    ["held-front", null, 0],
    ["held-back", null, 2],
  ];
  for (const [name, solo, view] of cases) {
    await page.evaluate(
      ({ name, solo, view, heldPose }) => {
        const r = window.review;
        r.bindPose();
        r.model.traverse((n) => {
          if (!n.isSkinnedMesh) return;
          n.position.set(0, 0, 0);
          n.bindMode = "attached";
          n.visible = !solo || solo === "exploded" || n.name === solo;
          if (solo === "exploded") {
            n.bindMode = "detached";
            if (n.name === "H01_Ao_VatTrai") n.position.x += 0.3;
            if (n.name === "H01_Ao_VatPhai") n.position.x -= 0.3;
          }
        });
        if (name.startsWith("held-"))
          r.model.traverse((n) => {
            if (heldPose.rotations[n.name])
              n.quaternion.fromArray(heldPose.rotations[n.name]);
          });
        r.setView(view);
        document.querySelector("#label").textContent =
          "H01 ROBE PANELS — " + name + " — source mesh, no rig acceptance";
      },
      { name, solo, view, heldPose },
    );
    await page.screenshot({ path: `${output}/${name}.png` });
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser?.close();
  await server.close();
}
