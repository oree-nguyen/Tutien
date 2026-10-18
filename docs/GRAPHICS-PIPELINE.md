# Đồ họa và pipeline tài nguyên V2.5

Yêu cầu hiện hành gồm [Master Prompt (2)](requests/MASTER-ENGINEERING-ART-V2.5.md) và [đợt PBR / Skillshot / Auto Farm ngày 15/10/2026](requests/PBR-SKILLSHOT-AUTOFARM-V2.5.md), với điều kiện nghiệm thu tại [MASTER-GOAL.md](MASTER-GOAL.md) và [OVERHAUL-GOAL.md](OVERHAUL-GOAL.md). Các điều kiện GDD và [UPGRADE-GOAL.md](UPGRADE-GOAL.md) trước đó vẫn có hiệu lực. Tài nguyên hiện tại được dựng bằng thuật toán Three.js, Canvas, GLSL và một pipeline Blender chạy trên Linux. Không có tài nguyên nào được nhận là sản phẩm suy luận của Sinnon hoặc mô hình AI.

## Nhân vật và phục trang

`src/art.js` quản lý template, LOD và hoạt ảnh, còn `src/hero-anatomy.js` dựng hình người. Nhân vật dùng đơn vị mét và chiều cao riêng trong bảng 1.4 của prompt mới. Ly Sa, Tịch Dao, Sở Băng Nghi, Mặc Tinh và Ninh Từ dùng khung nữ; các nhân vật còn lại dùng khung nam. Hàn Trạch cao 1,92 m, Đỗ Kình cao 1,98 m. Chiều cao lưới đầu sau biến đổi bằng một phần tám chiều cao riêng, không tính búi tóc, trâm hoặc vũ khí.

Thân là lưới loft liên tục qua 12 mặt cắt bầu dục, có bán kính ngang và sâu độc lập. Mức gần dùng 128 đoạn dọc × 128 đoạn quanh thân. Nội suy Hermite nối hông, eo, ngực và vai; mặt dùng lưới đầu V-line với sống mũi tích hợp. Không ghép khối cầu vào bụng, ngực, vai hoặc mắt. Khung chuyển động dùng các `THREE.Group` phân cấp:

```text
Root → Pelvis → SpineLower → SpineUpper → Chest → Neck → Head
Chest → Clavicle L/R → Shoulder L/R → UpperArm L/R → Forearm L/R → Hand L/R
Pelvis → Thigh L/R → Calf L/R → Ankle L/R → Foot L/R
Hand L/R → Thumb / Index / Middle / Ring / Pinky → ba đốt mỗi ngón
```

Mỗi thiết kế có cấu hình chiều cao, màu, độ dài tóc, hình áo giáp và phụ kiện riêng: đuôi hồ ly, áo lông vũ, giáp quy lục giác, vạt sen lửa, cánh băng, áo choàng cung thủ, giáp hổ, hoa lan hoặc cổ áo vảy xà. Các mô hình chia sẻ thuật toán giải phẫu và nhóm primitive; đây không phải 12 bản sculpt chân dung độc lập do họa sĩ tạo.

Phục trang gồm lớp trong, áo ngoài cổ giao lĩnh, đai/ngọc bội/tua và giáp vai/hộ uyển/dải lụa. Bốn tà chính ở mức gần dùng `PlaneGeometry` 64 × 64 đoạn, tương ứng 65 × 65 đỉnh, với vật liệu hai mặt. Lớp áo ngoài được dựng bằng cung mở liên tục để giữ mép cổ áo mượt. Tà áo cong ra ngoài, có khoảng hở với chân; shader dịch chuyển nhẹ phần gấu và các nhóm khớp xoay theo nhịp chạy. Đây là chuyển động thủ tục, không phải mô phỏng vải bằng solver vật lý.

Góc xoay gốc của từng tà áo được lưu đầy đủ. Hoạt ảnh khôi phục cả ba góc trước khi thêm dao động, tránh lỗi clone quaternion/Euler làm áo choàng lật lên trên đầu. Các kiểm thử raycast kiểm tra áo trước che chân thay vì để chân xuyên qua vải ở các điểm lấy mẫu.

## Khuôn mặt, texture và cache

`generateHighResCharacterFaceTexture()` vẽ nền da kín chuyển sắc `#FFE4E6 → #FDEAD7`, má, mắt sáu lớp, 36 tia iris, ba catchlight, mí/mày, highlight sống mũi và môi bằng Canvas 2D. `FaceFrontMesh` chỉ chứa cung mặt trước ±65°, có UV căn trực tiếp theo hướng nhìn; phần sọ sau dùng vật liệu da riêng. Texture đặt `ClampToEdgeWrapping`, `flipY = true` và `SRGBColorSpace`. Không vẽ các vệt tóc đen lên ảnh mặt và không ghép hai khối cầu làm mắt. Tóc được dựng thành các lọn 3D ngoài sọ; vị trí môi/mũi đi theo UV của cung trước thay vì chu vi đầu 360°.

| Mức hiển thị | Kích thước texture mặt | Cách tạo |
|---|---:|---|
| Gần / sảnh | 2048 × 2048 | Canvas đủ độ phân giải |
| Vừa | 256 × 256 | Vẽ cùng hệ tọa độ mỹ thuật vào canvas nhỏ |
| Xa | 64 × 64 | Vẽ trực tiếp canvas nhỏ, không tạo mặt 2048 trước |

Cache texture mặt giữ tối đa 4 ảnh 2048 và 12 ảnh cho mỗi kích thước 256/64. Việc bỏ một ảnh khỏi cache không bảo đảm thu hồi ngay bộ nhớ khi model đang hiển thị hoặc template khác còn tham chiếu tới ảnh đó. Cache template mức gần của `art.js` giữ tối đa 8 template. Geometry và vật liệu tĩnh được chia sẻ; mức xa gộp mesh theo vật liệu, vì vậy chuyển động chi tiết của ngón tay/tà áo không còn được áp dụng riêng trên hình đã gộp ở khoảng cách xa.

Trong kiểm thử Node không có DOM, hàm mặt dùng `DataTexture` màu da có đánh dấu `nodeFallback`. Kiểm thử này xác nhận kích thước và cấu trúc; chất lượng tranh mặt phải được xem bằng WebGL trong trình duyệt. Không dùng ảnh fallback đó làm bằng chứng mỹ thuật.

`src/character-pbr.js` cung cấp `ProceduralCharacterPBRGenerator`. Một bộ gấm gồm năm ảnh đồng bộ: albedo, normal, roughness, metalness và emissive; chúng được gắn thật vào `MeshPhysicalMaterial`. Kích thước gần/vừa/xa lần lượt là 2048/256/64. Nội dung gồm sợi dệt, ombre, bụi sáng, viền và hoa văn thêu nổi; bốn nhóm motif được phân theo đúng 12 nhân vật. Vải dùng sheen 0,85 và sheen roughness 0,25. Năm ảnh RGBA 2048 tương ứng 80 MiB dữ liệu cơ sở trước mipmap và các bản sao của trình duyệt.

Cache PBR trang phục mặc định giữ một bộ mức gần, sáu bộ mức vừa và 12 bộ mức xa. Bộ bị thay khỏi cache mức gần được hạ nội dung xuống 64px trên chính các đối tượng texture còn được model tham chiếu; `prepare()` đưa bộ đang cần hiển thị về đúng mức. Điều này khác cache ảnh mặt riêng ở bảng trên: không tạo năm ảnh 2048 cho mỗi actor ở xa. Việc đổi nhân vật/motif vẫn có chi phí sinh ảnh và tải GPU; giới hạn cache không tự chứng minh màn hình luôn đạt 60 FPS.

Giáp vàng dùng `engravedMaterial()` để chia sẻ normal/roughness/emissive từ atlas thay vì tạo thêm một bộ năm ảnh 2048 cho từng hộ uyển hoặc giáp vai. `applyEngraving()` gắn chạm khắc cho các vật liệu kim loại/gỗ/đá của Hồn khí. Kiểm thử 12 vũ khí và probe WebGL hiện hành đã xác nhận nội dung map và liên kết atlas trên material đang hiển thị; xem [overhaul-browser.json](../acceptance/evidence/overhaul-browser.json). Màu albedo và chi tiết riêng của từng vũ khí được giữ; gương/ngọc/năng lượng giữ vật liệu quang học riêng. Đai nhiều lớp, khóa, ngọc bội và hai tua vẫn là hình học/hoạt ảnh riêng. Đây là bằng chứng tích hợp kỹ thuật, chưa duyệt chất lượng mỹ thuật cuối.

Tóc có normal và bump sợi riêng ở 512/128/64, cùng anisotropy/sheen; không lấy mảng tóc trong ảnh khuôn mặt để giả mái tóc. Da thân dùng roughness 0,42 và sheen 0,35; riêng mặt trước dùng roughness 0,58, sheen 0,15, metalness 0 và clearcoat 0 để hạn chế đốm phản xạ trên mũi. Ngọc, băng, gương và skin có transmission/iridescence theo loại. Ngọc bội dùng transmission 0,8, IOR 1,6 và emissive intensity 0,6. Các vật liệu này không phải mô phỏng quang học hoặc da người hoàn chỉnh.

## Hồn khí và minh họa vật phẩm

`src/weapons.js` dựng 12 Hồn khí theo kích thước mét và vị trí tay: trượng mộc ba nhánh xoắn với sen 12 cánh, đại chùy bát giác, song đao cầm ngược, quạt chín lông, gương nổi, thuẫn tay trái, pháp luân sen lửa, trượng băng điệp, cung tay trái, bốn trảo mỗi tay, cổ cầm ngang bảy dây và trượng song xà. Sen, cánh bướm, pháp luân và một số quầng sáng có nhóm chuyển động riêng.

Nguyệt Linh Kính H05 đặt nổi lệch phải/phía sau thay vì chắn ngang ngực. Mặt gương dùng transmission 0,85 và iridescence 1, với viền vàng có trăng khuyết/mây. Góc cận mặt tiếp tục ẩn riêng các nhóm Hồn khí để không che mắt hoặc cằm. Sảnh bỏ nhãn mã H01–H12 trước người; toast nằm sát trên ở 14px, z-index 9999, không nhận chạm và mờ sau 2,2 giây.

Mỗi vũ khí có nguyên bản và hai biến thể skin; phục trang có bốn biến thể mỗi nhân vật. Thay đổi có cả hình học/phụ kiện và vật liệu. Geometry vũ khí được gộp theo vật liệu trong các nhóm tĩnh; các nhóm cần hoạt ảnh được giữ riêng. Các kiểm thử đo bounding box thật của 108 tổ hợp vũ khí (12 Hồn khí × 3 skin × 3 mức LOD) thay vì chỉ đọc metadata.

`src/item-art.js` cung cấp `MasterworkIconGenerator` và `ProceduralMasterworkAssetEngine`. Danh mục có 149 minh họa Canvas: 7 Hồn Cốt, 12 Hồn Hoàn, 28 Bổ phẩm, 18 Trợ phẩm, 12 vũ khí, 24 skin và 48 kỹ năng. Ảnh được tạo trong ứng dụng và dùng qua Data URL, không cần gọi dịch vụ ảnh ngoài. Các icon là tranh thủ tục; chúng không tự chứng minh đã đạt chất lượng minh họa cuối.

## Camera, LOD và chất lượng dựng hình

`World` dùng camera phối cảnh với góc nhìn trận 48° và vị trí bám có damping. Khoảng cách camera trận là 18 m ở chế độ Cân bằng và 16 m ở chế độ Chi tiết. Trong sảnh, góc toàn thân/cận mặt dựa trên chiều cao nhân vật; có xoay 360° và giữ góc xoay khi đổi ngoại hình.

`THREE.LOD` đăng ký các mức gần tại 0 m, vừa tại 28 m và xa tại 48 m. Model khởi tạo mức xa; khi cần mới thêm mức vừa trong bán kính camera 48 m. Mức gần dùng cho sảnh, hoặc người chơi/Boss trong bán kính 28 m ở chế độ Chi tiết. Các nhân vật khác không đồng thời dùng lưới cận cảnh. Ngưỡng kiểm thử cho nhân vật là ít nhất 50.000 tam giác ở mức gần, tối đa 12.000 ở mức vừa và 2.500 ở mức xa, kể cả các biến thể skin/trang phục được kiểm tra. Mức gần thực tế dày hơn nhiều ngưỡng tối thiểu và vẫn có chi phí đáng kể.

Chế độ Chi tiết dùng `EffectComposer`, `UnrealBloomPass`, `OutputPass`, bóng PCF 4096 và đèn vũ khí. Cân bằng dựng trực tiếp, dùng bóng bản đồ 1024 và giới hạn pixel ratio thấp hơn. Sảnh có bộ đèn riêng: key ấm 2,2, rim 3, fill hemisphere 1,1 và ánh sáng dưới bệ; đèn key sảnh dùng bóng 4096. Những cấu hình này không phải bằng chứng 60 FPS trên Android.

## Sảnh và bảy vùng sinh thái

`src/scenery.js` dựng sảnh riêng gồm bệ ngọc ba bậc, đồ hình Canvas, bốn trụ trang trí rồng, Thiên Môn, núi xa, lớp mây, cánh hoa và hạt sáng. Không dùng sàn lưới xám làm cảnh sảnh.

Địa hình hiển thị dùng `PlaneGeometry(600, 600, 256, 256)` và splatmap Canvas 2048 phân biệt bảy vùng. Chỉ số tam giác được chia thành bảy nhóm material, không đổi vị trí đỉnh. Phần cảnh xa 600 m không mở rộng khu vực chiến đấu: tọa độ gameplay hiện hành vẫn khoảng ±94 m. Hàm độ cao gameplay tiếp tục được dùng cho actor, tia ngắm, loot, công trình và hiệu ứng; núi ngoài biên là cảnh nền.

`src/environment-pbr.js` sinh riêng albedo, tangent-space normal, roughness/height/occlusion đóng gói và emissive cho từng vùng. Rừng có loam/rêu/sợi cỏ; núi có đá vàng/mạch khoáng; đầm có bùn độc ướt; tuyết có băng nứt; hoang mạc có basalt/dung nham; cổ thành có đá chạm khắc; Bí Cảnh có mặt tinh thể. Ảnh lặp 24 × 24 và dùng anisotropy tối đa do renderer báo. Roughness lấy kênh G, height lấy R và micro occlusion lấy B của một texture dùng chung; emission dung nham có dữ liệu ảnh thật.

Trong trình duyệt có Worker, cả bảy vùng luôn giữ bộ PBR dự phòng 128px; mỗi bộ có đủ bốn map và nội dung riêng. Bộ 2048 được tạo trong một Blob Worker chứa mã raster tự đủ, không `importScripts`, URL tài sản hoặc yêu cầu mạng. Worker chuyển quyền sở hữu bốn buffer RGBA về luồng chính rồi tạo `DataTexture`. Chỉ có một job đang chạy, hàng đợi tối đa hai vùng mong muốn; thay vùng liên tục chỉ giữ yêu cầu mới nhất và bỏ kết quả không còn cần.

Cân bằng giữ tối đa một bộ 2048, Chi tiết giữ hai bộ: ngân sách cơ sở lần lượt 64/128 MiB trước mipmap. Bảy bộ dự phòng 128px dùng thêm 1,75 MiB cơ sở. Rời cảnh trận giải phóng các bộ lớn, hủy Worker và thu hồi Blob URL; bộ nhỏ vẫn có thể phục vụ cảnh khi vào lại. Lỗi, timeout hoặc chặn Worker giữ vật liệu PBR nhỏ và dọn trạng thái chờ, không âm thầm chạy một lượt raster 2048 gây khựng trên luồng chính. Node hoặc tích hợp không có Worker giữ API đồng bộ để tạo/kiểm tra texture; `generateBiomeTextureSet()` cũng là hàm đồng bộ chủ động cho QA. Tách CPU bake khỏi vòng render không loại bỏ chi phí tải texture lên GPU và không chứng nhận FPS thiết bị.

Rừng có thân/rễ/nhánh gộp, tán cây nhiều tầng và các cụm instanced. Mỗi bụi cỏ tại tọa độ gameplay có 100 lá thuôn; shader làm lá nghiêng theo gió và tách quanh người chơi. Nhân vật của người chơi trong bụi được giảm opacity còn 60% của giá trị gốc. Culling hiển thị này không thay thế luật tầm nhìn và lọc AOI ở máy chủ.

Nước, đầm độc và lava dùng shader chuyển động với màu/vật liệu riêng; băng có transmission, Bí Cảnh có nền tinh thể và không gian riêng. Nước dùng pháp tuyến sóng giải tích và tia phản xạ từ hướng camera, Fresnel, gradient bầu trời và mặt trăng thủ tục. Phản chiếu thay đổi theo góc nhìn; đây là môi trường thủ tục, không chụp lại vật thể trong cảnh và không phải SSR. Gallery có phép đo GPU hai góc camera với đối chứng tắt phản chiếu; kiểm tra biên dịch shader không thay phép đo FPS trên điện thoại.

Cổng Hồi Hoàn giữ pháp trận đường kính 7 m, nâng thành đế bát giác ba bậc, tám đèn linh hỏa, bốn trụ, tia nối, vòng đồng và lõi vortex shader. Vortex/cột sáng đổi theo trạng thái đóng, báo trước, mở và Overtime Grace. Sáu đài giao dịch có mái ngói lưu ly uốn cong, cột đỏ/vàng, đèn lồng đung đưa và lò luyện có khói shader; ba tế đàn có chín rãnh hội tụ về tinh thạch. Đá bạch ngọc/rãnh Bát Quái ở đài trung tâm dùng texture và nhịp sáng riêng. Hình học môi trường dùng tọa độ tương tác hiện hành, không tự thay đổi bán kính hoặc thời gian gameplay.

## VFX nguyên tố, Hoàn và điều khiển kỹ năng

`src/environment-vfx.js` dùng biến dạng vertex/fragment riêng cho 12 hệ Mộc, Thổ, Phong, Lôi, Quang, Thủy, Hỏa, Băng, Ám, Kim, Âm Luật và Độc. Các ribbon chia sẻ hình học, thay uniform khi phát; số hiệu ứng hoạt động có giới hạn 128. Không xây lại texture/hình học mỗi khung hình. Cảnh và va chạm gameplay tiếp tục do mô phỏng quyết định; shader không tự gây sát thương.

`src/soul-ring-vfx.js` cung cấp `syncSoulRingVisuals()` đọc đúng hai khe `actor.rings`, tạo vành dưới chân và sau lưng cho từng Hoàn đã trang bị. Khe rỗng không được tạo Hoàn giả. Màu tím/đen lấy từ bảng `RINGS`; văn tự được vẽ bằng nét hình học, có vòng gợn/phát sáng và xoay ngược chiều giữa hai khe. Texture 512 ở mức gần hoặc 256 ở mức vừa/xa được chia sẻ theo ID, còn material thuộc riêng từng root. Thay Hoàn hoặc clone phải đồng bộ lại để không sửa hào quang của nhân vật khác; không dùng một cờ “có Hoàn đen” thay cho hai khe thật.

`src/smooth-skillshot.js` giữ pointer joystick trái và pointer kỹ năng phải độc lập. Hệ thống nhận `PointerEvent`/capture, dùng deadzone 10px và bán kính kéo 75px, đổi vector màn hình sang mặt phẳng thế giới theo azimuth camera. One-Euro xử lý tín hiệu đầu vào, sau đó hướng ngắm và tâm đất nội suy mỗi khung với hệ số `1 - exp(-28 * dt)` và `1 - exp(-25 * dt)`.

`src/skill-indicators.js` hiển thị vòng tầm, mũi tên/chevron, quạt, vòng AOE/quỹ đạo parabol hoặc tether khóa mục tiêu. Decal đặt cao hơn mặt đất 0,06 m; phép chiếu dùng chung với `Match.cast`, giữ range/shape/hitbox theo kỹ năng và nhánh đang chọn. Vòng cảnh báo trúng chiêu chỉ lấy thực thể nhìn thấy/cùng realm, không tái dựng địch đã bị AOI giấu.

Bấm nhanh dưới 160ms hoặc kéo dưới 10px dùng mục tiêu hợp lệ trong tầm và dự đoán chuyển động từ các snapshot quan sát được; hệ số dẫn là `distance / projectileSpeed × 0,65`. Hủy trong bán kính 75px đổi decal đỏ, rung khi có hỗ trợ và không gửi cast. Hàng đợi có TTL 0,25 giây, chỉ nhận khi CD còn tối đa 0,20 giây hoặc backswing còn tối đa 0,25 giây. MP/CD/CC, mục tiêu và phạm vi vẫn được bộ luật/server kiểm tra. Kiểm thử dùng bước 1/60 và 1/120 giây xác nhận tính hội tụ, không phải phép đo 60/120 FPS hoặc độ trễ cảm ứng trên Android.

## Auto Farm và quyền điều khiển

`src/auto-farm.js` nối qua adapter lệnh di chuyển, cast, nhặt UUID, shop, hấp thu và Hồi Hoàn; không gán trực tiếp vị trí, HP, ví, túi hoặc trang bị. Nút HUD có ba chế độ Tắt, Săn quái/nhặt đồ và Toàn diện, với sáu tùy chỉnh Q/W/E, R lên Boss/tinh anh, loot/thẩm định, mua/ghép, thả diều và tránh nguy hiểm. Người dùng giữ joystick hoặc kỹ năng sẽ ưu tiên thao tác tay ngay, tới 1,2 giây sau khi ngón cuối nhả ra.

AI chấm utility mỗi 0,25 giây, chỉ dùng thực thể nhìn thấy và cùng realm; bán kính yêu cầu không mở rộng quyền nhìn server. Combo riêng của 12 nhân vật dùng `skillFor()` cùng chi phí/CC/CD thật và giữ tối thiểu 25% Hồn lực sau chiêu farm. PvE luôn giữ R/F dù tùy chỉnh R đang bật. Chế độ Toàn diện thêm đánh trả, rút lui, hấp thu đúng Tag/khe trong 8 giây và tìm Cổng khi túi đạt 40W hoặc tới phút 15/20. Đường đi có A* tránh vật cản và ưu tiên giảm phơi nhiễm Hồn Chướng; khi Cổng nằm trong vùng nhiễm, đường rút có thể phải cắt qua vùng đó nhưng vẫn tránh vùng kỹ năng nguy hiểm.

Loot ưu tiên Hồn Cốt, Tiên khí, Hoàn đen/tím, đồ khác; đồ quý chờ thẩm định 0,8 giây trước lệnh nhặt từng UUID. Luật 24 ô/48W, realm và khóa ưu tiên đội vẫn áp dụng. Mua/ghép dùng 12 preset, bảy công thức và giới hạn bảy ô qua giao dịch gốc; vốn mang vào được trừ trước. Cả món đích và nguyên liệu đều qua `mismatch()`: món bị chặn được báo, không sửa vai trò/chỉ số GDD để vượt Phản Phệ. Planner chỉ bắt đầu mua vật liệu khi đủ toàn bộ chi phí còn lại và phí ghép, tránh vòng mua/bán hao tiền khi thiếu vốn. Gói Hồi Hoàn vượt 48W dùng Hoãn Nhân Hồi nếu đang có; nếu không, Auto dừng ở yêu cầu chọn đồ an toàn, không tự vứt chiến lợi phẩm.

## Hồn thú và Boss

`src/creature-art.js` dựng riêng bốn silhouette: sói, tê giác, chim lửa và bướm băng. `src/creature-pbr.js` cung cấp bề mặt da/lông/vảy/giáp theo loài ở 512/128/32, có albedo, normal, roughness và kênh hiệu ứng thích hợp. Chim lửa có 12 lông mỗi cánh, ba dải đuôi và hạt tàn; bướm có cánh pha lê, sói/tê giác có khớp chân và hoa văn phong/đá nứt. Ba Boss có dữ liệu gốc là Thái Nhạc Cự Viên cao 4,5 m, Lôi Diễm Kỳ Lân cao 4 m và Hư Không Cổ Long dài 12 m. Kích thước Boss được chuẩn hóa từ bounding box của lưới; cánh, đuôi, tay, sừng, vảy, khói hoặc điện huyết có hình học/hoạt ảnh riêng.

Biến dị tăng kích thước hiển thị 1,35 lần và thêm sừng/điện huyết; hệ số HP 1,6 vẫn thuộc mô phỏng gameplay gốc. Lựa chọn loài hiển thị không tự đổi tên chiến đấu, chỉ số hoặc phần thưởng. Boss thứ tư chưa có đặc tả gốc nên chưa được tạo; không tự đặt tên hoặc công thức để lấp chỗ thiếu.

## Pipeline Blender tùy chọn

`public/art/moc-tinh-truong/` giữ bộ GLB tĩnh từ pipeline Blender cũ: high 120.068 tam giác, medium 12.000 và low 2.500, kèm report/checksum. `src/staff-asset.js` nhúng dữ liệu để PWA, HTML độc lập và APK không cần CDN.

Bộ GLB này là tài nguyên dự phòng/lưu dấu nguồn, không tự ghi đè trượng H01 mới. Nhân vật có `userData.anatomy` giữ trượng thủ tục chạm rồng/sen; nhánh thay GLB chỉ còn áp dụng với model H01 cũ không có metadata giải phẫu. Số đo hình học của nhân vật mới vì vậy không cộng một bản trượng GLB thay thế ngoài ý muốn.

Có thể dựng lại tài nguyên tĩnh bằng Blender 4.3.2 CPU:

```sh
blender --background --factory-startup --threads 2 --python-exit-code 1 \
  --python tools/art/blender-pipeline.py -- --demo \
  --output .local/art-rebuild/moc-tinh-truong --preview
```

Script xuất `source.blend`, ba GLB, ảnh preview và report; Cycles denoise tắt vì bản Blender cloud không có OpenImageDenoise. Pipeline này gộp và giảm lưới tài nguyên tĩnh; nó không bảo toàn rig/animation của asset nhập ngoài. Rig nhân vật hiện chạy bằng nhóm khớp Three.js. Không cần chạy Windows EXE hoặc đổi `HOME`.

Nếu thay các GLB dự phòng, phải cập nhật cả dữ liệu nhúng:

```sh
python3 - <<'PY'
from pathlib import Path
import base64, json
root = Path('public/art/moc-tinh-truong')
assets = {
    detail: 'data:model/gltf-binary;base64,' + base64.b64encode((root / (detail + '.glb')).read_bytes()).decode()
    for detail in ['high', 'medium', 'low']
}
Path('src/staff-asset.js').write_text(
    '// Generated from local Blender GLB outputs.\nexport const staffAssets = ' + json.dumps(assets) + ';\n'
)
PY
```

Thay nguồn hoặc asset làm đổi fingerprint và cần kiểm chứng/build APK lại. Không giữ dữ liệu nhúng cũ sau khi thay riêng file GLB. Tệp Blender nguồn của lần dựng ban đầu nằm ngoài repo tại `/workspace/asset-tools`; công cụ dựng lại được lưu trong `tools/art/`.

## Kiểm chứng và giới hạn nghiệm thu

```sh
npm test
npm run test:master
npm run test:upgrade-ui
npm run test:master-ui
npm run test:overhaul-ui
npm run verify:automated
npm run verify:master
npm run verify:upgrade
npm run verify:overhaul
npm run verify:reuse
```

Các bài UI cần frontend và dịch vụ theo cấu hình kiểm thử; có thể đặt `GAME_URL` khi dùng cổng khác. Kiểm thử Node đo lưới, chiều cao đầu/thân, cây khớp, tay/ngón, số đỉnh tà áo, các ngưỡng LOD, khoảng hở áo/chân và kích thước vũ khí. Kiểm thử trình duyệt cần xác nhận ảnh mặt, toàn thân, mặt sau, góc camera, texture, shader, thao tác cảm ứng và lỗi WebGL. Chỉ dùng báo cáo khớp fingerprint hiện hành làm bằng chứng; không suy ra mỹ thuật đạt chỉ từ số tam giác.

Phép đo HUD dùng hợp các hình chữ nhật bao phần UI mặc định, không có drawer hoặc tương tác ngữ cảnh gần; tính cả góc trong suốt của nút tròn nên khá bảo thủ. Drawer, vùng hủy chiêu và các lớp tương tác mở có chủ đích cần kiểm tra riêng.

Đây vẫn là bộ tài nguyên thủ tục chia sẻ topology, chất liệu và nhiều primitive. Chưa có chứng nhận mỹ thuật AAA hoặc đo FPS/nghiệm thu cảm ứng trên Android vật lý. SwiftShader/Chromium cloud không thay thế kiểm chứng thiết bị thật. Dữ liệu Boss thứ tư và chỉ số/độ bền Tiên khí đang chờ nguồn bổ sung theo quyết định của người dùng. Các mục tương ứng cùng audit GDD và nghiệm thu mỹ thuật cuối giữ trạng thái chưa đạt; tài liệu này không công bố dự án hoàn thành 100%.


Ở chế độ cận mặt, World ẩn riêng các nhóm Hồn khí để vũ khí không che mắt/cằm; trở về toàn thân sẽ phục hồi đúng trạng thái hiển thị trước đó. Tóc, phụ kiện đầu, áo, yaw và các clone dùng trong trận giữ độc lập. Bộ kiểm tra chân dung dùng đủ 12 rig và trường hợp Sở Băng Nghi ở mức gần, gồm vũ khí hai tay và clone mới.


Cổ cầm H11 giữ trục dài 1,3 m và bảy dây thực, mặt dây hướng lên và nghiêng về trước. Tư thế hai tay được giữ qua hoạt ảnh gảy đàn; kiểm thử đo mặt phẳng batch dây và đầu ngón trỏ ở nhiều khung hình, thay vì chỉ đếm metadata số dây.

## Cập nhật pipeline offline 17/10/2026

Các phần procedural phía trên mô tả model legacy. H01/H02 trang phục gốc hiện dùng GLB Hunyuan đã được duyệt thử nghiệm theo AGENTS.md. `assets/base_models/` là nguồn giữ nguyên; `assets/optimized/` chứa bản dẫn xuất,13 biến thể được publish qua registry runtime. Không tái sinh người/vũ khí bằng MCP hoặc primitives trong đợt này.

`npm run assets:optimize` dùng Meshopt16bit và ETC1S/UASTC, giữ nguyên toàn bộ dữ liệu animation sau khi đọc lại đầu ra. `src/model-loader.js` dùng loader chung; cache template theo URL, actor clone giữ lease, bản thường làm dự phòng. `assets:bake:characters` bake24 preset low/medium thành120map KTX2 +PNG. Không nhận đây là hoàn tất ba mức chất lượng hoặc bộ icon512: hai quyết định đó còn chờ người dùng. Xem PERF-PHASE-1.md đến PERF-PHASE-4.md và PERF-REPORT.md.
