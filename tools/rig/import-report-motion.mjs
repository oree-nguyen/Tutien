/** Import only accepted FK channel structure from a staging artifact. Never copy
 * staging geometry, weights, bind matrices, textures or acceptance claims. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { HeroPoseController } from "../../src/rig/hero-pose-controller.js";
import { encodeReportMotion } from "../../src/rig/report-motion-codec.js";
import { threeRig, sha256 } from "./animation-payload.mjs";
const [hero, input, framePath] = process.argv.slice(2);
assert.ok(
  ["H01", "H02"].includes(hero) && input && framePath,
  "Usage: import-report-motion H01|H02 staging.glb frames.json",
);
const bytes = await fs.readFile(input),
  frames = JSON.parse(await fs.readFile(framePath)),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  rig = threeRig(doc);
assert.equal(sha256(bytes), frames.outputSha256);
const curves = rig.clips.filter((c) =>
  ["Entrance", "IDLE_HOLD"].includes(c.name),
);
assert.equal(curves.length, 2);
const check = new HeroPoseController(rig.root, curves);
check.dispose();
const buffer = encodeReportMotion({
  hero,
  scope: "FK channel provenance only; skin remains unaccepted",
  sourceSha256: frames.outputSha256,
  framePath,
  framesSha256: sha256(await fs.readFile(framePath)),
  curves: curves.map((c) => ({
    name: c.name,
    duration: c.duration,
    tracks: c.tracks.map((t) => ({
      name: t.name,
      type: t.name.endsWith(".quaternion") ? "quaternion" : "vector",
      times: t.times,
      values: t.values,
    })),
  })),
  weaponKeys: [],
});
await fs.mkdir("data/hero-entrance/gemini-input", { recursive: true });
const file = `data/hero-entrance/gemini-input/${hero}.bin`;
await fs.writeFile(file, Buffer.from(buffer));
console.log(
  JSON.stringify({
    file,
    sha256: sha256(Buffer.from(buffer)),
    bytes: buffer.byteLength,
    importedSkinBytes: 0,
  }),
);
