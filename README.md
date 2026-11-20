# Đảo Đèn Lồng — hướng dẫn game

> Video demo: *(sẽ bổ sung ở Phase 4)* · Đề bài lab (giữ nguyên bản gốc): [docs/lab/](docs/lab/README.md)

Game 3D góc nhìn thứ ba (Three.js, chạy trên trình duyệt) kèm chế độ headless (Node.js) theo Test Contract v1.0.
Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại 5 Đèn Lồng Lớn, và né Bóng Mực trong sương đen.

## Cài đặt và chạy (macOS / Linux / Windows, cần Node.js ≥ 20)

```bash
npm ci                    # 1. cài đặt
npm run dev -- --open     # 2. mở game trên trình duyệt (http://localhost:5173)
```

Chạy bằng Docker (đường Linux), không cần cài Node:

```bash
docker build -t dao-den-long .
docker run --rm dao-den-long                                   # chạy toàn bộ test
docker run --rm -v "$PWD/out:/out" dao-den-long node src/headless.js --seed 1 --night 1 --ticks 600 --out /out/run.jsonl
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D / mũi tên | Đi (theo hướng camera) |
| Kéo chuột, Q / Z | Xoay camera |
| Space | Nhảy |
| E | Nạp ánh sáng vào đèn (đứng trong 2.5 m) |
| F hoặc Shift trái | Tỏa sáng (tốn 1 ánh sáng, hồi chiêu 2 s) |
| R hoặc Enter | Chơi lại sau khi thắng hoặc thua |

## Luật chơi

- Đi gần đom đóm (≤ 1 m) là tự nhặt, mang tối đa 5.
- Đứng cạnh đèn và nhấn E để nạp. Mỗi đèn cần 5 ánh sáng. Thắp đủ 5 đèn trước khi trời sáng (5 phút) là **thắng**.
- Bóng Mực đuổi theo (4 m/s, chậm hơn Mây 6 m/s). Bị chạm thì mất 1 ngọn lửa, rơi một nửa số ánh sáng đang mang, rồi được bất tử 1.5 s. Hết 3 ngọn lửa là **thua**. Hết giờ cũng **thua**.
- Bóng Mực không vào được vòng sáng 4 m quanh các cột đèn, nên đó là chỗ trú ẩn.
- Tỏa sáng làm choáng mọi Bóng Mực trong 6 m trong 3 s và đẩy chúng ra xa 4 m.

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực bị choáng bởi tỏa sáng | +20 |
| Khi **thắng**: mỗi giây còn lại (làm tròn xuống) | +1 |
| Khi **thắng**: mỗi ngọn lửa còn lại | +50 |

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json] --ticks <int> --out out.jsonl [--snapshot-every 10]
```

Các lệnh và tuning khai báo trong [game.contract.json](game.contract.json). Các con số lấy từ một nguồn duy nhất là [src/core/tuning.js](src/core/tuning.js), và có test bảo đảm hai nơi khớp nhau. Mọi trường trong `tuning` đều có giá trị thật, không có trường `null`. `fall_enabled: false` vì đảo có rìa giữ người chơi lại, không rơi được.

## Test và bằng chứng

```bash
npm test          # unit + 24 scenario yêu cầu + CLI/exit code + tính tất định
npm run proof     # chạy CLI thật, sinh docs/proof/phase-1/RESULTS.md + runs/
```

- Truy vết yêu cầu → bằng chứng: [docs/proof/phase-1/TRACE.md](docs/proof/phase-1/TRACE.md)
- Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), skill [.claude/skills/verify](.claude/skills/verify/SKILL.md), Stop hook [.claude/settings.json](.claude/settings.json) chặn kết thúc khi test đỏ.

## Kiến trúc

```
src/core/      logic thuần (không three.js, không Math.random, bước cố định 1/60 s)
src/headless.js  CLI theo contract → src/core/run.js
src/web/       hiển thị + bàn phím, gọi cùng step() của core
tests/         node:test; tests/scenarios.js = scenario theo yêu cầu (dùng chung cho proof)
scripts/       proof.js (sinh bằng chứng), bot.js (bot chơi trọn đêm), hooks/
```

## Sáng tạo của tôi

Toàn bộ chỉ nằm ở phần hiển thị `src/web/`, core không bị ảnh hưởng, nên đầu ra headless không đổi:

1. **Đèn trên nón lá của Mây sáng mạnh dần theo số ánh sáng đang mang**, nhìn là biết mình đang mang bao nhiêu.
2. **Vòng sáng lan ra khi tỏa sáng**, kèm dòng thông báo ngắn ("Đèn L2 đã sáng!", "Xua được 2 Bóng Mực"…).
3. **Vòng an toàn vẽ mờ quanh mỗi cột đèn**, cho người chơi thấy chỗ Bóng Mực không vào được.

Bằng chứng phần lõi vẫn đúng: `src/headless.js` không import `src/web/`, và `npm test` cùng `npm run proof` đều đạt ở cùng commit (xem [RESULTS.md](docs/proof/phase-1/RESULTS.md)).

## Ghi nguồn

Không dùng asset bên ngoài. Toàn bộ hình là khối hình học Three.js (MIT). Code được viết với sự hỗ trợ của Claude Code.
