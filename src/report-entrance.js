import {
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  Quaternion,
  Vector3,
  MathUtils,
} from "three";
import { HeroPoseController } from "./rig/hero-pose-controller.js";
import {
  reportEntranceUrls,
  reportEntranceHashes,
} from "./report-entrance-assets.js";
import { decodeReportMotion } from "./rig/report-motion-codec.js";
const motion = { duration: 3, idleDuration: 4, sampleRate: 60 },
  loads = new Map();
export async function loadReportEntrancePlayer(hero, body) {
  if (!loads.has(hero))
    loads.set(
      hero,
      (async () => {
        const response = await fetch(reportEntranceUrls[hero]);
        if (!response.ok)
          throw Error("Local motion asset HTTP " + response.status);
        const bytes = await response.arrayBuffer(),
          hash = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            (v) => v.toString(16).padStart(2, "0"),
          ).join("");
        if (hash !== reportEntranceHashes[hero])
          throw Error("Local motion asset hash mismatch");
        const data = decodeReportMotion(bytes);
        if (data.hero !== hero) throw Error("Motion hero mismatch");
        return data;
      })().catch((error) => {
        loads.delete(hero);
        throw error;
      }),
    );
  return new ReportEntrancePlayer(hero, body, await loads.get(hero));
}
const clips = new WeakMap();
const mappings = {
  H01: [
    [0, 0],
    [0.75, 0.75],
    [1, 1.85],
    [1.6, 2.45],
    [2.2, 3.05],
    [2.416666667, 3.55],
    [3, 4.2],
  ],
  H02: [
    [0, 0],
    [0.3, 0.65],
    [0.766666667, 2.15],
    [1, 2.82],
    [1.6, 3.5],
    [2.416666667, 4.65],
    [2.8, 5.1],
    [3, 5.6],
  ],
};
function mapTime(t, keys) {
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const [a, b] = [keys[i - 1], keys[i]];
      return MathUtils.lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]));
    }
  return keys.at(-1)[1] + t - keys.at(-1)[0];
}
/** Plays only rotation/hip motion on an existing shipped rig. No skin replacement,
 * mesh creation, material replacement or gameplay clock is part of this player. */
export class ReportEntrancePlayer {
  constructor(hero, body, data) {
    if (!data || data.hero !== hero)
      throw Error("Unknown report entrance " + hero);
    if (!clips.has(data))
      clips.set(
        data,
        data.curves.map(
          (c) =>
            new AnimationClip(
              c.name,
              c.duration,
              c.tracks.map(
                (t) =>
                  new (t.type === "quaternion"
                    ? QuaternionKeyframeTrack
                    : VectorKeyframeTrack)(t.name, t.times, t.values),
              ),
            ),
        ),
      );
    this.hero = hero;
    this.data = data;
    this.body = body;
    this.time = 0;
    this.position = new Vector3();
    this.nextPosition = new Vector3();
    this.quaternion = new Quaternion();
    this.nextQuaternion = new Quaternion();
    this.controller = new HeroPoseController(body, clips.get(data), {
      events: data.events,
    });
    this.controller.start();
  }
  replay() {
    this.time = 0;
    this.controller.start();
  }
  sample(time, weapon) {
    if (!Number.isFinite(time) || time < 0)
      throw Error("Invalid report entrance time");
    if (time < this.time) this.controller.seek(time);
    else this.controller.update(time - this.time);
    this.time = time;
    const complete = time >= motion.duration,
      clip = complete ? "IDLE_HOLD" : "Entrance",
      phase = complete ? (time - motion.duration) % motion.idleDuration : time;
    const frames = this.data.weaponKeys.find((k) => k.name === clip),
      x = Math.min(phase * motion.sampleRate, frames.count - 1),
      i = Math.floor(x),
      j = Math.min(i + 1, frames.count - 1),
      fraction = x - i,
      values = frames.values;
    this.position
      .fromArray(values, i * 8)
      .lerp(this.nextPosition.fromArray(values, j * 8), fraction);
    this.quaternion
      .fromArray(values, i * 8 + 3)
      .slerp(this.nextQuaternion.fromArray(values, j * 8 + 3), fraction);
    weapon.position.copy(this.position);
    weapon.quaternion.copy(this.quaternion);
    weapon.scale.setScalar(this.data.weaponScale);
    const visible = complete || time >= 0.766666667,
      weaponVisible = this.hero === "H02" || complete || time >= 1.6;
    this.body.traverse((n) => {
      if (n.isSkinnedMesh) n.visible = visible;
    });
    weapon.visible = weaponVisible;
    return {
      time,
      visible,
      heroVisible: visible,
      complete,
      gripped: time >= this.data.events.find((e) => e.type === "grab").time,
      landed: time >= 1,
      player: "gemini-motion-2026-10-21",
      gripHand: this.data.gripHand,
      groundHand: this.data.groundHand,
      state: this.controller.state,
      vfxTime: mapTime(time, mappings[this.hero]),
    };
  }
  dispose() {
    this.controller.dispose();
  }
}
