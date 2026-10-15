# Goal PBR / Smooth Skillshot / Auto Farm V2.5

Nguồn: [đặc tả trực tiếp ngày 15/10/2026](requests/PBR-SKILLSHOT-AUTOFARM-V2.5.md). Đợt này sửa mặt/UV, nâng vật liệu và cảnh quan, thêm điều khiển kỹ năng mượt và Auto Farm qua hành động gameplay. Không thay dữ liệu GDD, quyền máy chủ hoặc các goal trước.

Điều kiện hoàn tất: toàn bộ 24 mục dưới đây đạt với mã nguồn và bằng chứng hiện hành, đồng thời `verify:reuse` và các goal gốc vẫn đạt. `node scripts/verify-overhaul.mjs` xuất `acceptance/evidence/overhaul-prompt.json` và chỉ exit 0 khi đủ 24 mục. Bộ tiêu chí máy đọc được ở [overhaul-requirements.json](../acceptance/overhaul-requirements.json).

## Phạm vi 24 tiêu chí

| ID | Điều kiện đạt |
| --- | --- |
| AV01 | Mặt 2048, UV mặt trước ±65°, clamp/flipY/SRGB đúng; không có sọc tóc giữa mặt; mắt, môi và mũi đủ các lớp chi tiết. |
| AV02 | Bỏ mã H01–H12 ở sảnh; toast ở 14px, z-index 9999, không chặn chạm và mờ sau 2,2 giây; gương H05 bay lệch phải/phía sau, transmission 0,85, iridescence 1 và viền trăng/mây. |
| AV03 | Năm map gấm lụa 2048 có dữ liệu thật và đồng bộ; bốn motif đúng 12 tướng; có micro-weave, ombre, thêu kim loại và relief; sheen 0,85/0,25, cổ chữ Y, đai, ngọc bội và hai tua. |
| AV04 | Giáp/vũ khí dùng nội dung PBR thật trên material đang hiển thị; không lấy tên map hoặc metadata làm bằng chứng chất lượng. |
| AV05 | Tóc có normal/bump sợi, anisotropy và sheen; cache/LOD chia sẻ và hạ atlas, không tạo bộ 2048 cho 100 actor ở xa. |
| EV01 | Bảy biome có nội dung PBR khác nhau; bản production 2048, repeat 24 và anisotropy thực; đóng gói roughness/height; chỉ giữ 1–2 bộ biome độ phân giải cao thường trú và giữ nguyên tọa độ/collision/realm. |
| EV02 | Cổng có 3 bậc, 8 đèn, 4 trụ, tia nối, vortex và cột sáng đổi theo trạng thái; shop có mái, ngói, cột, đèn và lò khói; tế đàn có 9 rãnh trong scene đang chạy. |
| EV03 | Bốn loài và ba Boss gốc có texture, khớp và hoạt ảnh riêng; chim lửa có 12 lông mỗi cánh, 3 đuôi và tàn lửa; bướm có cánh pha lê; sói/tê giác có bốn chân. |
| EV04 | Có 12 VFX nguyên tố với shader khác nhau; Hoàn tím/đen và văn tự/aura dưới chân, sau lưng lấy từ trang bị thật. |
| SC01 | Hai pointer trái/phải độc lập; pointer capture và touch-action hoạt động; ngón thứ 3 không chiếm điều khiển; có thể chạy và ngắm đồng thời. |
| SC02 | One-Euro và alpha theo `dt`, azimuth, deadzone 10px và bán kính kéo 75px; hội tụ hữu hạn ở bước 1/60 và 1/120 giây; không nhận đây là FPS đo trên thiết bị. |
| SC03 | Decal phạm vi/đường thẳng/hình quạt/AOE/khóa mục tiêu hoặc bản thân, chevron, quỹ đạo, tether và hit preview dùng hitbox/range/shape gốc; cao hơn đất 0,06 m và khớp cast thật. |
| SC04 | Bấm nhanh 160ms/10px; chọn mục tiêu hợp lệ theo AOI/realm/chế độ; dẫn mục tiêu bằng `velocity × distance / projectileSpeed × 0,65`; có hướng di chuyển làm fallback. |
| SC05 | Hủy chiêu chuyển đỏ, bán kính 75px, có rung và xử lý mất capture; không tốn MP/CD; queue có TTL 0,25 giây, CD ≤ 0,20 giây và backswing ≤ 0,25 giây; thi triển đúng lúc, không sửa luật server. |
| AI01 | HUD có OFF/PVE/FULL và 6 tùy chỉnh; mặc định giữ R; PvE giữ R/F và cảnh báo tướng địch trong 18 m. |
| AI02 | Chấm utility mỗi 0,25 giây, đúng điểm/range/HP/Lv; chỉ dùng mục tiêu nhìn thấy và cùng realm, không dựng tọa độ địch bị giấu. |
| AI03 | Có 12 combo qua `skillFor`/`Match.cast`, giữ 25% mana và các luật MP/CD/CC gốc; hồi máu/tuyệt kỹ đúng điều kiện. |
| AI04 | Thả diều, xoay quanh mục tiêu và cận chiến đúng khoảng cách; tránh collision, Hồn Chướng và telegraph; chế độ Toàn diện rút lui/đánh trả hợp lệ. |
| AI05 | Nhặt theo thứ tự chất lượng và UUID, thẩm định đồ quý trong 0,8 giây; không vượt 24 ô/48W, không nhặt sai realm hoặc cướp đồ khóa đội. |
| AI06 | Có 12 preset qua shop/thương nhân, 7 công thức và 7 ô thật; trừ BROUGHT trước EARNED; chặn mismatch của cả món đích lẫn nguyên liệu và hiển thị món bị chặn. |
| AI07 | Hấp thu tại tế đàn đủ 8 giây; chế độ Toàn diện rút khi đạt 40W hoặc mốc phút 15/20; giữ luật Cổng, overtime, tải và Hoãn Nhân Hồi qua hành động gốc. |
| AI08 | Giữ joystick/kỹ năng dừng AI ngay; chờ 1,2 giây sau khi nhả pointer cuối mới tiếp tục; không tự sửa vị trí, tiền hoặc trang bị. |
| PK01 | Web/PWA/HTML offline có artifacts đạt; APK đã ký khớp mã nguồn, dung lượng, SHA và provenance. |
| VF01 | Nghiệm thu mỹ thuật đầy đủ cho mọi nhân vật, vũ khí, skin, trang phục, Hồn thú và biome cùng các thay đổi đợt này; có reviewer/ảnh/SHA; không tự duyệt theo số map hoặc đa giác. |

## Bằng chứng và ranh giới

Mọi gate kỹ thuật đều cần `master-rules.json` và `overhaul-browser.json` có `passed: true`, cùng `sourceHash` hiện hành. Browser còn phải có `sourceHashStart`/`sourceHashEnd` cùng fingerprint, `actualGPUNoGLError: true` và hai danh sách `errors`/`shaderErrors` rỗng. Các cờ từng gate nằm trong `browserChecks` của JSON; cờ chưa được kiểm tra hoặc bằng chứng cũ giữ trạng thái BLOCKED.

Unit chứng minh thuật toán và state machine bằng `Match` thật: utility/visibility, 12 combo, dự trữ mana, thả diều/né nguy hiểm, 24 ô/48W, hấp thu đủ 8 giây tại tế đàn, 12 preset/7 công thức và cơ chế Cổng. Browser phải chứng minh module đã nối với HUD/actions, di chuyển, cast, loot, shop, Cổng và GPU thật. Không bắt một bài UI lặp lại mọi nhánh thuật toán; cũng không suy ra shader/vật liệu đạt từ unit hoặc một cờ GL chung.

Những cờ GPU chuyên biệt cần có trong báo cáo browser:

- `armorWeaponPBRContent`, `characterPBRCacheLODLive`.
- `shopAndAltarDetailedLiveMeshes`, `creaturePBRAndArticulationLive`, `allTwelveElementVFXAndRingTiers`.
- `fourDecalKindsAndHitPreview`.

EV03/EV04 có đường review sự hiện diện kỹ thuật thay thế cờ riêng: `art-gallery.json` đạt, cùng fingerprint ở đầu–cuối và toàn bộ ảnh đúng SHA; `overhaul-art-review.json` đạt, cùng mã nguồn, reviewer không rỗng, `approvedSections` chỉ có quyền duyệt EV03/EV04 và danh sách `images` chứa `{path, sha256}` hợp lệ. Vẫn cần bộ logic và lượt browser thực hiện hành. Review này không có quyền duyệt VF01, dữ liệu gốc hoặc thiết bị.

PK01 đọc `artifacts.json` đạt, cùng mã nguồn và `release/build-provenance.json`: `sourceHash`, `signed: true`, `apkBytes` và `apkSha256` phải trùng chính tệp APK cài thử. Provenance không thay việc nghiệm thu Android.

VF01 chỉ có đường qua `master-full-art-review.json` đạt, cùng mã nguồn: reviewer không rỗng, `fullArtFidelity: true`, `approvedSections` có AR01, các checks `allAngles`/`animation`/`cosmetics`/`detailFidelity`/`overhaulVisualFidelity` đều đúng và mọi ảnh có SHA khớp. `reviewedCounts` phải có ít nhất 12 `heroes`, 12 `weapons`, 24 `weaponSkins`, 48 `costumes`, 7 `creatures` và 7 `biomes`. Đây là yêu cầu review thực, không phải báo cáo mẫu để đánh dấu đạt. Hiện chưa có bằng chứng nghiệm thu đầy đủ cho đợt nâng cấp nên **VF01 giữ BLOCKED**.

## Các phần vẫn chờ và điều kiện dùng lại

Worker tạo texture nền đã được kiểm thử về nội dung buffer, phản hồi, hủy, hàng đợi, cache và xử lý lỗi. Lượt WebGL hiện hành đạt các phép kiểm tra PBR bảy vùng và sinh atlas 2048; gallery từng vùng chờ đúng atlas từ Worker trước khi chụp. Xem [overhaul-browser.json](../acceptance/evidence/overhaul-browser.json) và [art-gallery.json](../acceptance/evidence/art-gallery.json). Kết quả này không chứng minh đã giải quyết mọi nghẽn luồng chính hoặc đạt FPS trên thiết bị. Residency/LOD được kiểm tra riêng, không thay phép đo trên Android.

APK hiện là bản debug để cài thử. Kiểm thử toán ở 60/120Hz và Chromium/SwiftShader không chứng nhận 60/120 FPS trên điện thoại. Không thêm hoặc gỡ gate thiết bị: DV01/DV02/SE07, ART10/HUD09/DEVICE01/DEVICE02 và các gate GDD/Master trước tiếp tục bắt buộc theo schema gốc. Phép đo FPS vẫn cần ít nhất 60 giây cho **mỗi cảnh** thường và giao tranh.

Theo quyết định đã xác nhận của người dùng, Boss thứ tư và bảng chỉ số/độ bền Tiên khí tiếp tục chờ đặc tả gốc. Không tự thêm tên/chỉ số hoặc điều chỉnh luật để ép đạt preset. Goal đợt này không cấp quyền gắn nhãn hoàn tất 100% khi bất kỳ gate cũ hoặc VF01 còn bị chặn.


## Kết quả hiện hành — 15/10/2026

Nguồn `81d3ba9e18907ceb62fa6c4cd29bc019fe2a3bfbf9a92f24cabead5e0d0a11d0`: **23/24** tiêu chí có bằng chứng; **chưa đạt100%**. Các mục còn mở: VF01. Xem [VALIDATION.md](VALIDATION.md) và báo cáo JSON. Số gate không phải phần trăm chất lượng hoặc tiến độ sản phẩm.
