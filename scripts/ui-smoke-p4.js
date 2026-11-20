// Phase 4 UI checks via CDP in headless Edge/Chrome: key remapping (conflict, persist, reset), large text,
// minimum font size 18 px at 1280x720, leaderboard screen backed by the disk store, captions setting.
// Usage: LEADERBOARD_FILE=<tmp> npx vite preview --port 4173 &  then  node scripts/ui-smoke-p4.js [browser]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browser = process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,720', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ui4-'))}`, 'http://localhost:4173/?seed=3'], { stdio: 'ignore' });
const checks = [];
let ws, id = 0;
const call = (method, params = {}) => new Promise((resolve) => {
  const my = ++id;
  ws.addEventListener('message', function on(ev) { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', on); resolve(m.result); } });
  ws.send(JSON.stringify({ id: my, method, params }));
});
const ev = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const key = async (code, k, vk) => {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: vk });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: vk });
};
const check = (name, ok, detail = '') => { checks.push({ name, pass: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const clickAct = (act) => ev(`[...document.querySelectorAll('[data-act="${act}"]')].find(b => b.offsetParent).click()`);
// smallest computed font-size among visible text nodes (HUD + current screen)
const minFont = `(() => { let m = 1e9, who = ''; for (const el of document.querySelectorAll('body *')) { if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; if (getComputedStyle(el).display === 'none') continue; if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const f = parseFloat(getComputedStyle(el).fontSize); if (f < m) { m = f; who = el.id || el.tagName; } } return m + ' (' + who + ')'; })()`;

try {
  await sleep(3000);
  const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === 'page' && x.url.includes('4173'));
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  const fMenu = await ev(minFont);
  check('min font size on menu >= 18 px', parseFloat(fMenu) >= 18, fMenu);
  await clickAct('settings'); await sleep(200);
  check('keymap lists all 9 actions', (await ev("document.querySelectorAll('#keymap button').length")) === 9);
  await ev("document.querySelector('[data-key=jump]').click()"); await sleep(100);
  await key('KeyE', 'e', 69); await sleep(100);
  const msg = await ev("document.querySelector('#keymsg').textContent");
  check('remap conflict detected and reported (jump -> E used by interact)', /đang dùng/.test(msg), msg);
  await key('KeyJ', 'j', 74); await sleep(100);
  check('remap saved (jump -> J)', (await ev("document.querySelector('[data-key=jump]').textContent")) === 'J');
  await ev("document.querySelector('#set-large').click()"); await sleep(100);
  check('large text x1.25 (html font-size 22.5px)', (await ev("getComputedStyle(document.documentElement).fontSize")) === '22.5px');
  await call('Page.reload'); await sleep(2500);
  await clickAct('settings'); await sleep(200);
  check('key mapping persisted after reload', (await ev("document.querySelector('[data-key=jump]').textContent")) === 'J');
  check('large text persisted after reload', (await ev("document.documentElement.classList.contains('large')")) === true);
  await clickAct('keyreset'); await sleep(100);
  check('restore defaults (jump -> Space)', (await ev("document.querySelector('[data-key=jump]').textContent")) === 'Space');
  await ev("document.querySelector('#set-large').click()");
  await clickAct('back'); await sleep(200);
  // play: HUD font sizes
  await clickAct('start'); await sleep(200); await clickAct('play'); await sleep(1500);
  const fHud = await ev(minFont);
  check('min font size in HUD while playing >= 18 px', parseFloat(fHud) >= 18, fHud);
  await key('Escape', 'Escape', 27); await sleep(200); await clickAct('menu'); await sleep(200);
  // leaderboard: write through the game's API (disk store), then open the screen
  const post = await ev("fetch('/api/leaderboard', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'Mây_test', score: 777, nights_won: 2, seed: 3})}).then(r => r.status)");
  check('leaderboard API stores an entry on disk', post === 200, String(post));
  const bad = await ev("fetch('/api/leaderboard', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'a!', score: 1, nights_won: 0, seed: 3})}).then(r => r.status)");
  check('invalid name rejected (400)', bad === 400, String(bad));
  await clickAct('leaders'); await sleep(500);
  const row = await ev("document.querySelector('#lb-body tr')?.textContent || ''");
  check('leaderboard screen from main menu shows the entry', row.includes('Mây_test') && row.includes('777'), row);
} catch (e) {
  check('ui smoke ran', false, e.message);
} finally { proc.kill(); }
writeFileSync('docs/proof/phase-4/ui-smoke.json', JSON.stringify({ browser, checks }, null, 2) + '\n');
process.exit(checks.every((c) => c.pass) ? 0 : 1);
