// Static scenery for each standard map (visual only; collision lives in src/core/maps.js).
import * as THREE from 'three';

export const PAL = {
  sky: 0x0e1430, fog: 0x1b2350,
  grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lampOn: 0xffb347, lampCore: 0xffe9b0, lampOff: 0x5b5f6e,
  moteCore: 0xfff6c2, moteGlow: 0xffe58a,
  shadeBody: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450,
  coat: 0xe8e2d0, scarf: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
  danger: 0xff5a5f, text: 0xf5f1e6,
};

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...opts });

function disc(r, h, color, x = 0, z = 0, topY = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, h, 64), mat(color));
  m.position.set(x, topY - h / 2, z);
  return m;
}
function sandRim(r, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r - 1.2, r, 64), mat(PAL.sand));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z);
  return m;
}

function halfAnnulus(inner, outer, height) {
  const s = new THREE.Shape();
  const N = 48;
  s.moveTo(outer, 0);
  for (let i = 1; i <= N; i++) { const a = (Math.PI * i) / N; s.lineTo(outer * Math.cos(a), -outer * Math.sin(a)); }
  for (let i = N; i >= 0; i--) { const a = (Math.PI * i) / N; s.lineTo(inner * Math.cos(a), -inner * Math.sin(a)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 4 });
  const m = new THREE.Mesh(g, mat(PAL.grass));
  m.rotation.x = -Math.PI / 2; // shape y -> world -z, so -sin puts it on z > 0; depth -> +Y
  return m;
}

function ramp(angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const len = Math.hypot(6, 3);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 3), mat(PAL.sand));
  const g = new THREE.Group();
  m.rotation.z = Math.atan2(3, 6); // rises toward the centre after the group rotation
  g.add(m);
  g.position.set(27 * Math.cos(a), 1.5, 27 * Math.sin(a));
  g.rotation.y = -a + Math.PI; // local +X points toward the island centre
  return g;
}

function pad(pos) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 24), new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: PAL.gold, emissiveIntensity: 0.4 }));
  m.position.set(pos[0], pos[1] + 0.1, pos[2]);
  return m;
}

export function buildWorld(map) {
  const g = new THREE.Group();
  const sea = new THREE.Mesh(new THREE.CircleGeometry(260, 48), new THREE.MeshBasicMaterial({ color: PAL.sea }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -8;
  g.add(sea);
  if (map.night === 1) {
    g.add(disc(40, 4, PAL.grass), sandRim(40));
  } else if (map.night === 2) {
    g.add(disc(28, 4, PAL.grass), sandRim(28), disc(28, 4, PAL.grass, 70, 0), sandRim(28, 70, 0));
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), mat(PAL.wood));
    bridge.position.set(35, -0.15, 0);
    g.add(bridge);
    for (let x = 26; x <= 44; x += 1.5) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 4), mat(0x4e341f));
      plank.position.set(x, -0.1, 0); g.add(plank);
    }
  } else {
    g.add(disc(45, 4, PAL.grass), sandRim(45));
    g.add(halfAnnulus(12, 24, 3));
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), mat(PAL.grass));
    t2.position.y = 3; g.add(t2);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), mat(PAL.wood));
    tower.position.y = 10; g.add(tower);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 0.6, roughness: 0.4 }));
    bell.position.y = 14.2; bell.rotation.x = Math.PI; g.add(bell);
    g.add(ramp(30), ramp(150));
  }
  for (const p of map.pads) g.add(pad(p.pos));
  return g;
}

export function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 12), mat(PAL.coat));
  body.position.y = 0.7;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), mat(PAL.scarf));
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(0xf2d0a9));
  head.position.y = 1.45;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.45, 24), mat(PAL.sand)); // nón lá
  hat.position.y = 1.8;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: PAL.lampOn }));
  lamp.position.set(0.6, 1.45, 0);
  const light = new THREE.PointLight(PAL.lampOn, 4, 9, 1.6);
  light.position.copy(lamp.position);
  g.add(body, scarf, head, hat, lamp, light);
  g.userData = { light };
  return g;
}

export function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), mat(PAL.wood));
  post.position.y = 1.5;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: PAL.lampOff, emissive: 0x000000 }));
  shell.position.y = 3.4;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: PAL.lampCore }));
  core.position.y = 3.4; core.visible = false;
  const light = new THREE.PointLight(PAL.lampOn, 0, 26, 1.6);
  light.position.y = 3.4;
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.9, 6, 64), new THREE.MeshBasicMaterial({ color: PAL.lampOn, transparent: true, opacity: 0 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  g.add(post, shell, core, light, ring);
  g.userData = { shell, core, light, ring };
  return g;
}

const moteGeo = new THREE.SphereGeometry(0.15, 8, 6);
const glowGeo = new THREE.SphereGeometry(0.32, 8, 6);
export function makeMote(kind) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(moteGeo, new THREE.MeshBasicMaterial({ color: PAL.moteCore })));
  g.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: PAL.moteGlow, transparent: true, opacity: kind === 'dropped' ? 0.5 : 0.25 })));
  return g;
}

export function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: PAL.shadeBody, emissive: PAL.shadeBody, transparent: true, opacity: 0.92 }));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), new THREE.MeshBasicMaterial({ color: PAL.shadeRim, transparent: true, opacity: 0.35, side: THREE.BackSide }));
  g.add(body, rim);
  g.userData = { body, rim };
  return g;
}

export function makeDrifter() {
  const geo = new THREE.PlaneGeometry(2.4, 0.4, 12, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PAL.drifter, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  m.userData = { base: geo.attributes.position.array.slice() };
  return m;
}

export function makeCharm() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshBasicMaterial({ color: PAL.scarf, side: THREE.DoubleSide }));
  const border = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ color: PAL.gold, side: THREE.DoubleSide }));
  border.position.z = -0.01;
  g.add(border, paper);
  return g;
}
