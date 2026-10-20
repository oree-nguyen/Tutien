# Boot v4 — loại thử nghiệm bỏ blend biên

Thử bỏ ảnh hưởng Hips tại toàn bộ miền boot tự chọn và giữ phần đế y <=10mm cứng theo Foot. Không đổi hình học/UV/ảnh/clip. Không kích hoạt.

Ở H02 squat 1,25s, đế nguồn về khoảng -0,0035mm đến 2,9864mm, nhưng cạnh chạm biên miền nguồn bị kéo tới p99.9 **186,869720**, max **404,264100**. Lúc đứng cùng nguồn gần cứng đạt strain1. Điều này xác nhận chuyển support đột ngột ra tới biên là sai; kết quả chân chạm sàn riêng không đủ.

H01 và H02 có receipt, source-ID selection và kết quả pose riêng. Giữ nguyên ngưỡng 1,5/2,0; không bỏ cạnh biên khỏi kiểm tra. Lựa chọn miền tự động chưa có chứng nhận semantic toàn boot.
