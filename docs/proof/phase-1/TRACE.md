# Phase 1 — Truy vết yêu cầu → bằng chứng

Kết quả headless chi tiết (tự sinh): [RESULTS.md](RESULTS.md). Chạy lại: `npm ci && npm run verify`.

| Yêu cầu (PRD-0 / Contract v1.0) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Đêm 1: đảo tròn, 5 Đèn Lồng Lớn | Scenario `default_world`; ảnh chụp | [RESULTS.md](RESULTS.md), [screenshot-start.png](screenshot-start.png) | ĐẠT |
| Đi lại theo hướng camera, chuẩn hóa vector | Scenario `move_forward`, `move_yaw90`, `move_normalized` | RESULTS.md | ĐẠT |
| Nhảy | Scenario `jump` | RESULTS.md | ĐẠT |
| Camera 3D góc nhìn thứ ba | Ảnh chụp bản web (camera sau lưng Mây) | [screenshot-start.png](screenshot-start.png) | ĐẠT (ảnh). Xoay camera bằng chuột/Q/Z **chưa kiểm chứng bằng tay** |
| Đom đóm rải rác, nhặt được | `default_world` (20 con), `pickup`, `carry_capacity` | RESULTS.md, ảnh | ĐẠT |
| Nạp ánh sáng để thắp đèn | `deposit_partial`, `deposit_out_of_range`, `interact_edge_only`, `light_lantern` | RESULTS.md | ĐẠT |
| Bóng Mực xuất hiện và đuổi | `shade_chase`, `shade_spawn` | RESULTS.md | ĐẠT |
| Bị chạm thì mất máu | `shade_hit_invuln` | RESULTS.md | ĐẠT |
| Tỏa sáng xua Bóng Mực, tốn ánh sáng | `pulse_stun_push`, `pulse_stun_duration`, `pulse_needs_light`, `pulse_cooldown` | RESULTS.md | ĐẠT |
| Bóng Mực sợ đèn (`safe_radius`) | `safe_radius` (600 tick, đứng trong vùng đèn không bị đánh) | RESULTS.md | ĐẠT |
| Thắng / thua / điểm | `win_all_lit`, `lose_no_flames`, `lose_dawn`; chơi trọn đêm bằng bot (seed 1 thắng, seed 5 thua) | RESULTS.md mục "Chơi trọn một đêm" | ĐẠT |
| HUD | Ảnh chụp: lửa, ánh sáng mang theo, đèn đã thắp, thời gian, điểm, trạng thái tỏa sáng | [screenshot-start.png](screenshot-start.png) | ĐẠT |
| Đảo sáng dần khi thắp đèn | So sánh ảnh 0 đèn và 4 đèn (`?seed=5&lit=4`) | [screenshot-start.png](screenshot-start.png), [screenshot-4-lit.png](screenshot-4-lit.png) | ĐẠT |
| Chơi lại sau khi thắng/thua | Code: phím R/Enter gọi `restart()` (`src/web/main.js`) | — | **Chưa kiểm chứng bằng tay** (chưa chơi thật bằng bàn phím) |
| Phong cách: vàng cam = tốt, tím đen = nguy hiểm, Mây đội nón lá có đèn | Ảnh chụp | Ảnh | ĐẠT (ở mức đồ họa đơn giản) |
| `game.contract.json` khớp số thật | Test `game.contract.json tuning mirrors src/core/tuning.js` | `tests/cli.test.js` | ĐẠT |
| CLI headless: tham số, 60 tick/s, dừng khi hết tick hoặc game kết thúc | Tất cả scenario chạy qua CLI thật | RESULTS.md, `runs/*/command.txt` | ĐẠT |
| Mô hình tick, event ghi `tick = k+1`, `time_left_s` | `pickup` (event ở tick 40), `lose_dawn` (0.5 s ở tick 30, kết thúc tick 60) | RESULTS.md | ĐẠT |
| Setup scenario không phát event, không cộng điểm | `setup_no_events`, `win_all_lit` (đèn đặt sẵn không được tính điểm) | RESULTS.md | ĐẠT |
| Output JSONL: snapshot / event / end, làm tròn 3 chữ số | Mọi scenario; `default_world` kiểm tra chu kỳ snapshot và dòng end | RESULTS.md, `runs/*/out.jsonl` | ĐẠT |
| Tính tất định | 3 seed × 2 lần, byte giống nhau; test trong `npm test` | RESULTS.md | ĐẠT |
| Mã thoát 0 / 2 / khác 0 | `tests/cli.test.js` (5 kiểu inputs hỏng + scenario hỏng) | RESULTS.md mục "Mã thoát" | ĐẠT |
| Chạy trên macOS/Linux | Docker `node:26-slim`: `npm test` đạt trong container; bản web chạy trên mọi trình duyệt | Lệnh trong README.md | ĐẠT (Linux qua Docker; chưa thử trên macOS thật) |
