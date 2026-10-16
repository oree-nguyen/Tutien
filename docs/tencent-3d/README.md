# Pipeline Tencent Hunyuan cho Hồn Giới

> TÀI LIỆU LỊCH SỬ: người dùng đã chuyển sang [tạo thủ công trên web Hunyuan](../../Prompt_Asset/README.md). MCP server/đăng ký đã được gỡ; không dùng hướng dẫn khởi chạy MCP cũ. Các báo cáo dưới đây thuộc đợt trước, không mô tả workflow hiện hành.

Provider mặc định hiện là **ModelScope / GPU riêng Hunyuan3D-2.1**, không tự gọi Hugging Face. Xem [thiết lập, notebook, lệnh chạy và các giới hạn thực tế](MODELSCOPE.md).

Đã cài SDK, cập nhật MCP, chạy projection Blender trên mesh H01 thật và lưu [bản chẩn đoán](../../assets/tencent/H01-C0/projection-diagnostic.glb). Bản đó có UV/albedo 2048 nhưng không có PBR sinh thật, sáu bộ phận, rig hoặc nghiệm thu runtime. Concept H05 đã bị loại sau khi xem pose/trang phục. **0/167 target được nghiệm thu thay thế**; chưa xóa model legacy hoặc build APK mới.

ModelScope có weights nhưng metadata 2.1 không có Studio/API inference; container không có GPU và chưa có URL GPU riêng. Bộ Colab/PAI kiểm tra VRAM, khóa source Tencent, dùng ModelScope weights và dựng API/tunnel; CUDA build/inference trên GPU chưa được chạy. Cấu hình mặc định cần khoảng 29 GiB, không vừa T4 16 GB/A10 24 GB.

## Kiểm tra tooling cục bộ

Blender 4.3.2, venv `/workspace/tencent-3d-venv`, dependency pin ở `tools/tencent/requirements.lock`. `bash tools/tencent/setup.sh` và `pip check` đã chạy thành công. Ba bộ kiểm thử hiện có 35 test đạt, gồm GLB/UV/Blender/MCP thật trên fixture trừu tượng, queue/checkpoint và adapter HTTP/fallback. Fixture/mocked HTTP không phải bằng chứng sinh model GPU.

```bash
/workspace/tencent-3d-venv/bin/python -B tools/tencent/test_pipeline.py
/workspace/tencent-3d-venv/bin/python -B tools/tencent/test_batch.py
/workspace/tencent-3d-venv/bin/python -B tools/tencent/test_providers.py
```

MCP có 8 tool, gồm `tencent_modelscope_probe` và `tencent_project_texture`; đã kiểm tra stdio initialize/list/inspect. Cấu hình repo không tự hot-load tool vào chat hiện tại hoặc tự khởi chạy job GPU.

## Danh mục toàn bộ mã nguồn và hàng đợi

`node tools/tencent/catalog.mjs` đọc trực tiếp bảng nhân vật, ngoại hình, Hồn khí, trang phục, Hoàn/Cốt và các generator cảnh/quái. [catalog.json](../../assets/tencent/catalog.json) có **167 mục**: 48 body/trang phục (gồm 12 bản gốc), 36 Hồn khí (gồm 12 gốc + 24 skin), 12 Hoàn, 6 Cốt + 1 Ngoại phụ, 4 thú thường + 4 biến dị + 3 Boss gốc, 29 props môi trường, 7 địa hình, 2 world props, 12 vật mang hiệu ứng và 3 mặt shader. Đây là mục tiêu sinh/thay, **không phải 167 asset đã có**. 144 tổ hợp hero/costume/weapon-skin được lắp từ các module; bot tái sử dụng model tương ứng.

Danh mục kèm **118 vị trí khởi tạo geometry** hiện có để đối chiếu khi bỏ primitive. Kể cả terrain, carrier hiệu ứng, plane chỉ hướng/HUD đều được liệt kê; phải phân loại/chứng minh xử lý từng nơi trước khi gọi hoàn tất. Những chi tiết nằm trong model cha không bị đếm thành hàng nghìn model độc lập. H06/H11 giữ đúng tên gốc Đỗ Kình/Ninh Từ; khác biệt tên Hồn khí H08 giữa bảng và renderer được ghi trong catalog.

`batch.py` chạy tuần tự với khóa worker, SHA/checkpoint từng bước và retry hữu hạn. Concept bị loại không sinh mesh. Bản projection đã lưu hợp lệ dừng để duyệt, không lặp GPU; receipt ghi `generatedPBR: false`. `--commit` chỉ commit đúng asset/queue khi index sạch. Lịch sử quota HF vẫn giữ nhưng không chặn provider mới. [Reuse plan](../../assets/tencent/reuse-plan.json) có 107 nhóm ứng viên cho 167 target, chưa có alias được duyệt; khác silhouette vẫn cần geometry riêng.

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

## Lịch sử và trạng thái hiện hành

Các lần HF trước: token đã xác thực; Space 2.0 tắt texture và `/generation_all` lỗi `NameError`; shape 2.0 đã sinh thật. Space 2.1 từ chối job 270 giây theo giới hạn tài khoản. Không có thêm lời gọi HF trong luồng mặc định mới. Bằng chứng cũ được giữ để truy nguồn, không phải điểm chặn credential hiện tại. Xem [báo cáo trước chuyển đổi](README-before-modelscope.md), [goal](GOAL.md) và [status](status.json).

Báo cáo GDD/Android cũ có fingerprint riêng. Đợt này chỉ kiểm thử tooling; không relabel APK hoặc test gameplay cũ thành kết quả của mã hiện tại.
