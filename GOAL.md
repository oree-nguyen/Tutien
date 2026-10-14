# GOAL — Điều kiện nghiệm thu và tái sử dụng

Mục tiêu: hoàn thiện “Hồn Giới: Sinh Tồn” theo GDD V2.5, WebGL/Android, không bỏ qua kiểm thử bắt buộc và không coi trạng thái mô phỏng là bằng chứng production.

**Chỉ được gọi bản bàn giao hoàn tất 100% hoặc dùng làm bản chuẩn phát hành khi `npm run verify:reuse` trả mã 0.** Thiếu bằng chứng là chưa đạt; skipped, mocked và unrun không thay cho kiểm tra thật. Có thể dùng môi trường để tiếp tục phát triển khi chưa đạt goal, nhưng phải hiển thị các gate chưa đạt.

Điều kiện bắt buộc:

1. GDD: đủ bảng, modifier, timer, luật kinh tế và state machine; kiểm thử mỗi nhánh và từng nhóm Hoàn/Cốt/Trợ phẩm, bao gồm các tương tác biên.
2. Gameplay: 22 phút, bot, bản đồ/đường đi/tầm nhìn, Bí Cảnh hai lối thoát, Thú Triều, đồng hành, dung hợp và lưu/khôi phục có kiểm tra chức năng.
3. Online: đăng nhập, kiểm tra quyền, server30Hz, client chỉ gửi input, chống sửa tiền/loadout/nhân đồ, ledger PostgreSQL ACID, Redis snapshot, reconnect90s, ghép Ranked tối thiểu60 người thật, leaderboard tuần.
4. Android: có APK build thành công, chữ ký/checksum, launch và WebView chức năng được kiểm tra; cấu hình ngang và Immersive Sticky.
5. Thiết bị: log đo trên máy Android thật tầm trung cho mục tiêu60FPS thông thường/30FPS khi40 nhân vật giao tranh; không thay bằng SwiftShader hoặc chỉ kiểm tra file APK.
6. Nghiệm thu mỹ thuật và dữ liệu bổ sung: 12 silhouette,24skin,48trang phục có khác biệt hiển thị; các dữ liệu chưa có trong PDF phải tách phiên bản bổ sung, không gán nhãn là số liệu gốc.

Nguồn dữ liệu: `docs/GDD-V2.5-extracted.txt`. Danh mục và bằng chứng máy đọc được: `acceptance/requirements.json`, `acceptance/evidence/`. Báo cáo phải gắn fingerprint mã nguồn hiện tại; bằng chứng cũ không tự đạt cho mã mới.

Nâng cấp Markdown được nghiệm thu theo [UPGRADE-GOAL.md](docs/UPGRADE-GOAL.md); gate `md-upgrade` là bắt buộc cùng các gate gốc.

Master Prompt (2) mở rộng bắt buộc theo [MASTER-GOAL.md](docs/MASTER-GOAL.md); các gate `master-rules` và `master-prompt` phải đạt cùng toàn bộ gate cũ.
