# PDF do người dùng cung cấp — yêu cầu tối ưu khởi động

Nguồn: Hiênn tại khi mới vào game nó sẽ như này. Có thể l... (1).pdf

SHA-256: `be5646b181fc8a755bd662c8508d70ca8953bbbdb466398b59657780e9081f6f`

Người dùng đã yêu cầu thực hiện ngày 2026-10-17. Các suy đoán nguyên nhân và số liệu so sánh trong tài liệu gốc không phải kết quả đo; xem docs/ENGINE-PERFORMANCE.md và bằng chứng kiểm thử để biết phần đã xác nhận.

---

Phần 1: Giải mã nghịch lý — Tại sao Liên Quân (5GB) mượt như lụa
còn game của bạn (24MB APK) lại đứng hình trên cùng một chiếc
điện thoại?
Nhìn vào bức ảnh màn hình khởi động chỉ có chiếc bệ đài trống trơn, mất sạch giao diện chữ và
nhân vật, sau đó tự động nhảy thẳng vào trận đấu dù trước đó bạn đã thoát về Hồn Thành,
nguyên nhân không phải do điện thoại của bạn yếu mà nằm ở 4 sự khác biệt cốt lõi giữa
cách hoạt động của một APK bọc WebView/Three.js (24MB) và Engine Native (Liên
Quân):
  1. 24MB trên bộ nhớ lưu trữ \neq 24MB trên RAM/GPU (Hiện tượng "Nổ dung lượng &
      Tính toán CPU" lúc mở app):
        ○ Liên Quân (5GB): 5GB đó nằm im trên bộ nhớ máy. Khi bạn ở sảnh chờ, Liên
            Quân chỉ nạp đúng ~120MB dữ liệu của 1 tướng duy nhất vào RAM. Quan trọng
            hơn, hình ảnh (Texture) của Liên Quân dùng chuẩn nén phần cứng ASTC / ETC2
            — tệp ảnh truyền thẳng vào chip đồ họa (GPU) dưới dạng nén mà không bắt CPU
            giải nén.
        ○ Game 24MB của bạn: Khi打包 (build) bằng Android Studio (dùng WebView /
            Capacitor / Cordova chạy Three.js), tệp .apk 24MB chứa các tệp .glb nén và hàng
            chục nghìn dòng code tạo hình khối. Ngay giây đầu tiên bạn mở app, CPU phải
            giải nén ảnh PNG 2048×2048 thành Bitmap thô (mất hàng chục MB RAM),
            đồng thời chạy 118 hàm tự tính toán tọa độ đa giác (Procedural Geometry) và
            biên dịch hàng chục Shader ánh sáng ngay tại chỗ!
  2. Đơn luồng (Single-Thread JS) so với Đa luồng (Multi-Thread C++):
        ○ Liên Quân (C++): Tách riêng luồng vẽ giao diện (UI Thread), luồng dựng hình 3D
            (Render Thread) và luồng đọc file (Async I/O Thread). Dù đang tải tướng, bạn bấm
            nút vẫn nhạy 60 FPS.
        ○ Game của bạn (Android WebView): Toàn bộ giao diện HTML/CSS, việc giải mã
            file .glb của Lâm Dật, việc xoay vòng pháp trận và toàn bộ logic trận đấu 100 người
            đều dồn vào 1 luồng chính duy nhất (Main Thread) của WebView. Khi luồng này
            bị nghẽn để nạp model và khởi tạo trận đấu, trình duyệt không kịp vẽ lớp giao diện
            UI 2D lên màn hình — tạo ra cảnh chỉ thấy cái bệ đài 3D trống trơn không có
            nút bấm như trong ảnh của bạn!
  3. Thủ phạm lớn nhất gây "Lag kép": Lỗi kẹt trạng thái trận đấu cũ (Auto-Resume
      Match Bug):
        ○ Tại sao bạn đã thoát về Hồn Thành ở lần chơi trước mà lần này mở app lên nó lại
            đơ ở cái bệ đài rồi tự nhảy vào trận?
        ○ Bởi vì khi bạn bấm thoát về Hồn Thành, code của Codex chưa xóa cờ lưu trạng
            thái trận đấu đang diễn ra trong localStorage / IndexedDB (ví dụ: cờ
            activeMatchState, autoResumeBattle, hoặc currentScreen = 'battle').
        ○ Hậu quả là ngay khi vừa mở app lên, cùng một lúc máy điện thoại của bạn bị ép
            làm 2 việc nặng nhất đè lên nhau:
                1. Vừa khởi tạo cảnh 3D Sảnh Hồn Thành (vẽ bệ đài, cột rồng, hạt hoa bay và
                    tải file .glb nặng của Lâm Dật).
                2. Vừa âm thầm chạy hàm khôi phục trận đấu 100 Hồn Sư + bản đồ Thương
                    Mang Cổ Vực ở phía sau!
        ○ Hai khối lượng tính toán khổng lồ này khóa cứng CPU trong nhiều giây (làm màn


           hình kẹt ở cái bệ trống), và ngay khi hàm khôi phục trận đấu chạy xong, nó lập tức
           đá bạn văng vào trận!
  4. Android Studio WebView chưa được bật cấu hình tăng tốc phần cứng (Hardware
      Acceleration & GPU Rasterization) chuẩn:
        ○ Một WebView mặc định trong Android Studio nếu không cấu hình
           LayerType.HARDWARE, WebSettings.RenderPriority.HIGH và giới hạn
           devicePixelRatio sẽ bắt điện thoại render ở độ phân giải gốc (ví dụ màn hình 2K+
           phải vẽ hơn 3.5 triệu điểm ảnh mỗi khung hình), làm GPU di động quá tải ngay lập
           tức.

Phần 2: Siêu Prompt Đặc Tả Kỹ Thuật Toàn Diện cho Codex Cloud
(Tối ưu toàn bộ dự án hiện tại mà không cần đổi Engine)
Bạn hãy copy toàn bộ Siêu Prompt dưới đây và dán thẳng vào Codex Cloud. Bản đặc tả này
được thiết kế như một tài liệu kỹ thuật cấp hệ thống, ép Codex phải sửa từ gốc lỗi tự động vào
trận, lỗi mất UI/nhân vật trên bệ đài, tối ưu hóa tầng Android Studio APK lẫn tầng
WebGL/Three.js để đạt 60 FPS mượt mà như game gốc:
# SIÊU ĐẶC TẢ KỸ THUẬT CẤP ĐỘ KIẾN TRÚC (ENTERPRISE MEGA-PROMPT): ĐẠI
PHẪU HIỆU NĂNG TOÀN DIỆN DỰ ÁN HỒN GIỚI (ANDROID APK / WEBVIEW /
THREE.JS), TRIỆT TIÊU LỖI KẸT MÀN HÌNH BỆ ĐÀI TRỐNG & LỖI TỰ ĐỘNG NHẢY
VÀO TRẬN KHI KHỞI ĐỘNG

## PHẦN 0: CHẨN ĐOÁN HIỆN TRẠNG & MỤC TIÊU BẮT BUỘC (KHÔNG ĐỔI ENGINE)

### 0.1. Hiện trạng lỗi nghiêm trọng đang xảy ra trên thiết bị thực
tế
1. **Triệu chứng 1 — Kẹt ở màn hình Bệ Đài Trống, mất UI và mất Nhân
Vật khi mới vào game:**
    - Khi mở ứng dụng (APK 24MB), màn hình bị kẹt rất lâu ở cảnh 3D chỉ
có bệ đài trắng viền vàng, 4 cột trụ quấn rồng, vòng pháp trận tím
xoay tròn và các cánh hoa rơi; **toàn bộ giao diện UI (bảng chỉ số,
nút chọn tướng, hành trang) biến mất hoàn toàn và nhân vật Lâm Dật
không xuất hiện trên bệ đài**.
2. **Triệu chứng 2 — Tự động nhảy thẳng vào trận đấu dù trước đó đã
thoát về Hồn Thành:**
    - Ngay sau khoảng thời gian đơ/lag ở màn hình bệ đài trống đó, game
**tự động chuyển thẳng vào trong trận đấu (Thương Mang Cổ Vực - 100
Hồn Sư)** mặc dù ở phiên chơi trước người chơi đã chủ động thoát trận
về lại sảnh Hồn Thành.
3. **Triệu chứng 3 — Nghịch lý hiệu năng (APK 24MB nhưng lag hơn game
5GB trên cùng thiết bị):**
    - Luồng chính (Main Thread) bị khóa cứng (Long Tasks > 2000ms -
5000ms) lúc khởi động và chuyển cảnh do:
        - Vừa khởi tạo sảnh Hồn Thành + tải file `.glb` nặng của Lâm
Dật/Mộc Tinh Trượng, vừa đồng thời kích hoạt ngầm logic khôi phục trận
đấu cũ (`auto-resume match`).
        - Chạy hàng loạt hàm sinh hình học thủ công (118 vị trí tạo


`BufferGeometry` / `ExtrudeGeometry` / `TubeGeometry`), giải mã
texture độ phân giải cao và biên dịch PBR Shader đồng bộ trên cùng một
luồng với UI.
     - Cấu hình `WebView` trong Android Studio và `WebGLRenderer` chưa
tối ưu cho GPU di động (render thừa độ phân giải Retina/QHD, tạo mới
Material/Geometry liên tục gây Garbage Collection pause, không dùng
InstancedMesh cho 100 Hồn Sư và hiệu ứng).

### 0.2. Nguyên tắc thực thi bất biến
- **TUYỆT ĐỐI KHÔNG làm lại dự án sang Unity/Unreal:** Giữ nguyên kiến
trúc mã nguồn hiện tại (Web/Three.js đóng gói thành Android APK qua
Android Studio), nhưng áp dụng toàn bộ kỹ thuật tối ưu hóa cấp độ
Engine chuyên nghiệp (Zero-Blocking Boot, State Sanitization, GPU
Instancing, Object Pooling, Progressive Asset Streaming, Dynamic
Resolution Scaling).
- **Giải quyết triệt để 6 trụ cột kỹ thuật dưới đây trong một lần
triển khai hoàn chỉnh.**

---

## PHẦN 1: SỬA DỨT ĐIỂM LỖI "TỰ ĐỘNG VÀO TRẬN" & CHUẨN HÓA STATE
MACHINE GIỮA HỒN THÀNH VÀ CHIẾN TRƯỜNG

### 1.1. Phân tích nguyên nhân gốc rễ (Root Cause của lỗi Tự Vô Trận)
Trong mã nguồn hiện tại, hệ thống lưu trữ trạng thái cục bộ
(`localStorage`, `sessionStorage`, `IndexedDB`, hoặc tham số
URL/Android WebView state) đang lưu dữ liệu phiên trận đấu
(`matchState`, `battleSession`, `inCombat`, `savedRun`, `autoStart`,
hoặc bộ đếm/timer chuyển trận chưa bị `clearTimeout`/`clearInterval`).
Khi người chơi thoát trận về Hồn Thành ở phiên trước:
- Hoặc hàm `exitToHonThanh()` / `endMatch()` / `abandonMatch()` chỉ ẩn
màn hình trận đấu về mặt hiển thị (DOM CSS `display: none`) mà **không
xóa sạch cờ trận đấu đang hoạt động trong `localStorage`**;
- Hoặc hàm khởi động `initApp()` / `restoreSavedState()` thấy tồn tại
dữ liệu trận đấu cũ trong `localStorage` nên tự động gọi
`startBattle()` / `resumeMatch()` sau một khoảng trễ (hoặc ngay sau
khi tải xong asset), gây ra hiện tượng vừa vẽ bệ đài Hồn Thành vừa nạp
trận đấu rồi tự nhảy vào trận!

### 1.2. Giải pháp Kỹ thuật Bắt buộc (Strict State Machine & Storage
Sanitization)

#### **Bước 1.2.1: Thiết lập Máy Trạng Thái Vòng Đời Game Độc Lập
(`GameLifecycleStateMachine`)**
1. Định nghĩa tập trạng thái hợp lệ duy nhất cho toàn bộ ứng dụng:
   - `BOOTING`: Khởi tạo khung UI cơ bản (< 100ms).
   - `LOBBY_HON_THANH`: Màn hình sảnh chính Hồn Thành (hiển thị UI
chọn tướng, Hành Trang Xuất Chiến, bệ đài 3D và nhân vật đang chọn).


   - `MATCH_LOADING`: Chỉ được phép kích hoạt khi và chỉ khi người
chơi **trực tiếp bấm tay (`isTrusted === true` pointer/click event)**
vào nút **`BẮT ĐẦU TRẬN ĐẤU`**.
   - `IN_MATCH`: Đang trong trận chiến Thương Mang Cổ Vực.
   - `MATCH_RESULT_CLEANUP`: Đang thu hồi tài nguyên trận đấu để quay
về `LOBBY_HON_THANH`.
2. **Quy tắc cứng số 1 — Khởi động luôn vào `LOBBY_HON_THANH`:**
   - Khi mở ứng dụng lần đầu hoặc mở lại ứng dụng (`DOMContentLoaded`
/ `window.onload` / Android `onResume`), trạng thái đích **BẮT BUỘC
100% PHẢI LÀ `LOBBY_HON_THANH`**.
   - **XÓA BỎ HOÀN TOÀN** mọi logic tự động khôi phục trận đấu
(`auto-resume match` / `auto-reconnect offline bot match`) lúc khởi
động app!
   - Ngay tại dòng đầu tiên của quá trình khởi động (`boot()`), thực
hiện dọn dẹp tức thì mọi cờ trận đấu bị treo trong bộ nhớ lưu trữ:
     ```javascript
     function sanitizeStaleMatchStateOnBoot() {
       const staleMatchKeys = [
          'activeMatch', 'matchState', 'currentBattle', 'inMatch',
          'battleSession', 'combatState', 'autoStartMatch',
'pendingMatch',
          'survivalRunState', 'extractionState', 'currentScene',
'gamePhase'
       ];
       for (const key of staleMatchKeys) {
          try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          } catch (e) {}
       }
       // Nếu dự án lưu chung trong một JSON tổng (ví dụ
'hon_gioi_save_v25'),
       // chỉ giữ lại dữ liệu kinh tế & trang bị Hồn Thành (Ngân Bảo,
Thanh Bảo, Kho Hồn Thành, Hồn Hoàn, Hồn Cốt),
       // và bắt buộc ép các trường trạng thái trận đấu về false/null:
       try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const raw = localStorage.getItem(k);
            if (raw && raw.startsWith('{')) {
              const parsed = JSON.parse(raw);
              let mutated = false;
              for (const field of ['inBattle', 'inMatch', 'isPlaying',
'matchActive', 'battleInProgress', 'autoResume', 'currentView',
'phase']) {
                 if (field in parsed && parsed[field] !== false &&
parsed[field] !== 'LOBBY') {


                        parsed[field] = (field === 'currentView' || field ===
'phase') ? 'LOBBY' : false;
                        mutated = true;
                     }
                  }
                  if (parsed.activeMatchState || parsed.battleSnapshot) {
                     delete parsed.activeMatchState;
                     delete parsed.battleSnapshot;
                     mutated = true;
                  }
                  if (mutated) {
                     localStorage.setItem(k, JSON.stringify(parsed));
                  }
               }
            }
         } catch (err) {
            console.warn('Storage sanitization warning:', err);
         }
      }
      ```

#### **Bước 1.2.2: Khóa chặt hàm `startMatch()` bằng Xác thực Tương
tác Người dùng (`User Gesture Guard`)**
1. Bất kỳ hàm nào chuyển trạng thái từ Hồn Thành vào trận đấu
(`startMatch`, `enterBattle`, `launchGame`, `beginExtractionRun`...)
**PHẢI** kiểm tra biến cờ `userExplicitlyClickedStart`:
   ```javascript
   let userExplicitlyClickedStart = false;

   // Chỉ bật cờ này bên trong trình xử lý sự kiện click trực tiếp của
nút "BẮT ĐẦU TRẬN ĐẤU"
   startBattleButton.addEventListener('pointerup', (event) => {
      if (!event.isTrusted) return; // Chặn mọi lệnh gọi tự động bằng
code / timer
      userExplicitlyClickedStart = true;
      requestTransitionToMatch();
   });

   function startMatch(...) {
      if (!userExplicitlyClickedStart) {
         console.error('[BLOCKED] Ngăn chặn hành vi tự động vào trận khi
người chơi chưa bấm nút BẮT ĐẦU TRẬN ĐẤU!');
         return;
      }
      userExplicitlyClickedStart = false; // Reset ngay sau khi xác
nhận
      // ... Tiếp tục vào trận
   }


  1. Làm sạch triệt để khi Thoát trận về Hồn Thành (exitToLobby()):
        ○ Khi người chơi rút lui qua Cổng Hồi Hoàn, tử trận, hoặc bấm nút Thoát về Hồn
           Thành:
             ■ Hủy toàn bộ requestAnimationFrame của vòng lặp trận đấu, xóa toàn bộ
                 setTimeout / setInterval của AI Bot, vòng bo Hồn Chướng, спаwn quái và kỹ
                 năng.
             ■ Giải phóng (dispose()) toàn bộ Geometry/Material tạm thời của bản đồ trận
                 đấu và 99 Bot.
             ■ Xóa sạch cờ trận đấu trong localStorage / sessionStorage ngay lập tức và
                 đồng bộ (flush) xuống ổ cứng trước khi hiển thị lại giao diện Hồn Thành.

PHẦN 2: SỬA LỖI MÀN HÌNH BỆ ĐÀI TRỐNG (MẤT UI
& MẤT NHÂN VẬT) VÀ KIẾN TRÚC KHỞI ĐỘNG TỨC
THÌ (< 150MS)
2.1. Tại sao màn hình lại bị kẹt ở cảnh Bệ Đài Trống không có UI như
trong ảnh chụp thực tế?
Khi ứng dụng mở lên:
  1. Cảnh 3D cơ bản (bệ đài, 4 cột trụ, vòng pháp trận) được tạo bằng hình khối nhẹ nên vẽ
      ra trước.
  2. Ngay sau đó, code gọi hàm nạp model .glb của Lâm Dật / Mộc Tinh Trượng và chạy các
      vòng lặp khởi tạo nặng trước khi (hoặc chặn ngang) lệnh render UI HTML/DOM, hoặc
      lớp UI đang bị ẩn (opacity: 0 / visibility: hidden / chưa mount) chờ sự kiện await
      loadAllAssets() hoàn tất!
  3. Khi loadAllAssets() bị chậm hoặc gặp lỗi ngầm, màn hình bị treo ở chiếc bệ đài trống trơn
      mà không có giao diện!

2.2. Kiến trúc Khởi động Phân Tầng Không Chặn (Non-Blocking
4-Stage Boot Pipeline)
Giai đoạn 1 (0ms → 50ms): Hiển thị Giao diện UI Hồn Thành Tức Thì (UI-First
Paint)

  ● BẮT BUỘC: Toàn bộ giao diện 2D của sảnh Hồn Thành (Logo HỒN GIỚI, thông số Lâm
     Dật, bảng 01 / HÀNH TRANG XUẤT CHIẾN, danh sách 12 ô tướng, nút BẮT ĐẦU TRẬN
     ĐẤU) phải được hiển thị lên màn hình ngay ở Frame đầu tiên (< 50ms), hoàn toàn độc
     lập với việc cảnh 3D hay file .glb đã tải xong hay chưa!
  ● Tuyệt đối KHÔNG ĐƯỢC đặt lệnh khởi tạo/hiển thị UI nằm sau await loadModel() hay
     bên trong callback của GLTFLoader.

Giai đoạn 2 (50ms → 150ms): Khởi tạo Khung Cảnh 3D Bệ Đài Nhẹ & Placeholder
Tinh Tế


  ● Khởi tạo WebGLRenderer, Camera, hệ thống đèn Studio 4 điểm và Bệ Đài Hồn Thành
     (sử dụng Geometry dùng chung đã tối ưu).
  ● Ngay khi file .glb của Lâm Dật đang được nạp bất đồng bộ từ bộ nhớ trong (mất khoảng
     80ms - 200ms), hiển thị ngay vòng pháp trận Thanh Mạch Đằng phát sáng dưới mặt bệ
     đài để cảnh 3D luôn sống động, không bao giờ có cảm giác đứng hình.

Giai đoạn 3 (150ms → 400ms): Nạp Bất Đồng Bộ Duy Nhất Nhân Vật Đang Chọn
(H01 - Lâm Dật + Mộc Tinh Trượng)

  ● Sử dụng Web Worker hoặc luồng fetch bất đồng bộ kết hợp IndexedDB cache để đọc file
     .glb đã được nén nhẹ của Lâm Dật (H01) và Mộc Tinh Trượng.
  ● Sau khi parse xong GLTF:
        1. Chạy await renderer.compileAsync(characterScene, camera, lobbyScene) để biên
            dịch sẵn Shader trên GPU mà không làm khựng khung hình.
        2. Đưa Lâm Dật vào bệ đài và kích hoạt mượt mà Chuỗi Hoạt Ảnh Xuất Hiện 5 Pha
            (Dây leo trồi lên → Lâm Dật ngồi chồm hổm tay phải chống hông, tay trái
            chạm đất giữa hai chân → Dây leo hóa Mộc Tinh Trượng → Đứng dậy nắm
            trượng → Gõ mạnh xuống đất).

Giai đoạn 4 (Sau khi Lâm Dật đã xuất hiện xong): Tải Ngầm Thông Minh (Idle
Pre-warming)

  ● Tất cả dữ liệu của 11 Hồn Sư còn lại (Trạch, Sa, Vân, Dao, Kính, Chước, Nghi, Tinh, Lạc,
     Tư, Uyên), dữ liệu bản đồ Thương Mang Cổ Vực, 28 Bổ phẩm, 18 Trợ phẩm TUYỆT ĐỐI
     KHÔNG ĐƯỢC KHỞI TẠO LÚC MỞ APP.
  ● Chỉ nạp theo yêu cầu (Lazy Load on Demand) khi người chơi bấm chọn tướng đó, hoặc
     chia nhỏ từng tác vụ cực nhẹ trong requestIdleCallback (mỗi lần không quá 3ms thời gian
     CPU).

PHẦN 3: TỐI ƯU HÓA TẦNG ANDROID STUDIO /
WEBVIEW ĐỂ ĐẠT HIỆU NĂNG TƯƠNG ĐƯƠNG
GAME NATIVE
Hãy kiểm tra thư mục Android của dự án (android/, app/src/main/, MainActivity.java /
MainActivity.kt, AndroidManifest.xml, build.gradle) và áp dụng toàn bộ các tối ưu hóa cấp hệ
thống sau:

3.1. Tối ưu hóa AndroidManifest.xml
Đảm bảo thẻ <application> và <activity> bật đầy đủ tăng tốc phần cứng và bộ nhớ lớn:
<application
    android:hardwareAccelerated="true"
    android:largeHeap="true" ...>
    <activity
         android:name=".MainActivity"
         android:hardwareAccelerated="true"


android:configChanges="orientation|keyboardHidden|keyboard|screenSize|
locale|smallestScreenSize|screenLayout|uiMode"
        android:screenOrientation="sensorLandscape" ...>


3.2. Tối ưu hóa WebView trong MainActivity (Java/Kotlin)
Cấu hình WebView chạy ở chế độ GPU Hardware Layer tối đa và đọc trực tiếp tài nguyên cục
bộ không qua nghẽn mạng:
WebView webView = findViewById(R.id.webview); // hoặc WebView của
Capacitor/Cordova
// 1. Ép buộc sử dụng GPU Hardware Layer cho WebView
webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
webView.setBackgroundColor(Color.parseColor("#0b1622")); // Tránh nháy
trắng lúc khởi động

WebSettings settings = webView.getSettings();
settings.setJavaScriptEnabled(true);
settings.setDomStorageEnabled(true);
settings.setDatabaseEnabled(true);
// 2. Bật bộ nhớ đệm tối đa để không phải giải nén lại tài nguyên tĩnh
settings.setCacheMode(WebSettings.LOAD_DEFAULT);
settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
settings.setMediaPlaybackRequiresUserGesture(false);


3.3. Nén trước tài sản 3D (.glb) ngay trong Pipeline Build trước khi
đóng gói vào APK
Đây là lý do vì sao Liên Quân mượt: không bao giờ bắt điện thoại giải nén file thô lúc đang
chạy! Hãy chạy script Blender / Python (tools/tencent/optimize_glb_assets.py) để tiền xử lý toàn
bộ các file .glb nằm trong thư mục assets/ hoặc public/ trước khi đóng gói:
  1. Giới hạn số lượng tam giác (Polygon Budget):
         ○ Model nhân vật H01 - Lâm Dật: Giữ ở mức 12.000 – 18.000 triangles (sử dụng
              Normal Map để giữ chi tiết nếp gấp áo và khuôn mặt).
         ○ Model vũ khí Mộc Tinh Trượng: Giữ ở mức 3.000 – 5.000 triangles.
  2. Chuyển đổi toàn bộ Texture nhúng sang WebP hoặc kích thước chuẩn lũy thừa của
      2 (Power-of-Two: 1024×1024):
         ○ GPU di động (Adreno / Mali) xử lý ảnh 1024×1024 nhanh hơn gấp 4 lần và tốn ít
              hơn 75% VRAM so với ảnh 2048×2048 hoặc kích thước lẻ.
         ○ Đảm bảo dung lượng mỗi file .glb sau tối ưu chỉ nằm trong khoảng 800KB –
              2.2MB.

PHẦN 4: TỐI ƯU HÓA TẦNG ENGINE 3D (THREE.JS /
WEBGL) — TỪ SẢNH CHỜ ĐẾN TRẬN ĐẤU 100


NGƯỜI
4.1. Loại bỏ hoàn toàn 118 vị trí tạo Geometry đồng bộ lúc khởi động
(Procedural Geometry Freeze)
Trong mã nguồn hiện tại có tới 118 vị trí gọi các hàm tạo hình học (new
THREE.SphereGeometry, CylinderGeometry, TubeGeometry, ExtrudeGeometry,
LatheGeometry...).
  1. Cơ chế Shared Geometry Pool (Bộ nhớ đệm Hình học Dùng chung):
        ○ Tạo một kho lưu trữ GeometryPool toàn cục. Thay vì mỗi cột trụ, mỗi ngọn nến,
           mỗi cánh hoa hay mỗi nhân vật tạo mới CylinderGeometry / SphereGeometry có
           nhiều phân đoạn (segments = 64), hãy giảm số phân đoạn về mức tối ưu cho di
           động (radialSegments = 12 hoặc 16) và tái sử dụng chung 1 thực thể
           BufferGeometry duy nhất cho mọi vật thể cùng hình dáng!
  2. Thay thế cánh hoa rơi và hiệu ứng hạt bằng THREE.Points hoặc
      THREE.InstancedMesh (1 Draw Call duy nhất):
        ○ Quan sát ảnh chụp màn hình bệ đài hiện tại: có hàng chục cánh hoa hồng đang rơi
           xung quanh bệ đài. Nếu mỗi cánh hoa là một THREE.Mesh riêng biệt và được cập
           nhật vị trí bằng CPU mỗi frame, nó sẽ phát sinh hàng chục Draw Calls thừa.
        ○ Hãy gộp toàn bộ cánh hoa rơi và hạt linh khí thành 1 THREE.InstancedMesh
           (hoặc THREE.Points điều khiển chuyển động rơi trực tiếp trong Vertex
           Shader thông qua biến uTime). Khi tính toán bằng uTime trên GPU, chi phí CPU
           cho hiệu ứng hoa rơi giảm về 0.00ms!

4.2. Tối ưu hóa Vòng lặp Render (RequestAnimationFrame & Dynamic
Resolution)
  1. Tách biệt Vòng lặp Render Sảnh Hồn Thành và Vòng lặp Trận Đấu:
        ○ Khi đang ở LOBBY_HON_THANH, vòng lặp requestAnimationFrame của trận đấu
           phải dừng hoàn toàn (cancelAnimationFrame).
        ○ Ngược lại, khi đã vào IN_MATCH, cảnh 3D của bệ đài Hồn Thành không được
           phép render ngầm ở phía sau!
  2. Độ phân giải Động thích ứng FPS (Adaptive Pixel Ratio Scaler):
        ○ Trên điện thoại Android, window.devicePixelRatio thường là 2.75 đến 3.5. Nếu để
           nguyên, GPU phải tô màu lượng điểm ảnh gấp 9 đến 12 lần bình thường!
        ○ Áp dụng bộ điều khiển độ phân giải tự động:
           // Giới hạn cứng pixelRatio tối đa là 1.5 trên thiết bị di
           động
           const maxMobileDPR = Math.min(window.devicePixelRatio || 1,
           1.5);
           renderer.setPixelRatio(maxMobileDPR);

           // Bộ giám sát FPS tự động: nếu 30 frame liên tiếp có thời
           gian frame > 22ms (< 45 FPS),
           // tự động hạ pixelRatio xuống 1.15 để giữ tốc độ 60 FPS mượt
           mà tuyệt đối


  3. Loại bỏ Cấp phát Bộ nhớ Rác trong Vòng lặp Render (Zero-Allocation Render
      Loop):
        ○ Rà soát toàn bộ hàm animate() / update(dt) / render(): TUYỆT ĐỐI CẤM gọi new
            THREE.Vector3(), new THREE.Quaternion(), new THREE.Matrix4(), new
            THREE.Color(), hoặc .clone() bên trong vòng lặp chạy 60 lần/giây!
        ○ Khai báo sẵn các biến tạm (_tmpVec1, _tmpVec2, _tmpQuat, _tmpMat4) ở cấp
            module và tái sử dụng chúng. Điều này loại bỏ hoàn toàn hiện tượng giật cục định
            kỳ mỗi vài giây do bộ dọn rác bộ nhớ (JavaScript Garbage Collector) kích hoạt trên
            Android.

4.3. Tối ưu hóa Chiến trường 100 Hồn Sư (Thương Mang Cổ Vực) để
không lag khi vào trận
Khi người chơi thực sự bấm nút BẮT ĐẦU TRẬN ĐẤU:
  1. Culling theo Khoảng cách Camera Isometric 2.5D (View Frustum & Distance
      Culling):
        ○ Ở góc nhìn 2.5D Isometric, màn hình của người chơi chỉ nhìn thấy bán kính khoảng
            25m - 35m xung quanh nhân vật chính.
        ○ Với các Bot/Hồn thú ở cách xa người chơi > 40m:
               ■ Đặt botMesh.visible = false (không gửi bất kỳ lệnh vẽ nào xuống GPU).
               ■ Giảm tần suất cập nhật AI/di chuyển của các Bot ở xa từ 60Hz xuống còn
                  4Hz (mỗi 250ms mới tính toán vị trí 1 lần bằng toán học 2D đơn giản x, z).
  2. Object Pooling cho Kỹ năng (Q/W/E/R/F), Đạn đạo và Số sát thương nổi (Floating
      Damage Text):
        ○ Không bao giờ dùng scene.add(new Mesh(...)) hay document.createElement('div')
            lúc đang giao tranh.
        ○ Khởi tạo sẵn một ObjectPool cố định (ví dụ: 20 hiệu ứng chiêu thức, 30 nhãn số sát
            thương) và bật/tắt (visible = true/false) khi tái sử dụng.

PHẦN 5: TÍCH HỢP ĐỒNG BỘ VỚI CÁC YÊU CẦU MỸ
THUẬT CỦA LÂM DẬT (H01)
Đảm bảo trong quá trình tối ưu hóa toàn diện trên, toàn bộ các yêu cầu về nhân vật Lâm Dật
(H01) ở sảnh Hồn Thành đều hoạt động hoàn hảo 100%:
  1. Hiển thị rõ ràng ngay trên bệ đài cùng đầy đủ UI: Không còn tình trạng bệ đài trống
      hay mất giao diện.
  2. Màu sắc tươi sáng chuẩn bản gốc: Đã xóa thuộc tính COLOR_0 (Vertex Color gây tối),
      đặt SRGBColorSpace, hạ metalness <= 0.05, bật bù sáng emissiveMap = map
      (emissiveIntensity = 0.28) và cụm đèn Studio 4 điểm chiếu sáng rõ khuôn mặt ở cả chế
      độ TOÀN THÂN và CẬN CẢNH.
  3. Cầm nắm cây Mộc Tinh Trượng (từ asset Hunyuan 3D) & Hoạt ảnh Xuất hiện 5 Pha:
        ○ Bàn tay phải nắm khít thân trượng tại Grip_Pivot (các ngón tay phải ôm quanh thân
            trượng).
        ○ Hoạt ảnh xuất hiện của Lâm Dật diễn ra mượt mà ở 60 FPS: Dây leo khổng lồ hiện
            ra trước → Lâm Dật từ từ trồi lên trong tư thế ngồi chồm hổm, tay phải chống


            hông, tay trái đặt xuống đất trước mặt giữa hai chân → Các dây leo biến hình
            thành cây Mộc Tinh Trượng → Lâm Dật đứng dậy giơ tay phải lên nắm lấy cây
            trượng → Gõ mạnh cây trượng xuống đất phát sóng xung kích rồi chuyển sang tư
            thế đứng chờ cầm trượng.

PHẦN 6: BÀI KIỂM THỬ NGHIỆM THU TỰ ĐỘNG BẮT
BUỘC (AUTOMATED QA GATE)
Trước khi hoàn tất và commit, bạn BẮT BUỘC phải viết và chạy bộ kiểm thử tự động
(tests/performance_and_boot_verify.py hoặc Playwright/Node test) xác nhận đạt cả 5 tiêu chí
sau:
   1. Kiểm thử Không Tự Vào Trận (No Auto-Match Regression Test):
         ○ Giả lập localStorage có chứa dữ liệu trận đấu dở dang từ phiên trước, sau đó tải lại
              trang game (page.reload()).
         ○ Chờ 10 giây liên tục mà không bấm nút BẮT ĐẦU TRẬN ĐẤU: Xác nhận trạng thái
              game vẫn đứng yên 100% ở sảnh LOBBY_HON_THANH, tuyệt đối không tự
              nhảy vào trận!
   2. Kiểm thử Hiển thị UI + Nhân vật Lâm Dật trên Bệ Đài (UI & Character Visibility Test):
         ○ Xác nhận ngay khi vào game, toàn bộ lớp UI (tên Lâm Dật, bảng 01 / HÀNH
              TRANG XUẤT CHIẾN, 12 ô tướng, nút BẮT ĐẦU TRẬN ĐẤU) hiển thị đầy đủ
              (opacity > 0, display != none), và trên bệ đài có mặt đầy đủ Mesh của Lâm Dật
              đang cầm Mộc Tinh Trượng (không bao giờ để bệ đài trống trơn).
   3. Kiểm thử Thời gian Khởi động & Chống Đơ Luồng Chính (Boot Time & Long Task
       Test):
         ○ Thời gian hiển thị giao diện sảnh Hồn Thành đầu tiên < 200ms.
         ○ Không có bất kỳ tác vụ đồng bộ nào làm đơ luồng chính quá 150ms trong suốt quá
              trình khởi động.
   4. Kiểm thử Độ sáng Màu sắc Model (Brightness & Color Fidelity Check):
         ○ Kiểm tra vật liệu của Lâm Dật không còn vertexColors = true gây ám đen, ảnh
              texture đạt chuẩn SRGBColorSpace và độ sáng vùng mặt ở chế độ CẬN CẢNH rõ
              nét, tươi sáng.
   5. Kiểm thử Chuỗi Hoạt Ảnh Xuất Hiện 5 Pha của Lâm Dật:
         ○ Xác nhận controller hoạt ảnh của H01 có đầy đủ 5 pha (Dây leo trồi lên → Ngồi
              chồm hổm tay phải chống hông, tay trái đặt xuống đất giữa hai chân → Dây leo
              biến thành trượng → Đứng dậy nắm trượng → Gõ mạnh xuống đất) và chuyển tiếp
              mượt sang trạng thái Idle cầm trượng.
Hãy bắt đầu rà soát mã nguồn, sửa ngay lỗi tự động vào trận, giải phóng luồng khởi động để
hiển thị UI + Lâm Dật tức thì trên bệ đài và áp dụng toàn bộ các tầng tối ưu hóa hiệu năng ngay
bây giờ!
---

### Tóm tắt những gì Codex Cloud sẽ làm khi nhận bản lệnh này:
1. **Chặn đứng lỗi "Tự vô trận":** Nó sẽ quét sạch mọi biến
`localStorage` / `sessionStorage` bị kẹt từ lần thoát trận trước ngay
giây đầu tiên mở app, và gắn khóa bảo vệ bắt buộc phải có thao tác bấm
tay thật của bạn vào nút **`BẮT ĐẦU TRẬN ĐẤU`** thì mới được phép vào
trận.


2. **Xóa sổ cảnh "Bệ đài trống mất
chữ[span_11](start_span)"[span_11](end_span):** Tách hoàn toàn việc vẽ
giao diện chữ 2D ra khỏi việc tải model 3D, giúp giao diện hiện lên
ngay lập tức trong chớp mắt (`< 0.1 giây`), sau đó nhân vật Lâm Dật
cùng hiệu ứng dây leo sẽ trồi lên mượt mà.
3. **Biến APK 24MB thành mượt 60 FPS như Liên Quân:** Bật tăng tốc
phần cứng GPU cho `WebView`, nén nhẹ file `.glb`, tắt toàn bộ việc
chạy ngầm trận đấu khi đang ở sảnh chờ, và chỉ tính toán những vật thể
nằm trong tầm nhìn camera khi vào trận!
