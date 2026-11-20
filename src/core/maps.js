// Standard maps (Ticket-02 Part 2). Angles: degrees from +X; a point at angle a, radius r is
// (cx + r·cos a, y, cz + r·sin a). This puts Night 3's 20°..160° tier-1 points and the 30°/150°
// ramps on the z > 0 half, as the ticket requires (see docs/notes/assumptions.md).
import { TUNING as T } from './tuning.js';

const rad = (d) => (d * Math.PI) / 180;
const r3 = (x) => Math.round(x * 1000) / 1000;
function ring(r, startDeg, stepDeg, n, y = 0, cx = 0, cz = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rad(startDeg + i * stepDeg);
    return [r3(cx + r * Math.cos(a)), y, r3(cz + r * Math.sin(a))];
  });
}
const lanterns = (list) => list.map((pos, i) => ({ id: `L${i + 1}`, pos }));

// ---------- Night 1: Đảo Bến ----------
const N1 = {
  night: 1,
  name: 'Đảo Bến',
  duration_s: T.night1_duration_s,
  shade_speed: T.shade_speed,
  shade_every: 480,
  shade_max: 6,
  drifters: false,
  wind: false,
  start: [0, 0, 0],
  lanterns: lanterns([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
  motePoints: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
  shadePoints: ring(37, 15, 30, 12),
  charms: [],
  pads: [],
  ground(x, z) { return x * x + z * z <= 40 * 40 ? 0 : null; },
};

// ---------- Night 2: Đảo Cau ----------
const B = [70, 0, 0];
function padToward(pos, target, vy, vh) {
  const dx = target[0] - pos[0], dz = target[2] - pos[2], l = Math.hypot(dx, dz);
  return { pos, radius: 1, vy, vel: [(dx / l) * vh, (dz / l) * vh] };
}
const N2 = {
  night: 2,
  name: 'Đảo Cau',
  duration_s: T.night2_duration_s,
  shade_speed: T.shade_speed,
  shade_every: 420,
  shade_max: 8,
  drifters: true,
  wind: false,
  start: [0, 0, 0],
  lanterns: lanterns([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
  motePoints: [
    ...ring(10, 0, 90, 4), ...ring(22, 0, 45, 8),
    ...ring(10, 0, 90, 4, 0, B[0], B[2]), ...ring(22, 0, 45, 8, 0, B[0], B[2]),
  ],
  shadePoints: [...ring(26, 22.5, 45, 8), ...ring(26, 22.5, 45, 8, 0, B[0], B[2])],
  charms: [{ id: 'C1', pos: [35, 0, 0] }],
  pads: [padToward([20, 0, 18], B, 14, 24), padToward([50, 0, -18], [0, 0, 0], 14, 24)],
  ground(x, z) {
    if (x * x + z * z <= 28 * 28) return 0;
    if ((x - 70) ** 2 + z * z <= 28 * 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0; // bamboo bridge
    return null;
  },
};

// ---------- Night 3: Đảo Chuông ----------
function onRamp(x, z, r) {
  for (const a of [rad(30), rad(150)]) {
    const ux = Math.cos(a), uz = Math.sin(a);
    const along = x * ux + z * uz, side = Math.abs(-x * uz + z * ux);
    if (along >= 24 && along <= 30 && side <= 1.5) return (3 * (30 - along)) / 6;
  }
  return null;
}
const N3 = {
  night: 3,
  name: 'Đảo Chuông',
  duration_s: T.night3_duration_s,
  shade_speed: 4.5,
  shade_every: 360,
  shade_max: 10,
  drifters: true,
  wind: true,
  // Assumption: the ticket gives no Night 3 start; (0,0,0) is inside the bell tower, so Mây starts
  // on tier 0 south of the tower (z < 0 has no tier 1).
  start: [0, 0, -20],
  lanterns: lanterns([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
  motePoints: [...ring(34, 0, 20, 18, 0), ...ring(18, 20, 20, 8, 3), ...ring(5, 45, 90, 4, 6)],
  shadePoints: ring(43, 0, 22.5, 16),
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
  pads: [{ pos: [0, 3, 13], radius: 1, vy: 12, vel: [0, -8] }],
  ground(x, z) {
    const r = Math.sqrt(x * x + z * z);
    if (r > 45) return null;
    if (r <= 2) return 14; // bell tower: a wall, not climbable
    if (r <= 8) return 6; // tier 2
    if (r >= 12 && r <= 24 && z > 0) return 3; // tier 1 (half ring)
    const ramp = onRamp(x, z, r);
    if (ramp !== null) return ramp;
    return 0;
  },
};

export const MAPS = { 1: N1, 2: N2, 3: N3 };
export const durationOf = (night) => MAPS[night].duration_s;
