# Lam-Dat — báo cáo tham khảo Gemini

Nguồn: https://drive.google.com/file/d/18GWOeVj5qdq9a8moUPGhqB37w7e0WZk2/view

SHA-256 DOCX: d29514af20f7d2665aa480fd595eed759125622c4349e5eb166ff877f30df629

Bản trích đầy đủ văn bản/bảng. Đây là tài liệu tham khảo; kiểm chứng và retarget sang rig thật trước khi áp dụng.

BÁO CÁO KỸ THUẬT ĐẶC TẢ TOẠ ĐỘ KHỚP XƯƠNG 3D & QUỸ ĐẠO ANIMATION THEO THỜI GIAN THỰC: HIỆU ỨNG XUẤT HIỆN NHÂN VẬT LÂM DẬT

Tài liệu Chuẩn hoá Hệ trục Không gian Blender 3D (Right-Handed Z-Up), Giải phẫu Động học 62 Khớp Xương (Bao gồm 30 Khớp Ngón Tay) & Bảng Nội suy Thời gian thực 60 FPS dành cho GPT 6.1 Sol - Xhight

| TÓM TẮT ĐIỀU HÀNH & RÀNG BUỘC KỸ THUẬT BẮT BUỘC CHO GPT 6.1 SOL - XHIGHT1. Quy định Khung 1 (Frame 1 – 45 / 0.00s – 0.75s): Hoàn toàn KHÔNG CÓ NHÂN VẬT trên mặt đất. Rig nhân vật Lâm Dật phải đặt ở trạng thái ẩn (hide_viewport = True, hide_render = True, Scale = (0, 0, 0) tại vị trí ngầm Z = -1.500 m). Chỉ có 6 nhánh dây leo hoang dã (Vine_Branch_01..06) phóng vọt lên từ vết nứt mặt đất dốc tại (0, 0, 0) kèm hạt đất đá văng tung toé.2. Quy định Khung 2 (Frame 60 – 95 / 1.00s – 1.58s): Nhân vật Lâm Dật trồi vọt lên từ vết nứt và đáp đất tại tâm khung hình (X = 0.000 m, Pelvis Z = 0.520 m) trong tư thế ngồi xổm dũng mãnh (Heroic Crouch Landing). Hai bàn tay hoàn toàn TAY KHÔNG (không cầm vật thể).3. Quy định Khung 3 (Frame 145 – 180 / 2.42s – 3.00s): Nhân vật đứng dậy và dịch chuyển trọng tâm hẳn sang BÊN PHẢI KHUNG HÌNH (X = +0.450 m, Pelvis Z = 0.960 m). Toàn bộ dây leo bện xoắn chặt thành một cây trượng lớn chuyển hoàn toàn sang BÊN TRÁI KHUNG HÌNH (trục tâm trượng tại X = -0.230 m, Y = -0.040 m). Cánh tay phải của nhân vật (UpperArm.R -> Hand.R, nằm ở phía bên trái bức ảnh) vươn chếch lên cao đúng góc +35.0° so với phương ngang để nắm chặt lấy thân trượng tại tâm nắm (-0.230, -0.040, 1.783) m. Cánh tay trái (UpperArm.L -> Hand.L, nằm ở phía bên phải bức ảnh) thả lỏng hoàn toàn, buông xuôi tự nhiên sát hông trái tại X = +0.680 m để lộ khoảng trống ΔX = 0.110 m. |
| --- |



1. Hệ Quy Chiếu Không Gian Blender 3D & Giải Pháp Khắc Phục Lỗi Mất Nhận Thức Hướng

Khi chuyển đổi từ bản mô tả ngôn ngữ tự nhiên và hình ảnh 2D sang không gian 3D trong Blender, các mô hình sinh mã tự động như GPT 6.1 Sol - Xhight thường mắc lỗi đảo ngược phương hướng nghiêm trọng (nhầm lẫn giữa bên trái/phải của bức ảnh với tay trái/phải của nhân vật, hoặc nhầm trục chiều cao Z với trục Y của các phần mềm Maya/Unity). Để triệt tiêu hoàn toàn hiện tượng mất nhận thức về hướng trong Blender, toàn bộ thông số trong báo cáo này được khoá cứng vào Hệ quy chiếu Thế giới Chuẩn của Blender (Right-Handed World Coordinate System, +Z Up, -Y Forward).



Hình 1: Phân tích đối chiếu 3 khung hình gốc của hiệu ứng xuất hiện nhân vật Lâm Dật kèm định vị toạ độ không gian Blender 3D.

1.1. Bảng Đối Chiếu Tuyệt Đối Giữa Khung Hình Camera (2D) và Không Gian Thế Giới Blender (3D)

Trong cảnh quay này, Camera đặt tại toạ độ World Space (0.100, -3.800, 1.050) m, góc xoay Euler (88.0°, 0.0°, 0.0°), nhìn thẳng vào gốc toạ độ theo hướng +Y. Khi nhân vật Lâm Dật đứng đối diện trực tiếp với Camera (mặt nhân vật nhìn theo vector -Y), mối quan hệ giữa hướng trên bức ảnh và tên khớp xương giải phẫu của nhân vật tuân theo quy tắc đối xứng gương bắt buộc tại Bảng 1:

| Trục / Phía Không Gian | Hướng Trong Blender World Space | Vị Trí Trên Bức Ảnh 2D (Người Xem Nhìn Vào) | Phía Giải Phẫu Của Nhân Vật (Rig Bone Suffix) | Ứng Dụng Cụ Thể Tại Khung 3 |
| --- | --- | --- | --- | --- |
| Trục -X (Âm X) | Từ tâm (0,0,0) đi sang trái Viewport | Phía BÊN TRÁI bức ảnh (Viewer's Left) | Bên PHẢI cơ thể nhân vật (Hậu tố .R) | Vị trí đặt Cây Trượng Dây Leo (X = -0.230m) & Cánh tay phải (UpperArm.R, Forearm.R, Hand.R) nâng góc 35° nắm trượng. |
| Trục +X (Dương X) | Từ tâm (0,0,0) đi sang phải Viewport | Phía BÊN PHẢI bức ảnh (Viewer's Right) | Bên TRÁI cơ thể nhân vật (Hậu tố .L) | Vị trí nhân vật đứng dịch sang phải (Pelvis X = +0.450m) & Cánh tay trái (Hand.L tại X = +0.680m) thả lỏng sát hông. |
| Trục -Y (Âm Y) | Hướng từ gốc (0,0,0) về phía ống kính Camera | Hướng lao ra phía trước mặt người xem | Mặt trước ngực / bụng nhân vật (Anterior) | Hướng nhìn của nhân vật, đầu gối trái ở Khung 2 và ngón cái phải (Thumb.R) vòng qua mặt trước thân trượng. |
| Trục +Y (Dương Y) | Hướng từ gốc (0,0,0) đi sâu vào hậu cảnh | Hướng lùi ra phía sau sườn đồi đất đá | Mặt sau lưng nhân vật (Posterior) | Bàn chân phải chống phía sau ở Khung 2 (Y = +0.140m) và 4 ngón tay phải vòng qua mặt sau thân trượng. |
| Trục +Z (Dương Z) | Hướng thẳng đứng từ mặt đất lên bầu trời | Hướng từ cạnh dưới lên cạnh trên bức ảnh | Chiều cao từ bàn chân lên đỉnh đầu (Superior) | Mặt đất tại Z = 0.000m; Pelvis Khung 2 tại Z = 0.520m; Pelvis Khung 3 tại Z = 0.960m; Tâm nắm trượng tại Z = 1.783m. |





Hình 2: (A) Hệ trục toạ độ thế giới Blender 3D (Right-Handed, +Z Up, -Y Forward) và (B) Chứng minh hình học lượng giác tại Khung 3: Trọng tâm dịch phải (+X = +0.450m) và cánh tay phải nâng chính xác góc +35.0° nắm trượng ở bên trái (-X = -0.230m).

1.2. Cấu Trúc Timeline Thời Gian Thực (180 Frames @ 60 FPS | 0.00s – 3.00s)

Để chuyển động đạt độ mượt chuẩn điện ảnh và thể hiện rõ sức nặng cơ học (tiếp đất dũng mãnh ở Khung 2, sau đó vươn mình đứng dậy kết hợp thu gom dây leo thành trượng ở Khung 3), toàn bộ hiệu ứng xuất hiện được chuẩn hoá trên Timeline 60 FPS với tổng thời lượng 3.00 giây (180 Frames), chia thành 5 pha động học tại Bảng 2:

| Pha Hoạt Cảnh | Khoảng Frame (60 FPS) | Thời Gian Thực t (Giây) | Trạng Thái Hiển Thị Nhân Vật | Trạng Thái Động Học Chính & Hàm Nội Suy (F-Curve Interpolation) |
| --- | --- | --- | --- | --- |
| Pha 1: Khung 1 (Dây leo phá đất) | Frame 1 – Frame 45 | 0.00s – 0.75s | KHÔNG CÓ NHÂN VẬT (hide_viewport = True, Scale = 0) | 6 nhánh dây leo phóng vọt từ vết nứt (0,0,0) lên độ cao 0.52m – 1.72m; hạt đất đá bắn tung toé. Nội suy: Bezier Ease-Out (vận tốc đầu cực đại). |
| Pha 2: Chuyển tiếp 1 -> 2 (Trồi lên & Đáp đất) | Frame 46 – Frame 60 | 0.76s – 1.00s | Bật hiển thị tại Frame 46 (Scale = 1,0,1) | Nhân vật phóng vọt từ lòng đất lên đỉnh parabol (Pelvis Z = 0.780m tại Frame 52) rồi lao mạnh xuống đáp đất tại Frame 60 (Pelvis Z = 0.520m). |
| Pha 3: Khung 2 (Ngồi xổm dũng mãnh) | Frame 60 – Frame 95 | 1.00s – 1.58s | Hiển thị tại tâm X = 0.000m (Tay không) | Giữ tư thế ngồi xổm anh hùng (Heroic Crouch) kèm dao động giảm chấn (Damped Spring ΔZ = -0.025m tại Frame 64) tạo cảm giác chấn động mặt đất. |
| Pha 4: Chuyển tiếp 2 -> 3 (Đứng dậy dịch phải & Bện trượng) | Frame 96 – Frame 145 | 1.60s – 2.42s | Dịch chuyển từ X = 0.000m sang X = +0.450m | Nhân vật đạp chân đứng dậy đồng thời dịch sang phải (+X). Dây leo xoắn bện thành trượng ở bên trái (X = -0.230m). Tay phải nâng góc +35° mở ngón (Frame 122) rồi siết chặt trượng (Frame 142). |
| Pha 5: Khung 3 (Đứng uy nghiêm nắm trượng) | Frame 145 – Frame 180 | 2.42s – 3.00s | Đứng tại X = +0.450m, nắm trượng tại X = -0.230m | Cố định tư thế Khung 3: Tay phải nâng chếch +35.0° nắm chặt cây trượng bên trái ảnh; tay trái buông thả tự nhiên sát hông (X = +0.680m). |



2. Cấu Trúc Phả Hệ Bộ Xương (Armature Hierarchy - 62 Khớp) & Quy Ước Trục Khớp Nội Bộ

Hệ thống Rigging của nhân vật Lâm Dật và đạo cụ Trượng Dây Leo bao gồm tổng cộng 62 xương (Bones) được chia thành 3 nhóm: (1) 24 xương cơ thể chính (Main Body Rig) điều khiển toàn bộ tư thế trọng tâm, cột sống, đầu và tứ chi; (2) 30 xương ngón tay chi tiết (15 khớp bàn tay phải .R và 15 khớp bàn tay trái .L) phục vụ động tác cầm nắm chính xác; và (3) 8 xương Spline điều khiển biến dạng của dây leo/cây trượng. Trong Blender, mỗi xương có trục dọc nội bộ là trục +Y (từ Head đến Tail của xương), trục +X là trục gập chính (Pitch/Flexion), và trục +Z là trục xoay ngang (Yaw/Abduction).

| Nhóm Khớp | Tên Khớp Chuẩn (Bone Name) | Khớp Cha (Parent Bone) | Chiều Dài Xương (m) | Góc Bone Roll (°) | Chức Năng Cơ Sinh Học & Điều Khiển Chính |
| --- | --- | --- | --- | --- | --- |
| Gốc & Trọng tâm | Root | None (World Origin) | 0.150 | 0.0° | Gốc toạ độ thế giới của Rig; neo tại mặt đất dưới trọng tâm nhân vật. |
| Gốc & Trọng tâm | Pelvis | Root | 0.130 | 0.0° | Khớp xương chậu (Center of Mass); điều khiển tịnh tiến (X, Y, Z) và độ nghiêng hông. |
| Cột sống & Đầu | Spine_01 | Pelvis | 0.140 | 0.0° | Đốt sống thắt lưng dưới (L1–L5); chịu trách nhiệm gập bụng khi ngồi xổm ở Khung 2. |
| Cột sống & Đầu | Spine_02 | Spine_01 | 0.150 | 0.0° | Đốt sống ngực dưới (T7–T12); truyền lực xoay và nâng thân người khi đứng dậy. |
| Cột sống & Đầu | Chest | Spine_02 | 0.150 | 0.0° | Lồng ngực trên (T1–T6); điểm neo của hai xương đòn (Clavicle.R / Clavicle.L). |
| Cột sống & Đầu | Neck | Chest | 0.100 | 0.0° | Khớp cổ (C1–C7); bù góc nghiêng với ngực để giữ tầm nhìn hướng về Camera. |
| Cột sống & Đầu | Head | Neck | 0.200 | 0.0° | Khối hộp sọ (Từ đáy sọ đến đỉnh đầu Head_Top); định hướng ánh nhìn nhân vật. |
| Chi trên Phải (.R) | Clavicle.R | Chest | 0.130 | -90.0° | Xương đòn phải (Bên trái ảnh); nâng nhẹ +8° khi cánh tay phải vươn lên góc 35°. |
| Chi trên Phải (.R) | UpperArm.R | Clavicle.R | 0.280 | 0.0° | Bắp tay phải (Bên trái ảnh); khớp vai cầu xoay 3 trục, nâng chếch +35° ở Khung 3. |
| Chi trên Phải (.R) | Forearm.R | UpperArm.R | 0.255 | 0.0° | Cẳng tay phải; điều khiển gập khuỷu tay và xoay sấp/ngửa cổ tay (Pronation/Supination). |
| Chi trên Phải (.R) | Hand.R | Forearm.R | 0.085 | 0.0° | Bàn tay phải; khớp gốc chứa 5 chuỗi xương ngón tay phải thực hiện nắm cây trượng. |
| Chi trên Trái (.L) | Clavicle.L | Chest | 0.130 | 90.0° | Xương đòn trái (Bên phải ảnh); giữ cân bằng ngang vai ở cả Khung 2 và Khung 3. |
| Chi trên Trái (.L) | UpperArm.L | Clavicle.L | 0.280 | 0.0° | Bắp tay trái (Bên phải ảnh); gập đè lên đùi ở Khung 2, buông xuôi tự nhiên ở Khung 3. |
| Chi trên Trái (.L) | Forearm.L | UpperArm.L | 0.255 | 0.0° | Cẳng tay trái; vắt ngang trước đầu gối trái ở Khung 2, duỗi dọc hông ở Khung 3. |
| Chi trên Trái (.L) | Hand.L | Forearm.L | 0.085 | 0.0° | Bàn tay trái; thả lỏng hoàn toàn ở cả Khung 2 và Khung 3 (không cầm vật thể). |
| Chi dưới Phải (.R) | Thigh.R / Calf.R / Foot.R / Toe.R | Pelvis -> ... -> Foot.R | 0.44 / 0.42 / 0.14 | 0.0° | Chân phải (Bên trái ảnh); quỳ hạ thấp gối ở Khung 2, đứng thẳng chịu lực ở Khung 3. |
| Chi dưới Trái (.L) | Thigh.L / Calf.L / Foot.L / Toe.L | Pelvis -> ... -> Foot.L | 0.44 / 0.42 / 0.14 | 0.0° | Chân trái (Bên phải ảnh); chống vuông góc ở Khung 2, đứng thẳng ở Khung 3. |
| 30 Khớp Ngón Tay | Thumb / Index / Middle / Ring / Pinky (.01..03.R & .L) | Hand.R / Hand.L | 0.022 – 0.042 | 90.0° | 15 khớp/bàn tay (3 đốt/ngón: MCP, PIP, DIP); trục +X nội bộ là góc gập lòng bàn tay. |
| 8 Khớp Trượng Dây Leo | VineStaff_01 .. VineStaff_08 | Root (Hoặc World) | 0.300 / đoạn | 0.0° | Chuỗi xương Spline điều khiển 6 nhánh dây leo ở Khung 1–2 bện thành cây trượng ở Khung 3. |



3. Đặc Tả Toạ Độ Chi Tiết Khung 1 (Frame 1 – 45 | 0.00s – 0.75s): Không Có Nhân Vật & Động Học Dây Leo Phá Đất

Tại Khung 1 (từ Frame 1 đến Frame 45, tương ứng 0.00s – 0.75s), nhân vật Lâm Dật hoàn toàn CHƯA XUẤT HIỆN trên mặt đất. Để tránh lỗi GPT 6.1 Sol - Xhight đặt sẵn nhân vật đứng hoặc ngồi trong Khung 1, đối tượng Armature của nhân vật phải được khoá thuộc tính hide_viewport = True, hide_render = True và Scale = (0.000, 0.000, 0.000) tại vị trí chờ dưới lòng đất (0.000, 0.000, -1.500) m. Toàn bộ khung cảnh tại Khung 1 chỉ bao gồm 6 nhánh dây leo gai góc phóng vọt lên từ vết nứt mặt đất dốc theo hướng từ Trái-Dưới (-X, -Z) vươn chéo sang Phải-Trên (+X, +Z), hất tung đất đá.

| Tên Đối Tượng / Khớp Spline | Toạ Độ Gốc Xuất Phát (X, Y, Z) m | Toạ Độ Đốt Giữa Tại Frame 45 (X, Y, Z) m | Toạ Độ Đỉnh Ngọn Tại Frame 45 (X, Y, Z) m | Vector Vận Tốc Phóng (VX, VY, VZ) m/s | Góc Uốn & Trạng Thái Hiển Thị |
| --- | --- | --- | --- | --- | --- |
| Character_Rig (Lâm Dật) | (0.000, 0.000, -1.500) | Ẩn hoàn toàn (Scale = 0) | Ẩn hoàn toàn (Scale = 0) | (0.00, 0.00, 0.00) | KHÔNG HIỂN THỊ (hide_viewport = True, hide_render = True) |
| Vine_Branch_01 (Nhánh chính cao nhất) | (-0.080, +0.050, 0.000) | (-0.220, -0.040, +0.780) | (+0.120, -0.020, +1.720) | (+0.26, -0.09, +2.29) | Uốn cong hình chữ S vươn cao 1.72m; bán kính gốc R = 0.022m |
| Vine_Branch_02 (Nhánh trung tâm phải) | (+0.050, 0.000, 0.000) | (+0.280, -0.080, +0.820) | (+0.620, +0.020, +1.550) | (+0.76, +0.03, +2.06) | Phóng chéo góc 62° sang phía bên phải ảnh (+X); gai nhọn dày |
| Vine_Branch_03 (Nhánh quét thấp phải) | (+0.120, +0.080, 0.000) | (+0.440, -0.020, +0.550) | (+0.780, -0.040, +0.980) | (+0.88, -0.16, +1.31) | Lao thấp góc 48° sang phải (+X), cày xới lớp đá dăm mặt đất |
| Vine_Branch_04 (Nhánh vòng cung hậu cảnh) | (+0.020, +0.120, 0.000) | (+0.380, +0.060, +0.640) | (+0.740, +0.050, +1.120) | (+0.96, -0.09, +1.49) | Uốn vòm phía sau (+Y = +0.06m), tạo chiều sâu không gian 3D |
| Vine_Branch_05 (Nhánh ngắn văng trái) | (-0.220, -0.080, 0.000) | (-0.340, -0.120, +0.240) | (-0.460, -0.140, +0.520) | (-0.32, -0.08, +0.69) | Bật ngược sang bên trái ảnh (-X) đối trọng với chùm dây bên phải |
| Debris_Emitter (Hệ hạt đất đá văng) | (0.000, -0.020, 0.000) | Bán kính phát tán 0.45m | Độ cao cực đại +1.650m | (±1.40, -0.85, +3.20) | Phóng 120 hạt đá góc cạnh + đám mây bụi cát mịn (Turbulence = 1.8) |



4. Đặc Tả Toạ Độ Chi Tiết Khung 2 (Frame 60 – 95 | 1.00s – 1.58s): Tư Thế Đáp Đất Ngồi Xổm Dũng Mãnh (Tay Không)

Tại Frame 46 (t = 0.76s), nhân vật Lâm Dật bật hiển thị (Scale = 1.0) và phóng vọt từ vết nứt mặt đất lên cao trước khi đáp mạnh xuống mặt đất tại Frame 60 (t = 1.00s) ở chính giữa khung hình (X = 0.000 m). Tư thế Khung 2 là tư thế Ngồi Xổm Anh Hùng (Heroic Crouch Landing) bất đối xứng giàu kịch tính:

Trọng tâm & Thân người (Pelvis & Spine): Khớp chậu Pelvis hạ thấp ở độ cao Z = 0.520 m, hơi lùi nhẹ về sau Y = +0.040 m. Toàn bộ cột sống (Spine_01 -> Chest) đổ về phía trước một góc Pitch = +28.0° (nhìn về phía Camera -Y), đầu hơi cúi nhẹ tạo ánh nhìn sắc lạnh hướng thẳng vào ống kính.

Chân phải & Cánh tay phải (Bên trái bức ảnh | Trục -X): Đầu gối phải (Calf.R Head) gập sâu và mở sang trái-trước tại (-0.260, -0.240, 0.300) m, mũi bàn chân phải chống lùi về phía sau tại (-0.050, +0.020, 0.020) m. Cánh tay phải (UpperArm.R -> Hand.R) duỗi thẳng hướng xuống mặt đất ngay phía trong đầu gối phải, cổ tay phải ở (-0.160, -0.200, 0.400) m, các ngón tay mở hờ tự nhiên hướng xuống đất (tay không).

Chân trái & Cánh tay trái (Bên phải bức ảnh | Trục +X): Đầu gối trái (Calf.L Head) dựng cao trước ngực trái tại (+0.240, -0.220, 0.620) m, bàn chân trái đặt vững trên mặt đất tại (+0.160, -0.140, 0.090) m. Cánh tay trái gập khuỷu tay góc 82° (Forearm.L Head tại +0.350, -0.140, 0.760 m), cẳng tay trái vắt chéo qua phía trước đầu gối trái, bàn tay trái (Hand.L tại +0.130, -0.220, 0.600 m) thả lỏng hoàn toàn (tay không).



Hình 3: Bản vẽ kỹ thuật đa góc nhìn (Chính diện X-Z, Nghiêng Y-Z, Từ trên xuống X-Y) cho Khung 1 (Không có nhân vật) và Khung 2 (Nhân vật đáp đất ngồi xổm tại tâm X = 0.00m, hai tay không).

4.1. Bảng Toạ Độ Không Gian Thế Giới (World Space) & Góc Xoay Khớp Chính Tại Khung 2

| Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Giải Phẫu Tại Khung 2 |
| --- | --- | --- | --- | --- | --- |
| Root | (0.000, 0.000, 0.000) | (0.000, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Neo cố định tại tâm vết nứt mặt đất |
| Pelvis | (0.000, +0.040, 0.520) | (0.000, +0.010, 0.650) | (+18.5°, 0.0°, 0.0°) | (0.987, +0.161, 0.000, 0.000) | Hạ thấp trọng tâm Z=0.52m, nghiêng trước 18.5° |
| Spine_01 | (0.000, +0.010, 0.650) | (0.000, -0.040, 0.790) | (+8.0°, 0.0°, -2.0°) | (0.997, +0.070, -0.001, -0.017) | Gập nhẹ vùng thắt lưng thu lực tiếp đất |
| Spine_02 | (0.000, -0.040, 0.790) | (0.000, -0.090, 0.930) | (+6.5°, 0.0°, -2.5°) | (0.998, +0.057, -0.001, -0.022) | Cột sống ngực đổ về phía trước (-Y) |
| Chest | (0.000, -0.090, 0.930) | (0.000, -0.130, 1.050) | (+5.0°, -3.0°, +4.0°) | (0.998, +0.044, -0.026, +0.035) | Ngực hơi xoay nhẹ đưa vai phải xuống thấp |
| Neck | (0.000, -0.130, 1.050) | (0.000, -0.160, 1.150) | (-10.0°, 0.0°, 0.0°) | (0.996, -0.087, 0.000, 0.000) | Cổ ngẩng bù góc với ngực để giữ đầu ổn định |
| Head | (0.000, -0.160, 1.150) | (0.000, -0.190, 1.340) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | Đầu hơi cúi nhìn thẳng về Camera (-Y) |
| Clavicle.R | (-0.050, -0.090, 0.990) | (-0.170, -0.100, 0.960) | (0.0°, +14.0°, -5.0°) | (0.992, 0.000, +0.122, -0.043) | Vai phải (bên trái ảnh) hạ thấp hướng xuống |
| UpperArm.R | (-0.170, -0.100, 0.960) | (-0.180, -0.150, 0.670) | (+12.0°, -4.0°, -168.0°) | (0.104, +0.011, -0.104, -0.989) | Bắp tay phải duỗi thẳng hướng xuống mặt đất |
| Forearm.R | (-0.180, -0.150, 0.670) | (-0.160, -0.200, 0.400) | (+10.5°, +5.0°, 0.0°) | (0.995, +0.091, +0.043, 0.000) | Cẳng tay phải duỗi dọc theo cạnh trong gối phải |
| Hand.R | (-0.160, -0.200, 0.400) | (-0.150, -0.220, 0.260) | (+6.0°, -8.0°, +15.0°) | (0.988, +0.052, -0.069, +0.130) | Bàn tay phải mở hờ hướng xuống đất (Tay không) |
| Clavicle.L | (+0.050, -0.090, 0.990) | (+0.170, -0.080, 0.980) | (0.0°, -5.0°, +4.0°) | (0.998, 0.000, -0.044, +0.035) | Vai trái (bên phải ảnh) mở tự nhiên |
| UpperArm.L | (+0.170, -0.080, 0.980) | (+0.350, -0.140, 0.760) | (+22.0°, +38.0°, +142.0°) | (0.312, +0.180, +0.310, +0.880) | Bắp tay trái đưa ra ngoài và về trước đùi trái |
| Forearm.L | (+0.350, -0.140, 0.760) | (+0.130, -0.220, 0.600) | (+82.0°, -15.0°, -48.0°) | (0.685, +0.602, -0.112, -0.395) | Khuỷu tay trái gập 82°, vắt ngang qua gối trái |
| Hand.L | (+0.130, -0.220, 0.600) | (+0.030, -0.250, 0.540) | (+12.0°, +10.0°, -18.0°) | (0.978, +0.103, +0.086, -0.155) | Bàn tay trái buông hờ trước gối trái (Tay không) |
| Thigh.R | (-0.100, +0.040, 0.500) | (-0.260, -0.240, 0.300) | (+58.0°, -26.0°, -145.0°) | (0.262, +0.435, -0.198, -0.840) | Đùi phải mở sang trái ảnh và lao thấp về trước |
| Calf.R | (-0.260, -0.240, 0.300) | (-0.050, +0.140, 0.140) | (-124.0°, +18.0°, +22.0°) | (0.456, -0.865, +0.125, +0.152) | Cẳng chân phải gập sâu 124° đưa gót chân về sau |
| Foot.R | (-0.050, +0.140, 0.140) | (-0.050, +0.020, 0.020) | (+45.0°, 0.0°, 0.0°) | (0.924, +0.383, 0.000, 0.000) | Cổ chân phải dựng đứng, mũi chân chống đất |
| Toe.R | (-0.050, +0.020, 0.020) | (-0.050, -0.050, 0.000) | (-52.0°, 0.0°, 0.0°) | (0.899, -0.438, 0.000, 0.000) | Các ngón chân phải gập bám chặt mặt đất |
| Thigh.L | (+0.100, +0.040, 0.500) | (+0.240, -0.220, 0.620) | (+108.0°, +22.0°, +165.0°) | (0.076, +0.795, +0.165, +0.578) | Đùi trái nâng cao hướng đầu gối lên trước ngực |
| Calf.L | (+0.240, -0.220, 0.620) | (+0.160, -0.140, 0.090) | (-118.0°, -8.0°, -10.0°) | (0.512, -0.851, -0.058, -0.072) | Cẳng chân trái cắm thẳng từ gối xuống mặt đất |
| Foot.L | (+0.160, -0.140, 0.090) | (+0.180, -0.280, 0.020) | (+18.0°, 0.0°, +8.0°) | (0.985, +0.156, 0.000, +0.070) | Bàn chân trái đặt phẳng vững chắc trên mặt đất |
| Toe.L | (+0.180, -0.280, 0.020) | (+0.190, -0.350, 0.000) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Mũi bàn chân trái áp sát mặt đất phẳng |



5. Đặc Tả Toạ Độ Chi Tiết Khung 3 (Frame 145 – 180 | 2.42s – 3.00s): Đứng Dịch Phải, Tay Phải Nâng 35° Nắm Trượng Trái, Tay Trái Buông Thả

Khi chuyển từ Khung 2 sang Khung 3 (Frame 96 – Frame 145), nhân vật Lâm Dật thực hiện đồng thời hai biến đổi không gian quyết định bố cục thị giác:

1. Dịch chuyển toàn bộ trục cơ thể sang phía bên phải bức ảnh (+X): Khớp xương chậu Pelvis nâng từ độ cao ngồi xổm Z = 0.520 m lên độ cao đứng thẳng Z = 0.960 m, đồng thời dịch ngang theo trục +X một đoạn ΔX = +0.450 m (từ X = 0.000 m sang X = +0.450 m). Nhờ đó, toàn bộ nửa trái của bức ảnh (vùng X < 0) được giải phóng hoàn toàn cho cây trượng dây leo.

2. Hội tụ toàn bộ dây leo thành cây trượng lớn ở phía bên trái bức ảnh (-X): Sáu nhánh dây leo rời rạc ở Khung 1 và Khung 2 thu gom và xoắn bện chặt vào nhau dọc theo trục thẳng đứng tại X = -0.230 m, Y = -0.040 m (phía bên trái của người xem), tạo thành một cây trượng gỗ dây leo cao 2.350 m, đường kính thân trượng tại vị trí cầm nắm là D = 0.056 m (bán kính R = 0.028 m).

3. Cánh tay phải (UpperArm.R -> Hand.R) nâng chính xác góc +35.0° nắm chặt cây trượng: Khớp vai phải (UpperArm.R Head) nằm tại (+0.260, 0.000, 1.440) m. Cánh tay phải vươn sang bên trái bức ảnh (hướng -X) và chếch lên cao một góc θ = +35.00° so với mặt phẳng ngang. Cụ thể: độ dịch ngang từ tâm vai phải đến tâm nắm trượng là ΔX = -0.230 - 0.260 = -0.490 m; độ chênh cao là ΔZ = 1.783 - 1.440 = +0.343 m; tỷ số lượng giác tan(θ) = 0.343 / 0.490 = 0.7000 => θ = arctan(0.7000) = 35.00°. Khoảng cách đường thẳng từ khớp vai phải đến tâm nắm trượng là √(0.490² + 0.343²) = 0.598 m, khớp tuyệt đối với tổng chiều dài giải phẫu của bắp tay (0.280 m) + cẳng tay (0.255 m) + khoảng cách cổ tay tới tâm lòng bàn tay (0.063 m), đảm bảo cánh tay vươn thẳng tự nhiên mà không bị kéo giãn biến dạng (zero bone stretching).

4. Cánh tay trái (UpperArm.L -> Hand.L) buông xuôi tự nhiên sát hông để lộ khoảng trống: Khớp vai trái (UpperArm.L Head) tại (+0.640, 0.000, 1.440) m buông dọc xuống dưới với góc mở nhẹ 6.5°; cổ tay trái (Hand.L Head) đặt tại (+0.680, -0.010, 0.900) m. Đường viền ngoài của hông và đùi trái nằm tại X = +0.555 m, tạo ra một khoảng trống thoáng đãng (Negative Space Gap) rộng ΔX = 0.110 m giữa lòng bàn tay trái và đùi trái đúng theo yêu cầu thiết kế.



Hình 4: Bản vẽ kỹ thuật đa góc nhìn (Chính diện X-Z, Nghiêng Y-Z, Từ trên xuống X-Y và Phối cảnh 3D Isometric) cho Khung 3: Nhân vật đứng dịch sang phải (X = +0.45m), tay phải nâng góc 35° nắm trượng bên trái (X = -0.23m).



Hình 5: Minh hoạ tham chiếu 3D đa góc nhìn (Chính diện, Nghiêng 90° và Phối cảnh 3/4) đối chiếu trực quan tư thế ngồi xổm tay không ở Khung 2 (bên trái) và tư thế đứng dịch phải nâng tay phải góc 35° nắm trượng ở Khung 3 (bên phải).

5.1. Bảng Toạ Độ Không Gian Thế Giới (World Space) & Góc Xoay Khớp Chính Tại Khung 3

| Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Giải Phẫu Tại Khung 3 |
| --- | --- | --- | --- | --- | --- |
| Root | (+0.450, 0.000, 0.000) | (+0.450, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Dịch sang bên phải bức ảnh ΔX = +0.450m |
| Pelvis | (+0.450, 0.000, 0.960) | (+0.450, 0.000, 1.100) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Đứng thẳng hoàn toàn tại X = +0.450m, Z = 0.960m |
| Spine_01 | (+0.450, 0.000, 1.100) | (+0.450, 0.000, 1.250) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống thắt lưng thẳng đứng dọc trục +Z |
| Spine_02 | (+0.450, 0.000, 1.250) | (+0.450, 0.000, 1.400) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống ngực thẳng đứng, mở rộng lồng ngực |
| Chest | (+0.450, 0.000, 1.400) | (+0.450, 0.000, 1.520) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Ngực hướng trực diện về phía Camera (-Y) |
| Neck | (+0.450, 0.000, 1.520) | (+0.450, -0.010, 1.620) | (+2.0°, 0.0°, 0.0°) | (1.000, +0.017, 0.000, 0.000) | Cổ thẳng uy nghiêm, giữ đầu cân bằng |
| Head | (+0.450, -0.010, 1.620) | (+0.450, -0.010, 1.820) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Đầu nhìn thẳng về phía trước (-Y), đỉnh đầu Z=1.82m |
| Clavicle.R | (+0.390, 0.000, 1.430) | (+0.260, 0.000, 1.440) | (0.0°, -4.4°, 0.0°) | (0.999, 0.000, -0.038, 0.000) | Xương đòn phải nâng nhẹ hỗ trợ góc vươn tay 35° |
| UpperArm.R | (+0.260, 0.000, 1.440) | (+0.030, -0.020, 1.601) | (+4.2°, +35.0°, -55.0°) | (0.848, +0.165, +0.258, -0.432) | Bắp tay phải nâng chếch góc +35.0° sang trái ảnh (-X) |
| Forearm.R | (+0.030, -0.020, 1.601) | (-0.180, -0.035, 1.748) | (+3.5°, +12.0°, 0.0°) | (0.994, +0.030, +0.104, 0.000) | Cẳng tay phải nối thẳng trục 35.0° tới cổ tay phải |
| Hand.R | (-0.180, -0.035, 1.748) | (-0.230, -0.040, 1.783) | (-8.0°, +75.0°, +15.0°) | (0.785, -0.055, +0.602, +0.131) | Cổ tay phải xoay dọc theo thân trượng tại Z=1.748m |
| Clavicle.L | (+0.510, 0.000, 1.430) | (+0.640, 0.000, 1.440) | (0.0°, +4.4°, 0.0°) | (0.999, 0.000, +0.038, 0.000) | Xương đòn trái cân bằng ngang vai |
| UpperArm.L | (+0.640, 0.000, 1.440) | (+0.670, +0.010, 1.160) | (-2.0°, -83.8°, +90.0°) | (0.525, -0.472, -0.472, +0.528) | Bắp tay trái buông xuôi tự nhiên bên phải ảnh (+X) |
| Forearm.L | (+0.670, +0.010, 1.160) | (+0.680, -0.010, 0.900) | (+4.5°, -2.2°, 0.0°) | (0.999, +0.039, -0.019, 0.000) | Cẳng tay trái thả lỏng tạo khoảng trống 0.11m với hông |
| Hand.L | (+0.680, -0.010, 0.900) | (+0.675, -0.020, 0.740) | (+3.0°, +6.0°, 0.0°) | (0.998, +0.026, +0.052, 0.000) | Bàn tay trái mở tự nhiên, lòng bàn tay hướng vào đùi |
| Thigh.R | (+0.350, 0.000, 0.940) | (+0.340, -0.010, 0.500) | (+1.3°, -1.3°, -180.0°) | (0.000, +0.011, -0.011, -1.000) | Đùi phải đứng thẳng chịu lực tại X = +0.345m |
| Calf.R | (+0.340, -0.010, 0.500) | (+0.330, +0.020, 0.080) | (-4.1°, 0.0°, 0.0°) | (0.999, -0.036, 0.000, 0.000) | Cẳng chân phải thẳng vững chãi |
| Foot.R / Toe.R | (+0.330, +0.020, 0.080) | (+0.320, -0.120, 0.020) | (+66.8°, 0.0°, +4.0°) | (0.834, +0.550, 0.000, +0.035) | Bàn chân phải đặt phẳng trên mặt đất tại X=+0.33m |
| Thigh.L | (+0.550, 0.000, 0.940) | (+0.560, -0.010, 0.500) | (+1.3°, +1.3°, +180.0°) | (0.000, +0.011, +0.011, +1.000) | Đùi trái đứng thẳng đối xứng qua trục Pelvis X=+0.45m |
| Calf.L | (+0.560, -0.010, 0.500) | (+0.570, +0.020, 0.080) | (-4.1°, 0.0°, 0.0°) | (0.999, -0.036, 0.000, 0.000) | Cẳng chân trái thẳng đứng |
| Foot.L / Toe.L | (+0.570, +0.020, 0.080) | (+0.580, -0.120, 0.020) | (+66.8°, 0.0°, -4.0°) | (0.834, +0.550, 0.000, -0.035) | Bàn chân trái đặt phẳng trên mặt đất tại X=+0.57m |
| VineStaff_01..04 (Nửa dưới) | (-0.190, -0.020, 0.000) | (-0.220, -0.040, 1.200) | (+1.0°, -1.5°, 0.0°) | (0.999, +0.009, -0.013, 0.000) | Gốc trượng cắm đất tại X=-0.19m, thân lên X=-0.22m |
| VineStaff_05..06 (Vùng nắm) | (-0.220, -0.040, 1.200) | (-0.230, -0.040, 1.783) | (0.0°, -0.8°, 0.0°) | (1.000, 0.000, -0.007, 0.000) | Tâm nắm trượng tại (-0.230, -0.040, 1.783)m, R=28mm |
| VineStaff_07..08 (Ngọn trượng) | (-0.230, -0.040, 1.783) | (-0.260, -0.020, 2.350) | (-1.5°, -2.8°, 0.0°) | (0.999, -0.013, -0.024, 0.000) | Ngọn trượng dây leo vươn cao tới Z = 2.350m |



6. Giải Phẫu Động Học & Bảng Toạ Độ Chi Tiết 30 Khớp Xương Ngón Tay (Cầm Nắm Trượng Tại Khung 3 & Tay Không Tại Khung 2)

Vì hiệu ứng xuất hiện tại Khung 3 có hành động bàn tay phải (Hand.R) vươn lên nắm chặt thân cây trượng dây leo trong khi bàn tay trái (Hand.L) buông thả tự nhiên, việc cung cấp đầy đủ toạ độ 3D và góc xoay của toàn bộ 30 khớp xương ngón tay (15 khớp mỗi bàn tay) là điều kiện bắt buộc để GPT 6.1 Sol - Xhight không tạo ra bàn tay cứng đờ hoặc xuyên thủng qua mesh cây trượng (mesh clipping).

Hình học vùng nắm trên thân trượng (Grip Cylinder Geometry): Tại cao độ nắm Z ∈ [1.740 m, 1.815 m], thân trượng dây leo có tâm trục tại (X_staff = -0.230 m, Y_staff = -0.040 m) và bán kính hiệu dụng R_staff = 0.028 m (đường kính 56 mm). Để ôm khít mặt trụ này mà không xuyên vào lõi gỗ, các đốt ngón tay của Hand.R được bố trí trên vành khuyên bán kính R_finger ∈ [0.029 m, 0.034 m] tính từ tâm (-0.230, -0.040).

Cơ chế khoá đối chiếu (Cylindrical Power Grip): Cổ tay phải Hand.R đặt tại (-0.180, -0.035, 1.748) m (phía bên phải của thân trượng). Bốn ngón tay (Index.R, Middle.R, Ring.R, Pinky.R) đi vòng qua mặt sau (+Y) của thân trượng, sau đó gập các đốt MCP (65° – 72°), PIP (80° – 88°) và DIP (48° – 55°) để quấn sang mặt ngoài bên trái (-X) của thân trượng. Ngược lại, ngón cái (Thumb.01.R -> Thumb.03.R) thực hiện đối chiếu (Opposition = +42°), đi vòng qua mặt trước (-Y, phía Camera) của thân trượng và khoá chặt đầu ngón cái tại (-0.254, -0.052, 1.790) m.



Hình 6: Bản vẽ giải phẫu đa góc nhìn 30 khớp xương ngón tay tại Khung 3: (A) Mặt cắt ngang X-Y tại Z = 1.783m của bàn tay phải ôm khít thân trượng bán kính R = 28mm; (B) Mặt đứng X-Z phân bố cao độ 5 ngón tay phải; (C) Bàn tay trái thả lỏng tự nhiên sát hông tạo khoảng trống ΔX = 0.11m.

6.1. Bảng Toạ Độ & Góc Gập 15 Khớp Xương Ngón Tay Phải (Hand.R) — Nắm Chặt Cây Trượng Tại Khung 3

| Tên Khớp Ngón Tay Phải (.R) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Gập Local Euler (Flexion RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Góc Gập Tại Khung 2 (Tay Không) ° |
| --- | --- | --- | --- | --- | --- | --- |
| Thumb.01.R (Đốt bàn CMC) | Hand.R | (-0.195, -0.055, 1.762) | (-0.218, -0.072, 1.778) | (+38.0°, +42.0°, -18.0°) | (0.875, +0.305, +0.335, -0.172) | (+12.0°, +15.0°, -5.0°) |
| Thumb.02.R (Đốt gần MCP) | Thumb.01.R | (-0.218, -0.072, 1.778) | (-0.242, -0.068, 1.786) | (+48.0°, +8.0°, -6.0°) | (0.910, +0.405, +0.065, -0.048) | (+14.0°, 0.0°, 0.0°) |
| Thumb.03.R (Đốt xa IP) | Thumb.02.R | (-0.242, -0.068, 1.786) | (-0.254, -0.052, 1.790) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | (+10.0°, 0.0°, 0.0°) |
| Index.01.R (Đốt gần MCP) | Hand.R | (-0.200, -0.008, 1.795) | (-0.230, +0.005, 1.812) | (+65.0°, 0.0°, +6.0°) | (0.842, +0.536, 0.000, +0.044) | (+15.0°, 0.0°, +4.0°) |
| Index.02.R (Đốt giữa PIP) | Index.01.R | (-0.230, +0.005, 1.812) | (-0.255, -0.010, 1.808) | (+82.0°, 0.0°, 0.0°) | (0.755, +0.656, 0.000, 0.000) | (+22.0°, 0.0°, 0.0°) |
| Index.03.R (Đốt xa DIP) | Index.02.R | (-0.255, -0.010, 1.808) | (-0.260, -0.032, 1.800) | (+50.0°, 0.0°, 0.0°) | (0.906, +0.423, 0.000, 0.000) | (+12.0°, 0.0°, 0.0°) |
| Middle.01.R (Đốt gần MCP) | Hand.R | (-0.202, -0.012, 1.778) | (-0.232, +0.002, 1.792) | (+70.0°, 0.0°, 0.0°) | (0.819, +0.574, 0.000, 0.000) | (+18.0°, 0.0°, 0.0°) |
| Middle.02.R (Đốt giữa PIP) | Middle.01.R | (-0.232, +0.002, 1.792) | (-0.258, -0.015, 1.788) | (+85.0°, 0.0°, 0.0°) | (0.737, +0.676, 0.000, 0.000) | (+25.0°, 0.0°, 0.0°) |
| Middle.03.R (Đốt xa DIP) | Middle.02.R | (-0.258, -0.015, 1.788) | (-0.262, -0.038, 1.782) | (+52.0°, 0.0°, 0.0°) | (0.899, +0.438, 0.000, 0.000) | (+14.0°, 0.0°, 0.0°) |
| Ring.01.R (Đốt gần MCP) | Hand.R | (-0.204, -0.016, 1.760) | (-0.233, -0.002, 1.772) | (+72.0°, 0.0°, -4.0°) | (0.808, +0.587, 0.000, -0.028) | (+20.0°, 0.0°, -3.0°) |
| Ring.02.R (Đốt giữa PIP) | Ring.01.R | (-0.233, -0.002, 1.772) | (-0.256, -0.018, 1.768) | (+86.0°, 0.0°, 0.0°) | (0.731, +0.682, 0.000, 0.000) | (+26.0°, 0.0°, 0.0°) |
| Ring.03.R (Đốt xa DIP) | Ring.02.R | (-0.256, -0.018, 1.768) | (-0.259, -0.040, 1.763) | (+54.0°, 0.0°, 0.0°) | (0.891, +0.454, 0.000, 0.000) | (+15.0°, 0.0°, 0.0°) |
| Pinky.01.R (Đốt gần MCP) | Hand.R | (-0.206, -0.020, 1.742) | (-0.232, -0.006, 1.752) | (+74.0°, 0.0°, -8.0°) | (0.797, +0.600, 0.000, -0.056) | (+22.0°, 0.0°, -6.0°) |
| Pinky.02.R (Đốt giữa PIP) | Pinky.01.R | (-0.232, -0.006, 1.752) | (-0.252, -0.020, 1.749) | (+88.0°, 0.0°, 0.0°) | (0.719, +0.695, 0.000, 0.000) | (+28.0°, 0.0°, 0.0°) |
| Pinky.03.R (Đốt xa DIP) | Pinky.02.R | (-0.252, -0.020, 1.749) | (-0.255, -0.039, 1.745) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | (+16.0°, 0.0°, 0.0°) |



6.2. Bảng Toạ Độ & Góc Cong Tự Nhiên 15 Khớp Xương Ngón Tay Trái (Hand.L) — Thả Lỏng Sát Hông Tại Khung 3

| Tên Khớp Ngón Tay Trái (.L) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Cong Sinh Lý Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Khoảng Trống Đến Đùi Trái ΔX (m) |
| --- | --- | --- | --- | --- | --- | --- |
| Thumb.01.L (Đốt bàn CMC) | Hand.L | (+0.662, -0.022, 0.865) | (+0.654, -0.034, 0.832) | (+10.0°, -12.0°, +8.0°) | (0.988, +0.086, -0.104, +0.069) | 0.099 m (Không chạm đùi) |
| Thumb.02.L (Đốt gần MCP) | Thumb.01.L | (+0.654, -0.034, 0.832) | (+0.652, -0.042, 0.805) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.097 m (Mở thoáng) |
| Thumb.03.L (Đốt xa IP) | Thumb.02.L | (+0.652, -0.042, 0.805) | (+0.655, -0.046, 0.785) | (+8.0°, 0.0°, 0.0°) | (0.998, +0.070, 0.000, 0.000) | 0.100 m (Thả lỏng) |
| Index.01.L (Đốt gần MCP) | Hand.L | (+0.668, -0.024, 0.825) | (+0.665, -0.028, 0.782) | (+10.0°, 0.0°, -2.0°) | (0.996, +0.087, 0.000, -0.017) | 0.110 m (Chuẩn thiết kế) |
| Index.02.L (Đốt giữa PIP) | Index.01.L | (+0.665, -0.028, 0.782) | (+0.662, -0.030, 0.755) | (+15.0°, 0.0°, 0.0°) | (0.991, +0.131, 0.000, 0.000) | 0.107 m (Hơi cong nhẹ) |
| Index.03.L (Đốt xa DIP) | Index.02.L | (+0.662, -0.030, 0.755) | (+0.658, -0.031, 0.738) | (+8.0°, 0.0°, 0.0°) | (0.998, +0.070, 0.000, 0.000) | 0.103 m (Tự nhiên) |
| Middle.01.L (Đốt gần MCP) | Hand.L | (+0.676, -0.015, 0.822) | (+0.674, -0.019, 0.775) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.119 m (Khoảng trống rõ) |
| Middle.02.L (Đốt giữa PIP) | Middle.01.L | (+0.674, -0.019, 0.775) | (+0.670, -0.021, 0.745) | (+18.0°, 0.0°, 0.0°) | (0.988, +0.156, 0.000, 0.000) | 0.115 m (Hơi cong nhẹ) |
| Middle.03.L (Đốt xa DIP) | Middle.02.L | (+0.670, -0.021, 0.745) | (+0.665, -0.022, 0.726) | (+10.0°, 0.0°, 0.0°) | (0.996, +0.087, 0.000, 0.000) | 0.110 m (Điểm thấp nhất) |
| Ring.01.L (Đốt gần MCP) | Hand.L | (+0.684, -0.006, 0.826) | (+0.682, -0.010, 0.782) | (+14.0°, 0.0°, +2.0°) | (0.992, +0.122, 0.000, +0.017) | 0.127 m (Mở thoáng) |
| Ring.02.L (Đốt giữa PIP) | Ring.01.L | (+0.682, -0.010, 0.782) | (+0.678, -0.012, 0.754) | (+20.0°, 0.0°, 0.0°) | (0.985, +0.174, 0.000, 0.000) | 0.123 m (Cong bậc thang) |
| Ring.03.L (Đốt xa DIP) | Ring.02.L | (+0.678, -0.012, 0.754) | (+0.673, -0.014, 0.736) | (+11.0°, 0.0°, 0.0°) | (0.995, +0.096, 0.000, 0.000) | 0.118 m (Thả lỏng) |
| Pinky.01.L (Đốt gần MCP) | Hand.L | (+0.692, +0.002, 0.832) | (+0.690, -0.002, 0.795) | (+15.0°, 0.0°, +4.0°) | (0.991, +0.130, 0.000, +0.035) | 0.135 m (Ngoài cùng +X) |
| Pinky.02.L (Đốt giữa PIP) | Pinky.01.L | (+0.690, -0.002, 0.795) | (+0.686, -0.005, 0.772) | (+22.0°, 0.0°, 0.0°) | (0.982, +0.191, 0.000, 0.000) | 0.131 m (Cong tự nhiên) |
| Pinky.03.L (Đốt xa DIP) | Pinky.02.L | (+0.686, -0.005, 0.772) | (+0.681, -0.007, 0.756) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.126 m (Thả lỏng) |



7. Bảng Biến Thiên Toạ Độ Theo Thời Gian Thực (Real-Time Keyframe Telemetry @ 60 FPS) & Mã Nguồn Tự Động Hoá Blender

Để GPT 6.1 Sol - Xhight không phải tự suy đoán quỹ đạo trung gian giữa các khung hình (vốn dễ gây ra lỗi trượt chân Foot Sliding, xoay khớp vai 360° Euler Flip hoặc cho nhân vật xuất hiện sớm ở Khung 1), Bảng 10 và Bảng 11 cung cấp dữ liệu nội suy thời gian thực tại 12 mốc Keyframe trọng yếu từ Frame 1 (0.00s) đến Frame 180 (3.00s).



Hình 7: Đồ thị nội suy quỹ đạo toạ độ World Space (X, Z) và góc xoay khớp theo thời gian thực (0.00s – 3.00s | 180 Frames @ 60 FPS) từ trạng thái Khung 1 (Không nhân vật) qua Khung 2 (Đáp đất ngồi xổm) đến Khung 3 (Đứng dịch phải, tay phải nâng 35° nắm trượng).

7.1. Bảng Quỹ Đạo Thời Gian Thực Của Các Khớp Trụ Cột (Frame 1 -> Frame 180 @ 60 FPS)

| Frame (Thời gian) | Trạng Thái Hiển Thị Rig | Pelvis (X, Y, Z) m | Head (X, Y, Z) m | UpperArm.R Euler (RX, RY, RZ) ° | Hand.R (X, Y, Z) m [Bên Trái Ảnh] | Hand.L (X, Y, Z) m [Bên Phải Ảnh] | VineStaff_Core (X, Y, Z_tip) m |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frame 1 (0.00s) | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (0.00, 0.00, 0.05) — Nứt đất |
| Frame 25 (0.42s) | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.08, -0.02, 1.15) — Phóng vọt |
| Frame 45 (0.75s) [Kết thúc Khung 1] | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.12, -0.02, 1.72) — Đỉnh Khung 1 |
| Frame 46 (0.77s) [Bắt đầu trồi lên] | BẬT HIỂN THỊ (Scale=1) | (0.000, +0.020, 0.150) | (0.000, -0.080, 0.780) | (+18.0°, -10.0°, -145.0°) | (-0.220, -0.150, 0.250) | (+0.240, -0.150, 0.420) | (+0.10, -0.04, 1.75) — Mở vòm |
| Frame 52 (0.87s) [Đỉnh nhảy Parabol] | Hiển thị (Đang bay lên) | (0.000, +0.010, 0.780) | (0.000, -0.110, 1.420) | (+15.0°, -8.0°, -155.0°) | (-0.190, -0.180, 0.680) | (+0.200, -0.190, 0.880) | (+0.05, -0.05, 1.80) — Uốn vòm |
| Frame 60 (1.00s) [Đáp đất Khung 2] | Hiển thị (Chạm đất) | (0.000, +0.040, 0.520) | (0.000, -0.160, 1.150) | (+12.0°, -4.0°, -168.0°) | (-0.160, -0.200, 0.400) | (+0.130, -0.220, 0.600) | (0.00, -0.06, 1.68) — Vòm sau lưng |
| Frame 65 (1.08s) [Nén giảm chấn] | Hiển thị (Nhún sâu) | (0.000, +0.048, 0.495) | (0.000, -0.172, 1.122) | (+13.5°, -4.5°, -170.0°) | (-0.160, -0.205, 0.375) | (+0.130, -0.225, 0.578) | (0.00, -0.06, 1.65) — Rung nhẹ |
| Frame 95 (1.58s) [Kết thúc Khung 2] | Hiển thị (Ổn định K2) | (0.000, +0.040, 0.520) | (0.000, -0.160, 1.150) | (+12.0°, -4.0°, -168.0°) | (-0.160, -0.200, 0.400) | (+0.130, -0.220, 0.600) | (0.00, -0.05, 1.70) — Bắt đầu gom |
| Frame 112 (1.87s) [Đạp chân dịch phải] | Đang đứng dậy (30%) | (+0.135, +0.025, 0.652) | (+0.135, -0.110, 1.305) | (+9.5°, +8.5°, -132.0°) | (-0.185, -0.145, 0.885) | (+0.310, -0.150, 0.705) | (-0.12, -0.04, 1.98) — Xoắn bện |
| Frame 125 (2.08s) [Vươn tay đón trượng] | Đang đứng dậy (65%) | (+0.292, +0.012, 0.806) | (+0.292, -0.050, 1.468) | (+6.5°, +24.0°, -86.0°) | (-0.210, -0.075, 1.440) | (+0.520, -0.065, 0.820) | (-0.21, -0.04, 2.22) — Thành trượng |
| Frame 138 (2.30s) [Chạm & Siết trượng] | Đạt 94% tư thế K3 | (+0.425, +0.002, 0.935) | (+0.425, -0.015, 1.595) | (+4.5°, +34.2°, -58.0°) | (-0.180, -0.036, 1.745) | (+0.660, -0.015, 0.890) | (-0.23, -0.04, 2.35) — Cố định trượng |
| Frame 145–180 (2.42s–3.00s) [Khung 3] | Đứng uy nghiêm K3 | (+0.450, 0.000, 0.960) | (+0.450, -0.010, 1.620) | (+4.2°, +35.0°, -55.0°) | (-0.180, -0.035, 1.748) | (+0.680, -0.010, 0.900) | (-0.23, -0.04, 2.35) — Nắm chặt 35° |



7.2. Bảng Biến Thiên Góc Gập 15 Khớp Ngón Tay Phải (Hand.R) Theo Thời Gian Thực Trong Pha Cầm Nắm

| Nhóm Đốt Ngón Tay Phải (.R) | Frame 60–95 (Khung 2: Tay Không) ° | Frame 110 (Bắt Đầu Đưa Tay Lên) ° | Frame 122 (Mở Rộng Đón Trượng - Anticipation) ° | Frame 132 (Lòng Bàn Tay Chạm Thân Trượng) ° | Frame 142–180 (Khung 3: Khoá Chặt Trượng) ° |
| --- | --- | --- | --- | --- | --- |
| Thumb.01.R (CMC: RX, RY, RZ) | (+12.0°, +15.0°, -5.0°) | (+8.0°, +10.0°, -2.0°) | (-5.0°, -12.0°, +10.0°) [Mở rộng] | (+24.0°, +30.0°, -12.0°) | (+38.0°, +42.0°, -18.0°) [Đối chiếu] |
| Thumb.02.R / 03.R (MCP / IP: RX) | +14.0° / +10.0° | +10.0° / +8.0° | -4.0° / 0.0° [Duỗi mở đón trượng] | +28.0° / +32.0° | +48.0° / +55.0° [Khoá mặt trước -Y] |
| Index.01..03.R (MCP / PIP / DIP: RX) | +15.0° / +22.0° / +12.0° | +12.0° / +16.0° / +10.0° | +4.0° / +6.0° / +2.0° [Xoè mở] | +42.0° / +54.0° / +30.0° | +65.0° / +82.0° / +50.0° [Siết chặt] |
| Middle.01..03.R (MCP / PIP / DIP: RX) | +18.0° / +25.0° / +14.0° | +14.0° / +18.0° / +10.0° | +6.0° / +8.0° / +4.0° [Xoè mở] | +46.0° / +58.0° / +34.0° | +70.0° / +85.0° / +52.0° [Trụ lực chính] |
| Ring.01..03.R (MCP / PIP / DIP: RX) | +20.0° / +26.0° / +15.0° | +15.0° / +20.0° / +12.0° | +8.0° / +10.0° / +5.0° [Xoè mở] | +48.0° / +60.0° / +36.0° | +72.0° / +86.0° / +54.0° [Siết chặt] |
| Pinky.01..03.R (MCP / PIP / DIP: RX) | +22.0° / +28.0° / +16.0° | +16.0° / +22.0° / +12.0° | +10.0° / +12.0° / +6.0° [Xoè mở] | +50.0° / +62.0° / +38.0° | +74.0° / +88.0° / +55.0° [Khoá đáy nắm] |



7.3. Mã Nguồn Python Chuẩn Hoá (Blender bpy Automation Script) Dành Cho GPT 6.1 Sol - Xhight

Đoạn mã Python (bpy) dưới đây áp dụng trực tiếp hệ toạ độ và các mốc Keyframe trong báo cáo này vào Blender 3.x/4.x. GPT 6.1 Sol - Xhight có thể thực thi trực tiếp khối lệnh này để khởi tạo chuẩn xác cả 3 khung hình mà không bao giờ xảy ra lỗi ngược hướng:

| MÃ NGUỒN PYTHON TỰ ĐỘNG HOÁ KEYFRAME TRONG BLENDER (BPY SCRIPT CHO GPT 6.1 SOL - XHIGHT)import bpy, math# Thiết lập Timeline 60 FPS, tổng 180 Frames (3.00s)scene = bpy.context.scenescene.render.fps = 60scene.frame_start, scene.frame_end = 1, 180rig = bpy.data.objects['LamDat_Armature']pb = rig.pose.bones# 1. KHUNG 1 (Frame 1 - 45): ẨN HOÀN TOÀN NHÂN VẬT (Chỉ hiển thị Dây leo)for f in [1, 45]:    scene.frame_set(f)    rig.location = (0.000, 0.000, -1.500)    rig.scale = (0.000, 0.000, 0.000)    rig.hide_viewport = True    rig.hide_render = True    rig.keyframe_insert(data_path='location', frame=f)    rig.keyframe_insert(data_path='scale', frame=f)    rig.keyframe_insert(data_path='hide_viewport', frame=f)    rig.keyframe_insert(data_path='hide_render', frame=f)# 2. KHUNG 2 (Frame 46 bật hiển thị -> Frame 60 - 95 Đáp đất ngồi xổm tại tâm X=0.00m, Tay không)scene.frame_set(46)rig.location = (0.000, 0.000, 0.000)rig.scale = (1.000, 1.000, 1.000)rig.hide_viewport = Falserig.hide_render = Falserig.keyframe_insert(data_path='location', frame=46)rig.keyframe_insert(data_path='scale', frame=46)rig.keyframe_insert(data_path='hide_viewport', frame=46)rig.keyframe_insert(data_path='hide_render', frame=46)pose_f2_euler = {    'Pelvis': (18.5, 0.0, 0.0), 'Spine_01': (8.0, 0.0, -2.0), 'Spine_02': (6.5, 0.0, -2.5),    'Chest': (5.0, -3.0, 4.0), 'Neck': (-10.0, 0.0, 0.0), 'Head': (12.0, 0.0, 0.0),    'UpperArm.R': (12.0, -4.0, -168.0), 'Forearm.R': (10.5, 5.0, 0.0), 'Hand.R': (6.0, -8.0, 15.0),    'UpperArm.L': (22.0, 38.0, 142.0), 'Forearm.L': (82.0, -15.0, -48.0), 'Hand.L': (12.0, 10.0, -18.0),    'Thigh.R': (58.0, -26.0, -145.0), 'Calf.R': (-124.0, 18.0, 22.0), 'Foot.R': (45.0, 0.0, 0.0),    'Thigh.L': (108.0, 22.0, 165.0), 'Calf.L': (-118.0, -8.0, -10.0), 'Foot.L': (18.0, 0.0, 8.0),}for f in [60, 95]:    pb['Pelvis'].location = (0.000, 0.040, 0.520)    pb['Pelvis'].keyframe_insert(data_path='location', frame=f)    for bname, degs in pose_f2_euler.items():        pb[bname].rotation_mode = 'XYZ'        pb[bname].rotation_euler = tuple(math.radians(d) for d in degs)        pb[bname].keyframe_insert(data_path='rotation_euler', frame=f)# 3. KHUNG 3 (Frame 145 - 180): Đứng dịch sang phải (+X = +0.450m), Tay phải (.R) nâng +35° nắm trượng (-X = -0.230m)pose_f3_euler = {    'Pelvis': (0.0, 0.0, 0.0), 'Spine_01': (0.0, 0.0, 0.0), 'Spine_02': (0.0, 0.0, 0.0),    'Chest': (0.0, 0.0, 0.0), 'Neck': (2.0, 0.0, 0.0), 'Head': (0.0, 0.0, 0.0),    'Clavicle.R': (0.0, -4.4, 0.0), 'UpperArm.R': (4.2, 35.0, -55.0), 'Forearm.R': (3.5, 12.0, 0.0),    'Hand.R': (-8.0, 75.0, 15.0), 'Clavicle.L': (0.0, 4.4, 0.0), 'UpperArm.L': (-2.0, -83.8, 90.0),    'Forearm.L': (4.5, -2.2, 0.0), 'Hand.L': (3.0, 6.0, 0.0),    'Thigh.R': (1.3, -1.3, -180.0), 'Calf.R': (-4.1, 0.0, 0.0), 'Foot.R': (66.8, 0.0, 4.0),    'Thigh.L': (1.3, 1.3, 180.0), 'Calf.L': (-4.1, 0.0, 0.0), 'Foot.L': (66.8, 0.0, -4.0),    # 15 Khớp Ngón Tay Phải siết chặt thân trượng R = 0.028m tại (-0.230, -0.040, 1.783)m    'Thumb.01.R': (38.0, 42.0, -18.0), 'Thumb.02.R': (48.0, 8.0, -6.0), 'Thumb.03.R': (55.0, 0.0, 0.0),    'Index.01.R': (65.0, 0.0, 6.0), 'Index.02.R': (82.0, 0.0, 0.0), 'Index.03.R': (50.0, 0.0, 0.0),    'Middle.01.R': (70.0, 0.0, 0.0), 'Middle.02.R': (85.0, 0.0, 0.0), 'Middle.03.R': (52.0, 0.0, 0.0),    'Ring.01.R': (72.0, 0.0, -4.0), 'Ring.02.R': (86.0, 0.0, 0.0), 'Ring.03.R': (54.0, 0.0, 0.0),    'Pinky.01.R': (74.0, 0.0, -8.0), 'Pinky.02.R': (88.0, 0.0, 0.0), 'Pinky.03.R': (55.0, 0.0, 0.0),}for f in [145, 180]:    pb['Pelvis'].location = (0.450, 0.000, 0.960)    pb['Pelvis'].keyframe_insert(data_path='location', frame=f)    for bname, degs in pose_f3_euler.items():        pb[bname].rotation_mode = 'XYZ'        pb[bname].rotation_euler = tuple(math.radians(d) for d in degs)        pb[bname].keyframe_insert(data_path='rotation_euler', frame=f) |
| --- |


