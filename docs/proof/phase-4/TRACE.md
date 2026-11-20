# Phase 4 — Truy vết yêu cầu → bằng chứng

Kết quả headless hồi quy Phase 1–3 (tự sinh): [RESULTS.md](RESULTS.md). Chạy lại ở tag `phase-4`: `npm ci && npm run verify`, rồi `npm run bench` và `npm run soak`.
Số đo là của máy dev (Intel i3-1125G4, Intel UHD, 8 GB, Windows 11, Chrome 158). Máy chấm sẽ đo lại.

| Yêu cầu Ticket-04 | Kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| 1. Bench: cửa sổ 1280×720, tắt vsync, cảnh chuẩn, camera bay vòng, khởi động 3 s, tự thoát mã 0 | `node scripts/bench.js --seed 42 --duration 30 --out bench.json` (chạy 3 lần); test cảnh bench trong core | [bench.json](../../../bench.json); `tests/cli.test.js` "bench scene (core)" | ĐẠT: `avg_fps` 112.3 (≥ 60), `p1_low_fps` 57.5 (≥ 30), `load_ms` 2672 (≤ 10000). `peak_mem_mb = null` vì bản web (giải thích trong README và `notes`) |
| 1. Cảnh bench: 200 Bóng Mực `wander`, 100 đom đóm, L1–L3 dầu 100; tắt sinh thực thể, sát thương, nhặt, hao dầu, kết thúc; sáng tạo tắt | Test core: sau 1200 tick vẫn 200/100, dầu 100, không có event nào ngoài `night_start`, trạng thái `playing`; web: `?bench` không dựng cây/đá | `tests/cli.test.js` | ĐẠT |
| 2. Soak: 10 Đêm một tiến trình, seed 7+i, input ngẫu nhiên theo tỉ lệ ticket, `crashes = 0`, `mem_end ≤ 1.2 × mem_start` | `npm run soak`; test soak trong `npm test`; kiểm tra rò rỉ: `heapUsed` qua 100 Đêm | [soak.json](../../../soak.json): 0 crash, 44.5 → 48.4 MB (×1.09); `heapUsed` 4.4 → 4.9 MB qua 100 Đêm (ghi trong ai-log) | ĐẠT |
| 3. Bảng xếp hạng: tên 3–12 `[A-Za-z0-9_]` (tiếng Việt có dấu là điểm cộng), top 10, sắp theo điểm rồi thời điểm, ISO 8601 có múi giờ, lưu trên đĩa, màn hình từ menu | `tests/leaderboard.test.js` (luật, thứ tự, định dạng); UI smoke (API ghi đĩa, tên sai bị từ chối, màn hình hiện mục) | [ui-smoke.json](ui-smoke.json) | ĐẠT. Nhập tên sau khi thua hoặc Bình Minh: có trong code (`attachNameForm`), **chưa kiểm chứng bằng tay** |
| 3. Lệnh `<run_cmd> --export-leaderboard out.json` | Test chạy CLI thật với file lưu tạm | `tests/leaderboard.test.js` | ĐẠT |
| 4. Đổi phím mọi hành động, báo trùng, khôi phục mặc định, được lưu | UI smoke (trùng phím E, đổi Nhảy sang J, tải lại vẫn J, khôi phục về Space) | ui-smoke.json | ĐẠT |
| 4. Phụ đề / chỉ báo: Bóng Mực xuất hiện (+ mũi tên mép), gió sắp thổi, 10 s cuối, đèn < 30 | Code `caption()` gắn vào event `shade_spawned`, `windEta`, đồng hồ, dầu đèn; mũi tên `#threat` | `src/web/main.js` | **Chưa kiểm chứng** bằng ảnh/UI smoke (chỉ có trong code) |
| 4. Giảm chuyển động | Tắt nhấp nháy khi bất tử, vòng sáng khi Tỏa Sáng, nhấp nháy đồng hồ (CSS) | Code | Chưa kiểm chứng tự động (game không có rung camera) |
| 4. Chữ ≥ 18 px, chữ lớn ×1.25 | UI smoke đo font nhỏ nhất đang hiển thị: menu 18 px, HUD 18 px; chữ lớn: `html` 22.5 px, được lưu | ui-smoke.json | ĐẠT |
| 5. Clone sạch, tối đa 3 lệnh | `git clone`, `npm ci`, `npm start` | README | ĐẠT (clone sạch → `npm ci` → `npm start`: game tải, lưu điểm ra data/leaderboard.json, export đúng) |
| 5. README, CHANGELOG 4 phase, CREDITS, LICENSE | Có đủ | [README](../../../README.md), [CHANGELOG](../../../CHANGELOG.md), [CREDITS](../../../CREDITS.md), [LICENSE](../../../LICENSE) | ĐẠT |
| 5. Release v1.0.0 có bản chạy được | Zip thư mục web tĩnh `dist/` + hướng dẫn | GitHub Release | Xem ghi chú phát hành |
| 6. Contract v1.3 (`bench_cmd`, `soak_cmd`) | Test kiểm tra khóa | `tests/cli.test.js` | ĐẠT |
| 7. Retro, video demo | [retro.md](../../notes/retro.md); video do tác giả quay | — | Retro ĐẠT; video: **cần tác giả quay** |
| Hồi quy Phase 1–3 | 85 scenario chạy lại qua CLI | RESULTS.md | ĐẠT |
