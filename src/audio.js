// Original procedural audio: no third-party recordings or downloaded music.
export class SoulAudio {
  constructor() {
    this.context = null;
    this.nextStep = 0;
    this.nextMusic = 0;
    this.enabled = localStorage.getItem("hon-gioi-audio") !== "off";
  }
  unlock() {
    if (!this.context) {
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.12 : 0;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended")
      this.context.resume().catch(() => {});
  }
  tone(frequency, duration = 0.15, type = "sine", volume = 0.3, pan = 0) {
    if (!this.context || !this.enabled) return;
    const o = this.context.createOscillator(),
      g = this.context.createGain(),
      p = this.context.createStereoPanner();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(volume, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + duration,
    );
    p.pan.value = Math.max(-1, Math.min(1, pan));
    o.connect(g).connect(p).connect(this.master);
    o.start();
    o.stop(this.context.currentTime + duration);
  }
  update(match, now) {
    if (!this.context || !this.enabled) return;
    if (now > this.nextMusic) {
      this.nextMusic = now + 2.5;
      const scale = [146.83, 174.61, 196, 220, 261.63];
      this.tone(scale[Math.floor(now / 2.5) % 5], 2.3, "sine", 0.12);
      this.tone(73.4, 2.2, "sine", 0.06);
    }
    if (!match?.player) return;
    const a = match.player;
    if (now > this.nextStep) {
      const moved = Math.hypot(
        a.x - (this.lastX ?? a.x),
        a.z - (this.lastZ ?? a.z),
      );
      this.lastX = a.x;
      this.lastZ = a.z;
      if (moved > 0.1) {
        this.nextStep = now + 0.32;
        this.tone(90 + Math.random() * 20, 0.04, "triangle", 0.1);
      }
      const enemy = match.actors.find(
        (t) =>
          t.team !== a.team &&
          t.kind === "hero" &&
          t.alive &&
          Math.hypot(t.x - a.x, t.z - a.z) <
            ((t.items ?? []).includes(26) ? 4 : 8),
      );
      if (enemy) {
        this.tone(65, 0.06, "triangle", 0.08, (enemy.x - a.x) / 8);
        this.nextStep = now + 0.5;
      }
    }
  }
  hit() {
    this.tone(220, 0.07, "triangle", 0.25);
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("hon-gioi-audio", this.enabled ? "on" : "off");
    if (this.master) this.master.gain.value = this.enabled ? 0.12 : 0;
    return this.enabled;
  }
}
