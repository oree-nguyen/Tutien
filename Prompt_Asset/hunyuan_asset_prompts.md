# Hồn Giới — Hunyuan Web Asset Sheet

Quy trình tạo thủ công trên web Hunyuan, không dùng MCP/API/GPU cloud. **227 brief**, gồm 167 mục inventory hiện có và 60 brief vật mang hiệu ứng Q/W/E/R/F. Đây là danh sách công việc, không phải các model đã tạo. Mỗi mục có prompt tiếng Anh tự đủ để copy riêng, không cần ghép một “prompt chung” bị thiếu.

## Cách dùng

1. Tạo concept hoặc nhập prompt trên web Hunyuan. Nhân vật phải đủ toàn thân A-pose, tay trống; tạo vũ khí ở lượt riêng. Nếu web có giới hạn độ dài, giữ mô tả riêng ở đầu prompt và bỏ bớt câu chung ở cuối.
2. Kiểm tra các góc trước/sau/hai bên, ngón tay, chân, UV và texture thật. PBR/rig/animation/mesh phân đoạn là mục tiêu kiểm tra, không được bảo đảm chỉ bằng câu prompt. Không duyệt ảnh nhân vật đang khoanh tay hoặc model bị dính vũ khí vào tay.
3. Xuất GLB có ảnh texture nhúng, đặt **đúng tên file** ghi ở từng mục và chép vào `assets/base_models/`. Không chép lên model game đang chạy trước khi kiểm định.
4. Chạy `python Prompt_Asset/inspect_base_models.py` để nhận diện theo manifest, kiểm tra GLB/UV/ảnh và báo những mục chưa nạp. Script không gọi mạng hoặc MCP và không đoán giải phẫu. Xem `Prompt_Asset/README.md` để chuẩn bị cắt mesh bằng Blender.

## Quy ước

- `Hxx-C0`: nhân vật gốc, `C1–C3`: ba trang phục; cùng khuôn mặt và tỷ lệ. Giữ base mesh/rig nếu silhouette tương thích; trang phục khác silhouette cần model riêng.
- `Hxx-W0`: vũ khí gốc; `W1`: skin Cơ bản; `W2`: VIP. Ranked vẫn chuẩn hóa theo gameplay, prompt không tăng sức mạnh/hitbox.
- `HB-01…07`: sáu trang bị Hồn Cốt và Bát Chu Mâu rời; `HR-01…12`: vòng Hoàn. Đây không phải tám mesh giải phẫu của cơ thể.
- `VFX-Hxx-Q/W/E/R/F`: carrier nghệ thuật cho kỹ năng hiện có. Độ sáng, fade, hạt, lướt, animation, tầm/CC/hitbox vẫn do engine, không phải GLB tĩnh. Nhiều carrier có thể tái sử dụng.
- Kích thước tính theo mét sau căn chỉnh Blender; hướng trước +Z, trục lên +Y trong game/glTF. Không giả định model web tự đúng trục/scale.

## 12 Hồn Sư và vũ khí gốc

| ID | Nhân vật | Võ Hồn | Hồn khí renderer |
| --- | --- | --- | --- |
| H01 | Lâm Dật | Thanh Mạch Đằng | Mộc Tinh Trượng |
| H02 | Hàn Trạch | Chấn Sơn Chùy | Chấn Nhạc Chùy |
| H03 | Ly Sa | Phong Ảnh Hồ | Song Ảnh Nhận |
| H04 | Kỳ Vân | Lôi Vũ Điểu | Lôi Vũ Phiến |
| H05 | Tịch Dao | Linh Kính | Nguyệt Linh Kính |
| H06 | Đỗ Kình | Huyền Giáp Quy | Huyền Quy Thuẫn |
| H07 | Vân Chước | Xích Diệm Liên | Diệm Liên Luân |
| H08 | Sở Băng Nghi | Sương Linh Điệp | Pháp Trượng Băng Điệp |
| H09 | Mặc Tinh | Ảnh Nguyệt Cung | Huyền Nguyệt Cung |
| H10 | Thiên Lạc | Kim Giáp Hổ | Kim Hổ Trảo |
| H11 | Ninh Từ | Ngọc Đàn Cầm | Thanh Ngọc Cầm |
| H12 | Tạ Uyên | Hư Không Xà | Hư Ảnh Xà Trượng |

H06 là **Đỗ Kình**, H11 là **Ninh Từ** theo mã nguồn; không đổi theo tên viết tắt. H08: bảng WEAPONS gọi “Băng Điệp Trâm”, renderer dùng “Pháp Trượng Băng Điệp”; tài liệu lấy renderer làm brief hình học và giữ ID H08.

## Mục lục nhóm

- [hero (48)](#hero)
- [weapon (36)](#weapon)
- [soul-ring (12)](#soul-ring)
- [bone (6)](#bone)
- [external-bone (1)](#external-bone)
- [beast (4)](#beast)
- [mutant-beast (4)](#mutant-beast)
- [boss (3)](#boss)
- [environment-prop (29)](#environment-prop)
- [terrain (7)](#terrain)
- [world-prop (2)](#world-prop)
- [effect-carrier (12)](#effect-carrier)
- [shader-surface (3)](#shader-surface)
- [skill-vfx-prop (60)](#skill-vfx-prop)

<a id="hero"></a>

## hero

### H01-C0 — Lâm Dật — Thanh Mộc Y

- **Tên file:** `H01-C0_lam_dat_thanh_moc_y.glb`
- **Nơi đặt:** `assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Lâm Dật, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male scholarly cultivator; long dark hair tied in a neat topknot, calm refined face, green and ivory crossover silk robe, embroidered spirit vines and lotus petals, warm gold hems, jade belt ornaments. Separate readable wrists, elbows and ankles; green jade talismans remain small integrated belt ornaments, not weapons. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #065f46, inner #ecfdf5, trim #d4af37, hair #132f27. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H01-C1 — Lâm Dật — Lữ Khách Sơn Lâm

- **Tên file:** `H01-C1_lam_dat_lu_khach_son_lam.glb`
- **Nơi đặt:** `assets/base_models/H01-C1_lam_dat_lu_khach_son_lam.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Lâm Dật, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male scholarly cultivator; long dark hair tied in a neat topknot, calm refined face, green and ivory crossover silk robe, embroidered spirit vines and lotus petals, warm gold hems, jade belt ornaments. Separate readable wrists, elbows and ankles; green jade talismans remain small integrated belt ornaments, not weapons. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #065f46, inner #ecfdf5, trim #d4af37, hair #132f27. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H01-C2 — Lâm Dật — Mộc Linh Tôn Giả

- **Tên file:** `H01-C2_lam_dat_moc_linh_ton_gia.glb`
- **Nơi đặt:** `assets/base_models/H01-C2_lam_dat_moc_linh_ton_gia.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Lâm Dật, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male scholarly cultivator; long dark hair tied in a neat topknot, calm refined face, green and ivory crossover silk robe, embroidered spirit vines and lotus petals, warm gold hems, jade belt ornaments. Separate readable wrists, elbows and ankles; green jade talismans remain small integrated belt ornaments, not weapons. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #065f46, inner #ecfdf5, trim #d4af37, hair #132f27. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H01-C3 — Lâm Dật — Xuân Mộc Khai Hoa

- **Tên file:** `H01-C3_lam_dat_xuan_moc_khai_hoa.glb`
- **Nơi đặt:** `assets/base_models/H01-C3_lam_dat_xuan_moc_khai_hoa.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Lâm Dật, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male scholarly cultivator; long dark hair tied in a neat topknot, calm refined face, green and ivory crossover silk robe, embroidered spirit vines and lotus petals, warm gold hems, jade belt ornaments. Separate readable wrists, elbows and ankles; green jade talismans remain small integrated belt ornaments, not weapons. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #065f46, inner #ecfdf5, trim #d4af37, hair #132f27. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-C0 — Hàn Trạch — Sơn Thiết Giáp

- **Tên file:** `H02-C0_han_trach_son_thiet_giap.glb`
- **Nơi đặt:** `assets/base_models/H02-C0_han_trach_son_thiet_giap.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Hàn Trạch, height approximately 1.92 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male powerful mountain warrior, broad shoulders and muscular frame; dark tied-back hair, angular layered iron and sandstone armor over ochre cloth, eight-sided hammered fittings, cracked mountain reliefs, heavy protective boots and a sturdy waist belt. Human hands remain empty and visible. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #1e293b, inner #473324, trim #b45309, hair #181d25. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-C1 — Hàn Trạch — Chiến Binh Nham Thành

- **Tên file:** `H02-C1_han_trach_chien_binh_nham_thanh.glb`
- **Nơi đặt:** `assets/base_models/H02-C1_han_trach_chien_binh_nham_thanh.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Hàn Trạch, height approximately 1.92 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male powerful mountain warrior, broad shoulders and muscular frame; dark tied-back hair, angular layered iron and sandstone armor over ochre cloth, eight-sided hammered fittings, cracked mountain reliefs, heavy protective boots and a sturdy waist belt. Human hands remain empty and visible. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #1e293b, inner #473324, trim #b45309, hair #181d25. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-C2 — Hàn Trạch — Chấn Nhạc Chiến Thần

- **Tên file:** `H02-C2_han_trach_chan_nhac_chien_than.glb`
- **Nơi đặt:** `assets/base_models/H02-C2_han_trach_chan_nhac_chien_than.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Hàn Trạch, height approximately 1.92 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male powerful mountain warrior, broad shoulders and muscular frame; dark tied-back hair, angular layered iron and sandstone armor over ochre cloth, eight-sided hammered fittings, cracked mountain reliefs, heavy protective boots and a sturdy waist belt. Human hands remain empty and visible. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #1e293b, inner #473324, trim #b45309, hair #181d25. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-C3 — Hàn Trạch — Lôi Đình Đại Hội

- **Tên file:** `H02-C3_han_trach_loi_dinh_dai_hoi.glb`
- **Nơi đặt:** `assets/base_models/H02-C3_han_trach_loi_dinh_dai_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Hàn Trạch, height approximately 1.92 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male powerful mountain warrior, broad shoulders and muscular frame; dark tied-back hair, angular layered iron and sandstone armor over ochre cloth, eight-sided hammered fittings, cracked mountain reliefs, heavy protective boots and a sturdy waist belt. Human hands remain empty and visible. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #1e293b, inner #473324, trim #b45309, hair #181d25. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-C0 — Ly Sa — Phong Ảnh Y

- **Tên file:** `H03-C0_ly_sa_phong_anh_y.glb`
- **Nơi đặt:** `assets/base_models/H03-C0_ly_sa_phong_anh_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ly Sa, height approximately 1.68 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female agile fox assassin, lean athletic proportions; dark hair with violet highlights, fitted layered mint and dark teal silk panels, crescent embroidery, restrained fox-inspired ear-shaped hair ornaments and light bracers. Human legs and hands remain distinct; do not fuse a giant tail across the legs. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #3b0764, inner #0f172a, trim #e2e8f0, hair #d9d3ed. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-C1 — Ly Sa — Dạ Hành Hồ

- **Tên file:** `H03-C1_ly_sa_da_hanh_ho.glb`
- **Nơi đặt:** `assets/base_models/H03-C1_ly_sa_da_hanh_ho.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ly Sa, height approximately 1.68 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female agile fox assassin, lean athletic proportions; dark hair with violet highlights, fitted layered mint and dark teal silk panels, crescent embroidery, restrained fox-inspired ear-shaped hair ornaments and light bracers. Human legs and hands remain distinct; do not fuse a giant tail across the legs. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #3b0764, inner #0f172a, trim #e2e8f0, hair #d9d3ed. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-C2 — Ly Sa — Thiên Hồ Huyễn Vũ

- **Tên file:** `H03-C2_ly_sa_thien_ho_huyen_vu.glb`
- **Nơi đặt:** `assets/base_models/H03-C2_ly_sa_thien_ho_huyen_vu.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ly Sa, height approximately 1.68 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female agile fox assassin, lean athletic proportions; dark hair with violet highlights, fitted layered mint and dark teal silk panels, crescent embroidery, restrained fox-inspired ear-shaped hair ornaments and light bracers. Human legs and hands remain distinct; do not fuse a giant tail across the legs. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #3b0764, inner #0f172a, trim #e2e8f0, hair #d9d3ed. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-C3 — Ly Sa — Dạ Hội Ngân Nguyệt

- **Tên file:** `H03-C3_ly_sa_da_hoi_ngan_nguyet.glb`
- **Nơi đặt:** `assets/base_models/H03-C3_ly_sa_da_hoi_ngan_nguyet.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ly Sa, height approximately 1.68 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female agile fox assassin, lean athletic proportions; dark hair with violet highlights, fitted layered mint and dark teal silk panels, crescent embroidery, restrained fox-inspired ear-shaped hair ornaments and light bracers. Human legs and hands remain distinct; do not fuse a giant tail across the legs. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #3b0764, inner #0f172a, trim #e2e8f0, hair #d9d3ed. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-C0 — Kỳ Vân — Lôi Vũ Phục

- **Tên file:** `H04-C0_ky_van_loi_vu_phuc.glb`
- **Nơi đặt:** `assets/base_models/H04-C0_ky_van_loi_vu_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Kỳ Vân, height approximately 1.83 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male lightning cultivator, tall slender silhouette; swept-back dark hair, layered blue and violet robes with cloud-crane gold embroidery, feather-like shoulder panels, narrow jade belt and articulated boots. Elegant alert face, no fan attached to a hand. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #f8fafc, inner #0284c7, trim #e4bf69, hair #d2e8f2. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-C1 — Kỳ Vân — Lam Vũ Đạo Nhân

- **Tên file:** `H04-C1_ky_van_lam_vu_dao_nhan.glb`
- **Nơi đặt:** `assets/base_models/H04-C1_ky_van_lam_vu_dao_nhan.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Kỳ Vân, height approximately 1.83 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male lightning cultivator, tall slender silhouette; swept-back dark hair, layered blue and violet robes with cloud-crane gold embroidery, feather-like shoulder panels, narrow jade belt and articulated boots. Elegant alert face, no fan attached to a hand. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #f8fafc, inner #0284c7, trim #e4bf69, hair #d2e8f2. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-C2 — Kỳ Vân — Cửu Thiên Lôi Quân

- **Tên file:** `H04-C2_ky_van_cuu_thien_loi_quan.glb`
- **Nơi đặt:** `assets/base_models/H04-C2_ky_van_cuu_thien_loi_quan.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Kỳ Vân, height approximately 1.83 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male lightning cultivator, tall slender silhouette; swept-back dark hair, layered blue and violet robes with cloud-crane gold embroidery, feather-like shoulder panels, narrow jade belt and articulated boots. Elegant alert face, no fan attached to a hand. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #f8fafc, inner #0284c7, trim #e4bf69, hair #d2e8f2. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-C3 — Kỳ Vân — Lôi Vân Tết Hội

- **Tên file:** `H04-C3_ky_van_loi_van_tet_hoi.glb`
- **Nơi đặt:** `assets/base_models/H04-C3_ky_van_loi_van_tet_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Kỳ Vân, height approximately 1.83 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male lightning cultivator, tall slender silhouette; swept-back dark hair, layered blue and violet robes with cloud-crane gold embroidery, feather-like shoulder panels, narrow jade belt and articulated boots. Elegant alert face, no fan attached to a hand. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #f8fafc, inner #0284c7, trim #e4bf69, hair #d2e8f2. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-C0 — Tịch Dao — Linh Kính Y

- **Tên file:** `H05-C0_tich_dao_linh_kinh_y.glb`
- **Nơi đặt:** `assets/base_models/H05-C0_tich_dao_linh_kinh_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Tịch Dao, height approximately 1.69 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female serene moon cultivator; long black hair with refined moon hairpins, expressive symmetrical eyes, white and pale jade-blue layered silk robes with silver and gold cloud-crane embroidery, small translucent jade pendant. Face is uninterrupted warm natural skin, with real modeled hair outside the face surface. No mirror, halo or weapon in this body asset. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #eff6ff, inner #bae6fd, trim #facc15, hair #131929. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-C1 — Tịch Dao — Nguyệt Bạch Phục

- **Tên file:** `H05-C1_tich_dao_nguyet_bach_phuc.glb`
- **Nơi đặt:** `assets/base_models/H05-C1_tich_dao_nguyet_bach_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Tịch Dao, height approximately 1.69 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female serene moon cultivator; long black hair with refined moon hairpins, expressive symmetrical eyes, white and pale jade-blue layered silk robes with silver and gold cloud-crane embroidery, small translucent jade pendant. Face is uninterrupted warm natural skin, with real modeled hair outside the face surface. No mirror, halo or weapon in this body asset. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #eff6ff, inner #bae6fd, trim #facc15, hair #131929. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-C2 — Tịch Dao — Thiên Quang Thánh Nữ

- **Tên file:** `H05-C2_tich_dao_thien_quang_thanh_nu.glb`
- **Nơi đặt:** `assets/base_models/H05-C2_tich_dao_thien_quang_thanh_nu.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Tịch Dao, height approximately 1.69 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female serene moon cultivator; long black hair with refined moon hairpins, expressive symmetrical eyes, white and pale jade-blue layered silk robes with silver and gold cloud-crane embroidery, small translucent jade pendant. Face is uninterrupted warm natural skin, with real modeled hair outside the face surface. No mirror, halo or weapon in this body asset. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #eff6ff, inner #bae6fd, trim #facc15, hair #131929. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-C3 — Tịch Dao — Hoa Đăng Nguyệt Dạ

- **Tên file:** `H05-C3_tich_dao_hoa_dang_nguyet_da.glb`
- **Nơi đặt:** `assets/base_models/H05-C3_tich_dao_hoa_dang_nguyet_da.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Tịch Dao, height approximately 1.69 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female serene moon cultivator; long black hair with refined moon hairpins, expressive symmetrical eyes, white and pale jade-blue layered silk robes with silver and gold cloud-crane embroidery, small translucent jade pendant. Face is uninterrupted warm natural skin, with real modeled hair outside the face surface. No mirror, halo or weapon in this body asset. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #eff6ff, inner #bae6fd, trim #facc15, hair #131929. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-C0 — Đỗ Kình — Huyền Giáp Phục

- **Tên file:** `H06-C0_do_kinh_huyen_giap_phuc.glb`
- **Nơi đặt:** `assets/base_models/H06-C0_do_kinh_huyen_giap_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Đỗ Kình, height approximately 1.98 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male massive guardian, broad heavy torso and thick limbs; blue-black layered turtle-shell hexagonal armor, jade-blue cloth, bronze-gold shell edging and water-wave relief, sturdy greaves and heavy boots. Keep the left hand free for a separately generated shield. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #0f3d3e, inner #164e50, trim #ca8a04, hair #142125. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-C1 — Đỗ Kình — Sơn Thành Thủ Vệ

- **Tên file:** `H06-C1_do_kinh_son_thanh_thu_ve.glb`
- **Nơi đặt:** `assets/base_models/H06-C1_do_kinh_son_thanh_thu_ve.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Đỗ Kình, height approximately 1.98 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male massive guardian, broad heavy torso and thick limbs; blue-black layered turtle-shell hexagonal armor, jade-blue cloth, bronze-gold shell edging and water-wave relief, sturdy greaves and heavy boots. Keep the left hand free for a separately generated shield. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #0f3d3e, inner #164e50, trim #ca8a04, hair #142125. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-C2 — Đỗ Kình — Bất Động Thiên Vương

- **Tên file:** `H06-C2_do_kinh_bat_dong_thien_vuong.glb`
- **Nơi đặt:** `assets/base_models/H06-C2_do_kinh_bat_dong_thien_vuong.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Đỗ Kình, height approximately 1.98 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male massive guardian, broad heavy torso and thick limbs; blue-black layered turtle-shell hexagonal armor, jade-blue cloth, bronze-gold shell edging and water-wave relief, sturdy greaves and heavy boots. Keep the left hand free for a separately generated shield. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #0f3d3e, inner #164e50, trim #ca8a04, hair #142125. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-C3 — Đỗ Kình — Hộ Thành Đại Lễ

- **Tên file:** `H06-C3_do_kinh_ho_thanh_dai_le.glb`
- **Nơi đặt:** `assets/base_models/H06-C3_do_kinh_ho_thanh_dai_le.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Đỗ Kình, height approximately 1.98 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male massive guardian, broad heavy torso and thick limbs; blue-black layered turtle-shell hexagonal armor, jade-blue cloth, bronze-gold shell edging and water-wave relief, sturdy greaves and heavy boots. Keep the left hand free for a separately generated shield. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #0f3d3e, inner #164e50, trim #ca8a04, hair #142125. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-C0 — Vân Chước — Hỏa Liên Y

- **Tên file:** `H07-C0_van_chuoc_hoa_lien_y.glb`
- **Nơi đặt:** `assets/base_models/H07-C0_van_chuoc_hoa_lien_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Vân Chước, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male flame cultivator; long dark hair, vermilion and deep red robes built from overlapping lotus-like cloth panels, gold embroidered lotus borders, charcoal inner garments and a jade belt. Model cloth as tangible fabric, not solid fire; no floating wheel attached. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #7f1d1d, inner #25171d, trim #f59e0b, hair #b82f20. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-C1 — Vân Chước — Diệm Hoa Chiến Bào

- **Tên file:** `H07-C1_van_chuoc_diem_hoa_chien_bao.glb`
- **Nơi đặt:** `assets/base_models/H07-C1_van_chuoc_diem_hoa_chien_bao.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Vân Chước, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male flame cultivator; long dark hair, vermilion and deep red robes built from overlapping lotus-like cloth panels, gold embroidered lotus borders, charcoal inner garments and a jade belt. Model cloth as tangible fabric, not solid fire; no floating wheel attached. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #7f1d1d, inner #25171d, trim #f59e0b, hair #b82f20. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-C2 — Vân Chước — Xích Liên Đế Quân

- **Tên file:** `H07-C2_van_chuoc_xich_lien_de_quan.glb`
- **Nơi đặt:** `assets/base_models/H07-C2_van_chuoc_xich_lien_de_quan.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Vân Chước, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male flame cultivator; long dark hair, vermilion and deep red robes built from overlapping lotus-like cloth panels, gold embroidered lotus borders, charcoal inner garments and a jade belt. Model cloth as tangible fabric, not solid fire; no floating wheel attached. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #7f1d1d, inner #25171d, trim #f59e0b, hair #b82f20. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-C3 — Vân Chước — Hồng Liên Dạ Hội

- **Tên file:** `H07-C3_van_chuoc_hong_lien_da_hoi.glb`
- **Nơi đặt:** `assets/base_models/H07-C3_van_chuoc_hong_lien_da_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Vân Chước, height approximately 1.82 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male flame cultivator; long dark hair, vermilion and deep red robes built from overlapping lotus-like cloth panels, gold embroidered lotus borders, charcoal inner garments and a jade belt. Model cloth as tangible fabric, not solid fire; no floating wheel attached. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #7f1d1d, inner #25171d, trim #f59e0b, hair #b82f20. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-C0 — Sở Băng Nghi — Tuyết Điệp Y

- **Tên file:** `H08-C0_so_bang_nghi_tuyet_diep_y.glb`
- **Nơi đặt:** `assets/base_models/H08-C0_so_bang_nghi_tuyet_diep_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Sở Băng Nghi, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female ice cultivator; long silver-white hair, pale blue and white flowing robes, translucent ice-blue jewelry, butterfly wing embroidery, silver hems and restrained crystalline shoulder accents. Human arms and ankles remain anatomically clear; no staff attached. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #ecfeff, inner #1e3a8a, trim #a5e9f6, hair #e0f5fb. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-C1 — Sở Băng Nghi — Băng Tinh Vũ Phục

- **Tên file:** `H08-C1_so_bang_nghi_bang_tinh_vu_phuc.glb`
- **Nơi đặt:** `assets/base_models/H08-C1_so_bang_nghi_bang_tinh_vu_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Sở Băng Nghi, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female ice cultivator; long silver-white hair, pale blue and white flowing robes, translucent ice-blue jewelry, butterfly wing embroidery, silver hems and restrained crystalline shoulder accents. Human arms and ankles remain anatomically clear; no staff attached. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #ecfeff, inner #1e3a8a, trim #a5e9f6, hair #e0f5fb. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-C2 — Sở Băng Nghi — Tuyết Giới Nữ Hoàng

- **Tên file:** `H08-C2_so_bang_nghi_tuyet_gioi_nu_hoang.glb`
- **Nơi đặt:** `assets/base_models/H08-C2_so_bang_nghi_tuyet_gioi_nu_hoang.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Sở Băng Nghi, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female ice cultivator; long silver-white hair, pale blue and white flowing robes, translucent ice-blue jewelry, butterfly wing embroidery, silver hems and restrained crystalline shoulder accents. Human arms and ankles remain anatomically clear; no staff attached. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #ecfeff, inner #1e3a8a, trim #a5e9f6, hair #e0f5fb. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-C3 — Sở Băng Nghi — Đông Chí Tuyết Hoa

- **Tên file:** `H08-C3_so_bang_nghi_dong_chi_tuyet_hoa.glb`
- **Nơi đặt:** `assets/base_models/H08-C3_so_bang_nghi_dong_chi_tuyet_hoa.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Sở Băng Nghi, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female ice cultivator; long silver-white hair, pale blue and white flowing robes, translucent ice-blue jewelry, butterfly wing embroidery, silver hems and restrained crystalline shoulder accents. Human arms and ankles remain anatomically clear; no staff attached. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #ecfeff, inner #1e3a8a, trim #a5e9f6, hair #e0f5fb. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-C0 — Mặc Tinh — Nguyệt Ảnh Phục

- **Tên file:** `H09-C0_mac_tinh_nguyet_anh_phuc.glb`
- **Nơi đặt:** `assets/base_models/H09-C0_mac_tinh_nguyet_anh_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Mặc Tinh, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female moon archer, agile lean build; dark flowing hair, indigo and violet layered mantle, fitted practical archer clothing, silver star embroidery and a crescent waist clasp. Both hands empty, with a clear left-hand grip area for a separate bow; no drawn bowstring pose. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #1e1b4b, inner #3b82f6, trim #cbd5e1, hair #122139. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-C1 — Mặc Tinh — Dạ Nguyệt Xạ Thủ

- **Tên file:** `H09-C1_mac_tinh_da_nguyet_xa_thu.glb`
- **Nơi đặt:** `assets/base_models/H09-C1_mac_tinh_da_nguyet_xa_thu.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Mặc Tinh, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female moon archer, agile lean build; dark flowing hair, indigo and violet layered mantle, fitted practical archer clothing, silver star embroidery and a crescent waist clasp. Both hands empty, with a clear left-hand grip area for a separate bow; no drawn bowstring pose. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #1e1b4b, inner #3b82f6, trim #cbd5e1, hair #122139. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-C2 — Mặc Tinh — Cửu Tinh Thiên Xạ

- **Tên file:** `H09-C2_mac_tinh_cuu_tinh_thien_xa.glb`
- **Nơi đặt:** `assets/base_models/H09-C2_mac_tinh_cuu_tinh_thien_xa.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Mặc Tinh, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female moon archer, agile lean build; dark flowing hair, indigo and violet layered mantle, fitted practical archer clothing, silver star embroidery and a crescent waist clasp. Both hands empty, with a clear left-hand grip area for a separate bow; no drawn bowstring pose. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #1e1b4b, inner #3b82f6, trim #cbd5e1, hair #122139. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-C3 — Mặc Tinh — Tinh Hà Lễ Hội

- **Tên file:** `H09-C3_mac_tinh_tinh_ha_le_hoi.glb`
- **Nơi đặt:** `assets/base_models/H09-C3_mac_tinh_tinh_ha_le_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Mặc Tinh, height approximately 1.7 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female moon archer, agile lean build; dark flowing hair, indigo and violet layered mantle, fitted practical archer clothing, silver star embroidery and a crescent waist clasp. Both hands empty, with a clear left-hand grip area for a separate bow; no drawn bowstring pose. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #1e1b4b, inner #3b82f6, trim #cbd5e1, hair #122139. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-C0 — Thiên Lạc — Kim Hổ Chiến Phục

- **Tên file:** `H10-C0_thien_lac_kim_ho_chien_phuc.glb`
- **Nơi đặt:** `assets/base_models/H10-C0_thien_lac_kim_ho_chien_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Thiên Lạc, height approximately 1.85 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male armored tiger fighter, powerful athletic build; gold tiger-head relief breastplate, black and gold segmented armor over warm cloth, articulated wrists and boots, restrained tiger-stripe engraving. Both hands bare enough to fit separate claw gauntlets; no giant tiger head replacing the human face. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #f1f5f9, inner #756039, trim #eab308, hair #9b732d. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-C1 — Thiên Lạc — Sơn Lâm Chiến Giáp

- **Tên file:** `H10-C1_thien_lac_son_lam_chien_giap.glb`
- **Nơi đặt:** `assets/base_models/H10-C1_thien_lac_son_lam_chien_giap.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Thiên Lạc, height approximately 1.85 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male armored tiger fighter, powerful athletic build; gold tiger-head relief breastplate, black and gold segmented armor over warm cloth, articulated wrists and boots, restrained tiger-stripe engraving. Both hands bare enough to fit separate claw gauntlets; no giant tiger head replacing the human face. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #f1f5f9, inner #756039, trim #eab308, hair #9b732d. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-C2 — Thiên Lạc — Kim Hổ Võ Vương

- **Tên file:** `H10-C2_thien_lac_kim_ho_vo_vuong.glb`
- **Nơi đặt:** `assets/base_models/H10-C2_thien_lac_kim_ho_vo_vuong.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Thiên Lạc, height approximately 1.85 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male armored tiger fighter, powerful athletic build; gold tiger-head relief breastplate, black and gold segmented armor over warm cloth, articulated wrists and boots, restrained tiger-stripe engraving. Both hands bare enough to fit separate claw gauntlets; no giant tiger head replacing the human face. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #f1f5f9, inner #756039, trim #eab308, hair #9b732d. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-C3 — Thiên Lạc — Mãnh Hổ Xuân Hội

- **Tên file:** `H10-C3_thien_lac_manh_ho_xuan_hoi.glb`
- **Nơi đặt:** `assets/base_models/H10-C3_thien_lac_manh_ho_xuan_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Thiên Lạc, height approximately 1.85 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male armored tiger fighter, powerful athletic build; gold tiger-head relief breastplate, black and gold segmented armor over warm cloth, articulated wrists and boots, restrained tiger-stripe engraving. Both hands bare enough to fit separate claw gauntlets; no giant tiger head replacing the human face. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #f1f5f9, inner #756039, trim #eab308, hair #9b732d. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-C0 — Ninh Từ — Thanh Âm Y

- **Tên file:** `H11-C0_ninh_tu_thanh_am_y.glb`
- **Nơi đặt:** `assets/base_models/H11-C0_ninh_tu_thanh_am_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ninh Từ, height approximately 1.67 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female celestial musician; long dark hair, jade-green and ivory layered silk robes, orchid, cloud and flowing musical-line embroidery in soft gold, delicate jade belt and elegant modest silhouette. Human face and hands carefully modeled; no instrument blocking the torso. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #d1fae5, inner #f8fffd, trim #fdba74, hair #172b2a. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-C1 — Ninh Từ — Ngọc Cầm Nhã Phục

- **Tên file:** `H11-C1_ninh_tu_ngoc_cam_nha_phuc.glb`
- **Nơi đặt:** `assets/base_models/H11-C1_ninh_tu_ngoc_cam_nha_phuc.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ninh Từ, height approximately 1.67 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female celestial musician; long dark hair, jade-green and ivory layered silk robes, orchid, cloud and flowing musical-line embroidery in soft gold, delicate jade belt and elegant modest silhouette. Human face and hands carefully modeled; no instrument blocking the torso. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #d1fae5, inner #f8fffd, trim #fdba74, hair #172b2a. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-C2 — Ninh Từ — Cửu Âm Thiên Nữ

- **Tên file:** `H11-C2_ninh_tu_cuu_am_thien_nu.glb`
- **Nơi đặt:** `assets/base_models/H11-C2_ninh_tu_cuu_am_thien_nu.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ninh Từ, height approximately 1.67 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female celestial musician; long dark hair, jade-green and ivory layered silk robes, orchid, cloud and flowing musical-line embroidery in soft gold, delicate jade belt and elegant modest silhouette. Human face and hands carefully modeled; no instrument blocking the torso. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #d1fae5, inner #f8fffd, trim #fdba74, hair #172b2a. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-C3 — Ninh Từ — Nguyệt Cầm Hoa Hội

- **Tên file:** `H11-C3_ninh_tu_nguyet_cam_hoa_hoi.glb`
- **Nơi đặt:** `assets/base_models/H11-C3_ninh_tu_nguyet_cam_hoa_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult female humanoid game character, Ninh Từ, height approximately 1.67 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult female celestial musician; long dark hair, jade-green and ivory layered silk robes, orchid, cloud and flowing musical-line embroidery in soft gold, delicate jade belt and elegant modest silhouette. Human face and hands carefully modeled; no instrument blocking the torso. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #d1fae5, inner #f8fffd, trim #fdba74, hair #172b2a. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-C0 — Tạ Uyên — Hư Ảnh Hắc Y

- **Tên file:** `H12-C0_ta_uyen_hu_anh_hac_y.glb`
- **Nơi đặt:** `assets/base_models/H12-C0_ta_uyen_hu_anh_hac_y.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Tạ Uyên, height approximately 1.84 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male void-serpent cultivator, slender angular silhouette; long dark violet-black hair, charcoal and violet robes, subtly reflective snake-scale collar, gold-purple hem embroidery and jade ornaments. Human face with calm sharp features, not a snake head; no staff or free-floating serpent fused to the body. Original outfit matching the source character palette and readable silhouette. Source palette reference: outer #2e1065, inner #10141d, trim #a88ab8, hair #b9a9d4. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-C1 — Tạ Uyên — U Minh Lữ Khách

- **Tên file:** `H12-C1_ta_uyen_u_minh_lu_khach.glb`
- **Nơi đặt:** `assets/base_models/H12-C1_ta_uyen_u_minh_lu_khach.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Tạ Uyên, height approximately 1.84 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male void-serpent cultivator, slender angular silhouette; long dark violet-black hair, charcoal and violet robes, subtly reflective snake-scale collar, gold-purple hem embroidery and jade ornaments. Human face with calm sharp features, not a snake head; no staff or free-floating serpent fused to the body. Travel/combat variant: practical layered mantle, reinforced hem panels, subtle shoulder drape and durable cloth texture. Preserve the same adult face, anatomy and elemental identity. Source palette reference: outer #2e1065, inner #10141d, trim #a88ab8, hair #b9a9d4. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-C2 — Tạ Uyên — Hư Không Ma Quân

- **Tên file:** `H12-C2_ta_uyen_hu_khong_ma_quan.glb`
- **Nơi đặt:** `assets/base_models/H12-C2_ta_uyen_hu_khong_ma_quan.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Tạ Uyên, height approximately 1.84 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male void-serpent cultivator, slender angular silhouette; long dark violet-black hair, charcoal and violet robes, subtly reflective snake-scale collar, gold-purple hem embroidery and jade ornaments. Human face with calm sharp features, not a snake head; no staff or free-floating serpent fused to the body. Ceremonial high-rank variant: more elaborate layered chest and shoulder protection, refined crown fittings and dense but readable gold embroidery. Preserve the same face and proportions; ornaments must not hide joints. Source palette reference: outer #2e1065, inner #10141d, trim #a88ab8, hair #b9a9d4. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-C3 — Tạ Uyên — Bóng Đêm Huyền Hội

- **Tên file:** `H12-C3_ta_uyen_bong_dem_huyen_hoi.glb`
- **Nơi đặt:** `assets/base_models/H12-C3_ta_uyen_bong_dem_huyen_hoi.glb`
- **Nguồn:** `src/data.js:COSTUMES`, `src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Create one complete adult male humanoid game character, Tạ Uyên, height approximately 1.84 meters. Strict symmetrical A-pose: torso upright, head forward, both arms straight and 35 degrees away from the body, palms facing forward, all ten fingers separated, elbows and wrists visible, both legs separated, feet parallel and fully visible. Adult male void-serpent cultivator, slender angular silhouette; long dark violet-black hair, charcoal and violet robes, subtly reflective snake-scale collar, gold-purple hem embroidery and jade ornaments. Human face with calm sharp features, not a snake head; no staff or free-floating serpent fused to the body. Festival variant: carefully embroidered floral and celestial motifs, small jewel fittings, fine silk sheen and elegant hems. Preserve the same face, underlying proportions and combat-ready A-pose. Source palette reference: outer #2e1065, inner #10141d, trim #a88ab8, hair #b9a9d4. Model complete coherent back surfaces, separate cloth layers with thickness, carved belt clasp, small jade pendant and two restrained tassels; avoid sleeves or capes bridging both arms to the torso. Face has natural warm skin, layered detailed eyes and lips, symmetrical facial anatomy; hair is external geometry, never black painted stripes across the face UV. Empty hands, no weapon, shield, instrument, floating mirror, soul ring, wings, back harness or platform. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="weapon"></a>

## weapon

### H01-W0 — Mộc Tinh Trượng — nguyên bản

- **Tên file:** `H01-W0_moc_tinh_truong_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H01-W0_moc_tinh_truong_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.95 meter living-wood staff: three twisting wood strands form a strong continuous shaft, fine bark grain, carved gold joints, a twelve-petal jade lotus crown and one luminous green crystal. Preserve a straight graspable lower handle and a narrow dragon-vine silhouette. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H01-W1 — Mộc Tinh Trượng — Cơ bản

- **Tên file:** `H01-W1_moc_tinh_truong_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H01-W1_moc_tinh_truong_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.95 meter living-wood staff: three twisting wood strands form a strong continuous shaft, fine bark grain, carved gold joints, a twelve-petal jade lotus crown and one luminous green crystal. Preserve a straight graspable lower handle and a narrow dragon-vine silhouette. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H01-W2 — Mộc Tinh Trượng — VIP

- **Tên file:** `H01-W2_moc_tinh_truong_vip.glb`
- **Nơi đặt:** `assets/base_models/H01-W2_moc_tinh_truong_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.95 meter living-wood staff: three twisting wood strands form a strong continuous shaft, fine bark grain, carved gold joints, a twelve-petal jade lotus crown and one luminous green crystal. Preserve a straight graspable lower handle and a narrow dragon-vine silhouette. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-W0 — Chấn Nhạc Chùy — nguyên bản

- **Tên file:** `H02-W0_chan_nhac_chuy_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H02-W0_chan_nhac_chuy_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.85 meter two-handed mountain hammer with an eight-sided stone-and-metal hammer head, chiseled mountain reliefs, weathered slate faces, bronze-gold edge bands and a reinforced dark wooden grip. Keep head and handle structurally connected. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-W1 — Chấn Nhạc Chùy — Cơ bản

- **Tên file:** `H02-W1_chan_nhac_chuy_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H02-W1_chan_nhac_chuy_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.85 meter two-handed mountain hammer with an eight-sided stone-and-metal hammer head, chiseled mountain reliefs, weathered slate faces, bronze-gold edge bands and a reinforced dark wooden grip. Keep head and handle structurally connected. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H02-W2 — Chấn Nhạc Chùy — VIP

- **Tên file:** `H02-W2_chan_nhac_chuy_vip.glb`
- **Nơi đặt:** `assets/base_models/H02-W2_chan_nhac_chuy_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.85 meter two-handed mountain hammer with an eight-sided stone-and-metal hammer head, chiseled mountain reliefs, weathered slate faces, bronze-gold edge bands and a reinforced dark wooden grip. Keep head and handle structurally connected. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-W0 — Song Ảnh Nhận — nguyên bản

- **Tên file:** `H03-W0_song_anh_nhan_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H03-W0_song_anh_nhan_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
Two matching 0.65 meter reverse-crescent assassin blades, displayed as separate left and right objects with an obvious gap. Mint jade and violet-black steel blades, sharpened metal cutting edges, crescent filigree and leather-wrapped ergonomic grips. No hands, body or connecting decorative bridge between the pair. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-W1 — Song Ảnh Nhận — Cơ bản

- **Tên file:** `H03-W1_song_anh_nhan_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H03-W1_song_anh_nhan_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
Two matching 0.65 meter reverse-crescent assassin blades, displayed as separate left and right objects with an obvious gap. Mint jade and violet-black steel blades, sharpened metal cutting edges, crescent filigree and leather-wrapped ergonomic grips. No hands, body or connecting decorative bridge between the pair. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H03-W2 — Song Ảnh Nhận — VIP

- **Tên file:** `H03-W2_song_anh_nhan_vip.glb`
- **Nơi đặt:** `assets/base_models/H03-W2_song_anh_nhan_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
Two matching 0.65 meter reverse-crescent assassin blades, displayed as separate left and right objects with an obvious gap. Mint jade and violet-black steel blades, sharpened metal cutting edges, crescent filigree and leather-wrapped ergonomic grips. No hands, body or connecting decorative bridge between the pair. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-W0 — Lôi Vũ Phiến — nguyên bản

- **Tên file:** `H04-W0_loi_vu_phien_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H04-W0_loi_vu_phien_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One open 0.90 meter lightning war fan spanning 120 degrees, built from exactly nine readable layered feather ribs. Blue-violet enamel, silver and gold lightning inlay, articulated metal hub and a short usable handle. Solid fan structure with emissive groove details, no diffuse electricity cloud. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-W1 — Lôi Vũ Phiến — Cơ bản

- **Tên file:** `H04-W1_loi_vu_phien_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H04-W1_loi_vu_phien_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One open 0.90 meter lightning war fan spanning 120 degrees, built from exactly nine readable layered feather ribs. Blue-violet enamel, silver and gold lightning inlay, articulated metal hub and a short usable handle. Solid fan structure with emissive groove details, no diffuse electricity cloud. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H04-W2 — Lôi Vũ Phiến — VIP

- **Tên file:** `H04-W2_loi_vu_phien_vip.glb`
- **Nơi đặt:** `assets/base_models/H04-W2_loi_vu_phien_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One open 0.90 meter lightning war fan spanning 120 degrees, built from exactly nine readable layered feather ribs. Blue-violet enamel, silver and gold lightning inlay, articulated metal hub and a short usable handle. Solid fan structure with emissive groove details, no diffuse electricity cloud. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-W0 — Nguyệt Linh Kính — nguyên bản

- **Tên file:** `H05-W0_nguyet_linh_kinh_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H05-W0_nguyet_linh_kinh_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete floating moon mirror, circular diameter 0.65 meters: slender gold-bronze crescent-and-cloud carved rim, a complete thin silver reflective mirror disk with subtle galaxy tint, small jade insets. Unobstructed central disk; not an empty gray hoop. Model the rim and mirror as separable material regions so transparency, transmission and iridescence can be adjusted in engine. No human or pedestal. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-W1 — Nguyệt Linh Kính — Cơ bản

- **Tên file:** `H05-W1_nguyet_linh_kinh_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H05-W1_nguyet_linh_kinh_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete floating moon mirror, circular diameter 0.65 meters: slender gold-bronze crescent-and-cloud carved rim, a complete thin silver reflective mirror disk with subtle galaxy tint, small jade insets. Unobstructed central disk; not an empty gray hoop. Model the rim and mirror as separable material regions so transparency, transmission and iridescence can be adjusted in engine. No human or pedestal. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H05-W2 — Nguyệt Linh Kính — VIP

- **Tên file:** `H05-W2_nguyet_linh_kinh_vip.glb`
- **Nơi đặt:** `assets/base_models/H05-W2_nguyet_linh_kinh_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete floating moon mirror, circular diameter 0.65 meters: slender gold-bronze crescent-and-cloud carved rim, a complete thin silver reflective mirror disk with subtle galaxy tint, small jade insets. Unobstructed central disk; not an empty gray hoop. Model the rim and mirror as separable material regions so transparency, transmission and iridescence can be adjusted in engine. No human or pedestal. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-W0 — Huyền Quy Thuẫn — nguyên bản

- **Tên file:** `H06-W0_huyen_quy_thuan_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H06-W0_huyen_quy_thuan_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.35 meter left-arm turtle shield, six-sided silhouette with hexagonal raised shell plates, dark teal metal, jade-blue insets, warm gold borders and engraved water waves. Model an inside arm strap and handle on the back; keep the center protective and continuous. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-W1 — Huyền Quy Thuẫn — Cơ bản

- **Tên file:** `H06-W1_huyen_quy_thuan_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H06-W1_huyen_quy_thuan_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.35 meter left-arm turtle shield, six-sided silhouette with hexagonal raised shell plates, dark teal metal, jade-blue insets, warm gold borders and engraved water waves. Model an inside arm strap and handle on the back; keep the center protective and continuous. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H06-W2 — Huyền Quy Thuẫn — VIP

- **Tên file:** `H06-W2_huyen_quy_thuan_vip.glb`
- **Nơi đặt:** `assets/base_models/H06-W2_huyen_quy_thuan_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.35 meter left-arm turtle shield, six-sided silhouette with hexagonal raised shell plates, dark teal metal, jade-blue insets, warm gold borders and engraved water waves. Model an inside arm strap and handle on the back; keep the center protective and continuous. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-W0 — Diệm Liên Luân — nguyên bản

- **Tên file:** `H07-W0_diem_lien_luan_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H07-W0_diem_lien_luan_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 0.86 meter floating fire-lotus wheel, exactly eight thick lotus-petal blades around an open centered annular hub, vermilion enamel, blackened metal and engraved gold lotus veins. Distinct inner opening; no opaque flame ball hiding the structure. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-W1 — Diệm Liên Luân — Cơ bản

- **Tên file:** `H07-W1_diem_lien_luan_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H07-W1_diem_lien_luan_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 0.86 meter floating fire-lotus wheel, exactly eight thick lotus-petal blades around an open centered annular hub, vermilion enamel, blackened metal and engraved gold lotus veins. Distinct inner opening; no opaque flame ball hiding the structure. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H07-W2 — Diệm Liên Luân — VIP

- **Tên file:** `H07-W2_diem_lien_luan_vip.glb`
- **Nơi đặt:** `assets/base_models/H07-W2_diem_lien_luan_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 0.86 meter floating fire-lotus wheel, exactly eight thick lotus-petal blades around an open centered annular hub, vermilion enamel, blackened metal and engraved gold lotus veins. Distinct inner opening; no opaque flame ball hiding the structure. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-W0 — Pháp Trượng Băng Điệp — nguyên bản

- **Tên file:** `H08-W0_phap_truong_bang_diep_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H08-W0_phap_truong_bang_diep_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Tên renderer: Pháp Trượng Băng Điệp — nguyên bản; bảng WEAPONS ghi “Băng Điệp Trâm”. Dùng ID tướng và tên renderer, không tạo thêm vũ khí giả.

**English prompt**

```text
One complete 1.65 meter ice butterfly staff, silver shaft, pale blue crystal fittings and exactly four articulated crystal wing lobes at the crown. Fine butterfly wing veins and translucent material regions, narrow usable hand grip, no generic spear point replacing the butterfly. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-W1 — Pháp Trượng Băng Điệp — Cơ bản

- **Tên file:** `H08-W1_phap_truong_bang_diep_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H08-W1_phap_truong_bang_diep_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Tên renderer: Pháp Trượng Băng Điệp — Cơ bản; bảng WEAPONS ghi “Băng Điệp Trâm”. Dùng ID tướng và tên renderer, không tạo thêm vũ khí giả.

**English prompt**

```text
One complete 1.65 meter ice butterfly staff, silver shaft, pale blue crystal fittings and exactly four articulated crystal wing lobes at the crown. Fine butterfly wing veins and translucent material regions, narrow usable hand grip, no generic spear point replacing the butterfly. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H08-W2 — Pháp Trượng Băng Điệp — VIP

- **Tên file:** `H08-W2_phap_truong_bang_diep_vip.glb`
- **Nơi đặt:** `assets/base_models/H08-W2_phap_truong_bang_diep_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Tên renderer: Pháp Trượng Băng Điệp — VIP; bảng WEAPONS ghi “Băng Điệp Trâm”. Dùng ID tướng và tên renderer, không tạo thêm vũ khí giả.

**English prompt**

```text
One complete 1.65 meter ice butterfly staff, silver shaft, pale blue crystal fittings and exactly four articulated crystal wing lobes at the crown. Fine butterfly wing veins and translucent material regions, narrow usable hand grip, no generic spear point replacing the butterfly. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-W0 — Huyền Nguyệt Cung — nguyên bản

- **Tên file:** `H09-W0_huyen_nguyet_cung_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H09-W0_huyen_nguyet_cung_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.55 meter crescent bow with hawk-inspired limb tips, violet-black lacquer, silver crescent carvings, a jade center grip and one clearly separated bowstring. Resting undrawn shape; no arrow, archer, hands or ground stand. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-W1 — Huyền Nguyệt Cung — Cơ bản

- **Tên file:** `H09-W1_huyen_nguyet_cung_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H09-W1_huyen_nguyet_cung_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.55 meter crescent bow with hawk-inspired limb tips, violet-black lacquer, silver crescent carvings, a jade center grip and one clearly separated bowstring. Resting undrawn shape; no arrow, archer, hands or ground stand. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H09-W2 — Huyền Nguyệt Cung — VIP

- **Tên file:** `H09-W2_huyen_nguyet_cung_vip.glb`
- **Nơi đặt:** `assets/base_models/H09-W2_huyen_nguyet_cung_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.55 meter crescent bow with hawk-inspired limb tips, violet-black lacquer, silver crescent carvings, a jade center grip and one clearly separated bowstring. Resting undrawn shape; no arrow, archer, hands or ground stand. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-W0 — Kim Hổ Trảo — nguyên bản

- **Tên file:** `H10-W0_kim_ho_trao_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H10-W0_kim_ho_trao_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One matching pair of 0.69 meter gold-and-black tiger claw gauntlets, displayed left and right separately with clear gap. Four distinct 0.45 meter claws per hand, tiger relief knuckles, articulated wrist cuffs, empty wearable interiors. No human hands fused inside the gloves. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-W1 — Kim Hổ Trảo — Cơ bản

- **Tên file:** `H10-W1_kim_ho_trao_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H10-W1_kim_ho_trao_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One matching pair of 0.69 meter gold-and-black tiger claw gauntlets, displayed left and right separately with clear gap. Four distinct 0.45 meter claws per hand, tiger relief knuckles, articulated wrist cuffs, empty wearable interiors. No human hands fused inside the gloves. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H10-W2 — Kim Hổ Trảo — VIP

- **Tên file:** `H10-W2_kim_ho_trao_vip.glb`
- **Nơi đặt:** `assets/base_models/H10-W2_kim_ho_trao_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One matching pair of 0.69 meter gold-and-black tiger claw gauntlets, displayed left and right separately with clear gap. Four distinct 0.45 meter claws per hand, tiger relief knuckles, articulated wrist cuffs, empty wearable interiors. No human hands fused inside the gloves. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-W0 — Thanh Ngọc Cầm — nguyên bản

- **Tên file:** `H11-W0_thanh_ngoc_cam_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H11-W0_thanh_ngoc_cam_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.30 meter floating phoenix guqin, elongated jade-green lacquered resonant body with phoenix carvings, soft gold fittings, exactly seven visibly separated strings, refined wooden grain and two sculpted end fittings. Full instrument viewed three-quarter from above, no musician or stand. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-W1 — Thanh Ngọc Cầm — Cơ bản

- **Tên file:** `H11-W1_thanh_ngoc_cam_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H11-W1_thanh_ngoc_cam_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.30 meter floating phoenix guqin, elongated jade-green lacquered resonant body with phoenix carvings, soft gold fittings, exactly seven visibly separated strings, refined wooden grain and two sculpted end fittings. Full instrument viewed three-quarter from above, no musician or stand. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H11-W2 — Thanh Ngọc Cầm — VIP

- **Tên file:** `H11-W2_thanh_ngoc_cam_vip.glb`
- **Nơi đặt:** `assets/base_models/H11-W2_thanh_ngoc_cam_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.30 meter floating phoenix guqin, elongated jade-green lacquered resonant body with phoenix carvings, soft gold fittings, exactly seven visibly separated strings, refined wooden grain and two sculpted end fittings. Full instrument viewed three-quarter from above, no musician or stand. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-W0 — Hư Ảnh Xà Trượng — nguyên bản

- **Tên file:** `H12-W0_hu_anh_xa_truong_nguyen_ban.glb`
- **Nơi đặt:** `assets/base_models/H12-W0_hu_anh_xa_truong_nguyen_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.90 meter void-serpent staff: exactly two carved serpents coil around a dark continuous shaft and frame a violet crystal crown; black jade, purple enamel and engraved gold scales. Clear grip area on the lower shaft, distinct serpent heads, no mist hiding the object. Original elemental design; restrained ornamentation and clear useful silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-W1 — Hư Ảnh Xà Trượng — Cơ bản

- **Tên file:** `H12-W1_hu_anh_xa_truong_co_ban.glb`
- **Nơi đặt:** `assets/base_models/H12-W1_hu_anh_xa_truong_co_ban.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.90 meter void-serpent staff: exactly two carved serpents coil around a dark continuous shaft and frame a violet crystal crown; black jade, purple enamel and engraved gold scales. Clear grip area on the lower shaft, distinct serpent heads, no mist hiding the object. Basic cosmetic skin: refined silver-gold engraved fittings and small jade gems; preserve the original dimensions, handedness and silhouette. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### H12-W2 — Hư Ảnh Xà Trượng — VIP

- **Tên file:** `H12-W2_hu_anh_xa_truong_vip.glb`
- **Nơi đặt:** `assets/base_models/H12-W2_hu_anh_xa_truong_vip.glb`
- **Nguồn:** `src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments`, `src/data.js:WEAPONS`
- **Lưu ý:** Vũ khí xuất riêng khỏi cơ thể; cặp đôi phải được kiểm tra và tách trái/phải trong Blender.

**English prompt**

```text
One complete 1.90 meter void-serpent staff: exactly two carved serpents coil around a dark continuous shaft and frame a violet crystal crown; black jade, purple enamel and engraved gold scales. Clear grip area on the lower shaft, distinct serpent heads, no mist hiding the object. VIP cosmetic skin: elaborate imperial gold filigree, small jewel inlays and more refined carved fittings; preserve the original dimensions, grip and silhouette, with no visual suggestion of a larger hitbox. No person, fingers, arms or support stand. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="soul-ring"></a>

## soul-ring

### HR-01 — Mộc Phược Hoàn

- **Tên file:** `HR-01_moc_phuoc_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-01_moc_phuoc_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved living vine knots, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-02 — Viêm Đằng Hoàn

- **Tên file:** `HR-02_viem_dang_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-02_viem_dang_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved ember lotus and vine spirals, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-03 — Sinh Mệnh Hoàn

- **Tên file:** `HR-03_sinh_menh_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-03_sinh_menh_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved life-giving lotus seed and leaf motifs, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-04 — Chấn Nhạc Hoàn

- **Tên file:** `HR-04_chan_nhac_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-04_chan_nhac_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved layered mountain facets, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-05 — Tật Phong Hoàn

- **Tên file:** `HR-05_tat_phong_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-05_tat_phong_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved flowing wind feathers, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-06 — Cuồng Lôi Hoàn

- **Tên file:** `HR-06_cuong_loi_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-06_cuong_loi_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Obsidian-black jade with restrained violet luminous inlays. Engraved branching lightning grooves, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-07 — Minh Kính Hoàn

- **Tên file:** `HR-07_minh_kinh_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-07_minh_kinh_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved mirror and crescent motifs, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-08 — Huyền Quy Hoàn

- **Tên file:** `HR-08_huyen_quy_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-08_huyen_quy_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Obsidian-black jade with restrained violet luminous inlays. Engraved hexagonal turtle-shell motifs, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-09 — Hàn Tuyết Hoàn

- **Tên file:** `HR-09_han_tuyet_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-09_han_tuyet_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Obsidian-black jade with restrained violet luminous inlays. Engraved snowflake and butterfly veins, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-10 — Truy Tinh Hoàn

- **Tên file:** `HR-10_truy_tinh_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-10_truy_tinh_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved star tracking constellation dots, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-11 — Hổ Phách Hoàn

- **Tên file:** `HR-11_ho_phach_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-11_ho_phach_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Deep translucent violet jade with silver luminous inlays. Engraved tiger amber claw relief, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HR-12 — Hư Ảnh Hoàn

- **Tên file:** `HR-12_hu_anh_hoan.glb`
- **Nơi đặt:** `assets/base_models/HR-12_hu_anh_hoan.glb`
- **Nguồn:** `src/data.js:RINGS`, `src/soul-ring-vfx.js:buildSlot`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete thin horizontal circular soul-ring artifact with an open center and a perfectly continuous outer silhouette. Obsidian-black jade with restrained violet luminous inlays. Engraved void crescent and serpent scales, narrow inner and outer bands, fine abstract ancient glyph-like ornament, no readable text. Material IDs should distinguish solid rim and emissive grooves; the glowing aura itself will be shader-driven. No person, pedestal or opaque filled disk. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="bone"></a>

## bone

### HB-01 — Linh Nhãn Đầu Cốt

- **Tên file:** `HB-01_linh_nhan_dau_cot.glb`
- **Nơi đặt:** `assets/base_models/HB-01_linh_nhan_dau_cot.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One forehead circlet with an oval spirit-eye jade gem, carved gold side plates and a small rear clasp. Empty wearable interior, no skull or head; gently curved to fit an adult human forehead. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HB-02 — Hộ Tâm Thân Cốt

- **Tên file:** `HB-02_ho_tam_than_cot.glb`
- **Nơi đặt:** `assets/base_models/HB-02_ho_tam_than_cot.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One layered jade and gold heart-protecting chest plate, curved human torso fit with clearly modeled back straps. Empty interior and no torso or person attached. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HB-03 — Thiết Tý Tả Cốt

- **Tên file:** `HB-03_thiet_ty_ta_cot.glb`
- **Nơi đặt:** `assets/base_models/HB-03_thiet_ty_ta_cot.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One LEFT forearm bracer, iron-dark jade with gold strengthening ribs, left-thumb clearance and a visible wrist opening. Anatomical left, not viewer-left; no right-side duplicate or human arm. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HB-04 — Lôi Pháp Hữu Cốt

- **Tên file:** `HB-04_loi_phap_huu_cot.glb`
- **Nơi đặt:** `assets/base_models/HB-04_loi_phap_huu_cot.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One RIGHT forearm bracer, violet-blue lightning inlay on silver-gold metal, right-thumb clearance and a visible wrist opening. Anatomical right, not viewer-right; no human arm. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HB-05 — Phong Hành Tả Cước

- **Tên file:** `HB-05_phong_hanh_ta_cuoc.glb`
- **Nơi đặt:** `assets/base_models/HB-05_phong_hanh_ta_cuoc.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One LEFT shin greave, light jade-green wind-carved overlapping plates, a distinct knee-facing upper edge and ankle clearance. No foot or leg attached; anatomical left. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### HB-06 — Địa Linh Hữu Cước

- **Tên file:** `HB-06_dia_linh_huu_cuoc.glb`
- **Nơi đặt:** `assets/base_models/HB-06_dia_linh_huu_cuoc.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One RIGHT shin greave, ochre stone-metal earth reliefs, strong segmented outer ridge, knee-facing upper edge and ankle clearance. No foot or leg attached; anatomical right. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="external-bone"></a>

## external-bone

### HB-07 — Bát Chu Mâu

- **Tên file:** `HB-07_bat_chu_mau.glb`
- **Nơi đặt:** `assets/base_models/HB-07_bat_chu_mau.glb`
- **Nguồn:** `src/data.js:BONES`, `src/simulation.js:createHero/bones`
- **Lưu ý:** Hồn Cốt là trang bị rời; không đồng nhất với mesh đầu/thân/tay/chân của nhân vật. Điểm gắn cần căn theo nhân vật thật.

**English prompt**

```text
One back-worn Eight Spider Spears harness, compact jade-black central back plate and exactly eight distinct articulated curved spear limbs arranged as four left and four right. Each limb has readable joints and a separate pointed tip; clear gaps between limbs, no fused web, no person, no real spider body. Keep harness, joints and limbs visually separable for later manual part preparation. Carved Eastern celestial ornament with jade, bronze-gold metal and restrained emissive inlaid runes. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="beast"></a>

## beast

### CREATURE-wolf — Thanh Phong Lang

- **Tên file:** `CREATURE-wolf_thanh_phong_lang.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-wolf_thanh_phong_lang.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildwolf`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
agile four-legged green wind spirit wolf with layered fur, distinct thighs and lower legs, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-rhino — Nham Giáp Tê

- **Tên file:** `CREATURE-rhino_nham_giap_te.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-rhino_nham_giap_te.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildrhino`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
massive four-legged rhinoceros with layered rock armor, engraved stone cracks and large horn, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-firebird — Hỏa Linh Điểu

- **Tên file:** `CREATURE-firebird_hoa_linh_dieu.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-firebird_hoa_linh_dieu.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildfirebird`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
small fire phoenix, gold crest, twelve layered feathers on each spread wing and three long flame tail ribbons, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-icebutterfly — Hàn Băng Điệp

- **Tên file:** `CREATURE-icebutterfly_han_bang_diep.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-icebutterfly_han_bang_diep.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildicebutterfly`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
large ice butterfly, open curved translucent blue-white crystal wings with engraved veins, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="mutant-beast"></a>

## mutant-beast

### CREATURE-wolf-mutant — Thanh Phong Lang — Biến Dị

- **Tên file:** `CREATURE-wolf-mutant_thanh_phong_lang_bien_di.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-wolf-mutant_thanh_phong_lang_bien_di.glb`
- **Nguồn:** `src/creature-art.js:addMutant`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Mutated agile four-legged green wind spirit wolf with layered fur, distinct thighs and lower legs, additional horns and intrinsic glowing elemental veins, full body with limbs separated and visible, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-rhino-mutant — Nham Giáp Tê — Biến Dị

- **Tên file:** `CREATURE-rhino-mutant_nham_giap_te_bien_di.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-rhino-mutant_nham_giap_te_bien_di.glb`
- **Nguồn:** `src/creature-art.js:addMutant`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Mutated massive four-legged rhinoceros with layered rock armor, engraved stone cracks and large horn, additional horns and intrinsic glowing elemental veins, full body with limbs separated and visible, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-firebird-mutant — Hỏa Linh Điểu — Biến Dị

- **Tên file:** `CREATURE-firebird-mutant_hoa_linh_dieu_bien_di.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-firebird-mutant_hoa_linh_dieu_bien_di.glb`
- **Nguồn:** `src/creature-art.js:addMutant`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Mutated small fire phoenix, gold crest, twelve layered feathers on each spread wing and three long flame tail ribbons, additional horns and intrinsic glowing elemental veins, full body with limbs separated and visible, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-icebutterfly-mutant — Hàn Băng Điệp — Biến Dị

- **Tên file:** `CREATURE-icebutterfly-mutant_han_bang_diep_bien_di.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-icebutterfly-mutant_han_bang_diep_bien_di.glb`
- **Nguồn:** `src/creature-art.js:addMutant`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
Mutated large ice butterfly, open curved translucent blue-white crystal wings with engraved veins, additional horns and intrinsic glowing elemental veins, full body with limbs separated and visible, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="boss"></a>

## boss

### CREATURE-ape — Thái Nhạc Cự Viên

- **Tên file:** `CREATURE-ape_thai_nhac_cu_vien.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-ape_thai_nhac_cu_vien.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildape`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
towering muscular stone-armored giant ape, large articulated hands, ancient gold rock engravings, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-kirin — Lôi Diễm Kỳ Lân

- **Tên file:** `CREATURE-kirin_loi_diem_ky_lan.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-kirin_loi_diem_ky_lan.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:buildkirin`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
four-legged celestial kirin, branching antlers, gold scales, lightning mane and flame tail, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### CREATURE-dragon — Hư Không Cổ Long

- **Tên file:** `CREATURE-dragon_hu_khong_co_long.glb`
- **Nơi đặt:** `assets/base_models/CREATURE-dragon_hu_khong_co_long.glb`
- **Nguồn:** `src/creature-art.js:buildCreatureVisual`, `src/creature-art.js:builddragon`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
complete long void dragon with two articulated wings, four clawed legs, horned head and long curled tail, full body reference with all limbs visible and separated from body, no ground plinth. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="environment-prop"></a>

## environment-prop

### ENV-sanctuary-dais — Bệ xuất chiến bạch ngọc

- **Tên file:** `ENV-sanctuary-dais_be_xuat_chien_bach_ngoc.glb`
- **Nơi đặt:** `assets/base_models/ENV-sanctuary-dais_be_xuat_chien_bach_ngoc.glb`
- **Nguồn:** `src/scenery.js:createSanctuary`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
three-tier round white jade ceremonial dais with carved cloud relief and gilded rims. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-sanctuary-pillar — Trụ rồng sảnh

- **Tên file:** `ENV-sanctuary-pillar_tru_rong_sanh.glb`
- **Nơi đặt:** `assets/base_models/ENV-sanctuary-pillar_tru_rong_sanh.glb`
- **Nguồn:** `src/scenery.js:createSanctuary`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one tall jade pillar with a carved gold dragon coiled around it, dragon head and small lamp crown. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-sanctuary-arch — Cổng vòm sảnh

- **Tên file:** `ENV-sanctuary-arch_cong_vom_sanh.glb`
- **Nơi đặt:** `assets/base_models/ENV-sanctuary-arch_cong_vom_sanh.glb`
- **Nguồn:** `src/scenery.js:createSanctuary`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
large carved jade and gold semicircular arch with two complete side posts. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-mountain-backdrop — Núi nền sảnh

- **Tên file:** `ENV-mountain-backdrop_nui_nen_sanh.glb`
- **Nơi đặt:** `assets/base_models/ENV-mountain-backdrop_nui_nen_sanh.glb`
- **Nguồn:** `src/scenery.js:createSanctuary`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one rocky ancient mountain peak with mist-worn ridges, no sky or clouds. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-portal-base — Đế Cổng Hồi Hoàn

- **Tên file:** `ENV-portal-base_de_cong_hoi_hoan.glb`
- **Nơi đặt:** `assets/base_models/ENV-portal-base_de_cong_hoi_hoan.glb`
- **Nguồn:** `src/scenery.js:createPortal`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
three-tier octagonal stone portal base, carved yin-yang and ancient glyph relief. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-portal-pillar — Trụ Cổng Hồi Hoàn

- **Tên file:** `ENV-portal-pillar_tru_cong_hoi_hoan.glb`
- **Nơi đặt:** `assets/base_models/ENV-portal-pillar_tru_cong_hoi_hoan.glb`
- **Nguồn:** `src/scenery.js:createPortal`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one curved stone dragon pillar engraved with Sanskrit-like runes, curved inward near the top. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-portal-ring — Vành Cổng Hồi Hoàn

- **Tên file:** `ENV-portal-ring_vanh_cong_hoi_hoan.glb`
- **Nơi đặt:** `assets/base_models/ENV-portal-ring_vanh_cong_hoi_hoan.glb`
- **Nguồn:** `src/scenery.js:createPortal`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one large complete bronze spatial portal ring, carved gold ancient rune bands, open empty center. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-portal-lamp — Đèn Cổng Hồi Hoàn

- **Tên file:** `ENV-portal-lamp_den_cong_hoi_hoan.glb`
- **Nơi đặt:** `assets/base_models/ENV-portal-lamp_den_cong_hoi_hoan.glb`
- **Nguồn:** `src/scenery.js:createPortal`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one jade stone and gold carved spirit-fire brazier with an open bowl. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-shop-pavilion — Đình Đài Giao Dịch

- **Tên file:** `ENV-shop-pavilion_dinh_dai_giao_dich.glb`
- **Nơi đặt:** `assets/base_models/ENV-shop-pavilion_dinh_dai_giao_dich.glb`
- **Nguồn:** `src/scenery.js:createShop`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
complete eight-column Chinese pavilion with curved glazed green roof, red gold timber columns, no people. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-shop-lantern — Đèn lồng giao dịch

- **Tên file:** `ENV-shop-lantern_den_long_giao_dich.glb`
- **Nơi đặt:** `assets/base_models/ENV-shop-lantern_den_long_giao_dich.glb`
- **Nguồn:** `src/scenery.js:lantern`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one hanging red silk lantern with gold endcaps and tassel. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-shop-cauldron — Lò luyện đan

- **Tên file:** `ENV-shop-cauldron_lo_luyen_dan.glb`
- **Nơi đặt:** `assets/base_models/ENV-shop-cauldron_lo_luyen_dan.glb`
- **Nguồn:** `src/scenery.js:createShop`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one engraved bronze three-legged alchemy cauldron with ornate handles and open bowl. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-shop-signboard — Biển giao dịch

- **Tên file:** `ENV-shop-signboard_bien_giao_dich.glb`
- **Nơi đặt:** `assets/base_models/ENV-shop-signboard_bien_giao_dich.glb`
- **Nguồn:** `src/scenery.js:createShop`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one wooden gold-edged hanging signboard with carved cloud relief, no readable text. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-altar-base — Tế Đàn Hồn Hoàn

- **Tên file:** `ENV-altar-base_te_dan_hon_hoan.glb`
- **Nơi đặt:** `assets/base_models/ENV-altar-base_te_dan_hon_hoan.glb`
- **Nguồn:** `src/scenery.js:createAltar`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
nine-sided ancient stone altar with nine carved channels converging on a central crystal pedestal. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-altar-crystal — Huyết Tinh Thạch

- **Tên file:** `ENV-altar-crystal_huyet_tinh_thach.glb`
- **Nơi đặt:** `assets/base_models/ENV-altar-crystal_huyet_tinh_thach.glb`
- **Nguồn:** `src/scenery.js:createAltar`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one floating red faceted soul crystal with a carved gold setting. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-central-plaza — Đài Bát Quái trung tâm

- **Tên file:** `ENV-central-plaza_dai_bat_quai_trung_tam.glb`
- **Nơi đặt:** `assets/base_models/ENV-central-plaza_dai_bat_quai_trung_tam.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
flat circular white jade plaza with carved eight-trigram inlaid gold channels and concentric cloud relief. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-forest-tree — Cây cổ lâm

- **Tên file:** `ENV-forest-tree_cay_co_lam.glb`
- **Nơi đặt:** `assets/base_models/ENV-forest-tree_cay_co_lam.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one complete ancient jade-green broadleaf tree with exposed curved roots, tall branching trunk and dense layered canopy. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-snow-tree — Cây tuyết

- **Tên file:** `ENV-snow-tree_cay_tuyet.glb`
- **Nơi đặt:** `assets/base_models/ENV-snow-tree_cay_tuyet.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one complete snow-covered alpine spirit pine with visible brown trunk and branching foliage. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-dead-tree — Cây độc trạch

- **Tên file:** `ENV-dead-tree_cay_doc_trach.glb`
- **Nơi đặt:** `assets/base_models/ENV-dead-tree_cay_doc_trach.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one twisted bare dead tree with purple-black damp bark and exposed roots. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-rock-cluster — Cụm đá

- **Tên file:** `ENV-rock-cluster_cum_da.glb`
- **Nơi đặt:** `assets/base_models/ENV-rock-cluster_cum_da.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one cluster of irregular gray-gold slate rocks with natural rough faces and moss cracks. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-void-crystal — Tinh thể hư không

- **Tên file:** `ENV-void-crystal_tinh_the_hu_khong.glb`
- **Nơi đặt:** `assets/base_models/ENV-void-crystal_tinh_the_hu_khong.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one cluster of tall irregular violet crystals growing out of dark stone. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-nav-monolith — Chướng ngại cổ thạch

- **Tên file:** `ENV-nav-monolith_chuong_ngai_co_thach.glb`
- **Nơi đặt:** `assets/base_models/ENV-nav-monolith_chuong_ngai_co_thach.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one tall carved irregular stone monolith with three inset ancient rune bands. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-grass-patch — Bụi cỏ ẩn thân

- **Tên file:** `ENV-grass-patch_bui_co_an_than.glb`
- **Nơi đặt:** `assets/base_models/ENV-grass-patch_bui_co_an_than.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one small rooted patch of curved fine jade-green grass blades, no pot, no ground square. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-spirit-flower — Linh thảo

- **Tên file:** `ENV-spirit-flower_linh_thao.glb`
- **Nơi đặt:** `assets/base_models/ENV-spirit-flower_linh_thao.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one small rooted jade spirit flower cluster with luminous blossoms and detailed leaves. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-ore — Quặng linh kim

- **Tên file:** `ENV-ore_quang_linh_kim.glb`
- **Nơi đặt:** `assets/base_models/ENV-ore_quang_linh_kim.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one rough gray stone ore cluster with exposed sparkling gold veins. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-lava-column — Cột đá núi lửa

- **Tên file:** `ENV-lava-column_cot_da_nui_lua.glb`
- **Nơi đặt:** `assets/base_models/ENV-lava-column_cot_da_nui_lua.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one fractured dark volcanic rock column with intrinsic orange lava cracks. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-hidden-island — Đảo Bí Cảnh

- **Tên file:** `ENV-hidden-island_dao_bi_canh.glb`
- **Nơi đặt:** `assets/base_models/ENV-hidden-island_dao_bi_canh.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one complete floating dark crystalline island, rocky underside and flat irregular upper surface. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-hidden-crystal — Tinh thể đảo Bí Cảnh

- **Tên file:** `ENV-hidden-crystal_tinh_the_dao_bi_canh.glb`
- **Nơi đặt:** `assets/base_models/ENV-hidden-crystal_tinh_the_dao_bi_canh.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one large dark violet irregular crystal formation. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-petal — Cánh hoa sảnh

- **Tên file:** `ENV-petal_canh_hoa_sanh.glb`
- **Nơi đặt:** `assets/base_models/ENV-petal_canh_hoa_sanh.glb`
- **Nguồn:** `src/scenery.js:createSanctuary`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one curled pink silk-like flower petal, thin detailed translucent edges. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-poison-bubble — Bọt độc

- **Tên file:** `ENV-poison-bubble_bot_doc.glb`
- **Nơi đặt:** `assets/base_models/ENV-poison-bubble_bot_doc.glb`
- **Nguồn:** `src/scenery.js:createScenery`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one translucent purple poison bubble with iridescent wet surface, isolated. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="terrain"></a>

## terrain

### ENV-terrain-1 — Thanh Mộc Cổ Lâm

- **Tên file:** `ENV-terrain-1_thanh_moc_co_lam.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-1_thanh_moc_co_lam.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Thanh Mộc Cổ Lâm, dark jade grass, exposed roots and small spirit flowers, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-2 — Chấn Nhạc Sơn Mạch

- **Tên file:** `ENV-terrain-2_chan_nhac_son_mach.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-2_chan_nhac_son_mach.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Chấn Nhạc Sơn Mạch, rough gray gold slate with ore veins, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-3 — U Minh Độc Trạch

- **Tên file:** `ENV-terrain-3_u_minh_doc_trach.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-3_u_minh_doc_trach.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for U Minh Độc Trạch, wet black purple swamp mud and luminous mushrooms, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-4 — Hàn Tinh Tuyết Vực

- **Tên file:** `ENV-terrain-4_han_tinh_tuyet_vuc.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-4_han_tinh_tuyet_vuc.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Hàn Tinh Tuyết Vực, white snow with cracked blue ice, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-5 — Xích Diệm Hoang Mạc

- **Tên file:** `ENV-terrain-5_xich_diem_hoang_mac.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-5_xich_diem_hoang_mac.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Xích Diệm Hoang Mạc, fractured black volcanic stone with orange lava cracks, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-6 — Thiên Cơ Cổ Thành

- **Tên file:** `ENV-terrain-6_thien_co_co_thanh.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-6_thien_co_co_thanh.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Thiên Cơ Cổ Thành, white jade paving with engraved cloud dragon and gold inlay, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-terrain-7 — Hư Không Bí Cảnh

- **Tên file:** `ENV-terrain-7_hu_khong_bi_canh.glb`
- **Nơi đặt:** `assets/base_models/ENV-terrain-7_hu_khong_bi_canh.glb`
- **Nguồn:** `src/scenery.js:createScenery/sceneryTerrainHeight`, `src/data.js:REGIONS`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One complete flat-edged square terrain tile for Hư Không Bí Cảnh, violet crystalline void stone, detailed surface relief, no buildings, no characters. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="world-prop"></a>

## world-prop

### WORLD-companion — Hồn Linh đồng hành

- **Tên file:** `WORLD-companion_hon_linh_dong_hanh.glb`
- **Nơi đặt:** `assets/base_models/WORLD-companion_hon_linh_dong_hanh.glb`
- **Nguồn:** `src/world.js:renderCompanion`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
small floating jade-blue spirit creature with detailed translucent body and luminous markings. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### WORLD-loot-container — Vật chứa chiến lợi phẩm

- **Tên file:** `WORLD-loot-container_vat_chua_chien_loi_pham.glb`
- **Nơi đặt:** `assets/base_models/WORLD-loot-container_vat_chua_chien_loi_pham.glb`
- **Nguồn:** `src/world.js:renderDrops`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
small carved gold and jade loot casket, complete closed box with ornate lock. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="effect-carrier"></a>

## effect-carrier

### VFX-H01-projectile — Đạn Mộc

- **Tên file:** `VFX-H01-projectile_dan_moc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-projectile_dan_moc.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for jade green wood, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-projectile — Đạn Thổ

- **Tên file:** `VFX-H02-projectile_dan_tho.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-projectile_dan_tho.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for ochre gold earth, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-projectile — Đạn Phong

- **Tên file:** `VFX-H03-projectile_dan_phong.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-projectile_dan_phong.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for mint jade wind, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-projectile — Đạn Lôi

- **Tên file:** `VFX-H04-projectile_dan_loi.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-projectile_dan_loi.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for blue violet lightning, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-projectile — Đạn Quang

- **Tên file:** `VFX-H05-projectile_dan_quang.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-projectile_dan_quang.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for pearl gold light, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-projectile — Đạn Thủy

- **Tên file:** `VFX-H06-projectile_dan_thuy.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-projectile_dan_thuy.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for deep cyan water, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-projectile — Đạn Hỏa

- **Tên file:** `VFX-H07-projectile_dan_hoa.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-projectile_dan_hoa.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for vermilion orange fire, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-projectile — Đạn Băng

- **Tên file:** `VFX-H08-projectile_dan_bang.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-projectile_dan_bang.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for pale blue ice, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-projectile — Đạn Ám

- **Tên file:** `VFX-H09-projectile_dan_am.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-projectile_dan_am.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for indigo silver shadow, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-projectile — Đạn Kim

- **Tên file:** `VFX-H10-projectile_dan_kim.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-projectile_dan_kim.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for warm metallic gold, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-projectile — Đạn Âm Luật

- **Tên file:** `VFX-H11-projectile_dan_am_luat.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-projectile_dan_am_luat.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for jade green celestial music, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-projectile — Đạn Độc

- **Tên file:** `VFX-H12-projectile_dan_doc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-projectile_dan_doc.glb`
- **Nguồn:** `src/world.js:renderProjectiles/spawnParticles`, `src/environment-vfx.js`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
One compact tangible basic-attack projectile carrier for violet black poison and void, a clearly modeled pointed spirit shard with fine carved channels, a readable leading tip and tapered tail; intrinsic emissive grooves only, no baked motion trail, particles or background smoke. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="shader-surface"></a>

## shader-surface

### ENV-liquid-water — Mặt nước độc

- **Tên file:** `ENV-liquid-water_mat_nuoc_doc.glb`
- **Nơi đặt:** `assets/base_models/ENV-liquid-water_mat_nuoc_doc.glb`
- **Nguồn:** `src/scenery.js:ribbonSurface/liquidMaterial`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one thin flat translucent purple reflective water tile. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-liquid-lava — Mặt dung nham

- **Tên file:** `ENV-liquid-lava_mat_dung_nham.glb`
- **Nơi đặt:** `assets/base_models/ENV-liquid-lava_mat_dung_nham.glb`
- **Nguồn:** `src/scenery.js:ribbonSurface/liquidMaterial`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one flat fractured glowing orange lava tile. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### ENV-liquid-ice — Mặt băng

- **Tên file:** `ENV-liquid-ice_mat_bang.glb`
- **Nơi đặt:** `assets/base_models/ENV-liquid-ice_mat_bang.glb`
- **Nguồn:** `src/scenery.js:ribbonSurface/liquidMaterial`
- **Lưu ý:** Brief mỹ thuật dựa trên thực thể trong mã nguồn; không thay đổi luật gameplay.

**English prompt**

```text
one thin cracked translucent blue ice tile. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

<a id="skill-vfx-prop"></a>

## skill-vfx-prop

### VFX-H01-Q — Lâm Dật — Q: Đằng Tiên

- **Tên file:** `VFX-H01-Q_dang_tien.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-Q_dang_tien.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=7m, radius=1m.

**English prompt**

```text
Create a tapered coiling thornless living-vine lash with small jade leaves and gold sap grooves, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H01-W — Lâm Dật — W: Mộc Phược

- **Tên file:** `VFX-H01-W_moc_phuoc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-W_moc_phuoc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=6m, radius=1.8m.

**English prompt**

```text
Create a low open ring of interwoven living roots with distinct upward binding tendrils, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H01-E — Lâm Dật — E: Sinh Trưởng

- **Tên file:** `VFX-H01-E_sinh_truong.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-E_sinh_truong.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=5m, radius=3.2m.

**English prompt**

```text
Create a low lotus-and-root growth cluster with open central ground area, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H01-R — Lâm Dật — R: Vạn Đằng Ngục

- **Tên file:** `VFX-H01-R_van_dang_nguc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-R_van_dang_nguc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=7m, radius=4m.

**English prompt**

```text
Create an open radial cage of tall interlaced vines, clear center and separated curling vine walls, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H01-F — Lâm Dật — F: Linh Bộ

- **Tên file:** `VFX-H01-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H01-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone jade green wood skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-Q — Hàn Trạch — Q: Phá Nham

- **Tên file:** `VFX-H02-Q_pha_nham.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-Q_pha_nham.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`cone`, cast range=3m, radius=3m.

**English prompt**

```text
Create a broad fan-shaped stone shockwave crest made from layered chipped slate plates, a standalone ochre gold earth skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-W — Hàn Trạch — W: Thiết Sơn Bộ

- **Tên file:** `VFX-H02-W_thiet_son_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-W_thiet_son_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`shield`, cast range=4m, radius=0m.

**English prompt**

```text
Create a compact forward-driving mountain crest shield with cracked jade-metal plates, a standalone ochre gold earth skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-E — Hàn Trạch — E: Địa Liệt

- **Tên file:** `VFX-H02-E_dia_liet.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-E_dia_liet.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`cone`, cast range=5m, radius=5m.

**English prompt**

```text
Create a shallow fan-shaped ground fracture with raised broken stone ridges, a standalone ochre gold earth skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-R — Hàn Trạch — R: Sơn Hà Chấn

- **Tên file:** `VFX-H02-R_son_ha_chan.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-R_son_ha_chan.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=4m, radius=4m.

**English prompt**

```text
Create a circular broken-rock impact crown with staggered stone slabs and an empty center, a standalone ochre gold earth skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H02-F — Hàn Trạch — F: Linh Bộ

- **Tên file:** `VFX-H02-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H02-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone ochre gold earth skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-Q — Ly Sa — Q: Ảnh Trảm

- **Tên file:** `VFX-H03-Q_anh_tram.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-Q_anh_tram.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=4.5m, radius=1m.

**English prompt**

```text
Create a thin reverse-crescent wind slash with two tapered jade-silver blade ribbons, a standalone mint jade wind skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-W — Ly Sa — W: Hồ Ảnh

- **Tên file:** `VFX-H03-W_ho_anh.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-W_ho_anh.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`clone`, cast range=0m, radius=0m.

**English prompt**

```text
Create a small translucent fox spirit mask and tail-wisp token; full humanoid clones must reuse the H03 body mesh, a standalone mint jade wind skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This prop is only a summon marker; the full humanoid duplicate reuses the matching H03 character asset. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-E — Ly Sa — E: Tàng Phong

- **Tên file:** `VFX-H03-E_tang_phong.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-E_tang_phong.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`stealth`, cast range=0m, radius=0m.

**English prompt**

```text
Create a slender open spiral wind-wisp ribbon with a fox-tail taper, a standalone mint jade wind skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-R — Ly Sa — R: Cửu Ảnh Sát

- **Tên file:** `VFX-H03-R_cuu_anh_sat.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-R_cuu_anh_sat.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`target`, cast range=5m, radius=1m.

**English prompt**

```text
Create a set of nine short separated crescent slash blades arranged around an open center, a standalone mint jade wind skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H03-F — Ly Sa — F: Linh Bộ

- **Tên file:** `VFX-H03-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H03-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone mint jade wind skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-Q — Kỳ Vân — Q: Lôi Vũ

- **Tên file:** `VFX-H04-Q_loi_vu.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-Q_loi_vu.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=8m, radius=1m.

**English prompt**

```text
Create a pointed lightning feather dart with a blue-violet crystal core, a standalone blue violet lightning skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-W — Kỳ Vân — W: Điện Liên

- **Tên file:** `VFX-H04-W_dien_lien.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-W_dien_lien.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`chain`, cast range=6m, radius=4m.

**English prompt**

```text
Create a short branched lightning link with a clear central conductor and three forked arms, a standalone blue violet lightning skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-E — Kỳ Vân — E: Lôi Dực

- **Tên file:** `VFX-H04-E_loi_duc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-E_loi_duc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=4m, radius=2m.

**English prompt**

```text
Create a matched pair of swept lightning-feather winglets, separate from the body, a standalone blue violet lightning skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-R — Kỳ Vân — R: Thiên Lôi Vực

- **Tên file:** `VFX-H04-R_thien_loi_vuc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-R_thien_loi_vuc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=7m, radius=4.5m.

**English prompt**

```text
Create a low circular thunder sigil rim with upright lightning crystal fins and a clear center, a standalone blue violet lightning skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H04-F — Kỳ Vân — F: Linh Bộ

- **Tên file:** `VFX-H04-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H04-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone blue violet lightning skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-Q — Tịch Dao — Q: Kính Quang Phá

- **Tên file:** `VFX-H05-Q_kinh_quang_pha.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-Q_kinh_quang_pha.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=7m, radius=1m.

**English prompt**

```text
Create a narrow moon-mirror light lance with a silver crystal head and gold rim fragments, a standalone pearl gold light skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-W — Tịch Dao — W: Hộ Kính

- **Tên file:** `VFX-H05-W_ho_kinh.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-W_ho_kinh.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`shield`, cast range=6m, radius=0m.

**English prompt**

```text
Create a thin curved translucent mirror shield panel with a complete engraved gold border, a standalone pearl gold light skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-E — Tịch Dao — E: Linh Chiếu

- **Tên file:** `VFX-H05-E_linh_chieu.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-E_linh_chieu.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`reveal`, cast range=10m, radius=10m.

**English prompt**

```text
Create a floating open celestial eye frame with a clear central aperture and concentric mirror arcs, a standalone pearl gold light skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. The eye/lens ornament is cosmetic; visibility radius and reveal rules remain controlled by gameplay code. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-R — Tịch Dao — R: Kính Giới

- **Tên file:** `VFX-H05-R_kinh_gioi.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-R_kinh_gioi.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`protect`, cast range=0m, radius=4m.

**English prompt**

```text
Create an open moon-mirror sanctuary ring with four separated thin curved shield panels, a standalone pearl gold light skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H05-F — Tịch Dao — F: Linh Bộ

- **Tên file:** `VFX-H05-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H05-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone pearl gold light skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-Q — Đỗ Kình — Q: Quy Thuẫn Kích

- **Tên file:** `VFX-H06-Q_quy_thuan_kich.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-Q_quy_thuan_kich.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`cone`, cast range=2.5m, radius=2.5m.

**English prompt**

```text
Create a short heavy turtle-shell impact crest with a wedge-shaped water edge, a standalone deep cyan water skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-W — Đỗ Kình — W: Thiết Giáp

- **Tên file:** `VFX-H06-W_thiet_giap.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-W_thiet_giap.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`armor`, cast range=0m, radius=0m.

**English prompt**

```text
Create a single wearable-looking hexagonal armor aura plate, no person inside, a standalone deep cyan water skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-E — Đỗ Kình — E: Trấn Địa

- **Tên file:** `VFX-H06-E_tran_dia.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-E_tran_dia.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=0m, radius=3m.

**English prompt**

```text
Create a circular shallow ground shockwave rim with turtle-shell stone fragments, a standalone deep cyan water skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-R — Đỗ Kình — R: Huyền Giáp Trận

- **Tên file:** `VFX-H06-R_huyen_giap_tran.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-R_huyen_giap_tran.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`protect`, cast range=0m, radius=4m.

**English prompt**

```text
Create an open hexagonal turtle ward perimeter with six low shield plates and clear central play space, a standalone deep cyan water skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H06-F — Đỗ Kình — F: Linh Bộ

- **Tên file:** `VFX-H06-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H06-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone deep cyan water skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-Q — Vân Chước — Q: Viêm Liên

- **Tên file:** `VFX-H07-Q_viem_lien.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-Q_viem_lien.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=7m, radius=1m.

**English prompt**

```text
Create a streamlined eight-petal flame lotus projectile with a coherent central ember core, a standalone vermilion orange fire skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-W — Vân Chước — W: Liên Bạo

- **Tên file:** `VFX-H07-W_lien_bao.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-W_lien_bao.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=6m, radius=2.5m.

**English prompt**

```text
Create a blooming lotus explosion crown made from distinct red-gold petals, open center, a standalone vermilion orange fire skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-E — Vân Chước — E: Hỏa Ảnh

- **Tên file:** `VFX-H07-E_hoa_anh.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-E_hoa_anh.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=3.5m, radius=1.6m.

**English prompt**

```text
Create one curved fire-lotus afterimage ribbon with a solid thin petal-like surface, a standalone vermilion orange fire skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-R — Vân Chước — R: Xích Diệm Thiên Hoa

- **Tên file:** `VFX-H07-R_xich_diem_thien_hoa.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-R_xich_diem_thien_hoa.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=7m, radius=4.5m.

**English prompt**

```text
Create a large open lotus altar-like floral fire crown with layered raised petal blades, a standalone vermilion orange fire skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H07-F — Vân Chước — F: Linh Bộ

- **Tên file:** `VFX-H07-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H07-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone vermilion orange fire skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-Q — Sở Băng Nghi — Q: Băng Tiễn

- **Tên file:** `VFX-H08-Q_bang_tien.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-Q_bang_tien.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=8m, radius=1m.

**English prompt**

```text
Create one pointed ice arrow with a crystal butterfly-wing tail and sharp pale blue facets, a standalone pale blue ice skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-W — Sở Băng Nghi — W: Hàn Vực

- **Tên file:** `VFX-H08-W_han_vuc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-W_han_vuc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=6m, radius=3m.

**English prompt**

```text
Create a low circular frost rim with shallow ice crystals and an unobstructed center, a standalone pale blue ice skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-E — Sở Băng Nghi — E: Điệp Vũ

- **Tên file:** `VFX-H08-E_diep_vu.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-E_diep_vu.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=3.5m, radius=1m.

**English prompt**

```text
Create one matching pair of small ice butterfly spirit wings with four separated lobes, a standalone pale blue ice skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-R — Sở Băng Nghi — R: Tuyết Điệp Phong Tỏa

- **Tên file:** `VFX-H08-R_tuyet_diep_phong_toa.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-R_tuyet_diep_phong_toa.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=7m, radius=4m.

**English prompt**

```text
Create an open radial crystal butterfly prison ring with distinct wing-shaped ice pillars, a standalone pale blue ice skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H08-F — Sở Băng Nghi — F: Linh Bộ

- **Tên file:** `VFX-H08-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H08-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone pale blue ice skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-Q — Mặc Tinh — Q: Nguyệt Tiễn

- **Tên file:** `VFX-H09-Q_nguyet_tien.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-Q_nguyet_tien.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=11m, radius=1m.

**English prompt**

```text
Create one narrow crescent-tipped moon arrow with violet crystal fletching, a standalone indigo silver shadow skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-W — Mặc Tinh — W: Tinh Nhãn

- **Tên file:** `VFX-H09-W_tinh_nhan.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-W_tinh_nhan.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`reveal`, cast range=13m, radius=4.5m.

**English prompt**

```text
Create one floating star-eye lens frame and four separated small constellation crystal points, a standalone indigo silver shadow skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. The eye/lens ornament is cosmetic; visibility radius and reveal rules remain controlled by gameplay code. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-E — Mặc Tinh — E: Ảnh Bộ

- **Tên file:** `VFX-H09-E_anh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-E_anh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=3.5m, radius=0m.

**English prompt**

```text
Create one elongated violet crescent shadow ribbon with a tapered tail, a standalone indigo silver shadow skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-R — Mặc Tinh — R: Vạn Tiễn Tinh Hà

- **Tên file:** `VFX-H09-R_van_tien_tinh_ha.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-R_van_tien_tinh_ha.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=12m, radius=4m.

**English prompt**

```text
Create a group of separated downward-pointing star arrowheads arranged above an open circular constellation rim, a standalone indigo silver shadow skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H09-F — Mặc Tinh — F: Linh Bộ

- **Tên file:** `VFX-H09-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H09-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone indigo silver shadow skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-Q — Thiên Lạc — Q: Hổ Trảo Liên Kích

- **Tên file:** `VFX-H10-Q_ho_trao_lien_kich.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-Q_ho_trao_lien_kich.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`cone`, cast range=2.5m, radius=2.5m.

**English prompt**

```text
Create one compact triple-sweep tiger claw slash cluster with four clear claw grooves, a standalone warm metallic gold skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-W — Thiên Lạc — W: Kim Cốt

- **Tên file:** `VFX-H10-W_kim_cot.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-W_kim_cot.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`shield`, cast range=0m, radius=0m.

**English prompt**

```text
Create one raised gold tiger-bone shield plate with a luminous jade seam, a standalone warm metallic gold skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. This is an empty defensive carrier with no character inside; shader transparency and protection timing are configured in game. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-E — Thiên Lạc — E: Hổ Bộ

- **Tên file:** `VFX-H10-E_ho_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-E_ho_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=4.5m, radius=1.5m.

**English prompt**

```text
Create one low circular tiger-paw landing impact rim, no animal body, a standalone warm metallic gold skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-R — Thiên Lạc — R: Hổ Vương Nộ

- **Tên file:** `VFX-H10-R_ho_vuong_no.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-R_ho_vuong_no.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`rage`, cast range=0m, radius=0m.

**English prompt**

```text
Create one open roaring tiger spirit crest frame, gold engraved mane and clear central aperture, not a full replacement character, a standalone warm metallic gold skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H10-F — Thiên Lạc — F: Linh Bộ

- **Tên file:** `VFX-H10-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H10-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone warm metallic gold skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-Q — Ninh Từ — Q: Âm Nhận

- **Tên file:** `VFX-H11-Q_am_nhan.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-Q_am_nhan.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=7m, radius=1m.

**English prompt**

```text
Create one thin crescent musical sound blade with jade-gold engraved string-wave lines, a standalone jade green celestial music skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-W — Ninh Từ — W: Thanh Tâm

- **Tên file:** `VFX-H11-W_thanh_tam.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-W_thanh_tam.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`heal`, cast range=6m, radius=1m.

**English prompt**

```text
Create one open jade healing chime blossom with delicate silver sound-wave arcs, a standalone jade green celestial music skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-E — Ninh Từ — E: Hòa Âm Khúc

- **Tên file:** `VFX-H11-E_hoa_am_khuc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-E_hoa_am_khuc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=6m, radius=3m.

**English prompt**

```text
Create one low circular acoustic ripple ornament with three concentric separated jade wave bands, a standalone jade green celestial music skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-R — Ninh Từ — R: Cửu Âm Trận

- **Tên file:** `VFX-H11-R_cuu_am_tran.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-R_cuu_am_tran.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`healzone`, cast range=0m, radius=4m.

**English prompt**

```text
Create one open nine-note celestial music array rim with distinct jade-gold resonance fins, a standalone jade green celestial music skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H11-F — Ninh Từ — F: Linh Bộ

- **Tên file:** `VFX-H11-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H11-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone jade green celestial music skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-Q — Tạ Uyên — Q: Xà Ảnh

- **Tên file:** `VFX-H12-Q_xa_anh.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-Q_xa_anh.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`line`, cast range=7m, radius=1m.

**English prompt**

```text
Create one streamlined spectral serpent dart with a violet jade head and tapered engraved body, a standalone violet black poison and void skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-W — Tạ Uyên — W: Hư Trói

- **Tên file:** `VFX-H12-W_hu_troi.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-W_hu_troi.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`circle`, cast range=6m, radius=1.8m.

**English prompt**

```text
Create one shallow open serpent snare loop with two distinct coiling tails and a clear target center, a standalone violet black poison and void skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-E — Tạ Uyên — E: Hư Bộ

- **Tên file:** `VFX-H12-E_hu_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-E_hu_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=4m, radius=2m.

**English prompt**

```text
Create one elongated broken violet serpent-scale displacement ribbon, a standalone violet black poison and void skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-R — Tạ Uyên — R: U Minh Xà Vực

- **Tên file:** `VFX-H12-R_u_minh_xa_vuc.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-R_u_minh_xa_vuc.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`zone`, cast range=7m, radius=4.5m.

**English prompt**

```text
Create one open circular void-serpent ward rim with coiling dark jade serpents and separated raised heads, a standalone violet black poison and void skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Horizontal ground-effect arrangement with a clear central opening, local center at the intended ground origin, decorative height kept low; do not add a solid raised floor covering targets. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

### VFX-H12-F — Tạ Uyên — F: Linh Bộ

- **Tên file:** `VFX-H12-F_linh_bo.glb`
- **Nơi đặt:** `assets/base_models/VFX-H12-F_linh_bo.glb`
- **Nguồn:** `src/data.js:SKILLS`, `src/simulation.js:cast`, `src/skill-projection.js`, `src/environment-vfx.js`
- **Lưu ý:** Model vật mang VFX mới cho kỹ năng đã có; không phải bằng chứng mã đang có model riêng cho mỗi chiêu. Giữ shader/hạt/animation và hình học hitbox theo code.
- **Đối chiếu code (không bake vào mesh):** shape=`dash`, cast range=2.8m, radius=0m.

**English prompt**

```text
Create one short swept arc of elemental spirit ribbons with separated tapering shard tips, a standalone violet black poison and void skill-effect mesh carrier for a stylized Eastern xianxia mobile MOBA. A tangible sculpted mesh, not a screenshot of a spell: readable separated layers, thin but nonzero thickness, tidy silhouette, high-detail carved elemental veins and distinct material regions for albedo, metallic/roughness and restrained emission. Local forward direction along +Z for directional assets, centered attachment origin for self buffs; allow orientation correction during Blender import. Use normalized mesh dimensions so the game can scale to the exact existing cast range and radius; do not bake range rings, damage numbers, animation frames, smoke volumes or moving particles into geometry. Dash trail only, no full humanoid ghost, landing platform or teleport gate. Oriental high-fantasy xianxia mobile MOBA game art, coherent stylized realism with elegant readable shapes rather than photorealistic noise. Fully isolated asset, clean solid white background, entire object visible, centered composition with generous margins. Detailed UV-mapped PBR surfaces with physically plausible albedo, metallic and roughness variation; separate emissive accents where supported. Clear material boundaries, coherent geometry from front, sides and back, no baked directional lighting or cast shadows, no ground plane, no scenery, no text, no watermark, no UI.
```

**Negative prompt**

```text
No cropped head, feet, wings or weapon tips; no extra limbs or fingers, fused hands, merged legs, duplicate faces, melted anatomy, floating identification labels, unrelated objects, diorama base, black stripe across the face, painted hair over the eyes, exaggerated bloom, opaque smoke cloud, baked attack trails or attached weapons on character bodies.
```

## 36 nhánh tiến hóa — tái sử dụng model, không đổi gameplay

Các nhánh hiện thay modifier/hiệu ứng; không có dữ liệu khẳng định cần 36 cơ thể khác. Dùng thân/vũ khí gốc, đổi VFX/material ở runtime hoặc tạo carrier biến thể nếu thật sự cần. Mô tả gameplay gốc để đối chiếu, không đưa chỉ số vào hình học:

| ID | Nhánh | Dữ liệu nguồn |
| --- | --- | --- |
| H01-B1 | Mộc Phược | Q chậm 25%/1,5s; W trói 1,45s; R tường 3s. Q/W/R −8% sát thương. |
| H01-B2 | Huyết Đằng | Q/E độc 18+12% HC mỗi giây/3s, giảm hồi 25%. W đổi thành chậm 45%/1,5s. |
| H01-B3 | Linh Sinh | Q tạo khiên 65+25% HC; E hồi 28+15% HC/s. Q −1m; R +10s CD. |
| H02-B1 | Phá Sơn | Q +22% mục tiêu đầu; R phá 25% giáp/4s. Khiên W −30%. |
| H02-B2 | Trấn Địa | E/R +25% vùng; E chậm 40%/2,5s. Q/R −12%. |
| H02-B3 | Cuồng Chấn | Nội tại 3 tầng, nổ giảm Q/W 1,5s. Q −10%; Giáp −5. |
| H03-B1 | Ảnh Sát | Thoát E đánh thêm 45+35% VL; R +18% khi địch <50% HP. HP −6%; Giáp −4. |
| H03-B2 | Phong Bộ | Q +1m; hạ/hỗ trợ làm mới E; E tốc +28%. R −15%. |
| H03-B3 | Huyễn Hồ | W hai phân thân, bị phá nổ 70+40% VL/mù 0,8s. VL −8%. |
| H04-B1 | Lôi Kích | Q tốc đạn +25%, sát thương +20%; nội tại 2 tầng. W 2 mục tiêu, lan 2,8m. |
| H04-B2 | Phong Lôi | E giảm Q 2s; tốc +15%/2s. Q/R −10%. |
| H04-B3 | Lôi Võng | W 5 mục tiêu; R 5,5m chậm 15%. R −12%. |
| H05-B1 | Hộ Linh | W khiên +25%; R giảm ST 18%, hồi 20 HP/s. Q −20%. |
| H05-B2 | Thiên Nhãn | E 15m/4,5s, CD −3s; lộ diện nhận +6% ST. W −15%. |
| H05-B3 | Phản Quang | W phản 35% đạn đầu trong 1,2s. R còn 3,8s. |
| H06-B1 | Thiết Giáp | W +35 Giáp/+25 Kháng, không tự chậm; nội tại 8 tầng. Q/E −15%. |
| H06-B2 | Địa Chấn | Q đẩy 2m, đập tường choáng 0,75s; E 4m. W chỉ số −25%. |
| H06-B3 | Thủ Hộ | R giảm ST 14%; W chia 50% giáp/kháng cho đồng đội gần. Q/E CD +2s. |
| H07-B1 | Viêm Bạo | W trễ 0,5s; Q/W +18%. R 3,6m. |
| H07-B2 | Liên Hỏa | Nội tại đốt 2,5% HP tối đa/3s; R 5,4m. Q/W −12%. |
| H07-B3 | Hỏa Ảnh | E CD −3s, lướt 4,5m, khó chọn 0,8s. Q −15%. |
| H08-B1 | Hàn Phược | W chậm 38%; R trói 1,35s ở 3 tầng. Q −15%. |
| H08-B2 | Băng Nhận | Q +35% lên địch chậm; 3 tầng nổ 75+45% HC. Nội tại không chậm, R không trói. |
| H08-B3 | Tuyết Hộ | W đồng minh miễn chậm, +15 giáp/kháng; E khiên 80. R −18%. |
| H09-B1 | Truy Nguyệt | Q 13m, +20% ở >8m; R vùng −25%, sát thương +25%. Tốc đánh −10%. |
| H09-B2 | Tinh Nhãn | W 6,5s; W/Q đánh dấu +12% chí mạng. Q/R −10%. |
| H09-B3 | Liên Tiễn | Nội tại 5 tầng/+15%, tốc đánh +20%; sau Q/E hai đòn kế bắn đôi 70%/mũi. Q −25%. |
| H10-B1 | Cuồng Hổ | Trong R: Q thêm sát thương chuẩn 4% HP mất, tốc đánh +24%. W −30%. |
| H10-B2 | Kim Thể | W +28 giáp, khiên +40%, xóa chậm; R +220 HP. Tốc đánh/nội tại giảm nửa. |
| H10-B3 | Hổ Liệp | E 5,5m; chạy hướng địch <50% HP tốc +18%, 3 tầng. R 5,5s. |
| H11-B1 | Hộ Âm | W/R hồi +22%; W xóa độc/cháy/chậm. Q/E −25%. |
| H11-B2 | Chấn Âm | Q xuyên, +25%; E câm lặng 0,75s. W/R hồi −25%. |
| H11-B3 | Tĩnh Âm | E chậm 35%/2s; R miễn CC đầu 1s. R hồi gốc 32/s. |
| H12-B1 | Xà Độc | Q/R độc 2% HP hiện tại/s/3s; giảm khiên 30%. W trói 0,65s. |
| H12-B2 | Hư Không | E CD −3s; tốc +20%, ẩn minimap 2,5s. R −15%. |
| H12-B3 | Ám Phược | W trễ 0,3s, trói 1,35s; R chậm 35%. Q −18%. |

## Phạm vi không cần thêm model riêng

Bot, phân thân Hồ Ảnh và tượng tướng dùng lại body/skin phù hợp. 28 Bổ phẩm và 18 Trợ phẩm hiện là dữ liệu/UI, không mặc định 46 model đeo người riêng; loot dùng chung vật chứa trong danh sách. Vòng aim, đường quỹ đạo, thanh máu, fog, shader mặt cổng, particle hạt và điều khiển HUD vẫn là hệ render động; không thay bằng ảnh chụp phép thuật thành mesh đặc. Ba Boss hiện có được liệt kê; không tự thêm Boss thứ tư. Sáu món Hồn Cốt có dữ liệu trang bị nhưng chưa đủ bằng chứng mọi món đang có mesh rời trong runtime.

## Dấu vết rà soát

Manifest có SHA256 các file nguồn được đọc. Chạy lại `node Prompt_Asset/generate_asset_sheet.mjs` từ gốc repo để cập nhật khi inventory và mã nguồn còn khớp; script từ chối nếu bảng nguồn đã đổi mà inventory cũ chưa được rà soát. Không gọi dịch vụ sinh asset. Danh sách geometry nguồn cũ chỉ dùng tham khảo, không phải bằng chứng cần tạo một model cho mỗi lời gọi Geometry.
