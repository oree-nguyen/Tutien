# Offline boot correction — 2026-10-17

Follows the pre-change [boot audit](BOOT-AUDIT.md). The user's clarified scope permits both boot fixes and performance stages, but this change does not recompress assets or alter graphical quality.

- Boot always renders the lobby, preserving a pending full snapshot without starting its simulation or settling assets. “Tiếp tục trận” requires a trusted explicit click. A new match cannot silently overwrite an unresolved run.
- New saves retain the full reference-preserving snapshot, including timers, actor links and extraction escrow, under the same owned `hon-gioi-save-v2` record. Existing v3 receipts cannot reconstruct a world; the user chose explicit confirmation to abandon them under the unchanged settlement routine. Account values are not changed automatically on launch.
- Confirmed death/extraction save after result assignment. Return-to-lobby synchronously commits the cleared offline fields before clearing the in-memory match or showing the lobby. Storage failure keeps the result screen with a retry opportunity. A failed redundant profile mirror does not undo a successful primary commit.
- Cleanup exceptions cannot prevent the lobby from rendering after the record was safely cleared. Ordinary deferred-send extraction remains in the match and retains its record.
- Generic storage-name cleanup was removed. Unknown `activeMatch`, `gamePhase`, backend configuration and other services are preserved. Opaque root fields are retained when updating the owned offline record. No vault/HMAC or settlement formula was changed.
- Offline background/resume parks the saved run in the lobby for manual continuation. The existing online branch, WebSocket implementation and server 90-second grace were not changed.
- HTML already contains a first-frame text shell. The real hub is rendered independently of model/environment awaits. The separate centered “Đang nạp…” overlay has been removed; an absent model no longer covers or blocks the lobby.
- A short source build ID is shown in the lobby and the full source ID is available at `__HON_GIOI__.build`, so an installed APK serving older assets can be distinguished from the inspected source. This is diagnostic evidence, not proof that a particular phone ran it.

## Checks

- 18 focused lifecycle/storage/engine checks passed, including actual simulation death/extraction callbacks, graph references/escrow, unknown-key preservation and primary/mirror storage failures.
- `npm test`: 128/128 passed.
- Browser edge cases: GLBs deliberately blocked for 10 seconds while the complete lobby and placeholder stay visible; v3 record unchanged until confirmation; synthetic resume rejected; explicit resume works; denied storage blocks lobby transition; injected graphics-cleanup failure still permits lobby after a safe clear; reload after abandonment and after exit waits 10 seconds and stays in the lobby.
- Existing worker boot regression retained its 150ms task threshold. It passed with FCP 388ms and maximum observed UI long task 56ms. The <200ms FCP target did not pass. No threshold was reduced; the prior expectation of automatic abandonment/refund was replaced with the user's new manual-resume behavior.
- `npm run verify:master`: exit 1, BLOCKED 0/37. The broad gate still requires current full evidence and physical/art/source-data acceptance; no evidence or threshold was fabricated to bypass it.

Raw reports and logs: [boot-fix evidence](perf-audit/boot-fix/). Chromium/SwiftShader and a simulated native marker were used; no physical Android was connected. The reported phone failure has not been reproduced or certified fixed on that device. A missing model is directly explained by preparation awaits; full-UI disappearance and automatic entry in the installed APK still require its build ID/trace for attribution.

## Runtime follow-up — 2026-10-18

- Fixed the `releaseManualAssets is not defined` crash: `world.js` now imports the exported cache hook. The cache deliberately keeps decoded templates alive across lobby and match transitions.
- Fixed local asset URL resolution for both the browser document and the dedicated render worker. The old base calculation pointed Vite's worker at `/@fs/.../basis`, which returned the HTML shell instead of the Basis transcoder JavaScript/WASM. The worker now resolves packaged assets from its own script directory when it has no document base URL.
- Added the missing `perfBeginAppearance` import used while creating the hub preview.
- Removed the centered loading overlay and updated the blocked-GLB browser assertion to require that the element is absent.
- Focused Chromium test passed all 9 boot/offline checks, including a 10-second GLB block, explicit restore/abandon flows, and exit/reload. No browser page errors were recorded. The normal worker path loaded H01 and its staff in about 4.2 seconds in cloud Chromium/SwiftShader; that is not a physical-device measurement.
