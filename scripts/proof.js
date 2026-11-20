// Generates Phase 1 evidence by running the REAL headless CLI. Output is machine-written;
// never edit files under docs/proof/phase-1/runs by hand. Usage: npm run proof
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { SCENARIOS, WANDER_INPUTS, parse } from '../tests/scenarios.js';
import { botInputs } from './bot.js';

const OUT = 'docs/proof/phase-1';
const RUNS = join(OUT, 'runs');
rmSync(RUNS, { recursive: true, force: true });
mkdirSync(RUNS, { recursive: true });

const cli = (args) => spawnSync(process.execPath, ['src/headless.js', ...args], { encoding: 'utf8' });
const rows = [];
let failed = 0;

for (const sc of SCENARIOS) {
  const dir = join(RUNS, sc.name);
  mkdirSync(dir, { recursive: true });
  const args = ['--seed', String(sc.seed ?? 1), '--night', '1', '--ticks', String(sc.ticks), '--out', join(dir, 'out.jsonl')];
  if (sc.scenario) { writeFileSync(join(dir, 'scenario.json'), JSON.stringify(sc.scenario, null, 2) + '\n'); args.push('--scenario', join(dir, 'scenario.json')); }
  if (sc.inputs) { writeFileSync(join(dir, 'inputs.json'), JSON.stringify(sc.inputs, null, 2) + '\n'); args.push('--inputs', join(dir, 'inputs.json')); }
  if (sc.snapshotEvery) args.push('--snapshot-every', String(sc.snapshotEvery));
  const r = cli(args);
  let result = 'PASS', note = '';
  try {
    if (r.status !== 0) throw new Error(`exit ${r.status}: ${r.stderr.trim()}`);
    sc.check(parse(readFileSync(join(dir, 'out.jsonl'), 'utf8').trim().split('\n')));
  } catch (e) {
    result = 'FAIL'; note = e.message.split('\n')[0]; failed++;
  }
  writeFileSync(join(dir, 'command.txt'), `node src/headless.js ${args.join(' ').replaceAll('\\', '/')}\n`);
  rows.push(`| ${sc.req} | [${sc.name}](runs/${sc.name}/) | ${result}${note ? ` (${note})` : ''} |`);
}

// Determinism: default world + wandering inputs, two runs per seed, byte compare.
const det = [];
const wander = join(RUNS, 'wander-inputs.json');
writeFileSync(wander, JSON.stringify(WANDER_INPUTS) + '\n');
for (const seed of [1, 42, 2026]) {
  const a = join(RUNS, `det-${seed}-a.jsonl`), b = join(RUNS, `det-${seed}-b.jsonl`);
  cli(['--seed', String(seed), '--night', '1', '--inputs', wander, '--ticks', '18000', '--out', a]);
  cli(['--seed', String(seed), '--night', '1', '--inputs', wander, '--ticks', '18000', '--out', b]);
  const text = readFileSync(a, 'utf8');
  const same = text === readFileSync(b, 'utf8');
  if (!same) failed++;
  const lines = text.trim().split('\n');
  const nEv = lines.filter((l) => l.includes('"type":"event"')).length;
  det.push(`| ${seed} | ${lines.length} | ${nEv} | \`${lines.at(-1)}\` | ${same ? 'PASS (identical)' : 'FAIL'} |`);
  rmSync(b);
}

// Full playthrough: bot inputs replayed through the CLI (win and loss end-to-end).
const play = [];
for (const seed of [1, 5]) {
  const bot = botInputs(seed);
  const dir = join(RUNS, `playthrough-seed${seed}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'inputs.json'), JSON.stringify(bot.inputs) + '\n');
  const args = ['--seed', String(seed), '--night', '1', '--inputs', join(dir, 'inputs.json'), '--ticks', '18000', '--out', join(dir, 'out.jsonl'), '--snapshot-every', '60'];
  writeFileSync(join(dir, 'command.txt'), `node src/headless.js ${args.join(' ').replaceAll('\\', '/')}\n`);
  cli(args);
  const o = readFileSync(join(dir, 'out.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const endLine = o.at(-1), go = o.find((x) => x.name === 'game_over');
  const lit = o.filter((x) => x.name === 'lantern_lit').length;
  const ok = endLine.state === bot.state && endLine.ticks === bot.ticks && endLine.score === bot.score;
  if (!ok) failed++;
  play.push(`| ${seed} | [playthrough-seed${seed}](runs/playthrough-seed${seed}/) | ${lit}/5 | ${go ? `${go.data.result} (${go.data.reason}) @ tick ${go.tick}` : 'none'} | ${endLine.score} | ${ok ? 'PASS' : 'FAIL'} |`);
}

// Exit codes.
const bad = join(RUNS, 'bad-inputs.json');
writeFileSync(bad, '{"frames":[{"tick":5},{"tick":5}]}\n');
const exits = [
  ['valid run', ['--seed', '1', '--night', '1', '--ticks', '10', '--out', join(RUNS, 'exit-ok.jsonl')], 0],
  ['malformed inputs (ticks not increasing)', ['--seed', '1', '--night', '1', '--inputs', bad, '--ticks', '10', '--out', join(RUNS, 'x.jsonl')], 2],
  ['missing --out', ['--seed', '1', '--night', '1', '--ticks', '10'], 1],
].map(([name, args, want]) => {
  const got = cli(args).status;
  if (got !== want) failed++;
  return `| ${name} | ${want} | ${got} | ${got === want ? 'PASS' : 'FAIL'} |`;
});

// Speed.
const t0 = process.hrtime.bigint();
cli(['--seed', '1', '--night', '1', '--ticks', '18000', '--scenario', join(RUNS, 'safe_radius', 'scenario.json'), '--out', join(RUNS, 'speed.jsonl')]);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

const md = `# Phase 1 — Kết quả kiểm chứng (tự sinh bởi \`npm run proof\`)

> File này và thư mục \`runs/\` được script sinh ra từ CLI headless thật, không sửa tay.
> Chạy lại ở tag \`phase-1\`: \`npm ci && npm run proof\`.

Môi trường: Node ${process.version}, ${os.type()} ${os.release()} (${os.arch()}), CPU: ${os.cpus()[0]?.model ?? 'n/a'}

## Scenario theo yêu cầu

| Yêu cầu | Scenario (input + output) | Kết quả |
|---|---|---|
${rows.join('\n')}

## Tính tất định (thế giới mặc định + [wander-inputs.json](runs/wander-inputs.json), tối đa 18000 tick, chạy 2 lần)

| Seed | Số dòng JSONL | Số event | Dòng end | Kết quả |
|---|---|---|---|---|
${det.join('\n')}

## Chơi trọn một đêm (bot tham lam sinh inputs → phát lại qua CLI)

Bot ([scripts/bot.js](../../../scripts/bot.js)) nhặt đom đóm gần nhất, mang về đèn chưa thắp gần nhất, tỏa sáng khi Bóng Mực đến gần.
"Khớp" = dòng end của CLI trùng với kết quả mô phỏng trong bộ nhớ (trạng thái, số tick, điểm).

| Seed | Input + output | Đèn thắp | game_over | Điểm | Khớp |
|---|---|---|---|---|---|
${play.join('\n')}

## Mã thoát

| Trường hợp | Mong đợi | Thực tế | Kết quả |
|---|---|---|---|
${exits.join('\n')}

## Tốc độ

Một đêm đầy đủ (18000 tick = 300 s game) chạy trong ${ms.toFixed(0)} ms (gồm khởi động Node).

**Tổng: ${failed === 0 ? 'TẤT CẢ ĐẠT' : `${failed} MỤC KHÔNG ĐẠT`}**
`;
writeFileSync(join(OUT, 'RESULTS.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
