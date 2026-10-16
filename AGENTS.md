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
