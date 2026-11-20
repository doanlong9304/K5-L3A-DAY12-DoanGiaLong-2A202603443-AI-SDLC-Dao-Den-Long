# Changelog

## [phase-3] — Ticket-03 "Đèn cạn dầu" (Contract v1.2)

### ⚠ Breaking changes (thay đổi phá vỡ tương thích)
- `contract_version` là `"1.2"`. `tuning` thêm `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.
- **Thời lượng Đêm** đổi từ 300/330/360 s sang **240/270/300 s**.
- **Luật thắng thay thế:** thắp hết đèn **không** còn kết thúc Đêm. Chỉ thắng ở bình minh nếu còn sống và số đèn đang sáng ≥ ceil(0.6 × tổng). `game_over.reason` có thêm `dawn_survived`, còn `all_lit` **không còn dùng**.
- **Đèn có nhiên liệu:** đèn sáng hao 1/s và tắt khi hết dầu (event `lantern_out`, `deposited` về 0). Đèn đã sáng giờ **nhận** đom đóm để châm dầu (event `refuel`). Thắp lại chỉ cần 5 đom đóm.
- **Vùng an toàn** chỉ còn ở đèn sáng có `fuel ≥ 30`.
- **Bóng Mực** có trạng thái mới `drain` (hút 5 dầu/s). Event `fuel_drain` mỗi 60 tick.
- **Công thức điểm thay toàn bộ:** +5 mỗi đom đóm nạp (thắp/thắp lại/châm), +100 thắp lần đầu, +40 thắp lại, +5 mỗi Bóng Mực trúng Tỏa Sáng (+15 nếu đang `drain`). Bình minh khi thắng: +50 + floor(fuel) mỗi đèn sáng, +50 mỗi lửa. **Bỏ** thưởng thời gian (`per_mote` 10 → 5, `per_second_left` 2 → 0).
- **Sức chứa** = 10 + 2 × successful_lights (tối đa 20). Snapshot `player.capacity`.
- Snapshot đèn thêm `fuel` (1 chữ số thập phân, đèn tắt là 0), `ever_lit`, `relit_count`. `lantern_lit` thêm `relight`.
- Scenario thêm `lanterns[].fuel/ever_lit` (`lit: true` không có `fuel` thì là 100), `player.successful_lights`, `shades[].target_lantern_id`, và trạng thái `drain`.

### Thêm
- Web: thanh dầu trên đèn sáng (nhấp nháy 1 Hz khi < 30); lời nhắc "E — Châm dầu"; HUD `đang mang / sức chứa`; cài đặt "Bảng màu dễ phân biệt" (viền Bóng Mực `#00B3FF`, cảnh báo trắng kèm ⚠; đèn tắt bị xếp 20% và có vết rách).
- [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md).

### Test đã sửa hoặc xóa vì luật mới
`win_all_lit`, `win_on_dawn_tick` (xóa, thay bằng `win_dawn_survived`, `lose_dawn_below_ratio`, `threshold_*`, `no_flames_beats_dawn`, `all_lit_no_early_end`); `deposit_partial`, `light_lantern` (điểm 5/đom đóm, `relight:false`); `deposit_tie_lower_id` (đèn sáng giờ nhận châm dầu nên dời đèn sáng ra xa); `default_night1..3` (thời lượng mới, trường snapshot mới).

## [phase-2] — Ticket-02 "Ba hòn đảo" (Contract v1.1)
- Số liệu chuẩn, 3 bản đồ, thứ tự 12 bước, lướt, rơi, Gió Lạc, Bùa Gió, tạm dừng, chuỗi 3 Đêm, HUD, âm thanh, bảng màu. Xem [spec Phase 2](docs/spec/phase-2.md).

## [phase-1] — PRD-0 (Contract v1.0)
- Bản đầu tiên: Đêm 1, headless theo contract v1.0.
