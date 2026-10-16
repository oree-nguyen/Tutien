# Lâm Dật — Mộc Tinh Trượng và hiệu ứng riêng

## Model động hiện có

H01-C0 hiện có 52 xương, skin ngón tay và sáu clip Idle/Run/Attack/Cast/Dash/Entrance. Mộc Tinh Trượng từ share mới đã tích hợp với socket/IK và chuỗi xuất hiện 4,2 giây. Xem [hướng dẫn bản cập nhật](../docs/H01-STAFF-ENTRANCE.md). Chưa có cloth simulation hoặc sáu mesh giải phẫu riêng.

## Hiệu ứng riêng đã chạy trong engine

| Chiêu | Hình ảnh runtime | Thông số gốc |
| --- | --- | --- |
| Q — Đằng Tiên | Dải đằng Mộc theo hướng tung chiêu | Tầm 7 m trước modifier nhánh |
| W — Mộc Phược | Vòng dây đằng xoắn nhô lên | Tầm 6 m, bán kính 1,8 m |
| E — Sinh Trưởng | Cánh sen/rễ Mộc sát đất, tồn tại theo zone | Tầm 5 m, bán kính 3,2 m, 4 giây |
| R — Vạn Đằng Ngục | Các dải đằng dựng thành lồng hở | Tầm 7 m, bán kính 4 m |
| F — Linh Bộ | Vệt lá/dây lụa Mộc dọc quãng lướt | 2,8 m; miễn thương 0,25 giây; CD 8 giây |

Shader riêng tạo chuyển động/phát sáng/fade; không cần model web để chạy. Hitbox, sát thương, CC và modifier nhánh vẫn do simulation quyết định. Hoạt ảnh Cast hiện dùng chung cho Q/W/E/R; hình ảnh shader của từng chiêu khác nhau.

## Cách tạo trên web Hunyuan

Mỗi prompt dưới đây là một lượt tạo riêng. Xuất GLB có texture nhúng, đặt đúng tên vào assets/base_models/. Trượng Hunyuan mới đã tích hợp từ share của người dùng; các carrier GLB của chiêu chưa được tạo, game dùng shader runtime riêng. Những prompt dưới đây còn dùng khi tạo lại hoặc nâng chất lượng asset. Tạo xong cần kiểm tra UV, scale, pivot, silhouette và tích hợp mới được thay thế. GLB tĩnh không chứa sẵn gameplay hoặc hiệu ứng hạt động.

## Mộc Tinh Trượng — nguyên bản

File: `assets/base_models/H01-W0_moc_tinh_truong_nguyen_ban.glb`

```text
One complete 2.0384 meter living-wood staff: three twisting wood strands form a strong continuous shaft, fine bark grain, carved gold joints, a twelve-petal jade lotus crown and one luminous green crystal. Preserve a straight graspable lower handle and a narrow dragon-vine silhouette. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

Sau import: chiều dài 2,0384 m; grip ở 62% tính từ đế, gắn tay phải; giữ vũ khí tách rời cơ thể. Phần phát sáng cần material emissive và animation của engine.

## Lâm Dật — Q: Đằng Tiên

File: `assets/base_models/VFX-H01-Q_dang_tien.glb`

```text
Create a tapered coiling thornless living-vine lash with small jade leaves and gold sap grooves, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

## Lâm Dật — W: Mộc Phược

File: `assets/base_models/VFX-H01-W_moc_phuoc.glb`

```text
Create a low open ring of interwoven living roots with distinct upward binding tendrils, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

## Lâm Dật — E: Sinh Trưởng

File: `assets/base_models/VFX-H01-E_sinh_truong.glb`

```text
Create a low lotus-and-root growth cluster with open central ground area, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

## Lâm Dật — R: Vạn Đằng Ngục

File: `assets/base_models/VFX-H01-R_van_dang_nguc.glb`

```text
Create an open radial cage of tall interlaced vines, clear center and separated curling vine walls, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

## Lâm Dật — F: Linh Bộ

File: `assets/base_models/VFX-H01-F_linh_bo.glb`

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

## Negative prompt dùng chung

```text
No person or hands, no human body, no fused weapon and character, no display stand, no text, watermark or UI, no opaque smoke, no baked motion trails, no baked directional shadows, no cropped tips, no extra unrelated objects.
```
