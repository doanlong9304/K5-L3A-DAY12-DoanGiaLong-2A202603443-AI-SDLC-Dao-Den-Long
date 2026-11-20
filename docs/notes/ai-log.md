# Nhật ký dùng AI

Công cụ: Claude Code (VS Code extension), model Claude Opus. Một agent chính viết code; mình điều phối, duyệt kế hoạch và đọc kết quả.

| Phase | Việc giao cho AI | AI sai ở đâu / cách phát hiện | Chỉnh harness | Token / chi phí ước tính |
|---|---|---|---|---|
| CP0 | Kiểm tra môi trường, cài Node + gh, chạy thử hello headless (Windows + Docker Linux), dựng khung dự án, AGENTS.md | Docker Desktop chưa bật → lệnh docker lỗi; agent tự phát hiện và bật | AGENTS.md ban đầu: lệnh, tách core/web, cấm `Math.random` | ~vài chục nghìn token (ước lượng) |
| 1 | Đọc PRD-0 + Contract, viết core tất định, CLI headless, validate, web Three.js, 24 scenario, script proof, bot chơi thử, hook + skill | (1) Test `interact_edge_only` viết sai: đom đóm đặt trong tầm nhặt nên bị nhặt trước khi nạp → test đỏ, đọc lỗi thấy do test chứ không phải game, sửa scenario. (2) Kiểm tra tất định ban đầu yếu: người chơi đứng yên chết ở tick ~661 nên chỉ so được 11 s; phát hiện khi đọc số dòng JSONL (72) → thêm inputs đi lang thang và assert phải có event nhặt/tỏa sáng/bị đánh. (3) Ánh đèn thắp quá mờ trên ảnh chụp → xem ảnh, tăng cường độ, chụp lại | Thêm Stop hook chặn kết thúc khi `npm test` đỏ; skill `verify`; cập nhật AGENTS.md (lệnh headless/proof, nơi đặt scenario) | ~150–250 nghìn token (ước lượng, phần lớn là đọc đề + viết core/test) |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

## Cách tiết kiệm token đã dùng
- Đọc đề một lần, trích văn bản thuần từ trang Lab (9.8 KB thay vì 180 KB HTML).
- Một file `tests/scenarios.js` dùng chung cho test và script bằng chứng, không viết hai lần.
- Lọc output test bằng grep, chỉ đọc dòng pass/fail thay vì toàn bộ log.
- Commit theo từng bước nhỏ để khi sai chỉ phải xem lại phần nhỏ.
