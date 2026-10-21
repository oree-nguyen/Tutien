import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { Group, Quaternion, Vector3 } from "three";
import {
  decodeReportMotion,
  encodeReportMotion,
} from "../src/rig/report-motion-codec.js";
import { ReportEntrancePlayer } from "../src/report-entrance.js";
import { threeRig } from "../tools/rig/animation-payload.mjs";
import { reportEntranceHashes } from "../src/report-entrance-assets.js";
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const donor = {
  H01: "public/models/h01-c0/h01-c0-high.glb",
  H02: "public/models/h02-body/h02-body-high.glb",
};
const buffers = {};
for (const h of Object.keys(donor)) {
  const b = await fs.readFile(`public/animations/report-entrances/${h}.bin`);
  buffers[h] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
async function player(h) {
  const data = decodeReportMotion(buffers[h]),
    doc = await io.read(donor[h]),
    rig = threeRig(doc);
  return {
    data,
    rig,
    player: new ReportEntrancePlayer(h, rig.root, data),
    weapon: new Group(),
  };
}
test("motion assets are bound to shipped donor bytes and contain no skin or material payload", async () => {
  for (const h of Object.keys(donor)) {
    const d = decodeReportMotion(buffers[h]);
    assert.equal(
      createHash("sha256").update(new Uint8Array(buffers[h])).digest("hex"),
      reportEntranceHashes[h],
    );
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(donor[h]))
        .digest("hex"),
      d.donorSha256,
    );
    assert.equal(d.weightChanges, false);
    assert.equal(d.fullResolutionSkinActivated, false);
    assert.equal(d.gripHand, h === "H01" ? "right" : "left");
    assert.ok(buffers[h].byteLength < 400000);
    assert.equal(d.curves.length, 2);
    for (const c of d.curves) {
      assert.equal(c.tracks.length, 53);
      assert.ok(
        c.tracks.every(
          (t) => t.name.endsWith(".quaternion") || t.name === "Hips.position",
        ),
      );
    }
  }
});
test("decoder rejects truncated, foreign and nonfinite binary motion", () => {
  for (const b of [
    new ArrayBuffer(4),
    new ArrayBuffer(32),
    buffers.H01.slice(0, 256),
  ])
    assert.throws(() => decodeReportMotion(b));
  const b = buffers.H01.slice(0),
    v = new DataView(b);
  v.setFloat32(b.byteLength - 4, NaN, true);
  assert.throws(() => decodeReportMotion(b), /Nonfinite/);
  const d = decodeReportMotion(buffers.H01);
  const data = {
    ...d,
    curves: d.curves.map((c) => ({
      ...c,
      tracks: c.tracks.map((t) => ({
        ...t,
        times: Array.from(t.times),
        values: Array.from(t.values),
      })),
    })),
    weaponKeys: d.weaponKeys.map((k) => ({
      name: k.name,
      keys: Array.from({ length: k.count }, (_, i) => ({
        position: Array.from(k.values.slice(i * 8, i * 8 + 3)),
        quaternion: Array.from(k.values.slice(i * 8 + 3, i * 8 + 7)),
        visible: !!k.values[i * 8 + 7],
      })),
    })),
  };
  const roundtrip = decodeReportMotion(encodeReportMotion(data));
  assert.deepEqual(
    roundtrip.curves[0].tracks[0].values,
    d.curves[0].tracks[0].values,
  );
});
test("3 second clips retain bounded angular speed and normalized, continuous quaternions", () => {
  for (const h of Object.keys(donor))
    for (const c of decodeReportMotion(buffers[h]).curves) {
      assert.equal(c.duration, c.name === "Entrance" ? 3 : 4);
      for (const t of c.tracks.filter((t) => t.type === "quaternion"))
        for (let i = 0; i < t.times.length; i++) {
          const q = new Quaternion().fromArray(t.values, i * 4);
          assert.ok(Math.abs(q.length() - 1) < 1e-5, t.name);
          if (i) {
            const prev = new Quaternion().fromArray(t.values, (i - 1) * 4);
            assert.ok(q.dot(prev) >= 0);
            const limit = /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(t.name)
              ? 16
              : 8;
            assert.ok(
              (prev.angleTo(q) * 180) / Math.PI <= limit + 0.001,
              `${h} ${t.name} at ${t.times[i]}`,
            );
          }
        }
    }
});
test("persistent playback agrees at 60 and 120 Hz and replay reuses its mixer/actions", async () => {
  for (const h of Object.keys(donor)) {
    const a = await player(h),
      b = await player(h),
      mixer = a.player.controller.mixer,
      entrance = a.player.controller.entrance;
    for (let i = 0; i <= 240; i++) a.player.sample(i / 60, a.weapon);
    for (let i = 0; i <= 480; i++) b.player.sample(i / 120, b.weapon);
    assert.equal(a.player.controller.state, "IDLE_HOLD");
    const pa = a.rig.root.getObjectByName("RightHand"),
      pb = b.rig.root.getObjectByName("RightHand");
    assert.ok(
      pa.quaternion
        .clone()
        .normalize()
        .angleTo(pb.quaternion.clone().normalize()) < 1e-6,
    );
    a.player.sample(1, a.weapon);
    assert.equal(a.player.controller.state, "ENTRANCE");
    a.player.replay();
    a.player.sample(4, a.weapon);
    assert.equal(a.player.controller.mixer, mixer);
    assert.equal(a.player.controller.entrance, entrance);
    assert.throws(() => a.player.sample(NaN, a.weapon));
    a.player.dispose();
    b.player.dispose();
  }
});
test("upright weapons follow the designated anatomical palm and hammer is 1.75m", async () => {
  for (const h of Object.keys(donor)) {
    const a = await player(h);
    a.player.sample(3, a.weapon);
    a.rig.root.updateMatrixWorld(true);
    const hand = a.rig.root.getObjectByName(
        h === "H01" ? "RightHand" : "LeftHand",
      ),
      palm = hand.localToWorld(new Vector3(...a.data.palmOffset)),
      shaft = new Vector3(...a.data.gripPivot)
        .multiplyScalar(a.data.weaponScale)
        .applyQuaternion(a.weapon.quaternion)
        .add(a.weapon.position);
    assert.ok(
      palm.distanceTo(shaft) < 0.005,
      `${h} endpoint gap ${palm.distanceTo(shaft)}`,
    );
    if (h === "H02")
      assert.ok(Math.abs(1.899999976158142 * a.data.weaponScale - 1.75) < 1e-6);
    a.player.dispose();
  }
});
