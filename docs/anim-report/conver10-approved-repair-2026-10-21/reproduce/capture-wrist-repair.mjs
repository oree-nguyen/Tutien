import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { chromium } from "playwright-core";

const root = "docs/anim-report/conver10-approved-repair-2026-10-21",
  contextOnly = process.env.WRIST_CONTEXT_ONLY === "1",
  output = root + (contextOnly ? "/wrist-uncropped-review" : "/wrist-review"),
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  captures = [];
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  server: {
    host: "127.0.0.1",
    port: 5193,
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  for (const hero of ["H01", "H02"])
    for (const version of ["floor-v1", "wrist-v3"]) {
      const candidate =
          version === "floor-v1"
            ? `approved-source-cp-${hero.toLowerCase()}-floor-v1`
            : `approved-source-wrist-${hero.toLowerCase()}-v3`,
        asset = `.local/rig-candidates/${candidate}/${hero}-C0-rigged.glb`,
        assetSha256 = sha(await fs.readFile(asset)),
        page = await browser.newPage({
          viewport: { width: 1024, height: 1024 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", (route) =>
        new URL(route.request().url()).hostname === "127.0.0.1"
          ? route.continue()
          : route.abort(),
      );
      await page.goto(
        `http://127.0.0.1:5193/tools/rig-review.html?hero=${hero}&rigged=1&view=full&candidate=${candidate}`,
      );
      await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
      const handFrames = JSON.parse(
          await fs.readFile("data/rig/hand-frames.json"),
        ).heroes[hero].hands,
        seedReport = JSON.parse(
          await fs.readFile(
            `.local/rig-candidates/approved-source-hand-${hero.toLowerCase()}-geodesic-v1/heat-solve.json`,
          ),
        );
      for (const scope of contextOnly ? [hero === "H01" ? "Left" : "Right"] : [
        "Right",
        "Left",
        ...(version === "wrist-v3" ? ["body"] : []),
      ]) {
        const poseFile =
            scope === "body"
              ? `${root}/${hero}-crouch-floor-v1.json`
              : `.local/rig-candidates/approved-source-cp-${hero.toLowerCase()}-floor-input/finger-stress-pose.json`,
          poseBytes = await fs.readFile(poseFile),
          pose = JSON.parse(poseBytes);
        for (const view of [0, 3]) {
          const data = await page.evaluate(
            async ({
              hero,
              scope,
              view,
              pose,
              handFrames,
              seedReport,
              version,
              contextOnly,
            }) => {
              const T = await import(
                  "/node_modules/three/build/three.module.js"
                ),
                r = window.review;
              r.mixer.stopAllAction();
              r.model.traverse((n) => {
                if (n.isBone) {
                  n.quaternion.fromArray(pose.rotations[n.name]);
                  if (pose.translations[n.name])
                    n.position.fromArray(pose.translations[n.name]);
                }
              });
              r.model.updateWorldMatrix(true, true);
              const meshes = [];
              r.model.traverse((n) => {
                if (n.isSkinnedMesh) {
                  n.skeleton.update();
                  meshes.push(n);
                }
              });
              if (meshes.length !== 1)
                throw Error("Expected exact single original source mesh");
              const mesh = meshes[0],
                g = mesh.geometry;
              mesh.userData.fullSourceIndex ??= g.index.clone();
              g.setIndex(mesh.userData.fullSourceIndex);
              let center, offset;
              if (scope === "body") {
                center = new T.Vector3(0, 0.72, 0.13);
                offset = new T.Vector3(
                  ...(view === 0 ? [0, 0.05, 3.2] : [2, 0.18, 2.5]),
                );
              } else {
                const hand = handFrames[scope],
                  landmarks = [
                    hand.wrist,
                    ...Object.values(hand.fingers).flatMap((f) => f.points),
                  ],
                  lo = [0, 1, 2].map(
                    (k) => Math.min(...landmarks.map((p) => p[k])) - 0.022,
                  ),
                  hi = [0, 1, 2].map(
                    (k) => Math.max(...landmarks.map((p) => p[k])) + 0.022,
                  ),
                  p = g.getAttribute("position"),
                  inside = new Uint8Array(p.count),
                  indices = [],
                  index = mesh.userData.fullSourceIndex;
                for (let v = 0; v < p.count; v++)
                  inside[v] = Number(
                    p.getX(v) >= lo[0] &&
                      p.getX(v) <= hi[0] &&
                      p.getY(v) >= lo[1] &&
                      p.getY(v) <= hi[1] &&
                      p.getZ(v) >= lo[2] &&
                      p.getZ(v) <= hi[2],
                  );
                for (let i = 0; i < index.count; i += 3) {
                  const a = index.getX(i),
                    b = index.getX(i + 1),
                    c = index.getX(i + 2);
                  if (inside[a] && inside[b] && inside[c])
                    indices.push(a, b, c);
                }
                if (indices.length < 1000)
                  throw Error("No actual source hand crop");
                if (!contextOnly) g.setIndex(indices);
                const seed = seedReport.hands
                  .find((h) => h.side === scope)
                  .seeds.find((s) => s.joint === scope + "Hand");
                center = new T.Vector3();
                for (const id of seed.originalSourceVertexIDs)
                  center.add(
                    mesh.localToWorld(
                      mesh.getVertexPosition(id, new T.Vector3()),
                    ),
                  );
                center.multiplyScalar(1 / seed.originalSourceVertexIDs.length);
                offset = new T.Vector3(
                  ...(view === 0 ? [0, 0, 0.58] : [0.39, 0.12, 0.44]),
                );
              }
              r.camera.position.copy(center).add(offset);
              r.camera.lookAt(center);
              r.renderer.render(r.scene, r.camera);
              document.querySelector("#label").textContent =
                `${hero} / ${version} / ${scope} / ${view === 0 ? "FRONT" : "3/4"} — ${scope === "body" ? "OPEN-HAND CROUCH" : (contextOnly ? "UNCROPPED SOURCE + FINGER STRESS" : "SOURCE HAND CROP + ARTIFICIAL FINGER STRESS")} — NOT ACCEPTED`;
              const maps = Object.fromEntries(
                ["map", "normalMap", "roughnessMap", "metalnessMap"]
                  .filter((k) => mesh.material[k])
                  .map((k) => [
                    k,
                    [
                      mesh.material[k].image.width,
                      mesh.material[k].image.height,
                    ],
                  ]),
              );
              return {
                camera: {
                  position: r.camera.position.toArray(),
                  quaternion: r.camera.quaternion.toArray(),
                },
                sourceTriangles: mesh.userData.fullSourceIndex.count / 3,
                renderedTriangles: g.index.count / 3,
                maps,
              };
            },
            { hero, scope, view, pose, handFrames, seedReport, version, contextOnly },
          );
          if(contextOnly && data.renderedTriangles!==data.sourceTriangles)throw Error("Context capture unexpectedly cropped the source mesh");
          const imagePath = `${output}/${hero}-${version}-${scope}-${view === 0 ? "front" : "three-quarter"}.png`;
          await page.screenshot({ path: imagePath, timeout: 180000 });
          captures.push({
            path: imagePath,
            capturedAt: new Date().toISOString(),
            asset,
            assetSha256,
            poseFile,
            poseSha256: sha(poseBytes),
            hero,
            scope,
            version,
            view,
            contextOnly,
            ...data,
          });
          await fs.writeFile(
            output + "/capture-manifest.json",
            JSON.stringify(
              {
                accepted: false,
                scope:
                  "Cloud SwiftShader source-surface diagnostics, not phone evidence or appearance approval",
                captures,
              },
              null,
              2,
            ) + "\n",
          );
        }
      }
      if (errors.length) throw Error(errors.join("\n"));
      await page.close();
    }
} finally {
  await browser.close();
  await server.close();
}
console.log("Source wrist captures", captures.length);
