# Phase 1 — Kết quả kiểm chứng (tự sinh bởi `npm run proof`)

> File này và thư mục `runs/` được script sinh ra từ CLI headless thật, không sửa tay.
> Chạy lại ở tag `phase-1`: `npm ci && npm run proof`.

Môi trường: Node v26.13.1, Windows_NT 10.0.26200 (x64), CPU: 11th Gen Intel(R) Core(TM) i3-1125G4 @ 2.00GHz

## Scenario theo yêu cầu

| Yêu cầu | Scenario (input + output) | Kết quả |
|---|---|---|
| Movement: move [0,1] at yaw 0 goes +Z at player_speed (6 m/s) | [move_forward](runs/move_forward/) | PASS |
| Movement: cam_yaw_deg rotation formula (yaw 90, move [0,1] -> +X) | [move_yaw90](runs/move_yaw90/) | PASS |
| Movement: vectors longer than 1 are normalised | [move_normalized](runs/move_normalized/) | PASS |
| Jump: rising edge lifts the player, who lands back on Y=0 | [jump](runs/jump/) | PASS |
| No falling (fall_enabled=false): player stays inside the island | [island_clamp](runs/island_clamp/) | PASS |
| Pickup within pickup_radius (1.0): mote at z=5 picked on tick 40, +per_mote | [pickup](runs/pickup/) | PASS |
| Carry capacity (5): extra motes stay on the ground | [carry_capacity](runs/carry_capacity/) | PASS |
| Deposit: interact within interact_radius moves carried light into the lantern | [deposit_partial](runs/deposit_partial/) | PASS |
| Deposit: nothing happens outside interact_radius (2.5) | [deposit_out_of_range](runs/deposit_out_of_range/) | PASS |
| Buttons fire on false->true only (holding interact deposits once) | [interact_edge_only](runs/interact_edge_only/) | PASS |
| Lantern lit when deposited reaches lantern_cost (5), +per_lantern | [light_lantern](runs/light_lantern/) | PASS |
| Win when all 5 lanterns are lit; end bonus per_second_left + per_flame_left | [win_all_lit](runs/win_all_lit/) | PASS |
| Scenario setup emits no events and awards no points (pre-lit lantern) | [setup_no_events](runs/setup_no_events/) | PASS |
| Shades chase the player at shade_speed (4 m/s) | [shade_chase](runs/shade_chase/) | PASS |
| Pulse costs pulse_cost light, stuns shades within pulse_radius, pushes them pulse_push_m, +per_stun | [pulse_stun_push](runs/pulse_stun_push/) | PASS |
| Stun lasts pulse_stun_s (3 s = 180 ticks), then the shade chases again | [pulse_stun_duration](runs/pulse_stun_duration/) | PASS |
| Pulse with no carried light does nothing | [pulse_needs_light](runs/pulse_needs_light/) | PASS |
| Pulse cooldown (2 s = 120 ticks) | [pulse_cooldown](runs/pulse_cooldown/) | PASS |
| Shade contact: -1 flame, drop floor(carried*hit_drop_ratio), invuln_s (1.5 s) protection | [shade_hit_invuln](runs/shade_hit_invuln/) | PASS |
| Lose when flames reach 0 (reason no_flames) | [lose_no_flames](runs/lose_no_flames/) | PASS |
| Lose at dawn when time runs out (time_left_s = duration - steps/60) | [lose_dawn](runs/lose_dawn/) | PASS |
| Shades cannot enter safe_radius (4 m) around a lantern; player sheltering there is not hit | [safe_radius](runs/safe_radius/) | PASS |
| Random shades spawn over time with shade_spawned events (every 30 s) | [shade_spawn](runs/shade_spawn/) | PASS |
| Default Night 1: 5 lanterns, random motes and shades, ids, snapshot cadence, end line | [default_world](runs/default_world/) | PASS |

## Tính tất định (thế giới mặc định + [wander-inputs.json](runs/wander-inputs.json), tối đa 18000 tick, chạy 2 lần)

| Seed | Số dòng JSONL | Số event | Dòng end | Kết quả |
|---|---|---|---|---|
| 1 | 167 | 6 | `{"type":"end","ticks":1593,"state":"lost","score":50}` | PASS (identical) |
| 42 | 171 | 10 | `{"type":"end","ticks":1593,"state":"lost","score":70}` | PASS (identical) |
| 2026 | 55 | 7 | `{"type":"end","ticks":466,"state":"lost","score":40}` | PASS (identical) |

## Chơi trọn một đêm (bot tham lam sinh inputs → phát lại qua CLI)

Bot ([scripts/bot.js](../../../scripts/bot.js)) nhặt đom đóm gần nhất, mang về đèn chưa thắp gần nhất, tỏa sáng khi Bóng Mực đến gần.
"Khớp" = dòng end của CLI trùng với kết quả mô phỏng trong bộ nhớ (trạng thái, số tick, điểm).

| Seed | Input + output | Đèn thắp | game_over | Điểm | Khớp |
|---|---|---|---|---|---|
| 1 | [playthrough-seed1](runs/playthrough-seed1/) | 5/5 | won (all_lit) @ tick 3332 | 1444 | PASS |
| 5 | [playthrough-seed5](runs/playthrough-seed5/) | 2/5 | lost (no_flames) @ tick 2553 | 620 | PASS |

## Mã thoát

| Trường hợp | Mong đợi | Thực tế | Kết quả |
|---|---|---|---|
| valid run | 0 | 0 | PASS |
| malformed inputs (ticks not increasing) | 2 | 2 | PASS |
| missing --out | 1 | 1 | PASS |

## Tốc độ

Một đêm đầy đủ (18000 tick = 300 s game) chạy trong 100 ms (gồm khởi động Node).

**Tổng: TẤT CẢ ĐẠT**
