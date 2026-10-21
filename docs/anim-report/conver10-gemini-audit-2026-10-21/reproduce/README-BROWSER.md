# Chụp kiểm tra từ đúng APK

Cần Node dependencies của repo, Chromium ở `/usr/bin/chromium`, Python3 với numpy/matplotlib cho biểu đồ. Nếu Chromium nằm nơi khác, sửa riêng script audit. Chạy từ gốc repo tại commit được ghi trong báo cáo; release/build-provenance.json phải thuộc bản2.5.ba97bec3. Không tải GPU ngoài hoặc cài MCP.

```bash
python3 docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/extract-apk.py release/Hon-Gioi-Sinh-Ton-debug.apk
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/capture-apk.mjs
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/capture-worker.mjs
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/capture-followup.mjs
python3 docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/plot-hip-height.py
```

Các script browser dùng chung cổng5221, chạy tuần tự. Chúng tự đóng server/browser và ghi ảnh/JSON với thời gian mới; chạy ở worktree/bản sao riêng để giữ hồ sơ công bố. Đăng ký ảnh mới vào picture/conver10 theo AGENTS.md.

capture-apk phục vụ web bundle/asset đã trích APK. Route /audit/ thêm Three cùng phiên bản và studio helper để clone skeleton, bỏ transform bày sảnh, chiếu đèn trung tính và vẽ xương chẩn đoán. Không sửa weights/UV/vertices/clips. Ảnh diagnostic không chứng nhận màu/ánh sáng giống Tencent.

capture-worker đợi đúng IDhero, body loaded, source loaded và hết loadingCharacter. Nó ghi metadata và message thực gửi worker. Bộ này thay kết luận hình ảnh H02 preparing ban đầu, không xóa bằng chứng cũ.

capture-followup dùng context mới tránh modal bản lưu, xác nhận clone đã cập nhật world matrix rồi vào trận H02 bằng UI. Tên run/Q biểu thị input-stage, không chứng nhận metadata clip đồng bộ ngay frame chụp.

Log npm trong thư mục cha là kết quả cloud. verify-master-result.json ghi exit code; evidence ở đường mặc định đã được khôi phục nguyên byte sau khi thu kết quả. Audit không tự thay trạng thái nghiệm thu, không chạy bake/build/rig generation và không đóng APK mới.
