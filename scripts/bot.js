// Simple greedy bot that produces a Test Contract inputs file for the DEFAULT Night 1 world.
// Used as evidence that Night 1 is winnable end-to-end; the generated inputs are then replayed
// through the real CLI (scripts/proof.js). Strategy: grab nearest mote until full, carry light to
// the nearest unlit lantern, pulse when a chasing shade gets close.
import { createGame, step } from '../src/core/game.js';
import { TUNING as T } from '../src/core/tuning.js';

const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;

export function botInputs(seed, maxTicks = 18000) {
  const game = createGame({ seed });
  const frames = [];
  let prev = { move: [0, 0], interact: false, pulse: false };
  for (let k = 0; k < maxTicks && game.state === 'playing'; k++) {
    const p = game.player;
    const unlit = game.lanterns.filter((l) => !l.lit);
    const lanternNeed = Math.min(...unlit.map((l) => T.lantern_cost - l.deposited));
    let target = null;
    if (p.carried < Math.min(T.carry_capacity, lanternNeed + 1) && game.motes.length) {
      target = game.motes.reduce((a, b) => (d2(p.pos, a.pos) <= d2(p.pos, b.pos) ? a : b)).pos;
    } else if (unlit.length) {
      target = unlit.reduce((a, b) => (d2(p.pos, a.pos) <= d2(p.pos, b.pos) ? a : b)).pos;
    }
    let move = [0, 0];
    if (target) {
      const dx = target[0] - p.pos[0], dz = target[2] - p.pos[2], len = Math.hypot(dx, dz);
      if (len > 0.05) move = [Math.round((dx / len) * 1000) / 1000, Math.round((dz / len) * 1000) / 1000];
    }
    const nearLantern = unlit.some((l) => d2(p.pos, l.pos) <= (T.interact_radius - 0.2) ** 2);
    const interact = !prev.interact && nearLantern && p.carried > 0;
    const threat = game.shades.some((s) => s.state !== 'stunned' && d2(p.pos, s.pos) <= 3.5 ** 2);
    const pulse = !prev.pulse && threat && p.carried >= T.pulse_cost && p.pulseCd === 0;

    const f = { tick: k };
    if (move[0] !== prev.move[0] || move[1] !== prev.move[1]) f.move = move;
    if (interact !== prev.interact) f.interact = interact;
    if (pulse !== prev.pulse) f.pulse = pulse;
    if (Object.keys(f).length > 1) frames.push(f);
    prev = { move, interact, pulse };
    step(game, { move, cam_yaw_deg: 0, interact, pulse });
  }
  return { inputs: { frames }, state: game.state, ticks: game.tick, score: game.score };
}

if (process.argv[1]?.endsWith('bot.js')) {
  for (let seed = 1; seed <= 10; seed++) {
    const r = botInputs(seed);
    console.log(`seed ${seed}: ${r.state} at tick ${r.ticks}, score ${r.score}`);
  }
}
