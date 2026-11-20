// Greedy bot that produces a Test Contract inputs file for a DEFAULT night (evidence that each
// night is playable end-to-end). Inputs are replayed through the real CLI by scripts/proof.js.
// Strategy: collect the nearest reachable mote until it has enough for the nearest unlit lantern,
// deposit, pulse when a shade or drifter gets close. Simple waypoints: bridge (Night 2), ramps and
// the jump pad (Night 3).
import { createGame, step } from '../src/core/game.js';
import { TUNING as T } from '../src/core/tuning.js';

const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
const r = (p) => Math.hypot(p[0], p[2]);

function waypoint(game, from, to) {
  if (game.night === 2) {
    const side = (p) => (p[0] < 35 ? 'A' : 'B');
    if (side(from) !== side(to)) {
      const [near, far] = side(from) === 'A' ? [[25, 0, 0], [45, 0, 0]] : [[45, 0, 0], [25, 0, 0]];
      const onBridge = from[0] >= 24 && from[0] <= 46 && Math.abs(from[2]) < 1.5;
      return onBridge ? far : (d2(from, near) > 0.3 ? near : far);
    }
    return to;
  }
  if (game.night === 3) {
    const y = from[1], ty = to[1];
    if (ty >= 5.9 && y < 5.9) { // tier 2: go to tier 1, then onto the pad
      if (y < 2.9) return rampPath(from);
      return [0, 3, 13];
    }
    if (ty >= 2.9 && ty < 5.9 && y < 2.9) return rampPath(from);
    if (ty < 2.9 && y >= 2.9 && y < 5.9) { // from tier 1 down: walk off the outer edge (r > 24, away from ramps)
      return [Math.sign(from[0] || 1) * 0, 0, 27];
    }
    return to;
  }
  return to;
}
function rampPath(from) {
  const a = from[0] >= 0 ? Math.PI / 6 : (5 * Math.PI) / 6;
  const foot = [31 * Math.cos(a), 0, 31 * Math.sin(a)], top = [22 * Math.cos(a), 3, 22 * Math.sin(a)];
  const along = from[0] * Math.cos(a) + from[2] * Math.sin(a);
  const side = Math.abs(-from[0] * Math.sin(a) + from[2] * Math.cos(a));
  if (side < 1 && along <= 31.5) return top;
  return foot;
}

export function botInputs(seed, night = 1, maxTicks = 21600) {
  const game = createGame({ seed, night });
  const frames = [];
  let prev = { move: [0, 0], interact: false, pulse: false };
  for (let k = 0; k < maxTicks && (game.state === 'playing' || game.state === 'paused'); k++) {
    const p = game.player;
    const unlit = game.lanterns.filter((l) => !l.lit);
    const need = Math.min(...unlit.map((l) => T.lantern_cost - l.deposited));
    let target = null;
    const lantern = unlit.length ? unlit.reduce((a, b) => (d2(p.pos, a.pos) <= d2(p.pos, b.pos) ? a : b)) : null;
    if (p.carried < Math.min(T.carry_capacity, need + T.pulse_cost) && game.motes.length) {
      target = game.motes.reduce((a, b) => (d2(p.pos, a.pos) + 400 * Math.abs(p.pos[1] - a.pos[1]) <= d2(p.pos, b.pos) + 400 * Math.abs(p.pos[1] - b.pos[1]) ? a : b)).pos;
    } else if (lantern) target = lantern.pos;
    let move = [0, 0];
    if (target && p.fallWait === 0) {
      const wp = waypoint(game, p.pos, target);
      const dx = wp[0] - p.pos[0], dz = wp[2] - p.pos[2], len = Math.hypot(dx, dz);
      if (len > 0.05) move = [Math.round((dx / len) * 1000) / 1000, Math.round((dz / len) * 1000) / 1000];
    }
    const nearLantern = unlit.some((l) => d2(p.pos, l.pos) <= (T.interact_radius - 0.2) ** 2);
    const interact = !prev.interact && nearLantern && p.carried > 0;
    const chasers = game.shades.filter((s) => s.state === 'chase' && d2(p.pos, s.pos) <= 4.5 ** 2 && Math.abs(s.pos[1] - 1 - p.pos[1]) < 2);
    const threat = chasers.length > 0 || game.drifters.some((d) => d.state === 'chase' && d2(p.pos, d.pos) <= 4 ** 2);
    const pulse = !prev.pulse && threat && p.carried >= T.pulse_cost && p.pulseCd === 0;
    let dash = false;
    if (chasers.length && !pulse && p.invuln === 0) {
      // run away from the closest chaser (perpendicular-ish to keep making progress) and dash
      const c = chasers.reduce((a, b) => (d2(p.pos, a.pos) <= d2(p.pos, b.pos) ? a : b));
      const ax = p.pos[0] - c.pos[0], az = p.pos[2] - c.pos[2], l = Math.hypot(ax, az) || 1;
      const nx = ax / l, nz = az / l;
      const ok = (x, z) => game.map.ground(p.pos[0] + x * 3, p.pos[2] + z * 3) !== null;
      const cand = [[nx, nz], [-nz, nx], [nz, -nx]].find(([x, z]) => ok(x, z));
      if (cand) move = [Math.round(cand[0] * 1000) / 1000, Math.round(cand[1] * 1000) / 1000];
      dash = !prev.dash && p.dashCd === 0 && d2(p.pos, c.pos) <= 2.5 ** 2;
    }

    const f = { tick: k };
    if (move[0] !== prev.move[0] || move[1] !== prev.move[1]) f.move = move;
    if (interact !== prev.interact) f.interact = interact;
    if (pulse !== prev.pulse) f.pulse = pulse;
    if (dash !== (prev.dash ?? false)) f.dash = dash;
    if (Object.keys(f).length > 1) frames.push(f);
    prev = { move, interact, pulse, dash };
    step(game, { move, cam_yaw_deg: 0, interact, pulse, dash });
  }
  const lit = game.lanterns.filter((l) => l.lit).length;
  return { inputs: { frames }, state: game.state, ticks: game.tick, score: game.score, lit, total: game.lanterns.length };
}

if (process.argv[1]?.endsWith('bot.js')) {
  for (const night of [1, 2, 3]) {
    for (let seed = 1; seed <= 6; seed++) {
      const b = botInputs(seed, night);
      console.log(`night ${night} seed ${seed}: ${b.state} at tick ${b.ticks}, lit ${b.lit}/${b.total}, score ${b.score}`);
    }
  }
}
