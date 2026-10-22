# Số đo staging và kết quả kiểm

Đo bằng Node/Three và LBS độc lập trên cloud, không phải FPS hoặc nghiệm thu điện thoại. Mỗi dòng là một pose trên toàn bộ source mesh; cả hai pose dùng cùng hash trước/sau tương ứng. Ngưỡng giữ nguyên: p99,9 ≤ 1,5× và max ≤ 2,0×. Không dùng số liệu này thay kiểm toàn chuỗi.

**Chưa có mẫu được nghiệm thu toàn chuỗi.** Các dòng CP geodesic đầu là lịch sử chưa có weight helper; CP650 và các vòng wrist mới đã kết hợp helper thật và ủng source. Không so khác pose/field như cùng một bản đã sửa APK. Chưa kiểm chấp nhận compression/normal, giao cắt, foot slide hoặc bề mặt nắm cán trong toàn chuỗi. Chi tiết vòng tiếp: [BOOT-WRIST.md](BOOT-WRIST.md).

| Hero / mẫu | Pose | p99,9 | Max | Min cạnh | Min diện tích | Min Y (m) | Đạt skin của pose |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| H01 / [Trước fit hai pose](H01-geodesic-before-two-poses-surface.json) | crouch mở tay | 2.917123 | 14.363502 | 0.010033 | 0.00109889 | -0.009429 | Không |
| H01 / [Trước fit hai pose](H01-geodesic-before-two-poses-surface.json) | crouch + stress nắm | 2.945188 | 14.363502 | 0.010033 | 0.00109889 | -0.009429 | Không |
| H01 / [Sau fit hai pose](H01-geodesic-cp-v1-surface.json) | crouch mở tay | 1.995839 | 3.797302 | 0.0100333 | 0.00109889 | -0.009429 | Không |
| H01 / [Sau fit hai pose](H01-geodesic-cp-v1-surface.json) | crouch + stress nắm | 1.999075 | 5.511917 | 0.0100333 | 0.00109889 | -0.009429 | Không |
| H02 / [Trước fit hai pose](H02-geodesic-before-two-poses-surface.json) | crouch mở tay | 2.450805 | 11.682752 | 0.0114435 | 0.000646412 | -0.037032 | Không |
| H02 / [Trước fit hai pose](H02-geodesic-before-two-poses-surface.json) | crouch + stress nắm | 2.634225 | 20.571561 | 0.0114435 | 0.000646412 | -0.037032 | Không |
| H02 / [Sau fit hai pose](H02-geodesic-cp-v3-surface.json) | crouch mở tay | 1.570259 | 1.957058 | 0.0114477 | 0.000648784 | -0.037032 | Không |
| H02 / [Sau fit hai pose](H02-geodesic-cp-v3-surface.json) | crouch + stress nắm | 1.570314 | 1.957058 | 0.0114477 | 0.000648784 | -0.037032 | Không |
| H01 / [Field helper riêng, chưa fit](H01-pronation-field-v1-surface.json) | crouch mở tay | 2.926611 | 14.363502 | 0.0138383 | 0.00109889 | -0.009429 | Không |
| H01 / [Field helper riêng, chưa fit](H01-pronation-field-v1-surface.json) | crouch + stress nắm | 2.956791 | 14.363502 | 0.0138383 | 0.00109889 | -0.009429 | Không |
| H02 / [Field helper riêng, chưa fit](H02-pronation-field-v1-surface.json) | crouch mở tay | 2.460154 | 6.653494 | 0.00204478 | 0.000413299 | -0.037032 | Không |
| H02 / [Field helper riêng, chưa fit](H02-pronation-field-v1-surface.json) | crouch + stress nắm | 2.613848 | 15.135565 | 0.00204478 | 0.000413299 | -0.037032 | Không |
| H01 / [Ủng source trước/sau fit sàn](H01-boot-field-v1-surface.json) | crouch mở tay | 2.926611 | 14.363502 | 0.0138383 | 0.00109889 | -0.006089 | Không |
| H01 / [Ủng source trước/sau fit sàn](H01-boot-field-v1-surface.json) | crouch fit sàn | 2.980818 | 14.329550 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Helper + ủng, CP650](H01-floor-cp-v1-surface.json) | crouch fit sàn | 1.525574 | 2.991274 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Helper + ủng, CP650](H01-floor-cp-v1-surface.json) | crouch + stress nắm | 1.533154 | 3.894131 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay hardcrop — bị loại](H01-wrist-v2-surface.json) | crouch fit sàn | 1.536578 | 46.491522 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay hardcrop — bị loại](H01-wrist-v2-surface.json) | crouch + stress nắm | 1.592722 | 46.491522 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay C1 trước CP](H01-wrist-v3-surface.json) | crouch fit sàn | 1.529494 | 2.991226 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay C1 trước CP](H01-wrist-v3-surface.json) | crouch + stress nắm | 1.547030 | 3.894131 | 0.0112991 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay C1 sau CP600](H01-wrist-cp-v1-surface.json) | crouch fit sàn | 1.489521 | 2.561535 | 0.0112992 | 0.000781812 | -0.000000 | Không |
| H01 / [Lòng bàn tay C1 sau CP600](H01-wrist-cp-v1-surface.json) | crouch + stress nắm | 1.489838 | 3.019788 | 0.0112992 | 0.000781812 | -0.000000 | Không |
| H02 / [Ủng source trước/sau fit sàn](H02-boot-field-v1-surface.json) | crouch mở tay | 2.460154 | 6.653494 | 0.00204478 | 0.000413299 | -0.031114 | Không |
| H02 / [Ủng source trước/sau fit sàn](H02-boot-field-v1-surface.json) | crouch fit sàn | 2.459595 | 6.653494 | 0.00209254 | 0.000473249 | -0.000000 | Không |
| H02 / [Helper + ủng, CP650](H02-floor-cp-v1-surface.json) | crouch fit sàn | 1.549208 | 3.939347 | 0.00209249 | 0.000472997 | -0.000000 | Không |
| H02 / [Helper + ủng, CP650](H02-floor-cp-v1-surface.json) | crouch + stress nắm | 1.548834 | 4.677207 | 0.00209249 | 0.000472997 | -0.000000 | Không |
| H02 / [Lòng bàn tay hardcrop — bị loại](H02-wrist-v2-surface.json) | crouch fit sàn | 1.564241 | 17.865206 | 0.00209249 | 0.000472997 | -0.000000 | Không |
| H02 / [Lòng bàn tay hardcrop — bị loại](H02-wrist-v2-surface.json) | crouch + stress nắm | 1.583219 | 17.865206 | 0.00209249 | 0.000472997 | -0.000000 | Không |
| H02 / [Lòng bàn tay C1 trước CP](H02-wrist-v3-surface.json) | crouch fit sàn | 1.559496 | 4.033781 | 0.00209249 | 0.000472997 | -0.000000 | Không |
| H02 / [Lòng bàn tay C1 trước CP](H02-wrist-v3-surface.json) | crouch + stress nắm | 1.577121 | 3.442238 | 0.00209249 | 0.000297751 | -0.000000 | Không |
| H02 / [Lòng bàn tay C1 sau CP600](H02-wrist-cp-v1-surface.json) | crouch fit sàn | 1.496926 | 3.241141 | 0.00209244 | 0.000472745 | -0.000000 | Không |
| H02 / [Lòng bàn tay C1 sau CP600](H02-wrist-cp-v1-surface.json) | crouch + stress nắm | 1.496135 | 3.241141 | 0.00209244 | 0.000297735 | -0.000000 | Không |

Min cạnh/diện tích rất nhỏ là tín hiệu nén/fold cần kiểm tiếp; qua ngưỡng giãn không chứng minh hình dáng tự nhiên. Min Y thuộc toàn mesh, chưa được phân loại là ủng, tay hay áo. Không gọi đây là số đo chân khi chưa có mask giải phẫu được kiểm.

## Runtime đang dùng

Các asset mới không được đăng ký vào runtime. Trên đúng body legacy hiện hành, phép đo Entrance/Hold mới vẫn thấy mọi mẫu nhìn thấy đều trượt:
- H01: max 109.274336×; p99,9 lớn nhất 16.858895×; 60Hz: 374/374 mẫu hiển thị trượt, 120Hz: 748/748 mẫu hiển thị trượt.
- H02: max 53.147904×; p99,9 lớn nhất 20.628306×; 60Hz: 374/374 mẫu hiển thị trượt, 120Hz: 748/748 mẫu hiển thị trượt.

Không so trực tiếp các số runtime này với staging để khẳng định đã sửa APK: LOD, weight và chuyển động khác nhau.

## Lệnh kiểm gần nhất

Source fingerprint: `ffb81035e4a602583558292724a70afc9af37340abe1c786477342267a2ad843`. Mã nguồn giữ ổn định trong vòng kiểm: `True`. Log đầy đủ: [2026-10-21T20-25-41-341Z](iterations/2026-10-21T20-25-41-341Z/goal.json).

| Kiểm | Kết quả |
| --- | --- |
| npm test | ℹ tests 336 / ℹ pass 336 / ℹ fail 0 |
| npm run test:master | ℹ tests 215 / ℹ pass 215 / ℹ fail 0 |
| npm run verify:master | Master Prompt: 0/37; NOT100% |
| npm run goal:rig | RIG/APK GOAL BLOCKED — do not claim 100% |
| npm run goal:animation | INCOMPLETE; xem goal-latest.json, không tính trung bình phần trăm |
| npm run build | Chưa chạy lại trong vòng ủng/cổ tay; lần trước đã qua nhưng không chứng nhận build có fingerprint hiện tại |
| npm run android:apk | Chưa chạy trong vòng này: điều kiện rig/skin trước APK chưa đạt |

Các lần thử CLARABEL và bone heat thất bại được giữ trong `logs/` và biên nhận. Infeasible của một patch SOCP có boundary cố định không chứng minh toàn bộ rig không thể sửa. Các phép thử không được dùng để đổi giới hạn kiểm.
