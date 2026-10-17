# Giai đoạn 4 — atlas cố định; phần lựa chọn còn chờ

Đã bake trực tiếp từ thuật toán Canvas hiện tại, giữ nguyên bảng màu và kích thước: 12 preset trang phục gốc × low64/medium256 × năm map =120 ảnh. KTX2 tổng 627.528 byte. Albedo/emissive ETC1S, normal/roughness/metalness UASTC, mipmap và ảnh PNG dự phòng nội bộ. Script `npm run assets:bake:characters`; provenance ghi SHA thuật toán. Bộ này không thay texture gốc trong GLB.

Loader tải trước atlas của nhân vật legacy đang chọn; chưa tải xong thì UI và placeholder vẫn hiện, không dựng nhân vật với map trống. Atlas bot low được chuẩn bị ở màn hình vào trận. Texture cache một lần, không resize lại atlas nén dùng chung khi đổi nhân vật. Biến thể trang phục không có bản bake vẫn dùng thuật toán/cache trước đó; high2048 chưa đổi. Địa hình/bark/IBL đã có asset bake ở baseline, không nhận chúng là mới làm.

Hai kiểm thử kiểm tra đủ24 preset, SHA120 file, độ phân giải, mipmap, định dạng từng kênh, bảng màu đúng công thức gốc, PNG fallback và reuse atlas. Browser A/B H05: ép lỗi atlas để sinh bản tham chiếu cũ rồi so với năm map nén; cả hai render không page error. Ảnh ở perf-audit/phase4-visual/. Không phát hiện mất nhận diện ở cặp ảnh này; chưa nghiệm thu mỹ thuật/thiết bị thật.

Trong workload balanced H05/H08/H11, sinh atlas đồng bộ giảm còn0–0,2ms (tra cache); tải atlas async lần đầu56,3/72,1/58,2ms. Baseline medium có lần sinh672,7ms. Tuy nhiên frame vẫn có đỉnh cao do dựng model/shader/render; chưa đạt mục tiêu hết khựng.

## Chưa hoàn tất

Hai câu hỏi về đánh đổi chất lượng chưa có câu trả lời: tự chọn Low trên thiết bị <=2GB và Medium khi không biết RAM, hay giữ mặc định Medium; chuyển bộ icon WebP128 hiện có sang PNG512 theo yêu cầu mới hay giữ bộ nhỏ. Chưa tự quyết hai lựa chọn này. Vì vậy chưa thêm cơ chế tự chọn/thay đổi mặc định chất lượng hoặc tái xuất icon512. Không ghi giai đoạn4 là hoàn thành100%.

Bổ sung lưu trong Git nguồn legacy `h01_moc_tinh_truong_raw.glb` (đã tồn tại và được audit, không đổi byte) để clone mới có đủ nguồn kiểm định14 file. Nguồn này không được đưa vào runtime/APK; chỉ13 entry có key được publish. Tránh tình trạng test nguồn chỉ chạy được trên workspace đã tải file cũ.
