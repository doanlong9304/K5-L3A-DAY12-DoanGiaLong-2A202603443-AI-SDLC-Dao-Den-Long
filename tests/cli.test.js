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
  assert.equal(c.contract_version, '1.0');
  assert.deepEqual(c.tuning, JSON.parse(JSON.stringify(TUNING)));
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof c[k], 'string');
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

test('missing required option => non-zero exit with stderr message', () => {
  const r = cli(['--seed', '1', '--night', '1', '--ticks', '10']);
  assert.notEqual(r.status, 0);
  assert.notEqual(r.status, 2);
  assert.match(r.stderr, /--out/);
});
