// Validation for Test Contract v1.1 input files. Throws FormatError on malformed data
// (the headless CLI maps that to exit code 2).
import { MAPS } from './maps.js';

export class FormatError extends Error {}

const fail = (msg) => { throw new FormatError(msg); };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;
const checkVec3 = (v, where) => {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) fail(`${where}: expected [x, y, z] numbers`);
};
const checkBool = (v, where) => { if (typeof v !== 'boolean') fail(`${where}: expected boolean`); };
const checkInt = (v, where) => { if (v !== undefined && !isNonNegInt(v)) fail(`${where}: expected integer >= 0`); };
const checkId = (v, where) => { if (v !== undefined && typeof v !== 'string') fail(`${where}: expected string`); };

const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
const SHADE_STATES = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned']);
const DRIFTER_STATES = new Set(['idle', 'chase', 'flee']);

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

export function validateScenario(data, night = 1) {
  if (!isObj(data)) fail('scenario: expected object');
  if (data.player !== undefined) {
    const p = data.player;
    if (!isObj(p)) fail('scenario.player: expected object');
    if (p.pos !== undefined) checkVec3(p.pos, 'scenario.player.pos');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) checkInt(p[k], `scenario.player.${k}`);
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (data[k] !== undefined) checkBool(data[k], `scenario.${k}`);
  if (data.time_left_s !== undefined && !(isNum(data.time_left_s) && data.time_left_s >= 0)) fail('scenario.time_left_s: expected number >= 0');

  let motes;
  if (data.motes !== undefined) {
    if (!Array.isArray(data.motes)) fail('scenario.motes: expected array');
    motes = data.motes.map((m, i) => {
      const at = `scenario.motes[${i}]`;
      if (Array.isArray(m)) { checkVec3(m, at); return { pos: m }; }
      if (!isObj(m)) fail(`${at}: expected [x, y, z] or { id, pos }`);
      checkVec3(m.pos, `${at}.pos`);
      checkId(m.id, `${at}.id`);
      if (m.kind !== undefined && m.kind !== 'random' && m.kind !== 'dropped') fail(`${at}.kind: expected "random" or "dropped"`);
      if (m.ttl_s !== undefined && m.ttl_s !== null && !(isNum(m.ttl_s) && m.ttl_s > 0)) fail(`${at}.ttl_s: expected number > 0`);
      return { id: m.id, pos: m.pos, kind: m.kind, ttl_s: m.ttl_s ?? undefined };
    });
    uniqueIds(motes, 'scenario.motes');
  }
  if (data.shades !== undefined) {
    if (!Array.isArray(data.shades)) fail('scenario.shades: expected array');
    data.shades.forEach((s, i) => {
      const at = `scenario.shades[${i}]`;
      if (!isObj(s)) fail(`${at}: expected object`);
      checkVec3(s.pos, `${at}.pos`);
      checkId(s.id, `${at}.id`);
      if (s.state !== undefined && !SHADE_STATES.has(s.state)) fail(`${at}.state: expected one of ${[...SHADE_STATES].join(', ')}`);
      checkInt(s.state_ticks_left, `${at}.state_ticks_left`);
    });
    uniqueIds(data.shades, 'scenario.shades');
  }
  if (data.drifters !== undefined) {
    if (!Array.isArray(data.drifters)) fail('scenario.drifters: expected array');
    data.drifters.forEach((d, i) => {
      const at = `scenario.drifters[${i}]`;
      if (!isObj(d)) fail(`${at}: expected object`);
      checkVec3(d.pos, `${at}.pos`);
      checkId(d.id, `${at}.id`);
      if (d.state !== undefined && !DRIFTER_STATES.has(d.state)) fail(`${at}.state: expected one of ${[...DRIFTER_STATES].join(', ')}`);
      checkInt(d.stolen, `${at}.stolen`);
    });
    uniqueIds(data.drifters, 'scenario.drifters');
  }
  if (data.charms !== undefined) {
    if (!Array.isArray(data.charms)) fail('scenario.charms: expected array');
    data.charms.forEach((c, i) => {
      const at = `scenario.charms[${i}]`;
      if (!isObj(c)) fail(`${at}: expected object`);
      checkVec3(c.pos, `${at}.pos`);
      checkId(c.id, `${at}.id`);
      if (c.available !== undefined) checkBool(c.available, `${at}.available`);
      checkInt(c.respawn_ticks, `${at}.respawn_ticks`);
    });
    uniqueIds(data.charms, 'scenario.charms');
  }
  if (data.lanterns !== undefined) {
    if (!Array.isArray(data.lanterns)) fail('scenario.lanterns: expected array');
    const valid = new Set(MAPS[night].lanterns.map((l) => l.id));
    data.lanterns.forEach((l, i) => {
      const at = `scenario.lanterns[${i}]`;
      if (!isObj(l)) fail(`${at}: expected object`);
      if (!valid.has(l.id)) fail(`${at}.id: expected one of ${[...valid].join(', ')}`);
      if (l.pos !== undefined) checkVec3(l.pos, `${at}.pos`);
      checkInt(l.deposited, `${at}.deposited`);
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
