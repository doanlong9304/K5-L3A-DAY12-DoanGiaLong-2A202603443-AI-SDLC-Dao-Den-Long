// Browser front-end: rendering + input only. All rules live in src/core (same code as headless).
import * as THREE from 'three';
import { createGame, step, timeLeft, TICK_RATE } from '../core/game.js';
import { TUNING as T, WORLD as W } from '../core/tuning.js';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x120a24), DUSK = new THREE.Color(0x3b2a55);
scene.background = NIGHT.clone();
scene.fog = new THREE.Fog(NIGHT.clone(), 25, 70);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

const hemi = new THREE.HemisphereLight(0x8070c0, 0x201030, 0.35);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9aa0ff, 0.25);
moon.position.set(-20, 40, 10);
scene.add(moon);

// Island + sea of clouds
const island = new THREE.Mesh(
  new THREE.CylinderGeometry(W.island_radius, W.island_radius * 0.8, 3, 64),
  new THREE.MeshStandardMaterial({ color: 0x3d5a3a, roughness: 1 })
);
island.position.y = -1.5;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(150, 48), new THREE.MeshBasicMaterial({ color: 0x2a1f45 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -4;
scene.add(sea);

// ---------- entity meshes ----------
function makePlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 12), new THREE.MeshStandardMaterial({ color: 0x4f7cc9 }));
  body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf2d0a9 }));
  head.position.y = 1.45;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.45, 24), new THREE.MeshStandardMaterial({ color: 0xd9c27a })); // nón lá
  hat.position.y = 1.8;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  lamp.position.set(0.55, 1.45, 0);
  const lampLight = new THREE.PointLight(0xffb347, 4, 8);
  lampLight.position.copy(lamp.position);
  g.add(body, head, hat, lamp, lampLight);
  g.userData = { lampLight, lamp };
  return g;
}
const player = makePlayer();
scene.add(player);

const lanternMeshes = new Map();
function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x5a3b28 }));
  post.position.y = 1.5;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: 0x553322, emissive: 0x000000 }));
  shell.position.y = 3.4;
  const light = new THREE.PointLight(0xff9f40, 0, 25, 1.6);
  light.position.y = 3.4;
  const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.08, T.safe_radius, 48), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.25 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(post, shell, light, ring);
  g.userData = { shell, light };
  return g;
}

const moteGeo = new THREE.SphereGeometry(0.15, 8, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
const moteMeshes = new Map();
const shadeGeo = new THREE.SphereGeometry(0.7, 16, 12);
const shadeMeshes = new Map();

function syncMap(map, list, create) {
  const seen = new Set();
  for (const e of list) {
    seen.add(e.id);
    if (!map.has(e.id)) { const m = create(); map.set(e.id, m); scene.add(m); }
  }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m); map.delete(id); }
}

// Pulse ring effect (visual only)
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseFx = 0;

// ---------- HUD ----------
const hud = document.createElement('div');
hud.id = 'hud';
document.body.appendChild(hud);
const overlay = document.createElement('div');
overlay.id = 'overlay';
document.body.appendChild(overlay);
const toast = document.createElement('div');
toast.id = 'toast';
document.body.appendChild(toast);
let toastT = 0;
const say = (msg) => { toast.textContent = msg; toastT = 2; };

// ---------- input ----------
const keys = new Set();
let camYaw = 0; // degrees, same convention as the contract
const btn = { jump: false, interact: false, pulse: false };
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if ((e.code === 'KeyR' || e.code === 'Enter') && game.state !== 'playing') restart();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
renderer.domElement.addEventListener('mousedown', () => { dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * 0.3; });

function readInput() {
  // Camera looks along +move-z; screen-right is move x = -1 (see contract rotation formula).
  let x = 0, z = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x -= 1;
  if (keys.has('KeyQ')) camYaw += 1.5;
  if (keys.has('KeyZ')) camYaw -= 1.5;
  btn.jump = keys.has('Space');
  btn.interact = keys.has('KeyE');
  btn.pulse = keys.has('KeyF') || keys.has('ShiftLeft');
  return { move: [x, z], cam_yaw_deg: camYaw, ...btn };
}

// ---------- game loop (fixed 60 Hz, same step() as headless) ----------
let game;
function restart() {
  // The browser picks a fresh seed each round; headless runs use --seed for determinism.
  // Debug/evidence URL params: ?seed=N fixes the seed, ?lit=N pre-lights N lanterns.
  const q = new URLSearchParams(location.search);
  const seed = q.has('seed') ? Number(q.get('seed')) : Date.now() >>> 0;
  const litN = Math.min(T.lantern_count_night1 - 1, Number(q.get('lit')) || 0);
  const scenario = litN > 0 ? { lanterns: Array.from({ length: litN }, (_, i) => ({ id: `L${i + 1}`, lit: true, deposited: T.lantern_cost })) } : null;
  game = createGame({ seed, scenario });
  for (const map of [lanternMeshes, moteMeshes, shadeMeshes]) { for (const m of map.values()) scene.remove(m); map.clear(); }
  for (const l of game.lanterns) {
    const m = makeLantern();
    m.position.set(l.pos[0], 0, l.pos[2]);
    lanternMeshes.set(l.id, m);
    scene.add(m);
  }
  overlay.style.display = 'none';
}
restart();

function handleEvents(events) {
  for (const e of events) {
    if (e.name === 'lantern_lit') say(`Đèn ${e.data.lantern_id} đã sáng!`);
    else if (e.name === 'player_hit') say(`Bị Bóng Mực chạm! Còn ${e.data.flames} ngọn lửa`);
    else if (e.name === 'pulse') { pulseFx = 1; if (e.data.stunned_ids.length) say(`Xua được ${e.data.stunned_ids.length} Bóng Mực`); }
    else if (e.name === 'shade_spawned') say('Một Bóng Mực mới trồi lên từ sương...');
    else if (e.name === 'game_over') showEnd(e.data);
  }
}

function showEnd({ result, reason }) {
  const why = { all_lit: 'Mọi Đèn Lồng Lớn đã sáng.', dawn: 'Trời sáng mà đảo vẫn chưa đủ đèn.', no_flames: 'Mây đã hết lửa.' }[reason];
  overlay.innerHTML = `<h1>${result === 'won' ? 'Đảo đã sáng lại!' : 'Đêm chưa qua...'}</h1><p>${why}</p><p>Điểm: <b>${game.score}</b></p><p>Nhấn <b>R</b> hoặc <b>Enter</b> để chơi lại</p>`;
  overlay.style.display = 'flex';
}

let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= 1 / TICK_RATE) {
    acc -= 1 / TICK_RATE;
    if (game.state === 'playing') handleEvents(step(game, readInput()));
  }
  render(dt);
  requestAnimationFrame(frame);
}

function render(dt) {
  const p = game.player;
  const t = performance.now() / 1000;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const th = (camYaw * Math.PI) / 180;
  player.rotation.y = th;
  // Hat lantern glows brighter with carried light (creative, visual only).
  player.userData.lampLight.intensity = 2 + p.carried * 1.5;
  player.visible = !(p.invuln > 0 && Math.floor(t * 12) % 2 === 0);

  const lit = game.lanterns.filter((l) => l.lit).length;
  for (const l of game.lanterns) {
    const m = lanternMeshes.get(l.id);
    m.position.set(l.pos[0], 0, l.pos[2]);
    const k = l.lit ? 1 : l.deposited / T.lantern_cost;
    m.userData.light.intensity = l.lit ? 160 : k * 10;
    m.userData.shell.material.emissive.setHex(l.lit ? 0xff9f40 : 0x331a00).multiplyScalar(l.lit ? 1 : 0.3 + k);
  }
  // The island brightens as lanterns are lit.
  const f = lit / T.lantern_count_night1;
  hemi.intensity = 0.35 + f * 0.9;
  scene.background.copy(NIGHT).lerp(DUSK, f);
  scene.fog.color.copy(scene.background);
  scene.fog.far = 70 + f * 60;

  syncMap(moteMeshes, game.motes, () => new THREE.Mesh(moteGeo, moteMat));
  for (const mo of game.motes) {
    const h = mo.id.charCodeAt(1) + mo.id.length * 7;
    moteMeshes.get(mo.id).position.set(mo.pos[0], 0.8 + Math.sin(t * 2 + h) * 0.25, mo.pos[2]);
  }
  syncMap(shadeMeshes, game.shades, () => new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: 0x2a0f3d, emissive: 0x3a1060, transparent: true, opacity: 0.9 })));
  for (const s of game.shades) {
    const m = shadeMeshes.get(s.id);
    m.position.set(s.pos[0], 1 + Math.sin(t * 3 + s.id.length) * 0.15, s.pos[2]);
    m.material.opacity = s.state === 'stunned' ? 0.35 : 0.9;
    m.scale.setScalar(s.state === 'stunned' ? 0.75 : 1);
  }

  if (pulseFx > 0) {
    pulseFx = Math.max(0, pulseFx - dt * 2.5);
    const r = T.pulse_radius * (1 - pulseFx);
    pulseRing.scale.setScalar(Math.max(0.01, r));
    pulseRing.position.set(p.pos[0], 0.1, p.pos[2]);
    pulseRing.material.opacity = pulseFx;
  }

  // Third-person camera behind the player, looking along the movement "forward" axis.
  const fx = Math.sin(th), fz = Math.cos(th);
  camera.position.set(p.pos[0] - fx * 9, p.pos[1] + 5.5, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0], p.pos[1] + 1.2, p.pos[2]);

  const tl = timeLeft(game);
  const cd = p.pulseCd / TICK_RATE;
  hud.innerHTML = `
    <div><span class="lbl">Lửa</span> ${'🔥'.repeat(Math.max(0, p.flames))}</div>
    <div><span class="lbl">Ánh sáng mang theo</span> ${p.carried} / ${T.carry_capacity}</div>
    <div><span class="lbl">Đèn đã thắp</span> ${lit} / ${T.lantern_count_night1}</div>
    <div><span class="lbl">Thời gian</span> ${Math.floor(tl / 60)}:${String(Math.floor(tl % 60)).padStart(2, '0')}</div>
    <div><span class="lbl">Điểm</span> ${game.score}</div>
    <div><span class="lbl">Tỏa sáng</span> ${cd > 0 ? cd.toFixed(1) + ' s' : p.carried >= T.pulse_cost ? 'sẵn sàng' : 'cần ánh sáng'}</div>`;
  if (toastT > 0) { toastT -= dt; toast.style.opacity = Math.min(1, toastT); }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
requestAnimationFrame(frame);
