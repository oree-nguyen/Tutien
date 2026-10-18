import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { Vector3, Quaternion, MathUtils } from "three";
import { deriveHandFrame } from "../src/rig/hand-frame.js";
const rigged = process.argv.includes("--rigged");
const landmarks = JSON.parse(await fs.readFile("data/rig/hand-landmarks.json")),
  result = {
    version: 1,
    heroes: {},
    verification: "pending visual and open/closed rig checks",
  };
const server = await createServer({
  server: { host: "127.0.0.1", port: 5193, strictPort: true },
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
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
page.on("pageerror", (error) =>
  console.error("Rig review page:", error.message),
);
try {
  for (const [hero, spec] of Object.entries(landmarks.heroes)) {
    result.heroes[hero] = { sourceSha256: spec.sourceSha256, hands: {} };
    if (rigged)
      result.heroes[hero].rigSha256 = createHash("sha256")
        .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
        .digest("hex");
    for (const [side, hand] of Object.entries(spec.hands)) {
      const frame = deriveHandFrame(hand, side),
        fingers = {};
      for (const [name, points] of Object.entries(hand.fingers)) {
        const chain = points.map((p) => new Vector3(...p.position)),
          a = chain[0],
          direction = chain[1].clone().sub(a).normalize(),
          axis = direction
            .clone()
            .cross(new Vector3(...frame.n))
            .normalize(),
          rotated = chain
            .at(-1)
            .clone()
            .sub(a)
            .applyQuaternion(
              new Quaternion().setFromAxisAngle(axis, MathUtils.degToRad(30)),
            )
            .add(a),
          dot = rotated.sub(chain.at(-1)).dot(new Vector3(...frame.n));
        fingers[name] = {
          points: points.map((p) => p.position),
          lengths: chain.slice(1).map((p, i) => p.distanceTo(chain[i])),
          thickness: points.map((p) => p.thickness),
          flexAxisSign: [1, 1, 1],
          flexAxisLocal: [
            [1, 0, 0],
            [1, 0, 0],
            [1, 0, 0],
          ],
          positiveFlexTipDot: dot,
        };
        if (dot <= 0)
          throw Error(`${hero} ${side} ${name}: flex moves away from palm`);
      }
      await page.goto(
        `http://127.0.0.1:5193/tools/rig-review.html?hero=${hero}&hand=${side === "Right" ? "R" : "L"}${rigged ? "&rigged=1" : ""}`,
      );
      await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
      const palm = await page.evaluate(
        async (frame) => {
          const T = await import("/node_modules/three/build/three.module.js"),
            { model, scene, renderer, camera, setView } = review;
          const n = new T.Vector3(...frame.n),
            origin = new T.Vector3(...frame.boneCenter),
            ray = new T.Raycaster();
          model.traverse((node) => {
            if (node.isMesh) node.material.side = T.DoubleSide;
          });
          ray.set(origin.clone().addScaledVector(n, 0.12), n.clone().negate());
          const hits = ray.intersectObject(model, true),
            unique = [];
          for (const h of hits)
            if (
              !unique.length ||
              h.point.distanceTo(unique.at(-1).point) > 1e-5
            )
              unique.push(h);
          const close = unique.filter((h) => h.point.distanceTo(origin) < 0.09);
          if (close.length < 2)
            throw Error("Palm thickness ray missed opposing surfaces");
          let best = Infinity,
            pair;
          for (let i = 1; i < close.length; i++) {
            const a = close[i - 1],
              b = close[i],
              mid = a.point.clone().add(b.point).multiplyScalar(0.5),
              d = mid.distanceTo(origin);
            if (a.point.distanceTo(b.point) > 0.005 && d < best) {
              best = d;
              pair = [a, b];
            }
          }
          if (!pair) throw Error("No valid palm thickness");
          const [a, b] = pair,
            center = a.point,
            thickness = a.point.distanceTo(b.point);
          const c = center.clone();
          const palmCandidates = [];
          for (const ratio of [0.5, 0.65, 0.8, 0.95, 0.98, 1, 1.02]) {
            const seed = new T.Vector3(...frame.wrist).lerp(
              new T.Vector3(...frame.middleMCP),
              ratio,
            );
            ray.set(seed.clone().addScaledVector(n, 0.12), n.clone().negate());
            const hs = ray.intersectObject(model, true),
              near = [];
            for (const hit of hs)
              if (
                hit.point.distanceTo(seed) < 0.09 &&
                (!near.length || hit.point.distanceTo(near.at(-1).point) > 1e-5)
              )
                near.push(hit);
            if (near.length >= 2) {
              const p = near[0];
              palmCandidates.push({
                ratio,
                center: p.point.toArray(),
                normal: p.face.normal.toArray(),
              });
            }
          }

          for (const [key, color] of [
            ["f", 0x3297ff],
            ["u", 0x44ee88],
            ["n", 0xff3333],
          ])
            scene.add(
              new T.ArrowHelper(
                new T.Vector3(...frame[key]),
                c,
                0.055,
                color,
                0.009,
                0.005,
              ),
            );
          const witness = new T.Mesh(
            new T.SphereGeometry(0.004, 16, 12),
            new T.MeshBasicMaterial({ color: 0xff3333 }),
          );
          witness.position.copy(c).addScaledVector(n, 0.02);
          scene.add(witness);
          window.handFrameVisible = { center: c.toArray(), normal: frame.n };
          const bounds = new T.Box3()
            .setFromPoints(
              frame.points
                .map((p) => new T.Vector3(...p))
                .concat([new T.Vector3(...frame.wrist)]),
            )
            .expandByScalar(0.018);
          const cropCenter = bounds.getCenter(new T.Vector3());
          model.traverse((mesh) => {
            if (!mesh.isMesh) return;
            const old = mesh.geometry,
              position = old.attributes.position,
              mask = new Uint8Array(position.count),
              p = new T.Vector3();
            for (let i = 0; i < position.count; i++) {
              p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
              mask[i] = bounds.containsPoint(p) ? 1 : 0;
            }
            const keep = [],
              index = old.index;
            for (let i = 0; i < index.count; i += 3) {
              const a = index.getX(i),
                b = index.getX(i + 1),
                c = index.getX(i + 2);
              if (mask[a] && mask[b] && mask[c]) keep.push(a, b, c);
            }
            const geometry = new T.BufferGeometry();
            for (const [k, attribute] of Object.entries(old.attributes))
              geometry.setAttribute(k, attribute);
            geometry.setIndex(keep);
            const isolated = mesh.isSkinnedMesh
              ? new T.SkinnedMesh(geometry, mesh.material)
              : new T.Mesh(geometry, mesh.material);
            if (mesh.isSkinnedMesh)
              isolated.bind(mesh.skeleton, mesh.bindMatrix);
            isolated.matrixAutoUpdate = false;
            isolated.matrix.copy(mesh.matrixWorld);
            scene.add(isolated);
          });
          model.visible = false;
          review.setView = (i) => {
            const direction =
              i === 0
                ? n
                : i === 1
                  ? new T.Vector3(...frame.u)
                  : n.clone().negate();
            camera.position.copy(cropCenter).addScaledVector(direction, 0.55);
            camera.lookAt(cropCenter);
            renderer.render(scene, camera);
            document.querySelector("#label").textContent =
              "Palm frame — " + ["palm", "side", "back"][i];
          };
          review.setView(0);
          return {
            center: center.toArray(),
            palmCandidates,
            thickness,
            oppositeSurface: b.point.toArray(),
            boneCenterOffset: center.clone().sub(origin).toArray(),
          };
        },
        {
          ...frame,
          points: Object.values(hand.fingers).flatMap((points) =>
            points.map((p) => p.position),
          ),
          wrist: hand.wrist,
          middleMCP: hand.fingers.Middle[0].position,
        },
      );
      const output = {
        ...frame,
        wrist: hand.wrist,
        palmCenter: palm.center,
        palmThickness: palm.thickness,
        palmCandidates: palm.palmCandidates,
        palmOppositeSurface: palm.oppositeSurface,
        fingers,
        verified: "auto; visual/open-close pending",
      };
      result.heroes[hero].hands[side] = output;
      if (rigged) {
        const metrics = await page.evaluate(async () => {
          const T = await import("/node_modules/three/build/three.module.js");
          const { model, setFingerPose } = review;
          const bones = [];
          model.traverse((n) => {
            if (
              n.isBone &&
              /Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(n.name)
            )
              bones.push(n);
          });
          const lengths = new Map();
          for (const b of bones)
            for (const c of b.children)
              if (c.isBone)
                lengths.set(
                  c,
                  c
                    .getWorldPosition(new T.Vector3())
                    .distanceTo(b.getWorldPosition(new T.Vector3())),
                );
          setFingerPose(1);
          let max = 0;
          for (const [c, length] of lengths)
            max = Math.max(
              max,
              Math.abs(
                c
                  .getWorldPosition(new T.Vector3())
                  .distanceTo(c.parent.getWorldPosition(new T.Vector3())) /
                  length -
                  1,
              ),
            );
          return { fingerBones: bones.length, maxBoneLengthFractionError: max };
        });
        output.openClose = metrics;
        for (const [pose, strength] of [
          ["open", 0.2],
          ["fist", 1],
        ]) {
          await page.evaluate(
            (strength) => review.setFingerPose(strength),
            strength,
          );
          for (let view = 0; view < 3; view++) {
            await page.evaluate((v) => review.setView(v), view);
            await page.screenshot({
              path: `docs/hand-frames/${hero}_${side === "Right" ? "R" : "L"}_${pose}_${view}.png`,
            });
          }
        }
      } else
        for (let view = 0; view < 3; view++) {
          await page.evaluate((v) => review.setView(v), view);
          await page.screenshot({
            path: `docs/hand-frames/${hero}_${side === "Right" ? "R" : "L"}_${view}.png`,
          });
        }
    }
    const l = new Vector3(...result.heroes[hero].hands.Left.n);
    l.x *= -1;
    const r = new Vector3(...result.heroes[hero].hands.Right.n),
      mirror = MathUtils.radToDeg(l.angleTo(r));
    result.heroes[hero].mirrorNormalErrorDeg = mirror;
    if (mirror > 10) throw Error(hero + " palm mirror mismatch");
  }
  if (rigged)
    for (const hero of Object.keys(result.heroes)) {
      const actual = createHash("sha256")
        .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
        .digest("hex");
      if (actual !== result.heroes[hero].rigSha256)
        throw Error(hero + " rig changed while rendering hand evidence");
    }
  await fs.writeFile(
    rigged ? "docs/hand-frames/open-close.json" : "data/rig/hand-frames.json",
    JSON.stringify(result, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
