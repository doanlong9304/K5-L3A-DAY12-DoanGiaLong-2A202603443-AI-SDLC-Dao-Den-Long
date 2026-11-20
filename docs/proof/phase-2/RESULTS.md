# phase-2 — Kết quả kiểm chứng (tự sinh bởi `npm run proof`)

> File này và thư mục `runs/` được script sinh ra từ CLI headless thật (Contract v1.1), không sửa tay.
> Chạy lại ở tag tương ứng: `npm ci && npm run proof`.

Môi trường: Node v26.13.1, Windows_NT 10.0.26200 (x64), CPU: 11th Gen Intel(R) Core(TM) i3-1125G4 @ 2.00GHz

## Tính năng mới Phase 2 (Ticket-02)

| Yêu cầu | Đêm | Scenario (input + output) | Kết quả |
|---|---|---|---|
| Dash 14 m/s for 0.2 s (12 ticks), cooldown 1.5 s from dash start; event dash {} | 1 | [dash](runs/dash/) | PASS |
| Dash while standing still goes in the facing direction (start faces +Z) | 1 | [dash_facing](runs/dash_facing/) | PASS |
| Dash in the air does not hold height (gravity continues) | 1 | [dash_air_no_hover](runs/dash_air_no_hover/) | PASS |
| Fall below Y=-10: once, -1 flame, lose all carried, wait 60 ticks, respawn at start, vel 0, invuln 90 | 1 | [fall_off_island](runs/fall_off_island/) | PASS |
| Falling with the last flame loses immediately (no respawn) | 1 | [fall_last_flame](runs/fall_last_flame/) | PASS |
| Fall happens even while invulnerable | 1 | [fall_ignores_invuln](runs/fall_ignores_invuln/) | PASS |
| Pickup also needs height difference <= 1.5 m | 1 | [pickup_height](runs/pickup_height/) | PASS |
| Night 1: 20 motes at 20 distinct points; +1 at ticks 240, 480, ... on a free point; skip when no free point (24 points) | 1 | [mote_spawn_schedule](runs/mote_spawn_schedule/) | PASS |
| Dropped motes expire (ttl_s counts down, removed at 0) | 1 | [dropped_mote_ttl](runs/dropped_mote_ttl/) | PASS |
| Only unlit lanterns; nearest; equal distance -> smaller id; one lantern per press | 1 | [deposit_tie_lower_id](runs/deposit_tie_lower_id/) | PASS |
| Lighting the last lantern on the very tick time runs out is a win | 1 | [win_on_dawn_tick](runs/win_on_dawn_tick/) | PASS |
| Detect 12 m / give up 18 m: shade at 14 m keeps wandering, chasing shade at 18.5 m returns to wander; spawning keeps its timer | 1 | [shade_detect_lose](runs/shade_detect_lose/) | PASS |
| No hit when the height difference > 1.5 m (player jumping over) | 1 | [hit_height](runs/hit_height/) | PASS |
| Touching an invulnerable Mây does nothing (no hit, no recoil) | 1 | [invuln_contact_nothing](runs/invuln_contact_nothing/) | PASS |
| At most 1 flame lost per tick (ascending id) | 1 | [one_hit_per_tick](runs/one_hit_per_tick/) | PASS |
| Night 1: 2 shades at tick 300, then 1 every 480 ticks (S1, S2, ...), state spawning first | 1 | [shade_spawn_schedule](runs/shade_spawn_schedule/) | PASS |
| Night 2: shades every 7 s after tick 300 | 2 | [shade_spawn_night2](runs/shade_spawn_night2/) | PASS |
| Unlit lanterns do not protect | 1 | [safe_zone_unlit_no_block](runs/safe_zone_unlit_no_block/) | PASS |
| Shade inside when the lantern lights is pushed to the edge within 30 ticks, harmless meanwhile | 1 | [safe_zone_evict](runs/safe_zone_evict/) | PASS |
| Pulse on a stunned shade refreshes stun and scores +5 again | 1 | [pulse_refresh_stunned](runs/pulse_refresh_stunned/) | PASS |
| Pulse range is 3D: a shade 5.7 m above the pulse centre is not hit | 1 | [pulse_3d_radius](runs/pulse_3d_radius/) | PASS |
| Pause: tick advances, sim_tick/time/cooldowns frozen, state "paused", events paused/resumed | 1 | [pause_resume](runs/pause_resume/) | PASS |
| Charm: picked like a mote, 600 ticks, run 7.2 m/s, respawns after 2700 ticks | 2 | [charm_pickup_speed](runs/charm_pickup_speed/) | PASS |
| Charm: dash without cooldown (press during a dash is ignored; still 14 m/s, 12 ticks) | 1 | [charm_dash_no_cd](runs/charm_dash_no_cd/) | PASS |
| Charm becomes available again when its respawn timer ends | 1 | [charm_respawn](runs/charm_respawn/) | PASS |
| Drifter chases when carried >= 5 within 15 m (7 m/s), steals min(3, carried) at XZ <= 1.2 even when invulnerable, flees 240 ticks then disappears | 2 | [drifter_steal](runs/drifter_steal/) | PASS |
| Drifter stays idle (2 m/s glide) when Mây carries < 5 | 2 | [drifter_idle](runs/drifter_idle/) | PASS |
| Pulse hitting a chasing drifter makes it flee without stealing | 2 | [drifter_pulse_chase](runs/drifter_pulse_chase/) | PASS |
| Pulse hitting a fleeing drifter with loot drops it as dropped motes; drifter vanishes 120 ticks later | 2 | [drifter_drop](runs/drifter_drop/) | PASS |
| Drifters spawn at tick 1200, 2400, ... (max 2), ids D1, D2 (Nights 2-3 only) | 2 | [drifter_spawn](runs/drifter_spawn/) | PASS |
| Night 1 has no drifters by default | 1 | [no_drifters_night1](runs/no_drifters_night1/) | PASS |
| Night 1 standard map: lanterns, duration, charms, start, snapshot fields | 1 | [default_night1](runs/default_night1/) | PASS |
| Night 2 standard map: lanterns, duration, charms, start, snapshot fields | 2 | [default_night2](runs/default_night2/) | PASS |
| Night 3 standard map: lanterns, duration, charms, start, snapshot fields | 3 | [default_night3](runs/default_night3/) | PASS |
| Night 2: walk across the bamboo bridge from island A to B without falling | 2 | [bridge_night2](runs/bridge_night2/) | PASS |
| Night 2: the bridge has no rails (stepping off it falls) | 2 | [bridge_edge_fall_night2](runs/bridge_edge_fall_night2/) | PASS |
| Night 2 pad (20,0,18): launch vy 14, 24 m/s toward island B, input does not steer, ~1.4 s flight, lands on B | 2 | [jump_pad_night2](runs/jump_pad_night2/) | PASS |
| Night 3 pad (0,3,13): vy 12, 8 m/s toward -Z, lands on tier 2 (Y=6) | 3 | [jump_pad_night3](runs/jump_pad_night3/) | PASS |
| Night 3: walk up the 30° ramp from tier 0 to tier 1 (Y=3) | 3 | [ramp_night3](runs/ramp_night3/) | PASS |
| Night 3: tier edges are vertical walls (cannot walk up off-ramp) | 3 | [wall_night3](runs/wall_night3/) | PASS |
| Night 3: stepping off a tier drops to the tier below (no fall penalty) | 3 | [step_off_tier_night3](runs/step_off_tier_night3/) | PASS |
| Night 3: the bell tower (r 2 m) cannot be climbed or entered | 3 | [tower_night3](runs/tower_night3/) | PASS |
| Night 3 wind: gust every 30 s for 5 s, random direction, pushes the player 2 m/s (10 m total) | 3 | [wind_night3](runs/wind_night3/) | PASS |
| Night 3 shades move 4.5 m/s | 3 | [shade_speed_night3](runs/shade_speed_night3/) | PASS |

## Hồi quy Phase 1 (chạy lại với số chuẩn Ticket-02)

| Yêu cầu | Đêm | Scenario | Kết quả |
|---|---|---|---|
| Run 6.0 m/s, camera-relative (yaw 0: move [0,1] = +Z), reaches speed within 0.1 s | 1 | [move_forward](runs/move_forward/) | PASS |
| cam_yaw_deg rotation formula (yaw 90, move [0,1] -> +X) | 1 | [move_yaw90](runs/move_yaw90/) | PASS |
| Move vectors longer than 1 are normalised | 1 | [move_normalized](runs/move_normalized/) | PASS |
| Jump 7.0 m/s, gravity 20, only when grounded; lands back on Y=0 | 1 | [jump](runs/jump/) | PASS |
| Auto pickup at XZ <= 1.0 m (mote at z=5 picked on tick 40); no score for pickup | 1 | [pickup](runs/pickup/) | PASS |
| Carry capacity 10: extra motes stay | 1 | [carry_capacity](runs/carry_capacity/) | PASS |
| Deposit within 2.0 m: min(carried, missing); +10 per mote deposited; progress kept | 1 | [deposit_partial](runs/deposit_partial/) | PASS |
| No deposit beyond 2.0 m | 1 | [deposit_out_of_range](runs/deposit_out_of_range/) | PASS |
| Buttons fire on false->true only (holding interact deposits once) | 1 | [interact_edge_only](runs/interact_edge_only/) | PASS |
| Lantern lit at 10 deposited: +100 (+10 per mote) | 1 | [light_lantern](runs/light_lantern/) | PASS |
| Win when all lit: + floor(seconds left) x 2 + 50 x flames | 1 | [win_all_lit](runs/win_all_lit/) | PASS |
| Scenario setup emits no events, awards no points; night_start is the first event (tick 1) | 1 | [setup_no_events](runs/setup_no_events/) | PASS |
| Shade within 12 m chases at 4.0 m/s | 1 | [shade_chase](runs/shade_chase/) | PASS |
| Hit (XZ <= 1, dy <= 1.5): -1 flame, drop floor(carried/2) on 1.5-2.5 m ring (ttl 480), invuln 90, shade recoils 2 m in 60 ticks | 1 | [shade_hit](runs/shade_hit/) | PASS |
| Lit lantern: shades cannot enter its 6 m zone; player sheltering is not hit | 1 | [safe_zone_block](runs/safe_zone_block/) | PASS |
| Pulse: cost 3, 3D radius 5 from feet+0.8; stun 120 ticks; pushed 4 m over 15 ticks; +5 per shade | 1 | [pulse_stun_push](runs/pulse_stun_push/) | PASS |
| Pulse needs >= 3 motes | 1 | [pulse_needs_light](runs/pulse_needs_light/) | PASS |
| Pulse cooldown 3 s (180 ticks) | 1 | [pulse_cooldown](runs/pulse_cooldown/) | PASS |
| Lose when flames reach 0 | 1 | [lose_no_flames](runs/lose_no_flames/) | PASS |
| Lose at dawn (time_left_s = duration - sim_tick/60) | 1 | [lose_dawn](runs/lose_dawn/) | PASS |

## Tính tất định (thế giới mặc định + [wander-inputs.json](runs/wander-inputs.json), tối đa 21600 tick, 2 lần)

| Đêm | Seed | Số dòng | Số event | Dòng end | Kết quả |
|---|---|---|---|---|---|
| 1 | 1 | 72 | 24 | `{"type":"end","ticks":2773,"state":"lost","score":0}` | PASS (identical) |
| 1 | 42 | 51 | 19 | `{"type":"end","ticks":1857,"state":"lost","score":0}` | PASS (identical) |
| 2 | 1 | 57 | 21 | `{"type":"end","ticks":2050,"state":"lost","score":0}` | PASS (identical) |
| 2 | 42 | 65 | 23 | `{"type":"end","ticks":2436,"state":"lost","score":0}` | PASS (identical) |
| 3 | 1 | 55 | 22 | `{"type":"end","ticks":1875,"state":"lost","score":0}` | PASS (identical) |
| 3 | 42 | 45 | 19 | `{"type":"end","ticks":1486,"state":"lost","score":0}` | PASS (identical) |

## Chơi trọn một đêm (bot tham lam → phát lại qua CLI)

Bot ([scripts/bot.js](../../../scripts/bot.js)) nhặt đom đóm, nạp đèn gần nhất, tỏa sáng/lướt né khi bị đuổi; điểm đi qua cầu (Đêm 2), dốc và bục nhảy (Đêm 3).
"Khớp" = dòng end của CLI trùng mô phỏng trong bộ nhớ. Bot đơn giản nên Đêm 2–3 chưa thắng được (xem TRACE.md).

| Đêm | Seed | Input + output | Đèn thắp | game_over | Điểm | Khớp |
|---|---|---|---|---|---|---|
| 1 | 3 | [playthrough-n1-s3](runs/playthrough-n1-s3/) | 5/5 | won (all_lit) @ tick 14109 | 1323 | PASS |
| 1 | 1 | [playthrough-n1-s1](runs/playthrough-n1-s1/) | 4/5 | lost (dawn) @ tick 18000 | 900 | PASS |
| 2 | 4 | [playthrough-n2-s4](runs/playthrough-n2-s4/) | 3/6 | lost (dawn) @ tick 19800 | 895 | PASS |
| 3 | 1 | [playthrough-n3-s1](runs/playthrough-n3-s1/) | 1/7 | lost (dawn) @ tick 21600 | 235 | PASS |

## Mã thoát

| Trường hợp | Mong đợi | Thực tế | Kết quả |
|---|---|---|---|
| valid run (night 3) | 0 | 0 | PASS |
| malformed inputs (ticks not increasing) | 2 | 2 | PASS |
| --night 4 | 1 | 1 | PASS |
| missing --out | 1 | 1 | PASS |

## Tốc độ (một Đêm đầy đủ 21600 tick, không kết thúc sớm)

| Đêm | Dòng end | Thời gian (gồm khởi động Node) | Kết quả |
|---|---|---|---|
| 1 | `{"type":"end","ticks":11940,"state":"lost","score":0}` | 279 ms | PASS (<= 30 s) |
| 2 | `{"type":"end","ticks":10818,"state":"lost","score":0}` | 338 ms | PASS (<= 30 s) |
| 3 | `{"type":"end","ticks":10807,"state":"lost","score":0}` | 423 ms | PASS (<= 30 s) |

**Tổng: TẤT CẢ ĐẠT**
