# Đồ họa và pipeline tài nguyên V2.5

Yêu cầu hiện hành nằm trong [Master Prompt (2)](requests/MASTER-ENGINEERING-ART-V2.5.md), với điều kiện nghiệm thu tại [MASTER-GOAL.md](MASTER-GOAL.md). Các điều kiện GDD và [UPGRADE-GOAL.md](UPGRADE-GOAL.md) trước đó vẫn có hiệu lực. Tài nguyên hiện tại được dựng bằng thuật toán Three.js, Canvas và một pipeline Blender chạy trên Linux. Không có tài nguyên nào được nhận là sản phẩm suy luận của Sinnon hoặc mô hình AI.

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

`generateHighResCharacterFaceTexture()` vẽ da, má, mắt, iris nhiều lớp, tia vân mắt, ba catchlight, mí/mày, bóng mũi và môi bằng Canvas 2D. Ảnh được gắn vào UV của lưới đầu; không có hai khối cầu lồi làm mắt. Vị trí môi được đặt theo UV toàn bộ đầu để không kéo dài phần cằm về mặt thị giác.

| Mức hiển thị | Kích thước texture mặt | Cách tạo |
|---|---:|---|
| Gần / sảnh | 2048 × 2048 | Canvas đủ độ phân giải |
| Vừa | 256 × 256 | Vẽ cùng hệ tọa độ mỹ thuật vào canvas nhỏ |
| Xa | 64 × 64 | Vẽ trực tiếp canvas nhỏ, không tạo mặt 2048 trước |

Cache texture mặt giữ tối đa 4 ảnh 2048 và 12 ảnh cho mỗi kích thước 256/64. Việc bỏ một ảnh khỏi cache không bảo đảm thu hồi ngay bộ nhớ khi model đang hiển thị hoặc template khác còn tham chiếu tới ảnh đó. Cache template mức gần của `art.js` giữ tối đa 8 template. Geometry và vật liệu tĩnh được chia sẻ; mức xa gộp mesh theo vật liệu, vì vậy chuyển động chi tiết của ngón tay/tà áo không còn được áp dụng riêng trên hình đã gộp ở khoảng cách xa.

Trong kiểm thử Node không có DOM, hàm mặt dùng `DataTexture` màu da có đánh dấu `nodeFallback`. Kiểm thử này xác nhận kích thước và cấu trúc; chất lượng tranh mặt phải được xem bằng WebGL trong trình duyệt. Không dùng ảnh fallback đó làm bằng chứng mỹ thuật.

Nhân vật dùng `MeshPhysicalMaterial`; vải và kim loại có normal/roughness procedural 1024. Da dùng roughness 0,42 và sheen 0,35. Ngọc, băng, gương và skin có cấu hình transmission/iridescence theo loại. Hồn thú dùng bộ normal/roughness 256 ở mức gần cho da, lông và kim loại. Không phải mọi chất liệu đều có đủ bộ diffuse/metalness/bump/displacement 1024 riêng.

## Hồn khí và minh họa vật phẩm

`src/weapons.js` dựng 12 Hồn khí theo kích thước mét và vị trí tay: trượng mộc ba nhánh xoắn với sen 12 cánh, đại chùy bát giác, song đao cầm ngược, quạt chín lông, gương nổi, thuẫn tay trái, pháp luân sen lửa, trượng băng điệp, cung tay trái, bốn trảo mỗi tay, cổ cầm ngang bảy dây và trượng song xà. Sen, cánh bướm, pháp luân và một số quầng sáng có nhóm chuyển động riêng.

Mỗi vũ khí có nguyên bản và hai biến thể skin; phục trang có bốn biến thể mỗi nhân vật. Thay đổi có cả hình học/phụ kiện và vật liệu. Geometry vũ khí được gộp theo vật liệu trong các nhóm tĩnh; các nhóm cần hoạt ảnh được giữ riêng. Các kiểm thử đo bounding box thật của 108 tổ hợp vũ khí (12 Hồn khí × 3 skin × 3 mức LOD) thay vì chỉ đọc metadata.

`src/item-art.js` cung cấp `MasterworkIconGenerator` và `ProceduralMasterworkAssetEngine`. Danh mục có 149 minh họa Canvas: 7 Hồn Cốt, 12 Hồn Hoàn, 28 Bổ phẩm, 18 Trợ phẩm, 12 vũ khí, 24 skin và 48 kỹ năng. Ảnh được tạo trong ứng dụng và dùng qua Data URL, không cần gọi dịch vụ ảnh ngoài. Các icon là tranh thủ tục; chúng không tự chứng minh đã đạt chất lượng minh họa cuối.

## Camera, LOD và chất lượng dựng hình

`World` dùng camera phối cảnh với góc nhìn trận 48° và vị trí bám có damping. Khoảng cách camera trận là 18 m ở chế độ Cân bằng và 16 m ở chế độ Chi tiết. Trong sảnh, góc toàn thân/cận mặt dựa trên chiều cao nhân vật; có xoay 360° và giữ góc xoay khi đổi ngoại hình.

`THREE.LOD` đăng ký các mức gần tại 0 m, vừa tại 28 m và xa tại 48 m. Model khởi tạo mức xa; khi cần mới thêm mức vừa trong bán kính camera 48 m. Mức gần dùng cho sảnh, hoặc người chơi/Boss trong bán kính 28 m ở chế độ Chi tiết. Các nhân vật khác không đồng thời dùng lưới cận cảnh. Ngưỡng kiểm thử cho nhân vật là ít nhất 50.000 tam giác ở mức gần, tối đa 12.000 ở mức vừa và 2.500 ở mức xa, kể cả các biến thể skin/trang phục được kiểm tra. Mức gần thực tế dày hơn nhiều ngưỡng tối thiểu và vẫn có chi phí đáng kể.

Chế độ Chi tiết dùng `EffectComposer`, `UnrealBloomPass`, `OutputPass`, bóng PCF 4096 và đèn vũ khí. Cân bằng dựng trực tiếp, dùng bóng bản đồ 1024 và giới hạn pixel ratio thấp hơn. Sảnh có bộ đèn riêng: key ấm 2,2, rim 3, fill hemisphere 1,1 và ánh sáng dưới bệ; đèn key sảnh dùng bóng 4096. Những cấu hình này không phải bằng chứng 60 FPS trên Android.

## Sảnh và bảy vùng sinh thái

`src/scenery.js` dựng sảnh riêng gồm bệ ngọc ba bậc, đồ hình Canvas, bốn trụ trang trí rồng, Thiên Môn, núi xa, lớp mây, cánh hoa và hạt sáng. Không dùng sàn lưới xám làm cảnh sảnh.

Địa hình hiển thị dùng `PlaneGeometry(600, 600, 256, 256)` và splatmap Canvas 2048 phân biệt bảy vùng. Phần cảnh xa 600 m không mở rộng khu vực chiến đấu: tọa độ gameplay hiện hành vẫn khoảng ±94 m. Hàm độ cao gameplay tiếp tục được dùng cho actor, tia ngắm, loot, công trình và hiệu ứng; núi ngoài biên là cảnh nền.

Rừng có thân/rễ/nhánh gộp, tán cây nhiều tầng và các cụm instanced. Mỗi bụi cỏ tại tọa độ gameplay có 100 lá thuôn; shader làm lá nghiêng theo gió và tách quanh người chơi. Nhân vật của người chơi trong bụi được giảm opacity còn 60% của giá trị gốc. Culling hiển thị này không thay thế luật tầm nhìn và lọc AOI ở máy chủ.

Nước, đầm độc và lava dùng shader chuyển động với màu/vật liệu riêng; băng có transmission, Bí Cảnh có nền tinh thể và không gian riêng. Nước dùng pháp tuyến sóng giải tích và tia phản xạ từ hướng camera, Fresnel, gradient bầu trời và mặt trăng thủ tục. Phản chiếu thay đổi theo góc nhìn; đây là môi trường thủ tục, không chụp lại vật thể trong cảnh và không phải SSR. Gallery có phép đo GPU hai góc camera với đối chứng tắt phản chiếu; kiểm tra biên dịch shader không thay phép đo FPS trên điện thoại.

Cổng Hồi Hoàn có pháp trận đường kính 7 m, bốn tinh thể, vortex và trạng thái đóng/báo trước/mở/Overtime Grace. Sáu đài giao dịch được thể hiện bằng đình mái cong, ba tế đàn bằng công trình đá khắc. Hình học môi trường dùng tọa độ tương tác hiện hành, không tự thay đổi bán kính hoặc thời gian gameplay.

## Hồn thú và Boss

`src/creature-art.js` dựng riêng bốn silhouette: sói, tê giác, chim lửa và bướm băng. Ba Boss có dữ liệu gốc là Thái Nhạc Cự Viên cao 4,5 m, Lôi Diễm Kỳ Lân cao 4 m và Hư Không Cổ Long dài 12 m. Kích thước Boss được chuẩn hóa từ bounding box của lưới; cánh, đuôi, tay, sừng, vảy, khói hoặc điện huyết có hình học/hoạt ảnh riêng.

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
npm run verify:automated
npm run verify:master
npm run verify:upgrade
npm run verify:reuse
```

Các bài UI cần frontend và dịch vụ theo cấu hình kiểm thử; có thể đặt `GAME_URL` khi dùng cổng khác. Kiểm thử Node đo lưới, chiều cao đầu/thân, cây khớp, tay/ngón, số đỉnh tà áo, các ngưỡng LOD, khoảng hở áo/chân và kích thước vũ khí. Kiểm thử trình duyệt cần xác nhận ảnh mặt, toàn thân, mặt sau, góc camera, texture, shader, thao tác cảm ứng và lỗi WebGL. Chỉ dùng báo cáo khớp fingerprint hiện hành làm bằng chứng; không suy ra mỹ thuật đạt chỉ từ số tam giác.

Phép đo HUD dùng hợp các hình chữ nhật bao phần UI mặc định, không có drawer hoặc tương tác ngữ cảnh gần; tính cả góc trong suốt của nút tròn nên khá bảo thủ. Drawer, vùng hủy chiêu và các lớp tương tác mở có chủ đích cần kiểm tra riêng.

Đây vẫn là bộ tài nguyên thủ tục chia sẻ topology, chất liệu và nhiều primitive. Chưa có chứng nhận mỹ thuật AAA hoặc đo FPS/nghiệm thu cảm ứng trên Android vật lý. SwiftShader/Chromium cloud không thay thế kiểm chứng thiết bị thật. Dữ liệu Boss thứ tư và chỉ số/độ bền Tiên khí đang chờ nguồn bổ sung theo quyết định của người dùng. Các mục tương ứng cùng audit GDD và nghiệm thu mỹ thuật cuối giữ trạng thái chưa đạt; tài liệu này không công bố dự án hoàn thành 100%.


Ở chế độ cận mặt, World ẩn riêng các nhóm Hồn khí để vũ khí không che mắt/cằm; trở về toàn thân sẽ phục hồi đúng trạng thái hiển thị trước đó. Tóc, phụ kiện đầu, áo, yaw và các clone dùng trong trận giữ độc lập. Bộ kiểm tra chân dung dùng đủ 12 rig và trường hợp Sở Băng Nghi ở mức gần, gồm vũ khí hai tay và clone mới.


Cổ cầm H11 giữ trục dài 1,3 m và bảy dây thực, mặt dây hướng lên và nghiêng về trước. Tư thế hai tay được giữ qua hoạt ảnh gảy đàn; kiểm thử đo mặt phẳng batch dây và đầu ngón trỏ ở nhiều khung hình, thay vì chỉ đếm metadata số dây.
