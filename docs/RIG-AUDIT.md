# H01/H02 — audit trước khi dựng lại animation

Đo lúc 2026-10-18T04:32:00.705Z; nguồn c5d0e5ac107f6be8e5c23cc85f204a31e6f2eac1; Blender 4.3.2. Chạy lại: `node tools/rig-audit.mjs`. Đây là audit cấu trúc offline trên cloud, không phải kiểm chứng Android hoặc chứng nhận pose.

## Kết luận và điểm dừng A5

Lỗi E1 được xác nhận trực tiếp: sảnh che mesh có skin sau entrance và bật bản source tĩnh. Hai bản source có 0 skin, 0 joint và 0 clip; chúng không thể mang pose/khép ngón bằng AnimationMixer. Đây là hậu quả của giải pháp đưa GLB nguyên gốc vào sảnh ở commit 55737be. Cần gắn rig và trọng số lên mesh nguyên gốc, giữ UV/texture 4096 và toàn bộ tam giác, thay vì chuyển sang mesh tĩnh sau entrance. Chưa sửa runtime hoặc asset.

[Prompt mục A5](requests/H01-H02-ENTRANCE-PROMPT-2.md) yêu cầu dừng khi cần quyết định lớn như rig lại; mục B2-V4 cũng yêu cầu dừng khi thiếu xương ngón. Vì bản source chưa có skeleton và bản rig H02 có 8 xương ngón không tác động đỉnh nào, audit dừng tại đây để người dùng duyệt phương án gắn rig/weight cho mesh full-resolution. Chưa đi qua giai đoạn B/C hoặc tự công nhận khung lòng bàn tay.

## Mesh thật đang được dùng

| Asset | Tam giác | Skin | Joint | Xương ngón /30 | Xương ngón có weight | Clip |
|---|---:|---:|---:|---:|---:|---:|
| H01 source | 1,499,726 | 0 | 0 | 0 | 0 | 0 |
| H02 source | 1,499,746 | 0 | 0 | 0 | 0 | 0 |
| H01 rigged-high | 60,000 | 1 | 52 | 30 | 30 | 6 |
| H02 rigged-high | 30,000 | 1 | 52 | 30 | 22 | 6 |

SHA-256, toàn bộ joint/phân cấp/TRS bind, track, key count và vertex counts nằm trong [baseline.json](rig-audit/baseline.json). Không ghi đè GLB nguồn.

## Rig/weights

| Rig | Scale không đều/âm | IBM so inverse(world) | Residual bind-shape chung | Lỗi tổng weight / đỉnh skin | Sai số weight lớn nhất | Đỉnh tay lẫn nhãn joint trái/phải | Cặp quaternion dot<0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| H01 | 0 | 9.0991e-1 | 3.8712e-7 | 0/45257 | 2.2204e-16 | 0 | 6 |
| H02 | 0 | 1.1079e+0 | 4.5642e-7 | 0/31814 | 2.2204e-16 | 0 | 8 |

IBM không bằng inverse(bind world) thuần vì dữ liệu chứa biến đổi bind-shape chung. Residual cột kế kiểm tra jointWorld × IBM có cùng ma trận giữa mọi joint; chỉ riêng sai số inverse(world) lớn không đủ kết luận skin hỏng. Chưa sửa IBM. Cột lẫn trái/phải chỉ đếm weight có nhãn joint đối diện với joint chủ đạo, chưa kiểm chứng joint đó đúng bên không gian của mesh. Trọng số kiểm tra trực tiếp bộ WEIGHTS_0/JOINTS_0; danh sách JOINTS_1 và sai lệch chiều dài xương hai bên nằm trong JSON. Heuristic khoảng cách >2,5 lần bán kính trung bình được ghi cho từng xương, chưa coi là bằng chứng phải sửa skin.

- H01: mọi xương ngón đều có đỉnh được gán trọng số.
- H02: LeftHandThumb3, LeftHandIndex2, LeftHandIndex3, LeftHandMiddle3, RightHandThumb3, RightHandIndex2, RightHandIndex3, RightHandMiddle3

Sự hiện diện xương không chứng minh hình học từng ngón tách rời hoặc trục gập đúng. Các mục đó cần ảnh ba góc và thử mở–nắm ở giai đoạn B sau khi duyệt rig.

## Track sau sanitize (kiểm tra cấu trúc PropertyBinding)

| Rig | Clip | Track | Không gắn | Joint thiếu track | Scale track | Translation ngoài Hips/Root | dot<0 |
|---|---|---:|---:|---:|---:|---:|---:|
| H01 | Attack | 156 | 0 | 0 | 52 | 51 | 0 |
| H01 | Cast | 156 | 0 | 0 | 52 | 51 | 0 |
| H01 | Dash | 156 | 0 | 0 | 52 | 51 | 2 |
| H01 | Entrance | 156 | 0 | 0 | 52 | 51 | 0 |
| H01 | Idle | 156 | 0 | 0 | 52 | 51 | 0 |
| H01 | Run | 156 | 0 | 0 | 52 | 51 | 4 |
| H02 | Attack | 156 | 0 | 0 | 52 | 51 | 0 |
| H02 | Cast | 156 | 0 | 0 | 52 | 51 | 0 |
| H02 | Dash | 156 | 0 | 0 | 52 | 51 | 2 |
| H02 | Entrance | 156 | 0 | 0 | 52 | 51 | 2 |
| H02 | Idle | 156 | 0 | 0 | 52 | 51 | 0 |
| H02 | Run | 156 | 0 | 0 | 52 | 51 | 4 |

Các track rotation của glTF là quaternion; tên được sanitize bằng Three.js PropertyBinding rồi bind vào cấu trúc Object3D tái tạo. Đây là phép kiểm tra binding tĩnh, chưa phải capture trạng thái mixer thật. Với source tĩnh không có track, số 0 không phải kết quả pass animation.

## Bằng chứng code và giả thuyết

- Xác nhận: chuyển sang body source tĩnh sau entrance gây A-pose; vũ khí source đi theo driver rig ẩn nên không còn tiếp xúc bàn tay của body đang thấy.
- Xác nhận: khung tay ở h01-ik.js được tạo từ vector hằng; chưa suy ra pháp tuyến lòng bàn tay từ hình học như prompt mới. Không công nhận nắm đúng lòng bàn tay.
- Bác bỏ trong phạm vi track tĩnh: sanitize không gây track unbound trên hai rig đã kiểm tra. Không thấy lời gọi skeleton.pose() trong các module đã quét.
- stopAllAction/uncacheRoot có trong đường phát lại/teardown; chưa đủ bằng chứng chúng gây triệu chứng E1 đang thấy.
- H02 vẫn mặc định điều khiển tay phải qua poseRightHand, trái với prompt mới gripHand=left.
- Nhãn thử nghiệm xuất trực tiếp từ UI sảnh; chưa được giới hạn ở debug.
- E2–E7/E9 chưa có số đo động để kết luận mức vi phạm; không nhận là đã sửa.

- [src/manual-hero.js:27](../src/manual-hero.js#L27) — `function syncTencentPreview(state){if(!state.sourceReady||!state.preview)return;state.body.visible=false;state.sourceBody.visible=true;state.staff.visible=false;state.root.updateWorldMatrix(true,true);state.staff.updateW`
- [src/manual-hero.js:31](../src/manual-hero.js#L31) — `const sourceBody=cloneTencentSource(bodyGltf,'H01_Tencent_Original_Body');sourceBody.rotation.y=Math.PI;sourceBody.visible=false;`
- [src/manual-hero.js:88](../src/manual-hero.js#L88) — `if(root.userData.manualAsset.disposed){mixer.stopAllAction();state.vfx&&disposeH01EntranceVfx(state.vfx);return;}`
- [src/manual-hero.js:116](../src/manual-hero.js#L116) — `s.body.attach(s.staff);s.staff.position.set(-.38,1.45,.12);s.staff.quaternion.identity();s.current=null;s.mixer.stopAllAction();`
- [src/manual-hero.js:124](../src/manual-hero.js#L124) — `if(state.current!=='Entrance'){state.mixer.stopAllAction();state.actions.Entrance.reset().play();state.current='Entrance';}`
- [src/manual-hero.js:136](../src/manual-hero.js#L136) — `poseRightHand(state.ik,target,false);`
- [src/manual-hero.js:140](../src/manual-hero.js#L140) — `poseRightHand(state.ik,target);`
- [src/manual-hero.js:175](../src/manual-hero.js#L175) — `poseRightHand(s.ik,grip);`
- [src/manual-hero.js:178](../src/manual-hero.js#L178) — `syncTencentPreview(s);`
- [src/manual-hero.js:186](../src/manual-hero.js#L186) — `if(s){s.mixer.stopAllAction();s.mixer.uncacheRoot(s.body);if(s.vfx)disposeH01EntranceVfx(s.vfx);states.delete(root);}`
- [src/manual-h02.js:15](../src/manual-h02.js#L15) — `function syncTencentPreview(s){if(!s.preview||!s.sourceReady)return;s.body.traverse(node=>{if(node.isSkinnedMesh)node.visible=false;});s.sourceBody.position.copy(s.body.position);s.sourceBody.rotation.copy(s.body.rotatio`
- [src/manual-h02.js:19](../src/manual-h02.js#L19) — `const sourceBody=cloneTencentSource(bodyGltf,'H02_Tencent_Original_Body');sourceBody.visible=false;`
- [src/manual-h02.js:65](../src/manual-h02.js#L65) — `if(root.userData.manualAsset.disposed){mixer.stopAllAction();s.vfx&&disposeH02EntranceVfx(s.vfx);return;}`
- [src/manual-h02.js:74](../src/manual-h02.js#L74) — `if(s.current!=='Entrance'){s.mixer.stopAllAction();s.actions.Entrance.reset().play();s.current='Entrance';}`
- [src/manual-h02.js:81](../src/manual-h02.js#L81) — `if(f.landed){const p=s.v[6].set(-.27,.48,.08).lerp(s.v[7].set(0,.75,.38),f.pickup);poseRightHand(s.ik,p,f.pickup>.8);}`
- [src/manual-h02.js:84](../src/manual-h02.js#L84) — `poseRightHand(s.ik,p,true);`
- [src/manual-h02.js:100](../src/manual-h02.js#L100) — `s.body.userData.rightElbowPole[1]=1.05;s.body.userData.rightElbowPole[2]=-.12;poseRightHand(s.ik,p,true);poseLeftHip(s,0);s.hammer.position.set(0,0,0);orientHammer(s);syncTencentPreview(s);root.userData.manualAsset.anima`
- [src/manual-h02.js:102](../src/manual-h02.js#L102) — `export function replayManualH02(root){const s=states.get(root);if(!s?.preview)return;delete s.forcedTime;s.introStart=performance.now();s.gripped=s.impact=s.stamp=false;s.sourceDisplayed=false;if(s.sourceBody)s.sourceBod`
- [src/manual-h02.js:105](../src/manual-h02.js#L105) — `root.userData.manualAsset.disposed=true;const s=states.get(root);if(s){s.mixer.stopAllAction();s.mixer.uncacheRoot(s.body);s.vfx&&disposeH02EntranceVfx(s.vfx);states.delete(root);}`
- [src/h01-ik.js:51](../src/h01-ik.js#L51) — `const leftFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,-1,0)));`
- [src/h01-ik.js:52](../src/h01-ik.js#L52) — `const handFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(`
- [src/h01-ik.js:58](../src/h01-ik.js#L58) — `export function poseRightHand(rig,palmTarget,closedGrip=true){`
- [src/world.js:467](../src/world.js#L467) — `this.previewHero=${hubHero}:${appearance.skin??0}:${appearance.costume??0}:${appearance.rings?.some(id=>[6,8,9,12].includes(id))?'black':'purple'};`
- [src/world.js:487](../src/world.js#L487) — `this.previewHero = ${hubHero}:${appearance.skin ?? 0}:${appearance.costume ?? 0}:${appearance.rings?.some((id) => [6, 8, 9, 12].includes(id)) ? "black" : "purple"};`
- [src/main.js:289](../src/main.js#L289) — `<div class="stage-label"><p>${WEAPONS[loadout.hero].toUpperCase()}</p><small>${[0,1].includes(loadout.hero) && (loadout.costume ?? 0) === 0 ? "HUNYUAN · RIG / HOẠT ẢNH THỬ NGHIỆM" : "MÔ HÌNH 3D"} · ${loadout.skin === 2 ?`

## Phần chưa hoàn thành do điểm dừng

A3 mixer/pose runtime, A4 sai số tiếp xúc mỗi frame, symmetry nearest-vertex, mesh strain, chuẩn rig A6–A9, B hand frames và ảnh V4, C–F cùng test:anim chưa thực hiện. Hai ảnh mannequin được người dùng gửi trong chat: H02 chống tay phải/cầm búa tay trái; H01 chống tay phải rồi nắm trượng tay phải; hướng trái/phải theo nhân vật. Chưa có bản PNG đính kèm ở filesystem để chép vào docs/anim-ref; không tạo ảnh tham chiếu giả.

Kết quả kiểm tra riêng nằm trong [validation.json](rig-audit/validation.json): npm test pass 129/129; verify:master bị chặn 0/37 và giữ nguyên các ngưỡng.

Chưa build APK mới vì audit không sửa runtime; APK hiện có vẫn là bản trước, chưa chứa sửa animation theo prompt này. Chưa kiểm chứng trên thiết bị.
