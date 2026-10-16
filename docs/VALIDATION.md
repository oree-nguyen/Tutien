# Xác thực hiện tại — 15/10/2026

> Báo cáo dưới đây thuộc mã nguồn trước đợt tooling Tencent (commit `a94717b`). Đợt ngày 16/10/2026 làm fingerprint toàn repository thay đổi; không chuyển bằng chứng hoặc APK cũ thành kết quả của pipeline mới. Xem [trạng thái Tencent hiện hành](tencent-3d/README.md): token đã xác thực, đã có concept thật và GLB hình học H01 chưa texture; Space Tencent hiện tắt texture, chưa có model đạt để tích hợp. Các phép thử game trong báo cáo này chưa được chạy lại cho đợt tooling đó.

Source fingerprint: `81d3ba9e18907ceb62fa6c4cd29bc019fe2a3bfbf9a92f24cabead5e0d0a11d0`. Báo cáo ngày theo Asia/Saigon; timestamp trong JSON dùng UTC. Các lượt kiểm tra, gallery, APK và native chạy tuần tự. Các gate cũ được chạy lại sau sửa đổi vòng đời; mọi bằng chứng bàn giao đều khớp cùng fingerprint.

Lượt kiểm tra tự động liên tục đã dừng tại một lần reconnect hết thời gian chờ. Lượt nối tiếp trên cùng mã nguồn chạy lại reconnect rồi hoàn tất các gate còn lại; trước khi ngắt socket, chẩn đoán chỉ đọc xác nhận nhân vật còn sống. Lần thất bại chưa ghi trạng thái sống/chết trước khi ngắt nên chưa xác định được nguyên nhân. [overhaul-attempt-history.json](../acceptance/evidence/overhaul-attempt-history.json) giữ cả lần thất bại và lần chạy lại; báo cáo này không tuyên bố lệnh `verify:automated` liên tục đã thành công hoặc reconnect đã được kiểm chứng ổn định trong mọi tình huống.

## Kết quả đã thực thi

| Kiểm tra | Kết quả |
|---|---|
| Luật và hồi quy GDD | **128 passed / 0 failed / 0 skipped** |
| Master và overhaul | **214 passed / 0 failed / 0 skipped**: anatomy, PBR, 12 combo/preset, Worker, Hoàn, skillshot, realm và chống duyệt sai evidence |
| Máy chủ | **16 passed / 0 failed / 0 skipped**: PostgreSQL/Redis thật, quyền/HMAC/giao dịch và reconnect |
| Ngoại tuyến trên trình duyệt | Chọn tướng/cấm bùa, mua/ghép/tháo, gửi/rút, lưu/khôi phục, joystick cảm ứng và F; không pageerror |
| Online trên trình duyệt | Đăng ký/đăng nhập, di chuyển do server quyết định, túi đồ, Sandbox ẩn; reconnect nhận lại state của cùng actor |
| HUD nâng cấp | Joystick, đa điểm chạm, kéo/hủy, cooldown/MP, giao dịch nhanh, drawer, minimap, Tế Đàn/Cổng và ba kích thước màn hình |
| Overhaul trên WebGL | **31 cờ kiểm tra đạt**; shader/page error rỗng, GL0, PBR 2048 có dữ liệu thật; hai pointer độc lập và ngón thứ ba bị bỏ qua |
| Auto Farm thực | PvE gây sát thương và giữ R/F/25% mana; nhặt UUID sau thẩm định; giữ Đài giữa các giao dịch, ghép đủ 7 món; manual override 1,2 giây và bắt đầu Hồi Hoàn thật |
| Diện tích cảnh 3D mặc định | 844×390: **82,13%**; 915×412: **84,40%**; 1280×720: **91,63%** |
| PWA/HTML | Reload/vào trận khi ngắt mạng; standalone không yêu cầu tài sản ngoài và không pageerror |
| 22 phút mô phỏng | 39.600 tick / 1.320 giây, ba Boss gốc và Thú Triều |
| 100 kết nối WebSocket giả lập | 40 actor chiến đấu; 800 mẫu ACK; p95 tick **6,08ms**, p95 ACK **36,47ms** |
| Gallery hiện hành | 46 ảnh 3D và 15 ảnh UI/overhaul có SHA; từng biome chờ atlas 2048 từ Worker trước khi chụp |
| APK/native | Build/sync/assembleDebug và apksigner đạt; Kotlin Guard có trong DEX, duplicate-classes và release R8 đạt |

Tổng cộng **358 kiểm thử Node**. Các kết quả này chứng minh phạm vi kỹ thuật đã nêu, không tự chứng nhận mỹ thuật cuối hoặc FPS trên Android.

## Những gì đã kiểm tra trong đợt nâng cấp

Mặt trước dùng UV ±65°, Canvas 2048 phủ da ấm, tóc dựng ngoài hộp sọ. Đã xem ảnh H05 sau khi bỏ đốm tối ở mũi; gương quang học bay lệch vai, mã Hxx không chắn mô hình, toast ở mép trên và tự ẩn 2,2 giây. Năm map gấm lụa có dữ liệu thật; giáp và vật liệu vũ khí không trong suốt dùng chung atlas relief/roughness, giữ riêng vật liệu gương/ngọc/năng lượng. Cache high chỉ giữ một atlas 2048; model xa không tạo 100 bộ high.

Bảy nền có PBR riêng; Worker Blob nội bộ sinh 2048, giữ 7 bộ dự phòng 128 và tối đa 1–2 bộ high. Các phép thử bao phủ byte ảnh, minify, transfer buffer, hàng đợi, kết quả cũ, lỗi và teardown. Cổng ba tầng, đình giao dịch, tế đàn 9 rãnh, bảy loài/Boss, 12 VFX và Hoàn tím/đen được dựng bằng renderer thật trong probe cô lập có pixel/GL. Hoàn đổi theo hai khe thật, không còn ba vòng cố định; material riêng được giải phóng khi bỏ model.

Điều khiển dùng One-Euro/EMA theo dt, ánh xạ azimuth, bốn dạng decal và hit preview. AOE thả tay khớp điểm thi triển thật; hủy và mất capture không mất MP/CD. Buffer 0,25 giây theo đồng hồ cooldown ngoại tuyến; online giữ TTL đồng hồ thực để loại lệnh cũ. Kiểm thử bước 1/60 và 1/120 giây là kiểm tra thuật toán, **không phải phép đo 60/120 FPS**. Hiệu ứng và vùng kỹ năng giữ realm lúc tạo; đổi realm hủy đòn còn tồn tại, snapshot bỏ actor thì hình cũng ẩn ngay.

Phép đo HUD tính union bao chữ nhật của mọi control chiến đấu mặc định, gồm nút Auto khi tắt, không mở drawer/ngắm chiêu/tương tác ngữ cảnh. Ngưỡng vùng nhìn 82% được giữ nguyên; không áp dụng số đo cho mọi trạng thái UI. Các phép thử chức năng online và overhaul giảm drawing buffer trên SwiftShader, giữ nguyên viewport/tọa độ chạm CSS. Gallery và lobby chụp ở độ phân giải riêng; probe art dùng target 512, indicator 192. Đây không phải phép đo thiết bị hoặc benchmark game.

Lịch sử tải giữ các lượt fail/pass ở [server-performance-history.json](../acceptance/evidence/server-performance-history.json). Ngưỡng ACK 60 ms/tick 30 Hz không đổi. 100 kết nối là tải cục bộ giả lập, không phải 100 người thật hay latency Internet. QA dùng các cổng riêng, từ chối chạy chồng cổng; các suite GPU/tải chạy tuần tự.

## Artifact cài thử

[APK debug](../release/Hon-Gioi-Sinh-Ton-debug.apk): **8,852,089 bytes**. SHA-256:

`cad84bdf4150c09e8fd086459fd361ce63d75d60ec136caede139a0751584e4e`

APK đã ký và khớp source/checksum trong provenance. Đây là gói debug cài thử; release R8 đã biên dịch. Chưa có bản ký thương mại hay thử root/Frida/sửa APK trên Android thật. Pin release thiếu/sai bị từ chối trước WebView; bridge chỉ đọc không phải hardware attestation. Mẫu Kotlin WebView thuần nằm trong hướng dẫn Android; APK kiểm tra dùng Capacitor Activity và Kotlin Guard.

Node 24/npm 11, Three 0.160.1, Capacitor 7.6.9, Gradle 8.11.1/AGP 8.7.2, SDK 35/BuildTools 34–35, JDK 21 và Blender 4.3.2 CPU. Chromium dùng SwiftShader trên Linux. Standalone được phục vụ bằng chính nội dung HTML qua route nội bộ khi môi trường chặn file://, không tải tệp phụ/CDN.

## Goal còn mở

- Overhaul: **23/24**, chưa đạt: VF01. Xem [OVERHAUL-GOAL.md](OVERHAUL-GOAL.md).
- Master: **31/37**, chưa đạt: CR02, SE07, GP02, DV01, DV02, AR01. Xem [MASTER-GOAL.md](MASTER-GOAL.md).
- Markdown trước: **20/26**, chưa đạt: ART04, ART10, HUD09, GAME02, DEVICE01, DEVICE02. Xem [UPGRADE-GOAL.md](UPGRADE-GOAL.md).
- Tái sử dụng: **9/15**. Các mục chưa đạt: android-functional, android-performance, gdd-audit, md-upgrade, master-prompt, overhaul-prompt. Xem [GOAL.md](../GOAL.md).

Người dùng đã xác nhận chưa có Android thật kết nối. Chưa có trace cảm ứng, landscape/restore/Hồi Hoàn/FPS hoặc thử native hợp lệ trên thiết bị. Không thay bằng APK tồn tại, emulator, R8 hay SwiftShader; mỗi cảnh FPS vẫn cần ít nhất 60 giây. Boss thứ tư và chỉ số/độ bền Tiên khí tiếp tục chờ đặc tả gốc theo lựa chọn người dùng. Các phần thiếu trong PDF ghi ở [GDD-COVERAGE.md](GDD-COVERAGE.md).

Review ảnh chỉ duyệt sự hiện diện kỹ thuật trong phạm vi được ghi. Giải phẫu và chân dung vẫn chia sẻ thuật toán thủ tục; chưa nghiệm thu mọi góc/hoạt ảnh của toàn bộ 48 trang phục và 24 skin theo chất lượng mỹ thuật cuối. VF01/AR01 và mọi gate dữ liệu/thiết bị giữ BLOCKED. Không dùng số map, đa giác, icon hoặc checksum khác nhau để gọi đạt AAA hoặc 100%.

Backend đã thử cục bộ; chưa triển khai Internet/TLS/vận hành người thật. Cấu hình cloud trước đây đã lưu dạng draft, chưa có bằng chứng Publish/khôi phục task mới. Có thể dùng workspace để tiếp tục phát triển; chưa được gắn nhãn baseline phát hành hoàn tất 100%.
