// Pure, deterministic simulation (Contract v1.1). No DOM, no three.js, no Math.random, no clock.
// One step() call = one tick (1/60 s), following the mandatory 12-step order of Ticket-02.
import { TUNING as T, RULES as R } from './tuning.js';
import { MAPS } from './maps.js';
import { createRng, round3 } from './rng.js';

export const TICK_RATE = 60;
const DT = 1 / TICK_RATE;
const PULSE_CD = Math.round(T.pulse_cooldown_s * TICK_RATE);
const STUN = Math.round(T.pulse_stun_s * TICK_RATE);

const dXZ = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2);
const d3 = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const r3v = (p) => p.map(round3);
const byId = (a, b) => (a.id.length - b.id.length) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function nextId(game, prefix) {
  let id;
  do { id = `${prefix}${game.counters[prefix]++}`; } while (game.usedIds.has(id));
  game.usedIds.add(id);
  return id;
}

// ---------------------------------------------------------------- setup
export function createGame({ seed = 0, night = 1, scenario = null } = {}) {
  const sc = scenario || {};
  const map = MAPS[night];
  const game = {
    rng: createRng(seed),
    map,
    night,
    tick: 0, // ticks run, including paused ticks
    simTick: 0, // gameplay ticks
    state: 'playing',
    paused: false,
    result: null,
    score: 0,
    t0: sc.time_left_s ?? map.duration_s,
    startedEvent: false,
    player: {
      pos: [...map.start], vel: [0, 0, 0], facing: [0, 1], grounded: true,
      flames: T.flames, carried: 0, invuln: 0, dashCd: 0, pulseCd: 0, charm: 0,
      dash: 0, dashDir: [0, 1], launch: null, fallWait: 0,
    },
    lanterns: map.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 })),
    shades: [],
    motes: [],
    drifters: [],
    charms: map.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawn: 0 })),
    counters: { M: 1, S: 1, D: 1, C: 1 },
    usedIds: new Set(),
    randomMotes: sc.random_motes ?? true,
    randomShades: sc.random_shades ?? true,
    randomDrifters: sc.random_drifters ?? map.drifters,
    windEnabled: sc.wind_enabled ?? map.wind,
    wind: { active: false, dir_deg: 0, left: 0 },
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
  };
  const p = game.player;

  if (sc.player) {
    const sp = sc.player;
    if (sp.pos) p.pos = [...sp.pos];
    if (sp.carried !== undefined) p.carried = sp.carried;
    if (sp.flames !== undefined) p.flames = sp.flames;
    if (sp.invuln_ticks !== undefined) p.invuln = sp.invuln_ticks;
    if (sp.dash_cd_ticks !== undefined) p.dashCd = sp.dash_cd_ticks;
    if (sp.pulse_cd_ticks !== undefined) p.pulseCd = sp.pulse_cd_ticks;
    if (sp.charm_ticks !== undefined) p.charm = sp.charm_ticks;
    const g = map.ground(p.pos[0], p.pos[2]);
    p.grounded = g !== null && Math.abs(p.pos[1] - g) < 1e-6;
  }
  for (const u of sc.lanterns || []) {
    const l = game.lanterns.find((x) => x.id === u.id);
    if (u.pos) l.pos = [...u.pos];
    if (u.deposited !== undefined) l.deposited = u.deposited;
    if (u.lit !== undefined) l.lit = u.lit;
  }

  // explicit ids first so generated ids never collide
  for (const key of ['motes', 'shades', 'drifters', 'charms']) for (const e of sc[key] || []) if (e.id) game.usedIds.add(e.id);

  if (sc.motes) {
    for (const m of sc.motes) {
      game.motes.push({
        id: m.id ?? nextId(game, 'M'), pos: [...m.pos], kind: m.kind ?? 'random',
        ttl: m.kind === 'dropped' ? Math.round((m.ttl_s ?? R.drop_ttl / TICK_RATE) * TICK_RATE) : null, point: null,
      });
    }
  } else if (game.randomMotes) {
    const pts = map.motePoints.map((_, i) => i);
    for (let i = 0; i < R.mote_initial && pts.length; i++) {
      const k = Math.floor(game.rng() * pts.length);
      const idx = pts.splice(k, 1)[0];
      game.motes.push({ id: nextId(game, 'M'), pos: [...map.motePoints[idx]], kind: 'random', ttl: null, point: idx });
    }
  }
  if (sc.shades) {
    for (const s of sc.shades) {
      const shade = newShade(game, s.id ?? nextId(game, 'S'), s.pos, s.state ?? 'wander');
      if (s.state_ticks_left !== undefined) shade.left = s.state_ticks_left;
      else if (shade.state === 'stunned') shade.left = STUN;
      else if (shade.state === 'recoil') shade.left = R.recoil_ticks;
      else if (shade.state === 'spawning') shade.left = R.shade_spawning_ticks;
      game.shades.push(shade);
    }
  }
  if (sc.drifters) {
    for (const d of sc.drifters) {
      game.drifters.push({ id: d.id ?? nextId(game, 'D'), pos: [...d.pos], state: d.state ?? 'idle', stolen: d.stolen ?? 0, left: d.state === 'flee' ? R.drifter_flee_ticks : 0, target: null });
    }
  }
  if (sc.charms) {
    game.charms = sc.charms.map((c) => ({
      id: c.id ?? nextId(game, 'C'), pos: [...c.pos], available: c.available ?? true,
      respawn: c.respawn_ticks ?? (c.available === false ? R.charm_respawn : 0),
    }));
  }
  return game;
}

function newShade(game, id, pos, state = 'spawning') {
  return { id, pos: [...pos], state, left: state === 'spawning' ? R.shade_spawning_ticks : 0, push: null, pushLeft: 0, recoilDir: null, evict: false, target: null };
}

export const timeLeft = (game) => Math.max(0, game.t0 - game.simTick / TICK_RATE);

// ---------------------------------------------------------------- helpers
const groundAt = (game, x, z) => game.map.ground(x, z);
const shadeY = (game, x, z, fallback) => { const g = groundAt(game, x, z); return g === null ? fallback : g + R.shade_hover; };
const litLanterns = (game) => game.lanterns.filter((l) => l.lit);

function shadeObstacle(game, x, z) {
  const g = groundAt(game, x, z);
  return g === null || (game.night === 3 && x * x + z * z <= 4);
}

// Move a shade horizontally by (dx, dz); stops at obstacles and at lit safe zones.
function moveShade(game, s, dx, dz) {
  const nx = s.pos[0] + dx, nz = s.pos[2] + dz;
  if (shadeObstacle(game, nx, nz)) return false;
  const minD = T.safe_radius + R.safe_margin;
  let x = nx, z = nz;
  for (const l of litLanterns(game)) {
    const d = Math.sqrt((x - l.pos[0]) ** 2 + (z - l.pos[2]) ** 2);
    if (d < minD) {
      let ux = x - l.pos[0], uz = z - l.pos[2], len = d;
      if (len < 1e-9) { ux = 1; uz = 0; len = 1; }
      x = l.pos[0] + (ux / len) * minD;
      z = l.pos[2] + (uz / len) * minD;
    }
  }
  if (shadeObstacle(game, x, z)) return false;
  s.pos[0] = x; s.pos[2] = z; s.pos[1] = shadeY(game, x, z, s.pos[1]);
  return true;
}

function stepToward(pos, target, maxStep) {
  const dx = target[0] - pos[0], dz = target[2] - pos[2], d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1e-9) return [0, 0];
  const k = Math.min(maxStep, d) / d;
  return [dx * k, dz * k];
}

function dropMotes(game, center, n) {
  for (let i = 0; i < n; i++) {
    const a = game.rng() * 2 * Math.PI;
    const r = R.drop_ring_min + game.rng() * (R.drop_ring_max - R.drop_ring_min);
    const x = round3(center[0] + r * Math.cos(a)), z = round3(center[2] + r * Math.sin(a));
    const g = groundAt(game, x, z);
    game.motes.push({ id: nextId(game, 'M'), pos: [x, g === null ? round3(center[1]) : g, z], kind: 'dropped', ttl: R.drop_ttl, point: null });
  }
}

function playerActive(game) { return game.player.fallWait === 0; }

// ---------------------------------------------------------------- step
/**
 * Advance one tick. `input` = held values { move, cam_yaw_deg, jump, interact, pulse, dash, pause }.
 * Returns [{ name, data }] for this tick; the caller stamps them with game.tick.
 */
export function step(game, input) {
  const events = [];
  if (game.state === 'won' || game.state === 'lost') return events;
  const emit = (name, data) => events.push({ name, data });
  const p = game.player, map = game.map;
  game.tick += 1;
  if (!game.startedEvent) { game.startedEvent = true; emit('night_start', { night: game.night }); }

  // 1. Input (pause first)
  const edge = (k) => !!input[k] && !game.prev[k];
  const e = { jump: edge('jump'), interact: edge('interact'), pulse: edge('pulse'), dash: edge('dash'), pause: edge('pause') };
  for (const k of Object.keys(game.prev)) game.prev[k] = !!input[k];
  if (e.pause) {
    game.paused = !game.paused;
    game.state = game.paused ? 'paused' : 'playing';
    emit(game.paused ? 'paused' : 'resumed', {});
  }
  if (game.paused) return events;
  game.simTick += 1;

  // 2. Timers
  if (p.dashCd > 0) p.dashCd--;
  if (p.pulseCd > 0) p.pulseCd--;
  if (p.invuln > 0) p.invuln--;
  if (p.charm > 0) p.charm--;
  if (p.fallWait > 0) p.fallWait--;
  for (const s of game.shades) if (s.left > 0) s.left--;
  for (const d of game.drifters) if (d.left > 0) d.left--;
  for (const m of game.motes) if (m.ttl !== null) m.ttl--;
  game.motes = game.motes.filter((m) => m.ttl === null || m.ttl > 0);
  for (const c of game.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;

  // 3. Player movement (jump, dash, pads, wind) + fall check
  if (p.pendingRespawn && p.fallWait === 0) {
    // 60 ticks after the fall: back to the start point, velocity 0, 90 ticks invulnerable
    p.pendingRespawn = false;
    p.pos = [...map.start]; p.vel = [0, 0, 0]; p.grounded = true; p.launch = null; p.dash = 0;
    p.invuln = R.invuln_ticks;
  }
  if (playerActive(game)) movePlayer(game, input, e, emit);
  if (game.wind.active && --game.wind.left <= 0) game.wind.active = false; // a gust pushes for exactly 300 ticks

  // 4. Pickup motes and charms
  if (playerActive(game)) {
    for (let i = 0; i < game.motes.length && p.carried < T.carry_capacity;) {
      const m = game.motes[i];
      if (dXZ(p.pos, m.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= R.pickup_dy) {
        game.motes.splice(i, 1);
        p.carried += 1;
        emit('mote_picked', { carried: p.carried });
      } else i++;
    }
    for (const c of game.charms) {
      if (c.available && dXZ(p.pos, c.pos) <= T.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= R.pickup_dy) {
        c.available = false;
        c.respawn = R.charm_respawn;
        p.charm = R.charm_ticks;
        emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm });
      }
    }
  }

  // 5. Lanterns
  if (e.interact && playerActive(game) && p.carried > 0) {
    let best = null, bestD = Infinity;
    for (const l of game.lanterns) {
      if (l.lit) continue;
      const d = dXZ(p.pos, l.pos);
      if (d <= T.interact_radius && (d < bestD || (d === bestD && byId(l, best) < 0))) { best = l; bestD = d; }
    }
    if (best) {
      const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        game.score += amount * T.score.per_mote;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= T.lantern_cost) {
          best.lit = true;
          game.score += T.score.per_lantern;
          emit('lantern_lit', { lantern_id: best.id });
        }
      }
    }
  }

  // 6. Safe zones: shades inside a lit zone are pushed to its edge within <= 30 ticks, harmless meanwhile
  const evictStep = (T.safe_radius + R.safe_margin) / R.evict_ticks; // worst case (shade at the lantern) = 30 ticks
  for (const s of game.shades) {
    s.evict = false;
    for (const l of litLanterns(game)) {
      const d = dXZ(s.pos, l.pos), edgeD = T.safe_radius + R.safe_margin;
      if (d >= edgeD) continue;
      s.evict = true;
      let ux = s.pos[0] - l.pos[0], uz = s.pos[2] - l.pos[2], len = d;
      if (len < 1e-9) { ux = 1; uz = 0; len = 1; }
      const nd = Math.min(edgeD, d + evictStep);
      s.pos[0] = l.pos[0] + (ux / len) * nd;
      s.pos[2] = l.pos[2] + (uz / len) * nd;
      s.pos[1] = shadeY(game, s.pos[0], s.pos[2], s.pos[1]);
    }
  }

  // 7. Pulse
  if (e.pulse && playerActive(game) && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseCd = PULSE_CD;
    const c = [p.pos[0], p.pos[1] + R.pulse_center_y, p.pos[2]];
    const stunned = [];
    for (const s of [...game.shades].sort(byId)) {
      if (d3(c, s.pos) > T.pulse_radius) continue;
      let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], l = Math.sqrt(dx * dx + dz * dz);
      if (l < 1e-9) { dx = 1; dz = 0; l = 1; }
      s.state = 'stunned';
      s.left = STUN;
      s.push = [dx / l, dz / l];
      s.pushLeft = R.push_ticks;
      stunned.push(s.id);
    }
    game.score += stunned.length * T.score.per_stun;
    for (const d of [...game.drifters].sort(byId)) {
      if (d3(c, d.pos) > T.pulse_radius) continue;
      if (d.state === 'chase') { d.state = 'flee'; d.left = R.drifter_flee_ticks; }
      else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        for (let i = 0; i < amount; i++) {
          const g = groundAt(game, d.pos[0], d.pos[2]);
          game.motes.push({ id: nextId(game, 'M'), pos: [round3(d.pos[0]), g === null ? round3(d.pos[1]) : g, round3(d.pos[2])], kind: 'dropped', ttl: R.drop_ttl, point: null });
        }
        d.stolen = 0;
        d.left = R.drifter_drop_vanish;
        emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
    emit('pulse', { stunned_ids: stunned });
  }

  // 8. Shades and drifters move
  for (const s of game.shades) updateShade(game, s);
  for (const d of game.drifters) updateDrifter(game, d);
  game.drifters = game.drifters.filter((d) => !(d.state === 'flee' && d.left === 0));

  // 9. Contact: drifters steal first, then shades hit (ascending id)
  if (playerActive(game)) {
    for (const d of [...game.drifters].sort(byId)) {
      if ((d.state === 'idle' || d.state === 'chase') && !d.stoleOnce && p.carried > 0 && dXZ(d.pos, p.pos) <= R.drifter_hit) {
        const amount = Math.min(R.drifter_steal_max, p.carried);
        p.carried -= amount;
        d.stolen = amount;
        d.stoleOnce = true;
        d.state = 'flee';
        d.left = R.drifter_flee_ticks;
        emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
      }
    }
    for (const s of [...game.shades].sort(byId)) {
      if (!(s.state === 'wander' || s.state === 'chase') || s.evict) continue;
      if (dXZ(s.pos, p.pos) > T.shade_hit_radius || Math.abs(s.pos[1] - p.pos[1]) > R.shade_hit_dy) continue;
      if (p.invuln > 0) continue; // touching an invulnerable Mây does nothing
      p.flames -= 1;
      const dropped = Math.floor(p.carried * T.hit_drop_ratio);
      p.carried -= dropped;
      dropMotes(game, p.pos, dropped);
      p.invuln = R.invuln_ticks;
      let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], l = Math.sqrt(dx * dx + dz * dz);
      if (l < 1e-9) { dx = 1; dz = 0; l = 1; }
      s.state = 'recoil';
      s.left = R.recoil_ticks;
      s.recoilDir = [dx / l, dz / l];
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      break; // at most one flame per tick
    }
  }

  // 10. Spawning (new entities interact from the next tick)
  spawnScheduled(game, emit);

  // 11. Win / lose
  if (p.flames <= 0) endGame(game, emit, 'lost', 'no_flames');
  else if (game.lanterns.every((l) => l.lit)) {
    game.score += Math.floor(timeLeft(game)) * T.score.per_second_left + p.flames * T.score.per_flame_left;
    endGame(game, emit, 'won', 'all_lit');
  } else if (game.t0 - game.simTick / TICK_RATE <= 1e-9) endGame(game, emit, 'lost', 'dawn');
  return events;
}

function endGame(game, emit, result, reason) {
  game.state = result;
  game.result = { result, reason };
  emit('game_over', { result, reason });
}

function movePlayer(game, input, e, emit) {
  const p = game.player, map = game.map;
  // desired horizontal velocity from input (camera-relative, normalised)
  let [mx, mz] = input.move || [0, 0];
  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const wl = Math.sqrt(wx * wx + wz * wz);
  if (wl > 1e-9) p.facing = [wx / wl, wz / wl];

  // dash (press while dashing is ignored; charm removes the cooldown)
  if (e.dash && p.dash === 0 && (p.dashCd === 0 || p.charm > 0)) {
    p.dash = R.dash_ticks;
    p.dashCd = R.dash_cd_ticks;
    p.dashDir = wl > 1e-9 ? [wx / wl, wz / wl] : [...p.facing];
    emit('dash', {});
  }
  // jump
  if (e.jump && p.grounded) { p.vel[1] = R.jump_speed; p.grounded = false; }

  const speed = p.charm > 0 ? R.charm_speed : T.player_speed;
  let vx, vz;
  if (p.dash > 0) { vx = p.dashDir[0] * T.dash_speed; vz = p.dashDir[1] * T.dash_speed; p.dash--; }
  else if (p.launch) { vx = p.launch[0]; vz = p.launch[1]; }
  else { vx = wx * speed; vz = wz * speed; } // reaches target speed within one tick (<= 0.1 s)
  let fx = vx, fz = vz;
  if (game.wind.active) {
    const a = (game.wind.dir_deg * Math.PI) / 180;
    fx += Math.cos(a) * R.wind_speed;
    fz += Math.sin(a) * R.wind_speed;
  }
  p.vel[0] = vx; p.vel[2] = vz;

  // horizontal move with walls (higher ground than a step is a wall)
  const nx = p.pos[0] + fx * DT, nz = p.pos[2] + fz * DT;
  const gTarget = map.ground(nx, nz);
  if (!(gTarget !== null && gTarget > p.pos[1] + R.step_up)) { p.pos[0] = nx; p.pos[2] = nz; }
  else { p.vel[0] = 0; p.vel[2] = 0; }

  // vertical
  const g = map.ground(p.pos[0], p.pos[2]);
  if (p.grounded) {
    if (g === null || g < p.pos[1] - R.step_up) { p.grounded = false; p.vel[1] = 0; }
    else p.pos[1] = g;
  }
  if (!p.grounded) {
    p.vel[1] -= R.gravity * DT;
    p.pos[1] += p.vel[1] * DT;
    if (g !== null && p.pos[1] <= g && p.vel[1] <= 0) { p.pos[1] = g; p.vel[1] = 0; p.grounded = true; p.launch = null; }
  }
  // jump pads
  if (p.grounded) {
    for (const pad of map.pads) {
      if (dXZ(p.pos, pad.pos) <= pad.radius && Math.abs(p.pos[1] - pad.pos[1]) <= R.step_up) {
        p.grounded = false;
        p.vel[1] = pad.vy;
        p.launch = [...pad.vel];
        break;
      }
    }
  }
  // fall off the island: exactly once, ignores invulnerability
  if (p.pos[1] < R.fall_y) {
    p.flames -= 1;
    const lost = p.carried;
    p.carried = 0;
    p.fallWait = R.fall_wait;
    p.vel = [0, 0, 0]; p.launch = null; p.dash = 0;
    emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    if (p.flames > 0) p.pendingRespawn = true;
  }
}

function updateShade(game, s) {
  const p = game.player, map = game.map;
  const spd = map.shade_speed * DT;
  if (s.evict) return;
  if (s.state === 'spawning') { if (s.left === 0) s.state = 'wander'; else return; }
  if (s.state === 'stunned') {
    if (s.pushLeft > 0) {
      const k = T.pulse_push_m / R.push_ticks;
      if (!moveShade(game, s, s.push[0] * k, s.push[1] * k)) s.pushLeft = 0; else s.pushLeft--;
    }
    if (s.left === 0) s.state = 'wander'; else return;
  }
  if (s.state === 'recoil') {
    const k = R.recoil_m / R.recoil_ticks;
    moveShade(game, s, s.recoilDir[0] * k, s.recoilDir[1] * k);
    if (s.left === 0) s.state = 'wander'; // recoil = exactly 60 moves of 2/60 m; AI resumes next tick
    return;
  }
  const d = dXZ(s.pos, p.pos);
  const canSee = playerActive(game);
  if (s.state === 'wander' && canSee && d <= R.shade_detect) s.state = 'chase';
  else if (s.state === 'chase' && (!canSee || d > R.shade_lose)) s.state = 'wander';
  if (s.state === 'chase') {
    const [dx, dz] = stepToward(s.pos, p.pos, spd);
    moveShade(game, s, dx, dz);
  } else {
    if (!s.target || dXZ(s.pos, s.target) < 0.5) s.target = map.motePoints[Math.floor(game.rng() * map.motePoints.length)];
    const [dx, dz] = stepToward(s.pos, s.target, R.shade_wander_speed * DT);
    if (!moveShade(game, s, dx, dz)) s.target = null;
  }
}

function updateDrifter(game, d) {
  const p = game.player, map = game.map;
  if (d.state === 'flee') {
    let dx = d.pos[0] - p.pos[0], dz = d.pos[2] - p.pos[2], l = Math.sqrt(dx * dx + dz * dz);
    if (l < 1e-9) { dx = 1; dz = 0; l = 1; }
    d.pos[0] += (dx / l) * R.drifter_speed * DT;
    d.pos[2] += (dz / l) * R.drifter_speed * DT;
    return;
  }
  const dist = dXZ(d.pos, p.pos);
  const wants = playerActive(game) && p.carried >= R.drifter_min_carry && dist <= R.drifter_detect;
  d.state = wants ? 'chase' : 'idle';
  if (d.state === 'chase') {
    const [dx, dz] = stepToward(d.pos, p.pos, R.drifter_speed * DT);
    d.pos[0] += dx; d.pos[2] += dz;
  } else {
    if (!d.target || dXZ(d.pos, d.target) < 0.5) d.target = map.shadePoints[Math.floor(game.rng() * map.shadePoints.length)];
    const [dx, dz] = stepToward(d.pos, d.target, R.drifter_idle_speed * DT);
    d.pos[0] += dx; d.pos[2] += dz;
  }
  const g = groundAt(game, d.pos[0], d.pos[2]);
  if (g !== null) d.pos[1] = g + R.drifter_hover;
}

function spawnScheduled(game, emit) {
  const t = game.simTick, map = game.map, p = game.player;
  if (game.randomMotes && t % R.mote_spawn_every === 0 && game.motes.length < R.mote_cap) {
    const taken = new Set(game.motes.filter((m) => m.point !== null).map((m) => m.point));
    const free = map.motePoints.map((_, i) => i).filter((i) => !taken.has(i));
    if (free.length) {
      const idx = free[Math.floor(game.rng() * free.length)];
      game.motes.push({ id: nextId(game, 'M'), pos: [...map.motePoints[idx]], kind: 'random', ttl: null, point: idx });
    }
  }
  if (game.randomShades && t >= R.shade_first_tick && (t - R.shade_first_tick) % map.shade_every === 0) {
    const n = t === R.shade_first_tick ? R.shade_first_count : 1;
    for (let i = 0; i < n && game.shades.length < map.shade_max; i++) {
      const valid = map.shadePoints.filter((pt) => dXZ(pt, p.pos) >= R.shade_min_spawn_dist);
      if (!valid.length) break;
      const pt = valid[Math.floor(game.rng() * valid.length)];
      const id = nextId(game, 'S');
      game.shades.push(newShade(game, id, [pt[0], shadeY(game, pt[0], pt[2], R.shade_hover), pt[2]]));
      emit('shade_spawned', { id });
    }
  }
  if (game.randomDrifters && t % R.drifter_every === 0 && game.drifters.length < R.drifter_max) {
    const pt = map.shadePoints[Math.floor(game.rng() * map.shadePoints.length)];
    const g = groundAt(game, pt[0], pt[2]);
    game.drifters.push({ id: nextId(game, 'D'), pos: [pt[0], (g ?? 0) + R.drifter_hover, pt[2]], state: 'idle', stolen: 0, left: 0, target: null });
  }
  if (game.windEnabled && t % R.wind_every === 0) {
    game.wind = { active: true, dir_deg: Math.floor(game.rng() * 360), left: R.wind_ticks };
  }
}

// Seconds until the next gust starts (for the visual 2 s warning); null if no wind this night.
export function windEta(game) {
  if (!game.windEnabled) return null;
  return (R.wind_every - (game.simTick % R.wind_every)) / TICK_RATE;
}

export function snapshot(game) {
  const p = game.player;
  return {
    type: 'snapshot',
    tick: game.tick,
    sim_tick: game.simTick,
    night: game.night,
    state: game.state,
    time_left_s: round3(timeLeft(game)),
    score: game.score,
    wind: { active: game.wind.active, dir_deg: game.wind.dir_deg },
    player: {
      pos: r3v(p.pos), vel: r3v(p.vel), grounded: p.grounded, invuln: p.invuln > 0,
      flames: p.flames, carried: p.carried,
      dash_cd_s: round3(p.dashCd / TICK_RATE), pulse_cd_s: round3(p.pulseCd / TICK_RATE), charm_s: round3(p.charm / TICK_RATE),
    },
    lanterns: game.lanterns.map((l) => ({ id: l.id, pos: r3v(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: game.shades.map((s) => ({ id: s.id, pos: r3v(s.pos), state: s.state })),
    motes_active: game.motes.length,
    motes: game.motes.map((m) => ({ id: m.id, pos: r3v(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : round3(m.ttl / TICK_RATE) })),
    drifters: game.drifters.map((d) => ({ id: d.id, pos: r3v(d.pos), state: d.state, stolen: d.stolen })),
    charms: game.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: round3(c.respawn / TICK_RATE) })),
  };
}
