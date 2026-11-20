// UI smoke test of the built game in headless Edge/Chrome via CDP (real clicks/keys, real DOM).
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/ui-smoke.js [browserPath]
// Writes docs/proof/phase-2/ui-smoke.json; exits 1 if a check fails.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browser = process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,720',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ui-'))}`, 'http://localhost:4173/?seed=3'], { stdio: 'ignore' });
const checks = [];
let ws, id = 0;
const call = (method, params = {}) => new Promise((resolve) => {
  const my = ++id;
  ws.addEventListener('message', function on(ev) { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', on); resolve(m.result); } });
  ws.send(JSON.stringify({ id: my, method, params }));
});
const ev = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
const visible = (sel) => ev(`getComputedStyle(document.querySelector('${sel}')).display !== 'none'`);
const click = (act) => ev(`document.querySelector('#' + [...document.querySelectorAll('.screen')].find(s => getComputedStyle(s).display !== 'none').id + ' [data-act="${act}"]').click()`);
const key = async (code, k) => {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: k.length === 1 ? k.toUpperCase().charCodeAt(0) : 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: k.length === 1 ? k.toUpperCase().charCodeAt(0) : 27 });
};
const check = (name, ok, detail = '') => { checks.push({ name, pass: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

try {
  await sleep(3000);
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  ws = new WebSocket(targets.find((t) => t.type === 'page' && t.url.includes('4173')).webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  check('menu shown at start', await visible('#menu'));
  await click('start'); await sleep(300);
  check('night intro shows island name + Ong Dang line', (await ev("document.querySelector('#intro-title').textContent")) === 'Đêm 1 — Đảo Bến' && (await ev("document.querySelector('#intro-quote').textContent")).startsWith('Ông Đăng'));
  await click('play'); await sleep(1500);
  const t1 = await ev("document.querySelector('#timer').textContent");
  check('playing: HUD timer mm:ss running', /^0[45]:\d\d$/.test(t1), t1);
  check('HUD: 10-cell mote bar', (await ev("document.querySelectorAll('#motebar i').length")) === 10);
  check('HUD: lanterns k/n + score top-right', /Đèn 0\/5/.test(await ev("document.querySelector('#topright').textContent")));
  await key('Escape', 'Escape'); await sleep(300);
  check('Esc opens pause menu', await visible('#pause'));
  const p1 = await ev("document.querySelector('#timer').textContent"); await sleep(2200);
  const p2 = await ev("document.querySelector('#timer').textContent");
  check('pause stops logic (timer frozen 2 s)', p1 === p2, `${p1} -> ${p2}`);
  check('pause menu has resume/restart/settings/menu', (await ev("[...document.querySelectorAll('#pause button')].map(b => b.dataset.act).join()")) === 'resume,restart,settings,menu');
  await click('settings'); await sleep(200);
  await ev("(() => { const v = document.querySelector('#set-vol'); v.value = '0.25'; v.dispatchEvent(new Event('input')); const s = document.querySelector('#set-sens'); s.value = '0.7'; s.dispatchEvent(new Event('input')); })()");
  await click('back'); await sleep(200);
  check('settings back returns to pause', await visible('#pause'));
  await key('KeyP', 'p'); await sleep(1500);
  check('P resumes play', !(await visible('#pause')) && (await ev("document.querySelector('#timer').textContent")) !== p2);
  await call('Page.reload'); await sleep(2500);
  const saved = await ev("localStorage.getItem('dao-den-long-settings')");
  check('settings persisted across reload', saved && JSON.parse(saved).volume === 0.25 && JSON.parse(saved).sensitivity === 0.7, saved);
  await click('settings'); await sleep(200);
  check('settings UI restored from storage', (await ev("document.querySelector('#set-vol').value")) === '0.25');
} catch (e) {
  check('ui smoke ran', false, e.message);
} finally {
  proc.kill();
}
writeFileSync('docs/proof/phase-2/ui-smoke.json', JSON.stringify({ browser, checks }, null, 2) + '\n');
process.exit(checks.every((c) => c.pass) ? 0 : 1);
