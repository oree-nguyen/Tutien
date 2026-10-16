# Tạo asset thủ công trên web Hunyuan

Mở [Asset Sheet đầy đủ](hunyuan_asset_prompts.md), copy riêng prompt tiếng Anh của mục cần tạo. [Manifest](asset_manifest.json) chứa cùng nội dung, ID, tên GLB và dấu vết mã nguồn. Tất cả 227 mục đang là brief, chưa phải model đã tạo.

Ưu tiên H01-C0, H01-W0, H05-C0, H05-W0; sau đó các nhân vật/vũ khí gốc còn lại, Hoàn/Cốt, trang phục và vật mang chiêu thức. Nhóm môi trường/quái/địa hình được ghi thêm để không bỏ sót tài nguyên cảnh đang có. C0 và W0 là bản gốc; C1–C3 và W1–W2 là biến thể, không phải tướng mới.

Xuất GLB có texture nhúng và đặt đúng tên trong sheet vào `assets/base_models/`. Thư mục này là vùng nhận file, không được game tự nạp hoặc tự tin cậy. Nếu web xuất ZIP/OBJ/FBX thì nhập Blender, kiểm tra material/UV rồi export GLB; không đổi đuôi file để giả GLB.

```bash
python Prompt_Asset/inspect_base_models.py
python Prompt_Asset/inspect_base_models.py --require H01-C0 --require H05-C0
```

Lệnh đầu lập báo cáo file có mặt; 227 mục pending không phải lỗi khi chưa tạo. Lệnh có `--require` trả lỗi nếu các ID yêu cầu chưa có. Tên không khớp hoặc GLB hỏng được báo riêng. Báo cáo mặc định ở `.local/manual-assets/intake.json`. Kiểm tra này chỉ nhận dạng cấu trúc/ảnh nhúng và kênh texture thật; không chứng nhận chất lượng, giải phẫu, animation hoặc hiệu năng.

## Chuẩn bị Blender và cắt Hồn Cốt

Tên file chỉ nhận diện được nhân vật/vật phẩm; không thể suy ra chắc chắn đâu là đầu, ngón tay, khuỷu hoặc lớp áo từ mesh AI bất kỳ. Không dùng cắt theo chiều cao đơn giản rồi coi là phân đoạn giải phẫu đúng, đặc biệt với tay áo rộng, tóc dài, giáp hoặc tay dính thân.

1. Import GLB vào Blender, giữ một bản gốc không sửa. Kiểm tra đúng tướng, A-pose, số tay/chân/ngón, hướng trước và scale theo mét; kiểm tra mặt trước/sau/cận cảnh. Model H05 khoanh tay hoặc thiếu chân phải tạo lại.
2. Tách đúng các vùng trên mesh gốc bằng Edit Mode → chọn mặt → Separate Selection; giữ UV loop và material của các mặt. Không remesh/decimate trước khi có bản sao và so sánh UV/texture. Đặt origin ở khớp tương ứng, không di chuyển hình học ngoài ý muốn.
3. Đặt tên mesh có hình học thật: `HonCot_Dau`, `HonCot_Than`, `HonCot_TayTrai`, `HonCot_TayPhai`, `HonCot_ChanTrai`, `HonCot_ChanPhai`. Kiểm tra bên trái/phải theo chính nhân vật.
4. Hồn Khí và Ngoại phụ xuất/tạo riêng, gắn bằng điểm attachment; có thể dùng các Empty `HonKhi_VuKhi` và `HonCot_NgoaiPhu` làm socket. Empty là điểm gắn, **không phải bộ phận có model** và không thay cho sáu mesh cơ thể. Các món HB-01…07 là trang bị rời gắn lên cơ thể, không phải các vùng cắt của da/thân.
5. Nếu đã có segmented mesh, nhãn mặt và bản đồ nhãn/pivot được duyệt gắn SHA nguồn, có thể dùng bộ chuẩn hóa offline cũ: `python tools/tencent_3d_pipeline.py normalize source.glb segment.glb face_id.npy reviewed-part-map.json normalized.glb`. Lệnh này không gọi MCP hay dịch vụ GPU. Không tạo nhãn/ngữ nghĩa giả chỉ dựa vào tên file. Luồng manual không đòi phải có P3-SAM/X-Part để nhập file.
6. Export GLB với texture nhúng, kiểm tra lại trong Blender và trong game. UV/ảnh phải khớp trước/sau; nếu Blender re-encode ảnh, kiểm tra nội dung giải mã chứ không tự khẳng định giữ nguyên byte. Chỉ tích hợp sau khi kiểm tra rig, animation, skin, LOD và hiệu năng.

## VFX

GLB chỉ là vật mang tĩnh: lá/đằng, phiến kính, lông vũ, gai băng, phiến giáp, mảnh trăng, vảy rắn… Shader/hạt làm glow, fade, lightning, trail, shockwave, vòng aim và chuyển động. Không tạo mesh đặc kín thay vùng đánh hoặc mô hình cứng thay làn khói. Các prop dành riêng Q/W/E/R/F là brief mỹ thuật mới cho kỹ năng có thật, chưa phải model riêng hiện hữu trong renderer. Phân thân Hồ Ảnh tái sử dụng H03, không sinh một người khác. F có 12 gợi ý phong cách nguyên tố nhưng có thể dùng chung một mesh trail và đổi material.

## Cập nhật danh mục

Chạy `node Prompt_Asset/generate_asset_sheet.mjs` tại gốc repo. Script đọc trực tiếp HEROES/SKILLS/COSTUMES/appearance/weapon specs và đối chiếu SHA inventory cảnh cũ; dừng nếu nguồn thay đổi mà inventory chưa được rà lại. Không gọi mạng, MCP hoặc sinh model. `docs/hunyuan_asset_prompts.md` là đường dẫn vào sheet chính.
