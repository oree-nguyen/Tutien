
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                                                            |
| ---                | ---                                                              |
| version            | 2.0                                                              |
| generator          | glTF-Transform v4.5.1                                            |
| extensionsUsed     | EXT_meshopt_compression, EXT_texture_webp, KHR_mesh_quantization |
| extensionsRequired | EXT_meshopt_compression, EXT_texture_webp, KHR_mesh_quantization |



 SCENES
 ────────────────────────────────────────────
| #   | name  | rootName | bboxMin                | bboxMax             | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---      | ---                    | ---                 | ---                | ---               | ---                    |
| 0   | Scene | H01Rig   | -0.68966, -1, -0.22279 | 0.68966, 1, 0.22279 | 180,000            | 45,257            | 45,257                 |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher,
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                                                                              | instances | size¹   |
| --- | ---        | ---       | ---            | ---          | ---      | ---     | ---                                                                                     | ---       | ---     |
| 0   | node_0.001 | TRIANGLES | 1              | 60,000       | 45,257   | u16     | JOINTS_0:u8, NORMAL:i16_norm, POSITION:i16_norm, TEXCOORD_0:u16_norm, WEIGHTS_0:u8_norm | 1         | 1.45 MB |

⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are
  shared by other mesh primitives, but the meshes themselves are not reused, then
  the sum of all mesh sizes will overestimate the asset's total size. See "dedup".



 MATERIALS
 ────────────────────────────────────────────
| #   | name            | instances | textures                                                  | alphaMode | doubleSided |
| --- | ---             | ---       | ---                                                       | ---       | ---         |
| 0   | HunyuanBakedPBR | 1         | baseColorTexture, normalTexture, metallicRoughnessTexture | OPAQUE    | ✓           |



 TEXTURES
 ────────────────────────────────────────────
| #   | name                         | uri | slots                    | instances | mimeType   | compression | resolution | size      | gpuSize⁵ |
| --- | ---                          | --- | ---                      | ---       | ---        | ---         | ---        | ---       | ---      |
| 0   | high_normal                  |     | normalTexture            | 1         | image/webp |             | 1024x1024  | 130.38 KB | 5.59 MB  |
| 1   | high_albedo                  |     | baseColorTexture         | 1         | image/webp |             | 2048x2048  | 342.01 KB | 22.37 MB |
| 2   | high_metallic-high_roughness |     | metallicRoughnessTexture | 1         | image/webp |             | 1024x1024  | 184.71 KB | 5.59 MB  |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
| #   | name     | channels | samplers | duration | keyframes | size    |
| --- | ---      | ---      | ---      | ---      | ---       | ---     |
| 0   | Attack   | 156      | 156      | 1        | 480       | 6.48 KB |
| 1   | Cast     | 156      | 156      | 1        | 508       | 7.02 KB |
| 2   | Dash     | 156      | 156      | 1        | 430       | 5.62 KB |
| 3   | Entrance | 156      | 156      | 4        | 729       | 9.56 KB |
| 4   | Idle     | 156      | 156      | 2        | 345       | 4.01 KB |
| 5   | Run      | 156      | 156      | 1        | 588       | 8.34 KB |
