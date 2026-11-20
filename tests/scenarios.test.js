import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, WANDER_INPUTS, parse } from './scenarios.js';
import { runHeadless } from '../src/core/run.js';
import { validateScenario, validateInputs } from '../src/core/validate.js';

for (const sc of SCENARIOS) {
  test(`[P${sc.phase}] ${sc.name}: ${sc.req}`, () => {
    const night = sc.night ?? 1;
    const lines = runHeadless({
      seed: sc.seed ?? 1,
      night,
      scenario: sc.scenario ? validateScenario(structuredClone(sc.scenario), night) : null,
      inputs: sc.inputs ? validateInputs(structuredClone(sc.inputs)) : null,
      ticks: sc.ticks,
      snapshotEvery: sc.snapshotEvery ?? 10,
    });
    sc.check(parse(lines));
  });
}

for (const night of [1, 2, 3]) {
  test(`determinism night ${night}: same seed => identical output; different seed => different world`, () => {
    const run = (seed) => runHeadless({ seed, night, inputs: WANDER_INPUTS, ticks: 21600 }).join('\n');
    const a = run(7);
    assert.equal(a, run(7));
    assert.notEqual(a, run(8));
    for (const name of ['mote_picked', 'dash', 'player_hit', 'shade_spawned']) assert.ok(a.includes(`"name":"${name}"`), `no ${name} event`);
  });
}
