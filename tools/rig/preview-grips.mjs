import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { chromium } from "playwright-core";

// Diagnostic only: failed solutions are never installed into the game.
const server = await createServer({
  server: { host: "127.0.0.1", port: 5198, strictPort: true },
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
const frames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
const reports = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
  });
  for (const hero of ["H01", "H02"]) {
    const solution = JSON.parse(
      await fs.readFile(`docs/hand-frames/${hero}-grip-patch-search.json`),
    );
    const weapon = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`));
    const hand = solution.hand,
      frame = frames[hero].hands[hand];
    await page.goto(
      `http://127.0.0.1:5198/tools/rig-review.html?hero=${hero}&hand=${hand === "Right" ? "R" : "L"}&rigged=1`,
    );
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    const report = await page.evaluate(
      async ({ hero, solution, weapon, frame, hand }) => {
        const T = await import("/node_modules/three/build/three.module.js");
        const { GLTFLoader } = await import(
          "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
        );
        const { model, scene, renderer, camera, bindPose } = review;
        bindPose();
        const bounds = new T.Box3()
          .setFromPoints(
            [
              frame.wrist,
              ...Object.values(frame.fingers).flatMap((f) => f.points),
            ].map((p) => new T.Vector3(...p)),
          )
          .expandByScalar(0.022);
        // Diagnostic crop only. Inward palm cameras would otherwise be inside
        // the character's torso; keep the exact source triangles of this hand.
        model.traverse((mesh) => {
          if (!mesh.isSkinnedMesh) return;
          const source = mesh.geometry,
            position = source.attributes.position,
            included = new Uint8Array(position.count),
            point = new T.Vector3(),
            keep = [];
          for (let i = 0; i < position.count; i++) {
            point
              .fromBufferAttribute(position, i)
              .applyMatrix4(mesh.matrixWorld);
            included[i] = bounds.containsPoint(point) ? 1 : 0;
          }
          for (let i = 0; i < source.index.count; i += 3) {
            const a = source.index.getX(i),
              b = source.index.getX(i + 1),
              c = source.index.getX(i + 2);
            if (included[a] && included[b] && included[c]) keep.push(a, b, c);
          }
          const geometry = source.clone();
          geometry.setIndex(keep);
          const cropped = new T.SkinnedMesh(geometry, mesh.material);
          cropped.bind(mesh.skeleton, mesh.bindMatrix);
          cropped.matrixAutoUpdate = false;
          cropped.matrix.copy(mesh.matrixWorld);
          cropped.frustumCulled = false;
          scene.add(cropped);
          mesh.visible = false;
        });
        for (const [finger, pose] of Object.entries(solution.result.fingers)) {
          for (let i = 0; i < 3; i++) {
            const bone = model.getObjectByName(`${hand}Hand${finger}${i + 1}`);
            if (!bone) throw Error("Missing measured finger joint");
            const swing = new T.Vector3(
              T.MathUtils.degToRad(pose.angles[i]),
              0,
              i === 0 ? T.MathUtils.degToRad(pose.opposition) : 0,
            );
            const length = swing.length();
            bone.quaternion
              .multiply(
                new T.Quaternion().setFromAxisAngle(
                  length ? swing.divideScalar(length) : new T.Vector3(1, 0, 0),
                  length,
                ),
              )
              .multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(0, 1, 0),
                  T.MathUtils.degToRad(pose.twists[i]),
                ),
              );
          }
        }
        const n = new T.Vector3(...frame.n),
          axis = new T.Vector3(...solution.result.shaftAxis),
          center = new T.Vector3(...solution.result.shaftCenter);
        const gltf = await new GLTFLoader().loadAsync(
          `/models/hunyuan-original/${hero}-W0-source.glb`,
        );
        const holder = new T.Group();
        holder.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
        holder.position
          .copy(center)
          .sub(
            new T.Vector3(...weapon.gripPivot).applyQuaternion(
              holder.quaternion,
            ),
          );
        holder.add(gltf.scene);
        scene.add(holder);
        model.updateMatrixWorld(true);
        const fingertips = {};
        for (const [finger, pose] of Object.entries(solution.result.fingers)) {
          const bone = model.getObjectByName(`${hand}Hand${finger}3`);
          const bindTip = new T.Vector3(...frame.fingers[finger].points[3]);
          // Compare the rendered rig FK to the independently solved joint chain.
          const skin = model.getObjectByProperty(
            "isSkinnedMesh",
            true,
          ).skeleton;
          skin.update();
          const index = skin.bones.indexOf(bone);
          const actual = bindTip
            .applyMatrix4(skin.boneInverses[index])
            .applyMatrix4(bone.matrixWorld);
          fingertips[finger] = actual.distanceTo(
            new T.Vector3(...pose.points[3]),
          );
        }
        let maximumSkinIntrusion = 0,
          intrudingSkinVertices = 0,
          measuredHandVertices = 0;
        const point = new T.Vector3(),
          radial = new T.Vector3();
        model.traverse((mesh) => {
          if (!mesh.isSkinnedMesh) return;
          mesh.skeleton.update();
          const position = mesh.geometry.attributes.position;
          for (let i = 0; i < position.count; i++) {
            point
              .fromBufferAttribute(position, i)
              .applyMatrix4(mesh.matrixWorld);
            if (!bounds.containsPoint(point)) continue;
            mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
            radial.copy(point).sub(center);
            const axial = radial.dot(axis),
              sourceY = axial + weapon.gripPivot[1];
            if (
              sourceY < weapon.gripSegment[0] ||
              sourceY > weapon.gripSegment[1]
            )
              continue;
            measuredHandVertices++;
            const intrusion =
              weapon.shaftRadius -
              radial.addScaledVector(axis, -axial).length();
            if (intrusion > 0) intrudingSkinVertices++;
            maximumSkinIntrusion = Math.max(maximumSkinIntrusion, intrusion);
          }
        });
        const centerHand = new T.Vector3(...frame.boneCenter).lerp(
          new T.Vector3(...frame.fingers.Middle.points[3]),
          0.4,
        );
        const views = [
          n.clone(),
          new T.Vector3(...frame.u),
          n.clone().negate(),
        ];
        window.gripDiagnosticView = (i) => {
          camera.position.copy(centerHand).addScaledVector(views[i], 0.46);
          camera.lookAt(centerHand);
          renderer.render(scene, camera);
          document.querySelector("#label").textContent =
            `${hero} ${hand} · DIAGNOSTIC ${!solution.passed ? "REJECTED CONTACT" : maximumSkinIntrusion > 0.003 ? "REJECTED SKIN" : "CYLINDER CHECK ONLY"}`;
        };
        return {
          hero,
          solutionPassed: solution.passed,
          rigFkTipErrorMeters: fingertips,
          maxRigFkTipErrorMeters: Math.max(...Object.values(fingertips)),
          cylinderSkinDiagnostic: {
            measuredHandVertices,
            intrudingSkinVertices,
            maximumIntrusionMeters: maximumSkinIntrusion,
            withinThreeMm: maximumSkinIntrusion <= 0.003,
            scope:
              "Actual deformed hand-region mesh, including cuffs, versus measured shaft cylinder; excludes weapon ornaments and is not complete mesh-mesh contact acceptance",
          },
        };
      },
      { hero, solution, weapon, frame, hand },
    );
    report.rigSha256 = createHash("sha256")
      .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
      .digest("hex");
    for (let i = 0; i < 3; i++) {
      await page.evaluate((i) => window.gripDiagnosticView(i), i);
      await page.screenshot({
        path: `docs/hand-frames/${hero}-grip-diagnostic-${i}.png`,
      });
    }
    reports.push(report);
    console.log(report);
  }
  await fs.writeFile(
    "docs/hand-frames/grip-runtime-diagnostic.json",
    JSON.stringify(
      {
        scope:
          "Cloud diagnostic only, not runtime activation or contact acceptance",
        reports,
      },
      null,
      2,
    ) + "\n",
  );
  if (
    reports.some(
      (r) =>
        !r.solutionPassed ||
        r.maxRigFkTipErrorMeters > 1e-5 ||
        !r.cylinderSkinDiagnostic.withinThreeMm,
    )
  )
    process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
