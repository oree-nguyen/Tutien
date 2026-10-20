# H01: giải trực tiếp trọng số theo cạnh ở pose nâng tay — chưa đạt

Thử nghiệm primal-dual dùng độ dài cạnh **sau skinning thật**, thay vì chỉ làm mượt trường trọng số. Giữ đúng bốn ID xương trên mỗi đỉnh, tổng trọng số1, không âm; tay được bảo vệ giữ nguyên. Không thêm morph, không sửa POSITION/NORMAL/UV/ảnh hoặc clip. Không kích hoạt.

300 vòng trên 749.845 nhóm đỉnh nguồn và 2.249.589 cạnh mất khoảng158,39s cloud. Chỉ số cạnh duy nhất p99.9 **3,480657 → 2,175680**, max **15,897469 → 4,628803**. Mục tiêu bộ giải1,49 nghiêm hơn ngưỡng nghiệm thu1,5; không đổi test.

Kiểm độc lập theo primitive từ GLB đã xuất: chỉ2/6đạt. Vạt trái p99.9 **1,506668** vẫn fail1,5; vạt phải **2,506624**, max **4,628846**; tay áo phải **2,471001**, max **3,676340**. Không thay số liệu per-primitive bằng mẫu số cạnh duy nhất thuận lợi hơn. Source coverage nguyên vẹn, seam nguồn0mm.

Kiểm giao nhau cùng nguồn/cùng pose: **2.169 → 4.098** cặp, gồm2.886cặp mới và957được loại. Đây là surface crossing, chưa chứng nhận containment/thickness/tiết diện/thể tích. Vì còn kéo và giao nhau tăng, bản thử bị loại.

Ảnh trước/sau và sổ conver10 giữ nguyên byte. Trong ảnh vẫn có dải nối tay áo–eo bị kéo; chưa có đường cắt trang phục được duyệt. Không suy ra rằng mọi phép gán trọng số đều vô nghiệm từ một lượt này.

GLB thử SHA256 `23ba0914b319faf10954c55a888ae8b21d80c3095391138312f1c53d6580df8a`; chỉ ở `.local/rig-candidates/pose-weight-held/`.

![Tư thế nâng tay, trước/sau](semantic-garment-review-sheet.png)

Giờ chụp: `capture-manifest.json`. Giờ đăng ký: [sổ ảnh](../../../../picture/conver10/online-pic.md). Chưa thử trên điện thoại.
