# Reassessment: source rig, garment segmentation and runtime animation

Reviewed `main` at `4ee877a` using AGENTS.md, the requested entrance specification, `docs/RIG-REBUILD.md`, conver10 gallery registrations, machine-readable conver10 evidence and the current implementation. This review changes documentation only. No optimizer, browser, APK build, asset export or production activation was run. No new image was opened or captured.

## Finding that explains the unchanged lobby

The diagnostic APK is a real newer build, but it does not install the new rig as the lobby or battle actor. The recorded APK provenance explicitly says `runtimeRigReplaced: false` (`docs/anim-report/apk-review/apk-verification.json:11`). The build copies the split H01 diagnostic and staged H02 into a separate review route (`scripts/copy-rig-review.mjs:6`, `src/rig-review-app.js:148`). Production H01 still loads the old `high`/`medium`/`low`/`mobile` entries; production H02 still loads `h02-body-*` (`src/manual-hero.js:65`, `src/manual-h02.js:53`, `src/manual-hero-assets.js:3`). The staging manifest is not a runtime selector; both staged rigs have `runtimeEnabled: false` (`assets/rigged/manifest.json:13`, `assets/rigged/manifest.json:33`).

After the entrance, the production lobby deliberately hides the animated body and shows a separately loaded, unskinned original source body. H01 does this in `syncTencentPreview` (`src/manual-hero.js:27`), called at `src/manual-hero.js:178`. H02 hides its skinned meshes in `src/manual-h02.js:15`, called at `src/manual-h02.js:100`. Their mixers still update the hidden legacy rig. This directly explains the visible return to the source pose; stopping or destroying the mixer is not necessary to produce the symptom.

`HeroPoseController` is only imported by its unit test (`tests/hero-pose-controller.test.js:11`); neither production actor nor the mobile review page imports it. It requires both `Entrance` and `IDLE_HOLD` (`src/rig/hero-pose-controller.js:24`). Direct GLB JSON inspection confirms the two packaged review GLBs and the fullbody-refit candidate still contain only `Attack`, `Cast`, `Dash`, `Entrance`, `Idle`, `Run`. Adding the class therefore has not changed the user's animation.

The review GLBs alone contain 196,731,420 uncompressed bytes: H01 panels 99,618,472 and H02 97,112,948. They are additional copies alongside the existing runtime/source assets. The 445,435,506-byte APK and valid source identity prove packaging, not corrected actor loading or animation (`docs/anim-report/apk-review/apk-verification.json:4`). Exact ZIP-entry and device-memory attribution belongs to the separate APK profiling review. No texture reduction is needed to diagnose this activation gap.

## Priority findings and fixes

| Priority | Finding and consequence | Concrete correction |
| --- | --- | --- |
| P0 | The new assets/controller are disconnected from production. The static-source swap remains the visible post-entrance behavior. | Finish and certify actual replacement clips/weights, then switch the actor asset, controller and post-entrance path together. Remove the static swap from that accepted path. An import alone or copying another GLB into the APK cannot fix it. |
| P0 | H02 production still grabs with the right hand (`src/manual-h02.js:84`), using the right-hand socket created by `src/h01-ik.js:42`. The requested reference uses the **left** hand (`docs/requests/H01-H02-ENTRANCE-PROMPT-2.md:253`); the offline solver already uses Left (`tools/rig/solve-grips.mjs:12`). | Add the specified per-hero entrance data (`data/hero-entrance/H01.json`, `H02.json`; currently absent) and drive bake, socket, solver and tests from one `gripHand`. Ground support must also follow the reference: right palm to ground, not the legacy left-hand support in `src/h01-ik.js:97`. |
| P1 | The garment classifier operates on color and Euclidean proximity, without surface adjacency, seed certainty, topology-component checks or reviewed seams. It can label nearby inner/outer layers together and produce fragmented panels. | Use color only as seed evidence; propagate on the actual source triangle/edge graph, with hard semantic seed patches tied to source SHA and source face IDs. Audit connected components, boundary loops, sleeve/robe interfaces and layer identity before any weight change. Preserve every original triangle and UV/material assignment. |
| P1 | The current harmonic solve assigns the same four arm/spine supports to its whole active domain (`tools/rig/harmonic_body.py:36`). The expanded domain reaches down to 0.2 m (`tools/rig/harmonic-body.mjs:81`), but still has no Hips/pelvis support. | Select at most four appropriate **existing** bones per semantic region. A hanging lower robe needs pelvis/spine support; a sleeve needs the corresponding arm chain. Couple sewn boundaries by source identity. Do not repeat the same arm-only solve for a larger lower-body region. |
| P1 | The optimizer cannot change support bone IDs. Its free set is specifically rows ordered `[Spine2, side Arm, side ForeArm, side Hand]` (`tools/rig/optimize_surface.py:18`); it modifies weights only (`tools/rig/optimize-surface.mjs:89`). It cannot introduce a missing hip influence. | Fix the support assignment first, compare weights by joint identity rather than slot order, and optimize shared source groups over a small set of required poses. More iterations on the present domain cannot resolve its missing degrees of freedom. |
| P1 | Multi-mesh export is not supported by the optimizer: it silently takes the first primitive (`tools/rig/optimize-surface.mjs:25`) and copies a protected mask from a particular earlier one-primitive artifact (`tools/rig/optimize-surface.mjs:45`). `posedHand` and older whole-body/contact validators also take the first mesh/primitive (`tools/rig/pose-hand.mjs:63`). | Collect all mesh instances/primitives, carry explicit source vertex/triangle maps through compaction, validate mask lengths/hashes, and solve each source group once before scattering to every exported copy. Until generalized, reject multi-mesh input explicitly rather than implying whole-character coverage. |
| P1 | `validate-all-meshes` skips seam comparisons within the same node and compares node **names**, not primitive or node identity (`tools/rig/validate-all-meshes.mjs:59`). A fresh fixture with two primitives in one node and a 100 mm opening incorrectly passes with `pairs: 0`. | Compare all mapped copies of a source vertex, including UV seams within one primitive, multiple primitives in one node and nodes with duplicate names. Use stable source identity; preserve the 1 µm continuity tolerance. Add the reproduced case to regression tests. |
| P1 | The upper-stretch check cannot detect collapse. A fresh fully collapsed triangle passes with p99.9=max=0 (`tools/rig/hand-strain.mjs:29`, `tools/rig/hand-strain.mjs:49`). The optimizer's loss similarly penalizes only ratios above 1.47 (`tools/rig/surface_objective.py:31`). | Keep 1.5/2.0 unchanged and implement the separately required joint cross-section ratios 0.7–1.4 (`docs/requests/H01-H02-ENTRANCE-PROMPT-2.md:333`), plus triangle area/orientation and intersection diagnostics. Do not relabel upper-edge-stretch acceptance as volume or garment acceptance. |
| P1 | A contact pass for one pose is being carried alongside newer, different assets. The exact H01 held proof is keyed to the harmonic-projected SHA, not the fullbody-refit or split GLB. H02 has no accepted exact grip. | Certify the exact GLB/pose/weapon combination that will be activated, including every skinned primitive containing hand or cuff surfaces. Keep palm/finger conditions, 3 mm intrusion and 3 mm post-grab slip unchanged, then check every sampled post-grab frame and hold loop. |
| P2 | The goal command checks manually entered status strings only (`scripts/check-rig-goal.mjs:5`). It cannot detect stale or unrelated evidence if someone marks the JSON complete. | Require matching asset/clip/pose/weapon hashes and successful fresh validators for every completed condition. Keep the current blocked state until those facts exist. |
| P2 | `HeroPoseController` checks Entrance-last versus idle-first, but never idle-last versus idle-first (`src/rig/hero-pose-controller.js:77`). It can accept a hold clip that jumps on every loop. | Validate loop endpoints, finite normalized keys, sample times and quaternion continuity; compare hand/foot FK across both entrance blend and loop boundary. Test with the real accepted asset after unit fixtures. |
| P2 | Scrubbing backward after the static-source swap does not restore the animated body's visibility. H01 seek only sets `forcedTime` (`src/manual-hero.js:120`); H02 does the same (`src/manual-h02.js:103`). Replay separately restores visibility, which seek does not. | Make seek/replay share one deterministic state-restoration path. Test end+10 seconds → crouch → end, not just a fresh-load seek. Otherwise art-review screenshots may inspect the wrong visible model. |

## What the existing segmentation does and does not establish

The first split samples albedo at each vertex, uses broad green/gold inequalities and a bind-space box, then assigns a triangle by a two-of-three vertex vote (`tools/rig/separate-h01-garment.mjs:75`, `tools/rig/garment-separation.mjs:5`). The next split collects green/white seeds (`tools/rig/separate-h01-panels.mjs:104`), compares two 3D nearest-neighbor distances (`tools/rig/classify_robe_panels.py:15`), then splits by centroid height, width and x sign (`tools/rig/robe-panels.mjs:19`). This is a useful source-preserving draft. It is not a semantic garment/anatomy segmentation or cloth simulation.

The compaction/export itself has useful safeguards: it copies the original attribute elements (`tools/rig/separate-h01-panels.mjs:152`), verifies oriented source-corner reconstruction (`tools/rig/separate-h01-panels.mjs:213`), verifies animation/image hashes after export (`tools/rig/separate-h01-panels.mjs:242`) and preserves 1,499,726 triangles. No fake torso is added. However, `compact.sourceVertices` is only used transiently; it is not persisted to the GLB or a source map (`tools/rig/separate-h01-panels.mjs:207`). Direct inspection found no custom source-ID attribute in any of the four exported meshes. Later solvers/validators therefore fall back to coordinate equality, which can both join unrelated touching layers and miss intended relationships.

Fresh numeric graph inspection used the existing `positions.bin`, `triangles.bin` and `panel-mask.bin`; it did not modify or regenerate them. After a 1 µm position weld, the named left panel has **15** connected components, right **13**. The two largest left components contain **112,954 / 68,197 triangles**; right **108,508 / 49,437**. Four left components and two right components have at most ten triangles. Some components may be legitimate detached trim; this is evidence that one named panel is not one proven connected fabric surface, not proof that all disconnected components are wrong. The full lower candidate region has seven components, so proximity alone must not determine semantic layer membership.

The current four named outputs are upper garment/sleeves, two lower outer panels and the remaining source surface (`docs/anim-report/robe-panels/separation.json:12`). They do not implement the separate head/torso/left-right arm/left-right leg segmentation mentioned in AGENTS.md. A 52-bone rig and four clothing meshes must not be described as six anatomical source meshes.

## Why the weight trials fail

The hip-only trial assigns every vertex of both lower panels 100% Hips (`tools/rig/anchor-robe-panels.mjs:18`). Rigidly transformed panels consequently show stretch 1.0, while the adjacent sleeve/upper garment still follows arm bones. The largest shared-boundary gap is **388.343 mm**, located at `[-0.24578552, 0.70502084, -0.04649187]` m between upper garment and right panel (`docs/anim-report/robe-panels/anchored-all-mesh-strain.json`). This is the expected discontinuity of assigning incompatible motion to opposite sides of the same unreviewed cut. Treating the entire cut as a free seam would hide the defect and is not a repair.

The unchanged-weight split baseline already has three rejected regions: upper garment 1.978801/3.148168, right panel 2.351750/3.789454, remainder 1.754100/2.836207 (p99.9/max). Only the left panel passes at 1.475971/1.598568 (`docs/anim-report/robe-panels/baseline-all-mesh-strain.json`). The defects are not confined to a detached lower hem.

The 2,000-iteration refit consumes the **unsplit** harmonic-projected GLB (`docs/anim-report/fullbody-refit/receipt.json:2`). It changes 311,662 vertices over 273,481 groups, retains the arm-only palettes, optimizes one upright pose and still fails at **1.894217/3.497870** (`docs/anim-report/fullbody-refit/all-mesh-strain.json:14`). Its worst edge is on the same right lower robe as the split baseline. The review copier still selects the earlier `assets/rigged/H01-C0-robe-panels-diagnostic.glb`, so even that numerical refit is not the asset in the viewer (`scripts/copy-rig-review.mjs:7`).

The surface objective and its derivative have meaningful regression coverage, but a correct derivative does not establish that its chosen supports, poses or objective match the garment problem. Its average one-sided edge penalty can improve while the worst edge remains rejected. It contains no garment/body collision, thickness, cross-section or contact constraints (`tools/rig/surface_objective.py:22`). Its finite-iteration status is truthfully nonconverged, but convergence would still not establish complete acceptance.

## Contact and animation evidence to retain

The exact H01 source-triangle contact checker is materially stronger than the earlier cylinder/capsule diagnostic. It recursively bounds signed distance over actual skinned triangles and rejects ambiguous or unresolved queries (`tools/rig/contact-surface.mjs:34`). The recorded held result has palm gap 3.369158 mm, facing dot 0.816492, sampled intrusion 2.822744 mm and conservative upper bound 2.999558 mm, with zero ambiguous/unresolved queries (`docs/anim-report/harmonic-held/H01-reference-contact.json`). Retain it as a narrowly scoped result for its recorded SHA and pose.

It does not certify a new robe weighting, full character/body collision, the requested reference sequence or H02. `validate-reference-pose` is hardcoded H01 (`tools/rig/validate-reference-pose.mjs:9`), calls the first-primitive helper and measures the hand/cuff crop. `test:rig:mesh-contact` is a different, older vertex-only diagnostic (`tools/rig/validate-mesh-contact.mjs:57`), so its name must not imply adaptive triangle certification. H02's `H02-grip-patch-search.json` explicitly remains `hand: Left`, `passed: false`; no `H02-exact-grip-search.json` exists.

The requested end state includes baked 60 Hz FK, the correct support/grip hand, feet on the platform, a reference pose held for at least ten seconds, continuous looping and controller reuse (`docs/requests/H01-H02-ENTRANCE-PROMPT-2.md:295`). Current runtime still runs legacy per-frame IK (`src/manual-hero.js:175`, `src/manual-h02.js:100`) with hardcoded hand frames (`src/h01-ik.js:51`) and no new `IDLE_HOLD`. None of these missing checks should be replaced by another APK signing or camera-framing pass.

## Bounded first implementation after this report

Start with an actual **H01 sleeve-to-right-robe repair**, not another package. Scope the first asset pass to the source regions that currently contain the failing right-panel and cuff/upper-sleeve edges; retain the already validated source hand/finger region unchanged.

1. Persist source vertex IDs, oriented source triangle IDs and explicit sewn/free boundary groups through the existing split. Replace nearest-in-space labeling with source-edge graph labeling and a small deterministic, source-SHA-bound set of semantic seed patches. Resolve or explicitly label disconnected trim and inner garment; do not manufacture hidden body surfaces.
2. Assign appropriate existing pelvis/spine supports to hanging cloth and arm supports to the sleeve, with a source-edge transition band that keeps sewn copies identical. Fix the whole-source support topology before a bounded local weight solve. Validate bind, the accepted upright arm pose and intermediate raised-arm poses; preserve hand/finger weights and all source geometry/UV/image bytes. This changes the actual source-derived asset, not only diagnostic code.
3. Bake a real four-second `IDLE_HOLD` from the accepted H01 upright target, with a closed breathing loop and no foot, shaft or hand drift, and a finite FK transition from a validated neighboring pose. Do not call this the complete crouch/rise Entrance. The complete requested sequence remains a separate next gate. If step 2 still fails unchanged thresholds, keep the new clip/segmentation work staged and report the specific unresolved region rather than manufacturing acceptance.
4. Only after all affected meshes pass the existing strain/seam thresholds, the required cross-section checks and exact contact for the new SHA should the production H01 preview consume that source rig/controller and keep it visible after entrance. Validate full replay/seek/switch behavior before making an APK. H02 must retain its explicit blocker until its left-hand grip and reference sequence independently pass.

This slice is achievable without an external generator, new anatomy, extra empty rig nodes, texture changes or gameplay changes. It must produce a cleaner source partition, correct support assignments and actual exported clip data. A viewer-only APK is not its deliverable. Full H01/H02 animation acceptance is not a realistic claim for the present arm-only single-pose optimization.

## Reproducible checks and limits of this review

Executed during reassessment:

```bash
node --test tests/rig-garment.test.js tests/rig-all-meshes.test.js \
  tests/hero-pose-controller.test.js tests/rig-surface-objective.test.js
```

Result: **13 Node tests passed, zero failed/skipped**, including the wrapper's **3 Python objective/projection tests**. Existing tests do not include the two missing-invariant cases below. Previous whole-asset/browser/APK results quoted above are existing recorded evidence, not reruns.

The following commands reproduce the existing independent fullbody failure without another optimizer or browser. They write only a report to `/tmp`; exit **1** is expected:

```bash
RIG_FILE=.local/rig-candidates/fullbody-refit/H01-C0-rigged.glb \
  REFERENCE_POSE=.local/rig-candidates/reference/heights/22.json \
  RIG_REPORT_FILE=/tmp/conver10-fullbody.json \
  node tools/rig/validate-all-meshes.mjs
```

The collapse blind spot is a tiny in-memory reproduction. The current result is `passed: true, p999: 0, maximum: 0`; this is not evidence that collapse is acceptable:

```bash
node --input-type=module <<'JS'
import { handStrain } from './tools/rig/hand-strain.mjs';
import { Vector3 } from 'three';
const positions = new Float32Array([0,0,0, 1,0,0, 0,1,0]);
console.log(handStrain({
  primitive: {
    getAttribute: () => ({getArray: () => positions}),
    getIndices: () => ({getArray: () => new Uint16Array([0,1,2])})
  },
  mask: new Uint8Array([1,1,1]),
  position: () => new Vector3()
}));
JS
```

The seam blind spot was reproduced by adapting `tests/rig-all-meshes.test.js:8`: put both identical source triangles into **two primitives of one node**, retain separate weight rows selecting joint 0 versus translated joint 1, and set the second joint offset to `[0.1,0,0]`. Running the unchanged validator reports both primitives `p999: 1, maximum: 1, passed: true`, and `seams: {passed: true, pairs: 0, maximumMillimetres: 0}` although corresponding source positions are 100 mm apart. The session fixture and result are `/tmp/conver10-seam-one-node.glb` and `/tmp/conver10-seam-one-node-report.json`; the fixture construction follows the existing test exactly except for collecting primitives in one mesh/node.

To repeat the numeric panel fragmentation check, load `.local/rig-candidates/harmonic-projected/{positions,triangles}.bin` as `<f4` xyz and `<u4` triangles, and `.local/rig-candidates/robe-panels/panel-mask.bin` as uint8. Select triangles with centroid `0.2 <= y < 0.9`, `abs(x) < 0.245` and at least two selected vertices; split by centroid x sign. Weld positions rounded to 1 µm, build each part's undirected source-edge CSR graph and call `scipy.sparse.csgraph.connected_components`. This reproduces the counts above; the weld is only a diagnostic and must not become the proposed semantic seam mapping.

No physical Android behavior or new full-animation deformation/contact has been validated by this reassessment. Production source, textures, thresholds, original GLBs and gameplay remain unchanged.
