import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeArrangement } from '../src/analysis/arrangement.mjs';
import { analyzeDynamics } from '../src/analysis/dynamics.mjs';

test('arrangement analysis measures structural layers without file metadata', () => {
  const result = analyzeArrangement({
    instrumentation: {
      bass: [{ start: 0, end: 8 }],
      drums: [{ start: 0, end: 16 }],
    },
    sections: [{ id: 'A', start: 0, end: 8 }],
    events: [
      { id: 'e1', onset: 1 },
      { id: 'e2', onset: 2 },
    ],
  });

  assert.equal(result.layer_count, 2);
  assert.equal(result.section_density[0].event_count, 2);
});

test('dynamic analysis profiles section intensity from event evidence', () => {
  const result = analyzeDynamics({
    sections: [{ id: 'A', start: 0, end: 4 }],
    events: [
      { onset: 1, velocity: 40 },
      { onset: 2, velocity: 80 },
    ],
  });

  assert.equal(result.global_mean, 60);
  assert.equal(result.section_profiles[0].mean, 60);
});
