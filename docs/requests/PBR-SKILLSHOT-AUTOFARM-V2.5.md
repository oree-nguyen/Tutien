# Yêu cầu trực tiếp ngày 15/10/2026 — PBR / Skillshot / Auto Farm

Nguồn: yêu cầu trong chat của người dùng; đây là bản ghi đặc tả để thực hiện và đối chiếu, không phải chứng nhận hoàn tất. Giữ nguyên GDD V2.5, 12 nhân vật, 36 nhánh, 28 Bổ phẩm, 18 Trợ phẩm, Cổng và Thiên Đạo Hộ Giới. Không tạo Boss thứ tư hoặc dữ liệu Tiên khí khi chưa có nguồn.

## Nhân vật

Sửa sọc đen trên mặt bằng UV mặt trước ±65° hoặc UV trực tiếp đúng hướng; nền da 2048 #FFE4E6→#FDEAD7, không vẽ tóc trong vùng u .25–.75/v .20–.80. Tóc là geometry riêng. Canvas face clamp S/T, flipY true, SRGB. Mắt đủ viền mi/lông mi/tròng trắng/iris 36 tia và vòng nguyên tố/đồng tử/3 catchlights; môi Cupid/gradient/highlight, highlight mũi và makeup theo giới tính. Xóa mã H01–H12 trước người ở sảnh. Toast top14px/z9999/pointer-events none/2.2s. H05 mirror bay lệch vai phải/sau, transmission .85, iridescence1, viền trăng/mây vàng.

ProceduralCharacterPBRGenerator.generateSilkBrocadeTexture(primaryHex, secondaryHex, goldAccentHex, patternType): albedo/normal/roughness/metalness/emissive đồng bộ, mức gần 2048; micro-weave, ombre, sao gấu áo và thêu chỉ kim loại .95 với relief normal. Silk sheen .85, sheenRoughness .25. CLOUD_CRANE H04/H05/H11; SPIRIT_VINE_LOTUS H01/H07; MOUNTAIN_FLAME_SCALE H02/H06/H10; NIGHT_FOX_CRESCENT H03/H08/H09/H12. Cổ Y/gấu tay/đai/tà dùng motif, đai nhiều lớp/khóa relief/jade transmission .8 ior1.6 emissive .6/2 tua chuyển động. Tóc normal+bump sợi dọc với anisotropy/sheen. Quản lý cache/LOD để tránh nhân bản tài nguyên khi có100 actor.

## Cảnh, công trình, Hồn thú và VFX

Terrain7biome có bộ texture riêng 2048, repeat24, anisotropy theo renderer, normal/roughness/height/emissive: rừng rễ/cỏ/hoa; núi đá phiến/quặng; đầm bùn tím roughness .2/nấm; tuyết hạt/băng nứt; lava đen nứt emissive; cổ thành marble/cloud-dragon/gold channels/Bát Quái bump .15/8quẻ pulse; Bí Cảnh tinh thể/tinh hà riêng. Giữ tọa độ và luật collision/realm hiện hành.

Cổng3tầng: bệ bát giác3bậc/Lưỡng Nghi/cổ ngữ/8đèn;4trụ cong khắc chữ/energy links; vòng vàng đồng quay/vortex/skybeam khi mở. Shop mái cong ngói lưu ly/cột gỗ đỏ vàng/đèn lồng đung đưa/lò đan khói. Altar9rãnh hội tụ Huyết Tinh Thạch. Trạng thái đóng/cảnh báo/mở/overtime vẫn theo gameplay.

Firebird mào vàng/mỏ/12lông mỗi cánh/3đuôi lửa/gradient đỏ→vàng/embers. Butterfly cánh mềm bán trong pha lê/hoa văn băng/viền phát sáng. Wolf/rhino4chân có đùi/cẳng/khớp chạy; wolf vân lông xanh, rhino giáp đá relief nứt. Ba Boss giữ dữ liệu gốc. Vòng Hồn Hoàn theo trang bị tím/đen, văn tự/aura xoay dưới chân/sau lưng; VFX nguyên tố phân biệt và dùng shader.

## SmoothSkillshotController

PointerEvent với pointer capture, touch-action none; leftJoystickPointerId/rightSkillPointerId độc lập, không giật tâm khi vừa chạy vừa ngắm. Drag từ tâm nút, max75px/deadzone10px; đổi screen→world theo camera azimuth. One-Euro adaptive filter và rAF: direction alpha1-exp(-28dt), ground-offset alpha1-exp(-25dt), chuẩn hóa hữu hạn ở cả60/120Hz.

Decal trên mặt đất +.06m: range ring cyan #38BDF8/4vạch; line đúng hitbox và range có scrolling chevrons; cone đúng góc thật120/90; AOE reticle đúng radius và khoảng cách kéo0–75px, arc parabola từ tay; target/self có tether và ring dưới actor hợp lệ; highlight chân mục tiêu trong hitbox hiện hành. Giữ chỉ số/shape thật trong GDD khi ví dụ của prompt khác dữ liệu.

Quick-cast khi <160ms hoặc <10px: tướng địch ít HP/gần theo lựa chọn, rồi Boss/tinh anh/quái đang giao tranh, rồi hướng di chuyển; lead=velocity*(distance/projectileSpeed*.65). Chỉ dùng actor server đã cho thấy/cùng realm. Manual có thumb knob. Cancel góc trên phải nhận radius75px, đỏ #EF4444, scale1.15/vibrate15; nhả/cancel/lostcapture không tốn MP/CD. Queue TTL.25s, đón cooldown<=.20s hoặc backswing<=.25s, thi triển frame đầu đủ điều kiện; không thay MP/CD/CC server.

## AutoFarmAIController

HUD OFF/PVE/FULL + settings: QWE/mana reserve25%; R Boss/elite (mặc định tắt); loot+appraise; auto shop/craft; kite; avoiddanger. PvE luôn giữ R/F và cảnh báo hero18m; full được trả đòn/rút lui, altar, extract W>=40 hoặc phút15/20. Manual override ngay khi giữ joystick/skill, đợi1.2s sau nhả ngón cuối mới tiếp tục.

Utility mỗi.25s: loot20m khi còn24slot/48W score1000-10d; mutant/elite35m hp>.5 score600-8d; thường40m score400-6d+(1-hp/maxhp)*150; Boss chỉ full/Lv>=5/hp>.65. AOI online vẫn giới hạn dữ liệu nhận. Loot ưu tiên bone>legendary>blackring>purplering>currency; đồ quý thẩm định.8s, không lách khóa/realm/tải. Di chuyển tránh collision/Hồn Chướng/telegraph, tầm xa idealRange*.82 và lùi khi<2.6; cận chiến1.6–2m/orbit sau quái. H01 E/W/Q; H04 W/Q/E; H05 khiênW/Q; H07 W/Q; H08 W/Q; H09 Q/E giữ tầm; H11 E/Q/W khiHP<.75; H12 W/Q; H02 W/E/đánh/Q; H03 Q/W/đánh; H06 W/E/Q; H10 E/W/Q. Chỉ gọi hành động gameplay, không tự sửa tài nguyên/trang bị/vị trí.

Preset 7 món (ID BP):
H01:005,017,011,018,019,021,020
H02:001,002,003,010,012,027,004
H03:001,002,003,013,014,015,004
H04:005,006,007,008,013,014,025
H05:021,022,023,024,009,011,025
H06:009,010,011,012,021,022,024
H07:005,006,007,008,014,018,023
H08:005,006,007,018,017,019,011
H09:001,003,004,013,014,025,027
H10:001,002,004,010,013,014,012
H11:021,022,023,024,005,011,028
H12:005,006,007,008,015,026,017

Mua/ghép đúng7recipe và7slot tại shop/merchant/quickoffer hợp lệ, ưu tiên BROUGHT trước EARNED qua hệ thống cũ. Kiểm tra cả món đích và mọi nguyên liệu bằng luật mismatch; không mua món gây Phản Phệ. Nếu preset mâu thuẫn luật gốc, giữ luật và hiển thị món bị chặn, không sửa bảng cân bằng để ép đủ preset.
