# Corrective áo từ bề mặt nguồn — chưa kích hoạt

Bản thử giữ nguyên toàn bộ POSITION/NORMAL/UV/skin, tam giác và ảnh nguồn; thêm một morph POSITION có trọng số mặc định 0. Ở bind, hình ảnh nguồn không đổi. Chỉ có phép giải offline trên máy dev; không thêm mô phỏng vải vào game.

Đầu vào: semantic v6, hash `c24b7cdbe874b745ad54d9e951ebeedd85db465f759c91dcc768c58871eae143`. Morph được giải từ đúng pose và ma trận đã ghi hash. Bàn tay và mọi đỉnh chạm mặt ngoài miền áo được khóa; 146.771 cặp sao chép nguồn vẫn không hở.

Lượt 40 + 160 vòng với penalty 1 giảm strain cạnh nguồn max **15,897433 → 2,046559**, p99.9 **3,480542 → 1,575660**. Kiểm độc lập theo từng primitive trong `validation.json` cho 4/6 phần đạt; vạt phải (p99.9 1,596423) và tay áo phải (p99.9 1,685743; max 2,046558) vẫn bị loại. Không đổi ngưỡng 1,5 / 2,0.

`morph0/` và `morph1/` là cùng GLB, cùng pose/camera/ánh sáng, lần lượt tắt/bật corrective. Ảnh gốc giữ nguyên byte. Đây chưa phải chứng nhận hình ảnh: morph NORMAL, nếp vải tự nhiên, giao nhau cơ thể/áo, tiết diện khớp và toàn chuỗi hoạt ảnh còn chưa kiểm định.

Lượt penalty 100 chỉ đổi tham số hội tụ ADMM, không đổi bất đẳng thức độ dài cạnh hay ngưỡng nghiệm thu. Lưu riêng `.local/rig-candidates/cloth-corrective-held-p100/`; chỉ cập nhật kết quả sau kiểm độc lập.

Tái tạo trên mesh staging đã có receipt/source buffers:

```bash
PYTHONPATH=.local/rig-python OPENBLAS_NUM_THREADS=1 python3 tools/rig/cloth_corrective.py .local/rig-candidates/semantic-garment-v6 .local/rig-candidates/cloth-corrective-held --iterations 40
PYTHONPATH=.local/rig-python OPENBLAS_NUM_THREADS=1 python3 tools/rig/cloth_corrective.py .local/rig-candidates/semantic-garment-v6 .local/rig-candidates/cloth-corrective-held --resume --iterations 160
node tools/rig/cloth-corrective.mjs .local/rig-candidates/semantic-garment-v6 .local/rig-candidates/cloth-corrective-held
```

Receipt báo `accepted:false` kể cả khi một phép đo riêng đạt; không có thay thế model trong APK.

## Kết quả các lượt tiếp theo

Lượt penalty 1000 có thêm morph NORMAL, giữ normal nguồn mặc định và bảo vệ tay; kiểm tuần tự serialize xác nhận target không mất. Vẫn 4/6 primitive đạt strain. Kiểm giao nhau trên **cùng pose, cùng nguồn** bằng BVH có chỉ số mặt gốc: morph0 có 2.169 cặp cắt nhau, morph1 có 9.825, gồm 8.483 mới và 827 được loại. Không tính những mặt chung đỉnh nguồn như va chạm mới. Không coi phép này là chứng nhận thể tích; **loại bản thử** vì giao cắt tăng.

Các lượt `strict-upper145/`, `annulus/` và `full-fabric/` giữ đầy đủ kết quả thất bại. Siết ngưỡng của bộ giải xuống 1,45 không đổi ngưỡng nghiệm thu 1,5/2,0. Annulus là bài toán không lồi, không có chứng minh hội tụ toàn cục. Mở thêm miền vải giảm ghim nhầm lớp lót nhưng vẫn chưa đạt hai primitive phải. Không bản nào được kích hoạt.
