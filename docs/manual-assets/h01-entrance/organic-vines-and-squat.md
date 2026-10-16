# H01: deep squat and organic vine revision

The entrance keeps the 4.20-second sequence: vines appear before the character, the front opens, the character rises from below the platform in a squat, vines converge into the supplied Hunyuan staff, the right hand grabs at 3.05 seconds, and the actual staff base strikes the platform at 3.55 seconds.

The previous 94-degree Spine bend folded the character over. The revised clip lowers the pelvis, opens both knees, turns the feet outward 20 degrees, and uses a 55-degree Spine bend with 12 degrees of pelvic pitch. The head lifts independently. Ground IK places the left palm at `(0, 0.025, 0.22)` between the feet, and the right elbow pole follows the lowered hip-hand target rather than remaining at standing shoulder height. The right palm stays at the belt before the reaching phase. The deep pose uses the supplied rig's pelvis height of 0.16 m; this is a deliberate calibration from the earlier approximate 0.48 m target, to reach the ground without stretching the short arm chain or folding the spine horizontally. This is not a new human mesh or cloth simulation.

Vines are now actual Blender-authored, smooth-shaded tubular meshes with irregular curvature, varying cross-sections, knots, taper and BarkUV. They replace the zero-position shader-generated helix. Opening uses a stable side per stem so the geometry cannot tear across the centerline. Faces point outward. The opaque MeshStandardMaterial receives lighting and uses deterministic 1024-square albedo, tangent normal and roughness images generated locally; these are procedural bark maps, not photographs or Tencent-generated materials. Growth and convergence are still GPU animated. These vines are environmental VFX, not primitive replacements for the supplied character or staff.

`assets/source/h01-organic-vines-high.blend` contains the editable **1,000,000-triangle** main vine source, UVs, smooth shading and a procedural bark material. It also contains the separate 32,000-triangle ground-root mesh. The Android scene uses **32,000 triangles for the main cluster** and another 32,000 only for impact roots. The high source is not loaded by the game. The runtime mesh is a lower-resolution resampling of the same authoring function, not a lossless reduction or a baked million-face normal map. Existing body and staff UVs and texture images remain unchanged.

Regenerate mobile geometry:

```sh
blender -b --python tools/manual-assets/build_h01_vines.py
```

Regenerate the high source (saved locally outside runtime):

```sh
blender -b --python tools/manual-assets/build_h01_vines.py -- --high-poly
```

Regenerate the revised humanoid clips from the existing normalized static Hunyuan backups:

```sh
blender -b --python tools/manual-assets/rig_h01.py
node tools/manual-assets/optimize_h01.mjs --body-only
```

Checks cover left palm contact, open feet, torso orientation, actual finger deformation and staff grip, vine volume/UVs/normal orientation/triangle budgets, timed attachment/impact, browser full/profile/face views, IndexedDB reuse and offline loading. Cloud Chromium screenshots do not establish Android frame rate or replace the user's visual approval.
