# Pipeline Tencent Hunyuan cho Hồn Giới

Trạng thái ngày **16/10/2026 (Asia/Saigon)**: **BLOCKED bởi proxy mạng**, chưa sinh hoặc thay model Tencent trong game. Đã thử `Client(...)` thật với cả ba Space, thử lại sau thay đổi quyền môi trường và chạy lệnh sinh H01; đều nhận `ProxyError: 403 Forbidden` trước khi bắt đầu inference. Space metadata ở Hugging Face báo RUNNING; điều đó không chứng minh truy cập được API GPU.

## Đã cài và kiểm tra

- Blender 4.3.2 có sẵn, chạy headless được. Container không có NVIDIA GPU cục bộ.
- Python venv riêng `/workspace/tencent-3d-venv`, `gradio_client` 2.7.2, MCP 2.3.0, trimesh 5.1.1 và Pillow 12.3.0; các dependency được pin trong `tools/tencent/requirements.lock`. `pip check` đạt.
- `.codex/config.toml` đăng ký MCP stdio; đã thử initialize, list tools và gọi công cụ kiểm tra GLB qua client MCP thật. Client Codex cần tải cấu hình ở phiên khởi động phù hợp; không nhận rằng tool mới đã được hot-load vào cuộc trò chuyện này.
- 11 kiểm thử cục bộ đạt, dùng các tam giác trừu tượng trong thư mục tạm, không tạo người/vũ khí, không tạo asset game và không dùng fixture làm bằng chứng Tencent. Bao gồm cắt mesh giữ UV/ảnh, import bằng Blender, nguồn sai SHA, node thiếu, nhãn thiếu, topology khác và API đổi.

```sh
cd /workspace/Tutien
bash tools/tencent/setup.sh
/workspace/tencent-3d-venv/bin/python -B tools/tencent/test_pipeline.py
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py probe
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py generate H01
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py generate H05
```

Lệnh `probe` chỉ đọc schema, không sinh ảnh/model. `generate` trả exit 2 khi bị chặn, exit 3 khi đã sinh nhưng còn chờ ánh xạ bộ phận/duyệt thực tế. Exit 3 không phải hoàn tất hoặc tích hợp. Mọi lần chạy lưu vào `.local/tencent-3d`, không ghi token vào báo cáo. Khởi động MCP không tự gọi GPU.

## Luồng inference thực

`tools/tencent_3d_pipeline.py` dùng đúng ba Space chính thức:

1. `black-forest-labs/FLUX.1-schnell`, `/infer`: prompt A-pose nền trắng cho cơ thể tay trống; prompt riêng cho Hồn Khí không có người/tay. Ảnh 1024, seed cố định, 4 bước FLUX.
2. `tencent/Hunyuan3D-2`, `/generation_all`: ảnh qua `handle_file`, `check_box_rembg=True`, `steps=30`, `octree_resolution=256`. Đọc schema API thực trước khi gửi; thiếu endpoint hoặc thay tham số thì dừng, không đoán số `fn_index`.
3. `tencent/Hunyuan3D-Part`, `/segment` rồi `/generate`, cùng một Client/session để giữ `gr_state`. Lưu `face_id.npy`, mesh phân đoạn và ba đầu ra X-Part có thể tải về. X-Part được giữ làm tài nguyên đối chiếu, không tự thay mesh textured gốc.

Lâm Dật có prompt trường bào xanh/trắng viền vàng và Mộc Tinh Trượng riêng. Tịch Dao có prompt y phục trắng/xanh ngọc và Nguyệt Linh Kính riêng. Prompt không tạo chỉ số gameplay. Chưa có ảnh/model thực tế để duyệt nên chưa thể nhận chất lượng, tư thế hay sự tách rời là đạt.

API nguồn được đối chiếu từ `app.py` của FLUX và Hunyuan3D-Part, `gradio_app.py` của Hunyuan3D-2 trên kho Space chính thức. Các bản source tham khảo nằm ở `.local/tencent-api-source`, không được chạy như chương trình cục bộ. Schema trực tiếp hiện chưa đọc được vì proxy chặn host.

## Giữ UV, PBR và gốc khớp

P3-SAM trong source chính thức thay visual bằng màu vùng khi xuất mesh; X-Part tạo hình học mới. **Không có bảo đảm texture của chúng khớp mesh gốc.** Pipeline dùng nhãn phân đoạn để chọn chính các mặt gốc, không remesh, không unwrap lại, không sinh vật liệu giả.

`normalize` yêu cầu bản đồ nhãn giải phẫu đã được xem và gắn SHA của GLB nguồn. Nhãn số của P3-SAM không có nghĩa cố định như “đầu” hoặc “tay trái”; chưa có model thì không thể điền trước trung thực. File ánh xạ có `reviewed: true`, `sourceSha256`, `labels` (mã nhãn → tên slot), `pivots` (mỗi slot → ba tọa độ khớp trong hệ nguồn) và tùy chọn `requiredSlots`. Không tạo file ánh xạ giả cho asset chưa tồn tại.

```sh
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py normalize \
  textured_mesh.glb segment_mesh.glb face_id.npy reviewed-part-map.json normalized.glb
```

Các node chuẩn là `HonCot_Dau`, `HonCot_Than`, `HonCot_TayTrai`, `HonCot_TayPhai`, `HonCot_ChanTrai`, `HonCot_ChanPhai`, `HonCot_NgoaiPhu`, `HonKhi_VuKhi`. Mỗi slot có pivot riêng và mesh con dịch bù để giữ vị trí ban đầu. Slot rỗng được ghi `hasGeometry: false`; sáu vị trí cơ thể bắt buộc có mặt thật. Với asset vũ khí riêng, `requiredSlots` phải chỉ rõ slot có hình học tương ứng. Node rỗng không tính là một bộ phận đã hoàn thiện.

Đường chuẩn hóa hiện nhận mesh tam giác không nén, một mesh node, transform identity và chưa có skin/animation. Nó đối chiếu tam giác P3-SAM với mesh gốc, từ chối topology không khớp hoặc nhãn mơ hồ; không đoán UV bằng nearest-point. Mọi ảnh nhúng phải đúng SHA trước/sau; accessor UV gốc và tổng số mặt phải giữ nguyên. Blender import lại GLB để kiểm tra đủ node, UV và image material. Không export lại qua Blender để tránh thay encoding ảnh. Đây là kiểm tra kỹ thuật; chưa phải rig/animation, duyệt mỹ thuật hoặc đóng gói Android.

Inspector báo đúng các kênh tồn tại. Albedo + UV + PBR metallic/roughness factors không được mô tả là đã có normal/metallic-roughness image; các kênh đó chỉ xuất hiện trong báo cáo khi có tham chiếu texture thật. Pipeline không tạo normal/roughness giả để vượt kiểm tra.

## Điều kiện mở chặn và thay model

Cần cho phép kết nối HTTPS tới các host sau trong mạng của môi trường:

- `black-forest-labs-flux-1-schnell.hf.space`
- `tencent-hunyuan3d-2.hf.space`
- `tencent-hunyuan3d-part.hf.space`

`huggingface.co` đọc được metadata/source. Chưa có bằng chứng phải trả phí hoặc cần token; không yêu cầu mua GPU hay cung cấp API key để xử lý lỗi proxy. Khi đường mạng hoạt động, Space có thể còn yêu cầu đăng nhập/quota ZeroGPU; chỉ ghi nhận khi có phản hồi thực. Không bỏ TLS, đổi host nhằm lách chặn, giả output hoặc cài mô hình nặng không chạy được trên CPU để nhận là đã sinh thành công.

Sau khi mạng được mở: chạy lại probe; sinh H01/H05 và Hồn Khí; duyệt A-pose; ánh xạ nhãn/pivot thật; chuẩn hóa; kiểm tra hướng/tỷ lệ và ảnh Toàn Thân/Cận Cảnh; kiểm tra rig/animation, skin/trang phục và LOD. Chỉ lúc đó mới thêm GLB đã xác thực vào asset loader, build PWA/HTML/APK và cập nhật goal. Hiện không có GLB Tencent mới trong `public/`, runtime hoặc APK; mô hình legacy vẫn chạy.

Xem [goal riêng](GOAL.md) và [bằng chứng lần thử thật](status.json). Báo cáo GDD/overhaul trước có fingerprint riêng; thay đổi tooling lần này làm fingerprint toàn repository đổi, không chuyển các báo cáo cũ sang trạng thái đạt cho mã mới.
