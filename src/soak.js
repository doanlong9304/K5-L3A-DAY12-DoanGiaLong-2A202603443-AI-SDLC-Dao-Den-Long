#!/usr/bin/env node
// Ticket-04 soak test (Contract v1.3): node src/soak.js --seed 7 --nights 10 --out soak.json
// Runs N nights back to back IN ONE PROCESS (night 1 -> 2 -> 3 -> 1 ...), night i uses seed (seed + i).
// Random inputs from a seeded rng: every 30 ticks a new move direction; per tick 5% jump, 3% dash,
// 2% pulse, 10% interact. Each night runs until it ends or its standard duration elapses.
import { writeFileSync } from 'node:fs';
import { createGame, step } from './core/game.js';
import { createRng } from './core/rng.js';

const die = (msg, code = 1) => { process.stderr.write(`error: ${msg}\n`); process.exit(code); };
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  if (!argv[i].startsWith('--') || argv[i + 1] === undefined) die(`bad argument ${argv[i]}`);
  args[argv[i].slice(2)] = argv[i + 1];
}
const seed = Number(args.seed ?? 7), nights = Number(args.nights ?? 10);
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) die('--seed and --nights must be integers (nights >= 1)');
if (!args.out) die('--out is required');

const rssMb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
const t0 = process.hrtime.bigint();
const results = [];
let crashes = 0, memStart = null, game = null;

for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1;
  try {
    game = createGame({ seed: seed + i, night });
    if (i === 0) { if (global.gc) global.gc(); memStart = rssMb(); } // RSS after the first night is loaded (after GC, same as the end measurement)
    const rng = createRng((seed + i) ^ 0x9e3779b9);
    const maxTicks = Math.round(game.map.duration_s * 60);
    const input = { move: [0, 0], cam_yaw_deg: 0, jump: false, dash: false, pulse: false, interact: false, pause: false };
    for (let k = 0; k < maxTicks && game.state !== 'won' && game.state !== 'lost'; k++) {
      if (k % 30 === 0) {
        const a = rng() * 2 * Math.PI;
        input.move = [Math.cos(a), Math.sin(a)];
      }
      input.jump = rng() < 0.05;
      input.dash = rng() < 0.03;
      input.pulse = rng() < 0.02;
      input.interact = rng() < 0.10;
      step(game, input);
    }
    results.push(game.state === 'won' ? 'won' : game.state === 'lost' ? 'lost' : 'timeout');
  } catch (e) {
    crashes++;
    results.push('crash');
    process.stderr.write(`night ${i + 1} crashed: ${e.stack}\n`);
  }
}
game = null; // reset after the last night
// full GC, then give V8 a moment to return freed pages to the OS before reading RSS
if (global.gc) { global.gc(); await new Promise((r) => setTimeout(r, 200)); global.gc(); }
const memEnd = rssMb();
const out = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: memEnd,
  duration_s: Math.round(Number(process.hrtime.bigint() - t0) / 1e8) / 10,
};
writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out));
process.exit(0);
