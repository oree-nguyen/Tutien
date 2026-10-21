# Đối chiếu 65 yêu cầu → cổng sửa

Ma trận này là phạm vi phải kiểm, không phải kết quả đạt. `C-008` là ràng buộc của lượt audit cũ; người dùng đã phê duyệt mục 13 ở lượt sửa này. Không tiếp tục áp dụng trạng thái chờ duyệt của tài liệu lịch sử.

| ID | Yêu cầu gốc | Cổng phải có chứng cứ |
| --- | --- | --- |
| C-001 | Ba khung 0–.75 / 1–1.58 / 2.42–3 phải giữ ý nghĩa, không tự biến thành tên clip3s là đạt. | H01_TIMING, H02_TIMING, CONTINUITY |
| C-002 | Chuyển Blender world (x,y,z) sang Three normalized(x,z,-y); tách giải phẫu phải/trái với phía ảnh. | BIND, CROUCH, WEAPONS |
| C-003 | Giữ chiều dài cơ thể, tỷ lệ và hình dạng skin; không kéo xương để khớp bảng tự mâu thuẫn. | BIND, SKIN_ALL_FRAMES |
| C-004 | Đủ30 đốt ngón có chuyển động thực; tay nắm bao cán, tay tự do buông tự nhiên, không xuyên vật thể. | FINGERS |
| C-005 | Euler/quaternion trong tài liệu chỉ dùng sau khi xác định rest matrix, bone roll, thứ tự rotation và hệ local/world tương thích. | BIND |
| C-006 | Kiểm đúng model đang render ở chế độ mặc định, hoạt ảnh động, toàn thân/cận mặt và combat; không dùng cảnh mesh tĩnh gốc để nghiệm thu rig. | RUNTIME_MODES, COMBAT, APK_ANIMATION |
| C-007 | Đánh giá đủ mặt trước, bên, sau,3/4 và mặt/ngón/áo; hình tham chiếu là dữ liệu bổ sung, không chứng minh hệ khớp số học. | CROUCH, FIDELITY |
| C-008 | Chỉ lập báo cáo; không tự sửa animation/rig, không xuất APK mới trước duyệt. | SOURCES |
| H01-001 | Camera chuẩn front Blender(.10,-3.80,1.05),Euler(88,0,0); bố cục trượng trái/nhân vật phải. | CROUCH, FIDELITY |
| H01-002 | Không có nhân vật trên mặt đất; ẩn cả body/phụ kiện liên quan trước khi trồi. Không bắt buộc dùng scale0 nếu visibility tương đương an toàn. | H01_TIMING, RUNTIME_MODES |
| H01-003 | Đúng6 nhánh dây leo gai tự nhiên, hướng chéo trái-dưới→phải-trên; bảng chi tiết chỉ có5 nhánh. | VFX |
| H01-004 | Từng nhánh có root/mid/tip/velocity và độ cao.52–1.72m như Bảng5, có nhánh hậu cảnh và nhánh đối trọng. | VFX |
| H01-005 | 120 mảnh đá góc cạnh+dust,radius.45,height1.65,v(±1.4,-.85,3.2),turbulence1.8. | VFX |
| H01-006 | Bật hiện tại F46, vọt lên đỉnh pelvis.780 tạiF52 rồi đáp pelvis.520 tạiF60. | H01_TIMING |
| H01-007 | Nhún giảm chấn ở1.08:pelvis.495,headbase1.122,tay vàvòm dây leo hạ theo, ổn định lại1.58. | H01_TIMING, FEET |
| H01-008 | Pelvis(0,+.04,.52),Root neo vết nứt;headbase(0,-.16,1.15), nhìn máy. | H01_TIMING, CROUCH |
| H01-009 | Thân đổ trước28°, cổ bù để nhìn camera; không gập/chùn cổ sai giải phẫu. | BIND, CROUCH |
| H01-010 | Chân bất đối xứng: gối phảiZ.30,gối tráiZ.62; phải chống mũi lùi sau,trái đặt vững phía trước. | CROUCH, FEET |
| H01-011 | Tay phải trống duỗi thấp bên trong gối phải: RWrist(-.16,-.20,.40),đầu bàn tay(-.15,-.22,.26). | CROUCH, FINGERS |
| H01-012 | Tay trái trống gập ngang trước gối trái:LShoulder(.17,-.08,.98),elbow(.35,-.14,.76),wrist(.13,-.22,.60). | CROUCH |
| H01-013 | 30 ngón mở hờ tự nhiên; tay phải chưa nắm trượng. K2 và anticipation không được thành một pose nắm duy nhất. | FINGERS |
| H01-014 | Pelvis nâng.52→.96 và dịchX0→+.45 theo chuỗi key thực; không chỉ sửa key cuối. | H01_TIMING, CONTINUITY |
| H01-015 | 6 nhánh thu gom/xoắn bện thành một trượng; vị trí/morph không tách rời vũ khí đang theo tay. | VFX, WEAPONS |
| H01-016 | Trượng nguồn giữ hình tự nhiên nhưng bố cục reference dài2.35m,bán kính.028; trụcx-.23,y-.04,đỉnh2.35. | WEAPONS |
| H01-017 | Đúng35° từ shoulder→GRIP,reach.598m; không thay bằng góc shoulder→wrist ởreach.475m. | H01_ARM, WEAPONS |
| H01-018 | Tay trái buông cạnh hông mở6.5°,wrist(.68,-.01,.9),negative space nhìn rõ. | CROUCH, FINGERS |
| H01-019 | Đứng vững, bàn chân khớp sàn, không trượt chân sau mốc chốt K3. | FEET |
| H01-020 | Vùng nắmZ1.740–1.815;khớp ngón nằm annulus.029–.034 quanh cánR.028,thumb đối chiếu42°. | FINGERS |
| H01-021 | 15 đốt phải có head/tail,quaternion,flex chính xác hoặc retarget hình học tương đương,không xuyên cán. | FINGERS |
| H01-022 | 15 đốt trái thả tự nhiên với khoảng hở trang phục; không pose bàn tay cứng hoặc xuyên đùi. | FINGERS |
| H01-023 | F110đưa tay,F122mở rộng,F132chạm,F142khóa5ngón; thumb đối chiếu,ngón khác cuộn dần. | FINGERS, H01_TIMING |
| H01-024 | Khung3 chốt pose đẹp từ2.42 đến3,không thay đổi về chân/chiều cao/tiếp xúc. | FEET, CONTINUITY |
| H01-025 | 62 xương theo mô tả24body+30finger+8staff; mapping chức năng lên rig thật,không thêm node rỗng giả đạt. | BIND |
| H01-026 | Ví dụ bpy phải được xem là minh họa thiếu ràng buộc, không là bộ animation hoàn chỉnh hay nguồn truth duy nhất. | BIND, SOURCES |
| H02-001 | Tài liệu Chuy-175m gọi nhân vật Lâm Dật/manơcanh1.85m; ngữ cảnh nhiệm vụ áp cho Hàn Trạch/H02,không đổi danh tính file gốc. | SOURCES |
| H02-002 | Camera oblique B(-.45,-2.6,.68),Euler(82,0,-12) khi búa rơi;rồi chuyển front để thấy tay và mặt đầu búa. | CROUCH, FIDELITY |
| H02-003 | Nhân vật ẩn,hạ chùy từ góc trên phải;headcenter(.93,-.04,2.8)→(-.18,-.04,.12) tại.30,giữ tới.75. | WEAPONS, VFX |
| H02-004 | Cán25° so thẳng đứng/65° so đất;tail(.509,-.04,1.597),mặt chùy hiển thị đúng góc. | WEAPONS, VFX |
| H02-005 | 150 đá sắc+dust,bụi nón110°,v4.8,origin(-.18,-.04,.02),khớp điểm đầu chùy chạm sàn. | VFX |
| H02-006 | Nhân vật bay xuống từpelvis(-.04,+.02,2.4) đến(-.04,+.04,.54),tư thế chủ độngkhông kéo xương. | H02_TIMING |
| H02-007 | Tay trái đã bắt/chộp cán trước hoặc khi đáp;giữ suốt Khung2,không đợi lúc đứng lên mới bám. | H02_GRIP_CONTINUITY |
| H02-008 | Giảm chấn pelvis.54→.518 tại1.08,sau đóvề.54,tay/đầu theo đúng chuyển động. | H02_TIMING |
| H02-009 | Pelvis(-.04,+.04,.54),thântrước26°,nghiêng−5°,headbase(-.04,-.17,1.185),đỉnh1.385. | CROUCH |
| H02-010 | Tay phải chống đất:shoulder(-.21,-.11,.98),elbow(-.22,-.15,.58),wrist(-.22,-.18,.18),fingertipZ.015. | FINGERS, FEET, CROUCH |
| H02-011 | Ngón phải xòe chống sàn,đầu ngónY/Z đúng:Thumb.048,Index.018,Middle.015,Ring.018,Pinky.025;không cổ tay lơ lửng hoặc bàn tay xuyên nền. | FINGERS, FEET |
| H02-012 | Tay trái gập nắm cán:wrist(.155,-.162,.95),grip(.135,-.162,.945),elbow(.38,-.13,.96). | H02_GRIP_CONTINUITY, FINGERS |
| H02-013 | Đùi mở đối trọng,gối phải(-.34,-.22,.42),trái(.24,-.20,.45);chân không đối xứng giản lược,đặt nền theo bảng. | CROUCH, FEET |
| H02-014 | Chùy nghiêng20°:headcenter(.34,-.18,.12),tail(-.218,-.135,1.654),cán đi qua vùng tay trái. | WEAPONS, H02_GRIP_CONTINUITY |
| H02-015 | Nâng người.54→1.005;pelvisX−.04→+.18 theo bảngModeA,trongkhi chùytilt20→0,yaw→0. | H02_TIMING, WEAPONS |
| H02-016 | ModeA=chùy viewerleft,anatomicalrightcầm;ModeB=anatomicalleftcầm,viewerright. Nên giữModeB liên tục từKhung2,nhưng chưa phải duyệt sửa. | COMBAT, H02_GRIP_CONTINUITY |
| H02-017 | Nhân vật1.85m;pelvis1.005;facecenter1.745;chùyheadcenter1.745,tail.115,top1.865. | WEAPONS, CROUCH |
| H02-018 | Chùy1.750m,exposedshaft1.510,radius.022,headbox.420×.240×.220. | WEAPONS |
| H02-019 | Mặt rộng đầu búa song song VÀ đồng hướng khuôn mặt;Nhammer=Nface=(0,-1,0)Blender;shaft+Z. | WEAPONS |
| H02-020 | Tay nắm ở1.320,tay tự doxuốngcạnhhôngvàlộ khoảngtrống;không đổi handedness ngẫu nhiên. | FINGERS, CROUCH |
| H02-021 | CánR.022;fingerannulus.023–.027;thumbopposition45°,gripZ.945K2→1.320K3,không hở/xuyên. | FINGERS |
| H02-022 | Tay không cầm thả ngón tự nhiên sau chống sàn;tránh overcurl,trục ngón lộn,vắt chéo xuyên áo. | FINGERS |
| H02-023 | K3giữ vững,không settlingchân/búa tiếp tục sau2.42;không đổi sang source tĩnh để che lỗi. | CONTINUITY, RUNTIME_MODES |
| H02-024 | Chùy là vật rắn:headcenter→tail giữ1.63m;không dùng telemetry rút/căng để khớp bảng. | WEAPONS |
| H02-025 | 60 khớp gồm24body,30ngón và6weaponcontrol;đảm bảo mapping chức năng không giả sốxương. | BIND |
| H02-026 | Bpy không phải implementation đầy đủ:modeflagprosekhông áp vào code,khôngsetfinalbody/arms/fingers đầy đủ,world→local không retarget. | BIND, SOURCES |
| V-001 | Lấy mẫu mọi frame và quanh keycontacts trên mesh thật:worldlandmarkerror,quaterniondelta,bone-lengthratio,tangent/normalflip,strain/skinfold. | SKIN_ALL_FRAMES, CONTINUITY |
| V-002 | Đo minfinger/shaftsigneddistance,gripcoverage,cổtay/áo,head/weaponclearance,groundpenetration/toegap và plantedfootdrift. | FINGERS, FEET, WEAPONS |
| V-003 | Xác minh thời điểm VFX từ geometry tiếp xúc thật;camera shot,khối lượng/anticipation/followthrough vàsilhouette so3khung. | CROUCH, VFX |
| V-004 | Đánh giáDefault/staticlobby,Animatedlobby,Replay,run/attack/cast/dash;face/fullbodykhông đánh tráo mesh. | RUNTIME_MODES, COMBAT |
| V-005 | Không gọi60/120Hz sampling là60/120FPS APK;chưa có Android thật để nghiệm thu GPU/input/animation. | ANDROID_PHYSICAL |
