// Phase 1 headless scenarios. Each one maps to a requirement (PRD-0 / Test Contract v1.0)
// and has a check() that throws on failure. Used by tests/scenarios.test.js and scripts/proof.js.
import assert from 'node:assert/strict';
import { TUNING as T } from '../src/core/tuning.js';

const NO_RANDOM = { random_motes: false, random_shades: false, motes: [], shades: [] };
const parse = (lines) => lines.map((l) => JSON.parse(l));
const events = (o, name) => o.filter((x) => x.type === 'event' && (!name || x.name === name));
const snaps = (o) => o.filter((x) => x.type === 'snapshot');
const snapAt = (o, tick) => snaps(o).find((s) => s.tick === tick);
const end = (o) => o[o.length - 1];
const dXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export const SCENARIOS = [
  {
    name: 'move_forward',
    req: 'Movement: move [0,1] at yaw 0 goes +Z at player_speed (6 m/s)',
    scenario: NO_RANDOM,
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    ticks: 60,
    check(o) { assert.deepEqual(snapAt(o, 60).player.pos, [0, 0, T.player_speed]); },
  },
  {
    name: 'move_yaw90',
    req: 'Movement: cam_yaw_deg rotation formula (yaw 90, move [0,1] -> +X)',
    scenario: NO_RANDOM,
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
    ticks: 60,
    check(o) { assert.deepEqual(snapAt(o, 60).player.pos, [T.player_speed, 0, 0]); },
  },
  {
    name: 'move_normalized',
    req: 'Movement: vectors longer than 1 are normalised',
    scenario: NO_RANDOM,
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    ticks: 60,
    check(o) { assert.ok(Math.abs(dXZ(snapAt(o, 60).player.pos, [0, 0, 0]) - T.player_speed) < 0.002); },
  },
  {
    name: 'jump',
    req: 'Jump: rising edge lifts the player, who lands back on Y=0',
    scenario: NO_RANDOM,
    inputs: { frames: [{ tick: 0, jump: true }] },
    ticks: 60,
    check(o) {
      assert.ok(snapAt(o, 10).player.pos[1] > 0.5);
      assert.equal(snapAt(o, 60).player.pos[1], 0);
    },
  },
  {
    name: 'island_clamp',
    req: 'No falling (fall_enabled=false): player stays inside the island',
    scenario: NO_RANDOM,
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    ticks: 900,
    check(o) {
      for (const s of snaps(o)) assert.ok(dXZ(s.player.pos, [0, 0, 0]) <= 35.001);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  {
    name: 'pickup',
    req: 'Pickup within pickup_radius (1.0): mote at z=5 picked on tick 40, +per_mote',
    scenario: { ...NO_RANDOM, motes: [[0, 0, 5]] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    ticks: 60,
    check(o) {
      const e = events(o, 'mote_picked');
      assert.equal(e.length, 1);
      assert.equal(e[0].tick, 40);
      assert.deepEqual(e[0].data, { carried: 1 });
      assert.equal(snapAt(o, 40).score, T.score.per_mote);
      assert.equal(snapAt(o, 40).motes_active, 0);
    },
  },
  {
    name: 'carry_capacity',
    req: 'Carry capacity (5): extra motes stay on the ground',
    scenario: { ...NO_RANDOM, motes: [1, 2, 3, 4, 5, 6, 7].map((z) => [0, 0, z]) },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    ticks: 120,
    check(o) {
      assert.equal(events(o, 'mote_picked').length, T.carry_capacity);
      const s = snapAt(o, 120);
      assert.equal(s.player.carried, T.carry_capacity);
      assert.equal(s.motes_active, 2);
    },
  },
  {
    name: 'deposit_partial',
    req: 'Deposit: interact within interact_radius moves carried light into the lantern',
    scenario: { ...NO_RANDOM, player: { pos: [0, 0, 20], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 22] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 10,
    check(o) {
      assert.deepEqual(events(o).map((e) => [e.tick, e.name, e.data]), [[1, 'deposit', { lantern_id: 'L1', amount: 3, deposited: 3 }]]);
      const s = snapAt(o, 10);
      assert.equal(s.player.carried, 0);
      assert.equal(s.lanterns[0].lit, false);
    },
  },
  {
    name: 'deposit_out_of_range',
    req: 'Deposit: nothing happens outside interact_radius (2.5)',
    scenario: { ...NO_RANDOM, player: { pos: [0, 0, 19.4], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 22] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 10,
    check(o) { assert.equal(events(o).length, 0); },
  },
  {
    name: 'interact_edge_only',
    req: 'Buttons fire on false->true only (holding interact deposits once)',
    // deposit 2 on tick 1, then walk onto a mote (picked tick 5) while still holding interact
    scenario: { ...NO_RANDOM, player: { pos: [0, 0, 20], carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 22] }], motes: [[0, 0, 21.5]] },
    inputs: { frames: [{ tick: 0, interact: true, move: [0, 1] }, { tick: 6, move: [0, 0] }] },
    ticks: 30,
    check(o) {
      assert.equal(events(o, 'deposit').length, 1);
      assert.equal(events(o, 'mote_picked')[0].tick, 5);
      assert.equal(snapAt(o, 30).player.carried, 1);
    },
  },
  {
    name: 'light_lantern',
    req: 'Lantern lit when deposited reaches lantern_cost (5), +per_lantern',
    scenario: { ...NO_RANDOM, player: { pos: [0, 0, 20], carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 22] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 10,
    check(o) {
      assert.deepEqual(events(o).map((e) => e.name), ['deposit', 'lantern_lit']);
      assert.equal(snapAt(o, 10).lanterns[0].lit, true);
      assert.equal(end(o).score, T.score.per_lantern);
    },
  },
  {
    name: 'win_all_lit',
    req: 'Win when all 5 lanterns are lit; end bonus per_second_left + per_flame_left',
    scenario: {
      ...NO_RANDOM,
      player: { pos: [0, 0, 0], carried: 5 },
      lanterns: [
        { id: 'L1', pos: [0, 0, 2], lit: true, deposited: 5 },
        { id: 'L2', lit: true, deposited: 5 }, { id: 'L3', lit: true, deposited: 5 }, { id: 'L4', lit: true, deposited: 5 },
        { id: 'L5', pos: [1, 0, 0] },
      ],
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 100,
    check(o) {
      const go = events(o, 'game_over');
      assert.deepEqual(go[0].data, { result: 'won', reason: 'all_lit' });
      assert.equal(go[0].tick, 1);
      // 100 lantern + floor(299.983)*1 + 3 flames*50 ; pre-lit lanterns gave no points
      assert.deepEqual(end(o), { type: 'end', ticks: 1, state: 'won', score: 100 + 299 + 150 });
    },
  },
  {
    name: 'setup_no_events',
    req: 'Scenario setup emits no events and awards no points (pre-lit lantern)',
    scenario: { ...NO_RANDOM, lanterns: [{ id: 'L1', lit: true, deposited: 5 }] },
    ticks: 10,
    check(o) {
      assert.equal(events(o).length, 0);
      assert.equal(snapAt(o, 0).score, 0);
      assert.equal(snapAt(o, 0).lanterns[0].lit, true);
    },
  },
  {
    name: 'shade_chase',
    req: 'Shades chase the player at shade_speed (4 m/s)',
    scenario: { ...NO_RANDOM, shades: [{ id: 'S1', pos: [20, 1, 0] }], lanterns: [{ id: 'L2', pos: [30, 0, 30] }, { id: 'L5', pos: [-30, 0, 30] }] },
    ticks: 60,
    check(o) {
      const s = snapAt(o, 60).shades[0];
      assert.equal(s.state, 'chase');
      assert.deepEqual(s.pos, [20 - T.shade_speed, 1, 0]);
    },
  },
  {
    name: 'pulse_stun_push',
    req: 'Pulse costs pulse_cost light, stuns shades within pulse_radius, pushes them pulse_push_m, +per_stun',
    scenario: { ...NO_RANDOM, player: { carried: 2 }, shades: [{ id: 'S1', pos: [5, 1, 0] }, { id: 'S2', pos: [-12, 1, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    ticks: 10,
    check(o) {
      const e = events(o, 'pulse');
      assert.equal(e.length, 1);
      assert.deepEqual(e[0].data, { stunned_ids: ['S1'] });
      const s = snapAt(o, 10);
      assert.equal(s.player.carried, 2 - T.pulse_cost);
      assert.equal(s.shades[0].state, 'stunned');
      // S1 moved 4/60 m toward the player in step 1, then pushed 4 m away
      assert.equal(s.shades[0].pos[0], round(5 - T.shade_speed / 60 + T.pulse_push_m));
      assert.equal(s.shades[1].state, 'chase');
      assert.equal(s.score, T.score.per_stun);
    },
  },
  {
    name: 'pulse_stun_duration',
    req: 'Stun lasts pulse_stun_s (3 s = 180 ticks), then the shade chases again',
    scenario: { ...NO_RANDOM, player: { carried: 1 }, shades: [{ id: 'S1', pos: [5, 1, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    ticks: 200,
    snapshotEvery: 1,
    check(o) {
      assert.equal(snapAt(o, 180).shades[0].state, 'stunned');
      assert.equal(snapAt(o, 181).shades[0].state, 'chase');
    },
  },
  {
    name: 'pulse_needs_light',
    req: 'Pulse with no carried light does nothing',
    scenario: { ...NO_RANDOM, player: { carried: 0 }, shades: [{ id: 'S1', pos: [5, 1, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    ticks: 10,
    check(o) { assert.equal(events(o, 'pulse').length, 0); },
  },
  {
    name: 'pulse_cooldown',
    req: 'Pulse cooldown (2 s = 120 ticks)',
    scenario: { ...NO_RANDOM, player: { carried: 5 } },
    inputs: { frames: [
      { tick: 0, pulse: true }, { tick: 1, pulse: false },
      { tick: 60, pulse: true }, { tick: 61, pulse: false },
      { tick: 120, pulse: true }, { tick: 121, pulse: false },
    ] },
    ticks: 130,
    check(o) {
      assert.deepEqual(events(o, 'pulse').map((e) => e.tick), [1, 121]);
      assert.equal(end(o).score, 0); // no shades => no stun points
    },
  },
  {
    name: 'shade_hit_invuln',
    req: 'Shade contact: -1 flame, drop floor(carried*hit_drop_ratio), invuln_s (1.5 s) protection',
    scenario: { ...NO_RANDOM, player: { carried: 4 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] },
    ticks: 100,
    check(o) {
      const hits = events(o, 'player_hit');
      assert.deepEqual(hits.map((e) => e.tick), [1, 91]);
      assert.deepEqual(hits[0].data, { by: 'shade', flames: 2, dropped: 2 });
      assert.deepEqual(hits[1].data, { by: 'shade', flames: 1, dropped: 1 });
    },
  },
  {
    name: 'lose_no_flames',
    req: 'Lose when flames reach 0 (reason no_flames)',
    scenario: { ...NO_RANDOM, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] },
    ticks: 100,
    check(o) {
      assert.deepEqual(events(o, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
      assert.deepEqual(end(o), { type: 'end', ticks: 1, state: 'lost', score: 0 });
    },
  },
  {
    name: 'lose_dawn',
    req: 'Lose at dawn when time runs out (time_left_s = duration - steps/60)',
    scenario: { ...NO_RANDOM, time_left_s: 1 },
    ticks: 100,
    check(o) {
      assert.equal(snapAt(o, 30).time_left_s, 0.5);
      const go = events(o, 'game_over');
      assert.equal(go[0].tick, 60);
      assert.deepEqual(go[0].data, { result: 'lost', reason: 'dawn' });
      assert.equal(end(o).ticks, 60);
    },
  },
  {
    name: 'safe_radius',
    req: 'Shades cannot enter safe_radius (4 m) around a lantern; player sheltering there is not hit',
    scenario: { ...NO_RANDOM, player: { pos: [0, 0, 10] }, lanterns: [{ id: 'L1', pos: [0, 0, 10] }], shades: [{ id: 'S1', pos: [0, 1, 20] }] },
    ticks: 600,
    check(o) {
      for (const s of snaps(o)) assert.ok(dXZ(s.shades[0].pos, [0, 0, 10]) >= T.safe_radius);
      assert.equal(events(o, 'player_hit').length, 0);
    },
  },
  {
    name: 'shade_spawn',
    req: 'Random shades spawn over time with shade_spawned events (every 30 s)',
    scenario: { random_motes: false, random_shades: true, motes: [], shades: [] },
    ticks: 1800,
    check(o) {
      const e = events(o, 'shade_spawned');
      assert.deepEqual(e.map((x) => [x.tick, x.data.id]), [[1800, 'S1']]);
    },
  },
  {
    name: 'default_world',
    req: 'Default Night 1: 5 lanterns, random motes and shades, ids, snapshot cadence, end line',
    ticks: 25,
    check(o) {
      const s0 = snapAt(o, 0);
      assert.equal(s0.lanterns.length, 5);
      assert.deepEqual(s0.lanterns.map((l) => l.id), ['L1', 'L2', 'L3', 'L4', 'L5']);
      assert.equal(s0.motes_active, 20);
      assert.deepEqual(s0.shades.map((x) => x.id), ['S1', 'S2']);
      assert.equal(s0.time_left_s, T.night1_duration_s);
      assert.deepEqual(snaps(o).map((x) => x.tick), [0, 10, 20]);
      assert.deepEqual(end(o), { type: 'end', ticks: 25, state: 'playing', score: 0 });
    },
  },
];

// Wandering inputs for determinism checks: changes direction/yaw every second, pulses every 2.5 s,
// jumps and interacts now and then. Generated arithmetically (no randomness).
export const WANDER_INPUTS = {
  frames: Array.from({ length: 300 }, (_, i) => ({
    tick: i * 60,
    move: [Math.round(Math.sin(i * 1.7) * 100) / 100, Math.round(Math.cos(i * 0.9) * 100) / 100],
    cam_yaw_deg: (i * 37) % 360,
    pulse: i % 5 === 2,
    jump: i % 7 === 3,
    interact: i % 3 === 1,
  })),
};

function round(x) { return Math.round(x * 1000) / 1000; }
export { parse };
