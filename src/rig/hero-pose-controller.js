import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  PropertyBinding,
  Quaternion,
} from "three";

/** Persistent FK playback. Clips must be baked and accepted before constructing this controller. */
export class HeroPoseController {
  constructor(
    root,
    clips,
    {
      events = [],
      blendDuration = 0.3,
      onEvent = () => {},
      onState = () => {},
    } = {},
  ) {
    if (blendDuration < 0.25 || blendDuration > 0.35)
      throw new Error("Entrance blend must be 0.25–0.35 seconds");
    this.root = root;
    this.entranceClip = clips.find((c) => c.name === "Entrance");
    this.idleClip = clips.find((c) => c.name === "IDLE_HOLD");
    if (!this.entranceClip || !this.idleClip)
      throw new Error("Baked Entrance and IDLE_HOLD clips are required");
    const bones = [];
    root.traverse((node) => {
      if (node.isBone) bones.push(node);
    });
    this.validateTracks(bones);
    this.duration = this.entranceClip.duration;
    this.blendDuration = blendDuration;
    this.events = events
      .map((event, index) => ({ ...event, index }))
      .sort((a, b) => a.time - b.time || a.index - b.index);
    for (const event of this.events)
      if (
        !Number.isFinite(event.time) ||
        event.time < 0 ||
        event.time > this.duration
      )
        throw new Error("Event outside Entrance: " + event.type);
    this.onEvent = onEvent;
    this.onState = onState;
    this.mixer = new AnimationMixer(root);
    this.entrance = this.mixer
      .clipAction(this.entranceClip)
      .setLoop(LoopOnce, 1);
    this.entrance.clampWhenFinished = true;
    this.idle = this.mixer
      .clipAction(this.idleClip)
      .setLoop(LoopRepeat, Infinity);
    this.elapsed = 0;
    this.nextEvent = 0;
    this.state = "READY";
    this.active = true;
    this.disposed = false;
    this.silent = false;
  }
  validateTracks(bones) {
    const tracks = (clip) =>
      new Map(
        clip.tracks
          .filter(
            (t) =>
              PropertyBinding.parseTrackName(t.name).propertyName ===
              "quaternion",
          )
          .map((t) => [PropertyBinding.parseTrackName(t.name).nodeName, t]),
      );
    const entrance = tracks(this.entranceClip),
      idle = tracks(this.idleClip),
      a = new Quaternion(),
      b = new Quaternion();
    for (const bone of bones) {
      const e = entrance.get(bone.name),
        i = idle.get(bone.name);
      if (!e || !i)
        throw new Error("Missing baked bone rotation: " + bone.name);
      a.fromArray(e.values, e.values.length - 4).normalize();
      b.fromArray(i.values, 0).normalize();
      if (a.angleTo(b) > (0.5 * Math.PI) / 180 + 1e-7)
        throw new Error("Entrance/idle discontinuity: " + bone.name);
    }
    for (const clip of [this.entranceClip, this.idleClip])
      for (const track of clip.tracks) {
        const target = PropertyBinding.parseTrackName(track.name);
        if (!["quaternion", "position"].includes(target.propertyName))
          throw new Error(
            "Only quaternion and Hips position tracks may be baked",
          );
        if (target.propertyName === "position" && target.nodeName !== "Hips")
          throw new Error("Only Hips translation may be baked");
        if (!this.root.getObjectByName(target.nodeName))
          throw new Error("Unbound baked track: " + track.name);
      }
    const hipsTrack = (clip) =>
      clip.tracks.find((t) => {
        const p = PropertyBinding.parseTrackName(t.name);
        return p.nodeName === "Hips" && p.propertyName === "position";
      });
    const e = hipsTrack(this.entranceClip),
      i = hipsTrack(this.idleClip);
    if (!!e !== !!i)
      throw new Error("Entrance/idle must agree on Hips translation");
    if (
      e &&
      Math.hypot(
        ...[0, 1, 2].map(
          (k) => e.values[e.values.length - 3 + k] - i.values[k],
        ),
      ) > 0.005
    )
      throw new Error("Entrance/idle Hips discontinuity");
  }
  changeState(state) {
    this.state = state;
    if (!this.silent) this.onState(state);
  }
  dispatch() {
    while (
      this.nextEvent < this.events.length &&
      this.events[this.nextEvent].time <= this.elapsed + 1e-9
    ) {
      const event = this.events[this.nextEvent++];
      if (!this.silent) this.onEvent(event);
    }
  }
  start() {
    if (this.disposed) throw new Error("HeroPoseController has been disposed");
    this.idle.stop();
    this.entrance.stopFading().reset().setEffectiveWeight(1).play();
    this.elapsed = 0;
    this.nextEvent = 0;
    this.changeState("ENTRANCE");
    this.mixer.update(0);
    this.dispatch();
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt < 0)
      throw new Error("Animation delta must be finite and non-negative");
    if (!this.active || this.disposed || this.state === "READY") return;
    let remaining = dt;
    if (this.state === "ENTRANCE") {
      const step = Math.min(
        remaining,
        Math.max(0, this.duration - this.elapsed),
      );
      this.mixer.update(step);
      this.elapsed += step;
      remaining -= step;
      this.dispatch();
      if (this.elapsed >= this.duration - 1e-9) {
        this.entrance.fadeOut(this.blendDuration);
        this.idle
          .reset()
          .setEffectiveWeight(1)
          .fadeIn(this.blendDuration)
          .play();
        this.changeState("BLEND");
      }
    }
    if (this.state === "BLEND") {
      const step = Math.min(
        remaining,
        Math.max(0, this.duration + this.blendDuration - this.elapsed),
      );
      this.mixer.update(step);
      this.elapsed += step;
      remaining -= step;
      if (this.elapsed >= this.duration + this.blendDuration - 1e-9) {
        this.entrance.stop();
        this.idle.stopFading().setEffectiveWeight(1);
        this.changeState("IDLE_HOLD");
      }
    }
    if (this.state === "IDLE_HOLD" && remaining > 0) {
      this.mixer.update(remaining);
      this.elapsed += remaining;
    }
  }
  seek(seconds, emitEvents = false) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Error("Seek time must be finite and non-negative");
    const silent = this.silent,
      active = this.active;
    this.silent = !emitEvents;
    this.active = true;
    try {
      this.start();
      this.update(seconds);
    } finally {
      this.silent = silent;
      this.active = active;
    }
  }
  setActive(active) {
    this.active = !!active;
    this.root.visible = this.active;
  }
  dispose() {
    if (this.disposed) return;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.disposed = true;
  }
}
