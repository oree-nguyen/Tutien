# SIÊU ĐẶC TẢ KỸ THUẬT (MEGA-PROMPT): TÍCH HỢP MỘC TINH TRƯỢNG HUNYUAN 3D, HỆ THỐNG CẦM NẮM IK & HOẠT ẢNH XUẤT HIỆN LÂM DẬT (H01), KHẮC PHỤC TRIỆT ĐỂ LỖI TỐI MÀU MODEL VÀ TỐI ƯU HÓA TỐC ĐỘ TẢI ASSET / CHỐNG LAG KHI KHỞI ĐỘNG GAME HỒN GIỚI



## PHẦN 0: BỐI CẢNH HIỆN TẠI, PHẠM VI ÁP DỤNG & NGUYÊN TẮC BẤT BIẾN



### 0.1. Phạm vi áp dụng

- **Chỉ tập trung xử lý sâu cho nhân vật `H01 - Lâm Dật (Thanh Mạch Đằng)` và vũ khí `Mộc Tinh Trượng` của nhân vật này** (vì hiện tại chỉ mới có bộ asset của Lâm Dật và cây trượng được tạo mới từ Hunyuan 3D của Tencent). Các nhân vật khác giữ nguyên cơ chế fallback nhẹ, tuyệt đối không sinh hàng loạt làm chậm thời gian khởi tạo.

- **Nguồn Asset cây trượng mới (`Mộc Tinh Trượng`):**

  `https://3d.hunyuan.tencent.com/share?shareId=4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6`

- **3 Bài toán kỹ thuật trọng tâm bắt buộc giải quyết triệt để 100% trong phiên làm việc này:**

  1. **VẤN ĐỀ 1 (Vũ khí, Cầm nắm & Hoạt ảnh Xuất hiện của Lâm Dật):** Tải/trích xuất và chuẩn hóa model 3D cây trượng từ link chia sẻ Hunyuan 3D trên; xóa bỏ hoàn toàn cây trượng hình khối cũ; thiết lập hệ thống xương cầm nắm (Hand Socket + Finger Grip Pose + Arm IK/FK) cho bàn tay phải của Lâm Dật; và xây dựng hoàn chỉnh **Chuỗi Hoạt Ảnh & Hiệu Ứng Xuất Hiện (Entrance Cinematic Sequence)** của Lâm Dật theo đúng kịch bản đạo diễn từng khung hình.

  2. **VẤN ĐỀ 2 (Khắc phục lỗi Model trong game bị tối sẫm so với Model/Ảnh gốc):** Sửa toàn diện pipeline ánh sáng, không gian màu (`SRGBColorSpace`), vật liệu PBR (`MeshStandardMaterial` / `MeshPhysicalMaterial`), loại bỏ bóng đen dị thường trên khuôn mặt/trang phục của Lâm Dật ở cả chế độ `TOÀN THÂN` và `CẬN CẢNH`, đảm bảo màu da sáng hồng hào, áo trường bào xanh lục bảo tươi sáng và viền vàng kim rực rỡ đúng như bản gốc.

  3. **VẤN ĐỀ 3 (Chẩn đoán tận gốc và tối ưu hóa triệt để lỗi lag, đơ khung hình và tải model quá lâu khi mới vào game):** Phân tích toàn bộ đường ống nạp tài nguyên (Asset Loading Pipeline), nén GLB (Draco/Meshopt + WebP), giảm đa giác thông minh (Decimation/LOD), tải bất đồng bộ không chặn luồng chính (Non-blocking Async Loading + IndexedDB Cache + Shader Pre-compilation) để game mở lên mượt tức thì (60 FPS ổn định).



---



## PHẦN 1: TÍCH HỢP ASSET CÂY TRƯỢNG HUNYUAN 3D, HỆ THỐNG CẦM NẮM HOÀN CHỈNH & HOẠT ẢNH XUẤT HIỆN CỦA LÂM DẬT (H01)



### 1.1. Quy trình thu thập, bóc tách và chuẩn hóa Asset Cây Trượng từ link Tencent Hunyuan 3D

1. **Trích xuất file 3D (`.glb` / `.fbx` / `.obj`) từ URL chia sẻ:**

   - Truy cập URL: `https://3d.hunyuan.tencent.com/share?shareId=4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6`

   - Viết script tự động trong `tools/tencent/fetch_hunyuan_share.py` để lấy metadata từ API chia sẻ của `3d.hunyuan.tencent.com` (dựa trên `shareId=4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6`), tìm đường dẫn trực tiếp của tệp `.glb` (ưu tiên bản có PBR texture đầy đủ) và tải về lưu tại `assets/base_models/h01_moc_tinh_truong_raw.glb`.

   - *Cơ chế dự phòng nếu cổng share chặn request tự động:* Kiểm tra xem file đã được tải sẵn trong thư mục `assets/` hoặc `downloads/` chưa; nếu mạng proxy của container chặn domain `3d.hunyuan.tencent.com`, hãy in rõ domain cần whitelist hoặc dùng headless browser/curl với header chuẩn để lấy file `.glb` gốc. Tuyệt đối **xóa bỏ cây trượng bằng khối ống trụ nâu + bông hoa xanh thô sơ** đang hiển thị bên cạnh Lâm Dật hiện tại.



2. **Chuẩn hóa hình học, Tâm cầm nắm (`Grip_Pivot`) và Điểm va chạm đất (`Staff_Tip_Ground`) bằng Blender Headless:**

   - Mở `h01_moc_tinh_truong_raw.glb` trong Blender chạy ngầm (`blender -b --python-expr ...`):

     - **Chuẩn hóa trục tọa độ (Axis Alignment):** Đảm bảo trục dọc của thân trượng nằm thẳng đứng dọc theo trục **+Y (hoặc +Z trong Blender, khi xuất sang glTF +Y là hướng lên trên)**. Đầu trượng (phần đỉnh quyền trượng mộc tinh) hướng lên trên (`+Y`), đuôi trượng (phần đế gõ xuống đất) hướng xuống dưới (`-Y`).

     - **Chuẩn hóa kích thước (Scale Normalization):** Chiều dài tổng thể của cây Mộc Tinh Trượng phải bằng **1.12 lần chiều cao của nhân vật Lâm Dật** (nếu chiều cao Lâm Dật là `1.80m` trong không gian 3D của game, chiều dài cây trượng là `2.02m`, đường kính thân trượng chỗ tay cầm khoảng `0.035m - 0.045m` để vừa khít lòng bàn tay phải của Lâm Dật).

     - **Thiết lập 3 Node mốc tọa độ (Empty/Attachment Nodes) bên trong file `.glb` của cây trượng:**

       1. `Staff_Root` (Gốc của cây trượng): Đặt tại chính xác **Vị trí tay nắm (`Grip Point`)** — nằm ở vị trí khoảng **62% chiều dài tính từ đuôi trượng lên** (tức cách đỉnh đầu trượng khoảng 38% chiều dài). Khi gắn `Staff_Root` vào xương bàn tay phải của Lâm Dật, tay phải sẽ nắm đúng vị trí cân bằng tự nhiên của trượng chứ không nắm ở giữa thân hay ở tít dưới đáy.

       2. `Staff_Base_Tip` (Điểm đế trượng chạm đất): Đặt ở điểm thấp nhất của đuôi trượng (`y = -0.62 * total_length` tính từ `Staff_Root`). Node này dùng để tính toán chính xác điểm tiếp đất khi Lâm Dật gõ mạnh cây trượng xuống mặt bệ đài và kích hoạt sóng xung kích (Shockwave VFX).

       3. `Staff_Head_Core` (Tâm đỉnh trượng phát sáng): Đặt tại trung tâm phần đầu trượng để gắn nguồn sáng phụ (`PointLight` xanh ngọc lục bảo nhẹ) và hạt linh khí bay quanh đầu trượng.



---

### 1.2. Thiết kế hoàn chỉnh Hệ thống Cầm Nắm (Weapon Attachment, Hand Socket & Finger Curl Rigging)

Hiện tại trên màn hình game, nhân vật Lâm Dật đang đứng ở tư thế chữ A (A-Pose), hai cánh tay buông xéo hai bên hông, lòng bàn tay mở xòe và cây trượng chỉ đặt lơ lửng bên cạnh mà không hề có sự liên kết cơ học với bàn tay. Hãy sửa triệt để bằng hệ thống Rigging & Socket sau:



1. **Kiểm tra và đảm bảo hệ thống Xương (Humanoid Armature) cho Lâm Dật (`H01`):**

   - Trong pipeline Blender (`tools/tencent/`), kiểm tra model `.glb` của Lâm Dật đã có bộ xương Humanoid đầy đủ chưa. Bộ xương bắt buộc phải có các khớp chi tiết sau:

     - Thân và Chân: `Hips` (Pelvis), `Spine`, `Spine1`, `Spine2` (Chest), `Neck`, `Head`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftToeBase`, `RightUpLeg`, `RightLeg`, `RightFoot`, `RightToeBase`.

     - Tay trái: `LeftShoulder`, `LeftArm` (UpperArm), `LeftForeArm` (LowerArm), `LeftHand`, kèm các khớp ngón tay (`LeftHandThumb1..3`, `LeftHandIndex1..3`, `LeftHandMiddle1..3`, `LeftHandRing1..3`, `LeftHandPinky1..3`).

     - Tay phải: `RightShoulder`, `RightArm` (UpperArm), `RightForeArm` (LowerArm), `RightHand`, kèm đầy đủ 5 chuỗi khớp ngón tay (`RightHandThumb1..3`, `RightHandIndex1..3`, `RightHandMiddle1..3`, `RightHandRing1..3`, `RightHandPinky1..3`).

   - *Lưu ý kỹ thuật về ống tay áo rộng cổ trang (Hanfu Wide Sleeves):* Trang phục của Lâm Dật là áo trường bào cổ trang có ống tay áo rộng viền vàng. Khi gán trọng số xương (Skinning / Vertex Weights), cần phân bổ mượt (smooth weight paint gradient) giữa `UpperArm`, `ForeArm` và phần vải rủ dưới cánh tay để khi giơ tay cao hoặc chống hông, ống tay áo không bị rách mesh hay biến dạng nhọn hoắt, trong khi phần cổ tay và bàn tay vẫn lộ ra rõ ràng để nắm chặt thân trượng.



2. **Tạo Socket gắn vũ khí (`RightHand_WeaponSocket`) và tư thế Bàn Tay Nắm Trượng (`Grip Pose`):**

   - Gắn một node con tên là `RightHand_WeaponSocket` trực tiếp vào xương `RightHand`:

     - Vị trí cục bộ (`localPosition`): Đặt tại chính giữa lòng bàn tay phải (cách gốc cổ tay khoảng `0.08m` dọc theo xương bàn tay và lệch vào phía lòng bàn tay `0.025m`).

     - Góc xoay cục bộ (`localRotation`): Chỉnh trục để khi `Staff_Root` gắn vào `RightHand_WeaponSocket`, thân cây Mộc Tinh Trượng nằm vuông góc với trục nắm của các ngón tay và đi xuyên qua khe giữa ngón cái (`Thumb`) và 4 ngón còn lại (`Index`, `Middle`, `Ring`, `Pinky`).

   - **Tư thế khép ngón tay ôm thân trượng (Finger Curl Grip):**

     - Tuyệt đối không để bàn tay xòe phẳng xuyên qua thân trượng!

     - Khi ở trạng thái cầm trượng, tự động xoay các khớp đốt ngón tay phải:

       - `RightHandIndex1, Middle1, Ring1, Pinky1`: Xoay gập vào lòng bàn tay `65° - 75°`.

       - `RightHandIndex2, Middle2, Ring2, Pinky2`: Xoay gập thêm `70° - 80°` để ôm sát chu vi thân trượng (`r ≈ 0.02m`).

       - `RightHandIndex3, Middle3, Ring3, Pinky3`: Xoay gập `45°`.

       - `RightHandThumb1, Thumb2`: Xoay đối diện khóa vòng ngoài ngón trỏ và ngón giữa (`40° - 55°`), tạo thành thế nắm quyền trượng vững chắc, tự nhiên ở mọi góc xoay camera.



---



### 1.3. Kịch bản Đạo diễn & Lập trình Chi tiết Chuỗi Hoạt Ảnh Xuất Hiện của Lâm Dật (Entrance Cinematic Sequence)

*Chỉ áp dụng riêng cho nhân vật **Lâm Dật (`H01`)** khi người chơi vừa vào màn hình chọn tướng hoặc khi bấm chọn lại biểu tượng tướng `Dật`.*



Tổng thời lượng chuỗi xuất hiện: **4.20 giây (252 frames ở tốc độ 60 FPS)**, chia làm **5 Pha (Phases)** nối tiếp nhau mượt mà bằng nội suy `CubicBezier / Hermite Spline` kèm hiệu ứng vật lý và hạt (Particles):



#### **PHA 1: Dây leo khổng lồ (Thanh Mạch Đằng) trồi lên từ mặt đất (Thời gian: `0.00s → 1.05s` | Frame `0 → 63`)**

1. **Trạng thái khởi đầu (`t = 0.00s`):**

   - Nhân vật Lâm Dật và cây Mộc Tinh Trượng ban đầu ở trạng thái ẩn hoặc đang nằm chìm dưới tâm bệ đài (`y = -1.6m` dưới mặt bệ đài phép thuật), được bao bọc bên trong khối dây leo.

   - Trên mặt bệ đài xuất hiện một **Vòng Pháp Trận Thanh Mạch Đằng** phát sáng màu lục bảo pha vàng kim (`#2be38a` và `#ffd966`), xoay tròn và lan tỏa các ký tự cổ văn cùng cánh hoa/lá linh mộc bay lên.

2. **Chuyển động của Dây Leo Khổng Lồ (`0.05s → 1.05s`):**

   - Từ tâm pháp trận dưới mặt đất, **3 đến 5 thân dây leo cổ thụ khổng lồ (Giant Ancient Vines)** uốn xoắn theo đường xoắn ốc (`Helix Spline` / `TubeGeometry` động có vân vỏ cây rêu phong và mạch linh quang xanh lục chạy dọc thân) bất ngờ đâm vọt từ dưới đất lên tới độ cao `2.4m`.

   - Các nhánh dây leo đan vào nhau tạo thành một chiếc "kén linh mộc" (Vine Cocoon / Cradle) ở giữa bệ đài, sau đó tại mốc `t = 0.70s → 1.05s`, các nhánh dây leo phía trước từ từ tách mở sang hai bên và nâng dần phần bệ dây leo ở trung tâm trồi lên mặt đất.



#### **PHA 2: Lâm Dật từ từ trồi ra trong tư thế Ngồi Chồm Hổm đặc trưng (Thời gian: `0.75s → 1.85s` | Frame `45 → 111`)**

1. **Chuyển động trồi lên:**

   - Khi các dây leo khổng lồ tách ra, nhân vật **Lâm Dật từ từ trồi lên từ giữa đám dây leo** và đáp vững trên mặt bệ đài.

2. **Tư thế hình thể bắt buộc (Exact Pose Specification):**

   - **Đầu gối & Hông (Crouch / Squat Pose):** Lâm Dật ở tư thế **ngồi chồm hổm (ngồi xổm thấp anh hùng / deep squat)**:

     - Xương `Hips` (hông) hạ thấp xuống độ cao `y ≈ 0.48m` so với mặt bệ đài, hơi đổ nhẹ về phía trước (`pitch = +12°`).

     - Hai đùi (`LeftUpLeg`, `RightUpLeg`) mở sang hai bên một góc `35°` (tạo khoảng trống ở giữa hai chân) và gập cao lên.

     - Hai cẳng chân (`LeftLeg`, `RightLeg`) gập sâu (`knee flexion ≈ 115° - 125°`), hai bàn chân (`LeftFoot`, `RightFoot`) đặt vững trên mặt đất, mũi chân hơi hướng ra ngoài `20°`.

   - **Tay phải chống hông (`Right Arm on Hip`):**

     - Vai phải (`RightShoulder`) hơi mở, cánh tay trên (`RightArm`) đưa sang ngang và ra sau một chút (`abduction = 42°`), cẳng tay phải (`RightForeArm`) gập vào trong (`elbow flexion = 95°`) sao cho **bàn tay phải (`RightHand`) đặt chống vào đúng bên hông phải / đai lưng ngọc bích** của Lâm Dật, ngón tay khép tự nhiên tì lên thắt lưng.

   - **Tay trái đặt xuống đất trước mặt giữa hai chân (`Left Hand on Ground Between Legs`):**

     - Vai trái (`LeftShoulder`) hạ thấp và vươn về phía trước, cánh tay trái (`LeftArm`) và cẳng tay trái (`LeftForeArm`) duỗi thẳng hướng xuống mặt đất ở **chính giữa khoảng trống giữa hai đầu gối/hai chân trước mặt**.

     - Bàn tay trái (`LeftHand`) mở các ngón tay ấn/chạm trực tiếp lên mặt sàn bệ đài ngay giữa hai chân (`y = 0.02m`, `z = +0.22m` phía trước tâm hông), tại điểm tay trái chạm đất tỏa ra các vòng gợn sóng linh khí màu xanh ngọc lục bảo truyền xuống các rễ cây.

   - **Đầu và Ánh mắt:** Đầu (`Head`) ban đầu hơi cúi nhẹ nhìn xuống bàn tay trái đang truyền hồn lực xuống đất (`t = 1.00s`), sau đó từ từ ngẩng lên nhìn thẳng về phía camera với thần thái điềm tĩnh, uy nghiêm (`t = 1.50s → 1.85s`).



#### **PHA 3: Dây leo khổng lồ hội tụ và Biến Hình (Morph) thành cây Mộc Tinh Trượng (Thời gian: `1.85s → 2.65s` | Frame `111 → 159`)**

1. **Quá trình dây leo hóa trượng:**

   - Tại mốc `t = 1.85s`, các thân dây leo khổng lồ xung quanh Lâm Dật bắt đầu phát sáng rực rỡ ánh lục bảo và vàng kim, đồng thời **rời khỏi mặt đất, thu nhỏ dần bán kính và xoắn chặt lại với nhau ở phía bên phải - phía trên của Lâm Dật** (ở độ cao khoảng `y = 1.45m`, `x = +0.38m` bên phải nhân vật).

   - Trong khoảng `t = 2.10s → 2.55s`, các sợi dây leo xoắn tít vào lõi trung tâm kèm theo một luồng sáng linh mộc bùng lên, **biến hình (morph / dissolve transition) mượt mà thành chính xác asset cây `Mộc Tinh Trượng` mới tạo từ Hunyuan 3D** đang lơ lửng thẳng đứng trên không trung ngay tầm với bên phải của Lâm Dật.

   - Kỹ thuật chuyển đổi (Morphing Implementation):

     - Các nhánh dây leo (`VineMeshes`) co dần tọa độ đỉnh dọc theo đường cong Bezier hội tụ về đúng trục thân của `Mộc Tinh Trượng`, đồng thời giảm độ đục (`opacity: 1.0 → 0.0` kèm hiệu ứng hạt linh quang bung ra).

     - Cùng lúc đó, model `Mộc Tinh Trượng` hiện dần từ trong lõi ánh sáng ra (`scale` từ `0.85 → 1.0`, shader quét sáng dọc thân trượng từ đầu xuống đuôi) và xoay nhẹ một vòng quanh trục dọc trên không.



#### **PHA 4: Lâm Dật đứng dậy, giơ tay phải lên nắm lấy cây trượng (Thời gian: `2.45s → 3.25s` | Frame `147 → 195`)**

1. **Chuyển động đứng dậy khỏi tư thế ngồi chồm hổm (`2.45s → 2.95s`):**

   - Lâm Dật thu bàn tay trái từ dưới đất lên, đạp mạnh hai chân đẩy hông (`Hips`) từ độ cao `y = 0.48m` vươn thẳng lên tư thế đứng hiên ngang (`y = 0.98m`), tà áo trường bào xanh lục chuyển động tung nhẹ theo quán tính đứng lên.

2. **Động tác giơ tay phải lên nắm chặt Mộc Tinh Trượng (`2.70s → 3.25s`):**

   - Ngay khi đang vươn người đứng dậy, bàn tay phải của Lâm Dật rời khỏi hông, **vươn cao cánh tay phải lên phía trên bên phải** hướng thẳng tới vị trí `Grip_Pivot` (`Staff_Root`) của cây Mộc Tinh Trượng đang lơ lửng trên không.

   - Tại đúng mốc **`t = 3.05s` (Frame 183 - Moment of Grip):**

     - Lòng bàn tay phải (`RightHand_WeaponSocket`) chạm khớp hoàn toàn vào `Staff_Root` của cây trượng.

     - Toàn bộ 5 ngón tay phải lập tức khép chặt ôm lấy thân trượng (`Finger Curl Grip Pose`), đồng thời phát ra một tia sáng lóe nhẹ màu ngọc lục bảo tại vị trí bàn tay nắm trượng.

     - Chuyển quyền điều khiển cha-con (`re-parenting` trong Scene Graph): Gắn `Staff_Root` làm con trực tiếp của `RightHand_WeaponSocket` để từ giây phút này, mọi chuyển động của cánh tay và cổ tay phải sẽ điều khiển trực tiếp cây Mộc Tinh Trượng!



#### **PHA 5: Gõ mạnh cây trượng xuống đất & Chuyển sang tư thế Đứng Chờ (Thời gian: `3.25s → 4.20s` | Frame `195 → 252`)**

1. **Động tác vung tay kéo trượng và gõ mạnh xuống đất (`3.25s → 3.60s`):**

   - Sau khi nắm chắc cây trượng trên cao ở mốc `3.25s`, Lâm Dật hơi nâng nhẹ vai phải lấy đà (`3.25s → 3.38s` - *Anticipation*) rồi **dứt khoát kéo mạnh cánh tay phải xuống dưới**, dộng thẳng phần đuôi trượng (`Staff_Base_Tip`) cắm vuông góc xuống mặt sàn bệ đài ở phía bên phải mũi chân phải (`x = +0.34m`, `z = +0.18m`).

2. **Khoảnh khắc va chạm mặt đất (`t = 3.55s` - Frame 213 - Ground Impact):**

   - Ngay khi `Staff_Base_Tip` chạm vào mặt bệ đài (`y = 0.00m`):

     - **Chấn động hình ảnh (Micro Camera Shake):** Rung nhẹ camera theo trục dọc biên độ nhỏ (`amplitude = 0.035`, tắt dần trong `0.22s`) để tạo cảm giác lực gõ trượng cực kỳ có sức nặng và uy lực.

     - **Hiệu ứng Sóng Xung Kích Mộc Hệ (Emerald Shockwave & Roots VFX):** Tại điểm đuôi trượng chạm đất, một vòng sóng xung kích ánh sáng xanh lục bảo - vàng kim bung tỏa tròn ra khắp mặt bệ đài, kèm theo các nhánh rễ non phát sáng nhỏ trồi nhẹ quanh chân trượng và hàng chục cánh lá linh mộc bay lơ lửng lên cao.

     - **Phản lực cơ học (Secondary Motion):** Đầu trượng và phần tua rua/ngọc bội ở đai lưng Lâm Dật rung nhẹ theo quán tính va chạm rồi ổn định.

3. **Ổn định ở tư thế Đứng Chờ Cầm Trượng (Heroic Idle Pose - Từ `3.80s` trở đi):**

   - Từ `3.80s → 4.20s`, nhân vật chuyển mượt sang chu kỳ **Idle cầm trượng**:

     - Lâm Dật đứng thẳng uy nghi, tay phải nắm thân cây Mộc Tinh Trượng dựng đứng chống trên mặt đất bên cạnh người, tay trái thả tự nhiên hoặc đặt hờ trước bụng/hông theo phong thái đạo gia/tu tiên, lồng ngực thở nhịp nhàng, tà áo và đầu trượng phập phồng linh khí nhẹ nhàng.

   - Đảm bảo khi người chơi chuyển đổi qua lại giữa 2 nút **`TOÀN THÂN`** và **`CẬN CẢNH`** trên giao diện, nhân vật vẫn giữ nguyên tư thế cầm trượng chuẩn xác và camera căn chỉnh mượt mà.



---



## PHẦN 2: KHẮC PHỤC TRIỆT ĐỂ LỖI MÀU CỦA MODEL TRONG GAME BỊ TỐI SO VỚI MODEL / ẢNH GỐC



### 2.1. Chẩn đoán chính xác 6 nguyên nhân khiến Model Lâm Dật trong game bị tối và xỉn màu

Khi so sánh ảnh render trong game hiện tại với bản gốc từ Hunyuan 3D, model trong game bị tối sẫm (đặc biệt là vùng da mặt bị xám đen ở hốc mắt/má và màu áo xanh lục bị sẫm tối) do sự cộng hưởng của 6 lỗi kỹ thuật sau trong Three.js / WebGL pipeline:

1. **Sai không gian màu (Color Space) của BaseColor/Albedo Texture:** Khi load file `.glb` hoặc gán texture thủ công, nếu `material.map.colorSpace` không được khóa cứng là `THREE.SRGBColorSpace` (hoặc bị áp dụng gamma hai lần / thiếu giải mã sRGB), màu sắc sẽ bị lệch và tối đi rõ rệt.

2. **Thuộc tính `COLOR_0` (Vertex Colors) dư thừa trong file `.glb` của Hunyuan 3D:** Model xuất từ Hunyuan 3D thường đính kèm mảng `geometry.attributes.color` (Vertex Color) có giá trị xám hoặc ám bóng nướng sẵn (baked ambient occlusion tối). Trong Three.js, khi `material.vertexColors = true` (mặc định tự bật nếu GLTFLoader thấy `COLOR_0`), Shader sẽ lấy `BaseColorTexture * VertexColor`, làm toàn bộ model bị nhân với màu xám đen!

3. **Thông số PBR `metalness` và `roughness` không phù hợp với môi trường thiếu IBL (Image-Based Lighting):**

   - Trong Three.js, bất kỳ vật liệu `MeshStandardMaterial` nào có `metalness > 0.15` sẽ hấp thụ ánh sáng khuếch tán (`DirectionalLight` / `AmbientLight`) và đòi hỏi phải có `scene.environment` (bản đồ môi trường phản xạ HDR/PMREM) mới sáng lên được. Nếu `scene.environment` bị thiếu hoặc tối, mọi vùng có `metalness` sẽ biến thành **màu đen tuyền**!

4. **Tone Mapping nén dải sáng quá mức:** Sử dụng `ACESFilmicToneMapping` hoặc `ReinhardToneMapping` với `toneMappingExposure <= 1.0` làm vùng trung tính (midtones - chính là da mặt và vải áo xanh lục) bị dìm tối xuống tới 30% - 40%.

5. **Pháp tuyến đỉnh (Vertex Normals) chưa được làm mượt chuẩn hoặc bị đảo chiều cục bộ:** Khiến ánh sáng chiếu xiên tạo ra các vệt bóng đen gắt trên khuôn mặt ở chế độ `CẬN CẢNH`.

6. **Thiếu hệ thống Đèn Studio 3 điểm (3-Point Character Lighting) bám theo nhân vật:** Đèn cảnh chung chiếu từ trên đỉnh đầu xuống làm hốc mắt, dưới mũi và cằm của Lâm Dật bị đổ bóng đen (raccoon eyes).



---



### 2.2. Giải pháp khắc phục toàn diện (Áp dụng trực tiếp vào Code Renderer & Shader Material của Game)



Hãy viết một hàm chuẩn hóa vật liệu và ánh sáng chuyên biệt `enhanceCharacterVisualFidelity(modelRoot, renderer, scene)` và áp dụng ngay cho nhân vật Lâm Dật cùng cây Mộc Tinh Trượng:



#### **Bước 1: Chuẩn hóa Renderer & Tone Mapping cho màu sắc trung thực như ảnh gốc**

```javascript

renderer.outputColorSpace = THREE.SRGBColorSpace;

// Dùng NeutralToneMapping (hoặc LinearToneMapping / ACESFilmic với Exposure cao) để không làm xỉn màu vải xanh và da mặt

renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.35; // Tăng độ phơi sáng để tái tạo độ tươi sáng của studio gốc







