# Hàn Trạch / Chấn Nhạc Chùy — user-shared models

The user supplied two public Hunyuan shares and authorized integration/animation:

- H02 body: `cd050512-738f-449f-95d3-7c11a9c06851` (original SHA-256 `9ecc6c14e792f4f8f3137fb1376f2cc1253846ad359945fd6ab0a7706e837787`, 79,035,308 bytes).
- Chấn Nhạc Chùy: `45b118bc-58ce-4000-94c6-8e09945aa9f1` (original SHA-256 `61733d9779c40642b5e29d63e70b016d02c30c493d19a5fc3ad52ed54c4504b1`, 93,555,204 bytes).

The visible body LODs retain original face-corner UVs and resize the original PBR images; the distant 1,000-triangle body uses a rebaked atlas. The hammer is reduced and rebaked. These are lossy mobile derivatives, not lossless UV guarantees.

Raw downloads stay in ignored local storage; public game assets are reduced derivatives with embedded PBR, Meshopt/WebP and GPU KTX2 variants. No primitive human or replacement hammer was built. The original armature-free body receives a locally authored 52-bone rig, skin weights and six clips. This is not anatomical equipment segmentation or cloth simulation.

## Authored sequence

| Seconds | Visual action |
| --- | --- |
| 0–0.65 | Hammer falls diagonally from upper screen right to the front-center of the dais, head first. |
| 0.65 | Head strikes the floor; branching cracks, dust/sparks and shock ring appear. |
| 2.15 | Hàn Trạch starts descending from the same corner, exactly 1.5 seconds after the hammer impact. |
| 2.82 | Character lands in a crouch, feet spread. Left hand goes to hip; right hand reaches between the knees for the shaft. |
| 3.50 | Actual right-hand socket takes ownership of the separate hammer mesh. |
| 3.75–4.65 | Character stands and rotates the shaft upright, raising the head to approximately face height. |
| 4.72–5.10 | Small lift and firm butt-cap stamp; a separate, smaller crack effect appears. |
| 5.60 | Entrance completes; Idle/Run/Attack/Cast/Dash use the same actual rig. |

The message contained no Free Fire reference image. The downward flying pose is an interpretation of the written description, not a claim of matching an unseen image. Right-hand pickup/left-hand hip is the default pending any preference correction.

The hammer source is horizontally oriented. Offline normalization rotates its actual mesh to an upright shaft, gives it a 1.9m overall length and anchors the grip 1.15m above the butt cap. The head core is then at 1.64m while the cap touches the floor, beside the character's face rather than a horizontal shaft across the chest. The front-surface alignment is measured on the actual rest-pose meshes: face front z≈0.1105m and hammer face z≈0.34385m, giving a standing shaft offset z=-0.2334m. This puts the broad head face in the same frontal plane as the face while retaining the upright shaft. IK keeps the actual hand socket on the shaft; no separate animated fake weapon is substituted at pickup.

Cracks are bounded local visual geometry; they do not alter navigation, damage, match clocks or the physical floor. They are disposed with the preview. No extra PointLight or per-effect animation loop is introduced. The shared renderer worker, shader preparation, GPU decoder, hash-validated cache and scene cleanup remain in use.

## Verification

Run the H02 unit/GLB checks and browser test:

```sh
node --test tests/h02-entrance.test.js tests/h01-refit.test.js tests/manual-hero.test.js
node tests/h02-entrance-browser.mjs
```

The browser test inspects actual bone and weapon coordinates, all entrance milestones, GPU textures, manual movement/F and exit. Screenshots, exact asset/build hashes and results belong in `docs/manual-assets/h02-entrance/`. Android performance and the accuracy of the unseen reference pose require physical/user review; no 60FPS certification is made.

## Rebuilding these approved sources locally

Use the exact raw files matching the SHA-256 values above. Blender and Node tooling are local development dependencies only. Prepare the static high/low files first, rig both body LODs, then create the middle LOD and GPU textures:

```sh
blender -b -t 4 --python tools/manual-assets/prepare_h02.py -- --original-uv --kind body --source .local/manual-assets/h02-body-original.glb --output public/models/h02-body
blender -b -t 4 --python tools/manual-assets/prepare_h02.py -- --low --kind body --source .local/manual-assets/h02-body-original.glb --output public/models/h02-body
blender -b -t 4 --python tools/manual-assets/rig_h02.py
blender -b -t 4 --python tools/manual-assets/rig_h02.py -- --low
blender -b -t 4 --python tools/manual-assets/prepare_h02.py -- --kind hammer --source .local/manual-assets/h02-hammer-original.glb --output public/models/h02-hammer
blender -b -t 4 --python tools/manual-assets/prepare_h02.py -- --low --kind hammer --source .local/manual-assets/h02-hammer-original.glb --output public/models/h02-hammer
node tools/manual-assets/optimize_h02.mjs
node tools/manual-assets/prepare_gpu_textures.mjs --h02-only
```

The tools keep static and rigged backups under ignored `.local/manual-assets/`. When intentionally replacing a prepared source/rig, move those corresponding backups aside first; otherwise re-running optimization deliberately uses the existing pre-compression source, avoiding repeated lossy reductions. Do not rerig an already skinned input. Keep H01's asset registry entries when regenerating H02, and vice versa.
