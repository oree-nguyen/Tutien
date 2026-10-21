# Truy vết runtime, nguồn rig và phạm vi animation thực sự được đóng APK

Ngày audit: 2026-10-21 UTC. Đây là điều tra chỉ đọc; không thay rig, weight, animation, gameplay hoặc APK. Báo cáo này bổ sung cho [báo cáo chính](README.md), [ma trận DOCX](REFERENCE-MATRIX.md) và số đo bề mặt/khớp của đợt audit. Danh mục máy đọc, SHA-256 từng GLB, kích thước ảnh nhúng, clip/channel và chênh lệch bind pose nằm trong [provenance.json](provenance.json).

## 1. Bản nào được kiểm tra

| Thuộc tính | Giá trị |
|---|---|
| Commit mã nguồn | `bb68cf31f1a574487f701c4fe7f1b846da0f43ec` |
| APK hiện có | `release/Hon-Gioi-Sinh-Ton-debug.apk` |
| versionName / versionCode | `2.5.ba97bec3` / `214719383` |
| SHA-256 APK | `52aeeea29c319b5f8b66224ed1c46ae74890254924de2cdcc8d2104ae92b4c7c` |
| Byte APK | `303180784` |
| sourceHash trong biên nhận build | `ba97bec347eb754beeaf31054d14867c723aad0b35b2a6e4e35709547d35d53d` |
| Motion H01 | `382172` byte; SHA `bfa58f56e1785281186b6c8ad91335cdb50448b8b6c3cd29cb6ba605bc416c8b` |
| Motion H02 | `382216` byte; SHA `9b19150cc36d16c5c039d46a19c0b119fb3a7929f2c9400138943120d302b7f1` |

Biên nhận build ghi rõ `runtimeRigReplaced:false`, `rigReviewIncluded:false`. Kiểm tra ZIP APK xác nhận các GLB public trong danh mục có byte/hash khớp file repo; không có hai `assets/rigged/H01-C0-rigged.glb`, `H02-C0-rigged.glb` và không có model `/models/rig-review/`. Do đó APK đã nhận motion mới nhưng **chưa nhận source skin/weight mới làm rig hiển thị**. Logic bảo vệ biên nhận motion nằm ở `scripts/build-android.mjs:59–67`; cờ rig ở `scripts/build-android.mjs:115`.

## 2. Đang nhìn model nào ở từng đường chạy

| Trạng thái | Body thật được dùng | Motion/weapon thật | Điều cần phân biệt |
|---|---|---|---|
| Vừa vào sảnh H01/H02, costume 0, trong 0–3 giây | Legacy skinned `high` | Binary report entrance mới, nếu tải thành công | Source GLB đang tải riêng; body chưa phải source 1.5M tris đã rig |
| Sảnh mặc định, sau 3 giây, source đã tải | Source GLB tĩnh, không có skin | Source weapon sao chép transform từ weapon driver | Có thể thấy nét nguồn nhưng không chứng minh source đang được animate |
| Bấm HOẠT ẢNH, backend main-thread | Legacy skinned `high` tiếp tục hiện | Binary mới, sau đó `IDLE_HOLD` | Đây là rig cũ/texture thấp hơn source, không phải full-resolution rig |
| Bấm MODEL GỐC, backend main-thread | Replay rồi trở lại source tĩnh sau 3 giây | Weapon vẫn theo transform driver | Đổi mode body không đồng nghĩa đổi tư thế source A-pose theo driver |
| Bấm HOẠT ẢNH, backend worker mặc định | Cờ đổi mode không tới World trong worker | Replay/seek tới worker nhưng cờ mode chỉ đổi ở UI proxy | Đây là lỗi đường điều khiển đã xác minh; xem mục 3 |
| Vào trận H01/H02 | Legacy skinned `high` | Clip cũ trong GLB + IK runtime cũ | Không gọi binary Gemini entrance mới; H02 vẫn weapon socket tay phải |
| Costume khác 0 | Không thỏa manual Hunyuan guard | Đi theo đường tạo nhân vật thông thường | Không được dùng kết quả costume 0 để chứng nhận các costume khác |

Guard manual H01 nằm tại `src/manual-hero.js:15`, H02 tại `src/manual-h02.js:12`; định tuyến tại `src/art.js:103–104`, update dispatcher tại `src/art.js:164`. `createReportEntrancePlayer` chỉ được tạo khi `actor.id==='preview'`: `src/manual-hero.js:91`, `src/manual-h02.js:67`. Actor prewarm có id `prewarm` (`src/world.js:226`), không biến thành preview controller khi đem vào trận.

H01 clone skeleton của GLB legacy, xoay body π và gắn staff vào body (`src/manual-hero.js:66–80`). H02 dựng stage xoay π, clone body/hammer, chỉ preview mới có report player (`src/manual-h02.js:50–69`). Hai đường preview có early return khi đang chạy report player: H01 `src/manual-hero.js:167–172`, H02 `src/manual-h02.js:100`. Đường battle nằm ở H01 `src/manual-hero.js:181–194`, H02 `src/manual-h02.js:101–105`: chọn `Run/Idle/Attack/Cast/Dash` legacy và chạy IK cũ. H02 vẫn gọi `poseRightHand`, `poseLeftHip` và `orientHammer`; không chuyển sang left-hand grip theo DOCX mới trong trận.

### 2.1 Source tĩnh và driver chuyển động không phải cùng một bề mặt

`syncTencentPreview` H01 (`src/manual-hero.js:28`) và H02 (`src/manual-h02.js:16`) ẩn driver khi source sẵn sàng và animation mode tắt. Source body là mesh A-pose không bones, còn source weapon nhận transform của weapon đang được driver tạo tư thế. Vì vậy không thể suy luận source A-pose hand sẽ nắm trượng/chùy chỉ từ việc weapon đã được đặt đúng một điểm trên tay driver. Đây là hai pose khác nhau được ghép để hiển thị. H01 chuẩn bị source ở `src/manual-hero.js:30–36`, H02 ở `src/manual-h02.js:18–25`.

`manualAsset.sourceFidelity.bodyTriangles`, `textureResolution:4096` mô tả source đã tải, không phải mọi mesh đang visible. `manualAsset.rigged:true` mô tả driver có rig, không biến source thành SkinnedMesh. `animation:'IDLE_HOLD'` mô tả trạng thái controller, có thể đồng thời xuất hiện trong diagnostic khi source tĩnh đang hiện. Không dùng các nhãn này làm chứng cứ số tris/texture/hoạt ảnh của cây visible.

### 2.2 Chọn lại, replay, seek, cận mặt và quality

`src/world.js:207–215` replay/seek actor hiện có; click cùng thẻ H01/H02 replay tại `src/main.js:325`. Đổi hero/skin/costume tạo preview mới theo appearance key (`src/world.js:463–489`); cache chỉ tái dùng template, không làm mesh donor thành source rig. Mỗi frame truyền preview animation flag ở `src/world.js:497`.

Preview ngoài cùng scale `2.4` (`src/world.js:477`), position.y `.74`, showcaseYaw mặc định π (`src/world.js:205`, `493–497`); bên trong manual body/stage cũng xoay π. Các số đo `.45 m` trong model space không phải `.45` đơn vị showcase sau scale: khi so ảnh phải tách hai hệ tọa độ. Cận mặt chủ động ẩn weapon ở `src/world.js:251–266`; ảnh cận mặt không chứng minh lỗi mất weapon/grip.

`src/world.js:331` có biểu thức chọn mobile/low theo preview, local player và quality, nhưng `src/world.js:273` ép `detail='high'` cho manual hero trước khi dựng detail. Vì vậy H01/H02 costume 0 đang dùng donor high ở cả lobby/battle; không lấy biểu thức dòng 331 làm kết luận LOD thực. `src/model-asset-registry.js:4–7` loại key `-gpu` khi `compressedFidelityAssetsApproved` false (`src/fidelity-policy.js:2`), nên không phải tự động chọn bản KTX2 fidelity cho manual assets này.

## 3. Lỗi HOẠT ẢNH trên backend worker

Nút tại `src/main.js:416` làm ba việc: gán `world.showcaseAnimationMode`, traverse `world.preview?`, rồi `world.replayHeroEntrance()`. Điều này hoạt động khi `world` là World thật trên main thread. Với RenderThread, `world` là proxy: nó không có `preview` và không có setter gửi mode sang worker.

Bằng chứng đường truyền:

1. `src/render-thread.js:15–18` dựng proxy; `apply` dòng 32 chỉ sao diagnostic, không đồng bộ mode.
2. `src/render-thread.js:39` chỉ gửi appearance `hero,branch,skin,costume,rings,bones`. Không có `showcaseAnimationMode`.
3. `src/render-thread.js:47–48` chỉ có replay/seek, không có `setShowcaseAnimationMode`.
4. `src/render-worker.js:48` whitelist command không có setter mode.
5. `src/world.js:497` đọc `this.showcaseAnimationMode` của **World bên worker**, vẫn false/undefined, rồi đặt previewAnimation=false.

Kết quả thực nghiệm từ tài sản giải nén **đúng APK** nằm ở [worker-verified-evidence.json](worker-verified-evidence.json): cả H01 và H02 đã chờ đúng id (`H01-C0`/`H02-C0`), body `status:'loaded'`, source `status:'loaded'`, backend `worker`. Sau bấm, UI proxy flag=true và nút hiện `MODEL GỐC`, nhưng message log chỉ chứa frame sáu appearance field, replay, seek và inspect; không có cờ mode. Ở t=3.05, tổng scene render ghi H01 `2,138,398` tris, H02 `3,019,034` tris. Đó là số scene đo thực, bao gồm cả sân khấu; không phải số riêng body lấy từ metadata.

Không dùng ảnh H02 worker thử trước trong `additional-evidence.json` làm bằng chứng mất body: lần đó diagnostic còn `preparing`/stale hero. File `worker-verified-evidence.json` là lần kiểm đúng điều kiện tải và thay thế kết luận lần thử đó. Các ảnh main-thread cưỡng bức `?renderer=main` chỉ chứng minh nhánh main; chúng không bao phủ lỗi proxy worker này.

## 4. Danh mục hình học và texture thật

Đếm từ accessor indices của GLB, danh sách skin joints, material texture slots và ảnh nhúng; không dùng sourceFidelity. MB dưới đây là byte/1,000,000, không phải MiB. Ba kích thước map được ghi theo thứ tự **Albedo / Normal / Metallic-Roughness**. Toàn bộ dữ liệu từng file và SHA-256 ở JSON đi kèm.

| GLB | MB | Triangles | Bones | Maps | Clip |
|---|---:|---:|---:|---|---:|
| `hunyuan-original/H01-C0-source.glb` | 80.809 | 1,499,726 | 0 | 4096 / 4096 / 4096 PNG | 0 |
| `hunyuan-original/H01-W0-source.glb` | 50.437 | 619,640 | 0 | 4096 / 4096 / 4096 PNG | 0 |
| `hunyuan-original/H02-C0-source.glb` | 79.049 | 1,499,746 | 0 | 4096 / 4096 / 4096 PNG | 0 |
| `hunyuan-original/H02-W0-source.glb` | 93.615 | 1,500,000 | 0 | 4096 / 4096 / 4096 PNG | 0 |
| `assets/rigged/H01-C0-rigged.glb` canonical | 98.346 | 1,499,726 | 52 | 4096 / 4096 / 4096 PNG | 6 |
| `assets/rigged/H02-C0-rigged.glb` canonical | 97.113 | 1,499,746 | 52 | 4096 / 4096 / 4096 PNG | 6 |
| `h01-c0/h01-c0-high.glb` actual animated | 1.530 | 60,000 | 52 | **2048 / 1024 / 1024 WebP** | 6 |
| `h01-c0/h01-c0-mobile.glb` | .849 | 15,000 | 52 | 1024 / 1024 / 1024 WebP | 6 |
| `h01-c0/h01-c0-medium.glb` | .614 | 9,000 | 52 | 512 / 512 / 512 WebP | 6 |
| `h01-c0/h01-c0-low.glb` | .287 | 900 | 52 | 256 / 256 / 256 WebP | 6 |
| `h02-body/h02-body-high.glb` actual animated | 1.008 | 30,000 | 52 | 1024 / 1024 / 1024 WebP | 6 |
| `h02-body/h02-body-medium.glb` | .817 | 15,000 | 52 | 1024 / 1024 / 1024 WebP | 6 |
| `h02-body/h02-body-low.glb` | .258 | 1,000 | 52 | 256 / 256 / 256 WebP | 6 |
| `h01-staff/h01-staff-high.glb` actual animated | .748 | 12,000 | 0 | 1024 / 1024 / 1024 WebP | 0 |
| `h01-staff/h01-staff-medium.glb` | .306 | 4,000 | 0 | 512 / 512 / 512 WebP | 0 |
| `h01-staff/h01-staff-low.glb` | .071 | 795 | 0 | 256 / 256 / 256 WebP | 0 |
| `h02-hammer/h02-hammer-high.glb` actual animated | .349 | 8,000 | 0 | 512 / 512 / 512 WebP | 0 |
| `h02-hammer/h02-hammer-medium.glb` | .289 | 3,000 | 0 | 512 / 512 / 512 WebP | 0 |
| `h02-hammer/h02-hammer-low.glb` | .088 | 600 | 0 | 256 / 256 / 256 WebP | 0 |

Mỗi body trên có một mesh/primitive/material. Donor H01 high có 45,257 vertices, H02 high 31,814 vertices; source tương ứng 869,627 và 895,581. Không có morph targets. Sáu clip GLB là `Attack, Cast, Dash, Entrance, Idle, Run`. Binary Gemini là tài sản motion riêng, không chứa image, mesh hay skin weights; tên `IDLE_HOLD` của controller không phải clip thứ bảy được thêm vào donor GLB.

**Hệ quả cho áo:** cây body runtime một mesh, không có mesh tay áo hay hai vạt áo độc lập đã kích hoạt. Đọc file thử tách áo/review ngoài đường loader không chứng minh chúng được đóng APK hoặc đang hiển thị. Binary mới thay transform bones, không tách topology và không sửa weight kéo áo theo hông/tay. Việc user yêu cầu làm tay áo sau rig/animation cũng chưa cho phép dùng tay áo chưa đạt để kết luận animation đã đạt.

## 5. Canonical solve khác skeleton/mesh đang render

Builder `tools/rig/build-report-entrances.mjs:121–124` kiểm tra hai skeleton có cùng tên; đó không phải cùng bind pose. Đo local bind transform với tolerance position `1e-5 m`, rotation `.001°` cho thấy:

| So sánh canonical → legacy donor | H01 | H02 |
|---|---:|---:|
| Tên 52 bones giống nhau | Có | Có |
| Bone khác local position | 30 | 32 |
| Bone khác local rotation | 30 | 30 |
| Nhóm khác | 30 finger bones | 30 fingers + 2 Hand positions |

Ví dụ H01 LeftHandThumb2 local offset canonical dài `.08561327m`, legacy `.03844482m`; LeftHandIndex1 local rotation lệch `138.2135°`. Đây là chênh bind thật, không phải con số strain bề mặt. Retarget rotation có thể đúng đại số trong khi đầu ngón/tay nắm vẫn khác vì lengths, axes, weight và palm offset không đồng nhất.

### 5.1 Thứ tự builder và phạm vi số đo hiện có

1. Lấy canonical và legacy bind (`:140–149`).
2. Tạo target arms/crouch, slerp từ pose nguồn (`:173–185`, `:435–448`); H01 Hips thêm `.45` theo model X.
3. Solve foot IK trên canonical rồi **ghi frameFits** (`:477–502`).
4. Sau 2.4167s, tiếp tục slerp legs về upright đến 2.95s (`:514–518`).
5. Retarget delta giữa source/legacy world-bind (`:525–538`).
6. Giới hạn rotation độc lập mỗi bone tối đa 8°/frame, fingers 16°/frame (`:539–556`).
7. Copy translation Hips, cập nhật legacy FK (`:559–562`).
8. Resample weapon position/quaternion từ sidecar cũ, rồi dịch tới palm point legacy, dùng offset tác giả hóa trên canonical (`:563–595`).
9. Xuất motion/receipt, kiểm structural controller (`:619–666`).

Retarget world-delta không được kết luận sai chỉ vì không có một biến parent-pose tường minh: khi parent cũng tuân cùng quy tắc, dạng đệ quy có thể tương đương. Vấn đề cần đo là **đầu ra sau mọi bước**, trên mesh legacy cùng weights thực, không chỉ target/source FK trước retarget.

`motion-build.json` đặt đúng tên `preRetargetFootFk`: nó đo bước 3, trước settlement, limiter và donor LBS. H01 còn 11, H02 24 mẫu thất bại theo phép đo đó nhưng motion thử vẫn xuất. Vì vậy không được diễn giải receipt thành “mọi bàn chân ở đúng sàn” hoặc “không biến dạng bề mặt”. Các số đo LBS độc lập trong đợt audit này mới kiểm tra cây actual donor.

### 5.2 Target một điểm chưa phải nắm vật thể

H01 final arm đặt reach `.475` ở góc 35° từ shoulder; H02 target left hand `(.5,1.12,.16)` và có scan phương án khi solve thất bại (`:173–185`). Đây không phải xác nhận mọi mặt ngón chạm thân gậy hay mặt chùy trùng mặt phẳng mặt nhân vật.

H02 metadata đặt `gripped=true` từ 1.6s, nhưng position weapon blend chạy từ 1.6 tới 2.416666667s (`:578–595`). Vì thế cờ gripped không chứng minh contact tại 1.6. Đo audit độc lập trên chuỗi này cho khoảng cách source virtual palm→shaft 45.061cm ở 1.6s, 17.236cm ở 1.95s, 4.598cm ở 2.2s, gần 0 ở 2.4167s. Ngay điểm virtual bằng 0 cũng chưa chứng minh physical finger mesh đang ôm thân chùy; xem báo cáo số đo bề mặt trong cùng thư mục.

Scale report H02 là `1.75/1.899999976≈.921052643`; report player áp scale này, file GLB không đổi. Đường battle cũ vẫn dùng orientHammer/IK cũ. Staff H01 actual length khoảng `2.038399935m`, report scale1; không có phép scale lên 2.35m chỉ từ việc DOCX nêu 2.35. Root π và showcase scale2.4 phải được giữ nhất quán khi so hướng/góc và đơn vị; không được tự coi chúng là lỗi.

## 6. Dây leo H01 và impact H02 hiện thực bằng gì

### 6.1 H01: carrier mesh shader, không phải hệ sáu nhánh và tám spline bones

`src/h01-vine-assets.js` mô tả buffer runtime: vines 16,905 vertices/32,000 triangles; roots cũng 16,905/32,000. Tổng hai carrier là 64,000 tris, không có skin/armature. Generator `tools/manual-assets/build_h01_vines.py:11–26` chạy **`range(5)`**, 160 longitudinal ×20 radial segments cho mỗi stem, UV dọc lặp bảy lần. Tùy chọn `--high-poly` có thể tạo nguồn khác ở `.local`, nhưng không đổi count của buffer runtime đang đóng gói thành một triệu mặt.

`src/h01-entrance.js:20–24` dựng BufferGeometry với `vineAlong/vineOpenSide`. Shader `:41–57` thực hiện:

- Grow bằng clamp `y=min(position.y,uGrow*2.55)`.
- Open bằng dịch X theo side và `uOpen*.42`.
- Morph tuyến tính vào trục trượng cố định `(-.38, 1.45+(vineAlong-.62)*2.0384, .12)` với độ dày X/Z thu nhỏ.
- Discard carrier khi `uMorph>.995`; roots không morph thành trượng.

Sau đó staff Hunyuan riêng được reveal trong `src/manual-hero.js:128–130`. Đây là chuyển giao thị giác giữa carrier shader và model trượng khác; không có `Vine_Branch_01..06`, không có `VineStaff_01..08`, không có từng nhánh xương đan thành trượng như kiến trúc DOCX. Điểm morph cố định không tự bám final hand target mới; root/wave cũng vẫn dùng offset `(-.34,0,.18)` (`src/h01-entrance.js:63,69`). Việc timing được remap không thay đổi loại rig/VFX này.

DOCX mới H01 quy định wrist khoảng `.4m`, tail khoảng `.26m` trong crouch; không áp lại yêu cầu chống tay chạm sàn từ mô tả cũ để đánh trượt DOCX mới. Phần thiếu bones, số branches, hình thành trượng và actual hand contact vẫn cần đánh giá riêng.

### 6.2 H02: remap sự kiện cũ, không có kiểm va chạm đồng bộ mới

`src/report-entrance.js:53–61` remap timeline mới sang VFX cũ:

| Thời gian motion mới | Thời gian VFX cũ | Sự kiện |
|---:|---:|---|
| .3000 | .6500 | Chùy impact |
| .7667 | 2.1500 | Hero launch |
| 1.0000 | 2.8200 | Landing |
| 1.6000 | 3.5000 | Grip flag |
| 2.4167 | 4.6500 | Stand |
| 2.8000 | 5.1000 | Stamp crack |
| 3.0000 | 5.6000 | End |

`src/h02-entrance.js:37` đặt initial impact tại `(0,0,.38)`, stamp impact tại **`(-.43,0,-.2334)`**, là vị trí tay phải/weapon cũ. Motion report mới dùng tay trái và position weapon khác. `:38–42` chỉ dựa tuổi sự kiện để show cracks/rings/sparks, không query head/butt contact với sàn.

Đặc biệt nhánh mới `src/manual-h02.js:74–76` sample reportPlayer, set stamp từ t>=2.8, cập nhật VFX và cameraShake=0 rồi return. `stampLift` `.15` của đường cũ (`src/h02-entrance.js:11`) chỉ được áp trong legacy branch `src/manual-h02.js:88–91`; nhánh mới không chạy phần đó. Vì vậy “có vết nứt lúc 2.8” không tự chứng minh có hành động nhấc/gõ chuôi đồng bộ hoặc impact ở dưới chuôi. Cần xét actual mesh contact theo số đo/ảnh, không sửa timing hay rig trong cuộc audit này.

## 7. Vì sao test pass vẫn không chứng nhận animation giống DOCX

| Kiểm hiện có | Điều thực sự xác nhận | Điều chưa xác nhận |
|---|---|---|
| Hash/receipt `tests/report-entrance.test.js:40–65` | Binary đúng version, không thay weights | Source rig đã kích hoạt, topology áo độc lập |
| Finite/unit quaternion, angular cap `:105–124` | Không NaN, góc không nhảy quá cap | Không kéo mesh, không xuyên thân, vị trí tay/chân đạt |
| 60/120Hz `:127–153` | Sample RightHand ở t4 và controller/mixer reuse | Tất cả bones, mọi frame, deformation LBS, contact |
| Grip test `:155–174` | Virtual palm/shaft pivot ở t3 gần nhau | Ngón tay thật bọc cán, grip từ t1.6, head/face plane |
| `HeroPoseController:70–119` | Track/channel, dấu quaternion, closure Idle | Skin weights đúng, tách áo/vạt áo |
| `HeroPoseController:137–175` | FK endpoints và continuity giữa clip | Bề mặt LBS không gấp/pinch/collapse |
| Browser trạng thái loaded/visible | Model/controller đã có và nhãn đúng | So ảnh DOCX, mode worker thực, máy Android thật |

Không có phép thử cấu trúc nào trên đây đo toàn bộ mesh sau donor skinning và mọi bước limiter/retarget. Khi test sử dụng cùng offset để dựng và để đo virtual grip, nó xác nhận tính nhất quán của điểm dựng, không phải một kiểm độc lập đối với bàn tay/thân cán. Các cờ `weightsReplaced:false`, `sourceSkinActivated:false`, `clothAcceptance:false` là giới hạn được ghi thật trong receipt, không phải hoàn tất rig.

## 8. Kết luận và ranh giới lần audit

Motion mới đã thêm timeline 3 giây, pose/target và controller cho preview, có kiểm hash và continuity. Nó **chưa hoàn thành cùng hệ thống rig/mesh/cloth của DOCX**, chưa thống nhất giữa preview và battle, và mode HOẠT ẢNH còn thiếu truyền lệnh trên backend worker mặc định. Source tĩnh 4096 và legacy animated donor là hai sản phẩm khác nhau; phải đánh giá cả hai, không lấy độ nét source tĩnh hoặc metadata source để chứng nhận animation donor.

Các điểm cần ưu tiên trong kế hoạch khắc phục sau duyệt: đường mode worker; thống nhất nguồn rig/mesh thực sự được render; kiểm actual LBS sau retarget/limiter; solve grip/contact độc lập với virtual offsets; root/foot/ground pose theo DOCX mới; đồng bộ weapon stamp/VFX; rồi mới áo/vạt/tay áo theo thứ tự người dùng yêu cầu. Đây là định hướng nghiệm thu, chưa có thay đổi nào được áp dụng.

Số đo browser của đợt này là cloud Chromium từ đúng bundle APK, không phải điện thoại thật. Không có tuyên bố FPS/độ mượt/chạm tay trên Android thật. Các screenshot H02 còn preparing đã bị loại khỏi bằng chứng; kết luận worker dựa lần chờ đúng hero/source loaded. Không build APK mới và không sửa ngưỡng test trong bước báo cáo này.
