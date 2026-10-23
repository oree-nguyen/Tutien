# Sảnh Hồn Thành V2.5 — đối chiếu ảnh mẫu

Nguồn: [tài liệu Google Docs](https://docs.google.com/document/d/11hnrurbl4he-e6jJI7bJFq9NldxXv7-P/edit). Bản đặc tả và tám ảnh gốc nằm trong `../requests/lobby-ui-v25/`. Ảnh gốc được giữ nguyên byte.

Các màn H1–H7 là UI hoạt động trên cảnh Three.js hiện hữu. Các nút mở bảng, chọn tướng, nhánh, trang bị, trợ phẩm và chế độ vẫn dùng trạng thái/lô-gic thật. Font Noto Serif và Roboto Condensed được đóng gói cục bộ cùng giấy phép OFL. Những họa tiết tĩnh lấy từ ảnh mẫu được hiển thị bằng atlas CSS; không dùng ảnh chụp nguyên màn hình để giả game.

## Kiểm định

- `npm test`: kiểm thử gameplay, rig, an toàn dữ liệu và đồng hồ lặp hiệu ứng.
- `GAME_URL=http://127.0.0.1:5175 npm run test:lobby-ui`: Chromium chạy bundle production, ba kích thước 1376×768, 844×390, 667×375. Bao gồm H1–H7, thay trang bị có trừ tiền thật, tương khắc trợ phẩm, chọn chế độ, vào trận bằng nút Bắt đầu và lặp hiệu ứng sau 7200ms kể từ lúc hoàn tất.
- `tests/lobby-reference-geometry.mjs`: tọa độ đo độc lập từ mẫu. Sai số cho phép 2 CSS pixel, không coi đó là giống toàn bộ ảnh.
- `python3 scripts/audit-lobby-reference.py`: so sánh RGB ảnh thật 1376×768 với mẫu, xuất `visual-audit.json`, giữ cả khác biệt và trạng thái không đạt.
- `browser-results.json`: kết quả thao tác và đo bố cục; ảnh `H1-…` đến `H7-…` là bằng chứng. `reference-H…` là các lần chụp trung gian, không dùng làm kết quả cuối.

## Giới hạn nghiệm thu

**Chưa được chứng nhận giống ảnh mẫu 100%.** Nhân vật 3D, tư thế hoạt ảnh, bệ đài và ánh sáng đang dùng tài nguyên runtime cũ, khác minh họa trong mẫu. Một số khung, biểu tượng và chữ vẫn khác pixel. Tên tài khoản, tiền, rank và trợ phẩm lấy từ dữ liệu thật nên khác tài khoản minh họa.

Hồ sơ chưa đăng nhập không được tự tạo UID, rank hoặc huy hiệu. Hồn Lệnh, bạn bè và nhiệm vụ chưa có dữ liệu máy chủ có thẩm quyền được ghi rõ trạng thái chưa mở/xem trước; không cấp tiền, thưởng hay tiến độ giả. Các cấp thưởng trong Hồn Lệnh là mốc xem trước từ ảnh thiết kế.

APK phải qua xác thực chữ ký và đối chiếu hash nguồn sau build. Kiểm tra Chromium/WebView assets không thay thế đo FPS hoặc kiểm tra cảm ứng trên điện thoại Android thật.

Tất cả ảnh được lưu nguyên bản trong [sổ ảnh nhiệm vụ 11](../../picture/conver11/online-pic.md), gồm cả các vòng chưa đạt.

## Đối chiếu trực tiếp

Ảnh thực tế bên phải dùng 1376×768 như ảnh mẫu. Tải `compare.html` cùng thư mục ảnh để kéo thanh chồng ảnh.

| Màn | Mẫu | Game thực tế |
| --- | --- | --- |
| H1 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image2.jpeg) | [Ảnh chạy game](H1-home-1376x768.png) |
| H2 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image3.jpeg) | [Ảnh chạy game](H2-character-1376x768.png) |
| H3 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image4.jpeg) | [Ảnh chạy game](H3-heroes-1376x768.png) |
| H4 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image5.jpeg) | [Ảnh chạy game](H4-friends-1376x768.png) |
| H5 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image6.jpeg) | [Ảnh chạy game](H5-profile-1376x768.png) |
| H6 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image7.jpeg) | [Ảnh chạy game](H6-pass-1376x768.png) |
| H7 | [Ảnh mẫu](../requests/lobby-ui-v25/reference/image8.jpeg) | [Ảnh chạy game](H7-quests-1376x768.png) |

## Kết quả kiểm tra

- Logic: **361/361 bài qua**; nhóm kiểm tra chân dung, hiệu năng và đồng hồ bổ sung **16/16 qua** (có bài trùng nhóm logic).
- Bundle production: **H1–H7 qua ở cả ba kích thước**, không có lỗi JavaScript. Thử mua trang bị, chặn trợ phẩm tương khắc, đổi chế độ và vào trận thực tế đều qua.
- Sai số lớn nhất của các mốc hình học được đo: **0,01953125 CSS pixel**. Đây là phép đo các khối bố cục đã liệt kê, không phải chứng nhận toàn bộ chi tiết giống mẫu.
- Kết luận giống toàn ảnh 100%: **không đạt**; xem `visual-audit.json`.
- `verification/final-reference-capture.json` lưu mã nguồn bundle của bộ ảnh 1376×768 cuối. Mã này phải trùng `release/build-provenance.json`.
