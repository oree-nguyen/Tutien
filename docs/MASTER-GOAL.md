# Goal Master Prompt (2) — Hồn Giới V2.5

Nguồn mới được người dùng trực tiếp yêu cầu áp dụng: [MASTER-ENGINEERING-ART-V2.5.md](requests/MASTER-ENGINEERING-ART-V2.5.md). Thay thế định hướng hình người bụng tròn bằng giải phẫu 8 đầu, 149 minh họa 512, sảnh/bản đồ mới và 5 lớp kiểm tra bảo vệ. Toàn bộ gate GDD/Markdown/Android cũ vẫn bắt buộc.

Điều kiện hoàn tất 100%: `npm run verify:reuse` exit 0, bao gồm gate `master-prompt`; `npm run verify:master` cũng phải exit 0. Thiếu bằng chứng, dữ liệu gốc hoặc thiết bị thật vẫn là chưa đạt. Không xóa gate, hạ ngưỡng, tự duyệt mỹ thuật AAA bằng số tam giác hoặc tự tạo trace.

## Tiêu chí theo từng chương

| ID | Điều kiện đạt |
|---|---|
| AN01 | 12 nhân vật có giới tính, chiều cao theo bảng riêng; tỷ lệ đầu/thân 1:8 đo trên geometry |
| AN02 | Thân bầu dục có eo/ngực/hông riêng, lưới mức gần 128×128; không dùng khối cầu làm thân, vai hoặc mắt |
| AN03 | Khung Pelvis/Spine/Chest/Neck/Head, khớp tay/chân và 5 ngón × 3 đốt; hoạt ảnh không lật áo/chân |
| AN04 | 12 mặt V-line dùng Canvas 2048, UV đúng chiều, iris nhiều lớp/catchlight/mí/mày/môi; không mắt bi lồi |
| AN05 | Mức gần có 8–12 lọn tóc mái và 16–24 lọn sau, búi/trâm/tóc mai và chuyển động nhẹ |
| AN06 | Bốn lớp Hanfu: cổ Y, bốn panel 64×64, đai/ngọc/tua, vai Extrude và lụa; mặt sau không mất do culling |
| AN07 | 12 silhouette, tóc, trang phục và phụ kiện riêng; có ảnh toàn thân/cận mặt đủ nam và nữ |
| WP01 | 12 Hồn khí có hình, kích thước và vị trí tay riêng theo bảng; đúng số nhánh/sen/lông/dây/móng |
| WP02 | 24 skin Hồn khí và 48 trang phục có biến thể nhìn thấy; giữ chuẩn hóa Ranked của GDD |
| IC01 | Đủ 149 minh họa Canvas 512: 7 Cốt, 12 Hoàn, 28 Bổ phẩm, 18 Trợ phẩm, 12 vũ khí, 24 skin, 48 kỹ năng; PNG riêng và có cache |
| IC02 | Các ô trang bị/kho/shop/túi/Hoãn/mua nhanh/Trợ phẩm dùng ảnh minh họa, không dùng glyph thay icon |
| IC03 | 48 icon kỹ năng phù hợp hệ/slot, có chất liệu/khung/aura; MP và cooldown cập nhật theo trạng thái thật |
| LB01 | Sảnh ba bậc bạch ngọc, bốn trụ rồng, Thiên Môn/biển mây/núi/cánh hoa và bốn đèn studio; không sàn lưới xám |
| LB02 | Vuốt xoay 360°, chuyển toàn thân/cận mặt giữ yaw; khung hình theo chiều cao |
| EN01 | Terrain 600×600, lưới 256×256, splatmap 2048 phân bảy biome; độ cao actor/aim/VFX nhất quán |
| EN02 | Cây có nhánh/rễ/năm tầng; mỗi bụi 80–120 lá instanced có gió/tách lá; vào bụi hiện ẩn thân và opacity 0,6 |
| EN03 | Nước có sóng/pháp tuyến giải tích, phản chiếu bầu trời và trăng thủ tục theo camera với Fresnel; chất liệu vùng riêng; không nhận là SSR/phản chiếu vật thể |
| EN04 | Cổng đường kính 7m, bốn tinh thể, vortex đủ trạng thái; sáu đình giao dịch và ba Tế Đàn đúng vị trí |
| CR01 | Bốn loài thú và ba Boss gốc có hình/khớp/VFX riêng; Boss 4,5m/4m/12m, biến dị hiển thị 1,35× và giữ HP 1,6× |
| CR02 | Boss thứ tư chỉ đạt khi có đặc tả gốc và đã triển khai; không tự đặt dữ liệu |
| HU01 | Attack 92px, Q/W/E 68px, R 78px theo cung 145px; màn thấp scale đồng đều và kiểm tra overlap/diện tích |
| HU02 | Joystick nổi, cooldown vòng, MP, đa điểm chạm, hủy màu đỏ và guide arrow/fan 120°/AOE; F giữ/kéo đúng hướng |
| HU03 | Lục soát hai cột, đồ quý quét 0,8s, nhặt chọn món/nhặt nhanh; kiểm tra tải/realm/khóa đội |
| HU04 | Minimap, hai ví, bảy slot, túi 24 ô/48W, gợi ý và Trợ phẩm đúng state; drawer đóng mặc định |
| SE01 | Vault private salted XOR/FNV và mirror; phát hiện/khôi phục sửa HP/MP/ví/cooldown/timer trong game thật |
| SE02 | Credit thời gian monotonic chặn tua nhanh client, giới hạn di chuyển; chấp nhận dash/knockback/pause/restore hợp lệ |
| SE03 | AOI máy chủ không gửi tọa độ địch khuất/khác realm/trong bụi; culling hiển thị không thay quyền máy chủ |
| SE04 | UUID/HMAC gắn tài khoản và dữ liệu; xác minh trước SQL mutation, ledger idempotent/outbox và chuyển quyền PvP chống dupe |
| SE05 | Kotlin Guard chạy trước WebView; compile/DEX/R8 đạt, release chặn pin thiếu/sai, debug hợp lệ; backup khóa HMAC quyền 0600 |
| SE06 | Nút khiên mở trạng thái và mô phỏng tấn công riêng; báo đúng giới hạn JS/root/Frida, không đổi ví thật |
| SE07 | Thử chống sửa APK/native/root/Frida trên Android vật lý với pin/chữ ký thật và trace |
| GP01 | Luật GDD, bốn mode, kinh tế/Cổng/CC/Hoàn/Cốt/Trợ phẩm qua hồi quy; client không quyết định giá/sát thương/vị trí |
| GP02 | Lắp/chỉ số/độ bền Tiên khí theo dữ liệu gốc; hiện chờ bổ sung |
| PK01 | PWA/HTML độc lập/APK ngoại tuyến có đủ tài nguyên, khôi phục save cũ và không yêu cầu asset ngoài |
| DV01 | Android thật: cảm ứng, landscape, immersive, restore và Hồi Hoàn có trace hợp lệ |
| DV02 | Android tầm trung: 60 FPS thường, 30 FPS với ít nhất 40 actor; đo ít nhất 60s mỗi cảnh |
| AR01 | Nghiệm thu đầy đủ hình ảnh, 48 trang phục/24 skin/vũ khí/Boss/bảy vùng và mọi chi tiết yêu cầu; không chỉ đếm đa giác |

## Quyết định khi nguồn xung đột

- Dùng giới tính/chiều cao từng nhân vật ở bảng 1.4 của prompt mới, gồm Mặc Tinh là nữ; đo tỷ lệ 8 đầu theo chiều cao riêng. Các con số generic cũ không ghi đè bảng riêng.
- Giữ nguyên tên/chỉ số/tác dụng vật phẩm từ GDD. Danh sách tên minh họa SUP007–016 mới có chỗ khác bảng gốc; áp dụng chủ đề hình ảnh theo vật phẩm thực tế, không đổi luật.
- Terrain hiển thị 600m, gameplay vẫn dùng bố trí hiện hành ±94m và 7 vùng; núi ngoài biên là cảnh xa, không tự đổi khoảng cách/thời gian combat.
- Nước dùng pháp tuyến sóng giải tích và tia phản xạ theo hướng camera, Fresnel, bầu trời/mặt trăng thủ tục. Đây là phản chiếu môi trường thủ tục theo góc nhìn, không chụp lại vật thể trong cảnh và không phải SSR.
- Kích thước HUD lớn tuân prompt mới ở màn đủ chỗ; màn ngang thấp dùng scale đồng đều. Ngưỡng 82% mặc định của goal trước vẫn được đo và báo, không âmthầm xóa.
- Người dùng chọn chờ đặc tả gốc: không thêm Boss thứ tư hay tự đặt bảng Tiên khí. Không hỏi lại câu này.
- JavaScript/kiểm tra root/Frida không thể bảo đảm chống can thiệp tuyệt đối trên máy người chơi. Bảo vệ client là phát hiện/khôi phục và tín hiệu; tiền/kho online do server quyết định. HMAC ở máy chủ, không nhúng khóa vào client. SQL ACID + ledger/outbox là cơ chế thực tế; không nhận là distributed 2PC nếu không triển khai.
- Chưa có Android vật lý kết nối theo xác nhận người dùng; không dùng SwiftShader/emulator thay trace thật.

Báo cáo máy đọc được: `acceptance/master-requirements.json`, `acceptance/evidence/master-prompt.json`; kết quả có fingerprint của toàn bộ nguồn và yêu cầu. Goal này có thể bị chặn bởi dữ liệu/thiết bị/nghiệm thu còn thiếu, nhưng công việc độc lập vẫn được tiếp tục.


## Bằng chứng để hoàn tất các gate đang chờ

Mọi báo cáo đều cần `passed: true` chỉ sau kiểm chứng thực tế, `sourceHash` hiện hành và thời điểm ghi nhận. Không tạo báo cáo đạt mẫu. Bộ tổng hợp kiểm tra tệp ảnh/tài liệu/trace tồn tại và SHA-256 trùng; đánh dấu một mục mỹ thuật không thể thay bằng chứng dữ liệu hoặc thiết bị.

| Báo cáo | Phạm vi được duyệt |
|---|---|
| `master-art-review.json` | Chỉ AN07, LB01, EN01–EN04; cần reviewer và danh sách images với path/sha256 |
| `master-full-art-review.json` | AR01; cần reviewer, fullArtFidelity, approvedSections, checks allAngles/animation/cosmetics/detailFidelity, ảnh đã đối chiếu và reviewedCounts đủ 12 heroes/12 weapons/24 weaponSkins/48 costumes/7 creatures/7 biomes |
| `master-source-data.json` | CR02 và GP02 khi có nguồn bổ sung; cần reviewer, sourceReferences path/sha256, approvedSections và implementationChecks tương ứng, cùng bộ luật/master/server hiện hành đạt |
| `android-native-security.json` | SE07; cần thiết bị physical/model, tracePath/traceSha256 và kiểm chứng releaseTrustedSignature/wrongSignatureBlocked/modifiedApkBlocked/rootSignalsMeasured/fridaSignalsMeasured |
| `android-functional.json` | DV01; thiết bị thật và trace hợp lệ; launch/landscape/touchCombat/extraction/resume đều đạt |
| `android-performance.json` | DV02; thiết bị thật và trace hợp lệ; giữ ngưỡng 60 FPS thường, 30 FPS với ít nhất 40 actor; `normalDurationSeconds` và `gateCombatDurationSeconds` đều ≥60 giây |

Để đồng thời đạt ART10 của goal trước, báo cáo full-art cần thêm thiết bị physical/model, tracePath/traceSha256 và checks.onAndroid. HUD09 cần các kiểm tra cảm ứng cụ thể trong [UPGRADE-GOAL.md](UPGRADE-GOAL.md); chỉ launch thành công không đủ.

Các schema trên là đường nghiệm thu cho công việc tương lai; chưa có báo cáo đạt cho dữ liệu/thiết bị/nghiệm thu đầy đủ đang thiếu. Chỉ số số lượng và trường boolean không thay việc thực hiện kiểm chứng. Ảnh Linux phục vụ rà triển khai; không dùng làm trace Android.


## Checklist còn mở cho nghiệm thu mỹ thuật AR01

Các ảnh hiện tại xác nhận tính năng kỹ thuật. Những mục dưới đây chưa được ký duyệt, cần đối chiếu từng dòng của prompt và sửa các sai lệch tìm thấy:

- [ ] Đối chiếu 12 khuôn mặt ở chính diện/nghiêng, ánh mắt/môi/tóc và đặc điểm riêng; lưới mặt hiện chia sẻ cấu trúc, chưa có nghiệm thu độ trung thực từng nhân vật.
- [ ] Kiểm tra tư thế cầm đủ 12 Hồn khí, bàn tay/ngón, chạy/đánh/thi triển và các góc sau; các hồi quy chân dung/đàn không thay toàn bộ kiểm tra chuyển động.
- [ ] Kiểm tra áo bốn lớp, tà/lụa/giáp vai khi xoay và chuyển động ở cả ba mức LOD; sửa mọi xuyên lưới hoặc bộ phận bị che sai được phát hiện.
- [ ] Chụp và đối chiếu riêng 24 skin Hồn khí và 48 trang phục; bộ ảnh hiện chỉ có biến thể đại diện. Thống kê hình học/chất liệu không thay nghiệm thu này.
- [ ] Đối chiếu giải phẫu, khớp, hoạt ảnh và VFX của bảy sinh vật gốc, cùng chất liệu/cây/cỏ/nước/Cổng của cả bảy vùng trong cảnh chiến đấu; preview cô lập không chứng nhận tương tác giao tranh.
- [ ] Lập full-art review với ảnh có checksum, các checks và reviewedCounts đã định nghĩa. Để đạt ART10 của goal trước, phải bổ sung kiểm tra mỹ thuật trên Android thật và trace tương ứng.

Không đánh dấu các ô này bằng kết quả đếm đa giác, một ảnh đại diện hoặc một lượt compile thành công.

Review ảnh hiện hành còn ghi nhận khung preview sói/Kỳ Lân cắt bàn chân, hình khối/vật liệu còn đơn giản và lặp kiến trúc giữa vùng; Bí Cảnh chưa có sân khấu tinh cầu/hư không đầy đủ theo định hướng cuối. Các điểm này thuộc công việc AR01 còn mở, không được suy ra đã hoàn tất từ test kỹ thuật.


## Kết quả hiện hành — 15/10/2026

Nguồn `c5d7faa6514fc22f4317106ea640a81c9786e6752c3c0b5b2fc5eb1528605d03`: **31/37** tiêu chí có bằng chứng, **chưa đạt 100%**. Các mục còn mở: CR02, SE07, GP02, DV01, DV02, AR01. Xem [VALIDATION.md](VALIDATION.md) và báo cáo máy đọc được; số gate không phải phần trăm chất lượng mỹ thuật hoặc tiến độ sản phẩm.
