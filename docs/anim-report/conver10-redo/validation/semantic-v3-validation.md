# Independent H01 semantic garment v3 validation

The exact candidate `.local/rig-candidates/semantic-garment-v3/H01-C0-rigged.glb` has SHA-256 `1acec73328f0fdc9b235f3d3279047a58484ac7eddffdde87e3bf7fef50288ad`. Bind passes these checks; midpoint and held fail edge stretch. The candidate remains rejected for activation.

All three reports independently cover all six exported primitives and all **1,499,726** source triangles exactly once. Provenance and source-copy continuity pass in each pose: **146,909** measured pairs, **0 mm** maximum opening, unchanged **0.001 mm** tolerance. No newly collapsed or nonfinite geometry is reported. Source degeneracy remains a separate diagnostic in the full reports.

| Source region | Midpoint p99.9 / maximum | Held p99.9 / maximum |
| --- | ---: | ---: |
| Remaining source | 1.249327 / 1.456973 | 1.449993 / 1.637807 |
| Left robe | 1.534779 / 3.154794 | 2.416900 / 5.268533 |
| Right robe | 3.554965 / 7.872702 | 5.739505 / 13.359179 |
| Robe torso | 2.456587 / 12.802211 | 4.303144 / 23.635694 |
| Left sleeve | 1.224852 / 1.517475 | 1.475040 / 2.562829 |
| Right sleeve | 2.741093 / 4.239655 | 4.188427 / 6.776514 |

The acceptance limits remain **p99.9 ≤ 1.5** and **maximum ≤ 2.0**. Midpoint rejects four regions; held rejects five. Each posed report applies **52 rotations**, with zero translation channels. The midpoint is an existing diagnostic interpolation from bind to the height22 target, not evidence for the requested full entrance sequence.

Inputs and full reports:

- [Bind](semantic-v3-bind.json): no pose input.
- [Midpoint](semantic-v3-midpoint.json): [persisted exact pose](semantic-midpoint-pose.json), SHA-256 `211ae8de760ebf14b50425782bf51f1fb123e4271edda75206a359b6fde40b24`.
- [Held](semantic-v3-held.json): `docs/anim-report/harmonic-held/H01-reference-idle-solve.json`, SHA-256 `f546c092e1bb660fa0dd3d796618980de143cadaa4980a254d00103d65d1feb5`.
- [Machine summary](semantic-v3-summary.json) records report hashes and exact values.

Reproduction, changing `REFERENCE_POSE` and output path for the three inputs above:

```bash
RIG_FILE=.local/rig-candidates/semantic-garment-v3/H01-C0-rigged.glb \
REFERENCE_POSE=docs/anim-report/conver10-redo/validation/semantic-midpoint-pose.json \
RIG_REPORT_FILE=/tmp/semantic-v3-midpoint.json \
node tools/rig/validate-all-meshes.mjs
```

Midpoint and held exit 1; bind exits 0. Set `REFERENCE_POSE=` for bind.

The validator also fixes an independent diagnostic bug: upstream `passed: false` previously skipped rotations while still applying a Hips translation. A pose may now explicitly declare `poseDataValid: true` to request measurements despite upstream rejection. All supported channels must validate before any are applied; the upstream failure and its declared reasons remain in `poseValidation`, and overall `passed` stays false even when every mesh diagnostic passes. Unknown targets, invalid quaternions/translations and scales remain rejected.

`node --test tests/rig-all-meshes.test.js tests/rig-hand-strain.test.js` passes **42 tests**, zero failures/skips, including rotation/translation application, preservation of upstream rejection, declaration requirement and invalid diagnostic channel cases. This does not certify full animation, semantic segmentation, garment/body collision, volume, cross-sections, weapon contact or Android behavior. No image was opened or captured for this validation.
