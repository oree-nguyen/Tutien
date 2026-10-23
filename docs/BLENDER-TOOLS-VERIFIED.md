# Blender tools — kiểm chứng tại Game Agent, 2026-10-23 UTC

Đã dùng URL nguồn người dùng cung cấp để cài ngay trong container này. Đây là kiểm chứng công cụ, không phải nghiệm thu rig H01/H02.

| Thành phần | Revision / phiên bản | Kết quả |
|---|---|---|
| kevinbadi/blender-skills | b2f0f816d320b56ae86d52597a35284e0e6cc929 | Đọc và liên kết skill blender-toolkit |
| arjun988/blender-skills | 8f778d2405a214b508d4c7d80742be8e43acdd52 | Đọc và liên kết animation, vfx-fx cùng references |
| benjaminasterA/antigravity-awesome-skills | 3eabcd6640029f8acf4f9aea51c74c12ca864e37 | Checkout chọn lọc game-development; không tuyên bố đã nạp mọi skill |
| ifBars/blender-agent-studio | b9b714012858a73831f5e79df2bc1c80658e5dad / 0.6.4 | Manifest, validator, doctor và MCP stdio chạy được |
| Dev-GOM runtime do toolkit dẫn tới | eed6aa291ad984d436b800e7e1cb8991ef3ff866 / 1.4.4 | Build client/addon, đọc scene qua WebSocket thực |
| Bun / Blender | 1.3.5 / 4.3.2 | Studio cảnh báo upstream kiểm thử chính thức Blender 5.2 LTS |

## Kiểm chứng thực tế

- `bun run check`: PASS sau bổ sung `agents/` vào sparse checkout; lần đầu fail do thiếu file agents/openai.yaml, không sửa validator.
- `bun run doctor --blender /usr/bin/blender`: PASS lưu, mở lại .blend, Cycles CPU 128px, EEVEE 64px. Hai ảnh xem nguyên bản tại [sổ ảnh conver10](../picture/conver10/online-pic.md). Scene hộp mặc định chỉ là smoke test của upstream, không dùng làm model game.
- Client MCP stdio khởi tạo server, `listTools`: **23 tools**, gọi `blender_check_setup`: PASS. Lần gọi MCP bỏ render vì render đã chạy riêng; không tính là hai lượt render.
- Toolkit `list-objects`: kết nối `ws://127.0.0.1:9400/ws`, trả Camera/Cube/Light của scene kiểm thử thật.
- Phát hiện client toolkit upstream gọi `/` trong khi addon chỉ có `/ws`: lượt đầu HTTP 404. Vá hai URL trong bản client cục bộ, build lại, đọc scene PASS. Không sửa model game.
- Script setup đã chạy lại thành công (exit 0), kiểm tra đúng revision, không ghi đè source đang làm.

## Đường dẫn và tái lập

- Root: `/workspace/tools/installed-blender-skills/`.
- Script: `setup-tutien-blender.sh`; log: `setup-replay.log`.
- Bằng chứng: `doctor-20261023/doctor-report.json`, `doctor-mcp-20261023/doctor-report.json`, `mcp-probe.json`.
- Toolkit: `/workspace/tools/blender-toolkit-session/`; `toolkit-probe.txt`, `read-only-probe.py`, log tương ứng. Server thử nghiệm có thời hạn 25s, không chạy vĩnh viễn.
- Skill symlink: `~/.codex/skills/`; Studio MCP đã đăng ký trong cấu hình Codex người dùng, gọi executable Bun bằng đường dẫn tuyệt đối.
- Bản cài đầy đủ cùng hướng dẫn start đã lưu vào **environment draft** và yêu cầu Publish. Chưa xác nhận khôi phục trên một container mới; việc lưu draft không tự Publish hoặc nạp nóng công cụ vào host đang chạy.
- Không liên kết bộ nhớ/hội thoại của hai agent; cách chia sẻ là cấu hình môi trường và file Git tái lập.

## Giới hạn còn lại

Chưa nghiệm thu animation game, chưa sửa thêm rig hoặc xuất APK trong lượt cài công cụ này. Không thay đổi luật, UV/texture nguồn hay ngưỡng kiểm thử. Rig giữ trạng thái chưa đạt các cổng cũ; không lấy smoke test công cụ làm bằng chứng đạt rig.

Để đủ chỗ cài, duy nhất bản staging H01 v11 không được chấp nhận đã được archive lossless theo công cụ có sẵn; phục hồi kiểm SHA b9aa9f26a16633768e86412bdc9fe9c84f87765eafbf03b72ad97ec7b551c5d1 trước khi bỏ bản raw, tiết kiệm 112970440 byte. Không xóa asset nguồn/runtime/APK. Khi phục hồi dùng archive-staging-delta.py restore trên thư mục v11, parent v9 giữ nguyên.
