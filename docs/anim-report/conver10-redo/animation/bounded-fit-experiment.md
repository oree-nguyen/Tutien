# H02: thử giải giới hạn và tách sai số trước/sau lọc

Các lượt full-v7, v7b, v8 và v9 là **thử nghiệm bị loại**, không kích hoạt. Chúng dùng các phiên bản bộ giải bounded trong quá trình phát triển, giữ hình học/UV/ảnh/52 xương và clip cũ. Không coi số khớp trong giới hạn là bằng chứng tay đã bám búa.

V6: sai số điểm cầm sau grab tối đa 505,464 mm. V7: 511,676 mm; v8/v9 khoảng 511,679 mm. Cùng quỹ đạo độc lập của búa; không dịch búa theo tay sai để làm sai số thành 0.

Ở v7b, sai số endpoint tay trái trước bộ lọc vận tốc tối đa khoảng 33,949 mm; sau lọc tới 582,446 mm. Đây là bằng chứng việc chọn nhánh và lọc quaternion sau giải tiếp xúc có thể phá ràng buộc. Một bộ giải cục bộ chính xác hơn ở từng frame chưa sửa được đường đi liên tục toàn chuỗi.

Vì kết quả chưa tốt hơn, bounded refinement **mặc định tắt**, chỉ bật cho thử nghiệm offline bằng `FK_BOUNDED_FIT=1`. Không sửa bộ giới hạn khớp, không đổi ngưỡng, không thêm IK runtime. Mỗi kết quả mới ghi `boundedFitExperiment` trong provenance. `beforeVelocityLimit` được giữ riêng để so với pose thực sự xuất ra.

Focused regression kiểm một tiếp xúc hinge lệch trục có nghiệm thật: giải trong giới hạn, giữ nguyên chiều dài xương. Test đó không chứng nhận quỹ đạo H02 hay mesh skin.
