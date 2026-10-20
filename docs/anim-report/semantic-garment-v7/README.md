# H01: gom đủ lớp lót vào hai vạt áo — staging v7

Đây là sửa **cấu trúc phân vùng nguồn**, chưa phải rig đạt nghiệm thu. Không thay actor trong sảnh/trận và không tạo APK mới từ bản thử.

## Lỗi đã xác nhận bằng mesh thật

Phần `H01_Remaining_Source` của v6 chứa cả lớp lót trắng và các mảng vải/viền dưới áo. Giữ cứng toàn bộ phần này khi sửa vải là sai. Ảnh cô lập trước/sau xác nhận đây là bề mặt áo có sẵn; không phải thân người ẩn để dựng bù.

Phân tích liên thông cạnh cho phần lớn nhất có 348.289 mặt. Khi tính cả 100 mặt chỉ nối tại đỉnh nguồn, thành phần cần phân lại có **348.389 mặt**. Hai ảnh đầu trong `../conver10-redo/remaining-source-review/` từng có nhãn số lớn hơn 100 mặt; giữ lại làm lịch sử. Cặp `corrected-label/` ghi đúng số của phép cô lập theo cạnh.

Dùng cạnh nguồn và cặp biên UV đã chứng minh, đo khoảng cách trên bề mặt đến hai vạt ngoài: 160.265 mặt lót về trái; 188.124 về phải. Không dùng màu để loại vải ra khỏi vạt. Những nhánh nhỏ ở eo còn cần duyệt đường cắt; không gọi việc gom nhóm là đã có đường may/vải hoàn chỉnh.

## Bất biến và kiểm độc lập

- Giữ đúng **1.499.726 tam giác**, 869.627 đỉnh nguồn, POSITION/NORMAL/UV, ảnh nhúng, trọng số, 52 xương và dữ liệu clip cũ.
- Sáu node; tám primitive. Vạt ngoài cũ và lớp lót mới được giữ thành primitive riêng để không pha loãng chỉ số strain bằng cách thêm nhiều mặt ít biến dạng.
- `bind-all-mesh.json`: **8/8 primitive pass**, đủ mặt nguồn đúng một lần; **148.028 cặp seam, khe hở 0 mm**.
- `held-all-mesh.json`: **3/8 pass**, toàn bản **FAIL**. Vạt trái ngoài p99.9 2,506926/max 5,354764; vạt phải ngoài 5,178130/15,897433. Tay áo phải 4,396204/6,027843. Các lỗi v6 vẫn được nhìn thấy, không đổi ngưỡng 1,5/2,0.
- Lớp lót trái/phải ở cùng pose đạt riêng p99.9 1,042886/1,037197; điều đó không chứng nhận hai vạt hoặc toàn rig.

Hash đầu vào v6: `c24b7cdbe874b745ad54d9e951ebeedd85db465f759c91dcc768c58871eae143`.
Hash GLB v7: `5fcf74580c7bcb9d48adcaebbdb1c379712f89ad2e34d0d55a18d7a6a6902db4`.
GLB thử chỉ ở `.local/rig-candidates/semantic-garment-v7/`. `receipt.json`, `ownership.json` và danh sách face nguồn kèm theo cho phép đối chiếu độc lập; không đưa thêm GLB chẩn đoán vào APK.

![Trước/sau và cô lập hai vạt, thân còn lại](semantic-garment-review-sheet.png)

Thời gian chụp từng ảnh: xem `capture-manifest.json`. Bản ảnh nguyên byte cùng giờ đăng ký nằm tại [sổ conver10](../../../picture/conver10/online-pic.md).

Tái tạo từ v6 đã có đủ buffer và receipt:

```bash
python3 tools/rig/lower-fabric-ownership.py .local/rig-candidates/semantic-garment-v6 .local/rig-candidates/semantic-garment-v7
node tools/rig/repartition-lined-garment.mjs .local/rig-candidates/semantic-garment-v6 .local/rig-candidates/semantic-garment-v7
RIG_FILE=.local/rig-candidates/semantic-garment-v7/H01-C0-rigged.glb RIG_REPORT_FILE=docs/anim-report/semantic-garment-v7/bind-all-mesh.json node tools/rig/validate-all-meshes.mjs
```

Toàn bộ số đo là offline/cloud, chưa kiểm chứng trên điện thoại.
