# H01/H02 — source-resolution rig rebuild

Status: staging; not activated in the lobby or APK. This report records completed rig groundwork, not completion of the entrance task.

User authorization to continue without technical approval questions is recorded in [authorization.md](rig-audit/authorization.md). Original audit: [RIG-AUDIT.md](RIG-AUDIT.md). Reference prompt: [H01-H02-ENTRANCE-PROMPT-2.md](requests/H01-H02-ENTRANCE-PROMPT-2.md).

## Completed groundwork

- Transferred skin weights from the existing rigs with Blender 4.3.2 onto the actual full-resolution Tencent source meshes. Rebuilt inverse bind matrices, calibrated the wrists and all finger bind axes using measured source-surface landmarks.
- Kept source position, normal, UV and triangle-index accessor bytes and embedded image bytes unchanged. Original files were not overwritten. Receipts next to each GLB contain source/donor/output SHA-256 hashes.
- Retained 52 joints, all six legacy clip names, rotation sample times/counts and Hips translation samples. Re-expressed donor rotations relative to the calibrated bind; ensured quaternion hemisphere continuity. Removed the old scale and non-root translation tracks to prevent bone stretching. This preserves legacy bind-relative rotations, including their existing anatomical defects; it does **not** certify those poses.
- Normalized four-influence weights. Excluded green silk/white cuffs from finger reweighting using measured source hand albedo; applied three 0.5-factor smoothing passes at non-finger transitions, followed by a local hand diffusion solve and projected edge constraints. All processing affects skin weights only. Coincident UV-seam vertices retain identical weights; fingertips remain attached to their actual distal bones.
- Added calibrated swing–twist joint-limit checks, finger FK, capsule/shaft collision checks, reproducible grip search, source-versus-rig render comparison and a local interactive review page. No external asset service is involved.

## Measurements

Cloud Chromium with SwiftShader, 1024×1024, the same camera/environment/materials for source and candidate. These are RGB pixel differences, **not ΔE**. No phone measurements.

| Check | H01 | H02 |
| --- | ---: | ---: |
| Original triangles retained | 1,499,726 | 1,499,746 |
| Original vertices retained | 869,627 | 895,581 |
| Finger bones receiving nonzero skin weights | 30/30 | 30/30 (legacy had 8 empty finger bones) |
| Source geometry/UV/image bytes | identical | identical |
| Maximum inverse-bind identity error | 6.59e-8 | 1.94e-7 |
| Mean bind-render RGB error, 0–255 | 0.0002810 | 0.0002038 |
| Pixels with channel difference >2 | 0.002193% | 0.001335% |
| Legacy animation frames checked at 60Hz | 566 | 650 |
| Maximum bone-length fractional change | 0 | 0 |

Machine-readable evidence: [structure](rig-audit/fullres-structure.json), [browser](rig-audit/fullres-browser/report.json), [legacy joint-limit failures](rig-audit/legacy-joint-limits.json), [grip acceptance](hand-frames/grip-acceptance.json). Render edge outliers remain visible in the browser report; mean values are not claims of pixel identity.

| Original GLB | Rig at bind pose | Legacy motion sample |
| --- | --- | --- |
| ![H01 source](rig-audit/fullres-browser/H01-source.png) | ![H01 bind](rig-audit/fullres-browser/H01-rig-bind.png) | ![H01 attack](rig-audit/fullres-browser/H01-Attack.png) |
| ![H02 source](rig-audit/fullres-browser/H02-source.png) | ![H02 bind](rig-audit/fullres-browser/H02-rig-bind.png) | ![H02 attack](rig-audit/fullres-browser/H02-Attack.png) |

## Remaining blockers

1. Legacy finger clips use rotations that violate the calibrated anatomical axes, especially the old right-hand grip. Entrance also contains excessive spine/head/foot angles; Run hyperextends knees. Retargeting preserves these defects and is not their repair. Strict `test:rig:joints` fails; the report lists joints, axes and measured ranges.
2. H01's corrected geometric grip search passes the current capsule thresholds, including 3–5 mm palm gap and opposed thumb. This remains a candidate: actual deformed-skin contact and all visual hand checks still need validation. The previous exploratory result at 14 mm palm gap was invalid and has been discarded.
3. H02's grip search still fails for the actual 33.47 mm-radius handle. A failed optimization is not proof the pose is physically impossible. No failed grip is applied to runtime; no hand/weapon scaling or relaxed threshold is used to hide it. Experimental metacarpal cupping is disabled because the current rig does not contain those deforming joints.
4. Both closed-hand skin diagnostics now pass: H01 maximum 1.9451, H02 1.5482, with the unchanged limit 2.0. This covers the diagnostic poses, not every animation or the actual grip pose. Loose sleeve deformation still needs visual correction in motion. Diagnostic hand crops deliberately cut triangles at the crop boundary; those edges are not changes to the source mesh.
5. The persistent `HeroPoseController` component is implemented and passes four tests for real mixer playback, 10-second hold, large-delta event order, repeat playback and invalid-clip rejection. It is not integrated into the lobby. New reference entrance/`IDLE_HOLD` clips, full replay/switch stress checks and a new APK are pending. The current game still has the previously audited static-model swap after entrance. This rebuild does not yet fix that runtime path.

## Reproduce

```bash
npm run assets:rig                 # Blender transfer cached by source/donor hashes
npm run test:rig:structure         # original accessor/image bytes, weights, IBM, clip integrity
node tools/rig/generate-bind-frames.mjs
npm run test:rig:browser           # source-bind images and real skin deformation in Chromium
npm run test:rig:skin              # strict; both diagnostic hand poses now pass
npm run test:rig:joints            # strict; currently fails on legacy clips
npm run test:rig:grip              # strict; currently fails on H02
npm run test:rig:contact           # strict; both source-skin/cylinder diagnostics fail
node tools/hand-frame.mjs --rigged # open/closed hand views; diagnostic, not grip acceptance
npm test
npm run verify:master
```

Review locally with `npm run dev`, then `/tools/rig-review.html?hero=H01&rigged=1&view=full` or `hero=H02`. Clip buttons use an AnimationMixer on the full-resolution skinned mesh. Omit `rigged=1` to view the unmodified source. This review path is not the game's lobby.

Validation at this checkpoint: `npm test` **143 passed**. The additional regression checks UV-seam vertices with permuted joint slots. Joint and H02 grip checks still fail as described. `verify:master` remains **BLOCKED, 0/37**, rather than being waived or relabelled as passed. No APK was rebuilt or tested on an Android device for this checkpoint.

## Hand-weight repair measurements

These compare an early candidate from this rebuild with the final staging candidate, not with the shipped APK. Both use the same original mesh and the same diagnostic closed-hand bone pose. Thresholds remain p99.9 ≤1.5 and maximum ≤2.0.

| Edge-stretch ratio | H01 before → after | H02 before → after |
| --- | --- | --- |
| p99.9 | 1.8415 → 1.4500 | 1.9328 → 1.4500 |
| Maximum | 76.6756 → 1.9451 (**passes**) | 52.4724 → 1.5482 (**passes**) |

[Before](rig-audit/skin-strain-before-diffusion.json) and [after](rig-audit/skin-strain.json) retain the measured worst edges. The latter also checks that the actual source fingertip skin follows the distal bones; it does not accept a stationary hand as a repair. [UV-seam checks](rig-audit/fullres-structure.json) report zero weight disagreement across 119,782 H01 and 145,724 H02 coincident-position pairs.

Blender automatic bone heat was attempted on H01 and rejected because it returned no usable finger weights. [Attempt record](rig-audit/blender-heat-attempt.json). The file-writing path remains the source-preserving local weight solver; the **rig itself is still staging**.

![Open and closed source hands, all four hands from three directions](hand-frames/contact-sheet.png)

Joint cross-section ratios, actual deformed-skin/weapon contact, the new entrance clips and Android hardware performance have not been accepted or measured by these component checks.

## Follow-up: seam-safe fitting and source-weapon diagnostics

The fitter now canonicalizes joint slots at coincident UV-seam vertices before caching per-joint transformations. A regression exercises equivalent weights stored in different slot orders. H01 uses 6,000 offline fitting iterations instead of 500, preserving the source mesh and textures. This increases asset-processing time, not runtime work. The previous checkpoint's independent measurements are retained in [skin-strain-before-seam-fit.json](rig-audit/skin-strain-before-seam-fit.json); the maximum closed-hand ratio decreased from 2.9154 to 1.9451.

Grip search now includes the original anatomical extension bounds (MCP −30°, PIP/DIP −5°) and distinguishes the measured contact-surface normal from the finger bind-frame normal. These are different frames; changing contact direction must not silently rotate the finger bind axes. Shaft directions are projected onto the contact plane, with the original angular/contact thresholds enforced.

`node tools/rig/preview-grips.mjs` renders the actual full-resolution skinned hand with the original weapon in three diagnostic views. The rest of the body is cropped only in this review to avoid inward-facing hand cameras being obscured by the torso. It compares rendered fingertip FK with the solver and measures deformed source-skin vertices against the measured shaft cylinder. That cylinder excludes weapon ornaments; this is an additional rejection check, not a complete mesh/mesh contact acceptance. Failed grip candidates are labelled **REJECTED CONTACT** and never installed into the game.

The rendered FK matches the solver to within 8.22e-8 m for H01 and 6.68e-8 m for H02. However, the actual deformed hand-region mesh intrudes into the measured shaft cylinder by **11.356 mm / 13.024 mm**, respectively; both fail the unchanged **3 mm** limit. This region includes cuffs: H01's worst vertex is on the gold cuff (source albedo RGB 144/106/41), rather than finger skin. H01's geometric capsule pass is therefore insufficient to accept the complete grip placement. `test:rig:contact` fails for these results; the staging manifest records this independently of the open/closed-hand strain pass. Evidence: [grip-runtime-diagnostic.json](hand-frames/grip-runtime-diagnostic.json).

An offline coupled solve also re-evaluated the actual skinned contact triangle after each finger solve, rather than treating the rest-pose palm point as stationary. Ten iterations converged the palm gap but did not fix the other contact constraints; **neither result is applied**. The full [iteration report](hand-frames/grip-contact-refinement.json) is retained to avoid repeating this failed approach unchanged. Remaining work is skin weighting/contact correction and new reference clips, followed by runtime integration and Android testing. No new APK is produced from these rejected poses.

The search also retained all **34 H01 geometric passes** and checked each against the deformed source hand/cuff region. The best coarse alternative still had 7.172 mm intrusion and 7.060 mm actual palm gap, exceeding the 3 mm / 3–5 mm limits. Continuous refinement evaluated 125 H01 parameter sets and 31 H02 sets. Its best H01 compromise reduced intrusion to 4.984 mm but left a 7.216 mm palm gap and failed geometric conditions; **it is rejected**, as is H02. These are failed exploratory poses, not improvements applied to the game. The worst-point records include source vertex IDs, source/posed coordinates, joint weights and source albedo samples, distinguishing cuff interference from finger-skin errors. See [candidate checks](hand-frames/H01-grip-contact-refinement.json).

An additional bone-heat attempt used sealed, 1.2 mm voxel proxies derived from the source hand crop, rather than the full body. Both normal numerical scale and a temporary 100× calculation scale failed with all 15 right-finger groups empty. No accepted weights or replacement model were exported. This is an algorithmic failure, not a missing Blender installation. [Attempt record](rig-audit/voxel-heat-attempt.json) and [Blender log](rig-audit/H01-voxel-heat-attempt.log). The temporary proxy is never a game asset.
