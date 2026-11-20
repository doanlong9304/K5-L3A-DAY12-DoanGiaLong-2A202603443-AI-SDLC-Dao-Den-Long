import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validName, addEntry, makeEntry, isoWithOffset, MAX_ENTRIES } from '../src/core/leaderboard.js';

test('name rule: 3-12 of [A-Za-z0-9_], Vietnamese letters accepted', () => {
  for (const ok of ['May', 'abc_123', 'A1_', 'Mây', 'NguyễnVăn', 'x'.repeat(12)]) assert.ok(validName(ok), ok);
  for (const bad of ['ab', 'x'.repeat(13), 'a b c', 'abc!', 'a-b-c', '', null]) assert.ok(!validName(bad), String(bad));
});

test('achieved_at is ISO 8601 with a time-zone offset', () => {
  assert.match(isoWithOffset(new Date()), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
});

test('top 10, score desc, ties -> earlier achieved_at first', () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, makeEntry({ name: `p${i}x`, score: i * 10, nights_won: 1, seed: i, achieved_at: `2026-11-20T10:00:${String(i).padStart(2, '0')}+07:00` }));
  assert.equal(list.length, MAX_ENTRIES);
  assert.equal(list[0].score, 110);
  assert.ok(!list.some((e) => e.score < 20));
  list = addEntry(list, makeEntry({ name: 'late', score: 110, nights_won: 3, seed: 1, achieved_at: '2026-11-20T11:00:00+07:00' }));
  list = addEntry(list, makeEntry({ name: 'early', score: 110, nights_won: 3, seed: 1, achieved_at: '2026-11-20T09:00:00+07:00' }));
  assert.deepEqual(list.slice(0, 3).map((e) => e.name), ['early', 'p11x', 'late']);
  assert.deepEqual(Object.keys(list[0]), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
});

test('CLI export: run_cmd --export-leaderboard writes {"entries": [...]} in order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lb-'));
  const store = join(dir, 'lb.json'), out = join(dir, 'out.json');
  writeFileSync(store, JSON.stringify({ entries: [
    { name: 'bbb', score: 50, nights_won: 1, achieved_at: '2026-11-20T10:00:00+07:00', seed: 2 },
    { name: 'aaa', score: 90, nights_won: 2, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 },
  ] }));
  const r = spawnSync(process.execPath, ['scripts/play.js', '--export-leaderboard', out], { encoding: 'utf8', env: { ...process.env, LEADERBOARD_FILE: store } });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).entries.map((e) => e.name), ['aaa', 'bbb']);
});
