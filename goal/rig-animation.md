# /goal — rig và animation H01/H02 theo phương án đã duyệt

Người dùng phê duyệt mục13 của [audit](../docs/anim-report/conver10-gemini-audit-2026-10-21/README.md). Đây là vòng sửa tiếp của **conver10**. Hai nguồn Gemini và toàn bộ65 yêu cầu được liên kết trong [goal máy đọc](../acceptance/goals/rig-animation-gemini.json), không chỉ ba ảnh keyframe.

## Quy tắc hoàn thành

23 cổng bắt buộc, không lấy trung bình phần trăm. Thiếu chứng cứ, sai SHA, vùng chưa kiểm hoặc validator thất bại đều chưa đạt. Chỉ validator chạy lại trên đúng asset/runtime mới được quyết định; sửa một flag `passed` trong JSON không đủ. Không hạ p9991,5/max2,0, contact5mm, seam1µm hoặc ngưỡng Android hiện hành. Cả skeleton lẫn bề mặt sau mọi retarget/clamp/IK phải được đo.

## Vòng lặp sửa

1. Khóa source/clip/body/weapon SHA, chọn lỗi có mức nghiêm trọng cao nhất và ghi giả thuyết có thể kiểm được.
2. Thêm kiểm hồi quy bắt được lỗi thực; giữ baseline và kết quả thất bại.
3. Sửa ở staging, không ghi đè `assets/base_models/`, không đưa model trượt skin vào runtime.
4. Chạy lại independent LBS trên **mọi primitive**, đúng normalized attributes/IBM, cả Entrance/Hold/clip combat, 60/120Hz và quanh key contact. Không dùng điểm neo chung công thức thay surface contact.
5. Kiểm nguồn/UV/texture/PBR, seam, giao cắt và silhouette trước/bên/sau/3/4; chụp cận tay/chân/áo. Đăng mọi ảnh mới nguyên byte vào sổ conver10.
6. Nếu trượt, ghi phạm vi/edge/frame sai, loại candidate và quay lại bước1. Không xóa báo cáo cũ hoặc đổi nhãn thất bại thành chấp nhận.
7. Khi một asset qua **toàn bộ** cổng liên quan mới tích hợp; kiểm main/worker, sảnh/trận, replay/seek/view, production/offline. Đóng APK rig+animation trước; tay áo H01 làm sau đó theo yêu cầu.
8. Chạy regression/build/APK/content hash, pushmain và APK đúng bản. Không nhận hoàn thành phần thiết bị nếu thiếu trace Android thật.

## Thứ tự sửa

A. Sửa đồng bộ mode worker và đo cây mesh visible thật, tránh kiểm sai model.

B. Sửa bind/skin/ngón và phân vùng nguồn; hai vạt/ủng không nhận weight nhầm từ bàn tay. Tách trên surface thật, không tạo thân giả dưới áo. Pattern review phải gắn source/cut SHA, không dùng boolean tự khai để bỏ seam.

C. Dựng lại apex/landing/damping/asymmetric crouch/rise/grip/hold đúng Gemini; H02 tay trái liên tục. Vũ khí cứng và contact drives VFX. Mâu thuẫn tọa độ nguồn giải bằng tỷ lệ thật và contact, không stretch xương.

D. Kiểm combat/lifecycle/fidelity, xuất APK rig+animation; sau đó mới sửa riêng tay áo H01 và xuất lại APK cuối.

## Các quyết định đã chốt từ audit

- H01 DOCX mới không yêu cầu bàn tay phải chạm đất; H02 có. Không trộn hai mô tả.
- H02 chọn ModeB tay trái; bảng ModeA không được dùng để tráo bên.
- Điểm head/tail/Euler tự mâu thuẫn trong DOCX không được ép bằng đổi chiều dài bone hoặc scale weapon theo frame. Mục tiêu silhouette/contact phải ghi riêng và kiểm thật.
- Nhịp gõ cán là yêu cầu người dùng trước, không phải keyframe2,8s literal Gemini. Bố trí nhịp gõ có contact rồi trở lại hold, không nói cán vừa lơ lửng11,5cm vừa chạm sàn.
- Giữ nguyên GLB/texture nguồn, không giảm nét; không đổi GDD/ví/kho/vault/HMAC hoặc reconnect90s.

## Nhật ký

Baseline: APK2.5.ba97bec3, H01maxstrain109,274× / H02 53,148×,374/374 mẫu hiển thị thất bại mỗihero. Đây là baseline lỗi, không là tiêu chí nới lỏng.

Nhật ký máy đọc và kết quả từng vòng được lưu ở `docs/anim-report/conver10-approved-repair-2026-10-21/`. Mục tiêu vẫn IN_PROGRESS cho tới khi mọi cổng đủ chứng cứ. Chưa có điện thoại vật lý kết nối.

## Checkpoint tiếp tục

Chạy `npm run goal:animation` để lấy trạng thái hiện hành, không lấy các flag trong receipt staging làm kết quả nghiệm thu. [Báo cáo sửa](../docs/anim-report/conver10-approved-repair-2026-10-21/README.md) liên kết số đo, mọi lần thử thất bại và ảnh.

Trong checkpoint này chỉ SOURCES/RUNTIME_MODES qua phạm vi validator đã đăng ký. Skin/timing/regression chưa đạt; 17 scope còn thiếu validator đầy đủ vẫn bị khóa. Body/clip/weapon trong APK chưa thay. Không đồng nhất 52 xương lõi (22 thân/chi + 30 đốt ngón) với 52 xương thân cộng thêm 30 ngón; hai helper bổ sung đưa bộ thử lên54.

Ưu tiên tiếp theo là kết hợp field helper với mask ngón/garment đã kiểm, sửa nén/strain/giao cắt trong nhiều pose rồi toàn chuỗi. Sau đó mới tích hợp các curve54bone vào sảnh/combat và chuẩn bị APK. Tay áo H01 giữ đúng thứ tự cuối. Khoảng cách contact5mm và penetration3mm của validator cũ đều còn hiệu lực.

### Vòng tiếp: ủng và cổ tay trên source thật

[Báo cáo riêng](../docs/anim-report/conver10-approved-repair-2026-10-21/BOOT-WRIST.md) lưu fit sàn bằng bề mặt source, field helper/ủng ghép thật và các vòng CP650/CP600. MinY key-pose về xấp xỉ0; đây chưa là FEET toàn chuỗi hoặc mask toàn bộ ủng. Bản đọc lại GLB sau CP600 có p99,9 H01/H02 dưới1,5 nhưng max vẫn khoảng3,02/3,24, nên SKIN chưa đạt.

Ảnh full source H01 cho thấy bàn tay còn bị áo che/xuyên; H02 còn vấn đề vạt áo và grip chưa hoàn tất. Các cone patch với support cũ hoặc thử zero-slot cùng chuỗi đều infeasible, không xuất weight/GLB mới. Không giải thích điều này thành toàn bộ rig bất khả thi. Bước nền tiếp phải sửa ownership/cut garment và calibration/contact trên source đã kiểm, không chỉ tăng số vòng solver. 23 cổng giữ nguyên, không đổi ngưỡng để kích hoạt. APK/tay áo H01 giữ đúng thứ tự trước đó.

### Vòng 22/10: cơ học hai vạt áo source

[Báo cáo và ảnh](../docs/anim-report/conver10-approved-repair-2026-10-21/GARMENT-PANELS.md): đã chạy partition trên bind54bone và nhiều mẫu rủ vải; không đổi registry/runtime. Grid v6 giảm giao cắt72.063→6.568 cặp trên cùng pose/source/cut nhưng max áo2,544×, xuyên sàn165mm, root bridge làm thân xấu hơn. Tất cả trial vẫn bị loại, không thêm cut pattern vào registry để ép pass.48ảnh mới đã được lưu nguyên byte vào conver10.

Goal hiện hành fingerprint4964f896… ổn định: test340/340, master215/215, verify0/37, INCOMPLETE. Tiếp vòng sửa biên eo, support chuyển tiếp và contact/drape sàn; phải qua cả strain, compression, source fan, seam, collision, normal và silhouette trước khi dựng/chứng nhận toàn clip. Chưa sửa riêng tay áo, chưa có APK mới. H02 vẫn phải làm đủ các cổng, không sao chép mask mặt H01 sang H02.

### Vòng23/10: không nhận skin từ một pose cuối

[Kiểm chuyển động và fit nhiều pose](../docs/anim-report/conver10-approved-repair-2026-10-21/CLOTH-MOTION.md): phép rút support tại một pose bị21-sample exported-GLB audit bác bỏ (max84,76×). Cách chọn hệ số gần prior giảm còn22,79× nhưng vẫn xấu hơn parent7,35×, nên không kích hoạt. Vòng fit tiếp dùng54bone parent, giữ IDs/support và body/protected, giải đồng thời5pose rồi kiểm lại21 mẫu kể cả held-out. Không dùng các interpolant diagnostic làm timeline Gemini hoặc60/120FPS.

Đã thêm normal-vs-surface diagnostics, kiểm collapse giữa hai đầu đạt, và continuation NPZ lossless/hash-bound. H02 parent54 cũng đã đo21 mẫu, max3,551960×, còn trượt. Goal sourcea5230a4a… ổn định: test346/346, master215/215, verify0/37; INCOMPLETE, chưa APK mới. Sau fit phải kiểm cả normal, giao cắt, sàn và dáng áo; qua upper-strain riêng vạt không cho phép nghiệm thu cả nhân vật. Không hạ bất kỳ ngưỡng nào hoặc chuyển17scope bị thiếu validator thành passed.

Kết quả GLB sau350 vòng: vạt max7,345744→2,036974× trên21 interpolant; toàn model15/21 mẫu qua upper-strain,162/168 primitive-pose vạt qua. Lớp lót phải p99,9=1,531489 và body/cổ tay còn fail; áo vẫn che tay nên candidate tiếp tục bị loại.60ảnh mới đã lưu nguyên byte. Probe source cho thấy support chéo hai chân ở lớp lót và Hips/Arm lọt vào cuff cạnh Thumb; cần sửa ownership/support thực thay vì chỉ tăng số vòng hoặc hạ ngưỡng. Chưa kích hoạt rig, chưa có APK mới.

### Vòng23/10 tiếp: nguồn bàn tay và đường ráp cuff

[Báo cáo và ảnh mới](../docs/anim-report/conver10-approved-repair-2026-10-21/HAND-OWNERSHIP.md): xác định crop22mm cắt qua thumb và một seed palm bị phân vào node Sleeve. Đã thử ownership theo connected source-fan, fit cả nắm tay, và truyền field sang mọi bản copy của kept seam. Remaining_Source v7 qua23/23 mẫu diagnostic; nắm max1,911374/p99,9=1,498372. Không xem đây là FINGERS hoặc SKIN_ALL_FRAMES đã đạt: chỉ truyền seam gây kéo mép áo24–28×; nối field45mm còn~7,28/5,99×; tăng90mm lại xấu hơn. Mọi trial vẫn bị loại, không thay runtime, không sửa hình học tay áo và chưa có APK mới.24ảnh mới đăng conver10 nguyên byte.

Goal fingerprint98d25cb1… stableSource=true: test350/350, master215/215, verify0/37;2scope passed,4failed,17blocked, INCOMPLETE. Phải sửa support/calibration có ràng buộc đồng thời trên hand/cuff, lớp lót và drape/contact; H02 cùng toàn Entrance/Hold/combat vẫn phải qua đủ cổng. Không nới ngưỡng hoặc gọi fit/normal/seam riêng lẻ là nghiệm thu toàn bộ.

### Vòng tiếp: không làm loãng lỗi ngón bằng p99,9 toàn primitive

[Coupled hand/cuff](../docs/anim-report/conver10-approved-repair-2026-10-21/COUPLED-HAND-CUFF.md) xử lý weight đùi lọt vào cuff, giải đồng thời trên83.042fan source, đủ cạnh qua biên và384seed cố định. GLB v9 có Remaining/Sleeve trái/phải qua upper-strain23mẫu nhưng **kiểm riêng mỗi bàn tay vẫn trượt khi nắm**: p99,9 phải1,6035/trái1,6233. Không dùng diện tích đầu/ủng trong Remaining làm loãng lỗi ngón hoặc chuyển FINGERS thành passed.

Giữ fail hình dáng: giao cắt76.417cặp, new-opposed85.166triangle, vạt còn che/xuyên tay và nén mạnh. Lớp lót phải/torso còn trượt; toàn model chỉ16/23mẫu qua upper-strain. V9 bị loại khỏi tích hợp; không tiếp tục cùng objective upper-bound-only rồi nhận mỹ thuật đạt. Bước tiếp cần kiểm pivot/ownership khớp ngón và ràng buộc bảo toàn hình dáng/normal/contact/drape trước timeline/APK; không thay hình học tay áo hoặc đảo thứ tự sleeves-last.

20rawPNG mới đã vào conver10. Goal fingerprint69bd6ca1… stableSource=true: npm test353/353, master215/215, verify0/37, INCOMPLETE. APK/runtime/H02 chưa đổi; chưa có Android thật để nghiệm thu.

Vòng chốt sau sửa bootstrap fixture: fingerprint69627ad8… stableSource=true, test353/353/master215/215/verify0/37. Kiểm riêng hai tay đủ23mẫu chỉ42/46lượt qua; giữ4lượt nắm thất bại. Các10case Python numerical đã chạy thêm từ workspace sạch không có `.local`. Các kết quả này không thay FINGERS hoặc SKIN_ALL_FRAMES thành passed.

### Vòng23/10 tiếp: ô trống local và hình dáng tay

[Báo cáo](../docs/anim-report/conver10-approved-repair-2026-10-21/HAND-SHAPE.md): sửa policy làm mất local finger ID có weight0; audit thực giữ lại1.243ô. Bản thử V11 giảm p99,9 riêng tay phải/trái về1,578524/1,600990 nhưng vẫn trượt; normal/diện tích còn xấu hơn nên bị loại.42/46lượt tay và16/23pose toàn model qua upper-strain chưa là nghiệm thu.12ảnh mới đăng nguyên byte; test356/356, master215/215, verify0/37, goalINCOMPLETE. Chưa thay runtime, chưa APK mới; H02 và tay áo giữ thứ tự/phạm vi đã chốt.

### Vòng tiếp: co từng ngón, không che lỗi bằng đồng chuyển động

[Kiểm và sửa14pose](../docs/anim-report/conver10-approved-repair-2026-10-21/HAND-ISOLATION.md) phát hiện V9 chỉ1/10phép co ngón riêng qua upper-strain. V12 tăng8/10nhưng thumb/fist còn trượt, toàn model15/23pose nên tiếp tục bị loại. Normal/collision giảm nhưng không đạt; hai proposal support/CMC cũng bị loại, không thay source pivot hoặc hạ ngưỡng.4PNG mới đăng conver10, Studio MCP đã inspect game asset thật. Test359/359, master215/215, verify0/37; goalINCOMPLETE,2passed/4failed/17blocked. Chưa thay runtime/H02, chưa APK mới; tay áo vẫn sau APK rig+animation đạt.
