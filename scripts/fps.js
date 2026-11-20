// Measures average FPS of the built game at 1280x720 in a real (GPU) headless Edge/Chrome via CDP.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/fps.js [browserPath]
// Writes docs/proof/phase-2/fps.json. Each sample = frames counted over ~1 s of real time.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import os from 'node:os';

const browser = process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333, SECONDS = 15;
const results = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(night) {
  const url = `http://localhost:4173/?night=${night}&autoplay&seed=3&fps`;
  const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,720', '--enable-gpu', '--ignore-gpu-blocklist',
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'fps-'))}`, url], { stdio: 'ignore' });
  try {
    await sleep(3000);
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:4173'));
    if (!page) throw new Error(`game page not found: ${targets.map((t) => t.url).join(', ')}`);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    const call = (id, method, params) => new Promise((resolve) => {
      ws.addEventListener('message', function on(ev) { const m = JSON.parse(ev.data); if (m.id === id) { ws.removeEventListener('message', on); resolve(m.result); } });
      ws.send(JSON.stringify({ id, method, params }));
    });
    // force an exact 1280x720 viewport, reload, then let it run in real time
    await call(10, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await call(11, 'Page.reload', {});
    await sleep(SECONDS * 1000);
    const r = await call(1, 'Runtime.evaluate', { expression: 'JSON.stringify({s: window.__fps.samples, w: innerWidth, h: innerHeight, gl: (() => { const c = document.querySelector("canvas").getContext("webgl2"); const d = c.getExtension("WEBGL_debug_renderer_info"); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : "n/a"; })()})', returnByValue: true });
    ws.close();
    if (!r.result || r.result.type !== 'string') throw new Error(`evaluate failed: ${JSON.stringify(r).slice(0, 400)}`);
    const { s, w, h, gl } = JSON.parse(r.result.value);
    const steady = s.slice(2); // drop warm-up seconds
    const avg = steady.reduce((a, b) => a + b, 0) / steady.length;
    results[`night${night}`] = { viewport: `${w}x${h}`, renderer: gl, samples: s.map((x) => Math.round(x)), avg_fps: Math.round(avg * 10) / 10, pass: avg >= 30 };
    console.log(`night ${night}: avg ${avg.toFixed(1)} FPS over ${steady.length} s at ${w}x${h} (${gl})`);
  } finally { proc.kill(); await sleep(1000); }
}

for (const n of [1, 2, 3]) await measure(n);
results.machine = { cpu: os.cpus()[0]?.model, os: `${os.type()} ${os.release()}`, browser };
writeFileSync('docs/proof/phase-2/fps.json', JSON.stringify(results, null, 2) + '\n');
