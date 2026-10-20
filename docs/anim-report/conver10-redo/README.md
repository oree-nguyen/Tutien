# Thực hiện lại conver10 sau báo cáo 445/303 MB

Mốc trước sửa đã đăng `main` tại `813b5ef`: [baocao445-300.md](../../../baocao445-300.md). Đây là nhật ký sửa tiếp theo, không viết lại kết quả audit. Các GLB thử nghiệm không đạt được lưu trong `.local/rig-candidates/`, không đóng thêm vào APK mặc định và không thay actor đang chạy.

## Đã sửa trong mã nguồn

- Build mặc định không mang `models/rig-review/`; chỉ thêm khi chủ động đặt `HG_INCLUDE_RIG_REVIEW=1`. Kiểm tra ba lượt mặc định → bật review → mặc định xác nhận không giữ bản review cũ. Tất cả 507 tài nguyên chung của hai APK trong audit vẫn giữ nguyên hash.
- Cache model dùng một định danh URL cho cả load/release. Mỗi actor giữ lease riêng; giải phóng actor này không hủy geometry/texture của actor khác. Owner bị bỏ trong lúc decode không được nhận lại lease từ fallback GPU đến muộn.
- Hủy warmup sẽ dừng các lượt upload/compile tiếp theo. Các bản sao material và skeleton được giải phóng riêng, không dispose nhầm dữ liệu GLB nguồn dùng chung.
- Replay/seek xóa trạng thái `complete` cũ và cập nhật pose ngay trong lần gọi. Đây là sửa công cụ kiểm tra trạng thái/hiển thị, không thay rig sản xuất bằng rig thử.
- Prefab trượng giữ lạnh; chỉ bản đang hiển thị mới hydrate. Đường release đi tới owner trượng lồng trong LOD; đối tượng đã dispose không được tải lại từ animation callback muộn.
- Bản HTML standalone lấy CSS qua manifest của entry động. GLB được nhúng nguyên byte, kiểm SHA256 và ghi tuần tự ngoài bộ minify JavaScript. `npm run build` đã chạy thành công, HTML **465.242.752 byte**; đây là kích thước HTML, **không phải APK mới**. File kiểm tra nằm ngoài bộ artifact phát hành để không đẩy nhầm bản đang nghiệm thu.

Texture, UV, pixelRatio và ánh sáng sản xuất không bị giảm trong các sửa này. Không đổi GDD, ví/kho/vault/HMAC.

## Tách áo: điều gì đã làm và còn sai

Graph dùng các cạnh biên UV đối nhau thực sự của nguồn; không nối hai lớp áo bằng phép tìm điểm XYZ gần nhất. Mỗi mặt/đỉnh được lưu định danh nguồn, hash và nguồn gốc, để kiểm tra không mất/đảo tam giác. Bộ kiểm định dựng lại cặp biên độc lập, kiểm cả nhiều primitive trong cùng node và node trùng tên; không coi `0 cặp đã đo` là chứng nhận seam.

Phân vùng v4 đã đưa các mảng viền vàng ở cổ tay từ vạt dưới về miền tay áo. Ảnh cô lập trước/sau vẫn cần duyệt đường cắt, trim và phần da dính theo cổ tay. Không tạo thân người giả trong vùng nguồn không có bề mặt.

Trọng số đã được mở miền tới Hips/Spine, không còn ép cả vạt áo dài chỉ theo bốn xương tay. V6 dùng năng lượng FEM với diện tích nguồn và giải bound có kiểm KKT từng trường xương trước chuẩn hóa. Điều này **chưa bảo đảm** mesh sau rút bốn ảnh hưởng sẽ biến dạng đạt.

| Kiểm tra trên các bản thử | Kết quả |
| --- | --- |
| Số tam giác nguồn H01 | Giữ đủ 1.499.726 |
| UV và ảnh texture nguồn | Giữ nguyên, đối chiếu hash/byte |
| Các cặp seam nguồn ở bản semantic đã đo | Khoảng 146 nghìn cặp, khe hở 0 mm trong các pose đã kiểm |
| V3/v5/v6 toàn thân khi nâng tay | Vẫn vượt ngưỡng strain 1,5 / 2,0; bị loại |
| Hạn chế còn lại | Phồng/kéo áo ở tư thế lớn; biên cổ tay/eo chưa nghiệm thu |

Chi tiết, gồm cả thất bại, nằm ở [SEMANTIC-GARMENT.md](../../../tools/rig/SEMANTIC-GARMENT.md), `../semantic-garment*/` và `validation/`. Không lấy việc giữ đủ tam giác hoặc seam kín làm chứng minh áo đã đúng.

V7 đã gom thêm **348.389 mặt lớp lót/vải có sẵn** từ phần thân còn lại vào hai vạt. Giữ toàn bộ nguồn, tám primitive kiểm riêng; bind 8/8 đạt, pose nâng tay 3/8 đạt. Vạt ngoài cũ vẫn báo lỗi, không dùng lớp lót để pha loãng chỉ số. Xem [báo cáo và ảnh cô lập v7](../semantic-garment-v7/README.md).

Corrective offline giảm kéo giãn nhưng tạo giao cắt mới: ở lượt penalty 1000, số cặp mặt cắt nhau tăng **2.169 → 9.825**, gồm **8.483 cặp mới**. Đây là phép đo mesh ở cùng pose; không phải FPS hoặc chứng nhận thể tích. Bản này bị loại dù nhiều chỉ số strain tốt hơn. Các lượt siết giới hạn giải và mở miền vải vẫn chưa đạt tất cả primitive, không kích hoạt.

## Rig và animation: chỉ mới đạt từng phần

Đã thêm dữ liệu tay cầm theo từng tướng, FK bake 60 Hz, kiểm quaternion/binding/loop và controller giữ mixer/action thay vì dựng lại. Các bản full Entrance thử nghiệm có thời lượng H01 4,1 s, H02 3,5 s, cùng IDLE_HOLD 4 s. Các lượt mới đã loại được vi phạm giới hạn khớp trong bộ frame kiểm, nhưng chưa đủ để nghiệm thu toàn chuỗi.

Đã phát hiện cần kiểm **đế giày mesh thật** thay vì chỉ tọa độ ankle/toe. Trọng số boot cũ có thể làm mesh xuyên sàn dù IK báo chân được neo. Miền boot đang được xác minh bằng liên thông bề mặt và ảnh nguồn; không dùng cả hộp thấp theo trục Y vì sẽ lẫn gấu áo.

H02 đã có kiểm tiếp xúc độc lập trên **30.984 tam giác nguồn bàn tay/cổ tay trái**, với khoảng cách lòng bàn tay khoảng **3,079 mm**, hướng đối mặt **0,822** và cận xuyên bảo thủ **3,000 mm**. Đây là pass riêng của contact test tại một pose; độ ôm/ngón tay và toàn animation vẫn phải đạt. Không chuyển chứng nhận này sang GLB/pose có hash khác.

Tư thế, bộ frame, ảnh và kết quả FK lưu trong `animation/`, sửa boot trong `feet/`, grip trong `h02-left-grip/`. Các tư thế/GLB mới **chưa được đưa vào sảnh hoặc trận**.

## Kiểm tra và phạm vi chứng minh

| Lệnh / phạm vi | Kết quả đã ghi nhận |
| --- | --- |
| `npm test`, lượt 20/10/2026 | 267/267 pass |
| `npm run test:master` | 215/215 pass |
| `npm run verify:master` | BLOCKED 0/37, không đổi ngưỡng |
| Cache/warmup regression mới nhất | 13/13 pass |
| Standalone payload/CSS regression | 4/4 pass |
| HTML offline `standalone-current` | Pass: một tài liệu cục bộ, không request ngoài/mất file, H01/H02 nguồn 4096 và nút tiếp tục trận; vẫn ở sảnh sau 10 s |
| Browser source lifecycle `source-lifecycle-final-7` | Pass: 6 trạng thái H01/H02, texture 4096, không page/console error; lease trượng 1 → 0 khi đổi tướng |
| `npm run build` sau sửa standalone | Pass, HTML 465.242.752 byte |
| Rig goal toàn bộ | Chưa đạt; không tạo APK chẩn đoán rồi gọi là rig mới |
| Android thật / FPS / RAM thiết bị | Chưa đo, không có điện thoại kết nối |

Functional browser dùng Chromium/SwiftShader ở cloud, DPR 1 chỉ là điều kiện bài test. Các ảnh và báo cáo `source-lifecycle-*` kiểm tra source → driver seek → source, texture nguồn 4096 và vòng đời tài nguyên. Một số lượt thất bại được giữ nguyên: có lỗi sản phẩm đã sửa, timeout chụp ảnh khi nhiều phiên phần mềm chạy đồng thời, và một predicate async của Playwright được sửa thành predicate đồng bộ để thực sự chờ chuyển trạng thái. Không xóa bằng chứng thất bại hoặc hạ assertion ownership.

Sổ ảnh nguyên bản, thời gian đăng ký ngay bên dưới và đường dẫn nguồn: [picture/conver10/online-pic.md](../../../picture/conver10/online-pic.md). Manifest capture ghi giờ chụp riêng; giờ đăng ký không được gọi là giờ chụp.


## Kiểm tiếp xúc và chuyển động bổ sung

`h02-left-grip/exact-contact-independent-fk.json` tính lại bốn mốc mỗi ngón từ **node/xương thật và inverse bind**, không dùng tọa độ thắng do solver báo làm chứng minh. Sai số Python–Node lớn nhất khoảng 3,77e-9 m. Contact lòng bàn tay đạt riêng; wrap/tổng gập của ngón cái và út còn fail, vì vậy toàn grip vẫn fail.

[Báo cáo bounded IK](animation/bounded-fit-experiment.md) giữ cả kết quả kém hơn: sai số sau lọc có thể lớn hơn trước lọc. Thử nghiệm này mặc định tắt và chưa sửa được quỹ đạo liên tục. [Boot v4](feet/v4/README.md) chạm sàn tốt hơn nhưng kéo hỏng cạnh biên, cũng bị loại. Không dùng một phép đo riêng để gọi rig hoàn thành.


## Thử trực tiếp độ giãn cạnh và vùng dính tay áo–eo

[Giải trọng số theo pose](pose-weight-held/README.md) giảm kéo giãn lớn nhất khoảng15,90 →4,63 trên cạnh duy nhất nhưng vẫn fail kiểm từng primitive; giao cắt tăng2.169 →4.098. [Thử support độc lập ở vùng dính](detached-coat-trial/README.md) làm mất dải kéo ở eo trong ảnh, nhưng mở đường nối và làm hỏng cổ tay. Cả hai bị loại, không đổi checker và chưa có đường cắt nào được duyệt. Ảnh, hash và số đo đều lưu; không chuyển thử nghiệm thành tuyên bố rig đã sửa.

Lượt FEM radius0,30m cũng [thất bại](../semantic-garment-wide/README.md). Các lượt này không phải thay đổi ánh sáng/texture/độ phân giải và không được đóng vào APK.


Kiểm tra cuối lượt này: `npm test` **267/267**, `test:master` **215/215**; `verify:master` **BLOCKED0/37**, rig goal **BLOCKED**. Log nguyên bản trong `checks/*latest*`. Sổ conver10 có **383 ảnh nguyên byte**, đã đối chiếu bản sao trên Git. Kết quả vẫn chưa đạt100%; APK lịch sử445MB chưa được thay bằng một rig được nghiệm thu.
