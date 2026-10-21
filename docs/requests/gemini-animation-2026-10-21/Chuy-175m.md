# Chuy-175m — báo cáo tham khảo Gemini

Nguồn: https://drive.google.com/file/d/1QKih3X7dxHVBv9KUSfyMWyw4WmuiYya_/view

SHA-256 DOCX: c729606f4dda827343e07ca5b655e17ea31ff4e77a9d99d353941558cdcedeea

Bản trích đầy đủ văn bản/bảng. Đây là tài liệu tham khảo; kiểm chứng và retarget sang rig thật trước khi áp dụng.

BÁO CÁO KỸ THUẬT ĐẶC TẢ TOẠ ĐỘ KHỚP XƯƠNG 3D & QUỸ ĐẠO ANIMATION THEO THỜI GIAN THỰC: HIỆU ỨNG XUẤT HIỆN NHÂN VẬT LÂM DẬT (1.85M) & CÂY CHÙY CHIẾN (1.75M)

Tài liệu Chuẩn hoá Hệ trục Không gian Blender 3D (Right-Handed +Z Up), Giải phẫu Động học 60 Khớp Xương (Bao gồm 30 Khớp Ngón Tay) & Bảng Nội suy Thời gian thực 60 FPS dành cho GPT 6.1 Sol - Xhight

| TÓM TẮT ĐIỀU HÀNH & RÀNG BUỘC KỸ THUẬT BẮT BUỘC CHO GPT 6.1 SOL - XHIGHT1. Thông số Hình học Cố định: Nhân vật manơcanh gỗ (LamDat_Armature) có tổng chiều cao đứng thẳng H = 1.850 m (Đỉnh đầu Z = 1.850 m, Tâm khuôn mặt Z = 1.745 m, Trọng tâm Pelvis Z = 1.005 m). Cây chùy chiến (WarHammer_Rig) có tổng chiều dài L = 1.750 m, gồm khối đầu búa hình hộp chữ nhật (Rộng W = 0.420 m x Cao H = 0.240 m x Dày D = 0.220 m) và phần cán trụ tròn lộ ra dài 1.510 m (bán kính cán R = 0.022 m / đường kính 44 mm).2. Quy định Khung 1 (Frame 1 – 45 / 0.00s – 0.75s — Góc máy nghiêng): Hoàn toàn KHÔNG CÓ NHÂN VẬT trên cảnh (Character_Rig đặt ở hide_viewport = True, hide_render = True, Scale = (0, 0, 0) tại Z = -1.800 m). Chỉ có cây chùy dài 1.75 m rơi từ độ cao Z = 2.800 m xuống đập mạnh phần đầu búa hình hộp chữ nhật xuống mặt đất tại (-0.180, -0.040, 0.120) m (Frame 18), cán chùy hướng chéo lên phía trên bên phải khung hình tới (+0.509, -0.040, 1.597) m, hất tung cát bụi và đá vụn.3. Quy định Khung 2 (Frame 60 – 95 / 1.00s – 1.58s — Góc chính diện): Nhân vật (1.85 m) nhảy từ trên cao xuống đáp đất trong tư thế ngồi xổm (Pelvis tại -0.040, +0.040, 0.540 m). Cánh tay phải giải phẫu (UpperArm.R -> Hand.R, nằm bên trái ảnh -X) duỗi thẳng chống xuống mặt đất tại (-0.220, -0.200, 0.015) m; cánh tay trái giải phẫu (UpperArm.L -> Hand.L, nằm bên phải ảnh +X) đưa sang ngang nắm chặt cán cây chùy tại (+0.155, -0.162, 0.950) m khi đầu chùy đang cắm nghiêng ở góc dưới bên phải (+0.340, -0.180, 0.120) m.4. Quy định Khung 3 (Frame 145 – 180 / 2.42s – 3.00s — Góc chính diện): Nhân vật đứng thẳng dậy hoàn toàn (Đỉnh đầu Z = 1.850 m), một tay buông thẳng tự nhiên bên hông, tay kia nâng cây chùy dựng thẳng đứng dọc trục +Z (từ Z_tail = 0.115 m đến Z_top = 1.865 m, tổng chiều dài đúng 1.750 m) sao cho tâm đầu chùy ở Z = 1.745 m ngang tầm đầu nhân vật, và mặt phẳng rộng nhất của đầu chùy (0.420 m x 0.240 m) xoay thẳng về phía trước (vector pháp tuyến N = (0, -1, 0) hướng về Camera), tạo thành mặt phẳng song song và đồng hướng tuyệt đối với khuôn mặt nhân vật. |
| --- |



1. Hệ Quy Chiếu Không Gian Blender 3D & Giải Pháp Triệt Tiêu Lỗi Mất Nhận Thức Hướng

Nguyên nhân cốt lõi khiến mô hình GPT 6.1 Sol - Xhight mất nhận thức về hướng trong Blender khi xử lý kịch bản này xuất phát từ sự xung đột giữa hai hệ quy chiếu trong bản mô tả và hình ảnh minh hoạ 15456.jpg: Ở Khung 2, văn bản gọi tên tay theo Giải phẫu Nhân vật (Cánh tay phải .R ở bên trái bức ảnh chống xuống đất; Cánh tay trái .L ở bên phải bức ảnh đưa sang ngang nắm cán chùy). Tuy nhiên, sang Khung 3, trên bức ảnh tham chiếu 15456.jpg, cây chùy lại được dựng thẳng đứng ở phía bên trái bức ảnh (tức được nắm bởi cánh tay bên trái bức ảnh .R, còn cánh tay bên phải bức ảnh .L buông xuôi), trong khi văn bản gọi cánh tay ở bên trái bức ảnh đó là 'cánh tay trái' (theo góc nhìn người xem - Viewer's Left).

Nếu không phân tách tường minh hai khái niệm 'Bên Trái/Phải Bức Ảnh (Viewer Left -X / Viewer Right +X)' và 'Tay Trái/Phải Giải Phẫu (Character .L / .R)', mô hình 3D sẽ bị xoắn cột sống 180° hoặc quay mặt rộng của đầu chùy lệch 90° sang bên hông. Do đó, báo cáo này khoá cứng Hệ quy chiếu Thế giới Blender (Right-Handed, +Z Up, -Y Forward) tại Bảng 1 và cung cấp đầy đủ thông số cho cả Chế độ A (Chuẩn Hình ảnh 15456.jpg) lẫn Chế độ B (Chuẩn Giải phẫu Văn bản).



Hình 1: Phân tích đối chiếu 3 khung hình gốc của hiệu ứng xuất hiện nhân vật Lâm Dật (1.85m) và Cây Chùy Chiến (1.75m) trong hệ toạ độ thế giới Blender 3D.

1.1. Bảng Quy Ước Hệ Trục Toạ Độ Thế Giới Blender & Ma Trận Định Hướng Mặt Phẳng Đầu Chùy

| Trục / Thành Phần | Vector Đơn Vị Chuẩn Blender | Ý Nghĩa Trên Khung Hình Camera 2D | Ánh Xạ Giải Phẫu Nhân Vật & Cây Chùy Chiến (1.75m) | Ràng Buộc Hình Học Tại Khung 2 & Khung 3 |
| --- | --- | --- | --- | --- |
| Trục -X (Âm X) | (-1.0, 0.0, 0.0) | Phía BÊN TRÁI bức ảnh (Viewer's Left) | Phía bên PHẢI giải phẫu nhân vật (Hậu tố .R) | Khung 2: Tay phải (.R) chống đất tại X = -0.220m. Khung 3 (Ảnh): Chùy dựng đứng tại X = -0.160m. |
| Trục +X (Dương X) | (+1.0, 0.0, 0.0) | Phía BÊN PHẢI bức ảnh (Viewer's Right) | Phía bên TRÁI giải phẫu nhân vật (Hậu tố .L) | Khung 2: Đầu chùy cắm tại X = +0.340m, Tay trái (.L) nắm cán tại X = +0.155m. |
| Trục -Y (Âm Y) | (0.0, -1.0, 0.0) | Hướng từ nhân vật lao thẳng về phía Camera | Vector Pháp tuyến Khuôn mặt & Mặt rộng Đầu chùy | Khung 3: Pháp tuyến mặt rộng nhất của đầu chùy (0.42m x 0.24m) và mặt nhân vật cùng bằng (0, -1, 0). |
| Trục +Y (Dương Y) | (0.0, +1.0, 0.0) | Hướng từ nhân vật lùi sâu vào hậu cảnh đồi đá | Mặt sau lưng nhân vật & Mặt sau khối đầu chùy | Khung 2: Bàn chân phải (.R) chống lùi về sau tại Y = +0.120m tạo chân đế vững chắc. |
| Trục +Z (Dương Z) | (0.0, 0.0, +1.0) | Hướng thẳng đứng từ mặt đất lên đỉnh khung hình | Trục chiều cao nhân vật (1.85m) & Trục cán chùy Khung 3 | Khung 3: Cán chùy dựng song song trục +Z từ Z_tail = 0.115m đến Z_top = 1.865m (Dài đúng 1.750m). |





Hình 2: (A) Chứng minh 3D sự song song và đồng hướng tuyệt đối giữa pháp tuyến mặt phẳng rộng nhất của đầu chùy N_hammer = (0, -1, 0) và vector khuôn mặt N_face = (0, -1, 0); (B) Chứng minh kích thước chuẩn nhân vật 1.85m và cây chùy 1.75m ngang tầm đầu (Z = 1.745m).

1.2. Bảng Phân Kỳ Timeline Thời Gian Thực (180 Frames @ 60 FPS | 0.00s – 3.00s)

| Giai Đoạn Hoạt Cảnh | Khoảng Frame (60 FPS) | Thời Gian Thực t (Giây) | Góc Máy & Trạng Thái Nhân Vật | Động Học Chi Tiết Của Nhân Vật (1.85m) & Cây Chùy Chiến (1.75m) |
| --- | --- | --- | --- | --- |
| Pha 1: Khung 1 (Búa rơi đập đất) | Frame 1 – Frame 45 | 0.00s – 0.75s | Góc máy nghiêng / KHÔNG CÓ NHÂN VẬT (Ẩn hoàn toàn) | Chùy (1.75m) rơi từ Z = 2.80m xuống đập đầu búa xuống đất tại Frame 18 (Z = 0.12m), cán chùy nghiêng 65° hướng lên góc trên bên phải; đất đá văng tung toé. |
| Pha 2: Chuyển tiếp 1 -> 2 (Nhảy đáp đất) | Frame 46 – Frame 60 | 0.76s – 1.00s | Chuyển sang góc chính diện / Bật hiển thị Nhân vật | Nhân vật (1.85m) lao từ độ cao Z = 2.40m xuống tiếp đất tại Frame 60. Tay phải (.R) duỗi thẳng chạm đất, tay trái (.L) vươn ngang bắt chặt cán chùy đang cắm nghiêng. |
| Pha 3: Khung 2 (Ngồi chòm hổm giữ chùy) | Frame 60 – Frame 95 | 1.00s – 1.58s | Góc chính diện / Ngồi xổm tại Pelvis Z = 0.540m | Giữ tư thế ngồi chòm hổm dũng mãnh giữa làn bụi: Tay phải chống đất (-0.22, -0.20, 0.015)m; tay trái nắm chặt cán chùy nghiêng tại (+0.155, -0.162, 0.950)m. |
| Pha 4: Chuyển tiếp 2 -> 3 (Đứng dậy dựng chùy) | Frame 96 – Frame 145 | 1.60s – 2.42s | Góc chính diện / Đứng dậy (Pelvis Z: 0.54m -> 1.005m) | Nhân vật đạp hai chân đứng thẳng dậy hoàn toàn; nhấc bổng cây chùy 1.75m xoay dựng thẳng đứng (Tilt: 20° -> 0°), xoay mặt rộng đầu chùy về góc Yaw = 0° hướng thẳng về trước (-Y). |
| Pha 5: Khung 3 (Đứng thẳng giơ chùy ngang đầu) | Frame 145 – Frame 180 | 2.42s – 3.00s | Góc chính diện / Đứng thẳng (Đỉnh đầu Z = 1.850m) | Cố định tư thế Khung 3: Đầu chùy (Z = 1.745m) ngang tầm đầu nhân vật, mặt rộng nhất (0.42x0.24m) song song và đồng hướng với khuôn mặt; tay đối diện buông thẳng tự nhiên bên hông. |



2. Cấu Trúc Phả Hệ Bộ Xương (Armature Hierarchy - 60 Khớp) Cho Nhân Vật 1.85m & Chùy 1.75m

Để đảm bảo tỷ lệ giải phẫu chính xác tuyệt đối cho nhân vật manơcanh gỗ cao 1.850 m và cây chùy dài 1.750 m, Bảng 3 quy định chi tiết tên khớp, khớp cha, chiều dài từng đoạn xương (Bone Rest Length) và quy ước trục xoay nội bộ trong Blender:

| Nhóm Cấu Trúc | Tên Khớp Chuẩn (Bone Name) | Khớp Cha (Parent) | Chiều Dài Xương Chuẩn (m) | Góc Bone Roll (°) | Thông Số Hình Học & Chức Năng Động Học |
| --- | --- | --- | --- | --- | --- |
| Gốc & Trọng tâm (1.85m) | Root / Pelvis | World / Root | 0.150 / 0.140 | 0.0° | Pelvis đặt tại Z = 1.005m khi đứng thẳng (Khung 3) và Z = 0.540m khi ngồi xổm (Khung 2). |
| Cột sống (Torso) | Spine_01 / Spine_02 / Chest | Pelvis -> Spine_02 | 0.140 / 0.155 / 0.160 | 0.0° | Tổng chiều dài cột sống 0.455m; đổ trước Pitch = +26° ở Khung 2, thẳng đứng 0° ở Khung 3. |
| Cổ & Hộp sọ | Neck / Head | Chest / Neck | 0.125 / 0.205 | 0.0° | Đáy hộp sọ tại Z = 1.645m, Tâm khuôn mặt tại Z = 1.745m, Đỉnh đầu (Head_Top) tại đúng Z = 1.850m. |
| Chi trên Phải (.R) | Clavicle.R / UpperArm.R / Forearm.R / Hand.R | Chest -> ... -> Forearm.R | 0.135 / 0.295 / 0.270 / 0.190 | 0.0° | Cánh tay bên trái bức ảnh (-X): Chống thẳng xuống đất ở Khung 2; giữ chùy (Chế độ A) hoặc buông hông (Chế độ B) ở Khung 3. |
| Chi trên Trái (.L) | Clavicle.L / UpperArm.L / Forearm.L / Hand.L | Chest -> ... -> Forearm.L | 0.135 / 0.295 / 0.270 / 0.190 | 0.0° | Cánh tay bên phải bức ảnh (+X): Đưa ngang nắm cán chùy nghiêng ở Khung 2; buông thẳng (Chế độ A) hoặc nâng chùy (Chế độ B) ở Khung 3. |
| Chi dưới (.R & .L) | Thigh / Calf / Foot / Toe (.R & .L) | Pelvis -> ... -> Foot | 0.460 / 0.440 / 0.145 / 0.075 | 0.0° | Đùi dài 0.460m, cẳng chân dài 0.440m, cao độ mắt cá chân Z = 0.085m -> Tổng chiều cao chân 0.985m. |
| 30 Khớp Ngón Tay | Thumb / Index / Middle / Ring / Pinky (.01..03.R & .L) | Hand.R / Hand.L | 0.024 – 0.045 | 90.0° | 15 khớp/bàn tay; ôm khít chu vi cán chùy đường kính D = 44mm (R = 22mm) khi thực hiện cầm nắm. |
| Rig Cây Chùy (1.75m) | Hammer_Root / Hammer_Shaft_01..03 | World / Hammer_Root | 1.510 (Phần cán lộ) | 0.0° | Cán chùy hình trụ bán kính R = 0.022m, nối từ đuôi cán (Pommel) lên cổ búa (Hammer_Neck). |
| Đầu Chùy Hộp Chữ Nhật | Hammer_Head_Core / Hammer_Top | Hammer_Shaft_03 | 0.240 (Cao dọc trục) | 0.0° | Khối hộp chữ nhật W = 0.420m (Rộng) x H = 0.240m (Cao) x D = 0.220m (Dày). Tổng dài chùy = 1.510 + 0.240 = 1.750m. |



3. Đặc Tả Toạ Độ Chi Tiết Khung 1 (Frame 1 – 45 | 0.00s – 0.75s): Không Có Nhân Vật & Động Học Chùy 1.75m Rơi Đập Đất

Tại Khung 1 (Frame 1 – Frame 45), nhân vật Lâm Dật hoàn toàn KHÔNG CÓ MẶT trong khung cảnh (hide_viewport = True, hide_render = True, Scale = (0, 0, 0) tại vị trí chờ Z = -1.800 m). Góc máy đặt nghiêng tập trung vào mặt phẳng va chạm (Camera_F1 tại (-0.450, -2.600, 0.680) m, góc Euler (82.0°, 0.0°, -12.0°)). Cây chùy dài 1.750 m lao từ độ cao Z = 2.800 m xuống và đập mạnh khối đầu búa hình hộp chữ nhật xuống nền đất đá tại Frame 18 (t = 0.30s) ở toạ độ (-0.180, -0.040, 0.120) m. Cán chùy dài 1.510 m vươn chéo lên phía trên bên phải khung hình một góc 65.0° so với mặt đất ngang (nghiêng 25.0° so với phương thẳng đứng +Z), đuôi cán đạt toạ độ (+0.509, -0.040, 1.597) m.

| Tên Đối Tượng / Khớp Chùy | Toạ Độ Khởi Đầu Frame 1 (X, Y, Z) m | Toạ Độ Va Chạm Frame 18–45 (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Trạng Thái Động Học & Hiệu Ứng Vật Lý |
| --- | --- | --- | --- | --- | --- |
| LamDat_Armature (Nhân vật) | (0.000, 0.000, -1.800) | (0.000, 0.000, -1.800) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | KHÔNG CÓ NHÂN VẬT (hide_viewport = True, Scale = 0) |
| Hammer_Head_Bottom (Mép đập đất) | (+0.880, -0.040, 2.690) | (-0.230, -0.040, 0.012) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Cạnh dưới đầu hộp chữ nhật lún sâu 1.2cm vào nền đất đá |
| Hammer_Head_Core (Tâm đầu búa) | (+0.930, -0.040, 2.800) | (-0.180, -0.040, 0.120) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Tâm khối hộp chữ nhật (0.42x0.24x0.22m) tại điểm va chạm |
| Hammer_Neck (Cổ tiếp giáp cán) | (+0.980, -0.040, 2.910) | (-0.129, -0.040, 0.229) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Điểm bắt đầu phần cán trụ tròn R = 0.022m vươn lên |
| Hammer_Shaft_Mid (Giữa cán chùy) | (+1.275, -0.040, 3.548) | (+0.164, -0.040, 0.858) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Điểm giữa thân cán chùy nghiêng góc 65° so với mặt đất |
| Hammer_Tail (Đuôi cán chùy) | (+1.619, -0.040, 4.287) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Đỉnh đuôi cán hướng chéo lên phía trên bên phải khung hình |
| Debris_Impact_Burst (Hạt đá & Bụi) | Chưa kích hoạt (Frame 1–17) | Tâm nổ (-0.180, -0.040, 0.020) | Phát tán hình nón 110° | Vận tốc V0 = 4.8 m/s | Bắn 150 mảnh đá dăm + sóng xung kích bụi mù quanh đầu búa |



4. Đặc Tả Toạ Độ Chi Tiết Khung 2 (Frame 60 – 95 | 1.00s – 1.58s): Nhân Vật Tiếp Đất Ngồi Chòm Hổm, Chống Tay Phải & Nắm Cán Chùy Bằng Tay Trái

Ở Khung 2, góc máy chuyển sang chính diện (Front View). Nhân vật manơcanh gỗ (cao 1.850 m) nhảy từ trên cao xuống tiếp đất tại Frame 60 (t = 1.00s) trong tư thế ngồi chòm hổm (Heroic Crouch) giữa làn bụi mù. Cấu trúc hình học của tư thế Khung 2 được xác định bởi 4 cụm toạ độ chính xác tuyệt đối:

1. Trọng tâm & Trục thân người (Pelvis & Spine): Khớp xương chậu Pelvis hạ thấp ở (-0.040, +0.040, 0.540) m. Cột sống đổ về phía trước một góc Pitch = +26.0° và hơi nghiêng nhẹ sang phía tay chống đất (Roll = -5.0°); khớp đầu Head tại (-0.040, -0.170, 1.185) m, đỉnh đầu ở Z = 1.385 m.

2. Cánh tay phải giải phẫu (UpperArm.R -> Hand.R | Bên trái bức ảnh -X): Duỗi thẳng hoàn toàn từ khớp vai phải (-0.210, -0.110, 0.980) m hướng thẳng đứng xuống mặt đất; khuỷu tay phải (Forearm.R Head) ở (-0.220, -0.150, 0.580) m, cổ tay phải (Hand.R Head) ở (-0.220, -0.180, 0.180) m và đầu các ngón tay phải chống chạm mặt đất tại (-0.220, -0.200, 0.015) m.

3. Cánh tay trái giải phẫu (UpperArm.L -> Hand.L | Bên phải bức ảnh +X): Bắp tay trái nâng ngang sang bên phải bức ảnh đưa khuỷu tay trái (Forearm.L Head) ra toạ độ (+0.380, -0.130, 0.960) m; cẳng tay trái gập ngang góc 95° đưa bàn tay trái (Hand.L Head tại +0.155, -0.162, 0.950 m) vào nắm chặt lấy cán cây chùy tại tâm nắm (+0.135, -0.162, 0.945) m.

4. Trục Cây Chùy Cắm Nghiêng Ở Khung 2: Dưới góc nhìn chính diện của Khung 2, đầu chùy hình hộp chữ nhật cắm dưới mặt đất ở phía dưới bên phải (+0.340, -0.180, 0.120) m, thân cán chùy dài 1.750 m giữ nguyên góc cắm nghiêng 20.0° so với phương thẳng đứng (70.0° so với mặt đất), đi xuyên qua lòng bàn tay trái (+0.135, -0.162, 0.945) m và vươn đỉnh cán lên cao tại (-0.218, -0.135, 1.654) m.



Hình 3: Bản vẽ kỹ thuật đa góc nhìn cho Khung 1 (Góc nghiêng búa rơi va chạm mặt đất, không có nhân vật) và Khung 2 (Góc chính diện X-Z, Góc nghiêng Y-Z, Góc nhìn từ trên xuống X-Y khi nhân vật ngồi xổm chống tay phải và nắm cán chùy bằng tay trái).

4.1. Bảng Toạ Độ Không Gian Thế Giới (World Space) & Góc Xoay 24 Khớp Chính Tại Khung 2

| Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Vai Trò Cơ Học Trong Tư Thế Ngồi Chòm Hổm (Khung 2) |
| --- | --- | --- | --- | --- | --- |
| Root | (0.000, 0.000, 0.000) | (0.000, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Gốc toạ độ thế giới tại mặt phẳng đất Z = 0.000m |
| Pelvis | (-0.040, +0.040, 0.540) | (-0.040, 0.000, 0.675) | (+16.5°, -3.0°, 0.0°) | (0.989, +0.143, -0.026, 0.000) | Trọng tâm hạ thấp ở Z = 0.540m, đổ nhẹ về trước |
| Spine_01 | (-0.040, 0.000, 0.675) | (-0.040, -0.050, 0.815) | (+7.5°, -2.0°, 0.0°) | (0.998, +0.065, -0.017, 0.000) | Đốt sống bụng gập thu lực va chạm khi đáp đất |
| Spine_02 | (-0.040, -0.050, 0.815) | (-0.040, -0.100, 0.960) | (+6.0°, -2.0°, +3.0°) | (0.998, +0.052, -0.017, +0.026) | Đốt sống ngực nghiêng nhẹ hỗ trợ tay phải chạm đất |
| Chest | (-0.040, -0.100, 0.960) | (-0.040, -0.140, 1.080) | (+5.0°, -3.5°, +5.0°) | (0.997, +0.044, -0.031, +0.044) | Lồng ngực hạ thấp vai phải (.R) và nâng vai trái (.L) |
| Neck | (-0.040, -0.140, 1.080) | (-0.040, -0.170, 1.185) | (-8.0°, +4.0°, 0.0°) | (0.997, -0.070, +0.035, 0.000) | Cổ điều chỉnh cân bằng trục đầu |
| Head | (-0.040, -0.170, 1.185) | (-0.040, -0.200, 1.385) | (+14.0°, +3.0°, 0.0°) | (0.992, +0.122, +0.026, 0.000) | Đầu hơi cúi nhìn về phía trước (-Y), đỉnh đầu Z=1.385m |
| Clavicle.R | (-0.100, -0.100, 1.010) | (-0.210, -0.110, 0.980) | (0.0°, +16.0°, -6.0°) | (0.989, 0.000, +0.139, -0.052) | Xương đòn phải hạ thấp tối đa hướng về mặt đất |
| UpperArm.R | (-0.210, -0.110, 0.980) | (-0.220, -0.150, 0.580) | (+6.0°, -2.0°, -174.0°) | (0.052, +0.017, -0.052, -0.997) | Bắp tay phải duỗi thẳng đứng hướng xuống đất |
| Forearm.R | (-0.220, -0.150, 0.580) | (-0.220, -0.180, 0.180) | (+4.0°, 0.0°, 0.0°) | (0.999, +0.035, 0.000, 0.000) | Cẳng tay phải nối thẳng xuống cổ tay phải Z = 0.180m |
| Hand.R | (-0.220, -0.180, 0.180) | (-0.220, -0.200, 0.015) | (+7.0°, 0.0°, 0.0°) | (0.998, +0.061, 0.000, 0.000) | Bàn tay phải duỗi chống các đầu ngón chạm đất Z=0.015m |
| Clavicle.L | (+0.020, -0.100, 1.010) | (+0.140, -0.090, 1.000) | (0.0°, -6.0°, +4.0°) | (0.998, 0.000, -0.052, +0.035) | Xương đòn trái mở ngang sang bên phải bức ảnh (+X) |
| UpperArm.L | (+0.140, -0.090, 1.000) | (+0.380, -0.130, 0.960) | (+10.0°, +80.5°, +95.0°) | (0.512, +0.435, +0.482, +0.564) | Bắp tay trái nâng ngang sang phải đưa khuỷu ra X=+0.38m |
| Forearm.L | (+0.380, -0.130, 0.960) | (+0.155, -0.162, 0.950) | (+95.0°, -12.0°, -82.0°) | (0.542, +0.588, -0.085, -0.594) | Khuỷu tay trái gập ngang 95° đưa cổ tay về cán chùy |
| Hand.L | (+0.155, -0.162, 0.950) | (+0.125, -0.162, 0.945) | (-15.0°, +20.0°, +18.0°) | (0.956, -0.128, +0.171, +0.154) | Bàn tay trái nắm chặt cán chùy nghiêng tại Z = 0.945m |
| Thigh.R | (-0.140, +0.040, 0.520) | (-0.340, -0.220, 0.420) | (+72.0°, -38.0°, -140.0°) | (0.245, +0.542, -0.285, -0.752) | Đùi phải mở rộng sang bên trái bức ảnh (-X) |
| Calf.R | (-0.340, -0.220, 0.420) | (-0.080, +0.120, 0.150) | (-126.0°, +24.0°, +28.0°) | (0.432, -0.858, +0.168, +0.218) | Cẳng chân phải gập sâu 126° thu bàn chân về tâm |
| Foot.R / Toe.R | (-0.080, +0.120, 0.150) | (-0.100, 0.000, 0.020) | (+48.0°, 0.0°, +10.0°) | (0.910, +0.405, 0.000, +0.085) | Mũi bàn chân phải chống chịu lực phía sau trọng tâm |
| Thigh.L | (+0.060, +0.040, 0.520) | (+0.240, -0.200, 0.450) | (+76.0°, +32.0°, +145.0°) | (0.218, +0.575, +0.242, +0.751) | Đùi trái mở sang bên phải bức ảnh (+X) phía sau cán chùy |
| Calf.L | (+0.240, -0.200, 0.450) | (+0.080, -0.080, 0.120) | (-120.0°, -18.0°, -20.0°) | (0.485, -0.842, -0.142, -0.188) | Cẳng chân trái gập 120° đặt bàn chân trái xuống đất |
| Foot.L / Toe.L | (+0.080, -0.080, 0.120) | (+0.080, -0.220, 0.020) | (+35.0°, 0.0°, 0.0°) | (0.954, +0.301, 0.000, 0.000) | Bàn chân trái bám mặt đất tại X = +0.080m |
| Hammer_Head_Core | (+0.380, -0.180, 0.010) | (+0.300, -0.175, 0.230) | (+2.0°, -20.0°, +20.0°) | (0.970, +0.017, -0.171, +0.171) | Đầu chùy cắm nghiêng trên mặt đất ở góc dưới phải ảnh |
| Hammer_Shaft | (+0.300, -0.175, 0.230) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | (0.970, +0.017, -0.171, +0.171) | Cán chùy nghiêng 20° đi qua bàn tay trái (+0.135, -0.162, 0.945)m |



5. Đặc Tả Toạ Độ Chi Tiết Khung 3 (Frame 145 – 180 | 2.42s – 3.00s): Đứng Thẳng Giơ Chùy Dựng Đứng Ngang Tầm Đầu & Mặt Đầu Chùy Đồng Hướng Khuôn Mặt

Tại Khung 3, nhân vật Lâm Dật đứng thẳng dậy hoàn toàn với chiều cao chuẩn H = 1.850 m. Toàn bộ thông số hình học của Khung 3 thoả mãn nghiêm ngặt 4 định lý không gian sau:

1. Chiều dài & Độ thẳng đứng của Cây Chùy (1.750 m): Trục cán chùy dựng thẳng đứng tuyệt đối song song với trục +Z (Góc nghiêng Tilt = 0.0°). Đuôi cán chùy (Hammer_Tail) nằm ở cao độ Z = +0.115 m (lơ lửng cách mặt đất 11.5 cm), cổ búa (Hammer_Neck) ở Z = +1.625 m, tâm đầu búa (Hammer_Head_Core) ở Z = +1.745 m và mặt đỉnh đầu búa (Hammer_Top) ở Z = +1.865 m. Hiệu số Z_top - Z_tail = 1.865 - 0.115 = 1.750 m chính xác tuyệt đối.

2. Đầu chùy nằm ngang tầm đầu nhân vật: Khi nhân vật đứng thẳng (Đỉnh đầu Z = 1.850 m, Đáy hộp sọ Z = 1.645 m), tâm hộp sọ và khuôn mặt nhân vật nằm tại cao độ Z_face = 1.745 m. Tâm khối đầu chùy hình hộp chữ nhật đặt tại Z_hammer = 1.745 m, tức nằm ngang bằng 100% với tầm đầu của nhân vật.

3. Mặt phẳng rộng nhất của đầu chùy song song và đồng hướng với khuôn mặt: Khối đầu chùy có kích thước Rộng W = 0.420 m (dọc trục X), Cao H = 0.240 m (dọc trục Z) và Dày D = 0.220 m (dọc trục Y). Mặt phẳng rộng nhất của đầu chùy có diện tích 0.420 m x 0.240 m = 0.1008 m². Tại Khung 3, góc xoay Thế giới của đầu chùy được khoá ở Euler (0.0°, 0.0°, 0.0°), khiến mặt phẳng rộng nhất (0.420 m x 0.240 m) nằm song song hoàn toàn với mặt phẳng X-Z, có vector pháp tuyến hướng ra phía trước N_hammer = (0.000, -1.000, 0.000) — trùng khớp và đồng hướng tuyệt đối với vector nhìn của khuôn mặt nhân vật N_face = (0.000, -1.000, 0.000).

4. Chuẩn hoá Hai Chế Độ Tay Cầm (Dual-Mode Left/Right Hand Mapping): Bảng 6 cung cấp toạ độ Khung 3 theo đúng bức ảnh 15456.jpg (Chế độ A: Cây chùy dựng đứng ở bên trái bức ảnh X = -0.160 m, cánh tay bên trái bức ảnh .R gập khuỷu nắm cán chùy tại Z = 1.320 m, cánh tay bên phải bức ảnh .L buông thẳng tự nhiên bên hông tại X = +0.400 m), đồng thời cung cấp công thức đối xứng gương X <-> -X cho Chế độ B (nếu giữ nguyên cánh tay trái giải phẫu .L nâng chùy ở bên phải bức ảnh X = +0.340 m và cánh tay phải .R buông thẳng bên hông).



Hình 4: Bản vẽ kỹ thuật đa góc nhìn (Chính diện X-Z, Nghiêng Y-Z, Từ trên xuống X-Y và Phối cảnh 3D Isometric) cho Khung 3: Chứng minh đầu chùy (Z = 1.745m) ngang tầm đầu nhân vật (1.85m) và mặt phẳng rộng nhất (0.42m x 0.24m) song song, đồng hướng với khuôn mặt theo trục -Y.



Hình 5: Minh hoạ tham chiếu 3D đa góc nhìn (Chính diện, Nghiêng 90° và Phối cảnh 3/4) của nhân vật manơcanh gỗ 1.85m cùng cây chùy chiến 1.75m ở Khung 2 (bên trái) và Khung 3 (bên phải).

5.1. Bảng Toạ Độ Không Gian Thế Giới (World Space) & Góc Xoay Khớp Chính Tại Khung 3

| Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Khung 3 (Chế Độ B: Đổi Dấu X <-> -X) |
| --- | --- | --- | --- | --- | --- |
| Root | (+0.180, 0.000, 0.000) | (+0.180, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Trục tâm nhân vật đứng tại X = +0.180m |
| Pelvis | (+0.180, 0.000, 1.005) | (+0.180, 0.000, 1.145) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Khớp chậu đứng thẳng ở cao độ chuẩn Z = 1.005m |
| Spine_01 | (+0.180, 0.000, 1.145) | (+0.180, 0.000, 1.300) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống thắt lưng thẳng đứng dọc trục +Z |
| Spine_02 | (+0.180, 0.000, 1.300) | (+0.180, 0.000, 1.460) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống ngực thẳng đứng hoàn toàn |
| Chest | (+0.180, 0.000, 1.460) | (+0.180, 0.000, 1.585) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Lồng ngực hướng trực diện về phía Camera (-Y) |
| Neck | (+0.180, 0.000, 1.585) | (+0.180, -0.010, 1.645) | (+1.5°, 0.0°, 0.0°) | (1.000, +0.013, 0.000, 0.000) | Khớp cổ giữ đầu thẳng đứng uy nghiêm |
| Head (Đỉnh Z=1.850m) | (+0.180, -0.010, 1.645) | (+0.180, -0.010, 1.850) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Tâm mặt Z=1.745m, Pháp tuyến N_face = (0, -1, 0) |
| Clavicle (Tay cầm chùy) | (+0.110, 0.000, 1.495) | (-0.010, 0.000, 1.505) | (0.0°, -4.8°, 0.0°) | (0.999, 0.000, -0.042, 0.000) | Xương đòn bên cầm chùy nâng nhẹ chịu tải |
| UpperArm (Tay cầm chùy) | (-0.010, 0.000, 1.505) | (-0.110, -0.020, 1.235) | (+8.0°, +22.0°, -158.0°) | (0.195, +0.182, +0.068, -0.961) | Bắp tay hạ chéo xuống đưa khuỷu ra (-0.11, -0.02, 1.235)m |
| Forearm (Tay cầm chùy) | (-0.110, -0.020, 1.235) | (-0.155, -0.075, 1.315) | (+112.0°, -18.0°, +10.0°) | (0.552, +0.818, -0.125, +0.095) | Cẳng tay gập lên 112° đỡ lấy thân cán chùy |
| Hand (Bàn tay nắm chùy) | (-0.155, -0.075, 1.315) | (-0.160, -0.080, 1.320) | (0.0°, +85.0°, 0.0°) | (0.737, 0.000, +0.676, 0.000) | Bàn tay nắm chặt cán chùy dựng đứng tại Z = 1.320m |
| Clavicle (Tay buông hông) | (+0.250, 0.000, 1.495) | (+0.370, 0.000, 1.505) | (0.0°, +4.8°, 0.0°) | (0.999, 0.000, +0.042, 0.000) | Xương đòn bên tay tự do cân bằng ngang vai |
| UpperArm (Tay buông hông) | (+0.370, 0.000, 1.505) | (+0.395, +0.010, 1.210) | (-2.0°, -85.0°, +90.0°) | (0.520, -0.478, -0.478, +0.522) | Bắp tay buông thẳng tự nhiên sát bên hông |
| Forearm (Tay buông hông) | (+0.395, +0.010, 1.210) | (+0.400, -0.010, 0.940) | (+4.2°, -1.5°, 0.0°) | (0.999, +0.037, -0.013, 0.000) | Cẳng tay duỗi tự nhiên dọc theo đường viền hông |
| Hand (Tay buông hông) | (+0.400, -0.010, 0.940) | (+0.395, -0.020, 0.770) | (+3.0°, +5.0°, 0.0°) | (0.998, +0.026, +0.044, 0.000) | Bàn tay thả lỏng hoàn toàn bên hông (Z: 0.94m -> 0.76m) |
| Thigh.R / Calf.R / Foot.R | (+0.080, 0.000, 0.985) | (+0.070, +0.020, 0.085) | (+1.0°, -0.6°, -180.0°) | (0.000, +0.009, -0.005, -1.000) | Chân phải đứng thẳng hoàn toàn tại X = +0.075m |
| Thigh.L / Calf.L / Foot.L | (+0.280, 0.000, 0.985) | (+0.290, +0.020, 0.085) | (+1.0°, +0.6°, +180.0°) | (0.000, +0.009, +0.005, +1.000) | Chân trái đứng thẳng hoàn toàn tại X = +0.285m |
| Hammer_Tail -> Neck (Cán) | (-0.160, -0.080, 0.115) | (-0.160, -0.080, 1.625) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cán chùy dài 1.510m dựng thẳng đứng song song +Z |
| Hammer_Head (Đầu chùy) | (-0.160, -0.080, 1.625) | (-0.160, -0.080, 1.865) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Tâm Z=1.745m ngang đầu; mặt rộng 0.42x0.24m hướng -Y |



6. Giải Phẫu Động Học & Bảng Toạ Độ Chi Tiết 30 Khớp Xương Ngón Tay (Nắm Chặt Cán Chùy R = 22mm & Chống Đất / Thả Lỏng)

Cán cây chùy chiến có tiết diện hình trụ tròn đường kính D = 44 mm (bán kính R_shaft = 0.022 m). Để bàn tay manơcanh 1.85 m nắm chặt lấy cán chùy ở cả Khung 2 (nắm cán nghiêng tại Z = 0.945 m) và Khung 3 (nắm cán dựng đứng tại Z = 1.320 m) mà không xảy ra lỗi xuyên thấu lưới 3D (mesh penetration), 15 khớp xương của bàn tay cầm chùy phải tạo thành vòng khoá hình trụ (Cylindrical Power Grip) có bán kính quỹ đạo đốt ngón R_finger ∈ [0.023 m, 0.027 m] tính từ tâm trục cán chùy.



Hình 6: Bản vẽ giải phẫu đa góc nhìn 30 khớp xương ngón tay: (A) Mặt cắt ngang X-Y tại Z = 1.320m của bàn tay nắm chặt cán chùy bán kính R = 22mm; (B) Mặt đứng X-Z phân bố cao độ 5 ngón tay dọc cán chùy; (C) Bàn tay đối diện thả lỏng tự nhiên sát hông.

6.1. Bảng Toạ Độ & Góc Gập 15 Khớp Ngón Tay Cầm Cán Chùy (Cylindrical Power Grip R = 22mm)

| Tên Khớp Ngón Tay (Cầm Chùy) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m [Tại Khung 3] | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m [Tại Khung 3] | Góc Gập Local Euler (Flexion RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Trạng Thái Tiếp Xúc Vỏ Cán Chùy (R = 22mm) |
| --- | --- | --- | --- | --- | --- | --- |
| Thumb.01 (Đốt bàn CMC) | Hand | (-0.134, -0.092, 1.324) | (-0.154, -0.106, 1.333) | (+42.0°, +45.0°, -20.0°) | (0.858, +0.332, +0.354, -0.185) | Xoay đối chiếu vòng qua mặt trước (-Y) cán chùy |
| Thumb.02 (Đốt gần MCP) | Thumb.01 | (-0.154, -0.106, 1.333) | (-0.175, -0.102, 1.338) | (+52.0°, +8.0°, -5.0°) | (0.896, +0.435, +0.064, -0.042) | Ép sát mặt trước cán chùy tại R = 0.024m |
| Thumb.03 (Đốt xa IP) | Thumb.02 | (-0.175, -0.102, 1.338) | (-0.184, -0.088, 1.340) | (+60.0°, 0.0°, 0.0°) | (0.866, +0.500, 0.000, 0.000) | Khoá chặt đầu ngón cái đè lên đốt ngón giữa |
| Index.01 (Đốt gần MCP) | Hand | (-0.136, -0.055, 1.350) | (-0.160, -0.045, 1.358) | (+68.0°, 0.0°, +5.0°) | (0.828, +0.558, 0.000, +0.036) | Vòng qua mặt sau (+Y) của cán chùy ở Z = 1.354m |
| Index.02 (Đốt giữa PIP) | Index.01 | (-0.160, -0.045, 1.358) | (-0.182, -0.058, 1.355) | (+85.0°, 0.0°, 0.0°) | (0.737, +0.676, 0.000, 0.000) | Uốn góc 85° ôm sang mặt ngoài (-X) của cán chùy |
| Index.03 (Đốt xa DIP) | Index.02 | (-0.182, -0.058, 1.355) | (-0.185, -0.078, 1.350) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | Đầu ngón trỏ khoá mặt bên trái cán chùy |
| Middle.01 (Đốt gần MCP) | Hand | (-0.138, -0.055, 1.330) | (-0.162, -0.046, 1.338) | (+74.0°, 0.0°, 0.0°) | (0.799, +0.602, 0.000, 0.000) | Trụ chịu lực chính giữ trọng lượng chùy 1.75m |
| Middle.02 (Đốt giữa PIP) | Middle.01 | (-0.162, -0.046, 1.338) | (-0.184, -0.060, 1.332) | (+88.0°, 0.0°, 0.0°) | (0.719, +0.695, 0.000, 0.000) | Gập 88° ôm sát vỏ cán chùy (R_finger = 0.024m) |
| Middle.03 (Đốt xa DIP) | Middle.02 | (-0.184, -0.060, 1.332) | (-0.186, -0.082, 1.326) | (+58.0°, 0.0°, 0.0°) | (0.875, +0.485, 0.000, 0.000) | Chạm đối xứng với mũi ngón cái tạo vòng khoá kín |
| Ring.01 (Đốt gần MCP) | Hand | (-0.140, -0.056, 1.312) | (-0.162, -0.047, 1.320) | (+76.0°, 0.0°, -3.0°) | (0.788, +0.615, 0.000, -0.021) | Ôm mặt sau cán chùy tại cao độ Z = 1.316m |
| Ring.02 (Đốt giữa PIP) | Ring.01 | (-0.162, -0.047, 1.320) | (-0.183, -0.060, 1.315) | (+89.0°, 0.0°, 0.0°) | (0.713, +0.701, 0.000, 0.000) | Siết chặt thân cán chống trượt dọc trục Z |
| Ring.03 (Đốt xa DIP) | Ring.02 | (-0.183, -0.060, 1.315) | (-0.185, -0.080, 1.310) | (+58.0°, 0.0°, 0.0°) | (0.875, +0.485, 0.000, 0.000) | Khoá mặt ngoài cán chùy |
| Pinky.01 (Đốt gần MCP) | Hand | (-0.142, -0.058, 1.294) | (-0.161, -0.049, 1.302) | (+78.0°, 0.0°, -6.0°) | (0.776, +0.628, 0.000, -0.042) | Đỡ phần đáy vùng nắm tại Z = 1.298m |
| Pinky.02 (Đốt giữa PIP) | Pinky.01 | (-0.161, -0.049, 1.302) | (-0.180, -0.061, 1.298) | (+90.0°, 0.0°, 0.0°) | (0.707, +0.707, 0.000, 0.000) | Gập vuông góc 90° khoá chặt đáy nắm |
| Pinky.03 (Đốt xa DIP) | Pinky.02 | (-0.180, -0.061, 1.298) | (-0.182, -0.079, 1.294) | (+60.0°, 0.0°, 0.0°) | (0.866, +0.500, 0.000, 0.000) | Khoá điểm thấp nhất của bàn tay trên cán chùy |



6.2. Bảng Toạ Độ & Góc Xoay 15 Khớp Ngón Tay Tự Do (Chống Mặt Đất Ở Khung 2 & Buông Thả Tự Nhiên Ở Khung 3)

| Tên Khớp Ngón Tay (Tay Tự Do) | Toạ Độ Đầu Khớp Tại Khung 2 (Chống Đất) m | Góc Euler Tại Khung 2 (Chống Đất) ° | Toạ Độ Đầu Khớp Tại Khung 3 (Buông Hông) m | Toạ Độ Đuôi Khớp Tại Khung 3 (Buông Hông) m | Góc Cong Tự Nhiên Tại Khung 3 (RX, RY, RZ) ° |
| --- | --- | --- | --- | --- | --- |
| Thumb.01 (Đốt bàn CMC) | (-0.205, -0.195, 0.135) | (+15.0°, -18.0°, +10.0°) | (+0.382, -0.022, 0.902) | (+0.374, -0.034, 0.868) | (+10.0°, -12.0°, +8.0°) |
| Thumb.02 (Đốt gần MCP) | (-0.198, -0.205, 0.088) | (+12.0°, 0.0°, 0.0°) | (+0.374, -0.034, 0.868) | (+0.372, -0.042, 0.840) | (+12.0°, 0.0°, 0.0°) |
| Thumb.03 (Đốt xa IP) | (-0.195, -0.212, 0.048) | (-8.0°, 0.0°, 0.0°) [Chạm đất] | (+0.372, -0.042, 0.840) | (+0.375, -0.046, 0.818) | (+8.0°, 0.0°, 0.0°) |
| Index.01 (Đốt gần MCP) | (-0.212, -0.192, 0.105) | (+8.0°, 0.0°, -3.0°) | (+0.388, -0.024, 0.862) | (+0.385, -0.028, 0.818) | (+10.0°, 0.0°, -2.0°) |
| Index.02 (Đốt giữa PIP) | (-0.210, -0.198, 0.058) | (+10.0°, 0.0°, 0.0°) | (+0.385, -0.028, 0.818) | (+0.382, -0.030, 0.790) | (+15.0°, 0.0°, 0.0°) |
| Index.03 (Đốt xa DIP) | (-0.210, -0.202, 0.018) | (-12.0°, 0.0°, 0.0°) [Chống đất] | (+0.382, -0.030, 0.790) | (+0.378, -0.031, 0.772) | (+8.0°, 0.0°, 0.0°) |
| Middle.01 (Đốt gần MCP) | (-0.220, -0.190, 0.102) | (+6.0°, 0.0°, 0.0°) | (+0.396, -0.015, 0.858) | (+0.394, -0.019, 0.810) | (+12.0°, 0.0°, 0.0°) |
| Middle.02 (Đốt giữa PIP) | (-0.220, -0.196, 0.054) | (+8.0°, 0.0°, 0.0°) | (+0.394, -0.019, 0.810) | (+0.390, -0.021, 0.780) | (+18.0°, 0.0°, 0.0°) |
| Middle.03 (Đốt xa DIP) | (-0.220, -0.200, 0.015) | (-15.0°, 0.0°, 0.0°) [Trụ chính] | (+0.390, -0.021, 0.780) | (+0.385, -0.022, 0.760) | (+10.0°, 0.0°, 0.0°) |
| Ring.01 (Đốt gần MCP) | (-0.228, -0.188, 0.105) | (+8.0°, 0.0°, +3.0°) | (+0.404, -0.006, 0.862) | (+0.402, -0.010, 0.818) | (+14.0°, 0.0°, +2.0°) |
| Ring.02 (Đốt giữa PIP) | (-0.229, -0.194, 0.058) | (+12.0°, 0.0°, 0.0°) | (+0.402, -0.010, 0.818) | (+0.398, -0.012, 0.790) | (+20.0°, 0.0°, 0.0°) |
| Ring.03 (Đốt xa DIP) | (-0.230, -0.198, 0.018) | (-10.0°, 0.0°, 0.0°) [Chống đất] | (+0.398, -0.012, 0.790) | (+0.393, -0.014, 0.770) | (+11.0°, 0.0°, 0.0°) |
| Pinky.01 (Đốt gần MCP) | (-0.236, -0.185, 0.110) | (+10.0°, 0.0°, +6.0°) | (+0.412, +0.002, 0.868) | (+0.410, -0.002, 0.830) | (+15.0°, 0.0°, +4.0°) |
| Pinky.02 (Đốt giữa PIP) | (-0.238, -0.190, 0.068) | (+14.0°, 0.0°, 0.0°) | (+0.410, -0.002, 0.830) | (+0.406, -0.005, 0.806) | (+22.0°, 0.0°, 0.0°) |
| Pinky.03 (Đốt xa DIP) | (-0.240, -0.194, 0.025) | (-6.0°, 0.0°, 0.0°) [Chạm nhẹ] | (+0.406, -0.005, 0.806) | (+0.401, -0.007, 0.790) | (+12.0°, 0.0°, 0.0°) |



7. Bảng Biến Thiên Toạ Độ Theo Thời Gian Thực (Real-Time Keyframe Telemetry @ 60 FPS) & Script Python Tự Động Hoá Blender

Bảng 9 cung cấp chuỗi thông số biến thiên theo thời gian thực từ Frame 1 (0.00s) đến Frame 180 (3.00s) cho toàn bộ quá trình: Chùy rơi đập đất ở Khung 1 (Không nhân vật) -> Nhân vật đáp đất ngồi xổm chống tay và bắt cán chùy ở Khung 2 -> Nhân vật đứng thẳng dậy giơ chùy dựng đứng ngang tầm đầu, xoay mặt phẳng rộng nhất của đầu chùy song song và đồng hướng với khuôn mặt ở Khung 3.



Hình 7: Đồ thị nội suy quỹ đạo toạ độ Z(t), góc dựng đứng cán chùy (Tilt: 25° -> 20° -> 0°), góc xoay mặt rộng đầu chùy đồng hướng khuôn mặt (Yaw -> 0°) và góc khớp theo thời gian thực (180 Frames @ 60 FPS).

7.1. Bảng Tra Cứu Quỹ Đạo Thời Gian Thực Của Nhân Vật (1.85m) & Cây Chùy Chiến (1.75m)

| Frame (Thời Gian) | Trạng Thái Nhân Vật (1.85m) | Pelvis (X, Y, Z) m | Head_Top Đỉnh Đầu (X, Y, Z) m | Hammer_Head_Core Tâm Đầu Chùy (X, Y, Z) m | Hammer_Tail Đuôi Cán Chùy (X, Y, Z) m | Góc Đầu Chùy Euler (RX, RY, RZ) ° | Pháp Tuyến Mặt Rộng Đầu Chùy (NX, NY, NZ) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frame 1 (0.00s) | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.930, -0.040, 2.800) | (+1.619, -0.040, 4.287) | (+15.0°, +25.0°, -35.0°) | Đang rơi từ trên cao |
| Frame 18 (0.30s) [Đập đất K1] | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (-0.180, -0.040, 0.120) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | Va chạm nổ bụi đất đá |
| Frame 45 (0.75s) [Hết Khung 1] | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (-0.180, -0.040, 0.120) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | Cắm nghiêng 65° mặt đất |
| Frame 46 (0.77s) [Nhảy xuống] | BẬT HIỂN THỊ (Scale=1) | (-0.040, +0.020, 2.400) | (-0.040, -0.050, 3.245) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Chuyển góc máy chính diện |
| Frame 60 (1.00s) [Đáp đất K2] | Ngồi xổm (Chạm đất) | (-0.040, +0.040, 0.540) | (-0.040, -0.200, 1.385) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Tay trái nắm cán Z=0.945m |
| Frame 65 (1.08s) [Nhún giảm chấn] | Ngồi xổm (Nén cực đại) | (-0.040, +0.048, 0.518) | (-0.040, -0.210, 1.363) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Tay phải chống đất Z=0.015m |
| Frame 95 (1.58s) [Hết Khung 2] | Ngồi xổm ổn định | (-0.040, +0.040, 0.540) | (-0.040, -0.200, 1.385) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Chuẩn bị phát lực đứng dậy |
| Frame 112 (1.87s) [Đứng dậy 30%] | Đang nâng người & chùy | (+0.025, +0.028, 0.680) | (+0.025, -0.140, 1.525) | (+0.180, -0.150, 0.620) | (-0.200, -0.115, 0.450) | (+1.4°, -14.0°, +14.0°) | (-0.24, -0.96, +0.12) |
| Frame 128 (2.13s) [Đứng dậy 70%] | Dựng đứng trục cán chùy | (+0.115, +0.010, 0.865) | (+0.115, -0.060, 1.710) | (-0.040, -0.105, 1.310) | (-0.175, -0.092, 0.220) | (+0.5°, -5.0°, +5.0°) | (-0.08, -0.99, +0.04) |
| Frame 140 (2.33s) [Đạt 95% K3] | Đầu chùy ngang tầm đầu | (+0.170, +0.002, 0.985) | (+0.170, -0.015, 1.830) | (-0.152, -0.082, 1.715) | (-0.158, -0.082, 0.120) | (+0.1°, -1.0°, +1.0°) | (-0.01, -1.00, 0.00) |
| Frame 145–180 (2.42s–3.00s) [K3] | Đứng thẳng hoàn toàn (1.85m) | (+0.180, 0.000, 1.005) | (+0.180, -0.010, 1.850) | (-0.160, -0.080, 1.745) | (-0.160, -0.080, 0.115) | (0.0°, 0.0°, 0.0°) | (0.000, -1.000, 0.000) [Đồng hướng mặt] |



7.2. Mã Nguồn Python Chuẩn Hoá (Blender bpy Automation Script) Dành Cho GPT 6.1 Sol - Xhight

Đoạn mã Python (bpy) dưới đây thực thi toàn bộ thông số toạ độ của Nhân vật Lâm Dật (1.85 m) và Cây Chùy Chiến (1.75 m) qua cả 3 khung hình, bao gồm cả biến cờ MODE_ANATOMICAL_LEFT_HAND (False = Chuẩn hình ảnh 15456.jpg; True = Chuẩn văn bản giải phẫu giữ nguyên tay trái .L nâng chùy ở Khung 3):

| MÃ NGUỒN PYTHON TỰ ĐỘNG HOÁ KEYFRAME TRONG BLENDER (BPY SCRIPT CHO GPT 6.1 SOL - XHIGHT)import bpy, mathscene = bpy.context.scenescene.render.fps = 60scene.frame_start, scene.frame_end = 1, 180rig = bpy.data.objects['LamDat_185m_Armature']hammer = bpy.data.objects['WarHammer_175m'] # Origin đặt tại Hammer_Head_Core (Cách đỉnh 0.12m, cách đuôi cán 1.63m)pb = rig.pose.bones# 1. KHUNG 1 (Frame 1 - 45): KHÔNG CÓ NHÂN VẬT - CHÙY 1.75M RƠI ĐẬP ĐẤT NGHIÊNG 65°for f in [1, 45]:    rig.location = (0.000, 0.000, -1.800)    rig.scale = (0.000, 0.000, 0.000)    rig.hide_viewport, rig.hide_render = True, True    rig.keyframe_insert('location', frame=f); rig.keyframe_insert('scale', frame=f)    rig.keyframe_insert('hide_viewport', frame=f); rig.keyframe_insert('hide_render', frame=f)hammer.rotation_mode = 'XYZ'hammer.location = (0.930, -0.040, 2.800)hammer.rotation_euler = tuple(math.radians(d) for d in (15.0, 25.0, -35.0))hammer.keyframe_insert('location', frame=1); hammer.keyframe_insert('rotation_euler', frame=1)for f in [18, 45]:    hammer.location = (-0.180, -0.040, 0.120)    hammer.rotation_euler = tuple(math.radians(d) for d in (15.0, 25.0, -35.0))    hammer.keyframe_insert('location', frame=f); hammer.keyframe_insert('rotation_euler', frame=f)# 2. KHUNG 2 (Frame 60 - 95): NHÂN VẬT 1.85M ĐÁP ĐẤT NGỒI XỔM, TAY PHẢI CHỐNG ĐẤT, TAY TRÁI NẮM CÁN CHÙYrig.location = (0.000, 0.000, 0.000); rig.scale = (1.000, 1.000, 1.000)rig.hide_viewport, rig.hide_render = False, Falsefor dp in ['location', 'scale', 'hide_viewport', 'hide_render']:    rig.keyframe_insert(dp, frame=46)pose_f2 = {    'Pelvis': (16.5, -3.0, 0.0), 'Spine_01': (7.5, -2.0, 0.0), 'Spine_02': (6.0, -2.0, 3.0),    'Chest': (5.0, -3.5, 5.0), 'Neck': (-8.0, 4.0, 0.0), 'Head': (14.0, 3.0, 0.0),    'UpperArm.R': (6.0, -2.0, -174.0), 'Forearm.R': (4.0, 0.0, 0.0), 'Hand.R': (7.0, 0.0, 0.0),    'UpperArm.L': (10.0, 80.5, 95.0), 'Forearm.L': (95.0, -12.0, -82.0), 'Hand.L': (-15.0, 20.0, 18.0),    'Thigh.R': (72.0, -38.0, -140.0), 'Calf.R': (-126.0, 24.0, 28.0), 'Foot.R': (48.0, 0.0, 10.0),    'Thigh.L': (76.0, 32.0, 145.0), 'Calf.L': (-120.0, -18.0, -20.0), 'Foot.L': (35.0, 0.0, 0.0),}for f in [60, 95]:    hammer.location = (0.340, -0.180, 0.120)    hammer.rotation_euler = tuple(math.radians(d) for d in (2.0, -20.0, 20.0))    hammer.keyframe_insert('location', frame=f); hammer.keyframe_insert('rotation_euler', frame=f)    pb['Pelvis'].location = (-0.040, 0.040, 0.540); pb['Pelvis'].keyframe_insert('location', frame=f)    for bname, degs in pose_f2.items():        pb[bname].rotation_mode = 'XYZ'        pb[bname].rotation_euler = tuple(math.radians(d) for d in degs)        pb[bname].keyframe_insert('rotation_euler', frame=f)# 3. KHUNG 3 (Frame 145 - 180): ĐỨNG THẲNG 1.85M, DỰNG ĐỨNG CHÙY 1.75M NGANG ĐẦU (Z=1.745M), MẶT RỘNG HƯỚNG -Yfor f in [145, 180]:    hammer.location = (-0.160, -0.080, 1.745) # Tâm đầu chùy ngang tầm mặt Z=1.745m, Đuôi cán ở Z=0.115m    hammer.rotation_euler = (0.0, 0.0, 0.0)   # Mặt phẳng rộng nhất (0.42x0.24m) song song & đồng hướng khuôn mặt (-Y)    hammer.keyframe_insert('location', frame=f); hammer.keyframe_insert('rotation_euler', frame=f)    pb['Pelvis'].location = (0.180, 0.000, 1.005); pb['Pelvis'].keyframe_insert('location', frame=f) |
| --- |


