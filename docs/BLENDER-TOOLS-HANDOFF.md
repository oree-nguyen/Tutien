# Đồng bộ bộ công cụ Blender giữa các phiên cloud

Kiểm tra tại phiên Game Agent ngày2026-10-23. Đây là trạng thái truy cập công cụ, **không phải nghiệm thu rig/animation**.

## Chứng cứ người dùng cung cấp

Hai ảnh15889/15890 cho thấy cuộc trò chuyện **Skill Agent**, repoTutien, có báo cáo cài bốn repo và kiểm tra toolkit/MCP/Studio. Đường dẫn trong ảnh là:

`/workspace/tools/installed-blender-skills/VERIFIED.md`

Ảnh còn ghi rõ animation game chưa được sửa. Ảnh đã được giữ nguyên byte trong [sổ conver10](../picture/conver10/online-pic.md); thời gian đăng ký ảnh không được gọi là giờ chụp.

## Trạng thái quan sát trực tiếp tại Game Agent

- Đường dẫn trên **không tồn tại**. `/workspace/tools` chỉ có `TripoSR`.
- Không tìm thấy `SKILL.md` của `blender-toolkit`, `animation`, `vfx-fx` trong các thư mục skill/workspace đã kiểm, kể cả thư mục ẩn và các file bị Git ignore.
- Danh mục executor có0skill; danh mục cloud chỉ có hai skill môi trường. Chưa có công cụ Studio/Blender MCP trong danh mục callable.
- Có `/usr/bin/blender`; chưa tìm thấy executable Blender Agent Studio0.6.4 hoặc package tương ứng.
- Cấu hình khởi tạo của phiên này chưa chứa tên bộ cài hoặc URL repo của chúng.
- Git remote main vẫn là `c66f637185ee500072a5e4c0e22f6db4acbda8dc` khi kiểm tra; ba nhánh remote hiện có chưa cung cấp bộ cài/báo cáo nói trên.

Do đó báo cáo ở Skill Agent chưa tái lập được trong filesystem của Game Agent. Cùng tên repo không bảo đảm các phiên cloud dùng chung container hoặc các file chưa commit. Không kết luận người dùng chưa cài; cũng không tuyên bố đã sử dụng các skill/Studio ở Game Agent.

## Cách chuyển tiếp ít thao tác

Trong Skill Agent, gửi yêu cầu sau:

> Đưa VERIFIED.md cùng script cài đặt tái lập ba thư viện blender-toolkit, animation, vfx-fx và Blender Agent Studio0.6.4 vào repo oree-nguyen/Tutien, nhánh main. Ghi URL nguồn, commit/version và cách kết nối đã kiểm tra của từng repo. Không đưa token, cache hoặc binary nặng lên Git; không ghi đè các thay đổi game hiện có. Game Agent sẽ kéo xuống, đọc SKILL.md và cài lại trong container của nó.

Chỉ cần những file được push lên repo, Game Agent có thể lấy chúng mà không cần người dùng mô tả lại đường dẫn hoặc cấu hình. Không tự tạo script giả hoặc chọn một repo trùng tên khi nguồn cài thực chưa biết.

## Điều kiện tiếp tục sửa và nghiệm thu

Sau đồng bộ: đọc đúng tài liệu của cả ba skill/Studio; chạy kiểm kết nối/đọc scene thật; sửa trên source H01/H02 ở staging; kiểm lại asset xuất ra và runtime trước khi kích hoạt. Giữ nguyên23cổng trong [goal](../goal/rig-animation.md), bao gồm p99,9≤1,5×, max≤2×, contact≤5mm, kept seam≤1µm, lấy mẫu60/120Hz, normal/collision/provenance và thứ tự tay áo H01 sau APK rig+animation.

Checkpoint rig gần nhất vẫn là [HAND-SHAPE.md](anim-report/conver10-approved-repair-2026-10-21/HAND-SHAPE.md): rig chưa đạt, chưa có APK animation mới. Không dùng kiểm cài đặt công cụ thay nghiệm thu game.
