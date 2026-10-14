# BỘ ĐẶC TẢ PROMPT SIÊU CHI TIẾT (6 TRANG A4) CHO GOOGLE AI STUDIO — DỰ ÁN GAME ANDROID "HỒN GIỚI: SINH TỒN (V2.5)"

Tài liệu này là **Bản Đặc Tả Prompt Kỹ Thuật & Mỹ Thuật Toàn Diện (Master Engineering & Art Direction Prompt — Độ dài > 5.000 từ / tương đương 6 trang A4 đặc kín thông số)**. Toàn bộ nội dung bên trong khối lệnh dưới đây được thiết kế để bạn **sao chép nguyên văn (Copy All)** và dán vào **Google AI Studio** (kèm file `Hon_Gioi_Sinh_Ton_GDD_V2.5_Hoan_Chinh.docx`), buộc AI phải sinh ra:
1. **Mô hình 3D Nhân vật Nam / Nữ tỷ lệ 8 đầu chuẩn game AAA** (mặt cắt giải phẫu bầu dục dẹt, khuôn mặt V-line vẽ Texture 2048×2048 sắc nét, mái tóc 24–32 lọn uốn cong, trường bào cổ trang nhiều lớp, bàn tay đủ 5 ngón — xóa bỏ hoàn toàn hình dáng "búp bê người tuyết bụng tròn").
2. **Hệ thống Tự Sinh Tài Nguyên Mỹ Thuật Độ Hoàn Mỹ Cao Nhất (Procedural Masterwork Asset Engine)** cho toàn bộ **12 Hồn Khí 3D, 24 Skin Hồn Khí, 7 Hồn Cốt, 12 Hồn Hoàn, 28 Bổ Phẩm, 18 Trợ Phẩm và 48 Icon Kỹ Năng** (khi chưa có file ảnh/model bên ngoài, code phải tự vẽ từng bức tranh minh họa 512×512px và dựng từng mô hình 3D chạm khắc tinh xảo — cấm dùng ký tự text `☉`, `♜`, `⚡`).
3. **Sảnh Hồn Thành Tiên Cảnh & Bản đồ 3D "Thương Mang Cổ Vực" 7 Vùng Sinh Thái** (địa hình đồi núi, mặt nước sóng sánh phản chiếu, bụi cỏ từng lá đung đưa, 4 Đại Boss khổng lồ — xóa bỏ mặt sàn lưới ô vuông xám).
4. **Cụm Nút Bấm Gameplay & Giao Diện HUD Công Thái Học Chuẩn Liên Quân Mobile × Delta Force** cùng **Kiến Trúc Bảo Mật 5 Lớp Chống Crack / Chống Hack ("Thiên Đạo Hộ Giới")**.

## BẢN MASTER PROMPT SIÊU CHI TIẾT (SAO CHÉP TOÀN BỘ KHỐI DƯỚI ĐÂY DÁN VÀO AI STUDIO)

```text
ĐÓNG VAI: Bạn là Principal 3D Game Engine Architect, Lead Character & Environment Technical Artist (chuyên gia Three.js / WebGL 2.0 / GLSL Shaders / Procedural Mesh Sculpting), Senior UI/UX Mobile Designer (Liên Quân Mobile / Arena of Valor & Delta Force Mobile) và Lead Game Security Engineer.

NHIỆM VỤ TỐI THƯỢNG:
Hãy đọc toàn bộ file tài liệu thiết kế đính kèm "Hon_Gioi_Sinh_Ton_GDD_V2.5_Hoan_Chinh.docx" và lập trình một ỨNG DỤNG GAME 3D TRÊN ANDROID HOÀN CHỈNH, CHƠI ĐƯỢC NGAY TRỰC TIẾP với chất lượng đồ họa 3D, tạo hình Nhân vật Nam/Nữ, Vật phẩm, Bản đồ và Nút bấm Gameplay đạt ĐỘ HOÀN MỸ CAO NHẤT.

NGUYÊN TẮC CẤM TUYỆT ĐỐI (ZERO-TOLERANCE RULES):
1. CẤM TUYỆT ĐỐI dựng nhân vật bằng cách ghép các khối cầu tròn (`SphereGeometry`) làm bụng/ngực/vai hay gắn 2 viên bi lồi làm mắt khiến nhân vật trông như người tuyết hoặc búp bê nhựa rẻ tiền.
2. CẤM TUYỆT ĐỐI dùng mặt sàn kẻ ô vuông xám (`THREE.GridHelper`) hay các cột trụ trơn đơn điệu làm Sảnh hoặc Bản đồ.
3. CẤM TUYỆT ĐỐI dùng các ký tự Unicode/Emoji (`☉`, `♜`, `⚡`, `v`, `✦`) để làm biểu tượng cho Hồn Cốt, Hồn Hoàn, Bổ Phẩm, Trợ Phẩm hay Kỹ năng. Vì dự án chưa nạp file ảnh rời từ bên ngoài, bạn BẮT BUỘC phải viết bộ máy `ProceduralMasterworkAssetEngine` bằng Canvas 2D (512x512px) và Three.js Geometry phức hợp để tự vẽ minh họa sắc nét, phát sáng và giàu chi tiết cho 100% vật phẩm và kỹ năng.
4. CẤM TUYỆT ĐỐI viết code rút gọn, giữ chỗ (`// TODO`, `// Add more heroes here`) hoặc cắt bớt bất kỳ nhân vật, nhánh võ hồn, bổ phẩm, trợ phẩm nào.

================================================================================
CHƯƠNG I: ĐẶC TẢ KỸ THUẬT DỰNG HÌNH 3D NHÂN VẬT NAM / NỮ TỶ LỆ 8 ĐẦU GIỐNG THẬT NHẤT (AAA 8-HEAD ANATOMICAL HUMANOID SCULPTING)
================================================================================

1.1. KIẾN TRÚC GIẢI PHẪU HỌC KHUNG CƠ THỂ NAM & NỮ (ANATOMICAL PROPORTION SYSTEM):
Mọi nhân vật phải được dựng bằng hệ thống khung xương đa khớp (`THREE.Group` phân cấp: `Root -> Pelvis -> SpineLower -> SpineUpper -> Chest -> Neck -> Head`, `Chest -> ClavicleL/R -> ShoulderL/R -> UpperArmL/R -> ForearmL/R -> HandL/R -> Fingers[5]`, `Pelvis -> ThighL/R -> CalfL/R -> AnkleL/R -> FootL/R`) với tỷ lệ chuẩn 8 đầu (8-Head Heroic Anime / Semi-Realistic Xianxia Proportion):

A. KHUNG GIẢI PHẪU NHÂN VẬT NAM (`buildMaleHeroAnatomy` — Áp dụng cho H01 Lâm Dật, H02 Hàn Trạch, H04 Kỳ Vân, H06 Đỗ Kình, H07 Vân Chước, H10 Thiên Lạc, H12 Tạ Uyên):
- Tổng chiều cao chuẩn: `1.82m` (Riêng H02 Hàn Trạch cao `1.92m` cơ bắp vạm vỡ; H06 Đỗ Kình cao `1.98m` thân hình hộ pháp uy nghi).
- Đầu & Cổ (`Head & Neck`): Cao `0.225m` (1/8 cơ thể). Hộp sọ trên tròn mượt nhưng từ gò má xuống cằm phải vát thon theo đường cong hàm chữ V (`Jawline V-taper`: rộng trán `0.15m`, rộng gò má `0.155m`, rộng góc hàm `0.12m`, đỉnh cằm thon `0.04m`, độ sâu đầu trước-sau `0.19m`). Cổ hình trụ bầu dục cao `0.08m`, rộng `0.095m`, có khối cơ ức đòn chũm nhẹ.
- Thân trên hình chữ V (`V-Taper Torso Lofting`):
  + Dùng thuật toán `createEllipticalLoftedMesh(slices, radialSegments = 128)` tạo lưới đa giác liền mạch đi qua 12 mặt cắt ngang từ Hông lên Vai.
  + Mỗi mặt cắt ngang tại độ cao `y` là một hình bầu dục dẹt có bán kính ngang `Rx(y)` và bán kính sâu trước-sau `Rz(y)` (TUYỆT ĐỐI KHÔNG PHẢI HÌNH TRÒN `Rx = Rz`):
    * Đáy chậu (`Pelvis base`): `Rx = 0.155m`, `Rz = 0.105m`.
    * Hông (`Iliac crest`): `Rx = 0.160m`, `Rz = 0.110m`.
    * Eo thon (`Waistline`): `Rx = 0.130m`, `Rz = 0.095m` (thắt gọn rõ rệt).
    * Khung sườn dưới (`Lower ribs`): `Rx = 0.155m`, `Rz = 0.115m`.
    * Ngực (`Pectorals`): `Rx = 0.195m`, `Rz = 0.135m` (phía trước đắp nổi 2 khối cơ ngực săn chắc có rãnh giữa ngực, phía sau có rãnh cột sống và 2 khối cơ xô背 `Latissimus dorsi`).
    * Bờ vai (`Clavicle & Deltoid span`): Độ rộng ngang hai đầu vai đạt `0.45m` (`Rx = 0.225m`, `Rz = 0.120m`).
- Tay & Bàn tay 5 ngón (`Articulated Arms & 5-Finger Hands`):
  + Cơ vai (`Deltoid`): Hình giọt nước ngược ôm lấy khớp vai (dài `0.14m`, rộng `0.09m`, dày `0.085m`).
  + Bắp tay trên (`Biceps/Triceps`): Dài `0.28m`, thuôn từ `0.068m` xuống `0.054m` ở khuỷu tay.
  + Cẳng tay (`Forearm`): Dài `0.26m`, thuôn từ `0.056m` ở khuỷu xuống `0.040m` ở cổ tay, bọc trong Hộ Uyển (Bracers) chạm khắc.
  + Bàn tay (`Hand`): Dài `0.18m`, gồm khối lòng bàn tay dẹt (`0.085m x 0.095m x 0.028m`) và đủ 5 ngón tay (`Thumb, Index, Middle, Ring, Pinky`), mỗi ngón gồm 3 đốt hình trụ thuôn (`16 segments`) uốn cong nắm chặt lấy thân vũ khí Hồn khí.
- Chân dài 52% cơ thể (`Long Heroic Legs — tổng dài 0.95m`):
  + Đùi (`Thigh`): Dài `0.46m`, nghiêng nhẹ vào trong góc `3.5°` (Genu valgum tự nhiên), mặt cắt bầu dục thuôn từ `Rx = 0.095m, Rz = 0.102m` ở bẹn xuống `Rx = 0.062m, Rz = 0.065m` ở đầu gối.
  + Khớp gối & Bắp chân (`Knee & Calf`): Bắp chân dài `0.43m`, phình nhẹ cơ bụng chân ở 1/3 trên (`0.066m`) rồi thuôn nhỏ thanh thoát xuống cổ chân (`0.042m`).
  + Bàn chân & Chiến hài (`Boots`): Dài `0.25m`, cao `0.08m`, mũi giày uốn cong nhẹ kiểu cổ trang, có đế giày, mũi hài chạm kim loại và ống bốt ôm sát bắp chân.

B. KHUNG GIẢI PHẪU NHÂN VẬT NỮ (`buildFemaleHeroAnatomy` — Áp dụng cho H03 Ly Sa, H05 Tịch Dao, H08 Sở Băng Nghi, H09 Mặc Tinh, H11 Ninh Từ):
- Tổng chiều cao chuẩn: `1.68m` (Tỷ lệ 8 đầu thanh mảnh, uyển chuyển, đôi chân dài chiếm 54% chiều cao cơ thể).
- Đầu & Khuôn mặt V-Line thanh tú: Cao `0.21m`, gò má mềm, cằm V-line sắc sảo (`0.032m`), cổ cao trắng ngần (`dài 0.085m, rộng 0.072m`), xương quai xanh (`Clavicle`) nổi nhẹ tinh tế.
- Thân trên đồng hồ cát (`Hourglass S-Curve Lofting` với 128 lát cắt):
  + Bờ vai mềm mại: Rộng `0.35m` (`Rx = 0.175m, Rz = 0.095m`).
  + Vòng ngực (`Bust`): Có khối ngực đôi tự nhiên, thanh thoát (`Rx = 0.155m, Rz = 0.125m` tính cả độ nhô tự nhiên phía trước).
  + Vòng eo con kiến (`Slender Waist`): Thắt sâu quyến rũ (`Rx = 0.102m, Rz = 0.078m`).
  + Vòng hông nở tròn mượt (`Curved Hips & Pelvis`): Mở rộng mềm mại (`Rx = 0.168m, Rz = 0.115m`), lưng võng chữ S tự nhiên (`Lumbar lordosis curve`).
- Tay & Chân thon dài:
  + Cánh tay mảnh mai (`UpperArm r = 0.046m -> 0.038m`, `Forearm r = 0.038m -> 0.028m`), bàn tay búp măng 5 ngón thon dài cầm vũ khí hoặc gảy đàn.
  + Đôi chân dài `0.91m` thẳng tắp, đùi thon (`0.082m -> 0.052m`), bắp chân nuột nà (`0.054m -> 0.034m`), đi giày cao gót cổ trang hoặc hài lụa thêu hoa.

1.2. THUẬT TOÁN VẼ TEXTURE KHUÔN MẶT 2048x2048 & MÁI TÓC ĐA LỚP SỐNG ĐỘNG (`Facial & Hair Studio Engine`):
- Bắt buộc viết hàm `generateHighResCharacterFaceTexture(heroId, gender, skinTone, eyeColor, makeupStyle)` vẽ trên `HTMLCanvasElement` kích thước `1024x1024` (hoặc `2048x2048`) rồi gắn vào `MeshPhysicalMaterial` của vùng mặt:
  + Làn da (`Subsurface Skin Tone`): Pha gradient hồng hào tự nhiên ở hai gò má, sống mũi và chóp cằm (`radialGradient`), độ nhám `roughness: 0.42, sheen: 0.35`.
  + Đôi mắt cực kỳ có hồn (4 lớp chi tiết):
    1. Tròng trắng (`Sclera`) có bóng đổ nhẹ dưới mí trên.
    2. Tròng màu (`Iris`) vẽ vòng tròn chuyển sắc 3 tầng theo màu nguyên tố của từng tướng, có các tia vân mắt mảnh tỏa ra từ tâm.
    3. Con ngươi (`Pupil`) đen sâu ở giữa kèm **3 đốm sáng phản chiếu (`Catchlights`)** trắng lấp lánh ở góc 10 giờ và 4 giờ.
    4. Viền mí mắt trên đậm, hàng lông mi cong vút (cho Nữ) hoặc mí mắt sắc lạnh (cho Nam), cùng đôi chân mày kiếm / chân mày lá liễu rõ nét.
  + Sống mũi & Đôi môi: Vẽ bóng đổ dọc sống mũi thanh cao, nhân trung nhẹ và đôi môi có độ bóng tự nhiên (Nữ môi hồng chu sa/cam đào, Nam môi đường nét cương nghị).
- Hệ thống Mái Tóc Đa Lọn 3D (`createMultiLayerHairSystem`):
  + Gồm: (1) Khối tóc nền ôm sát hộp sọ; (2) 8–12 lọn tóc mái trước và tóc mai hai bên thái dương uốn cong ôm lấy gò má (dùng `TubeGeometry` chạy theo `CatmullRomCurve3` có bán kính thuôn dần `r(t) = rMax * Math.sin(t * Math.PI) * (1 - 0.85*t)`); (3) Búi tóc đỉnh đầu cố định bằng Trâm Ngọc / Mão Kim Loại (Phát Quán); (4) Suối tóc dài phía sau lưng gồm 16–24 dải tóc uốn sóng chuyển động mềm mại theo hàm sóng `sin(time * 2.5 + strandIndex * 0.4)`.

1.3. HỆ THỐNG PHỤC TRANG CỔ TRANG TIÊN HIỆP ĐA TẦNG (`Multi-Layer Xianxia Garment & Armor Builder`):
Mỗi nhân vật không được chỉ sơn màu lên thân, mà phải mặc **4 lớp trang phục tách biệt có độ dày và chuyển động vật lý**:
- Lớp 1 — Nội y & Trung y cổ giao lĩnh chữ Y (`Inner Silk Tunic`): Ôm sát ngực, viền cổ áo thêu hoa văn kim tuyến.
- Lớp 2 — Ngoại bào / Trường sam xẻ tà (`Flowing Outer Robe & Skirt Panels`): Dùng 4 tấm lưới uốn cong (`Front Apron Panel`, `Back Long Cape`, `Left & Right Hip Tassets`) có 64x64 đỉnh, phần dưới xòe rộng và bay phấp phới khi nhân vật chạy hoặc tung chiêu.
- Lớp 3 — Đai lưng, Hộ tâm kính & Ngọc bội (`Waist Sash, Corset & Jade Pendant`): Thắt chặt vòng eo, phía trước treo mảnh ngọc bội phát sáng và dây tua rua đung đưa.
- Lớp 4 — Giáp vai, Hộ uyển & Phi bạch (`Sculpted Pauldrons, Bracers & Floating Silk Ribbon`): Giáp vai dùng `ExtrudeGeometry` uốn cong vươn lên như cánh phượng/đầu lân (tuyệt đối không dùng quả cầu!), kèm dải lụa tiên khí (`Floating Celestial Ribbon` — `TubeGeometry` uốn vòng chữ U phía sau lưng lơ lửng như các tướng tiên hiệp trong Liên Quân / Vương Giả Vinh Diệu).
```

```text
1.4. BẢNG ĐẶC TẢ NGOẠI HÌNH CHI TIẾT RIÊNG BIỆT CHO TỪNG NHÂN VẬT TRONG 12 HỒN SƯ (H01 → H12):
Bạn BẮT BUỘC phải dựng riêng từng nhân vật theo đúng thiết kế mỹ thuật dưới đây, tuyệt đối không dùng chung 1 model chỉ đổi màu:

- H01 — LÂM DẬT (Nam | 1.82m | Thanh Mạch Đằng | Khống chế / Phụ trợ):
  + Gương mặt & Khí chất: Nam thần thư sinh nho nhã nhưng kiên nghị, da trắng sáng, đôi mắt màu Ngọc Lục Bảo (`#10B981`) sâu thẳm, tóc đen ánh xanh rêu dài buộc nửa đầu bằng phát quán chạm hình lá trúc ngọc bích, hai lọn tóc mai rủ nhẹ qua gò má.
  + Trang phục 3D: Trường bào lụa Thanh Mộc nhiều lớp (trong trắng ngà `#ECFDF5`, ngoài xanh cổ ngọc `#065F46` chuyển sắc dần xuống vạt áo `#047857`, thêu họa tiết dây leo vàng kim `#D4AF37`). Vai trái khoác giáp vai bằng gỗ thần đan xen lá ngọc phát sáng; thắt lưng đính Linh Mộc Ngọc Bội; sau lưng có 2 dải lụa xanh lục bảo lơ lửng.
  + Hồn Khí 3D trên tay phải (`Mộc Tinh Trượng`): Dài `1.95m`, thân trượng gồm 3 nhánh gỗ cổ thụ xoắn bện vào nhau (`3x TubeGeometry` xoắn ốc), phần đầu trượng uốn thành hình đầu rồng mộc nâng đỡ một Đóa Sen Ngọc Lục Bảo 12 cánh đang nở lơ lửng tự xoay tròn và tỏa hạt sáng sinh mệnh xanh lá.

- H02 — HÀN TRẠCH (Nam | 1.92m | Chấn Sơn Chùy | Cường công / Đấu sĩ):
  + Gương mặt & Khí chất: Chiến thần cơ bắp cuồn cuộn, đường nét góc cạnh nam tính, mắt màu Hổ Phách Rực Lửa (`#F59E0B`), tóc đen cắt ngắn dựng mạnh mẽ kèm băng trán kim loại chạm vân nham thạch.
  + Trang phục 3D: Trọng giáp Sơn Thiết kết hợp chiến bào da thú màu Đen Huyền Nham (`#1E293B`) và Vàng Đồng Cổ (`#B45309`). Ngực trần nửa trên lộ cơ ngực săn chắc đeo dây xích hộ tâm bằng vàng ròng; hai vai là cặp Giáp Vai Đầu Sơn Thú chạm nổi phát sáng mạch nham thạch cam đỏ; hộ uyển tay và chiến hài bọc thép dày.
  + Hồn Khí 3D hai tay (`Chấn Nhạc Chùy`): Đại chùy khổng lồ dài `1.85m`, đầu búa là khối bát giác chạm đầu kỳ lân đá nặng nề có các vết nứt phát sáng dung nham vàng cam (`emissive: #F97316`), cán búa quấn da rồng và đuôi cán gắn quả chùy xích nhỏ.

- H03 — LY SA (Nữ | 1.68m | Phong Ảnh Hồ | Mẫn công / Ám sát):
  + Gương mặt & Khí chất: Tuyệt sắc mỹ nữ sát thủ lạnh lùng quyến rũ, khuôn mặt V-line thanh tú, mắt màu Tím Huyễn Mộng (`#C084FC`) xếch nhẹ sắc sảo, mái tóc bạch kim pha tím khói dài tới thắt lưng, trên đỉnh đầu có đôi Tai Hồ Ly Linh Khí mềm mại cử động nhẹ và sau hông có 3 đuôi hồ ly bán trong suốt phát sáng mờ ảo.
  + Trang phục 3D: Y phục Dạ Hành Sát Thủ ôm sát tôn dáng đồng hồ cát màu Tím Đêm (`#3B0764`) phối Đen Huyền (`#0F172A`) và viền Bạc Ánh Trăng (`#E2E8F0`). Phần tà váy xẻ cao hai bên đùi lộ đôi chân dài đi bốt da cao quá gối (`Thigh-high assassin boots`), khăn choàng cổ lụa tím bay dài ra sau lưng.
  + Hồn Khí 3D hai tay (`Song Ảnh Nhận`): Cặp song đao lưỡi cong hình trăng khuyết cầm ngược tay (`Reverse-grip dual crescent blades`), lưỡi đao bằng pha lê tím đen vát cạnh sắc lẹm tỏa làn khói tím ma mị.

- H04 — KỲ VÂN (Nam | 1.83m | Lôi Vũ Điểu | Pháp công / Tầm xa):
  + Gương mặt & Khí chất: Công tử thiên giới ngạo nghễ, mắt màu Lam Sấm Sét (`#38BDF8`) phát tia điện nhẹ, tóc màu Bạch Kim ánh xanh dương búi cao cài trâm hình cánh chim sấm.
  + Trang phục 3D: Đạo bào Lôi Vũ màu Trắng Bạc (`#F8FAFC`) phối Xanh Thiên Thanh (`#0284C7`) và Vàng Kim. Hai bên vai và sau lưng có Áo Choàng Lông Vũ Sấm Sét ghép từ hàng chục chiếc lông vũ dài phát sáng hồ quang điện; ống tay áo rộng tiên phong đạo cốt.
  + Hồn Khí 3D tay phải (`Lôi Vũ Phiến`): Chiếc quạt chiến lớn xòe rộng `120°` ghép từ 9 chiếc lông vũ pha lê lam ngọc, ở tâm quạt là viên Lôi Châu quay tròn bắn ra các tia hồ quang điện xanh biếc.

- H05 — TỊCH DAO (Nữ | 1.69m | Linh Kính | Phụ trợ / Trinh sát):
  + Gương mặt & Khí chất: Thánh nữ Nguyệt Cung dịu dàng, thoát tục, làn da trắng sứ, đôi mắt màu Vàng Ánh Trăng (`#FDE047`), tóc đen dài mượt như nhung điểm xuyết trâm cài hoa quỳnh bạc và mạng che trán bằng chuỗi ngọc trai nhỏ.
  + Trang phục 3D: Tiên y Nguyệt Bạch (`#EFF6FF`) kết hợp lụa Xanh Ngọc Lam nhạt (`#BAE6FD`) và viền Vàng Ánh Kim (`#FACC15`). Tay áo voan mỏng bán trong suốt (`transmission: 0.65`) rủ dài thướt tha, chân váy xếp ly nhiều tầng lấp lánh như ánh sao đêm, sau lưng có dải lụa Phi Bạch trắng phát sáng bay lơ lửng thành vòng tròn hộ thể.
  + Hồn Khí 3D lơ lửng trước ngực/tay (`Nguyệt Linh Kính`): Bảo kính tròn đường kính `0.65m` lơ lửng không cần cầm tay, mặt gương bằng thủy tinh ngân hà phản chiếu ánh sáng 7 màu (`iridescence: 0.9`), viền gương chạm khắc hình trăng lưỡi liềm và mây lành bằng vàng trắng.

- H06 — ĐỖ KÌNH (Nam | 1.98m | Huyền Giáp Quy | Phòng ngự / Đỡ đòn):
  + Gương mặt & Khí chất: Đại tướng quân trầm ổn, thân hình hộ pháp cao lớn vững như bàn thạch, mắt màu Xanh Biển Sâu (`#0EA5E9`), râu quai nón cắt tỉa gọn, tóc buộc gọn dưới mũ trụ Huyền Thiết chạm đầu rùa thần.
  + Trang phục 3D: Bộ Trọng Giáp Huyền Quy đồ sộ màu Xanh Đen Lục Huyền (`#0F3D3E`) và Vàng Đồng Nặng (`#CA8A04`), trên lưng và ngực có các mảng giáp lục giác mô phỏng mai thần quy phát sáng cổ ngữ phòng hộ màu xanh lục lam.
  + Hồn Khí 3D tay trái (`Huyền Quy Thuẫn`): Đại thuẫn khổng lồ cao `1.35m` hình mai linh quy lục giác, chính giữa khiên là phù điêu đầu Huyền Vũ ngậm ngọc phát ra màn chắn năng lượng bán cầu mờ ảo.

- H07 — VÂN CHƯỚC (Nam | 1.82m | Xích Diệm Liên | Pháp công / Diện rộng):
  + Gương mặt & Khí chất: Thiếu niên hỏa vương cuồng nhiệt, mắt màu Đỏ Chu Sa (`#EF4444`), mái tóc đỏ rực pha cam lửa ở phần đuôi tóc bay ngược ra sau, trên trán có ấn ký hoa sen đỏ.
  + Trang phục 3D: Chiến bào Hỏa Liên màu Đỏ Thẫm (`#7F1D1D`) phối Đen và hoa văn cánh sen Vàng Rực (`#F59E0B`). Vạt áo dưới được cắt tạo hình như những cánh hoa sen lửa đang bùng cháy, hai vai có giáp vai uốn cong như ngọn lửa bốc lên.
  + Hồn Khí 3D lơ lửng quanh tay (`Diệm Liên Luân`): Bánh xe pháp luân bằng lửa hình đóa sen 8 cánh kim loại đỏ rực xoay tròn tốc độ cao sau lưng và trên bàn tay, liên tục rắc tàn lửa phát sáng.

- H08 — SỞ BĂNG NGHI (Nữ | 1.70m | Sương Linh Điệp | Khống chế / Băng hệ):
  + Gương mặt & Khí chất: Nữ hoàng băng giá kiêu sa, lạnh lùng tuyệt mỹ, mắt màu Xanh Băng Pha Lê (`#67E8F9`), mái tóc màu Bạch Tuyết pha Xanh Băng dài chấm gót cài trâm Băng Điệp đôi cánh trong suốt.
  + Trang phục 3D: Cung trang Tuyết Điệp màu Xanh Băng Nhạt (`#ECFEFF`) chuyển sắc xuống Xanh Lam Đậm (`#1E3A8A`), phần vai và lưng áo có đôi Cánh Bướm Băng Tinh bán trong suốt (`transmission: 0.85, iridescence: 0.7`) lấp lánh bụi tuyết rơi quanh người.
  + Hồn Khí 3D tay phải (`Băng Điệp Trâm / Pháp Trượng Băng Điệp`): Cây trượng pha lê băng thanh mảnh dài `1.65m`, đỉnh trượng là đôi bướm băng tinh thể đang vỗ cánh sống động.

- H09 — MẶC TINH (Nữ | 1.70m | Ảnh Nguyệt Cung | Xạ thủ / Trinh sát):
  + Gương mặt & Khí chất: Nữ xạ thủ săn đêm lạnh lùng, ánh mắt sắc như chim ưng màu Tím Ánh Sao (`#818CF8`), tóc xanh đen buộc đuôi ngựa cao (`High ponytail`) gọn gàng năng động bay theo từng bước nhảy.
  + Trang phục 3D: Chiến phục Cung Thủ Tinh Hà màu Xanh Đêm (`#1E1B4B`) phối Bạc và Xanh Lam Phát Sáng (`#3B82F6`), áo choàng ngắn lệch một bên vai (Asymmetrical ranger cloak), tay phải đeo găng bắn cung bọc giáp bạc, chân đi trường ngoa cơ động.
  + Hồn Khí 3D tay trái (`Huyền Nguyệt Cung`): Đại cung dài `1.55m` uốn cong hình hai cánh chim ưng ngậm trăng khuyết, dây cung bằng tia sáng năng lượng xanh tím, khi giương cung tự động ngưng tụ mũi tên ánh sao rực rỡ.

- H10 — THIÊN LẠC (Nam | 1.85m | Kim Giáp Hổ | Đấu sĩ / Cường công):
  + Gương mặt & Khí chất: Chiến binh vương giả hoang dã, mắt màu Vàng Kim Hổ Phách (`#FBBF24`), tóc vàng nâu bờm sư tử/bạch hổ dũng mãnh, trên má có 2 vệt chiến văn mờ.
  + Trang phục 3D: Chiến giáp Kim Hổ màu Trắng Bạc (`#F1F5F9`) và Vàng Ròng (`#EAB308`) kết hợp viền lông Bạch Hổ vằn đen ở cổ áo và thắt lưng; giáp vai trái là đầu Bạch Hổ gầm thét bằng vàng khối.
  + Hồn Khí 3D hai tay (`Kim Hổ Trảo`): Cặp thiết trảo khổng lồ bọc kín hai cẳng tay, mỗi bên có 4 móng vuốt năng lượng vàng kim dài `0.45m` cong vút sắc bén tỏa điện quang vàng.

- H11 — NINH TỪ (Nữ | 1.67m | Ngọc Đàn Cầm | Hồi phục / Phụ trợ):
  + Gương mặt & Khí chất: Tiên nữ âm luật dịu dàng thanh khiết, mắt màu Xanh Ngọc Bích (`#34D399`), mái tóc đen dài uốn lọn mềm mại cài trâm hoa lan ngọc trắng và dải lụa xanh ngọc.
  + Trang phục 3D: Nhã phục Cổ Cầm màu Xanh Ngọc Nhạt (`#D1FAE5`) phối Trắng Lụa và chỉ thêu Vàng Hồng (`#FDBA74`), tay áo rộng xếp nhiều lớp lụa mỏng bồng bềnh như sương sớm.
  + Hồn Khí 3D lơ lửng ngang trước người (`Thanh Ngọc Cầm`): Cây đàn cổ cầm 7 dây dài `1.30m` chạm khắc từ ngọc bích nguyên khối trong suốt nửa phần, đầu đàn uốn hình đuôi phượng hoàng, 7 dây đàn phát sáng các nốt nhạc năng lượng bay lên khi gảy.

- H12 — TẠ UYÊN (Nam | 1.84m | Hư Không Xà | Ám hệ / Khống chế):
  + Gương mặt & Khí chất: Tà vương bí ẩn quyến rũ, làn da trắng xanh lạnh lẽo, đôi mắt hẹp dài màu Tím Độc Hư Không (`#A855F7`) có đồng tử dọc như mắt rắn, tóc dài màu Bạc Tím buông xõa tự nhiên.
  + Trang phục 3D: Hắc bào U Minh màu Đen Tím (`#2E1065`) phối vảy rắn ánh lục tím (`iridescence: 0.85`), cổ áo dựng cao uy quyền, vạt áo dưới lượn sóng như bóng tối hư không.
  + Hồn Khí 3D tay phải (`Hư Ảnh Xà Trượng`): Quyền trượng hắc kim dài `1.90m` với hai con mãng xà hư không bằng tinh thể tím đen quấn xoắn vào nhau, miệng rắn ngậm quả cầu Hắc Động ở đỉnh trượng.

================================================================================
CHƯƠNG II: ĐẶC TẢ HỆ THỐNG TỰ SINH VẬT PHẨM & ICON 2D/3D VỚI ĐỘ HOÀN MỸ CAO NHẤT (PROCEDURAL MASTERWORK ITEM & ICON ENGINE — KHÔNG DÙNG ASSET RỜI)
================================================================================

Vì dự án không dùng file ảnh PNG rời từ bên ngoài, bạn BẮT BUỘC phải viết class `MasterworkIconGenerator` dùng `HTMLCanvasElement` kích thước `512x512px` để vẽ tự động từng bức tranh minh họa vật phẩm có độ chi tiết cao (gồm: Nền Gradient đa tầng theo phẩm chất + Hoa văn Pháp trận Bát Quái chìm + Hình vẽ chính của vật phẩm có đổ bóng 3D, phản광 specular, viền sáng rim light + Hạt linh khí bay quanh + Khung viền kim loại chạm góc) và chuyển thành DataURL / `THREE.CanvasTexture`:

2.1. BẢNG MÀU KHUNG VIỀN PHẨM CHẤT CHUẨN (RARITY FRAME & AURA SYSTEM):
- Bậc Phàm / Bách Niên: Nền Xanh Lục Ngọc (`#064E3B -> #10B981`), viền Bạc Chạm Cổ Ngữ.
- Bậc Linh / Thiên Niên: Nền Lam Huyền Tinh (`#1E3A8A -> #3B82F6`) hoặc Tím Linh Hồn (`#4C1D95 -> #A855F7`), viền Vàng Đồng phát sáng.
- Bậc Thiên / Vạn Niên: Nền Đỏ Hắc Kim (`#450A0A -> #EF4444`) hoặc Vàng Đế Vương (`#78350F -> #F59E0B`), viền Rồng Vàng Rực Lửa có tia chớp năng lượng.

2.2. ĐẶC TẢ HÌNH VẼ MINH HỌA CHO 7 HỒN CỐT (HB-01 → HB-07):
- `HB-01 Linh Nhãn Đầu Cốt (Đầu)`: Vẽ chiếc Vương Miện Xương Rồng Bạc chạm viên Con Mắt Pha Lê Xanh Lam phát tia sáng xuyên thấu ở chính giữa trán.
- `HB-02 Hộ Tâm Thân Cốt (Thân)`: Vẽ bộ Giáp Ngực Xương Khung Sườn Hoàng Kim bao bọc một Trái Tim Ngọc Lục Bảo đang tỏa lồng khiên bảo hộ.
- `HB-03 Thiết Tý Tả Cốt (Tay Trái)`: Vẽ Găng Tay Cốt Trảo Sắt Đen có 5 móng vuốt sắc bén và khớp xương phát ánh lửa cam.
- `HB-04 Lôi Pháp Hữu Cốt (Tay Phải)`: Vẽ Hộ Uyển Xương Linh Điểu màu tím lam có các tia sét quấn quanh cổ tay.
- `HB-05 Phong Hành Tả Cước (Chân Trái)`: Vẽ Chiến Hài Xương Phong Lang có đôi cánh gió màu xanh ngọc ở cổ chân.
- `HB-06 Địa Linh Hữu Cước (Chân Phải)`: Vẽ Giáp Chân Xương Nham Quy vững chắc tỏa vòng chấn động màu vàng đất.
- `HB-07 Bát Chu Mâu (Ngoại Phụ Cực Hiếm)`: Vẽ 8 chiếc gai xương nhện ma thuật màu tím đỏ huyết ngọc xòe ra từ một tâm ngọc hắc ám như đôi cánh tử thần.

2.3. ĐẶC TẢ HÌNH VẼ MINH HỌA CHO 12 HỒN HOÀN (HR-01 → HR-12):
Mỗi icon Hồn Hoàn phải vẽ 3 vòng tròn năng lượng đồng tâm khắc chữ Phạn/Cổ ngữ phát sáng kèm biểu tượng linh thú/nguyên tố ở tâm:
- `HR-01 Mộc Phược Hoàn`: Vòng hoàn Tím quấn dây leo gai xanh lục.
- `HR-02 Viêm Đằng Hoàn`: Vòng hoàn Tím Đỏ bốc ngọn lửa quấn quanh cành mộc.
- `HR-03 Sinh Mệnh Hoàn`: Vòng hoàn Tím Lục tỏa hoa sen hồi sinh.
- `HR-04 Chấn Nhạc Hoàn`: Vòng hoàn Tím Vàng có hình búa thần đập vỡ đá.
- `HR-05 Tật Phong Hoàn`: Vòng hoàn Tím Lam xoáy lốc cuồng phong.
- `HR-06 Cuồng Lôi Hoàn`: Vòng hoàn Đen Vạn Niên phóng tia sét tím trắng.
- `HR-07 Minh Kính Hoàn`: Vòng hoàn Tím Bạc phản chiếu gương ánh trăng.
- `HR-08 Huyền Quy Hoàn`: Vòng hoàn Đen Vạn Niên hiện bóng mai rùa thần.
- `HR-09 Hàn Tuyết Hoàn`: Vòng hoàn Đen Vạn Niên kết tinh bông tuyết 6 cánh.
- `HR-10 Truy Tinh Hoàn`: Vòng hoàn Tím Lam có mũi tên xuyên qua ngôi sao.
- `HR-11 Hổ Phách Hoàn`: Vòng hoàn Tím Vàng hiện hình đầu Bạch Hổ gầm.
- `HR-12 Hư Ảnh Hoàn`: Vòng hoàn Đen Vạn Niên có bóng mãng xà hư không.

2.4. ĐẶC TẢ HÌNH VẼ MINH HỌA CHO ĐẦY ĐỦ 28 BỔ PHẨM (BP-001 → BP-028):
- Nhóm Cường Công (`BP-001` đến `BP-004`):
  + `BP-001 Phá Giáp Đan`: Viên kim đan màu đỏ đồng có vết nứt ánh kim xuyên giáp.
  + `BP-002 Huyết Chiến Đan`: Viên linh đan đỏ thẫm tỏa hơi máu chiến ý.
  + `BP-003 Cuồng Phong Phù`: Lá bùa chiến trường quấn lốc xoáy kiếm khí.
  + `BP-004 Bá Lực Tinh (Bậc Thiên)`: Tinh thể chiến thần màu đỏ vàng rực cháy bọc trong khung rồng vàng.
- Nhóm Hồn Công (`BP-005` đến `BP-008`):
  + `BP-005 Tụ Hồn Đan`: Viên đan xanh lam tỏa vòng xoáy linh khí.
  + `BP-006 Linh Pháp Châu`: Quả cầu pha lê tím lam có lõi sao băng.
  + `BP-007 Nguyên Tố Thạch`: Viên đá ngũ sắc kết hợp Lôi - Hỏa - Băng - Mộc.
  + `BP-008 Thiên Hồn Ấn (Bậc Thiên)`: Ấn ngọc đế vương phát hào quang pháp thuật cửu thiên.
- Nhóm Phòng Ngự (`BP-009` đến `BP-012`):
  + `BP-009 Hộ Thể Đan`: Viên đan màu vàng đất ấm áp.
  + `BP-010 Thiết Cốt Tinh`: Khối tinh thể kim cương bọc giáp sắt.
  + `BP-011 Tịnh Hồn Ngọc`: Miếng ngọc bội trắng xanh chống tà ma.
  + `BP-012 Bất Động Giáp Ấn (Bậc Thiên)`: Đại ấn kim quy tỏa kết giới bất hoại.
- Nhóm Mẫn Công (`BP-013` đến `BP-016`):
  + `BP-013 Khinh Thân Phù`: Lá bùa xanh lơ có hình đôi cánh chim én.
  + `BP-014 Phong Linh Đan`: Viên đan ngọc bích xoay trong tâm bão.
  + `BP-015 Ảnh Bộ Châu`: Viên ngọc đen tím tạo 2 bóng phân thân mờ ảo.
  + `BP-016 Thiên Phong Linh (Bậc Thiên)`: Chuông thần cửu phong bằng vàng trắng có cánh thiên thần.
- Nhóm Khống Chế (`BP-017` đến `BP-020`):
  + `BP-017 Trói Linh Ấn`: Ấn gỗ cổ khắc xích ánh sáng.
  + `BP-018 Hàn Sương Tinh`: Tinh thể băng tuyết nhọn tỏa khí lạnh.
  + `BP-019 Trấn Mạch Châu`: Viên châu nặng ngàn cân trấn áp địa mạch.
  + `BP-020 Vạn Phược Ấn (Bậc Thiên)`: Pháp ấn hoàng kim phóng ra hàng chục sợi xích thần khóa không gian.
- Nhóm Hỗ Trợ (`BP-021` đến `BP-024`):
  + `BP-021 Sinh Mệnh Lộ`: Bình ngọc tịnh bình nghiêng đổ giọt sương xanh lục bảo.
  + `BP-022 Hộ Linh Châu`: Viên minh châu tỏa vòm khiên vàng dịu.
  + `BP-023 Tịnh Tâm Đan`: Viên đan sen trắng thanh lọc độc tố.
  + `BP-024 Cửu Sinh Ngọc (Bậc Thiên)`: Ngọc phượng hoàng tái sinh rực rỡ 9 tầng hào quang.
- Nhóm Chiến Thuật (`BP-025` đến `BP-028`):
  + `BP-025 Dò Hồn Kính`: Chiếc la bàn gương đồng chiếu tia sáng dò tìm.
  + `BP-026 Ẩn Tức Châu`: Viên ngọc khói xám che giấu âm thanh.
  + `BP-027 Phá Trận Phù`: Lá bùa sấm sét đánh vỡ màn chắn kết giới.
  + `BP-028 Thất Tinh Trận Bàn (Bậc Thiên)`: Bàn cờ la bàn khắc chòm sao Bắc Đẩu 7 ngôi sao nối nhau bằng tia sáng vàng.

2.5. ĐẶC TẢ HÌNH VẼ MINH HỌA CHO 18 TRỢ PHẨM PHẨM KHO (SUP-001 → SUP-018):
- `SUP-001 Duy Linh Chú`: Lá linh phù Hoàng Kim có hình Chiếc Khiên Khóa Vàng bảo vệ trang bị bất tử.
- `SUP-002 Báo Linh Chú`: Lá phù Đỏ Cam có hình Con Mắt Thiên Lý quét sóng radar quanh Cổng.
- `SUP-003 Kí Sinh Hồn`: Ấn chú Tím Đen hình hoa bỉ ngạn/dây tầm gửi hút tinh hoa.
- `SUP-004 Bội Linh Chú`: Lá linh phù Vàng Ròng có hình Chậu Châu Báu nhân đôi tài lộc.
- `SUP-005 Vệ Linh Chú`: Lá phù Lam Kim tạo lồng kim chung tráo quanh người đứng cổng.
- `SUP-006 Đối Sinh Hồn`: Ấn chú Đỏ Vàng hình đôi gương phản chiếu hút ngược dòng tiền.
- `SUP-007` đến `SUP-016`: Vẽ từng lá phù/ngọc tương ứng (`Tầm Linh Chú`, `Ẩn Tức Phù`, `Phá Ấn Chú`, `Trấn Hồn Phù`, `Tụ Linh Chú`, `Linh Lộ Phù`, `Hộ Mạch Chú`, `Giải Độc Chú`, `Dẫn Bảo Chú`, `Tĩnh Tâm Phù`).
- `SUP-017 Hoãn Nhân Hồi`: Pháp bảo hình Cánh Cổng Không Gian Thu Nhỏ gửi rương đồ bay về Hồn Thành trong khi bóng người vẫn cầm kiếm đứng lại.
- `SUP-018 Hạ Gian Hồi`: Pháp bảo hình Đồng Hồ Cát Thời Gian bằng vàng bị tia chớp cắt giảm một nửa thời gian.
```

```text
================================================================================
CHƯƠNG III: ĐẶC TẢ KIẾN TRÚC SẢNH HỒN THÀNH & BẢN ĐỒ 3D "THƯƠNG MANG CỔ VỰC" (7 VÙNG SINH THÁI, CÔNG TRÌNH & 4 ĐẠI BOSS)
================================================================================

3.1. SẢNH HỒN THÀNH 3D (AAA CELESTIAL SANCTUARY SHOWCASE — THAY THẾ HOÀN TOÀN SÀN LƯỚI XÁM):
- Đài Đứng Nhân Vật (`Celestial Jade Pedestal`):
  + Hình tròn 3 bậc bằng Đá Bạch Ngọc Cẩm Thạch (`roughness: 0.15, metalness: 0.1, clearcoat: 0.9`), mặt đài khắc chìm Đồ Hình Bát Quái & Tinh Đồ phát sáng màu vàng kim và xanh ngọc (`emissiveIntensity: 1.5`).
  + Xung quanh đài là 4 Cột Trụ Rồng Vàng cổ đại uốn lượn, trên đỉnh mỗi trụ có ngọn lửa linh hồn bập bùng; phía sau là Cổng Thiên Môn bằng đá cổ lơ lửng giữa biển mây.
  + Biển mây & Hạt linh khí: Phía dưới chân đài là tầng mây trắng bồng bềnh trôi chậm, xung quanh nhân vật có các cánh hoa đào và đốm sáng đom đóm linh khí bay lượn nhẹ nhàng.
- Hệ thống Ánh Sáng Studio 4 Điểm Tôn Dáng Nhân Vật:
  + `Key Light (DirectionalLight)`: Chiếu góc 45° từ phía trước phải, màu nắng ấm (`#FFFBEB`, cường độ `2.2`), đổ bóng mềm `PCFSoftShadowMap` 4096x4096.
  + `Rim Light (SpotLight)`: Chiếu ngược từ phía sau lưng nhân vật (`#38BDF8` hoặc màu theo hệ nguyên tố của tướng, cường độ `3.0`) để tạo đường viền sáng bạc nổi bật mái tóc và bờ vai.
  + `Fill Light (HemisphereLight)`: Bầu trời `#E0F2FE` / Mặt đất `#1E293B` cường độ `1.1` giúp vùng tối trên khuôn mặt luôn mịn màng, không bị đen sạm.
  + `Under-Glow (PointLight)`: Đặt ngay dưới tâm Bệ Đá chiếu ngược nhẹ lên tà áo và Hồn hoàn dưới chân.
- Tương tác Xoay 360° & Zoom Cận Cảnh Mặt: Cho phép người chơi vuốt ngón tay xoay nhân vật 360° trên Bệ Đá và bấm nút `"🔍 Cận Cảnh Khuôn Mặt / Toàn Thân"` để kiểm tra độ sắc nét của gương mặt, trang phục và Hồn khí.

3.2. BẢN ĐỒ CHIẾN TRƯỜNG 3D "THƯƠNG MANG CỔ VỰC" (7 VÙNG SINH THÁI LIỀN MẠCH):
- Địa hình Đa Tầng (`Multi-Biome Heightmap & Splatmap Terrain`):
  + Dùng `PlaneGeometry(600, 600, 256, 256)` có hàm địa hình `getTerrainHeight(x, z)` tạo thung lũng, bậc đá, sườn đồi và lòng sông tự nhiên.
  + Vẽ `Splatmap Procedural Texture 2048x2048` phân biệt rõ màu sắc và chất liệu mặt đất của 7 đại khu vực:
    1. `Thanh Mộc Cổ Lâm (Đông Bắc)`: Thảm cỏ xanh rêu dày, hoa phát sáng, những gốc đại thụ cổ ngàn năm có rễ bò nổi trên mặt đất và tán lá 5 tầng che bóng mát.
    2. `Chấn Nhạc Sơn Mạch (Tây Bắc)`: Đá hoa cương xám vàng, hẻm núi dựng đứng, tinh thể quặng vàng lộ thiên.
    3. `U Minh Độc Trạch (Đông Nam)`: Mặt đầm nước tím đen phản chiếu bóng trăng, cây khô ma quái, bong bóng độc khí nổi lên và làn sương tím là là mặt đất.
    4. `Hàn Tinh Tuyết Vực (Phía Bắc)`: Mặt đất phủ tuyết trắng mịn lấp lánh, mặt hồ đóng băng trong suốt (`transmission: 0.8`) nhìn thấu đáy và rừng thông phủ tuyết.
    5. `Xích Diệm Hoang Mạc (Tây Nam)`: Đất đá bazan đen nứt nẻ, các dòng sông dung nham đỏ cam phát sáng rực rỡ và cột đá lửa.
    6. `Thiên Cơ Cổ Thành (Trung Tâm)`: Sàn gạch đá cổ chạm hoa văn rồng phượng, bậc thang quảng trường rộng lớn, tượng thần cổ đại và 3 Đại Cổng trung tâm.
    7. `Hư Không Bí Cảnh (Không Gian Ẩn)`: Nền đá tinh thể tím lơ lửng giữa bầu trời sao hư không, nối với bản đồ chính qua Cổng Dịch Chuyển mở lúc phút 10:00.
- Bụi Cỏ Ẩn Thân Chuẩn Liên Quân (`Interactive Stealth Grass Clusters`):
  + Mỗi bụi cỏ không được làm bằng khối cầu hay khối hộp xanh, mà phải dùng `InstancedMesh` ghép từ 80–120 phiến lá cỏ dài uốn cong thuôn nhọn (`Blade Geometry`), đung đưa theo sóng gió `sin(time * 3.0 + x * 0.5)`. Khi nhân vật bước vào bụi cỏ, lá cỏ tách nhẹ ra, nhân vật chuyển sang hiệu ứng bán trong suốt 60% kèm biểu tượng `"👁️ Ẩn Thân"` trên đầu.
- Kiến trúc Công Trình Chiến Thuật 3D trên Bản Đồ:
  + `5 Cổng Hồi Hoàn (Extraction Portals)`: Mỗi cổng là một Đại Pháp Trận Không Gian đường kính `7.0m` gồm thềm đá bát giác, 4 cột trụ tinh thể bay lơ lửng nghiêng vào tâm, vòng xoáy cổng không gian dựng đứng và hào quang chữ Phạn xoay dưới đất. Khi đang đóng thì ánh sáng xám mờ; khi báo trước 60s thì phát xung vàng; khi mở 120s thì cột sáng xanh ngọc bích vọt thẳng lên trời.
  + `6 Đài Giao Dịch Hồn Hoàn (Battle Shops)`: Gian đình cổ风 mái cong 8 góc treo đèn lồng vàng và biển hiệu chữ `"Bảo"`, ở giữa có bàn luyện đan phát sáng.
  + `3 Tế Đàn Hồn Hoàn (Soul Ring Altars)`: Đài đá cổ khắc rãnh máu linh thú, cho phép đứng 8 giây để hấp thu và lắp Hồn hoàn nhặt được trong túi vào khe kỹ năng.

3.3. MÔ HÌNH 3D CHI TIẾT CỦA HỒN THÚ & 4 ĐẠI BOSS:
- `Hồn Thú Bách Niên & Thiên Niên`: Dựng rõ hình dáng Thanh Phong Lang (sói xanh bốn chân cơ bắp, đuôi dài, mõm nanh), Nham Giáp Tê (tê giác bọc đá), Hỏa Linh Điểu (chim lửa vỗ cánh), Hàn Băng Điệp (bướm băng khổng lồ). `Hồn Thú Biến Dị (X02 - 12%)` có kích thước lớn gấp 1.35 lần, sừng đỏ rực và vòng điện huyết sắc quanh mình.
- `Boss Thế Giới 1 — Thái Nhạc Cự Viên (Phút 08:00)`: Khỉ đột khổng lồ cao `4.5m`, vai và lưng mọc các khối tinh thể nham thạch vàng cam, hai cánh tay cơ bắp khổng lồ đấm xuống đất tạo sóng chấn động.
- `Boss Thế Giới 2 — Lôi Diễm Kỳ Lân (Phút 14:00)`: Thần thú Kỳ Lân cao `4.0m`, toàn thân phủ vảy vàng đỏ, bờm lửa cháy rực, cặp sừng rồng trên đầu phóng tia sét tím.
- `Boss Bí Cảnh Ẩn — Hư Không Cổ Long (Phút 10:00)`: Ác long hư không thân dài `12m` uốn lượn trên không bằng `TubeGeometry` 128 đốt xương sống, đôi cánh dơi rách nát tỏa hắc khí, đầu rồng 4 mắt phát sáng tím ngắt.

================================================================================
CHƯƠNG IV: ĐẶC TẢ GIAO DIỆN UI/UX & CỤM NÚT BẤM GAMEPLAY CHUẨN MOBA AAA (LIÊN QUÂN MOBILE × DELTA FORCE)
================================================================================

4.1. THIẾT KẾ CỤM NÚT BẤM GAMEPLAY BÊN PHẢI (ORNATE METALLIC MOBA ACTION PAD):
Mọi nút bấm kỹ năng trong trận phải có thiết kế đồ họa nhiều lớp như Liên Quân Mobile (Cấu hình Siêu Việt), bố trí theo đúng cung tròn công thái học của ngón cái phải:
- Nút `Đánh Thường` (Góc dưới phải, kích thước `92x92px`):
  + Khung ngoài là vòng kim loại Vàng Đồng chạm nổi hoa văn Lưỡng Long Chầu Nguyệt, tâm nút là mặt ngọc đen bóng khắc hình Song Kiếm Giao Nhau phát sáng vàng kim.
  + Khi bấm (`pointerdown`), nút lún xuống `scale(0.90)` kèm sóng xung kích vàng tỏa ra ngoài.
  + Gắn sát viền ngoài nút Đánh Thường là 2 nút phụ nhỏ (`42x42px` chuẩn Liên Quân): Nút `"⚔️ Đánh Tướng Máu Thấp"` và Nút `"🐾 Đánh Hồn Thú / Boss"`.
- 4 Nút Hồn Kỹ Chủ Động `Chiêu 1 (Q)`, `Chiêu 2 (W)`, `Chiêu 3 (E)`, `Tuyệt Kỹ (R)` (Kích thước `68x68px` cho Q/W/E và `78x78px` cho R):
  + Xếp trên cung tròn bán kính `145px` tính từ tâm nút Đánh Thường (ở các góc `185°`, `145°`, `108°`, `72°`).
  + MỖI NÚT KỸ NĂNG PHẢI TỰ ĐỘNG VẼ ICON MINH HỌA RIÊNG BIỆT (48 Icon cho 12 tướng x 4 chiêu) bằng hàm `renderSkillIconCanvas(heroId, slot)`:
    * Ví dụ Lâm Dật: `Q` vẽ roi dây leo gai xanh quất chéo; `W` vẽ rễ cây cổ thụ trồi lên trói chân; `E` vẽ thảm rừng sinh trưởng; `R` vẽ lồng đại mộc Vạn Đằng Ngục.
    * Ví dụ Hàn Trạch: `Q` vẽ đại chùy quét quạt lửa; `W` vẽ khiên đá lao tới; `E` vẽ mặt đất nứt toác; `R` vẽ búa thần giáng thiên lôi địa hỏa.
    * (Tương tự vẽ đúng biểu tượng cho toàn bộ 10 nhân vật còn lại!).
  + Hiển thị trạng thái trên nút:
    * Viền nút phát sáng màu nguyên tố khi sẵn sàng; góc dưới nút gắn nhãn nhỏ ghi lượng Hồn lực tiêu hao (ví dụ `💧14`).
    * Khi đang hồi chiêu: Phủ lớp quạt tối quay ngược chiều kim đồng hồ (`conic-gradient` cập nhật 60fps) và hiển thị số giây thập phân cỡ lớn màu trắng viền đen ở chính giữa (ví dụ `5.4s`).
    * Khi không đủ Hồn lực: Phủ lớp màu xanh lam sẫm kèm biểu tượng giọt năng lượng cạn.
- Cơ chế Kéo Thả Định Hướng Chiêu Thức 3D (`3D Skillshot Targeting & Cancel Zone`):
  + Khi người chơi chạm và giữ/kéo trên nút `Q, W, E, R`:
    * Dưới chân nhân vật trong cảnh 3D lập tức hiện `Vòng Giới Hạn Tầm Chiêu` màu xanh ngọc mảnh và `Vật Chỉ Hướng 3D` tương ứng (Mũi tên dài phát sáng cho chiêu thẳng, Hình quạt 120° cho chiêu quét, hoặc Vòng tròn tâm ngắm di động trên mặt đất cho chiêu AOE).
    * Ở góc trên bên phải màn hình hiện `Vùng Hủy Chiêu ("✕ HỦY CHIÊU" nền đỏ bán trong suốt)`: nếu kéo ngón tay vào vùng này rồi nhả ra thì hủy tung chiêu và vòng định hướng 3D đổi sang màu đỏ cảnh báo.
- Hàng Nút Chiến Thuật Phụ (Bán kính trong):
  + Nút `F — Linh Bộ (Tốc Biến)` (`54x54px`, CD `8.0s`): Vẽ icon Bóng Người Lướt Hoả Tốc màu xanh vàng.
  + 3 Nút `Trợ Phẩm Phẩm Kho` (`50x50px`): Hiển thị đúng tranh minh họa của 3 Trợ phẩm đã mang vào trận kèm con số lượt dùng còn lại.
  + Nút `Tương Tác Ngữ Cảnh Thông Minh 1 Chạm` (`Context-Sensitive Smart Button`): Tự động bật lên ngay phía trên nút `R` với viền vàng chạy quanh khi đứng gần Hòm Xác (`"📦 LỤC SOÁT HÒM XÁC"`), Tế Đàn (`"🔮 HẤP THU HỒN HOÀN - 8s"`), hoặc bước vào Cổng Hồi Hoàn (`"🌀 HỒI HOÀN VỀ THÀNH"` & `"📤 HOÃN NHÂN HỒI - GỬI ĐỒ"`).

4.2. CẦN GẠT JOYSTICK TRÁI, MUA ĐỒ NHANH & GIAO DIỆN LỤC SOÁT HÒM XÁC KIỂU DELTA FORCE:
- Bên trái dưới: `Floating Virtual Joystick` viền vàng kim cổ ngữ, nhạy và mượt; ngay phía trên Joystick là `2 Ô Mua / Ghép Nhanh Bổ Phẩm 1 Chạm` (hiển thị icon + tên + giá TB giống hệt Liên Quân Mobile khi đứng gần Đài Giao Dịch/Thương Nhân).
- Giao diện Lục Soát Hòm Xác / Rương Boss (Chuẩn Delta Force Hazard Operations):
  + Khi bấm mở Hòm Xác, hiển thị cửa sổ chia 2 nửa rõ ràng: Bên trái là `Trang Bị & Túi Đồ Của Bạn (24 Ô | Điểm Tải W: .../48)`, Bên phải là `Chiến Lợi Phẩm Trong Hòm`.
  + Các món đồ bậc cao (Hồn Hoàn Vạn Niên, Hồn Cốt, Tiên Khí) có hiệu ứng `Kính Lúp Quét Thẩm Định 0.8 giây` kèm âm thanh/hiệu ứng lóe sáng vàng/đỏ khi hiện ra. Hỗ trợ chạm 1 lần để chuyển nhanh sang túi hoặc nút `"⚡ Nhặt Nhanh Đồ Quý"`.

================================================================================
CHƯƠNG V: ĐẶC TẢ TOÀN BỘ LUẬT GAMEPLAY V2.5 & KIẾN TRÚC BẢO MẬT 5 LỚP CHỐNG CRACK / CHỐNG HACK ("THIÊN ĐẠO HỘ GIỚI")
================================================================================

5.1. CÁC LUẬT GAMEPLAY & CÔNG THỨC TOÁN HỌC BẮT BUỘC CHẠY CHÍNH XÁC 100%:
- Chế độ chơi: Solo (100 người), Duo (50x2 = 100), Squad 3 (32x3 = 96), Squad 4 (25x4 = 100). Hỗ trợ Đấu Thường và Đấu Xếp Hạng (Ranked chuẩn hóa chỉ số Skin Hồn Khí VIP về ngang mức Cơ Bản: +2 Công/Hồn công, +8 HP, ≤ 1.2%).
- Hai ngăn ví Thanh bảo trong trận:
  + `BROUGHT_THANH_BAO` (Tối đa 300 TB mang từ Hồn Thành vào): Ưu tiên trừ trước khi mua/ghép Bổ phẩm. Nếu tử vong: mất 50% phần chưa tiêu, 50% hoàn về Hồn Thành.
  + `EARNED_THANH_BAO` (Kiếm mới trong trận từ Hồn thú, Boss, Hòm, PvP): Chết rơi 100% vào Hòm Xác.
- Cửa hàng 28 Bổ Phẩm (BP-001 → BP-028): Giữ tối đa `7 ô Bổ phẩm đồng thời` (mua/bán không giới hạn số lượt); bán lại hoàn `60% giá mua`; đủ `7 công thức ghép Bậc Thiên cố định`; tháo món Bậc Thiên hoàn 1 nguyên liệu Bậc Linh + 50% tiền chênh lệch; mua món tương khắc bị `Phản Phệ Hồn Mạch -4% chỉ số đối nghịch/món (trần -8%)`.
- Cổng Hồi Hoàn (Mở tại mốc phút `05:00, 10:00, 15:00` với 5 Cổng/đợt mở 120s, và phút `20:00–22:00` với 3 Đại Cổng):
  + Thời gian đứng cổng gốc: `T_gốc = 20 + 2 * Math.ceil(W / 4)` giây (với `W` là tổng Điểm Tải đồ chuyển về, tối đa W = 48 -> 44s).
  + Khi có `SUP-018 Hạ Gian Hồi` (Cấp 1–4 giảm 40% / 45% / 50% / 55%), áp dụng mức sàn an toàn tuyệt đối `15.0 giây`: `T_cuối = Math.max(15.0, Number((T_gốc * (1 - R)).toFixed(1)))`.
  + Đứng trong cổng được giảm `7.2%` sát thương nhận vào (nhân với `SUP-005 Vệ Linh Chú` -15% thành giảm `21.12%`). Đánh thường không hủy cổng; dính Hard CC làm tạm dừng thanh đếm tối đa 3.0s; Overtime Grace giữ cổng nếu đã bắt đầu đứng trước giây 120.
  + `SUP-017 Hoãn Nhân Hồi`: Tích chọn đồ trong túi + trang bị tháo chọn để gửi về Kho Hồn Thành 1 lần (cùng `EARNED_THANH_BAO`), nhân vật vẫn ở lại đấu trường chiến đấu tiếp.
  + `SUP-001 Duy Linh Chú` (Cấm mang chung với `SUP-004 Bội Linh Chú`): Khi chết, quay xác suất bảo hiểm độc lập (`10% / 25% / 50% / 70%`) cho từng trang bị mang từ Hồn Thành vào — món giữ được chuyển thẳng về Kho Hồn Thành, không rơi ra xác.
  + `SUP-003 Kí Sinh Hồn` (hút 10% Hồn Tinh trong 120s) và `SUP-006 Đối Sinh Hồn` (phá ấn Kí Sinh và hút ngược 15% từ `EARNED_THANH_BAO` kiếm mới của chủ ấn trong 120s, trần 150 TB).

5.2. KIẾN TRÚC BẢO MẬT 5 LỚP CHỐNG CRACK & CHỐNG HACK ("THIÊN ĐẠO HỘ GIỚI" ANTI-CHEAT CORE):
- Lớp 1 (`SecureMemoryVault`): Mã hóa toàn bộ biến tiền tệ, máu, hồn lực, sát thương, tốc chạy, hồi chiêu và thời gian đứng Cổng trong RAM bằng `XOR + Dynamic Salt + FNV1a/SHA256 Checksum` đóng gói trong Private IIFE Closure (`Object.freeze`), tự động phát hiện và khôi phục từ Snapshot nếu bị GameGuardian / Cheat Engine sửa RAM.
- Lớp 2 (`Time & Movement Validator`): Chống Speedhack/Teleport bằng kiểm tra vận tốc mỗi khung hình và đối chiếu độ lệch đồng hồ `performance.now()` vs `Date.now()`, kiểm tra `[native code]` của các hàm thời gian; khóa cứng bộ đếm 20s+ của Cổng Hồi Hoàn.
- Lớp 3 (`Anti-Maphack Bush Culling`): Khi kẻ địch đứng trong Bụi Cỏ Ẩn Thân hoặc ngoài tầm nhìn mà không bị chiếu bởi kỹ năng Trinh sát, xóa tọa độ thực khỏi tầng hiển thị để vô hiệu hóa mọi bản Mod Hack Map.
- Lớp 4 (`Atomic Crypto Ledger`): Gắn `UUID + HMAC Signature` cho từng vật phẩm và thực thi giao dịch Hoãn Nhân Hồi / Cổng Hồi Hoàn / Ghép đồ theo cơ chế khóa nguyên tử 2 pha chống nhân bản đồ (Anti-Dupe).
- Lớp 5 (`UI Security Shield & Android Native Hardening`): Đặt biểu tượng `"🛡️ Thiên Đạo Hộ Giới"` trên thanh Top Bar (bấm vào mở bảng giám sát bảo mật có nút `"Mô phỏng Tấn công Hack để Test Khiên Bảo Vệ"`) và cung cấp kèm file `SecurityGuard.kt` + `proguard-rules.pro` kiểm tra chữ ký APK SHA-256 chống Crack/Mod Menu/Lucky Patcher/Frida/Root.

Hãy lập trình và xuất toàn bộ mã nguồn hoàn chỉnh, tuyệt đẹp, chạy mượt ngay bây giờ!
```
