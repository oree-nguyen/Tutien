# GLB fidelity — 18/10/2026

Nhánh `fidelity/01bb51b-native-glb` bắt đầu tại `01bb51b`; lịch sử trước giữ ở `archive/perf-checkpoint-20261018` (`f948c4f`). Chỉ áp dụng các path sửa boot của `9a94940`, không mang asset nén/resizing/bake/loader/đồ họa của các commit sau. Patch đối chiếu: [restore-vs-previous-head.patch](fidelity/restore-vs-previous-head.patch).

Audit xác nhận pixelRatio (1.25 balanced/1.5 ultra), mức balanced/ultra, icon WebP128, tone mapping ACES, colorSpace sRGB, ánh sáng và hàm character-fidelity đều đã có ở01bb51b, không phải thay đổi mới ở f948c4f. Phần sau đó thêm các derivative GLB giới hạn1024/512 và ETC1S màu, atlas bake low64/medium256. Nhánh này không dùng chúng.

**01bb51b là mốc lịch sử được yêu cầu, không đồng nghĩa đã trung thực GLB.** Ngay tại mốc đó, character-fidelity tắt vertexColors, ép metalness≤0.05 cho H01, gán albedo thành emissive0.28, normalScale0.35, AO0.25, IBL1.1, exposure1.35 và bốn đèn màu. Các giá trị này phải được đo/loại bỏ khi đối chiếu với GLB, không được gọi là vật liệu nguyên bản.
