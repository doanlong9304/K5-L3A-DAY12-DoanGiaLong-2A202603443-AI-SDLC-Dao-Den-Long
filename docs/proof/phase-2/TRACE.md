# Phase 2 — Truy vết yêu cầu → bằng chứng

Tiêu chí nghiệm thu chi tiết: [docs/spec/phase-2.md](../../spec/phase-2.md). Kết quả headless (tự sinh): [RESULTS.md](RESULTS.md).
Chạy lại ở tag `phase-2`: `npm ci && npm run verify`. FPS và UI cần build + preview (xem skill `verify`).

| Yêu cầu Ticket-02 | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Phần 1: số liệu chuẩn, contract v1.1 | Test so `game.contract.json` với `tuning.js`; scenario cho từng luật | `tests/cli.test.js`, RESULTS.md | ĐẠT |
| Thứ tự 12 bước trong tick | Code đánh số từng bước trong `step()`; scenario nhạy với thứ tự (`interact_edge_only`, `shade_hit`, `pause_resume`, `win_on_dawn_tick`) | RESULTS.md | ĐẠT |
| Hồi quy Phase 1 với số chuẩn | 23 scenario Phase 1 viết lại theo số chuẩn | RESULTS.md mục "Hồi quy Phase 1" | ĐẠT |
| Phần 2: bản đồ Đêm 1/2/3 | `default_night1..3`, cầu, bục nhảy, dốc, vách, tháp, rơi tầng | RESULTS.md, [Đêm 1](screenshot-n1.png), [Đêm 2](screenshot-n2.png), [Đêm 3](screenshot-n3.png) | ĐẠT |
| Gió mạnh Đêm 3 | `wind_night3` (10 m đúng hướng `dir_deg`) | RESULTS.md | ĐẠT. Cảnh báo lá bay/âm thanh: chỉ có trong code |
| 3.1 Gió Lạc | `drifter_*` (6 scenario) | RESULTS.md | ĐẠT |
| 3.2 Bùa Gió | `charm_*` (3 scenario) | RESULTS.md | ĐẠT |
| 3.3 Chuỗi 3 Đêm | UI smoke: menu → giới thiệu (tên đảo + Ông Đăng) → chơi; headless `--night 1..3` | [ui-smoke.json](ui-smoke.json), RESULTS.md | ĐẠT một phần. Màn kết quả → Đêm kế tiếp → Bình Minh **chưa kiểm chứng bằng tay** (chưa chơi thắng cả 3 Đêm) |
| 3.4 Tạm dừng | UI smoke (Esc mở menu, đồng hồ đứng yên 2 s, P tiếp tục); headless `pause_resume` | ui-smoke.json, RESULTS.md | ĐẠT |
| 3.5 Cài đặt lưu giữa các lần mở | UI smoke: đổi âm lượng/độ nhạy → tải lại trang → còn nguyên | ui-smoke.json | ĐẠT |
| 3.6 Âm thanh | Code `src/web/audio.js` gắn vào từng event | — | **Chưa kiểm chứng** (không ghi âm được trong headless) |
| 3.7 HUD đầy đủ | UI smoke (đồng hồ, 10 ô, k/n), ảnh chụp (bố cục, mũi tên chỉ đèn) | ui-smoke.json, ảnh | ĐẠT. Đồng hồ đỏ ≤ 30 s và lời nhắc "E — Nạp ánh sáng": chỉ có trong code, **chưa chụp ảnh** |
| 3.8 Bảng màu chuẩn | Hex trong `PAL` (`src/web/world.js`) và CSS khớp bảng; ambient = 0.15 + 0.55 × tỉ lệ đèn | Code, ảnh | ĐẠT (theo code review) |
| Headless một Đêm ≤ 30 s | 3 Đêm × 21600 tick | RESULTS.md mục "Tốc độ" (~0.3 s mỗi Đêm) | ĐẠT |
| ≥ 30 FPS ở 1280×720 | Edge headless dùng GPU thật, viewport ép 1280×720, đo FPS 12 s mỗi Đêm | [fps.json](fps.json): 57.5 / 60.0 / 58.7 FPS (Intel UHD, D3D11) | ĐẠT trên máy dev. Máy chấm có thể khác |
| Mỗi tính năng mới có ≥ 1 scenario headless | Bảng "Tính năng mới Phase 2" | RESULTS.md | ĐẠT (44 scenario P2) |
| Tính tất định | 3 Đêm × 2 seed × 2 lần, byte giống nhau | RESULTS.md | ĐẠT |
| Chơi trọn một Đêm | Bot phát lại qua CLI | RESULTS.md | Đêm 1: **thắng** (seed 3). Đêm 2–3: bot chơi hết giờ nhưng **chưa thắng** (3/6 và 1/7 đèn). Đây là giới hạn của bot đơn giản, chưa chứng minh được Đêm 2–3 thắng được bằng bot |

## Test Phase 1 đã sửa vì yêu cầu mới (không tắt âm thầm)

| Test | Thay đổi | Lý do |
|---|---|---|
| `pickup` | Không còn +10 khi nhặt | Ticket-02: điểm tính khi nạp |
| `carry_capacity`, `light_lantern`, `win_all_lit`, `deposit_*` | 5 → 10, 2.5 m → 2.0 m, công thức điểm mới | Số chuẩn |
| `island_clamp` | **Bỏ**, thay bằng `fall_off_island`, `fall_last_flame` | `fall_enabled` đổi từ false sang true |
| `safe_radius` | Thành `safe_zone_block` (6 m, đèn phải sáng) + `safe_zone_unlit_no_block` | Vùng an toàn chỉ ở đèn đã sáng |
| `pulse_*` | Tốn 3, bán kính 3D 5 m, choáng 120 tick, đẩy 4 m trong 15 tick, hồi chiêu 180 tick, +5 | Số chuẩn |
| `shade_hit_invuln` | Thành `shade_hit` (đom đóm rơi nằm lại, bóng lùi) + `invuln_contact_nothing` | Luật chuẩn |
| `shade_chase` | Bóng ở 10 m (trong tầm phát hiện 12 m) thay vì 20 m | Có thêm phát hiện / bỏ đuổi |
| `shade_spawn` | Thành `shade_spawn_schedule` (tick 300 ×2, rồi mỗi 480) | Lịch chuẩn |
| `setup_no_events` | Cho phép đúng một event `night_start` ở tick 1 | Event mới của v1.1 |
| `default_world` | Thành `default_night1..3` với các trường snapshot mới | Contract v1.1 |
