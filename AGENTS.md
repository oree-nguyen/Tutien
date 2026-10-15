# Quy tắc tài nguyên 3D Hồn Giới

- Mọi model 3D mới của game (nhân vật, Hồn Khí, Ngoại Phụ, Hồn thú hoặc mô hình trang trí) phải có nguồn Tencent Hunyuan3D qua `tools/tencent_3d_pipeline.py`: ảnh tham chiếu riêng, GLB texture từ Hunyuan3D-2 và nhãn P3-SAM/X-Part từ Hunyuan3D-Part. Hai target đầu là H01/H05; mở rộng target bằng đặc tả/prompt thật khi cần model khác.
- Cấm tạo model thay thế người/vũ khí bằng cách ghép primitive Blender hoặc Three.js. Không dùng asset ví dụ, fixture hay mesh tự tạo để nhận là sản phẩm Tencent.
- Model thủ tục cũ là tài nguyên legacy đang chạy; chỉ thay khi asset Tencent thật đã qua kiểm tra. Nếu API/GPU không truy cập được, giữ tính năng game, ghi BLOCKED và lỗi thật; không báo sinh hoặc tích hợp thành công.
- P3-SAM xuất màu phân đoạn; X-Part sinh hình học mới. Không nhận hai đầu ra này là bản còn nguyên UV/texture. Chỉ cắt mặt trên mesh textured gốc khi kiểm tra khớp hình học; phải bảo toàn SHA của ảnh nhúng, UV gốc và số mặt. Không đoán chuyển UV khi topology thay đổi.
- Mã nhãn phân đoạn không có ý nghĩa giải phẫu cố định. Bản đồ nhãn → sáu Hồn Cốt/Ngoại Phụ/Hồn Khí và pivot phải được xem trên asset thật và gắn SHA nguồn; không điền tên node rỗng rồi coi là bộ phận có hình học.
- GLB kiểm tra cấu trúc/Blender chưa đủ nghiệm thu. Cần xem Toàn Thân/Cận Cảnh, hướng mặt, tỷ lệ, khớp, animation, skin/trang phục và LOD trong game trước khi kích hoạt runtime; giữ luật GDD V2.5 và bảo mật hiện hành.
- Khởi động MCP bằng cấu hình `.codex/config.toml`; quy trình cài đặt và trạng thái thực tế ở `docs/tencent-3d/README.md`. Không lưu HF token vào Git, log hoặc prompt; chỉ dùng biến môi trường khi thực sự cần.
