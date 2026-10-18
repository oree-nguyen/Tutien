# Tencent Hunyuan source fidelity in the lobby

The lobby preview for H01 Lâm Dật and H02 Hàn Trạch now loads the Tencent Hunyuan GLB exports directly. The existing rigged GLBs remain the playable representation for combat and the intro animation. Once the intro finishes, the detailed source meshes and source weapons are shown; replaying the intro switches back to the animated rig.

| Asset | Source share | Source / delivered triangles | Texture maps |
| --- | --- | ---: | --- |
| H01 body | `a93d658b-a40d-4854-b755-ad1fa9bcc79b` | 1,499,726 | 4096×4096 |
| H01 staff | `4fe3…` (recorded in `public/models/hunyuan-original/provenance.json`) | 619,640 | 4096×4096 |
| H02 body | `cd050512-738f-449f-95d3-7c11a9c06851` | 1,499,746 | 4096×4096 |
| H02 hammer | `45b118bc-58ce-4000-94c6-8e09945aa9f1` | 1,500,000 | 4096×4096 |

Source textures are embedded in the GLBs; decoded image pixels were verified identical before and after Blender scene normalization. Mesh UV coordinates retain the source mapping. Asset byte hashes and sizes are in `public/models/hunyuan-original/provenance.json`.

The lobby renderer uses native device pixel ratio. Battle rendering retains the existing quality-tier pixel-ratio cap. This preserves the close-up lobby presentation without increasing the full-match renderer budget.

`npm run test:hunyuan-preview` loads both source bodies and weapons in Cloud Chromium / SwiftShader at DPR 2.75 and verifies visibility, source triangle counts, 4096² textures, and the H02 hammer placement. This is a cloud browser check; it is not a physical Android GPU/FPS test. The original source meshes are intentionally high-poly and may be expensive on lower-end mobile GPUs.
