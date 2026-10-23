/** Actual GLTFLoader/PBR hand review. No mesh hiding or surrogate geometry. */
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { sha256 } from "./animation-payload.mjs";

const [candidate, output, ...poseFiles] = process.argv.slice(2);
if (
  !candidate?.startsWith(".local/rig-candidates/") ||
  !output ||
  !poseFiles.length
)
  throw Error(
    "Candidate, new output directory and explicit pose files required",
  );
const asset = candidate + "/H01-C0-rigged.glb";
const solve = JSON.parse(await fs.readFile(candidate + "/solve.json"));
const touchedBytes = await fs.readFile(candidate + "/touched.u8bin");
if (sha256(touchedBytes) !== solve.files["touched.u8bin"])
  throw Error("Stale hand selection");
const meta = JSON.parse(await fs.readFile(solve.input + "/input.json"));
const assetSha256 = sha256(await fs.readFile(asset));
const receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
if (assetSha256 !== receipt.sha256) throw Error("Stale candidate");
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  cacheDir: ".local/vite-hand-review-cache",
  plugins: [
    {
      name: "hand-review",
      configureServer(s) {
        s.middlewares.use("/__hand_review", (_req, res) => {
          res.setHeader("Content-Type", "text/html");
          res.end("<html><body></body></html>");
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5197,
    strictPort: true,
    watch: null,
    hmr: false,
  },
});
await server.listen();
let browser;
const captures = [];
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
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:5197/__hand_review");
  await page.evaluate(
    async ({ asset, touched, meta }) => {
      document.body.innerHTML = "";
      const T = await import("/node_modules/three/build/three.module.js");
      const { GLTFLoader } = await import(
        "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
      );
      const { RoomEnvironment } = await import(
        "/node_modules/three/examples/jsm/environments/RoomEnvironment.js"
      );
      const renderer = new T.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(1024, 1024);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      document.body.style.cssText = "margin:0;overflow:hidden";
      document.body.append(renderer.domElement);
      const label = document.createElement("div");
      label.style.cssText =
        "position:absolute;top:0;left:0;color:white;background:#17212bee;padding:12px;font:16px sans-serif";
      document.body.append(label);
      const scene = new T.Scene();
      scene.background = new T.Color("#26323d");
      const pmrem = new T.PMREMGenerator(renderer),
        room = new RoomEnvironment(),
        env = pmrem.fromScene(room, 0.04);
      scene.environment = env.texture;
      room.dispose();
      pmrem.dispose();
      scene.add(new T.HemisphereLight(0xffffff, 0x596578, 2));
      const key = new T.DirectionalLight(0xffffff, 2);
      key.position.set(2, 3, 4);
      scene.add(key);
      const gltf = await new GLTFLoader().loadAsync("/" + asset);
      scene.add(gltf.scene);
      const bind = [],
        meshes = [];
      let triangles = 0;
      gltf.scene.traverse((n) => {
        if (n.isBone) bind.push([n, n.position.clone(), n.quaternion.clone()]);
        if (n.isMesh) {
          meshes.push(n);
          triangles += n.geometry.index.count / 3;
        }
      });
      const hand = meshes.find((n) => n.name === meta.mesh);
      if (!hand || hand.geometry.attributes.position.count !== touched.length)
        throw Error("Different source hand surface");
      window.handReview = {
        T,
        scene,
        renderer,
        label,
        model: gltf.scene,
        bind,
        meshes,
        hand,
        touched,
        camera: new T.PerspectiveCamera(30, 1, 0.001, 20),
        triangles,
      };
    },
    { asset, touched: Array.from(touchedBytes), meta },
  );
  for (const [index, file] of poseFiles.entries()) {
    const b = await fs.readFile(file),
      pose = JSON.parse(b);
    for (const side of ["Left", "Right"])
      for (const view of ["front", "back"]) {
        const camera = await page.evaluate(
          ({ pose, side, view, file }) => {
            const r = window.handReview,
              T = r.T;
            if (Object.keys(pose.rotations).length !== r.bind.length)
              throw Error("Incomplete explicit pose");
            for (const [n, p, q] of r.bind) {
              n.position.copy(p);
              n.quaternion.copy(q);
            }
            for (const [name, q] of Object.entries(pose.rotations))
              r.model.getObjectByName(name).quaternion.fromArray(q);
            for (const [name, p] of Object.entries(pose.translations ?? {}))
              r.model.getObjectByName(name).position.fromArray(p);
            r.model.updateMatrixWorld(true);
            for (const m of r.meshes) m.skeleton?.update();
            const box = new T.Box3(),
              p = new T.Vector3(),
              positions = r.hand.geometry.attributes.position;
            for (let v = 0; v < r.touched.length; v++)
              if (r.touched[v] && positions.getX(v) > 0 === (side === "Left")) {
                p.fromBufferAttribute(positions, v);
                r.hand.applyBoneTransform(v, p);
                p.applyMatrix4(r.hand.matrixWorld);
                box.expandByPoint(p);
              }
            const center = box.getCenter(new T.Vector3()),
              radius = box.getSize(new T.Vector3()).length() * 0.5;
            if (!Number.isFinite(radius) || radius <= 0)
              throw Error("Empty actual posed hand bounds");
            const direction = new T.Vector3(
              view === "front" ? 0.12 : -0.12,
              0.08,
              view === "front" ? 1 : -1,
            ).normalize();
            r.camera.position
              .copy(center)
              .addScaledVector(
                direction,
                (radius / Math.sin(Math.PI / 12)) * 1.4,
              );
            r.camera.lookAt(center);
            r.camera.updateProjectionMatrix();
            r.label.textContent = `STAGING / CHƯA ĐẠT — ${side} / ${view}\n${file.split("/").pop()}`;
            r.renderer.render(r.scene, r.camera);
            return {
              center: center.toArray(),
              position: r.camera.position.toArray(),
              radius,
              sourceTriangles: r.triangles,
              visibleMeshes: r.meshes.filter((m) => m.visible).length,
            };
          },
          { pose, side, view, file },
        );
        const name = `pose-${index}-${side.toLowerCase()}-${view}.png`,
          target = output + "/" + name;
        await page.screenshot({ path: target });
        captures.push({
          file: name,
          capturedAt: new Date().toISOString(),
          sha256: sha256(await fs.readFile(target)),
          pose: file,
          poseSha256: sha256(b),
          side,
          view,
          ...camera,
        });
      }
  }
} finally {
  await browser?.close();
  await server.close();
}
await fs.writeFile(
  output + "/capture-manifest.json",
  JSON.stringify(
    {
      asset,
      assetSha256,
      accepted: false,
      activated: false,
      scope:
        "Cloud SwiftShader actual GLTFLoader/PBR screenshots; every model mesh remains visible. Framing mask only; not anatomy, authored-animation, contact or phone acceptance.",
      captures,
    },
    null,
    2,
  ) + "\n",
);
console.log(output);
