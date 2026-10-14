# Xác thực hiện tại — 14/10/2026

Source fingerprint: `51828b587ee7bab928e87bedf675953089f086a101dfc3eed1721dd09fd937b4`.

## Kết quả đã thực thi

| Kiểm tra | Kết quả |
|---|---|
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | Thành công với lockfile hiện tại |
| `npm test` |105passed/0failed/0skipped; gồm36nhánh, công thức/kinh tế, timer, snapshot, realm, dung hợp, Hoàn/Cốt và các hồi quy |
| `npm run test:server` |9passed/0failed/0skipped; dùng PostgreSQL/Redis thực |
| Trình duyệt offline | Chọn tướng, xung đột bùa, mua/ghép/tháo, gửi/rút, lưu tài khoản, joystick+F trên844×390; không pageerror |
| Trình duyệt online | Đăng ký/đăng nhập thật vào backend cục bộ, vào trận, di chuyển do server quyết định, túi đồ, ẩn Sandbox, reconnect cùng actor; không pageerror |
| PWA/HTML | PWA reload/vào trận khi ngắt mạng; HTML độc lập không gọi tài sản ngoài và không pageerror |
|22phút mô phỏng |39.600tick/1.320s; ape/dragon/kirin và Thú Triều; hoàn tất theo deadline; thời gian chạy khoảng24.5s ở lần cuối |
|100WebSocket giả lập |800mẫu ACK,40nhân vật đặt vùng giao tranh; p95tick6.56ms; p95ACK32.73ms;0protocol errors. Đây không phải100người thật |
| `npm run android:apk` | Thành công: buildweb/sync/assembleDebug/apksignerverify/provenance |
| `npm audit --omit=dev --audit-level=high` |0vulnerabilities; đã cập nhật ws8.22.0 |

Node24.19/npm11.9; Three0.160.1; Capacitor7.6.9; Gradle8.11.1/AGP8.7.2; SDK35/BuildTools34–35; JDK21cójavac. Chromium dùng SwiftShader trên Linux; không dùng FPS đó thay cho Android.

APK debug: `release/Hon-Gioi-Sinh-Ton-debug.apk`,4,271,682bytes. SHA-256:

`199b6c699bb0d0279e4837262d40c1dca2f6975287b6291c9cdfb9900cd4ca6d`

`build-provenance.json` khớp source fingerprint. Kiểm chữ ký APK thành công (v2/v3); không phải gói release ký thương mại. Mẫu Kotlin WebView là đường thay thế được cung cấp, chưa có một phép build riêng của mẫu đó.

## Goal tái sử dụng

Lần chạy `npm run verify:reuse` hiện trả mã1 có chủ đích:

- PASS: rules, browser, artifacts, server, online-browser, server-performance, timeline, apk.
- BLOCKED: android-functional, android-performance, gdd-audit.

Bằng chứng JSON trong `acceptance/evidence/`; sửa src/server/tests/scripts/public/cấu hình sẽ làm fingerprint cũ không còn đạt. Cấu hình môi trường đã lưu `install_script` và `start_skill`, bắt buộc kiểm goal trước khi dùng như baseline hoàn tất. Lưu draft không đồng nghĩa Publish hoặc đã thử khôi phục trong task mới.

Người dùng xác nhận chưa có thiết bị Android kết nối. Chưa có trace chức năng/FPS vật lý hợp lệ. ADB trên cloud còn bị filesystem chặn tạo `/home/agent/.android`; không đổiHOME hay chế tạo serial/báo cáo để vượt gate. Không có `/dev/kvm` hay thiết bị USB Android hiển thị. Cần xác thực trên thiết bị thật; code/đóng gói đã sẵn để cài thử.

Nghiệm thu GDD vẫn chưa đủ để tuyên bố100%: các bảng chưa định lượng/không thống nhất trong PDF và mọi tổ hợp trạng thái phải được xử lý theo `GDD-COVERAGE.md`. Báo cáo audit hiện cố ý `passed:false`, không coi test số lượng lớn là chứng minh đầy đủ.

Trình duyệt cloud chặn `file://` bằng `ERR_BLOCKED_BY_ADMINISTRATOR`; kiểm thử standalone dùng chính nội dung HTML làm phản hồi document qua route nội bộ, không tải CDN/tệp phụ. Không tuyên bố đã mở file trực tiếp thành công trên trình duyệt được quản lý đó.

Chưa có triển khai Internet/TLS production, trận người thật, kiểm thử thiết bị vật lý, nghiệm thu mỹ thuật thương mại, pentest hoặc chứng nhận chống gian lận vận hành.
