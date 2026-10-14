# Goal nâng cấp theo Markdown V2.5

Nguồn yêu cầu: [tệp Markdown được người dùng chỉ định](requests/AI-Studio-Android-V2.5.md). Các câu lệnh trong tệp được áp dụng theo yêu cầu trực tiếp của người dùng trong cuộc trò chuyện. Đây là phần mở rộng goal; các gate GDD/Android cũ vẫn bắt buộc. Không đánh dấu hoàn thành dựa trên số lượng đa giác hoặc screenshot.

Điều kiện dừng ở trạng thái hoàn thành: `npm run verify:reuse` exit0 với bằng chứng khớp fingerprint, bao gồm `md-upgrade`. Nếu thiếu phần cứng/đặc tả/dịch vụ bên ngoài, công việc vẫn chưa hoàn thành và phải nêu đúng blocker.

## Đồ họa và tài nguyên

| ID | Tiêu chí nghiệm thu |
|---|---|
| ART01 |12nhân vật có silhouette, khuôn mặt/mắt/tóc/giáp/vạt áo/tay5ngón/chân nhiều khớp, có ảnh cận cảnh kiểm tra mỗi nhân vật |
| ART02 | Mức cận cảnh mỗi nhân vật/Boss từ50.000tamgiác trở lên, thống kê thực từ geometry; không dùng BoxGeometry cho cơ thể/vũ khí |
| ART03 |12Hồn khí khác hình dạng;24skin và48trang phục có thay đổi nhìn thấy; đủ vòng cổ ngữ và hạt năng lượng |
| ART04 | Ba Boss có tên trong tài liệu: Cự Viên/Kỳ Lân/Cổ Long có giải phẫu riêng và VFX riêng; Boss thứ4 cần đặc tả nguồn, không tự nhận là đã có |
| ART05 |7vùng có địa hình256×256, sông/đồi/hẻm và cây nhiều nhánh; độ cao hiển thị phải dùng nhất quán với actor/VFX/camera |
| ART06 | Smooth normals, bản đồ normal/roughness/metalness/bump/displacement1024, MeshPhysicalMaterial; ngọc/băng có transmission, skinVIP có iridescence |
| ART07 | Composer+bloom, PCFSoftShadowMap4096, Hemisphere/Directional/weaponPointLight; chế độ chất lượng nhẹ có tắt hiệu ứng tốn tài nguyên |
| ART08 | THREE.LOD thật, có mức gần/vừa/xa; cache/shared geometry; giới hạn mô hình chi tiết cao, tài nguyên xa instanced; không cấp phát geometry mỗi frame |
| ART09 | Mesh GLB từ pipeline Blender có provenance/checksum, tải/hiển thị được; không gắn nhãn Sinnon/AI cho asset tự dựng |
| ART10 | Nghiệm thu mỹ thuật từng nhân vật/skin/trang phục/Boss trên Android; có báo cáo ký duyệt và hình ảnh; chưa thể thay bằng test hình học |

## HUD và thao tác

| ID | Tiêu chí nghiệm thu |
|---|---|
| HUD01 | Cửa hàng/túi/Hoãn/Dev đóng mặc định; drawer có nútX>=44px, không giữ di chuyển/đánh khi mở |
| HUD02 | Floating joystick theo chỗ chạm vùng trái, thả/cancel mất focus trả input0; hỗ trợ nhiều ngón đồng thời với kỹ năng |
| HUD03 | Hai ô mua/ghép gợi ý thực thi thật; kiểm tra đủ tiền/slot/nguyên liệu/vị trí và Phản Phệ trước giao dịch |
| HUD04 | Attack+chọn quái/chọn tướngHPthấp chỉ chọn mục tiêu hợp lệ, cùng realm, nhìn thấy, trong tầm; server tự quyết định |
| HUD05 | QWER theo cung, radial cooldown+giây, kéo ngắm, vùng đỏ hủy không trừmana/CD; F/3Trợphẩm trong tầm ngón cái |
| HUD06 | Smart action chỉ hiện ngữ cảnh gần rương/TếĐàn/Cổng; nhặt, hấp thu8s, rút và gửi đồ dùng state machine hiện có |
| HUD07 | Minimap tròn, chạm phóngto, đánh dấu trên bản đồ lớn; bar gọn có thời gian/cổng/sống sót/vốn/thu nhập; túi24/48W,shop7ô |
| HUD08 | Ít nhất82% diện tích viewport không bị HUD che ở844×390,915×412,1280×720 trong trạng thái chiến đấu mặc định, đo union vùng phủ đục; drawer mở được loại trừ rõ |
| HUD09 | Thử joystick/skill/cancel/shop/drawer/context trên trình duyệt cảm ứng và Android thật; không có overlap bấm nhầm |

## Gameplay bổ sung và tính toàn vẹn

| ID | Tiêu chí nghiệm thu |
|---|---|
| GAME01 | Squad4=25đội×4=100actor ở offline/online; Solo/Duo/Squad3 tiếp tục đúng số lượng |
| GAME02 | Hiển thị giá trị trang bị mang vào đang chịu rủi ro; Tiên khí có chọn/lắp/lưu/mất/hoàn và chỉ số từ bảng nguồn hoặc phụ lục được xác định rõ |
| GAME03 | Thẩm định loot quý có giao diện kính lúp, xem thuộc tính, không tự nhận đồ khi túi đầy hoặc khácrealm |
| GAME04 | Toàn bộ luật ví/kho/7Bổphẩm/Hoàn/Cốt/Trợphẩm/Cổng theo GDD vẫn qua kiểm thử; input mới không cho client gửi giá/HP/vị trí |
| GAME05 | Web/PWA/HTML độc lập/APK hoạt động, asset đóng gói offline; runtime dữ liệu save cũ vẫn khôi phục được |
| DEVICE01 | Android thật: cảm ứng/landscape/immersive/restore/HồiHoàn đạt, trace có checksum |
| DEVICE02 | Android tầm trung:60FPS thường/30FPS ở>=40nhân vật, phép đo>=60s mỗi cảnh; không dùng LinuxSwiftShader để thay thế |

Phân biệt nguồn: người dùng đã cho phép tìm hệ thống Linux thay thế sau khi Sinnon bị proxy403. Blender là pipeline hiện chạy được; TripoSR chưa chạy inference do thiếu trọng số. Không cần WindowsEXE. Không tăng mật độ mesh vô hạn để đổi lấy một con số: mức cận cảnh đáp ứng chi tiết, mức giao tranh dùngLOD và phải đo thật.

Quyết định người dùng: giữ đúng dữ liệu gốc và chờ đặc tả Boss thứ4/Tiênkhí; không tự thiết kế phụ lục. Vì vậy ART04/GAME02 không được tự đánh dấu hoàn thành.


## Cách đọc trạng thái và giới hạn nghiệm thu

Các gate kỹ thuật về bộ phận/độ khác biệt/địa hình được xem xét bằng mã, thống kê và ảnh trong `docs/visual-review`. Chúng chỉ xác nhận các tính năng nêu trong từng hàng, không tự chứng nhận toàn bộ mô tả mỹ thuật cực đại trong Markdown. `ART10` và audit GDD vẫn giữ việc đối chiếu độ trung thực/chất lượng cuối, gồm các khác biệt đã nêu trong `GRAPHICS-PIPELINE.md`; không chuyển các phần còn thiếu thành “đã đạt” vì có nhiều tam giác.

Theo lựa chọn của người dùng, `ART04` và `GAME02` chờ đặc tả gốc. `ART10`, `HUD09`, `DEVICE01`, `DEVICE02` cần kiểm chứng/hoàn thiện trên Android thật và nghiệm thu mỹ thuật; hiện chưa có thiết bị kết nối. Tất cả các gate gốc về GDD và thiết bị tiếp tục bắt buộc. Khi các mục này chưa đạt, trạng thái đúng là bản đang phát triển có APK cài thử, không phải bản hoàn tất100%.


## Kết quả hiện tại — 15/10/2026

`verify:upgrade`: **20/26 tiêu chí kỹ thuật có bằng chứng hiện hành**. Đây không phải80%chất lượng sản phẩm hoặc nghiệm thu100%Markdown/GDD. Các mục còn lại:

| ID | Phần còn thiếu |
|---|---|
| ART04 | Boss thứ tư chưa có đặc tả nguồn; giữ ba Boss đã định nghĩa |
| ART10 | Hoàn thiện/đối chiếu mỹ thuật cuối theo Markdown, mọi góc/biến thể và thử trên Android; xem giới hạn ở pipeline và review |
| HUD09 | Kiểm chứng công thái học, overlap và cảm giác nhiều ngón trên Android thật |
| GAME02 | Giá trị rủi ro đã có; chưa có bảng gốc cho lắp/chỉ số/độ bền Tiên khí |
| DEVICE01 | Chưa có trace Android vật lý về launch/ngang/cảm ứng/HồiHoàn/restore |
| DEVICE02 | Chưa có trace đủ 60s mỗi cảnh, đạt 60 FPS thường và 30 FPS với ≥40 actor trên Android tầm trung |

Review kỹ thuật chỉ duyệt sự hiện diện các bộ phận/biến thể/địa hình trong ART01/ART03/ART05; các giới hạn và công việc mỹ thuật còn lại được ghi rõ trong `acceptance/evidence/upgrade-art-review.json`. Không dùng review này để duyệt ART10 hoặc audit GDD. Goal tái sử dụng vẫn BLOCKED với các gate `android-functional`, `android-performance`, `gdd-audit`, `md-upgrade` và `master-prompt` từ prompt mới. Xem thêm [MASTER-GOAL.md](MASTER-GOAL.md).


## Quy tắc bằng chứng sau khi siết bộ chấm

`verify:upgrade` chỉ nhận review ảnh cho ART01/ART03/ART05; ảnh phải tồn tại, đúng định dạng và SHA-256, reviewer không rỗng, fingerprint hiện hành. Report ảnh không thể duyệt ART04/GAME02/ART10/HUD09 hoặc các mục thiết bị.

- ART04/GAME02 nhận gate CR02/GP02 tương ứng của Master cùng nguồn, đồng thời đối chiếu lại tài liệu bổ sung có checksum, implementationChecks và bộ master/luật/server hiện hành. GAME02 vẫn cần kiểm tra UI giá trị rủi ro. Master có thể chưa đạt tổng thể; chỉ gate cụ thể đã đạt được chuyển tiếp để tránh phụ thuộc vòng.
- ART10 cần AR01 và `master-full-art-review.json` đã nghiệm thu đủ ảnh/chi tiết/số lượng, kèm `checks.onAndroid: true`, thông tin thiết bị thật và trace riêng có checksum.
- HUD09 cần `android-functional.json` đạt năm kiểm tra cơ bản và thêm `joystick`, `skills`, `skillCancel`, `shop`, `drawer`, `contextActions`, `noTouchOverlap`; các hồi quy cảm ứng trên trình duyệt cũng phải đạt.
- DEVICE01 cần model không rỗng, trace tồn tại đúng SHA-256 và đủ launch/landscape/touchCombat/extraction/resume. DEVICE02 cần cùng điều kiện trace/model, FPS đạt 60/30, ít nhất 40 actor và `normalDurationSeconds`/`gateCombatDurationSeconds` đều ít nhất 60 giây; giữ `durationSeconds >= 60`.

Fixture kiểm thử chỉ chạy trong thư mục tạm, không tạo bằng chứng đạt cho game hoặc thiết bị. Các gate chưa có bằng chứng thực tế tiếp tục BLOCKED.
