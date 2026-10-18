
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                                                                                |
| ---                | ---                                                                                  |
| version            | 2.0                                                                                  |
| generator          | glTF-Transform v4.5.1                                                                |
| extensionsUsed     | EXT_meshopt_compression, EXT_texture_webp, KHR_mesh_quantization, KHR_texture_basisu |
| extensionsRequired | EXT_meshopt_compression, EXT_texture_webp, KHR_mesh_quantization, KHR_texture_basisu |



 SCENES
 ────────────────────────────────────────────
| #   | name  | rootName   | bboxMin                      | bboxMax                  | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---        | ---                          | ---                      | ---                | ---               | ---                    |
| 0   | Scene | Staff_Root | -0.07211, -1.26385, -0.04052 | 0.05011, 0.7753, 0.04884 | 12,000             | 4,636             | 4,636                  |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher,
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                                              | instances | size¹    |
| --- | ---        | ---       | ---            | ---          | ---      | ---     | ---                                                     | ---       | ---      |
| 0   | node_0.001 | TRIANGLES | 1              | 4,000        | 4,636    | u16     | NORMAL:i16_norm, POSITION:i16_norm, TEXCOORD_0:u16_norm | 1         | 98.18 KB |

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
| #   | name                             | uri | slots                    | instances | mimeType   | compression | resolution | size      | gpuSize⁵  |
| --- | ---                              | --- | ---                      | ---       | ---        | ---         | ---        | ---       | ---       |
| 0   | medium_normal                    |     | normalTexture            | 1         | image/ktx2 | UASTC       | 512x512    | 283.88 KB | 349.55 KB |
| 1   | medium_albedo                    |     | baseColorTexture         | 1         | image/ktx2 | UASTC       | 512x512    | 296.75 KB | 349.55 KB |
| 2   | medium_metallic-medium_roughness |     | metallicRoughnessTexture | 1         | image/ktx2 | UASTC       | 512x512    | 176.79 KB | 349.55 KB |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.
