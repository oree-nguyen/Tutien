# ModelScope / GPU riêng — Hunyuan3D-2.1

Trạng thái kiểm tra ngày 16/10/2026 (Asia/Saigon): **chưa sinh được model 2.1/PBR hoặc tích hợp model mới vào game**. ModelScope SDK 1.40.2 đã cài và `pip check` thành công. Pipeline/MCP mặc định không gọi Hugging Face; dữ liệu cũ vẫn giữ nguồn thật trong provenance.

ModelScope trả metadata kho `Tencent-Hunyuan/Hunyuan3D-2.1` và `Tencent-Hunyuan/Hunyuan3D-Part`. Metadata 2.1 có `SupportApiInference: false`, `Studios: []`, `DemoAvailable: 0`. Các đường dẫn Studio được đề xuất trả HTTP 404 qua API kiểm tra; HTML trang SPA trả 200 không chứng minh có GPU hay Gradio endpoint. Không dựng URL `ms.show` giả. Xem [probe thực tế](../../assets/tencent/modelscope-probe.json).

Container Codex hiện không có GPU NVIDIA và chưa có `HUNYUAN_REMOTE_URL` hoặc URL Studio được cấu hình. Trình cài GPU đã được chạy `--check` và từ chối rõ vì không có GPU. Chưa chạy CUDA build hoặc inference PBR trên máy từ xa; viết notebook không tự cấp phiên Colab/PAI, GPU hay tài khoản.

## Các tệp và cách chạy

- [Notebook một ô lệnh](../../tools/tencent/Hunyuan3D_2_1_Colab_ModelScope.ipynb): tải script từ repo này và giữ server/tunnel chạy trong phiên GPU.
- [Trình triển khai](../../tools/tencent/hunyuan3d_2_1_remote_server.py): khóa mã nguồn Tencent ở `82920d643c0dc2f7bfd7255f45f62d386edfe60c`; tự chuẩn bị Python 3.10 khi kernel mới hơn, PyTorch 2.5.1 CUDA 12.4, build `custom_rasterizer` và C++ `DifferentiableRenderer` theo ABI Python hiện hành, tải weights qua ModelScope, dùng đường dẫn local và chặn HF download bằng chế độ offline. Tải Real-ESRGAN từ release GitHub gốc. Các bước GPU này **chưa được nghiệm thu trên GPU**.
- [Adapter](../../tools/tencent/providers.py): ưu tiên `HUNYUAN_REMOTE_URL` cho shape/PBR qua API `/health`, `/openapi.json`, `/generate` của Tencent; nếu không có thì dùng URL Gradio ModelScope tương ứng. Không gửi HF token tới các host này.
- [Probe](../../tools/tencent/modelscope_probe.py): kiểm tra metadata và `named_endpoints`, không chiếm GPU.
- [Blender projection](../../tools/tencent/blender_project_texture.py): chỉ nhập mesh có sẵn, giữ hình học, giữ UV đã có hoặc thêm atlas khi chưa có; bake albedo 2048 bằng CPU, cắt lề trắng concept, tô màu nền trung tính ở mặt sau. **Không phải PBR sinh thật hoặc tái tạo mặt sau**.

Tencent công bố khoảng 10 GB VRAM cho shape, 21 GB cho texture, 29 GB cho cả hai. Worker `api_server.py` gốc giữ hai pipeline đồng thời; tùy chọn low-VRAM của nó chỉ dọn cache sau suy luận. Script này yêu cầu GPU 0 có ít nhất 29 GiB và CUDA compiler; khuyến nghị A100 40 GB. **T4 16 GB và A10 24 GB không chạy được cấu hình worker mặc định này**. Không giả vờ hỗ trợ hai GPU đó bằng cách bỏ kiểm tra dung lượng. [Tài liệu Tencent](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1#install-requirements).

Trên GPU Linux phù hợp:

```bash
python tools/tencent/hunyuan3d_2_1_remote_server.py
```

Sau khi worker healthy, script chạy cloudflared và in URL HTTPS. Binary cloudflared mới tải phải khớp digest SHA256 của release GitHub; phiên notebook phải tiếp tục chạy. Đặt URL thực vào `HUNYUAN_REMOTE_URL` trong Environment settings. Với Studio riêng, đặt `MODELSCOPE_SHAPE_URL`, `MODELSCOPE_PART_URL`, `MODELSCOPE_CONCEPT_URL` theo từng dịch vụ có thật. Server notebook này cung cấp shape/PBR; **không tự cung cấp Part hoặc sinh ảnh concept**. Các bước đó cần Studio tương ứng, hoặc concept đã lưu và đã được duyệt. Không nhập lại HF token cho luồng này.

Trong Codex:

```bash
cd /workspace/Tutien
bash tools/tencent/setup.sh
/workspace/tencent-3d-venv/bin/python -B tools/tencent/modelscope_probe.py
/workspace/tencent-3d-venv/bin/python -B tools/tencent/batch.py --asset H01-C0 --until mesh
```

MCP có thêm `tencent_modelscope_probe` và `tencent_project_texture`. `.codex/config.toml` chuyển tiếp các biến provider/URL; không khởi chạy inference khi mở MCP. Nếu cần tái hiện luồng HF lịch sử, chỉ có lựa chọn tường minh `HUNYUAN_PROVIDER=huggingface`; không có fallback ngầm.

## Fallback và checkpoint

Khi Studio có `/shape_generation` nhưng không có `/generation_all`, hoặc nhánh texture báo `NameError`/`texgen_worker`, pipeline lấy shape thật rồi gọi Blender. Lỗi auth/quota không kích hoạt đổi dịch vụ để né hạn mức. Nếu API trả GLB không texture, dùng GLB đó để chiếu ảnh thay vì gửi lại shape job. `HUNYUAN_PROJECTION_FRONT` phải là hướng Blender đã xem đúng (`-Y`, `+Y`, `-Z`, `+Z`); không mặc định đoán hướng cho mọi mesh.

Bản chiếu được lưu `projected_mesh.glb` cùng receipt `generatedPBR: false`, dừng ở `awaiting-projection-art-and-part-review`; resume không sinh lại bản nháp đã khớp SHA. Receipt không biến hình chiếu thành PBR Tencent. Các thông số API riêng được dò từ OpenAPI; giới hạn 20 bước của `/generate` được tuân thủ, không gửi 30 rồi coi đã dùng đủ 30. Pipeline kiểm tra GLB/UV/ảnh nhúng và yêu cầu metallic/roughness thật đối với đầu ra worker PBR.

## Kết quả thực tế và phần chưa đạt

H01 đã có [GLB chiếu thử](../../assets/tencent/H01-C0/projection-diagnostic.glb) với albedo nhúng 2048×2048 trên mesh Tencent 2.0 đã lưu từ trước: 136.539 đỉnh, 273.154 mặt; hình học giữ nguyên. Đây không phải mesh mới sinh từ ModelScope/2.1. Đã render/xem [mặt trước](../../assets/tencent/H01-C0/projection-front.png) và [mặt sau](../../assets/tencent/H01-C0/projection-back.png). Chưa duyệt sản xuất: mặt sau trung tính, méo hình chiếu ở cạnh, thiếu rig/LOD và thiếu sáu bộ phận. [Blender validator](../../assets/tencent/H01-C0/projection-parts-check.json) xác nhận UV/ảnh có thật nhưng `allNamedSlots: false`, `passed: false`. Không đổi tên một mesh hoặc thêm node rỗng để giả bộ phận.

Concept H05 đã được xem và **bị loại**: một tay gập trước ngực, tay áo che giải phẫu, màu trang phục lệch mô tả. Không dùng ảnh đó để sinh mesh sản xuất. H01/H05 Hồn khí vẫn chưa có GLB đạt; cần sinh ảnh vũ khí riêng và mesh riêng trên endpoint hoạt động.

[Reuse plan](../../assets/tencent/reuse-plan.json) bao phủ 167 target thành 107 nhóm ứng viên, gồm nhóm thân/trang phục theo tướng và nhóm vũ khí/skin. `mesh_reuse.py` hỗ trợ đăng ký alias dùng chung đường dẫn/SHA sau duyệt tương thích silhouette/material/rig cho đúng target; không nhân một mesh thành 167 tài nguyên đã hoàn tất. Hiện **0 alias được duyệt** và **0 model mới cài vào runtime**. Giữ legacy để game tiếp tục hoạt động cho đến khi bản thay thế qua kiểm định.

Đã lưu draft `start_skill` mới cùng các tên biến URL trong Environment settings; lưu draft không khởi tạo GPU, chạy notebook hoặc Publish. Phần còn chặn cần GPU endpoint thật cho shape/PBR và Part/concept, rồi kiểm định giải phẫu, UV/ảnh, hiển thị Toàn Thân/Cận Cảnh, animation, LOD và runtime trước khi xóa primitive cũ. Chưa build APK hay chạy lại bộ test gameplay cho đợt tooling này.
