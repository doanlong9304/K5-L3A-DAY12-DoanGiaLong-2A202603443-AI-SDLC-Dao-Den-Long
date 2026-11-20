// UI check for the island select feature (menu "Chọn đảo", pause "Đổi đảo") via CDP in headless Edge/Chrome.
// Usage: npx vite preview --port 4173 &  then  node scripts/ui-smoke-islands.js [browser]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browser = process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9336;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,720', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'uii-'))}`, 'http://localhost:4173/?seed=3'], { stdio: 'ignore' });
const checks = [];
let ws, id = 0;
const call = (method, params = {}) => new Promise((resolve) => {
  const my = ++id;
  ws.addEventListener('message', function on(ev) { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', on); resolve(m.result); } });
  ws.send(JSON.stringify({ id: my, method, params }));
});
const ev = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
const check = (name, ok, detail = '') => { checks.push({ name, pass: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const click = (sel) => ev(`[...document.querySelectorAll('${sel}')].find(b => b.offsetParent).click()`);
const visible = (sel) => ev(`getComputedStyle(document.querySelector('${sel}')).display !== 'none'`);
const text = (sel) => ev(`document.querySelector('${sel}').textContent`);

try {
  await sleep(3000);
  const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === 'page' && x.url.includes('4173'));
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  await click('[data-act="islands"]'); await sleep(200);
  check('menu "Chọn đảo" opens island list', await visible('#islands'));
  check('island list shows the 3 islands', (await ev("[...document.querySelectorAll('#island-list button')].map(b => b.textContent.split(' — ')[1].split('5 đèn')[0].split('6 đèn')[0].split('7 đèn')[0]).join('|')")) === 'Đảo Bến|Đảo Cau|Đảo Chuông');
  await click('[data-act="islands-back"]'); await sleep(200);
  check('"Quay lại" returns to the menu', await visible('#menu'));
  await click('[data-act="islands"]'); await sleep(200);
  await click('[data-act="island"][data-night="3"]'); await sleep(300);
  check('picking Night 3 opens its intro', (await text('#intro-title')) === 'Đêm 3 — Đảo Chuông');
  await click('[data-act="play"]'); await sleep(1500);
  const t3 = await text('#timer');
  check('Night 3 is playing (5:00 timer, 7 lanterns)', /^0[45]:\d\d$/.test(t3) && /\/7/.test(await text('#topright')), `${t3} ${await text('#topright')}`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(200);
  check('pause menu has "Đổi đảo"', await ev("!!document.querySelector('#pause [data-act=islands]')"));
  await click('#pause [data-act="islands"]'); await sleep(200);
  check('"Đổi đảo" from pause opens island list', await visible('#islands'));
  await click('[data-act="islands-back"]'); await sleep(200);
  check('"Quay lại" from pause returns to pause menu', await visible('#pause'));
  await click('#pause [data-act="islands"]'); await sleep(200);
  await click('[data-act="island"][data-night="2"]'); await sleep(300);
  check('switching to Night 2 opens its intro', (await text('#intro-title')) === 'Đêm 2 — Đảo Cau');
  await click('[data-act="play"]'); await sleep(1500);
  check('Night 2 is playing (6 lanterns)', /\/6/.test(await text('#topright')), await text('#topright'));
} catch (e) {
  check('ui smoke ran', false, e.message);
} finally { proc.kill(); }
writeFileSync('docs/proof/phase-4/ui-smoke-islands.json', JSON.stringify({ browser, checks }, null, 2) + '\n');
process.exit(checks.every((c) => c.pass) ? 0 : 1);
