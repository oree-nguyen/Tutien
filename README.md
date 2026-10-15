# Hồn Giới: Sinh Tồn — WebGL / Android

Game Three.js r160, giao diện cảm ứng ngang tiếng Việt, có chế độ ngoại tuyến với bot và chế độ online dùng máy chủ có thẩm quyền. **Điều kiện gọi bản chuẩn hoàn tất nằm trong [GOAL.md](GOAL.md); số kiểm thử đạt không thay nghiệm thu 100% GDD hoặc FPS trên điện thoại thật.**

Yêu cầu thay toàn bộ model bằng Tencent ngày 16/10/2026 có [pipeline/MCP và trạng thái riêng](docs/tencent-3d/README.md). Sau Publish, cả ba API đã kết nối được; danh mục có 167 mục sinh/biến thể và audit 118 vị trí geometry cùng ba GLB legacy. FLUX đã sinh concept H01 thật; Hunyuan hiện thiếu quota ZeroGPU (135 giây yêu cầu, 122 giây còn lại). Hàng đợi lưu checkpoint/backoff; chưa có GLB mới hoặc model Tencent trong game/APK.

## Chạy

```sh
cd /workspace/Tutien
npm ci --cache /workspace/.npm-cache
npm run dev
```

Ngoại tuyến không cần API key, tài khoản hoặc cơ sở dữ liệu. Tài khoản mẫu 2.000 NB / 5.000 TB, một bản mỗi Hoàn/Cốt, một Vé Sự Kiện; tiến trình trận và ví/kho lưu trong một bản ghi localStorage. Reload khôi phục trận cùng tham chiếu actor, Hoàn đang ký quỹ, vùng kỹ năng, đạn và timer. Không coi localStorage là chống gian lận.

```sh
npm run services  # PostgreSQL 17 + Redis 8, Docker; chỉ bind loopback
npm run server    # API/WebSocket có thẩm quyền, cổng 3001
npm run dev       # Vite tự chuyển /api và /socket đến backend
```

Ở Hồn Thành bấm **Đăng nhập online** để tạo tài khoản hoặc đăng nhập. Ví/kho online độc lập với dữ liệu mẫu offline. Backend tự kiểm tra quyền sở hữu, chi phí và input; client không gửi giá/sát thương/số dư/vị trí tuyệt đối. Ranked chờ tối thiểu 60 tài khoản, không chèn bot. Kiểm thử 100 kết nối là người dùng giả lập tải, không phải 100 người thật.

Thông tin kết nối phát triển được tạo ngẫu nhiên trong `.local/services.json` và `.local/postgres.env`, quyền 0600, không in giá trị. Hai container tên `hongioi-postgres`/`hongioi-redis` dùng named volumes; không tự xóa dữ liệu cũ. `npm run services:backup` lưu bản sao SQL và khóa HMAC vật phẩm trong `.local/backups`, quyền 0600. Khi khôi phục phải giữ khóa tương ứng; dữ liệu đã ký không được tự ký lại bằng khóa khác. `services` chỉ phục hồi backup khi tạo container mới, không ghi đè container có sẵn. Docker volumes/process không được giả định tồn tại trong snapshot cloud mới; giữ backup trong workspace khi cần lưu dữ liệu phát triển.

Chưa có triển khai Internet/TLS production được thực hiện. Khi tự triển khai, phục vụ frontend qua HTTPS và reverse proxy `/api`/`/socket` đến backend; đặt `APP_ORIGINS` thành danh sách origin frontend được phép. Backend đọc `DATABASE_URL`, `REDIS_URL`, `PORT`, `BIND_HOST`; không đưa thông tin xác thực thật vào Git. Android có trường nhập địa chỉ máy chủ HTTPS trong màn hình đăng nhập. Token native chỉ giữ trong bộ nhớ; WebSocket chuyển xác thực qua subprotocol, không gắn token vào URL.

## Nâng cấp theo Markdown

Prompt mới có goal riêng gồm **37 tiêu chí** trong [MASTER-GOAL.md](docs/MASTER-GOAL.md). Nhân vật dùng thân bầu dục tỷ lệ 8 đầu, khung khớp/ngón tay, bốn lớp áo, chân dung Canvas 2048 và 12 vũ khí có cấu trúc riêng. Bộ tạo tài nguyên có 149 minh họa PNG 512 cho vật phẩm, skin và kỹ năng. Sảnh bạch ngọc có xoay/cận mặt; bản đồ có bảy vùng, cỏ instanced, cổng và bốn loài thú cùng ba Boss theo dữ liệu gốc.

HUD có joystick nổi, kéo-hủy chiêu, radial cooldown/MP, lục soát hai cột với quét thẩm định 0,8 giây và nhặt từng món. Bảo vệ trạng thái dùng vault/đồng hồ monotonic; kinh tế online dùng quyền máy chủ, AOI và UUID/HMAC/ledger. Android có Kotlin Guard và R8. Xem [pipeline đồ họa](docs/GRAPHICS-PIPELINE.md) và [hướng dẫn Android](docs/ANDROID.md) để hiểu phạm vi thực tế.

`npm run verify:master` và `npm run verify:upgrade` tổng hợp bằng chứng hiện hành; cả hai vẫn thuộc điều kiện `verify:reuse`. Boss thứ tư/Tiên khí chờ đặc tả gốc theo quyết định người dùng. Mỹ thuật đầy đủ, cảm ứng/FPS và kiểm tra native trên Android thật chưa được nghiệm thu; chưa gọi đây là bản hoàn tất 100%.

## PBR, điều khiển kỹ năng và Auto Farm

Đợt nâng cấp ngày 15/10/2026 có [đặc tả riêng](docs/requests/PBR-SKILLSHOT-AUTOFARM-V2.5.md) và [24 điều kiện trong OVERHAUL-GOAL.md](docs/OVERHAUL-GOAL.md). Các goal GDD, Upgrade và Master tiếp tục bắt buộc.

Mặt dùng lưới trước riêng trong cung ±65°, Canvas 2048 nền da kín, UV clamp và tóc 3D tách khỏi ảnh mặt. Vải gấm có năm bản đồ albedo/normal/roughness/metalness/emissive đồng bộ ở 2048; cache giữ một bộ mức gần và hạ bộ bị thay xuống 64. Giáp dùng relief từ atlas dùng chung; vũ khí có bộ gắn chạm khắc cùng atlas. Tóc có normal/bump sợi riêng. Xem [pipeline đồ họa](docs/GRAPHICS-PIPELINE.md) để biết cách chia sẻ texture và phạm vi nghiệm thu.

Địa hình bảy vùng dùng PBR lặp 24 lần, anisotropy theo GPU và bộ dự phòng 128px riêng cho từng vùng. Trình duyệt có Worker sinh bộ 2048 qua Blob nội bộ, không tải mã hoặc tài sản ngoài; chỉ giữ một vùng độ phân giải cao ở Cân bằng hoặc hai vùng ở Chi tiết. Cổng ba tầng, đình giao dịch, tế đàn, bộ shader 12 nguyên tố và hào quang Hoàn lấy dữ liệu trang bị riêng; chúng không thay đổi vùng tương tác hoặc công thức GDD.

Kéo chiêu dùng pointer trái/phải độc lập, One-Euro cùng nội suy theo `dt`, vòng phạm vi và decal line/cone/AOE/khóa mục tiêu. Bấm nhanh chọn mục tiêu đang nhìn thấy và dự đoán chuyển động; kéo vào vùng hủy sẽ không gửi lệnh cast. Bộ đệm giữ lệnh tối đa 0,25 giây khi sắp hết hồi chiêu hoặc động tác hồi. Kiểm tra ở bước thời gian 60/120Hz xác nhận thuật toán, không phải kết quả đo 60/120 FPS trên Android.

Nút **AUTO FARM** trên HUD chuyển qua ba chế độ:

- **Tắt:** tự điều khiển hoàn toàn.
- **Săn quái và nhặt đồ:** tuần tra, combo Q/W/E, thả diều, thẩm định và mua đồ; giữ R/F, cảnh báo tướng địch trong 18 m.
- **Toàn diện:** thêm đánh trả/rút lui, hấp thu Hoàn phù hợp và tìm Cổng khi túi đạt 40W hoặc tới phút 15/20.

Nút **⚙** mở sáu tùy chỉnh: dùng Q/W/E, cho phép R lên Boss/tinh anh, nhặt/thẩm định, mua/ghép, thả diều và tránh nguy hiểm. Chạm joystick hoặc kéo kỹ năng ưu tiên thao tác tay ngay; Auto chỉ tiếp tục sau 1,2 giây từ lúc nhả ngón cuối. Auto giữ ít nhất 25% Hồn lực khi dùng chiêu farm, dùng 12 preset qua giao dịch/công thức thật, chặn cả món đích lẫn nguyên liệu tương khắc và không sửa bảng GDD để ép preset. Online chỉ quyết định từ snapshot server cho thấy; mọi cast, tiền, đồ, hấp thu và Hồi Hoàn vẫn do bộ luật có thẩm quyền xử lý.

## Chơi

- Cần trái / WASD di chuyển; Space hoặc giữ kiếm để đánh. Q/E/R/F thi triển; **Shift+W** dùng kỹ năng W vì W cũng là phím di chuyển. Kéo nút kỹ năng để ngắm. G nhặt, B cửa hàng, I túi, 1/2/3 Trợ phẩm.
- Chọn 12 tướng / 36 nhánh, Hoàn đúng Tag, Cốt, skin, trang phục, đồng hành và tối đa 3 Trợ phẩm. Duy+Bội khóa lẫn nhau. Một số Trợ phẩm có thể trả bằng TB đúng bảng GDD; phí trả trước khi trích vốn.
- Tối đa 7 Bổ phẩm; 6 Đài / 2 Thương Nhân; đủ 28 món / 7 công thức ghép, bán/tháo, Phản Phệ. Túi 24 ô / 48W. Hấp thu Hoàn 8s tại Tế Đàn.
- Cổng 5/10/15 phút mở 120s, hai vị trí cố định/ba biến thiên; đợt 20 phút có 3 Đại Cổng. Hồi Hoàn tính tải; Hoãn gửi đồ rồi ở lại; Hạ Gian sàn 15s; sát thương không hủy, CC pause và Overtime Grace.
- Bí Cảnh mở 10:00–14:00, lối vào gần (58,32), hai cửa thoát; kích hoạt hai Ấn Khóa để gọi Cổ Long. Thú Triều ở đợt 15 phút. Hồn Linh nhặt tiền gần và cảnh báo phía sau. Linh Lộ tìm đường tránh chướng ngại/Hồn Chướng. Có fog-of-war, bụi cỏ, cảnh báo vùng Truy Nã và dung hợp theo nguồn trạng thái.
- Sandbox chỉ có ở offline. Trận online tiếp tục trên server khi mở bảng hoặc mất kết nối; có 90s để nối lại. Nút tạm dừng chỉ dừng ngoại tuyến.

## Kiểm tra và goal tái sử dụng

```sh
npm test                 # bộ luật, hệ thống, 36 nhánh, tương tác GDD
npm run test:master      # anatomy/vũ khí/creature/icon/vault/loot theo prompt mới
npm run test:overhaul-ui # PBR, kéo/hủy/đệm chiêu và Auto qua HUD đang chạy
npm run test:server      # PostgreSQL/Redis thực, quyền/HMAC/giao dịch
npm run verify:automated # tự chạy services + các suite desktop/mobile/online/PWA/timeline/tải
npm run android:setup    # cài SDK/JDK đã xác minh checksum vào /workspace
npm run android:apk      # build/sync/assembleDebug/verify chữ ký + provenance
npm run android:hardening # compile Kotlin/DEX/R8, không thay kiểm tra thiết bị
npm run verify:master    # 37 tiêu chí prompt mới
npm run verify:overhaul  # 24 tiêu chí PBR / Skillshot / Auto Farm
npm run verify:reuse     # chỉ exit 0 khi TẤT CẢ gate bắt buộc đạt và bằng chứng còn đúng mã nguồn
```

`verify:automated` dùng các port riêng 3101/5175/4175, từ chối chạy nếu cổng đang được dùng và dừng các process do nó tạo. Frontend QA tắt tự tải lại trang; chế độ `dev` thông thường vẫn giữ HMR. Không chạy đồng thời nhiều suite đồ họa/phép đo tải. Lệnh tải có thể fail nếu không đạt ngưỡng; không hạ ngưỡng để làm pass.

`verify:reuse` trả khác 0 khi thiếu thiết bị thật, trace FPS, APK phù hợp hoặc nghiệm thu GDD. Có thể tiếp tục phát triển trong môi trường đó, nhưng không công bố là baseline hoàn tất. Xem [đối chiếu GDD](docs/GDD-COVERAGE.md), [kết quả kiểm tra](docs/VALIDATION.md) và `acceptance/evidence/goal-status.json`.

## Bản phát hành và Android

`npm run build` tạo `dist/` PWA và `release/Hon-Gioi-Sinh-Ton.html` độc lập, không dùng CDN. Mở HTML bằng trình duyệt hỗ trợ JavaScript/WebGL hoặc dùng `dist` trên máy chủ HTTP/HTTPS. Một số trình xem tệp và trình duyệt được quản lý chặn `file://`; kiểm thử HTML độc lập có cơ chế phục vụ chính nội dung tệp qua route nội bộ, không tải tài sản ngoài.

`npm run android:apk` tạo `release/Hon-Gioi-Sinh-Ton-debug.apk` và `build-provenance.json`. Đây là APK debug để cài thử, không phải gói phát hành ký bằng keystore thương mại. [Hướng dẫn Android](docs/ANDROID.md) có cấu hình Capacitor, Kotlin WebView và cách thu bằng chứng thiết bị thật. AI Studio có thể dùng dự án Vite hoặc HTML độc lập nếu host cho thực thi WebGL; chưa có tích hợp riêng API AI Studio.

## Mã nguồn

`src/data.js`: bảng GDD; `rules.js`: công thức; `simulation.js`: mô phỏng; `systems.js`: snapshot/AOI/đường đi/sự kiện/dung hợp; `hero-anatomy.js`/`weapons.js`/`creature-art.js`/`scenery.js`/`art.js`/`world.js`: mô hình, LOD và cảnh 3D; `character-pbr.js`/`creature-pbr.js`/`environment-pbr.js`: texture và cache; `environment-vfx.js`/`soul-ring-vfx.js`: hiệu ứng nguyên tố và Hoàn; `smooth-skillshot.js`/`skill-indicators.js`/`skill-projection.js`: điều khiển, decal và phép chiếu dùng chung; `auto-farm.js`: quyết định Auto qua lệnh gameplay; `item-art.js`: minh họa; `security.js`/`runtime-security.js`: bảo vệ trạng thái; `cosmetics.js`/`audio.js`: biến thể và âm thanh; `hud.js`: gợi ý và ngữ cảnh; `network.js`: client mạng; `main.js`/`style.css`: UI. `server/`: HTTP/WebSocket, phòng đấu, PostgreSQL ledger, Redis snapshot và worker serialization. `scripts/`: setup/build/backup/goal. `tests/`: các suite kiểm tra.
