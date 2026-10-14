# Đối chiếu GDD và tình trạng nghiệm thu

Nguồn là PDF V2.5 đã được đọc toàn bộ, bản trích xuất nằm ở `GDD-V2.5-extracted.txt`. Yêu cầu của người dùng ưu tiên Three.js/WebView thay cho Unity ở mụcJ.

## Đã bổ sung so với bản bàn giao đầu

| Nhóm thiếu trước đây | Bổ sung thực thi |
|---|---|
| Máy chủ/tài khoản | HTTP + WebSocket30Hz; đăng ký/scrypt/session; quyền theo tài khoản; chỉ nhận input; kiểm tra vector, sequence, cooldown, mana; từ chối đổi nhánh và payload sửa ví/vị trí |
| Kinh tế trực tuyến | PostgreSQL row lock và transaction, ledger idempotency, inventory UUID unique, mua hub/entry/settlement kiểm tra quyền sở hữu, tách ví, chống vào hai trận bằng activeMatch |
| Snapshot/reconnect | Redis room/outbox, worker serialize không chặn vòng lặp; khôi phục tham chiếu actor/zone/projectile; reconnect90s; offline lưu một envelope ví+trận thay vì chỉ lưu kết quả |
| Ghép trận | Solo/Duo/Squad; normal với bot; Ranked chờ>=60tài khoản, không AI; không tuyên bố đã tổ chức trận100người thật |
| AOI | Tầm nhìn theo observer, realm, bụi, vật cản, trạng thái ẩn và reveal gắn nguồn/đội; ảnh chụp mạng không phát toàn bộ nhân vật ẩn |
| Bản đồ | Ba Cổng biến thiên đổi vị trí theo đợt, hai Cổng cố định; A* có trọng số Hồn Chướng; Bí Cảnh phân biệt realm, hai lối thoát; Thú Triều8thú và thưởng khi dọn hết; đồng hành nhặt tiền/cảnh báo |
| Dung hợp | Năm cặp với điều kiện đội, loại kỹ năng/vùng hoặc nguồn root/reveal; cooldown theo đội; kiểm thử cả điều kiện đúng và nguồn sai |
| Hiển thị/âm thanh |12silhouette có trang trí/vũ khí riêng;24biến thể skin và48biến thể trang phục thủ tục; chuyển động chân/đuôi/ornament; âm nền/đòn/chân tổng hợp; statue top3, leaderboard tuần máy chủ |
| Timer và Hoàn | HR02 đúng tổng115%; ba tick DoT ở ranh giới thời gian; HR06 mana/lan/field55; HR12 echo80 sau1s; HR09 chặn lướt; HR03 heal/slow tradeoff; HR10 windup; clone chỉ nổ khi bị phá; timer cuối trận giữ overtime |
| Nội tại | Dấu ấn theo nguồn/mục tiêu; Ly Sa tích từ lướt; Đỗ Kình tích khi nhận đòn; mark chí mạng Mặc Tinh theo mục tiêu; chi tiết Harmony/healzone; clone nhận150%damage với phòng ngự nguồn |
| Thanh toán mẫu | Trợ phẩm có giáTB cho phép chọn loại tiền; ví hub không bị hút trong trận; trang phục sự kiện có Vé mẫu, không cộng chỉ số |
| Android | Đã cài SDK35, Build Tools34/35 và JDK21 có javac; đã assembleDebug thành công; quy trình đóng gói kiểm chữ ký và gắn SHA/fingerprint; chưa đồng nghĩa cài/chơi hoặc đoFPS trên thiết bị thật |
| Tái sử dụng | `GOAL.md`, danh mục gate và script `verify:reuse`; bằng chứng cần fingerprint đúng src/server/tests/scripts/public/cấu hình; thiếu/skipped/stale không đạt |

## Sửa hồi quy trong lần đối chiếu tiếp theo

- Phân biệt không thể chọn mục tiêu với miễn sát thương: Ly Sa R0,6s và Vân Chước E nhánh3 vẫn nhận đòn vùng; kỹ năng vùng có thể đánh trúng mục tiêu ẩn.
- Xóa dấu chân khi Ly Sa dùng E; không tạo dấu chân mới trong ngụy trang; né thành công bằng F tích Phong Tích đúng một lần mỗi cửa sổ né.
- Lướt kiểm tra toàn đoạn đường với vật cản, vùng HR09 và tường dây leo; không đi tắt vào Bí Cảnh. Chỉ nhánh Mộc Phược chặn đi bộ bằng R, các nhánh còn lại chặn lướt.
- Sửa Thiêu Đốt Liên Hỏa bị áp hai lần, Kim Thể W xóa làm chậm và Liên Tiễn Q chuẩn bị hai đòn kế tiếp.
- Khiên theo từng lớp có thời hạn riêng; HR07 theo khiên W được đặt lên người nhận, làm mù địch cận chiến khi vỡ, không kích hoạt khi tự hết hạn. Sát thương thêm HR04 lên khiên không tràn vào HP.
- Thêm kiểm thử hồi quy cho các trường hợp trên và các hiệu ứng HB02–HB07. Đây là bằng chứng cho những hành vi cụ thể đã kiểm tra, chưa phải nghiệm thu toàn bộ GDD.

## Phần chưa thể gọi là nghiệm thu100%

1. **Thiết bị thật:** chưa có Android vật lý được kết nối để cài, kiểm tra cảm ứng/restore/Hồi Hoàn và đo60FPS thông thường/30FPS với>=40nhân vật. SwiftShader, APK tồn tại hay test trình duyệt không thay thế phép đo này. Công cụ thu bằng chứng không tự đánh dấu các mục chưa kiểm tra.
2. **Nghiệm thu GDD cuối:** cần đối chiếu mọi hiệu ứng và thứ tự tương tác của36nhánh/Hoàn/Cốt/Bổ phẩm với bản đặc tả đã thống nhất. Kiểm thử hiện có nhiều ca độc lập nhưng chưa chứng minh mọi hoán vị hoặc một sản phẩm vận hành thương mại hoàn chỉnh.
3. **Dữ liệu nguồn chưa định lượng/không thống nhất:** PDF có tiêu đề18Hoàn nhưng bảng và phụ lục chỉ có12; gọi4Đại Boss nhưng chỉ định nghĩa3; không cho đường tăng trưởng Lv2–10, bảng chỉ số/độ bền Tiên khí; JSON phụ lục kết thúc giữa chừng. Không gán những con số tự đặt thành dữ liệu gốc. Câu hỏi về phụ lục cân bằng đã được gửi; chưa có câu trả lời trong lần cập nhật này.
4. **Vận hành:** backend được kiểm thử cục bộ với PostgreSQL/Redis; chưa có triển khai Internet/TLS, pentest, người dùng thật hoặc nghiệm thu mỹ thuật trên thiết bị. Mô hình và trang phục là asset thủ tục, không phải bộ asset do họa sĩ sản xuất. Anti-collusion gần nhau60s là heuristic, không được coi là giải pháp chống gian lận thương mại đầy đủ.

## Các giá trị triển khai bổ sung, không phải thông số chính thức từ PDF

- Tọa độ bản đồ x/z−94…94m; A*4m/cell, tầm nhìn24m (Độc Trạch−15%), quét theo nguồn và đường che khuất.
- Quái HP300/850, công24/44; Boss HP7.000/8.500/9.500, công95/giáp65/kháng60; biến dị nhân1,6HP. PDF không có bảng combat stat của các quái này.
- Cấp=min(10,1+floor(Tinh/100)); không tự thêm đường tăng chỉ số Lv2–10. R dùng được Lv1 trong sandbox.
- Tương tác Đài6m, nhặt3m, Tế Đàn4m, khắcấn10m; các vùng nổ phụ chưa có bán kính trong PDF dùng bán kính thực thi nêu trong mã. Hồn Chướng5/14STchuẩn/s theo giai đoạn.
- Starter đủ12Hoàn/7Cốt và1Vé Sự Kiện; giá Hoàn120TB, Cốt180TB/ngoại phụ600TB; loot appraisal là giá phát triển. Không có nạp tiền thật.
- MiễnST xuất hiện5s và vùng tránh bot22m để làm quen. Cổng biến thiên dùng chuỗi vị trí theo số đợt, tái lập được; không cần tin tọa độ client.
- Bội: giảm50% phần thưởng gia tăng của giá trị vượt1.500TB, không giảm giá trị cơ sở. Nhóm “Cường công chí mạng” chưa có tag con đầy đủ, dùng nhóm Cường công cho ma trận phòng ngự/phụ trợ.

Các mục chưa đạt phải tiếp tục xuất hiện là BLOCKED trong goal. Không xóa gate, hạ ngưỡng, tạo bằng chứng vật lý giả hoặc viết “100%” để thay việc nghiệm thu.
