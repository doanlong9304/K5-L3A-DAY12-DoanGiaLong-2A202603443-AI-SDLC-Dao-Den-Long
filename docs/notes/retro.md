# Đánh giá từng phase và retro

## Phase 1 (tag `phase-1`)
- **Đạt:** mọi yêu cầu PRD-0 và Contract v1.0 có scenario headless; tất định; chơi được từ đầu tới thắng/thua (bot thắng 9/10 seed); HUD, ảnh "đảo sáng dần".
- **Chưa kiểm chứng:** chơi lại bằng phím R và xoay camera bằng chuột (chưa chơi tay).
- **Cần chỉnh:** test tất định ban đầu quá yếu (chỉ 11 s) nên đã gia cố. Bài học: luôn kiểm tra xem test có thực sự chạy qua cơ chế cần chứng minh hay không.

## Phase 2 (tag `phase-2`)
- **Đạt:** số chuẩn và contract v1.1; thứ tự 12 bước; 3 bản đồ; Gió Lạc, Bùa Gió, tạm dừng, lướt, rơi; 44 scenario mới; hồi quy Phase 1 viết lại theo số chuẩn và đạt; một Đêm headless ~0.3 s (giới hạn 30 s); FPS 57–60 ở 1280×720; UI smoke 12/12 (menu, tạm dừng, cài đặt được lưu).
- **Có hỏng phase trước không:** có, nhưng có chủ đích. Các luật Phase 1 bị số chuẩn thay thế, nên test Phase 1 được sửa hoặc bỏ có ghi lý do (bảng trong [TRACE Phase 2](../proof/phase-2/TRACE.md)). Không có test bị tắt âm thầm.
- **Chưa đạt / chưa kiểm chứng:** âm thanh (chỉ có trong code); chuỗi kết quả → Đêm kế tiếp → Bình Minh (chưa chơi thắng cả 3 Đêm); bot chưa thắng được Đêm 2–3.
- **Rủi ro test ẩn:** các giả định P2-1 (điểm xuất phát Đêm 3), P2-4 (thời gian `spawning`), P2-12 (`invuln` là boolean) có thể khác ý giảng viên. Nên hỏi trợ giảng; mỗi điểm sửa được trong 1–2 dòng.
- **Cần chỉnh harness:** đã thêm vào AGENTS.md quy tắc "thêm scenario trước" và "phân biệt lỗi test và lỗi code theo thứ tự tick", vì lỗi test sai do thứ tự tick đã lặp lại 2 lần.

## Phase 3 (tag `phase-3`)
- **Đạt:** mô hình đèn có dầu (số nguyên 1/60), `drain`, luật thắng bình minh, sức chứa, điểm mới, Contract v1.2; 20 scenario mới; hồi quy Phase 1–2 còn hiệu lực vẫn đạt (102/102); ADR + CHANGELOG.
- **Có hỏng phase trước không:** có chủ đích. 2 test thắng sớm bị xóa, 4 test sửa theo điểm/luật mới (danh sách trong CHANGELOG và TRACE).
- **Chưa kiểm chứng:** chế độ mù màu và nhấp nháy 1 Hz (chỉ có trong code); bot không còn thắng vì chưa biết châm dầu.
- **Cần chỉnh:** bot nên biết châm dầu và giữ ≥ 60% đèn để làm bằng chứng chơi được ở Phase 4.

## Tổng kết dự án
*(viết ở Phase 4)*
