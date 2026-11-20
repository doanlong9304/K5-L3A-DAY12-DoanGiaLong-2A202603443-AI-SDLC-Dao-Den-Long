#!/usr/bin/env node
// Test Contract v1.1 headless CLI.
// node src/headless.js --seed <int> --night <1-3> [--scenario f.json] [--inputs f.json]
//                      --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
import { readFileSync, writeFileSync } from 'node:fs';
import { runHeadless } from './core/run.js';
import { validateInputs, validateScenario, FormatError } from './core/validate.js';

const die = (msg, code = 1) => { process.stderr.write(`error: ${msg}\n`); process.exit(code); };

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) die(`unexpected argument "${a}"`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) die(`missing value for ${a}`);
    out[a.slice(2)] = v;
    i++;
  }
  return out;
}

function intArg(args, name, { required = false, min = -Infinity, def } = {}) {
  if (args[name] === undefined) {
    if (required) die(`--${name} is required`);
    return def;
  }
  if (!/^-?\d+$/.test(args[name])) die(`--${name} must be an integer`);
  const n = Number(args[name]);
  if (n < min) die(`--${name} must be >= ${min}`);
  return n;
}

function loadJson(path, validate, label) {
  let text;
  try { text = readFileSync(path, 'utf8'); } catch (e) { die(`cannot read ${label} file ${path}: ${e.message}`); }
  try {
    return validate(JSON.parse(text.replace(/^﻿/, '')));
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof FormatError) die(`malformed ${label} file ${path}: ${e.message}`, 2);
    throw e;
  }
}

const args = parseArgs(process.argv.slice(2));
const known = new Set(['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every']);
for (const k of Object.keys(args)) if (!known.has(k)) die(`unknown option --${k}`);

const seed = intArg(args, 'seed', { required: true });
const night = intArg(args, 'night', { required: true });
if (![1, 2, 3].includes(night)) die(`--night ${night} is not available (1, 2 or 3)`);
const ticks = intArg(args, 'ticks', { required: true, min: 0 });
const snapshotEvery = intArg(args, 'snapshot-every', { min: 1, def: 10 });
if (!args.out) die('--out is required');

const scenario = args.scenario ? loadJson(args.scenario, (d) => validateScenario(d, night), 'scenario') : null;
const inputs = args.inputs ? loadJson(args.inputs, validateInputs, 'inputs') : null;

try {
  const lines = runHeadless({ seed, night, scenario, inputs, ticks, snapshotEvery });
  writeFileSync(args.out, lines.join('\n') + '\n');
} catch (e) {
  die(e.stack || String(e));
}
