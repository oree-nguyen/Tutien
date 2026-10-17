
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                            |
| ---                | ---                              |
| version            | 2.0                              |
| generator          | Khronos glTF Blender I/O v4.3.47 |
| extensionsUsed     | none                             |
| extensionsRequired | none                             |



 SCENES
 ────────────────────────────────────────────
| #   | name  | rootName | bboxMin                      | bboxMax                   | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---      | ---                          | ---                       | ---                | ---               | ---                    |
| 0   | Scene | world    | -0.49582, -0.99846, -0.22268 | 0.45987, 0.95908, 0.17179 | 819,462            | 154,920           | 154,920                |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher,
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                               | instances | size¹   |
| --- | ---        | ---       | ---            | ---          | ---      | ---     | ---                                      | ---       | ---     |
| 0   | geometry_0 | TRIANGLES | 1              | 273,154      | 154,920  | u32     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 8.24 MB |

⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are
  shared by other mesh primitives, but the meshes themselves are not reused, then
  the sum of all mesh sizes will overestimate the asset's total size. See "dedup".



 MATERIALS
 ────────────────────────────────────────────
| #   | name                         | instances | textures         | alphaMode | doubleSided |
| --- | ---                          | ---       | ---              | ---       | ---         |
| 0   | ConceptProjection_geometry_0 | 1         | baseColorTexture | OPAQUE    | ✓           |



 TEXTURES
 ────────────────────────────────────────────
| #   | name                       | uri | slots            | instances | mimeType  | compression | resolution | size    | gpuSize⁵ |
| --- | ---                        | --- | ---              | ---       | ---       | ---         | ---        | ---     | ---      |
| 0   | ProjectedAlbedo_geometry_0 |     | baseColorTexture | 1         | image/png |             | 2048x2048  | 1.35 MB | 22.37 MB |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.
