# Goal thay model bằng Tencent

Chỉ hoàn tất khi mọi mục sau có bằng chứng thật. Không dùng số kiểm thử cục bộ thay cho kết quả GPU hoặc ảnh trong game.

| Mục | Trạng thái |
|---|---|
| Blender/Python dependency được cài, pin và setup lặp lại | Đã kiểm tra cục bộ |
| MCP initialize/list/call và config project | Đã kiểm tra bằng client stdio thật |
| Kiểm tra GLB/ảnh nhúng/UV và đường cắt giữ dữ liệu | Đã kiểm tra trên fixture trừu tượng; chưa trên output Tencent |
| FLUX + Hunyuan3D-2 + Hunyuan3D-Part truy cập được | BLOCKED: proxy 403 cả ba host |
| H01 body và Mộc Tinh Trượng do GPU sinh thật | BLOCKED trước inference; chưa có GLB |
| H05 body và Nguyệt Linh Kính do GPU sinh thật | Chưa chạy inference vì cùng điều kiện mạng chưa đạt |
| Ánh xạ sáu Hồn Cốt, Ngoại Phụ, Hồn Khí/pivot đúng asset | Chờ mesh/nhãn thật và review; không có map giả |
| UV/ảnh/PBR giữ được trên output Tencent | Chưa chạy: không có asset nguồn |
| Tích hợp Toàn Thân/Cận Cảnh, animation/LOD/cosmetics | Chưa chạy; không thay model bằng placeholder |
| Web/PWA/HTML/APK mới chứa asset đã duyệt | Chưa build cho đợt này |

**Chưa đạt 100%.** Điều kiện ngoại sinh hiện tại là đường HTTPS tới ba host `hf.space`. Sau đó vẫn phải hoàn thành phần sinh/duyệt/tích hợp còn lại; mở mạng không tự chứng nhận các mục đó.
