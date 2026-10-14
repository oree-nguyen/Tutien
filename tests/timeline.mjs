import assert from "node:assert/strict";
import { Match } from "../src/simulation.js";
import { newProfile } from "../src/rules.js";
import { writeFile, mkdir } from "node:fs/promises";
import { fingerprint } from "../scripts/fingerprint.mjs";
const m = new Match(
  {
    hero: 3,
    branch: 1,
    rings: [0, 0],
    bones: [],
    supports: [],
    brought: 100,
    skin: 0,
    mode: "solo",
  },
  newProfile(),
);
m.player.immuneUntil = 2000;
const survivor = m.actors.find((a) => a.kind === "hero" && a.team !== 0);
survivor.immuneUntil = 2000;
m.seals = 2;
let frames = 0;
const started = performance.now();
for (; frames < 39700 && !m.result; frames++) {
  m.fixed(1 / 30, { x: 0, z: 0, attack: true });
  if (frames % 9000 === 0)
    console.log(
      "Timeline",
      Math.floor(m.time),
      "seconds;",
      m.actors.length,
      "entities",
    );
}
assert.ok(m.result);
assert.ok(Math.abs(m.time - 1320) < 1 / 30);
assert.ok(
  m.bosses.has("ape") && m.bosses.has("kirin") && m.bosses.has("dragon"),
);
assert.equal(m.tide?.ids.length, 8);
const report = {
  sourceHash: await fingerprint(),
  passed: true,
  simulatedSeconds: Number(m.time.toFixed(6)),
  frames,
  bosses: [...m.bosses],
  result: m.result.type,
  elapsedMs: performance.now() - started,
  recordedAt: new Date().toISOString(),
};
await mkdir("acceptance/evidence", { recursive: true });
await writeFile(
  "acceptance/evidence/timeline.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
