// Pure, deterministic game simulation. No DOM, no three.js, no Math.random, no clock.
// One call to step() = one tick of 1/60 s (Test Contract v1.0 tick model).
import { TUNING as T, WORLD as W } from './tuning.js';
import { createRng, round3 } from './rng.js';

export const TICK_RATE = 60;
const DT = 1 / TICK_RATE;
const secToTicks = (s) => Math.round(s * TICK_RATE);

const distXZ = (a, b) => {
  const dx = a[0] - b[0], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
};
const r3v = (p) => [round3(p[0]), round3(p[1]), round3(p[2])];

export function defaultLanterns() {
  const out = [];
  for (let i = 0; i < T.lantern_count_night1; i++) {
    const a = (i * 2 * Math.PI) / T.lantern_count_night1;
    out.push({
      id: `L${i + 1}`,
      pos: [round3(W.lantern_ring_radius * Math.sin(a)), 0, round3(W.lantern_ring_radius * Math.cos(a))],
      lit: false,
      deposited: 0,
    });
  }
  return out;
}

function clampToIsland(pos) {
  const r = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
  if (r > W.island_radius) {
    pos[0] *= W.island_radius / r;
    pos[2] *= W.island_radius / r;
  }
}

// Keep a shade inside the island and outside every lantern's safe radius.
function constrainShade(game, s) {
  clampToIsland(s.pos);
  const minD = T.safe_radius + W.safe_margin;
  for (const l of game.lanterns) {
    const d = distXZ(s.pos, l.pos);
    if (d < minD) {
      let dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2], len = d;
      if (len < 1e-9) { dx = 1; dz = 0; len = 1; }
      s.pos[0] = l.pos[0] + (dx / len) * minD;
      s.pos[2] = l.pos[2] + (dz / len) * minD;
    }
  }
}

function nextId(game, prefix, used) {
  const key = prefix === 'M' ? 'nextMote' : 'nextShade';
  let id;
  do { id = `${prefix}${game[key]++}`; } while (used.has(id));
  used.add(id);
  return id;
}

function randomMotePos(game) {
  const R = W.island_radius - 2;
  let pos;
  for (let i = 0; i < 20; i++) {
    const r = R * Math.sqrt(game.rng()), a = game.rng() * 2 * Math.PI;
    pos = [round3(r * Math.sin(a)), 0, round3(r * Math.cos(a))];
    if (distXZ(pos, game.player.pos) > W.mote_clear_radius) break;
  }
  return pos;
}

function randomShadePos(game) {
  const R = W.island_radius - 2;
  let pos;
  for (let i = 0; i < 20; i++) {
    const a = game.rng() * 2 * Math.PI;
    pos = [round3(R * Math.sin(a)), W.shade_hover_y, round3(R * Math.cos(a))];
    const farFromPlayer = distXZ(pos, game.player.pos) >= W.shade_spawn_min_dist;
    const outsideSafe = game.lanterns.every((l) => distXZ(pos, l.pos) > T.safe_radius + W.safe_margin);
    if (farFromPlayer && outsideSafe) break;
  }
  return pos;
}

/**
 * Build the initial state (tick 0). `scenario` is an already-validated object or null.
 * Setup never emits events and never awards points.
 */
export function createGame({ seed = 0, scenario = null } = {}) {
  const sc = scenario || {};
  const game = {
    rng: createRng(seed),
    tick: 0,
    state: 'playing',
    result: null,
    score: 0,
    t0: sc.time_left_s ?? T.night1_duration_s,
    player: { pos: [0, 0, 0], vy: 0, grounded: true, flames: T.flames, carried: 0, invuln: 0, pulseCd: 0 },
    lanterns: defaultLanterns(),
    shades: [],
    motes: [],
    nextMote: 1,
    nextShade: 1,
    moteIds: new Set(),
    shadeIds: new Set(),
    randomMotes: sc.random_motes ?? true,
    randomShades: sc.random_shades ?? true,
    moteTimer: 0,
    shadeTimer: 0,
    prev: { jump: false, interact: false, pulse: false },
  };

  const p = game.player;
  if (sc.player) {
    if (sc.player.pos) p.pos = [...sc.player.pos];
    if (sc.player.carried !== undefined) p.carried = sc.player.carried;
    if (sc.player.flames !== undefined) p.flames = sc.player.flames;
    p.grounded = p.pos[1] <= 0;
  }

  if (sc.lanterns) {
    for (const u of sc.lanterns) {
      const l = game.lanterns.find((x) => x.id === u.id);
      if (u.pos) l.pos = [...u.pos];
      if (u.deposited !== undefined) l.deposited = u.deposited;
      if (u.lit !== undefined) l.lit = u.lit;
    }
  }

  if (sc.motes) {
    for (const m of sc.motes) if (m.id) game.moteIds.add(m.id);
    for (const m of sc.motes) game.motes.push({ id: m.id ?? nextId(game, 'M', game.moteIds), pos: [...m.pos] });
  } else if (game.randomMotes) {
    for (let i = 0; i < W.initial_motes; i++) game.motes.push({ id: nextId(game, 'M', game.moteIds), pos: randomMotePos(game) });
  }

  if (sc.shades) {
    for (const s of sc.shades) if (s.id) game.shadeIds.add(s.id);
    for (const s of sc.shades) game.shades.push({ id: s.id ?? nextId(game, 'S', game.shadeIds), pos: [...s.pos], state: 'chase', stun: 0 });
  } else if (game.randomShades) {
    for (let i = 0; i < W.initial_shades; i++) game.shades.push({ id: nextId(game, 'S', game.shadeIds), pos: randomShadePos(game), state: 'chase', stun: 0 });
  }
  return game;
}

export const timeLeft = (game) => Math.max(0, game.t0 - game.tick / TICK_RATE);

function endGame(game, emit, result, reason) {
  game.state = result;
  game.result = { result, reason };
  emit('game_over', { result, reason });
}

/**
 * Advance one tick. `input` = { move:[x,z], cam_yaw_deg, jump, interact, pulse } (held values).
 * Returns the events produced in this step: [{ name, data }]. Caller stamps them with game.tick.
 */
export function step(game, input) {
  const events = [];
  if (game.state !== 'playing') return events;
  const emit = (name, data) => events.push({ name, data });
  const p = game.player;
  game.tick += 1;

  const jumpE = !!input.jump && !game.prev.jump;
  const interactE = !!input.interact && !game.prev.interact;
  const pulseE = !!input.pulse && !game.prev.pulse;
  game.prev = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

  if (p.invuln > 0) p.invuln--;
  if (p.pulseCd > 0) p.pulseCd--;

  // 1. Player movement (camera-relative, normalised), clamped to the island.
  let [mx, mz] = input.move || [0, 0];
  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  p.pos[0] += wx * T.player_speed * DT;
  p.pos[2] += wz * T.player_speed * DT;
  clampToIsland(p.pos);

  // 2. Jump (cosmetic for gameplay: all distances are horizontal).
  if (jumpE && p.grounded) { p.vy = W.jump_speed; p.grounded = false; }
  if (!p.grounded) {
    p.vy -= W.gravity * DT;
    p.pos[1] += p.vy * DT;
    if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; p.grounded = true; }
  }

  // 3. Auto pickup, in list order, up to capacity.
  for (let i = 0; i < game.motes.length && p.carried < T.carry_capacity; ) {
    if (distXZ(p.pos, game.motes[i].pos) <= T.pickup_radius) {
      game.motes.splice(i, 1);
      p.carried += 1;
      game.score += T.score.per_mote;
      emit('mote_picked', { carried: p.carried });
    } else i++;
  }

  // 4. Interact: deposit into the nearest unlit lantern in range.
  if (interactE && p.carried > 0) {
    let best = null, bestD = Infinity;
    for (const l of game.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= T.interact_radius && d < bestD) { best = l; bestD = d; }
    }
    if (best) {
      const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= T.lantern_cost) {
          best.lit = true;
          game.score += T.score.per_lantern;
          emit('lantern_lit', { lantern_id: best.id });
        }
      }
    }
  }
  if (game.lanterns.every((l) => l.lit)) {
    game.score += Math.floor(timeLeft(game)) * T.score.per_second_left + p.flames * T.score.per_flame_left;
    endGame(game, emit, 'won', 'all_lit');
    return events;
  }

  // 5. Shades: stun timers, chase, constraints.
  for (const s of game.shades) {
    if (s.state === 'stunned') {
      if (--s.stun <= 0) { s.state = 'chase'; s.stun = 0; } else continue;
    }
    const d = distXZ(s.pos, p.pos);
    if (d > 1e-9) {
      const stepLen = Math.min(T.shade_speed * DT, d);
      s.pos[0] += ((p.pos[0] - s.pos[0]) / d) * stepLen;
      s.pos[2] += ((p.pos[2] - s.pos[2]) / d) * stepLen;
    }
    constrainShade(game, s);
  }

  // 6. Pulse: costs light, stuns and pushes shades in range.
  if (pulseE && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseCd = secToTicks(T.pulse_cooldown_s);
    const stunned = [];
    for (const s of game.shades) {
      const d = distXZ(s.pos, p.pos);
      if (d > T.pulse_radius) continue;
      let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], l = d;
      if (l < 1e-9) { dx = 1; dz = 0; l = 1; }
      s.pos[0] += (dx / l) * T.pulse_push_m;
      s.pos[2] += (dz / l) * T.pulse_push_m;
      constrainShade(game, s);
      s.state = 'stunned';
      s.stun = secToTicks(T.pulse_stun_s);
      stunned.push(s.id);
    }
    game.score += stunned.length * T.score.per_stun;
    emit('pulse', { stunned_ids: stunned });
  }

  // 7. Spawning (only when random spawning is on).
  if (game.randomShades) {
    game.shadeTimer++;
    if (game.shadeTimer >= secToTicks(W.shade_spawn_s)) {
      game.shadeTimer = 0;
      if (game.shades.length < W.max_shades) {
        const id = nextId(game, 'S', game.shadeIds);
        game.shades.push({ id, pos: randomShadePos(game), state: 'chase', stun: 0 });
        emit('shade_spawned', { id });
      }
    }
  }
  if (game.randomMotes) {
    game.moteTimer++;
    if (game.moteTimer >= secToTicks(W.mote_respawn_s)) {
      game.moteTimer = 0;
      if (game.motes.length < W.max_motes) game.motes.push({ id: nextId(game, 'M', game.moteIds), pos: randomMotePos(game) });
    }
  }

  // 8. Shade contact (one hit per tick, then invulnerability).
  if (p.invuln === 0) {
    for (const s of game.shades) {
      if (s.state === 'stunned' || distXZ(s.pos, p.pos) > T.shade_hit_radius) continue;
      p.flames -= 1;
      const dropped = Math.floor(p.carried * T.hit_drop_ratio);
      p.carried -= dropped;
      p.invuln = secToTicks(T.invuln_s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      if (p.flames <= 0) { endGame(game, emit, 'lost', 'no_flames'); return events; }
      break;
    }
  }

  // 9. Dawn.
  if (game.t0 - game.tick / TICK_RATE <= 1e-9) endGame(game, emit, 'lost', 'dawn');
  return events;
}

export function snapshot(game) {
  return {
    type: 'snapshot',
    tick: game.tick,
    sim_tick: game.tick,
    state: game.state,
    time_left_s: round3(timeLeft(game)),
    score: game.score,
    player: { pos: r3v(game.player.pos), flames: game.player.flames, carried: game.player.carried },
    lanterns: game.lanterns.map((l) => ({ id: l.id, pos: r3v(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: game.shades.map((s) => ({ id: s.id, pos: r3v(s.pos), state: s.state })),
    motes_active: game.motes.length,
    motes: game.motes.map((m) => ({ id: m.id, pos: r3v(m.pos) })),
  };
}
