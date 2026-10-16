# Goal — ModelScope / Hunyuan3D-2.1

Mục tiêu cuối: 167 target có model Tencent hợp lệ, UV/texture và bộ phận thật, nghiệm thu game trước khi loại bỏ primitive legacy. **Chưa đạt 100%.** Chi tiết bằng chứng/lệnh chạy: [MODELSCOPE.md](MODELSCOPE.md).

| Hạng mục | Trạng thái |
| --- | --- |
| Cài SDK ModelScope, giữ toolchain Blender/MCP | Đạt kiểm tra cục bộ |
| Provider mặc định ModelScope/GPU riêng, không HF fallback ngầm | Đã lập trình và kiểm thử |
| Probe kho/Studio và named endpoints thực | Đã chạy; weights có, chưa có API GPU |
| Script GPU + notebook một ô lệnh | Đã viết; CUDA build/inference chưa chạy trên GPU |
| T4/A10 mặc định | Không đủ VRAM cho worker cả shape/PBR; không coi là hỗ trợ |
| Blender UV projection và receipt phân biệt PBR | Đã chạy trên H01, UV/albedo 2048 có thật |
| H01 đủ bộ phận/rig/LOD và chất lượng game | Chưa đạt; validator thiếu node |
| H05, Mộc Tinh Trượng, Nguyệt Linh Kính | Chưa có GLB đạt; concept H05 bị loại |
| Tái sử dụng base mesh | 107 nhóm ứng viên/167 target; 0 alias duyệt |
| Thay runtime, xóa primitive legacy | 0/167; giữ game hoạt động |
| Kiểm thử tooling | 35 test đạt; không phải test GPU/gameplay |
| APK mới/Android thật | Chưa thực hiện trong đợt này |

Điểm chặn thực tế: container không GPU NVIDIA, chưa có `HUNYUAN_REMOTE_URL`; metadata ModelScope 2.1 báo không hỗ trợ API inference và không liên kết Studio. Notebook không tự cấp GPU Colab/PAI. Cần chạy trên GPU đủ VRAM và cung cấp URL healthy; Part/concept cũng cần endpoint hoạt động. Không đổi tên node rỗng, nhân bản một mesh thành mọi asset hoặc coi ảnh chiếu một mặt là PBR để đánh dấu hoàn tất.
