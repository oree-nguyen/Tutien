# BỘ PROMPT ĐẶC TẢ ĐỒ HỌA AAA CHO GOOGLE AI STUDIO — "HỒN GIỚI: SINH TỒN (V2.5)"
**Khắc phục triệt để lỗi "Nhân vật người tuyết bụng tròn / Mặt đất ô vuông / Icon ký tự đơn điệu" trong ảnh chụp màn hình của bạn**

> **Chẩn đoán kỹ thuật từ bức ảnh `14098.jpg` bạn vừa gửi:**
> 1. **Vì sao nhân vật Lâm Dật trong ảnh bị giống "búp bê bụng tròn, mắt lồi"?** Do AI Studio dùng `SphereGeometry` (khối cầu tròn quay) để ghép bụng, vai và gắn 2 viên bi làm mắt. Muốn ra dáng **Nam thần / Nữ thần Tiên Hiệp tỷ lệ 8 đầu như game lớn**, phải cấm dùng khối cầu làm thân/vai, bắt buộc dùng **Mặt cắt Giải phẫu Bầu dục Dẹt (`Elliptical Cross-Section Sculpting` — ngực nở, eo thon, chân dài 52% cơ thể)** kết hợp **Vẽ Texture Khuôn Mặt 2048×2048 sắc nét (mắt có hồn, cằm V-line, tóc dài từng lọn)**.
> 2. **Vì sao các ô Hồn Cốt / Vật phẩm chỉ hiện ký tự `☉ Đầu`, `♜ Thân`, `⚡ Tay trái`?** Do AI Studio lười vẽ tranh minh họa cho vật phẩm. Prompt mới dưới đây ép nó phải chạy một **Engine Vẽ Minh Họa Vật Phẩm Tự Động (`ProceduralItemArtRenderer` 512×512px)** để vẽ từng viên đan dược, lá bùa, khung xương Hồn cốt, vũ khí phát sáng cực đẹp.
> 3. **Vì sao nền đất chỉ là ô lưới xám và vài hình trụ xanh?** Do AI dùng `GridHelper`. Prompt mới ép dựng **Đài Cổ Ngọc lơ lửng giữa biển mây ở Sảnh** và **Bản đồ 7 vùng sinh thái có mặt nước phản chiếu, cỏ lá đung đưa, đồi núi hùng vĩ**.
> 4. **Nút bấm Gameplay:** Chuyển từ nút phẳng đơn điệu sang **Nút Kỹ Năng Viền Kim Loại Hoàng Kim + Icon Hồn Kỹ Vẽ Riêng + Hiệu Ứng Phản Hồi Cảm Ứng Mượt Như Liên Quân Mobile**.

Bạn chỉ cần copy nguyên văn **Mục 1 (Prompt Đại Tu Đồ Họa Nhân Vật Nam/Nữ, Vật Phẩm, Map & Nút Bấm Gameplay)** bên dưới và dán thẳng vào khung chat AI Studio hiện tại!

## 1. Prompt Đại Tu Toàn Diện: Nhân Vật Nam/Nữ Tỷ Lệ 8 Đầu Giống Thật, Vật Phẩm Hoàn Mỹ, Map Chi Tiết & Nút Bấm Gameplay Chuẩn Liên Quân (Dán nối tiếp vào AI Studio)

```text
YÊU CẦU ĐẠI TU ĐỒ HỌA LÊN CHUẨN GAME LỚN (AAA CHARACTER ANATOMY, ITEM ARTWORK, REALISTIC MAP & MOBA GAMEPLAY BUTTONS):
Tôi vừa kiểm tra giao diện hiện tại: mô hình nhân vật đang bị béo tròn như người tuyết/búp bê (do dùng khối cầu làm bụng/vai và gắn bi làm mắt), nền đất chỉ là lưới ô vuông xám đơn điệu, các ô vật phẩm (Hồn cốt, Hồn hoàn, Bổ phẩm) chỉ hiện ký tự text sơ sài, và nút bấm gameplay trong trận chưa đẹp.

Hãy VIẾT LẠI HOÀN TOÀN bộ dựng hình 3D nhân vật Nam/Nữ, bộ vẽ Icon Vật phẩm, Bản đồ 3D và cụm Nút bấm Gameplay theo đúng 4 quy chuẩn bắt buộc dưới đây (tuyệt đối không làm sơ sài):

====================================================================
1. DỰNG NHÂN VẬT NAM / NỮ TỶ LỆ 8 ĐẦU GIỐNG THẬT NHẤT (8-HEAD HEROIC ANATOMY — CẤM HÌNH NGƯỜI TUYẾT BỤNG TRÒN):
====================================================================
- CẤM TUYỆT ĐỐI:
  + Cấm dùng `SphereGeometry` hay hình trụ tròn phình to làm bụng/ngực khiến nhân vật lùn và béo tròn.
  + Cấm dùng 2 cục cầu làm cầu mắt lồi ra ngoài hoặc dùng hình nón gắn giữa mặt làm mũi hề.
  + Cấm dùng 2 quả cầu tròn úp lên vai làm giáp vai.
- BẮT BUỘC DỰNG TỶ LỆ CƠ THỂ 8 ĐẦU CHUẨN MỸ THUẬT GAME LỚN (NARAKA / VƯƠNG GIẢ VINH DIỆU / LIÊN QUÂN):
  + Tách riêng 2 bộ khung giải phẫu `buildMaleHeroMesh(config)` (Nam: cao 1.82m, vai rộng 0.44m, ngực săn chắc, eo thon 0.25m, chân dài 0.95m) và `buildFemaleHeroMesh(config)` (Nữ: cao 1.68m, dáng đồng hồ cát mảnh mai, vai 0.35m, vòng ngực thanh thoát, eo nhỏ 0.19m, hông 0.34m, đôi chân thon dài 0.90m).
  + Kỹ thuật Điêu khắc Thân người Mặt cắt Bầu dục Dẹt (`Elliptical Anatomical Lofting`):
    * Viết hàm tạo `BufferGeometry` tùy chỉnh với 128 lát cắt dọc và 64 lát cắt ngang, trong đó mặt cắt ngang của lồng ngực, eo và hông là HÌNH BẦU DỤC DẸT (`depth = width * 0.58`), tạo rõ đường cong chữ S của cột sống, cơ ngực, rãnh eo thon gọn và bờ vai thanh thoát.
  + Khuôn mặt Nam Thần / Mỹ Nữ Sắc Nét (2048x2048 Canvas Facial Texture + V-Line Head Mesh):
    * Hộp đầu có phần cằm V-line thon gọn và gò má mềm mại.
    * Viết hàm `renderHighResFaceTexture(gender, eyeColor, hairColor, browStyle)` trên Canvas 1024x1024 để vẽ đôi mắt Anime/Semi-realistic cực kỳ có hồn (tròng mắt chuyển sắc 4 lớp, con ngươi sâu thẳm, 3 đốm sáng phản chiếu catchlight, hàng mi cong sắc sảo, chân mày kiếm cho Nam / chân mày lá liễu cho Nữ, sống mũi thanh cao đổ bóng nhẹ và đôi môi tự nhiên) rồi ánh xạ UV chuẩn lên khuôn mặt.
  + Mái tóc dài Tiên Hiệp & Trang phục Cổ trang Đa tầng (Layered Hanfu/Xianxia Garments):
    * Tóc gồm mái trước tỉa từng lọn ôm lấy khuôn mặt + tóc sau lưng dài mượt uốn lượn bằng 24 dải `TubeGeometry` / `Ribbon Mesh` thuôn nhọn dần về ngọn, bay nhẹ theo gió.
    * Trang phục gồm: Áo trong cổ giao lĩnh chữ Y, ngoại bào xẻ tà hai bên hông rủ xuống tận bắp chân (dùng lưới `PlaneGeometry` uốn cong ôm theo dáng người, độ dày mảnh 0.015m), đai lưng thắt eo bản rộng đính ngọc bội và tua rua, giáp vai (Pauldrons) uốn cánh chim/đầu lân sắc sảo vươn nhẹ lên cao.
    * Tay & Chân thon dài: Cánh tay có ống tay áo lụa hoặc hộ uyển kim loại chạm khắc, bàn tay thon có ngón tay cầm vũ khí; chân đi trường ngoa (bốt cổ cao) ôm sát bắp chân.

====================================================================
2. VẼ TOÀN BỘ VẬT PHẨM & VŨ KHÍ 3D VỚI ĐỘ HOÀN MỸ CAO NHẤT (PROCEDURAL MASTERWORK ITEM & WEAPON ENGINE):
====================================================================
- CẤM dùng các ký tự Unicode đơn điệu (`☉`, `♜`, `⚡`, `v`, `✦`) trong các ô Hồn Cốt, Hồn Hoàn, Bổ Phẩm, Trợ Phẩm!
- BẮT BUỘC viết hàm `generateMasterworkItemIcon(itemType, itemId, rarity, element)` vẽ trực tiếp bằng Canvas 2D độ phân giải cao (256x256px) tạo thành hình ảnh minh họa nghệ thuật 2.5D phát sáng cho TẤT CẢ vật phẩm:
  + 7 Vị trí Hồn Cốt (Đầu, Thân, Tay trái, Tay phải, Chân trái, Chân phải, Bát Chu Mâu Ngoại Phụ): Vẽ rõ hình dáng Vương miện xương tinh thể phát sáng (Đầu), Giáp ngực xương rồng tỏa hào quang (Thân), Cặp hộ uyển cốt trảo sắc bén (Tay), Chiến hài xương thú phát quang (Chân) và 8 mũi thương nhện ma thuật (Ngoại phụ) trên nền hoa văn cổ ngữ theo phẩm chất.
  + 12 Hồn Hoàn, 28 Bổ Phẩm & 18 Trợ Phẩm: Vẽ chi tiết từng viên Kim Đan tỏa khói linh khí, Châu Ngọc khúc xạ ánh sáng, Lá Bùa Chu Sa khắc chữ triện vàng rực rỡ, Gương Bát Quái, Pháp Trận Thất Tinh.
- DỰNG 12 VŨ KHÍ HỒN KHÍ 3D TRÊN TAY NHÂN VẬT CỰC KỲ HOÀNH TRÁNG:
  + Mỗi nhân vật phải cầm đúng vũ khí 3D được chạm khắc tinh xảo, tỷ lệ lớn và phát hào quang nguyên tố:
    * Lâm Dật (Mộc Tinh Trượng): Quyền trượng gỗ thần uốn lượn như rồng quấn, đỉnh trượng nở hoa sen ngọc lục bảo phát sáng lơ lửng kèm dây leo mảnh quấn quanh.
    * Hàn Trạch (Chấn Nhạc Chùy): Đại chùy chiến thần chạm khắc mặt hổ/nham thạch nứt lửa vàng rực.
    * Ly Sa (Song Ảnh Nhận): Cặp song đao lưỡi cong bán nguyệt sắc bén tỏa khói tím ma mị.
    * Kỳ Vân (Lôi Vũ Phiến): Quạt lông vũ sấm sét ghép từ 9 chiếc lông vũ pha lê phát tia điện.
    * Tịch Dao (Nguyệt Linh Kính), Đỗ Kình (Huyền Quy Thuẫn), Vân Chước (Diệm Liên Luân), Sở Băng Nghi (Băng Điệp Trâm), Mặc Tinh (Huyền Nguyệt Cung), Thiên Lạc (Kim Hổ Trảo), Ninh Từ (Thanh Ngọc Cầm), Tạ Uyên (Hư Ảnh Xà Trượng): Đều phải dựng hình khối 3D riêng biệt, sắc nét, tuyệt đối không dùng que trụ gắn bông hoa đơn giản!

====================================================================
3. NÂNG CẤP SẢNH HỒN THÀNH & BẢN ĐỒ 7 VÙNG SINH THÁI CHÂN THỰC (NO FLAT GREY GRID!):
====================================================================
- XÓA BỎ mặt sàn kẻ ô vuông xám (`GridHelper`) và các cột trụ xanh đơn điệu!
- Tại Sảnh Hồn Thành: Dựng ` Bệ Đá Cổ Ngọc Bạch Cẩm Thạch` chạm khắc bát quái và rồng vàng phát sáng, xung quanh là biển mây bồng bềnh trôi nhẹ, những ngọn núi tiên cảnh phía xa, cánh hoa đào/đốm sáng linh khí bay lơ lửng và hệ thống đèn Studio 3 điểm (Key Light ấm, Rim Light viền sáng tóc/vai, Fill Light dịu) tôn vinh vẻ đẹp của nhân vật.
- Trong Chiến Trường "Thương Mang Cổ Vực" (7 Vùng Sinh Thái):
  + Mặt đất có độ lồi lõm tự nhiên và phủ Texture đa lớp (cỏ non xanh mướt, đường đá cổ, bờ cát, mặt băng phản chiếu, dung nham phát sáng, mặt nước sông suối trong vắt).
  + Cây cổ thụ có thân gỗ uốn lượn có vân vỏ cây, rễ nổi, tán lá nhiều tầng màu sắc sinh động; Bụi cỏ ẩn thân gồm hàng chục cụm lá cỏ dài uốn cong đung đưa theo gió; Cổng Hồi Hoàn là một Đại Pháp Trận Không Gian khổng lồ có cột đá cổ ngữ và vòng xoáy thiên hà phát sáng rực rỡ.

====================================================================
4. CẢI THIỆN CỤM NÚT BẤM GAMEPLAY TRONG TRẬN CHUẨN MOBA AAA (ERGONOMIC & ORNATE MOBA HUD):
====================================================================
- Thiết kế lại toàn bộ cụm nút điều khiển cảm ứng trong trận đấu vừa ĐẸP MẮT vừa NHẠY & DỄ BẤM như Liên Quân Mobile:
  + Cần gạt Di chuyển (Trái): Vòng tròn cổ ngữ bán trong suốt có viền vàng kim, nút gạt ở tâm phát sáng theo hướng ngón tay kéo, hiển thị mũi tên định hướng di chuyển mềm mại.
  + Cụm Nút Tấn Công & 4 Kỹ Năng Q / W / E / R (Phải):
    * Nút `Đánh Thường` kích thước lớn (88x88px), viền kim loại rồng vàng nổi 3D, ở giữa là biểu tượng song kiếm phát sáng; có 2 nút vệ tinh nhỏ cạnh bên (`Đánh Quái` và `Đánh Tướng Máu Thấp`) dễ bấm bằng đầu ngón cái.
    * 4 Nút Chiêu Thức `Q, W, E, R` (68x68px) xếp theo đúng cung tròn ngón cái: mỗi nút có `Hình vẽ Icon Kỹ năng riêng biệt theo từng tướng`, viền vàng kim, hiệu ứng lún xuống và lóe sáng khi bấm (`active scale 0.92`), lớp phủ quạt đếm ngược hồi chiêu (Radial Sweep Cooldown) kèm số giây đếm ngược cỡ lớn (ví dụ `4.2s`) và vạch báo tiêu hao Hồn lực.
    * Khi nhấn giữ và kéo nút chiêu `Q/W/E/R`, hiển thị `Vòng Định Hướng Kỹ Năng 3D (Skillshot Indicator)` dưới mặt đất cực nét (mũi tên phát sáng, quạt 120°, tâm ngắm tròn) và hiện nút `"HỦY CHIÊU (X ĐỎ)"` ở góc trên phải.
    * Nút bổ trợ `F (Linh Bộ)` và `3 Nút Trợ Phẩm` đặt ở vòng cung trong cùng với icon minh họa sắc nét và badge số lần dùng.
    * Nút Tương Tác Ngữ Cảnh Thông Minh (`Mở Hòm Xác`, `Hấp Thu Hồn Hoàn`, `Rút Lui / Hoãn Nhân Hồi`, `Mua Nhanh Bổ Phẩm`) tự động bật lên với hiệu ứng viền sáng nhấp nháy ngay tầm ngón cái khi đứng gần mục tiêu.

Hãy viết lại và xuất toàn bộ mã nguồn hoàn chỉnh với Nhân vật Nam/Nữ tỷ lệ 8 đầu tuyệt đẹp, Vật phẩm có tranh vẽ minh họa sắc nét, Bản đồ chân thực và Nút bấm Gameplay chuẩn MOBA ngay bây giờ!
```

## 2. Mẹo nhỏ để kiểm tra ngay sau khi AI Studio chạy xong Prompt trên

- **Kiểm tra dáng nhân vật ở Sảnh:** Ngay khi AI Studio render lại, nhân vật **Lâm Dật** (Nam) và **Ly Sa / Tịch Dao / Sở Băng Nghi / Ninh Từ** (Nữ) sẽ chuyển từ khối cầu tròn sang dáng người cao ráo tỷ lệ 8 đầu (eo thon, vai mở, mặc trường bào cổ trang nhiều lớp, khuôn mặt V-line có mắt/tóc chi tiết).
- **Kiểm tra bảng Hành Trang Xuất Chiến bên phải:** 7 ô **Hồn Cốt** (`Đầu`, `Thân`, `Tay trái`, `Tay phải`, `Chân trái`, `Chân phải`, `Ngoại phụ`) và các ô **Bổ Phẩm / Trợ Phẩm** sẽ hiển thị **hình vẽ trang bị phát sáng** thay vì các ký tự đơn điệu như trong ảnh cũ.
