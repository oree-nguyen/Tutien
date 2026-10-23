export const ENTRANCE_REPLAY_INTERVAL_MS = 7200;

/** Wait after completion, and never carry a replay across heroes, backgrounding or match loading. */
export class LobbyEntranceClock {
  constructor() { this.reset(); this.replays = 0; }
  reset() { this.hero = null; this.due = null; }
  tick({now, hero, active, ready, complete}, replay) {
    if(!active || !ready) { this.reset(); return; }
    if(this.hero !== hero) { this.hero = hero; this.due = null; }
    if(!complete) { this.due = null; return; }
    if(this.due === null) this.due = now + ENTRANCE_REPLAY_INTERVAL_MS;
    if(now >= this.due) { this.due = null; this.replays++; replay(); }
  }
}
