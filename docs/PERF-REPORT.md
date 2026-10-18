# Báo cáo hiệu năng và APK — 2026-10-17

**Chưa đạt100%. Chưa kiểm chứng Android thật.** Hai lỗi offline đã có sửa và test tự động; pipeline/loader/warmup và atlas cố định đã chạy thật. Hai quyết định chất lượng/icon còn chờ người dùng. Không sửa bảng GDD, công thức, ví/kho/vault/HMAC hoặc reconnect online90s trong đợt tối ưu.

## Phép đo

Cùng production web, Chromium SwiftShader1280×760, balanced, profile lạnh, năm preview H01/H02/H05/H08/H11, đủ cửa sổ5giây. Một lượt mỗi mốc; kết quả có nhiễu software renderer, không phải thống kê/FPS/RAM Android. Raw data: perf-audit/baseline-balanced/report.json và perf-audit/final2-balanced/report.json. Lượt cuối dùng warmup chia lát4ms. Sau capture chỉ sửa hằng buildID khi xuất HTML standalone; không đổi thuật toán render. Vì vậy sourceHash trong raw benchmark là ac7dc406…; APK cuối có fingerprint mới cho script đóng gói, ghi bên dưới.

| Chỉ số | Trước | Sau atlas cố định |
|---|---:|---:|
| FCP balanced, ms |408|380|
| H01 sẵn sàng, ms |3703,0|4240,3|
| H01 max frame5s, ms |411,7|421,4|
| H02 max frame5s, ms |376,4|398,3|
| H05 max frame5s, ms |1974,5|1844,5|
| H08 max frame5s, ms |1116,8|827,1|
| H11 max frame5s, ms |830,7|593,1|
| Texture cuối workload, renderer.info |55|55|
| Geometry cuối workload |227|227|
| Draw call cuối workload |191|191|
| JS error / request ngoài |0 /0|0 /0|
| Atlas medium đồng bộ, max đo được |672,7ms|0,2ms tra cache|
| Lần đầu tải atlas H05/H08/H11 |sinh runtime|30,5 /43,9 /53,0ms async|
| Bốn GLB GPU tương ứng, byte |5741012|4476064|
| APK, byte |43878542|56278715|

Không có bằng chứng khởi động nhanh hơn hoặc đã hết khựng. Làm nóng đủ ảnh tăng thời gian chuẩn bị; công việc Canvas giảm rõ nhưng shader/geometry/render vẫn gây frame dài. APK tăng do thêm biến thể GPU, giữ GLB thường dự phòng và PNG fallback; giảm22,03% ở bốn file tương ứng không đồng nghĩa giảm tổngAPK. Không gọi số byte file hoặc số texture là số đo RAM/VRAM.

Atlas cố định giữ nguyên low64/medium256, năm kênh.120KTX2 tổng627528byte; có PNG fallback. Nhân vật GLB tối đa1024, vũ khí512. Chưa hạ texture động/skinning/clip. 14 GLB kiểm định lại toàn bộ bone, joint, morph, clip, channel, interpolation và giá trị keyframe;13 bản được đưa vào runtime.

## Kiểm chứng đã chạy

- `npm test`:128/128.
- `npm run test:master`:215/215.
- `npm run assets:verify`:9/9, gồm fixture animation/morph, cache/ownership và warmup.
- `npm run verify:master`:exit1, **BLOCKED0/37, NOT100%**. Các cổng bằng chứng tổng thể không được nới; test pass không thay thế bằng chứng thiết bị/mỹ thuật/đặc tả còn thiếu.
- `npm run build`:thành công, tài nguyên offline.
- `npm run android:apk`:thành công, APKdebug ký và kiểm SHA/provenance.
- APK zip có đủ13GLB tối ưu,120KTX2 atlas, BasisJS/WASM và buildID. SHA APK: `36ba7f1ad9f5776ff4c1ed4520ec602eb8d331e16f423905eca6a4899c481dd9`; source hash:`57530a0b5da01b9e90089d27a5966c5a5f2b3d93d679f338f26b19084d675598`.

Log thật ở perf-audit/final/. Các bài browser kết thúc sau build được bổ sung tại cùng thư mục. Chi tiết từng giai đoạn: PERF-BASELINE.md, PERF-PHASE-1.md đến PERF-PHASE-4.md, OFFLINE-BOOT-FIX.md.

## Cần điện thoại thật

Cài APK, kiểm mã bản ở sảnh. Bấm **ĐO HIỆU NĂNG → BẬT ĐO VÀ TẢI LẠI SẢNH** để bật `?perf=1` ngay trongAPK. Chọn lần lượt năm nhân vật/món có preview, mỗi lần đợi ít nhất5giây; mở cửa hàng/túi, chọn liên tiếp5món. Danh sách hiện dùng icon; nhiều Bổ phẩm chưa có model3D được duyệt nên không được coi thao tác icon là thử5preview3D khác nhau. Mở lại ĐO HIỆU NĂNG → LẤY BÁO CÁO, sao chép JSON từ ô đã chọn và ghi kèm model điện thoại, Android/WebView, mã bản, thao tác vào docs/perf-audit/device/. Chưa có log thiết bị thật và chưa được tuyên bố hết khựng trên điện thoại.

Thử thêm hai lỗi offline: bản đang dở phải đứng ở sảnh sau10giây, chỉ bấm Tiếp tục mới vào; thoát về sảnh rồi đóng/mởapp không còn bản ghi trận. Với v3 chỉ có biên nhận, bấm xác nhận bỏ trận theo luật hiện có; không tự xử lý lúc boot.

Browser trên build cuối:9 tình huống offline đều qua, gồm chặn model10giây vẫn đủ UI, không tự xử lý v3, xác nhận bỏ trận, chỉ nhận resume thật, lưu lỗi không hiện sảnh, clear đồng bộ trước sảnh và cleanup lỗi không chặn sảnh. Test render worker qua với FCP400ms; mục tiêuFCP<200ms **chưa đạt**. Không có task>150ms được observer ghi trong lượt đó; không đổi ngưỡng150ms. Ép503 KTX2 body/trượng: cả hai fallback GLB thường, đủ6clip, không page error.

## Đo ultra và thời gian GLB

Ultra H01 ready4575,5 →5075,5ms, FCP356 →304ms. Max frame H01/H02/H05/H08/H11: trước627,8 /660,2 /2058,0 /796,7 /705,2ms; sau579,4 /544,7 /1337,3 /817,0 /869,3ms. Số liệu có cả cải thiện và thoái lui, không đủ kết luận thiết bị thật. Raw: perf-audit/final2-ultra/report.json.

| GLB / quality | Load trước ms | Load sau ms |
|---|---:|---:|
| staff-medium /balanced |216.7|236.6|
| mobile /balanced |278.0|291.9|
| h02-hammer-medium /balanced |245.6|231.8|
| h02-body-medium /balanced |367.8|316.0|
| staff-high /ultra |596.8|626.5|
| high /ultra |562.4|694.5|
| h02-hammer-high /ultra |628.9|316.7|
| h02-body-high /ultra |657.2|375.6|

Load gồm fetch/cache và decode, không cộng với decode riêng. Số đếm texture/geometry không phải bộ nhớ byte. Atlas fixed low64/medium256 giữ nguyên kích thước; mặt/tóc/ring/beast và đường ultra2048 còn sinh runtime/cache ở các nhánh chưa bake. Chưa nhận toàn bộ giai đoạn4 là hoàn tất.

Kiểm thử artifact bổ sung: PWA reload rồi bắt đầu trận khi offline thành công; HTML standalone bắt đầu trận, không page error, không request tài sản ngoài. Chromium quản lý chặn file:// nên HTML được kiểm qua document response intercept, không nhận là đã thử file:// thực tế. Sửa hằng buildID của standalone để boot không truy cập import.meta.env chưa định nghĩa; không thay gameplay.
