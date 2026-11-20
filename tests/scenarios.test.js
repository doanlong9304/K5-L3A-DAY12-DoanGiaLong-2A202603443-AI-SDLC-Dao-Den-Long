import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, WANDER_INPUTS, parse } from './scenarios.js';
import { runHeadless } from '../src/core/run.js';
import { validateScenario, validateInputs } from '../src/core/validate.js';

for (const sc of SCENARIOS) {
  test(`${sc.name}: ${sc.req}`, () => {
    const lines = runHeadless({
      seed: sc.seed ?? 1,
      scenario: sc.scenario ? validateScenario(structuredClone(sc.scenario)) : null,
      inputs: sc.inputs ? validateInputs(structuredClone(sc.inputs)) : null,
      ticks: sc.ticks,
      snapshotEvery: sc.snapshotEvery ?? 10,
    });
    sc.check(parse(lines));
  });
}

test('determinism: same seed => identical output; different seed => different world', () => {
  const run = (seed) => runHeadless({ seed, inputs: WANDER_INPUTS, ticks: 18000 }).join('\n');
  const a = run(7);
  assert.equal(a, run(7));
  assert.notEqual(a, run(8));
  // the wander run must actually exercise mechanics, otherwise this test is weak
  for (const name of ['mote_picked', 'pulse', 'player_hit']) assert.ok(a.includes(`"name":"${name}"`), `no ${name} event`);
});
