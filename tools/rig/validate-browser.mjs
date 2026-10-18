import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { createHash } from "node:crypto";

const output = "docs/rig-audit/fullres-browser";
await fs.mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5196, strictPort: true },
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
const errors = [],
  reports = [];
async function capture(file) {
  const data = await page.evaluate(
    () => review.renderer.domElement.toDataURL("image/png").split(",")[1],
  );
  const png = Buffer.from(data, "base64");
  await fs.writeFile(file, png);
  return png;
}
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    /THREE.PropertyBinding.*(?:not found|No target|could not)/i.test(
      message.text(),
    )
  )
    errors.push(message.text());
});
try {
  for (const hero of ["H01", "H02"]) {
    const captures = [];
    for (const candidate of [false, true]) {
      await page.goto(
        `http://127.0.0.1:5196/tools/rig-review.html?view=full&hero=${hero}${candidate ? "&rigged=1" : ""}`,
      );
      await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
      const png = await capture(
        `${output}/${hero}-${candidate ? "rig-bind" : "source"}.png`,
      );
      captures.push(await sharp(png).ensureAlpha().raw().toBuffer());
    }
    let absolute = 0,
      changed = 0,
      maximum = 0;
    for (let i = 0; i < captures[0].length; i += 4) {
      let delta = 0;
      for (let k = 0; k < 3; k++) {
        const difference = Math.abs(captures[0][i + k] - captures[1][i + k]);
        absolute += difference;
        delta = Math.max(delta, difference);
      }
      if (delta > 2) changed++;
      maximum = Math.max(maximum, delta);
    }
    const meanRgbError = absolute / (1024 * 1024 * 3),
      fractionAboveTwo = changed / (1024 * 1024);
    assert.ok(
      meanRgbError < 0.1,
      hero + " bind rendering diverges from original source",
    );
    assert.ok(
      fractionAboveTwo < 0.001,
      hero + " source silhouette/material changed",
    );
    const animation = await page.evaluate(async () => {
      const T = await import("/node_modules/three/build/three.module.js");
      const { model, mixer, clips, setClip, bindPose } = review;
      bindPose();
      const bones = [],
        meshes = [],
        lengths = new Map();
      model.traverse((node) => {
        if (node.isBone) bones.push(node);
        if (node.isSkinnedMesh) meshes.push(node);
      });
      for (const bone of bones)
        if (bone.parent?.isBone) lengths.set(bone, bone.position.length());
      const bindPoints = meshes.map((mesh) =>
        Array.from({ length: 32 }, (_, i) => {
          const index = Math.floor(
            ((mesh.geometry.attributes.position.count - 1) * i) / 31,
          );
          const point = new T.Vector3().fromBufferAttribute(
            mesh.geometry.attributes.position,
            index,
          );
          return {
            index,
            point: mesh.applyBoneTransform(index, point).toArray(),
          };
        }),
      );
      let frames = 0,
        maxLengthError = 0,
        maxVertexMotion = 0;
      for (const clip of clips) {
        setClip(clip.name, 0, false);
        const action = review.getAction(clip.name);
        action.setLoop(T.LoopOnce, 1);
        action.clampWhenFinished = true;
        for (let f = 0; f <= Math.ceil(clip.duration * 60); f++) {
          action.time = Math.min(f / 60, clip.duration);
          mixer.update(0);
          model.updateMatrixWorld(true);
          for (const bone of bones) {
            if (!bone.matrixWorld.elements.every(Number.isFinite))
              throw Error("Non-finite bone: " + bone.name);
            const length = lengths.get(bone);
            if (length > 1e-8)
              maxLengthError = Math.max(
                maxLengthError,
                Math.abs(bone.position.length() / length - 1),
              );
          }
          for (const mesh of meshes) mesh.skeleton.update();
          if (f % 5 === 0)
            for (let m = 0; m < meshes.length; m++)
              for (const sample of bindPoints[m]) {
                const mesh = meshes[m],
                  point = new T.Vector3().fromBufferAttribute(
                    mesh.geometry.attributes.position,
                    sample.index,
                  );
                mesh.applyBoneTransform(sample.index, point);
                if (!point.toArray().every(Number.isFinite))
                  throw Error("Non-finite skinned vertex");
                maxVertexMotion = Math.max(
                  maxVertexMotion,
                  point.distanceTo(new T.Vector3(...sample.point)),
                );
              }
          frames++;
        }
        action.setLoop(T.LoopRepeat, Infinity);
      }
      bindPose();
      return {
        frames,
        clips,
        bones: bones.length,
        skinnedMeshes: meshes.length,
        maxLengthError,
        maxVertexMotion,
      };
    });
    assert.equal(animation.bones, 52);
    assert.ok(animation.maxLengthError < 0.001, hero + " bone stretch");
    assert.ok(
      animation.maxVertexMotion > 0.02,
      hero + " animations did not deform source vertices",
    );
    for (const clip of animation.clips) {
      await page.evaluate(({ name, time }) => review.setClip(name, time), {
        name: clip.name,
        time: clip.duration * 0.5,
      });
      await capture(`${output}/${hero}-${clip.name}.png`);
    }
    reports.push({
      hero,
      rigSha256: createHash("sha256")
        .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
        .digest("hex"),
      meanRgbError,
      fractionAboveTwo,
      maximumRgbError: maximum,
      ...animation,
    });
    console.log(hero, JSON.stringify(reports.at(-1)));
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        passed: true,
        environment: "Cloud Chromium / SwiftShader; not Android hardware",
        scope:
          "Source-bind visual equivalence and legacy clip integrity only; new entrance/grip acceptance remains separate",
        reports,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
