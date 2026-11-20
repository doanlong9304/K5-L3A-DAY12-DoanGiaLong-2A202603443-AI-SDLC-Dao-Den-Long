// Headless scenarios (Contract v1.1). Each maps to a requirement and has check() that throws on failure.
// `phase`: '1' = Phase 1 requirement re-verified with standard numbers, '2' = Ticket-02, '3' = Ticket-03 (change request).
// Used by tests/scenarios.test.js and scripts/proof.js.
import assert from 'node:assert/strict';

export const NO_RANDOM = Object.freeze({
  random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
  motes: [], shades: [], drifters: [], charms: [],
});
const NR = NO_RANDOM;
const parse = (lines) => lines.map((l) => JSON.parse(l));
const events = (o, name) => o.filter((x) => x.type === 'event' && (!name || x.name === name));
const snaps = (o) => o.filter((x) => x.type === 'snapshot');
const snapAt = (o, tick) => { const s = snaps(o).find((x) => x.tick === tick); assert.ok(s, `no snapshot at tick ${tick}`); return s; };
const end = (o) => o[o.length - 1];
const dXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const near = (a, b, eps = 0.002) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);
const press = (k, at, release = at + 1) => [{ tick: at, [k]: true }, { tick: release, [k]: false }];
const gameplayEvents = (o) => events(o).filter((e) => e.name !== 'night_start');

export const SCENARIOS = [
  // ------------------------------------------------------------ movement
  {
    phase: '1', name: 'move_forward', req: 'Run 6.0 m/s, camera-relative (yaw 0: move [0,1] = +Z), reaches speed within 0.1 s',
    scenario: NR, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 60,
    check(o) {
      const s = snapAt(o, 60);
      assert.deepEqual(s.player.pos, [0, 0, 6]);
      assert.deepEqual(s.player.vel, [0, 0, 6]);
      assert.equal(snapAt(o, 10).player.vel[2], 6); // full speed well before 0.1 s
    },
  },
  {
    phase: '1', name: 'move_yaw90', req: 'cam_yaw_deg rotation formula (yaw 90, move [0,1] -> +X)',
    scenario: NR, inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] }, ticks: 60,
    check(o) { assert.deepEqual(snapAt(o, 60).player.pos, [6, 0, 0]); },
  },
  {
    phase: '1', name: 'move_normalized', req: 'Move vectors longer than 1 are normalised',
    scenario: NR, inputs: { frames: [{ tick: 0, move: [1, 1] }] }, ticks: 60,
    check(o) { near(dXZ(snapAt(o, 60).player.pos, [0, 0, 0]), 6); },
  },
  {
    phase: '1', name: 'jump', req: 'Jump 7.0 m/s, gravity 20, only when grounded; lands back on Y=0',
    scenario: NR, inputs: { frames: press('jump', 0, 30) }, ticks: 60, snapshotEvery: 1,
    check(o) {
      assert.equal(snapAt(o, 1).player.grounded, false);
      assert.ok(snapAt(o, 21).player.pos[1] > 1.1); // apex ~1.225 m at 0.35 s
      const land = snaps(o).find((s) => s.tick > 1 && s.player.grounded);
      assert.ok(land.tick >= 41 && land.tick <= 43, `landed at ${land.tick}`);
      assert.equal(land.player.pos[1], 0);
    },
  },
  {
    phase: '2', name: 'dash', req: 'Dash 14 m/s for 0.2 s (12 ticks), cooldown 1.5 s from dash start; event dash {}',
    scenario: NR,
    inputs: { frames: [{ tick: 0, move: [0, 1] }, ...press('dash', 30), ...press('dash', 60), ...press('dash', 120)] },
    ticks: 130, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'dash').map((e) => e.tick), [31, 121]);
      assert.deepEqual(events(o, 'dash')[0].data, {});
      near(snapAt(o, 30).player.pos[2], 3.0);
      near(snapAt(o, 42).player.pos[2], 3.0 + 12 * 14 / 60);
      near(snapAt(o, 43).player.pos[2], 3.0 + 2.8 + 0.1);
      near(snapAt(o, 31).player.dash_cd_s, 1.5);
    },
  },
  {
    phase: '2', name: 'dash_facing', req: 'Dash while standing still goes in the facing direction (start faces +Z)',
    scenario: NR, inputs: { frames: press('dash', 0) }, ticks: 20,
    check(o) { assert.deepEqual(snapAt(o, 20).player.pos, [0, 0, 2.8]); },
  },
  {
    phase: '2', name: 'dash_air_no_hover', req: 'Dash in the air does not hold height (gravity continues)',
    scenario: NR, inputs: { frames: [...press('jump', 0), ...press('dash', 10)] }, ticks: 30, snapshotEvery: 1,
    check(o) {
      let y = 0, vy = 7;
      for (let t = 1; t <= 20; t++) { vy -= 20 / 60; y += vy / 60; }
      near(snapAt(o, 20).player.pos[1], y, 0.002);
    },
  },
  // ------------------------------------------------------------ falling
  {
    phase: '2', name: 'fall_off_island', req: 'Fall below Y=-10: once, -1 flame, lose all carried, wait 60 ticks, respawn at start, vel 0, invuln 90',
    scenario: { ...NR, player: { pos: [0, 0, 39], carried: 4 } }, inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 20, move: [0, 0] }] },
    ticks: 300, snapshotEvery: 1,
    check(o) {
      const f = events(o, 'player_hit');
      assert.equal(f.length, 1);
      assert.deepEqual(f[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 4 });
      const t = f[0].tick;
      assert.equal(snapAt(o, t).player.carried, 0);
      const back = snapAt(o, t + 60);
      assert.deepEqual(back.player.pos, [0, 0, 0]);
      assert.deepEqual(back.player.vel, [0, 0, 0]);
      assert.equal(back.player.invuln, true);
      assert.equal(snapAt(o, t + 59).player.pos[1] < -10, true);
      assert.equal(snapAt(o, t + 60 + 90).player.invuln, false);
    },
  },
  {
    phase: '2', name: 'fall_last_flame', req: 'Falling with the last flame loses immediately (no respawn)',
    scenario: { ...NR, player: { pos: [0, 0, 39.5], flames: 1 } }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 300,
    check(o) {
      const hit = events(o, 'player_hit')[0], go = events(o, 'game_over')[0];
      assert.equal(hit.data.by, 'fall');
      assert.equal(go.tick, hit.tick);
      assert.deepEqual(go.data, { result: 'lost', reason: 'no_flames' });
    },
  },
  {
    phase: '2', name: 'fall_ignores_invuln', req: 'Fall happens even while invulnerable',
    scenario: { ...NR, player: { pos: [0, 0, 39.5], invuln_ticks: 600 } }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 200,
    check(o) { assert.equal(events(o, 'player_hit')[0].data.by, 'fall'); },
  },
  // ------------------------------------------------------------ motes
  {
    phase: '1', name: 'pickup', req: 'Auto pickup at XZ <= 1.0 m (mote at z=5 picked on tick 40); no score for pickup',
    scenario: { ...NR, motes: [[0, 0, 5]] }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 60,
    check(o) {
      const e = events(o, 'mote_picked');
      assert.deepEqual(e.map((x) => [x.tick, x.data]), [[40, { carried: 1 }]]);
      assert.equal(end(o).score, 0);
    },
  },
  {
    phase: '2', name: 'pickup_height', req: 'Pickup also needs height difference <= 1.5 m',
    scenario: { ...NR, motes: [[0, 2, 0.5], [0, 1.5, 1]] }, ticks: 5,
    check(o) { assert.equal(events(o, 'mote_picked').length, 1); assert.equal(snapAt(o, 0).motes.length, 2); },
  },
  {
    phase: '1', name: 'carry_capacity', req: 'Carry capacity 10: extra motes stay',
    scenario: { ...NR, motes: Array.from({ length: 12 }, (_, i) => [0, 0, i + 1]) }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 150,
    check(o) { assert.equal(events(o, 'mote_picked').length, 10); assert.equal(snapAt(o, 150).motes_active, 2); },
  },
  {
    phase: '2', name: 'mote_spawn_schedule', req: 'Night 1: 20 motes at 20 distinct points; +1 at ticks 240, 480, ... on a free point; skip when no free point (24 points)',
    scenario: { random_shades: false, random_drifters: false }, ticks: 1200,
    check(o) {
      const s0 = snapAt(o, 0);
      assert.equal(s0.motes_active, 20);
      assert.equal(new Set(s0.motes.map((m) => m.pos.join())).size, 20);
      assert.ok(s0.motes.every((m) => m.kind === 'random' && m.ttl_s === null));
      assert.equal(snapAt(o, 230).motes_active, 20);
      assert.equal(snapAt(o, 240).motes_active, 21);
      assert.equal(snapAt(o, 960).motes_active, 24);
      assert.equal(snapAt(o, 1200).motes_active, 24);
    },
  },
  {
    phase: '2', name: 'dropped_mote_ttl', req: 'Dropped motes expire (ttl_s counts down, removed at 0)',
    scenario: { ...NR, motes: [{ pos: [5, 0, 5], kind: 'dropped', ttl_s: 1 }] }, ticks: 70,
    check(o) {
      assert.equal(snapAt(o, 30).motes[0].ttl_s, 0.5);
      assert.equal(snapAt(o, 60).motes_active, 0);
    },
  },
  // ------------------------------------------------------------ lanterns
  {
    phase: '1', name: 'deposit_partial', req: 'Deposit within 2.0 m: min(carried, missing); +5 per mote deposited (Ticket-03); progress kept',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 4 } }, inputs: { frames: press('interact', 0) }, ticks: 10,
    check(o) {
      assert.deepEqual(gameplayEvents(o).map((e) => [e.tick, e.name, e.data]), [[1, 'deposit', { lantern_id: 'L1', amount: 4, deposited: 4 }]]);
      assert.equal(end(o).score, 20);
      assert.equal(snapAt(o, 10).lanterns[0].lit, false);
    },
  },
  {
    phase: '1', name: 'deposit_out_of_range', req: 'No deposit beyond 2.0 m',
    scenario: { ...NR, player: { pos: [0, 0, 22.9], carried: 4 } }, inputs: { frames: press('interact', 0) }, ticks: 10,
    check(o) { assert.equal(gameplayEvents(o).length, 0); },
  },
  {
    phase: '2', name: 'deposit_tie_lower_id', req: 'Nearest receivable lantern; equal distance -> smaller id; one lantern per press',
    scenario: { ...NR, player: { carried: 3 }, lanterns: [{ id: 'L2', pos: [1, 0, 0] }, { id: 'L1', pos: [-1, 0, 0] }, { id: 'L3', pos: [0, 0, 30], lit: true }] },
    inputs: { frames: press('interact', 0) }, ticks: 5,
    check(o) { assert.deepEqual(events(o, 'deposit').map((e) => e.data), [{ lantern_id: 'L1', amount: 3, deposited: 3 }]); },
  },
  {
    phase: '1', name: 'interact_edge_only', req: 'Buttons fire on false->true only (holding interact deposits once)',
    // mote out of reach on tick 1 (pickup runs before interact), picked on tick 2 while interact is still held
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 2 }, motes: [[0, 0, 24.7]] },
    inputs: { frames: [{ tick: 0, interact: true, move: [0, 1] }, { tick: 3, move: [0, 0] }] }, ticks: 30,
    check(o) { assert.equal(events(o, 'deposit').length, 1); assert.equal(snapAt(o, 30).player.carried, 1); },
  },
  {
    phase: '1', name: 'light_lantern', req: 'First light at 10 deposited: +100 and +5 per mote; lantern_lit relight:false; fuel 100',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 10 } }, inputs: { frames: press('interact', 0) }, ticks: 5, snapshotEvery: 5,
    check(o) {
      assert.deepEqual(gameplayEvents(o).map((e) => [e.name, e.data]), [['deposit', { lantern_id: 'L1', amount: 10, deposited: 10 }], ['lantern_lit', { lantern_id: 'L1', relight: false }]]);
      assert.equal(end(o).score, 150);
      const s = snapAt(o, 5).lanterns[0];
      assert.deepEqual([s.lit, s.ever_lit, s.relit_count], [true, true, 0]);
      assert.equal(s.fuel, 99.9);
    },
  },
  // win_all_lit / win_on_dawn_tick REMOVED: Ticket-03 replaced 'win when all lit' (see the phase-3 win scenarios).
  {
    phase: '1', name: 'setup_no_events', req: 'Scenario setup emits no events, awards no points; night_start is the first event (tick 1)',
    scenario: { ...NR, lanterns: [{ id: 'L1', lit: true, deposited: 10 }] }, ticks: 10,
    check(o) {
      assert.deepEqual(events(o).map((e) => [e.tick, e.name, e.data]), [[1, 'night_start', { night: 1 }]]);
      assert.equal(o.indexOf(events(o)[0]) > 0, true);
      assert.equal(end(o).score, 0);
    },
  },
  // ------------------------------------------------------------ shades
  {
    phase: '1', name: 'shade_chase', req: 'Shade within 12 m chases at 4.0 m/s',
    scenario: { ...NR, shades: [{ id: 'S1', pos: [10, 1, 0] }] }, ticks: 60,
    check(o) { const s = snapAt(o, 60).shades[0]; assert.equal(s.state, 'chase'); assert.deepEqual(s.pos, [6, 1, 0]); },
  },
  {
    phase: '2', name: 'shade_detect_lose', req: 'Detect 12 m / give up 18 m: shade at 14 m keeps wandering, chasing shade at 18.5 m returns to wander; spawning keeps its timer',
    scenario: { ...NR, shades: [{ id: 'S1', pos: [14, 1, 0] }, { id: 'S2', pos: [0, 1, 18.5], state: 'chase' }, { id: 'S3', pos: [5, 1, 0], state: 'spawning', state_ticks_left: 30 }] },
    ticks: 2, snapshotEvery: 1,
    check(o) { assert.deepEqual(snapAt(o, 2).shades.map((s) => s.state), ['wander', 'wander', 'spawning']); },
  },
  {
    phase: '1', name: 'shade_hit', req: 'Hit (XZ <= 1, dy <= 1.5): -1 flame, drop floor(carried/2) on 1.5-2.5 m ring (ttl 480), invuln 90, shade recoils 2 m in 60 ticks',
    scenario: { ...NR, player: { carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, ticks: 61, snapshotEvery: 1,
    check(o) {
      const h = events(o, 'player_hit');
      assert.deepEqual(h[0], { type: 'event', tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } });
      const s = snapAt(o, 1);
      assert.equal(s.player.carried, 3);
      assert.equal(s.player.invuln, true);
      assert.equal(s.shades[0].state, 'recoil');
      const dropped = s.motes.filter((m) => m.kind === 'dropped');
      assert.equal(dropped.length, 2);
      for (const m of dropped) { const d = dXZ(m.pos, [0, 0, 0]); assert.ok(d >= 1.499 && d <= 2.501, `ring ${d}`); assert.equal(m.ttl_s, 8); }
      // tick 1: chase step 4/60 toward Mây, then hit; ticks 2..61: 60 recoil moves of 2/60 m
      near(snapAt(o, 61).shades[0].pos[0], 0.5 - 4 / 60 + 2, 0.002);
      assert.equal(snapAt(o, 61).shades[0].state, 'wander');
    },
  },
  {
    phase: '2', name: 'hit_height', req: 'No hit when the height difference > 1.5 m (player jumping over)',
    scenario: { ...NR, player: { pos: [0, 0, -3] }, shades: [{ id: 'S1', pos: [0, 1, 3], state: 'stunned', state_ticks_left: 200 }] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, ...press('jump', 18)] }, ticks: 90,
    check(o) { assert.equal(events(o, 'player_hit').length, 0); },
  },
  {
    phase: '2', name: 'invuln_contact_nothing', req: 'Touching an invulnerable Mây does nothing (no hit, no recoil)',
    scenario: { ...NR, player: { invuln_ticks: 30 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, ticks: 40, snapshotEvery: 1,
    check(o) {
      assert.equal(snapAt(o, 29).shades[0].state, 'chase');
      assert.equal(events(o, 'player_hit')[0].tick, 30);
    },
  },
  {
    phase: '2', name: 'one_hit_per_tick', req: 'At most 1 flame lost per tick (ascending id)',
    scenario: { ...NR, shades: [{ id: 'S2', pos: [0.4, 1, 0] }, { id: 'S1', pos: [-0.4, 1, 0] }] }, ticks: 1,
    check(o) { assert.equal(events(o, 'player_hit').length, 1); },
  },
  {
    phase: '2', name: 'shade_spawn_schedule', req: 'Night 1: 2 shades at tick 300, then 1 every 480 ticks (S1, S2, ...), state spawning first',
    scenario: { random_motes: false, random_drifters: false }, ticks: 1300, snapshotEvery: 300,
    check(o) {
      assert.deepEqual(events(o, 'shade_spawned').map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3'], [1260, 'S4']]);
      assert.deepEqual(snapAt(o, 300).shades.map((s) => s.state), ['spawning', 'spawning']);
      for (const s of snapAt(o, 300).shades) assert.ok(dXZ(s.pos, [0, 0, 0]) >= 15);
    },
  },
  {
    phase: '2', name: 'shade_spawn_night2', req: 'Night 2: shades every 7 s after tick 300',
    night: 2, scenario: { random_motes: false, random_drifters: false }, ticks: 1200, snapshotEvery: 600,
    check(o) { assert.deepEqual(events(o, 'shade_spawned').map((e) => e.tick), [300, 300, 720, 1140]); },
  },
  // ------------------------------------------------------------ safe zone
  {
    phase: '1', name: 'safe_zone_block', req: 'Lit lantern: shades cannot enter its 6 m zone; player sheltering is not hit',
    scenario: { ...NR, player: { pos: [0, 0, 10] }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true }], shades: [{ id: 'S1', pos: [0, 1, 21] }] }, ticks: 600,
    check(o) {
      for (const s of snaps(o)) assert.ok(dXZ(s.shades[0].pos, [0, 0, 10]) >= 6);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  {
    phase: '2', name: 'safe_zone_unlit_no_block', req: 'Unlit lanterns do not protect',
    scenario: { ...NR, player: { pos: [0, 0, 10] }, lanterns: [{ id: 'L1', pos: [0, 0, 10] }], shades: [{ id: 'S1', pos: [0, 1, 18] }] }, ticks: 200,
    check(o) { assert.ok(events(o, 'player_hit').length >= 1); },
  },
  {
    phase: '2', name: 'safe_zone_evict', req: 'Shade inside when the lantern lights is pushed to the edge within 30 ticks, harmless meanwhile',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 10 }, shades: [{ id: 'S1', pos: [0, 1, 25] }, { id: 'S2', pos: [0.5, 1, 23.5], state: 'stunned', state_ticks_left: 1 }] },
    inputs: { frames: press('interact', 0) }, ticks: 120, snapshotEvery: 1,
    check(o) {
      assert.equal(events(o, 'lantern_lit')[0].tick, 1);
      assert.ok(dXZ(snapAt(o, 30).shades[0].pos, [0, 0, 25]) >= 6);
      assert.ok(dXZ(snapAt(o, 30).shades[1].pos, [0, 0, 25]) >= 6);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  // ------------------------------------------------------------ pulse
  {
    phase: '1', name: 'pulse_stun_push', req: 'Pulse: cost 3, 3D radius 5 from feet+0.8; stun 120 ticks; pushed 4 m over 15 ticks; +5 per shade',
    scenario: { ...NR, player: { carried: 5 }, shades: [{ id: 'S1', pos: [4, 1, 0] }, { id: 'S2', pos: [0, 1, -11] }] },
    inputs: { frames: press('pulse', 0) }, ticks: 125, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'pulse').map((e) => [e.tick, e.data]), [[1, { stunned_ids: ['S1'] }]]);
      assert.equal(snapAt(o, 1).player.carried, 2);
      near(snapAt(o, 1).player.pulse_cd_s, 3);
      near(snapAt(o, 15).shades[0].pos[0], 8, 0.01);
      near(snapAt(o, 40).shades[0].pos[0], 8, 0.01);
      assert.equal(snapAt(o, 120).shades[0].state, 'stunned');
      assert.notEqual(snapAt(o, 121).shades[0].state, 'stunned');
      assert.equal(end(o).score, 5);
    },
  },
  {
    phase: '2', name: 'pulse_refresh_stunned', req: 'Pulse on a stunned shade refreshes stun and scores +5 again',
    scenario: { ...NR, player: { carried: 3 }, shades: [{ id: 'S1', pos: [3, 1, 0], state: 'stunned', state_ticks_left: 50 }] },
    inputs: { frames: press('pulse', 0) }, ticks: 110, snapshotEvery: 10,
    check(o) { assert.equal(end(o).score, 5); assert.equal(snapAt(o, 110).shades[0].state, 'stunned'); },
  },
  {
    phase: '2', name: 'pulse_3d_radius', req: 'Pulse range is 3D: a shade 5.7 m above the pulse centre is not hit',
    scenario: { ...NR, player: { carried: 3, invuln_ticks: 100 }, shades: [{ id: 'S1', pos: [0, 6.5, 0.5], state: 'stunned', state_ticks_left: 200 }] },
    inputs: { frames: press('pulse', 0) }, ticks: 3,
    check(o) { assert.deepEqual(events(o, 'pulse')[0].data, { stunned_ids: [] }); },
  },
  {
    phase: '1', name: 'pulse_needs_light', req: 'Pulse needs >= 3 motes',
    scenario: { ...NR, player: { carried: 2 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] }, inputs: { frames: press('pulse', 0) }, ticks: 3,
    check(o) { assert.equal(events(o, 'pulse').length, 0); },
  },
  {
    phase: '1', name: 'pulse_cooldown', req: 'Pulse cooldown 3 s (180 ticks)',
    scenario: { ...NR, player: { carried: 9 } }, inputs: { frames: [...press('pulse', 0), ...press('pulse', 60), ...press('pulse', 180)] }, ticks: 190,
    check(o) { assert.deepEqual(events(o, 'pulse').map((e) => e.tick), [1, 181]); },
  },
  // ------------------------------------------------------------ win / lose / time
  {
    phase: '1', name: 'lose_no_flames', req: 'Lose when flames reach 0',
    scenario: { ...NR, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] }, ticks: 10,
    check(o) { assert.deepEqual(end(o), { type: 'end', ticks: 1, state: 'lost', score: 0 }); },
  },
  {
    phase: '1', name: 'lose_dawn', req: 'Lose at dawn (time_left_s = duration - sim_tick/60)',
    scenario: { ...NR, time_left_s: 1 }, ticks: 100,
    check(o) {
      assert.equal(snapAt(o, 30).time_left_s, 0.5);
      assert.deepEqual(events(o, 'game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
    },
  },
  // ------------------------------------------------------------ pause
  {
    phase: '2', name: 'pause_resume', req: 'Pause: tick advances, sim_tick/time/cooldowns frozen, state "paused", events paused/resumed',
    scenario: { ...NR, player: { pulse_cd_ticks: 100 } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, ...press('pause', 10, 15), ...press('pause', 20, 25)] }, ticks: 30, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o).filter((e) => e.name === 'paused' || e.name === 'resumed').map((e) => [e.tick, e.name]), [[11, 'paused'], [21, 'resumed']]);
      const a = snapAt(o, 11), b = snapAt(o, 20), c = snapAt(o, 21);
      assert.equal(a.state, 'paused'); assert.equal(b.state, 'paused'); assert.equal(c.state, 'playing');
      assert.equal(a.sim_tick, 10); assert.equal(b.sim_tick, 10); assert.equal(c.sim_tick, 11);
      assert.deepEqual(b.player.pos, a.player.pos);
      assert.equal(b.time_left_s, a.time_left_s);
      assert.equal(b.player.pulse_cd_s, a.player.pulse_cd_s);
      near(c.player.pos[2], 1.1);
      assert.equal(end(o).ticks, 30);
    },
  },
  // ------------------------------------------------------------ charms
  {
    phase: '2', name: 'charm_pickup_speed', req: 'Charm: picked like a mote, 600 ticks, run 7.2 m/s, respawns after 2700 ticks',
    night: 2, scenario: { ...NR, player: { pos: [33.9, 0, 0] }, charms: [{ id: 'C1', pos: [35, 0, 0] }] },
    inputs: { frames: [{ tick: 0, move: [1, 0], cam_yaw_deg: 0 }, { tick: 61, move: [0, 0] }] }, ticks: 70,
    check(o) {
      const c = events(o, 'charm_picked');
      assert.deepEqual(c.map((e) => [e.tick, e.data]), [[1, { charm_id: 'C1', charm_ticks: 600 }]]);
      const s = snapAt(o, 60);
      assert.deepEqual(s.charms, [{ id: 'C1', available: false, respawn_s: 44.017 }]);
      near(s.player.charm_s, 9.017);
      near(s.player.pos[0], 33.9 + 0.1 + 59 * 0.12, 0.002);
    },
  },
  {
    phase: '2', name: 'charm_dash_no_cd', req: 'Charm: dash without cooldown (press during a dash is ignored; still 14 m/s, 12 ticks)',
    scenario: { ...NR, player: { charm_ticks: 600 } }, inputs: { frames: [...press('dash', 0, 3), ...press('dash', 5, 8), ...press('dash', 20)] }, ticks: 40,
    check(o) { assert.deepEqual(events(o, 'dash').map((e) => e.tick), [1, 21]); near(snapAt(o, 40).player.pos[2], 5.6); },
  },
  {
    phase: '2', name: 'charm_respawn', req: 'Charm becomes available again when its respawn timer ends',
    scenario: { ...NR, charms: [{ id: 'C1', pos: [10, 0, 10], available: false, respawn_ticks: 10 }] }, ticks: 10, snapshotEvery: 1,
    check(o) { assert.equal(snapAt(o, 9).charms[0].available, false); assert.deepEqual(snapAt(o, 10).charms[0], { id: 'C1', available: true, respawn_s: 0 }); },
  },
  // ------------------------------------------------------------ drifters
  {
    phase: '2', name: 'drifter_steal', req: 'Drifter chases when carried >= 5 within 15 m (7 m/s), steals min(3, carried) at XZ <= 1.2 even when invulnerable, flees 240 ticks then disappears',
    night: 2, scenario: { ...NR, player: { carried: 6, invuln_ticks: 600 }, drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] }, ticks: 300, snapshotEvery: 1,
    check(o) {
      const st = events(o, 'drifter_steal');
      assert.equal(st.length, 1);
      assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 3 });
      assert.equal(snapAt(o, 2).drifters[0].state, 'chase');
      const t = st[0].tick;
      assert.deepEqual(snapAt(o, t).drifters[0].state, 'flee');
      assert.equal(snapAt(o, t).drifters[0].stolen, 3);
      assert.equal(snapAt(o, t + 239).drifters.length, 1);
      assert.equal(snapAt(o, t + 240).drifters.length, 0);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  {
    phase: '2', name: 'drifter_idle', req: 'Drifter stays idle (2 m/s glide) when Mây carries < 5',
    night: 2, scenario: { ...NR, player: { carried: 4 }, drifters: [{ id: 'D1', pos: [8, 1.5, 0] }] }, ticks: 10,
    check(o) { assert.equal(snapAt(o, 10).drifters[0].state, 'idle'); },
  },
  {
    phase: '2', name: 'drifter_pulse_chase', req: 'Pulse hitting a chasing drifter makes it flee without stealing',
    night: 2, scenario: { ...NR, player: { carried: 8 }, drifters: [{ id: 'D1', pos: [3, 1.5, 0], state: 'chase' }] }, inputs: { frames: press('pulse', 0) }, ticks: 30,
    check(o) {
      assert.equal(events(o, 'drifter_steal').length, 0);
      assert.deepEqual(snapAt(o, 10).drifters[0], { ...snapAt(o, 10).drifters[0], state: 'flee', stolen: 0 });
      assert.equal(snapAt(o, 30).player.carried, 5);
    },
  },
  {
    phase: '2', name: 'drifter_drop', req: 'Pulse hitting a fleeing drifter with loot drops it as dropped motes; drifter vanishes 120 ticks later',
    night: 2, scenario: { ...NR, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [2, 1.5, 0], state: 'flee', stolen: 3 }] },
    inputs: { frames: press('pulse', 0) }, ticks: 130, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'drifter_drop').map((e) => [e.tick, e.data]), [[1, { drifter_id: 'D1', amount: 3 }]]);
      const s = snapAt(o, 1);
      assert.equal(s.motes.filter((m) => m.kind === 'dropped').length, 3);
      assert.equal(s.drifters[0].stolen, 0);
      assert.equal(snapAt(o, 120).drifters.length, 1);
      assert.equal(snapAt(o, 121).drifters.length, 0);
    },
  },
  {
    phase: '2', name: 'drifter_spawn', req: 'Drifters spawn at tick 1200, 2400, ... (max 2), ids D1, D2 (Nights 2-3 only)',
    night: 2, scenario: { random_motes: false, random_shades: false, player: { pos: [70, 0, 0] } }, ticks: 2400, snapshotEvery: 1200,
    check(o) { assert.deepEqual(snapAt(o, 1200).drifters.map((d) => d.id), ['D1']); assert.equal(snapAt(o, 2400).drifters.length, 2); },
  },
  {
    phase: '2', name: 'no_drifters_night1', req: 'Night 1 has no drifters by default',
    scenario: { random_motes: false, random_shades: false }, ticks: 1200, snapshotEvery: 1200,
    check(o) { assert.deepEqual(snapAt(o, 1200).drifters, []); },
  },
  // ------------------------------------------------------------ maps
  ...[1, 2, 3].map((n) => ({
    phase: '2', name: `default_night${n}`, req: `Night ${n} standard map: lanterns, duration, charms, start, snapshot fields`,
    night: n, ticks: 1,
    check(o) {
      const s = snapAt(o, 0);
      assert.equal(s.night, n);
      assert.equal(s.lanterns.length, [5, 6, 7][n - 1]);
      assert.equal(s.time_left_s, [240, 270, 300][n - 1]); // Ticket-03 durations
      assert.equal(s.charms.length, [0, 1, 2][n - 1]);
      assert.equal(s.motes_active, 20);
      assert.deepEqual(s.player.pos, n === 3 ? [0, 0, -20] : [0, 0, 0]);
      assert.deepEqual(Object.keys(s), ['type', 'tick', 'sim_tick', 'night', 'state', 'time_left_s', 'score', 'wind', 'player', 'lanterns', 'shades', 'motes_active', 'motes', 'drifters', 'charms']);
      assert.deepEqual(Object.keys(s.player), ['pos', 'vel', 'grounded', 'invuln', 'flames', 'carried', 'capacity', 'dash_cd_s', 'pulse_cd_s', 'charm_s']);
      assert.deepEqual(Object.keys(s.lanterns[0]), ['id', 'pos', 'lit', 'deposited', 'fuel', 'ever_lit', 'relit_count']);
      assert.equal(s.player.capacity, 10);
      assert.deepEqual(s.wind, { active: false, dir_deg: 0 });
      assert.deepEqual(events(o)[0].data, { night: n });
    },
  })),
  {
    phase: '2', name: 'bridge_night2', req: 'Night 2: walk across the bamboo bridge from island A to B without falling',
    night: 2, scenario: { ...NR, player: { pos: [20, 0, 0] } }, inputs: { frames: [{ tick: 0, move: [1, 0] }] }, ticks: 360,
    check(o) {
      assert.equal(events(o, 'player_hit').length, 0);
      const p = snapAt(o, 360).player.pos;
      assert.ok(p[0] > 50 && p[1] === 0, JSON.stringify(p));
    },
  },
  {
    phase: '2', name: 'bridge_edge_fall_night2', req: 'Night 2: the bridge has no rails (stepping off it falls)',
    night: 2, scenario: { ...NR, player: { pos: [35, 0, 0] } }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 200,
    check(o) { assert.equal(events(o, 'player_hit')[0].data.by, 'fall'); },
  },
  {
    phase: '2', name: 'jump_pad_night2', req: 'Night 2 pad (20,0,18): launch vy 14, 24 m/s toward island B, input does not steer, ~1.4 s flight, lands on B',
    night: 2, scenario: { ...NR, player: { pos: [20, 0, 17.6] } }, inputs: { frames: [{ tick: 0, move: [-1, 0] }] }, ticks: 100, snapshotEvery: 1,
    check(o) {
      const land = snaps(o).find((s) => s.tick > 2 && s.player.grounded);
      assert.ok(land, 'never landed');
      assert.ok(land.tick >= 82 && land.tick <= 87, `landed at ${land.tick}`);
      assert.ok(dXZ(land.player.pos, [70, 0, 0]) <= 28, JSON.stringify(land.player.pos));
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  {
    phase: '2', name: 'jump_pad_night3', req: 'Night 3 pad (0,3,13): vy 12, 8 m/s toward -Z, lands on tier 2 (Y=6)',
    night: 3, scenario: { ...NR, player: { pos: [0, 3, 13.5] } }, ticks: 90, snapshotEvery: 1,
    check(o) {
      const land = snaps(o).find((s) => s.tick > 2 && s.player.grounded);
      assert.equal(land.player.pos[1], 6);
      assert.ok(Math.hypot(land.player.pos[0], land.player.pos[2]) <= 8);
    },
  },
  {
    phase: '2', name: 'ramp_night3', req: 'Night 3: walk up the 30° ramp from tier 0 to tier 1 (Y=3)',
    night: 3, scenario: { ...NR, player: { pos: [27.713, 0, 16] } }, inputs: { frames: [{ tick: 0, move: [-0.866, -0.5] }] }, ticks: 120,
    check(o) { assert.equal(snapAt(o, 120).player.pos[1], 3); assert.equal(events(o, 'player_hit').length, 0); },
  },
  {
    phase: '2', name: 'wall_night3', req: 'Night 3: tier edges are vertical walls (cannot walk up off-ramp)',
    night: 3, scenario: { ...NR, player: { pos: [0, 0, 30] } }, inputs: { frames: [{ tick: 0, move: [0, -1] }] }, ticks: 120,
    check(o) { const p = snapAt(o, 120).player.pos; assert.equal(p[1], 0); assert.ok(p[2] > 24, JSON.stringify(p)); },
  },
  {
    phase: '2', name: 'step_off_tier_night3', req: 'Night 3: stepping off a tier drops to the tier below (no fall penalty)',
    night: 3, scenario: { ...NR, player: { pos: [0, 6, 7] } }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 60,
    check(o) { assert.equal(snapAt(o, 60).player.pos[1], 0); assert.equal(events(o, 'player_hit').length, 0); },
  },
  {
    phase: '2', name: 'tower_night3', req: 'Night 3: the bell tower (r 2 m) cannot be climbed or entered',
    night: 3, scenario: { ...NR, player: { pos: [0, 6, -6] } }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 120,
    check(o) { const p = snapAt(o, 120).player.pos; assert.equal(p[1], 6); assert.ok(p[2] <= -2, JSON.stringify(p)); },
  },
  {
    phase: '2', name: 'wind_night3', req: 'Night 3 wind: gust every 30 s for 5 s, random direction, pushes the player 2 m/s (10 m total)',
    night: 3, scenario: { ...NR, wind_enabled: true }, ticks: 2101, snapshotEvery: 1,
    check(o) {
      assert.equal(snapAt(o, 1799).wind.active, false);
      assert.equal(snapAt(o, 1800).wind.active, true);
      assert.equal(snapAt(o, 2099).wind.active, true);
      assert.equal(snapAt(o, 2100).wind.active, false);
      const a = snapAt(o, 1800).player.pos, b = snapAt(o, 2100).player.pos;
      near(dXZ(a, b), 10, 0.01);
      const dir = (Math.atan2(b[2] - a[2], b[0] - a[0]) * 180) / Math.PI;
      near(((dir % 360) + 360) % 360, snapAt(o, 1800).wind.dir_deg, 0.1);
    },
  },
  {
    phase: '2', name: 'shade_speed_night3', req: 'Night 3 shades move 4.5 m/s',
    night: 3, scenario: { ...NR, shades: [{ id: 'S1', pos: [10, 1, -20] }] }, ticks: 60,
    check(o) { assert.deepEqual(snapAt(o, 60).shades[0].pos, [5.5, 1, -20]); },
  },
  // ------------------------------------------------------------ Ticket-03: lantern fuel
  {
    phase: '3', name: 'fuel_decay', req: 'Lit lantern loses 1.0 fuel/s (integer 1/60 units); lit without fuel in scenario => 100',
    scenario: { ...NR, lanterns: [{ id: 'L1', lit: true }] }, ticks: 600, snapshotEvery: 300,
    check(o) {
      assert.equal(snapAt(o, 0).lanterns[0].fuel, 100);
      assert.equal(snapAt(o, 300).lanterns[0].fuel, 95);
      assert.equal(snapAt(o, 600).lanterns[0].fuel, 90);
      assert.equal(snapAt(o, 600).lanterns[0].lit, true);
    },
  },
  {
    phase: '3', name: 'lantern_out', req: 'fuel <= 0: lantern goes out, deposited = 0, event lantern_out, ever_lit stays true; unlit fuel = 0',
    scenario: { ...NR, lanterns: [{ id: 'L1', lit: true, fuel: 0.5, deposited: 10 }] }, ticks: 40, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'lantern_out').map((e) => [e.tick, e.data]), [[30, { lantern_id: 'L1' }]]);
      const l = snapAt(o, 30).lanterns[0];
      assert.deepEqual([l.lit, l.fuel, l.deposited, l.ever_lit], [false, 0, 0, true]);
      assert.equal(snapAt(o, 29).lanterns[0].lit, true);
    },
  },
  {
    phase: '3', name: 'relight_cost_5', req: 'Relight (ever_lit) costs 5 motes: +5/mote +40, relight:true, relit_count+1, fuel 100, capacity +2',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 6 }, lanterns: [{ id: 'L1', ever_lit: true }] }, inputs: { frames: press('interact', 0) }, ticks: 2, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
      assert.deepEqual(events(o, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
      const s = snapAt(o, 1);
      assert.deepEqual([s.lanterns[0].lit, s.lanterns[0].fuel, s.lanterns[0].relit_count], [true, 100, 1]);
      assert.equal(s.player.carried, 1);
      assert.equal(s.player.capacity, 12);
      assert.equal(s.score, 25 + 40);
    },
  },
  {
    phase: '3', name: 'refuel', req: 'Refuel lit lantern: used = min(carried, ceil((100-fuel)/10)), fuel = min(100, fuel + 10 x used), +5/mote, event refuel',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 10 }, lanterns: [{ id: 'L1', lit: true, fuel: 55 }] }, inputs: { frames: press('interact', 0) }, ticks: 2, snapshotEvery: 1,
    check(o) {
      // tick 1: decay first (55 - 1/60), then used = ceil(45.017/10) = 5, capped at 100
      assert.deepEqual(events(o, 'refuel').map((e) => [e.tick, e.data]), [[1, { lantern_id: 'L1', amount: 5, fuel: 100 }]]);
      assert.equal(snapAt(o, 1).player.carried, 5);
      assert.equal(end(o).score, 25);
      assert.equal(events(o, 'deposit').length, 0);
    },
  },
  {
    phase: '3', name: 'refuel_partial', req: 'Refuel limited by carried motes (fuel 20, carry 4 -> +40)',
    scenario: { ...NR, player: { pos: [0, 0, 23.5], carried: 4 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }] }, inputs: { frames: press('interact', 0) }, ticks: 1,
    check(o) { assert.deepEqual(events(o, 'refuel')[0].data, { lantern_id: 'L1', amount: 4, fuel: 60 }); },
  },
  {
    phase: '3', name: 'capacity_growth', req: 'Capacity = 10 + 2 x successful_lights, max 20 (scenario successful_lights)',
    scenario: { ...NR, player: { successful_lights: 1 }, motes: Array.from({ length: 14 }, (_, i) => [0, 0, i + 1]) }, inputs: { frames: [{ tick: 0, move: [0, 1] }] }, ticks: 160,
    check(o) { assert.equal(events(o, 'mote_picked').length, 12); assert.equal(snapAt(o, 160).player.capacity, 12); },
  },
  {
    phase: '3', name: 'capacity_max', req: 'Capacity capped at 20',
    scenario: { ...NR, player: { successful_lights: 7 } }, ticks: 1,
    check(o) { assert.equal(snapAt(o, 0).player.capacity, 20); },
  },
  {
    phase: '3', name: 'safe_zone_low_fuel', req: 'Lantern with fuel < 30 has no safe zone (sheltering player gets hit)',
    scenario: { ...NR, player: { pos: [0, 0, 10] }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true, fuel: 29 }], shades: [{ id: 'S1', pos: [0, 1, 20] }] }, ticks: 300,
    check(o) { assert.ok(events(o, 'player_hit').length >= 1); },
  },
  // ------------------------------------------------------------ Ticket-03: drain
  {
    phase: '3', name: 'drain_weak_lantern', req: 'Wandering shade goes to nearest lit lantern with fuel < 30, drains within 2 m (5/s + 1/s decay), fuel_drain every 60 ticks, lantern out -> wander',
    scenario: { ...NR, player: { pos: [0, 0, -25] }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 1, 12.5] }] }, ticks: 400, snapshotEvery: 1,
    check(o) {
      const D = snaps(o).find((s) => s.shades[0].state === 'drain').tick; // drain state set in step 8 of tick D
      assert.ok(D >= 14 && D <= 17, `drain at ${D}`);
      const fd = events(o, 'fuel_drain');
      assert.equal(fd[0].tick, D + 60);
      assert.deepEqual(fd[0].data, { lantern_id: 'L1', shade_id: 'S1', fuel: Math.round(((1500 - (D + 60) - 5 * 60) / 60) * 10) / 10 });
      const outTick = D + Math.ceil((1500 - D) / 6);
      assert.equal(events(o, 'lantern_out')[0].tick, outTick);
      assert.equal(snapAt(o, outTick).shades[0].state, 'wander');
    },
  },
  {
    phase: '3', name: 'drain_stacks', req: 'Several draining shades add up (2 x 5/s + 1/s)',
    scenario: { ...NR, player: { pos: [0, 0, -25] }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [1, 1, 10], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [-1, 1, 10], state: 'drain', target_lantern_id: 'L1' }] },
    ticks: 60,
    check(o) {
      assert.equal(snapAt(o, 60).lanterns[0].fuel, 14); // 25 - 1 - 10
      assert.deepEqual(events(o, 'fuel_drain').map((e) => [e.tick, e.data.shade_id]), [[60, 'S1'], [60, 'S2']]);
    },
  },
  {
    phase: '3', name: 'drain_to_chase', req: 'Draining shade switches to chase when Mây comes within 6 m',
    scenario: { ...NR, player: { pos: [0, 0, 16.5] }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 1, 11], state: 'drain', target_lantern_id: 'L1' }] }, ticks: 1, snapshotEvery: 1,
    check(o) { assert.equal(snapAt(o, 1).shades[0].state, 'chase'); },
  },
  {
    phase: '3', name: 'drain_pulse_15', req: 'Pulse on a draining shade: stunned, score +15 total',
    scenario: { ...NR, player: { pos: [0, 0, 14], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 1, 11], state: 'drain', target_lantern_id: 'L1' }] },
    inputs: { frames: press('pulse', 0) }, ticks: 2, snapshotEvery: 1,
    check(o) { assert.equal(snapAt(o, 1).shades[0].state, 'stunned'); assert.equal(end(o).score, 15); },
  },
  {
    phase: '3', name: 'drain_refuel_evict', req: 'Refuel to >= 30 with shades within 6 m: pushed to the edge within 30 ticks, harmless, drain -> wander',
    scenario: { ...NR, player: { pos: [1, 0, 24], carried: 5 }, lanterns: [{ id: 'L1', lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }] },
    inputs: { frames: press('interact', 0) }, ticks: 120, snapshotEvery: 1,
    check(o) {
      assert.deepEqual(events(o, 'refuel')[0].data, { lantern_id: 'L1', amount: 5, fuel: 74.9 });
      assert.equal(snapAt(o, 1).shades[0].state, 'wander');
      assert.ok(dXZ(snapAt(o, 30).shades[0].pos, [0, 0, 25]) >= 6);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  // ------------------------------------------------------------ Ticket-03: win rule
  {
    phase: '3', name: 'all_lit_no_early_end', req: 'Lighting every lantern no longer ends the night',
    scenario: { ...NR, lanterns: ['L1', 'L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true })) }, ticks: 100,
    check(o) { assert.equal(events(o, 'game_over').length, 0); assert.equal(end(o).state, 'playing'); },
  },
  {
    phase: '3', name: 'win_dawn_survived', req: 'Win at dawn with lit >= ceil(0.6 x 5) = 3: +50 + floor(fuel) per lit lantern + 50 per flame, reason dawn_survived',
    scenario: { ...NR, time_left_s: 1, lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true })) }, ticks: 100,
    check(o) {
      assert.deepEqual(events(o, 'game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } });
      assert.deepEqual(end(o), { type: 'end', ticks: 60, state: 'won', score: 3 * (50 + 99) + 150 });
    },
  },
  {
    phase: '3', name: 'lose_dawn_below_ratio', req: 'Dawn with fewer lit lanterns than the threshold (2 < 3) is a loss, no bonus',
    scenario: { ...NR, time_left_s: 1, lanterns: ['L1', 'L2'].map((id) => ({ id, lit: true })) }, ticks: 100,
    check(o) { assert.deepEqual(end(o), { type: 'end', ticks: 60, state: 'lost', score: 0 }); assert.equal(events(o, 'game_over')[0].data.reason, 'dawn'); },
  },
  {
    phase: '3', name: 'threshold_night2', req: 'Night 2 needs ceil(0.6 x 6) = 4 lit at dawn',
    night: 2, scenario: { ...NR, time_left_s: 1, lanterns: ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })) }, ticks: 100,
    check(o) { assert.equal(end(o).state, 'won'); },
  },
  {
    phase: '3', name: 'threshold_night3_fail', req: 'Night 3 needs 5/7: 4 lit at dawn loses',
    night: 3, scenario: { ...NR, time_left_s: 1, lanterns: ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })) }, ticks: 100,
    check(o) { assert.deepEqual(events(o, 'game_over')[0].data, { result: 'lost', reason: 'dawn' }); },
  },
  {
    phase: '3', name: 'no_flames_beats_dawn', req: 'Losing the last flame on the dawn tick is no_flames (checked first)',
    scenario: { ...NR, time_left_s: 1 / 60, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }], lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true })) }, ticks: 5,
    check(o) { assert.deepEqual(events(o, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' }); },
  },
];

// Wandering inputs for determinism checks (arithmetic, no randomness).
export const WANDER_INPUTS = {
  frames: Array.from({ length: 360 }, (_, i) => ({
    tick: i * 60,
    move: [Math.round(Math.sin(i * 1.7) * 100) / 100, Math.round(Math.cos(i * 0.9) * 100) / 100],
    cam_yaw_deg: (i * 37) % 360,
    pulse: i % 5 === 2,
    jump: i % 7 === 3,
    interact: i % 3 === 1,
    dash: i % 4 === 1,
  })),
};

export { parse };
