# Ma trận đối chiếu đầy đủ hai tài liệu Gemini và hoạt ảnh hiện tại

Ngày kiểm tra: **2026-10-21 UTC**. Phạm vi: **chỉ kiểm tra, chưa sửa**. Bản đối chiếu là commit `bb68cf31f1a574487f701c4fe7f1b846da0f43ec`, APK `2.5.ba97bec3`.

**Kết luận: chưa giống đầy đủ hai tài liệu Gemini và chưa đủ điều kiện nghiệm thu rig/animation.** Có đồng hồ Entrance 3 giây và các nhóm pha, nhưng H01 thiếu đỉnh bật lên/nhún tiếp đất, crouch và chiều cao kết thúc khác; H02 nắm chùy muộn, không giữ tay trái từ lúc đáp theo DOCX. Những vấn đề bề mặt còn phải đọc cùng báo cáo đo skin, vì xương giữ chiều dài không đồng nghĩa mesh giữ hình dạng.

Tài liệu này bóc tách yêu cầu nguồn và dấu vết builder. Nó **không** coi một bảng tọa độ hay phép kiểm quaternion là chứng minh mỹ thuật. Kết quả ảnh/đo bề mặt và đường chạy APK nằm ở [báo cáo chính](README.md), [MOTION-MATH.md](MOTION-MATH.md), [RUNTIME-AND-PROVENANCE.md](RUNTIME-AND-PROVENANCE.md). Không có điện thoại Android thật trong lượt kiểm này.

## 1. Độ đầy đủ của tài liệu đầu vào

Đã đối chiếu toàn bộ đoạn văn bản không rỗng trong XML DOCX với bản Markdown đầy đủ, sau khi chuẩn hóa khoảng trắng và ký tự ngăn bảng. Số đoạn có mặt chỉ chứng minh không bỏ sót văn bản khi trích xuất; không chứng minh mọi con số Gemini đúng vật lý hoặc mọi nét trong ảnh đã được OCR/định lượng. Các ảnh gốc đã được lưu riêng trong sổ ảnh conver10.

| Nguồn | SHA-256 DOCX | Byte | Đoạn có chữ | Bảng / hàng / ô | Đoạn vắng trong MD | Ảnh gốc |
| --- | --- | ---: | ---: | --- | ---: | ---: |
| [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md](../../requests/gemini-animation-2026-10-21/Lam-Dat.md) | `d29514af20f7d2665aa480fd595eed759125622c4349e5eb166ff877f30df629` | 10,526,304 | 942 | 12 / 143 / 894 | 0 | 7 |
| [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md](../../requests/gemini-animation-2026-10-21/Chuy-175m.md) | `c729606f4dda827343e07ca5b655e17ea31ff4e77a9d99d353941558cdcedeea` | 8,360,920 | 784 | 11 / 120 / 738 | 0 | 7 |

Nguồn máy đọc cho toàn bộ yêu cầu và bảng: [requirements.json](requirements.json). Có **65 yêu cầu tường thuật**, **23 bảng**, **244 hàng dữ liệu trích xuất** ngoài header; tổng hàng XML gốc có cả header là 263. Header/ô gộp được giữ tại nguồn đầy đủ nên hai cách đếm có ý nghĩa khác nhau.

## 2. Hệ quy chiếu và cách đọc kết luận

- Nguồn Blender: +Z lên, mặt nhân vật hướng −Y. Dữ liệu Three đã chuẩn hóa: `(x,y,z)Blender → (x,z,−y)Three`.
- Đối diện nhân vật: **tay phải giải phẫu nằm phía trái ảnh**; tay trái giải phẫu nằm phía phải ảnh. Không dùng “tay trái ảnh” thay cho tên xương.
- Phải bỏ yaw/translation/scale bày sảnh trước khi so mét trong tài liệu. Scale bày sảnh không phải chiều cao cơ thể.
- `CODE_DEVIATION` là bằng chứng logic/key target khác nguồn. `NOT_ESTABLISHED` không có nghĩa đã đo và thấy lỗi; nghĩa là chưa đủ bằng chứng để xác nhận đạt.
- `REFERENCE_CONFLICT` là xung đột bên trong tài liệu, không miễn trừ các lỗi rig đang thấy. Không kéo xương hoặc scale vũ khí để làm một bảng sai toán học “pass”.
- Không tính phần trăm đạt từ số test, số file hay số yêu cầu. Cấu trúc clip có thể pass trong khi skin méo nghiêm trọng.

## 3. Ma trận 65 yêu cầu

Các mục sau ghi nguyên ID ổn định để đối chiếu máy đọc; các nhận định kỹ thuật Fxx được giải thích đầy đủ ở phần 4. Thông số mục tiêu luôn là của nguồn, không phải số đo runtime nếu không ghi rõ. Các yêu cầu đo mesh được dẫn sang báo cáo số đo thay vì giả kết quả.

### Yêu cầu chung và kiểm định

#### C-001 · all

Ba khung 0–.75 / 1–1.58 / 2.42–3 phải giữ ý nghĩa, không tự biến thành tên clip3s là đạt.

**Nhận định:** Một phần cấu trúc đã có; chưa đạt nội dung chuyển động (`PARTIAL_STRUCTURE`).

**Nguồn:** Nguồn LD48–54;CH46–52. Các pha nối .76–1 và1.6–2.42 cũng bắt buộc.

**Khoảng thời gian:** `[0, 3]` giây.

- **F01:** Player báo cáo có Entrance 3s, Idle_Hold 4s, dữ liệu lấy mẫu 60Hz; sample 120Hz là nội suy, không phải số đo FPS. Các điểm kiểm: [src/report-entrance.js:15](../../../src/report-entrance.js#L15), [tools/rig/build-report-entrances.mjs:403](../../../tools/rig/build-report-entrances.mjs#L403), [src/report-entrance.js:120](../../../src/report-entrance.js#L120).

#### C-002 · all

Chuyển Blender world (x,y,z) sang Three normalized(x,z,-y); tách giải phẫu phải/trái với phía ảnh.

**Nhận định:** Cần đo trên rig/mesh thực; không suy ra PASS từ code (`MEASUREMENT_REQUIRED`).

**Nguồn:** Nguồn LD18–36;CH18–36. Không lấy tọa độ đã nhân scale2.4 và root xoay sảnh so trực tiếp.

**Mục tiêu được trích:**

```json
{
  "B_to_T": "(x,z,-y)",
  "right_anatomical_front_view": "-X",
  "left_anatomical_front_view": "+X"
}
```

- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).

#### C-003 · rig

Giữ chiều dài cơ thể, tỷ lệ và hình dạng skin; không kéo xương để khớp bảng tự mâu thuẫn.

**Nhận định:** Cần đo trên rig/mesh thực; không suy ra PASS từ code (`MEASUREMENT_REQUIRED`).

**Nguồn:** Nguồn LD58–82,154;CH56–70. Không có key scale chỉ loại được một dạng stretching, không loại được skin shear/candy wrapper.

- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).
- **F22:** Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40).

#### C-004 · hands

Đủ30 đốt ngón có chuyển động thực; tay nắm bao cán, tay tự do buông tự nhiên, không xuyên vật thể.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### C-005 · all

Euler/quaternion trong tài liệu chỉ dùng sau khi xác định rest matrix, bone roll, thứ tự rotation và hệ local/world tương thích.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** Nguồn LD118–142,168–193,297;CH108–132,158–178,264. Không coi ví dụ bpy là lệnh đúng cho skeleton hiện tại.

- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).

#### C-006 · runtime

Kiểm đúng model đang render ở chế độ mặc định, hoạt ảnh động, toàn thân/cận mặt và combat; không dùng cảnh mesh tĩnh gốc để nghiệm thu rig.

**Nhận định:** Các đường render/runtime khác nhau (`RUNTIME_PATH_DIFFERS`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

**Khoảng thời gian:** `[3, None]` giây.

- **F19:** Sau entrance>=3s, chế độ mặc định preview không bật previewAnimation chuyển về body GLB gốc tĩnh (và vũ khí gốc). Do đó cảnh nhìn sau intro có thể không phải mesh đang được report player pose. Các điểm kiểm: [src/manual-hero.js:28](../../../src/manual-hero.js#L28), [src/manual-hero.js:164](../../../src/manual-hero.js#L164), [src/manual-h02.js:16](../../../src/manual-h02.js#L16), [src/world.js:497](../../../src/world.js#L497).
- **F20:** Report Entrance hiện chỉ tích hợp nhánh preview. Combat H01/H02 tiếp tục dùng clip/IK cũ; H02 combat vẫn poseRightHand, khác report chọn cầm trái. Không thể ngoại suy nghiệm thu entrance sang run/attack/cast/dash. Các điểm kiểm: [src/manual-hero.js:181](../../../src/manual-hero.js#L181), [src/manual-h02.js:98](../../../src/manual-h02.js#L98).

#### C-007 · all

Đánh giá đủ mặt trước, bên, sau,3/4 và mặt/ngón/áo; hình tham chiếu là dữ liệu bổ sung, không chứng minh hệ khớp số học.

**Nhận định:** Cần đo trên rig/mesh thực; không suy ra PASS từ code (`MEASUREMENT_REQUIRED`).

**Nguồn:** H01/H02 mỗi tài liệu7 ảnh đã lưu trong docs/requests và picture/conver10. Báo cáo này không tạo ảnh mới.

- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).
- **F22:** Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40).

#### C-008 · scope

Chỉ lập báo cáo; không tự sửa animation/rig, không xuất APK mới trước duyệt.

**Nhận định:** Giữ đúng phạm vi chỉ kiểm tra (`SCOPE_HELD`).

**Nguồn:** Yêu cầu mới nhất của người dùng ưu tiên hơn các yêu cầu trước về tự làm tiếp.

#### V-001 · validation

Lấy mẫu mọi frame và quanh keycontacts trên mesh thật:worldlandmarkerror,quaterniondelta,bone-lengthratio,tangent/normalflip,strain/skinfold.

**Nhận định:** Xem kết quả đo độc lập trong các báo cáo đi kèm (`PENDING_MEASUREMENT`).

**Nguồn:** Giữ nguyên mọi ngưỡng verify; xác định từng metric thực đo,không gọi ratio xương=1 là hết strain.

**Khoảng thời gian:** `[0, 3]` giây.

- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).
- **F22:** Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40).

#### V-002 · validation

Đo minfinger/shaftsigneddistance,gripcoverage,cổtay/áo,head/weaponclearance,groundpenetration/toegap và plantedfootdrift.

**Nhận định:** Xem kết quả đo độc lập trong các báo cáo đi kèm (`PENDING_MEASUREMENT`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

**Khoảng thời gian:** `[0, 3]` giây.

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### V-003 · validation

Xác minh thời điểm VFX từ geometry tiếp xúc thật;camera shot,khối lượng/anticipation/followthrough vàsilhouette so3khung.

**Nhận định:** Xem kết quả đo độc lập trong các báo cáo đi kèm (`PENDING_MEASUREMENT`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

**Khoảng thời gian:** `[0, 3]` giây.

- **F15:** H01 VFX vẫn dùng remap timeline cũ, shader morph dây leo về một trục cố định(-.38,...,.12), không chạy theo trục trượng mới được snap theo tay. Các điểm kiểm: [src/h01-entrance.js:13](../../../src/h01-entrance.js#L13), [src/h01-entrance.js:49](../../../src/h01-entrance.js#L49), [src/report-entrance.js:43](../../../src/report-entrance.js#L43), [src/manual-hero.js:126](../../../src/manual-hero.js#L126).
- **F16:** H01 dùng sóng, sigil và 64 lá, growth hoàn tất sau mốc.75 mới; không thấy bộ phát120 viên đá/thông số6branch Gemini trong module này. Các điểm kiểm: [src/h01-entrance.js:60](../../../src/h01-entrance.js#L60), [src/h01-entrance.js:78](../../../src/h01-entrance.js#L78).
- **F17:** H02 VFX remap từ timeline cũ, impact định vị cố định (0,0,.38),stamp(-.43,0,-.2334),32 spark/impact. Không gắn emitter vào tiếp xúc đáy đầu chùy thực; branch report đặt cameraShake=0. Các điểm kiểm: [src/h02-entrance.js:25](../../../src/h02-entrance.js#L25), [src/h02-entrance.js:37](../../../src/h02-entrance.js#L37), [src/manual-h02.js:73](../../../src/manual-h02.js#L73).
- **F18:** Camera sảnh dùng preset toàn thân/cận cảnh chung; không có chuỗi camera riêng từ góc oblique Khung1 sang front Khung2 theo DOCX H02. Các điểm kiểm: [src/world.js:493](../../../src/world.js#L493), [src/world.js:518](../../../src/world.js#L518).

#### V-004 · validation

Đánh giáDefault/staticlobby,Animatedlobby,Replay,run/attack/cast/dash;face/fullbodykhông đánh tráo mesh.

**Nhận định:** Xem kết quả đo độc lập trong các báo cáo đi kèm (`PENDING_MEASUREMENT`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

**Khoảng thời gian:** `[0, None]` giây.

- **F19:** Sau entrance>=3s, chế độ mặc định preview không bật previewAnimation chuyển về body GLB gốc tĩnh (và vũ khí gốc). Do đó cảnh nhìn sau intro có thể không phải mesh đang được report player pose. Các điểm kiểm: [src/manual-hero.js:28](../../../src/manual-hero.js#L28), [src/manual-hero.js:164](../../../src/manual-hero.js#L164), [src/manual-h02.js:16](../../../src/manual-h02.js#L16), [src/world.js:497](../../../src/world.js#L497).
- **F20:** Report Entrance hiện chỉ tích hợp nhánh preview. Combat H01/H02 tiếp tục dùng clip/IK cũ; H02 combat vẫn poseRightHand, khác report chọn cầm trái. Không thể ngoại suy nghiệm thu entrance sang run/attack/cast/dash. Các điểm kiểm: [src/manual-hero.js:181](../../../src/manual-hero.js#L181), [src/manual-h02.js:98](../../../src/manual-h02.js#L98).

#### V-005 · Android

Không gọi60/120Hz sampling là60/120FPS APK;chưa có Android thật để nghiệm thu GPU/input/animation.

**Nhận định:** Chưa kiểm chứng trên Android thật (`NOT_DEVICE_VERIFIED`).

**Nguồn:** Yêu cầu kiểm định chung của nhiệm vụ; không phải một hàng riêng trong DOCX.

- **F01:** Player báo cáo có Entrance 3s, Idle_Hold 4s, dữ liệu lấy mẫu 60Hz; sample 120Hz là nội suy, không phải số đo FPS. Các điểm kiểm: [src/report-entrance.js:15](../../../src/report-entrance.js#L15), [tools/rig/build-report-entrances.mjs:403](../../../tools/rig/build-report-entrances.mjs#L403), [src/report-entrance.js:120](../../../src/report-entrance.js#L120).

### Lâm Dật — dây leo, trượng, tay phải nắm

#### H01-001 · camera

Camera chuẩn front Blender(.10,-3.80,1.05),Euler(88,0,0); bố cục trượng trái/nhân vật phải.

**Nhận định:** Camera không theo bố trí của tài liệu (`NOT_SAME_CAMERA`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:28](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L28), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:36](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L36)

- **F18:** Camera sảnh dùng preset toàn thân/cận cảnh chung; không có chuỗi camera riêng từ góc oblique Khung1 sang front Khung2 theo DOCX H02. Các điểm kiểm: [src/world.js:493](../../../src/world.js#L493), [src/world.js:518](../../../src/world.js#L518).

#### H01-002 · K1

Không có nhân vật trên mặt đất; ẩn cả body/phụ kiện liên quan trước khi trồi. Không bắt buộc dùng scale0 nếu visibility tương đương an toàn.

**Nhận định:** Một phần cấu trúc đã có; chưa đạt nội dung chuyển động (`PARTIAL_STRUCTURE`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:48](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L48), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:50](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L50), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:88](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L88), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:92](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L92)

**Khoảng thời gian:** `[0, 0.75]` giây.

**Mục tiêu được trích:**

```json
{
  "hiddenUntil": 0.766666667
}
```

- **F12:** Cờ gripped H01=2.2,H02=1.6; flags landed chỉ xét thời gian>=1. SkinnedMesh hiện từ .766666667; H01 vũ khí hiện từ1.6, H02 vũ khí luôn hiện. Cờ thời gian không phải kiểm tiếp xúc mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:31](../../../tools/rig/build-report-entrances.mjs#L31), [tools/rig/build-report-entrances.mjs:52](../../../tools/rig/build-report-entrances.mjs#L52), [src/report-entrance.js:135](../../../src/report-entrance.js#L135), [src/report-entrance.js:146](../../../src/report-entrance.js#L146).

**Giới hạn diễn giải:** Chỉ SkinnedMesh được toggle trong player; phải đo các mesh tách/phụ kiện có lộ trước thời điểm không.

#### H01-003 · K1

Đúng6 nhánh dây leo gai tự nhiên, hướng chéo trái-dưới→phải-trên; bảng chi tiết chỉ có5 nhánh.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:88](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L88), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:93](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L93), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:94](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L94), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:95](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L95), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:96](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L96), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:97](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L97)

**Khoảng thời gian:** `[0, 0.75]` giây.

**Mục tiêu được trích:**

```json
{
  "requiredBranches": 6,
  "tabulatedBranches": 5
}
```

- **F15:** H01 VFX vẫn dùng remap timeline cũ, shader morph dây leo về một trục cố định(-.38,...,.12), không chạy theo trục trượng mới được snap theo tay. Các điểm kiểm: [src/h01-entrance.js:13](../../../src/h01-entrance.js#L13), [src/h01-entrance.js:49](../../../src/h01-entrance.js#L49), [src/report-entrance.js:43](../../../src/report-entrance.js#L43), [src/manual-hero.js:126](../../../src/manual-hero.js#L126).
- **F16:** H01 dùng sóng, sigil và 64 lá, growth hoàn tất sau mốc.75 mới; không thấy bộ phát120 viên đá/thông số6branch Gemini trong module này. Các điểm kiểm: [src/h01-entrance.js:60](../../../src/h01-entrance.js#L60), [src/h01-entrance.js:78](../../../src/h01-entrance.js#L78).

#### H01-004 · K1

Từng nhánh có root/mid/tip/velocity và độ cao.52–1.72m như Bảng5, có nhánh hậu cảnh và nhánh đối trọng.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:93](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L93), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:94](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L94), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:95](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L95), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:96](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L96), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:97](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L97)

**Khoảng thời gian:** `[0, 0.75]` giây.

- **F15:** H01 VFX vẫn dùng remap timeline cũ, shader morph dây leo về một trục cố định(-.38,...,.12), không chạy theo trục trượng mới được snap theo tay. Các điểm kiểm: [src/h01-entrance.js:13](../../../src/h01-entrance.js#L13), [src/h01-entrance.js:49](../../../src/h01-entrance.js#L49), [src/report-entrance.js:43](../../../src/report-entrance.js#L43), [src/manual-hero.js:126](../../../src/manual-hero.js#L126).
- **F16:** H01 dùng sóng, sigil và 64 lá, growth hoàn tất sau mốc.75 mới; không thấy bộ phát120 viên đá/thông số6branch Gemini trong module này. Các điểm kiểm: [src/h01-entrance.js:60](../../../src/h01-entrance.js#L60), [src/h01-entrance.js:78](../../../src/h01-entrance.js#L78).

**Giới hạn diễn giải:** Mỗi tọa độ giữ nguyên trong phụ lục H01-T05; chưa đo6 trung tuyến trên mesh VFX hiện tại.

#### H01-005 · K1

120 mảnh đá góc cạnh+dust,radius.45,height1.65,v(±1.4,-.85,3.2),turbulence1.8.

**Nhận định:** Không được thực hiện theo đặc tả này (`NOT_IMPLEMENTED_AS_SPECIFIED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:98](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L98)

**Khoảng thời gian:** `[0, 0.75]` giây.

- **F16:** H01 dùng sóng, sigil và 64 lá, growth hoàn tất sau mốc.75 mới; không thấy bộ phát120 viên đá/thông số6branch Gemini trong module này. Các điểm kiểm: [src/h01-entrance.js:60](../../../src/h01-entrance.js#L60), [src/h01-entrance.js:78](../../../src/h01-entrance.js#L78).

#### H01-006 · emerge

Bật hiện tại F46, vọt lên đỉnh pelvis.780 tạiF52 rồi đáp pelvis.520 tạiF60.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:51](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L51), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:104](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L104), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:268](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L268), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:269](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L269), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:270](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L270)

**Khoảng thời gian:** `[0.766666667, 1]` giây.

**Mục tiêu được trích:**

```json
{
  "pelvisZatF46": 0.15,
  "apexZatF52": 0.78,
  "landingZatF60": 0.52
}
```

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F03:** H01 trước 1s cộng -0.5*(1-smooth(.766666667,1,t)) vào Hips Y: chỉ đi lên đơn điệu tới .43; không có đỉnh .78m rồi đáp xuống .52. H02 cộng +1.5 theo cùng smooth và X-=1.1*(1-arrival), không phải điểm xuất phát DOCX (-.04,+.02,2.4). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440), [tools/rig/build-report-entrances.mjs:443](../../../tools/rig/build-report-entrances.mjs#L443), [tools/rig/build-report-entrances.mjs:444](../../../tools/rig/build-report-entrances.mjs#L444).

#### H01-007 · landing

Nhún giảm chấn ở1.08:pelvis.495,headbase1.122,tay vàvòm dây leo hạ theo, ổn định lại1.58.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:52](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L52), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:271](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L271), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:272](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L272)

**Khoảng thời gian:** `[1, 1.6]` giây.

**Mục tiêu được trích:**

```json
{
  "compression": -0.025,
  "time": 1.08
}
```

- **F04:** Hips giữ nguyên crouch từ 1 đến 1.6s. Không có key nén/nhún H01 -.025m hoặc H02 -.022m tại 1.08s. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:435](../../../tools/rig/build-report-entrances.mjs#L435), [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440).

#### H01-008 · K2

Pelvis(0,+.04,.52),Root neo vết nứt;headbase(0,-.16,1.15), nhìn máy.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:106](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L106), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:120](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L120), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:121](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L121), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:126](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L126)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F03:** H01 trước 1s cộng -0.5*(1-smooth(.766666667,1,t)) vào Hips Y: chỉ đi lên đơn điệu tới .43; không có đỉnh .78m rồi đáp xuống .52. H02 cộng +1.5 theo cùng smooth và X-=1.1*(1-arrival), không phải điểm xuất phát DOCX (-.04,+.02,2.4). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440), [tools/rig/build-report-entrances.mjs:443](../../../tools/rig/build-report-entrances.mjs#L443), [tools/rig/build-report-entrances.mjs:444](../../../tools/rig/build-report-entrances.mjs#L444).

#### H01-009 · K2

Thân đổ trước28°, cổ bù để nhìn camera; không gập/chùn cổ sai giải phẫu.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:106](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L106), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:122](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L122), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:123](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L123), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:124](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L124), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:125](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L125), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:126](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L126)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).
- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).

**Giới hạn diễn giải:** Euler các cấp không tự cộng thành target pitch khi rest/bone roll khác. Phải đo hướng pelvis/chest/head thế giới.

#### H01-010 · K2

Chân bất đối xứng: gối phảiZ.30,gối tráiZ.62; phải chống mũi lùi sau,trái đặt vững phía trước.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:108](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L108), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:110](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L110), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:135](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L135), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:136](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L136), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:137](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L137), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:138](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L138), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:139](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L139), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:140](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L140), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:141](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L141), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:142](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L142)

**Khoảng thời gian:** `[1, 1.58]` giây.

**Mục tiêu được trích:**

```json
{
  "rightKneeB": [
    -0.26,
    -0.24,
    0.3
  ],
  "leftKneeB": [
    0.24,
    -0.22,
    0.62
  ],
  "kneeHeightDifference": 0.32
}
```

- **F05:** Hai chân crouch dùng cùng Y=.12; cùng Z=.12 H01 hoặc .06 H02, chỉ đối xứng X±.18/±.34. Không mã hóa cấu hình gót/mũi và gối bất đối xứng từ bảng Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:265](../../../tools/rig/build-report-entrances.mjs#L265), [tools/rig/build-report-entrances.mjs:278](../../../tools/rig/build-report-entrances.mjs#L278).

#### H01-011 · K2

Tay phải trống duỗi thấp bên trong gối phải: RWrist(-.16,-.20,.40),đầu bàn tay(-.15,-.22,.26).

**Nhận định:** Mục tiêu IK khác tọa độ tài liệu (`NOT_SAME_TARGET`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:108](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L108), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:127](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L127), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:128](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L128), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:129](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L129), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:130](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L130)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).

**Giới hạn diễn giải:** Bản DOCX không yêu cầu bàn tay này chạm sàn:tailZ.26. Khác ý tưởng trước về chống tay xuống đất phải được nêu rõ, không sửa ngầm.

#### H01-012 · K2

Tay trái trống gập ngang trước gối trái:LShoulder(.17,-.08,.98),elbow(.35,-.14,.76),wrist(.13,-.22,.60).

**Nhận định:** Mục tiêu IK khác tọa độ tài liệu (`NOT_SAME_TARGET`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:110](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L110), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:131](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L131), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:132](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L132), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:133](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L133), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:134](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L134)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).

#### H01-013 · K2 fingers

30 ngón mở hờ tự nhiên; tay phải chưa nắm trượng. K2 và anticipation không được thành một pose nắm duy nhất.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:199](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L199), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:282](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L282), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:284](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L284), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:285](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L285), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:286](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L286), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:287](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L287), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:288](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L288), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:289](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L289)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H01-014 · rise

Pelvis nâng.52→.96 và dịchX0→+.45 theo chuỗi key thực; không chỉ sửa key cuối.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:53](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L53), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:150](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L150), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:273](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L273), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:274](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L274), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:275](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L275), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:276](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L276)

**Khoảng thời gian:** `[1.6, 2.416666667]` giây.

**Mục tiêu được trích:**

```json
{
  "pelvisBStart": [
    0,
    0.04,
    0.52
  ],
  "pelvisBEnd": [
    0.45,
    0,
    0.96
  ]
}
```

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F09:** Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514).

#### H01-015 · morph

6 nhánh thu gom/xoắn bện thành một trượng; vị trí/morph không tách rời vũ khí đang theo tay.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:152](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L152), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:272](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L272), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:273](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L273), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:274](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L274), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:275](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L275)

**Khoảng thời gian:** `[1.58, 2.3]` giây.

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F15:** H01 VFX vẫn dùng remap timeline cũ, shader morph dây leo về một trục cố định(-.38,...,.12), không chạy theo trục trượng mới được snap theo tay. Các điểm kiểm: [src/h01-entrance.js:13](../../../src/h01-entrance.js#L13), [src/h01-entrance.js:49](../../../src/h01-entrance.js#L49), [src/report-entrance.js:43](../../../src/report-entrance.js#L43), [src/manual-hero.js:126](../../../src/manual-hero.js#L126).

#### H01-016 · staff

Trượng nguồn giữ hình tự nhiên nhưng bố cục reference dài2.35m,bán kính.028; trụcx-.23,y-.04,đỉnh2.35.

**Nhận định:** Thông số danh nghĩa khác nguồn; cần tách với phép đo bề mặt (`METADATA_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:152](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L152), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:191](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L191), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:192](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L192), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:193](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L193)

**Khoảng thời gian:** `[2.3, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "length": 2.35,
  "gripRadius": 0.028,
  "axisXYB": [
    -0.23,
    -0.04
  ]
}
```

- **F13:** H01 trượng metadata length=2.0383999348m, radius=.0193639254m; report instance scale=1. Chưa phải phép đo độc lập bề mặt runtime. So DOCX2.35m/.028m: chênh metadata -13.2596%/-30.8431%. Các điểm kiểm: [data/weapons/H01.json:1](../../../data/weapons/H01.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581).

**Giới hạn diễn giải:** Đo lại GLB/runtime trước quyết định tỷ lệ; không tự co giãn phi đồng nhất texture/mesh để ép đúng.

#### H01-017 · final arm

Đúng35° từ shoulder→GRIP,reach.598m; không thay bằng góc shoulder→wrist ởreach.475m.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:154](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L154), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:179](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L179), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:180](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L180), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:181](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L181), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:182](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L182)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "shoulderB": [
    0.26,
    0,
    1.44
  ],
  "gripB": [
    -0.23,
    -0.04,
    1.783
  ],
  "shoulderToGripAngleDegrees": 35,
  "shoulderToGripDistance": 0.598
}
```

- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).

#### H01-018 · final free arm

Tay trái buông cạnh hông mở6.5°,wrist(.68,-.01,.9),negative space nhìn rõ.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:156](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L156), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:183](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L183), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:184](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L184), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:185](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L185), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:186](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L186)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).

**Giới hạn diễn giải:** Khoảng hở prose.110m mâu thuẫn phép trừwrist.680-edge.555=.125; cần định nghĩa khoảng cách đến mặt áo thật.

#### H01-019 · final lower body

Đứng vững, bàn chân khớp sàn, không trượt chân sau mốc chốt K3.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:187](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L187), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:188](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L188), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:189](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L189), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:190](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L190)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F09:** Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514).
- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).

**Giới hạn diễn giải:** Builder còn blend chân2.4167→2.95; mức trượt thực cần đo sau retarget.

#### H01-020 · power grip

Vùng nắmZ1.740–1.815;khớp ngón nằm annulus.029–.034 quanh cánR.028,thumb đối chiếu42°.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:201](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L201), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:203](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L203), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:205](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L205)

**Khoảng thời gian:** `[2.2, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "gripZRange": [
    1.74,
    1.815
  ],
  "shaftRadius": 0.028,
  "jointRadiusRange": [
    0.029,
    0.034
  ],
  "thumbOppositionDegrees": 42
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F13:** H01 trượng metadata length=2.0383999348m, radius=.0193639254m; report instance scale=1. Chưa phải phép đo độc lập bề mặt runtime. So DOCX2.35m/.028m: chênh metadata -13.2596%/-30.8431%. Các điểm kiểm: [data/weapons/H01.json:1](../../../data/weapons/H01.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H01-021 · right fingers

15 đốt phải có head/tail,quaternion,flex chính xác hoặc retarget hình học tương đương,không xuyên cán.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:211](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L211), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:212](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L212), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:213](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L213), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:214](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L214), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:215](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L215), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:216](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L216), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:217](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L217), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:218](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L218), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:219](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L219), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:220](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L220), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:221](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L221), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:222](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L222), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:223](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L223), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:224](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L224), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:225](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L225), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:226](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L226), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:227](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L227)

**Khoảng thời gian:** `[2.366666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "flexionTriples": {
    "thumb": [
      38,
      48,
      55
    ],
    "index": [
      65,
      82,
      50
    ],
    "middle": [
      70,
      85,
      52
    ],
    "ring": [
      72,
      86,
      54
    ],
    "pinky": [
      74,
      88,
      55
    ]
  }
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H01-022 · left fingers

15 đốt trái thả tự nhiên với khoảng hở trang phục; không pose bàn tay cứng hoặc xuyên đùi.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:233](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L233), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:234](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L234), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:235](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L235), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:236](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L236), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:237](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L237), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:238](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L238), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:239](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L239), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:240](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L240), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:241](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L241), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:242](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L242), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:243](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L243), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:244](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L244), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:245](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L245), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:246](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L246), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:247](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L247), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:248](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L248), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:249](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L249)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "flexionTriples": {
    "thumb": [
      10,
      12,
      8
    ],
    "index": [
      10,
      15,
      8
    ],
    "middle": [
      12,
      18,
      10
    ],
    "ring": [
      14,
      20,
      11
    ],
    "pinky": [
      15,
      22,
      12
    ]
  }
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H01-023 · anticipation

F110đưa tay,F122mở rộng,F132chạm,F142khóa5ngón; thumb đối chiếu,ngón khác cuộn dần.

**Nhận định:** Không được thực hiện theo đặc tả này (`NOT_IMPLEMENTED_AS_SPECIFIED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:280](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L280), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:282](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L282), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:284](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L284), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:285](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L285), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:286](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L286), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:287](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L287), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:288](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L288), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:289](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L289)

**Khoảng thời gian:** `[1.833333333, 2.366666667]` giây.

**Mục tiêu được trích:**

```json
{
  "startRaise": 1.8333333333333333,
  "open": 2.033333333333333,
  "contact": 2.2,
  "locked": 2.3666666666666667
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

#### H01-024 · hold

Khung3 chốt pose đẹp từ2.42 đến3,không thay đổi về chân/chiều cao/tiếp xúc.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:54](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L54), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:276](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L276)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F09:** Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514).

#### H01-025 · skeleton

62 xương theo mô tả24body+30finger+8staff; mapping chức năng lên rig thật,không thêm node rỗng giả đạt.

**Nhận định:** Cấu trúc rig khác; tên/số xương không chứng minh tương đương chức năng (`STRUCTURE_DIFFERS`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:58](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L58), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:62](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L62), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:63](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L63), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:64](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L64), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:65](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L65), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:66](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L66), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:67](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L67), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:68](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L68), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:69](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L69), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:70](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L70), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:71](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L71), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:72](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L72), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:73](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L73), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:74](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L74), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:75](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L75), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:76](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L76), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:77](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L77), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:78](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L78), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:79](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L79), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:80](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L80), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:81](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L81), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:82](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L82)

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F22:** Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40).

**Giới hạn diễn giải:** Rig humanoid52bone không tự là lỗi thị giác; nhiều torso/staff controls có thể thay bằng retarget/shader nếu kết quả đúng.

#### H01-026 · automation

Ví dụ bpy phải được xem là minh họa thiếu ràng buộc, không là bộ animation hoàn chỉnh hay nguồn truth duy nhất.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:293](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L293), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:295](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L295), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:297](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L297)

**Giới hạn diễn giải:** Script đặt world số vào poseBone.location(local),thiếu đỉnhF52/nhúnF65,mapping object không đúng repo;không chạy trong audit.

### Hàn Trạch — chùy, tay trái giữ liên tục theo Mode B

#### H02-001 · identity

Tài liệu Chuy-175m gọi nhân vật Lâm Dật/manơcanh1.85m; ngữ cảnh nhiệm vụ áp cho Hàn Trạch/H02,không đổi danh tính file gốc.

**Nhận định:** Nguồn nhập nhằng danh tính hoặc hệ quy chiếu (`REFERENCE_AMBIGUITY`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:9](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L9), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:11](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L11), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:13](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L13), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:26](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L26), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:56](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L56)

#### H02-002 · camera

Camera oblique B(-.45,-2.6,.68),Euler(82,0,-12) khi búa rơi;rồi chuyển front để thấy tay và mặt đầu búa.

**Nhận định:** Camera không theo bố trí của tài liệu (`NOT_SAME_CAMERA`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:48](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L48), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:76](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L76), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:80](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L80)

**Khoảng thời gian:** `[0, 0.75]` giây.

- **F18:** Camera sảnh dùng preset toàn thân/cận cảnh chung; không có chuỗi camera riêng từ góc oblique Khung1 sang front Khung2 theo DOCX H02. Các điểm kiểm: [src/world.js:493](../../../src/world.js#L493), [src/world.js:518](../../../src/world.js#L518).

#### H02-003 · K1

Nhân vật ẩn,hạ chùy từ góc trên phải;headcenter(.93,-.04,2.8)→(-.18,-.04,.12) tại.30,giữ tới.75.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:48](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L48), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:78](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L78), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:79](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L79), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:80](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L80), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:246](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L246), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:247](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L247), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:248](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L248)

**Khoảng thời gian:** `[0, 0.75]` giây.

**Mục tiêu được trích:**

```json
{
  "impactTime": 0.3,
  "headStartB": [
    0.93,
    -0.04,
    2.8
  ],
  "headImpactB": [
    -0.18,
    -0.04,
    0.12
  ]
}
```

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F12:** Cờ gripped H01=2.2,H02=1.6; flags landed chỉ xét thời gian>=1. SkinnedMesh hiện từ .766666667; H01 vũ khí hiện từ1.6, H02 vũ khí luôn hiện. Cờ thời gian không phải kiểm tiếp xúc mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:31](../../../tools/rig/build-report-entrances.mjs#L31), [tools/rig/build-report-entrances.mjs:52](../../../tools/rig/build-report-entrances.mjs#L52), [src/report-entrance.js:135](../../../src/report-entrance.js#L135), [src/report-entrance.js:146](../../../src/report-entrance.js#L146).

#### H02-004 · K1 hammer

Cán25° so thẳng đứng/65° so đất;tail(.509,-.04,1.597),mặt chùy hiển thị đúng góc.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:80](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L80), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:81](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L81), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:82](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L82), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:84](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L84), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:85](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L85)

**Khoảng thời gian:** `[0.3, 0.75]` giây.

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F14:** H02 metadata length1.899999976m, radius.0334698442m; report uniform scale1.75/length=.92105264. Chiều dài danh nghĩa1.75m đúng; radius suy từ metadata≈.03082749m so mục tiêu.022m (+40.125%). Chưa đo mặt cán legacy đang render. Các điểm kiểm: [data/weapons/H02.json:1](../../../data/weapons/H02.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581), [tools/rig/build-report-entrances.mjs:619](../../../tools/rig/build-report-entrances.mjs#L619).

#### H02-005 · impact

150 đá sắc+dust,bụi nón110°,v4.8,origin(-.18,-.04,.02),khớp điểm đầu chùy chạm sàn.

**Nhận định:** Không được thực hiện theo đặc tả này (`NOT_IMPLEMENTED_AS_SPECIFIED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:86](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L86), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:247](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L247)

**Khoảng thời gian:** `[0.3, 0.75]` giây.

- **F17:** H02 VFX remap từ timeline cũ, impact định vị cố định (0,0,.38),stamp(-.43,0,-.2334),32 spark/impact. Không gắn emitter vào tiếp xúc đáy đầu chùy thực; branch report đặt cameraShake=0. Các điểm kiểm: [src/h02-entrance.js:25](../../../src/h02-entrance.js#L25), [src/h02-entrance.js:37](../../../src/h02-entrance.js#L37), [src/manual-h02.js:73](../../../src/manual-h02.js#L73).

#### H02-006 · descent

Nhân vật bay xuống từpelvis(-.04,+.02,2.4) đến(-.04,+.04,.54),tư thế chủ độngkhông kéo xương.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:49](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L49), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:249](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L249), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:250](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L250)

**Khoảng thời gian:** `[0.766666667, 1]` giây.

**Mục tiêu được trích:**

```json
{
  "pelvisStartB": [
    -0.04,
    0.02,
    2.4
  ],
  "pelvisLandB": [
    -0.04,
    0.04,
    0.54
  ]
}
```

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F03:** H01 trước 1s cộng -0.5*(1-smooth(.766666667,1,t)) vào Hips Y: chỉ đi lên đơn điệu tới .43; không có đỉnh .78m rồi đáp xuống .52. H02 cộng +1.5 theo cùng smooth và X-=1.1*(1-arrival), không phải điểm xuất phát DOCX (-.04,+.02,2.4). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440), [tools/rig/build-report-entrances.mjs:443](../../../tools/rig/build-report-entrances.mjs#L443), [tools/rig/build-report-entrances.mjs:444](../../../tools/rig/build-report-entrances.mjs#L444).

#### H02-007 · descent grip

Tay trái đã bắt/chộp cán trước hoặc khi đáp;giữ suốt Khung2,không đợi lúc đứng lên mới bám.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:49](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L49), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:50](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L50), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:98](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L98), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:250](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L250)

**Khoảng thời gian:** `[0.766666667, 1.58]` giây.

**Mục tiêu được trích:**

```json
{
  "mustHoldNoLaterThan": 1.0,
  "currentGripFlag": 1.6
}
```

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F12:** Cờ gripped H01=2.2,H02=1.6; flags landed chỉ xét thời gian>=1. SkinnedMesh hiện từ .766666667; H01 vũ khí hiện từ1.6, H02 vũ khí luôn hiện. Cờ thời gian không phải kiểm tiếp xúc mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:31](../../../tools/rig/build-report-entrances.mjs#L31), [tools/rig/build-report-entrances.mjs:52](../../../tools/rig/build-report-entrances.mjs#L52), [src/report-entrance.js:135](../../../src/report-entrance.js#L135), [src/report-entrance.js:146](../../../src/report-entrance.js#L146).

#### H02-008 · landing

Giảm chấn pelvis.54→.518 tại1.08,sau đóvề.54,tay/đầu theo đúng chuyển động.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:50](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L50), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:94](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L94), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:251](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L251), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:252](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L252)

**Khoảng thời gian:** `[1, 1.58]` giây.

**Mục tiêu được trích:**

```json
{
  "compression": -0.022,
  "time": 1.08
}
```

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F04:** Hips giữ nguyên crouch từ 1 đến 1.6s. Không có key nén/nhún H01 -.025m hoặc H02 -.022m tại 1.08s. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:435](../../../tools/rig/build-report-entrances.mjs#L435), [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440).

#### H02-009 · K2

Pelvis(-.04,+.04,.54),thântrước26°,nghiêng−5°,headbase(-.04,-.17,1.185),đỉnh1.385.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:94](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L94), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:110](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L110), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:111](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L111), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:116](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L116)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).

**Giới hạn diễn giải:** Góc Euler từng xương và tỷ lệ arm bảng nguồn không khả thi đồng thời; không khớp tuyệt đối bằng stretching.

#### H02-010 · K2 ground arm

Tay phải chống đất:shoulder(-.21,-.11,.98),elbow(-.22,-.15,.58),wrist(-.22,-.18,.18),fingertipZ.015.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:96](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L96), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:117](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L117), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:118](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L118), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:119](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L119), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:120](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L120)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).
- **F10:** Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559).

**Giới hạn diễn giải:** Hai đoạn arm trong bảng dài.402/.401 thay vìrest.295/.270; vị trí groundhand phải retarget theo độ dài nguồn thật.

#### H02-011 · K2 fingers

Ngón phải xòe chống sàn,đầu ngónY/Z đúng:Thumb.048,Index.018,Middle.015,Ring.018,Pinky.025;không cổ tay lơ lửng hoặc bàn tay xuyên nền.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:214](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L214), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:215](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L215), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:216](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L216), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:217](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L217), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:218](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L218), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:219](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L219), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:220](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L220), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:221](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L221), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:222](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L222), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:223](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L223), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:224](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L224), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:225](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L225), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:226](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L226), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:227](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L227), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:228](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L228), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:229](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L229), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:230](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L230)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).
- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H02-012 · K2 grip arm

Tay trái gập nắm cán:wrist(.155,-.162,.95),grip(.135,-.162,.945),elbow(.38,-.13,.96).

**Nhận định:** Mục tiêu IK khác tọa độ tài liệu (`NOT_SAME_TARGET`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:98](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L98), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:121](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L121), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:122](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L122), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:123](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L123), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:124](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L124)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

#### H02-013 · K2 legs

Đùi mở đối trọng,gối phải(-.34,-.22,.42),trái(.24,-.20,.45);chân không đối xứng giản lược,đặt nền theo bảng.

**Nhận định:** Mục tiêu IK khác tọa độ tài liệu (`NOT_SAME_TARGET`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:125](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L125), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:126](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L126), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:127](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L127), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:128](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L128), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:129](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L129), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:130](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L130), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:131](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L131), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:132](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L132)

**Khoảng thời gian:** `[1, 1.58]` giây.

- **F05:** Hai chân crouch dùng cùng Y=.12; cùng Z=.12 H01 hoặc .06 H02, chỉ đối xứng X±.18/±.34. Không mã hóa cấu hình gót/mũi và gối bất đối xứng từ bảng Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:265](../../../tools/rig/build-report-entrances.mjs#L265), [tools/rig/build-report-entrances.mjs:278](../../../tools/rig/build-report-entrances.mjs#L278).

#### H02-014 · K2 hammer

Chùy nghiêng20°:headcenter(.34,-.18,.12),tail(-.218,-.135,1.654),cán đi qua vùng tay trái.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:100](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L100), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:129](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L129), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:130](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L130), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:249](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L249), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:250](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L250), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:251](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L251), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:252](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L252)

**Khoảng thời gian:** `[0.766666667, 1.58]` giây.

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

**Giới hạn diễn giải:** Bảng đổi worldpositions từK1 sangK2 bằng camera là mâu thuẫn; chọn hệ quy chiếu trước khi đo.

#### H02-015 · rise

Nâng người.54→1.005;pelvisX−.04→+.18 theo bảngModeA,trongkhi chùytilt20→0,yaw→0.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:51](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L51), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:253](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L253), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:254](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L254), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:255](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L255), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256)

**Khoảng thời gian:** `[1.6, 2.416666667]` giây.

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F09:** Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

**Giới hạn diễn giải:** Nếu chọnModeB phải biến đổi cả frame nhất quán; không tự chọn một số tọa độModeA rồi gắn tay trái.

#### H02-016 · mode mapping

ModeA=chùy viewerleft,anatomicalrightcầm;ModeB=anatomicalleftcầm,viewerright. Nên giữModeB liên tục từKhung2,nhưng chưa phải duyệt sửa.

**Nhận định:** Một phần cấu trúc đã có; chưa đạt nội dung chuyển động (`PARTIAL_STRUCTURE`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:20](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L20), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:22](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L22), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:146](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L146)

- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F20:** Report Entrance hiện chỉ tích hợp nhánh preview. Combat H01/H02 tiếp tục dùng clip/IK cũ; H02 combat vẫn poseRightHand, khác report chọn cầm trái. Không thể ngoại suy nghiệm thu entrance sang run/attack/cast/dash. Các điểm kiểm: [src/manual-hero.js:181](../../../src/manual-hero.js#L181), [src/manual-h02.js:98](../../../src/manual-h02.js#L98).

**Giới hạn diễn giải:** Current report chọnLeft,combat chọnRight. Tài liệu mirrorX=-X nhưngghi-.16→+.34 không nhất quán; cầnreflectionplane rõ.

#### H02-017 · final height

Nhân vật1.85m;pelvis1.005;facecenter1.745;chùyheadcenter1.745,tail.115,top1.865.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:140](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L140), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:142](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L142), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:156](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L156), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:158](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L158), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:159](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L159), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:160](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L160), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:161](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L161), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:162](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L162), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:163](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L163), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:164](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L164), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:175](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L175), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:176](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L176), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:177](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L177), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:178](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L178)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "bodyHeight": 1.85,
  "faceCenterZ": 1.745,
  "hammerHeadCenterZ": 1.745,
  "hammerTailZ": 0.115,
  "hammerTopZ": 1.865
}
```

- **F02:** Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0). Các điểm kiểm: [tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438).
- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F14:** H02 metadata length1.899999976m, radius.0334698442m; report uniform scale1.75/length=.92105264. Chiều dài danh nghĩa1.75m đúng; radius suy từ metadata≈.03082749m so mục tiêu.022m (+40.125%). Chưa đo mặt cán legacy đang render. Các điểm kiểm: [data/weapons/H02.json:1](../../../data/weapons/H02.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581), [tools/rig/build-report-entrances.mjs:619](../../../tools/rig/build-report-entrances.mjs#L619).

#### H02-018 · final geometry

Chùy1.750m,exposedshaft1.510,radius.022,headbox.420×.240×.220.

**Nhận định:** Đúng một phần thông số danh nghĩa; chưa chứng minh bề mặt đúng (`PARTIAL_METADATA`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:140](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L140), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:144](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L144), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:68](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L68), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:69](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L69), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:70](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L70)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "length": 1.75,
  "exposedShaft": 1.51,
  "radius": 0.022,
  "headWHD": [
    0.42,
    0.24,
    0.22
  ]
}
```

- **F14:** H02 metadata length1.899999976m, radius.0334698442m; report uniform scale1.75/length=.92105264. Chiều dài danh nghĩa1.75m đúng; radius suy từ metadata≈.03082749m so mục tiêu.022m (+40.125%). Chưa đo mặt cán legacy đang render. Các điểm kiểm: [data/weapons/H02.json:1](../../../data/weapons/H02.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581), [tools/rig/build-report-entrances.mjs:619](../../../tools/rig/build-report-entrances.mjs#L619).

**Giới hạn diễn giải:** Length được scale danh nghĩa. Radius/head bề mặt chưa đo,có chênh metadata rõ.

#### H02-019 · final orientation

Mặt rộng đầu búa song song VÀ đồng hướng khuôn mặt;Nhammer=Nface=(0,-1,0)Blender;shaft+Z.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:30](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L30), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:36](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L36), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:144](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L144), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:178](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L178), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

**Giới hạn diễn giải:** Không lấyquat=(0,0,0,1)hayEuler0 của nguồn chưacalibrate làm bằng chứng; phải đo axes mesh/source hoặcframecalibration.

#### H02-020 · final arm

Tay nắm ở1.320,tay tự doxuốngcạnhhôngvàlộ khoảngtrống;không đổi handedness ngẫu nhiên.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:165](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L165), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:166](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L166), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:167](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L167), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:168](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L168), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:169](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L169), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:170](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L170), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:171](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L171), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:172](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L172), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:173](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L173), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:174](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L174)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F06:** IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368).
- **F07:** H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193).
- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).

**Giới hạn diễn giải:** Finalforearm/head-tail bảngchỉ.107m vàhand.00866m,không thể ép vào rest.270/.190.

#### H02-021 · power grip

CánR.022;fingerannulus.023–.027;thumbopposition45°,gripZ.945K2→1.320K3,không hở/xuyên.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:184](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L184), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:186](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L186), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:192](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L192), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:193](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L193), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:194](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L194), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:195](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L195), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:196](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L196), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:197](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L197), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:198](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L198), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:199](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L199), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:200](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L200), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:201](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L201), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:202](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L202), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:203](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L203), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:204](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L204), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:205](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L205), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:206](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L206), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:207](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L207), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:208](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L208)

**Khoảng thời gian:** `[1, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "shaftRadius": 0.022,
  "jointRadiusRange": [
    0.023,
    0.027
  ],
  "thumbOppositionDegrees": 45,
  "flexionTriples": {
    "thumb": [
      42,
      52,
      60
    ],
    "index": [
      68,
      85,
      55
    ],
    "middle": [
      74,
      88,
      58
    ],
    "ring": [
      76,
      89,
      58
    ],
    "pinky": [
      78,
      90,
      60
    ]
  }
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).
- **F14:** H02 metadata length1.899999976m, radius.0334698442m; report uniform scale1.75/length=.92105264. Chiều dài danh nghĩa1.75m đúng; radius suy từ metadata≈.03082749m so mục tiêu.022m (+40.125%). Chưa đo mặt cán legacy đang render. Các điểm kiểm: [data/weapons/H02.json:1](../../../data/weapons/H02.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581), [tools/rig/build-report-entrances.mjs:619](../../../tools/rig/build-report-entrances.mjs#L619).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H02-022 · free fingers

Tay không cầm thả ngón tự nhiên sau chống sàn;tránh overcurl,trục ngón lộn,vắt chéo xuyên áo.

**Nhận định:** Chưa có bằng chứng đủ để công nhận đạt (`NOT_ESTABLISHED`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:214](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L214), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:215](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L215), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:216](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L216), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:217](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L217), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:218](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L218), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:219](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L219), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:220](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L220), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:221](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L221), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:222](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L222), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:223](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L223), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:224](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L224), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:225](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L225), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:226](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L226), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:227](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L227), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:228](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L228), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:229](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L229), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:230](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L230)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "flexionTriples": {
    "thumb": [
      10,
      12,
      8
    ],
    "index": [
      10,
      15,
      8
    ],
    "middle": [
      12,
      18,
      10
    ],
    "ring": [
      14,
      20,
      11
    ],
    "pinky": [
      15,
      22,
      12
    ]
  }
}
```

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F21:** Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin. Các điểm kiểm: [tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163).

#### H02-023 · hold

K3giữ vững,không settlingchân/búa tiếp tục sau2.42;không đổi sang source tĩnh để che lỗi.

**Nhận định:** Code chuyển động khác mục tiêu của tài liệu (`CODE_DEVIATION`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:52](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L52), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256)

**Khoảng thời gian:** `[2.416666667, 3]` giây.

- **F09:** Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514).
- **F19:** Sau entrance>=3s, chế độ mặc định preview không bật previewAnimation chuyển về body GLB gốc tĩnh (và vũ khí gốc). Do đó cảnh nhìn sau intro có thể không phải mesh đang được report player pose. Các điểm kiểm: [src/manual-hero.js:28](../../../src/manual-hero.js#L28), [src/manual-hero.js:164](../../../src/manual-hero.js#L164), [src/manual-h02.js:16](../../../src/manual-h02.js#L16), [src/world.js:497](../../../src/world.js#L497).

#### H02-024 · rigid hammer

Chùy là vật rắn:headcenter→tail giữ1.63m;không dùng telemetry rút/căng để khớp bảng.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:246](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L246), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:247](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L247), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:248](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L248), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:249](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L249), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:250](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L250), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:251](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L251), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:252](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L252), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:253](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L253), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:254](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L254), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:255](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L255), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256)

**Khoảng thời gian:** `[0, 3]` giây.

**Mục tiêu được trích:**

```json
{
  "headToTailExpected": 1.63,
  "tableAt1_87": 0.41776189390608615,
  "tableAt2_13": 1.0984052075623094
}
```

- **F11:** Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589).

#### H02-025 · skeleton

60 khớp gồm24body,30ngón và6weaponcontrol;đảm bảo mapping chức năng không giả sốxương.

**Nhận định:** Cấu trúc rig khác; tên/số xương không chứng minh tương đương chức năng (`STRUCTURE_DIFFERS`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:56](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L56), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:60](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L60), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:61](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L61), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:62](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L62), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:63](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L63), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:64](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L64), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:65](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L65), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:66](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L66), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:67](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L67), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:68](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L68), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:69](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L69), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:70](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L70)

- **F08:** Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546).
- **F22:** Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh. Các điểm kiểm: [tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40).

**Giới hạn diễn giải:** Vũ khí rời cứng không bắt buộc phải chia6xương nếu đáp ứnghìnhhọc/timeline nhưngkhác literal hierarchy nguồn.

#### H02-026 · automation

Bpy không phải implementation đầy đủ:modeflagprosekhông áp vào code,khôngsetfinalbody/arms/fingers đầy đủ,world→local không retarget.

**Nhận định:** Nguồn có mâu thuẫn; không thể áp nguyên mọi con số (`REFERENCE_CONFLICT`).

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:260](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L260), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:262](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L262), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:264](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L264)

## 4. Dấu vết kỹ thuật dùng trong ma trận

Mọi file:dòng dưới đây thuộc mã ở commit audit nêu đầu báo cáo. Những kết luận về visible mesh cuối cùng còn phải xét nguồn tĩnh/driver ẩn và nhánh worker theo báo cáo provenance.

### F01

Player báo cáo có Entrance 3s, Idle_Hold 4s, dữ liệu lấy mẫu 60Hz; sample 120Hz là nội suy, không phải số đo FPS.

[src/report-entrance.js:15](../../../src/report-entrance.js#L15), [tools/rig/build-report-entrances.mjs:403](../../../tools/rig/build-report-entrances.mjs#L403), [src/report-entrance.js:120](../../../src/report-entrance.js#L120)

### F02

Crouch Hips H01=(0,.43,-.04), H02=(-.04,.40,-.04) theo Three; final H01=(.45,.85,0), H02=(0,.96,0).

[tools/rig/build-report-entrances.mjs:246](../../../tools/rig/build-report-entrances.mjs#L246), [tools/rig/build-report-entrances.mjs:438](../../../tools/rig/build-report-entrances.mjs#L438)

### F03

H01 trước 1s cộng -0.5*(1-smooth(.766666667,1,t)) vào Hips Y: chỉ đi lên đơn điệu tới .43; không có đỉnh .78m rồi đáp xuống .52. H02 cộng +1.5 theo cùng smooth và X-=1.1*(1-arrival), không phải điểm xuất phát DOCX (-.04,+.02,2.4).

[tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440), [tools/rig/build-report-entrances.mjs:443](../../../tools/rig/build-report-entrances.mjs#L443), [tools/rig/build-report-entrances.mjs:444](../../../tools/rig/build-report-entrances.mjs#L444)

### F04

Hips giữ nguyên crouch từ 1 đến 1.6s. Không có key nén/nhún H01 -.025m hoặc H02 -.022m tại 1.08s.

[tools/rig/build-report-entrances.mjs:435](../../../tools/rig/build-report-entrances.mjs#L435), [tools/rig/build-report-entrances.mjs:440](../../../tools/rig/build-report-entrances.mjs#L440)

### F05

Hai chân crouch dùng cùng Y=.12; cùng Z=.12 H01 hoặc .06 H02, chỉ đối xứng X±.18/±.34. Không mã hóa cấu hình gót/mũi và gối bất đối xứng từ bảng Gemini.

[tools/rig/build-report-entrances.mjs:265](../../../tools/rig/build-report-entrances.mjs#L265), [tools/rig/build-report-entrances.mjs:278](../../../tools/rig/build-report-entrances.mjs#L278)

### F06

IK thử nhiều vị trí cổ tay và orientation. H01 phải Y=.44/.48/.52, trái (.15,.60,.22)/(.2,.65,.2); H02 trái (.35,.84,.16)/(.38,.78,.16)/(.4,.72,.16). Có fallback bỏ target orientation; không phải solve đúng các tọa độ/palm normal DOCX.

[tools/rig/build-report-entrances.mjs:314](../../../tools/rig/build-report-entrances.mjs#L314), [tools/rig/build-report-entrances.mjs:368](../../../tools/rig/build-report-entrances.mjs#L368)

### F07

H01 dùng reach=.475m và 35° từ vai đến target cổ tay; DOCX định nghĩa 35° vai đến tâm nắm .598m. H02 thử cổ tay (.5,1.12,.16) và grid/yaw, không ràng buộc chiều cao tâm đầu chùy bằng tâm mặt.

[tools/rig/build-report-entrances.mjs:173](../../../tools/rig/build-report-entrances.mjs#L173), [tools/rig/build-report-entrances.mjs:176](../../../tools/rig/build-report-entrances.mjs#L176), [tools/rig/build-report-entrances.mjs:189](../../../tools/rig/build-report-entrances.mjs#L189), [tools/rig/build-report-entrances.mjs:193](../../../tools/rig/build-report-entrances.mjs#L193)

### F08

Động tác ngón lấy lại từ clip nguồn đã có, resample rồi đổi bind-world; builder không nhập 30 hàng ngón và chuỗi anticipation F110/122/132/142 của Gemini.

[tools/rig/build-report-entrances.mjs:425](../../../tools/rig/build-report-entrances.mjs#L425), [tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:546](../../../tools/rig/build-report-entrances.mjs#L546)

### F09

Bàn chân bước tuần tự phải 1.6–2.05, trái 1.95–2.4167; nhấc .065m. Sau 2.4167 tiếp tục slerp chân tới 2.95, dù Gemini yêu cầu giữ K3 từ 2.42.

[tools/rig/build-report-entrances.mjs:452](../../../tools/rig/build-report-entrances.mjs#L452), [tools/rig/build-report-entrances.mjs:465](../../../tools/rig/build-report-entrances.mjs#L465), [tools/rig/build-report-entrances.mjs:514](../../../tools/rig/build-report-entrances.mjs#L514)

### F10

Retarget FK→legacy rồi clamp tối đa 8°/mẫu xương thân,16°/mẫu ngón. Sau clamp không chạy lại contact IK/va chạm; không thể suy ra mọi tiếp xúc còn đúng từ kết quả IK trước retarget.

[tools/rig/build-report-entrances.mjs:523](../../../tools/rig/build-report-entrances.mjs#L523), [tools/rig/build-report-entrances.mjs:539](../../../tools/rig/build-report-entrances.mjs#L539), [tools/rig/build-report-entrances.mjs:559](../../../tools/rig/build-report-entrances.mjs#L559)

### F11

Quỹ đạo weapon lấy từ sourceFrames cũ; bám điểm localPalm bằng phép dịch weapon tới marker. H01 blend bám1.95→2.2; H02 1.6→2.4167. Không kiểm mặt ngón bao cán, va đầu hay đáy vũ khí chạm sàn ở bước này.

[tools/rig/build-report-entrances.mjs:563](../../../tools/rig/build-report-entrances.mjs#L563), [tools/rig/build-report-entrances.mjs:577](../../../tools/rig/build-report-entrances.mjs#L577), [tools/rig/build-report-entrances.mjs:589](../../../tools/rig/build-report-entrances.mjs#L589)

### F12

Cờ gripped H01=2.2,H02=1.6; flags landed chỉ xét thời gian>=1. SkinnedMesh hiện từ .766666667; H01 vũ khí hiện từ1.6, H02 vũ khí luôn hiện. Cờ thời gian không phải kiểm tiếp xúc mesh.

[tools/rig/build-report-entrances.mjs:31](../../../tools/rig/build-report-entrances.mjs#L31), [tools/rig/build-report-entrances.mjs:52](../../../tools/rig/build-report-entrances.mjs#L52), [src/report-entrance.js:135](../../../src/report-entrance.js#L135), [src/report-entrance.js:146](../../../src/report-entrance.js#L146)

### F13

H01 trượng metadata length=2.0383999348m, radius=.0193639254m; report instance scale=1. Chưa phải phép đo độc lập bề mặt runtime. So DOCX2.35m/.028m: chênh metadata -13.2596%/-30.8431%.

[data/weapons/H01.json:1](../../../data/weapons/H01.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581)

### F14

H02 metadata length1.899999976m, radius.0334698442m; report uniform scale1.75/length=.92105264. Chiều dài danh nghĩa1.75m đúng; radius suy từ metadata≈.03082749m so mục tiêu.022m (+40.125%). Chưa đo mặt cán legacy đang render.

[data/weapons/H02.json:1](../../../data/weapons/H02.json#L1), [tools/rig/build-report-entrances.mjs:581](../../../tools/rig/build-report-entrances.mjs#L581), [tools/rig/build-report-entrances.mjs:619](../../../tools/rig/build-report-entrances.mjs#L619)

### F15

H01 VFX vẫn dùng remap timeline cũ, shader morph dây leo về một trục cố định(-.38,...,.12), không chạy theo trục trượng mới được snap theo tay.

[src/h01-entrance.js:13](../../../src/h01-entrance.js#L13), [src/h01-entrance.js:49](../../../src/h01-entrance.js#L49), [src/report-entrance.js:43](../../../src/report-entrance.js#L43), [src/manual-hero.js:126](../../../src/manual-hero.js#L126)

### F16

H01 dùng sóng, sigil và 64 lá, growth hoàn tất sau mốc.75 mới; không thấy bộ phát120 viên đá/thông số6branch Gemini trong module này.

[src/h01-entrance.js:60](../../../src/h01-entrance.js#L60), [src/h01-entrance.js:78](../../../src/h01-entrance.js#L78)

### F17

H02 VFX remap từ timeline cũ, impact định vị cố định (0,0,.38),stamp(-.43,0,-.2334),32 spark/impact. Không gắn emitter vào tiếp xúc đáy đầu chùy thực; branch report đặt cameraShake=0.

[src/h02-entrance.js:25](../../../src/h02-entrance.js#L25), [src/h02-entrance.js:37](../../../src/h02-entrance.js#L37), [src/manual-h02.js:73](../../../src/manual-h02.js#L73)

### F18

Camera sảnh dùng preset toàn thân/cận cảnh chung; không có chuỗi camera riêng từ góc oblique Khung1 sang front Khung2 theo DOCX H02.

[src/world.js:493](../../../src/world.js#L493), [src/world.js:518](../../../src/world.js#L518)

### F19

Sau entrance>=3s, chế độ mặc định preview không bật previewAnimation chuyển về body GLB gốc tĩnh (và vũ khí gốc). Do đó cảnh nhìn sau intro có thể không phải mesh đang được report player pose.

[src/manual-hero.js:28](../../../src/manual-hero.js#L28), [src/manual-hero.js:164](../../../src/manual-hero.js#L164), [src/manual-h02.js:16](../../../src/manual-h02.js#L16), [src/world.js:497](../../../src/world.js#L497)

### F20

Report Entrance hiện chỉ tích hợp nhánh preview. Combat H01/H02 tiếp tục dùng clip/IK cũ; H02 combat vẫn poseRightHand, khác report chọn cầm trái. Không thể ngoại suy nghiệm thu entrance sang run/attack/cast/dash.

[src/manual-hero.js:181](../../../src/manual-hero.js#L181), [src/manual-h02.js:98](../../../src/manual-h02.js#L98)

### F21

Test grip dựng bone/group, weapon=new Group(), so cùng localPalm và gripPivot đã dùng xây dữ liệu. Gap<.005 kiểm marker trùng nhau, không đo đầu ngón thật ôm cán, xuyên áo/đầu hoặc strain skin.

[tests/report-entrance.test.js:155](../../../tests/report-entrance.test.js#L155), [tests/report-entrance.test.js:163](../../../tests/report-entrance.test.js#L163)

### F22

Receipt ghi weightChanges=false,fullResolutionSkinActivated=false. Bản vá report motion chưa thay trọng số skin. Số bone/continuity/clip/SHA qua không chứng minh hết biến dạng mesh.

[tools/rig/build-report-entrances.mjs:635](../../../tools/rig/build-report-entrances.mjs#L635), [tools/rig/build-report-entrances.mjs:645](../../../tools/rig/build-report-entrances.mjs#L645), [tools/rig/build-report-entrances.mjs:666](../../../tools/rig/build-report-entrances.mjs#L666), [tests/report-entrance.test.js:40](../../../tests/report-entrance.test.js#L40)

### F23

Player dùng persistentHeroPoseController và chỉ nội suy quats/translation, không solve contact/collision đầy đủ theo từng frame runtime.

[src/report-entrance.js:75](../../../src/report-entrance.js#L75), [src/report-entrance.js:111](../../../src/report-entrance.js#L111), [src/report-entrance.js:120](../../../src/report-entrance.js#L120)

## 5. Những mâu thuẫn của chính hai tài liệu cần giữ rõ

Không phải mọi tọa độ trong báo cáo Gemini đều khả thi trên một nhân vật/vũ khí rắn giữ nguyên kích thước. Các lỗi dưới đây phải được giải quyết bằng diễn giải có kiểm chứng trong bước khắc phục được duyệt, không bằng co kéo mesh hoặc âm thầm thay đổi nguồn.

### X01 · H01 · Đòi sáu nhánh dây leo, nhưng bảng chỉ mô tả năm.

Văn bản ghi `Vine_Branch_01..06`; các hàng chi tiết chỉ có 01–05. Nhánh 06 không có root/mid/tip/velocity để đối chiếu.

**Hệ quả khi sửa:** Giữ ý tưởng sáu nhánh, nhưng phải thiết kế nhánh còn thiếu một cách nhất quán khi triển khai được duyệt. Không báo đã khớp cả sáu tọa độ.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:88](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L88), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:93](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L93), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:94](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L94), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:95](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L95), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:96](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L96), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:97](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L97).

### X02 · H01 · Frame, thời gian và visibility/scale chưa thống nhất hoàn toàn.

F46 được ghi 0.76 hoặc 0.77 giây; bảng ghi `Scale=(1,0,1)` nhưng mô tả ghi Scale=1. F0–180 gồm 181 mẫu nếu tính cả hai đầu.

**Hệ quả khi sửa:** Dùng đồng hồ giây làm chuẩn và visibility để ẩn an toàn. Không làm skin suy biến bằng scale Y=0 chỉ để sao chép lỗi đánh máy.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:50](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L50), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:51](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L51), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:88](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L88), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:268](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L268).

### X03 · H01 · Vị trí Root và Pelvis có thể bị cộng hai lần nếu không phân biệt world/local.

Root có nơi neo tại gốc, nơi đặt ở +0.45m khi kết thúc; Pelvis cuối cũng được ghi +0.45m. Không thể gán cả hai như local translation độc lập.

**Hệ quả khi sửa:** Phải xác định các hàng là tọa độ world hay local. Kế hoạch khắc phục cần một root motion duy nhất và landmark pelvis trong world chuẩn hóa.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:64](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L64), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:120](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L120), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:169](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L169), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:170](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L170).

### X04 · H01 · Head–tail của bàn tay không bảo toàn chiều dài rest.

Hand.R trong crouch dài 0.141774m trong khi rest 0.085m; Hand.L cuối dài 0.160390m trong khi rest 0.085m.

**Hệ quả khi sửa:** Một rig cứng không thể đồng thời khớp những điểm này. Giữ chiều dài thật, retarget gesture và tiếp xúc, ghi rõ sai số landmark thay vì kéo/co bàn tay.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:74](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L74), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:130](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L130), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:186](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L186).

### X05 · H01 · Pitch thân 28° không thể so trực tiếp bằng cộng Euler từng xương.

Các Euler được ghi 18.5+8+6.5+5=38° nếu cộng máy móc. Bone roll, rest frame, local axes và thứ tự Euler chưa xác định đủ để thực hiện phép cộng đó.

**Hệ quả khi sửa:** Đo orientation thân trong world frame chuẩn hóa; không quy lỗi runtime chỉ từ tổng Euler và không chép các Euler khác bind lên rig hiện tại.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:106](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L106), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:121](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L121), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:122](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L122), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:123](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L123), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:124](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L124), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:125](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L125), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:126](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L126).

### X06 · H01 · Khoảng hở tay–trang phục 0.110m không trùng phép tính được diễn giải.

Mốc x 0.680 và biên trang phục 0.555 cho chênh 0.125m; những đầu ngón trong bảng có chênh 0.097–0.135m. Đây chưa phải khoảng cách mesh-to-mesh.

**Hệ quả khi sửa:** Phải ghi rõ đang đo wrist, palm, đầu ngón hay bề mặt áo. Kiểm khoảng hở thật trên hai mesh chứ không lấy một hiệu tọa độ X làm bằng chứng.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:156](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L156), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:185](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L185), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:233](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L233), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:249](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L249).

### X07 · H01 · DOCX mới không yêu cầu bàn tay phải của H01 chống chạm sàn như ý tưởng cũ.

Cổ tay phải ở Z=0.400m, đuôi Hand.R ở Z=0.260m; các con số này không phải một tiếp xúc với ground Z=0.

**Hệ quả khi sửa:** Báo cáo tách mục tiêu mới của Gemini khỏi mô tả cũ của người dùng. Không dùng chiều cao cổ tay để kết luận đầu ngón đã chạm sàn, cũng không gọi hở sàn là sai DOCX H01.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:108](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L108), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:130](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L130).

### X08 · H01 · Tám control trượng ×0.300m không bằng chiều dài trượng 2.350m nếu coi là tám đoạn nối liên tiếp.

Tổng là 2.400m, lệch 0.050m. Có thể đây là control spline thay vì độ dài vật lý, nhưng nguồn không làm rõ.

**Hệ quả khi sửa:** Định nghĩa spline control và biên mesh riêng; không kéo model thật chỉ để đủ tổng độ dài bone trong bảng.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:82](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L82), [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:152](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L152).

### X09 · H02 · Báo cáo cây chùy gọi nhân vật Lâm Dật/manơcanh, khác Hàn Trạch của nhiệm vụ.

Nguồn minh họa manơcanh cao 1.85m và cây chùy 1.75m. Danh tính H02 đến từ yêu cầu người dùng và asset SHA, không phải cái tên viết nhầm trong DOCX.

**Hệ quả khi sửa:** Dùng hình làm tham chiếu động tác và mặt phẳng vũ khí. Không thay người Hunyuan bằng manơcanh hoặc đổi danh tính asset.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:9](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L9), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:13](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L13), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:26](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L26), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:56](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L56).

### X10 · H02 · Mode A/B chưa nêu một mặt phẳng mirror thống nhất.

Mode A có shaft X=-0.160m. Mirror quanh X=0 cho +0.160m, không phải +0.340m như prose Mode B. Mirror quanh X=+0.090m mới cho +0.340m.

**Hệ quả khi sửa:** Giữ tay trái liên tục là lựa chọn hợp lý để tránh đổi tay giữa Khung 2–3, nhưng khi sửa phải mirror toàn bộ pose/weapon/camera trong một hệ chuẩn, không trộn tọa độ Mode A với handedness Mode B.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:20](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L20), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:146](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L146), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:158](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L158), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:178](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L178).

### X11 · H02 · Tọa độ tay chống sàn Khung 2 yêu cầu xương dài hơn rest nguồn.

Vai→khuỷu ≈0.402119m trong khi upper arm rest 0.295m (+36.31%); khuỷu→cổ tay ≈0.401123m trong khi forearm rest 0.270m (+48.56%).

**Hệ quả khi sửa:** Không kéo xương để chạm sàn. Điều chỉnh trọng tâm/thân/điểm chống trong giới hạn giải phẫu, đồng thời công bố sai số với bảng không khả thi.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:65](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L65), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:96](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L96), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:118](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L118), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:119](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L119), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:120](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L120).

### X12 · H02 · Tọa độ tay Khung 3 lại yêu cầu co xương cực mạnh.

Forearm tính từ head–tail ≈0.107005m so rest 0.270m (−60.37%); Hand ≈0.008660m so rest 0.190m (−95.44%).

**Hệ quả khi sửa:** Không có cùng một rig cứng nào đồng thời đạt Khung 2 và Khung 3 theo các điểm đó. Những con số này là lỗi tài liệu, không phải tiêu chuẩn để chấp nhận mesh bị ép co.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:65](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L65), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:169](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L169), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:170](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L170).

### X13 · H02 · Tâm búa đổi tọa độ world khi đổi camera mà không có chuyển động giải thích.

Tâm đầu búa từ (−0.18,−0.04,0.12) sang (+0.34,−0.18,0.12), dịch 0.538516m quanh bước chuyển pha. Camera tự nó không làm đổi vị trí world.

**Hệ quả khi sửa:** Phải xác định đây là hai shot-local frame hay thiết kế chuyển động liên tục. Không teleport búa trong một frame để khớp cả hai bảng.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:248](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L248), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:249](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L249).

### X14 · H02 · Telemetry giữa pha làm thay đổi chiều dài cây chùy rắn.

Khoảng cách head center→tail tại 1.87s ≈0.417762m; tại 2.13s ≈1.098405m; cuối ≈1.630m. Ba con số không thể cùng thuộc một cây chùy cứng không biến dạng.

**Hệ quả khi sửa:** Dùng một rigid transform cho cả mesh, không nội suy head/tail độc lập hoặc scale chùy theo bảng. Giữ phương hướng và tiếp xúc rồi ghi sai lệch tham chiếu.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:253](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L253), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:254](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L254), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:255](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L255), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256).

### X15 · H02 · Dấu độ cao đầu búa không khớp diễn giải “lún 1.2cm”.

Điểm đáy được ghi Z=+0.012m. Với ground Z=0 và +Z hướng lên, đây là cách sàn 1.2cm; lún 1.2cm phải là −0.012m.

**Hệ quả khi sửa:** Dùng signed distance với sàn thật để kiểm tiếp xúc; không vừa coi +0.012 là khoảng hở vừa báo lún đất.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:81](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L81).

### X16 · BOTH · Các đoạn bpy là minh họa, chưa phải pipeline retarget đầy đủ.

PoseBone.location là local/rest-relative, không phải world head. Script chưa ánh xạ các tên xương của runtime, rest matrices, chuỗi contact/IK và toàn bộ finger/phase. Script H02 cũng chưa thực hiện đầy đủ Mode B và pose cuối.

**Hệ quả khi sửa:** Không chạy đè asset theo script minh họa trong lượt audit. Phải xác minh trên mesh runtime thật; bản code trong DOCX không tự chứng nhận bản thân đúng.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:297](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L297).

Đối chiếu thêm [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:264](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L264).

### X17 · H02 · Độ trễ búa rơi→nhân vật khác mô tả trước đây của người dùng.

DOCX đặt impact 0.30s và nhân vật hiện 0.7667s, chênh 0.4667s. Mô tả cũ yêu cầu sau khoảng 1.5 giây.

**Hệ quả khi sửa:** Tách kết luận “khớp DOCX mới” và “khớp ý tưởng cũ”. Không âm thầm coi hai khoảng thời gian là một hoặc tự sửa khi đang chờ duyệt.

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:48](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L48), [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:49](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L49).

## 6. Chỉ mục toàn bộ bảng gốc và giới hạn kiểm định từng hàng

Phần này bảo đảm có đường dẫn tới **mọi hàng thông số** thay vì bỏ qua ngón tay, vũ khí hoặc telemetry. Các bảng bên dưới chép dữ liệu trích xuất để tra cứu; cột kết luận theo nhóm không phải một phép đo bề mặt riêng cho mỗi ô. Bảng ngón cần đối chiếu bề mặt thật trong MOTION-MATH; head/tail/Euler không tự đủ để chứng minh khít cán hoặc không xuyên áo.

### H01-T01 · executive · 1 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:13](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L13) (bảng Word 1; kết thúc ở dòng 14).

- `H01-T01-R01`: [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:13](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L13) — Xem ma trận tường thuật; không phải kết quả render.

### H01-T02 · coordinates · 5 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:30](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L30) (bảng Word 2; kết thúc ở dòng 36).

| ID / dòng nguồn | Trục / Phía Không Gian | Hướng Trong Blender World Space | Vị Trí Trên Bức Ảnh 2D (Người Xem Nhìn Vào) | Phía Giải Phẫu Của Nhân Vật (Rig Bone Suffix) | Ứng Dụng Cụ Thể Tại Khung 3 | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- |
| `H01-T02-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:32](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L32) | Trục -X (Âm X) | Từ tâm (0,0,0) đi sang trái Viewport | Phía BÊN TRÁI bức ảnh (Viewer's Left) | Bên PHẢI cơ thể nhân vật (Hậu tố .R) | Vị trí đặt Cây Trượng Dây Leo (X = -0.230m) & Cánh tay phải (UpperArm.R, Forearm.R, Hand.R) nâng góc 35° nắm trượng. | Cần hiệu chuẩn hệ trục và camera |
| `H01-T02-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:33](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L33) | Trục +X (Dương X) | Từ tâm (0,0,0) đi sang phải Viewport | Phía BÊN PHẢI bức ảnh (Viewer's Right) | Bên TRÁI cơ thể nhân vật (Hậu tố .L) | Vị trí nhân vật đứng dịch sang phải (Pelvis X = +0.450m) & Cánh tay trái (Hand.L tại X = +0.680m) thả lỏng sát hông. | Cần hiệu chuẩn hệ trục và camera |
| `H01-T02-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:34](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L34) | Trục -Y (Âm Y) | Hướng từ gốc (0,0,0) về phía ống kính Camera | Hướng lao ra phía trước mặt người xem | Mặt trước ngực / bụng nhân vật (Anterior) | Hướng nhìn của nhân vật, đầu gối trái ở Khung 2 và ngón cái phải (Thumb.R) vòng qua mặt trước thân trượng. | Cần hiệu chuẩn hệ trục và camera |
| `H01-T02-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:35](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L35) | Trục +Y (Dương Y) | Hướng từ gốc (0,0,0) đi sâu vào hậu cảnh | Hướng lùi ra phía sau sườn đồi đất đá | Mặt sau lưng nhân vật (Posterior) | Bàn chân phải chống phía sau ở Khung 2 (Y = +0.140m) và 4 ngón tay phải vòng qua mặt sau thân trượng. | Cần hiệu chuẩn hệ trục và camera |
| `H01-T02-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:36](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L36) | Trục +Z (Dương Z) | Hướng thẳng đứng từ mặt đất lên bầu trời | Hướng từ cạnh dưới lên cạnh trên bức ảnh | Chiều cao từ bàn chân lên đỉnh đầu (Superior) | Mặt đất tại Z = 0.000m; Pelvis Khung 2 tại Z = 0.520m; Pelvis Khung 3 tại Z = 0.960m; Tâm nắm trượng tại Z = 1.783m. | Cần hiệu chuẩn hệ trục và camera |

### H01-T03 · timeline · 5 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:48](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L48) (bảng Word 3; kết thúc ở dòng 54).

| ID / dòng nguồn | Pha Hoạt Cảnh | Khoảng Frame (60 FPS) | Thời Gian Thực t (Giây) | Trạng Thái Hiển Thị Nhân Vật | Trạng Thái Động Học Chính & Hàm Nội Suy (F-Curve Interpolation) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- |
| `H01-T03-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:50](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L50) | Pha 1: Khung 1 (Dây leo phá đất) | Frame 1 – Frame 45 | 0.00s – 0.75s | KHÔNG CÓ NHÂN VẬT (hide_viewport = True, Scale = 0) | 6 nhánh dây leo phóng vọt từ vết nứt (0,0,0) lên độ cao 0.52m – 1.72m; hạt đất đá bắn tung toé. Nội suy: Bezier Ease-Out (vận tốc đầu cực đại). | Có khung pha, còn sai nội dung; xem ma trận |
| `H01-T03-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:51](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L51) | Pha 2: Chuyển tiếp 1 -> 2 (Trồi lên & Đáp đất) | Frame 46 – Frame 60 | 0.76s – 1.00s | Bật hiển thị tại Frame 46 (Scale = 1,0,1) | Nhân vật phóng vọt từ lòng đất lên đỉnh parabol (Pelvis Z = 0.780m tại Frame 52) rồi lao mạnh xuống đáp đất tại Frame 60 (Pelvis Z = 0.520m). | Có khung pha, còn sai nội dung; xem ma trận |
| `H01-T03-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:52](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L52) | Pha 3: Khung 2 (Ngồi xổm dũng mãnh) | Frame 60 – Frame 95 | 1.00s – 1.58s | Hiển thị tại tâm X = 0.000m (Tay không) | Giữ tư thế ngồi xổm anh hùng (Heroic Crouch) kèm dao động giảm chấn (Damped Spring ΔZ = -0.025m tại Frame 64) tạo cảm giác chấn động mặt đất. | Có khung pha, còn sai nội dung; xem ma trận |
| `H01-T03-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:53](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L53) | Pha 4: Chuyển tiếp 2 -> 3 (Đứng dậy dịch phải & Bện trượng) | Frame 96 – Frame 145 | 1.60s – 2.42s | Dịch chuyển từ X = 0.000m sang X = +0.450m | Nhân vật đạp chân đứng dậy đồng thời dịch sang phải (+X). Dây leo xoắn bện thành trượng ở bên trái (X = -0.230m). Tay phải nâng góc +35° mở ngón (Frame 122) rồi siết chặt trượng (Frame 142). | Có khung pha, còn sai nội dung; xem ma trận |
| `H01-T03-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:54](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L54) | Pha 5: Khung 3 (Đứng uy nghiêm nắm trượng) | Frame 145 – Frame 180 | 2.42s – 3.00s | Đứng tại X = +0.450m, nắm trượng tại X = -0.230m | Cố định tư thế Khung 3: Tay phải nâng chếch +35.0° nắm chặt cây trượng bên trái ảnh; tay trái buông thả tự nhiên sát hông (X = +0.680m). | Có khung pha, còn sai nội dung; xem ma trận |

### H01-T04 · hierarchy · 19 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:62](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L62) (bảng Word 4; kết thúc ở dòng 82).

| ID / dòng nguồn | Nhóm Khớp | Tên Khớp Chuẩn (Bone Name) | Khớp Cha (Parent Bone) | Chiều Dài Xương (m) | Góc Bone Roll (°) | Chức Năng Cơ Sinh Học & Điều Khiển Chính | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T04-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:64](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L64) | Gốc & Trọng tâm | Root | None (World Origin) | 0.150 | 0.0° | Gốc toạ độ thế giới của Rig; neo tại mặt đất dưới trọng tâm nhân vật. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:65](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L65) | Gốc & Trọng tâm | Pelvis | Root | 0.130 | 0.0° | Khớp xương chậu (Center of Mass); điều khiển tịnh tiến (X, Y, Z) và độ nghiêng hông. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:66](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L66) | Cột sống & Đầu | Spine_01 | Pelvis | 0.140 | 0.0° | Đốt sống thắt lưng dưới (L1–L5); chịu trách nhiệm gập bụng khi ngồi xổm ở Khung 2. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:67](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L67) | Cột sống & Đầu | Spine_02 | Spine_01 | 0.150 | 0.0° | Đốt sống ngực dưới (T7–T12); truyền lực xoay và nâng thân người khi đứng dậy. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:68](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L68) | Cột sống & Đầu | Chest | Spine_02 | 0.150 | 0.0° | Lồng ngực trên (T1–T6); điểm neo của hai xương đòn (Clavicle.R / Clavicle.L). | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:69](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L69) | Cột sống & Đầu | Neck | Chest | 0.100 | 0.0° | Khớp cổ (C1–C7); bù góc nghiêng với ngực để giữ tầm nhìn hướng về Camera. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:70](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L70) | Cột sống & Đầu | Head | Neck | 0.200 | 0.0° | Khối hộp sọ (Từ đáy sọ đến đỉnh đầu Head_Top); định hướng ánh nhìn nhân vật. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:71](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L71) | Chi trên Phải (.R) | Clavicle.R | Chest | 0.130 | -90.0° | Xương đòn phải (Bên trái ảnh); nâng nhẹ +8° khi cánh tay phải vươn lên góc 35°. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:72](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L72) | Chi trên Phải (.R) | UpperArm.R | Clavicle.R | 0.280 | 0.0° | Bắp tay phải (Bên trái ảnh); khớp vai cầu xoay 3 trục, nâng chếch +35° ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:73](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L73) | Chi trên Phải (.R) | Forearm.R | UpperArm.R | 0.255 | 0.0° | Cẳng tay phải; điều khiển gập khuỷu tay và xoay sấp/ngửa cổ tay (Pronation/Supination). | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:74](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L74) | Chi trên Phải (.R) | Hand.R | Forearm.R | 0.085 | 0.0° | Bàn tay phải; khớp gốc chứa 5 chuỗi xương ngón tay phải thực hiện nắm cây trượng. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:75](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L75) | Chi trên Trái (.L) | Clavicle.L | Chest | 0.130 | 90.0° | Xương đòn trái (Bên phải ảnh); giữ cân bằng ngang vai ở cả Khung 2 và Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R13` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:76](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L76) | Chi trên Trái (.L) | UpperArm.L | Clavicle.L | 0.280 | 0.0° | Bắp tay trái (Bên phải ảnh); gập đè lên đùi ở Khung 2, buông xuôi tự nhiên ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R14` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:77](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L77) | Chi trên Trái (.L) | Forearm.L | UpperArm.L | 0.255 | 0.0° | Cẳng tay trái; vắt ngang trước đầu gối trái ở Khung 2, duỗi dọc hông ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R15` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:78](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L78) | Chi trên Trái (.L) | Hand.L | Forearm.L | 0.085 | 0.0° | Bàn tay trái; thả lỏng hoàn toàn ở cả Khung 2 và Khung 3 (không cầm vật thể). | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R16` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:79](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L79) | Chi dưới Phải (.R) | Thigh.R / Calf.R / Foot.R / Toe.R | Pelvis -> ... -> Foot.R | 0.44 / 0.42 / 0.14 | 0.0° | Chân phải (Bên trái ảnh); quỳ hạ thấp gối ở Khung 2, đứng thẳng chịu lực ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R17` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:80](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L80) | Chi dưới Trái (.L) | Thigh.L / Calf.L / Foot.L / Toe.L | Pelvis -> ... -> Foot.L | 0.44 / 0.42 / 0.14 | 0.0° | Chân trái (Bên phải ảnh); chống vuông góc ở Khung 2, đứng thẳng ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R18` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:81](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L81) | 30 Khớp Ngón Tay | Thumb / Index / Middle / Ring / Pinky (.01..03.R & .L) | Hand.R / Hand.L | 0.022 – 0.042 | 90.0° | 15 khớp/bàn tay (3 đốt/ngón: MCP, PIP, DIP); trục +X nội bộ là góc gập lòng bàn tay. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H01-T04-R19` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:82](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L82) | 8 Khớp Trượng Dây Leo | VineStaff_01 .. VineStaff_08 | Root (Hoặc World) | 0.300 / đoạn | 0.0° | Chuỗi xương Spline điều khiển 6 nhánh dây leo ở Khung 1–2 bện thành cây trượng ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |

### H01-T05 · vines · 7 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:90](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L90) (bảng Word 5; kết thúc ở dòng 98).

| ID / dòng nguồn | Tên Đối Tượng / Khớp Spline | Toạ Độ Gốc Xuất Phát (X, Y, Z) m | Toạ Độ Đốt Giữa Tại Frame 45 (X, Y, Z) m | Toạ Độ Đỉnh Ngọn Tại Frame 45 (X, Y, Z) m | Vector Vận Tốc Phóng (VX, VY, VZ) m/s | Góc Uốn & Trạng Thái Hiển Thị | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T05-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:92](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L92) | Character_Rig (Lâm Dật) | (0.000, 0.000, -1.500) | Ẩn hoàn toàn (Scale = 0) | Ẩn hoàn toàn (Scale = 0) | (0.00, 0.00, 0.00) | KHÔNG HIỂN THỊ (hide_viewport = True, hide_render = True) | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:93](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L93) | Vine_Branch_01 (Nhánh chính cao nhất) | (-0.080, +0.050, 0.000) | (-0.220, -0.040, +0.780) | (+0.120, -0.020, +1.720) | (+0.26, -0.09, +2.29) | Uốn cong hình chữ S vươn cao 1.72m; bán kính gốc R = 0.022m | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:94](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L94) | Vine_Branch_02 (Nhánh trung tâm phải) | (+0.050, 0.000, 0.000) | (+0.280, -0.080, +0.820) | (+0.620, +0.020, +1.550) | (+0.76, +0.03, +2.06) | Phóng chéo góc 62° sang phía bên phải ảnh (+X); gai nhọn dày | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:95](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L95) | Vine_Branch_03 (Nhánh quét thấp phải) | (+0.120, +0.080, 0.000) | (+0.440, -0.020, +0.550) | (+0.780, -0.040, +0.980) | (+0.88, -0.16, +1.31) | Lao thấp góc 48° sang phải (+X), cày xới lớp đá dăm mặt đất | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:96](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L96) | Vine_Branch_04 (Nhánh vòng cung hậu cảnh) | (+0.020, +0.120, 0.000) | (+0.380, +0.060, +0.640) | (+0.740, +0.050, +1.120) | (+0.96, -0.09, +1.49) | Uốn vòm phía sau (+Y = +0.06m), tạo chiều sâu không gian 3D | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:97](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L97) | Vine_Branch_05 (Nhánh ngắn văng trái) | (-0.220, -0.080, 0.000) | (-0.340, -0.120, +0.240) | (-0.460, -0.140, +0.520) | (-0.32, -0.08, +0.69) | Bật ngược sang bên trái ảnh (-X) đối trọng với chùm dây bên phải | Chưa chứng minh bằng phép đo đối tượng thật |
| `H01-T05-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:98](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L98) | Debris_Emitter (Hệ hạt đất đá văng) | (0.000, -0.020, 0.000) | Bán kính phát tán 0.45m | Độ cao cực đại +1.650m | (±1.40, -0.85, +3.20) | Phóng 120 hạt đá góc cạnh + đám mây bụi cát mịn (Turbulence = 1.8) | Chưa chứng minh bằng phép đo đối tượng thật |

### H01-T06 · body_crouch · 23 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:118](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L118) (bảng Word 6; kết thúc ở dòng 142).

| ID / dòng nguồn | Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Giải Phẫu Tại Khung 2 | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T06-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:120](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L120) | Root | (0.000, 0.000, 0.000) | (0.000, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Neo cố định tại tâm vết nứt mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:121](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L121) | Pelvis | (0.000, +0.040, 0.520) | (0.000, +0.010, 0.650) | (+18.5°, 0.0°, 0.0°) | (0.987, +0.161, 0.000, 0.000) | Hạ thấp trọng tâm Z=0.52m, nghiêng trước 18.5° | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:122](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L122) | Spine_01 | (0.000, +0.010, 0.650) | (0.000, -0.040, 0.790) | (+8.0°, 0.0°, -2.0°) | (0.997, +0.070, -0.001, -0.017) | Gập nhẹ vùng thắt lưng thu lực tiếp đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:123](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L123) | Spine_02 | (0.000, -0.040, 0.790) | (0.000, -0.090, 0.930) | (+6.5°, 0.0°, -2.5°) | (0.998, +0.057, -0.001, -0.022) | Cột sống ngực đổ về phía trước (-Y) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:124](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L124) | Chest | (0.000, -0.090, 0.930) | (0.000, -0.130, 1.050) | (+5.0°, -3.0°, +4.0°) | (0.998, +0.044, -0.026, +0.035) | Ngực hơi xoay nhẹ đưa vai phải xuống thấp | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:125](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L125) | Neck | (0.000, -0.130, 1.050) | (0.000, -0.160, 1.150) | (-10.0°, 0.0°, 0.0°) | (0.996, -0.087, 0.000, 0.000) | Cổ ngẩng bù góc với ngực để giữ đầu ổn định | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:126](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L126) | Head | (0.000, -0.160, 1.150) | (0.000, -0.190, 1.340) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | Đầu hơi cúi nhìn thẳng về Camera (-Y) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:127](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L127) | Clavicle.R | (-0.050, -0.090, 0.990) | (-0.170, -0.100, 0.960) | (0.0°, +14.0°, -5.0°) | (0.992, 0.000, +0.122, -0.043) | Vai phải (bên trái ảnh) hạ thấp hướng xuống | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:128](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L128) | UpperArm.R | (-0.170, -0.100, 0.960) | (-0.180, -0.150, 0.670) | (+12.0°, -4.0°, -168.0°) | (0.104, +0.011, -0.104, -0.989) | Bắp tay phải duỗi thẳng hướng xuống mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:129](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L129) | Forearm.R | (-0.180, -0.150, 0.670) | (-0.160, -0.200, 0.400) | (+10.5°, +5.0°, 0.0°) | (0.995, +0.091, +0.043, 0.000) | Cẳng tay phải duỗi dọc theo cạnh trong gối phải | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:130](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L130) | Hand.R | (-0.160, -0.200, 0.400) | (-0.150, -0.220, 0.260) | (+6.0°, -8.0°, +15.0°) | (0.988, +0.052, -0.069, +0.130) | Bàn tay phải mở hờ hướng xuống đất (Tay không) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:131](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L131) | Clavicle.L | (+0.050, -0.090, 0.990) | (+0.170, -0.080, 0.980) | (0.0°, -5.0°, +4.0°) | (0.998, 0.000, -0.044, +0.035) | Vai trái (bên phải ảnh) mở tự nhiên | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R13` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:132](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L132) | UpperArm.L | (+0.170, -0.080, 0.980) | (+0.350, -0.140, 0.760) | (+22.0°, +38.0°, +142.0°) | (0.312, +0.180, +0.310, +0.880) | Bắp tay trái đưa ra ngoài và về trước đùi trái | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R14` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:133](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L133) | Forearm.L | (+0.350, -0.140, 0.760) | (+0.130, -0.220, 0.600) | (+82.0°, -15.0°, -48.0°) | (0.685, +0.602, -0.112, -0.395) | Khuỷu tay trái gập 82°, vắt ngang qua gối trái | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R15` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:134](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L134) | Hand.L | (+0.130, -0.220, 0.600) | (+0.030, -0.250, 0.540) | (+12.0°, +10.0°, -18.0°) | (0.978, +0.103, +0.086, -0.155) | Bàn tay trái buông hờ trước gối trái (Tay không) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R16` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:135](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L135) | Thigh.R | (-0.100, +0.040, 0.500) | (-0.260, -0.240, 0.300) | (+58.0°, -26.0°, -145.0°) | (0.262, +0.435, -0.198, -0.840) | Đùi phải mở sang trái ảnh và lao thấp về trước | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R17` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:136](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L136) | Calf.R | (-0.260, -0.240, 0.300) | (-0.050, +0.140, 0.140) | (-124.0°, +18.0°, +22.0°) | (0.456, -0.865, +0.125, +0.152) | Cẳng chân phải gập sâu 124° đưa gót chân về sau | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R18` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:137](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L137) | Foot.R | (-0.050, +0.140, 0.140) | (-0.050, +0.020, 0.020) | (+45.0°, 0.0°, 0.0°) | (0.924, +0.383, 0.000, 0.000) | Cổ chân phải dựng đứng, mũi chân chống đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R19` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:138](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L138) | Toe.R | (-0.050, +0.020, 0.020) | (-0.050, -0.050, 0.000) | (-52.0°, 0.0°, 0.0°) | (0.899, -0.438, 0.000, 0.000) | Các ngón chân phải gập bám chặt mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R20` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:139](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L139) | Thigh.L | (+0.100, +0.040, 0.500) | (+0.240, -0.220, 0.620) | (+108.0°, +22.0°, +165.0°) | (0.076, +0.795, +0.165, +0.578) | Đùi trái nâng cao hướng đầu gối lên trước ngực | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R21` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:140](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L140) | Calf.L | (+0.240, -0.220, 0.620) | (+0.160, -0.140, 0.090) | (-118.0°, -8.0°, -10.0°) | (0.512, -0.851, -0.058, -0.072) | Cẳng chân trái cắm thẳng từ gối xuống mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R22` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:141](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L141) | Foot.L | (+0.160, -0.140, 0.090) | (+0.180, -0.280, 0.020) | (+18.0°, 0.0°, +8.0°) | (0.985, +0.156, 0.000, +0.070) | Bàn chân trái đặt phẳng vững chắc trên mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T06-R23` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:142](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L142) | Toe.L | (+0.180, -0.280, 0.020) | (+0.190, -0.350, 0.000) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Mũi bàn chân trái áp sát mặt đất phẳng | Nguồn có xung đột; cần kiểm mesh runtime |

### H01-T07 · body_final · 24 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:168](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L168) (bảng Word 7; kết thúc ở dòng 193).

| ID / dòng nguồn | Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Giải Phẫu Tại Khung 3 | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T07-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:170](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L170) | Root | (+0.450, 0.000, 0.000) | (+0.450, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Dịch sang bên phải bức ảnh ΔX = +0.450m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:171](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L171) | Pelvis | (+0.450, 0.000, 0.960) | (+0.450, 0.000, 1.100) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Đứng thẳng hoàn toàn tại X = +0.450m, Z = 0.960m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:172](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L172) | Spine_01 | (+0.450, 0.000, 1.100) | (+0.450, 0.000, 1.250) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống thắt lưng thẳng đứng dọc trục +Z | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:173](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L173) | Spine_02 | (+0.450, 0.000, 1.250) | (+0.450, 0.000, 1.400) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống ngực thẳng đứng, mở rộng lồng ngực | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:174](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L174) | Chest | (+0.450, 0.000, 1.400) | (+0.450, 0.000, 1.520) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Ngực hướng trực diện về phía Camera (-Y) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:175](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L175) | Neck | (+0.450, 0.000, 1.520) | (+0.450, -0.010, 1.620) | (+2.0°, 0.0°, 0.0°) | (1.000, +0.017, 0.000, 0.000) | Cổ thẳng uy nghiêm, giữ đầu cân bằng | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:176](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L176) | Head | (+0.450, -0.010, 1.620) | (+0.450, -0.010, 1.820) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Đầu nhìn thẳng về phía trước (-Y), đỉnh đầu Z=1.82m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:177](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L177) | Clavicle.R | (+0.390, 0.000, 1.430) | (+0.260, 0.000, 1.440) | (0.0°, -4.4°, 0.0°) | (0.999, 0.000, -0.038, 0.000) | Xương đòn phải nâng nhẹ hỗ trợ góc vươn tay 35° | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:178](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L178) | UpperArm.R | (+0.260, 0.000, 1.440) | (+0.030, -0.020, 1.601) | (+4.2°, +35.0°, -55.0°) | (0.848, +0.165, +0.258, -0.432) | Bắp tay phải nâng chếch góc +35.0° sang trái ảnh (-X) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:179](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L179) | Forearm.R | (+0.030, -0.020, 1.601) | (-0.180, -0.035, 1.748) | (+3.5°, +12.0°, 0.0°) | (0.994, +0.030, +0.104, 0.000) | Cẳng tay phải nối thẳng trục 35.0° tới cổ tay phải | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:180](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L180) | Hand.R | (-0.180, -0.035, 1.748) | (-0.230, -0.040, 1.783) | (-8.0°, +75.0°, +15.0°) | (0.785, -0.055, +0.602, +0.131) | Cổ tay phải xoay dọc theo thân trượng tại Z=1.748m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:181](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L181) | Clavicle.L | (+0.510, 0.000, 1.430) | (+0.640, 0.000, 1.440) | (0.0°, +4.4°, 0.0°) | (0.999, 0.000, +0.038, 0.000) | Xương đòn trái cân bằng ngang vai | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R13` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:182](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L182) | UpperArm.L | (+0.640, 0.000, 1.440) | (+0.670, +0.010, 1.160) | (-2.0°, -83.8°, +90.0°) | (0.525, -0.472, -0.472, +0.528) | Bắp tay trái buông xuôi tự nhiên bên phải ảnh (+X) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R14` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:183](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L183) | Forearm.L | (+0.670, +0.010, 1.160) | (+0.680, -0.010, 0.900) | (+4.5°, -2.2°, 0.0°) | (0.999, +0.039, -0.019, 0.000) | Cẳng tay trái thả lỏng tạo khoảng trống 0.11m với hông | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R15` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:184](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L184) | Hand.L | (+0.680, -0.010, 0.900) | (+0.675, -0.020, 0.740) | (+3.0°, +6.0°, 0.0°) | (0.998, +0.026, +0.052, 0.000) | Bàn tay trái mở tự nhiên, lòng bàn tay hướng vào đùi | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R16` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:185](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L185) | Thigh.R | (+0.350, 0.000, 0.940) | (+0.340, -0.010, 0.500) | (+1.3°, -1.3°, -180.0°) | (0.000, +0.011, -0.011, -1.000) | Đùi phải đứng thẳng chịu lực tại X = +0.345m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R17` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:186](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L186) | Calf.R | (+0.340, -0.010, 0.500) | (+0.330, +0.020, 0.080) | (-4.1°, 0.0°, 0.0°) | (0.999, -0.036, 0.000, 0.000) | Cẳng chân phải thẳng vững chãi | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R18` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:187](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L187) | Foot.R / Toe.R | (+0.330, +0.020, 0.080) | (+0.320, -0.120, 0.020) | (+66.8°, 0.0°, +4.0°) | (0.834, +0.550, 0.000, +0.035) | Bàn chân phải đặt phẳng trên mặt đất tại X=+0.33m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R19` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:188](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L188) | Thigh.L | (+0.550, 0.000, 0.940) | (+0.560, -0.010, 0.500) | (+1.3°, +1.3°, +180.0°) | (0.000, +0.011, +0.011, +1.000) | Đùi trái đứng thẳng đối xứng qua trục Pelvis X=+0.45m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R20` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:189](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L189) | Calf.L | (+0.560, -0.010, 0.500) | (+0.570, +0.020, 0.080) | (-4.1°, 0.0°, 0.0°) | (0.999, -0.036, 0.000, 0.000) | Cẳng chân trái thẳng đứng | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R21` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:190](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L190) | Foot.L / Toe.L | (+0.570, +0.020, 0.080) | (+0.580, -0.120, 0.020) | (+66.8°, 0.0°, -4.0°) | (0.834, +0.550, 0.000, -0.035) | Bàn chân trái đặt phẳng trên mặt đất tại X=+0.57m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R22` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:191](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L191) | VineStaff_01..04 (Nửa dưới) | (-0.190, -0.020, 0.000) | (-0.220, -0.040, 1.200) | (+1.0°, -1.5°, 0.0°) | (0.999, +0.009, -0.013, 0.000) | Gốc trượng cắm đất tại X=-0.19m, thân lên X=-0.22m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R23` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:192](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L192) | VineStaff_05..06 (Vùng nắm) | (-0.220, -0.040, 1.200) | (-0.230, -0.040, 1.783) | (0.0°, -0.8°, 0.0°) | (1.000, 0.000, -0.007, 0.000) | Tâm nắm trượng tại (-0.230, -0.040, 1.783)m, R=28mm | Nguồn có xung đột; cần kiểm mesh runtime |
| `H01-T07-R24` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:193](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L193) | VineStaff_07..08 (Ngọn trượng) | (-0.230, -0.040, 1.783) | (-0.260, -0.020, 2.350) | (-1.5°, -2.8°, 0.0°) | (0.999, -0.013, -0.024, 0.000) | Ngọn trượng dây leo vươn cao tới Z = 2.350m | Nguồn có xung đột; cần kiểm mesh runtime |

### H01-T08 · grip_fingers · 15 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:211](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L211) (bảng Word 8; kết thúc ở dòng 227).

| ID / dòng nguồn | Tên Khớp Ngón Tay Phải (.R) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Gập Local Euler (Flexion RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Góc Gập Tại Khung 2 (Tay Không) ° | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T08-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:213](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L213) | Thumb.01.R (Đốt bàn CMC) | Hand.R | (-0.195, -0.055, 1.762) | (-0.218, -0.072, 1.778) | (+38.0°, +42.0°, -18.0°) | (0.875, +0.305, +0.335, -0.172) | (+12.0°, +15.0°, -5.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:214](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L214) | Thumb.02.R (Đốt gần MCP) | Thumb.01.R | (-0.218, -0.072, 1.778) | (-0.242, -0.068, 1.786) | (+48.0°, +8.0°, -6.0°) | (0.910, +0.405, +0.065, -0.048) | (+14.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:215](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L215) | Thumb.03.R (Đốt xa IP) | Thumb.02.R | (-0.242, -0.068, 1.786) | (-0.254, -0.052, 1.790) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | (+10.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:216](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L216) | Index.01.R (Đốt gần MCP) | Hand.R | (-0.200, -0.008, 1.795) | (-0.230, +0.005, 1.812) | (+65.0°, 0.0°, +6.0°) | (0.842, +0.536, 0.000, +0.044) | (+15.0°, 0.0°, +4.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:217](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L217) | Index.02.R (Đốt giữa PIP) | Index.01.R | (-0.230, +0.005, 1.812) | (-0.255, -0.010, 1.808) | (+82.0°, 0.0°, 0.0°) | (0.755, +0.656, 0.000, 0.000) | (+22.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:218](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L218) | Index.03.R (Đốt xa DIP) | Index.02.R | (-0.255, -0.010, 1.808) | (-0.260, -0.032, 1.800) | (+50.0°, 0.0°, 0.0°) | (0.906, +0.423, 0.000, 0.000) | (+12.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:219](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L219) | Middle.01.R (Đốt gần MCP) | Hand.R | (-0.202, -0.012, 1.778) | (-0.232, +0.002, 1.792) | (+70.0°, 0.0°, 0.0°) | (0.819, +0.574, 0.000, 0.000) | (+18.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:220](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L220) | Middle.02.R (Đốt giữa PIP) | Middle.01.R | (-0.232, +0.002, 1.792) | (-0.258, -0.015, 1.788) | (+85.0°, 0.0°, 0.0°) | (0.737, +0.676, 0.000, 0.000) | (+25.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:221](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L221) | Middle.03.R (Đốt xa DIP) | Middle.02.R | (-0.258, -0.015, 1.788) | (-0.262, -0.038, 1.782) | (+52.0°, 0.0°, 0.0°) | (0.899, +0.438, 0.000, 0.000) | (+14.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:222](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L222) | Ring.01.R (Đốt gần MCP) | Hand.R | (-0.204, -0.016, 1.760) | (-0.233, -0.002, 1.772) | (+72.0°, 0.0°, -4.0°) | (0.808, +0.587, 0.000, -0.028) | (+20.0°, 0.0°, -3.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:223](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L223) | Ring.02.R (Đốt giữa PIP) | Ring.01.R | (-0.233, -0.002, 1.772) | (-0.256, -0.018, 1.768) | (+86.0°, 0.0°, 0.0°) | (0.731, +0.682, 0.000, 0.000) | (+26.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:224](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L224) | Ring.03.R (Đốt xa DIP) | Ring.02.R | (-0.256, -0.018, 1.768) | (-0.259, -0.040, 1.763) | (+54.0°, 0.0°, 0.0°) | (0.891, +0.454, 0.000, 0.000) | (+15.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R13` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:225](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L225) | Pinky.01.R (Đốt gần MCP) | Hand.R | (-0.206, -0.020, 1.742) | (-0.232, -0.006, 1.752) | (+74.0°, 0.0°, -8.0°) | (0.797, +0.600, 0.000, -0.056) | (+22.0°, 0.0°, -6.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R14` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:226](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L226) | Pinky.02.R (Đốt giữa PIP) | Pinky.01.R | (-0.232, -0.006, 1.752) | (-0.252, -0.020, 1.749) | (+88.0°, 0.0°, 0.0°) | (0.719, +0.695, 0.000, 0.000) | (+28.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T08-R15` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:227](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L227) | Pinky.03.R (Đốt xa DIP) | Pinky.02.R | (-0.252, -0.020, 1.749) | (-0.255, -0.039, 1.745) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | (+16.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |

### H01-T09 · free_fingers · 15 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:233](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L233) (bảng Word 9; kết thúc ở dòng 249).

| ID / dòng nguồn | Tên Khớp Ngón Tay Trái (.L) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Cong Sinh Lý Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Khoảng Trống Đến Đùi Trái ΔX (m) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T09-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:235](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L235) | Thumb.01.L (Đốt bàn CMC) | Hand.L | (+0.662, -0.022, 0.865) | (+0.654, -0.034, 0.832) | (+10.0°, -12.0°, +8.0°) | (0.988, +0.086, -0.104, +0.069) | 0.099 m (Không chạm đùi) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:236](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L236) | Thumb.02.L (Đốt gần MCP) | Thumb.01.L | (+0.654, -0.034, 0.832) | (+0.652, -0.042, 0.805) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.097 m (Mở thoáng) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:237](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L237) | Thumb.03.L (Đốt xa IP) | Thumb.02.L | (+0.652, -0.042, 0.805) | (+0.655, -0.046, 0.785) | (+8.0°, 0.0°, 0.0°) | (0.998, +0.070, 0.000, 0.000) | 0.100 m (Thả lỏng) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:238](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L238) | Index.01.L (Đốt gần MCP) | Hand.L | (+0.668, -0.024, 0.825) | (+0.665, -0.028, 0.782) | (+10.0°, 0.0°, -2.0°) | (0.996, +0.087, 0.000, -0.017) | 0.110 m (Chuẩn thiết kế) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:239](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L239) | Index.02.L (Đốt giữa PIP) | Index.01.L | (+0.665, -0.028, 0.782) | (+0.662, -0.030, 0.755) | (+15.0°, 0.0°, 0.0°) | (0.991, +0.131, 0.000, 0.000) | 0.107 m (Hơi cong nhẹ) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:240](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L240) | Index.03.L (Đốt xa DIP) | Index.02.L | (+0.662, -0.030, 0.755) | (+0.658, -0.031, 0.738) | (+8.0°, 0.0°, 0.0°) | (0.998, +0.070, 0.000, 0.000) | 0.103 m (Tự nhiên) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:241](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L241) | Middle.01.L (Đốt gần MCP) | Hand.L | (+0.676, -0.015, 0.822) | (+0.674, -0.019, 0.775) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.119 m (Khoảng trống rõ) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:242](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L242) | Middle.02.L (Đốt giữa PIP) | Middle.01.L | (+0.674, -0.019, 0.775) | (+0.670, -0.021, 0.745) | (+18.0°, 0.0°, 0.0°) | (0.988, +0.156, 0.000, 0.000) | 0.115 m (Hơi cong nhẹ) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:243](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L243) | Middle.03.L (Đốt xa DIP) | Middle.02.L | (+0.670, -0.021, 0.745) | (+0.665, -0.022, 0.726) | (+10.0°, 0.0°, 0.0°) | (0.996, +0.087, 0.000, 0.000) | 0.110 m (Điểm thấp nhất) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:244](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L244) | Ring.01.L (Đốt gần MCP) | Hand.L | (+0.684, -0.006, 0.826) | (+0.682, -0.010, 0.782) | (+14.0°, 0.0°, +2.0°) | (0.992, +0.122, 0.000, +0.017) | 0.127 m (Mở thoáng) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:245](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L245) | Ring.02.L (Đốt giữa PIP) | Ring.01.L | (+0.682, -0.010, 0.782) | (+0.678, -0.012, 0.754) | (+20.0°, 0.0°, 0.0°) | (0.985, +0.174, 0.000, 0.000) | 0.123 m (Cong bậc thang) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:246](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L246) | Ring.03.L (Đốt xa DIP) | Ring.02.L | (+0.678, -0.012, 0.754) | (+0.673, -0.014, 0.736) | (+11.0°, 0.0°, 0.0°) | (0.995, +0.096, 0.000, 0.000) | 0.118 m (Thả lỏng) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R13` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:247](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L247) | Pinky.01.L (Đốt gần MCP) | Hand.L | (+0.692, +0.002, 0.832) | (+0.690, -0.002, 0.795) | (+15.0°, 0.0°, +4.0°) | (0.991, +0.130, 0.000, +0.035) | 0.135 m (Ngoài cùng +X) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R14` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:248](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L248) | Pinky.02.L (Đốt giữa PIP) | Pinky.01.L | (+0.690, -0.002, 0.795) | (+0.686, -0.005, 0.772) | (+22.0°, 0.0°, 0.0°) | (0.982, +0.191, 0.000, 0.000) | 0.131 m (Cong tự nhiên) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T09-R15` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:249](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L249) | Pinky.03.L (Đốt xa DIP) | Pinky.02.L | (+0.686, -0.005, 0.772) | (+0.681, -0.007, 0.756) | (+12.0°, 0.0°, 0.0°) | (0.995, +0.105, 0.000, 0.000) | 0.126 m (Thả lỏng) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |

### H01-T10 · telemetry · 12 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:263](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L263) (bảng Word 10; kết thúc ở dòng 276).

| ID / dòng nguồn | Frame (Thời gian) | Trạng Thái Hiển Thị Rig | Pelvis (X, Y, Z) m | Head (X, Y, Z) m | UpperArm.R Euler (RX, RY, RZ) ° | Hand.R (X, Y, Z) m [Bên Trái Ảnh] | Hand.L (X, Y, Z) m [Bên Phải Ảnh] | VineStaff_Core (X, Y, Z_tip) m | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T10-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:265](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L265) | Frame 1 (0.00s) | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (0.00, 0.00, 0.05) — Nứt đất | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:266](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L266) | Frame 25 (0.42s) | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.08, -0.02, 1.15) — Phóng vọt | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:267](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L267) | Frame 45 (0.75s) [Kết thúc Khung 1] | ẨN (Scale=0, Z=-1.5m) | Ẩn (-1.50m) | Ẩn (-1.50m) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.12, -0.02, 1.72) — Đỉnh Khung 1 | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:268](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L268) | Frame 46 (0.77s) [Bắt đầu trồi lên] | BẬT HIỂN THỊ (Scale=1) | (0.000, +0.020, 0.150) | (0.000, -0.080, 0.780) | (+18.0°, -10.0°, -145.0°) | (-0.220, -0.150, 0.250) | (+0.240, -0.150, 0.420) | (+0.10, -0.04, 1.75) — Mở vòm | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:269](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L269) | Frame 52 (0.87s) [Đỉnh nhảy Parabol] | Hiển thị (Đang bay lên) | (0.000, +0.010, 0.780) | (0.000, -0.110, 1.420) | (+15.0°, -8.0°, -155.0°) | (-0.190, -0.180, 0.680) | (+0.200, -0.190, 0.880) | (+0.05, -0.05, 1.80) — Uốn vòm | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:270](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L270) | Frame 60 (1.00s) [Đáp đất Khung 2] | Hiển thị (Chạm đất) | (0.000, +0.040, 0.520) | (0.000, -0.160, 1.150) | (+12.0°, -4.0°, -168.0°) | (-0.160, -0.200, 0.400) | (+0.130, -0.220, 0.600) | (0.00, -0.06, 1.68) — Vòm sau lưng | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R07` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:271](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L271) | Frame 65 (1.08s) [Nén giảm chấn] | Hiển thị (Nhún sâu) | (0.000, +0.048, 0.495) | (0.000, -0.172, 1.122) | (+13.5°, -4.5°, -170.0°) | (-0.160, -0.205, 0.375) | (+0.130, -0.225, 0.578) | (0.00, -0.06, 1.65) — Rung nhẹ | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R08` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:272](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L272) | Frame 95 (1.58s) [Kết thúc Khung 2] | Hiển thị (Ổn định K2) | (0.000, +0.040, 0.520) | (0.000, -0.160, 1.150) | (+12.0°, -4.0°, -168.0°) | (-0.160, -0.200, 0.400) | (+0.130, -0.220, 0.600) | (0.00, -0.05, 1.70) — Bắt đầu gom | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R09` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:273](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L273) | Frame 112 (1.87s) [Đạp chân dịch phải] | Đang đứng dậy (30%) | (+0.135, +0.025, 0.652) | (+0.135, -0.110, 1.305) | (+9.5°, +8.5°, -132.0°) | (-0.185, -0.145, 0.885) | (+0.310, -0.150, 0.705) | (-0.12, -0.04, 1.98) — Xoắn bện | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R10` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:274](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L274) | Frame 125 (2.08s) [Vươn tay đón trượng] | Đang đứng dậy (65%) | (+0.292, +0.012, 0.806) | (+0.292, -0.050, 1.468) | (+6.5°, +24.0°, -86.0°) | (-0.210, -0.075, 1.440) | (+0.520, -0.065, 0.820) | (-0.21, -0.04, 2.22) — Thành trượng | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R11` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:275](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L275) | Frame 138 (2.30s) [Chạm & Siết trượng] | Đạt 94% tư thế K3 | (+0.425, +0.002, 0.935) | (+0.425, -0.015, 1.595) | (+4.5°, +34.2°, -58.0°) | (-0.180, -0.036, 1.745) | (+0.660, -0.015, 0.890) | (-0.23, -0.04, 2.35) — Cố định trượng | Có sai lệch nguồn/code; xem pha tương ứng |
| `H01-T10-R12` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:276](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L276) | Frame 145–180 (2.42s–3.00s) [Khung 3] | Đứng uy nghiêm K3 | (+0.450, 0.000, 0.960) | (+0.450, -0.010, 1.620) | (+4.2°, +35.0°, -55.0°) | (-0.180, -0.035, 1.748) | (+0.680, -0.010, 0.900) | (-0.23, -0.04, 2.35) — Nắm chặt 35° | Có sai lệch nguồn/code; xem pha tương ứng |

### H01-T11 · finger_timeline · 6 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:282](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L282) (bảng Word 11; kết thúc ở dòng 289).

| ID / dòng nguồn | Nhóm Đốt Ngón Tay Phải (.R) | Frame 60–95 (Khung 2: Tay Không) ° | Frame 110 (Bắt Đầu Đưa Tay Lên) ° | Frame 122 (Mở Rộng Đón Trượng - Anticipation) ° | Frame 132 (Lòng Bàn Tay Chạm Thân Trượng) ° | Frame 142–180 (Khung 3: Khoá Chặt Trượng) ° | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H01-T11-R01` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:284](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L284) | Thumb.01.R (CMC: RX, RY, RZ) | (+12.0°, +15.0°, -5.0°) | (+8.0°, +10.0°, -2.0°) | (-5.0°, -12.0°, +10.0°) [Mở rộng] | (+24.0°, +30.0°, -12.0°) | (+38.0°, +42.0°, -18.0°) [Đối chiếu] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T11-R02` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:285](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L285) | Thumb.02.R / 03.R (MCP / IP: RX) | +14.0° / +10.0° | +10.0° / +8.0° | -4.0° / 0.0° [Duỗi mở đón trượng] | +28.0° / +32.0° | +48.0° / +55.0° [Khoá mặt trước -Y] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T11-R03` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:286](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L286) | Index.01..03.R (MCP / PIP / DIP: RX) | +15.0° / +22.0° / +12.0° | +12.0° / +16.0° / +10.0° | +4.0° / +6.0° / +2.0° [Xoè mở] | +42.0° / +54.0° / +30.0° | +65.0° / +82.0° / +50.0° [Siết chặt] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T11-R04` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:287](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L287) | Middle.01..03.R (MCP / PIP / DIP: RX) | +18.0° / +25.0° / +14.0° | +14.0° / +18.0° / +10.0° | +6.0° / +8.0° / +4.0° [Xoè mở] | +46.0° / +58.0° / +34.0° | +70.0° / +85.0° / +52.0° [Trụ lực chính] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T11-R05` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:288](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L288) | Ring.01..03.R (MCP / PIP / DIP: RX) | +20.0° / +26.0° / +15.0° | +15.0° / +20.0° / +12.0° | +8.0° / +10.0° / +5.0° [Xoè mở] | +48.0° / +60.0° / +36.0° | +72.0° / +86.0° / +54.0° [Siết chặt] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H01-T11-R06` · [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:289](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L289) | Pinky.01..03.R (MCP / PIP / DIP: RX) | +22.0° / +28.0° / +16.0° | +16.0° / +22.0° / +12.0° | +10.0° / +12.0° / +6.0° [Xoè mở] | +50.0° / +62.0° / +38.0° | +74.0° / +88.0° / +55.0° [Khoá đáy nắm] | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |

### H01-T12 · illustrative_code · 1 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:297](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L297) (bảng Word 12; kết thúc ở dòng 298).

- `H01-T12-R01`: [docs/requests/gemini-animation-2026-10-21/Lam-Dat.md:297](../../requests/gemini-animation-2026-10-21/Lam-Dat.md#L297) — Code minh họa, không phải implementation hoàn chỉnh.

### H02-T01 · executive · 1 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:13](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L13) (bảng Word 1; kết thúc ở dòng 14).

- `H02-T01-R01`: [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:13](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L13) — Xem ma trận tường thuật; không phải kết quả render.

### H02-T02 · coordinates · 5 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:30](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L30) (bảng Word 2; kết thúc ở dòng 36).

| ID / dòng nguồn | Trục / Thành Phần | Vector Đơn Vị Chuẩn Blender | Ý Nghĩa Trên Khung Hình Camera 2D | Ánh Xạ Giải Phẫu Nhân Vật & Cây Chùy Chiến (1.75m) | Ràng Buộc Hình Học Tại Khung 2 & Khung 3 | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- |
| `H02-T02-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:32](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L32) | Trục -X (Âm X) | (-1.0, 0.0, 0.0) | Phía BÊN TRÁI bức ảnh (Viewer's Left) | Phía bên PHẢI giải phẫu nhân vật (Hậu tố .R) | Khung 2: Tay phải (.R) chống đất tại X = -0.220m. Khung 3 (Ảnh): Chùy dựng đứng tại X = -0.160m. | Cần hiệu chuẩn hệ trục và camera |
| `H02-T02-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:33](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L33) | Trục +X (Dương X) | (+1.0, 0.0, 0.0) | Phía BÊN PHẢI bức ảnh (Viewer's Right) | Phía bên TRÁI giải phẫu nhân vật (Hậu tố .L) | Khung 2: Đầu chùy cắm tại X = +0.340m, Tay trái (.L) nắm cán tại X = +0.155m. | Cần hiệu chuẩn hệ trục và camera |
| `H02-T02-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:34](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L34) | Trục -Y (Âm Y) | (0.0, -1.0, 0.0) | Hướng từ nhân vật lao thẳng về phía Camera | Vector Pháp tuyến Khuôn mặt & Mặt rộng Đầu chùy | Khung 3: Pháp tuyến mặt rộng nhất của đầu chùy (0.42m x 0.24m) và mặt nhân vật cùng bằng (0, -1, 0). | Cần hiệu chuẩn hệ trục và camera |
| `H02-T02-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:35](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L35) | Trục +Y (Dương Y) | (0.0, +1.0, 0.0) | Hướng từ nhân vật lùi sâu vào hậu cảnh đồi đá | Mặt sau lưng nhân vật & Mặt sau khối đầu chùy | Khung 2: Bàn chân phải (.R) chống lùi về sau tại Y = +0.120m tạo chân đế vững chắc. | Cần hiệu chuẩn hệ trục và camera |
| `H02-T02-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:36](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L36) | Trục +Z (Dương Z) | (0.0, 0.0, +1.0) | Hướng thẳng đứng từ mặt đất lên đỉnh khung hình | Trục chiều cao nhân vật (1.85m) & Trục cán chùy Khung 3 | Khung 3: Cán chùy dựng song song trục +Z từ Z_tail = 0.115m đến Z_top = 1.865m (Dài đúng 1.750m). | Cần hiệu chuẩn hệ trục và camera |

### H02-T03 · timeline · 5 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:46](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L46) (bảng Word 3; kết thúc ở dòng 52).

| ID / dòng nguồn | Giai Đoạn Hoạt Cảnh | Khoảng Frame (60 FPS) | Thời Gian Thực t (Giây) | Góc Máy & Trạng Thái Nhân Vật | Động Học Chi Tiết Của Nhân Vật (1.85m) & Cây Chùy Chiến (1.75m) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- |
| `H02-T03-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:48](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L48) | Pha 1: Khung 1 (Búa rơi đập đất) | Frame 1 – Frame 45 | 0.00s – 0.75s | Góc máy nghiêng / KHÔNG CÓ NHÂN VẬT (Ẩn hoàn toàn) | Chùy (1.75m) rơi từ Z = 2.80m xuống đập đầu búa xuống đất tại Frame 18 (Z = 0.12m), cán chùy nghiêng 65° hướng lên góc trên bên phải; đất đá văng tung toé. | Có khung pha, còn sai nội dung; xem ma trận |
| `H02-T03-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:49](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L49) | Pha 2: Chuyển tiếp 1 -> 2 (Nhảy đáp đất) | Frame 46 – Frame 60 | 0.76s – 1.00s | Chuyển sang góc chính diện / Bật hiển thị Nhân vật | Nhân vật (1.85m) lao từ độ cao Z = 2.40m xuống tiếp đất tại Frame 60. Tay phải (.R) duỗi thẳng chạm đất, tay trái (.L) vươn ngang bắt chặt cán chùy đang cắm nghiêng. | Có khung pha, còn sai nội dung; xem ma trận |
| `H02-T03-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:50](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L50) | Pha 3: Khung 2 (Ngồi chòm hổm giữ chùy) | Frame 60 – Frame 95 | 1.00s – 1.58s | Góc chính diện / Ngồi xổm tại Pelvis Z = 0.540m | Giữ tư thế ngồi chòm hổm dũng mãnh giữa làn bụi: Tay phải chống đất (-0.22, -0.20, 0.015)m; tay trái nắm chặt cán chùy nghiêng tại (+0.155, -0.162, 0.950)m. | Có khung pha, còn sai nội dung; xem ma trận |
| `H02-T03-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:51](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L51) | Pha 4: Chuyển tiếp 2 -> 3 (Đứng dậy dựng chùy) | Frame 96 – Frame 145 | 1.60s – 2.42s | Góc chính diện / Đứng dậy (Pelvis Z: 0.54m -> 1.005m) | Nhân vật đạp hai chân đứng thẳng dậy hoàn toàn; nhấc bổng cây chùy 1.75m xoay dựng thẳng đứng (Tilt: 20° -> 0°), xoay mặt rộng đầu chùy về góc Yaw = 0° hướng thẳng về trước (-Y). | Có khung pha, còn sai nội dung; xem ma trận |
| `H02-T03-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:52](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L52) | Pha 5: Khung 3 (Đứng thẳng giơ chùy ngang đầu) | Frame 145 – Frame 180 | 2.42s – 3.00s | Góc chính diện / Đứng thẳng (Đỉnh đầu Z = 1.850m) | Cố định tư thế Khung 3: Đầu chùy (Z = 1.745m) ngang tầm đầu nhân vật, mặt rộng nhất (0.42x0.24m) song song và đồng hướng với khuôn mặt; tay đối diện buông thẳng tự nhiên bên hông. | Có khung pha, còn sai nội dung; xem ma trận |

### H02-T04 · hierarchy · 9 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:60](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L60) (bảng Word 4; kết thúc ở dòng 70).

| ID / dòng nguồn | Nhóm Cấu Trúc | Tên Khớp Chuẩn (Bone Name) | Khớp Cha (Parent) | Chiều Dài Xương Chuẩn (m) | Góc Bone Roll (°) | Thông Số Hình Học & Chức Năng Động Học | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T04-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:62](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L62) | Gốc & Trọng tâm (1.85m) | Root / Pelvis | World / Root | 0.150 / 0.140 | 0.0° | Pelvis đặt tại Z = 1.005m khi đứng thẳng (Khung 3) và Z = 0.540m khi ngồi xổm (Khung 2). | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:63](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L63) | Cột sống (Torso) | Spine_01 / Spine_02 / Chest | Pelvis -> Spine_02 | 0.140 / 0.155 / 0.160 | 0.0° | Tổng chiều dài cột sống 0.455m; đổ trước Pitch = +26° ở Khung 2, thẳng đứng 0° ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:64](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L64) | Cổ & Hộp sọ | Neck / Head | Chest / Neck | 0.125 / 0.205 | 0.0° | Đáy hộp sọ tại Z = 1.645m, Tâm khuôn mặt tại Z = 1.745m, Đỉnh đầu (Head_Top) tại đúng Z = 1.850m. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:65](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L65) | Chi trên Phải (.R) | Clavicle.R / UpperArm.R / Forearm.R / Hand.R | Chest -> ... -> Forearm.R | 0.135 / 0.295 / 0.270 / 0.190 | 0.0° | Cánh tay bên trái bức ảnh (-X): Chống thẳng xuống đất ở Khung 2; giữ chùy (Chế độ A) hoặc buông hông (Chế độ B) ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:66](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L66) | Chi trên Trái (.L) | Clavicle.L / UpperArm.L / Forearm.L / Hand.L | Chest -> ... -> Forearm.L | 0.135 / 0.295 / 0.270 / 0.190 | 0.0° | Cánh tay bên phải bức ảnh (+X): Đưa ngang nắm cán chùy nghiêng ở Khung 2; buông thẳng (Chế độ A) hoặc nâng chùy (Chế độ B) ở Khung 3. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:67](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L67) | Chi dưới (.R & .L) | Thigh / Calf / Foot / Toe (.R & .L) | Pelvis -> ... -> Foot | 0.460 / 0.440 / 0.145 / 0.075 | 0.0° | Đùi dài 0.460m, cẳng chân dài 0.440m, cao độ mắt cá chân Z = 0.085m -> Tổng chiều cao chân 0.985m. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:68](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L68) | 30 Khớp Ngón Tay | Thumb / Index / Middle / Ring / Pinky (.01..03.R & .L) | Hand.R / Hand.L | 0.024 – 0.045 | 90.0° | 15 khớp/bàn tay; ôm khít chu vi cán chùy đường kính D = 44mm (R = 22mm) khi thực hiện cầm nắm. | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:69](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L69) | Rig Cây Chùy (1.75m) | Hammer_Root / Hammer_Shaft_01..03 | World / Hammer_Root | 1.510 (Phần cán lộ) | 0.0° | Cán chùy hình trụ bán kính R = 0.022m, nối từ đuôi cán (Pommel) lên cổ búa (Hammer_Neck). | Cần retarget chức năng; không nghiệm thu bằng số xương |
| `H02-T04-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:70](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L70) | Đầu Chùy Hộp Chữ Nhật | Hammer_Head_Core / Hammer_Top | Hammer_Shaft_03 | 0.240 (Cao dọc trục) | 0.0° | Khối hộp chữ nhật W = 0.420m (Rộng) x H = 0.240m (Cao) x D = 0.220m (Dày). Tổng dài chùy = 1.510 + 0.240 = 1.750m. | Cần retarget chức năng; không nghiệm thu bằng số xương |

### H02-T05 · hammer_impact · 7 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:78](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L78) (bảng Word 5; kết thúc ở dòng 86).

| ID / dòng nguồn | Tên Đối Tượng / Khớp Chùy | Toạ Độ Khởi Đầu Frame 1 (X, Y, Z) m | Toạ Độ Va Chạm Frame 18–45 (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Trạng Thái Động Học & Hiệu Ứng Vật Lý | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T05-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:80](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L80) | LamDat_Armature (Nhân vật) | (0.000, 0.000, -1.800) | (0.000, 0.000, -1.800) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | KHÔNG CÓ NHÂN VẬT (hide_viewport = True, Scale = 0) | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:81](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L81) | Hammer_Head_Bottom (Mép đập đất) | (+0.880, -0.040, 2.690) | (-0.230, -0.040, 0.012) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Cạnh dưới đầu hộp chữ nhật lún sâu 1.2cm vào nền đất đá | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:82](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L82) | Hammer_Head_Core (Tâm đầu búa) | (+0.930, -0.040, 2.800) | (-0.180, -0.040, 0.120) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Tâm khối hộp chữ nhật (0.42x0.24x0.22m) tại điểm va chạm | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:83](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L83) | Hammer_Neck (Cổ tiếp giáp cán) | (+0.980, -0.040, 2.910) | (-0.129, -0.040, 0.229) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Điểm bắt đầu phần cán trụ tròn R = 0.022m vươn lên | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:84](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L84) | Hammer_Shaft_Mid (Giữa cán chùy) | (+1.275, -0.040, 3.548) | (+0.164, -0.040, 0.858) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Điểm giữa thân cán chùy nghiêng góc 65° so với mặt đất | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:85](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L85) | Hammer_Tail (Đuôi cán chùy) | (+1.619, -0.040, 4.287) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | (0.916, +0.178, +0.165, -0.322) | Đỉnh đuôi cán hướng chéo lên phía trên bên phải khung hình | Chưa chứng minh bằng phép đo đối tượng thật |
| `H02-T05-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:86](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L86) | Debris_Impact_Burst (Hạt đá & Bụi) | Chưa kích hoạt (Frame 1–17) | Tâm nổ (-0.180, -0.040, 0.020) | Phát tán hình nón 110° | Vận tốc V0 = 4.8 m/s | Bắn 150 mảnh đá dăm + sóng xung kích bụi mù quanh đầu búa | Chưa chứng minh bằng phép đo đối tượng thật |

### H02-T06 · body_crouch · 23 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:108](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L108) (bảng Word 6; kết thúc ở dòng 132).

| ID / dòng nguồn | Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Vai Trò Cơ Học Trong Tư Thế Ngồi Chòm Hổm (Khung 2) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T06-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:110](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L110) | Root | (0.000, 0.000, 0.000) | (0.000, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Gốc toạ độ thế giới tại mặt phẳng đất Z = 0.000m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:111](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L111) | Pelvis | (-0.040, +0.040, 0.540) | (-0.040, 0.000, 0.675) | (+16.5°, -3.0°, 0.0°) | (0.989, +0.143, -0.026, 0.000) | Trọng tâm hạ thấp ở Z = 0.540m, đổ nhẹ về trước | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:112](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L112) | Spine_01 | (-0.040, 0.000, 0.675) | (-0.040, -0.050, 0.815) | (+7.5°, -2.0°, 0.0°) | (0.998, +0.065, -0.017, 0.000) | Đốt sống bụng gập thu lực va chạm khi đáp đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:113](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L113) | Spine_02 | (-0.040, -0.050, 0.815) | (-0.040, -0.100, 0.960) | (+6.0°, -2.0°, +3.0°) | (0.998, +0.052, -0.017, +0.026) | Đốt sống ngực nghiêng nhẹ hỗ trợ tay phải chạm đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:114](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L114) | Chest | (-0.040, -0.100, 0.960) | (-0.040, -0.140, 1.080) | (+5.0°, -3.5°, +5.0°) | (0.997, +0.044, -0.031, +0.044) | Lồng ngực hạ thấp vai phải (.R) và nâng vai trái (.L) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:115](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L115) | Neck | (-0.040, -0.140, 1.080) | (-0.040, -0.170, 1.185) | (-8.0°, +4.0°, 0.0°) | (0.997, -0.070, +0.035, 0.000) | Cổ điều chỉnh cân bằng trục đầu | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:116](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L116) | Head | (-0.040, -0.170, 1.185) | (-0.040, -0.200, 1.385) | (+14.0°, +3.0°, 0.0°) | (0.992, +0.122, +0.026, 0.000) | Đầu hơi cúi nhìn về phía trước (-Y), đỉnh đầu Z=1.385m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:117](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L117) | Clavicle.R | (-0.100, -0.100, 1.010) | (-0.210, -0.110, 0.980) | (0.0°, +16.0°, -6.0°) | (0.989, 0.000, +0.139, -0.052) | Xương đòn phải hạ thấp tối đa hướng về mặt đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:118](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L118) | UpperArm.R | (-0.210, -0.110, 0.980) | (-0.220, -0.150, 0.580) | (+6.0°, -2.0°, -174.0°) | (0.052, +0.017, -0.052, -0.997) | Bắp tay phải duỗi thẳng đứng hướng xuống đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R10` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:119](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L119) | Forearm.R | (-0.220, -0.150, 0.580) | (-0.220, -0.180, 0.180) | (+4.0°, 0.0°, 0.0°) | (0.999, +0.035, 0.000, 0.000) | Cẳng tay phải nối thẳng xuống cổ tay phải Z = 0.180m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R11` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:120](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L120) | Hand.R | (-0.220, -0.180, 0.180) | (-0.220, -0.200, 0.015) | (+7.0°, 0.0°, 0.0°) | (0.998, +0.061, 0.000, 0.000) | Bàn tay phải duỗi chống các đầu ngón chạm đất Z=0.015m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R12` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:121](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L121) | Clavicle.L | (+0.020, -0.100, 1.010) | (+0.140, -0.090, 1.000) | (0.0°, -6.0°, +4.0°) | (0.998, 0.000, -0.052, +0.035) | Xương đòn trái mở ngang sang bên phải bức ảnh (+X) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R13` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:122](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L122) | UpperArm.L | (+0.140, -0.090, 1.000) | (+0.380, -0.130, 0.960) | (+10.0°, +80.5°, +95.0°) | (0.512, +0.435, +0.482, +0.564) | Bắp tay trái nâng ngang sang phải đưa khuỷu ra X=+0.38m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R14` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:123](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L123) | Forearm.L | (+0.380, -0.130, 0.960) | (+0.155, -0.162, 0.950) | (+95.0°, -12.0°, -82.0°) | (0.542, +0.588, -0.085, -0.594) | Khuỷu tay trái gập ngang 95° đưa cổ tay về cán chùy | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R15` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:124](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L124) | Hand.L | (+0.155, -0.162, 0.950) | (+0.125, -0.162, 0.945) | (-15.0°, +20.0°, +18.0°) | (0.956, -0.128, +0.171, +0.154) | Bàn tay trái nắm chặt cán chùy nghiêng tại Z = 0.945m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R16` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:125](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L125) | Thigh.R | (-0.140, +0.040, 0.520) | (-0.340, -0.220, 0.420) | (+72.0°, -38.0°, -140.0°) | (0.245, +0.542, -0.285, -0.752) | Đùi phải mở rộng sang bên trái bức ảnh (-X) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R17` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:126](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L126) | Calf.R | (-0.340, -0.220, 0.420) | (-0.080, +0.120, 0.150) | (-126.0°, +24.0°, +28.0°) | (0.432, -0.858, +0.168, +0.218) | Cẳng chân phải gập sâu 126° thu bàn chân về tâm | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R18` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:127](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L127) | Foot.R / Toe.R | (-0.080, +0.120, 0.150) | (-0.100, 0.000, 0.020) | (+48.0°, 0.0°, +10.0°) | (0.910, +0.405, 0.000, +0.085) | Mũi bàn chân phải chống chịu lực phía sau trọng tâm | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R19` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:128](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L128) | Thigh.L | (+0.060, +0.040, 0.520) | (+0.240, -0.200, 0.450) | (+76.0°, +32.0°, +145.0°) | (0.218, +0.575, +0.242, +0.751) | Đùi trái mở sang bên phải bức ảnh (+X) phía sau cán chùy | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R20` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:129](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L129) | Calf.L | (+0.240, -0.200, 0.450) | (+0.080, -0.080, 0.120) | (-120.0°, -18.0°, -20.0°) | (0.485, -0.842, -0.142, -0.188) | Cẳng chân trái gập 120° đặt bàn chân trái xuống đất | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R21` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:130](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L130) | Foot.L / Toe.L | (+0.080, -0.080, 0.120) | (+0.080, -0.220, 0.020) | (+35.0°, 0.0°, 0.0°) | (0.954, +0.301, 0.000, 0.000) | Bàn chân trái bám mặt đất tại X = +0.080m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R22` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:131](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L131) | Hammer_Head_Core | (+0.380, -0.180, 0.010) | (+0.300, -0.175, 0.230) | (+2.0°, -20.0°, +20.0°) | (0.970, +0.017, -0.171, +0.171) | Đầu chùy cắm nghiêng trên mặt đất ở góc dưới phải ảnh | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T06-R23` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:132](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L132) | Hammer_Shaft | (+0.300, -0.175, 0.230) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | (0.970, +0.017, -0.171, +0.171) | Cán chùy nghiêng 20° đi qua bàn tay trái (+0.135, -0.162, 0.945)m | Nguồn có xung đột; cần kiểm mesh runtime |

### H02-T07 · body_final · 19 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:158](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L158) (bảng Word 7; kết thúc ở dòng 178).

| ID / dòng nguồn | Tên Khớp (Bone Name) | Toạ Độ Đầu Khớp Head (X, Y, Z) m | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m | Góc Xoay Local Euler (RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Ghi Chú Tư Thế Khung 3 (Chế Độ B: Đổi Dấu X <-> -X) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T07-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:160](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L160) | Root | (+0.180, 0.000, 0.000) | (+0.180, 0.000, 0.150) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Trục tâm nhân vật đứng tại X = +0.180m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:161](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L161) | Pelvis | (+0.180, 0.000, 1.005) | (+0.180, 0.000, 1.145) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Khớp chậu đứng thẳng ở cao độ chuẩn Z = 1.005m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:162](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L162) | Spine_01 | (+0.180, 0.000, 1.145) | (+0.180, 0.000, 1.300) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống thắt lưng thẳng đứng dọc trục +Z | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:163](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L163) | Spine_02 | (+0.180, 0.000, 1.300) | (+0.180, 0.000, 1.460) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cột sống ngực thẳng đứng hoàn toàn | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:164](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L164) | Chest | (+0.180, 0.000, 1.460) | (+0.180, 0.000, 1.585) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Lồng ngực hướng trực diện về phía Camera (-Y) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:165](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L165) | Neck | (+0.180, 0.000, 1.585) | (+0.180, -0.010, 1.645) | (+1.5°, 0.0°, 0.0°) | (1.000, +0.013, 0.000, 0.000) | Khớp cổ giữ đầu thẳng đứng uy nghiêm | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:166](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L166) | Head (Đỉnh Z=1.850m) | (+0.180, -0.010, 1.645) | (+0.180, -0.010, 1.850) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Tâm mặt Z=1.745m, Pháp tuyến N_face = (0, -1, 0) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:167](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L167) | Clavicle (Tay cầm chùy) | (+0.110, 0.000, 1.495) | (-0.010, 0.000, 1.505) | (0.0°, -4.8°, 0.0°) | (0.999, 0.000, -0.042, 0.000) | Xương đòn bên cầm chùy nâng nhẹ chịu tải | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:168](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L168) | UpperArm (Tay cầm chùy) | (-0.010, 0.000, 1.505) | (-0.110, -0.020, 1.235) | (+8.0°, +22.0°, -158.0°) | (0.195, +0.182, +0.068, -0.961) | Bắp tay hạ chéo xuống đưa khuỷu ra (-0.11, -0.02, 1.235)m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R10` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:169](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L169) | Forearm (Tay cầm chùy) | (-0.110, -0.020, 1.235) | (-0.155, -0.075, 1.315) | (+112.0°, -18.0°, +10.0°) | (0.552, +0.818, -0.125, +0.095) | Cẳng tay gập lên 112° đỡ lấy thân cán chùy | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R11` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:170](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L170) | Hand (Bàn tay nắm chùy) | (-0.155, -0.075, 1.315) | (-0.160, -0.080, 1.320) | (0.0°, +85.0°, 0.0°) | (0.737, 0.000, +0.676, 0.000) | Bàn tay nắm chặt cán chùy dựng đứng tại Z = 1.320m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R12` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:171](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L171) | Clavicle (Tay buông hông) | (+0.250, 0.000, 1.495) | (+0.370, 0.000, 1.505) | (0.0°, +4.8°, 0.0°) | (0.999, 0.000, +0.042, 0.000) | Xương đòn bên tay tự do cân bằng ngang vai | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R13` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:172](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L172) | UpperArm (Tay buông hông) | (+0.370, 0.000, 1.505) | (+0.395, +0.010, 1.210) | (-2.0°, -85.0°, +90.0°) | (0.520, -0.478, -0.478, +0.522) | Bắp tay buông thẳng tự nhiên sát bên hông | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R14` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:173](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L173) | Forearm (Tay buông hông) | (+0.395, +0.010, 1.210) | (+0.400, -0.010, 0.940) | (+4.2°, -1.5°, 0.0°) | (0.999, +0.037, -0.013, 0.000) | Cẳng tay duỗi tự nhiên dọc theo đường viền hông | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R15` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:174](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L174) | Hand (Tay buông hông) | (+0.400, -0.010, 0.940) | (+0.395, -0.020, 0.770) | (+3.0°, +5.0°, 0.0°) | (0.998, +0.026, +0.044, 0.000) | Bàn tay thả lỏng hoàn toàn bên hông (Z: 0.94m -> 0.76m) | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R16` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:175](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L175) | Thigh.R / Calf.R / Foot.R | (+0.080, 0.000, 0.985) | (+0.070, +0.020, 0.085) | (+1.0°, -0.6°, -180.0°) | (0.000, +0.009, -0.005, -1.000) | Chân phải đứng thẳng hoàn toàn tại X = +0.075m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R17` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:176](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L176) | Thigh.L / Calf.L / Foot.L | (+0.280, 0.000, 0.985) | (+0.290, +0.020, 0.085) | (+1.0°, +0.6°, +180.0°) | (0.000, +0.009, +0.005, +1.000) | Chân trái đứng thẳng hoàn toàn tại X = +0.285m | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R18` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:177](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L177) | Hammer_Tail -> Neck (Cán) | (-0.160, -0.080, 0.115) | (-0.160, -0.080, 1.625) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Cán chùy dài 1.510m dựng thẳng đứng song song +Z | Nguồn có xung đột; cần kiểm mesh runtime |
| `H02-T07-R19` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:178](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L178) | Hammer_Head (Đầu chùy) | (-0.160, -0.080, 1.625) | (-0.160, -0.080, 1.865) | (0.0°, 0.0°, 0.0°) | (1.000, 0.000, 0.000, 0.000) | Tâm Z=1.745m ngang đầu; mặt rộng 0.42x0.24m hướng -Y | Nguồn có xung đột; cần kiểm mesh runtime |

### H02-T08 · grip_fingers · 15 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:192](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L192) (bảng Word 8; kết thúc ở dòng 208).

| ID / dòng nguồn | Tên Khớp Ngón Tay (Cầm Chùy) | Khớp Cha (Parent) | Toạ Độ Đầu Khớp Head (X, Y, Z) m [Tại Khung 3] | Toạ Độ Đuôi Khớp Tail (X, Y, Z) m [Tại Khung 3] | Góc Gập Local Euler (Flexion RX, RY, RZ) ° | Quaternion Nội Bộ (QW, QX, QY, QZ) | Trạng Thái Tiếp Xúc Vỏ Cán Chùy (R = 22mm) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T08-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:194](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L194) | Thumb.01 (Đốt bàn CMC) | Hand | (-0.134, -0.092, 1.324) | (-0.154, -0.106, 1.333) | (+42.0°, +45.0°, -20.0°) | (0.858, +0.332, +0.354, -0.185) | Xoay đối chiếu vòng qua mặt trước (-Y) cán chùy | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:195](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L195) | Thumb.02 (Đốt gần MCP) | Thumb.01 | (-0.154, -0.106, 1.333) | (-0.175, -0.102, 1.338) | (+52.0°, +8.0°, -5.0°) | (0.896, +0.435, +0.064, -0.042) | Ép sát mặt trước cán chùy tại R = 0.024m | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:196](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L196) | Thumb.03 (Đốt xa IP) | Thumb.02 | (-0.175, -0.102, 1.338) | (-0.184, -0.088, 1.340) | (+60.0°, 0.0°, 0.0°) | (0.866, +0.500, 0.000, 0.000) | Khoá chặt đầu ngón cái đè lên đốt ngón giữa | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:197](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L197) | Index.01 (Đốt gần MCP) | Hand | (-0.136, -0.055, 1.350) | (-0.160, -0.045, 1.358) | (+68.0°, 0.0°, +5.0°) | (0.828, +0.558, 0.000, +0.036) | Vòng qua mặt sau (+Y) của cán chùy ở Z = 1.354m | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:198](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L198) | Index.02 (Đốt giữa PIP) | Index.01 | (-0.160, -0.045, 1.358) | (-0.182, -0.058, 1.355) | (+85.0°, 0.0°, 0.0°) | (0.737, +0.676, 0.000, 0.000) | Uốn góc 85° ôm sang mặt ngoài (-X) của cán chùy | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:199](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L199) | Index.03 (Đốt xa DIP) | Index.02 | (-0.182, -0.058, 1.355) | (-0.185, -0.078, 1.350) | (+55.0°, 0.0°, 0.0°) | (0.887, +0.462, 0.000, 0.000) | Đầu ngón trỏ khoá mặt bên trái cán chùy | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:200](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L200) | Middle.01 (Đốt gần MCP) | Hand | (-0.138, -0.055, 1.330) | (-0.162, -0.046, 1.338) | (+74.0°, 0.0°, 0.0°) | (0.799, +0.602, 0.000, 0.000) | Trụ chịu lực chính giữ trọng lượng chùy 1.75m | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:201](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L201) | Middle.02 (Đốt giữa PIP) | Middle.01 | (-0.162, -0.046, 1.338) | (-0.184, -0.060, 1.332) | (+88.0°, 0.0°, 0.0°) | (0.719, +0.695, 0.000, 0.000) | Gập 88° ôm sát vỏ cán chùy (R_finger = 0.024m) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:202](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L202) | Middle.03 (Đốt xa DIP) | Middle.02 | (-0.184, -0.060, 1.332) | (-0.186, -0.082, 1.326) | (+58.0°, 0.0°, 0.0°) | (0.875, +0.485, 0.000, 0.000) | Chạm đối xứng với mũi ngón cái tạo vòng khoá kín | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R10` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:203](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L203) | Ring.01 (Đốt gần MCP) | Hand | (-0.140, -0.056, 1.312) | (-0.162, -0.047, 1.320) | (+76.0°, 0.0°, -3.0°) | (0.788, +0.615, 0.000, -0.021) | Ôm mặt sau cán chùy tại cao độ Z = 1.316m | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R11` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:204](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L204) | Ring.02 (Đốt giữa PIP) | Ring.01 | (-0.162, -0.047, 1.320) | (-0.183, -0.060, 1.315) | (+89.0°, 0.0°, 0.0°) | (0.713, +0.701, 0.000, 0.000) | Siết chặt thân cán chống trượt dọc trục Z | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R12` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:205](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L205) | Ring.03 (Đốt xa DIP) | Ring.02 | (-0.183, -0.060, 1.315) | (-0.185, -0.080, 1.310) | (+58.0°, 0.0°, 0.0°) | (0.875, +0.485, 0.000, 0.000) | Khoá mặt ngoài cán chùy | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R13` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:206](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L206) | Pinky.01 (Đốt gần MCP) | Hand | (-0.142, -0.058, 1.294) | (-0.161, -0.049, 1.302) | (+78.0°, 0.0°, -6.0°) | (0.776, +0.628, 0.000, -0.042) | Đỡ phần đáy vùng nắm tại Z = 1.298m | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R14` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:207](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L207) | Pinky.02 (Đốt giữa PIP) | Pinky.01 | (-0.161, -0.049, 1.302) | (-0.180, -0.061, 1.298) | (+90.0°, 0.0°, 0.0°) | (0.707, +0.707, 0.000, 0.000) | Gập vuông góc 90° khoá chặt đáy nắm | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T08-R15` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:208](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L208) | Pinky.03 (Đốt xa DIP) | Pinky.02 | (-0.180, -0.061, 1.298) | (-0.182, -0.079, 1.294) | (+60.0°, 0.0°, 0.0°) | (0.866, +0.500, 0.000, 0.000) | Khoá điểm thấp nhất của bàn tay trên cán chùy | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |

### H02-T09 · free_fingers · 15 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:214](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L214) (bảng Word 9; kết thúc ở dòng 230).

| ID / dòng nguồn | Tên Khớp Ngón Tay (Tay Tự Do) | Toạ Độ Đầu Khớp Tại Khung 2 (Chống Đất) m | Góc Euler Tại Khung 2 (Chống Đất) ° | Toạ Độ Đầu Khớp Tại Khung 3 (Buông Hông) m | Toạ Độ Đuôi Khớp Tại Khung 3 (Buông Hông) m | Góc Cong Tự Nhiên Tại Khung 3 (RX, RY, RZ) ° | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T09-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:216](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L216) | Thumb.01 (Đốt bàn CMC) | (-0.205, -0.195, 0.135) | (+15.0°, -18.0°, +10.0°) | (+0.382, -0.022, 0.902) | (+0.374, -0.034, 0.868) | (+10.0°, -12.0°, +8.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:217](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L217) | Thumb.02 (Đốt gần MCP) | (-0.198, -0.205, 0.088) | (+12.0°, 0.0°, 0.0°) | (+0.374, -0.034, 0.868) | (+0.372, -0.042, 0.840) | (+12.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:218](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L218) | Thumb.03 (Đốt xa IP) | (-0.195, -0.212, 0.048) | (-8.0°, 0.0°, 0.0°) [Chạm đất] | (+0.372, -0.042, 0.840) | (+0.375, -0.046, 0.818) | (+8.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:219](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L219) | Index.01 (Đốt gần MCP) | (-0.212, -0.192, 0.105) | (+8.0°, 0.0°, -3.0°) | (+0.388, -0.024, 0.862) | (+0.385, -0.028, 0.818) | (+10.0°, 0.0°, -2.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:220](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L220) | Index.02 (Đốt giữa PIP) | (-0.210, -0.198, 0.058) | (+10.0°, 0.0°, 0.0°) | (+0.385, -0.028, 0.818) | (+0.382, -0.030, 0.790) | (+15.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:221](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L221) | Index.03 (Đốt xa DIP) | (-0.210, -0.202, 0.018) | (-12.0°, 0.0°, 0.0°) [Chống đất] | (+0.382, -0.030, 0.790) | (+0.378, -0.031, 0.772) | (+8.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:222](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L222) | Middle.01 (Đốt gần MCP) | (-0.220, -0.190, 0.102) | (+6.0°, 0.0°, 0.0°) | (+0.396, -0.015, 0.858) | (+0.394, -0.019, 0.810) | (+12.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:223](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L223) | Middle.02 (Đốt giữa PIP) | (-0.220, -0.196, 0.054) | (+8.0°, 0.0°, 0.0°) | (+0.394, -0.019, 0.810) | (+0.390, -0.021, 0.780) | (+18.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:224](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L224) | Middle.03 (Đốt xa DIP) | (-0.220, -0.200, 0.015) | (-15.0°, 0.0°, 0.0°) [Trụ chính] | (+0.390, -0.021, 0.780) | (+0.385, -0.022, 0.760) | (+10.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R10` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:225](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L225) | Ring.01 (Đốt gần MCP) | (-0.228, -0.188, 0.105) | (+8.0°, 0.0°, +3.0°) | (+0.404, -0.006, 0.862) | (+0.402, -0.010, 0.818) | (+14.0°, 0.0°, +2.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R11` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:226](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L226) | Ring.02 (Đốt giữa PIP) | (-0.229, -0.194, 0.058) | (+12.0°, 0.0°, 0.0°) | (+0.402, -0.010, 0.818) | (+0.398, -0.012, 0.790) | (+20.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R12` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:227](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L227) | Ring.03 (Đốt xa DIP) | (-0.230, -0.198, 0.018) | (-10.0°, 0.0°, 0.0°) [Chống đất] | (+0.398, -0.012, 0.790) | (+0.393, -0.014, 0.770) | (+11.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R13` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:228](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L228) | Pinky.01 (Đốt gần MCP) | (-0.236, -0.185, 0.110) | (+10.0°, 0.0°, +6.0°) | (+0.412, +0.002, 0.868) | (+0.410, -0.002, 0.830) | (+15.0°, 0.0°, +4.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R14` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:229](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L229) | Pinky.02 (Đốt giữa PIP) | (-0.238, -0.190, 0.068) | (+14.0°, 0.0°, 0.0°) | (+0.410, -0.002, 0.830) | (+0.406, -0.005, 0.806) | (+22.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |
| `H02-T09-R15` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:230](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L230) | Pinky.03 (Đốt xa DIP) | (-0.240, -0.194, 0.025) | (-6.0°, 0.0°, 0.0°) [Chạm nhẹ] | (+0.406, -0.005, 0.806) | (+0.401, -0.007, 0.790) | (+12.0°, 0.0°, 0.0°) | Bảng nguồn; chưa chứng nhận tiếp xúc trên bề mặt thật |

### H02-T10 · telemetry · 11 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:244](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L244) (bảng Word 10; kết thúc ở dòng 256).

| ID / dòng nguồn | Frame (Thời Gian) | Trạng Thái Nhân Vật (1.85m) | Pelvis (X, Y, Z) m | Head_Top Đỉnh Đầu (X, Y, Z) m | Hammer_Head_Core Tâm Đầu Chùy (X, Y, Z) m | Hammer_Tail Đuôi Cán Chùy (X, Y, Z) m | Góc Đầu Chùy Euler (RX, RY, RZ) ° | Pháp Tuyến Mặt Rộng Đầu Chùy (NX, NY, NZ) | Giới hạn đối chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H02-T10-R01` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:246](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L246) | Frame 1 (0.00s) | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (+0.930, -0.040, 2.800) | (+1.619, -0.040, 4.287) | (+15.0°, +25.0°, -35.0°) | Đang rơi từ trên cao | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R02` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:247](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L247) | Frame 18 (0.30s) [Đập đất K1] | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (-0.180, -0.040, 0.120) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | Va chạm nổ bụi đất đá | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R03` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:248](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L248) | Frame 45 (0.75s) [Hết Khung 1] | ẨN (Scale=0, Z=-1.8m) | Ẩn hoàn toàn | Ẩn hoàn toàn | (-0.180, -0.040, 0.120) | (+0.509, -0.040, 1.597) | (+15.0°, +25.0°, -35.0°) | Cắm nghiêng 65° mặt đất | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R04` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:249](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L249) | Frame 46 (0.77s) [Nhảy xuống] | BẬT HIỂN THỊ (Scale=1) | (-0.040, +0.020, 2.400) | (-0.040, -0.050, 3.245) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Chuyển góc máy chính diện | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R05` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:250](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L250) | Frame 60 (1.00s) [Đáp đất K2] | Ngồi xổm (Chạm đất) | (-0.040, +0.040, 0.540) | (-0.040, -0.200, 1.385) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Tay trái nắm cán Z=0.945m | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R06` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:251](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L251) | Frame 65 (1.08s) [Nhún giảm chấn] | Ngồi xổm (Nén cực đại) | (-0.040, +0.048, 0.518) | (-0.040, -0.210, 1.363) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Tay phải chống đất Z=0.015m | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R07` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:252](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L252) | Frame 95 (1.58s) [Hết Khung 2] | Ngồi xổm ổn định | (-0.040, +0.040, 0.540) | (-0.040, -0.200, 1.385) | (+0.340, -0.180, 0.120) | (-0.218, -0.135, 1.654) | (+2.0°, -20.0°, +20.0°) | Chuẩn bị phát lực đứng dậy | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R08` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:253](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L253) | Frame 112 (1.87s) [Đứng dậy 30%] | Đang nâng người & chùy | (+0.025, +0.028, 0.680) | (+0.025, -0.140, 1.525) | (+0.180, -0.150, 0.620) | (-0.200, -0.115, 0.450) | (+1.4°, -14.0°, +14.0°) | (-0.24, -0.96, +0.12) | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R09` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:254](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L254) | Frame 128 (2.13s) [Đứng dậy 70%] | Dựng đứng trục cán chùy | (+0.115, +0.010, 0.865) | (+0.115, -0.060, 1.710) | (-0.040, -0.105, 1.310) | (-0.175, -0.092, 0.220) | (+0.5°, -5.0°, +5.0°) | (-0.08, -0.99, +0.04) | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R10` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:255](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L255) | Frame 140 (2.33s) [Đạt 95% K3] | Đầu chùy ngang tầm đầu | (+0.170, +0.002, 0.985) | (+0.170, -0.015, 1.830) | (-0.152, -0.082, 1.715) | (-0.158, -0.082, 0.120) | (+0.1°, -1.0°, +1.0°) | (-0.01, -1.00, 0.00) | Có sai lệch nguồn/code; xem pha tương ứng |
| `H02-T10-R11` · [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:256](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L256) | Frame 145–180 (2.42s–3.00s) [K3] | Đứng thẳng hoàn toàn (1.85m) | (+0.180, 0.000, 1.005) | (+0.180, -0.010, 1.850) | (-0.160, -0.080, 1.745) | (-0.160, -0.080, 0.115) | (0.0°, 0.0°, 0.0°) | (0.000, -1.000, 0.000) [Đồng hướng mặt] | Có sai lệch nguồn/code; xem pha tương ứng |

### H02-T11 · illustrative_code · 1 hàng

**Nguồn:** [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:264](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L264) (bảng Word 11; kết thúc ở dòng 265).

- `H02-T11-R01`: [docs/requests/gemini-animation-2026-10-21/Chuy-175m.md:264](../../requests/gemini-animation-2026-10-21/Chuy-175m.md#L264) — Code minh họa, không phải implementation hoàn chỉnh.

## 7. Điều kiện trước khi có thể nhận là “đã giống”

1. Xác nhận cùng asset SHA, visible mesh, bind, vật liệu và đường chạy worker/main/combat. Không dùng source tĩnh sau 3 giây để chứng minh skin động đã đạt.
2. Giải quyết các mâu thuẫn nguồn theo gesture, rigid length và rest anatomy; ghi rõ mục tiêu nào không thể giữ đồng thời. Không scale xương/mesh để che sai số.
3. Đo lại key phase và mọi frame trung gian trên SkinnedMesh runtime sau retarget, bao gồm bất đối xứng chân, apex/nhún, palm/shaft, ngón, áo, mặt phẳng đầu chùy và sàn.
4. Chỉ công nhận các phần tiếp xúc khi đo bề mặt thật. Marker palm và gripPivot cùng công thức trùng nhau chưa chứng minh đầu ngón ôm cán.
5. Xem đủ trước/bên/sau/cận tay, cả đầu và cuối chuyển tiếp. Kiểm FPS Android riêng; số mẫu 60/120Hz không thay thế được FPS đo thiết bị.
6. Giữ thứ tự người dùng đã yêu cầu: hoàn thiện rig + animation, cập nhật APK sau khi được duyệt; **tay áo Lâm Dật làm sau cùng**. Báo cáo hiện tại không tự cấp phép sửa.

**Trạng thái cuối:** audit chưa đạt nghiệm thu; chờ người dùng duyệt phương án trong báo cáo chính trước khi khắc phục. Không có thay đổi game, rig, model nguồn hoặc APK trong phần việc này.
