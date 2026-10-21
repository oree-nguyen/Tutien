# Audit toán học, skeleton và skin thực tế — animation Gemini hiện hành

**Kết luận: KHÔNG ĐẠT nghiệm thu animation theo hai báo cáo Gemini.** Bộ phát clip hoạt động, độ dài xương gần như bất biến và một số mục tiêu lớn đúng; nhưng mesh đã skin bị kéo rất lớn ở mọi frame visible được đo. Việc unit test quaternion/binding pass không chứng minh hình người, áo hoặc tay nắm vũ khí đúng. Đây là điều tra read-only; không sửa game, rig, clip, asset hoặc APK.

## 1. Bản được đo và phạm vi

- Commit runtime: `bb68cf31f1a574487f701c4fe7f1b846da0f43ec`. APK mà root đối chiếu có version `2.5.ba97bec3`.
- `ReportEntrancePlayer` thực được import và chạy, không viết lại một bộ phát “giống tương đương”.
- Mỗi nhân vật có **421 mẫu thời gian** `t=0, 1/60, …, 7.0 s`: gồm Entrance 3 giây, blend 0,3 giây và một chu kỳ idle 4 giây.
- Trong đó **374 mẫu visible** từ `47/60 = 0,783333 s`; 361 mẫu ở/sau landing `t>=1`. Chương trình dùng hằng `0.766666667`, nhỉnh hơn chính xác `46/60`, nên mẫu F46 của lưới 60 Hz chưa visible. Đây là chênh lượng tử một frame, không phải lỗi biến dạng chính.
- Đo toàn bộ mesh high thực của rig legacy. Không thay kết quả bằng phép đo GLB staging source-resolution. Không cộng geometry VFX, linh hoàn hoặc vũ khí vào kiểm strain thân.
- Đơn vị: mét trong hệ model trước scale sảnh `2.4` và yaw. Yaw không đổi Y/strain. `floor y=0` là mặt phẳng chuẩn hoá nguồn, không tự nhận là collision plane chính xác của bệ đài trong game.
- Đây là đo CPU/cloud, không phải số FPS hay kiểm Android vật lý.

## 2. Vì sao phép đo không dùng nhầm số Int16/Uint8

Các donor GLB đang chạy dùng `POSITION: Int16 normalized`, `NORMAL: Int16 normalized`, `WEIGHTS_0: Uint8 normalized`; inverse bind matrices còn mang phép dequantization. Đọc trực tiếp `getArray()` như toạ độ mét hoặc lấy weight 0–255 làm 0–1 sẽ cho kết luận sai.

Audit dùng `Accessor.getElement()` giải normalized và tính cả bind lẫn posed bằng cùng công thức vật lý:

```text
p_bind(v) = Σ w_vk · (W_bind_joint[k] · IBM[k]) · p_normalized(v)
p_pose(v) = Σ w_vk · (W_pose_joint[k] · IBM[k]) · p_normalized(v)
strain(edge a,b) = |p_pose(a)-p_pose(b)| / |p_bind(a)-p_bind(b)|
```

Mỗi edge lấy từ topology triangle thực, không nối các đỉnh chỉ vì chúng gần nhau. Chỉ loại source edge dài không quá `1e-12 m` để tránh phép chia cho zero, giữ nguyên các cạnh nhỏ khác. Ngưỡng gốc giữ nguyên: **p99,9 ≤ 1,5; maximum ≤ 2,0**. Bind không hoạt ảnh được đo đúng `p99,9=1, maximum=1` ở cả hai nhân vật.

## 3. Đối chứng độc lập bằng Three.js

Đối chứng tạo `THREE.SkinnedMesh` với đúng BufferAttribute normalized, Skeleton 52 bone, IBM và `bind(identity)` như GLTFLoader; gọi `getVertexPosition()` trên 64 đỉnh gồm worst edge, lowest vertex và các đỉnh trải đều, tại 9 thời điểm. Đây là đường tính khác đoạn manual LBS của audit.

| Nhân vật | So sánh vị trí | Sai số lớn nhất giữa manual LBS và Three.getVertexPosition |
|---|---:|---:|
| H01 | 576 | 0.000000000000 m |
| H02 | 576 | 0.000000000000 m |

Kết quả zero ở 576 phép so sánh/nhân vật xác nhận công thức audit khớp đường CPU skinning của Three. Nó không tuyên bố đã đo pixel GPU; khác biệt làm tròn float GPU không thể giải thích cạnh bị kéo hàng chục lần.

## 4. Skeleton không bị kéo dài; skin bị biến dạng

| Chỉ số | H01 | H02 |
|---|---:|---:|
| Vertex của rig high | 45257 | 31814 |
| Triangle của rig high | 60000 | 30000 |
| Bone | 52 | 52 |
| Sai số tương đối lớn nhất của chiều dài xương | 2.31564901e-07 | 3.50309714e-07 |
| Sai số scale bone so với1 | 0 | 0 |
| Frame visible trượt strain | 374 | 374 |
| p99,9 xấu nhất của edge strain | 16.8588948 | 20.6283053 |
| Edge strain lớn nhất | 109.274336 | 53.1479044 |

“Xương biến dạng” người chơi nhìn thấy không nhất thiết là bone scale khác 1 hoặc xương dài ra. Ở đây các phép đo length/scale đều gần bất biến, trong khi vertex nhận trọng số từ các khớp di chuyển khác nhau bị kéo/co rất mạnh. Chỉ chặn độ quay mỗi frame hoặc ép quaternion normalize không giải được hiện tượng đó. Không lấy việc xương không dài ra để phủ nhận lỗi hình ảnh.

### 4.1 Hai cạnh chứng minh trực tiếp

Các ID là index trong primitive của đúng donor high, không phải ID của source1,5M mặt.

#### H01: t=6.000000 s — `H01_C0_Hunyuan_StaticTrial`

- Cạnh `3976–4132`: bind **6.308 mm** → pose **689.276 mm**, hệ số **109.274336×**.
- Bind A `(-0.3672, 0.9040, 0.0694)`; bind B `(-0.3659, 0.8982, 0.0672)`.
- Posed A `(-0.1575, 1.5417, 0.1190)`; posed B `(0.0841, 0.8982, 0.0672)`.

| Vertex | Ảnh hưởng skin đang có |
|---|---|
| 3976 | RightHand 50.196%; RightForeArm 49.804% |
| 4132 | Hips 52.157%; RightUpLeg 37.255%; RightLeg 10.588% |

#### H02: t=1.600000 s — `H02_Hunyuan_Body`

- Cạnh `24415–24419`: bind **5.918 mm** → pose **314.520 mm**, hệ số **53.147904×**.
- Bind A `(-0.2056, 0.1713, -0.0019)`; bind B `(-0.2108, 0.1693, -0.0038)`.
- Posed A `(-0.3217, -0.1094, 0.1103)`; posed B `(-0.4425, 0.1754, 0.0536)`.

| Vertex | Ảnh hưởng skin đang có |
|---|---|
| 24415 | Hips 52.157%; RightLeg 30.588%; RightFoot 17.255% |
| 24419 | RightLeg 62.353%; RightFoot 37.647% |

Ở H01 một đầu cạnh nhận gần 100% từ bàn tay/cẳng tay phải, đầu còn lại nhận từ hông/chân phải. Khi tay giơ cao, hai đầu bị kéo xa dù trong bind chỉ cách6,308 mm. Đây là bằng chứng trực tiếp về ranh giới skin/topology cần xử lý. Không tự khẳng định cạnh đó là đường may cụ thể khi chưa duyệt mesh cô lập; việc phân vùng áo hay sửa trọng số phải dựa vào bề mặt thật, không đoán bằng màu.

## 5. Đối chứng raw donor clips: lỗi có sẵn và lỗi tăng nặng

Các hàng dưới chỉ chạy clip nhúng nguyên bản trong donor, **không** chạy IK cũ, không đổi model tĩnh/rig và không VFX. Chúng là control skin/deformation, **không phải tái dựng APK cũ**.

### H01

| Pose control | Thời gian | p99,9 | Maximum | y nhỏ nhất | Gate strain |
|---|---:|---:|---:|---:|---|
| unanimated bind | — | 1.000000 | 1.000000 | 0.000021 | PASS |
| Idle | 0 | 3.192517 | 18.416543 | 0.000021 | FAIL |
| Idle | 1 | 3.192517 | 18.398762 | 0.000021 | FAIL |
| Idle | 2 | 3.192517 | 18.416543 | 0.000021 | FAIL |
| Entrance | 0 | 13.060401 | 85.658932 | -2.148962 | FAIL |
| Entrance | 2.0999999046325684 | 13.078207 | 85.658920 | -0.548962 | FAIL |
| Entrance | 4.199999809265137 | 3.192517 | 18.416543 | 0.000021 | FAIL |

### H02

| Pose control | Thời gian | p99,9 | Maximum | y nhỏ nhất | Gate strain |
|---|---:|---:|---:|---:|---|
| unanimated bind | — | 1.000000 | 1.000000 | 0.000253 | PASS |
| Idle | 0 | 2.303128 | 7.494409 | 0.000253 | FAIL |
| Idle | 1 | 2.303128 | 7.495020 | 0.000253 | FAIL |
| Idle | 2 | 2.303128 | 7.494409 | 0.000253 | FAIL |
| Entrance | 0 | 1.000005 | 1.000021 | 0.000253 | PASS |
| Entrance | 2.799999952316284 | 18.056654 | 42.091097 | -0.300906 | FAIL |
| Entrance | 5.599999904632568 | 1.617991 | 5.194115 | 0.000253 | FAIL |

Cả hai bind control pass, nhưng raw Idle đã fail. Vì vậy lỗi không phải chỉ xuất hiện do một con số timing mới; skin/rig cũ vốn chưa đủ cho các biến đổi này. Motion mới làm nhiều vùng di chuyển tương đối lớn hơn và đẩy strain lên mức rất cao. Control không chứng minh code mới vô can: bản motion mới vẫn chịu trách nhiệm phải được kiểm toàn mesh trước khi nghiệm thu.

## 6. Xuyên mặt phẳng nguồn sau landing: phải phân biệt áo và bàn chân

| Chỉ số sau landing t≥1 | H01 | H02 |
|---|---:|---:|
| Mẫu đo | 361 | 361 |
| Mẫu có geometry thấp hơn −5 mm | 78 | 74 |
| y nhỏ nhất (toàn thân, m) | -0.299025 | -0.285492 |

Điểm thấp nhất có thể là áo/hem hoặc vùng skin sai, không tự gán tên “lòng bàn chân”. Để không đánh tráo, audit còn báo riêng **low bind band** gồm những vertex vốn có bind `y≤0,06 m`, chia theo dấu X. Đây vẫn chỉ là spatial proxy, không phải mask boot có chứng minh giải phẫu.

Tại t=1,3 s:

| Vùng proxy | H01 minY / maxY (m) | H02 minY / maxY (m) |
|---|---:|---:|
| lowBandLeft | -0.004384 / 0.096313 | 0.000909 / 0.121459 |
| lowBandRight | -0.004695 / 0.091467 | -0.003813 / 0.118406 |
| handRight | 0.259573 / 0.472232 | 0.243224 / 0.468826 |
| handLeft | 0.476412 / 0.774860 | 0.742966 / 0.918121 |

Band sát chân gần mặt phẳng hơn nhiều so với minY toàn mesh. Điều đó củng cố rằng báo cáo cũ “điểm chân đúng” không đủ loại trừ áo xuyên sàn. Vùng handRight có minY khoảng0,24–0,26 m ở pose thấp; chưa phải bằng chứng bàn tay chống đất. Không gọi đoạn nhân vật trồi lên từ dưới đất trước t=1 là lỗi floor; bảng trên đã lọc sau landing.

## 7. Anchor nắm giả định khác bề mặt/anchor tay thực

Builder dùng `frames.localPalm[side]` từ nguồn canonical trên bàn tay legacy, rồi dịch vũ khí đến chính điểm đó (`build-report-entrances.mjs:578–595`). Test lấy lại đúng offset ấy để đo shaft → gần0 chỉ chứng minh hai công thức dùng chung dữ liệu khớp nhau. Nó chưa kiểm lòng bàn tay/đầu ngón mesh có ôm cán.

Đối chứng thêm socket đã được code IK legacy dùng trước đó (`src/h01-ik.js:39`), giữ nguyên vị trí tham chiếu của H01/H02. Socket này cũng chưa phải sự thật bề mặt cuối cùng; khác biệt cho thấy hai định nghĩa anchor không thống nhất.

| t=3,5 s | H01 | H02 |
|---|---:|---:|
| Virtual source-palm → shaft | 0.000042 mm | 0.000053 mm |
| Legacy reviewed socket → shaft | 34.278 mm | 69.235 mm |

### 7.1 H02 đã báo gripped khi còn cách45 cm

`ReportEntrancePlayer.sample()` báo `gripped` theo thời điểm event (`src/report-entrance.js:146`), không theo collision/contact. Builder chỉ bắt đầu kéo chùy tới tay tại1,6 s và hoàn tất tại2,416667 s.

| H02 thời điểm | Virtual palm → shaft grip point |
|---|---:|
| 1.600000 s | 45.061387 cm |
| 1.950000 s | 17.235780 cm |
| 2.200000 s | 4.597929 cm |
| 2.416667 s | 0.000004 cm |
| 3.000000 s | 0.000004 cm |

Đây là sai lệch semantics/visual contact được đo độc lập với state flag. Không thể dùng chữ “gripped=true” để kết luận tay trái đã cầm chùy.

### 7.2 Proxy đầu ngón từ actual skinned vertices

Selection: vertex gần bàn tay trong bind≤0,22 m và có weight≥0,35 vào DIP3; đó là proxy vùng ngón có ảnh hưởng skin, **không phải mesh đã được gắn nhãn giải phẫu**. Khoảng cách radial tính tới cylinder vô hạn có bán kính từ `data/weapons`, không phải signed-distance tới toàn bộ bề mặt cán chạm trổ. Không có vertex trong selection ⇒ **UNKNOWN**, không phải PASS.

#### H01, t=3,5 s — tay phải

| Ngón | Vertex proxy | Signed gap nhỏ nhất | Signed gap median | Vertex xuyên cylinder |
|---|---:|---:|---:|---:|
| Thumb | 0 | UNKNOWN | UNKNOWN | 0 |
| Index | 5 | 54.354 mm | 56.130 mm | 0 |
| Middle | 23 | 66.256 mm | 71.613 mm | 0 |
| Ring | 31 | 73.739 mm | 79.113 mm | 0 |
| Pinky | 24 | 67.790 mm | 72.130 mm | 0 |

#### H02, t=3,5 s — tay trái

| Ngón | Vertex proxy | Signed gap nhỏ nhất | Signed gap median | Vertex xuyên cylinder |
|---|---:|---:|---:|---:|
| Thumb | 0 | UNKNOWN | UNKNOWN | 0 |
| Index | 0 | UNKNOWN | UNKNOWN | 0 |
| Middle | 0 | UNKNOWN | UNKNOWN | 0 |
| Ring | 2 | 81.893 mm | 81.893 mm | 0 |
| Pinky | 25 | 50.388 mm | 61.875 mm | 0 |

Các vùng có dữ liệu đều cách cylinder hàng chục mm, lớn hơn ngưỡng contact5 mm. Riêng thumb/những selection rỗng vẫn chưa thể kết luận bằng phép đo này. Cần vùng palm/finger được duyệt + nearest-surface/cross-section thật trước khi tuyên bố ôm trượng/chùy.

## 8. Bind nguồn và bind đang render khác nhau đáng kể

| Mục | H01 | H02 |
|---|---:|---:|
| Joint đổi local translation >1µm | 30 | 32 |
| Joint đổi world bind rotation >0,01° | 32 | 32 |
| Chênh local translation lớn nhất | 47.168 mm | 67.076 mm |

H01 có 30 joint translation khác, chủ yếu ngón; H02 có32, gồm cả hand. Tên52 bone giống nhau không có nghĩa joint centres, chiều dài đoạn ngón và axes giống nhau. Ví dụ H02 LeftHandThumb2 có đoạn legacy0,038445 m, source0,078092 m; H01 RightHandRing2 legacy0,052364 m, source0,029126 m. Copy motion có thể giữ delta orientation mà vẫn không đưa ngón mesh tới điểm nắm đã giải trên một bàn tay có tỉ lệ khác.

### 8.1 Không kết tội sai công thức retarget khi chưa có chứng minh

Công thức ở builder:525–537 có thể viết:

```text
ΔW = Ws_bind · inv(Qs_bind_local) · Qs_pose_local · inv(Ws_bind)
Ql_pose_local = Ql_bind_local · inv(Wl_bind) · ΔW · Wl_bind
```

Vì `W_bind = W_parent_bind · Q_bind_local`, công thức rút gọn về dạng retarget world-delta đệ quy. Khi parent theo cùng ánh xạ, parent pose triệt tiêu trong phép biến đổi tương ứng. Vì vậy “không có biến parentPose trong code” **không đủ để kết luận công thức sai**.

Nhưng định nghĩa world-delta không bảo đảm vị trí end-effector trùng khi bind translations khác; cũng không sửa skin weights hay cloth topology. Limiter độc lập mỗi track sau phép đổi (`builder:539–550`) có thể làm final hand/foot lệch so với kết quả IK trước đó. Metrics `preRetargetFootFk` trong bản trước không phải certificate final render mesh.

### 8.2 Joint-angle diagnostic: zero không đồng nghĩa giải phẫu đúng

Audit vận chuyển **basis anatomical world của canonical** thụ động sang bind legacy: `Flegacy = inv(Wlegacy_bind) · Wsource_bind · Fsource`. Sau đó mới dùng `inspectJoint`, giữ nguyên limits/tolerance. Không áp trực tiếp `Fcanonical` lên quaternion legacy.

Cả hai có0/421 frame vi phạm trong **hệ correspondence này**. Kết quả cho biết quỹ đạo không vượt hộp góc đã được thiết kế trong hệ quy chiếu đang tái sử dụng; nó không hiệu chuẩn độc lập vị trí khớp, trục gấp ngón/đối ngón cái và bàn tay thật của mesh legacy. Gate anatomical legacy độc lập vẫn **UNKNOWN**; không ghi pass từ con số0 này. Phép đo skin toàn mesh đã FAIL rõ ràng, bất kể diagnostic joint-angle0.

## 9. So sánh trực tiếp góc ngón giữ với bảng Gemini

Góc dưới là flex trong hệ correspondence nói trên tại t=3 s. **Hai cột không cùng hệ trục/định nghĩa góc**: Euler Blender trong DOCX và flex anatomical trong correspondence legacy. Không trừ hai cột để tính sai số, không dùng chênh số đơn thuần kết luận pose sai. Builder không nhập chuỗi 30 hàng góc Gemini là một phát hiện độc lập từ code/provenance; bảng này chỉ ghi dữ liệu hiện hành để chẩn đoán. Việc chấp nhận cách retarget khác phải dựa vào bề mặt nắm thật và silhouette, hiện chưa đạt.

### H01

| Ngón | Gemini MCP/PIP/DIP | Hiện tại flex MCP/PIP/DIP |
|---|---|---|
| Thumb | 38 / 48 / 55 | 1.200 / 100.000 / 74.200 |
| Index | 65 / 82 / 50 | 8.719 / 72.114 / 76.268 |
| Middle | 70 / 85 / 52 | 17.834 / 90.700 / 41.766 |
| Ring | 72 / 86 / 54 | 7.144 / 89.198 / 58.959 |
| Pinky | 74 / 88 / 55 | -2.369 / 82.469 / 79.900 |

### H02

| Ngón | Gemini MCP/PIP/DIP | Hiện tại flex MCP/PIP/DIP |
|---|---|---|
| Thumb | 42 / 52 / 60 | 80.734 / 11.440 / 57.825 |
| Index | 68 / 85 / 55 | 35.500 / 34.500 / 80.000 |
| Middle | 74 / 88 / 58 | 38.125 / 31.875 / 80.000 |
| Ring | 76 / 89 / 58 | 35.422 / 34.578 / 80.000 |
| Pinky | 78 / 90 / 60 | 27.869 / 42.131 / 80.000 |

Các trường twist/lateral và toàn bộ52 joint tại mỗi keyframe nằm trong JSON. Không dịch sai “Thumb opposition42°” thành twist10° chỉ vì cùng đơn vị độ; phải có axis và palm basis được duyệt.

## 10. Pose lớn nào đã gần mô tả, pose nào chưa

H01 có Hips x cuối0,45 m, phù hợp hướng dịch phải trong hệ quy chiếu model. Góc đường **RightArm→RightHand** tại3 s là34,891593°, gần mục tiêu35°. Đây là hướng shoulder-to-wrist, không phải shoulder-to-palm, góc elbow hoặc Euler local riêng upperArm. Đừng gọi mọi biến số đó đều là35°.

Tư thế thấp t=1,3 s khác bảng mẫu về chiều cao hông và tay; việc giữ chiều dài xương thật là hợp lý nhưng chưa đủ để chấp nhận tư thế mới. Đặc biệt vùng tay phải H02 chưa có chứng cứ chống sàn như yêu cầu. H01 DOCX mới không yêu cầu bàn tay phải chạm sàn (wrist khoảng .4m, tail khoảng .26m); không áp tiêu chí chống sàn H02 sang H01.

| Landmark (Three XYZ, m) | H01 t1,3 | H02 t1,3 |
|---|---|---|
| Hips | `(0.0000, 0.4300, -0.0400)` | `(-0.0400, 0.4000, -0.0400)` |
| RightArm | `(-0.2728, 0.8676, 0.0927)` | `(-0.3088, 0.7922, -0.0384)` |
| RightForeArm | `(-0.2328, 0.6018, 0.0521)` | `(-0.3730, 0.5775, 0.1370)` |
| RightHand | `(-0.1600, 0.4400, 0.2000)` | `(-0.2538, 0.4291, 0.2188)` |
| LeftArm | `(0.0388, 0.9974, 0.0521)` | `(0.1289, 0.9826, -0.1873)` |
| LeftForeArm | `(0.1865, 0.7740, 0.0057)` | `(0.2466, 0.7845, -0.0203)` |
| LeftHand | `(0.2000, 0.6500, 0.2000)` | `(0.3535, 0.8001, 0.1565)` |
| RightLeg | `(-0.2262, 0.3990, 0.3263)` | `(-0.4161, 0.3906, 0.3452)` |
| RightFoot | `(-0.1800, 0.1200, 0.1200)` | `(-0.3401, 0.1200, 0.0602)` |
| LeftLeg | `(0.2303, 0.3821, 0.3465)` | `(0.3313, 0.3983, 0.3477)` |
| LeftFoot | `(0.1800, 0.1200, 0.1200)` | `(0.3400, 0.1200, 0.0601)` |

H01 Hips ở0,43 m so với bảng Gemini0,52 m; H02 ở0,40 m so với0,54 m. Đây là retarget đã thay đổi pose, không phải cùng toạ độ bảng. Một số toạ độ Gemini mâu thuẫn chiều dài thực, nên không kết luận mọi chênh là bug; phải duyệt pose có ràng buộc rõ. Phép đo hiện tại chỉ xác nhận chưa thể tuyên bố giống đầy đủ.

## 11. Tốc độ, jerk và “mượt 60/120 Hz”

| Chỉ số đo từ successive local quaternion, 60 Hz | H01 | H02 |
|---|---:|---:|
| Body max °/frame | 8.000 | 6.492 |
| Finger max °/frame | 16.000 | 10.944 |
| Body max °/s | 479.997 | 389.497 |
| Finger max °/s | 960.001 | 656.619 |
| Body max thay đổi scalar angular-speed °/s² | 19553.622 | 16718.078 |
| Finger max thay đổi scalar angular-speed °/s² | 54172.381 | 10939.754 |

Limiter 8°/frame tương đương480°/s tại60 Hz;16°/frame tương đương960°/s. Nó là trần, không phải bảo đảm chuyển động tự nhiên. Gia tốc trong bảng là sai phân của **độ lớn tốc độ góc**, không phải vector angular acceleration đầy đủ hoặc đo jerk. Chưa có ngưỡng gia tốc đã được người dùng duyệt để gắn nhãn pass/fail; số đo cho thấy vì sao pass trần bước góc vẫn có thể giật cảm giác.

Test sample60/120 Hz chỉ kiểm thời gian phát không phụ thuộc bước update; không chứng minh runtime render60FPS, không kiểm arc/weight/contact/cloth.

## 12. Normal và co thể tích cục bộ: chỉ số phụ, không phải volume certificate

| Proxy affine skin so với bind | H01 min | H02 min |
|---|---:|---:|
| det(Apose)/det(Abind) | 0.114225 | 0.213645 |
| |Apose·n| / |Abind·n| trước normalise | 0.477390 | 0.512207 |

Không có negative determinant vertex trong các worst records và không có normal-length ratio dưới0,1 ở hai mốc xấu nhất. Không có nghĩa mesh không fold/tự xuyên. Determinant của blended affine tại vertex chỉ là proxy về co ma trận; nó không phải thể tích kín của áo/cơ thể hoặc Jacobian liên tục toàn mặt. Normal-length ratio cho thấy blend rotations làm suy giảm normal vector trước normalize, có thể đi cùng thay đổi shading; không suy ra lỗi texture từ đó.

## 13. Nguyên nhân được chứng minh và mức chắc chắn

1. **Đã chứng minh — topology có cạnh nhận skin từ nhóm khớp chuyển động khác xa nhau.** Worst edges và weights ở mục4.1; toàn374 frame visible đều trượt gate.
2. **Đã chứng minh — dữ liệu solve canonical được chuyển sang donor có bind khác.** 30/32 translations khác; source palm anchor và legacy socket khác3,43/6,92 cm.
3. **Đã chứng minh — trạng thái cầm H02 đi trước contact point.** Tại1,6 s còn45,06 cm, chỉ về0 tại2,4167 s.
4. **Đã chứng minh — kiểm điểm/clip trước đây không đủ.** Proxy point0 và quaternion bounds có thể pass đồng thời mesh strain/hand surface fail.
5. **Giả thuyết cần kiểm duyệt mesh — chia miền/cắt nối áo, sửa weights hoặc cloth influence là khâu bắt buộc.** Không được chữa bằng cách kéo xương, giấu bề mặt xuyên sàn hoặc thay threshold.
6. **Không kết luận — bản thân công thức retarget rotation chắc chắn sai.** Đại số có cơ sở đúng; lỗi endpoint/skin không tự chứng minh lỗi quaternion mapping.

## 14. Các mục vẫn UNKNOWN, không được đổi thành PASS

- Joint frame anatomical độc lập trên toàn legacy, đặc biệt thumb opposition và cổ tay.
- True palm/fingertip surface contact bằng nhãn source được duyệt; proxy cylinder không đủ.
- True sole/boot contact có source-ID proof; low band không thay được mask boot.
- Self-intersection, normal/tangent continuity từng đường cắt, shear/compression theo hướng sợi, closed volume/cross-section.
- Độ khớp tất cả landmark của hai DOCX sau quyết định retarget các bảng không khả thi.
- Hoạt ảnh combat dùng đường legacy khác preview; audit này không gắn nhãn đã sửa Run/Attack/Cast/Dash.
- Android vật lý, FPS/RAM, input/touch, frame pacing.

## 15. Bằng chứng và tái hiện

- [Dữ liệu đầy đủ](motion-metrics.json): hash donor/motion,421 frame/hero, keyframe joint positions/angles, all edge/floor aggregates, control, worst edgeweights, Three crosscheck.
- [Script và lệnh tái hiện](reproduce/README.md). Chỉ tài liệu/chương trình đo đọc input; không import hay chạy bước bake/khắc phục.
- Input hashes:

**H01**
- Donor `public/models/h01-c0/h01-c0-high.glb`: `ffa5f3b43fd7047104ddb14cca4b1c45539035d33e8c485934d0a6f4c8031e5c`.
- Motion `public/animations/report-entrances/H01.bin`: `bfa58f56e1785281186b6c8ad91335cdb50448b8b6c3cd29cb6ba605bc416c8b`.

**H02**
- Donor `public/models/h02-body/h02-body-high.glb`: `6ba32bc115ac5978eb55b9830828998aa942f5f5e7a4e5f4b2b89546b19b88e5`.
- Motion `public/animations/report-entrances/H02.bin`: `9b19150cc36d16c5c039d46a19c0b119fb3a7929f2c9400138943120d302b7f1`.

## 16. Đề xuất để người dùng duyệt — chưa thực thi

Đề nghị duyệt sửa theo thứ tự: (1) thống nhất rig/bind/đơn vị/anchor thực trên donor sẽ render; (2) giải quyết ranh giới skin gây cạnh kéo hàng chục lần, giữ nguyên nguồn và bảo toàn texture; (3) giải lại pose thấp/feet + bàn tay trên actual surface, không kéo bone để khớp bảng bất khả thi; (4) đồng bộ event grip với contact thật, xây trajectory có vận tốc/gia tốc liên tục; (5) kiểm toàn frame trên mesh cuối, bốn hướng và các clip combat; (6) chỉ sau nghiệm thu rig+animation và APK đã được duyệt mới làm tay áo H01 theo thứ tự người dùng. Nếu bước(2) đòi tác động tay áo để tách miền skin, phải nêu rõ phụ thuộc và xin duyệt cụ thể, không tự làm dưới tên “animation”.

**Hiện tại: CHỜ DUYỆT. Không có fix nào được triển khai trong đợt audit này.**
