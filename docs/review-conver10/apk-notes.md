# Exact APK comparison: 303 MB → 445 MB

This is an artifact audit, not a new build. The current release APK was never overwritten, installed or rebuilt. Raw sizes below are bytes; “MB” uses decimal units. Phone lag is the user's report and has not been measured on an Android device.

## Artifact identity

| | Previous APK | Current APK |
|---|---|---|
| Git release commit | `c5d0e5a` | `4fb7de7` |
| Git commit time, UTC | 2026-10-18 03:02:55 | 2026-10-18 21:03:12 |
| APK bytes | 303,123,808 | 445,435,506 |
| SHA-256 / Git LFS object | `7400d6fe10636274d3147fa6dec208cdce5132bd2c671b87e38450d237e2e2ed` | `1f53131d9a3322303cfeb3eaf2ed19677ccf0107e746244c5eaea7bf0c19a669` |
| Embedded source fingerprint | `5291b9279990da84f0bcfa8d1633d2a719af2e3f629d80e9282b9a8f91a7a7e9` | `f22aced7aa98d8f9f20f390df7c4cd837de3b7a3447f78a317f4713f8fea00b5` |
| Android versionCode / versionName | `1` / `1.0` | `214520411` / `2.5.f22aced7` |
| ZIP entry count | 967 | 976 |
| Sum of compressed entry bytes | 302,892,335 | 445,262,603 |
| Sum of uncompressed entry bytes | 382,322,274 | 579,076,816 |

The exact 303 MB artifact exists in the local Git LFS object store. It was copied to `/tmp/Tutien-apk-comparison/previous-303123808.apk`; its complete SHA-256 and length match the pointer at the previous release commit. The current file's complete SHA-256 and length match its current Git LFS pointer. Both pass `apksigner verify` (exit 0); `aapt2 dump badging` also exits 0. Python `zipfile` streamed every entry to compute SHA-256 and reported no CRC failure.

## Why the file grew

The APK increased by **142,311,698 bytes (+46.95%)**. Newly packaged files under `models/rig-review/` contribute **142,363,589 compressed bytes** and **196,741,024 uncompressed bytes**. This is 100.036% of the APK growth; all other packaging changes together reduce the file by 51,891 bytes.

| New review asset | ZIP compressed bytes | Uncompressed bytes |
|---|---:|---:|
| `models/rig-review/H01.glb` | 73,537,864 | 99,618,472 |
| `models/rig-review/H02.glb` | 68,822,301 | 97,112,948 |
| `models/rig-review/H01-held.json` | 3,185 | 9,147 |
| `models/rig-review/manifest.json` | 239 | 457 |

**All 507 existing shared art/model files are SHA-256 identical.** No old GLB, texture or terrain asset was replaced. There are 15 added paths, 6 removed bundle paths, and 8 changed common paths; the JSON records every path, compressed length, uncompressed length, SHA-256, GLB mesh/skin/clip metadata and exact entry-bundle filename.

The added H01 review body preserves 1,499,726 triangles and uses 4 mesh primitives with a 52-joint skin. H02 preserves 1,499,746 triangles with a 52-joint skin. Both contain six clips. These files belong to the separate `rig-review.html` diagnostic page. Existing verification evidence already declares `runtimeRigReplaced: false` in `docs/anim-report/apk-review/apk-verification.json`.

## What regular lobby and match actually use

The regular native entry is `assets/public/startup.html` in both APKs. Previous boot script: `assets/index-x_5_zE9V.js`; current boot script: `assets/main-BZc6Le2E.js`. Main gameplay, fallback renderer and Three.js bundle names change with bundling/fingerprints. The worker entry `assets/render-worker-9w9c6Jt6.js` and its `assets/world-nhp771s6.js` world bundle are byte-identical. All bundle hashes are recorded.

Git blob checks across the exact release commits show identical `world.js`, `manual-hero.js`, `manual-h02.js`, asset registry/cache, H01/H02 entrance code, render worker/thread and simulation. The only existing `src/main.js` change is a help link to the review page, whose text explicitly says it has not replaced the in-match character.

In ordinary lobby previews both artifacts use the existing skinned driver during the entrance, then display the original Hunyuan source bodies after the entrance completes. `syncTencentPreview` in `manual-hero.js` hides H01's skinned driver body and shows `H01_Tencent_Original_Body`; H02 hides its skinned meshes and shows `H02_Tencent_Original_Body`. The original source body GLBs contain **zero skins and zero clips**. Copying transforms or following a weapon driver does not give these source bodies the review model's joint deformation. This is a concrete existing reason body/limb animation can look unchanged despite adding rigged review assets.

| Ordinary source preview | Body triangles | Weapon triangles | Combined triangles |
|---|---:|---:|---:|
| H01 | 1,499,726 | 619,640 | 2,119,366 |
| H02 | 1,499,746 | 1,500,000 | 2,999,746 |

The four raw source GLBs alone account for 241,544,374 ZIP-compressed bytes and 303,910,280 uncompressed bytes in each APK.

Both APKs request these same full source previews. Ordinary runtime actors are forced to `high` detail by `world.addDetail()` even when the caller requests mobile/low, and `prepareBattlefield()` also prewarms high. The observed exact APK requests therefore use the same H01 high body/staff (60,000/12,000 triangles) and H02 high body/hammer (30,000/8,000 triangles), with the old 52-joint body rigs and existing `Attack/Cast/Dash/Entrance/Idle/Run` clips. The 15,000-triangle mobile body GLBs are packaged but were not requested in these measured paths. The new high-resolution review rigs do not replace the ordinary lobby/match actors. A larger package is therefore not evidence of changed game visuals.

A shared source-cache release defect is also visible in both release source trees: `loadManualAsset()` stores template promises under raw `/models/...` URLs, while `releaseManualSourceAsset()` looks up an absolute URL produced by `localAssetUrl()`. Those keys differ, so intended source-template removal and its geometry/material/texture disposal branch do not run. This can retain source templates through hero switches. It is an existing memory-management concern, not proof of a new 445 MB regression; no device memory quantity is claimed.

## Cloud profiling

Four sequential profiles completed from freshly extracted exact APK `assets/public/` roots, without any Vite transform or rebuild. Each run uses a new browser and storage context; order is previous → current → current → previous. The local static HTTP servers return exact extracted file bytes. Chromium uses ANGLE SwiftShader, 960 × 432 pixels, DPR 1, touch enabled, balanced quality. Only `Capacitor.isNativePlatform()` is supplied to select the native service-worker bypass. This does not emulate Android WebView, its native bridge, GPU, RAM, thermal behavior or install state.

Each run measures ordinary H01/H02 lobby, entrance replay and H02 match idle. Main-thread rAF intervals and long tasks are kept separate from worker-renderer FPS and render counters. Screenshot seek commands requesting 2.1 and 6 seconds are issued only after measurement. These are requested seek labels, not verified joint poses: seeking backward after the source preview is already visible does not necessarily reset that visibility. They illustrate displayed assets and are not proof of real-time animation quality. The match is not fixed-seed; actor visibility and draw counts can differ, so match timing is contextual rather than a controlled workload comparison.

All four runs completed with zero page errors, zero console errors and zero request failures. The model-request path set is identical across all four runs. **Zero review-page/review-GLB requests** occurred during normal lobby, entrance replay and match. Full per-stage rAF interval arrays, long-task entries, worker diagnostics, resource timings and request logs are embedded in `apk-comparison.json`.

User-reported phone lag remains unverified. These software-renderer results cannot establish an Android regression or a 60 FPS result. Package growth alone does not establish that unloaded review GLBs worsen frame times. A phone A/B capture of frame times, WebView/GPU memory and identical settings would be required to attribute that regression. Fresh browser contexts also do not reproduce an APK upgrade with retained caches/storage.

### Repeated source-ready timings

H01 timing starts immediately before navigating to packaged `startup.html`; H02 timing starts before tapping the hero selector and ends when full original source assets report loaded. Browser launch time is excluded.

| Run order | APK | H01 source-ready (s) | H02 change → source-ready (s) | H01/H02 last idle worker FPS |
|---:|---|---:|---:|---:|
| 1 | previous | 9.971 | 11.264 | 1 / 1 |
| 2 | current | 10.547 | 12.053 | 2 / 1 |
| 3 | current | 9.767 | 10.506 | 1 / 1 |
| 4 | previous | 11.111 | 14.002 | 1 / 0 |

The ranges overlap. This small sample does not show the current artifact consistently slower. Worker FPS here is an integer from the last diagnostic window, not an average over the entire stage. Main rAF intervals remain separate in the JSON because the render worker can draw slowly while the page still receives main-thread rAF callbacks.

### Completed ordinary lobby workload

| Asset preview | Previous calls / triangles | Current calls / triangles |
|---|---:|---:|
| H01 | 54 / 2,138,398 | 54 / 2,138,398 |
| H02 | 56 / 3,018,778 | 56 / 3,018,778 |

These lobby counters match exactly in all repeats. They include the stage/rings and other scene geometry in addition to the source character/weapon.

### Match snapshot context

| Run order | APK | Calls | Triangles | Last worker FPS |
|---:|---|---:|---:|---:|
| 1 | previous | 607 | 556,700 | 1 |
| 2 | current | 655 | 569,600 | 0 |
| 3 | current | 669 | 568,036 | 0 |
| 4 | previous | 569 | 556,788 | 1 |

Match bot state/visibility is not fixed-seed, so these draw-count differences are not a controlled A/B test. They cannot be attributed to the package-size change.

### Evidence and reproduction

The ten unchanged PNG screenshots are `apk-{previous,current}-{h01-t2_1,h01-t6,h02-t2_1,h02-t6,h02-match}.png` in this folder. Capture-completion times, byte lengths and SHA-256 hashes are recorded separately from gallery registration times in the JSON. The root task registers the exact screenshot bytes in task 10 of the picture gallery.

The JSON `measurementHarnesses` field preserves the complete inventory and browser runner source. To reproduce, recover the previous exact LFS object to `/tmp/Tutien-apk-comparison/previous-303123808.apk`, retain the current release untouched, write those harness sources into `/tmp/Tutien-apk-comparison/`, then run inventory followed by browser from `/workspace/Tutien` with existing Node/Playwright/Chromium. The static servers use ports 5196 and 5197 and close after the runs; browsers run strictly sequentially. No APK build is required. Each launched browser was closed and both temporary HTTP servers stopped when the harness completed.
