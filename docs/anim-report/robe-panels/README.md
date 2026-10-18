# H01 — tách riêng hai vạt áo ngoài

Phạm vi: hai vạt trái/phải theo cơ thể Lâm Dật, bên dưới đai lưng. Chưa sửa trọng số xương hoặc kích hoạt model trong game.

File thử: `assets/rigged/H01-C0-robe-panels-diagnostic.glb` trên nhánh `rig/source-resolution-rebuild`.

Bốn mesh thật có bộ đỉnh riêng:

- `H01_Ao_VatTrai`: vạt trái, 191.443 tam giác.
- `H01_Ao_VatPhai`: vạt phải, 165.173 tam giác.
- `H01_Ao_ThanVaTay`: phần áo trên và tay áo, 530.390 tam giác.
- `H01_ThanConLai`: các bề mặt còn lại, gồm lớp áo trong, 612.720 tam giác. Đây không phải thân người đã được dựng lại dưới áo.

Các đỉnh ở đường phân chia được sao chép nguyên dữ liệu sang từng mesh, rồi bỏ đỉnh không dùng. Vì thế hai vạt không còn chung vertex buffer với thân áo. Kiểm tra sau xuất xác nhận từng tam giác giữ đúng thứ tự đỉnh, tổng 1.499.726 tam giác; UV, normal, skin weights, ảnh texture nhúng, 52 xương và mọi keyframe/interpolation của 6 clip đều được giữ nguyên.

Vùng tách nằm từ y=0,20 đến y=0,90 m, |x|<0,245 m trong bind space. Thuật toán lan nhãn theo khoảng cách tới mẫu vải xanh/trắng lấy trên UV gốc giúp phân biệt vạt ngoài với áo trong; không chỉ tách theo dấu x của toàn bộ trang phục. Đây vẫn là phân vùng tự động: các mép tiếp giáp và vùng tay áo dính vào vạt trong nguồn cần kiểm tra/chỉnh hình tiếp, chưa phải nghiệm thu may mặc hoặc rig hoàn chỉnh.

Ảnh `separated-panels.png` chủ động dịch hai vạt ±0,30 m để kiểm chứng chúng là mesh rời. Khoảng trống khi kéo rời cho thấy nguồn không cung cấp thân/áo trong hoàn chỉnh ở mọi vị trí dưới vạt; không lấp bằng model giả. Ảnh `left-panel.png`, `right-panel.png`, `torso-sleeves.png` lần lượt ẩn các mesh khác. Các ảnh held dùng tư thế nâng tay cũ; tách mesh không tự sửa lỗi kéo phồng của trọng số cũ.

Tái tạo (cần NumPy/SciPy từ `tools/rig/requirements-surface.txt`):

```bash
npm run assets:rig:panels
node tools/rig/preview-robe-panels.mjs
```

Kiểm tra dữ liệu trong [separation.json](separation.json). Mọi ảnh là render cloud, chưa đo trên điện thoại Android. Ảnh được đăng vào `picture/conver10/online-pic.md` trên main; giờ trong sổ là giờ đăng ký ảnh, không giả định là giờ chụp.

Kết quả kiểm tra đợt này: `npm test` **161 passed, 0 failed/skipped**; `verify:master` vẫn **BLOCKED 0/37**, exit 1. Không thay ngưỡng hoặc coi việc tách mesh là đã sửa xong rig.
