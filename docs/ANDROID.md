# Android APK và bằng chứng thiết bị

## Bản dựng Capacitor

```sh
npm ci
npm run android:setup
npm run android:add   # chỉ khi android/ chưa tồn tại
npm run android:apk
```

SDK35/Build Tools34–35 và JDK21 được cài trong `/workspace`, với checksum của nguồn Android/Adoptium được xác minh. Build dùng Gradle8.11.1, AGP8.7.2; proxy hiện có được áp dụng bằng hostname/port, giữ TLS/certificate verification. JRE không đủ: cần `javac`. `scripts/setup-android.py` không đổi biếnHOME và không ghi giá trị bí mật ra log.

Lệnh APK tự build web, sync Capacitor, cấu hình native, `assembleDebug`, kiểm chữ ký bằng apksigner và ghi `release/build-provenance.json` chứa SHA-256/fingerprint. Đầu ra: `release/Hon-Gioi-Sinh-Ton-debug.apk`. Debug key dùng cho cài thử; bản thương mại cần keystore riêng, không đưa vào Git/chat.

Activity giữ `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`, JavaScript, DOM storage, giữ màn hình và Immersive Sticky; tài sản web nằm trong APK. Android System WebView phải hỗ trợ WebGL. Nếu chơi online, nhập endpoint HTTPS của backend trong màn hình đăng nhập; ví/kho online nằm trong PostgreSQL. Không có backend Internet được deploy tự động ở bước này.

## WebView Kotlin thuần

Có [MainActivity.kt](../android-webview/MainActivity.kt) và [AndroidManifest.xml](../android-webview/AndroidManifest.xml). Tạo Android Empty Views Activity, namespace `vn.hongioi.sinhton`, Kotlin, minSdk23/compile+target35, dependency `androidx.webkit:webkit:1.12.1`. Chép cùng `SecurityGuard.kt` và `proguard-rules.pro` từ thư mục mẫu; cấu hình public certificate pin cho release. Sao chép nội dung `dist/` vào `app/src/main/assets/`, giữ cấu trúc để có `assets/index.html` và `assets/assets/*.js`.

Mẫu dùng `WebViewAssetLoader`, URL `https://appassets.androidplatform.net/assets/index.html`, không bật file access hoặc mixed content. Đây là đường đóng gói thay thế; APK kiểm tra ở lần bàn giao dùng Capacitor Java Activity, không coi đó là bằng chứng đã biên dịch riêng mẫu Kotlin.

## Kotlin Guard và bản release

Capacitor gọi `SecurityGuard.enforce` trước khi tạo WebView. Build debug được nhận diện qua hằng build đã biên dịch; bản release từ chối chạy khi thiếu pin hoặc chứng thư ký không khớp. Đặt `HG_TRUSTED_SIGNING_SHA256` bằng SHA-256 chứng thư ký release (64 ký tự hex; nhiều pin phân cách dấu phẩy) trước bước sync/configure. Đây là fingerprint công khai, không phải khóa riêng. Script giữ pin đã cấu hình nếu biến môi trường không được đặt; không tự dùng chứng thư debug làm pin release.

```sh
npm run android:apk
npm run android:hardening
```

Lệnh hardening kiểm tra duplicate classes, biên dịch Kotlin, DEX debug và R8 release; ghi bằng chứng cùng fingerprint. Nó không tạo bản phát hành ký thương mại, không thực hiện thử root/Frida trên thiết bị. Root/Frida chỉ là tín hiệu heuristic, không là bằng chứng gian lận hoặc hardware attestation. Bridge `HongioiNativeSecurity.status()` chỉ đọc trạng thái công khai; không nhận lệnh sửa tiền hay kho. Kotlin compiler dùng thành phần đã có trong Gradle 8.11.1, tránh hai bản standard library trong DEX.

## Chứng minh trên thiết bị thật

```sh
npm run android:validate
npm run verify:reuse
```

Cần một điện thoại vật lý cấp quyền ADB. Script kiểm tra `ro.kernel.qemu`, cài/chạy APK và tạo báo cáo **chưa đạt** cho các bước chưa xác thực. Nó không tự suy luận combat/Hồi Hoàn/FPS từ PID hay màn hình sáng.

Bằng chứng `acceptance/evidence/android-functional.json` cần fingerprint hiện tại, thông tin thiết bị thật, checks launch/landscape/touchCombat/extraction/resume và trace có checksum. `android-performance.json` cần thiết bị thật, trace, normalDurationSeconds>=60 và gateCombatDurationSeconds>=60 (mỗi cảnh), durationSeconds>=60, normalFps>=60, gateCombatFps>=30, combatants>=40. Điền kết quả từ phép đo thực tế; không nhập con số ước tính. Emulator và SwiftShader không thỏa gate thiết bị thật.

Máy cloud hiện không có thiết bị USB Android hoặc KVM. ADB bản mới còn bị chặn thư mục `/home/agent/.android` chỉ đọc; điều này không được giải quyết bằng cách đổi HOME hay giả lập một serial thiết bị. Chưa có báo cáo chức năng/FPS vật lý hợp lệ, nên goal phải tiếp tục BLOCKED dù APK đã build được.

## Đợt kiểm tra boot và KTX2 ngày 17/10/2026

Xem [PERF-REPORT.md](PERF-REPORT.md) để biết số đo thật, SHA APK và các mục chưa đạt. Sảnh có nút **ĐO HIỆU NĂNG**: bật để tải lại với `?perf=1`, sau thao tác đợi ít nhất5giây rồi lấy JSON. Mặc định log tắt. Chưa có nghiệm thu Android thật.

Build chạy `assets:optimize`; cần KTX-Software4.4.2 (`toktx` trên PATH hoặc biến `TOKTX=/đường/dẫn/toktx`). Có thể dev với `HG_SKIP_ASSET_OPTIMIZE=1 npm run build` khi dùng các bản tối ưu đã commit; đây là bỏ qua rõ ràng, không phải nén thành công. BasisJS/WASM được script chép từ Three trong node_modules và đóng trongAPK, không dùngCDN. Lệnh `npm run assets:verify` kiểm clip/keyframe/bone/morph và ownership của cache.
