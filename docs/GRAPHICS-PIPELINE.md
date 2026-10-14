# Đồ họa và pipeline tài nguyên V2.5

Nguồn yêu cầu và điều kiện nghiệm thu: [UPGRADE-GOAL.md](UPGRADE-GOAL.md). Đây là tài nguyên thủ tục và mô hình Blender tự dựng; không nhận là tài nguyên Sinnon hoặc AI suy luận.

## Runtime

`src/art.js` dựng mặt/mắt/mũi/miệng/tai, tóc nhiều lọn, thân/giáp/vạt áo, tay có5ngón, chân và các nhóm xoay vai/khuỷu/gối;12vũkhí riêng; biến thể skin/costume. Geometry gộp theo vật liệu trong từng nhóm khớp để giảm drawcall. Template và primitive được chia sẻ; cache cận cảnh giới hạn8template. Phiên bản gần có nhiều tam giác, phiên bản vừa/xa giảm lưới; số đo thực trong `acceptance/evidence/art-metrics.json`.

`World` dùng `THREE.LOD`: gần dưới28m, vừa28–48m, xa từ48m; nạp mức cần thiết theo cảnh. Sảnh dùng mức gần; chế độ Chi tiết rút camera trận tới25m và cho phép cận cảnh người chơi/Boss. Cân bằng giữ camera31m và giới hạn tải hậu kỳ. Chuyển LOD tự động theo khoảng cách camera; không dùng mọi nhân vật ở mật độ cận cảnh cùng lúc.

Vật liệu nhân vật là MeshPhysicalMaterial. Mức gần có bản đồ normal/roughness/metalness/bump/displacement1024 bằng DataTexture (GPU nhận bản đồ texture thật, không phụ thuộc CanvasDOM), ngọc/băng có transmission,VIP có iridescence. Nhánh Chi tiết bật EffectComposer/UnrealBloomPass/OutputPass, bóngPCF4096 và đèn vũ khí; Cân bằng dùng bóng1024 và render trực tiếp. Các kỹ thuật này không chứng minh60FPS trên điện thoại.

Địa hình dùng PlaneGeometry256×256 với màu đỉnh theo7vùng; hàm độ cao tạo đồi/núi/tuyết/khe trũng và được dùng cho actor/vật thể/VFX. Rừng có thân/rễ/nhánh gộp và tán lá instanced; vùng UMinh có mặt nước uốn lượn. Cần nghiệm thu mỹ thuật/địa hình cuối; không coi số segment là chất lượng nghệ thuật đã đạt.

## Tài nguyên Blender đã tích hợp

`public/art/moc-tinh-truong/` có GLBhigh120.068tamgiác,medium12.000,low2.500 và báo cáo/checksum. `src/staff-asset.js` chứa dữ liệu đóng gói để cả HTMLđộc lập và PWA/APK nạp được mà không gọiCDN. Khi tải thành công, trượng thay vũ khí LâmDật theo LOD; skin cơ bản/VIP có màu và ngọc đính riêng. Các số đo template nhân vật chưa cộng phần trượng GLB thay thế này.

Nguồn dựng có thể chạy lại bằng Blender4.3.2 CPU:

```sh
blender --background --factory-startup --threads 2 --python-exit-code 1 \
  --python tools/art/blender-pipeline.py -- --demo \
  --output .local/art-rebuild/moc-tinh-truong --preview
```

Script xuất `source.blend`,3GLB,preview vàreport; tắt Cyclesdenoise vì bản Blender trên cloud không có OpenImageDenoise. Không đổiHOME, không yêu cầuWindowsEXE. Script này đã chạy thực tế trênCPU; xuấtGLB được kiểm tra bằng GLTFLoader. SourceBlender/báo cáo đầy đủ của lần chạy ban đầu nằm ngoài repo ở `/workspace/asset-tools`.

## Kiểm tra

```sh
npm test
npm run test:upgrade-ui  # cần frontend đang chạy; GAME_URL nếu dùng port khác
npm run verify:automated
npm run verify:upgrade  # tổng hợp phần đạt/chưa đạt của Markdown, không tự duyệt mỹ thuật
npm run verify:reuse
```

Kiểm thử HUD đo union các hình chữ nhật bao của phần UI hiển thị trong cảnh chiến đấu không mở drawer và không có tương tác ngữ cảnh gần. Đây là phép đo bảo thủ vì tính cả góc trong suốt của nút tròn. Kết quả trong `upgrade-browser.json` gồm844×390,915×412,1280×720. Drawer mở có chủ đích che vùng lớn hơn; cảnh đang chọn hướng/hủy chiêu hoặc hiện nút ngữ cảnh không thuộc phép đo trạng thái mặc định đó.

Mỹ thuật hoàn chỉnh trênAndroid, traceFPS vật lý, Boss thứ4 và chỉ số/độ bền Tiênkhí chưa được nghiệm thu/cung cấp. Giữ trạng tháiBLOCKED cho các mục đó; người dùng đã chọn chờ dữ liệu gốc, không tự đặt phụ lục cân bằng.

Pipeline Blender hiện gộp mesh và tạo LOD cho tài nguyên tĩnh; không dùng thao tác gộp đó để giữ skeleton/animation của asset nhập ngoài. Nhân vật hiện dùng rig nhóm khớp trongThree.js. Khi thay các GLB của trượng, cần tạo lại dữ liệu nhúng:

```sh
python3 - <<'PY'
from pathlib import Path
import base64,json
root=Path('public/art/moc-tinh-truong')
assets={d:'data:model/gltf-binary;base64,'+base64.b64encode((root/(d+'.glb')).read_bytes()).decode() for d in ['high','medium','low']}
Path('src/staff-asset.js').write_text('// Generated from local Blender GLB outputs.\nexport const staffAssets = '+json.dumps(assets)+';\n')
PY
```

Thay nguồn/asset sẽ đổi fingerprint và bắt buộc chạy lại kiểm chứng/buildAPK. Đừng sửa một mình fileGLB rồi giữ dữ liệu nhúng cũ.


## Phạm vi độ chi tiết

Mức gần hiện dùng radial128 cho chi tiết tròn, tóc128×32 và vòng64×256. Các phần phụ nhỏ được giảm lưới, đầu dùng128×64, vạt áo64×64; không phải mọi bộ phận đều128×128 như ví dụ cực đại trong Markdown. Mức vừa/xa giảm rõ mật độ. Báo cáo tam giác thực phải đọc theo fingerprint, không suy ra từ một tham số tessellation.

Các mô hình vẫn là bộ nhân vật thủ tục dùng chung cấu trúc thân, khác vũ khí/phụ kiện/màu và biến thể trang phục; mặt được ghép từ lưới đầu/mắt/mũi/miệng, chưa phải bộ chân dung sculpt riêng do họa sĩ tạo. Giáp và cổ ngữ là hình học thủ tục. Nghiệm thu kỹ thuật các bộ phận không thay thế mục ART10 về mỹ thuật cuối và đối chiếu toàn bộ độ chi tiết. Các phần này vẫn nằm trong công việc chưa đạt100%, cùng audit GDD và kiểm chứng thiết bị thật.
