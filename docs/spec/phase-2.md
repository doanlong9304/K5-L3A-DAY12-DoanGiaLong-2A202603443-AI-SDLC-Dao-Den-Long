# Spec Phase 2 — Ticket-02 "Ba hòn đảo" (Contract v1.1)

Nguồn: Ticket-02 trên lab board. Số liệu chuẩn nằm ở [src/core/tuning.js](../../src/core/tuning.js) (`TUNING` = khối `tuning` của contract, `RULES` = các luật chuẩn khác). Bản đồ chuẩn ở [src/core/maps.js](../../src/core/maps.js). Giả định cho chỗ ticket chưa nói: [assumptions.md](../notes/assumptions.md#phase-2-ticket-02--contract-v11).

Ký hiệu cách kiểm chứng: **H** = scenario headless trong [tests/scenarios.js](../../tests/scenarios.js) (chạy bằng `npm test` và `npm run proof`), **U** = UI smoke qua CDP ([scripts/ui-smoke.js](../../scripts/ui-smoke.js)), **S** = ảnh chụp, **F** = đo FPS ([scripts/fps.js](../../scripts/fps.js)), **M** = kiểm tra tay (chưa tự động).

## Phần 1–2: Số liệu và bản đồ chuẩn

| # | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| 1.1 | `game.contract.json` có `contract_version: "1.1"` và `tuning` khớp từng số chuẩn, có thêm `dash_*`, `night2/3_duration_s` | H `tests/cli.test.js` (so với `tuning.js`) |
| 1.2 | Chạy 6 m/s, đạt tốc độ trong ≤ 0.1 s; điều khiển trên không đầy đủ; nhảy 7 m/s, trọng lực 20 | H `move_*`, `jump` |
| 1.3 | Lướt 14 m/s × 12 tick, hồi chiêu 90 tick tính từ lúc bắt đầu; hướng = hướng đi hoặc hướng mặt; không giữ độ cao | H `dash`, `dash_facing`, `dash_air_no_hover` |
| 1.4 | Nhặt khi XZ ≤ 1 m và chênh cao ≤ 1.5 m; sức chứa 10 | H `pickup`, `pickup_height`, `carry_capacity` |
| 1.5 | 20 đom đóm ở 20 điểm khác nhau; +1 ở tick 240·k nếu < 30 và còn điểm trống | H `mote_spawn_schedule` |
| 1.6 | Đèn: 10 đom đóm, nạp nhiều lần; 2.0 m; chỉ đèn chưa sáng; gần nhất, bằng nhau thì id nhỏ hơn | H `deposit_*`, `light_lantern` |
| 1.7 | Vùng an toàn 6 m chỉ ở đèn đã sáng; bóng ngoài bị chặn ở mép; bóng trong bị đẩy ra trong ≤ 30 tick và không gây sát thương | H `safe_zone_block`, `safe_zone_unlit_no_block`, `safe_zone_evict` |
| 1.8 | Tỏa sáng: tốn 3, tâm = chân + 0.8 m, khoảng cách 3D ≤ 5 m, choáng 120 tick, đẩy 4 m trong 15 tick, làm mới khi trúng lại, +5 mỗi con; hồi chiêu 3 s | H `pulse_*` |
| 1.9 | Bóng Mực: 4.0 m/s (Đêm 3: 4.5), phát hiện 12 m / bỏ đuổi 18 m, trạng thái `spawning/wander/chase/recoil/stunned` | H `shade_chase`, `shade_detect_lose`, `shade_speed_night3` |
| 1.10 | Chạm: XZ ≤ 1 và chênh cao ≤ 1.5; tối đa 1 lần mỗi tick; lùi 2 m trong 60 tick; chạm lúc bất tử không có tác dụng | H `shade_hit`, `hit_height`, `one_hit_per_tick`, `invuln_contact_nothing` |
| 1.11 | Bị đánh: −1 lửa, rơi floor(mang/2) trên vành 1.5–2.5 m (tồn tại 480 tick), bất tử 90 tick | H `shade_hit`, `dropped_mote_ttl` |
| 1.12 | Rơi (Y < −10): đúng 1 lần, bỏ qua bất tử, mất hết đom đóm, chờ 60 tick, hồi sinh ở điểm xuất phát với vận tốc 0, bất tử 90; hết lửa thì thua ngay | H `fall_*` |
| 1.13 | Lịch sinh Bóng Mực: 2 con ở tick 300, rồi mỗi 480/420/360 tick, tối đa 6/8/10, cách người chơi ≥ 15 m | H `shade_spawn_schedule`, `shade_spawn_night2` |
| 1.14 | Thắng/thua xét sau mỗi tick: hết lửa → thua; còn sống và đủ đèn → thắng (kể cả đúng tick hết giờ); hết giờ → thua | H `win_all_lit`, `win_on_dawn_tick`, `lose_*` |
| 1.15 | Điểm: +10 mỗi đom đóm **nạp**, +100 mỗi đèn, +5 mỗi Bóng Mực trúng, thắng: + floor(giây còn) × 2 + 50 × lửa | H `deposit_partial`, `light_lantern`, `win_all_lit`, `pulse_*` |
| 1.16 | Thứ tự 12 bước trong một tick | Code `step()` trong `src/core/game.js` (các bước được đánh số); H `interact_edge_only` (nhặt trước nạp), `shade_hit` (di chuyển trước chạm) |
| 2.1 | Đêm 1: đảo r40, 5 đèn ở toạ độ chuẩn, 24 điểm đom đóm, 12 điểm sinh bóng | H `default_night1`, `fall_off_island` |
| 2.2 | Đêm 2: hai đảo r28 + cầu tre không lan can; bục nhảy phóng vy 14 và 24 m/s về tâm đảo kia, đáp sau ~1.4 s; 6 đèn | H `default_night2`, `bridge_night2`, `bridge_edge_fall_night2`, `jump_pad_night2` |
| 2.3 | Đêm 3: 3 tầng, vách đứng, 2 dốc, bục nhảy lên tầng 2, tháp chuông không leo được; 7 đèn; gió mỗi 30 s, kéo dài 5 s, 2 m/s | H `default_night3`, `ramp_night3`, `wall_night3`, `step_off_tier_night3`, `tower_night3`, `jump_pad_night3`, `wind_night3` |

## Phần 3: Tính năng mới

### 3.1 Gió Lạc (Đêm 2 và 3)
- AC1: sinh ở tick 1200·k, tối đa 2 con, id `D1, D2…`; Đêm 1 không có. — H `drifter_spawn`, `no_drifters_night1`
- AC2: `idle` (2 m/s) → `chase` khi Mây mang ≥ 5 và cách ≤ 15 m; mất điều kiện thì về `idle`. — H `drifter_steal`, `drifter_idle`
- AC3: chạm (XZ ≤ 1.2) cướp min(3, đang mang), sang `flee` 240 tick rồi biến mất; bất tử không ngăn được; không mất lửa. — H `drifter_steal`
- AC4: Tỏa sáng trúng con đang `chase` → `flee` không cướp; trúng con `flee` có đồ → thả đom đóm rơi tại chỗ, biến mất sau 120 tick; event `drifter_drop`. — H `drifter_pulse_chase`, `drifter_drop`

### 3.2 Bùa Gió
- AC1: nhặt như đom đóm, event `charm_picked {charm_id, charm_ticks: 600}`; nhặt lại thì làm mới. — H `charm_pickup_speed`
- AC2: trong 600 tick chạy 7.2 m/s, lướt không hồi chiêu (nhấn khi đang lướt bị bỏ qua). — H `charm_pickup_speed`, `charm_dash_no_cd`
- AC3: xuất hiện lại sau 2700 tick; vị trí Đêm 2 (35,0,0), Đêm 3 (±30,0,25). — H `charm_respawn`, `default_night2/3`

### 3.3 Chuỗi 3 Đêm
- AC1: Menu → giới thiệu Đêm (tên đảo + lời Ông Đăng) → chơi. — U
- AC2: thắng thì có nút Đêm kế tiếp; thua thì chơi lại Đêm đó; thắng Đêm 3 hiện màn Bình Minh với tổng điểm (tổng các Đêm đã thắng). — M (code `goResult` trong `src/web/main.js`; chưa chơi thắng cả 3 Đêm bằng tay)
- AC3: headless `--night 1|2|3` chạy đúng Đêm, có event `night_start {night}`. — H `default_night1..3`

### 3.4 Tạm dừng (Esc/P)
- AC1: logic dừng hoàn toàn (đồng hồ đứng yên). — U; headless H `pause_resume` (tick tăng, `sim_tick`/thời gian/hồi chiêu đứng yên, `state: "paused"`, event `paused`/`resumed`)
- AC2: menu có Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. — U

### 3.5 Cài đặt
- AC1: chỉnh âm lượng và độ nhạy chuột; được lưu giữa các lần mở game. — U (tải lại trang vẫn giữ giá trị)

### 3.6 Âm thanh
- AC1: có nhạc nền đêm và hiệu ứng cho nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối. — M (tạo bằng WebAudio trong `src/web/audio.js`; chưa có bằng chứng ghi âm)

### 3.7 HUD đầy đủ
- AC1: lửa trên trái; đồng hồ `mm:ss` trên giữa, đỏ và nhấp nháy khi ≤ 30 s; `k/n` và điểm trên phải; thanh 10 ô dưới giữa; hồi chiêu Lướt/Tỏa Sáng dưới phải. — U, S
- AC2: nhắc "E — Nạp ánh sáng (x/10)" khi đứng gần đèn chưa sáng; mũi tên chỉ đèn chưa sáng gần nhất khi đèn ngoài màn hình. — S (mũi tên), M (lời nhắc)

### 3.8 Bảng màu chuẩn
- AC1: các thành phần liệt kê dùng đúng mã hex (`PAL` trong `src/web/world.js`, biến CSS trong `index.html`). — Code review, S
- AC2: ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng đèn). — Code `render()` trong `src/web/main.js`

### Contract v1.1 và hiệu năng
- Snapshot có `night`, `wind`, `player.vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s`, các mảng `motes(kind, ttl_s)`, `drifters`, `charms`. — H `default_night*`
- Scenario nhận các trường mới; sai định dạng → mã thoát 2. — H `tests/cli.test.js`
- Một Đêm đầy đủ (21600 tick) chạy headless ≤ 30 s. — H `tests/cli.test.js`, RESULTS.md
- Bản thường ≥ 30 FPS trung bình ở 1280×720. — F [fps.json](../proof/phase-2/fps.json)
