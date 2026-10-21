# Tái lập audit, không thay runtime

- [Phép đo skin, đối chứng Three và raw clips](README-MATH.md).
- [Chụp từ APK và kiểm worker/combat](README-BROWSER.md).
- `extract-apk.py`: chỉ giải nén assets/public nếu APK đúng SHA đã audit.
- `plot-hip-height.py`: giải motion binary từ APK và vẽ keypoint DOCX, không tạo lại motion.

Chạy từ gốc repo tại commit audit. Các script ghi JSON/ảnh lại trong thư mục báo cáo; để bảo toàn hồ sơ cũ hãy chạy ở worktree/bản sao riêng. Không chạy đồng thời các script cùng ghi motion-metrics.json hoặc dùng cổng5221. Không có script ở đây được nhập vào game/APK.
