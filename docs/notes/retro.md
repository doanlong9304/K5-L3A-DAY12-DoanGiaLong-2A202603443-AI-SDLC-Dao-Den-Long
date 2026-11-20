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

## Phase 4 (tag `phase-4`, Release `v1.0.0`)
- **Đạt (tự đo trên máy dev):** bench `avg_fps` 112, `p1_low_fps` 57, `load_ms` 2.7 s (ngưỡng 60 / 30 / 10 s); soak 10 Đêm 0 crash, RSS ×1.09 (ngưỡng ×1.2); bảng xếp hạng + export; đổi phím, phụ đề, giảm chuyển động, chữ ≥ 18 px, chữ lớn (UI smoke 12/12); contract v1.3; 108 test.
- **Chưa đạt / chưa kiểm chứng:** `peak_mem_mb = null` (bản web, có giải thích); video demo cần tác giả tự quay; bench mới chỉ đo trên máy dev, máy chấm có thể khác.

## Tổng kết dự án

### Số liệu
| | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Contract | v1.0 | v1.1 | v1.2 | v1.3 |
| Test (`npm test`) | 39 | 85 | 102 | 108 |
| Scenario headless | 24 | 67 | 85 | 85 (+ soak, bench scene) |
| Test cũ sửa hoặc xóa có lý do | — | 11 | 6 | 0 |
| Token ước tính | 150–250k | 400–600k | 200–300k | 350–500k |

Tổng token ước tính khoảng **1.1–1.7 triệu** (chỉ là ước lượng theo độ dài hội thoại, chưa đối chiếu với số liệu billing).

### Điều hiệu quả khi làm với AI
- **Kiểm chứng trước, code sau:** mỗi yêu cầu là một object trong `tests/scenarios.js`, dùng chung cho `npm test` và `npm run proof`. Nhờ vậy bằng chứng luôn khớp code và không phải viết hai lần.
- **Tách `src/core` thuần khỏi `src/web`** ngay từ CP0. Cả 4 ticket đều chỉ sửa core cho phần luật; headless, bot, soak và bench đều dùng chung một `step()`.
- **Tính tay kết quả mong đợi** (tick, điểm, dầu) trước khi chạy test. Khi test đỏ, dựa vào thứ tự tick để phân biệt lỗi của test với lỗi của code. Có 4 lần chính test sai (đom đóm trong tầm nhặt ×2, thiếu snapshot, đếm số lần bị đánh), và 3 lỗi code thật bị test bắt (hồi sinh lệch bước, Bóng Mực di chuyển 2 lần, `drain` không thoát khi bị đẩy).
- **Đo bằng công cụ thật:** FPS qua CDP với GPU thật thay vì tin con số trong ảnh SwiftShader; `heapUsed` thay vì đoán nguyên nhân RSS tăng.

### Điều chưa hiệu quả
- **Lab board không đọc tự động được** (dữ liệu nạp lúc chạy, khác tổ chức). Mỗi phase phải dán ảnh chụp đề, tốn thời gian và dễ sót chữ.
- **Viết lại cả file lớn** (`main.js`) hai lần làm mất một hiệu ứng mà README có nhắc. Phát hiện nhờ rà README, nhưng đáng lẽ nên sửa từng phần.
- **Chèn code bằng heredoc trong shell** làm vỡ chuỗi `"\n"` một lần. Sau đó chuyển sang ghi script ra file.
- **Bot chơi thử** được viết cho luật Phase 1–2, nên không còn thắng sau Ticket-03. Lẽ ra phải cập nhật bot ngay khi luật đổi.

### Harness giúp nhiều nhất
1. **`tests/scenarios.js` + `scripts/proof.js`**: một nguồn cho cả test và bằng chứng.
2. **Stop hook** chặn kết thúc khi `npm test` đỏ, nên không thể báo "xong" lúc test đang hỏng.
3. **AGENTS.md** với các quy tắc rút ra từ lỗi lặp lại: "thêm scenario trước", "phân biệt lỗi test và lỗi code theo thứ tự tick", "test bị thay thì ghi vào CHANGELOG và TRACE".
4. **Skill `verify`**: các bước build, preview, FPS, UI smoke, ảnh chụp; nhắc rằng FPS trong ảnh SwiftShader không phải số thật.

### Cách đã tiết kiệm token
Trích văn bản thuần thay vì đọc HTML 180 KB; lọc output test bằng grep; sinh `game.contract.json` từ `tuning.js`; ưu tiên phần được chấm tự động; commit nhỏ để chỉ phải đọc lại phần thay đổi.

### Nếu làm lại
- Hỏi trợ giảng sớm các giả định có rủi ro test ẩn: điểm xuất phát Đêm 3, thời gian `spawning`, kiểu dữ liệu của `invuln`, mục tiêu `wander` khi không có đèn yếu.
- Giữ bot chơi thử luôn cập nhật theo luật, làm bằng chứng "thắng được".
- Thêm CI (GitHub Actions) chạy `npm test` mỗi lần push, để kiểm chứng không phụ thuộc máy dev.
