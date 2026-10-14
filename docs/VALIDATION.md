# Xác thực hiện tại — 14/10/2026

Source fingerprint: `b2f4d6e07b4efdd0d76836b7e1429930dfce0590e7ab24686d81c147d76fbd97`.

## Kết quả đã thực thi

| Kiểm tra | Kết quả |
|---|---|
| `npm run verify:automated` | Lượt cuối exit0; toàn bộ suite bên dưới đã chạy trên cùng fingerprint |
| Luật và hồi quy | **128 passed / 0 failed / 0 skipped**; gồm36nhánh, kinh tế/Cổng, Squad4, mục tiêu, ngữ cảnh, ray ngắm và hạt hiệu ứng theo địa hình |
| Máy chủ | **10 passed / 0 failed / 0 skipped**; PostgreSQL/Redis thực, giao dịch/quyền, Squad4 và kiểm tra input mục tiêu |
| Trình duyệt offline | Chọn tướng, cấm bùa, mua/ghép/tháo, gửi/rút, persistence, joystick+F trên844×390; không pageerror |
| Trình duyệt online | Đăng ký/đăng nhập backend cục bộ, vào trận, di chuyển do server quyết định, túi đồ, Sandbox ẩn và reconnect cùng actor |
| HUD nâng cấp | Joystick nổi, nhiều ngón cùng lúc, kéo-hủy không trừMP/CD, cooldown vòng, chọn mục tiêu, mua/ghép nhanh, drawerX44px, thẩm định, TếĐàn/Cổng, minimap, giá trị rủi ro và chất lượng đồ họa |
| Diện tích cảnh3D mặc định | 844×390: 82.63%; 915×412: 84.84%; 1280×720: 93.71% |
| GLB/LOD | Trượng Blender high120.068tamgiác tải thật;3LOD;24skin và48trang phục có khác biệt geometry/material trong thống kê |
| PWA/HTML | PWA reload và vào trận khi ngắt mạng; HTML độc lập khởi chạy không gọi asset ngoài, không pageerror |
|22phút mô phỏng | 39,600tick/1320s;3Boss và ThúTriều; chạy khoảng18.56s trong lượt cuối |
|100WebSocket giả lập | 800mẫu ACK,40actor đặt vùng giao tranh; p95tick6.83ms; p95ACK31.82ms;0lỗi giao thức |
| APK | Buildweb/sync/assembleDebug/apksignerverify/provenance thành công |
| `npm audit --omit=dev --audit-level=high` |0vulnerabilities |

Phép đo HUD dùng union hình chữ nhật bao của phần UI hiển thị trong chiến đấu mặc định, không mở drawer, không kéo ngắm hoặc đứng cạnh tương tác ngữ cảnh. Góc trong suốt của nút tròn vẫn bị tính là che nên số đo bảo thủ. Không suy rộng sang mọi trạng thái giao diện.

Lượt thử tải trước sửa phát trạng thái có p95ACK62,51ms và64,81ms, vượt ngưỡng60ms. Đã chia việc phát trạng thái thành lô8kết nối, nhường event loop giữa các lô, tránh các lượt phát chồng nhau và bỏ qua socket chưa gắn phòng. Sau sửa, lượt đo riêng đạt33,72ms; lượt kiểm tra đầy đủ cuối đạt31.82ms. [Lịch sử đo](../acceptance/evidence/server-performance-history.json) giữ cả fail/pass theo fingerprint; ngưỡng không đổi. Đây là tải cục bộ giả lập, không phải100người thật hoặc bằng chứng latency qua Internet. Tick đo phần mô phỏng; ACK đo đường đi gói tin trong phép thử.

## Artifact cài thử

APK debug: [Hon-Gioi-Sinh-Ton-debug.apk](../release/Hon-Gioi-Sinh-Ton-debug.apk), **7,947,232bytes**. SHA-256:

`fe1a533b456b99c9924c37cb4f2669ee71f11d7c01410c2057af9a0b4981e6e6`

Provenance khớp source fingerprint và checksum; apksigner xác nhận chữ kýv2/v3. Đây là gói debug cài thử. Mẫu Kotlin WebView là đường đóng gói thay thế được cung cấp, chưa có phép build riêng của mẫu đó.

Node24.19/npm11.9, Three0.160.1, Capacitor7.6.9, Gradle8.11.1/AGP8.7.2, SDK35/BuildTools34–35, JDK21 cójavac, Blender4.3.2CPU. Chromium dùng SwiftShader trên Linux; không dùng FPS đó thay Android.

Trình duyệt được quản lý chặn `file://` với `ERR_BLOCKED_BY_ADMINISTRATOR`; standalone được kiểm tra bằng chính nội dung HTML làm phản hồi document qua route nội bộ, không tải tệp phụ/CDN. Không tuyên bố mở file trực tiếp thành công trên trình duyệt đó.

## Điều kiện chưa đạt

Báo cáo Markdown hiện đạt20/26tiêu chí kỹ thuật; còn ART04, ART10, HUD09, GAME02, DEVICE01, DEVICE02. Chi tiết và phạm vi review nằm trong [UPGRADE-GOAL.md](UPGRADE-GOAL.md).

`npm run verify:reuse` chỉ được exit0 khi đủ tất cả gate. Các gate đang chặn: `android-functional`, `android-performance`, `gdd-audit`, `md-upgrade`. Báo cáo máy đọc được nằm trong `acceptance/evidence/goal-status.json`; mọi thay đổi nguồn/cấu hình bắt buộc kiểm chứng lại theo fingerprint.

Người dùng xác nhận chưa có Android thật kết nối; chưa cài/chơi hoặc đo60FPS thường/30FPS với>=40nhân vật trên thiết bị. Không có trace vật lý hợp lệ. Người dùng chọn giữ dữ liệu gốc và chờ đặc tả Boss thứ4/Tiênkhí, không tự đặt bảng cân bằng.

Bộ ảnh và review kỹ thuật trong [visual-review](visual-review/README.md) xác nhận các bộ phận/biến thể/địa hình hiện có; chưa chứng minh mỹ thuật AAA hoặc mọi chi tiết cực đại trong Markdown. [Pipeline đồ họa](GRAPHICS-PIPELINE.md) nêu rõ cấu trúc dùng chung, mật độ từng phần và các giới hạn. Audit mọi tương tác GDD, mỹ thuật cuối và nghiệm thu cảm ứng/FPS vẫn chưa đủ. Không gọi bản này là hoàn tất100%.

Cấu hình cloud đã lưu dạng draft; lưu draft không áp dụng/Publish hoặc chứng minh khôi phục trong task mới. Không dùng như baseline hoàn tất khi goal vẫnBLOCKED. Backend được thử cục bộ; chưa triển khai Internet/TLS, trận người thật hoặc kiểm chứng vận hành thương mại.
