# PERF BASELINE — 2026-10-17

Instrumentation only; no asset recompression or gameplay/boot fixes in this phase. See [boot audit](BOOT-AUDIT.md). The user authorized fixing both startup bugs and performance phases 0–5, and selected explicit confirmation for abandoning incomplete v3 receipts.

## Method and limits

Local production Vite build, Chromium/SwiftShader, 1280×760, fresh browser profile for each quality. Master tests finished before the final paired capture; no parallel heavy test/build during capture. Five previews: H01, H02, H05, H08, H11. Each actual appearance has a complete five-second frame-interval window. Partial preparation windows are explicitly marked `complete:false` and excluded. This is one cold run per quality, not a statistical device benchmark. Raw reports contain source fingerprints. No Android/ADB device was connected; software-renderer intervals are not phone FPS or driver RAM measurements.

`?perf=1` enables `[HG_PERF]` JSON timing, GPU capability/format logging and five-second resource/frame windows. Default is off. Logs include GLB fetch/cache/decode total and texture generation boundaries. Worker terrain raster jobs also emit their own elapsed time when debug is enabled. No GDD, wallet, vault/HMAC or online reconnect code changed in this phase.

## Measured startup / frame windows

| Mode | H01 ready (ms) | FCP (ms) | JS errors | External requests |
|---|---:|---:|---:|---:|
| balanced | 3703.0 | 408 | 0 | 0 |
| ultra | 4575.5 | 356 | 0 | 0 |

| Mode / preview | Maximum interval (ms) | Intervals >50ms | Textures | Geometries | Draw calls | Triangles |
|---|---:|---:|---:|---:|---:|---:|
| balanced / model:H01:mobile | 411.7 | 19 | 22 | 11 | 50 | 38024 |
| balanced / model:H02:mobile | 376.4 | 23 | 30 | 19 | 51 | 37024 |
| balanced / hero:4:medium | 1974.5 | 6 | 40 | 91 | 213 | 54354 |
| balanced / hero:7:medium | 1116.8 | 9 | 48 | 161 | 201 | 55690 |
| balanced / hero:10:medium | 830.7 | 10 | 55 | 227 | 191 | 53466 |
| ultra / model:H01:high | 627.8 | 12 | 35 | 12 | 1 | 1 |
| ultra / model:H02:high | 660.2 | 14 | 43 | 20 | 1 | 1 |
| ultra / hero:4:medium | 2058.0 | 6 | 54 | 92 | 1 | 1 |
| ultra / hero:7:medium | 796.7 | 8 | 62 | 162 | 1 | 1 |
| ultra / hero:10:medium | 705.2 | 9 | 69 | 228 | 1 | 1 |

## Top 10 measured expensive operations

Sorted by observed elapsed time across both modes; repeated identical operation/key/detail signatures use the maximum. Total GLB load includes decode, so the rows overlap and must not be summed.

| Operation / key | Detail / args | Maximum ms |
|---|---|---:|
| texture:character-five-maps | "medium" | 840.3 |
| glb:load / h02-body-high | "" | 657.2 |
| glb:load / h02-hammer-high | "" | 628.9 |
| glb:load / staff-high | "" | 596.8 |
| glb:load / high | "" | 562.4 |
| glb:load / h02-body-medium | "" | 367.8 |
| glb:load / mobile | "" | 278.0 |
| glb:load / h02-hammer-medium | "" | 245.6 |
| glb:load / staff-medium | "" | 216.7 |
| glb:decode / h02-body-medium-gpu | "" | 121.7 |

The dominant observed costs are procedural character five-map generation and first legacy-model rendering/shader work, rather than only GLB network bytes. In balanced mode the five-map generator reached 672.7ms even at the medium 256px tier. H01/H02 already use local KTX2 variants and staged warm-up. Resource counts grow across the preview sequence; that includes shared/template caches and does not by itself prove a leak.

The current stash list has 38 images, 0 canvases and 0 3D preview widgets. A five-item 3D inspection workload does not yet exist; no invented item-preview baseline is reported. The five hero appearances above are the current repeatable 3D workload.

## GLB inventory

All 23 GLBs under `assets/` and `public/` were inspected using `npm exec --package=@gltf-transform/cli@4.5.1 -- gltf-transform inspect <file> --format md`. All inspect commands exited zero. Full texture dimensions/formats, animation channel/keyframe counts and source hashes: [JSON inventory](perf-audit/glb-inventory.json). Per-file CLI reports: [inspect](perf-audit/inspect/). Ignored `.local` working backups, built dist and duplicate APK copies are not runtime source inventory.

| File | Bytes | Triangles | Meshes | Materials | Bones | Clips | Textures (format/dimensions) |
|---|---:|---:|---:|---:|---:|---:|---|
| assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb | 1529584 | 60000 | 1 | 1 | 52 | 6 | image/webp 1024×1024; image/webp 2048×2048; image/webp 1024×1024 |
| assets/base_models/H01-W0_moc_tinh_truong_nguyen_ban.glb | 747528 | 12000 | 1 | 1 | 0 | 0 | image/webp 1024×1024; image/webp 1024×1024; image/webp 1024×1024 |
| assets/base_models/h01_moc_tinh_truong_raw.glb | 50401568 | 619640 | 1 | 1 | 0 | 0 | image/png 4096×4096; image/png 4096×4096; image/png 4096×4096 |
| assets/tencent/H01-C0/downloads/f294c0b92d9d213b9e63958eb7b06dcb7b33f7d7b06c6e1cd7b6dc3fb3c1bce6/white_mesh.glb | 5833420 | 349474 | 1 | 0 | 0 | 0 | none |
| assets/tencent/H01-C0/projection-diagnostic.glb | 9586704 | 273154 | 1 | 1 | 0 | 0 | image/png 2048×2048 |
| assets/tencent/H01-C0/shape-only.glb | 5833420 | 349474 | 1 | 0 | 0 | 0 | none |
| public/models/h01-c0/h01-c0-high.glb | 1529584 | 60000 | 1 | 1 | 52 | 6 | image/webp 1024×1024; image/webp 2048×2048; image/webp 1024×1024 |
| public/models/h01-c0/h01-c0-low.glb | 286836 | 900 | 1 | 1 | 52 | 6 | image/webp 256×256; image/webp 256×256; image/webp 256×256 |
| public/models/h01-c0/h01-c0-medium.glb | 613836 | 9000 | 1 | 1 | 52 | 6 | image/webp 512×512; image/webp 512×512; image/webp 512×512 |
| public/models/h01-c0/h01-c0-mobile-gpu.glb | 1983400 | 15000 | 1 | 1 | 52 | 6 | image/ktx2 1024×1024; image/ktx2 1024×1024; image/ktx2 1024×1024 |
| public/models/h01-c0/h01-c0-mobile.glb | 849352 | 15000 | 1 | 1 | 52 | 6 | image/webp 1024×1024; image/webp 1024×1024; image/webp 1024×1024 |
| public/models/h01-staff/h01-staff-high.glb | 747528 | 12000 | 1 | 1 | 0 | 0 | image/webp 1024×1024; image/webp 1024×1024; image/webp 1024×1024 |
| public/models/h01-staff/h01-staff-low.glb | 71468 | 795 | 1 | 1 | 0 | 0 | image/webp 256×256; image/webp 256×256; image/webp 256×256 |
| public/models/h01-staff/h01-staff-medium-gpu.glb | 828316 | 4000 | 1 | 1 | 0 | 0 | image/ktx2 512×512; image/ktx2 512×512; image/ktx2 512×512 |
| public/models/h01-staff/h01-staff-medium.glb | 305904 | 4000 | 1 | 1 | 0 | 0 | image/webp 512×512; image/webp 512×512; image/webp 512×512 |
| public/models/h02-body/h02-body-high.glb | 1007776 | 30000 | 1 | 1 | 52 | 6 | image/webp 1024×1024; image/webp 1024×1024; image/webp 1024×1024 |
| public/models/h02-body/h02-body-low.glb | 257880 | 1000 | 1 | 1 | 52 | 6 | image/webp 256×256; image/webp 256×256; image/webp 256×256 |
| public/models/h02-body/h02-body-medium-gpu.glb | 2089828 | 15000 | 1 | 1 | 52 | 6 | image/ktx2 1024×1024; image/ktx2 1024×1024; image/ktx2 1024×1024 |
| public/models/h02-body/h02-body-medium.glb | 816956 | 15000 | 1 | 1 | 52 | 6 | image/webp 1024×1024; image/webp 1024×1024; image/webp 1024×1024 |
| public/models/h02-hammer/h02-hammer-high.glb | 349040 | 8000 | 1 | 1 | 0 | 0 | image/webp 512×512; image/webp 512×512; image/webp 512×512 |
| public/models/h02-hammer/h02-hammer-low.glb | 87528 | 600 | 1 | 1 | 0 | 0 | image/webp 256×256; image/webp 256×256; image/webp 256×256 |
| public/models/h02-hammer/h02-hammer-medium-gpu.glb | 839468 | 3000 | 1 | 1 | 0 | 0 | image/ktx2 512×512; image/ktx2 512×512; image/ktx2 512×512 |
| public/models/h02-hammer/h02-hammer-medium.glb | 289072 | 3000 | 1 | 1 | 0 | 0 | image/webp 512×512; image/webp 512×512; image/webp 512×512 |

## Top 10 encoded GLB sizes

Bytes on disk/transfer, **not resident RAM or VRAM**. Source/diagnostic models outside public are not loaded by the game and must not be blamed for live stalls.

| File | Bytes | Runtime/public? |
|---|---:|---|
| assets/base_models/h01_moc_tinh_truong_raw.glb | 50401568 | source/diagnostic, not runtime |
| assets/tencent/H01-C0/projection-diagnostic.glb | 9586704 | source/diagnostic, not runtime |
| assets/tencent/H01-C0/downloads/f294c0b92d9d213b9e63958eb7b06dcb7b33f7d7b06c6e1cd7b6dc3fb3c1bce6/white_mesh.glb | 5833420 | source/diagnostic, not runtime |
| assets/tencent/H01-C0/shape-only.glb | 5833420 | source/diagnostic, not runtime |
| public/models/h02-body/h02-body-medium-gpu.glb | 2089828 | packaged variant; actual use depends on loader |
| public/models/h01-c0/h01-c0-mobile-gpu.glb | 1983400 | packaged variant; actual use depends on loader |
| assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb | 1529584 | source/diagnostic, not runtime |
| public/models/h01-c0/h01-c0-high.glb | 1529584 | packaged variant; actual use depends on loader |
| public/models/h02-body/h02-body-high.glb | 1007776 | packaged variant; actual use depends on loader |
| public/models/h01-c0/h01-c0-mobile.glb | 849352 | packaged variant; actual use depends on loader |

## Code sites

```text
src/meshopt-worker-source.js:3:export function createMeshoptWorker(){return new Worker(new URL('./meshopt-worker.js',import.meta.url),{type:'module'});}
src/render-worker.js:24:   globalThis.document={createElement:name=>{if(name==='canvas')return new OffscreenCanvas(1,1);throw Error('Unsupported renderer DOM element '+name);}};
src/render-engine.js:3: if(!main&&typeof OffscreenCanvas!=='undefined'&&canvas.transferControlToOffscreen&&typeof Worker!=='undefined'){
src/manual-asset-cache.js:3:import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
src/manual-asset-cache.js:69:    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
src/render-worker-source.js:1:export function createRenderWorker(){return new Worker(new URL('./render-worker.js',import.meta.url),{type:'module'});}
src/terrain-assets.js:9:   const texture=await loader.loadAsync(terrainGpuAssetUrls[biome][key]);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(24,24);texture.anisotropy=anisotropy;
src/soul-ring-vfx.js:148:      } else if (typeof OffscreenCanvas !== "undefined") {
src/soul-ring-vfx.js:149:        canvas = new OffscreenCanvas(resolution, resolution);
src/soul-ring-vfx.js:160:      texture = new T.CanvasTexture(canvas);
src/hero-anatomy.js:614:    tex = new THREE.CanvasTexture(canvas);
src/character-pbr.js:367:    ? new THREE.CanvasTexture(image.image)
src/character-pbr.js:647:        return new THREE.CanvasTexture(c);
src/environment-pbr.js:538:        : new Worker(this.workerURL, { name: "hon-gioi-biome-pbr" });
src/scenery.js:164:  const texture = new THREE.CanvasTexture(canvas);
src/scenery.js:268:  const texture = new THREE.CanvasTexture(canvas);
src/scenery.js:385:  return new THREE.CanvasTexture(canvas);
src/scenery.js:910:        map: new THREE.CanvasTexture(canvas),
src/creature-pbr.js:295:    } else if (typeof OffscreenCanvas !== "undefined") {
src/creature-pbr.js:296:      canvas = new OffscreenCanvas(size, size);
src/creature-pbr.js:307:    result = new T.CanvasTexture(canvas);
```

The runtime GLTFLoader is centralized today only in `manual-asset-cache.js`; tests/tooling have their own loaders. Fixed architecture/bark/IBL/terrain and 156 icon assets are already baked. Legacy cloth/face/hair/beast/ring and sigil/cloud/shop-label generation remains runtime. Do not equate presence of a generator with execution in these five samples: unobserved terrain/boss cases require their own traces.

## Baseline checks

- `npm test`: 128/128 passed.
- `npm run test:master`: 215/215 passed after fixing the new debug worker timer to remain dormant when perf is off. The first instrumentation attempt failed 1 worker-VM test (`performance` absent); that failed attempt is not counted as a pass.
- `npm run verify:master`: exit 1, BLOCKED 0/37. Existing evidence does not match the instrumented source fingerprint; physical-device/art/source-data gates also remain outstanding. No threshold changed.
- Baseline APK artifact: 43,878,542 bytes, SHA-256 b6dba62b82de9632f1b1f89d30356432b77e591b3823ab82ccb102049f337962 (pre-instrumentation APK, not a phone observation).
- Khronos toktx 4.4.2 is installed locally. glTF-Transform CLI 4.5.1 was available through npm exec; adding it to devDependencies belongs to phase 1.
