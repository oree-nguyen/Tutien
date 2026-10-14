# Xác thực hiện tại — 15/10/2026

Source fingerprint: `c5d7faa6514fc22f4317106ea640a81c9786e6752c3c0b5b2fc5eb1528605d03`. Thời điểm trong JSON dùng UTC; ngày báo cáo theo Asia/Saigon.

## Kết quả đã thực thi

| Kiểm tra | Kết quả |
|---|---|
| `npm run verify:automated` | Lượt cuối hoàn tất; mọi bằng chứng tự động khớp fingerprint trên |
| Luật và hồi quy GDD | **128 passed / 0 failed / 0 skipped** |
| Prompt mới | **83 passed / 0 failed / 0 skipped**: anatomy/vũ khí/creature, portrait đủ 12 tướng, tư thế đàn, vault/thời gian, nhặt từng món, chiếu hướng kỹ năng và 11 hồi quy chống duyệt sai bằng chứng |
| Máy chủ | **16 passed / 0 failed / 0 skipped**: PostgreSQL/Redis thực, quyền/giao dịch, HMAC/migration/chuyển quyền và chống nhân đồ |
| Trình duyệt offline | Chọn tướng/cấm bùa, mua/ghép/tháo, gửi/rút, persistence, joystick cảm ứng + F; không pageerror |
| Trình duyệt online | Đăng ký/đăng nhập, vào trận máy chủ, di chuyển, túi đồ, Sandbox ẩn và reconnect cùng actor |
| HUD nâng cấp | Joystick nổi/đa điểm, kéo-hủy, cooldown/MP, mua/ghép nhanh, drawer, minimap, Tế Đàn/Cổng và ba kích thước màn hình |
| Prompt mới trên WebGL | 149 PNG khác nhau, giải mã 512 và cache; mặt 2048 nam/nữ, xoay/cận mặt, F giữ/kéo/hủy, thẩm định 0,8s, nhặt chọn món và khôi phục sửa ví/HP/vị trí |
| Diện tích cảnh 3D mặc định | 844×390: **82,78%**; 915×412: **84,97%**; 1280×720: **91,86%** |
| PWA/HTML | PWA reload/vào trận khi ngắt mạng; HTML độc lập không yêu cầu tài sản ngoài, không pageerror |
| 22 phút mô phỏng | 39.600 tick / 1.320s; ba Boss gốc và Thú Triều |
| 100 WebSocket giả lập | 800 mẫu ACK, 40 actor vùng giao tranh; p95 tick **7,96ms**, p95 ACK **40,52ms**, 0 lỗi giao thức |
| APK và native | Build/sync/assembleDebug/apksigner thành công; Kotlin Guard có trong DEX; duplicate-classes và release R8 đạt |

Tổng cộng **227 kiểm thử Node**. Số lượng kiểm thử không tự chứng nhận 100% GDD, mỹ thuật hoặc hiệu năng Android.

Portrait cận mặt ẩn đúng gốc Hồn khí của đủ 12 tướng, không che mặt bằng quạt và khôi phục đúng visibility khi về toàn thân. Guqin H11 quay mặt dây về trước; hoạt ảnh giữ hai tay sát mặt dây qua nhiều thời điểm. Hồi quy kiểm tra cả cache và bản sao mô hình.

F dùng hướng đã chuẩn hóa từ input máy chủ, trùng guide khi kéo; giữ CD 8s, lướt 2,8m và miễn nhiễm 0,25s. Kiểm thử mới dùng cả `Match.cast` và `Room.input` thực. Guide AOE so với tâm vùng kỹ năng thực trên đồi; mục tiêu trùng tọa độ không tạo NaN.

Phép đo HUD tính union hình chữ nhật bao của UI chiến đấu mặc định, không mở drawer, không kéo ngắm hoặc đứng cạnh tương tác ngữ cảnh. Tính cả góc trong suốt của nút tròn nên số đo bảo thủ; không áp dụng cho mọi trạng thái UI.

Lịch sử tải giữ cả các lượt fail/pass trong [server-performance-history.json](../acceptance/evidence/server-performance-history.json); ngưỡng ACK 60ms và tick 30Hz không đổi. Đây là tải cục bộ giả lập, không phải 100 người thật, latency Internet hoặc FPS điện thoại.

QA tắt tự tải lại trang và bỏ qua thư mục artifact Android/release. Phép thử chạy chồng cổng bị từ chối trước khi tác động dịch vụ đang chạy. Các suite đồ họa và tải chạy tuần tự; chế độ phát triển thường vẫn có HMR.

## Artifact cài thử

[APK debug](../release/Hon-Gioi-Sinh-Ton-debug.apk): **10,972,519 bytes**. SHA-256:

`20c14b32e931d560792af17e2776de571ef0c53e88cbb14bfdcab76e589f00be`

Provenance khớp source/checksum; chữ ký v2/v3 được xác minh. Đây là gói debug cài thử. Release R8 đã biên dịch; chưa có bản phát hành ký thương mại hay thử native chống sửa APK/root/Frida trên Android thật. Certificate pin release thiếu/sai sẽ bị từ chối trước WebView. Bridge trạng thái chỉ đọc, không phải hardware attestation. Mẫu Kotlin WebView thuần là lựa chọn đóng gói; APK kiểm tra dùng Capacitor Activity với cùng Kotlin Guard.

Node 24.19/npm 11.9, Three 0.160.1, Capacitor 7.6.9, Gradle 8.11.1/AGP 8.7.2, SDK 35/BuildTools 34–35, JDK 21 có javac, Blender 4.3.2 CPU. Chromium dùng SwiftShader trên Linux. Trình duyệt được quản lý chặn `file://`; standalone được thử bằng chính nội dung HTML qua document route nội bộ, không tải tệp phụ/CDN.

## Phạm vi chưa đạt

Goal mới và bằng chứng chi tiết: [MASTER-GOAL.md](MASTER-GOAL.md), `acceptance/evidence/master-prompt.json`. Goal Markdown trước: [UPGRADE-GOAL.md](UPGRADE-GOAL.md). Điều kiện tái sử dụng vẫn là toàn bộ [GOAL.md](../GOAL.md), không chỉ các mục đã chạy tự động.

Người dùng xác nhận chưa có Android thật kết nối. Chưa có trace cảm ứng/landscape/restore/Hồi Hoàn/FPS hoặc thử native hợp lệ trên thiết bị. Không dùng APK tồn tại, compile R8, emulator hay SwiftShader thay bằng chứng đó. Boss thứ tư và chỉ số/độ bền Tiên khí chờ dữ liệu gốc theo quyết định người dùng; không tự đặt bảng cân bằng. Các điểm thiếu của PDF về Hoàn/cấp độ được ghi trong [GDD-COVERAGE.md](GDD-COVERAGE.md).

Ảnh và review ở [visual-review](visual-review/README.md) chỉ xác nhận phạm vi kỹ thuật nêu trong từng mục. Các nhân vật chia sẻ topology thủ tục; chân dung, mọi góc chuyển động và toàn bộ 48 trang phục/24 skin chưa được nghiệm thu đầy đủ theo yêu cầu mỹ thuật cuối. Bộ gallery hiện hành có 46 ảnh 3D và 6 ảnh UI được lưu checksum; fixture và phạm vi từng ảnh ghi trong báo cáo. Không dùng số đa giác, số icon hoặc checksum khác nhau để gọi đạt AAA. Xem [GRAPHICS-PIPELINE.md](GRAPHICS-PIPELINE.md).

Các gate chưa đạt phải giữ BLOCKED; `verify:reuse` chưa được exit0 khi thiếu bằng chứng. Không dùng bản này làm baseline đã hoàn tất 100%.

Cấu hình cloud đã lưu dạng draft; cần lưu/Publish trong cài đặt môi trường để áp dụng. Chưa có bằng chứng khôi phục task mới. Backend đã thử cục bộ, chưa triển khai Internet/TLS, vận hành với người thật hoặc nghiệm thu thương mại.


Kết quả bộ chấm hiện hành: Master **31/37**, Markdown trước **20/26**, goal tái sử dụng **9/14**; cả ba trả exit 1 vì còn mục bắt buộc chưa đạt. Bộ chấm không cho review ảnh duyệt thay nguồn dữ liệu/thiết bị. FPS vật lý cần hai trường thời lượng riêng, mỗi cảnh ít nhất 60 giây.
