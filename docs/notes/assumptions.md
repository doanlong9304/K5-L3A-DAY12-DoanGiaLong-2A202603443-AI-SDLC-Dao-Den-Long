# Giả định theo phase

Mỗi dòng: chỗ mơ hồ → giả định đã chọn → lý do. Các con số nằm ở `src/core/tuning.js` và `game.contract.json`.

## Phase 1 (PRD-0 + Test Contract v1.0)

| # | Chỗ mơ hồ | Giả định | Lý do |
|---|---|---|---|
| 1 | "Ánh sáng" là gì | Ánh sáng = số đom đóm đang mang (`carried`). Nạp đèn và tỏa sáng đều tiêu `carried` | Một tài nguyên duy nhất, dễ hiểu, khớp các trường của contract |
| 2 | Nhặt đom đóm | Tự động nhặt khi trong `pickup_radius` (1.0 m), theo thứ tự danh sách, tối đa `carry_capacity` (5). Khi đầy thì đom đóm còn lại nằm yên | Contract chỉ có `pickup_radius`, không có nút nhặt |
| 3 | Nạp đèn | Nhấn interact (cạnh lên) trong `interact_radius` (2.5 m) thì nạp vào **đèn chưa thắp gần nhất**: `amount = min(carried, lantern_cost − deposited)`. Đủ `lantern_cost` (5) thì đèn sáng | Cho phép nạp dần qua nhiều lần |
| 4 | Thắng | Thắp đủ cả 5 đèn → `won/all_lit`. Kiểm tra mỗi tick nên scenario đặt sẵn 5 đèn sáng sẽ thắng ở tick 1 | |
| 5 | Thua | Hết lửa → `lost/no_flames`; hết thời gian đêm (300 s) → `lost/dawn` | Theo các `reason` của contract |
| 6 | Máu | `flames` = 3. Mỗi lần chạm Bóng Mực −1, sau đó bất tử `invuln_s` = 1.5 s (90 tick). Mỗi tick bị đánh tối đa 1 lần | |
| 7 | Đánh rơi | Khi bị chạm rơi `floor(carried × 0.5)` đom đóm; số đom đóm rơi **mất hẳn** (tan vào sương), không nằm lại trên đất | Đơn giản, tất định, tránh nhặt lại ngay lập tức |
| 8 | Tỏa sáng | Cần `carried ≥ pulse_cost` (1) và hết hồi chiêu (2 s). Mọi Bóng Mực trong `pulse_radius` (6 m) bị choáng 3 s và bị đẩy ra xa 4 m theo hướng từ người chơi. Điểm `per_stun` tính cho mỗi con bị choáng. Thiếu ánh sáng hoặc đang hồi chiêu thì không có gì xảy ra (không ghi event). Tỏa sáng khi không có Bóng Mực nào trong tầm vẫn tốn ánh sáng và ghi `pulse` với `stunned_ids: []` | "tốn ánh sáng" |
| 9 | Bóng Mực choáng | Trạng thái `stunned`: đứng yên, không gây sát thương, kéo dài đúng 180 tick rồi về `chase` | Contract bắt buộc có `stunned` |
| 10 | Bóng Mực sợ đèn | `safe_radius` (4 m) áp dụng quanh **mọi** đèn (đã thắp hay chưa). Bóng Mực bị giữ ở khoảng cách `safe_radius + 0.01 m` | Định nghĩa trong contract là "bán kính quanh đèn", không nói chỉ đèn đã thắp. Cộng 0.01 để sau khi làm tròn 3 chữ số vẫn ≥ r |
| 11 | Rơi khỏi đảo | `fall_enabled: false`. Người chơi và Bóng Mực bị giữ trong đảo bán kính 35 m. Không bao giờ ghi `player_hit` với `by: "fall"` | |
| 12 | Nhảy | Nhảy chỉ để hiển thị, không ảnh hưởng gameplay vì mọi khoảng cách đo theo XZ. Vận tốc nhảy 7 m/s, trọng lực 20 m/s² | Contract: khoảng cách theo mặt phẳng XZ |
| 13 | Điểm | Đom đóm +10, thắp đèn +100, mỗi Bóng Mực bị choáng +20. **Chỉ khi thắng**: + `floor(time_left_s)` × 1 + flames × 50 | Thưởng kết thúc chỉ hợp lý khi thắng |
| 14 | Thế giới mặc định | 5 đèn L1..L5 xếp hình ngũ giác bán kính 22 m (L1 ở +Z). 20 đom đóm ngẫu nhiên (không trong 3 m quanh người chơi), cứ 3 s sinh thêm 1 nếu còn < 20. 2 Bóng Mực ban đầu ở mép đảo; cứ 30 s sinh thêm 1 (tối đa 5), mỗi lần ghi `shade_spawned`. Bóng Mực ban đầu không ghi event vì là phần dựng màn | |
| 15 | Thứ tự trong một tick | timer → di chuyển → nhảy → nhặt → nạp đèn (→ kiểm tra thắng) → Bóng Mực di chuyển → tỏa sáng → sinh thực thể → va chạm → kiểm tra bình minh | Cần cố định để tất định. Thắng được xét trước va chạm |
| 16 | Id | Đom đóm `M1, M2…`, Bóng Mực `S1, S2…`, bỏ qua các id đã dùng trong scenario | Tất định |
| 17 | Snapshot | Chỉ ở các tick chia hết cho `--snapshot-every` (kể cả tick kết thúc nếu chia hết). Có kèm mảng `motes` (khuyến nghị) | |
| 18 | Mã thoát | Inputs/scenario không đọc được JSON hoặc sai kiểu/giá trị → 2. Thiếu tham số bắt buộc, `--night` khác 1, không đọc được file → 1 | |
| 19 | `time_left_s` | Được kẹp ≥ 0 | |
