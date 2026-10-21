# Số đo staging và kết quả kiểm

Đo bằng Node/Three và LBS độc lập trên cloud, không phải FPS hoặc nghiệm thu điện thoại. Mỗi dòng là một pose trên toàn bộ source mesh; cả hai pose dùng cùng hash trước/sau tương ứng. Ngưỡng giữ nguyên: p99,9 ≤ 1,5× và max ≤ 2,0×. Không dùng số liệu này thay kiểm toàn chuỗi.

**Mọi mẫu ở bảng vẫn chưa đạt.** Mẫu CP tốt nhất chưa tích hợp field helper mới; field helper được đo riêng, chưa tối ưu và chưa qua nghiệm thu. Chưa kiểm chấp nhận compression/normal, giao cắt, foot slide hoặc bề mặt nắm cán trong toàn chuỗi.

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

Min cạnh/diện tích rất nhỏ là tín hiệu nén/fold cần kiểm tiếp; qua ngưỡng giãn không chứng minh hình dáng tự nhiên. Min Y thuộc toàn mesh, chưa được phân loại là ủng, tay hay áo. Không gọi đây là số đo chân khi chưa có mask giải phẫu được kiểm.

## Runtime đang dùng

Các asset mới không được đăng ký vào runtime. Trên đúng body legacy hiện hành, phép đo Entrance/Hold mới vẫn thấy mọi mẫu nhìn thấy đều trượt:
- H01: max 109.274336×; p99,9 lớn nhất 16.858895×; 60Hz: 374/374 mẫu hiển thị trượt, 120Hz: 748/748 mẫu hiển thị trượt.
- H02: max 53.147904×; p99,9 lớn nhất 20.628306×; 60Hz: 374/374 mẫu hiển thị trượt, 120Hz: 748/748 mẫu hiển thị trượt.

Không so trực tiếp các số runtime này với staging để khẳng định đã sửa APK: LOD, weight và chuyển động khác nhau.

## Lệnh kiểm gần nhất

Source fingerprint: `9dd13e3b44ec90639cdde4ca335a196b57af4ab96abcefb26e8edcc9e698a638`. Mã nguồn giữ ổn định trong vòng kiểm: `True`. Log đầy đủ: [2026-10-21T15-56-49-524Z](iterations/2026-10-21T15-56-49-524Z/goal.json).

| Kiểm | Kết quả |
| --- | --- |
| npm test | ℹ tests 333 / ℹ pass 333 / ℹ fail 0 |
| npm run test:master | ℹ tests 215 / ℹ pass 215 / ℹ fail 0 |
| npm run verify:master | Master Prompt: 0/37; NOT100% |
| npm run goal:rig | RIG/APK GOAL BLOCKED — do not claim 100% |
| npm run goal:animation | INCOMPLETE; xem goal-latest.json, không tính trung bình phần trăm |
| npm run build | Đã chạy thành công; kiểm web production, chưa phát hành APK mới |
| npm run android:apk | Chưa chạy trong vòng này: điều kiện rig/skin trước APK chưa đạt |

Các lần thử CLARABEL và bone heat thất bại được giữ trong `logs/` và biên nhận. Infeasible của một patch SOCP có boundary cố định không chứng minh toàn bộ rig không thể sửa. Các phép thử không được dùng để đổi giới hạn kiểm.
