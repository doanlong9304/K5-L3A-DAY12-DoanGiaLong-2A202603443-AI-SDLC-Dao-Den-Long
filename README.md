# Đảo Đèn Lồng — hướng dẫn game

> Video demo: *(sẽ bổ sung ở Phase 4)* · Đề bài lab (giữ nguyên bản gốc): [docs/lab/](docs/lab/README.md)

Game 3D góc nhìn thứ ba (Three.js, chạy trên trình duyệt) kèm chế độ headless (Node.js) theo **Test Contract v1.2**.
Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn trên **ba hòn đảo** và né Bóng Mực, Gió Lạc trong sương đen.

## Cài đặt và chạy (macOS / Linux / Windows, cần Node.js ≥ 20)

```bash
npm ci                    # 1. cài đặt
npm run dev -- --open     # 2. mở game trên trình duyệt (http://localhost:5173)
```

Chạy bằng Docker (đường Linux), không cần cài Node:

```bash
docker build -t dao-den-long .
docker run --rm dao-den-long                                   # chạy toàn bộ test
docker run --rm -v "$PWD/out:/out" dao-den-long node src/headless.js --seed 1 --night 2 --ticks 600 --out /out/run.jsonl
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D / mũi tên | Đi (theo hướng camera) |
| Kéo chuột, Q / Z | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp ánh sáng / thắp lại / châm dầu cho đèn (đứng trong 2 m) |
| F | Tỏa sáng (tốn 3 đom đóm, hồi chiêu 3 s) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

## Luật chơi (số chuẩn Ticket-02, thay đổi Ticket-03)

- **Ba Đêm nối tiếp:** Đêm 1 Đảo Bến (5 đèn, 4 phút), Đêm 2 Đảo Cau (2 đảo nối bằng cầu tre và bục nhảy, 6 đèn, 4:30), Đêm 3 Đảo Chuông (3 tầng, dốc, bục nhảy, gió mạnh, 7 đèn, 5 phút). Thắng thì sang Đêm kế, thua thì chơi lại Đêm đó. Thắng Đêm 3 thì thấy Bình Minh cùng tổng điểm.
- Đi gần đom đóm (≤ 1 m) là tự nhặt. Sức chứa 10, tăng 2 mỗi lần thắp thành công (tối đa 20). Mỗi đèn cần 10 đom đóm để thắp lần đầu.
- **Đèn cạn dầu (Ticket-03):** đèn sáng có 100 dầu, hao 1/giây, hết dầu thì tắt. Nhấn E ở đèn đang sáng để châm dầu (mỗi đom đóm +10 dầu). Đèn từng sáng chỉ cần 5 đom đóm để thắp lại.
- **Thắng ở bình minh:** còn sống khi hết giờ và số đèn đang sáng ≥ 60% (3/5, 4/6, 5/7). Thắp hết đèn không kết thúc Đêm sớm.
- Bóng Mực phát hiện Mây trong 12 m và đuổi (4 m/s, Đêm 3 là 4.5 m/s). Bị chạm thì mất 1 Ngọn Lửa, rơi một nửa số đom đóm (nhặt lại được trong 8 s), rồi được bất tử 1.5 s. Rơi khỏi đảo cũng mất 1 lửa và toàn bộ đom đóm. Hết 3 lửa là **thua**, hết giờ cũng **thua**.
- Đèn sáng có **dầu ≥ 30** tạo vùng an toàn 6 m. Dưới 30 thì mất vùng, và Bóng Mực đang lang thang sẽ tới hút dầu (5/giây). Tỏa Sáng để xua chúng.
- Tỏa sáng làm choáng Bóng Mực trong 5 m trong 2 s và đẩy chúng lùi 4 m.
- **Gió Lạc** (Đêm 2–3) cướp tối đa 3 đom đóm khi Mây mang từ 5 con trở lên. Tỏa sáng trúng thì nó bỏ chạy, hoặc đánh rơi đồ đã cướp.
- **Bùa Gió** (Đêm 2–3): chạy 7.2 m/s và lướt không hồi chiêu trong 10 s.

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn (thắp mới, thắp lại hoặc châm dầu) | +5 |
| Thắp lần đầu | +100 |
| Thắp lại | +40 |
| Mỗi Bóng Mực trúng Tỏa Sáng | +5 (tổng +15 nếu nó đang hút dầu) |
| Bình minh (khi thắng): mỗi đèn đang sáng | +50 + floor(dầu) |
| Bình minh (khi thắng): mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm game là tổng điểm các Đêm đã thắng.

## Chế độ headless (Test Contract v1.2)

```bash
node src/headless.js --seed <int> --night <1|2|3> [--scenario f.json] [--inputs f.json] --ticks <int> --out out.jsonl [--snapshot-every 10]
```

Các lệnh và tuning khai báo trong [game.contract.json](game.contract.json). Các con số là số chuẩn của Ticket-02, lấy từ một nguồn duy nhất [src/core/tuning.js](src/core/tuning.js), và có test bảo đảm hai nơi khớp nhau. Bản đồ chuẩn ở [src/core/maps.js](src/core/maps.js). Không có trường `null`.

## Test và bằng chứng

```bash
npm test          # 102 test: scenario Phase 1–3, CLI/exit code, tất định, tốc độ
npm run proof     # chạy CLI thật, sinh docs/proof/phase-3/RESULTS.md + runs/
npm run build && npx vite preview --port 4173   # rồi: npm run fps / node scripts/ui-smoke.js
```

- Spec + tiêu chí nghiệm thu Phase 2: [docs/spec/phase-2.md](docs/spec/phase-2.md) · Quyết định thiết kế Phase 3: [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md) · [CHANGELOG](CHANGELOG.md)
- Truy vết: [Phase 1](docs/proof/phase-1/TRACE.md) · [Phase 2](docs/proof/phase-2/TRACE.md) · [Phase 3](docs/proof/phase-3/TRACE.md)
- Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md) · Đánh giá/retro: [docs/notes/retro.md](docs/notes/retro.md)
- Harness AI: [AGENTS.md](AGENTS.md), skill [.claude/skills/verify](.claude/skills/verify/SKILL.md), Stop hook [.claude/settings.json](.claude/settings.json) chặn kết thúc khi test đỏ.

## Kiến trúc

```
src/core/      logic thuần (không three.js, không Math.random, bước cố định 1/60 s, 12 bước mỗi tick)
  tuning.js    số chuẩn · maps.js bản đồ chuẩn · game.js mô phỏng · validate.js · run.js
src/headless.js  CLI theo contract
src/web/       hiển thị, HUD, màn hình, âm thanh; gọi cùng step() của core
tests/         node:test; tests/scenarios.js = scenario theo yêu cầu (dùng chung cho proof)
scripts/       proof.js, bot.js, fps.js, ui-smoke.js, hooks/
```

## Sáng tạo của tôi

Toàn bộ chỉ nằm ở phần hiển thị `src/web/`, core không bị ảnh hưởng, nên đầu ra headless không đổi:

1. **Đèn trên nón lá của Mây sáng mạnh dần theo số đom đóm đang mang.**
2. **Vòng sáng lan ra khi Tỏa Sáng**, kèm dòng thông báo ngắn ("Đèn L2 đã sáng!", "Gió Lạc cướp 3 đom đóm!"…).
3. **Vòng an toàn 6 m hiện quanh đèn đã sáng**, cho người chơi thấy chỗ trú.
4. **Lời dẫn của Ông Đăng** cho từng Đêm, và màn Bình Minh khi thắng cả ba Đêm.
5. **Âm thanh tổng hợp bằng WebAudio**: không cần file asset, nên không có vấn đề bản quyền.
6. **Cây cối và tảng đá nhỏ** trên cả ba đảo: cây tròn kiểu cổ tích, đá low-poly. Vị trí cố định cho mỗi Đêm, tránh đèn, điểm đom đóm, bục nhảy, cầu và mép tầng. Chỉ để trang trí (không va chạm), nên bản đồ chuẩn và đầu ra headless không đổi. Bằng chứng: [ảnh Đêm 1–3](docs/proof/decor/), FPS sau khi thêm [59.9 / 54.3 / 51.7](docs/proof/decor/fps.json) (≥ 30), `npm test` vẫn đạt.

Bằng chứng phần lõi vẫn đúng: `src/headless.js` không import `src/web/`, và `npm test` cùng `npm run proof` đều đạt ở cùng commit (xem [RESULTS.md](docs/proof/phase-3/RESULTS.md)).

## Ghi nguồn

Không dùng asset bên ngoài. Hình là khối hình học Three.js (MIT), âm thanh tổng hợp bằng WebAudio. Code được viết với sự hỗ trợ của Claude Code.
