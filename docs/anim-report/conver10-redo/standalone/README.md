# Kiểm tra bản HTML độc lập

Chạy trên cloud bằng Chromium 154 / ANGLE SwiftShader, khung 960 × 432, DPR 1. Đây là kiểm tra chức năng bản HTML đóng gói, không phải số đo FPS Android hoặc nghiệm thu rig mới.

Lệnh tái lập:

```sh
HG_STANDALONE_FILE=.local/build-checkpoints/Hon-Gioi-Sinh-Ton-build-recheck.html \
HG_STANDALONE_SMOKE_OUTPUT=docs/anim-report/conver10-redo/standalone \
node tests/standalone-source-smoke.mjs
```

Máy chủ thử nghiệm chỉ cung cấp đúng một file HTML. Không có đường dẫn dự phòng tới `src/`, `public/` hoặc `dist/`; mọi yêu cầu ra ngoài bị chặn. Test gieo snapshot trận ngoại tuyến đầy đủ và không bấm tiếp tục trận.

## Checkpoint đầu: có lỗi, chưa đạt

- HTML: **465.242.485 byte**; SHA-256 `a3768832d8b4328a2b1a9e63fff68d2ae834b7e8348852e11d37a1ebce21ba95`.
- Mã nguồn do bản HTML tự báo: `ae2e51456cac6e063a3db4b66e9716a4890a95f640a366871781c9c9c86b222f`.
- Sảnh đầy đủ 12 nút tướng, hành trang và nút **Tiếp tục trận** xuất hiện; vẫn ở sảnh sau ít nhất 10 giây dù có snapshot cũ.
- H01 hiện đúng body nguồn **1.499.726 tam giác**, trượng **619.640 tam giác**; texture của cả hai vẫn **4096 × 4096**.
- H02 giải mã đúng body **1.499.746 tam giác**, chùy **1.500.000 tam giác** và texture **4096 × 4096**, nhưng kiểm tra hiển thị hiệu lực sau `seekHeroEntrance(6)` trả về **false** cho body lẫn chùy. Test dừng với lỗi thật, không đổi kỳ vọng thành pass.
- Không có yêu cầu tài nguyên ngoài, HTTP thiếu file, lỗi JavaScript hoặc lỗi console trong lần chạy này.

Số đo cloud của lần chạy: shell được test quan sát ở **315 ms**; UI sảnh tương tác ở **7.173 ms**. Trình duyệt báo first-contentful-paint **792 ms**, mốc lobbyUI **6.399,2 ms**, worldReady **8.360,2 ms**. Mốc H01 **31.358 ms** trong JSON cũ bao gồm thời gian chụp PNG sau khi kiểm tra nguồn, không được hiểu là thời gian tải GLB thuần.

Log và bằng chứng nguyên bản: [standalone-source-smoke.json](standalone-source-smoke.json). Ảnh `h01-full-source.png` chụp xong lúc **2026-10-19 21:26:12,984 giờ Việt Nam**; `failure.png` lúc **21:26:47,757**. Root đăng các ảnh này vào sổ `picture/conver10/online-pic.md`.

Checkpoint này được giữ làm bằng chứng thất bại. Bản build mới phải chạy lại cùng kiểm tra hiển thị; không thay báo cáo này bằng kết quả của file khác. Chưa kiểm tra APK hay điện thoại thật trong bài test này.
