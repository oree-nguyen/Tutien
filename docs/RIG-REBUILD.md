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
| Mean bind-render RGB error, 0–255 | 0.0002813 | 0.0002038 |
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
4. H01 still fails the maximum edge-stretch gate in the closed-hand diagnostic (2.9154 versus the limit 2.0); H02 passes that diagnostic (1.5482). Loose sleeve deformation still needs visual correction in motion. Diagnostic hand crops deliberately cut triangles at the crop boundary; those edges are not changes to the source mesh.
5. The persistent `HeroPoseController` component is implemented and passes four tests for real mixer playback, 10-second hold, large-delta event order, repeat playback and invalid-clip rejection. It is not integrated into the lobby. New reference entrance/`IDLE_HOLD` clips, full replay/switch stress checks and a new APK are pending. The current game still has the previously audited static-model swap after entrance. This rebuild does not yet fix that runtime path.

## Reproduce

```bash
npm run assets:rig                 # Blender transfer cached by source/donor hashes
npm run test:rig:structure         # original accessor/image bytes, weights, IBM, clip integrity
node tools/rig/generate-bind-frames.mjs
npm run test:rig:browser           # source-bind images and real skin deformation in Chromium
npm run test:rig:skin              # strict; currently fails on the H01 closed-hand maximum
npm run test:rig:joints            # strict; currently fails on legacy clips
npm run test:rig:grip              # strict; currently fails on H02
node tools/hand-frame.mjs --rigged # open/closed hand views; diagnostic, not grip acceptance
npm test
npm run verify:master
```

Review locally with `npm run dev`, then `/tools/rig-review.html?hero=H01&rigged=1&view=full` or `hero=H02`. Clip buttons use an AnimationMixer on the full-resolution skinned mesh. Omit `rigged=1` to view the unmodified source. This review path is not the game's lobby.

Validation at this checkpoint: `npm test` **142 passed**; thirteen new rig/controller unit tests are included. Structural/browser checks pass. Joint, H01 skin and H02 grip checks fail as described. `verify:master` remains **BLOCKED, 0/37**, rather than being waived or relabelled as passed. No APK was rebuilt or tested on an Android device for this checkpoint.

## Hand-weight repair measurements

These compare an early candidate from this rebuild with the final staging candidate, not with the shipped APK. Both use the same original mesh and the same diagnostic closed-hand bone pose. Thresholds remain p99.9 ≤1.5 and maximum ≤2.0.

| Edge-stretch ratio | H01 before → after | H02 before → after |
| --- | --- | --- |
| p99.9 | 1.8415 → 1.4511 | 1.9328 → 1.4500 |
| Maximum | 76.6756 → 2.9154 (**fails**) | 52.4724 → 1.5482 (**passes**) |

[Before](rig-audit/skin-strain-before-diffusion.json) and [after](rig-audit/skin-strain.json) retain the measured worst edges. The latter also checks that the actual source fingertip skin follows the distal bones; it does not accept a stationary hand as a repair. [UV-seam checks](rig-audit/fullres-structure.json) report zero weight disagreement across 119,782 H01 and 145,724 H02 coincident-position pairs.

Blender automatic bone heat was attempted on H01 and rejected because it returned no usable finger weights. [Attempt record](rig-audit/blender-heat-attempt.json). The file-writing path remains the source-preserving local weight solver; the **rig itself is still staging**.

![Open and closed source hands, all four hands from three directions](hand-frames/contact-sheet.png)

Joint cross-section ratios, actual deformed-skin/weapon contact, the new entrance clips and Android hardware performance have not been accepted or measured by these component checks.
