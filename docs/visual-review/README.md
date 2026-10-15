# Ảnh kiểm tra triển khai đồ họa và HUD

Ảnh được chụp từ ứng dụng trong Chromium Linux với SwiftShader. Fingerprint, fixture và SHA-256 từng ảnh nằm trong [art-gallery.json](../../acceptance/evidence/art-gallery.json). Chạy lại bằng `GAME_URL=<Vite DEV origin> node tests/master-gallery.mjs`; script từ chối nhận bằng chứng nếu nguồn thay đổi giữa lượt chụp.

| Nhân vật | Toàn thân | Khuôn mặt |
|---|---|---|
| H01 Lâm Dật | [Xem](H01.png) | [Xem](H01-face.png) |
| H02 Hàn Trạch | [Xem](H02.png) | [Xem](H02-face.png) |
| H03 Ly Sa | [Xem](H03.png) | [Xem](H03-face.png) |
| H04 Kỳ Vân | [Xem](H04.png) | [Xem](H04-face.png) |
| H05 Tịch Dao | [Xem](H05.png) | [Xem](H05-face.png) |
| H06 Đỗ Kình | [Xem](H06.png) | [Xem](H06-face.png) |
| H07 Vân Chước | [Xem](H07.png) | [Xem](H07-face.png) |
| H08 Sở Băng Nghi | [Xem](H08.png) | [Xem](H08-face.png) |
| H09 Mặc Tinh | [Xem](H09.png) | [Xem](H09-face.png) |
| H10 Thiên Lạc | [Xem](H10.png) | [Xem](H10-face.png) |
| H11 Ninh Từ | [Xem](H11.png) | [Xem](H11-face.png) |
| H12 Tạ Uyên | [Xem](H12.png) | [Xem](H12-face.png) |

Mặt sau: [Lâm Dật](H01-back.png), [Ly Sa](H03-back.png). Biến thể đại diện của Lâm Dật: [skin cơ bản](skin-1.png), [skin VIP](skin-2.png), [trang phục 1](costume-1.png), [trang phục 2](costume-2.png), [trang phục 3](costume-3.png), [bloom/bóng 4096](ultra.png). Đây là ảnh đại diện; không phải 72 bộ biến thể đã được chụp riêng. Kiểm thử geometry/material khảo sát toàn bộ tổ hợp skin/trang phục không thay nghiệm thu hình ảnh đó.

Bảy vùng: [1](region-1.png), [2](region-2.png), [3](region-3.png), [4](region-4.png), [5](region-5.png), [6](region-6.png), [7](region-7.png). Fixture giữ 100 actor nhưng tắt AI, đưa NPC ra xa và cho người chơi miễn sát thương để kiểm tra cảnh. Ảnh không dùng làm bằng chứng combat, AI hoặc FPS.

Mỗi vùng chờ atlas PBR 2048px của Worker hoàn tất trước khi chụp. Chỉ giữ 1–2 vùng ở độ phân giải cao cùng lúc; ảnh ở các vùng được chụp tuần tự.

Sinh vật: [sói](creature-wolf.png), [tê giác](creature-rhino.png), [chim lửa](creature-firebird.png), [bướm băng](creature-icebutterfly.png), [Cự Viên](creature-ape.png), [Kỳ Lân](creature-kirin.png), [Cổ Long](creature-dragon.png). Đây là preview mức chi tiết cao bằng chính module mô hình trong sảnh thực tế của World; camera/renderer được cô lập để thấy rõ hình. Không nhận là ảnh giao tranh, vị trí spawn hoặc dữ liệu Boss mới. Khung chụp sói và Kỳ Lân hiện cắt bàn chân ở mép dưới; hai ảnh này chưa chứng minh toàn thân/mọi góc, không phải kết luận mô hình bị mất chân.

HUD mặc định: [844×390](hud-844.png), [915×412](hud-915.png), [1280×720](hud-1280.png). Phép đo trong [upgrade-browser.json](../../acceptance/evidence/upgrade-browser.json) tính union hình chữ nhật bao của UI hiển thị khi không mở drawer, không kéo ngắm và không đứng cạnh tương tác ngữ cảnh. Góc trong suốt của nút tròn vẫn tính là che; số đo không áp dụng cho mọi trạng thái UI.

Phép đo hiện tính cả nút Auto đang tắt. Khi bật Auto, bảng trạng thái mở rộng nên không dùng số đo mặc định để suy ra độ thoáng của trạng thái đó.

Minh họa và lục soát: [149 icon 512](icons-149.png), [hai cột và quét thẩm định](loot-appraisal.png), [HUD của prompt mới](hud-master.png). Bản sao nguyên ảnh từ lượt UI đã đạt được ghi trong `acceptance/evidence/master-ui-gallery.json`.

Overhaul: [PBR H01](overhaul-H01-pbr-full.png), [mặt H05](overhaul-H05-face-front.png), [vừa chạy vừa ngắm](overhaul-simultaneous-movement-aoe.png), [hủy đỏ](overhaul-cancel-warning-red.png), [Auto thẩm định](overhaul-auto-loot-appraisal.png), [ghép đủ bảy món](overhaul-auto-built-seven.png), [Auto đứng Cổng](overhaul-auto-extraction-channel.png). Lượt chức năng này giữ viewport CSS 1280×720 nhưng dùng drawing buffer 512×288 trên SwiftShader; ảnh sảnh và các probe GPU dùng độ phân giải riêng. Không dùng các ảnh đó để chứng nhận FPS hoặc chất lượng hiển thị trên Android.

Bộ ảnh xác nhận phạm vi kỹ thuật ghi trong review. Chưa chứng minh mỹ thuật AAA, mọi chi tiết/biến thể theo từng dòng prompt, cảm giác điều khiển hoặc FPS trên Android thật. Xem [MASTER-GOAL.md](../MASTER-GOAL.md) và [GRAPHICS-PIPELINE.md](../GRAPHICS-PIPELINE.md); các gate chưa đạt vẫn giữ nguyên.
