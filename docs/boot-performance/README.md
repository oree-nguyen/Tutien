# Android boot and engine revision — 2026-10-17

Request: [adopted PDF text](../requests/ANDROID-BOOT-PERFORMANCE-2026-10-17.md). Implementation: [engine design and limits](../ENGINE-PERFORMANCE.md).

## Verified outcomes

- 362 Node checks passed: 215 master, 128 gameplay/rules, 19 engine/H01. Logs are retained here.
- Default dedicated render-worker browser regression passed: legacy save settles once, no automatic match entry during either ten-second wait, synthetic Start rejected, trusted Start works, movement/F work, loading cancellation does not debit the wallet, quit/reload returns to lobby.
- Actual worker model inspection verified the left palm on the ground, right hand at the hip and staff-tip impact. See `cloud-worker.json`, `lam-dat-squat.png`, `lam-dat-impact.png`.
- Compatibility renderer art, movement, hero switching and offline loading passed independently. See both `compatibility-*.json` reports.
- Simulated native upgrade bypassed the deliberately seeded legacy service worker and preserved TB 6123 / NB 1234. This was Chromium with a native marker, not an Android device.
- Cloud Chromium/SwiftShader UI maximum long task: **68ms**; no measured UI task over 150ms. FCP: **324ms**, so the requested <200ms target **did not pass**. The separate HTML-only control measured 556ms. Neither measurement is a physical-device acceptance result.
- Lobby: 79 compatible opaque meshes batched into 4; actual total draw calls 50 in the sampled frame. Actual active terrain region used four 1024px compressed KTX2 maps, with one region resident. This does not estimate total device RAM/VRAM from texture counters.
- Signed debug APK: **38,324,693 bytes**. APK/source SHA-256, all nine GLB hashes and certificate are in `build-evidence.json`. Packaged startup entry, Basis transcoder, vine binary and 28 terrain KTX2 files were checked. The signing certificate matches the preceding APK, allowing an update under the same application ID.

## Remaining acceptance

No Android device/ADB is available. Device FPS (including 60/120Hz), RAM, GPU memory, battery/thermal stability and the <200ms launch target remain unverified or unmet. `fullPerformanceAccepted` stays false. This build is a test APK, not a claim that every device matches Liên Quân Mobile performance.

The artifact contains packaged WebP compatibility assets as well as KTX2 GPU variants and all terrain regions. Its larger download size must not be confused with simultaneous resident GPU memory; runtime streams the active region. The standalone HTML remains a separate compatibility artifact using the main-thread renderer.
