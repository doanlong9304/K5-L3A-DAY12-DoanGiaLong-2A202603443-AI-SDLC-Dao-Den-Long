import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, round3 } from '../src/core/rng.js';

test('same seed gives the same sequence', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b());
});

test('different seeds give different sequences', () => {
  const a = createRng(1), b = createRng(2);
  assert.notEqual(a(), b());
});

test('values are in [0, 1)', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('round3 rounds to 3 decimals and normalises -0', () => {
  assert.equal(round3(1.23456), 1.235);
  assert.equal(round3(-0.0001), 0);
  assert.ok(!Object.is(round3(-0.0001), -0));
});
