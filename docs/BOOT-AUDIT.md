# Audit boot/offline — 2026-10-17

Audited HEAD: 01bb51b9e9751cecaf8e635d7d0faf30fbabb2de. No runtime fixes made before this report. Installed Android build has not been read from a physical device.

## Storage / restore

| Code | Key/field | Condition / action |
| --- | --- | --- |
| src/main.js:48–51 | hon-gioi-save-v2.profile / .match / .activeRun | Boot reads saved profile, full legacy snapshot and v3 abandonment receipt. |
| src/main.js:49 | hon-gioi-v25 | Profile fallback; not an offline match key. |
| src/main.js:62–79 | hon-gioi-save-v2 | v3 writes match:null and activeRun only while an unfinished offline match exists. Errors swallowed after toast. |
| src/main.js:1670–1673 | same | Checkpoint every five seconds while offline match is unfinished. |
| src/main.js:1731–1733 | same | pagehide / suspend checkpoint. |
| src/main.js:1695–1716 | pending .match / .activeRun | Automatically settles interrupted offline run as abandonment, then saves. Does not activate simulation. No manual Continue button. |
| src/simulation.js:2437–2448 | snapshot object | Match.restore decodes graph; does not run ticks itself. |
| src/systems.js:273–275 | snapshot object | snapshot() calls encodeGraph(this). |
| src/game-lifecycle.js:14–17 | 15 generic names, both storages | Removes activeMatch, matchState, currentBattle, inMatch, battleSession, combatState, autoStartMatch, pendingMatch, survivalRunState, extractionState, currentScene, gamePhase, activeMatchState, autoResumeBattle. Current game does not write these keys; ownership is not established. |
| src/network.js:5,21 | hon-gioi-server | Backend origin; not an offline snapshot. Must remain unchanged. |
| server/index.js:13; server/room.js:650–665 | Redis rooms / room:<id> | Server room restoration; separate from offline localStorage. |
| server/room.js:437; src/network.js:120–128 | connected room | Existing 90s server grace and websocket retry; not an offline save. |

README.md:17 still says reload restores the match. It describes historical behavior and contradicts HEAD.

## Exit paths

- Confirm quit: src/main.js:874–877 -> kill -> simulation.js:1534 -> finish.
- Death: simulation.js:1528–1534 -> finish.
- Successful exit extraction: simulation.js:1911–1918 -> finish.
- finish: simulation.js:1938–1956 sets result before emitting save/end. save therefore writes match:null / activeRun:null.
- Return button or closing the result modal: main.js:1259–1278 -> match=null -> save -> renderHub.
- Interrupted renderer / native resume: main.js:1722–1737 eventually backHub; these are existing behaviors, not changed during audit.
- Deferred-send extraction (SUP-017): simulation.js:1919–1927 emits save while staying in match. Keeping its active record is intentional, not a missed exit.

No normal completed offline exit lacking a save call was found in HEAD. However, swallowed localStorage errors mean successful deletion is not guaranteed before the lobby appears; rendering cleanup can also throw before backHub reaches save. These require a fail-closed persistence boundary, not changes to settlement formulas.

## Boot / visibility

- index.html:21 supplies visible first-frame text/disabled shell before JS.
- boot.js:4 waits for UI paint; :8–9 awaits native service-worker/cache cleanup; :12–13 web-only SW ready/control awaits; :16 imports main.
- main.js:1715 renders actual lobby before world initialization. :1716 automatically settles interrupted run after one paint, then initializes 3D.
- main.js:133–137 awaits paint, renderer module, another paint and renderer creation.
- world.js:39–46 awaits environment maps, baked IBL, batching and shader warm-up before World returns.
- manual-hero.js:51 waits body + staff; :53 waits vine data and bark textures; :54 hides body; :72 awaits warm-up; :75 reveals body.
- h01-entrance.js:13 additionally hides the body for the first 0.75s of the authored introduction.
- main.js:733–736 sets app.inert only after trusted Start, while loading the battlefield. It is not a boot/UI visibility gate.
- style.css:128–140 overlays UI and enables interactive descendants. No model-await based whole-lobby hide was found.

## Root-cause confidence

Historical commit 6abe838 reproduces the reported mechanism directly: main.js:1677–1692 restores pendingSnapshot automatically and skips renderHub; backHub :1251–1262 clears match only in memory. Those are confirmed historical root causes for automatic entry / missing lobby UI.

HEAD removed that mechanism. The packaged APK provenance is SHA-256 b6dba62b82de9632f1b1f89d30356432b77e591b3823ab82ccb102049f337962; it is not evidence of the installed phone's APK hash. Do not assert an old installed build or claim the phone bug reproduced without device traces.

Confirmed current issues relevant to the new request: automatic abandonment settlement instead of manual resume, insufficient v3 data for exact resume, generic storage-key cleanup, lack of a verified synchronous exit-clear boundary, and no in-scene model-loading placeholder. Awaited model/entrance/shader preparation explains model absence while loading; whole-UI absence and automatic entry on the currently installed APK remain unverified.

## Scope

User clarified: fix both boot bugs, then performance stages 0–5. Do not alter GDD, formulas, interaction coordinates, vault/HMAC or online reconnect behavior. Do not overwrite assets/base_models. Physical Android acceptance remains pending. Handling of incomplete historical v3 receipts is awaiting the user's explicit choice; missing world state must not be fabricated.
