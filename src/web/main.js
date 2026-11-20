// Browser front-end: screens, rendering, HUD, input, audio, leaderboard, accessibility, bench mode.
// All game rules come from src/core step() (same code as headless).
import * as THREE from 'three';
import { createGame, step, timeLeft, windEta, TICK_RATE } from '../core/game.js';
import { MAPS } from '../core/maps.js';
import { TUNING as T, RULES as R } from '../core/tuning.js';
import { addEntry, makeEntry, sortEntries, validName } from '../core/leaderboard.js';
import { PAL, SHADE_MATS, buildWorld, buildDecor, makeMay, makeLantern, makeMote, makeShade, makeDrifter, makeCharm } from './world.js';
import { sfx, setVolume, unlock, startMusic, stopMusic } from './audio.js';
import { ACTIONS, DEFAULT_KEYS, keyLabel, conflictOf, isDown } from './a11y.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const BENCH = q.has('bench');

// ---------- settings (persisted) ----------
const SETTINGS_KEY = 'dao-den-long-settings';
const settings = { volume: 0.6, sensitivity: 0.3, colorblind: false, reduceMotion: false, largeText: false, captions: true, keys: { ...DEFAULT_KEYS } };
try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); Object.assign(settings, s, { keys: { ...DEFAULT_KEYS, ...(s.keys || {}) } }); } catch { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
const applyA11y = () => {
  document.documentElement.classList.toggle('large', !!settings.largeText);
  document.documentElement.classList.toggle('reduce', !!settings.reduceMotion);
};
setVolume(BENCH ? 0 : settings.volume);
applyA11y();

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(BENCH ? 1 : Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.sky);
scene.fog = new THREE.Fog(PAL.fog, 30, 110);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
const ambient = new THREE.AmbientLight(0x9aa0ff, 0.15);
const moon = new THREE.DirectionalLight(0x9aa0ff, 0.2);
moon.position.set(-30, 60, 20);
scene.add(ambient, moon);

// ---------- state ----------
const STORY = {
  1: 'Ông Đăng: "Đảo Bến là nơi cháu lớn lên. Hãy giữ các ngọn đèn sáng tới bình minh."',
  2: 'Ông Đăng: "Đảo Cau có hai nửa, nối bằng cầu tre. Cẩn thận Gió Lạc, chúng thích cướp đom đóm lắm."',
  3: 'Ông Đăng: "Đảo Chuông cao và lộng gió. Đèn nào cạn dầu thì châm kịp, kẻo Bóng Mực kéo tới."',
};
let game = null, night = 1, totalScore = 0, nightsWon = 0, runSeed = 0, mode = 'menu', prevMode = 'menu';
let world = null, may = null, lastSeed = 0;
const meshes = { lanterns: new Map(), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
let lastBeep = -1;

function clearNight() {
  if (world) scene.remove(world);
  for (const m of Object.values(meshes)) { for (const o of m.values()) scene.remove(o); m.clear(); }
  if (may) scene.remove(may);
}

function loadNight(n) {
  clearNight();
  night = n;
  lastSeed = q.has('seed') ? Number(q.get('seed')) : Date.now() >>> 0; // browser: fresh seed; headless uses --seed
  if (BENCH) game = createGame({ seed: lastSeed, bench: true });
  else {
    const litN = Number(q.get('lit')) || 0;
    const scenario = litN > 0 ? { lanterns: MAPS[n].lanterns.slice(0, litN).map((l) => ({ id: l.id, lit: true })) } : null;
    game = createGame({ seed: lastSeed, night: n, scenario });
  }
  world = buildWorld(MAPS[n]);
  if (!BENCH) world.add(buildDecor(MAPS[n])); // creative decor is OFF in the bench scene (Ticket-04)
  scene.add(world);
  may = makeMay();
  scene.add(may);
  for (const l of game.lanterns) {
    const m = makeLantern();
    m.position.set(...l.pos);
    meshes.lanterns.set(l.id, m);
    scene.add(m);
  }
  camYaw = 0;
  lowWarned.clear();
  lastBeep = -1;
}

// ---------- screens ----------
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.style.display = 'none';
  if (id) $(id).style.display = 'flex';
}
function goIntro(n) {
  loadNight(n);
  if (n === 1 && mode !== 'result') runSeed = lastSeed;
  $('intro-title').textContent = `Đêm ${n} — ${MAPS[n].name}`;
  $('intro-quote').textContent = STORY[n];
  mode = 'intro';
  show('intro');
}
function goPlay() { mode = 'playing'; show(null); startMusic(); }
function goPause() { mode = 'paused'; show('pause'); }
function goMenu() { mode = 'menu'; stopMusic(); totalScore = 0; nightsWon = 0; show('menu'); }
function attachNameForm(screenId) {
  const f = $('nameform');
  $(screenId).insertBefore(f, $(screenId).querySelector('button'));
  f.style.display = 'block';
  $('namemsg').textContent = '';
  f.dataset.saved = '';
}
function goResult({ result, reason }) {
  mode = 'result';
  const need = Math.ceil(T.win_ratio * game.lanterns.length);
  const why = { dawn_survived: `Mây giữ đảo sáng tới bình minh (cần ${need} đèn).`, dawn: `Trời sáng mà đảo chưa đủ ${need} đèn sáng.`, no_flames: 'Mây đã hết Ngọn Lửa.' }[reason];
  if (result === 'won') {
    totalScore += game.score;
    nightsWon += 1;
    sfx.win();
    if (night === 3) { $('dawn-score').textContent = totalScore; mode = 'dawn'; show('dawn'); attachNameForm('dawn'); return; }
  } else sfx.lose();
  $('result-title').textContent = result === 'won' ? `Đêm ${night} đã sáng!` : `Đêm ${night} chưa qua...`;
  $('result-text').innerHTML = `${why}<br>Điểm Đêm: <b>${result === 'won' ? game.score : 0}</b> · Tổng điểm: <b>${totalScore}</b>`;
  $('btn-next').style.display = result === 'won' ? '' : 'none';
  $('btn-retry').style.display = result === 'won' ? 'none' : '';
  show('result');
  if (result !== 'won') attachNameForm('result'); else $('nameform').style.display = 'none';
}

// ---------- leaderboard (disk via local server; localStorage fallback for the static build) ----------
const LB_KEY = 'dao-den-long-leaderboard';
async function lbLoad() {
  try { const r = await fetch('/api/leaderboard'); if (r.ok) return (await r.json()).entries; } catch { /* static build */ }
  try { return sortEntries(JSON.parse(localStorage.getItem(LB_KEY) || '[]')); } catch { return []; }
}
async function lbSave(e) {
  try {
    const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
    if (r.ok) return (await r.json()).entries;
    if (r.status === 400) throw new Error((await r.json()).error);
  } catch (err) { if (err.message && !/fetch|network/i.test(err.message)) throw err; }
  const list = addEntry(await lbLoad(), makeEntry(e));
  localStorage.setItem(LB_KEY, JSON.stringify(list));
  return list;
}
async function showLeaders() {
  const list = await lbLoad();
  $('lb-body').innerHTML = list.length
    ? list.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name.replace(/[<>&]/g, '')}</td><td>${e.score}</td><td>${e.nights_won}</td><td>${e.achieved_at.replace('T', ' ').slice(0, 16)}</td></tr>`).join('')
    : '<tr><td colspan="5">Chưa có ai. Hãy là người đầu tiên!</td></tr>';
  mode = 'leaders';
  show('leaders');
}
$('nameform').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = $('nameform'), name = $('name').value.trim();
  if (f.dataset.saved) return;
  if (!validName(name)) { $('namemsg').textContent = 'Tên cần 3–12 ký tự: chữ (có dấu cũng được), số hoặc _.'; return; }
  try {
    const list = await lbSave({ name, score: totalScore, nights_won: nightsWon, seed: runSeed });
    const rank = list.findIndex((e) => e.name === name.normalize('NFC') && e.score === totalScore) + 1;
    $('namemsg').textContent = rank ? `Đã lưu! Hạng ${rank}.` : 'Đã lưu, nhưng chưa lọt top 10.';
    f.dataset.saved = '1';
  } catch (err) { $('namemsg').textContent = `Không lưu được: ${err.message}`; }
});

// ---------- settings screen + key remapping ----------
let waitingFor = null;
function renderKeymap() {
  $('keymap').innerHTML = ACTIONS.map(([a, label]) => `<span>${label}</span><button type="button" data-key="${a}" class="${waitingFor === a ? 'wait' : ''}">${waitingFor === a ? 'Nhấn phím...' : keyLabel(settings.keys[a])}</button>`).join('');
  $('help').textContent = `${keyLabel(settings.keys.up)}${keyLabel(settings.keys.left)}${keyLabel(settings.keys.down)}${keyLabel(settings.keys.right)} / mũi tên: đi · Chuột, Q/Z: xoay camera · ${keyLabel(settings.keys.jump)}: nhảy · ${keyLabel(settings.keys.dash)}: lướt · ${keyLabel(settings.keys.interact)}: nạp đèn / châm dầu · ${keyLabel(settings.keys.pulse)}: tỏa sáng · ${keyLabel(settings.keys.pause)}/P: tạm dừng`;
}
function openSettings() {
  prevMode = mode;
  $('set-vol').value = settings.volume; $('set-sens').value = settings.sensitivity;
  $('set-cb').checked = !!settings.colorblind; $('set-reduce').checked = !!settings.reduceMotion;
  $('set-large').checked = !!settings.largeText; $('set-captions').checked = !!settings.captions;
  waitingFor = null; $('keymsg').textContent = '';
  renderKeymap();
  show('settings');
}
document.addEventListener('click', (e) => {
  const key = e.target?.dataset?.key;
  if (key) { waitingFor = key; $('keymsg').textContent = ''; renderKeymap(); return; }
  const act = e.target?.dataset?.act;
  if (!act) return;
  unlock();
  if (act === 'start') { totalScore = 0; nightsWon = 0; mode = 'menu'; goIntro(1); }
  else if (act === 'play' || act === 'resume') goPlay();
  else if (act === 'restart' || act === 'retry') goIntro(night);
  else if (act === 'next') goIntro(night + 1);
  else if (act === 'menu') goMenu();
  else if (act === 'leaders') showLeaders();
  else if (act === 'settings') openSettings();
  else if (act === 'keyreset') { settings.keys = { ...DEFAULT_KEYS }; saveSettings(); waitingFor = null; $('keymsg').textContent = 'Đã khôi phục phím mặc định.'; renderKeymap(); }
  else if (act === 'back') { waitingFor = null; show(prevMode === 'paused' ? 'pause' : 'menu'); }
});
$('set-vol').addEventListener('input', (e) => { settings.volume = Number(e.target.value); setVolume(settings.volume); saveSettings(); });
$('set-sens').addEventListener('input', (e) => { settings.sensitivity = Number(e.target.value); saveSettings(); });
$('set-cb').addEventListener('change', (e) => { settings.colorblind = e.target.checked; saveSettings(); });
$('set-reduce').addEventListener('change', (e) => { settings.reduceMotion = e.target.checked; saveSettings(); applyA11y(); });
$('set-large').addEventListener('change', (e) => { settings.largeText = e.target.checked; saveSettings(); applyA11y(); });
$('set-captions').addEventListener('change', (e) => { settings.captions = e.target.checked; saveSettings(); });

// ---------- input ----------
const keys = new Set();
let camYaw = 0, dragging = false;
window.addEventListener('keydown', (e) => {
  if (waitingFor) {
    e.preventDefault();
    const other = conflictOf(settings.keys, waitingFor, e.code);
    if (other) {
      $('keymsg').textContent = `⚠ Phím ${keyLabel(e.code)} đang dùng cho "${ACTIONS.find(([a]) => a === other)[1]}". Chọn phím khác.`;
    } else {
      settings.keys[waitingFor] = e.code; saveSettings();
      $('keymsg').textContent = 'Đã lưu phím mới.';
      waitingFor = null;
    }
    renderKeymap();
    return;
  }
  keys.add(e.code);
  if (e.code === settings.keys.pause || e.code === 'KeyP' || e.code === 'Escape') {
    if (mode === 'playing') goPause(); else if (mode === 'paused') goPlay();
  }
  if (mode === 'playing' && ['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', () => { dragging = true; unlock(); });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => { if (dragging && mode === 'playing') camYaw -= e.movementX * settings.sensitivity; });

function readInput() {
  // camera looks along move +z; screen-right is move x = -1 (contract rotation formula)
  const k = settings.keys, d = (a) => isDown(keys, k, a);
  let x = 0, z = 0;
  if (d('up')) z += 1;
  if (d('down')) z -= 1;
  if (d('left')) x += 1;
  if (d('right')) x -= 1;
  if (keys.has('KeyQ')) camYaw += 1.5;
  if (keys.has('KeyZ')) camYaw -= 1.5;
  return { move: [x, z], cam_yaw_deg: camYaw, jump: d('jump'), interact: d('interact'), pulse: d('pulse'), dash: d('dash') };
}

// ---------- captions (visual indicators for audio cues) ----------
const capEl = $('captions');
const lowWarned = new Set();
let threat = null; // { id, until }
function caption(text) {
  if (!settings.captions || BENCH) return;
  const d = document.createElement('div');
  d.textContent = text;
  capEl.appendChild(d);
  setTimeout(() => d.remove(), 3500);
  while (capEl.children.length > 4) capEl.firstChild.remove();
}

// ---------- events -> feedback ----------
const toast = $('toast');
let toastT = 0, pulseFx = 0;
const say = (m) => { toast.textContent = m; toastT = 2.2; };
function onEvents(evs) {
  for (const e of evs) {
    switch (e.name) {
      case 'mote_picked': sfx.pick(); break;
      case 'lantern_lit': sfx.lit(); say(`Đèn ${e.data.lantern_id} ${e.data.relight ? 'được thắp lại' : 'đã sáng'}!`); lowWarned.delete(e.data.lantern_id); break;
      case 'lantern_out': sfx.lose(); say(`Đèn ${e.data.lantern_id} đã cạn dầu và tắt!`); caption(`💡 Đèn ${e.data.lantern_id} đã tắt`); break;
      case 'refuel': sfx.pick(); say(`Châm dầu đèn ${e.data.lantern_id}: ${e.data.fuel}`); if (e.data.fuel >= T.low_fuel_threshold) lowWarned.delete(e.data.lantern_id); break;
      case 'pulse': sfx.pulse(); pulseFx = settings.reduceMotion ? 0 : 1; break;
      case 'player_hit': sfx.hit(); say(e.data.by === 'fall' ? 'Mây rơi xuống biển mây!' : `Bị Bóng Mực chạm! Còn ${e.data.flames} Ngọn Lửa`); break;
      case 'shade_spawned': sfx.shade(); caption('👁 Bóng Mực xuất hiện (xem mũi tên tím ở mép màn hình)'); threat = { id: e.data.id, until: performance.now() + 4000 }; break;
      case 'dash': sfx.dash(); break;
      case 'charm_picked': sfx.charm(); say('Bùa Gió! Chạy nhanh và lướt liên tục'); break;
      case 'drifter_steal': sfx.steal(); say(`Gió Lạc cướp ${e.data.amount} đom đóm!`); break;
      case 'drifter_drop': say('Gió Lạc đánh rơi đom đóm!'); break;
      case 'game_over': stopMusic(); setTimeout(() => goResult(e.data), 600); break;
      default: break;
    }
  }
}

// ---------- loop ----------
const fpsEl = $('fps');
if (q.has('fps')) fpsEl.style.display = 'block';
let acc = 0, last = performance.now(), frames = 0, fpsT = 0, prevJump = false;
window.__fps = { avg: 0, samples: [] };
// bench measurement (Ticket-04): 3 s warm-up, then --duration seconds of frame times
const benchDur = Number(q.get('duration') || 30) * 1000;
const bench = { start: null, dts: [], firstFrameEpoch: null, done: false, three: THREE.REVISION, gl: 'n/a' };
window.__bench = bench;
function frame(now) {
  const rawDt = now - last;
  const dt = Math.min(0.25, rawDt / 1000);
  last = now;
  if (BENCH) {
    if (bench.firstFrameEpoch === null) { bench.firstFrameEpoch = performance.timeOrigin + now; bench.start = now; }
    else if (!bench.done && now - bench.start > 3000) {
      bench.dts.push(rawDt);
      if (now - bench.start >= 3000 + benchDur) { bench.done = true; $('bench-done').style.display = 'block'; }
    }
  }
  if ((mode === 'playing' || BENCH) && game) {
    acc += dt;
    while (acc >= 1 / TICK_RATE) {
      acc -= 1 / TICK_RATE;
      const input = BENCH ? { move: [0, 0], cam_yaw_deg: 0 } : readInput(); // bench: no player input
      if (!BENCH && input.jump && !prevJump && game.player.grounded) sfx.jump();
      prevJump = input.jump;
      const evs = step(game, input);
      if (!BENCH) onEvents(evs);
      if (game.state !== 'playing') break;
    }
  } else acc = 0;
  if (game) render(dt, now);
  frames++; fpsT += dt;
  if (fpsT >= 1) { const f = frames / fpsT; window.__fps.samples.push(f); fpsEl.textContent = `${f.toFixed(0)} FPS`; frames = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}

function sync(map, list, create) {
  const seen = new Set();
  for (const e of list) {
    seen.add(e.id);
    if (!map.has(e.id)) { const m = create(e); map.set(e.id, m); scene.add(m); }
  }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m); map.delete(id); }
}

const tmp = new THREE.Vector3();
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: PAL.moteGlow, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.visible = false;
scene.add(pulseRing);
function render(dt, now) {
  const t = performance.now() / 1000, p = game.player;
  may.position.set(...p.pos);
  may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.userData.light.intensity = BENCH ? 4 : 2 + p.carried * 0.6;
  const blinkInvuln = !settings.reduceMotion && p.invuln > 0 && Math.floor(t * 12) % 2 === 0;
  may.visible = !blinkInvuln && p.fallWait === 0;

  const lit = game.lanterns.filter((l) => l.lit).length, total = game.lanterns.length;
  const blinkOn = Math.floor(t * 2) % 2 === 0; // 1 Hz blink
  for (const l of game.lanterns) {
    const m = meshes.lanterns.get(l.id), u = m.userData;
    const cost = l.everLit ? T.relight_cost : T.lantern_cost, k = l.deposited / cost;
    const fuel = l.fuel / TICK_RATE, low = l.lit && fuel < T.low_fuel_threshold;
    if (low && !lowWarned.has(l.id)) { lowWarned.add(l.id); caption(`⚠ Đèn ${l.id} sắp cạn dầu (dưới ${T.low_fuel_threshold})`); }
    const glow = l.lit && !(low && !blinkOn);
    u.shell.material.color.setHex(l.lit ? PAL.lampOn : PAL.lampOff);
    u.shell.material.emissive.setHex(glow ? PAL.lampOn : 0x000000);
    u.shell.material.emissiveIntensity = glow ? 1 : 0;
    u.core.visible = glow || (!l.lit && k > 0);
    u.light.intensity = glow ? 160 : l.lit ? 40 : k * 12;
    u.ring.material.opacity = l.lit && !low ? 0.35 : 0; // zone only while fuel >= 30
    u.barBg.visible = u.bar.visible = l.lit && !(low && !blinkOn);
    u.bar.scale.x = Math.max(0.001, fuel / T.fuel_max);
    u.bar.position.x = -0.8 * (1 - fuel / T.fuel_max);
    u.bar.material.color.setHex(low ? (settings.colorblind ? 0xffffff : PAL.danger) : PAL.lampCore);
    u.barBg.lookAt(camera.position); u.bar.lookAt(camera.position);
    u.shell.scale.set(1, l.lit ? 1 : 0.8, 1); // unlit: folded 20% + torn paper (readable without colour)
    u.tear.visible = !l.lit;
  }
  ambient.intensity = 0.15 + 0.55 * (lit / total); // Ticket-02: ambient follows progress

  sync(meshes.motes, game.motes, (e) => makeMote(e.kind));
  for (const mo of game.motes) {
    const h = mo.id.charCodeAt(mo.id.length - 1);
    meshes.motes.get(mo.id).position.set(mo.pos[0], mo.pos[1] + 0.8 + Math.sin(t * 2 + h) * 0.2, mo.pos[2]);
  }
  sync(meshes.shades, game.shades, () => makeShade());
  for (const s of game.shades) {
    const m = meshes.shades.get(s.id), u = m.userData;
    m.position.set(s.pos[0], s.pos[1] + Math.sin(t * 3 + s.id.length) * 0.12, s.pos[2]);
    const stunned = s.state === 'stunned', spawning = s.state === 'spawning';
    u.body.material = stunned ? SHADE_MATS.bodyStun : SHADE_MATS.body;
    const rims = settings.colorblind ? SHADE_MATS.rimCb : SHADE_MATS.rim; // Ticket-03 colour-blind palette
    u.rim.material = stunned ? rims.stun : s.state === 'chase' || s.state === 'drain' ? rims.alert : rims.calm;
    m.scale.setScalar(spawning ? 0.4 + 0.6 * (1 - s.left / R.shade_spawning_ticks) : stunned ? 0.8 : 1);
  }
  sync(meshes.drifters, game.drifters, () => makeDrifter());
  for (const d of game.drifters) {
    const m = meshes.drifters.get(d.id), pos = m.geometry.attributes.position, base = m.userData.base;
    for (let i = 0; i < pos.count; i++) pos.setY(i, base[i * 3 + 1] + Math.sin(t * 8 + base[i * 3] * 2) * 0.25);
    pos.needsUpdate = true;
    m.position.set(...d.pos);
    m.rotation.y = t * 0.5;
    m.material.opacity = d.state === 'flee' ? 0.4 : 0.8;
  }
  sync(meshes.charms, game.charms, () => makeCharm());
  for (const c of game.charms) {
    const m = meshes.charms.get(c.id);
    m.visible = c.available;
    m.position.set(c.pos[0], c.pos[1] + 1 + Math.sin(t * 2) * 0.15, c.pos[2]);
    m.rotation.y = t;
  }

  if (BENCH) {
    // Ticket-04 bench camera: circle centre (0,0,0), radius 30 m, Y = 15, looking at the origin, starting at
    // (30,15,0) and turning counter-clockwise seen from above (+X toward -Z), one lap per 15 s.
    const a = bench.start === null ? 0 : (((now - bench.start) / 15000) * 2 * Math.PI);
    camera.position.set(30 * Math.cos(a), 15, -30 * Math.sin(a));
    camera.lookAt(0, 0, 0);
  } else {
    const th = (camYaw * Math.PI) / 180, fx = Math.sin(th), fz = Math.cos(th);
    const camY = Math.max(p.pos[1], -2);
    camera.position.set(p.pos[0] - fx * 10, camY + 6, p.pos[2] - fz * 10);
    camera.lookAt(p.pos[0], camY + 1.2, p.pos[2]);
  }

  // creative: expanding light ring on pulse (visual only; off with reduced motion)
  if (pulseFx > 0) pulseFx = Math.max(0, pulseFx - dt * 2.5);
  pulseRing.visible = pulseFx > 0;
  pulseRing.scale.setScalar(Math.max(0.01, T.pulse_radius * (1 - pulseFx)));
  pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
  pulseRing.material.opacity = pulseFx;
  hud(lit, total, dt);
  renderer.render(scene, camera);
}

// ---------- HUD (DOM is only touched when a value changes: avoids per-frame layout work) ----------
const domCache = new Map();
const setText = (el, v) => { if (domCache.get(el) !== v) { domCache.set(el, v); el.textContent = v; } };
const setHtml = (el, v) => { if (domCache.get(el) !== 'h' + v) { domCache.set(el, 'h' + v); el.innerHTML = v; } };
const setStyle = (el, k, v) => { const key = el.id + k; if (domCache.get(key) !== v) { domCache.set(key, v); el.style[k] = v; } };
const bar = $('motebar');
bar.innerHTML = '<i></i>'.repeat(T.carry_capacity);
function edgeArrow(el, worldPos) {
  tmp.set(worldPos[0], worldPos[1], worldPos[2]).project(camera);
  const behind = tmp.z > 1;
  const off = behind || Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1;
  if (!off) { setStyle(el, 'display', 'none'); return; }
  let x = tmp.x, y = tmp.y;
  if (behind) { x = -x; y = -y; }
  const a = Math.atan2(y, x);
  const W = window.innerWidth, H = window.innerHeight, r = Math.min(W, H) * 0.42;
  setStyle(el, 'display', 'block');
  el.style.left = `${W / 2 + Math.cos(a) * r - 12}px`;
  el.style.top = `${H / 2 - Math.sin(a) * r - 13}px`;
  el.style.transform = `rotate(${90 - (a * 180) / Math.PI}deg)`;
}
function hud(lit, total, dt) {
  const p = game.player;
  setText($('flames'), '🔥'.repeat(Math.max(0, p.flames)) + '·'.repeat(Math.max(0, T.flames - p.flames)));
  const tl = timeLeft(game);
  const timer = $('timer');
  const mmss = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(Math.floor(tl % 60)).padStart(2, '0')}`;
  setText(timer, (tl <= 30 && settings.colorblind ? '⚠ ' : '') + mmss);
  timer.classList.toggle('low', tl <= 30);
  timer.classList.toggle('cb', settings.colorblind);
  const sec = Math.ceil(tl);
  if (mode === 'playing' && tl <= 10 && sec !== lastBeep && tl > 0) {
    if (lastBeep === -1 || lastBeep > 10) caption('⏳ Còn 10 giây tới bình minh!');
    lastBeep = sec; sfx.tick();
  }
  setHtml($('topright'), `Đèn <b>${lit}/${total}</b><br>Điểm <b>${game.score}</b>${totalScore ? `<br>Tổng ${totalScore}` : ''}`);
  const cap = Math.min(T.capacity_max, T.carry_capacity + R.capacity_per_light * p.successfulLights);
  if (bar.children.length !== cap) bar.innerHTML = '<i></i>'.repeat(cap);
  if (domCache.get('carried') !== p.carried + '/' + cap) { domCache.set('carried', p.carried + '/' + cap); [...bar.children].forEach((c, i) => c.classList.toggle('on', i < p.carried)); }
  setText($('motecount'), `${p.carried} / ${cap}`);
  const dashCd = p.charm > 0 ? 0 : p.dashCd / R.dash_cd_ticks;
  setStyle($('sk-dash').querySelector('.cd'), 'height', `${Math.round(dashCd * 100)}%`);
  setStyle($('sk-pulse').querySelector('.cd'), 'height', `${Math.round((p.pulseCd / (T.pulse_cooldown_s * TICK_RATE)) * 100)}%`);
  $('sk-pulse').classList.toggle('off', p.carried < T.pulse_cost);
  const near = game.lanterns.filter((l) => !(l.lit && l.fuel >= T.fuel_max * TICK_RATE) && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= T.interact_radius);
  const prompt = $('prompt'), ik = keyLabel(settings.keys.interact);
  if (near.length && !BENCH) {
    const l = near[0];
    setStyle(prompt, 'display', 'block');
    prompt.textContent = l.lit ? `${ik} — Châm dầu (${Math.floor(l.fuel / TICK_RATE)}/${T.fuel_max})` : `${ik} — Nạp ánh sáng (${l.deposited}/${l.everLit ? T.relight_cost : T.lantern_cost})`;
  } else setStyle(prompt, 'display', 'none');
  const unlit = game.lanterns.filter((l) => !l.lit);
  if (unlit.length && !BENCH) {
    const l = unlit.reduce((a, b) => (Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) <= Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]) ? a : b));
    edgeArrow($('arrow'), [l.pos[0], l.pos[1] + 3.4, l.pos[2]]);
  } else setStyle($('arrow'), 'display', 'none');
  // threat arrow toward a newly spawned shade (accessibility indicator)
  const s = threat && performance.now() < threat.until ? game.shades.find((x) => x.id === threat.id) : null;
  if (s && settings.captions) edgeArrow($('threat'), s.pos); else setStyle($('threat'), 'display', 'none');
  // wind warning (2 s before a gust)
  const eta = windEta(game);
  const ww = $('windwarn');
  const warn = eta !== null && eta <= R.wind_warn_ticks / TICK_RATE && !game.wind.active;
  if (warn && ww.style.display !== 'block') { sfx.wind(); caption('🍃 Gió sắp thổi mạnh!'); }
  setStyle(ww, 'display', warn ? 'block' : game.wind.active ? 'block' : 'none');
  if (game.wind.active || warn) ww.textContent = game.wind.active ? `🍃 Gió mạnh (${game.wind.dir_deg}°)` : '🍃 Gió sắp nổi...';
  if (toastT > 0) { toastT -= dt; toast.style.opacity = Math.min(1, toastT); }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderKeymap();
if (BENCH) {
  loadNight(1);
  show(null);
  try { const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info'); bench.gl = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch { /* ignore */ }
} else if (q.has('autoplay')) { goIntro(Number(q.get('night')) || 1); goPlay(); } else { loadNight(1); goMenu(); }
requestAnimationFrame(frame);
