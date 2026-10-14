# Ảnh kiểm tra triển khai đồ họa và HUD

Các ảnh được chụp từ ứng dụng đang chạy trong Chromium trên Linux với SwiftShader, không phải ảnh dựng ngoài game. Fingerprint và SHA-256 từng ảnh nằm trong [art-gallery.json](../../acceptance/evidence/art-gallery.json). Phép chụp bảy vùng tắt AI và cho người chơi miễn sát thương để giữ khung hình kiểm tra; không dùng ảnh này làm bằng chứng AI hoặc combat.

| Nhân vật | Ảnh cận cảnh | Nhân vật | Ảnh cận cảnh |
|---|---|---|---|
| H01 Lâm Dật | [Xem](H01.png) | H07 Vân Chước | [Xem](H07.png) |
| H02 Hàn Trạch | [Xem](H02.png) | H08 Sở Băng Nghi | [Xem](H08.png) |
| H03 Ly Sa | [Xem](H03.png) | H09 Mặc Tinh | [Xem](H09.png) |
| H04 Kỳ Vân | [Xem](H04.png) | H10 Thiên Lạc | [Xem](H10.png) |
| H05 Tịch Dao | [Xem](H05.png) | H11 Ninh Từ | [Xem](H11.png) |
| H06 Đỗ Kình | [Xem](H06.png) | H12 Tạ Uyên | [Xem](H12.png) |

Biến thể đại diện của Lâm Dật: [skin cơ bản](skin-1.png), [skin VIP](skin-2.png), [trang phục1](costume-1.png), [trang phục2](costume-2.png), [trang phục3](costume-3.png). Thống kê toàn bộ48trang phục/24skin ở `art-metrics.json`; năm ảnh này chỉ là ví dụ đại diện, không phải ảnh của toàn bộ72biến thể.

[Bloom và bóng 4096](ultra.png). Các vùng: [1](region-1.png), [2](region-2.png), [3](region-3.png), [4](region-4.png), [5](region-5.png), [6](region-6.png), [7](region-7.png).

HUD mặc định: [844×390](hud-844.png), [915×412](hud-915.png), [1280×720](hud-1280.png). Số đo diện tích trong [upgrade-browser.json](../../acceptance/evidence/upgrade-browser.json) chỉ áp dụng khi không mở drawer, không kéo ngắm và không đứng cạnh tương tác ngữ cảnh. Hình chữ nhật bao nút tròn được tính cả góc trong suốt nên kết quả bảo thủ.

Review kỹ thuật xác nhận các bộ phận và khác biệt được triển khai. Đây chưa phải nghiệm thu mỹ thuật AAA, toàn bộ chi tiết theo từng dòng Markdown, hoặc cảm giác điều khiển/FPS trên điện thoại. Số đa giác cao và checksum khác nhau không chứng minh các yêu cầu đó.
