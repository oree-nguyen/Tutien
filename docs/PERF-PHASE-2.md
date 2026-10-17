# Giai đoạn 2 — loader và quyền sở hữu

`src/model-loader.js` là nơi duy nhất tạo GLTFLoader; dùng KTX2Loader đã detectSupport và Meshopt worker, plugin WebP cho render worker. Registry ghép 13 bản tối ưu với GLB thường làm dự phòng. Basis/model URL được giải theo thư mục ứng dụng để hỗ trợ WebView assets/; toàn bộ asset nằm trong repo. Standalone nhúng registry mới, không thêm CDN.

Template cache theo URL chia sẻ geometry/texture; mỗi actor giữ lease và clone skeleton/material có trạng thái riêng. Tối đa bốn template không dùng; actor còn sống không bị thu hồi. Khi template không dùng bị loại, geometry/material/texture/skeleton được dispose và ImageBitmap được đóng. Đường giải phóng H01/H02 và staff legacy đều trả lease; giải phóng lúc đang decode được kiểm thử.

Nếu không có ASTC/ETC2/BC, dùng GLB thường. Lỗi tải/giải mã bản GPU cũng rơi về GLB thường và ghi rõ lý do. Log GPU chỉ bật bằng perf=1. Ba test cache qua; kiểm thử entrance H01/H02 qua với registry tối ưu. Ảnh toàn thân đối chiếu trước/sau giữ nhận diện; ảnh face cũ không đóng khung được khuôn mặt nên không dùng làm bằng chứng nghiệm thu cận cảnh.

Một lần đo lạnh cùng workload/SwiftShader: H01 ready 3703,0 → 3894,6 ms. Chưa có bằng chứng cải thiện thời gian khởi động. Max frame H01 411,7 → 585,8 ms; H02 376,4 → 519,2; H05 1974,5 → 2020,5; H08 1116,8 → 952,8; H11 830,7 → 1032,6. Số texture/geometry/draw call bằng baseline; không lỗi JavaScript, không request ngoài. Dữ liệu: perf-audit/phase2-balanced/report.json. Đây là một cặp đo có nhiễu phần mềm, không suy diễn Android FPS.

`npm test`: 128/128. Các bước làm nóng/bake texture tiếp tục ở giai đoạn 3–4 vì điểm nghẽn legacy vẫn còn. Chưa kiểm chứng điện thoại thật; chưa gọi đây là hết khựng.

Kiểm thử lỗi thực tế: ép HTTP503 cho cả body và trượng KTX2; cả hai tải GLB thường nội bộ, đủ sáu clip, không page error (`perf-audit/phase2/fallback.json`). Lần đầu harness chặn service worker nhưng vẫn chờ SW ready nên không mở main; harness cuối mô phỏng native như APK, không đổi timeout/ngưỡng game để pass.
