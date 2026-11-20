# Phase 3 — Truy vết yêu cầu → bằng chứng

Kết quả headless (tự sinh, chạy CLI thật): [RESULTS.md](RESULTS.md). Quyết định thiết kế: [ADR 0001](../../adr/0001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG](../../../CHANGELOG.md).
Chạy lại ở tag `phase-3`: `npm ci && npm run verify`.

| Yêu cầu Ticket-03 | Kiểm chứng (scenario) | Kết quả |
|---|---|---|
| 1. Dầu: tối đa 100, thắp = 100, hao 1/s, tính bằng đơn vị nguyên 1/60 | `fuel_decay`, `light_lantern` | ĐẠT |
| 1. Châm dầu: công thức `used`, event `refuel`, +5/đom đóm | `refuel`, `refuel_partial` | ĐẠT |
| 1. Chọn đèn nhận được (gần nhất, id nhỏ hơn) | `deposit_tie_lower_id` | ĐẠT. "Đèn đầy dầu không được chọn": trong code (`fuel >= FUEL_MAX`); chưa có scenario riêng, vì dầu luôn hao ở bước 2 trước bước 5 nên đèn gần như không bao giờ đầy đúng lúc tương tác |
| 1. Hết dầu: tắt, `deposited = 0`, `lantern_out`, `ever_lit` giữ | `lantern_out` | ĐẠT |
| 1. Thắp lại cần 5, `relight: true`, +40, `relit_count` | `relight_cost_5` | ĐẠT |
| 1. Hiển thị thanh dầu, nhấp nháy 1 Hz khi < 30 | Code `src/web/main.js`; [screenshot-fuel.png](screenshot-fuel.png) (thanh dầu trên L1) | ĐẠT một phần: nhấp nháy **chưa kiểm chứng** (ảnh tĩnh) |
| 2. Mất vùng an toàn khi < 30 | `safe_zone_low_fuel` | ĐẠT |
| 2. `wander` chọn đèn yếu gần nhất, `drain` ở ≤ 2 m, hút 5/s, cộng dồn | `drain_weak_lantern`, `drain_stacks` | ĐẠT |
| 2. `fuel_drain` mỗi 60 tick | `drain_weak_lantern`, `drain_stacks` | ĐẠT |
| 2. `drain` → `chase` / `stunned` / `wander` | `drain_to_chase`, `drain_pulse_15`, `drain_weak_lantern` (đèn tắt), `drain_refuel_evict` (dầu ≥ 30) | ĐẠT |
| 2. Châm lên ≥ 30: đẩy ra mép trong ≤ 30 tick, không gây sát thương | `drain_refuel_evict` | ĐẠT |
| 3. Thời gian 240/270/300 | `default_night1..3` | ĐẠT |
| 3. Thắng `dawn_survived` khi đủ ceil(0.6 × n); không thắng sớm | `win_dawn_survived`, `all_lit_no_early_end`, `threshold_night2`, `threshold_night3_fail` | ĐẠT |
| 3. Thua `dawn` dưới ngưỡng; `no_flames` xét trước ở tick bình minh | `lose_dawn_below_ratio`, `no_flames_beats_dawn` | ĐẠT |
| 4. Sức chứa 10 + 2 × lần thắp, tối đa 20; HUD `đang mang / sức chứa` | `capacity_growth`, `capacity_max`, `relight_cost_5`; ảnh (HUD "0 / 10") | ĐẠT |
| 5. Điểm mới | `deposit_partial`, `light_lantern`, `relight_cost_5`, `refuel`, `drain_pulse_15`, `win_dawn_survived` | ĐẠT |
| 6. Chế độ mù màu (lưu được) | Code: setting `colorblind` lưu trong localStorage, viền `#00B3FF`, cảnh báo trắng + ⚠, đèn tắt xếp 20% + vết rách | **Chưa kiểm chứng** bằng UI smoke/ảnh |
| 7. Contract v1.2 (tuning, snapshot, scenario, event) | `tests/cli.test.js` (tuning khớp), `default_night*` (trường snapshot), các scenario trên | ĐẠT |
| Hồi quy Phase 1–2 không bị thay thế | Toàn bộ scenario P1/P2 còn hiệu lực chạy lại | ĐẠT (102/102 test) |
| Tính tất định | 3 Đêm × 2 seed × 2 lần | ĐẠT |
| Chơi trọn Đêm (bot) | Phát lại qua CLI | Bot **không còn thắng**: nó chưa biết châm dầu, nên đèn tắt trước bình minh. Giới hạn của bot, chưa chứng minh được Đêm thắng được bằng bot |

## Test cũ bị luật mới làm sai

| Test | Xử lý | Lý do |
|---|---|---|
| `win_all_lit`, `win_on_dawn_tick` | **Xóa** (có ghi chú trong `tests/scenarios.js`) | Luật "thắng khi tất cả đèn sáng" bị thay |
| `deposit_partial`, `light_lantern` | Sửa điểm (5/đom đóm), thêm `relight:false`, `fuel` | Công thức điểm mới, event mới |
| `deposit_tie_lower_id` | Dời đèn sáng L3 ra ngoài tầm | Đèn sáng giờ nhận châm dầu |
| `default_night1..3` | Thời lượng 240/270/300, thêm `capacity`, `fuel`, `ever_lit`, `relit_count` | Contract v1.2 |
