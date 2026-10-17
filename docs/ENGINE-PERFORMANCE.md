# Hồn Giới: client engine and Android startup revision

The client keeps Three.js/WebGL and Capacitor. The architecture now separates UI/input/simulation, rendering, asset decoding and persistence. This applies common mobile game engine practices; it is not Liên Quân source code or a claim of equivalent device performance.

## Confirmed causes and fixes

- The old `pendingSnapshot` branch called `prepareBattlefield()` and `Match.restore()` automatically and never rendered the lobby UI. Boot now always enters `LOBBY_HON_THANH`. A one-use trusted Start event authorizes `MATCH_LOADING`; revision tokens reject late asynchronous completion after cancellation.
- Old full-graph match snapshots are settled once as abandoned runs, using the existing death/refund/insurance formulas and restoring channel escrow before settlement. New saves contain only the profile and a small abandonment receipt. They do not serialize 100 bots/world state every second. `backHub()` writes the cleared state immediately. Explicit team surrender bypasses rescue; ordinary combat still has the original 25-second downed period. Online surrender remains server-authoritative and settles once.
- UI markup exists in HTML before gameplay or Three.js is imported. Bootstrap waits for an actual contentful paint, then opens the functional UI and renderer asynchronously. Model failure does not remove the UI. Native resume returns to the lobby and cancels pending loading.
- Startup used to rasterize bark maps and 512px icon canvases on the UI thread. Bark, UI icons, architectural maps, studio IBL and balanced terrain atlases are now baked during development and packaged locally. The binary vine buffer replaces a 3.3MB executable JSON geometry import. The editable million-triangle Blender source remains outside the APK.
- A PointLight parented under the staff changed the scene light count when the staff was hidden, revealed or moved into face view. Staff pulses now use an emissive shader uniform. Lobby lighting topology stays constant. Shader and texture preparation is staged; battlefield/player shader preparation completes before simulation starts.
- The previous service worker eagerly cached every asset and could serve an old APK entry. Native builds use `startup.html` on the same origin, unregister legacy game workers and remove only `hon-gioi-*` CacheStorage entries. Wallet/stash storage and content-validated IndexedDB model records remain intact. Browser PWA builds precache only the UI shell/code and cache 3D resources when requested. Root navigation is normalized to `index.html` for offline reload.

## Threads and ownership

| Owner | Work and bounds |
| --- | --- |
| UI thread | DOM, pointer isolation/skill buffering, audio, authoritative local simulation at 30Hz; existing online authority remains on the server. No WebGL context when the dedicated renderer is supported. |
| Dedicated render worker | OffscreenCanvas, camera, Three.js scene graph, skinning/animation submission, VFX and shader preparation. At most one frame in flight and one latest state; intermediate render states are dropped, never gameplay inputs. Rendering follows worker animation frames. |
| Asset workers | One Basis transcoder and the existing Meshopt decoder. GPU texture transcoding and geometry decode do not block UI input. |
| Terrain streaming | Balanced mode loads an existing 1024px KTX2 atlas for the current biome. One detailed biome is resident; stale region requests are disposed. Ultra keeps the 2048px procedural path with two resident biomes and a separate texture worker. Small PBR fallbacks remain visible while streaming. |
| Persistence | Profile plus minimal run receipt, event/pagehide writes and a five-second checkpoint. Model bytes live in IndexedDB with content hashes; eviction walks key cursors rather than copying all stored GLBs into memory. |

The render packet contains visible actors and cosmetic state, not a second `Match` simulation. Damage, CC, extraction, wallets and item rules still execute in their original authoritative layer. Hidden actors are not sent to the renderer. Pure camera/terrain projection on the UI thread is tested against Three.js's actual isometric ray, preserving touch aiming.

## Resource budgets

- Balanced H01: **15,000 triangles**, 52 bones, six clips, 1024px maps. Staff: **4,000 triangles**, 512px maps. Original/high assets remain available for the existing quality workflow.
- Body/staff and shared environment maps use KTX2 UASTC with mipmaps. One Basis worker selects supported GPU blocks (ASTC/ETC2/BC etc.). WebP/compatible decoding remains available if the GPU path fails. UASTC is lossy; it is not described as preserving every original texel.
- Balanced render ratio is capped at 1.25 and Ultra at 1.5; sustained frame/GPU pressure reduces the ratio. UI text stays at normal DOM resolution. GPU timer queries are read only after completion; unsupported timer hardware uses frame timing.
- Balanced mode allocates no bloom render targets or shadow maps. Ultra enables them explicitly. Native hardware acceleration and heap allowance are explicit. The deprecated Android render-priority flag is retained for the requested configuration; no performance gain is attributed to that flag or to `largeHeap`.
- Opaque lobby architecture is batched by compatible material. The current scene's **79 opaque meshes become four batches**. Petals are one instanced GPU effect. Bullets and drops each use fixed 128-instance buffers. Elemental effects use prewarmed bounded pools; exhaustion skips a cosmetic only.
- Scenery instances are partitioned into 20m cells with tight bounding spheres and distance/frustum culling. Actors outside 40m are not rendered. Ordinary far offline AI makes tactical decisions at 4Hz while movement, damage/status timers and simulation remain fixed-step. Boss AI and the authoritative server retain their existing full rate.
- Returning to the lobby disposes battlefield PBR, actor-owned resources, transient portals/effects, bars and render lists. Selected/common immutable assets stay cached for reuse. Cancelled scene loads cannot debit the wallet or enter a match later.

## Compatibility and diagnostics

OffscreenCanvas/module-worker support is detected. Unsupported devices automatically use the compatible main-thread renderer; a failed dedicated renderer returns safely to the lobby and can recover through that path. `?renderer=main` selects it for art inspection and regression tests. A single-file HTML build uses that compatible path; APK/Vite/PWA deployments support the dedicated renderer. The one-file artifact embeds its assets and is consequently much larger than the executable shell.

`window.__HON_GIOI__.lifecycle` and `.boot` expose read-only diagnostics. In worker mode, `await window.__HON_GIOI__.world.inspect()` reads actual worker camera/model/material/pose/terrain/resource diagnostics. The inspector does not reconstruct fake Three.js nodes on the UI thread. The FPS shown in worker mode comes from render-worker cadence.

## Validation and limits

Run:

```sh
npm test
npm run test:master
node --test tests/engine-performance.test.js tests/h01-refit.test.js tests/manual-hero.test.js
npm run build
GAME_URL=http://127.0.0.1:5175 node tests/performance-boot-browser.mjs
GAME_URL=http://127.0.0.1:5175 node tests/h01-entrance-browser.mjs
GAME_URL=http://127.0.0.1:5175 node tests/manual-hero-browser.mjs
node tests/native-cache-upgrade.mjs
npm run android:apk
```

The browser commands use a local server serving `dist` on port 5175. They cover stale-snapshot boot and ten-second no-auto-entry waits, full UI and actual textured/rigged H01, five entrance phases, manual movement/F, trusted start, cancellation, quit/reload, model cache/offline loading and simulated native cache upgrades without wallet deletion.

Evidence and exact build/model hashes are in `docs/boot-performance/`. Functional passes, the UI long-task budget and first-paint targets are reported separately. No Android device is connected. No 60/120 FPS, device RAM/VRAM, thermal stability or native-engine equivalence is certified. A fresh cloud Chromium control showing only the same HTML shell, without game JavaScript/WebGL, also took 556ms to reach FCP. This does not waive the requested <200ms device target; it identifies the remaining physical acceptance requirement rather than labeling it passed.

## Regenerating packaged assets

The generators are offline development tools, not runtime dependencies. They use the existing approved Hunyuan meshes. `TOKTX` may override the local KTX-Software binary path. The tool used here is Khronos KTX-Software 4.4.2 from its official release; archive SHA-256 `a8781bad05f9624edbf910b7f258cd0a4ba7d3e63b49ecc0a0ab440bf6a0a245` was verified before use.

```sh
node tools/manual-assets/prepare_mobile_h01.mjs
node tools/manual-assets/prepare_gpu_textures.mjs
node tools/manual-assets/bake_environment_maps.mjs
node tools/manual-assets/prepare_environment_gpu.mjs
node tools/manual-assets/bake_terrain_gpu.mjs
node tools/manual-assets/pack_vine_geometry.mjs
```

The existing Vite development server is required for `bake_ui_icons.mjs` and `bake_studio_ibl.mjs`. Bark pixels are baked by `bake_h01_bark.py`. The high-source Blender tools retain their documented manual workflow; no MCP/Hugging Face/remote GPU pipeline is used by this revision.
