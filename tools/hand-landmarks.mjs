import { chromium } from "playwright-core";
import { createServer } from "vite";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const coordinates = {
  H01: {
    view: 0,
    wrist: [-0.49, 1.025, 0.09],
    normal: [0, 0, 1],
    fingers: {
      Thumb: [
        [591, 349],
        [510, 350],
        [456, 360],
        [421, 365],
      ],
      Index: [
        [497, 480],
        [433, 531],
        [384, 575],
        [344, 608],
      ],
      Middle: [
        [544, 535],
        [476, 606],
        [434, 670],
        [402, 710],
      ],
      Ring: [
        [600, 576],
        [560, 638],
        [514, 713],
        [490, 759],
      ],
      Pinky: [
        [663, 598],
        [639, 648],
        [616, 698],
        [606, 737],
      ],
    },
  },
  H02: {
    view: 1,
    wrist: [-0.51, 1.075, 0.09],
    normal: [1, 0, 0],
    fingers: {
      Thumb: [
        [696, 328],
        [732, 390],
        [755, 443],
        [781, 476],
      ],
      Index: [
        [675, 391],
        [718, 502],
        [759, 622],
        [791, 708],
      ],
      Middle: [
        [589, 429],
        [613, 550],
        [648, 699],
        [670, 795],
      ],
      Ring: [
        [500, 467],
        [516, 589],
        [532, 708],
        [544, 780],
      ],
      Pinky: [
        [400, 461],
        [402, 558],
        [409, 657],
        [412, 716],
      ],
    },
  },
};
const server = await createServer({
  server: { host: "127.0.0.1", port: 5194, strictPort: true },
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
const result = {
  method:
    "Visible anatomical landmarks picked on original textured hand renders; raycast to source surface, midpoint between opposite surfaces. No geometry edits.",
  heroes: {},
};
try {
  for (const [hero, spec] of Object.entries(coordinates)) {
    await page.goto(
      `http://127.0.0.1:5194/tools/rig-review.html?hero=${hero}&hand=R`,
    );
    await page.waitForFunction(() => window.ready, { timeout: 120000 });
    const measured = await page.evaluate(async (spec) => {
      const T = await import("/node_modules/three/build/three.module.js"),
        { scene, model, camera, setView } = window.review;
      setView(spec.view);
      model.traverse((n) => {
        if (n.isMesh) n.material.side = T.DoubleSide;
      });
      model.updateMatrixWorld(true);
      const ray = new T.Raycaster(),
        normal = new T.Vector3(...spec.normal),
        directions = new T.Vector2();
      function thicknessMid(point, n, surface = null) {
        ray.set(point.clone().addScaledVector(n, 0.12), n.clone().negate());
        const hs = ray.intersectObject(model, true);
        const unique = [];
        for (const hit of hs) {
          if (
            !unique.length ||
            hit.point.distanceTo(unique.at(-1).point) > 1e-5
          )
            unique.push(hit);
        }
        let pair;
        if (surface) {
          let k = -1,
            best = 0.003;
          unique.forEach((hit, i) => {
            const d = hit.point.distanceTo(point);
            if (d < best) {
              best = d;
              k = i;
            }
          });
          const j = k + (surface === "back" ? -1 : 1);
          if (
            k >= 0 &&
            unique[j] &&
            unique[k].point.distanceTo(unique[j].point) < 0.075
          )
            pair = [unique[k], unique[j]];
        } else {
          let best = Infinity;
          for (let i = 1; i < unique.length; i++) {
            const a = unique[i - 1],
              b = unique[i],
              thick = a.point.distanceTo(b.point),
              mid = a.point.clone().add(b.point).multiplyScalar(0.5),
              d = mid.distanceTo(point);
            if (thick > 0.003 && thick < 0.075 && d < best) {
              best = d;
              pair = [a, b];
            }
          }
          if (best > 0.035) pair = null;
        }
        if (pair) {
          const [a, b] = pair;
          return {
            position: a.point
              .clone()
              .add(b.point)
              .multiplyScalar(0.5)
              .toArray(),
            thickness: a.point.distanceTo(b.point),
            surfaceNormal: a.face.normal.toArray(),
          };
        }
        return { position: point.toArray(), thickness: null, unpaired: true };
      }

      const right = { wrist: spec.wrist, fingers: {} };
      for (const [name, pixels] of Object.entries(spec.fingers)) {
        right.fingers[name] = pixels.map(([x, y]) => {
          directions.set((x / 1024) * 2 - 1, (-y / 1024) * 2 + 1);
          ray.setFromCamera(directions, camera);
          const hit = ray.intersectObject(model, true)[0];
          if (!hit) throw Error("Landmark missed mesh " + name);
          return {
            pixel: [x, y],
            ...thicknessMid(
              hit.point,
              normal,
              spec.view === 1 ? "back" : "palm",
            ),
          };
        });
      }
      const left = {
        wrist: [-spec.wrist[0], spec.wrist[1], spec.wrist[2]],
        fingers: {},
      };
      const mirroredNormal = normal.clone();
      mirroredNormal.x *= -1;
      for (const [name, points] of Object.entries(right.fingers))
        left.fingers[name] = points.map((p) => {
          const mirror = new T.Vector3(...p.position);
          mirror.x *= -1;
          return thicknessMid(mirror, mirroredNormal);
        });
      const { deriveHandFrame } = await import("/src/rig/hand-frame.js");
      for (const [side, hand] of Object.entries({ Right: right, Left: left })) {
        const knuckles = new T.Vector3(),
          direction = new T.Vector3();
        for (const name of ["Index", "Middle", "Ring", "Pinky"]) {
          const ps = hand.fingers[name],
            a = new T.Vector3(...ps[0].position),
            b = new T.Vector3(...ps[3].position);
          knuckles.add(a);
          direction.add(b.sub(a).normalize());
        }
        knuckles.multiplyScalar(0.25);
        direction.normalize();
        const originalWrist = new T.Vector3(...hand.wrist),
          seed = knuckles
            .clone()
            .addScaledVector(
              direction,
              originalWrist.clone().sub(knuckles).dot(direction),
            );
        const provisional = deriveHandFrame(
            { ...hand, wrist: seed.toArray() },
            side,
          ),
          normal = new T.Vector3(...provisional.n),
          wristProbe = thicknessMid(seed, normal);
        hand.wrist = (
          !wristProbe.unpaired &&
          wristProbe.thickness >= 0.025 &&
          wristProbe.thickness <= 0.085
            ? new T.Vector3(...wristProbe.position)
            : spec.view === 1
              ? seed
              : originalWrist
        ).toArray();
        hand.wristCalibration = {
          original: originalWrist.toArray(),
          seed: seed.toArray(),
          sourceThickness: wristProbe.thickness,
          method:
            "Finger long-axis projected to cuff landmark; center of opposing source surfaces when available",
        };
        const thumb = hand.fingers.Thumb,
          thumbSeed = new T.Vector3(...hand.wrist)
            .multiplyScalar(0.4)
            .addScaledVector(new T.Vector3(...thumb[1].position), 0.3)
            .addScaledVector(
              new T.Vector3(...hand.fingers.Index[0].position),
              0.3,
            ),
          thumbProbe = thicknessMid(thumbSeed, normal);
        if (!thumbProbe.unpaired) {
          thumb[0] = {
            ...thumb[0],
            ...thumbProbe,
            method: "Thumb CMC center measured at anatomical palm-base seed",
          };
        }
        const carpal = new T.Vector3(...hand.wrist).lerp(
          new T.Vector3(...hand.fingers.Index[0].position),
          0.25,
        );
        hand.fingers.Thumb[0] = {
          ...hand.fingers.Thumb[0],
          position: carpal.toArray(),
          method:
            "Thumb CMC at the carpal base of the measured wrist/index landmarks; not the visible free-thumb knuckle",
        };
        for (let iteration = 0; iteration < 2; iteration++) {
          const derived = deriveHandFrame(hand, side),
            n = new T.Vector3(...derived.n);
          for (const [finger, points] of Object.entries(hand.fingers))
            for (const [joint, point] of points.entries()) {
              if (finger === "Thumb" && joint === 0) continue;
              const measured = thicknessMid(
                new T.Vector3(...point.position),
                n,
              );
              if (!measured.unpaired) {
                point.position = measured.position;
                point.thickness = measured.thickness;
                point.refinedAlongPalmNormal = true;
                delete point.unpaired;
              }
            }
        }
      }
      return { Right: right, Left: left };
    }, spec);
    result.heroes[hero] = {
      sourceSha256: createHash("sha256")
        .update(
          await fs.readFile(
            `public/models/hunyuan-original/${hero}-C0-source.glb`,
          ),
        )
        .digest("hex"),
      sampling: spec,
      hands: measured,
    };
    console.log(hero, measured.Right);
  }
  await fs.mkdir("data/rig", { recursive: true });
  await fs.writeFile(
    "data/rig/hand-landmarks.json",
    JSON.stringify(result, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
