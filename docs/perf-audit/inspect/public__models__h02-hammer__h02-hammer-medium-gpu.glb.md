
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
| #   | name  | rootName    | bboxMin                      | bboxMax                  | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---         | ---                          | ---                      | ---                | ---               | ---                    |
| 0   | Scene | Hammer_Root | -0.34875, -1.14991, -0.34372 | 0.3488, 0.74957, 0.34385 | 9,000              | 3,741             | 3,741                  |

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
| 0   | node_0.001 | TRIANGLES | 1              | 3,000        | 3,741    | u16     | NORMAL:i16_norm, POSITION:i16_norm, TEXCOORD_0:u16_norm | 1         | 77.86 KB |

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
| #   | name                         | uri | slots                    | instances | mimeType   | compression | resolution | size      | gpuSize⁵  |
| --- | ---                          | --- | ---                      | ---       | ---        | ---         | ---        | ---       | ---       |
| 0   | high_normal                  |     | normalTexture            | 1         | image/ktx2 | UASTC       | 512x512    | 257.68 KB | 349.55 KB |
| 1   | high_albedo                  |     | baseColorTexture         | 1         | image/ktx2 | UASTC       | 512x512    | 272.89 KB | 349.55 KB |
| 2   | high_metallic-high_roughness |     | metallicRoughnessTexture | 1         | image/ktx2 | UASTC       | 512x512    | 249.21 KB | 349.55 KB |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.
