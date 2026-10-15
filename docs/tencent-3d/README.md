# Pipeline Tencent Hunyuan cho Hồn Giới

Trạng thái ngày **16/10/2026 (Asia/Saigon)** sau Publish: **cả ba API đã kết nối được**, gồm `/infer`, `/generation_all`, `/segment`, `/generate`. FLUX đã sinh ảnh concept H01 thật. Ảnh đầu bị cắt chân/không đúng pose được giữ riêng và loại; ảnh thứ hai thấy toàn thân, tay trống và nền trắng được duyệt thử sinh mesh, chưa duyệt mỹ thuật cuối. **Hunyuan3D-2 hiện bị chặn bởi quota ZeroGPU**, chưa có GLB Tencent để thay model trong game.

Phản hồi thật: `135s requested vs. 122s left`, thử lại sau `12:25:13`; checkpoint ghi thời điểm dự kiến **19:01:47 ngày 16/10/2026 (Asia/Saigon)**. Một lần trước đó trả lỗi dịch vụ `NameError`. Không chuyển các lỗi này thành kết quả thành công hoặc đổi danh tính/host để né quota. [queue.json](../../assets/tencent/queue.json) lưu từng lần thử và thời điểm resume. Số quota/thời điểm là phản hồi đã ghi, không bảo đảm dịch vụ sẽ sẵn sàng đúng giờ đó.

## Đã cài và kiểm tra

- Blender 4.3.2 có sẵn, chạy headless được. Container không có NVIDIA GPU cục bộ.
- Python venv riêng `/workspace/tencent-3d-venv`, `gradio_client` 2.7.2, MCP 2.3.0, trimesh 5.1.1 và Pillow 12.3.0; các dependency được pin trong `tools/tencent/requirements.lock`. `pip check` đạt.
- `.codex/config.toml` đăng ký MCP stdio; đã thử initialize, list tools và gọi công cụ kiểm tra GLB qua client MCP thật. Client Codex cần tải cấu hình ở phiên khởi động phù hợp; không nhận rằng tool mới đã được hot-load vào cuộc trò chuyện này.
- Bộ kiểm thử cục bộ dùng các tam giác trừu tượng trong thư mục tạm, không tạo người/vũ khí hoặc asset game. Kiểm tra chuẩn hóa/Blender/MCP và retry/checkpoint là bằng chứng tooling, không phải bằng chứng model Tencent đã sinh. Số kiểm thử hiện hành được ghi trong [status.json](status.json).

## Danh mục toàn bộ mã nguồn và hàng đợi

`node tools/tencent/catalog.mjs` đọc trực tiếp bảng nhân vật, ngoại hình, Hồn khí, trang phục, Hoàn/Cốt và các generator cảnh/quái. [catalog.json](../../assets/tencent/catalog.json) có **167 mục**: 48 body/trang phục (gồm 12 bản gốc), 36 Hồn khí (gồm 12 gốc + 24 skin), 12 Hoàn, 6 Cốt + 1 Ngoại phụ, 4 thú thường + 4 biến dị + 3 Boss gốc, 29 props môi trường, 7 địa hình, 2 world props, 12 vật mang hiệu ứng và 3 mặt shader. Đây là mục tiêu sinh/thay, **không phải 167 asset đã có**. 144 tổ hợp hero/costume/weapon-skin được lắp từ các module; bot tái sử dụng model tương ứng.

Danh mục kèm **118 vị trí khởi tạo geometry** hiện có để đối chiếu khi bỏ primitive. Kể cả terrain, carrier hiệu ứng, plane chỉ hướng/HUD đều được liệt kê; phải phân loại/chứng minh xử lý từng nơi trước khi gọi hoàn tất. Những chi tiết nằm trong model cha không bị đếm thành hàng nghìn model độc lập. H06/H11 giữ đúng tên gốc Đỗ Kình/Ninh Từ; khác biệt tên Hồn khí H08 giữa bảng và renderer được ghi trong catalog.

`tools/tencent/batch.py` và hai tool MCP mới `tencent_asset_catalog`, `tencent_generate_asset` chạy từng asset với khóa một worker. Mỗi bước lưu file, SHA và journal riêng; ảnh/mesh đã đủ điều kiện được đọc lại thay vì sinh lại. Lỗi hàng đợi/429/timeout được retry tối đa bốn lần, backoff 10/20/40 giây. Lỗi schema/403 không lặp. Quota dài hơn 60 giây được chuyển `deferred` với `nextRetryAt`; quota ZeroGPU tạm dừng chung các job tiếp theo. Khi xác thực thực sự thay đổi, phải kiểm tra lại phản hồi quota. Không có vòng lặp chờ 12 giờ hoặc thay account/IP để vượt giới hạn.

```sh
node tools/tencent/catalog.mjs
/workspace/tencent-3d-venv/bin/python -B tools/tencent/test_batch.py
/workspace/tencent-3d-venv/bin/python -B tools/tencent/batch.py --asset H01-C0 --until mesh
/workspace/tencent-3d-venv/bin/python -B tools/tencent/batch.py --asset H01-W0 --until concept
```

Không chạy lệnh GPU thứ hai trong thời gian quota chung đang chặn. `--commit` lưu checkpoint đúng thư mục asset và queue khi index Git sạch; không đụng staged work khác. Các bản download trung gian bị ignore, còn concept/mesh đã chọn, SHA và journal được commit theo đợt. Lần chạy hiện tại chỉ có concept, **chưa có model đạt** để kích hoạt loader hoặc build APK mới.

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

API nguồn được đối chiếu từ `app.py` của FLUX và Hunyuan3D-Part, `gradio_app.py` của Hunyuan3D-2 trên kho Space chính thức. Các bản source tham khảo nằm ở `.local/tencent-api-source`, không được chạy như chương trình cục bộ. Schema trực tiếp sau Publish đã đọc được và lưu ở `.local/tencent-3d/published-probe`.

## Giữ UV, PBR và gốc khớp

P3-SAM trong source chính thức thay visual bằng màu vùng khi xuất mesh; X-Part tạo hình học mới. **Không có bảo đảm texture của chúng khớp mesh gốc.** Pipeline dùng nhãn phân đoạn để chọn chính các mặt gốc, không remesh, không unwrap lại, không sinh vật liệu giả.

`normalize` yêu cầu bản đồ nhãn giải phẫu đã được xem và gắn SHA của GLB nguồn. Nhãn số của P3-SAM không có nghĩa cố định như “đầu” hoặc “tay trái”; chưa có model thì không thể điền trước trung thực. File ánh xạ có `reviewed: true`, `sourceSha256`, `labels` (mã nhãn → tên slot), `pivots` (mỗi slot → ba tọa độ khớp trong hệ nguồn) và tùy chọn `requiredSlots`. Không tạo file ánh xạ giả cho asset chưa tồn tại.

```sh
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py normalize \
  textured_mesh.glb segment_mesh.glb face_id.npy reviewed-part-map.json normalized.glb
```

Các node chuẩn cho `category: hero` là `HonCot_Dau`, `HonCot_Than`, `HonCot_TayTrai`, `HonCot_TayPhai`, `HonCot_ChanTrai`, `HonCot_ChanPhai`, `HonCot_NgoaiPhu`, `HonKhi_VuKhi`. Mỗi slot có pivot riêng và mesh con dịch bù để giữ vị trí ban đầu. Slot rỗng được ghi `hasGeometry: false`; sáu vị trí cơ thể bắt buộc có mặt thật. Với weapon/prop/bone/creature, map chỉ rõ `category`, danh sách `nodes` đúng loại và `requiredSlots` có hình học; không tạo đầu/tay giả cho tảng đá. Blender đọc các node bắt buộc từ metadata đã kiểm tra của GLB chuẩn hóa. Node rỗng không tính là một bộ phận đã hoàn thiện.

Đường chuẩn hóa hiện nhận mesh tam giác không nén, một mesh node, transform identity và chưa có skin/animation. Nó đối chiếu tam giác P3-SAM với mesh gốc, từ chối topology không khớp hoặc nhãn mơ hồ; không đoán UV bằng nearest-point. Mọi ảnh nhúng phải đúng SHA trước/sau; accessor UV gốc và tổng số mặt phải giữ nguyên. Blender import lại GLB để kiểm tra đủ node, UV và image material. Không export lại qua Blender để tránh thay encoding ảnh. Đây là kiểm tra kỹ thuật; chưa phải rig/animation, duyệt mỹ thuật hoặc đóng gói Android.

Inspector báo đúng các kênh tồn tại. Albedo + UV + PBR metallic/roughness factors không được mô tả là đã có normal/metallic-roughness image; các kênh đó chỉ xuất hiện trong báo cáo khi có tham chiếu texture thật. Pipeline không tạo normal/roughness giả để vượt kiểm tra.

## Điều kiện mở chặn và thay model

Ba host sau đã được người dùng mở và kiểm tra kết nối thành công trong phiên khôi phục:

- `black-forest-labs-flux-1-schnell.hf.space`
- `tencent-hunyuan3d-2.hf.space`
- `tencent-hunyuan3d-part.hf.space`

`huggingface.co` đọc được metadata/source. Hiện không có token trong env hoặc cache HF. Space đã đề nghị xác thực Hugging Face để có thêm quota. Trường secret cá nhân `HF_TOKEN` đã được khai báo trong một **draft mới** cho bốn host cần thiết; không chứa giá trị token và không thay allowlist người dùng. Nếu dùng đăng nhập, điền token ở Environment settings, review/save và publish thay đổi; đừng gửi token vào chat. Đăng nhập không bảo đảm đủ quota cho 167 mục. Có thể đợi thời điểm retry do dịch vụ báo thay vì đăng nhập. Không bỏ TLS, đổi host/IP nhằm lách quota hoặc giả model đầu ra.

Sau khi quota đủ: resume H01; sinh lần lượt mục còn lại; duyệt concept; ánh xạ nhãn/pivot thật; chuẩn hóa; kiểm tra hướng/tỷ lệ và ảnh Toàn Thân/Cận Cảnh; kiểm tra rig/animation, skin/trang phục, LOD và geometry audit. Chỉ lúc đó mới thêm GLB đã xác thực vào asset loader, build PWA/HTML/APK và cập nhật goal. Hiện không có GLB Tencent mới trong `public/`, runtime hoặc APK; mô hình legacy chưa được thay. Không gọi đã hoàn tất yêu cầu loại bỏ primitive.

Xem [goal riêng](GOAL.md) và [bằng chứng lần thử thật](status.json). Báo cáo GDD/overhaul trước có fingerprint riêng; thay đổi tooling lần này làm fingerprint toàn repository đổi, không chuyển các báo cáo cũ sang trạng thái đạt cho mã mới.
