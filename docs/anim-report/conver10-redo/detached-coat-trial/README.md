# Kiểm tra riêng chỗ dính tay áo–eo — không phải bản tách được duyệt

Dựa trên v7 đã gom đủ lớp lót, thử cho hai vạt theo hông/eo và tay áo theo chuỗi tay độc lập, để xác định tác động của các bản sao đỉnh tại vùng dính. Giữ nguyên toàn bộ hình học, UV/texture, clip và tay bảo vệ; **chưa duyệt đường cắt**, không có miễn trừ seam và không kích hoạt.

Hai vạt/lót đạt strain riêng gần1,0, nhưng toàn rig **FAIL**: tay áo trái p99.9/max1,8648/12,7498; tay áo phải4,3194/26,6753. Khoảng mở source-copy lớn nhất **1.062,781mm** bị checker seam hiện có phát hiện và loại. Không gọi việc loại bỏ dải kéo ở eo trong ảnh là một mesh hoàn chỉnh; cổ tay, vai, mép áo và bề mặt bị lộ còn sai.

Thử này cho ảnh khác biệt rõ của hai cách buộc support, không chứng minh đã cắt đúng. Chỉ thay nhãn node hoặc bỏ so sánh seam để pass sẽ che lỗi; các ngưỡng và kiểm định hiện có giữ nguyên.

![Cùng source ở tư thế nâng tay, support tách độc lập nhưng bị loại](semantic-garment-review-sheet.png)

Giờ chụp: `capture-manifest.json`; ảnh nguyên byte trong [sổ conver10](../../../../picture/conver10/online-pic.md). Chưa có APK mới.
