#!/usr/bin/env node
// bench_cmd (Contract v1.3): node scripts/bench.js --seed 42 --duration 30 --out bench.json
// 1. builds the web game if dist/ is missing, serves it locally;
// 2. opens a real (non-headless) Chrome/Edge/Chromium WINDOW at 1280x720 with vsync / frame-rate limit off;
// 3. the page runs the standard bench scene (?bench): 3 s warm-up, then measures --duration seconds;
// 4. writes bench.json and exits 0. Browser: env BENCH_BROWSER, else auto-detected (see README).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, platform, release, type, cpus, totalmem } from 'node:os';
import { join } from 'node:path';

const T_START = performance.timeOrigin; // process start (epoch ms)
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
const seed = Number(args.seed ?? 42), duration = Number(args.duration ?? 30), out = args.out ?? 'bench.json';
const die = (m) => { process.stderr.write(`error: ${m}\n`); process.exit(1); };
if (!Number.isInteger(seed) || !(duration > 0)) die('--seed must be an integer and --duration > 0');

function findBrowser() {
  if (process.env.BENCH_BROWSER) return process.env.BENCH_BROWSER;
  const c = {
    win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge'],
  }[platform()] || [];
  return c.find((p) => existsSync(p)) || die('no Chrome/Edge/Chromium found; set BENCH_BROWSER=/path/to/browser');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vite = await import('vite');
if (!existsSync('dist/index.html')) { console.log('building web game (dist/ missing)...'); await vite.build({ logLevel: 'warn' }); }
const server = await vite.preview({ preview: { port: 0, strictPort: false }, logLevel: 'warn' });
const base = server.resolvedUrls.local[0];
const url = `${base}?bench&seed=${seed}&duration=${duration}`;
const PORT = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'ddl-bench-'));
const browserPath = findBrowser();
const browser = spawn(browserPath, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,720', '--window-position=40,40', `--app=${url}`,
  '--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist', // vsync off
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
], { stdio: 'ignore' });

let ws, id = 0;
const call = (method, params = {}) => new Promise((resolve) => {
  const my = ++id;
  ws.addEventListener('message', function on(ev) { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', on); resolve(m.result); } });
  ws.send(JSON.stringify({ id: my, method, params }));
});
const evaluate = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;

let code = 0;
try {
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    await sleep(200);
    try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page' && t.url.includes('bench')); } catch { /* browser starting */ }
  }
  if (!page) throw new Error('browser page did not start');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  // guarantee a 1280x720 viewport inside the (non-fullscreen) window
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const version = (await call('Browser.getVersion')).product;
  let r = null;
  const deadline = Date.now() + (duration + 60) * 1000;
  while (!r && Date.now() < deadline) { await sleep(500); r = await evaluate('window.__bench && window.__bench.done ? JSON.stringify(window.__bench) : null'); }
  if (!r) throw new Error('bench did not finish');
  const b = JSON.parse(r);
  const dts = b.dts, N = dts.length, sum = dts.reduce((a, x) => a + x, 0);
  const sorted = [...dts].sort((a, x) => a - x);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(-k);
  const p95 = sorted[Math.min(N - 1, Math.ceil(0.95 * N) - 1)];
  const round1 = (x) => Math.round(x * 10) / 10;
  const result = {
    contract_version: '1.3',
    avg_fps: round1((1000 * N) / sum),
    p1_low_fps: round1(1000 / (worst.reduce((a, x) => a + x, 0) / k)),
    frame_ms_p95: round1(p95),
    frames: N,
    load_ms: Math.round(b.firstFrameEpoch - T_START),
    peak_mem_mb: null,
    vsync_off: true,
    renderer: `three.js r${b.three} WebGL2 on ${b.gl}; ${version}`,
    os: `${type()} ${release()} (${platform()}), ${cpus()[0]?.model}, ${Math.round(totalmem() / 1073741824)} GB RAM`,
    notes: 'peak_mem_mb is null: web build, the browser does not expose process RSS to the page (multi-process). vsync off via --disable-gpu-vsync --disable-frame-rate-limit. dt measured with requestAnimationFrame timestamps.',
  };
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  process.stderr.write(`bench failed: ${e.message}\n`);
  code = 1;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  await new Promise((r) => server.httpServer.close(r));
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* browser may still hold files */ }
}
process.exit(code);
