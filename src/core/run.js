// Headless runner shared by the CLI and the tests. Returns JSONL lines (strings).
import { createGame, step, snapshot } from './game.js';

export function runHeadless({ seed, scenario = null, inputs = null, ticks, snapshotEvery = 10 }) {
  const game = createGame({ seed, scenario });
  const frames = inputs ? inputs.frames : [];
  const held = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
  const lines = [JSON.stringify(snapshot(game))];
  let fi = 0;

  for (let k = 0; k < ticks && game.state === 'playing'; k++) {
    while (fi < frames.length && frames[fi].tick <= k) {
      const f = frames[fi++];
      for (const key of Object.keys(held)) if (f[key] !== undefined) held[key] = f[key];
    }
    for (const e of step(game, held)) {
      lines.push(JSON.stringify({ type: 'event', tick: game.tick, name: e.name, data: e.data }));
    }
    if (game.tick % snapshotEvery === 0) lines.push(JSON.stringify(snapshot(game)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  return lines;
}
