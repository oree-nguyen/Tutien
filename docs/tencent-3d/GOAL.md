# Goal thay toàn bộ model bằng Tencent

Phạm vi mới: **167 mục sinh/biến thể** trong [catalog.json](../../assets/tencent/catalog.json), gồm đủ 12 tướng × 4 trang phục, 12 Hồn khí × 3 skin, 12 Hoàn, 7 Cốt/Ngoại phụ, 11 loài/thể thú/Boss và các props, terrain, vật mang VFX. Kèm audit 118 vị trí geometry và ba GLB legacy. Đây là danh mục cần xử lý, không phải số asset đã tạo.

Chỉ hoàn tất khi mọi mục sau có bằng chứng thật. Các goal GDD, bảo mật và Android trước vẫn bắt buộc. Không dùng số kiểm thử hoặc ảnh concept thay cho model đã chạy trong game.

| Mục | Trạng thái hiện hành |
|---|---|
| Checkout 6bc4041, venv, Blender và MCP sau Publish | Đã kiểm tra trong workspace khôi phục |
| Kết nối/schema ba API chính thức | Đạt; proxy 403 trước đó đã được giải quyết |
| Danh mục mã nguồn và biến thể, source SHA/legacy SHA | Đã tạo/đối chiếu: 167 target, 118 vị trí geometry, ba GLB cũ |
| Hàng đợi, retry/backoff, lock, checkpoint và resume | Kiểm thử cục bộ đạt; MCP catalog/resume gọi thật |
| Concept phù hợp từng target | Một concept H01 được duyệt thử sinh mesh; một ảnh cắt chân bị loại; còn 166 target chưa có concept |
| Mesh textured Tencent cho từng target | 0/167; H01 thiếu quota 135s yêu cầu/122s còn lại |
| P3-SAM/X-Part thực trên các mesh mới | Chưa chạy: chưa có mesh nguồn |
| Ánh xạ nhãn/pivot, UV/ảnh/PBR giữ nguyên trên output thật | Chưa chạy; test trên fixture không tính là model thật |
| GLB đạt Blender, rig/animation và LOD từng loại | Chưa chạy trên output Tencent |
| Tích hợp và duyệt Toàn Thân/Cận Cảnh/gameplay mọi target | Chưa chạy; không đánh dấu loader đã dùng model Tencent |
| Bỏ toàn bộ model primitive/legacy thuộc phạm vi | Chưa thực hiện; không xóa model chạy hiện tại để thay bằng chỗ trống |
| Web/PWA/HTML/APK mới chứa model đã duyệt | Chưa build cho đợt này |

**Chưa đạt 100%.** Điểm chặn hiện tại là quota ZeroGPU, không còn là proxy. Hàng đợi ghi thời điểm được báo thử lại khoảng **19:01 ngày 16/10/2026 (Asia/Saigon)**; không tự bảo đảm quota sẽ đủ lúc đó. Có thể cung cấp `HF_TOKEN` qua secret cá nhân trong Environment settings để dịch vụ xét quota đăng nhập; chưa có bằng chứng quota đó đủ cả danh mục. Không gửi token vào chat hoặc Git.

Sau khi quota đủ: resume đúng checkpoint, sinh/duyệt từng asset, commit theo đợt và tiếp tục các mục còn mở. Việc đăng nhập hoặc mở mạng không tự duyệt các mục sinh/kiểm tra/tích hợp. Chưa được gọi bản mới là hoàn tất dù các goal kỹ thuật cũ từng đạt.
