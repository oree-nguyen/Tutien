# Sổ ảnh Hồn Giới

10 nhiệm vụ · 366 mục ảnh · 364 file ảnh khác nhau.

Số `converN` là số nhiệm vụ trong sổ ảnh này, được giữ ổn định; tin nhắn “Tiếp” không tạo số mới. Không suy đoán số thứ tự toàn bộ nhiệm vụ trong lịch sử trò chuyện.

Ảnh cũ được lấy từ toàn bộ lịch sử Git còn truy cập được trong `docs/` và ảnh concept/tham chiếu `assets/tencent/`, gồm cả phiên bản đã thay thế. Không bao gồm bộ texture/icon runtime hoặc tệp đính kèm trò chuyện không có trong repo. Giữ nguyên byte ảnh, dùng chung file khi trùng nội dung.

Thời gian hiển thị theo Việt Nam (UTC+7). Với ảnh cũ, chỉ xác minh được thời gian commit lưu phiên bản ảnh, không xác minh giờ chụp. Ảnh thêm bằng lệnh bên dưới ghi thời gian đăng ký thực tế, không tự nhận là giờ chụp.

- [Nhiệm vụ 1: Kiểm tra mỹ thuật và giao diện game](conver1/online-pic.md) — 132 ảnh
- [Nhiệm vụ 2: Đại tu đồ họa và điều khiển](conver2/online-pic.md) — 9 ảnh
- [Nhiệm vụ 3: Tencent: ảnh concept và tham chiếu](conver3/online-pic.md) — 5 ảnh
- [Nhiệm vụ 4: Tích hợp model Lâm Dật](conver4/online-pic.md) — 11 ảnh
- [Nhiệm vụ 5: Hoạt ảnh xuất hiện Lâm Dật](conver5/online-pic.md) — 21 ảnh
- [Nhiệm vụ 6: Sửa vòng đời tải và hiển thị](conver6/online-pic.md) — 2 ảnh
- [Nhiệm vụ 7: Hoạt ảnh xuất hiện Hàn Trạch](conver7/online-pic.md) — 7 ảnh
- [Nhiệm vụ 8: Sửa khởi động và kiểm tra hiệu năng](conver8/online-pic.md) — 10 ảnh
- [Nhiệm vụ 9: Đối chiếu chất lượng với GLB gốc](conver9/online-pic.md) — 60 ảnh
- [Nhiệm vụ 10: Kiểm tra và sửa rig H01 H02](conver10/online-pic.md) — 109 ảnh

## Thêm ảnh mới

Ngay sau khi chụp hoặc xem ảnh mới, dùng lại số nhiệm vụ đang làm:

```bash
python3 scripts/update-picture-gallery.py --task N --image path/to/screenshot.png
```

Chỉ khi nhận nhiệm vụ mới: chọn số kế tiếp và thêm `--title "Tên nhiệm vụ"`. Chạy không tham số để đồng bộ ảnh kiểm tra từ lịch sử Git. Commit và push ảnh cùng Markdown để người dùng xem được trên GitHub.
