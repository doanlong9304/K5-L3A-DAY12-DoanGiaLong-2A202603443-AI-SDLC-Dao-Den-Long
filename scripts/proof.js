// Generates evidence by running the REAL headless CLI. Output is machine-written; never edit
// files under docs/proof/<phase>/runs by hand. Usage: npm run proof [-- phase-2]
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { SCENARIOS, WANDER_INPUTS, parse } from '../tests/scenarios.js';
import { botInputs } from './bot.js';

const PHASE = process.argv[2] || 'phase-4';
const OUT = join('docs/proof', PHASE);
const RUNS = join(OUT, 'runs');
rmSync(RUNS, { recursive: true, force: true });
mkdirSync(RUNS, { recursive: true });

const cli = (args) => spawnSync(process.execPath, ['src/headless.js', ...args], { encoding: 'utf8' });
const rel = (p) => p.replaceAll('\\', '/');
let failed = 0;

// 1. Requirement scenarios through the CLI
const rows = { 1: [], 2: [], 3: [] };
for (const sc of SCENARIOS) {
  const dir = join(RUNS, sc.name);
  mkdirSync(dir, { recursive: true });
  const night = sc.night ?? 1;
  const args = ['--seed', String(sc.seed ?? 1), '--night', String(night), '--ticks', String(sc.ticks), '--out', join(dir, 'out.jsonl')];
  if (sc.scenario) { writeFileSync(join(dir, 'scenario.json'), JSON.stringify(sc.scenario, null, 2) + '\n'); args.push('--scenario', join(dir, 'scenario.json')); }
  if (sc.inputs) { writeFileSync(join(dir, 'inputs.json'), JSON.stringify(sc.inputs, null, 2) + '\n'); args.push('--inputs', join(dir, 'inputs.json')); }
  if (sc.snapshotEvery) args.push('--snapshot-every', String(sc.snapshotEvery));
  const r = cli(args);
  let result = 'PASS', note = '';
  try {
    if (r.status !== 0) throw new Error(`exit ${r.status}: ${r.stderr.trim()}`);
    sc.check(parse(readFileSync(join(dir, 'out.jsonl'), 'utf8').trim().split('\n')));
  } catch (e) { result = 'FAIL'; note = e.message.split('\n')[0]; failed++; }
  writeFileSync(join(dir, 'command.txt'), `node src/headless.js ${rel(args.join(' '))}\n`);
  rows[sc.phase].push(`| ${sc.req} | ${night} | [${sc.name}](runs/${sc.name}/) | ${result}${note ? ` (${note})` : ''} |`);
}

// 2. Determinism per night (wandering inputs, 2 runs, byte compare)
const det = [];
const wander = join(RUNS, 'wander-inputs.json');
writeFileSync(wander, JSON.stringify(WANDER_INPUTS) + '\n');
for (const night of [1, 2, 3]) {
  for (const seed of [1, 42]) {
    const a = join(RUNS, `det-n${night}-s${seed}-a.jsonl`), b = join(RUNS, `det-n${night}-s${seed}-b.jsonl`);
    const args = ['--seed', String(seed), '--night', String(night), '--inputs', wander, '--ticks', '21600', '--snapshot-every', '60'];
    cli([...args, '--out', a]); cli([...args, '--out', b]);
    const text = readFileSync(a, 'utf8');
    const same = text === readFileSync(b, 'utf8');
    if (!same) failed++;
    const lines = text.trim().split('\n');
    det.push(`| ${night} | ${seed} | ${lines.length} | ${lines.filter((l) => l.includes('"type":"event"')).length} | \`${lines.at(-1)}\` | ${same ? 'PASS (identical)' : 'FAIL'} |`);
    rmSync(b);
  }
}

// 3. Bot playthroughs replayed through the CLI
const play = [];
for (const [night, seed] of [[1, 3], [1, 1], [2, 4], [3, 1]]) {
  const bot = botInputs(seed, night);
  const dir = join(RUNS, `playthrough-n${night}-s${seed}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'inputs.json'), JSON.stringify(bot.inputs) + '\n');
  const args = ['--seed', String(seed), '--night', String(night), '--inputs', join(dir, 'inputs.json'), '--ticks', '21600', '--out', join(dir, 'out.jsonl'), '--snapshot-every', '300'];
  writeFileSync(join(dir, 'command.txt'), `node src/headless.js ${rel(args.join(' '))}\n`);
  cli(args);
  const o = readFileSync(join(dir, 'out.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const endLine = o.at(-1), go = o.find((x) => x.name === 'game_over');
  const lit = o.filter((x) => x.name === 'lantern_lit').length;
  const ok = endLine.state === bot.state && endLine.ticks === bot.ticks && endLine.score === bot.score;
  if (!ok) failed++;
  play.push(`| ${night} | ${seed} | [playthrough-n${night}-s${seed}](runs/playthrough-n${night}-s${seed}/) | ${lit}/${bot.total} | ${go ? `${go.data.result} (${go.data.reason}) @ tick ${go.tick}` : 'none'} | ${endLine.score} | ${ok ? 'PASS' : 'FAIL'} |`);
}

// 4. Exit codes
const bad = join(RUNS, 'bad-inputs.json');
writeFileSync(bad, '{"frames":[{"tick":5},{"tick":5}]}\n');
const exits = [
  ['valid run (night 3)', ['--seed', '1', '--night', '3', '--ticks', '10', '--out', join(RUNS, 'exit-ok.jsonl')], 0],
  ['malformed inputs (ticks not increasing)', ['--seed', '1', '--night', '1', '--inputs', bad, '--ticks', '10', '--out', join(RUNS, 'x.jsonl')], 2],
  ['--night 4', ['--seed', '1', '--night', '4', '--ticks', '10', '--out', join(RUNS, 'x.jsonl')], 1],
  ['missing --out', ['--seed', '1', '--night', '1', '--ticks', '10'], 1],
].map(([name, args, want]) => {
  const got = cli(args).status;
  if (got !== want) failed++;
  return `| ${name} | ${want} | ${got} | ${got === want ? 'PASS' : 'FAIL'} |`;
});

// 5. Speed: a full night that does not end early (99 flames), per night
const immortal = join(RUNS, 'immortal.json');
writeFileSync(immortal, '{"player":{"flames":99}}\n');
const speed = [1, 2, 3].map((night) => {
  const t0 = process.hrtime.bigint();
  cli(['--seed', '1', '--night', String(night), '--scenario', immortal, '--ticks', '21600', '--out', join(RUNS, `speed-n${night}.jsonl`)]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const endLine = readFileSync(join(RUNS, `speed-n${night}.jsonl`), 'utf8').trim().split('\n').at(-1);
  if (ms > 30000) failed++;
  rmSync(join(RUNS, `speed-n${night}.jsonl`));
  return `| ${night} | \`${endLine}\` | ${ms.toFixed(0)} ms | ${ms <= 30000 ? 'PASS (<= 30 s)' : 'FAIL'} |`;
});

const md = `# ${PHASE} — Kết quả kiểm chứng (tự sinh bởi \`npm run proof\`)

> File này và thư mục \`runs/\` được script sinh ra từ CLI headless thật (Contract v1.3), không sửa tay.
> Chạy lại ở tag tương ứng: \`npm ci && npm run proof\`.

Môi trường: Node ${process.version}, ${os.type()} ${os.release()} (${os.arch()}), CPU: ${os.cpus()[0]?.model ?? 'n/a'}

## Change request Phase 3 (Ticket-03)

| Yêu cầu | Đêm | Scenario | Kết quả |
|---|---|---|---|
${rows[3].join('\n')}

## Tính năng Phase 2 (Ticket-02), chạy lại

| Yêu cầu | Đêm | Scenario (input + output) | Kết quả |
|---|---|---|---|
${rows[2].join('\n')}

## Hồi quy Phase 1 (chạy lại với số chuẩn Ticket-02)

| Yêu cầu | Đêm | Scenario | Kết quả |
|---|---|---|---|
${rows[1].join('\n')}

## Tính tất định (thế giới mặc định + [wander-inputs.json](runs/wander-inputs.json), tối đa 21600 tick, 2 lần)

| Đêm | Seed | Số dòng | Số event | Dòng end | Kết quả |
|---|---|---|---|---|---|
${det.join('\n')}

## Chơi trọn một đêm (bot tham lam → phát lại qua CLI)

Bot ([scripts/bot.js](../../../scripts/bot.js)) nhặt đom đóm, nạp đèn gần nhất, tỏa sáng/lướt né khi bị đuổi; điểm đi qua cầu (Đêm 2), dốc và bục nhảy (Đêm 3).
"Khớp" = dòng end của CLI trùng mô phỏng trong bộ nhớ. Bot đơn giản nên Đêm 2–3 chưa thắng được (xem TRACE.md).

| Đêm | Seed | Input + output | Đèn thắp | game_over | Điểm | Khớp |
|---|---|---|---|---|---|---|
${play.join('\n')}

## Mã thoát

| Trường hợp | Mong đợi | Thực tế | Kết quả |
|---|---|---|---|
${exits.join('\n')}

## Tốc độ (một Đêm đầy đủ 21600 tick, không kết thúc sớm)

| Đêm | Dòng end | Thời gian (gồm khởi động Node) | Kết quả |
|---|---|---|---|
${speed.join('\n')}

**Tổng: ${failed === 0 ? 'TẤT CẢ ĐẠT' : `${failed} MỤC KHÔNG ĐẠT`}**
`;
writeFileSync(join(OUT, 'RESULTS.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
