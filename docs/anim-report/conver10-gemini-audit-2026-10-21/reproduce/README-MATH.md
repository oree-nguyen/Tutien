# Tái hiện phép đo read-only

Chạy từ thư mục gốc repo `/workspace/Tutien`, tại commit được ghi trong `motion-metrics.json`, với `npm ci` đã hoàn tất. Không cần Blender/GPU, không tải mạng, không sửa GLB/runtime.

```sh
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/measure.mjs
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/crosscheck.mjs
node docs/anim-report/conver10-gemini-audit-2026-10-21/reproduce/raw-controls.mjs
```

Phải chạy tuần tự: phép đo chính tạo JSON; hai lệnh sau bổ sung đối chứng Three và raw donor clip. JSON sẽ đổi `auditAt` theo giờ đo mới. Thời gian chụp ảnh không được suy từ thời gian chạy script. Dependencies dùng sẵn trong package-lock: Three 0.160.1, @gltf-transform/core/extensions, meshoptimizer. `getElement()` giải mã thuộc tính normalized; IBM mang dequantization nên bind physical positions cũng phải tính bằng LBS.
