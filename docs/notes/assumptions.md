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

> **Cập nhật Phase 2:** Ticket-02 đặt số liệu chuẩn thay mọi con số tự chọn ở trên. Các giả định #2, #3, #6, #7, #8, #10, #11, #13, #14, #15 của Phase 1 **đã bị thay thế** bởi luật chuẩn (xem [docs/spec/phase-2.md](../spec/phase-2.md)). Đáng chú ý: vùng an toàn giờ chỉ ở đèn **đã sáng** (bán kính 6 m); đom đóm rơi **nằm lại** trên đất 480 tick; điểm đom đóm tính khi **nạp**, không tính khi nhặt; rơi khỏi đảo bị phạt (`fall_enabled: true`).

## Phase 2 (Ticket-02 / Contract v1.1)

| # | Chỗ ticket chưa quy định | Giả định | Lý do |
|---|---|---|---|
| P2-1 | Điểm xuất phát Đêm 3 | **(0, 0, −20)** trên tầng 0, hướng mặt +Z. (0,0,0) nằm trong tháp chuông | Cần hỏi lại trợ giảng; đổi bằng 1 dòng trong `maps.js` |
| P2-2 | Quy ước góc | Điểm ở góc a, bán kính r là (r·cos a, y, r·sin a). Với quy ước này, các điểm 20°…160° của tầng 1 và hai dốc 30°/150° nằm ở nửa z > 0, đúng như ticket mô tả tầng 1 | Đổi dấu z sẽ đặt các điểm tầng 1 ra ngoài tầng 1 |
| P2-3 | Tăng tốc "≤ 0.1 s" | Đạt tốc độ ngay trong 1 tick (0 s ≤ 0.1 s), dừng cũng tức thì | Đúng ràng buộc, tất định, giữ vị trí chính xác cho test |
| P2-4 | Thời gian trạng thái `spawning` | 60 tick: đứng yên, không gây sát thương, vẫn bị Tỏa Sáng trúng | Ticket không nêu con số |
| P2-5 | Tốc độ `wander` của Bóng Mực | 2 m/s, đi tới một điểm sinh đom đóm ngẫu nhiên (theo seed) | Ticket chỉ nêu tốc độ đuổi |
| P2-6 | Bóng Mực và địa hình | Bay lơ lửng, tâm = mặt đất + 1.0 m; không bay ra biển mây (vật cản) và không vào tháp chuông; đẩy lùi dừng khi gặp vật cản | "dừng nếu gặp vật cản" |
| P2-7 | Đẩy khỏi vùng an toàn | Đẩy ra ngoài với tốc độ (6 + 0.01)/30 m mỗi tick, nên trường hợp xa nhất (bóng ở ngay chân đèn) mất đúng 30 tick; trong lúc đó trạng thái giữ nguyên nhưng không gây sát thương | "trong tối đa 30 tick" |
| P2-8 | Gió Lạc chạm khi Mây mang < 5 | Chạm vẫn cướp min(3, đang mang) nếu Mây mang > 0, kể cả khi Gió Lạc đang `idle` | Ticket mô tả luật chạm không kèm điều kiện trạng thái |
| P2-9 | Điểm sương sinh Gió Lạc / hướng lượn | Dùng các điểm sinh Bóng Mực của Đêm; khi `idle` lượn tới một điểm sương ngẫu nhiên | Ticket nói "điểm sương ngẫu nhiên" |
| P2-10 | Trần 30 đom đóm | Đếm tất cả đom đóm đang có (kể cả đom đóm rơi); "điểm trống" = điểm sinh chưa có đom đóm ngẫu nhiên | |
| P2-11 | `night_start` | Ghi ở tick 1 (bước đầu tiên), là event đầu tiên; bước dựng scenario vẫn không phát event | v1.0: dựng scenario không phát event |
| P2-12 | `player.invuln` trong snapshot | Boolean (đang bất tử hay không); số tick còn lại nhận qua `invuln_ticks` của scenario | Các trường số khác đều có hậu tố `_s` |
| P2-13 | `ttl_s` của đom đóm ngẫu nhiên | `null` | Không có thời hạn |
| P2-14 | Gió | Bắt đầu ở sim_tick 1800·k, hướng = số nguyên độ ngẫu nhiên theo seed, đẩy đúng 300 tick; cảnh báo 2 s trước chỉ là hiển thị | |
| P2-15 | Lướt khi đang bay từ bục nhảy | Lướt tạm thay vận tốc ngang; hết lướt thì quay lại vận tốc phóng tới khi chạm đất | "vẫn được lướt" |
| P2-16 | Tổng điểm khi chạy headless | Mỗi lần chạy headless là một Đêm; `score` là điểm của Đêm đó. Tổng các Đêm đã thắng chỉ có ở bản chơi (màn Bình Minh) | |

## Phase 3 (Ticket-03 / Contract v1.2)

| # | Chỗ ticket chưa quy định | Giả định | Lý do |
|---|---|---|---|
| P3-1 | "Không có đèn yếu thì đi về đèn tắt gần nhất như trước" | `wander` đi tới đèn **chưa sáng** gần nhất. Không còn đèn tắt nào thì lang thang giữa các điểm ngẫu nhiên như Phase 2 | Đọc theo nghĩa đen của câu |
| P3-2 | Bóng Mực `drain` có gây sát thương không | Không. Chỉ `wander`/`chase` gây sát thương; `drain` chuyển sang `chase` khi Mây trong 6 m | `drain` là "đứng yên và hút" |
| P3-3 | `fuel_drain` | Mỗi Bóng Mực tự đếm số tick đang hút (bắt đầu từ 0 khi vào `drain`, kể cả khi đặt bằng scenario); ghi ở tick đếm thứ 60, 120… với `fuel` sau khi trừ ở bước 2 | "ghi mỗi 60 tick khi đang hút" |
| P3-4 | Đèn tắt và hết dầu trong cùng bước 2 | Hút trước, hao sau, rồi xét `fuel ≤ 0` một lần cho mỗi đèn | Ticket: "ở bước 2 trừ dầu (hao + bị hút); ngay sau bước 2, đèn có fuel ≤ 0 tắt" |
| P3-5 | Bóng `drain` bị đẩy ra khi vùng an toàn quay lại | Chuyển ngay sang `wander` | Dầu ≥ 30 là điều kiện về `wander` |
| P3-6 | `ever_lit` khi scenario đặt `lit: true` | Mặc định `true` (có thể ghi đè bằng `ever_lit`); không tăng `successful_lights` | Ticket: "đèn đặt sẵn bằng scenario không tính" |
