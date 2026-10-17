
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                            |
| ---                | ---                              |
| version            | 2.0                              |
| generator          | Khronos glTF Blender I/O v4.0.43 |
| extensionsUsed     | KHR_materials_specular           |
| extensionsRequired | none                             |



 SCENES
 ────────────────────────────────────────────
| #   | name    | rootName | bboxMin              | bboxMax                   | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---     | ---      | ---                  | ---                       | ---                | ---               | ---                    |
| 0   | convert | node_0   | -0.05713, 0, -0.0396 | 0.05273, 1.19751, 0.04066 | 1,858,920          | 356,093           | 356,093                |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher,
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name   | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                               | instances | size¹    |
| --- | ---    | ---       | ---            | ---          | ---      | ---     | ---                                      | ---       | ---      |
| 0   | node_0 | TRIANGLES | 1              | 619,640      | 356,093  | u32     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 18.83 MB |

⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are
  shared by other mesh primitives, but the meshes themselves are not reused, then
  the sum of all mesh sizes will overestimate the asset's total size. See "dedup".



 MATERIALS
 ────────────────────────────────────────────
| #   | name         | instances | textures                                                  | alphaMode | doubleSided |
| --- | ---          | ---       | ---                                                       | ---       | ---         |
| 0   | Material.001 | 1         | baseColorTexture, normalTexture, metallicRoughnessTexture | OPAQUE    | ✓           |



 TEXTURES
 ────────────────────────────────────────────
| #   | name                                                         | uri | slots                    | instances | mimeType  | compression | resolution | size     | gpuSize⁵ |
| --- | ---                                                          | --- | ---                      | ---       | ---       | ---         | ---        | ---      | ---      |
| 0   | texture_pbr_20250901_normal                                  |     | normalTexture            | 1         | image/png |             | 4096x4096  | 8.37 MB  | 89.48 MB |
| 1   | texture_pbr_20250901                                         |     | baseColorTexture         | 1         | image/png |             | 4096x4096  | 17.54 MB | 89.48 MB |
| 2   | texture_pbr_20250901_metallic-texture_pbr_20250901_roughness |     | metallicRoughnessTexture | 1         | image/png |             | 4096x4096  | 5.66 MB  | 89.48 MB |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.
