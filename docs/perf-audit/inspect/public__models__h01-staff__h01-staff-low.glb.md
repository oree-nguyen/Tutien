
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
| #   | name  | rootName   | bboxMin                      | bboxMax                   | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---        | ---                          | ---                       | ---                | ---               | ---                    |
| 0   | Scene | Staff_Root | -0.07219, -1.26344, -0.03996 | 0.05085, 0.77688, 0.04971 | 2,385              | 1,125             | 1,125                  |

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
| 0   | node_0.001 | TRIANGLES | 1              | 795          | 1,125    | u16     | NORMAL:i16_norm, POSITION:i16_norm, TEXCOORD_0:u16_norm | 1         | 22.77 KB |

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
| #   | name                       | uri | slots                    | instances | mimeType   | compression | resolution | size     | gpuSize⁵  |
| --- | ---                        | --- | ---                      | ---       | ---        | ---         | ---        | ---      | ---       |
| 0   | low_normal                 |     | normalTexture            | 1         | image/webp |             | 256x256    | 21.65 KB | 349.52 KB |
| 1   | low_albedo                 |     | baseColorTexture         | 1         | image/webp |             | 256x256    | 24.87 KB | 349.52 KB |
| 2   | low_metallic-low_roughness |     | metallicRoughnessTexture | 1         | image/webp |             | 256x256    | 4.61 KB  | 349.52 KB |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.
