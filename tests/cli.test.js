// End-to-end tests of the real CLI process (exit codes, file output, contract file).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TUNING } from '../src/core/tuning.js';

const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
const cli = (args) => spawnSync(process.execPath, ['src/headless.js', ...args], { encoding: 'utf8' });
const file = (name, content) => { const p = join(dir, name); writeFileSync(p, content); return p; };

test('game.contract.json tuning mirrors src/core/tuning.js', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3');
  for (const k of ['bench_cmd', 'soak_cmd']) assert.equal(typeof c[k], 'string');
  assert.deepEqual(c.tuning, JSON.parse(JSON.stringify(TUNING)));
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd', 'bench_cmd', 'soak_cmd']) assert.equal(typeof c[k], 'string');
});

test('valid run exits 0 and writes JSONL ending with an end line', () => {
  const out = join(dir, 'ok.jsonl');
  const r = cli(['--seed', '3', '--night', '1', '--ticks', '120', '--out', out]);
  assert.equal(r.status, 0, r.stderr);
  const lines = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines[0].type, 'snapshot');
  assert.equal(lines.at(-1).type, 'end');
});

test('two CLI runs with same args are byte-identical', () => {
  const a = join(dir, 'a.jsonl'), b = join(dir, 'b.jsonl');
  cli(['--seed', '11', '--night', '1', '--ticks', '6000', '--out', a]);
  cli(['--seed', '11', '--night', '1', '--ticks', '6000', '--out', b]);
  assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
});

const malformed = {
  'not json': '{frames: [',
  'frames missing': '{}',
  'ticks not increasing': '{"frames":[{"tick":5},{"tick":5}]}',
  'move out of range': '{"frames":[{"tick":0,"move":[2,0]}]}',
  'button not boolean': '{"frames":[{"tick":0,"pulse":1}]}',
};
for (const [name, content] of Object.entries(malformed)) {
  test(`malformed inputs (${name}) => exit 2`, () => {
    const r = cli(['--seed', '1', '--night', '1', '--inputs', file('in.json', content), '--ticks', '10', '--out', join(dir, 'x.jsonl')]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /malformed/);
  });
}

test('malformed scenario (unknown lantern id) => exit 2', () => {
  const r = cli(['--seed', '1', '--night', '1', '--scenario', file('sc.json', '{"lanterns":[{"id":"L9"}]}'), '--ticks', '10', '--out', join(dir, 'x.jsonl')]);
  assert.equal(r.status, 2);
});

test('lantern ids depend on the night (L6 valid on night 2, not on night 1)', () => {
  const sc = file('sc6.json', '{"lanterns":[{"id":"L6","lit":true}]}');
  assert.equal(cli(['--seed', '1', '--night', '1', '--scenario', sc, '--ticks', '1', '--out', join(dir, 'x.jsonl')]).status, 2);
  assert.equal(cli(['--seed', '1', '--night', '2', '--scenario', sc, '--ticks', '1', '--out', join(dir, 'x.jsonl')]).status, 0);
});

test('malformed v1.1 fields => exit 2 (pause not boolean, bad shade state, bad drifter state)', () => {
  for (const [name, content, flag] of [
    ['in-pause.json', '{"frames":[{"tick":0,"pause":"yes"}]}', '--inputs'],
    ['sc-shade.json', '{"shades":[{"pos":[1,1,1],"state":"angry"}]}', '--scenario'],
    ['sc-drifter.json', '{"drifters":[{"pos":[1,1,1],"state":"run"}]}', '--scenario'],
  ]) {
    const r = cli(['--seed', '1', '--night', '2', flag, file(name, content), '--ticks', '1', '--out', join(dir, 'x.jsonl')]);
    assert.equal(r.status, 2, name);
  }
});

test('--night accepts 1, 2, 3 only', () => {
  for (const n of ['1', '2', '3']) assert.equal(cli(['--seed', '1', '--night', n, '--ticks', '5', '--out', join(dir, `n${n}.jsonl`)]).status, 0);
  const r = cli(['--seed', '1', '--night', '4', '--ticks', '5', '--out', join(dir, 'n4.jsonl')]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /night/);
});

test('a full night (21600 ticks) runs headless in <= 30 s', () => {
  for (const n of ['1', '2', '3']) {
    const sc = file(`immortal${n}.json`, '{"player":{"flames":99}}');
    const t0 = Date.now();
    const r = cli(['--seed', '5', '--night', n, '--scenario', sc, '--ticks', '21600', '--out', join(dir, `full${n}.jsonl`)]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(Date.now() - t0 <= 30000);
  }
});

test('missing required option => non-zero exit with stderr message', () => {
  const r = cli(['--seed', '1', '--night', '1', '--ticks', '10']);
  assert.notEqual(r.status, 0);
  assert.notEqual(r.status, 2);
  assert.match(r.stderr, /--out/);
});

test('soak_cmd: nights in one process, no crash, memory bound (Ticket-04)', () => {
  const out = join(dir, 'soak.json');
  const r = spawnSync(process.execPath, ['--expose-gc', 'src/soak.js', '--seed', '7', '--nights', '4', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(s), ['nights', 'crashes', 'results', 'mem_start_mb', 'mem_end_mb', 'duration_s']);
  assert.equal(s.nights, 4);
  assert.equal(s.crashes, 0);
  assert.equal(s.results.length, 4);
  assert.ok(s.mem_end_mb <= 1.2 * s.mem_start_mb, JSON.stringify(s));
});

test('bench scene (core): 200 wandering shades, 100 motes, L1-L3 fuel 100, nothing spawns/ends/decays', async () => {
  const { createGame, step, snapshot } = await import('../src/core/game.js');
  const g = createGame({ seed: 42, bench: true });
  const s0 = snapshot(g);
  assert.equal(s0.shades.length, 200);
  assert.ok(s0.shades.every((x) => x.state === 'wander'));
  assert.equal(s0.motes_active, 100);
  assert.deepEqual(s0.lanterns.filter((l) => l.lit).map((l) => [l.id, l.fuel]), [['L1', 100], ['L2', 100], ['L3', 100]]);
  const names = new Set();
  for (let i = 0; i < 1200; i++) for (const e of step(g, { move: [0, 0] })) names.add(e.name);
  const s1 = snapshot(g);
  assert.equal(s1.shades.length, 200);
  assert.equal(s1.motes_active, 100);
  assert.equal(s1.state, 'playing');
  assert.deepEqual(s1.lanterns.filter((l) => l.lit).map((l) => l.fuel), [100, 100, 100]);
  assert.deepEqual([...names], ['night_start']);
  assert.deepEqual(s1.player.pos, [0, 0, 0]);
});
