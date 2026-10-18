import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { chromium } from "playwright-core";

const directory = process.env.RIG_INPUT_DIR ?? "assets/rigged";
if (
  ![
    "assets/rigged",
    ...[
      "reference",
      "harmonic",
      "harmonic-global",
      "harmonic-projected",
      "harmonic-expanded",
    ].map((name) => ".local/rig-candidates/" + name),
  ].includes(directory)
)
  throw Error("Unsupported diagnostic review directory");
const output = process.env.RIG_REPORT_DIR ?? "docs/anim-report";
const pose = JSON.parse(
  await fs.readFile(
    process.env.REFERENCE_POSE ??
      "docs/anim-report/H01-reference-idle-solve.json",
  ),
);
const contact = JSON.parse(
  await fs.readFile(`${output}/H01-reference-contact.json`),
);
const bytes = await fs.readFile(`${directory}/H01-C0-rigged.glb`);
const sha = (value) => createHash("sha256").update(value).digest("hex");
if (
  contact.rigSha256 !== sha(bytes) ||
  contact.poseSha256 !== sha(JSON.stringify(pose.rotations))
)
  throw Error("Reference contact report is stale");
const weapon = JSON.parse(await fs.readFile("data/weapons/H01.json"));
const server = await createServer({
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
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
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:5199/tools/rig-review.html?hero=H01&rigged=1&view=full${directory.startsWith(".local") ? "&candidate=" + directory.split("/").at(-1) : ""}`,
  );
  await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await page.evaluate(
    async ({ pose, contact, weapon }) => {
      const T = await import("/node_modules/three/build/three.module.js");
      const { GLTFLoader } = await import(
        "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
      );
      const { model, scene } = window.review;
      window.review.bindPose();
      for (const [name, q] of Object.entries(pose.rotations)) {
        const bone = model.getObjectByName(name);
        if (!bone?.isBone) throw Error("Missing reference joint: " + name);
        bone.quaternion.fromArray(q);
      }
      const asset = await new GLTFLoader().loadAsync(
        "/models/hunyuan-original/H01-W0-source.glb",
      );
      const group = new T.Group();
      group.quaternion.fromArray(contact.weaponQuaternion);
      group.position
        .fromArray(contact.weaponCenter)
        .sub(
          new T.Vector3(...weapon.gripPivot).applyQuaternion(group.quaternion),
        );
      group.add(asset.scene);
      scene.add(group);
      model.updateMatrixWorld(true);
      document.querySelector("nav")?.remove();
      window.referenceView = (i) => {
        window.review.setView(i);
        document.querySelector("#label").textContent =
          "H01 REFERENCE DIAGNOSTIC — " +
          (contact.passed
            ? "CONTACT PASS; FULL RIG NOT ACCEPTED"
            : "REJECTED CONTACT") +
          " — " +
          ["front", "side", "back"][i];
      };
    },
    { pose, contact, weapon },
  );
  for (let i = 0; i < 3; i++) {
    await page.evaluate((i) => window.referenceView(i), i);
    await page.screenshot({ path: `${output}/H01-reference-view-${i}.png` });
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser?.close();
  await server.close();
}
