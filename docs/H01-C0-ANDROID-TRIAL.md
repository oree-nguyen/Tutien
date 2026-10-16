# Android — bản thử H01-C0 từ Hunyuan Web

Model của người dùng: [share Hunyuan](https://3d.hunyuan.tencent.com/share?shareId=a93d658b-a40d-4854-b755-ad1fa9bcc79b). Đây là bản thử được người dùng yêu cầu tích hợp trực tiếp; không phải nghiệm thu toàn bộ mục tiêu đồ họa/animation.

Cài `release/Hon-Gioi-Sinh-Ton-debug.apk`, mở game và chọn **Lâm Dật → Thanh Mộc Y (trang phục đầu tiên/C0)**. Xem Toàn Thân/Cận Cảnh, kéo xoay và vào trận offline để thử joystick, đánh thường, kỹ năng. Các trang phục khác và tướng khác giữ renderer hiện có.

GLB gốc có 1.499.726 tam giác, 80.791.928 byte, có albedo/normal/metallic-roughness nhúng; không có skin skeleton hoặc animation. Bản gốc được giữ nguyên trong `.local/manual-assets/H01-C0-shared-original.glb`, không đóng vào APK. SHA256 nguồn và từng file đã chuẩn bị nằm ở [provenance](../public/models/h01-c0/provenance.json); không lưu signed download URL hoặc thông tin tài khoản Hunyuan.

Bản Android gồm ba LOD đã giảm lưới, hàn đỉnh trùng trong ngưỡng nhỏ và bake lại PBR từ mesh gốc lên UV mới bằng Blender CPU: high 60.000 mặt, medium 9.000, low 900. Chiều cao chuẩn 1,82 m; hướng mặt đã căn theo renderer. Albedo/normal/metallic-roughness là ảnh nhúng, được kiểm tra trong GLB. Đây là chuyển đổi có mất chi tiết, không nhận là bảo toàn byte UV/ảnh hoặc geometry 100%. Vũ khí Mộc Tinh Trượng hiện có vẫn được trang bị riêng.

**Giới hạn:** nhân vật di chuyển và dùng kỹ năng theo luật game, nhưng thân đang giữ pose tĩnh; chưa có hoạt ảnh khớp tay/chân, cloth simulation, rig hoặc sáu mesh giải phẫu riêng. Các slot Hồn Cốt và chỉ số gameplay vẫn hoạt động; không nhận rằng đã có hệ thay bộ phận 3D hoàn chỉnh. Nhãn sảnh ghi rõ model tĩnh thử nghiệm. Camera xa dùng LOD thấp, nên chi tiết mặt/áo giảm mạnh.

Mô hình được tải từ file cục bộ trong APK; chơi offline không cần truy cập Hunyuan hoặc GPU server. Standalone HTML cũng nhúng các GLB để không thêm yêu cầu tải model bên ngoài. Thư mục `assets/base_models/` chứa bản high đã chuẩn bị để công cụ nhận diện offline; đây là bản dẫn xuất, không phải raw export gốc.

## Kiểm tra và build

```bash
npm test
node --test tests/manual-hero.test.js tests/portrait-equipment.test.js tests/soul-ring-vfx.test.js
GAME_URL=http://127.0.0.1:5173 node tests/manual-hero-browser.mjs
npm run android:apk
```

Kiểm thử Node xác minh geometry/PBR/file SHA; trình dựng procedural headless cũ vẫn được kiểm tra riêng khi không có bộ giải mã ảnh của trình duyệt. Kiểm thử browser xác minh model thực được tải trong sảnh và trận, đổi tướng, joystick touch và Linh Bộ; không coi kết quả CPU/SwiftShader là FPS Android thật. APK phải được kiểm chữ ký và so byte GLB bên trong với provenance trước khi giao. Chưa có thiết bị Android kết nối để đo hiệu năng thực tế.

Tái tạo LOD từ raw export bằng Blender:

```bash
blender --background --factory-startup --python tools/manual-assets/prepare_h01_trial.py -- \
  --source .local/manual-assets/H01-C0-shared-original.glb --output public/models/h01-c0
```

Script này chỉ xử lý mesh do người dùng cung cấp; không gọi MCP, suy luận AI hoặc ghép primitive thành người.
