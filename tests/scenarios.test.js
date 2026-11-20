import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, parse } from './scenarios.js';
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
  const run = (seed) => runHeadless({ seed, ticks: 3000 }).join('\n');
  assert.equal(run(7), run(7));
  assert.notEqual(run(7), run(8));
});
