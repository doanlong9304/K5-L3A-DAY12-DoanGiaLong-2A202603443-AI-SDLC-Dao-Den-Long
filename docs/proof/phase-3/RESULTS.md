# phase-3 — Kết quả kiểm chứng (tự sinh bởi `npm run proof`)

> File này và thư mục `runs/` được script sinh ra từ CLI headless thật (Contract v1.1), không sửa tay.
> Chạy lại ở tag tương ứng: `npm ci && npm run proof`.

Môi trường: Node v26.13.1, Windows_NT 10.0.26200 (x64), CPU: 11th Gen Intel(R) Core(TM) i3-1125G4 @ 2.00GHz

## Change request Phase 3 (Ticket-03)

| Yêu cầu | Đêm | Scenario | Kết quả |
|---|---|---|---|
| Lit lantern loses 1.0 fuel/s (integer 1/60 units); lit without fuel in scenario => 100 | 1 | [fuel_decay](runs/fuel_decay/) | PASS |
| fuel <= 0: lantern goes out, deposited = 0, event lantern_out, ever_lit stays true; unlit fuel = 0 | 1 | [lantern_out](runs/lantern_out/) | PASS |
| Relight (ever_lit) costs 5 motes: +5/mote +40, relight:true, relit_count+1, fuel 100, capacity +2 | 1 | [relight_cost_5](runs/relight_cost_5/) | PASS |
| Refuel lit lantern: used = min(carried, ceil((100-fuel)/10)), fuel = min(100, fuel + 10 x used), +5/mote, event refuel | 1 | [refuel](runs/refuel/) | PASS |
| Refuel limited by carried motes (fuel 20, carry 4 -> +40) | 1 | [refuel_partial](runs/refuel_partial/) | PASS |
| Capacity = 10 + 2 x successful_lights, max 20 (scenario successful_lights) | 1 | [capacity_growth](runs/capacity_growth/) | PASS |
| Capacity capped at 20 | 1 | [capacity_max](runs/capacity_max/) | PASS |
| Lantern with fuel < 30 has no safe zone (sheltering player gets hit) | 1 | [safe_zone_low_fuel](runs/safe_zone_low_fuel/) | PASS |
| Wandering shade goes to nearest lit lantern with fuel < 30, drains within 2 m (5/s + 1/s decay), fuel_drain every 60 ticks, lantern out -> wander | 1 | [drain_weak_lantern](runs/drain_weak_lantern/) | PASS |
| Several draining shades add up (2 x 5/s + 1/s) | 1 | [drain_stacks](runs/drain_stacks/) | PASS |
| Draining shade switches to chase when Mây comes within 6 m | 1 | [drain_to_chase](runs/drain_to_chase/) | PASS |
| Pulse on a draining shade: stunned, score +15 total | 1 | [drain_pulse_15](runs/drain_pulse_15/) | PASS |
| Refuel to >= 30 with shades within 6 m: pushed to the edge within 30 ticks, harmless, drain -> wander | 1 | [drain_refuel_evict](runs/drain_refuel_evict/) | PASS |
| Lighting every lantern no longer ends the night | 1 | [all_lit_no_early_end](runs/all_lit_no_early_end/) | PASS |
| Win at dawn with lit >= ceil(0.6 x 5) = 3: +50 + floor(fuel) per lit lantern + 50 per flame, reason dawn_survived | 1 | [win_dawn_survived](runs/win_dawn_survived/) | PASS |
| Dawn with fewer lit lanterns than the threshold (2 < 3) is a loss, no bonus | 1 | [lose_dawn_below_ratio](runs/lose_dawn_below_ratio/) | PASS |
| Night 2 needs ceil(0.6 x 6) = 4 lit at dawn | 2 | [threshold_night2](runs/threshold_night2/) | PASS |
| Night 3 needs 5/7: 4 lit at dawn loses | 3 | [threshold_night3_fail](runs/threshold_night3_fail/) | PASS |
| Losing the last flame on the dawn tick is no_flames (checked first) | 1 | [no_flames_beats_dawn](runs/no_flames_beats_dawn/) | PASS |

## Tính năng Phase 2 (Ticket-02), chạy lại

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
| Nearest receivable lantern; equal distance -> smaller id; one lantern per press | 1 | [deposit_tie_lower_id](runs/deposit_tie_lower_id/) | PASS |
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
| Deposit within 2.0 m: min(carried, missing); +5 per mote deposited (Ticket-03); progress kept | 1 | [deposit_partial](runs/deposit_partial/) | PASS |
| No deposit beyond 2.0 m | 1 | [deposit_out_of_range](runs/deposit_out_of_range/) | PASS |
| Buttons fire on false->true only (holding interact deposits once) | 1 | [interact_edge_only](runs/interact_edge_only/) | PASS |
| First light at 10 deposited: +100 and +5 per mote; lantern_lit relight:false; fuel 100 | 1 | [light_lantern](runs/light_lantern/) | PASS |
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
| 1 | 1 | 74 | 25 | `{"type":"end","ticks":2861,"state":"lost","score":0}` | PASS (identical) |
| 1 | 42 | 83 | 27 | `{"type":"end","ticks":3298,"state":"lost","score":0}` | PASS (identical) |
| 2 | 1 | 51 | 19 | `{"type":"end","ticks":1858,"state":"lost","score":0}` | PASS (identical) |
| 2 | 42 | 68 | 25 | `{"type":"end","ticks":2464,"state":"lost","score":0}` | PASS (identical) |
| 3 | 1 | 80 | 29 | `{"type":"end","ticks":2940,"state":"lost","score":0}` | PASS (identical) |
| 3 | 42 | 56 | 22 | `{"type":"end","ticks":1939,"state":"lost","score":0}` | PASS (identical) |

## Chơi trọn một đêm (bot tham lam → phát lại qua CLI)

Bot ([scripts/bot.js](../../../scripts/bot.js)) nhặt đom đóm, nạp đèn gần nhất, tỏa sáng/lướt né khi bị đuổi; điểm đi qua cầu (Đêm 2), dốc và bục nhảy (Đêm 3).
"Khớp" = dòng end của CLI trùng mô phỏng trong bộ nhớ. Bot đơn giản nên Đêm 2–3 chưa thắng được (xem TRACE.md).

| Đêm | Seed | Input + output | Đèn thắp | game_over | Điểm | Khớp |
|---|---|---|---|---|---|---|
| 1 | 3 | [playthrough-n1-s3](runs/playthrough-n1-s3/) | 3/5 | lost (dawn) @ tick 14400 | 650 | PASS |
| 1 | 1 | [playthrough-n1-s1](runs/playthrough-n1-s1/) | 4/5 | lost (dawn) @ tick 14400 | 710 | PASS |
| 2 | 4 | [playthrough-n2-s4](runs/playthrough-n2-s4/) | 2/6 | lost (dawn) @ tick 16200 | 515 | PASS |
| 3 | 1 | [playthrough-n3-s1](runs/playthrough-n3-s1/) | 0/7 | lost (no_flames) @ tick 4633 | 40 | PASS |

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
| 1 | `{"type":"end","ticks":14400,"state":"lost","score":0}` | 290 ms | PASS (<= 30 s) |
| 2 | `{"type":"end","ticks":16200,"state":"lost","score":0}` | 403 ms | PASS (<= 30 s) |
| 3 | `{"type":"end","ticks":18000,"state":"lost","score":0}` | 704 ms | PASS (<= 30 s) |

**Tổng: TẤT CẢ ĐẠT**
