# Conver10: chân, nối clip H01 và tách áo khỏi giày

Tiếp tục ngày 21/10/2026, giờ Việt Nam. **Đã sửa lỗi nối Entrance → Idle của H01 trong bản thử; cả H01/H02 qua phép đo sàn riêng trên toàn vùng ủng đã chọn theo nguồn. Chưa nghiệm thu toàn rig, chưa kích hoạt vào game, chưa có APK mới.** Áo và full grip vẫn chặn mục tiêu.

Mọi số đo dưới đây chạy trên Linux cloud. Ảnh dùng Chromium/SwiftShader; không có phép đo FPS, cảm ứng hoặc nghiệm thu trên điện thoại thật. Giữ nguyên nguồn, UV, normal, ảnh 4096, 52 xương cơ thể và clip legacy. Không đổi luật/GDD/ví/kho/vault/HMAC hoặc ngưỡng kiểm tra.

## 1. H01: sửa da chân trước khi sửa tư thế

Đồ thị nguồn H01 cho thấy ở crop 300 mm, hai miền nối từ đế còn riêng. Tăng crop lên 400 mm đã làm miền chân trái nhập vào áo, vượt qua đường giữa thân. Vì vậy không gán toàn bộ thành phần ở crop 600 mm như H02 cho H01. Bộ chọn giờ từ chối trường hợp miền chân nhập với áo, thay vì gán nhãn theo hộp tọa độ.

Lõi H01 dưới 250 mm lấy từ hai thành phần ở crop 300 mm, tiếp tục trường ảnh hưởng qua FEM screening 100 mm. Bảo vệ nguyên **38.037 đỉnh bàn/ngón tay**. Xuất lại giữ nguyên 1.499.726 tam giác, 869.627 đỉnh nguồn, mọi vị trí/normal/UV, ảnh nguồn, inverse-bind và các clip cũ. Đổi trọng số là thay đổi thật; không dịch mesh nguồn lên để che lỗi.

Đối chiếu dưới đây dùng **cùng pose mới, cùng bộ source-ID của ủng**, nên không trộn tác dụng sửa trọng số với việc đổi pose. Đây là phép đo tĩnh trong miền ủng, gồm các tam giác chạm đường biên của miền đó.

| Phép đo cloud tại cùng pose | Trọng số canonical cũ | Trọng số mới |
|---|---:|---:|
| Đỉnh thấp nhất ủng trái | −226,812 mm | −2,806 mm |
| Đỉnh thấp nhất ủng phải | −305,584 mm | +0,048 mm |
| p99.9 tỷ số cạnh của miền ủng | 26,889459 | 1,165187 |
| Tỷ số cạnh lớn nhất của miền ủng | 58,636613 | 1,202569 |

Nguồn phép đo: [canonical trước sửa](feet/lower-leg-h01-v1/source-baseline-contact.json), [cùng pose sau sửa](feet/lower-leg-h01-v1/mesh-stance-contact.json), [receipt giữ dữ liệu nguồn](feet/lower-leg-h01-v1/receipt.json), [FEM/KKT](feet/lower-leg-h01-v1/solve.json). Hạn mức cạnh vẫn **1,5 / 2,0**, sàn **5 mm**.

Pose cũ chỉ đặt neo xương đúng chưa đủ: đế trái còn thấp 5,317 mm, còn ủng phải chưa chạm đúng sàn. Fitter mới dùng trực tiếp tọa độ các đỉnh nguồn sau skinning để tính residual và ràng buộc tiếp xúc. Bản thân phép fit không phải chứng nhận; `foot-check.mjs` tính lại bằng ma trận glTF độc lập và cho cùng kết quả. Thân nghiêng trước 15,008817°, pelvis 14,999900°; các giới hạn giải phẫu hiện hành giữ nguyên.

**Toàn mesh vẫn thất bại:** tại chính pose mới, p99.9 = **3,225667**, maximum = **10,255410**, áo/phần vải thấp nhất **−628,182 mm**. Seam nguồn đã đo = **0 mm**, provenance nguồn đạt. Không lấy kết quả giày để nhận toàn thân hết xuyên. Xem [toàn mesh](feet/lower-leg-h01-v1/mesh-stance-all-mesh.json).

## 2. H01: toàn clip và nối Idle

Mẫu `h01-keys-v6` giữ cây trượng nguồn đứng tại chỗ, không kéo trượng theo tay để giấu lỗi nắm. Tay chống đất có key nhả riêng; tay phải đi tới key nắm tính tại đúng pose thân lúc nắm, rồi giải về trượng đứng yên. Giai đoạn cuối đứng được nối dần vào pose Idle. Không reset/dựng lại mixer hoặc action khi replay.

Chân phải bước trong 2,65–3,30 s, biên độ nhấc 52 mm. Các thử 40 mm và 60 mm đều được giữ: 40 mm gây xuyên đế khoảng 12 mm; 60 mm tránh sàn nhưng còn 4 frame sai đích IK. Bản 52 mm được kiểm lại trên GLB thật, không chỉ trên đường đích.

| Phép đo độc lập trên GLB `h01-keys-v6` | Kết quả |
|---|---:|
| Frame Entrance + IDLE_HOLD ở 60 Hz | 488 |
| Frame vi phạm giới hạn khớp / hướng thân / bàn tay chống | 0 / 0 / 0 |
| Frame lỗi IK còn lại trong bake | 0 |
| Sai đích IK lớn nhất | 2,748 mm |
| Trượt neo chân lớn nhất | 0,010691 mm |
| Lệch neo Idle lớn nhất | 0,074495 mm |
| Bước neo ở đoạn blend lớn nhất | 0,063230 mm |
| Replay/seek, giữ mixer/action, Idle chạy lâu | pass |
| Sai offset tay/trượng sau nắm | 0,129 mm, **không phải full grip** |

[Bake và hash công cụ](animation/h01-keys-v6/H01-bake.json), [Three AnimationMixer độc lập](animation/h01-keys-v6/H01-fk-validation.json).

Validator mới đo riêng **mọi đỉnh thuộc source-ID miền ủng**, kể cả phần ủng cao hơn 150 mm và mọi frame bước sau tiếp đất. Nó kiểm hash nguồn và đối chiếu chính xác vị trí bind với model gốc. Phép đo riêng này **bổ sung**; phép kiểm vùng thấp có cả vải và gate toàn mesh trước đó vẫn giữ nguyên, không bị thay bằng bộ chọn hẹp.

| Toàn vùng ủng, mọi frame sau tiếp đất + Idle | H01 | H02 |
|---|---:|---:|
| Số frame đã đo | 374 | 377 |
| Xuyên sàn lớn nhất | 2,806 mm | 1,759 mm |
| Hở sàn khi đang đặt chân lớn nhất | 0,051 mm | 0,047 mm |
| Sai lệch đứng của tập đế khi đặt phẳng | 2,846 mm | 1,791 mm |
| Qua giới hạn 5 mm trong phạm vi trên | có | có |

[H01 actual source boots](animation/h01-keys-v6/H01-boot-fk-validation.json), [H02 actual source boots](animation/joint-rise-v8/H02-boot-fk-validation.json). Đây chưa là phê duyệt mỹ thuật/giải phẫu toàn vùng. **H01 `fkCriteriaPassed:false` vẫn giữ**, vì vùng thấp gồm vải còn 177 trường hợp lỗi sàn. `controllerPassed:true` không thay thế điều kiện áo, grip, tiết diện, collision hoặc Android.

H02 được bake/kiểm hồi quy lại: đủ 452 frame, kết quả hẹp FK/controller giữ nguyên. GLB H02 vẫn đúng SHA **2fb7a83dc919170475963b62b2137d7869cbe03663cf8bad959b57fa7a83a688**, trùng byte lượt trước.

GLB H01 mới chỉ ở staging: **dcb658dd4e047cb0cb79dec3f1c56befce6237c664e7087ab79ad22fe2344cd4**. Không đổi manifest runtime sang file này.

## 3. Tách áo: tìm đúng chỗ còn dính vào ủng

Bản cắt trước chỉ mở 948 cạnh nối tay áo/vạt dưới. Vẫn còn kết nối giữa vạt và các miền nguồn khác bên dưới 500 mm. Cắt thử cả 660 cạnh ranh giới này cho thấy cần phân biệt mảnh vải bị phân loại nhầm với chính ủng.

Bản `coat-boot-cut-v2` truy ngược kết nối tam giác thật từ các source-ID đế giày, xác nhận **610 cạnh** thực sự giáp hai thành phần chứa ủng. **30 mặt nguồn nhỏ trong 10 thành phần** không nối với đế được trả về đúng lớp lót vạt theo láng giềng mặt, thay vì cắt thành các lỗ nhỏ trên hoa văn áo. Mỗi thay đổi ownership có danh sách mặt nguồn và bounds trong [cut plan](coat-boot-cut-v2/cut-plan.json). Vùng panel ngoài ban đầu vẫn giữ riêng để không pha loãng kiểm strain bằng việc thêm lớp lót.

Tổng đề xuất **1.558 cạnh cắt**. Compiler union-find và một bộ dựng graph góc mặt độc lập cho kết quả trùng nhau trên toàn **4.499.178 góc nguồn**. Export giữ đủ **1.499.726 mặt nguồn**, không thêm da/thân giả, không xóa mặt hoặc sửa texture. Vòng eo và phần thân trên vẫn giữ nguyên kết nối. [Receipt export](coat-boot-cut-v2/export.json).

**Pattern chưa được duyệt và chưa dùng trong game.** Cần sửa/kiểm biên mở và chuyển động vải; registry pattern được chấp nhận vẫn rỗng. Bản thử xương áo riêng giữ 52 xương cơ thể, thêm 32 xương vải và bind tương ứng; chúng không phải model thay thế. Bản này còn kéo căng mạnh: `secondary-cloth-v2` có tỷ số cạnh tới **58,637** ở phần còn lại, khoảng **56** ở vạt, gấu/vải còn xuyên sàn. Phương án guide hiện tại bị loại, không dùng các số đẹp ở giày để thông qua nó.

Các thử áo v1/v2 dùng pose và cấu trúc mặt vá khác nhau, nên không coi sự thay đổi số đo giữa hai thử là một phép A/B chỉ đổi đường cắt. Chuyển động áo tự nhiên vẫn là việc chưa hoàn tất.

## 4. Bằng chứng nguồn, kiểm thử và cách dựng lại

Bake nay mang theo các sidecar nguồn được khai báo bằng SHA: triangle map, weld map, review và các phụ thuộc của cut plan. Kiểm toàn bộ hash trước khi ghi; từ chối đường dẫn thoát thư mục/symlink và dữ liệu bị sửa. Trước đây GLB bake còn giữ tên sidecar nhưng thiếu tệp bên cạnh nên kiểm nguồn sau bake không chạy đầy đủ được. Sao chép bằng chứng không tự phê duyệt một pattern bị loại.

Kiểm thử cloud hiện tại: **npm test 308/308**, **test:master 215/215**. `verify:master` exit **1**, **BLOCKED 0/37**; goal rig exit **1**, **BLOCKED**. Không sửa ngưỡng hoặc điền chứng cứ thiết bị giả. [Log nguyên byte, exit code và fingerprint](checks/h01-boot-pass-2026-10-21/checks.json). Fingerprint không thay đổi trong lúc chạy checks.

Input nhận dạng [nguồn H01](feet/source-h01/input.json), [source-ID ủng](feet/source-h01/selection.json), [pose fitter chưa căn đầu](feet/lower-leg-h01-v1/fit-input-pose.json), [pose đã căn đầu](animation/stances-forward/H01-mesh-foot-head-aligned.json). Các mảng lớn và GLB thử ở `.local/rig-candidates/`, không đóng vào APK mặc định.

```sh
HERO=H01 node tools/rig/foot-source.mjs
OPENBLAS_NUM_THREADS=1 python3 tools/rig/foot-graph.py .local/rig-candidates/foot-source/H01 .22
cp docs/anim-report/conver10-redo/feet/source-h01/selection.json .local/rig-candidates/foot-source/H01/selection.json
PYTHONPATH=.local/rig-python OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=2 python3 tools/rig/lower_leg_supports.py .local/rig-candidates/foot-source/H01 .local/rig-candidates/lower-leg-h01-v1 --all-fields --whole-body --screen-metres .10 --component-crop .30 --core-below .25
node tools/rig/export-lower-leg.mjs .local/rig-candidates/lower-leg-h01-v1
HERO=H01 FK_BOUNDED_FIT=1 FK_VELOCITY_AWARE=1 FK_JOINT_RISE=1 RIG_FILE=.local/rig-candidates/lower-leg-h01-v1/H01-C0-rigged.glb FK_STANCE_FILE=docs/anim-report/conver10-redo/animation/stances-forward/H01-mesh-foot-head-aligned.json FK_OUTPUT_DIR=.local/rig-candidates/fk-h01-rebuild FK_REPORT_DIR=docs/anim-report/conver10-redo/animation/h01-rebuild node tools/bake-entrance-anim.mjs
HERO=H01 RIG_FILE=.local/rig-candidates/fk-h01-rebuild/H01-C0-rigged.glb FK_REPORT_DIR=docs/anim-report/conver10-redo/animation/h01-rebuild node tools/rig/validate-fk-animation.mjs
HERO=H01 RIG_FILE=.local/rig-candidates/fk-h01-rebuild/H01-C0-rigged.glb FK_REPORT_DIR=docs/anim-report/conver10-redo/animation/h01-rebuild node tools/rig/validate-fk-boots.mjs
```

Bake và validator toàn FK vẫn trả exit 1 vì chưa nghiệm thu; kiểm ủng riêng có thể pass. Không bỏ hai kết quả thất bại khi tổng hợp. Giải FEM lại có thể sinh hash mới; kiểm lại GLB đầu ra tương ứng, không lấy chứng nhận của hash cũ dùng lại.

Ảnh full-resolution, trước/sau/cạnh và thời gian nằm trong [sổ conver10](../../../picture/conver10/online-pic.md). [Đối chiếu byte ảnh](../../../picture/conver10/byte-proof-h01-boots-2026-10-21.json). Chưa đổi rig sản xuất, chưa build/phát hành một APK chỉ mang công cụ chẩn đoán rồi gọi là đã sửa rig. Phần còn lại: áo và biên, full grip/clearance/tiết diện, kiểm đủ pose, tích hợp rig đã đạt, rồi APK và thử trên điện thoại.
