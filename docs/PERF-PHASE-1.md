# Giai đoạn 1 — nén lúc build

14 GLB đã qua KTX-Software toktx 4.4.2 và glTF-Transform 4.5.1; 13 biến thể được phép xuất vào runtime, một nguồn cũ chỉ xuất vào ngân hàng tối ưu offline. Không ghi đè ba GLB nguồn ban đầu. Các master LOD được chép một lần từ biến thể đã duyệt, không phải model mới sinh.

`npm run assets:optimize` tạo Meshopt/quantization 16 bit, ETC1S màu và UASTC dữ liệu, mipmap, giới hạn nhân vật 1024 và vật phẩm 512. Script so hash đầu vào/cấu hình/đầu ra; lần chạy kế tiếp xử lý 0, bỏ qua 14. Basis được sao chép bằng script từ Three.js nội bộ. `HG_SKIP_ASSET_OPTIMIZE=1` bỏ qua nén khi dev một cách tường minh.

Kiểm định đọc lại GLB xuất: bone, joint, tên clip, channel, interpolation, mọi giá trị keyframe và morph target giữ nguyên. Lần thử đầu bị chặn vì quantizer để lại skin không dùng; đã dọn đúng skin không dùng, không nới validator. `npm run assets:verify`: 3/3, gồm fixture skin/morph/keyframe giữa khung và kiểm tra cache.

Bốn biến thể GPU đã có trước giảm từ 5.741.012 xuống 4.476.064 byte (22,03%). Đây là dung lượng file, không phải số đo VRAM/FPS. Một số đầu ra KTX2 lớn hơn nguồn WebP; không cam kết APK giảm. Chi tiết: `perf-audit/phase1/byte-comparison.json`.

Build web thành công; kiểm thử entrance H01 và H02 trước kích hoạt loader mới thành công. Ảnh và báo cáo trước nằm tại `perf-audit/phase1/before/`. Giai đoạn này chưa chuyển runtime sang bộ mới; đối chiếu hình ảnh sau và đo thời gian thuộc giai đoạn 2. Chưa kiểm chứng điện thoại thật.
