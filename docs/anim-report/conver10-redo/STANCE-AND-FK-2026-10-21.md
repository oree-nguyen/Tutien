# Rig conver10 — tiếp tục ngày 21/10/2026 (UTC+7)

H02 đã qua **phạm vi FK** cho toàn bộ Entrance và IDLE_HOLD ở lượt `joint-rise-v7`. Đây chưa phải rig được nghiệm thu: áo, tiếp xúc ngón tay/vũ khí và kiểm định toàn mesh vẫn chặn tích hợp. H01 cũng chưa đạt. Không có APK mới của đợt này.

Tất cả số đo bên dưới chạy trên Linux cloud. Chromium dùng SwiftShader để chụp ảnh, không phải phép đo FPS hay nghiệm thu trên điện thoại Android.

## 1. Sửa nguyên nhân thật ở chân và hướng thân

Một đỉnh ống giày H02 ở độ cao nguồn 178,69 mm nhận **52,0078% trọng số Hips**, dù nằm gần cổ chân. Khi ngồi, nó đi theo hông xuống dưới sàn. Vì vậy chỉ kiểm tọa độ xương Foot không phát hiện lỗi.

`lower_leg_supports.py` lấy lõi chân từ các thành phần liên thông nguồn bên dưới 600 mm; ở cao độ 750 mm chúng đã nhập với áo nên không dùng cả thành phần đó làm chân. Các trường Foot/Leg/UpLeg tiếp tục qua FEM trên cạnh nguồn. Bàn tay và ngón tay giữ nguyên **37.122 đỉnh được bảo vệ**.

Các lượt sau thay đổi trọng số; giữ nguyên 1.499.746 tam giác H02, vị trí/normal/UV, ảnh nguồn 4096, hierarchy 52 xương, inverse-bind và clip legacy. Exporter đọc lại file để đối chiếu. Không ghi đè model nguồn hoặc rig sản xuất.

| H02, cùng một tư thế ngồi nghiêng trước | Rig cũ | Lõi chân v1 | Toàn trường v2 | Toàn thân có screening v3 |
|---|---:|---:|---:|---:|
| Đỉnh thấp nhất miền giày trái (mm) | −270,260 | −0,849 | −0,849 | −0,849 |
| Đỉnh thấp nhất miền giày phải (mm) | −281,930 | −1,759 | −1,759 | −1,759 |
| p99.9 cạnh toàn mesh | 24,985741 | 18,824610 | 5,561184 | 4,221529 |
| Cạnh toàn mesh lớn nhất | 149,075395 | 133,281066 | 41,249419 | 8,482240 |
| Đỉnh thấp nhất của **toàn model**, gồm áo (mm) | −583,113 | xem JSON | xem JSON | −552,256 |

Giới hạn cạnh vẫn là **1,5 / 2,0**; cả ba bản thử toàn thân bị loại. Các seam nguồn đã đo của v1–v3 có khe hở 0 mm. Giày đạt ở một pose không chứng minh áo hết xuyên sàn. `posedBounds` mới đo mọi đỉnh thực sự được index để không bỏ sót áo trong phép đo sàn.

FEM dùng kiểm residual tương đối, primal/dual KKT như trước. Đã bỏ `atol=1e-9` làm CG dừng quá sớm với RHS rất nhỏ. Phương pháp projected Newton có line search năng lượng, chỉ trả kết quả khi đạt KKT; các test đối chiếu NNLS độc lập chạy ở ba thang 1, 1e−6 và 1e−10. Hội tụ số học chưa phải chứng nhận biến dạng mesh.

Trình fit cũ chỉ đo độ nghiêng tuyệt đối, nên tư thế ngả **ra sau** vẫn có thể lọt qua. Nay cả fitter và Three FK đo dấu theo +Z trước mặt nhân vật: nghiêng trước 15–25°, tổng nghiêng ≤26°, nghiêng pelvis ≤15°. Không đổi trục canonical. H02 đạt nghiêng trước 18,756661°; H01 đạt 18,734043° và gối phải 79,999854 mm trong phạm vi điểm/xương. Các kiểm tra mesh độc lập vẫn thất bại.

Đầu được căn về hướng của model nguồn bằng xương Neck thật và giới hạn khớp đã có. Không xoay giả cả model, sửa màu hoặc dựng lại mặt. Lỗi hướng đầu tại pose H02 giảm 32,576844° về 0°; H01 giảm 26,447563° về 0°. Đây là đo orientation xương, không chứng nhận da vùng cổ.

## 2. H02: kết quả FK toàn chuỗi mới nhất

Đọc [bake receipt](animation/joint-rise-v7/H02-bake.json) và [Three AnimationMixer kiểm độc lập](animation/joint-rise-v7/H02-fk-validation.json). GLB thử:

`2fb7a83dc919170475963b62b2137d7869cbe03663cf8bad959b57fa7a83a688`

| Phép đo cloud trên GLB thật | Kết quả |
|---|---:|
| Tổng frame Entrance + IDLE_HOLD, 60 Hz | 452 |
| Frame vi phạm giới hạn khớp | 0 |
| Frame lỗi điểm lòng bàn tay/hướng thân theo kiểm FK | 0 |
| Frame lỗi vùng mesh chân tự động theo kiểm sàn | 0 |
| Frame lỗi IK còn lại trong bake | 0 |
| Bước góc thân lớn nhất / giới hạn (độ/frame) | 7,999997 / 8 |
| Bước góc ngón lớn nhất / giới hạn (độ/frame) | 13,132357 / 16 |
| Trượt neo chân lớn nhất | 0,231 mm |
| Xuyên sàn lớn nhất trong vùng chân đã đo | 1,759 mm |
| Sai lệch đứng của tập đế nguồn đã đo | 1,791 mm |
| Độ cao điểm Palm theo frame giải phẫu lớn nhất | 3,172 mm |
| Drift neo trong Idle | 0,041681 mm |
| Bước neo lớn nhất tại blend | 0,002306 mm |
| Controller giữ mixer/action, replay/seek, chạy Idle lâu | pass |

Những sửa cần thiết:

- Idle lấy mẫu theo pha riêng, không phụ thuộc nhánh IK cuối Entrance và không giải tay thêm một lần chỉ ở các frame giữa vòng thở.
- IK giữ pose nguồn đang có tiếp xúc, thay vì bẻ gối theo khoảng tầm với 0,999 của **seed** giải tích. Pose hiện tại là seed và ưu tiên null-space yếu khi chưa có lịch sử. Kiểm độc lập trên hệ xương bind thật H02 giữ tiếp xúc sau chuẩn hóa quaternion; pose không được vượt ngân sách vận tốc.
- Lượt `FK_JOINT_RISE=1` chỉ là phương án staging H02: nâng tay theo key khớp trong giới hạn, chùy đi theo tay thật sau khi nắm. Chênh lệch với đường nâng Cartesian cũ vẫn được ghi từng frame; số lỗi IK giảm không thay thế phép đo ngón/mesh vũ khí.
- Bước chân trái 2,15–2,55 s, phải 2,60–2,98 s để chân thu vào khi hông đã đủ cao. Phương án cũ gây 4 frame lỗi đế, dù giới hạn khớp không vi phạm. Không nới 5 mm để cho pass.
- Các pose trích từ clip mới có `passed:false`, `poseDataValid` và scope chẩn đoán rõ ràng. Receipt lưu hash công cụ, calibration, spec, rig và vũ khí.

`fkCriteriaPassed:true` và `controllerPassed:true` chỉ áp dụng phạm vi trên. `passed:false` và `activated:false` của đợt thử vẫn giữ: miền chân tự động chưa phải phê duyệt giải phẫu, áo còn xuyên sàn, full grip và clearance đầu/vũ khí chưa đạt. Không chuyển chứng nhận palm hẹp của rig lịch sử sang các file mới.

## 3. H01 và biên áo vẫn chặn

Lượt H01 mới nghiêng thân đúng hướng và đầu nhìn thẳng, nhưng controller vẫn từ chối `Entrance/idle discontinuity: RightArm`. Bản áo `coat-closed-pbr-v3` tại crouch mới có gấu xuống **−659,506 mm**, cạnh lớn nhất ở phần còn lại **57,683**. Bản fit một tư thế cầm trượng trước đó không đủ dùng cho tư thế ngồi sâu này.

Đã thử cấm các tam giác vá thực sự tạo giao cắt, rồi giải lại disk từ cùng source-corner fan. Danh sách cấm gắn hash parent, cut edges, pose và kết quả BVH; không sửa nguồn hoặc miễn seam. Có test buộc tìm disk khác và từ chối nếu mọi disk hợp lệ đã bị loại.

| Mặt vá H01, cùng pose cầm trượng | Cặp giao cắt |
|---|---:|
| Trước thêm mặt vá | 476 |
| Mặt vá v3 trước đợt này | 754 |
| Collision exclusion v1 | 746 |
| v2 | 779 |
| v3 | 749 |
| v4 | 774 |

Không lượt nào đạt: đổi phép tam giác hóa chưa giải quyết việc biên áo gập và đụng các lớp nguồn. Không chọn một lượt chỉ vì có số cạnh đẹp hơn. Registry pattern được duyệt vẫn rỗng, không kích hoạt mặt vá này.

Ảnh đầy đủ, trước/sau/cạnh, nằm trong [sổ conver10](../../../picture/conver10/online-pic.md). Ảnh gốc không bị giảm kích thước; contact sheet là ảnh bổ sung. Các GLB lỗi và mảng solver lớn ở `.local/rig-candidates/`, không được đóng thêm vào APK mặc định.

## 4. Chạy lại

Giữ nguyên nguồn canonical. Các pose đã dùng nằm tại [stances-forward](animation/stances-forward/); input/selection vùng chân được giữ nguyên byte tại [source-h02](feet/source-h02/).

```sh
HERO=H02 node tools/rig/foot-source.mjs
OPENBLAS_NUM_THREADS=1 python3 tools/rig/foot-graph.py .local/rig-candidates/foot-source/H02 .22
cp docs/anim-report/conver10-redo/feet/source-h02/selection.json .local/rig-candidates/foot-source/H02/selection.json
PYTHONPATH=.local/rig-python OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=2 python3 tools/rig/lower_leg_supports.py .local/rig-candidates/foot-source/H02 .local/rig-candidates/lower-leg-v3 --all-fields --whole-body --screen-metres .10 --nonnegative-method projected-newton
node tools/rig/export-lower-leg.mjs .local/rig-candidates/lower-leg-v3
HERO=H02 FK_BOUNDED_FIT=1 FK_VELOCITY_AWARE=1 FK_JOINT_RISE=1 RIG_FILE=.local/rig-candidates/lower-leg-v3/H02-C0-rigged.glb FK_STANCE_FILE=docs/anim-report/conver10-redo/animation/stances-forward/H02-forward-head-aligned.json FK_OUTPUT_DIR=.local/rig-candidates/fk-joint-rise-rebuild FK_REPORT_DIR=docs/anim-report/conver10-redo/animation/joint-rise-rebuild node tools/bake-entrance-anim.mjs
```

Bake xuất chẩn đoán với exit 1 vì `passed:false`; đọc receipt và chạy validator độc lập với chính đường dẫn đầu ra đó. Một lần giải số lại tạo receipt/hash mới và phải kiểm lại, không tự dùng chứng nhận của hash cũ. PyAMG dùng môi trường cục bộ theo `tools/rig/SEMANTIC-GARMENT.md`.

## 5. Kiểm tra và phát hành

`npm test`: **299/299**; `npm run test:master`: **215/215**. `verify:master`: **BLOCKED 0/37**; goal rig vẫn **BLOCKED**. Không hạ ngưỡng. Log thật và hash tại [checks](checks/latest-checks.json).

Runtime sản xuất và APK hiện hành chưa nhận các rig này. Không build một APK chỉ thay số phiên bản rồi nhận là đã sửa rig. Phần còn lại là biến dạng/giao cắt áo ở nhiều pose, actual full grip, kiểm volume/section/clearance, tích hợp rig đã đạt, rồi mới đóng APK và thử trên điện thoại thật.
