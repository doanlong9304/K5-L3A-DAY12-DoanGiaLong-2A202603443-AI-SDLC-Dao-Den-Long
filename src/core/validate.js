// Validation for Test Contract input files. Throws FormatError on malformed data
// (the headless CLI maps that to exit code 2).
import { TUNING as T } from './tuning.js';

export class FormatError extends Error {}

const fail = (msg) => { throw new FormatError(msg); };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;
const checkVec3 = (v, where) => {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) fail(`${where}: expected [x, y, z] numbers`);
};
const checkBool = (v, where) => { if (typeof v !== 'boolean') fail(`${where}: expected boolean`); };

const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];

export function validateInputs(data) {
  if (!isObj(data) || !Array.isArray(data.frames)) fail('inputs: expected { "frames": [...] }');
  let last = -1;
  data.frames.forEach((f, i) => {
    const at = `inputs.frames[${i}]`;
    if (!isObj(f)) fail(`${at}: expected object`);
    if (!isNonNegInt(f.tick)) fail(`${at}.tick: expected integer >= 0`);
    if (f.tick <= last) fail(`${at}.tick: ticks must be strictly increasing`);
    last = f.tick;
    if (f.move !== undefined) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((c) => isNum(c) && c >= -1 && c <= 1)) {
        fail(`${at}.move: expected [x, z] with each component in [-1, 1]`);
      }
    }
    if (f.cam_yaw_deg !== undefined && !isNum(f.cam_yaw_deg)) fail(`${at}.cam_yaw_deg: expected number`);
    for (const b of BUTTONS) if (f[b] !== undefined) checkBool(f[b], `${at}.${b}`);
  });
  return data;
}

export function validateScenario(data) {
  if (!isObj(data)) fail('scenario: expected object');
  if (data.player !== undefined) {
    if (!isObj(data.player)) fail('scenario.player: expected object');
    if (data.player.pos !== undefined) checkVec3(data.player.pos, 'scenario.player.pos');
    if (data.player.carried !== undefined && !isNonNegInt(data.player.carried)) fail('scenario.player.carried: expected integer >= 0');
    if (data.player.flames !== undefined && !isNonNegInt(data.player.flames)) fail('scenario.player.flames: expected integer >= 0');
  }
  for (const k of ['random_motes', 'random_shades']) if (data[k] !== undefined) checkBool(data[k], `scenario.${k}`);
  if (data.time_left_s !== undefined && !(isNum(data.time_left_s) && data.time_left_s >= 0)) fail('scenario.time_left_s: expected number >= 0');

  let motes;
  if (data.motes !== undefined) {
    if (!Array.isArray(data.motes)) fail('scenario.motes: expected array');
    motes = data.motes.map((m, i) => {
      if (Array.isArray(m)) { checkVec3(m, `scenario.motes[${i}]`); return { pos: m }; }
      if (!isObj(m)) fail(`scenario.motes[${i}]: expected [x, y, z] or { id, pos }`);
      checkVec3(m.pos, `scenario.motes[${i}].pos`);
      if (m.id !== undefined && typeof m.id !== 'string') fail(`scenario.motes[${i}].id: expected string`);
      return { id: m.id, pos: m.pos };
    });
    uniqueIds(motes, 'scenario.motes');
  }
  if (data.shades !== undefined) {
    if (!Array.isArray(data.shades)) fail('scenario.shades: expected array');
    data.shades.forEach((s, i) => {
      if (!isObj(s)) fail(`scenario.shades[${i}]: expected object`);
      checkVec3(s.pos, `scenario.shades[${i}].pos`);
      if (s.id !== undefined && typeof s.id !== 'string') fail(`scenario.shades[${i}].id: expected string`);
    });
    uniqueIds(data.shades, 'scenario.shades');
  }
  if (data.lanterns !== undefined) {
    if (!Array.isArray(data.lanterns)) fail('scenario.lanterns: expected array');
    const valid = new Set(Array.from({ length: T.lantern_count_night1 }, (_, i) => `L${i + 1}`));
    data.lanterns.forEach((l, i) => {
      const at = `scenario.lanterns[${i}]`;
      if (!isObj(l)) fail(`${at}: expected object`);
      if (!valid.has(l.id)) fail(`${at}.id: expected one of ${[...valid].join(', ')}`);
      if (l.pos !== undefined) checkVec3(l.pos, `${at}.pos`);
      if (l.deposited !== undefined && !isNonNegInt(l.deposited)) fail(`${at}.deposited: expected integer >= 0`);
      if (l.lit !== undefined) checkBool(l.lit, `${at}.lit`);
    });
  }
  return { ...data, ...(motes ? { motes } : {}) };
}

function uniqueIds(list, where) {
  const seen = new Set();
  for (const x of list) {
    if (x.id === undefined) continue;
    if (seen.has(x.id)) fail(`${where}: duplicate id ${x.id}`);
    seen.add(x.id);
  }
}
