# Pipeline Tencent Hunyuan cho Hồn Giới

Pipeline đã chuyển sang **Tencent Hunyuan3D-2.1** theo yêu cầu. Lần gọi `/generation_all` có xác thực cho H01 bị dịch vụ từ chối: `The requested GPU duration (270s) is larger than the maximum allowed`; phản hồi yêu cầu Hugging Face PRO. Đây là giới hạn thời lượng mỗi job, không phải thời gian chờ hàng đợi; chưa có GLB textured mới. Bằng chứng: `assets/tencent/H01-C0/hunyuan21-attempt.json`. Không lặp job hoặc đổi danh tính để né giới hạn.


Trạng thái cập nhật ngày **16/10/2026 UTC**: `HF_TOKEN` đã có trong môi trường và Hugging Face xác thực thành công. Đã sinh concept H01 và H05 thật. H01 `/shape_generation` đã trả GLB hình học 5,6 MiB, được lưu riêng tại `assets/tencent/H01-C0/shape-only.glb`; **không có texture và không được kích hoạt trong game**. H05 còn chờ duyệt ảnh.

**Điểm chặn trước khi chuyển sang 2.1 là texture bị tắt ở Space 2.0**, không phải thiếu token. Bốn lần gọi `/generation_all` có xác thực trả `NameError`. Config trực tiếp của Space ghi `Texture Generation (Unavailable)` và `Texture synthesis is disable due to missing requirements`. Xem [bằng chứng](../../assets/tencent/H01-C0/texture-capability.json). Cài thêm thư viện trong container này không sửa được môi trường GPU của Space do Tencent quản lý. Quota cũ được giữ trong journal làm lịch sử; chưa có asset textured đạt chuẩn để thay runtime.


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

Không chạy lệnh GPU thứ hai trong thời gian quota chung đang chặn. `--commit` lưu checkpoint đúng thư mục asset và queue khi index Git sạch; không đụng staged work khác. Các bản download trung gian bị ignore, còn concept/mesh đã chọn, SHA và journal được commit theo đợt. Lần chạy hiện tại có concept và mesh hình học chưa texture, **chưa có model đạt** để kích hoạt loader hoặc build APK mới.

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

`huggingface.co` đọc được metadata/source; token môi trường hiện đã xác thực thành công. Không cần nhập lại token. Cần Space Tencent khôi phục dịch vụ texture hoặc xác minh một endpoint Tencent khác có texture hoạt động trước khi tiếp tục mesh textured. Không bỏ TLS, đổi danh tính hoặc host nhằm lách quota.

Sau khi dịch vụ texture hoạt động: resume H01; sinh lần lượt mục còn lại; duyệt concept; ánh xạ nhãn/pivot thật; chuẩn hóa; kiểm tra hướng/tỷ lệ và ảnh Toàn Thân/Cận Cảnh; kiểm tra rig/animation, skin/trang phục, LOD và geometry audit. Chỉ lúc đó mới thêm GLB đã xác thực vào asset loader, build PWA/HTML/APK và cập nhật goal. Hiện không có GLB Tencent mới trong `public/`, runtime hoặc APK; mô hình legacy chưa được thay. Không gọi đã hoàn tất yêu cầu loại bỏ primitive.

Xem [goal riêng](GOAL.md) và [bằng chứng lần thử thật](status.json). Báo cáo GDD/overhaul trước có fingerprint riêng; thay đổi tooling lần này làm fingerprint toàn repository đổi, không chuyển các báo cáo cũ sang trạng thái đạt cho mã mới.
