# PROMPT 2: DỰNG LẠI ANIMATION XUẤT HIỆN CỦA HÀN TRẠCH (H02) VÀ LÂM DẬT (H01) THEO ẢNH THAM CHIẾU; SỬA LỖI XƯƠNG CŨ; XÁC ĐỊNH ĐÚNG LÒNG BÀN TAY KHI CẦM VŨ KHÍ



## 0. ẢNH THAM CHIẾU VÀ QUY ƯỚC



Có hai ảnh đính kèm, mỗi ảnh 3 khung vẽ bằng người gỗ (mannequin): Ảnh 1 là Hàn Trạch (H02), Ảnh 2 là Lâm Dật (H01). Nếu ảnh được đính kèm, lưu vào docs/anim-ref/H02-ref.png và docs/anim-ref/H01-ref.png.



Ảnh dùng để xác định TƯ THẾ và THỨ TỰ HÀNH ĐỘNG, không phải tỉ lệ cơ thể. Nhân vật thật là model Hunyuan có tỉ lệ khác người gỗ, nên bám theo ĐIỂM TIẾP XÚC (tay-vũ khí, tay-đất, chân-đất, vũ khí-đất) bằng IK, đừng chép góc khớp của người gỗ. Các con số trong prompt là gợi ý đọc từ ảnh; khi số và ảnh lệch nhau thì ảnh quyết định, và phải ghi rõ trong báo cáo.



QUY ƯỚC TRÁI/PHẢI: luôn là trái/phải CỦA NHÂN VẬT, không phải của màn hình. Khi nhân vật quay mặt về camera sảnh, tay trái của nhân vật nằm ở bên PHẢI màn hình. Tay cầm vũ khí là tham số dữ liệu (data/hero-entrance/<heroId>.json: "gripHand": "left" cho H02, "right" cho H01) để đổi được bằng một dòng, không hardcode trong code.



### Hàn Trạch (H02), búa lớn

- Khung 1: búa rơi nghiêng xuống đất, tạo chấn động, cát bụi tung tóe. Không có nhân vật.

- Khung 2: nhân vật tiếp đất trong tư thế ngồi xổm rộng, thân hơi gập trước, đầu ngẩng nhìn thẳng. Tay PHẢI chống thẳng xuống đất chịu lực. Tay TRÁI vươn ngang ra, nắm chặt cán búa. Búa vẫn giữ góc nghiêng xéo mạnh như ở Khung 1 (đầu búa nằm trên mặt đất, cán nghiêng khoảng 15-25 độ so với phương thẳng đứng, theo ảnh), không dựng thẳng, như bị ghim xuống đất.

- Khung 3: nhân vật đứng thẳng hoàn toàn. Tay TRÁI nhấc bổng cây búa lên, cán dựng thẳng đứng, đầu búa ở trên, ngang tầm đầu và sát bên khuôn mặt. Đầu cán dưới lơ lửng cách mặt đất khoảng 10-15% chiều cao nhân vật. Tay phải thả lỏng bên hông.



### Lâm Dật (H01), cây trượng dây leo

- Khung 1: dây leo gai trồi mạnh từ lòng đất nứt nẻ, bắn tung cát đá. Không có nhân vật.

- Khung 2: nhân vật trồi lên ngồi xổm, tay không, không cầm gì. Tay PHẢI chống vững xuống đất (gần như thẳng, bàn tay áp phẳng xuống đất), tay TRÁI co hờ tự nhiên (bàn tay đặt hờ trên đùi/gối trái). Chân lệch: gối phải thấp sát đất, bàn chân trái đặt phẳng, thân hơi gập trước, đầu ngẩng nhìn thẳng.

- Khung 3: nhân vật đứng thẳng hoàn toàn. Các dây leo đã bện xoắn thành một cây trượng lớn thô ráp, dựng thẳng đứng, chân trượng đặt trên đất, ngọn cao hơn đầu. Nhân vật vươn tay PHẢI chếch lên cao nắm cây trượng (độ cao nắm xấp xỉ ngang mắt). Tay TRÁI thả lỏng tự nhiên bên hông.



Ghi chú diễn giải: (a) Khung 3 của H02 trong ảnh trông như nhìn từ phía sau; văn bản quyết định (tay trái cầm búa); trong game nhân vật quay MẶT về camera nên búa hiện ở bên phải màn hình. (b) Với H01 Khung 3, "tay phải thả lỏng" trong văn bản gốc được hiểu là tay TRÁI thả lỏng.



Đặc tả này thay thế mọi tư thế ngồi và tư thế cuối đã có cho H01/H02 trong repo (ví dụ "tay phải chống hông, tay trái chạm đất"). Các hiệu ứng (dây leo, sóng xung kích, cát bụi) và đòn gõ trượng nếu đặc tả cũ có: giữ nếu không mâu thuẫn, và kết thúc ĐÚNG tại tư thế Khung 3.



## 1. RÀNG BUỘC BẤT BIẾN



1. KHÔNG giảm chất lượng đồ họa: không hạ texture, pixelRatio, vật liệu. Giữ màu/ánh sáng hiện tại.

2. KHÔNG sửa GDD, luật chơi, ví/kho/vault/HMAC, không đụng phần đã sửa về khởi động sảnh.

3. KHÔNG ghi đè GLB gốc trong assets/base_models. File đã chỉnh xuất ra thư mục riêng (assets/rigged/) kèm manifest ghi nguồn và hash.

4. KHÔNG dùng mẹo che lỗi: không ẩn bàn tay/vũ khí, không đổi scale để giấu, không đóng băng tư thế bằng cách tắt animation.

5. KHÔNG hạ ngưỡng test hay xóa test. KHÔNG bịa số đo: mọi con số trong báo cáo phải từ script chạy thật. Phần cần điện thoại thật ghi "chưa kiểm chứng trên thiết bị".

6. Thiếu công cụ (Blender headless...) thì kiểm tra trước (blender --version), nói rõ và dùng phương án JS thay thế; không giả vờ đã chạy.

7. Mỗi giai đoạn một commit. Đọc AGENTS.md, docs/GRAPHICS-PIPELINE.md, docs/H01-C0-ANDROID-TRIAL.md và đặc tả animation hiện có trước khi sửa.



## 2. LỖI CŨ PHẢI TRIỆT TIÊU (quan sát từ video của bản trước)



E1. Sau animation nhân vật về tư thế gốc (A-pose của asset Hunyuan): hai tay dang ra, lòng bàn tay mở, vũ khí đứng riêng/lơ lửng.

E2. Tay chân vặn vẹo sai khớp: khuỷu/gối bẻ sai chiều, vai xoay quá mức, thân gập, đầu cúi sát đất khi ngồi.

E3. Da và trang phục méo: vai và tay áo phình, vùng khớp xẹp kiểu bao kẹo, co kéo.

E4. Chân và hông chìm vào mặt bệ khi ngồi.

E5. H02 hiện ở góc trên bên phải, lệch tâm bệ đài; sau animation đầu búa lơ lửng cạnh vai, không tay nào nắm cán.

E6. Dây leo sót lại trên sàn sau khi animation kết thúc.

E7. Đổi tướng: giao diện ghi tướng mới nhưng 3D vẫn hiện model tướng cũ.

E8. Nhãn "HUNYUAN · RIG / HOẠT ẢNH THỬ NGHIỆM" hiện trên màn hình thường.

E9. Một phiên bản trước đã bẻ gãy xương ngón tay và dùng MU BÀN TAY (lưng bàn tay) để nắm trượng/chùy: phi logic thực tế. Đây là lỗi ưu tiên cao nhất của prompt này (Mục 4-5).



Giả thuyết nguyên nhân cần kiểm chứng ở Mục 3: (1) track animation không gắn được vào xương do tên bị Three.js làm sạch (PropertyBinding.sanitizeNodeName: khoảng trắng thành "_", bỏ [ ] . / :); (2) mixer bị dừng/hủy hoặc skeleton.pose() sau animation, không có clip idle nối tiếp; (3) animation đặt góc tuyệt đối đoán mò, không bù trục cục bộ của auto-rig; (4) key quaternion không liên tục dấu (dot < 0) hoặc dùng Euler; (5) trọng số skin kém (nhiễm chéo tay trái/phải/thân, không đối xứng), file có JOINTS_1/WEIGHTS_1 (Three.js chỉ dùng bộ 0, 4 ảnh hưởng), scale xương không đồng nhất/âm, inverse bind matrix lệch; (6) vũ khí không gắn vào xương tay; (7) không có IK neo chân, độ cao hông không tính theo chiều dài chân và mặt bệ; (8) đổi tướng không có token chống kết quả tải cũ.



## 3. GIAI ĐOẠN A: AUDIT NHANH VÀ NỀN TẢNG (báo cáo ngắn rồi làm tiếp)



A1. tools/rig-audit.mjs (Node + @gltf-transform/core) chạy trên GLB của H01 và H02, ghi docs/RIG-AUDIT.md: joint, phân cấp, TRS bind; scale không đồng nhất (|sx-sy|, |sy-sz| > 0.001) hoặc âm; IBM khớp inverse(bind world) sai số 1e-4; chiều dài xương trái/phải lệch quá 3%; có JOINTS_1 không; số đỉnh tổng trọng số lệch quá 1e-3 sau khi cắt 4 ảnh hưởng; nhiễm chéo trọng số (khoảng cách đỉnh tới xương chủ đạo vượt 2.5 lần bán kính trung bình; đỉnh tay trái có trọng số lớn vào xương bên phải); độ đối xứng trọng số. Báo xương NGÓN TAY: có đủ 3 đốt x 5 ngón cho mỗi bàn tay không, ngón nào dính liền mesh.

A2. Audit track: mọi track của clip hiện có, báo số track KHÔNG gắn được vào xương (dùng PropertyBinding sau sanitize), xương không có track, track scale, track translation trên xương không phải hông/root, track Euler, cặp key liên tiếp có dot < 0.

A3. Audit runtime (chỉ ?rig=1): khi animation xuất hiện kết thúc, in trạng thái mixer (enabled, paused, time, weight, clampWhenFinished, loop), danh sách xương có quaternion cục bộ trùng bind trong 1°, nơi gọi stopAllAction / uncacheRoot / skeleton.pose() (file:dòng).

A4. Audit vũ khí: búa và trượng đang parent vào đâu (scene hay xương nào), Grip_Pivot có không, vị trí tâm lòng bàn tay so với điểm cầm ở mỗi frame.

A5. Kết luận ngắn: giả thuyết nào ở Mục 2 được xác nhận/bác bỏ, kèm bằng chứng (file:dòng hoặc số liệu). Nếu phát hiện cần quyết định lớn (ví dụ rig Hunyuan thiếu xương ngón, phải rig lại bằng Blender), DỪNG và hỏi tôi. Nếu không, làm tiếp.



A6. Ánh xạ xương chuẩn: data/rig/canonical-humanoid.json (hips, spine, chest, neck, head, clavicle, upperArm, lowerArm, hand, 3 đốt x 5 ngón, upLeg, lowLeg, foot, toes; trái/phải). Validator báo lỗi nếu thiếu xương bắt buộc hoặc cặp trái/phải lệch.

A7. Khung chuẩn của từng xương tính từ bind pose (trục dọc là hướng tới xương con; trục gập là pháp tuyến mặt phẳng gập tự nhiên). Mọi góc giới hạn tính bằng phân rã swing-twist trong khung này, KHÔNG đọc thẳng Euler trên trục cục bộ của auto-rig.

A8. Bảng giới hạn khớp (độ, tính từ bind, dung sai 1°; lưu data/rig/joint-limits.json):

- Cổ: gập 50, ngửa 60, nghiêng 35, xoay 45.

- Mỗi đốt sống (3 đốt): gập 25, ngửa 15, nghiêng 15, xoay 20; tổng xoay <= 45.

- Xương đòn: nâng 40, hạ 10, ra trước 25, ra sau 15.

- Vai: gập trước 180, duỗi sau 60, dang 180, khép 30, xoay trong 70, xoay ngoài 90.

- Khuỷu: gập 0-145, duỗi quá <= 5, lệch trục bản lề <= 8, xoay dọc 0 (xoắn do cẳng tay/xương xoắn).

- Cổ tay: gập 80, ngửa 70 (riêng tư thế chống đất cho phép 80), nghiêng quay 20, nghiêng trụ 30.

- Hông: gập 120, duỗi 20, dang 45, khép 30, xoay trong 40, xoay ngoài 45.

- Gối: gập 0-150, duỗi quá <= 3, lệch trục <= 6, xoay dọc <= 5.

- Cổ chân: gập mu 20, gập gan 45, lật trong 30, lật ngoài 15.

- Ngón tay: CHIỀU GẬP DƯƠNG LUÔN LÀ VỀ PHÍA LÒNG BÀN TAY (pháp tuyến n ở Mục 4). Khớp bàn-ngón gập 90, duỗi <= 30, dang +-20; đốt gần gập 100, duỗi <= 5; đốt xa gập 80, duỗi <= 5; xoay dọc ngón <= 10.

A9. src/rig/joint-limits.js: (a) hàm kiểm tra trả danh sách vi phạm; (b) hàm kẹp làm lưới an toàn runtime (mỗi lần kẹp log một lần ở ?rig=1). Lưới an toàn KHÔNG thay thế việc sửa animation. Unit test: bind pose cho 0 vi phạm; xoay vượt giới hạn 5° phải bị báo; đối xứng trái/phải cho kết quả đối xứng.



## 4. GIAI ĐOẠN B: XÁC ĐỊNH LÒNG BÀN TAY (PALM) CHO TỪNG BÀN TAY, KHÔNG ĐOÁN



Đây là phần quan trọng nhất. Trục cục bộ của xương auto-rig là tùy ý; tuyệt đối KHÔNG giả định trục nào là "lòng bàn tay". Phải suy ra từ hình học và kiểm chứng độc lập.



B1. Với mỗi bàn tay (L và R), tool tools/hand-frame.mjs tính khung bàn tay từ bind pose, ghi data/rig/hand-frames.json:

- f (hướng ngón): từ gốc xương bàn tay (cổ tay) tới trung bình vị trí gốc xương bốn ngón (trỏ, giữa, nhẫn, út); chuẩn hóa.

- u (trục ngang bàn tay): từ khớp bàn-ngón của ngón út tới ngón trỏ; trực giao hóa với f.

- n (pháp tuyến lòng bàn tay, hướng RA KHỎI lòng bàn tay): ỨNG VIÊN theo giải phẫu: tay PHẢI n = cross(u, f); tay TRÁI n = cross(f, u). (Kiểm tra bằng cách nghĩ: tay phải, lòng bàn tay úp xuống, ngón chỉ ra trước, ngón cái bên trái, thì n hướng xuống.) Đây chỉ là ứng viên; phải qua kiểm chứng B2 mới được dùng.

- Palm_Center: điểm giữa cổ tay và gốc ngón giữa, dời theo n một nửa độ dày bàn tay, trong đó độ dày đo từ mesh bằng tia bắn dọc +n/-n từ điểm giữa xương và lấy giao điểm gần nhất mỗi phía.

- Grip_Axis_Hand: trục dọc của vật hình trụ khi cầm, nằm trong mặt phẳng lòng bàn tay, hướng gần u, lệch tới 15-25 độ về phía chéo (cầm kiểu búa thật: đầu cán phía ngón út gần cổ tay hơn đầu phía ngón cái). Góc chéo là tham số (diagonalTiltDeg, mặc định 15), kiểm bằng ảnh (B3) và va chạm (Mục 5).



B2. Kiểm chứng ĐỘC LẬP, tất cả phải đạt, bất đồng thì lật n và chạy lại; nếu vẫn bất đồng thì DỪNG, báo cáo, KHÔNG đoán:

- V1 (gập ngón): quay xương đốt gần mỗi ngón +30° quanh trục gập ứng viên; đầu ngón phải dịch chuyển về phía +n (dot(dịch chuyển đầu ngón, n) > 0). Lưu dấu trục gập vào hand-frames.json (flexAxisSign) cho từng xương ngón, để retarget không bao giờ sinh gập ngược.

- V2 (đối xứng gương): với rig đối xứng, n trái phản chiếu qua mặt phẳng giữa phải trùng n phải (sai <= 10°).

- V3 (ngón cái đối chiếu): quay ngón cái theo chiều đối chiếu thì đầu ngón cái phải vượt qua phía +n và tiến về phía ngón út.

- V4 (ảnh trực quan): xuất docs/hand-frames/<hero>_<L|R>.png với 3 góc nhìn cận cảnh bàn tay, vẽ mũi tên f (xanh dương), u (xanh lá), n (đỏ) từ Palm_Center, cùng một quả cầu nhỏ ở Palm_Center + 2cm dọc n. Codex PHẢI mở và nhìn các ảnh này, ghi vào báo cáo cho từng bàn tay: quả cầu đỏ có nằm ở phía lòng bàn tay (phía đầu ngón sẽ cuộn vào) hay không. Trường hợp mesh bàn tay dính ngón, thiếu xương ngón, hoặc không rõ mặt nào là lòng, DỪNG và hỏi tôi, kèm ảnh.

- V5 (ưu tiên thị giác của tôi): sau khi xong, tôi sẽ xem các ảnh V4; ghi verified = "auto+visual" vào hand-frames.json chỉ khi cả V1-V3 và V4 đều đạt.



B3. Trước khi dùng cho animation, bàn tay phải qua "bài kiểm tra mở-nắm": áp preset nắm đấm (mọi khớp ngón gập 60-80%) và preset mở (gập 10-20%); ghi ảnh 3 góc nhìn; mọi đốt ngón chỉ gập về phía n; chiều dài xương ngón đổi <= 0.1%; không có đốt nào gập ngược (gập có dấu < -10° trừ khớp bàn-ngón được duỗi tới 30°).



B4. Mã lỗi bắt buộc có trong test (Mục 8): FINGER_HYPEREXTENDED (đốt ngón gập ngược quá giới hạn, tức "bẻ gãy ngón"), FINGER_BONE_STRETCH (xương ngón đổi chiều dài), BACK_OF_HAND_GRIP (mu bàn tay hướng vào trục vũ khí thay vì lòng bàn tay).



## 5. GIAI ĐOẠN C: Ổ CẮM VŨ KHÍ VÀ BỘ GIẢI NẮM (GRIP SOLVER)



C1. Cho mỗi vũ khí (búa H02, trượng H01), tạo data/weapons/<id>.json:

- shaftAxis (trục dọc cán trong hệ cục bộ vũ khí), shaftRadius (đo từ mesh tại đoạn cầm, không bịa số), gripSegment [t0, t1] (đoạn có thể cầm, tính theo chiều dài cán), headEnd (đầu búa) / topEnd (ngọn trượng), tổng chiều dài.

- Điểm cầm gripT: MỘT điểm duy nhất dùng từ lúc nắm tới idle (không đổi giữa chừng để khỏi trượt tay). H02: gripT = 0.35 chiều dài cán tính từ đầu búa (ảnh cho thấy khoảng giữa cán ở Khung 2 và phần trên cán ở Khung 3; điểm 0.35 là thỏa hiệp, xem Mục 6 nếu muốn đổi điểm cầm giữa chừng bằng sự kiện regrip, mặc định KHÔNG làm). H01: điểm cầm ở độ cao xấp xỉ ngang mắt nhân vật (hand-to-ground ~ eyeHeight, sai số 5 cm), đúng như Khung 3.

- Grip_Pivot: Object3D nằm TRÊN trục cán tại gripT, trục dọc = shaftAxis. Grip_Pivot là hình trụ nắm, KHÔNG phải điểm đặt tay tùy ý.



C2. Bộ giải nắm (src/rig/grip-solver.js): đầu vào là khung bàn tay (hand-frames.json, đã verified), Grip_Pivot (trục a, bán kính r, điểm c), gripHand. Đầu ra là vị trí và hướng cổ tay cộng góc các ngón.

- Đặt tay: Palm_Center cách trục a một khoảng r (cộng nửa độ dày lớp da ~ 3-5 mm), nằm về phía -n của bàn tay (tức pháp tuyến n của lòng bàn tay HƯỚNG VỀ trục: dot(n, hướng từ Palm_Center tới trục) >= 0.8, nghĩa là góc <= 37°).

- Hướng: trục a song song Grip_Axis_Hand (sai <= 25°), hướng ngón f vuông góc a (sai <= 20°).

- Ngón: bộ giải phẳng cho từng ngón trong mặt phẳng gập của ngón (CCD hoặc FABRIK với giới hạn mỗi khớp CHỈ gập về phía n), mục tiêu là mỗi đốt ôm vòng cung bán kính r + nửa bề dày ngón quanh trục a, đầu ngón vòng sang PHÍA XA của cán so với lòng bàn tay (góc quanh trục a giữa hướng chạm của lòng bàn tay và đầu ngón >= 100° cho 4 ngón). Tổng gập khớp bàn-ngón + đốt gần + đốt xa của mỗi ngón nằm trong khoảng 150-260°.

- Ngón cái: gập theo chiều đối chiếu, đầu ngón cái cách bề mặt cán <= 2.5 cm và nằm trên mặt phía bên kia so với lòng bàn tay (quấn ngược chiều bốn ngón).

- Va chạm: mỗi đốt ngón mô hình là capsule; khoảng xuyên vào cán <= 3 mm; không xuyên lòng bàn tay; không đốt nào nằm bên trong thân cán.

- Nếu bộ giải không thỏa các điều kiện trên, báo lỗi và KHÔNG áp dụng, tuyệt đối không "ép" bằng cách bẻ ngược ngón hay xoay mu bàn tay vào trục.



C3. Trình tự nắm (cho cả hai tướng):

1. Chuẩn bị (0.25 s trước grab): bàn tay mở (mọi ngón gập 15-25%), lòng bàn tay (n) HƯỚNG VỀ Grip_Pivot, tay tiến tới theo hướng n, không vòng qua mu bàn tay.

2. grab: sự kiện bắn khi Palm_Center cách điểm tiếp xúc <= 2 cm và n hướng đúng. Khép ngón trong 0.12-0.18 s (ease-out), tới trạng thái bộ giải C2.

3. Ngay khi grab: vũ khí dùng hand.attach(weapon) giữ nguyên biến đổi thế giới (sai số < 1 cm, không giật); sau đó vũ khí là con của xương bàn tay (qua Grip_Pivot) và không trượt trong tay quá 3 mm cho tới hết animation.

4. Trước grab: vũ khí đứng ở điểm neo thế giới (búa nằm nghiêng trên đất, trượng đứng cắm đất). Sau idle: vũ khí giữ nguyên quan hệ với bàn tay.



C4. Cầm tay không (tư thế chống đất, tay thả lỏng): xem Mục 6 và 7; bàn tay chống đất cũng phải biết đâu là lòng bàn tay (bàn tay chống phải áp LÒNG xuống đất: dot(n, trục lên) <= -0.85, không phải mu bàn tay).



## 6. GIAI ĐOẠN D: ANIMATION HÀN TRẠCH (H02) THEO ẢNH 1



Dữ liệu dẫn động data/hero-entrance/H02.json. Tất cả đều là tư thế đích + IK + thời gian; bake lúc build (Mục 9).



Vật thể: búa nặng. H = chiều cao nhân vật. LOBBY_STAGE_ANCHOR = tâm mặt bệ đài.



D1. Pha 1: búa rơi (0.00-0.55 s). Búa rơi từ trên khung hình xuống, đầu búa chạm đất trước, nghiêng. Sự kiện impact_hammer đúng khung va chạm (kích hoạt cát bụi, chấn động nhẹ của camera/bệ nếu có hiệu ứng sẵn). Búa dừng lại với đầu búa nằm trên mặt bệ, cán nghiêng 15-25° so với phương thẳng đứng, đầu búa lệch về phía TRÁI của nhân vật (phía phải màn hình khi nhìn từ camera sảnh) cách anchor khoảng 0.4-0.6H, cán nghiêng hướng về phía anchor. Búa nằm trong khung nhìn camera; không chìm xuống bệ (đáy đầu búa chạm mặt bệ, sai số 0.5 cm).



D2. Pha 2: nhân vật tiếp đất (0.55-1.25 s). Nhân vật rơi từ trên cao NGAY TRÊN anchor (đi qua tâm bệ, luôn nằm trong khung nhìn, KHÔNG xuất hiện lệch ở góc như bản cũ), chạm đất bằng hai chân ở tư thế ngồi xổm rộng: bàn chân phẳng trên bệ, rộng bằng 1.5-2 lần vai, gối mở ra ngoài, góc gập hông 105-125°, gập gối 120-140°, thân nghiêng trước 15-25°, cổ gập <= 20° so với đường thân (đầu ngẩng nhìn thẳng, không cúi sát đất). Sự kiện land đúng khung chạm chân đầu tiên: hông hạ thêm tối đa 10 cm rồi hồi lại (giảm xóc), cát bụi. Tay PHẢI chống thẳng xuống đất: khuỷu gập <= 10°, vai dang nhẹ, Palm_Center cách mặt bệ <= 1.5 cm cộng độ dày, lòng bàn tay áp phẳng (Mục 5-C4), các ngón duỗi hơi xòe, cổ tay ngửa <= 80°. Tay TRÁI vươn ngang ra phía cán búa, bàn tay mở hướng vào cán.



D3. Pha 3: nắm cán (1.25-1.75 s). Theo C3. gripHand = left. Búa vẫn nghiêng, đầu búa vẫn nằm trên đất.



D4. Pha 4: đứng dậy nhấc búa (1.75-3.0 s). Hông nâng ease-out; chân KHÔNG trượt quá 1 cm; tay phải rời đất, nhấc lên rồi thả lỏng bên hông (khuỷu gập 15-30°, bàn tay cạnh đùi, ngón gập nhẹ 20-30°, lòng bàn tay hướng vào đùi). Tay trái nâng búa: đầu búa rời đất, búa xoay quanh bàn tay từ nghiêng sang thẳng đứng; đầu búa chuyển lên cao dần, KHÔNG chạm hay xuyên vào thân/đầu nhân vật (khoảng cách tối thiểu giữa búa và mesh đầu/thân >= 2 cm khi chuyển động).



D5. Pha 5: tư thế cuối Khung 3 (3.0-3.5 s). Nhân vật đứng thẳng, chân rộng bằng vai, bàn chân phẳng. Tay trái giữ búa: cán dựng thẳng đứng (sai <= 5°), đầu búa ở trên, ngang tầm đầu, dịch sang bên trái nhân vật (phía phải màn hình) sát khuôn mặt: khoảng cách ngắn nhất giữa búa và mesh đầu từ 2 đến 8 cm (sát nhưng không xuyên); đầu cán phía dưới cách mặt bệ khoảng 10-15% H. Khuỷu trái gập xấp xỉ 70-100°, bàn tay ngang khoảng ngực-vai. Tay phải thả lỏng bên hông như D4. Chuyển mượt (BLEND 0.3 s) sang IDLE_HOLD.



D6. IDLE_HOLD: giữ nguyên tư thế D5; thở ±1° cột sống chu kỳ ~4 s, chuyển trọng tâm nhẹ, búa lắc tối đa 1 cm; tuyệt đối không rơi về tư thế gốc.



## 7. GIAI ĐOẠN E: ANIMATION LÂM DẬT (H01) THEO ẢNH 2



Dữ liệu data/hero-entrance/H01.json.



E-1. Pha 1: dây leo trồi (0.00-0.9 s): dây leo gai bắn lên từ lòng đất nứt nẻ, cát đá văng; chưa có nhân vật. Dây leo dùng pool, tạo sẵn ở màn loading.

E-2. Pha 2: nhân vật trồi lên ngồi xổm (0.9-1.9 s), TAY KHÔNG: ngồi xổm lệch (gối phải thấp sát đất, cách mặt bệ <= 8 cm, bàn chân trái đặt phẳng, gối trái cao hơn), thân nghiêng trước 15-25°, cổ gập <= 20° (đầu ngẩng nhìn thẳng). Tay PHẢI chống vững xuống đất: khuỷu gập <= 10°, lòng bàn tay áp phẳng (dot(n, trục lên) <= -0.85), cổ tay ngửa <= 80°. Tay TRÁI co hờ: khuỷu gập 60-90°, bàn tay đặt hờ trên đùi/gối trái, ngón gập nhẹ 20-30°. Nhân vật trồi lên từ vòng pháp trận hoặc dưới bệ bằng mặt cắt (clippingPlanes) để phần dưới sàn bị ẩn đúng cách, không để mesh xuyên bệ.

E-3. Pha 3: dây leo bện thành trượng (1.9-2.6 s): nhân vật giữ tư thế ngồi, thở nhẹ; dây leo xoắn lại thành cây trượng thô ráp dựng thẳng đứng, chân trượng cắm trên đất ở phía TAY PHẢI của nhân vật (cách anchor khoảng 0.35-0.45H, vị trí lấy từ ảnh), ngọn cao hơn đầu nhân vật. Sự kiện staff_formed.

E-4. Pha 4: đứng dậy và nắm trượng (2.6-3.7 s): hông nâng ease-out (~0.9 s), chân không trượt quá 1 cm. Tay PHẢI vươn chếch lên cao (vai dang 70-100°, khuỷu gập 20-40°), theo C3 chuẩn bị-grab: lòng bàn tay hướng về trượng; điểm nắm ngang mắt (±5 cm). gripHand = right. Tay TRÁI buông thả lỏng bên hông (khuỷu gập 10-25°, bàn tay cạnh đùi, ngón gập nhẹ 20-30°, lòng bàn tay hướng vào đùi). Sự kiện grab theo C3.

E-5. Pha 5: tư thế cuối Khung 3 (3.7-4.1 s): đứng thẳng hoàn toàn, chân rộng bằng vai, bàn chân phẳng; trượng thẳng đứng, chân trượng trên đất (không lơ lửng), ngọn cao hơn đầu; tay phải nắm trượng ngang mắt, tay trái thả lỏng. Nếu đặc tả cũ có đòn gõ trượng thì giữ dưới dạng pha tùy chọn, nhưng PHẢI kết thúc đúng tư thế này. BLEND 0.3 s sang IDLE_HOLD.

E-6. IDLE_HOLD: giữ tư thế E-5, thở ±1° chu kỳ ~4 s; trượng không đổi chỗ (neo đất). Tuyệt đối không rơi về tư thế gốc.



## 8. GIAI ĐOẠN F: BAKE, TRACK, MÁY TRẠNG THÁI, VỊ TRÍ, ĐỔI TƯỚNG



F1. Bake: tools/bake-entrance-anim.mjs giải IK và bộ nắm ở 60Hz lúc build, ghi track quaternion thuần (FK) cùng danh sách sự kiện theo thời gian. Runtime chỉ phát clip bằng AnimationMixer, không giải IK mỗi frame (trừ neo chân nếu cần). Track: chỉ quaternion cho xương; translation chỉ cho hông/root; KHÔNG scale; ép dot >= 0 giữa key liên tiếp; nội suy slerp; easing đặt bằng key bổ sung lấy mẫu 60Hz, có chuẩn bị (anticipation), quá đà <= 3°.

F2. Retarget có bù tư thế gốc: hàm đổi "góc khớp trong khung chuẩn" thành quaternion cục bộ của xương. Nghiệm thu bằng test: delta 0 cho đúng bind pose (sai <0.1°); gập khuỷu 90° trái/phải cho vị trí thế giới đối xứng gương; xoay vai theo từng trục cho kết quả đúng hướng giải phẫu.

F3. IK hai xương giải tích (tay, chân) với điểm cực (pole) để khuỷu/gối bẻ đúng hướng; kẹp tầm với 0.999 lần (l1+l2); sau khi giải áp giới hạn khớp. Đo độ lệch từ xương bàn chân tới đáy đế từ mesh ở bind; chân neo: đáy đế ở độ cao mặt bệ ±0.5 cm, không trượt quá 1 cm; hông giải từ tầm với chân, không thấp hơn mặt bệ; nghiêng khung chậu <= 15°.

F4. Đặt tên track khớp sau sanitize; test 0 track không gắn được.

F5. HeroPoseController với một mixer sống lâu mỗi tướng (tái sử dụng khi quay lại sảnh). Máy trạng thái: ENTRANCE -> BLEND (crossfade 0.25-0.35 s) -> IDLE_HOLD (lặp). TUYỆT ĐỐI không: stopAllAction mà không phát action khác ngay; skeleton.pose() sau animation; hủy mixer khi animation xuất hiện xong; để xương không có track. Key cuối ENTRANCE bằng key đầu IDLE_HOLD (chênh góc <= 0.5°, chênh vị trí tay/chân <= 5 mm).

F6. Animation chạy theo thời gian clip, không theo số khung hình; nếu có khựng (dt lớn) thì sự kiện vẫn bắn đúng thứ tự (impact, land, grab, staff_formed, vine_hide) và tư thế cuối không đổi.

F7. Kích hoạt lại nhiều lần: đặt xương về tư thế đầu ENTRANCE, reset action, trả dây leo/hiệu ứng về pool, rồi phát; mỗi lần giống hệt nhau.

F8. Vị trí: sau animation root cách LOBBY_STAGE_ANCHOR <= 1 cm, hướng nhìn camera ±3°. Dây leo và hiệu ứng: sự kiện vine_hide ẩn đúng lúc, trả pool, không để sót.

F9. Đổi tướng: heroSwitchToken tăng mỗi lần đổi; kết quả tải bất đồng bộ của token cũ bị bỏ; khi đổi, model cũ ẩn NGAY và hiện placeholder/ánh sáng; chữ giao diện và model 3D luôn cùng hero id.

F10. Ẩn nhãn "HUNYUAN · RIG / HOẠT ẢNH THỬ NGHIỆM" khỏi giao diện thường (chỉ hiện ở ?debug=1).

F11. Da/trang phục (chỉ làm nếu A2/A5 hoặc chỉ số Mục 9 phát hiện lỗi): chuẩn hóa scale xương về 1; normalizeSkinWeights(); frustumCulled=false cho SkinnedMesh nhân vật; làm sạch trọng số (tối đa 4 ảnh hưởng, bỏ < 0.01, chuẩn hóa, loại nhiễm chéo, làm mịn Laplace 2-3 vòng hệ số 0.5 chỉ ở vùng chuyển tiếp khớp, đối xứng lại từ phía tốt hơn); xương xoắn cẳng tay (cổ tay 100%, giữa 50%, khuỷu 0%); morph hiệu chỉnh cho vai/hông/khuỷu/gối nếu vẫn xẹp; nhiều lớp áo thì chuyển trọng số từ thân sang áo, cách nhau >= 2 mm, không xuyên quá 5 mm. Dùng Blender headless nếu có; nếu không thì phương án JS và ghi rõ. Không đụng vào phần này nếu chỉ số đã đạt.



## 9. KIỂM TRA VÀ NGƯỠNG NGHIỆM THU (tự động, npm run test:anim)



Công cụ debug: ?rig=1 vẽ skeleton, tô đỏ xương vi phạm, HUD pha/thời gian/số lần kẹp. Bộ điều khiển xác định window.__heroAnim.seek(t)/step(dt). Playwright chụp 1024x1024 tại mốc từng pha và tại idle (t_end+1 s, +10 s) từ 3 camera (chính diện, ngang, chéo 3/4), ghép bảng vào docs/anim-report/after/<hero>/.



1. Track không gắn được vào xương: 0. Xương tay/chân/ngón cần mà không có track: 0.

2. Vi phạm giới hạn khớp (A8) ở mọi frame lấy mẫu 60Hz: 0.

3. Chiều dài xương đổi so với bind: <= 0.1% (gồm xương ngón).

4. Kéo giãn cạnh mesh (chiều dài cạnh hiện tại/bind): phân vị 99.9 <= 1.5, tối đa <= 2.0. Tiết diện vòng khuỷu, cổ tay, vai, gối, hông tại gập/dang tối đa nằm trong 0.7-1.4 lần bind.

5. Chân neo: trượt <= 1 cm; đáy đế thấp hơn mặt bệ <= 0.5 cm.

6. Khung tay: hand-frames.json verified = "auto+visual" cho cả 4 bàn tay (2 tướng x 2 tay); các ảnh V4 có trong docs/hand-frames/.

7. Kiểm tra nắm vũ khí (mọi frame sau grab đến hết idle, cho cả H01 và H02):

   - tâm lòng bàn tay cách trục cán <= r + 1.5 cm;

   - dot(n, hướng tới trục cán) >= 0.8 (lòng bàn tay hướng vào cán); mu bàn tay không được hướng vào cán (dot(-n, hướng tới trục) <= -0.5), vi phạm báo BACK_OF_HAND_GRIP;

   - mọi đốt ngón gập về phía n; không có FINGER_HYPEREXTENDED; chiều dài xương ngón đổi <= 0.1% (không FINGER_BONE_STRETCH);

   - bốn đầu ngón vòng sang phía xa của cán (góc quanh trục >= 100° so với hướng chạm lòng bàn tay); ngón cái cách bề mặt cán <= 2.5 cm và quấn ngược chiều bốn ngón;

   - đốt ngón xuyên vào cán <= 3 mm; vũ khí trượt trong tay <= 3 mm.

8. Tay chống đất (H02 và H01, pha ngồi): Palm_Center cách mặt bệ <= 1.5 cm + độ dày bàn tay; dot(n, lên) <= -0.85 (lòng bàn tay áp xuống); cổ tay ngửa <= 80°; khuỷu <= 10°.

9. Tư thế ngồi: góc gập hông 105-125°, gối 120-140°, cổ gập <= 20° so với đường thân; H01 gối phải cách mặt bệ <= 8 cm.

10. Tư thế cuối Khung 3: H02 cán búa thẳng đứng sai <= 5°, khoảng cách búa-đầu 2-8 cm, đáy cán cách bệ 10-15% H; H01 trượng thẳng đứng (sai <= 3°), chân trượng trên đất, điểm nắm ngang mắt ±5 cm. Root cách anchor <= 1 cm, hướng ±3°.

11. Liên tục ENTRANCE->IDLE <= 0.5° và <= 5 mm. Idle không phải bind pose: ở t_end+1 s và +10 s, số xương tay trong 2° so với bind < 20%.

12. Quaternion liên tục (dot >= 0) ở mọi track.

13. Kích hoạt lại 10 lần: tư thế đầu giống nhau (<= 0.5°), renderer.info.memory không tăng, không sót dây leo. Mô phỏng khựng dt=2 s giữa animation: sự kiện đúng thứ tự, tư thế cuối không đổi.

14. Đổi tướng nhanh 20 lần H01<->H02: không hiện model cũ, giao diện và 3D luôn cùng hero id, bộ nhớ không tăng sau chu kỳ ổn định.

15. Đối chiếu ảnh tham chiếu: với mỗi khung của mỗi tướng, dựng cùng kiểu camera với ảnh và xuất tấm ghép "ảnh tham chiếu | kết quả" kèm bảng góc khớp chính (vai, khuỷu, hông, gối, cổ) so với khoảng mục tiêu. Sai lệch lớn ghi vào báo cáo kèm lý do.

16. Hiệu năng: không tạo object mới mỗi frame khi phát; không giảm chất lượng đồ họa; ghi thời gian khung hình trước/sau (ghi rõ đo cloud hay điện thoại thật).

17. Chạy npm test và npm run verify:master, báo kết quả thật.



## 10. CÁCH LÀM VIỆC VÀ BÁO CÁO



- Thứ tự: A (audit, báo cáo ngắn) -> B (khung bàn tay; DỪNG đưa tôi xem ảnh V4 của cả 4 bàn tay trước khi qua C) -> C (ổ cắm + bộ nắm) -> D (H02) -> E (H01) -> F (bake, máy trạng thái, vị trí, đổi tướng, da/trang phục nếu cần) -> kiểm tra Mục 9.

- Dừng sớm chỉ khi: thiếu công cụ cần thiết; rig thiếu xương ngón hoặc ngón dính mesh (cần rig lại, hỏi tôi); V1-V4 bất đồng; một chỉ số không đạt sau hai lần thử; đặc tả pha mơ hồ.

- Mỗi giai đoạn: tóm tắt đã đổi gì, số đo trước/sau, rủi ro còn lại; ảnh bảng trước/sau lưu docs/anim-report/.

- Báo cuối: (1) bảng chỉ số cho H01 và H02; (2) danh sách file thêm/sửa; (3) cái gì đã kiểm chứng ở cloud và cái gì CHƯA kiểm chứng vì cần điện thoại thật; (4) build APK mới, ghi mã bản dựng; (5) hướng dẫn tôi test trên điện thoại: mở sảnh, chọn H02 rồi H01, xem animation, nhìn kỹ lòng bàn tay và ngón tay khi nắm, xem tư thế cuối sau 10 giây, đổi tướng nhanh, thoát trận về sảnh và xem lại.

- Nếu không đạt một chỉ số nếu không rig lại model gốc, nói rõ lý do và đề xuất, không tự hạ ngưỡng hay che lỗi.