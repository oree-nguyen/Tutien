# Lâm Dật — trượng Hunyuan, cầm nắm và xuất hiện

Bản cập nhật dành cho **H01-C0 / Thanh Mộc Y**, dựa trên [prompt đã nhận](requests/H01-STAFF-ENTRANCE-LOADING.md). Tài liệu nhận được kết thúc giữa code block phần 2.2; không có phần hướng dẫn tiếp theo để suy diễn. Các tướng khác dùng renderer hiện có, mức medium trong sảnh; không tạo trước 12 model chi tiết cao.

## Asset thật

- Thân: [share của người dùng](https://3d.hunyuan.tencent.com/share?shareId=a93d658b-a40d-4854-b755-ad1fa9bcc79b), gốc 80.791.928 byte, 1.499.726 tam giác. Bản gốc giữ tại `.local/manual-assets/H01-C0-shared-original.glb`.
- Trượng: [share mới của người dùng](https://3d.hunyuan.tencent.com/share?shareId=4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6), gốc 50.401.568 byte, 619.640 tam giác, ba ảnh PBR nhúng. File gốc tại `assets/base_models/h01_moc_tinh_truong_raw.glb`, được bỏ qua trong Git; receipt SHA được lưu cạnh file.
- Hai model được giảm lưới/bake từ mesh gốc, không ghép primitive để thay thế. Raw nguồn không đóng vào APK. Việc bake/quantize/resize/WebP có mất dữ liệu; không nhận là giữ nguyên byte UV/texture của export gốc.
- Thân cao 1,82 m; trượng dài 2,0384 m = 1,12 × chiều cao. Cán đã đo trong vùng nắm rộng khoảng 3,94 cm. Pivot ở 62% chiều dài tính từ đế, đã dịch về tâm cán thật. `Staff_Base_Tip` lấy từ đỉnh thấp nhất của mesh; `Staff_Head_Core` là điểm gắn ánh sáng đầu trượng.
- Runtime dùng `public/models/h01-c0/` và `public/models/h01-staff/`. Bản high cho công cụ nhập nằm trong `assets/base_models/` đúng tên manifest. SHA/dung lượng từng LOD nằm trong hai `provenance.json`.

## Rig và cầm nắm

Humanoid có 52 xương: Hips, ba Spine, Neck/Head, Shoulders/Arms/ForeArms/Hands, ba đốt cho mỗi ngón của cả hai tay, chân/bàn chân/mũi chân. Kiểm thử đọc JOINTS/WEIGHTS từ GLB xác nhận 30 khớp ngón và hai mũi chân tác động lên đỉnh thật ở LOD cao. Không tạo node giải phẫu rỗng hoặc giả rằng đã tách sáu mesh Hồn Cốt.

Mỗi actor có skeleton/mixer độc lập. FK trong GLB gồm Idle, Run, Attack, Cast, Dash, Entrance. Q/W/E/R dùng chung động tác Cast; shader kỹ năng vẫn riêng. IK hai khớp điều khiển cổ tay, khuỷu, bàn chân và tay trái chạm sàn. Grip có pose khép ngón được bake; hiệu chỉnh IK ngón phù hợp cán thật, không chỉ xoay một node trượng bên ngoài bàn tay.

Tại mốc nắm, `Staff_Root` trở thành con trực tiếp của `RightHand_WeaponSocket`. Trượng cũ dựng bằng geometry và module base64 cũ đã được gỡ. Khi tải thất bại, sảnh báo lỗi và cho chạm Dật để thử lại; không tái tạo trượng cũ thay thế âm thầm.

Model thật có Hips ở 0,85 m khi đứng; giữ tỷ lệ này thay vì kéo dãn người tới ví dụ 0,98 m trong prompt. Hips khi xổm ở 0,48 m. Trang phục được skin mượt theo tay/chân; đây không phải cloth simulation. Chưa có tách sáu mesh giải phẫu hoặc thay Hồn Cốt trực quan hoàn chỉnh.

## Xuất hiện 4,2 giây

| Thời điểm | Hành động |
| --- | --- |
| 0–1,05 s | Pháp trận, bốn dây leo hình ống trồi lên, lá linh mộc; mở kén từ 0,70 s |
| 0,75–1,85 s | Model trồi lên trong tư thế xổm, tay phải bên hông, tay trái tiếp đất; ngẩng đầu từ 1,50 s |
| 1,85–2,65 s | Dây leo hội tụ/dissolve vào trục trượng, model trượng hiện bằng shader quét **chiều cao hình học**, không dựa UV atlas |
| 2,45–3,25 s | Đứng dậy, với tay; gắn socket và khép ngón tại **3,05 s / frame 183** |
| 3,25–4,20 s | Lấy đà, kéo trượng; đế tiếp đất tại **3,55 s / frame 213**, phát sóng/rễ/lá, rung camera 0,22 s và phản lực nhẹ; về Idle |

Timeline tính bằng thời gian thực, xử lý được frame bị bỏ qua. Các mốc logic không phụ thuộc việc thiết bị đạt 60 FPS. Vào sảnh/chọn lại Dật phát lại chuỗi. Đổi Toàn Thân/Cận Cảnh không reset pose; camera cận cảnh bám Head và có giới hạn trên mặt sàn. Góc toàn thân lùi nhẹ trong pha dây leo để giữ khung hình.

## Màu và ánh sáng

Renderer cũ đã dùng sRGB và GLTFLoader đã gán albedo sRGB; GLB H01 không có COLOR_0. Không nhận cả sáu giả thuyết trong prompt là lỗi đã tồn tại. Nguyên nhân đã đối chiếu là đèn map bị tắt khi ở sảnh, thiếu IBL cho vật liệu có metallic và normal bake quá mạnh ở cận cảnh.

`enhanceCharacterVisualFidelity` giữ albedo/emission sRGB, các map dữ liệu ở NoColorSpace, tắt vertex-color multiplication, giữ normal hợp lệ và UV seam, giảm normalScale còn 0,35. IBL PMREM/RoomEnvironment được tái sử dụng và gán cho material H01; ba đèn studio dùng layer riêng. Three r160 dùng ACES + exposure 1,35 trong sảnh H01. Không tô lại màu da bằng emission hoặc xóa metallic để giả ánh sáng.

## Tải và bộ nhớ

- Thân 60.000 / 9.000 / 900 tam giác; trượng 12.000 / 4.000 / 795. Meshopt + WebP, đủ albedo/normal/metallic-roughness nhúng.
- High thân: albedo 2048, normal/MR 1024; medium 512, low 256. Trượng 1024/512/256. Texture dùng chung giữa actor; skeleton và material instance tách riêng.
- Ngân sách texture RGBA + mip của riêng ba LOD thân/trượng vào khoảng 58 MiB nếu cùng resident; đây là ước tính texture, không phải đo tổng RAM/GPU game.
- IndexedDB giữ tối đa 12 buffer theo hash nội dung. Kiểm SHA trước parse; môi trường không có storage vẫn tải file đóng gói.
- Fetch bất đồng bộ, hàng đợi parse, Meshopt worker module riêng. Không dùng worker sinh từ `function.toString()`: cách đó đã gây lỗi `workerProcess is not defined` sau minify. Worker cũng được nhúng trong HTML standalone bằng Blob.
- Shader được compileAsync trước khi hiện model. Không dựng chiến trường trong lúc mở sảnh; chuẩn bị theo các task khi vào trận, trước khi trừ ví/trang bị. Service worker phục vụ cả URL model có query phiên bản khi offline.

## Build và nghiệm thu

```bash
npm test
npm run test:master
node --test tests/h01-refit.test.js tests/manual-hero.test.js
npm run android:apk
# Phục vụ dist tại cổng 5175 trước khi chạy hai bài browser:
GAME_URL=http://127.0.0.1:5175 node tests/h01-entrance-browser.mjs
GAME_URL=http://127.0.0.1:5175 node tests/manual-hero-browser.mjs
```

Browser kiểm các pha, tay trái chạm sàn, socket, trượng tiếp đất, Toàn Thân/Cận Cảnh, cache, reload offline, đổi tướng, vào trận, joystick và Linh Bộ. Kết quả/ảnh ở `docs/manual-assets/h01-entrance/` và `docs/manual-assets/h01-c0/`. APK phải khớp fingerprint nguồn, sáu SHA GLB và chữ ký APK trước.

**Giới hạn nghiệm thu:** browser chạy Chromium/SwiftShader trên CPU cloud. Chưa có thiết bị Android kết nối nên chưa xác nhận 60 FPS, độ nóng, RAM thực tế hoặc cảm ứng trên máy thật. Không coi việc nén file hay một ảnh chụp là chứng nhận 60 FPS.

## Tái tạo offline

```bash
python -B tools/tencent/fetch_hunyuan_share.py \
  --share-id 4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6 \
  --output assets/base_models/h01_moc_tinh_truong_raw.glb
blender -b --python tools/manual-assets/rig_h01.py
blender -b --python tools/manual-assets/prepare_staff.py -- \
  --source assets/base_models/h01_moc_tinh_truong_raw.glb \
  --output public/models/h01-staff
node tools/manual-assets/optimize_h01.mjs
```

Rig sử dụng ba LOD tĩnh đã bake trong `.local/manual-assets/static-lods/`; có thể tái tạo từ raw thân bằng `prepare_h01_trial.py` rồi mới gắn rig. Không rig một GLB đã có armature lần nữa. Không dùng MCP/GPU server hoặc phát sinh model AI mới trong quy trình này. Tải share chỉ ghi receipt sạch, không ghi signed download URL/token vào Git.
