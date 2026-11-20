// Browser front-end: screens, rendering, HUD, input, audio. All rules come from src/core step().
import * as THREE from 'three';
import { createGame, step, timeLeft, windEta, TICK_RATE } from '../core/game.js';
import { MAPS } from '../core/maps.js';
import { TUNING as T, RULES as R } from '../core/tuning.js';
import { PAL, buildWorld, makeMay, makeLantern, makeMote, makeShade, makeDrifter, makeCharm } from './world.js';
import { sfx, setVolume, unlock, startMusic, stopMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);

// ---------- settings (persisted) ----------
const SETTINGS_KEY = 'dao-den-long-settings';
const settings = { volume: 0.6, sensitivity: 0.3 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
setVolume(settings.volume);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
  1: 'Ông Đăng: "Đảo Bến là nơi cháu lớn lên. Năm ngọn đèn đang chờ ánh sáng của cháu."',
  2: 'Ông Đăng: "Đảo Cau có hai nửa, nối bằng cầu tre. Cẩn thận Gió Lạc, chúng thích cướp đom đóm lắm."',
  3: 'Ông Đăng: "Đảo Chuông cao và lộng gió. Lên đến tháp chuông là cháu sẽ thấy cả biển mây."',
};
let game = null, night = 1, totalScore = 0, mode = 'menu', prevMode = 'menu';
let world = null, may = null;
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
  const seed = q.has('seed') ? Number(q.get('seed')) : Date.now() >>> 0; // browser: fresh seed; headless uses --seed
  const litN = Number(q.get('lit')) || 0;
  const scenario = litN > 0 ? { lanterns: MAPS[n].lanterns.slice(0, litN).map((l) => ({ id: l.id, lit: true, deposited: T.lantern_cost })) } : null;
  game = createGame({ seed, night: n, scenario });
  world = buildWorld(MAPS[n]);
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
}

// ---------- screens ----------
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.style.display = 'none';
  if (id) $(id).style.display = 'flex';
}
function goIntro(n) {
  loadNight(n);
  $('intro-title').textContent = `Đêm ${n} — ${MAPS[n].name}`;
  $('intro-quote').textContent = STORY[n];
  mode = 'intro';
  show('intro');
}
function goPlay() { mode = 'playing'; show(null); startMusic(); }
function goPause() { mode = 'paused'; show('pause'); }
function goMenu() { mode = 'menu'; stopMusic(); totalScore = 0; show('menu'); }
function goResult({ result, reason }) {
  mode = 'result';
  const why = { all_lit: 'Mọi Đèn Lồng Lớn đã sáng.', dawn: 'Trời sáng mà đảo vẫn chưa đủ đèn.', no_flames: 'Mây đã hết Ngọn Lửa.' }[reason];
  if (result === 'won') {
    totalScore += game.score;
    sfx.win();
    if (night === 3) { $('dawn-score').textContent = totalScore; mode = 'dawn'; show('dawn'); return; }
  } else sfx.lose();
  $('result-title').textContent = result === 'won' ? `Đêm ${night} đã sáng!` : `Đêm ${night} chưa qua...`;
  $('result-text').innerHTML = `${why}<br>Điểm Đêm: <b>${result === 'won' ? game.score : 0}</b> · Tổng điểm: <b>${totalScore}</b>`;
  $('btn-next').style.display = result === 'won' ? '' : 'none';
  $('btn-retry').style.display = result === 'won' ? 'none' : '';
  show('result');
}
document.addEventListener('click', (e) => {
  const act = e.target?.dataset?.act;
  if (!act) return;
  unlock();
  if (act === 'start') { totalScore = 0; goIntro(1); }
  else if (act === 'play' || act === 'resume') goPlay();
  else if (act === 'restart' || act === 'retry') goIntro(night);
  else if (act === 'next') goIntro(night + 1);
  else if (act === 'menu') goMenu();
  else if (act === 'settings') { prevMode = mode; $('set-vol').value = settings.volume; $('set-sens').value = settings.sensitivity; show('settings'); }
  else if (act === 'back') { show(prevMode === 'paused' ? 'pause' : 'menu'); }
});
$('set-vol').addEventListener('input', (e) => { settings.volume = Number(e.target.value); setVolume(settings.volume); saveSettings(); });
$('set-sens').addEventListener('input', (e) => { settings.sensitivity = Number(e.target.value); saveSettings(); });

// ---------- input ----------
const keys = new Set();
let camYaw = 0, dragging = false;
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'playing') goPause(); else if (mode === 'paused') goPlay();
  }
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', () => { dragging = true; unlock(); });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => { if (dragging && mode === 'playing') camYaw -= e.movementX * settings.sensitivity; });

function readInput() {
  // camera looks along move +z; screen-right is move x = -1 (contract rotation formula)
  let x = 0, z = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x -= 1;
  if (keys.has('KeyQ')) camYaw += 1.5;
  if (keys.has('KeyZ')) camYaw -= 1.5;
  return {
    move: [x, z], cam_yaw_deg: camYaw,
    jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyF'),
    dash: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

// ---------- events -> feedback ----------
const toast = $('toast');
let toastT = 0, pulseFx = 0;
const say = (m) => { toast.textContent = m; toastT = 2.2; };
function onEvents(evs) {
  for (const e of evs) {
    switch (e.name) {
      case 'mote_picked': sfx.pick(); break;
      case 'lantern_lit': sfx.lit(); say(`Đèn ${e.data.lantern_id} đã sáng!`); break;
      case 'pulse': sfx.pulse(); pulseFx = 1; break;
      case 'player_hit': sfx.hit(); say(e.data.by === 'fall' ? 'Mây rơi xuống biển mây!' : `Bị Bóng Mực chạm! Còn ${e.data.flames} Ngọn Lửa`); break;
      case 'shade_spawned': sfx.shade(); break;
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
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (mode === 'playing' && game) {
    acc += dt;
    while (acc >= 1 / TICK_RATE) {
      acc -= 1 / TICK_RATE;
      const input = readInput();
      if (input.jump && !prevJump && game.player.grounded) sfx.jump();
      prevJump = input.jump;
      onEvents(step(game, input));
      if (game.state !== 'playing') break;
    }
  } else acc = 0;
  if (game) render(dt);
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
function render(dt) {
  const t = performance.now() / 1000, p = game.player;
  may.position.set(...p.pos);
  may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.userData.light.intensity = 2 + p.carried * 0.6;
  may.visible = !(p.invuln > 0 && Math.floor(t * 12) % 2 === 0) && p.fallWait === 0;

  const lit = game.lanterns.filter((l) => l.lit).length, total = game.lanterns.length;
  for (const l of game.lanterns) {
    const m = meshes.lanterns.get(l.id), u = m.userData, k = l.deposited / T.lantern_cost;
    u.shell.material.color.setHex(l.lit ? PAL.lampOn : PAL.lampOff);
    u.shell.material.emissive.setHex(l.lit ? PAL.lampOn : 0x000000);
    u.shell.material.emissiveIntensity = l.lit ? 1 : 0;
    u.core.visible = l.lit || k > 0;
    u.light.intensity = l.lit ? 160 : k * 12;
    u.ring.material.opacity = l.lit ? 0.35 : 0;
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
    u.body.material.color.setHex(stunned ? PAL.shadeStun : PAL.shadeBody);
    u.rim.material.opacity = stunned ? 0.1 : s.state === 'chase' ? 0.6 : 0.35;
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

  // camera: third person behind Mây
  const th = (camYaw * Math.PI) / 180, fx = Math.sin(th), fz = Math.cos(th);
  const camY = Math.max(p.pos[1], -2);
  camera.position.set(p.pos[0] - fx * 10, camY + 6, p.pos[2] - fz * 10);
  camera.lookAt(p.pos[0], camY + 1.2, p.pos[2]);

  // creative: expanding light ring on pulse (visual only)
  if (pulseFx > 0) pulseFx = Math.max(0, pulseFx - dt * 2.5);
  pulseRing.visible = pulseFx > 0;
  pulseRing.scale.setScalar(Math.max(0.01, T.pulse_radius * (1 - pulseFx)));
  pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
  pulseRing.material.opacity = pulseFx;
  hud(lit, total, dt);
  renderer.render(scene, camera);
}

// ---------- HUD ----------
const bar = $('motebar');
bar.innerHTML = '<i></i>'.repeat(T.carry_capacity);
function hud(lit, total, dt) {
  const p = game.player;
  $('flames').textContent = '🔥'.repeat(Math.max(0, p.flames)) + '·'.repeat(Math.max(0, T.flames - p.flames));
  const tl = timeLeft(game);
  const timer = $('timer');
  timer.textContent = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(Math.floor(tl % 60)).padStart(2, '0')}`;
  timer.classList.toggle('low', tl <= 30);
  const sec = Math.ceil(tl);
  if (mode === 'playing' && tl <= 10 && sec !== lastBeep && tl > 0) { lastBeep = sec; sfx.tick(); }
  $('topright').innerHTML = `Đèn <b>${lit}/${total}</b><br>Điểm <b>${game.score}</b>${totalScore ? `<br><small>Tổng ${totalScore}</small>` : ''}`;
  [...bar.children].forEach((c, i) => c.classList.toggle('on', i < p.carried));
  const dashCd = p.charm > 0 ? 0 : p.dashCd / R.dash_cd_ticks;
  $('sk-dash').querySelector('.cd').style.height = `${dashCd * 100}%`;
  $('sk-pulse').querySelector('.cd').style.height = `${(p.pulseCd / (T.pulse_cooldown_s * TICK_RATE)) * 100}%`;
  $('sk-pulse').classList.toggle('off', p.carried < T.pulse_cost);
  // deposit prompt
  const near = game.lanterns.filter((l) => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= T.interact_radius);
  const prompt = $('prompt');
  if (near.length) { prompt.style.display = 'block'; prompt.textContent = `E — Nạp ánh sáng (${near[0].deposited}/${T.lantern_cost})`; } else prompt.style.display = 'none';
  // arrow to nearest unlit lantern when off screen
  const arrow = $('arrow');
  const unlit = game.lanterns.filter((l) => !l.lit);
  if (unlit.length) {
    const l = unlit.reduce((a, b) => (Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) <= Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]) ? a : b));
    tmp.set(l.pos[0], l.pos[1] + 3.4, l.pos[2]).project(camera);
    const behind = tmp.z > 1;
    const off = behind || Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1;
    if (off) {
      let x = tmp.x, y = tmp.y;
      if (behind) { x = -x; y = -y; }
      const a = Math.atan2(y, x);
      const W = window.innerWidth, H = window.innerHeight;
      const r = Math.min(W, H) * 0.42;
      arrow.style.display = 'block';
      arrow.style.left = `${W / 2 + Math.cos(a) * r - 12}px`;
      arrow.style.top = `${H / 2 - Math.sin(a) * r - 13}px`;
      arrow.style.transform = `rotate(${90 - (a * 180) / Math.PI}deg)`;
    } else arrow.style.display = 'none';
  } else arrow.style.display = 'none';
  // wind warning (2 s before a gust)
  const eta = windEta(game);
  const ww = $('windwarn');
  const warn = eta !== null && eta <= R.wind_warn_ticks / TICK_RATE && !game.wind.active;
  if (warn && ww.style.display !== 'block') sfx.wind();
  ww.style.display = warn ? 'block' : game.wind.active ? 'block' : 'none';
  ww.textContent = game.wind.active ? `🍃 Gió mạnh (${game.wind.dir_deg}°)` : '🍃 Gió sắp nổi...';
  if (toastT > 0) { toastT -= dt; toast.style.opacity = Math.min(1, toastT); }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Evidence/debug: ?night=N&autoplay skips the menu straight into a night.
if (q.has('autoplay')) { goIntro(Number(q.get('night')) || 1); goPlay(); } else { loadNight(1); goMenu(); }
requestAnimationFrame(frame);
