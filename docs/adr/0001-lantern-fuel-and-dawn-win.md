# ADR 0001 — Đèn có nhiên liệu và luật thắng "giữ đảo sáng tới bình minh"

- Trạng thái: Đã chấp nhận (Phase 3, Ticket-03, Contract v1.2)
- Thay thế: luật "đèn đã sáng không nhận thêm đom đóm", "Bóng Mực không bao giờ vào vùng an toàn", "thắng ngay khi tất cả đèn sáng", công thức điểm Ticket-02

## Bối cảnh
Playtest cho thấy người chơi giỏi thắp hết đèn trong 2 phút rồi game kết thúc. Nhà thiết kế muốn căng thẳng kéo dài tới cuối Đêm: đèn thắp rồi vẫn có thể tắt, và mục tiêu là giữ đủ đèn sáng tới bình minh.

## Quyết định

### 1. Mô hình trạng thái đèn
Trước đây đèn có 2 trạng thái một chiều: `unlit → lit` (đứng yên mãi). Nay đèn là một vòng:

```
unlit(ever_lit=false) --nạp đủ 10--> lit(fuel=100) --fuel<=0 (step 2)--> unlit(ever_lit=true, deposited=0)
      ^                                  |  ^                                   |
      |                                  |  +-- châm dầu (refuel) -------------+ (nạp đủ 5 = thắp lại, relit_count+1)
      +----------------------------------+
lit & fuel < 30  => mất vùng an toàn, Bóng Mực có thể tới hút dầu (state drain)
```

- **Dầu lưu bằng số nguyên đơn vị 1/60** (`FUEL_MAX = 6000`), đúng khuyến nghị "độ chính xác" của ticket. Hao 1 đơn vị/tick, mỗi Bóng Mực hút 5 đơn vị/tick, mỗi đom đóm châm +600. Chỉ chia 60 và làm tròn 1 chữ số khi ghi output. Như vậy không có sai số cộng dồn khi chạy 18 000–21 600 tick, và kết quả tất định giữa các máy.
- Hao và hút dầu áp dụng ở **bước 2**. Ngay sau đó đèn có `fuel ≤ 0` tắt (event `lantern_out`), trước khi người chơi kịp tương tác ở bước 5.
- Tương tác chọn đèn "nhận được" (chưa sáng, hoặc sáng nhưng chưa đầy dầu). Gần nhất, bằng nhau thì id nhỏ hơn. Đèn sáng thì châm dầu, đèn tắt thì nạp để thắp (giá 5 nếu `ever_lit`, ngược lại 10).
- **Vùng an toàn** là một hàm `hasZone(l) = lit && fuel ≥ 30`, dùng chung cho chặn, đẩy ra và vẽ vòng. Châm lên ≥ 30 thì vùng quay lại, nên cơ chế "đẩy ra mép trong ≤ 30 tick" có sẵn từ Phase 2 tự áp dụng mà không cần thêm code.

### 2. Bóng Mực hút dầu
Thêm trạng thái `drain` vào máy trạng thái của Bóng Mực. Chỉ `wander` mới chọn đèn yếu, nên `chase` không bị phân tâm. `drain` đứng yên và chuyển sang:
- `chase` nếu Mây trong 6 m;
- `stunned` nếu trúng Tỏa Sáng (+15 điểm);
- `wander` nếu đèn tắt, dầu ≥ 30 (kể cả khi bị đẩy ra khỏi vùng vừa trở lại), hoặc cách đèn > 2 m.

### 3. Luật thắng
Bỏ thắng sớm. Bước 11: hết lửa thì thua `no_flames` trước. Tới bình minh: số đèn **đang sáng** ≥ `ceil(win_ratio × tổng)` thì thắng `dawn_survived`, kèm thưởng `50 + floor(fuel)` mỗi đèn sáng và `50` mỗi lửa. Ngược lại thua `dawn`.

### 4. Các số liên quan
Mọi số nằm trong `TUNING` (contract) hoặc `RULES` ở `src/core/tuning.js`. `game.contract.json` được sinh lại từ đó (test so khớp).

## Hệ quả
- **Tích cực:** cuối Đêm vẫn căng thẳng (phải chạy giữa các đèn để châm dầu, xua Bóng Mực đang hút). Logic đèn tập trung ở bước 2 và bước 5, dễ kiểm chứng bằng scenario.
- **Tiêu cực / rủi ro:** test cũ dựa trên "thắng khi đủ đèn" và điểm cũ phải sửa hoặc bỏ (danh sách trong [CHANGELOG](../../CHANGELOG.md) và [TRACE Phase 3](../proof/phase-3/TRACE.md)). Bot chơi thử ở Phase 2 không biết châm dầu nên không còn thắng.
- **Phương án đã cân nhắc:** lưu dầu bằng số thực rồi làm tròn mỗi tick. Bị loại vì sai số tích lũy có thể làm lệch tick đèn tắt.
