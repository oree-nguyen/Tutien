# Các quyết định trong phạm vi mục 13 đã duyệt

Không cần xin lại các quyết định triển khai thông thường. Các lựa chọn bên dưới giữ ý tưởng động tác và source thật; chưa phải tuyên bố mọi lựa chọn đã qua kiểm nghiệm thu.

| Vấn đề | Quyết định và phép kiểm bắt buộc |
| --- | --- |
| Hệ tọa độ | Dùng Three `(x,z,-y)` từ Blender; phải/trái là giải phẫu. Đo trong không gian model trước scale/yaw sảnh. |
| H01 tay phải K2 | Theo DOCX mới: wrist cao .40 m, bàn tay thấp giữa hai chân; không trộn động tác chống sàn của H02 vào đây. |
| H02 handedness | Chọn Mode B, tay trái cầm chùy liên tục; tay phải chống đất. Phải áp cả sảnh và combat trước khi nghiệm thu. |
| Bảng khớp tự mâu thuẫn | Giữ chiều dài bộ bind đã chọn, không stretch bone để khớp từng head/tail. Rig nguồn không có bone, vì vậy các chiều dài bind thử là dữ liệu rig dẫn xuất, không phải bone native Tencent. |
| Vai/cổ tay trong A-pose | A-pose không phải neutral giải phẫu. Đo neutral basis và rest flex riêng; kiểm vẫn dùng nguyên giới hạn khớp cũ. |
| Xoay lòng bàn tay | Có helper cẳng tay riêng, không cho khuỷu hoặc cổ tay xoay vượt giới hạn để bù DOF thiếu. Phải phân bố weight xoay trên source cẳng tay và kiểm lại skin. |
| H01 gối trái .62 / cổ chân .09 | Chênh cao .53 m vượt đoạn cẳng chân .42 m của bind thử, chưa tính khoảng lệch ngang. Dùng chân trước/chân sau bất đối xứng có chiều dài thật; giữ sai khác số học được công bố, không gọi là khớp literal cả hai điểm. |
| H02 vai .98 / wrist .18 | Chênh cao .80 m vượt hai đoạn .295+.270=.565 m trong bind thử. Không ép đồng thời các điểm bằng kéo xương. Thử hạ vai bằng tư thế thân có đối trọng; đo góc thân thực và silhouette, không coi tổng Euler là góc thân. |
| H02 torso v12 | Pelvis 25° và spine 25/25/15°, tổng quay chuỗi 90°, hướng Hips→Spine2 khoảng 51,13°. Con số yêu cầu danh nghĩa 60° trong lần thử cũ không phải góc đo. Receipt được giữ làm lịch sử; đây không phải pose đạt DOCX 26°. |
| H02 torso v13 | Pelvis flex 25°, lateral 20° và spine 20/15/15°; đo lại FK/skin. Đây là thử contact có đối trọng để tránh hạ đầu quá sâu, chưa duyệt silhouette hoặc bàn tay che mặt. |
| Bán kính cán chùy | Dùng bề mặt mesh nguồn và scale đều theo chiều dài 1,75 m; không lấy bán kính .022 m trong văn bản làm bằng chứng source mesh thật có bán kính đó. Không scale từng trục/frame để ép các bảng mâu thuẫn. |
| Mốc nắm | Điểm palm/shaft giúp tìm IK, nhưng không được dùng làm bằng chứng ngón đã bao cán. Cần khoảng cách/penetration của từng vùng bề mặt thật, giữ cả ngưỡng contact 5 mm và penetration 3 mm hiện hành. |
| Gõ cán và hold | Nhịp gõ phải có tiếp xúc thật rồi trở lại hold. Không tuyên bố cán vừa cách sàn .115 m vừa chạm sàn, hoặc tự nhận 2,8 s là keyframe nguyên văn Gemini. |
| Seed ngón | Seed ID và trường geodesic là đề xuất có thể kiểm. Kiểm đường đi trên triangle nguồn không tìm thấy mâu thuẫn endpoint vượt max2 trong hai pose stress đã đo; điều này không chứng minh anatomy/contact hoặc toàn bộ rig đạt. |
| Biên nhận solver | Converged/weightsValid chỉ chứng nhận phạm vi số học đã ghi. Không activation bằng cách đổi boolean; phải đo lại đúng GLB được đóng gói bằng validator độc lập. |
| Giữ nét | Không thay position/normal/UV/index/image nguồn trong các bước weight; exporter kiểm hash payload sau khi đọc lại GLB. Không hạ texture hoặc chất lượng render. |
| Thứ tự tay áo | Chỉ xử lý riêng tay áo H01 sau APK rig/animation đã đạt. Weight nền và tách cơ học cần cho nền rig được phân biệt với đợt chỉnh tay áo cuối. |
| Android thật | Giữ BLOCKED khi chưa có thiết bị/trace; không dùng SwiftShader hay APK tồn tại để chứng nhận FPS, cảm ứng hoặc hoạt ảnh trên điện thoại. |

## Đỉnh thấp nhất của source đang thử

[Phép đo trực tiếp](lowest-source-vertices.json) xác định H01 source vertex24205 ở `(-.1771,.0135,.1400)` xuốngY−.00943 m và H02 source vertex540203 ở `(-.2413,.02595,.18631)` xuốngY−.03703 m. Đây là vùng source thấp phía ủng phải trên ảnh A-pose; weight đang trộn RightFoot/RightLeg/RightToeBase. Tên weight không được dùng làm mask giải phẫu đã duyệt. Phép IK chỉ kiểm joint Foot đã bỏ sót hiện tượng này; bước sửa contact tiếp phải đo mặt ủng và phối hợp ankle/toe, thay vì tiếp tục coi joint đạt là bề mặt đạt.

Lần chụp bind đầu hết thời hạn30s của lệnh screenshot trên SwiftShader; lần sau dùng180s chỉ cho thao tác chụp ảnh chẩn đoán. Không sửa ngưỡng FPS, test nghiệm thu hoặc quy tắc xác minh Android. Log thất bại và lần chụp lại được giữ.
