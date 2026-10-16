# Android — bản thử Lâm Dật từ Hunyuan Web

Cài `release/Hon-Gioi-Sinh-Ton-debug.apk`, chọn **Lâm Dật → Thanh Mộc Y (C0)**. Chuỗi xuất hiện phát khi vào sảnh hoặc chạm lại Dật. Hai nút Toàn Thân/Cận Cảnh giữ pose; vào trận thử joystick, đánh thường và Q/W/E/R/F.

Hiện có thân Hunyuan gắn rig 52 xương, 30 khớp ngón có skin weights, sáu clip và Mộc Tinh Trượng từ share mới. Trượng gắn socket bàn tay, có IK và pivot tiếp đất. Shader chiêu thức riêng vẫn chạy theo luật game. Những tướng/trang phục khác dùng renderer fallback hiện có.

Xem [hướng dẫn, nguồn model, tối ưu và giới hạn nghiệm thu](H01-STAFF-ENTRANCE.md). Chưa có cloth simulation hoặc sáu mesh giải phẫu riêng; không nhận là đã hoàn tất toàn bộ mỹ thuật game. Chưa có thiết bị Android thật để chứng nhận 60 FPS.

GLB/texture/worker nằm trong APK; chơi offline không gọi Hunyuan. HTML standalone nhúng cả model và worker. Nguồn raw được giữ cục bộ; model trong `assets/base_models/` là dẫn xuất mobile, không phải raw export.
