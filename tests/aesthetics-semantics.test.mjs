import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAesthetics } from '../src/analysis/aesthetics.mjs';
import { inferSemanticCues } from '../src/analysis/semantics.mjs';

test('aesthetic analysis separates dimensions from interpretation', () => {
  const result = analyzeAesthetics({
    sections: [{ density: 0.4 }, { density: 0.8 }],
    dynamics: { profile: [{ value: 0.3 }, { value: 0.7 }] },
    form: { pattern: 'A-B-A' },
  });

  assert.equal(result.dimensions.density, 0.6);
  assert.equal(result.dimensions.dynamic_intensity, 0.5);
  assert.equal(result.dimensions.recurrence, 1);
  assert.match(result.limitations[0], /authorial intent/);
});

test('semantic cues require explicit evidence', () => {
  const result = inferSemanticCues({ tags: ['dynamic-rise', 'density-rise'] });

  assert.equal(result.cues[0].cue, 'tension');
  assert.equal(result.cues[0].type, 'interpreted');
  assert.ok(result.cues[0].confidence < 1);
});

test('semantic inference does not invent meaning from empty input', () => {
  const result = inferSemanticCues();

  assert.deepEqual(result.cues, []);
  assert.equal(result.confidence, 0);
});
