/** Full-resolution garment isolation and cut-boundary review, staging only. */
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { sha256 } from "./animation-payload.mjs";
const [directory, poseFile, output] = process.argv.slice(2);
if (
  !/^\.local\/rig-candidates\/[a-z0-9-]+$/.test(directory ?? "") ||
  !poseFile ||
  !output
)
  throw Error("Staging directory, pose and output required");
const asset = directory + "/H01-C0-rigged.glb",
  assetSha256 = sha256(await fs.readFile(asset)),
  poseBytes = await fs.readFile(poseFile),
  pose = JSON.parse(poseBytes),
  cutsBytes = await fs.readFile(directory + "/cut-edges.u32bin"),
  cuts = Array.from(
    new Uint32Array(
      cutsBytes.buffer,
      cutsBytes.byteOffset,
      cutsBytes.length / 4,
    ),
  ),
  captures = [];
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  plugins: [
    {
      name: "garment-review",
      configureServer(s) {
        s.middlewares.use("/__source_garment", (_req, res) => {
          res.setHeader("Content-Type", "text/html");
          res.end(
            '<html><body style="margin:0"><div id="label" style="position:absolute;color:white;background:#17212bee;font:16px sans-serif;padding:12px"></div></body></html>',
          );
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5196,
    strictPort: true,
    watch: null,
    hmr: false,
  },
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
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:5196/__source_garment");
  const setup = await page.evaluate(
    async ({ asset, pose, cuts }) => {
      const T = await import("/node_modules/three/build/three.module.js"),
        { GLTFLoader } = await import(
          "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
        ),
        { RoomEnvironment } = await import(
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
      renderer.toneMappingExposure = 1;
      document.body.append(renderer.domElement);
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
      scene.add(new T.GridHelper(3, 60, 0x8496a5, 0x455563));
      const gltf = await new GLTFLoader().loadAsync("/" + asset),
        model = gltf.scene;
      scene.add(model);
      const bind = [],
        meshes = [],
        maps = [];
      let triangles = 0;
      model.traverse((n) => {
        if (n.isBone) bind.push([n, n.position.clone(), n.quaternion.clone()]);
        if (n.isMesh) {
          meshes.push(n);
          triangles += n.geometry.index.count / 3;
          for (const m of [n.material].flat())
            for (const slot of [
              "map",
              "normalMap",
              "roughnessMap",
              "metalnessMap",
            ])
              if (m[slot])
                maps.push({
                  slot,
                  width: m[slot].image.width,
                  height: m[slot].image.height,
                });
        }
      });
      if (Object.keys(pose.rotations).length !== bind.length)
        throw Error("Pose omits current core/cloth joints");
      const camera = new T.PerspectiveCamera(30, 1, 0.001, 20);
      window.garmentReview = {
        T,
        renderer,
        scene,
        camera,
        model,
        bind,
        meshes,
        pose,
        cuts,
        overlay: null,
      };
      return { sourceTriangles: triangles, bones: bind.length, maps };
    },
    { asset, pose, cuts },
  );
  const states = [
    ...["Left", "Right"].flatMap((side) =>
      ["front", "back"].map((view) => ({ phase: "bind", side, view })),
    ),
    ...["front", "side", "back", "three-quarter"].map((view) => ({
      phase: "crouch",
      side: "all",
      view,
    })),
    ...["Left", "Right"].flatMap((side) =>
      ["front", "back"].map((view) => ({ phase: "crouch", side, view })),
    ),
  ];
  for (const state of states) {
    const metrics = await page.evaluate((state) => {
      const r = window.garmentReview,
        { T } = r;
      for (const [n, p, q] of r.bind) {
        n.position.copy(p);
        n.quaternion.copy(q);
        if (state.phase === "crouch") {
          const rot = r.pose.rotations[n.name];
          if (!rot) throw Error("Missing pose bone " + n.name);
          n.quaternion.fromArray(rot);
          if (r.pose.translations[n.name])
            n.position.fromArray(r.pose.translations[n.name]);
        }
      }
      let renderedTriangles = 0;
      for (const n of r.meshes) {
        let selected = state.side === "all";
        for (let parent = n; parent; parent = parent.parent)
          if (parent.name.startsWith("H01_Robe_" + state.side)) selected = true;
        n.visible = selected;
        if (selected) renderedTriangles += n.geometry.index.count / 3;
      }
      r.model.updateWorldMatrix(true, true);
      for (const n of r.meshes) if (n.isSkinnedMesh) n.skeleton.update();
      if (r.overlay) {
        r.scene.remove(r.overlay);
        r.overlay.geometry.dispose();
        r.overlay.material.dispose();
        r.overlay = null;
      }
      let boundaryEdges = 0;
      if (state.side !== "all") {
        const key = (a, b) => Math.min(a, b) + ":" + Math.max(a, b),
          wanted = new Set();
        for (let i = 0; i < r.cuts.length; i += 2)
          wanted.add(key(r.cuts[i], r.cuts[i + 1]));
        const lines = [];
        for (const n of r.meshes)
          if (n.visible) {
            const weld = n.geometry.getAttribute("_source_weld"),
              index = n.geometry.index,
              seen = new Set();
            if (!weld) throw Error("Missing source weld IDs");
            for (let i = 0; i < index.count; i += 3)
              for (let k = 0; k < 3; k++) {
                const a = index.getX(i + k),
                  b = index.getX(i + ((k + 1) % 3)),
                  id = key(weld.getX(a), weld.getX(b));
                if (!wanted.has(id) || seen.has(id)) continue;
                seen.add(id);
                lines.push(
                  ...n
                    .getVertexPosition(a, new T.Vector3())
                    .applyMatrix4(n.matrixWorld)
                    .toArray(),
                  ...n
                    .getVertexPosition(b, new T.Vector3())
                    .applyMatrix4(n.matrixWorld)
                    .toArray(),
                );
                boundaryEdges++;
              }
          }
        r.overlay = new T.LineSegments(
          new T.BufferGeometry().setAttribute(
            "position",
            new T.Float32BufferAttribute(lines, 3),
          ),
          new T.LineBasicMaterial({ color: 0xff7529, depthTest: false }),
        );
        r.overlay.renderOrder = 99;
        r.scene.add(r.overlay);
      }
      const bounds = new T.Box3(),
        usedPoint = new T.Vector3();
      for (const n of r.meshes)
        if (n.visible) {
          const index = n.geometry.index,
            seen = new Set();
          for (let i = 0; i < index.count; i++) {
            const v = index.getX(i);
            if (seen.has(v)) continue;
            seen.add(v);
            bounds.expandByPoint(
              n.getVertexPosition(v, usedPoint).applyMatrix4(n.matrixWorld),
            );
          }
        }
      const centre = bounds.getCenter(new T.Vector3()),
        size = bounds.getSize(new T.Vector3());
      const offset = {
        front: [0, 0.02, 1],
        side: [-1, 0.02, 0],
        back: [0, 0.02, -1],
        "three-quarter": [0.625, 0.04, 0.78125],
      }[state.view];
      const distance =
        (size.length() /
          (2 * Math.sin(T.MathUtils.degToRad(r.camera.fov / 2)))) *
        1.08;
      r.camera.position
        .copy(centre)
        .add(new T.Vector3(...offset).normalize().multiplyScalar(distance));
      r.camera.lookAt(centre);
      r.camera.updateMatrixWorld();
      let framed = true;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new T.Vector3(x, y, z).project(r.camera);
            framed &&=
              Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1;
          }
      if (!framed) throw Error("Actual posed source bounds leave camera frame");
      document.querySelector("#label").textContent =
        `H01 / ${state.phase} / ${state.side} / ${state.view} — ${state.side === "all" ? "FULL SOURCE" : "ISOLATED ORIGINAL PANEL; orange cut proposal"} — NOT ACCEPTED`;
      r.renderer.render(r.scene, r.camera);
      return {
        renderedTriangles,
        boundaryEdges,
        posedBounds: {
          minimum: bounds.min.toArray(),
          maximum: bounds.max.toArray(),
        },
        allBoundsInsideImage: framed,
        camera: {
          position: r.camera.position.toArray(),
          quaternion: r.camera.quaternion.toArray(),
        },
      };
    }, state);
    if (
      state.side === "all" &&
      metrics.renderedTriangles !== setup.sourceTriangles
    )
      throw Error("Context accidentally cropped");
    if (state.side !== "all" && !metrics.boundaryEdges)
      throw Error("Panel isolation omitted actual cuts");
    const path = `${output}/${state.phase}-${state.side.toLowerCase()}-${state.view}.png`;
    await page.screenshot({ path, timeout: 180000 });
    captures.push({
      path,
      capturedAt: new Date().toISOString(),
      ...state,
      ...metrics,
      ...setup,
      asset,
      assetSha256,
      poseFile,
      poseSha256: sha256(poseBytes),
      cutEdgesSha256: sha256(cutsBytes),
    });
    await fs.writeFile(
      output + "/capture-manifest.json",
      JSON.stringify(
        {
          accepted: false,
          scope:
            "Cloud SwiftShader actual source-panel staging views; no animation or phone acceptance",
          captures,
          errors,
        },
        null,
        2,
      ) + "\n",
    );
  }
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Actual source garment captures", captures.length);
} finally {
  await browser?.close();
  await server.close();
}
