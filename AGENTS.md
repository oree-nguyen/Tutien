# Quy tắc tài nguyên Hồn Giới — tạo thủ công

- Workflow hiện tại: tạo model gốc thủ công trên web Hunyuan, dùng Prompt_Asset/hunyuan_asset_prompts.md và asset_manifest.json. Không dùng hoặc thiết lập lại MCP/remote GPU pipeline trừ khi người dùng yêu cầu mới.
- Tên tướng, trang phục, vũ khí và gameplay lấy từ src/data.js, src/hero-anatomy.js, src/weapons.js, src/simulation.js. Không tự thêm Boss thứ tư hoặc chỉ số còn thiếu.
- Chép GLB chưa kiểm định vào assets/base_models/ đúng tên manifest; dùng python Prompt_Asset/inspect_base_models.py để nhận dạng offline. Không coi file mới xuất là đã được game sử dụng.
- Cấm ghép primitive làm model thay thế người/vũ khí mới. Giữ model legacy đang chạy cho đến khi bản thay thế qua kiểm định để không làm mất tính năng game.
- Body phải toàn thân A-pose, tay trống; vũ khí, Hồn Cốt trang bị và Ngoại phụ xuất riêng. Sáu mesh giải phẫu đầu/thân/tay/chân khác với sáu món trang bị HB-01…06.
- Tên file chỉ định danh asset; không tự đoán phân đoạn giải phẫu từ tên hoặc tạo node rỗng để giả bộ phận. Cắt trên mesh gốc, giữ UV/material, đặt origin đúng khớp và kiểm tra trên mesh thật. Socket rỗng chỉ là điểm gắn.
- Bộ chuẩn hóa/Blender offline cũ có thể dùng khi đã có input thật và mapping được duyệt gắn SHA. Không coi P3-SAM/X-Part là bắt buộc cho workflow manual. Không đổi UV theo topology khác rồi khẳng định giữ nguyên texture.
- GLB phải được xem toàn thân/cận cảnh, trước/sau, kiểm tra rig/animation, trang phục, LOD và runtime trước khi kích hoạt. Prompt PBR hoặc A-pose không bảo đảm đầu ra đạt.
- VFX GLB là carrier tĩnh; shader/hạt/animation, hitbox, CC và bán kính theo engine. Tái sử dụng mesh khi phù hợp, không coi 227 brief là 227 model đã tạo.
- Không ghi credential vào Git hoặc tài liệu. Tài liệu tools Tencent cloud cũ giữ làm lịch sử, không phải workflow mặc định.

- Ngoại lệ thử nghiệm đã được người dùng cho phép: tích hợp H01-C0 từ share a93d658b-a40d-4854-b755-ad1fa9bcc79b vào sảnh/trận và APK test dưới dạng model thử nghiệm; người dùng đã cho phép gắn rig và hoạt ảnh tay/chân. Hiện có skeleton/clip cục bộ, chưa phân đoạn giải phẫu, chưa mô phỏng vải. Xem docs/H01-C0-ANDROID-TRIAL.md; không nhận là nghiệm thu mỹ thuật/animation hoàn chỉnh.

- H01-C0/H01-W0 hiện dùng hai share Hunyuan thật, rig humanoid 52 xương và Entrance 4,2 giây; không tái dùng trượng primitive/base64 cũ. Meshopt/WebP cần worker module riêng (không dùng MeshoptDecoder.useWorkers trong bundle minified). Kiểm cả production/offline và xem docs/H01-STAFF-ENTRANCE.md. Không nhận là đã đạt 60 FPS Android khi chưa đo trên thiết bị.

- H02-C0 và Chấn Nhạc Chùy đã được người dùng cấp hai share `cd050512-738f-449f-95d3-7c11a9c06851` / `45b118bc-58ce-4000-94c6-8e09945aa9f1` để tích hợp và tạo hoạt ảnh. Rig/clip cục bộ, chùy là mesh rời từ share thật; không tạo người/chùy primitive. Xem docs/H02-HAMMER-ENTRANCE.md và kiểm thử H01/H02 trước khi đổi bộ rig chung.

## Sổ ảnh trên Git (yêu cầu của người dùng)
- Mọi ảnh kiểm tra mới do agent chụp hoặc xem phải được đăng vào `picture/converN/online-pic.md`, ảnh trước và thời gian ngay bên dưới, rồi commit/push để người dùng xem được.
- N là nhiệm vụ trong `picture/tasks.json`; các tin “Tiếp” và các vòng sửa trong cùng nhiệm vụ giữ nguyên N. Nhiệm vụ rig H01/H02 hiện tại dùng số trong sổ có tiêu đề “Kiểm tra và sửa rig H01 H02”. Chỉ tạo số kế tiếp khi có nhiệm vụ mới.
- Dùng `python3 scripts/update-picture-gallery.py --task N --image path/to/image.png`; nhiệm vụ mới thêm `--title`. Không giảm chất lượng ảnh. Không ghi credential vào ảnh/tài liệu công khai.
- Phân biệt giờ chụp với giờ đăng ký ảnh hoặc giờ lưu trên Git. Không bịa giờ chụp cho ảnh lịch sử. Xem `picture/README.md`.

- Người dùng đã cho phép tách áo dính vào thân để sửa rig, bắt đầu với H01. Tách trên bề mặt mesh thật, bảo toàn UV/texture, không giả thân người bị thiếu dưới áo. Phân vùng theo màu chỉ là bản thử và phải xem riêng mesh áo, kiểm đường biên, xuyên áo và hoạt ảnh trước khi kích hoạt. Không đưa trọng số thất bại kiểm định vào runtime.
