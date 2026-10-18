# Giai đoạn 3 — upload trước lần xuất hiện

Sửa warmup dùng chung: thu thập mọi texture, kể cả uniform shader và material phụ, upload mỗi ảnh một lần, nhường frame giữa lần upload. CompileAsync vẫn gộp theo chương trình, rồi nhường frame. Trước đây chỉ ảnh của mesh đại diện được upload; các mesh khác cùng chương trình bị bỏ qua. H01/H02 đã chờ warmup trước khi hiện; prepare trận cũng đã warm selected actor ngoài combat, giữ nguyên các luồng đó.

Kiểm thử mới dùng bốn mesh cùng chương trình nhưng ba ảnh khác nhau: upload đủ ba ảnh, compile đúng một chương trình. Cùng ba kiểm thử vòng đời cache: 4/4. Cache template chia sẻ geometry/texture; material có uniform reveal/concealment vẫn clone để hoạt ảnh từng actor không ảnh hưởng nhau.

Audit cửa hàng/túi: 38 icon, 0 canvas/preview trong workload, cả trước và sau. Không có 28 model Bổ phẩm được duyệt trong ngân hàng GLB nên không tạo giả preview bằng primitives hoặc nhận là đã kiểm thử năm món 3D khác nhau. Sảnh giữ một preview actor; template cache là tài nguyên dùng lại, không phải nhiều model đang hiển thị. H01/H02 load ở render worker, Meshopt/Basis qua worker; đường máy không hỗ trợ worker vẫn cần kiểm chứng trên máy thật.

Đo cùng một lượt lạnh balanced: H01 ready 4700,4 ms (giai đoạn 2:3894,6; baseline:3703,0). Làm nóng đầy đủ tăng thời gian chuẩn bị; chưa chứng minh giảm khựng trên software renderer. Max frame năm preview: 533,3 / 525,2 / 2300,0 / 1420,2 / 904,5 ms. Không lỗi JS, không request ngoài. Số liệu thô ở perf-audit/phase3-balanced/report.json. Sau capture chỉ đổi tên trường log warmup, không đổi xử lý render. Chưa kiểm chứng điện thoại thật. Chưa đạt mục tiêu hiệu năng; cần bake procedural ở giai đoạn 4.

Đo kiểm cuối cho thấy chờ riêng từng ảnh làm tăng thời gian chuẩn bị. Follow-up giữ đủ ảnh nhưng nhóm các upload nhỏ trong lát4ms rồi nhường frame (một lệnh GPU riêng lẻ có thể vượt lát); compile vẫn async/nhường frame. Không thay chất lượng hay ngưỡng test. Số đo follow-up ở perf-audit/final2-balanced/ và final2-ultra/; báo cáo cuối dùng các lượt đó thay cho lượt warmup từng ảnh.
