# BỘ PROMPT CHI TIẾT CHO GOOGLE AI STUDIO — GAME ANDROID "HỒN GIỚI: SINH TỒN (V2.5)"
**Định hướng Cốt lõi: Đồ họa 3D Siêu Đa Giác (Ultra-High-Poly 100.000+ Triangles & PBR Shader) × Giao diện Công Thái Học Thuận Tiện × Gameplay Liên Quân Mobile & Delta Force (Garena)**

> **Lưu ý kỹ thuật về Số lượng Mặt Đa Giác (Polygon / Triangle Count):**
> - Trong Three.js, tham số `segments` là số lát cắt trên **một bộ phận đơn lẻ** (ví dụ 128×128 lát cắt trên 1 khối cầu sẽ tạo ra **32.768 mặt tam giác** chỉ cho riêng bộ phận đó).
> - Trong bản cập nhật này, mình đã đẩy yêu cầu lên mức **Siêu Đa Giác (Ultra-High-Poly Tessellation: 128 – 256 segments mỗi chi tiết, tổng cộng 50.000 – 150.000+ mặt đa giác cho mỗi mô hình Nhân vật/Boss)**, đồng thời yêu cầu dựng **đủ ngón tay, cơ bắp, vân giáp chạm nổi (Displacement & Normal Map), từng lọn tóc uốn cong** và tích hợp **Dynamic LOD (Level of Detail)** để vừa đạt độ chi tiết tối đa vừa giữ tốc độ 60 FPS mượt mà trên điện thoại Android.

Trong tài liệu này, bạn có **2 lựa chọn Prompt**:
- **Mục 1 (Prompt Nâng Cấp Nhanh):** Copy và dán nối tiếp vào khung chat AI Studio hiện tại để bắt nó nâng cấp toàn bộ Model 3D lên chuẩn **Siêu Đa Giác (Ultra-High-Poly)** cực kỳ chi tiết và làm lại giao diện UI gọn đẹp.
- **Mục 2 (Master Prompt Toàn Diện từ đầu):** Dùng khi mở phiên mới trên AI Studio kèm file `Hon_Gioi_Sinh_Ton_GDD_V2.5_Hoan_Chinh.docx`.

## 1. Prompt Nâng Cấp Nhanh: Đẩy Model 3D lên Siêu Đa Giác (Ultra-High-Poly Cực Chi Tiết) & Thiết Kế Lại UI Dễ Thao Tác (Dán nối tiếp vào AI Studio)

```text
YÊU CẦU NÂNG CẤP ĐỒ HỌA TỐI ĐA (ULTRA-HIGH-POLY 3D TESSELLATION & ERGONOMIC MOBILE UI):
Hiện tại các model 3D trong game còn quá đơn giản, ít mặt đa giác và giao diện UI còn rối. Hãy viết lại và nâng cấp toàn diện hệ thống đồ họa 3D lên mức CHI TIẾT TỐI ĐA (càng nhiều mặt đa giác, càng sắc nét, tròn mượt và nhiều chi tiết phụ càng tốt) cùng giao diện UI công thái học theo đúng đặc tả dưới đây:

====================================================================
1. DỰNG MODEL 3D SIÊU ĐA GIÁC & CHI TIẾT CỰC CAO (ULTRA-HIGH-POLY MESH — 50.000 ĐẾN 150.000+ ĐA GIÁC):
====================================================================
- CẤM TUYỆT ĐỐI dùng khối hộp vuông (`THREE.BoxGeometry`) hoặc hình khối ít mặt. Mọi đường cong, cơ thể, giáp trụ, vũ khí và quái vật phải đạt độ mịn tuyệt đối ở cấp độ Siêu Đa Giác (Ultra-High Subdivision: `radialSegments = 128`, `tubularSegments = 128–256`, `heightSegments = 64–128`).
- DỰNG ĐẦY ĐỦ CẤU TRÚC GIẢI PHẪU & CHI TIẾT PHỤC TRANG PHỨC TẠP CHO 12 NHÂN VẬT:
  + Đầu & Khuôn mặt chi tiết cao: Hộp sọ và cằm uốn cong mượt bằng `LatheGeometry` (128 segments) kết hợp `SphereGeometry(r, 128, 128)` biến dạng đỉnh (Vertex Sculpting) tạo sống mũi, hốc mắt, đôi mắt nhiều lớp (tròng trắng, con ngươi phát sáng, lông mày sắc nét), tai và mão kim loại chạm khắc đa tầng.
  + Mái tóc nhiều lớp sống động: Kết hợp từ 18–30 lọn tóc độc lập uốn theo đường cong `CatmullRomCurve3` bằng `TubeGeometry(curve, 128, radius, 32, false)` thuôn nhọn dần về đuôi tóc.
  + Thân người, Cơ bắp & Giáp trụ nhiều lớp (Multi-Layered Armor & Cloth):
    * Dựng rõ lồng ngực, cơ bụng, thắt lưng, hông, bả vai uốn lượn bằng lưới đa giác mật độ cao.
    * Đắp nổi các tấm giáp vai (Pauldrons), giáp ngực,护 tâm kính, đai lưng ngọc bội, vạt áo choàng nhiều lớp và dải lụa tiên hiệp bằng `ExtrudeGeometry` (`curveSegments: 64, steps: 16, bevelEnabled: true, bevelSegments: 16`) và `ParametricGeometry` / `PlaneGeometry(w, h, 128, 128)` uốn sóng mềm mại theo gió.
  + Tay, Bàn tay có đủ Ngón tay & Chân nhiều khớp:
    * Cánh tay trên, khuỷu tay, cẳng tay có giáp cổ tay (Bracers) chạm nổi, bàn tay dựng rõ lòng bàn tay và 5 ngón tay nắm chặt chuôi Hồn khí.
    * Đùi, khớp gối có giáp gối, bắp chân và giày chiến hài nhiều chi tiết.
- DỰNG VŨ KHÍ HỒN KHÍ & HỒN HOÀN SIÊU CHI TIẾT:
  + 12 Hồn Khí bản mệnh (Mộc Tinh Trượng, Chấn Nhạc Chùy, Song Ảnh Nhận, Lôi Vũ Phiến, Nguyệt Linh Kính, Huyền Quy Thuẫn, Diệm Liên Luân, Băng Điệp Trâm, Huyền Nguyệt Cung, Kim Hổ Trảo, Thanh Ngọc Cầm, Hư Ảnh Xà Trượng): Phải được dựng từ hàng chục chi tiết ghép lại (chuôi cầm quấn lụa, chắn tay chạm rồng/phượng/hoa sen bằng `TorusKnotGeometry(r, tube, 256, 64)` và `ExtrudeGeometry` 64 segments, lõi ngọc phát sáng, lưỡi vũ khí vát sắc bén có rãnh huyết/hoa văn cổ ngữ).
  + Vòng Hồn Hoàn dưới chân và sau lưng: Dùng `TorusGeometry(radius, tube, 64, 256)` siêu mịn kết hợp 3 vòng cổ ngữ xoay ngược chiều nhau và hạt năng lượng bay quanh.
- DỰNG HỒN THÚ, 4 ĐẠI BOSS & CẢNH VẬT 7 VÙNG SINH THÁI ĐỘ CHI TIẾT CAO:
  + Hồn thú & Boss (Thái Nhạc Cự Viên, Lôi Diễm Kỳ Lân, Hư Không Cổ Long): Dựng đầy đủ cơ bắp cuồn cuộn, vảy rồng/lông/sừng uốn cong 128 segments, móng vuốt sắc nhọn, răng nanh, mắt phát sáng và hiệu ứng thở ra khói/lửa/sét.
  + Địa hình & Cây cối: Mặt đất dùng lưới `PlaneGeometry(size, size, 256, 256)` biến dạng chiều cao (Heightmap Displacement) tạo đồi dốc, bờ sông, hẻm núi tự nhiên; cây cổ thụ có rễ nổi uốn lượn, thân cây sần sùi nhiều nhánh và hàng trăm tán lá xếp lớp.
- VẬT LIỆU PBR CAO CẤP, NORMAL/DISPLACEMENT MAP & HẬU KỲ ĐỒ HỌA (AAA SHADING):
  + Mọi Mesh bắt buộc đặt `flatShading: false` và gọi `geometry.computeVertexNormals()`.
  + Tự động sinh Procedural High-Res Textures (1024x1024 Canvas) cho `normalMap`, `roughnessMap`, `metalnessMap`, `bumpMap` và `displacementMap` để tạo vân chạm khắc kim loại, vân vảy rồng, vân vải lụa và vân đá thật đến từng milimet.
  + Dùng `THREE.MeshPhysicalMaterial` với đầy đủ `metalness`, `roughness`, `clearcoat: 1.0`, `sheen: 1.0`, `iridescence: 0.4` (ánh xà cừ/huyền ảo cho trang bị VIP và Hồn cốt), `transmission: 0.85` (độ trong suốt khúc xạ ánh sáng như ngọc và băng).
  + Bật `EffectComposer` + `UnrealBloomPass` + `PCFSoftShadowMap` (4096x4096 shadow map) + `HemisphereLight` + `DirectionalLight` + `PointLight` gắn theo vũ khí để ánh sáng phản chiếu lấp lánh trên từng mặt đa giác.
  + Áp dụng `THREE.LOD` (Level of Detail tự động) và `InstancedMesh` cho cảnh vật xa để vừa giữ trọn vẹn độ chi tiết hàng trăm ngàn đa giác ở cự ly gần vừa đảm bảo tốc độ khung hình 60 FPS mượt mà.

====================================================================
2. THIẾT KẾ LẠI GIAO DIỆN UI/UX THUẬN TIỆN, GỌN GÀNG CHO ĐIỆN THOẠI (ERGONOMIC MOBILE HUD):
====================================================================
- NGUYÊN TẮC 82% MÀN HÌNH THÔNG THOÁNG:
  + Không để bất kỳ bảng chữ dài hay cửa sổ nào che khuất tầm nhìn 3D ở giữa màn hình. Mọi cửa sổ lớn (Cửa hàng 28 Bổ phẩm, Túi đồ 24 ô, Bảng chọn đồ Hoãn Nhân Hồi, Bảng Dev Test) phải ẩn mặc định và chỉ trượt ra (Slide-over Drawer / Modal có nút Đóng `X` to rõ) khi người chơi bấm mở.
- BỐ CỤC CÔNG THÁI HỌC 2 NGÓN CÁI (CHUẨN LIÊN QUÂN MOBILE × DELTA FORCE):
  + Góc Dưới Trái (Vùng ngón cái trái):
    * Cần điều khiển `Floating Virtual Joystick` thông minh: Chạm bất kỳ đâu ở góc dưới trái là tâm Joystick hiện ngay dưới ngón cái, nhả tay là tự mờ đi.
    * Ngay phía trên Joystick: Hiển thị `2 Ô Đề Xuất Mua/Ghép Nhanh Bổ Phẩm` nhỏ gọn giống hệt Liên Quân Mobile (bấm 1 chạm mua/ghép luôn không cần mở Shop lớn).
  + Góc Dưới Phải (Vùng ngón cái phải - Xếp hình vòng cung chuẩn tư thế cầm máy):
    * Nút `Đánh Thường` to tròn ở góc trong cùng, kèm 2 nút chọn mục tiêu nhỏ (`Đánh Quái` và `Đánh Tướng Máu Thấp`).
    * 4 Nút Kỹ Năng `Chiêu 1 (Q)`, `Chiêu 2 (W)`, `Chiêu 3 (E)`, `Tuyệt Kỹ (R)` xếp theo vòng cung tròn đều quanh nút Đánh Thường; mỗi nút có vòng xoay đếm ngược hồi chiêu (Radial Cooldown) kèm số giây to rõ.
    * Hàng nút phụ nằm gọn phía trong tầm với: Nút `F (Linh Bộ / Tốc Biến)` + `3 Nút Trợ Phẩm`.
  + Nút Tương Tác Ngữ Cảnh Thông Minh 1 Chạm (Context-Sensitive Smart Action Button):
    * Tự động hiện nút nổi ngay phía trên cụm kỹ năng phải khi nhân vật đứng gần mục tiêu tương tác: `"MỞ HÒM LỤC SOÁT"` (có nút Nhặt Nhanh 1 Chạm), `"HẤP THU HỒN HOÀN (8s)"`, hoặc cụm 2 nút `"RÚT LUI VỀ THÀNH"` / `"GỬI ĐỒ - HOÃN NHÂN HỒI"` khi bước vào Cổng Hồi Hoàn.
  + Cạnh Trên Màn Hình (Thanh Top Bar siêu gọn):
    * Góc trên trái: Minimap tròn chuẩn Liên Quân (chạm để phóng to).
    * Chính giữa trên: Đồng hồ trận đấu, đếm ngược đợt Cổng Hồi Hoàn (5/10/15/20p), số người sống sót (`.../100`) và 2 ngăn ví (`Vốn: ... TB` | `Trận: ... TB`).
    * Góc trên phải: Nút mở nhanh `Túi Đồ ( .../24 ô | W: .../48 )`, nút `Shop Bổ Phẩm ( .../7 ô )` và nút thu gọn `⚙️ Dev Test`.

Hãy cập nhật và xuất toàn bộ mã nguồn hoàn chỉnh với đồ họa 3D Siêu Đa Giác (Ultra-High-Poly) cực kỳ chi tiết và giao diện UI mới ngay bây giờ!
```

## 2. Prompt Tổng Hoàn Chỉnh (Dùng khi tạo mới từ đầu kèm file Word GDD V2.5)

Nếu bạn tạo một cuộc trò chuyện mới trên Google AI Studio (đính kèm file `Hon_Gioi_Sinh_Ton_GDD_V2.5_Hoan_Chinh.docx`), hãy dùng bản **Master Prompt đã tích hợp sẵn yêu cầu Model 3D Siêu Đa Giác (Ultra-High-Poly 128–256 Segments, 50.000–150.000+ Triangles) & UI Công Thái Học** dưới đây:

```text
ĐÓNG VAI: Bạn là Principal Mobile Game Architect, Lead Three.js/WebGL 3D Technical Artist và Senior Android Game Developer.

NHIỆM VỤ CỐT LÕI:
Hãy đọc TOÀN BỘ file tài liệu đính kèm "Hon_Gioi_Sinh_Ton_GDD_V2.5_Hoan_Chinh.docx" (Bản Đặc Tả Thiết Kế Game Chính Thức V2.5 của dự án "Hồn Giới: Sinh Tồn") và lập trình một ỨNG DỤNG GAME 3D TRÊN DI ĐỘNG ANDROID HOÀN CHỈNH, CHƠI ĐƯỢC NGAY TRỰC TIẾP.

3 TIÊU CHUẨN BẮT BUỘC VỀ ĐỒ HỌA 3D SIÊU ĐA GIÁC, GIAO DIỆN UI & GAMEPLAY:
1. ĐỒ HỌA 3D SIÊU ĐA GIÁC CỰC CHI TIẾT & VẬT LIỆU PBR (ULTRA-HIGH-POLY MESH — 128 ĐẾN 256 SEGMENTS, 50.000–150.000+ ĐA GIÁC):
   - CẤM TUYỆT ĐỐI dùng khối hộp vuông (`BoxGeometry`) hay hình khối ít mặt. Càng nhiều mặt đa giác, càng tròn mượt và càng nhiều chi tiết giải phẫu/phục trang càng tốt!
   - Bắt buộc dựng mô hình 3D nhân vật, vũ khí Hồn khí, Hồn thú, Boss và cảnh vật ở mật độ lưới Siêu Đa Giác (`radialSegments = 128`, `tubularSegments = 128–256`, `bevelSegments = 16`):
     + Nhân vật có đầy đủ cấu trúc giải phẫu (hộp sọ, sống mũi, mắt phát sáng nhiều lớp, 20+ lọn tóc uốn cong bằng `TubeGeometry` 128 segments, cơ ngực/eo/vai, bàn tay 5 ngón cầm vũ khí, giáp vai/giáp ngực chạm nổi nhiều tầng bằng `ExtrudeGeometry` & `LatheGeometry` 128 segments, áo choàng và dải lụa uốn sóng mềm mại).
     + Vũ khí Hồn khí và Hồn hoàn (`TorusGeometry(r, tube, 64, 256)` + `TorusKnotGeometry(r, tube, 256, 64)`) chạm khắc cổ ngữ, lõi ngọc phát sáng và rãnh lưỡi sắc nét.
     + Địa hình 7 vùng sinh thái dùng lưới `PlaneGeometry(size, size, 256, 256)` biến dạng chiều cao tự nhiên, cây cổ thụ nhiều nhánh uốn lượn, Boss Vạn Niên có đầy đủ vảy, sừng cong, móng vuốt và cơ bắp.
   - Bật Smooth Shading (`flatShading: false`, `computeVertexNormals()`), tự sinh Procedural High-Res Normal/Roughness/Bump/Displacement Maps (1024x1024), dùng vật liệu cao cấp `MeshPhysicalMaterial` (`metalness`, `roughness`, `clearcoat: 1.0`, `sheen: 1.0`, `iridescence`, `transmission`), kết hợp Post-Processing `UnrealBloomPass`, bóng đổ mềm `PCFSoftShadowMap` 4096x4096, `THREE.LOD` và chuyển động khung xương đa khớp mượt mà.
2. GIAO DIỆN UI CÔNG THÁI HỌC THUẬN TIỆN CHO MOBILE (ERGONOMIC TOUCH HUD):
   - Giữ hơn 82% diện tích màn hình thông thoáng cho cảnh 3D; mọi bảng lớn (Shop 28 Bổ phẩm, Túi đồ 24 ô, Bảng Hoãn Nhân Hồi, Bảng Dev Test) đều đóng mở dạng ngăn kéo trượt (Modal/Drawer) có nút đóng nhanh.
   - Góc dưới trái: `Floating Virtual Joystick` (chạm đâu hiện tâm đó) + 2 ô `Mua/Ghép Nhanh Bổ Phẩm 1 chạm` kiểu Liên Quân Mobile.
   - Góc dưới phải: Nút `Đánh Thường` lớn (kèm 2 nút phụ chọn Tướng máu thấp / Quái) + vòng cung `4 Chiêu Thức Q/W/E/R` kéo thả định hướng 3D (có vùng Hủy chiêu màu đỏ) + nút `F (Linh Bộ CD 8s)` + `3 nút Trợ Phẩm` + `Nút Tương Tác Thông Minh 1 Chạm` tự hiện khi lại gần Hòm Xác, Tế Đàn hoặc Cổng Hồi Hoàn.
3. CƠ CHẾ GAMEPLAY (LIÊN QUÂN MOBILE × DELTA FORCE GARENA):
   - Sảnh Hồn Thành trước trận: Kho đồ (Stash) tính Tổng giá trị trang bị rủi ro, chọn 1 trong 12 Nhân vật (H01–H12) và 1 trong 3 Nhánh tiến hóa võ hồn (36 nhánh chuẩn Mục C3), lắp Tiên khí, 2 Hồn hoàn (HR-01→12), 6 Hồn cốt + Bát Chu Mâu (HB-01→07), chọn tối đa 3 Trợ phẩm trong 18 loại (cấm chọn chung Duy Linh Chú và Bội Linh Chú), chọn chế độ Squad 4 (25x4=100) / Squad 3 / Duo / Solo, chuẩn hóa Skin VIP trong Rank ≤ 1.2%, và trích tối đa 300 Thanh bảo vào ngăn `BROUGHT_THANH_BAO`.
   - Trong trận (Battle Royale 100 người): Bản đồ 7 vùng sinh thái "Thương Mang Cổ Vực", bụi cỏ ẩn thân, vùng nguy hiểm `Hồn Chướng`, trần Khống chế cứng `2.5s / cửa sổ 5s`, Cửa hàng 7 ô Bổ phẩm (mua/bán không giới hạn số lượt, bán lại 60%, 7 công thức ghép Bậc Thiên, tháo đồ Bậc Thiên, phản phệ -4%/món tối đa -8%), Túi đồ `24 ô / 48 Điểm Tải (W)` có hiệu ứng kính lúp thẩm định đồ quý kiểu Delta Force, và 3 Tế Đàn Hồn Hoàn (hấp thu 8s).
   - Cổng Hồi Hoàn (Mốc 5, 10, 15, 20 phút — mở 120s):
     + Thời gian đứng cổng gốc: `T_gốc = 20 + 2 * Math.ceil(W / 4)` giây.
     + Khi có `SUP-018 Hạ Gian Hồi` (-40% / -45% / -50% / -55%), áp dụng mức sàn an toàn tuyệt đối `15.0 giây`: `T_cuối = Math.max(15.0, Number((T_gốc * (1 - R)).toFixed(1)))`.
     + Giảm `7.2%` sát thương khi đứng cổng (`21.12%` nếu có thêm `SUP-005 Vệ Linh Chú`). Đánh thường không hủy cổng; Hard CC tạm dừng thanh đếm tối đa 3s; hỗ trợ Overtime Grace.
     + `SUP-017 Hoãn Nhân Hồi`: Gửi đồ đã chọn (túi + trang bị tháo chọn) và `EARNED_THANH_BAO` về kho Hồn Thành 1 lần rồi nhân vật vẫn ở lại đấu trường chiến đấu tiếp.
     + Đầy đủ `Kí Sinh Hồn` (10% Hồn Tinh), `Đối Sinh Hồn` (15% EARNED_THANH_BAO, trần 150 TB), `Duy Linh Chú` (bảo hiểm 10%/25%/50%/70% từng món mang vào khi chết) và `Bội Linh Chú` (nhân x1.20→x1.92 khi rút thành công).

Hãy viết mã nguồn đầy đủ, hoàn chỉnh, chạy mượt trực tiếp ngay bây giờ!
```
