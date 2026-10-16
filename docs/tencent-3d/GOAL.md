# Goal thay toàn bộ model bằng Tencent

Pipeline đã chuyển sang **Tencent Hunyuan3D-2.1** theo yêu cầu. Lần gọi `/generation_all` có xác thực cho H01 bị dịch vụ từ chối: `The requested GPU duration (270s) is larger than the maximum allowed`; phản hồi yêu cầu Hugging Face PRO. Đây là giới hạn thời lượng mỗi job, không phải thời gian chờ hàng đợi; chưa có GLB textured mới. Bằng chứng: `assets/tencent/H01-C0/hunyuan21-attempt.json`. Không lặp job hoặc đổi danh tính để né giới hạn.


Phạm vi mới: **167 mục sinh/biến thể** trong [catalog.json](../../assets/tencent/catalog.json), gồm đủ 12 tướng × 4 trang phục, 12 Hồn khí × 3 skin, 12 Hoàn, 7 Cốt/Ngoại phụ, 11 loài/thể thú/Boss và các props, terrain, vật mang VFX. Kèm audit 118 vị trí geometry và ba GLB legacy. Đây là danh mục cần xử lý, không phải số asset đã tạo.

Chỉ hoàn tất khi mọi mục sau có bằng chứng thật. Các goal GDD, bảo mật và Android trước vẫn bắt buộc. Không dùng số kiểm thử hoặc ảnh concept thay cho model đã chạy trong game.

| Mục | Trạng thái hiện hành |
|---|---|
| Checkout 6bc4041, venv, Blender và MCP sau Publish | Đã kiểm tra trong workspace khôi phục |
| Kết nối/schema ba API chính thức | Đạt; proxy 403 trước đó đã được giải quyết |
| Danh mục mã nguồn và biến thể, source SHA/legacy SHA | Đã tạo/đối chiếu: 167 target, 118 vị trí geometry, ba GLB cũ |
| Hàng đợi, retry/backoff, lock, checkpoint và resume | Kiểm thử cục bộ đạt; MCP catalog/resume gọi thật |
| Concept phù hợp từng target | Một concept H01 được duyệt thử sinh mesh; một ảnh cắt chân bị loại; còn 166 target chưa có concept |
| Mesh textured Tencent cho từng target | 0/167; H01 có mesh 2.0 chưa texture; job 2.1 vượt giới hạn thời lượng GPU |
| P3-SAM/X-Part thực trên các mesh mới | Chưa chạy: chưa có mesh nguồn |
| Ánh xạ nhãn/pivot, UV/ảnh/PBR giữ nguyên trên output thật | Chưa chạy; test trên fixture không tính là model thật |
| GLB đạt Blender, rig/animation và LOD từng loại | Chưa chạy trên output Tencent |
| Tích hợp và duyệt Toàn Thân/Cận Cảnh/gameplay mọi target | Chưa chạy; không đánh dấu loader đã dùng model Tencent |
| Bỏ toàn bộ model primitive/legacy thuộc phạm vi | Chưa thực hiện; không xóa model chạy hiện tại để thay bằng chỗ trống |
| Web/PWA/HTML/APK mới chứa model đã duyệt | Chưa build cho đợt này |

**Chưa đạt 100%.** Token môi trường đã xác thực hợp lệ. Space Tencent 2.0 công bố texture unavailable; bốn lần `/generation_all` có xác thực lỗi `NameError`, trong khi `/shape_generation` thành công. Đã lưu concept H01/H05 và mesh H01 chưa texture; chưa có model đạt tiêu chuẩn UV/PBR, phân đoạn, duyệt trong game. Không cần nhập lại token.

Tiếp tục khi dịch vụ texture Tencent hoạt động: resume checkpoint, sinh/duyệt từng asset, ánh xạ bộ phận thật, kiểm định và tích hợp. Không tính mesh chưa texture là hoàn tất.
